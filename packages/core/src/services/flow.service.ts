import { v4 as uuidv4 } from 'uuid';
import { BridgeEvent, Flow, FlowExecution } from '@erp-bridge/shared';
import { BridgeError, ErrorCode } from '@erp-bridge/sdk';
import { IFlowRepository, PostgresFlowRepository } from '../database';
import { FlowEngine } from '../engine';

export interface CreateFlowDto {
  organizationId: string;
  name: string;
  description?: string;
  triggerEventType: Flow['triggerEventType'];
  filters?: Flow['filters'];
  actions: Flow['actions'];
  isEnabled?: boolean;
}

export class FlowService {
  constructor(
    private readonly flowRepo: IFlowRepository = new PostgresFlowRepository(),
    private readonly flowEngine: FlowEngine = FlowEngine.getInstance()
  ) {}

  public async listFlows(organizationId: string): Promise<Flow[]> {
    return this.flowRepo.listFlows(organizationId);
  }

  public async getFlowById(organizationId: string, id: string): Promise<Flow> {
    const flow = await this.flowRepo.getFlowById(organizationId, id);
    if (!flow) {
      throw new BridgeError(ErrorCode.ENTITY_NOT_FOUND, `Flujo de automatización no encontrado: ${id}`);
    }
    return flow;
  }

  public async createFlow(dto: CreateFlowDto): Promise<Flow> {
    const id = `flow_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const newFlow: Flow = {
      id,
      organizationId: dto.organizationId,
      name: dto.name,
      description: dto.description,
      triggerEventType: dto.triggerEventType,
      filters: dto.filters || [],
      actions: dto.actions,
      isEnabled: dto.isEnabled !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.flowRepo.createFlow(newFlow);
  }

  public async toggleFlow(organizationId: string, id: string, isEnabled?: boolean): Promise<Flow> {
    const flow = await this.getFlowById(organizationId, id);
    flow.isEnabled = isEnabled !== undefined ? isEnabled : !flow.isEnabled;
    flow.updatedAt = new Date();
    return this.flowRepo.updateFlow(flow);
  }

  public async testFlow(
    organizationId: string,
    id: string,
    sampleData: Record<string, unknown>
  ): Promise<FlowExecution> {
    const flow = await this.getFlowById(organizationId, id);
    const simulatedEvent: BridgeEvent = {
      id: `evt_sim_${uuidv4().replace(/-/g, '').substring(0, 10)}`,
      type: flow.triggerEventType,
      organizationId,
      source: 'FlowTestRunner',
      timestamp: new Date(),
      data: sampleData,
      status: 'RECEIVED',
    };

    return this.flowEngine.executeFlow(flow, simulatedEvent);
  }

  public async listExecutions(
    organizationId: string,
    flowId?: string,
    limit = 50
  ): Promise<FlowExecution[]> {
    return this.flowRepo.listExecutions(organizationId, flowId, limit);
  }
}
