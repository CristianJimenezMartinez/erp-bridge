import { Flow, FlowExecution } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface IFlowRepository {
  createFlow(flow: Flow): Promise<Flow>;
  updateFlow(flow: Flow): Promise<Flow>;
  getFlowById(organizationId: string, id: string): Promise<Flow | null>;
  listFlows(organizationId: string): Promise<Flow[]>;
  listActiveFlowsByTrigger(triggerEventType: string): Promise<Flow[]>;
  createExecution(execution: FlowExecution): Promise<FlowExecution>;
  listExecutions(organizationId: string, flowId?: string, limit?: number): Promise<FlowExecution[]>;
}

export class PostgresFlowRepository implements IFlowRepository {
  private static readonly memoryFlows: Map<string, Flow> = new Map();
  private static readonly memoryExecutions: FlowExecution[] = [];

  constructor(private readonly _db: DatabaseService = DatabaseService.getInstance()) {
    void this._db;
  }

  async createFlow(flow: Flow): Promise<Flow> {
    PostgresFlowRepository.memoryFlows.set(flow.id, { ...flow });
    return flow;
  }

  async updateFlow(flow: Flow): Promise<Flow> {
    PostgresFlowRepository.memoryFlows.set(flow.id, { ...flow });
    return flow;
  }

  async getFlowById(organizationId: string, id: string): Promise<Flow | null> {
    const flow = PostgresFlowRepository.memoryFlows.get(id);
    if (flow && flow.organizationId === organizationId) {
      return { ...flow };
    }
    return null;
  }

  async listFlows(organizationId: string): Promise<Flow[]> {
    return Array.from(PostgresFlowRepository.memoryFlows.values()).filter(
      (f) => f.organizationId === organizationId
    );
  }

  async listActiveFlowsByTrigger(triggerEventType: string): Promise<Flow[]> {
    return Array.from(PostgresFlowRepository.memoryFlows.values()).filter(
      (f) => f.isEnabled && f.triggerEventType === triggerEventType
    );
  }

  async createExecution(execution: FlowExecution): Promise<FlowExecution> {
    PostgresFlowRepository.memoryExecutions.unshift({ ...execution });
    return execution;
  }

  async listExecutions(
    organizationId: string,
    flowId?: string,
    limit = 50
  ): Promise<FlowExecution[]> {
    let list = PostgresFlowRepository.memoryExecutions.filter(
      (e) => e.organizationId === organizationId
    );
    if (flowId) {
      list = list.filter((e) => e.flowId === flowId);
    }
    return list.slice(0, limit);
  }
}
