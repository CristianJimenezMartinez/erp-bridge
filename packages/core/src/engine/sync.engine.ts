import { v4 as uuidv4 } from 'uuid';
import {
  AuditLog,
  Connection,
  ExternalEntityMapping,
  Logger,
  SyncExecution,
  SyncExecutionError,
  SyncJob,
} from '@erp-bridge/shared';
import {
  BridgeError,
  Connector,
  ErrorCode,
  ProductMutationResult,
} from '@erp-bridge/sdk';
import { ConnectorRegistry } from '../registry';
import { MappingEngine } from '../mapping';
import { EventBus } from '../events';
import {
  IAuditLogRepository,
  IEntityMappingRepository,
  ISyncExecutionRepository,
  PostgresAuditLogRepository,
  PostgresEntityMappingRepository,
  PostgresSyncExecutionRepository,
} from '../database';

export interface RunSyncOptions {
  limit?: number;
  forceFullSync?: boolean;
  specificSkus?: string[];
  retryOfExecutionId?: string;
}

export class SyncEngine {
  private readonly logger = new Logger('SyncEngine');
  private readonly mappingEngine = new MappingEngine();

  constructor(
    private readonly registry: ConnectorRegistry = ConnectorRegistry.getInstance(),
    private readonly executionRepo: ISyncExecutionRepository = new PostgresSyncExecutionRepository(),
    private readonly entityMappingRepo: IEntityMappingRepository = new PostgresEntityMappingRepository(),
    private readonly auditRepo: IAuditLogRepository = new PostgresAuditLogRepository(),
    private readonly eventBus: EventBus = EventBus.getInstance()
  ) {}

