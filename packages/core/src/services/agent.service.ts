import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  AgentHeartbeatPayload,
  AgentPairingRequest,
  AgentPairingToken,
  Connection,
  FactusolDetectedInstance,
  Logger,
} from '@erp-bridge/shared';
import { BridgeError, ErrorCode } from '@erp-bridge/sdk';
import {
  IAgentRepository,
  IConnectionRepository,
  PostgresAgentRepository,
  PostgresConnectionRepository,
} from '../database';
import { EventBus } from '../events';

export class AgentService {
  private readonly logger = new Logger('AgentService');

  constructor(
    private readonly agentRepo: IAgentRepository = new PostgresAgentRepository(),
    private readonly connectionRepo: IConnectionRepository = new PostgresConnectionRepository(),
    private readonly eventBus: EventBus = EventBus.getInstance()
  ) {}

  public async generatePairingToken(
    organizationId: string,
    createdById?: string
  ): Promise<{ token: string; expiresAt: Date }> {
    // Generate 6-char alphanumeric pairing code (e.g. 'EB-8742' or 'A9F3X2')
    const rawToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    const token = `EB-${rawToken}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    const pairingToken: AgentPairingToken = {
      token,
      organizationId,
      expiresAt,
      createdById,
    };

    await this.agentRepo.savePairingToken(pairingToken);
    this.logger.info(`Pairing token generado: ${token} para org ${organizationId}`);

    return { token, expiresAt };
  }

  public async pairAgent(req: AgentPairingRequest): Promise<{
    agent: Agent;
    authToken: string;
    detectedFactusol: FactusolDetectedInstance[];
  }> {
    const tokenData = await this.agentRepo.getPairingToken(req.pairingToken);
    if (!tokenData) {
      throw new BridgeError(
        ErrorCode.AUTHENTICATION_FAILED,
        'El código de emparejamiento es inválido o ha expirado.'
      );
    }

    const agentId = `agent_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const newAgent: Agent = {
      id: agentId,
      organizationId: tokenData.organizationId,
      name: req.name,
      status: 'ONLINE',
      version: req.systemInfo.nodeVersion,
      platform: `${req.systemInfo.platform} (${req.systemInfo.arch})`,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.agentRepo.create(newAgent);
    await this.agentRepo.consumePairingToken(req.pairingToken);

    // Auto-create / configure Factusol connection if detected
    const detected = req.detectedFactusol || [];
    if (detected.length > 0 && detected[0]?.isValid) {
      const primary = detected[0]!;
      const connId = `conn_factusol_${agentId.substring(6, 12)}`;
      const factusolConn: Connection = {
        id: connId,
        organizationId: tokenData.organizationId,
        connectorId: 'connector-factusol',
        name: `Factusol Local (${primary.companyCode || 'Empresa'})`,
        status: 'CONNECTED',
        agentId: agentId,
        configuration: {
          databasePath: primary.databasePath,
          companyCode: primary.companyCode,
          year: primary.year,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.connectionRepo.create(factusolConn).catch(() => {});
      this.logger.info(`Conexión Factusol auto-registrada para el agente ${agentId}: ${primary.databasePath}`);
    }

    const authToken = `eb_sec_${crypto.randomBytes(24).toString('hex')}`;

    await this.eventBus.publish({
      type: 'AGENT_HEARTBEAT',
      organizationId: tokenData.organizationId,
      source: 'AgentService',
      data: {
        agentId,
        name: req.name,
        action: 'PAIRED',
        systemInfo: req.systemInfo,
      },
    });

    this.logger.info(`Agente local emparejado exitosamente: ${agentId} (${req.name})`);

    return {
      agent: newAgent,
      authToken,
      detectedFactusol: detected,
    };
  }

  public async recordHeartbeat(payload: AgentHeartbeatPayload): Promise<{
    acknowledged: boolean;
    status: Agent['status'];
  }> {
    await this.agentRepo.heartbeat(payload.agentId);

    await this.eventBus.publish({
      type: 'AGENT_HEARTBEAT',
      organizationId: 'org_default',
      source: 'AgentService',
      data: {
        agentId: payload.agentId,
        factusolHealth: payload.factusolHealth,
        systemInfo: payload.systemInfo,
      },
    });

    return {
      acknowledged: true,
      status: 'ONLINE',
    };
  }

  public async listAgents(organizationId: string): Promise<Agent[]> {
    const agents = await this.agentRepo.listByOrganization(organizationId);
    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 90_000; // 90 seconds without heartbeat => OFFLINE

    return agents.map((a: Agent) => {
      const diff = now - new Date(a.lastSeenAt).getTime();
      const status = diff > OFFLINE_THRESHOLD_MS ? 'OFFLINE' : a.status;
      return {
        ...a,
        status,
      };
    });
  }

  public async getAgentById(organizationId: string, id: string): Promise<Agent> {
    const agent = await this.agentRepo.findById(organizationId, id);
    if (!agent) {
      throw new BridgeError(ErrorCode.ENTITY_NOT_FOUND, `Agente no encontrado: ${id}`);
    }
    return agent;
  }
}
