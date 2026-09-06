import { v4 as uuidv4 } from 'uuid';
import {
  AuditLog,
  Connection,
  Logger,
  SyncExecution,
  SyncExecutionError,
  SyncJob,
} from '@erp-bridge/shared';
import {
  BridgeError,
  Connector,
  ErrorCode,
  ReadStockOptions,
} from '@erp-bridge/sdk';
import { ConnectorRegistry } from '../registry';
import { EventBus } from '../events';
import {
  IAuditLogRepository,
  IEntityMappingRepository,
  ISyncExecutionRepository,
  PostgresAuditLogRepository,
  PostgresEntityMappingRepository,
  PostgresSyncExecutionRepository,
} from '../database';

export interface RunStockSyncOptions {
  warehouse?: string;
  limit?: number;
  specificSkus?: string[];
  retryOfExecutionId?: string;
}

export class StockSyncEngine {
  private readonly logger = new Logger('StockSyncEngine');

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
    options?: RunStockSyncOptions
  ): Promise<SyncExecution> {
    const executionId = `exec_stk_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
    const startTime = Date.now();

    this.logger.info(`Iniciando sincronización de STOCK: ${job.name}`, {
      jobId: job.id,
      executionId,
      source: sourceConn.connectorId,
      destination: destConn.connectorId,
    });

    // 1. Emit STOCK_SYNC_STARTED
    await this.eventBus.publish({
      type: 'STOCK_SYNC_STARTED',
      organizationId: job.organizationId,
      source: 'StockSyncEngine',
      data: {
        jobId: job.id,
        executionId,
        jobName: job.name,
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
      },
    };

    await this.executionRepo.create(execution).catch(() => {});

    let sourceConnector: Connector | null = null;
    let destConnector: Connector | null = null;

    try {
      // 2. Connect both connectors
      sourceConnector = this.registry.createConnector(sourceConn.connectorId);
      destConnector = this.registry.createConnector(destConn.connectorId);

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

      if (!sourceConnector.readStock) {
        throw new BridgeError(
          ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
          `El conector origen "${sourceConn.connectorId}" no soporta lectura de stock`
        );
      }

      // 3. Read stock from Factusol (F_STO)
      const readOptions: ReadStockOptions = {
        warehouse: options?.warehouse,
        limit: options?.limit,
        skus: options?.specificSkus,
      };

      const stockItems = await sourceConnector.readStock(readOptions);
      execution.processedCount = stockItems.length;

      if (stockItems.length === 0) {
        this.logger.info('No hay registros de stock que sincronizar');
        execution.status = 'SUCCESS';
        execution.completedAt = new Date();
        execution.durationMs = Date.now() - startTime;
        await this.executionRepo.update(execution).catch(() => {});
        return execution;
      }

      // 4. Query existing product mappings (SKU -> WooCommerce Product ID)
      const existingMappings = await this.entityMappingRepo.getMappingMap(
        job.organizationId,
        'product',
        sourceConn.id,
        destConn.id
      );

      // 5. Update stock in WooCommerce
      const errors: SyncExecutionError[] = [];

      if (destConnector.batchUpdateStock) {
        // Fast batch stock update
        const batchResult = await destConnector.batchUpdateStock(stockItems, existingMappings);
        execution.successCount = batchResult.succeeded;
        execution.failedCount = batchResult.failed;

        for (const item of batchResult.items) {
          if (!item.success) {
            errors.push({
              itemSku: item.sku,
              code: ErrorCode.SYNC_DESTINATION_ERROR,
              message: item.error || 'Error al actualizar stock',
            });
          } else {
            await this.eventBus.publish({
              type: 'STOCK_UPDATED',
              organizationId: job.organizationId,
              source: 'StockSyncEngine',
              data: {
                sku: item.sku,
                externalId: item.externalId,
              },
            });
          }
        }
      } else if (destConnector.updateStock) {
        // Sequential item-by-item fallback
        for (const stock of stockItems) {
          const targetId = existingMappings.get(stock.sku);
          if (!targetId) {
            execution.failedCount++;
            errors.push({
              itemSku: stock.sku,
              code: ErrorCode.SYNC_MAPPING_ERROR,
              message: `No se encontró mapeo para el SKU ${stock.sku}`,
            });
            continue;
          }

          try {
            const res = await destConnector.updateStock(stock.sku, stock.quantity, targetId);
            if (res.success) {
              execution.successCount++;
              await this.eventBus.publish({
                type: 'STOCK_UPDATED',
                organizationId: job.organizationId,
                source: 'StockSyncEngine',
                data: {
                  sku: stock.sku,
                  quantity: stock.quantity,
                  externalId: targetId,
                },
              });
            } else {
              execution.failedCount++;
              errors.push({
                itemSku: stock.sku,
                code: ErrorCode.SYNC_DESTINATION_ERROR,
                message: res.error || 'Fallo al actualizar stock',
              });
            }
          } catch (err: unknown) {
            execution.failedCount++;
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({
              itemSku: stock.sku,
              code: ErrorCode.SYNC_DESTINATION_ERROR,
              message: msg,
            });
          }
        }
      } else {
        throw new BridgeError(
          ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
          `El conector destino "${destConn.connectorId}" no soporta actualización de stock`
        );
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

      // 6. Emit STOCK_SYNC_COMPLETED
      await this.eventBus.publish({
        type: execution.status === 'FAILED' ? 'STOCK_SYNC_FAILED' : 'STOCK_SYNC_COMPLETED',
        organizationId: job.organizationId,
        source: 'StockSyncEngine',
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

      // 7. Record in Audit Log
      const auditEntry: AuditLog = {
        id: `aud_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
        organizationId: job.organizationId,
        action: 'STOCK_SYNC_EXECUTION',
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

      this.logger.info(`Sincronización de stock finalizada: ${execution.status}`, {
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
        message: `Fallo global en la sincronización de stock: ${errorMessage}`,
      });

      await this.eventBus.publish({
        type: 'STOCK_SYNC_FAILED',
        organizationId: job.organizationId,
        source: 'StockSyncEngine',
        data: {
          jobId: job.id,
          executionId,
          error: errorMessage,
        },
      });

      this.logger.error('Error crítico durante la sincronización de stock', globalError);
    } finally {
      if (sourceConnector) {
        await sourceConnector.disconnect().catch(() => {});
      }
      if (destConnector) {
        await destConnector.disconnect().catch(() => {});
      }

      await this.executionRepo.update(execution).catch(() => {});
    }

    return execution;
  }
}
