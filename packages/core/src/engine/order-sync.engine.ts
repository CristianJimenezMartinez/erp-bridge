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
  OrderMutationResult,
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

export interface RunOrderSyncOptions {
  limit?: number;
  statusFilter?: string;
  forceFullSync?: boolean;
  specificOrderRefs?: string[];
  retryOfExecutionId?: string;
}

export class OrderSyncEngine {
  private readonly logger = new Logger('OrderSyncEngine');

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
    options?: RunOrderSyncOptions
  ): Promise<SyncExecution> {
    const executionId = `exec_ord_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
    const startTime = Date.now();

    this.logger.info(`Iniciando sincronización de PEDIDOS: ${job.name}`, {
      jobId: job.id,
      executionId,
      source: sourceConn.connectorId,
      destination: destConn.connectorId,
    });

    // 1. Emit ORDER_SYNC_STARTED event
    await this.eventBus.publish({
      type: 'ORDER_SYNC_STARTED',
      organizationId: job.organizationId,
      source: 'OrderSyncEngine',
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

      // 3. Read orders from source (e.g. WooCommerce)
      if (!sourceConnector.readOrders) {
        throw new BridgeError(
          ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
          `El conector origen "${sourceConn.connectorId}" no soporta lectura de pedidos`
        );
      }

      if (!destConnector.createOrder) {
        throw new BridgeError(
          ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
          `El conector destino "${destConn.connectorId}" no soporta inserción de pedidos`
        );
      }

      let orders = await sourceConnector.readOrders({
        limit: options?.limit || 50,
        status: options?.statusFilter || 'processing,pending,on-hold',
      });

      if (options?.specificOrderRefs && options.specificOrderRefs.length > 0) {
        const refs = new Set(options.specificOrderRefs.map((r) => r.toLowerCase()));
        orders = orders.filter((o) => refs.has(o.reference.toLowerCase()) || refs.has(o.orderNumber.toLowerCase()));
      }

      execution.processedCount = orders.length;

      if (orders.length === 0) {
        this.logger.info('No hay pedidos nuevos que sincronizar');
        execution.status = 'SUCCESS';
        execution.completedAt = new Date();
        execution.durationMs = Date.now() - startTime;
        await this.executionRepo.update(execution).catch(() => {});
        return execution;
      }

      // 4. Query existing mappings in destination
      const existingMappings = await this.entityMappingRepo.getMappingMap(
        job.organizationId,
        'order',
        sourceConn.id,
        destConn.id
      );

      const errors: SyncExecutionError[] = [];
      const mappingsToSave: ExternalEntityMapping[] = [];

      // 5. Process each order into destination (e.g. Factusol)
      for (const order of orders) {
        const orderRef = order.reference || order.orderNumber;
        const alreadyMappedId = existingMappings.get(orderRef);

        if (alreadyMappedId && !options?.forceFullSync) {
          this.logger.debug(`Pedido ${orderRef} ya sincronizado en destino (ID: ${alreadyMappedId}). Omitiendo.`);
          execution.successCount++;
          continue;
        }

        try {
          const mutationResult: OrderMutationResult = await destConnector.createOrder(order);

          if (mutationResult.success && mutationResult.externalId) {
            execution.successCount++;

            mappingsToSave.push({
              id: `map_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
              organizationId: job.organizationId,
              entityType: 'order',
              sourceConnectionId: sourceConn.id,
              sourceIdentifier: orderRef,
              targetConnectionId: destConn.id,
              targetIdentifier: mutationResult.externalId,
              lastSyncedAt: new Date(),
            });

            await this.eventBus.publish({
              type: 'ORDER_CREATED',
              organizationId: job.organizationId,
              source: 'OrderSyncEngine',
              data: {
                orderNumber: order.orderNumber,
                reference: orderRef,
                targetId: mutationResult.externalId,
                totalAmount: order.totalAmount,
                customer: order.customer.fiscalName,
              },
            });
          } else {
            execution.failedCount++;
            const errMsg = mutationResult.error || 'Error al insertar pedido en Factusol';
            errors.push({
              itemSku: orderRef,
              code: ErrorCode.SYNC_DESTINATION_ERROR,
              message: errMsg,
            });

            await this.eventBus.publish({
              type: 'SYNC_ITEM_FAILED',
              organizationId: job.organizationId,
              source: 'OrderSyncEngine',
              data: {
                orderRef,
                error: errMsg,
              },
            });
          }
        } catch (itemError: unknown) {
          execution.failedCount++;
          const msg = itemError instanceof Error ? itemError.message : String(itemError);
          errors.push({
            itemSku: orderRef,
            code: ErrorCode.SYNC_DESTINATION_ERROR,
            message: msg,
          });

          await this.eventBus.publish({
            type: 'SYNC_ITEM_FAILED',
            organizationId: job.organizationId,
            source: 'OrderSyncEngine',
            data: {
              orderRef,
              error: msg,
            },
          });
        }
      }

      // 6. Save new mappings
      if (mappingsToSave.length > 0) {
        await this.entityMappingRepo.saveBatchMappings(mappingsToSave).catch((err) => {
          this.logger.error('Error al guardar correlaciones de pedidos', err);
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

      // 7. Emit ORDER_SYNC_COMPLETED
      await this.eventBus.publish({
        type: execution.status === 'FAILED' ? 'ORDER_SYNC_FAILED' : 'ORDER_SYNC_COMPLETED',
        organizationId: job.organizationId,
        source: 'OrderSyncEngine',
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

      // 8. Write Audit Log
      const auditEntry: AuditLog = {
        id: `aud_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
        organizationId: job.organizationId,
        action: 'ORDER_SYNC_EXECUTION',
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

      this.logger.info(`Sincronización de pedidos finalizada: ${execution.status}`, {
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
        message: `Fallo global en la sincronización de pedidos: ${errorMessage}`,
      });

      await this.eventBus.publish({
        type: 'ORDER_SYNC_FAILED',
        organizationId: job.organizationId,
        source: 'OrderSyncEngine',
        data: {
          jobId: job.id,
          executionId,
          error: errorMessage,
        },
      });

      this.logger.error('Error crítico durante la sincronización de pedidos', globalError);
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
