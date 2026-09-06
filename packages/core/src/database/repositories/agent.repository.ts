import { Agent, AgentPairingToken } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface IAgentRepository {
  findById(organizationId: string, id: string): Promise<Agent | null>;
  findByIdGlobal(id: string): Promise<Agent | null>;
  listByOrganization(organizationId: string): Promise<Agent[]>;
  create(agent: Agent): Promise<Agent>;
  update(agent: Agent): Promise<Agent>;
  heartbeat(id: string, ipAddress?: string): Promise<void>;
  savePairingToken(token: AgentPairingToken): Promise<void>;
  getPairingToken(token: string): Promise<AgentPairingToken | null>;
  consumePairingToken(token: string): Promise<void>;
}

export class PostgresAgentRepository implements IAgentRepository {
  private static readonly memoryTokens: Map<string, AgentPairingToken> = new Map();
  private static readonly memoryAgents: Map<string, Agent> = new Map();

  constructor(private db: DatabaseService = DatabaseService.getInstance()) {}

  async findById(organizationId: string, id: string): Promise<Agent | null> {
    const mem = PostgresAgentRepository.memoryAgents.get(id);
    if (mem && mem.organizationId === organizationId) return { ...mem };

    try {
      const res = await this.db.query(
        `SELECT id, organization_id, name, status, version, last_seen_at, ip_address, platform, created_at, updated_at
         FROM agents
         WHERE organization_id = $1 AND id = $2`,
        [organizationId, id]
      );
      const row = res.rows[0];
      if (!row) return null;
      return this.mapRow(row as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async findByIdGlobal(id: string): Promise<Agent | null> {
    const mem = PostgresAgentRepository.memoryAgents.get(id);
    if (mem) return { ...mem };

    try {
      const res = await this.db.query(
        `SELECT id, organization_id, name, status, version, last_seen_at, ip_address, platform, created_at, updated_at
         FROM agents
         WHERE id = $1`,
        [id]
      );
      const row = res.rows[0];
      if (!row) return null;
      return this.mapRow(row as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async listByOrganization(organizationId: string): Promise<Agent[]> {
    const memList = Array.from(PostgresAgentRepository.memoryAgents.values()).filter(
      (a) => a.organizationId === organizationId
    );

    try {
      const res = await this.db.query(
        `SELECT id, organization_id, name, status, version, last_seen_at, ip_address, platform, created_at, updated_at
         FROM agents
         WHERE organization_id = $1
         ORDER BY last_seen_at DESC`,
        [organizationId]
      );
      const dbList = res.rows.map((row) => this.mapRow(row));
      const map = new Map<string, Agent>();
      for (const a of dbList) map.set(a.id, a);
      for (const a of memList) map.set(a.id, a);
      return Array.from(map.values());
    } catch {
      return memList;
    }
  }

  async create(agent: Agent): Promise<Agent> {
    PostgresAgentRepository.memoryAgents.set(agent.id, { ...agent });

    try {
      await this.db.query(
        `INSERT INTO agents (id, organization_id, name, status, version, last_seen_at, ip_address, platform, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE
         SET name = $3, status = $4, version = $5, last_seen_at = $6, ip_address = $7, updated_at = $10`,
        [
          agent.id,
          agent.organizationId,
          agent.name,
          agent.status,
          agent.version,
          agent.lastSeenAt,
          agent.ipAddress || null,
          agent.platform || 'win32',
          agent.createdAt,
          agent.updatedAt,
        ]
      );
    } catch {}

    return agent;
  }

  async update(agent: Agent): Promise<Agent> {
    PostgresAgentRepository.memoryAgents.set(agent.id, { ...agent });

    try {
      await this.db.query(
        `UPDATE agents
         SET name = $3, status = $4, version = $5, last_seen_at = $6, ip_address = $7, platform = $8, updated_at = $9
         WHERE organization_id = $1 AND id = $2`,
        [
          agent.organizationId,
          agent.id,
          agent.name,
          agent.status,
          agent.version,
          agent.lastSeenAt,
          agent.ipAddress || null,
          agent.platform || 'win32',
          agent.updatedAt,
        ]
      );
    } catch {}

    return agent;
  }

  async heartbeat(id: string, ipAddress?: string): Promise<void> {
    const mem = PostgresAgentRepository.memoryAgents.get(id);
    if (mem) {
      mem.status = 'ONLINE';
      mem.lastSeenAt = new Date();
      mem.updatedAt = new Date();
      if (ipAddress) mem.ipAddress = ipAddress;
    }

    try {
      await this.db.query(
        `UPDATE agents
         SET status = 'ONLINE', last_seen_at = CURRENT_TIMESTAMP, ip_address = COALESCE($2, ip_address), updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, ipAddress || null]
      );
    } catch {}
  }

  async savePairingToken(token: AgentPairingToken): Promise<void> {
    PostgresAgentRepository.memoryTokens.set(token.token, { ...token });
  }

  async getPairingToken(token: string): Promise<AgentPairingToken | null> {
    const found = PostgresAgentRepository.memoryTokens.get(token);
    if (!found) return null;
    if (found.expiresAt < new Date()) {
      PostgresAgentRepository.memoryTokens.delete(token);
      return null;
    }
    return { ...found };
  }

  async consumePairingToken(token: string): Promise<void> {
    PostgresAgentRepository.memoryTokens.delete(token);
  }

  private mapRow(row: Record<string, unknown>): Agent {
    return {
      id: row['id'] as string,
      organizationId: row['organization_id'] as string,
      name: row['name'] as string,
      status: row['status'] as Agent['status'],
      version: row['version'] as string,
      lastSeenAt: new Date(row['last_seen_at'] as string),
      ipAddress: row['ip_address'] ? (row['ip_address'] as string) : undefined,
      platform: row['platform'] ? (row['platform'] as string) : undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