  public async runJob(
    job: SyncJob,
    sourceConn: Connection,
    destConn: Connection,
    options?: RunSyncOptions
  ): Promise<SyncExecution> {
    const executionId = `exec_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const startTime = Date.now();

    this.logger.info(`Iniciando ejecución de sincronización: ${job.name}`, {
      jobId: job.id,
      executionId,
      organizationId: job.organizationId,
      source: sourceConn.connectorId,
      destination: destConn.connectorId,
      retryOf: options?.retryOfExecutionId,
      specificSkusCount: options?.specificSkus?.length,
    });

    // 1. Emit SYNC_STARTED event
    await this.eventBus.publish({
      type: 'SYNC_STARTED',
      organizationId: job.organizationId,
      source: 'SyncEngine',
      data: {
        jobId: job.id,
        executionId,
        jobName: job.name,
        retryOf: options?.retryOfExecutionId,
        sourceConnector: sourceConn.connectorId,
        destConnector: destConn.connectorId,
      },
    });

    const execution: SyncExecution = {
      id: executionId,
      syncJobId: job.id,
      organizationId: job.organizationId,
      status: 'RUNNING',
      startedAt: new Date(startTime),
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      errors: [],
      metadata: {
        sourceConnectionId: sourceConn.id,
        destinationConnectionId: destConn.id,
        options: options || {},
        retryOfExecutionId: options?.retryOfExecutionId,
      },
    };

    // Save initial running state
    await this.executionRepo.create(execution).catch((err) => {
      this.logger.warn('No se pudo persistir el estado inicial de SyncExecution', { err });
    });

    let sourceConnector: Connector | null = null;
    let destConnector: Connector | null = null;

    try {
      // 2. Instantiate Connectors via Registry
      sourceConnector = this.registry.createConnector(sourceConn.connectorId);
      destConnector = this.registry.createConnector(destConn.connectorId);

      // 3. Connect both systems
      await sourceConnector.connect({
        connectionId: sourceConn.id,
        organizationId: sourceConn.organizationId,
        configuration: sourceConn.configuration,
      });

      await destConnector.connect({
        connectionId: destConn.id,
        organizationId: destConn.organizationId,
        configuration: destConn.configuration,
      });

      // 4. Read products from source
      if (!sourceConnector.readProducts) {
        throw new BridgeError(
          ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
          `El conector origen "${sourceConn.connectorId}" no soporta lectura de productos`
        );
      }

      let rawProducts = await sourceConnector.readProducts({
        limit: options?.limit,
      });

      // If this is a selective retry, filter only the requested SKUs
      if (options?.specificSkus && options.specificSkus.length > 0) {
        const targetSkus = new Set(options.specificSkus.map((s) => s.toLowerCase()));
        rawProducts = rawProducts.filter((p) => targetSkus.has(p.sku.toLowerCase()));
        this.logger.info(`Filtro de reintento selectivo aplicado: ${rawProducts.length} productos coincidentes.`);
      }

      execution.processedCount = rawProducts.length;

      if (rawProducts.length === 0) {
        this.logger.info('No hay productos que sincronizar');
        execution.status = 'SUCCESS';
        execution.completedAt = new Date();
        execution.durationMs = Date.now() - startTime;
        await this.executionRepo.update(execution).catch(() => {});
        return execution;
      }

      // 5. Apply mapping engine rules
      const customMappings = (job.configuration?.mappings || job.configuration?.fieldMappings) as import('@erp-bridge/shared').FieldMapping[] | undefined;
      const mappedProducts = this.mappingEngine.applyMappings(rawProducts, customMappings);

      // 6. Query existing external entity mappings (for idempotency)
      const existingMappings = await this.entityMappingRepo.getMappingMap(
        job.organizationId,
        'product',
        sourceConn.id,
        destConn.id
      );

      const errors: SyncExecutionError[] = [];
      const mappingsToSave: ExternalEntityMapping[] = [];

      // 7. Check if destination supports batch operations
      const destCapabilities = destConnector.getCapabilities();

      if (destCapabilities.supportsBatchOperations && destConnector.batchUpsertProducts) {
        this.logger.info(`Ejecutando sincronización por lotes para ${mappedProducts.length} productos...`);
        const batchResult = await destConnector.batchUpsertProducts(mappedProducts, existingMappings);

        execution.successCount = batchResult.succeeded;
        execution.failedCount = batchResult.failed;

        for (const item of batchResult.items) {
          if (item.success && item.externalId) {
            mappingsToSave.push({
              id: `map_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
              organizationId: job.organizationId,
              entityType: 'product',
              sourceConnectionId: sourceConn.id,
              sourceIdentifier: item.sku,
              targetConnectionId: destConn.id,
              targetIdentifier: item.externalId,
              lastSyncedAt: new Date(),
            });

            if (options?.retryOfExecutionId) {
              await this.eventBus.publish({
                type: 'SYNC_ITEM_RETRY',
                organizationId: job.organizationId,
                source: 'SyncEngine',
                data: {
                  sku: item.sku,
                  status: 'SUCCESS',
                  retryOf: options.retryOfExecutionId,
                },
              });
            }
          } else {
            const errorMsg = item.error || 'Error desconocido al sincronizar producto en destino';
            errors.push({
              itemSku: item.sku,
              code: ErrorCode.SYNC_DESTINATION_ERROR,
              message: errorMsg,
            });

            await this.eventBus.publish({
              type: 'SYNC_ITEM_FAILED',
              organizationId: job.organizationId,
              source: 'SyncEngine',
              data: {
                sku: item.sku,
                code: ErrorCode.SYNC_DESTINATION_ERROR,
                error: errorMsg,
              },
            });
          }
        }
      } else {
        // Individual sequential operations
        for (const product of mappedProducts) {
          try {
            const targetExternalId = existingMappings.get(product.sku);
            let mutationResult: ProductMutationResult;

            if (targetExternalId && destConnector.updateProduct) {
              mutationResult = await destConnector.updateProduct(product, targetExternalId);
            } else if (destConnector.createProduct) {
              mutationResult = await destConnector.createProduct(product);
            } else {
              throw new BridgeError(
                ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
                `El conector destino no soporta creación ni actualización de productos`
              );
            }

            if (mutationResult.success && mutationResult.externalId) {
              execution.successCount++;
              mappingsToSave.push({
                id: `map_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
                organizationId: job.organizationId,
                entityType: 'product',
                sourceConnectionId: sourceConn.id,
                sourceIdentifier: product.sku,
                targetConnectionId: destConn.id,
                targetIdentifier: mutationResult.externalId,
                lastSyncedAt: new Date(),
              });

              if (options?.retryOfExecutionId) {
                await this.eventBus.publish({
                  type: 'SYNC_ITEM_RETRY',
                  organizationId: job.organizationId,
                  source: 'SyncEngine',
                  data: {
                    sku: product.sku,
                    status: 'SUCCESS',
                    retryOf: options.retryOfExecutionId,
                  },
                });
              }
            } else {
              execution.failedCount++;
              const errMsg = mutationResult.error || 'Error al persistir producto en destino';
              errors.push({
                itemSku: product.sku,
                code: ErrorCode.SYNC_DESTINATION_ERROR,
                message: errMsg,
              });

              await this.eventBus.publish({
                type: 'SYNC_ITEM_FAILED',
                organizationId: job.organizationId,
                source: 'SyncEngine',
                data: {
                  sku: product.sku,
                  code: ErrorCode.SYNC_DESTINATION_ERROR,
                  error: errMsg,
                },
              });
            }
          } catch (itemError: unknown) {
            execution.failedCount++;
            const msg = itemError instanceof Error ? itemError.message : String(itemError);
            errors.push({
              itemSku: product.sku,
              code: ErrorCode.SYNC_DESTINATION_ERROR,
              message: msg,
            });

            await this.eventBus.publish({
              type: 'SYNC_ITEM_FAILED',
              organizationId: job.organizationId,
              source: 'SyncEngine',
              data: {
                sku: product.sku,
                code: ErrorCode.SYNC_DESTINATION_ERROR,
                error: msg,
              },
            });
          }
        }
      }

      // 8. Save updated mappings
      if (mappingsToSave.length > 0) {
        await this.entityMappingRepo.saveBatchMappings(mappingsToSave).catch((err) => {
          this.logger.error('Error al guardar correlaciones de entidades', err);
        });
      }

      execution.errors = errors;
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - startTime;

      if (execution.failedCount === 0) {
        execution.status = 'SUCCESS';
      } else if (execution.successCount > 0) {
        execution.status = 'PARTIAL_SUCCESS';
      } else {
        execution.status = 'FAILED';
      }

      // 9. Emit SYNC_COMPLETED or SYNC_FAILED
      await this.eventBus.publish({
        type: execution.status === 'FAILED' ? 'SYNC_FAILED' : 'SYNC_COMPLETED',
        organizationId: job.organizationId,
        source: 'SyncEngine',
        data: {
          jobId: job.id,
          executionId,
          status: execution.status,
          processed: execution.processedCount,
          succeeded: execution.successCount,
          failed: execution.failedCount,
          durationMs: execution.durationMs,
        },
      });

      // 10. Write Audit Log
      const auditEntry: AuditLog = {
        id: `aud_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
        organizationId: job.organizationId,
        action: options?.retryOfExecutionId ? 'SYNC_RETRY' : 'SYNC_EXECUTION',
        resourceType: 'sync_job',
        resourceId: job.id,
        timestamp: new Date(),
        result: execution.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
        metadata: {
          executionId,
          status: execution.status,
          processedCount: execution.processedCount,
          successCount: execution.successCount,
          failedCount: execution.failedCount,
          durationMs: execution.durationMs,
        },
      };
      await this.auditRepo.create(auditEntry).catch(() => {});

      this.logger.info(`Sincronización finalizada con estado: ${execution.status}`, {
        processed: execution.processedCount,
        succeeded: execution.successCount,
        failed: execution.failedCount,
        durationMs: execution.durationMs,
      });
    } catch (globalError: unknown) {
      execution.status = 'FAILED';
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - startTime;

      const errorMessage = globalError instanceof Error ? globalError.message : String(globalError);
      execution.errors.push({
        code: ErrorCode.SYNC_EXECUTION_FAILED,
        message: `Fallo global en la sincronización: ${errorMessage}`,
      });

      await this.eventBus.publish({
        type: 'SYNC_FAILED',
        organizationId: job.organizationId,
        source: 'SyncEngine',
        data: {
          jobId: job.id,
          executionId,
          error: errorMessage,
        },
      });

      this.logger.error('Error crítico durante la ejecución de sincronización', globalError);
    } finally {
      // 11. Disconnect connectors
      if (sourceConnector) {
        await sourceConnector.disconnect().catch(() => {});
      }
      if (destConnector) {
        await destConnector.disconnect().catch(() => {});
      }

      // 12. Persist final execution status
      await this.executionRepo.update(execution).catch((err) => {
        this.logger.error('Error al actualizar registro final de SyncExecution', err);
      });
    }

    return execution;
  }
}
