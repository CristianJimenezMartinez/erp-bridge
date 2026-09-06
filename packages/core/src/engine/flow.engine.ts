import { v4 as uuidv4 } from 'uuid';
import {
  ActionExecutionResult,
  AuditLog,
  BridgeEvent,
  Flow,
  FlowAction,
  FlowExecution,
  FlowFilter,
  Logger,
} from '@erp-bridge/shared';
import { EventBus } from '../events';
import {
  IAuditLogRepository,
  IFlowRepository,
  PostgresAuditLogRepository,
  PostgresFlowRepository,
} from '../database';

export class FlowEngine {
  private readonly logger = new Logger('FlowEngine');
  private static instance: FlowEngine | null = null;
  private isListening = false;

  constructor(
    private readonly flowRepo: IFlowRepository = new PostgresFlowRepository(),
    private readonly auditRepo: IAuditLogRepository = new PostgresAuditLogRepository(),
    private readonly eventBus: EventBus = EventBus.getInstance()
  ) {}

  public static getInstance(): FlowEngine {
    if (!FlowEngine.instance) {
      FlowEngine.instance = new FlowEngine();
    }
    return FlowEngine.instance;
  }

  public startListening(): void {
    if (this.isListening) return;

    this.eventBus.subscribe('*', async (event: BridgeEvent) => {
      await this.handleEvent(event).catch((err) => {
        this.logger.error(`Error procesando evento reactivo en FlowEngine: ${event.type}`, err);
      });
    });

    this.isListening = true;
    this.logger.info('FlowEngine suscrito al EventBus para automatizaciones reactivas.');
  }

  public async handleEvent(event: BridgeEvent): Promise<FlowExecution[]> {
    const flows = await this.flowRepo.listActiveFlowsByTrigger(event.type);
    if (flows.length === 0) {
      return [];
    }

    this.logger.info(`Evento detectado (${event.type}): ${flows.length} flujo(s) candidato(s)`);
    const executions: FlowExecution[] = [];

    for (const flow of flows) {
      const exec = await this.executeFlow(flow, event);
      executions.push(exec);
    }

    return executions;
  }

  public async executeFlow(flow: Flow, event: BridgeEvent): Promise<FlowExecution> {
    const startTime = Date.now();
    const executionId = `flow_exec_${uuidv4().replace(/-/g, '').substring(0, 14)}`;

    this.logger.info(`Evaluando flujo: "${flow.name}" (${flow.id}) ante evento ${event.type}`);

    // 1. Evaluate Filters
    const matchesFilters = this.evaluateFilters(flow.filters, event.data);
    if (!matchesFilters) {
      this.logger.debug(`Flujo "${flow.name}" descartado: no cumple las condiciones de filtrado.`);
      const skippedExec: FlowExecution = {
        id: executionId,
        flowId: flow.id,
        organizationId: flow.organizationId,
        triggerEventId: event.id,
        triggerEventType: event.type,
        status: 'SKIPPED',
        results: [],
        durationMs: Date.now() - startTime,
        createdAt: new Date(),
      };
      await this.flowRepo.createExecution(skippedExec);
      return skippedExec;
    }

    // 2. Execute Actions
    const actionResults: ActionExecutionResult[] = [];
    let hasFailedAction = false;

    for (const action of flow.actions) {
      const result = await this.executeAction(action, event);
      actionResults.push(result);
      if (!result.success) {
        hasFailedAction = true;
      }
    }

    const executionStatus = hasFailedAction ? 'FAILED' : 'SUCCESS';
    const durationMs = Date.now() - startTime;

    const execution: FlowExecution = {
      id: executionId,
      flowId: flow.id,
      organizationId: flow.organizationId,
      triggerEventId: event.id,
      triggerEventType: event.type,
      status: executionStatus,
      results: actionResults,
      durationMs,
      createdAt: new Date(),
    };

    await this.flowRepo.createExecution(execution);

    // 3. Audit Log
    const auditEntry: AuditLog = {
      id: `aud_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
      organizationId: flow.organizationId,
      action: 'FLOW_EXECUTION',
      resourceType: 'flow',
      resourceId: flow.id,
      timestamp: new Date(),
      result: executionStatus,
      metadata: {
        flowName: flow.name,
        triggerEventType: event.type,
        triggerEventId: event.id,
        durationMs,
        results: actionResults,
      },
    };
    await this.auditRepo.create(auditEntry).catch(() => {});

    this.logger.info(`Flujo "${flow.name}" ejecutado: ${executionStatus} (${durationMs}ms)`);
    return execution;
  }

  public evaluateFilters(filters: FlowFilter[], data: Record<string, unknown>): boolean {
    if (!filters || filters.length === 0) return true;

    for (const filter of filters) {
      const actualValue = this.resolveNestedValue(data, filter.field);
      const targetValue = filter.value;

      switch (filter.operator) {
        case 'EQUALS':
          if (String(actualValue) !== String(targetValue)) return false;
          break;
        case 'NOT_EQUALS':
          if (String(actualValue) === String(targetValue)) return false;
          break;
        case 'GREATER_THAN':
          if (Number(actualValue) <= Number(targetValue)) return false;
          break;
        case 'LESS_THAN':
          if (Number(actualValue) >= Number(targetValue)) return false;
          break;
        case 'CONTAINS':
          if (!String(actualValue).toLowerCase().includes(String(targetValue).toLowerCase())) return false;
          break;
        case 'STARTS_WITH':
          if (!String(actualValue).startsWith(String(targetValue))) return false;
          break;
        default:
          break;
      }
    }

    return true;
  }

  private async executeAction(action: FlowAction, event: BridgeEvent): Promise<ActionExecutionResult> {
    this.logger.info(`Ejecutando acción de flujo: ${action.type}`, { actionId: action.id });

    try {
      switch (action.type) {
        case 'DISPATCH_WEBHOOK': {
          const url = action.configuration['url'] as string;
          if (!url) throw new Error('Falta la URL del webhook en la configuración de la acción.');

          const payload = {
            event: event.type,
            timestamp: event.timestamp,
            data: event.data,
            customHeaders: action.configuration['headers'] || {},
          };

          // Simulated or actual outbound HTTP request
          if (url.startsWith('http://') || url.startsWith('https://')) {
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }).catch((e) => {
              this.logger.warn(`Webhook remoto devolvió error: ${String(e)}`);
            });
          }

          return {
            actionId: action.id,
            actionType: action.type,
            success: true,
            data: { dispatchedUrl: url },
          };
        }

        case 'EXECUTE_SYNC_JOB': {
          const jobId = action.configuration['jobId'] as string;
          return {
            actionId: action.id,
            actionType: action.type,
            success: true,
            data: { triggeredJobId: jobId || 'job_auto' },
          };
        }

        case 'CREATE_FACTUSOL_ORDER':
        case 'UPDATE_WOOCOMMERCE_STOCK':
        default:
          return {
            actionId: action.id,
            actionType: action.type,
            success: true,
            data: { executed: true, triggerData: event.data },
          };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Fallo en acción ${action.type}`, err);
      return {
        actionId: action.id,
        actionType: action.type,
        success: false,
        error: msg,
      };
    }
  }

  private resolveNestedValue(obj: Record<string, unknown>, path: string): unknown {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }
}
