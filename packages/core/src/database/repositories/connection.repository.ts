import { Connection } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface IConnectionRepository {
  findById(organizationId: string, id: string): Promise<Connection | null>;
  findByIdGlobal(id: string): Promise<Connection | null>;
  listByOrganization(organizationId: string): Promise<Connection[]>;
  create(conn: Connection): Promise<Connection>;
  update(conn: Connection): Promise<Connection>;
  delete(organizationId: string, id: string): Promise<boolean>;
}

export class PostgresConnectionRepository implements IConnectionRepository {
  constructor(private db: DatabaseService = DatabaseService.getInstance()) {}

  async findById(organizationId: string, id: string): Promise<Connection | null> {
    const res = await this.db.query(
      `SELECT id, organization_id, connector_id, name, status, agent_id, credential_id, configuration, created_at, updated_at
       FROM connections
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row as Record<string, unknown>);
  }

  async findByIdGlobal(id: string): Promise<Connection | null> {
    const res = await this.db.query(
      `SELECT id, organization_id, connector_id, name, status, agent_id, credential_id, configuration, created_at, updated_at
       FROM connections
       WHERE id = $1`,
      [id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row as Record<string, unknown>);
  }

  async listByOrganization(organizationId: string): Promise<Connection[]> {
    const res = await this.db.query(
      `SELECT id, organization_id, connector_id, name, status, agent_id, credential_id, configuration, created_at, updated_at
       FROM connections
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async create(conn: Connection): Promise<Connection> {
    await this.db.query(
      `INSERT INTO connections (id, organization_id, connector_id, name, status, agent_id, credential_id, configuration, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        conn.id,
        conn.organizationId,
        conn.connectorId,
        conn.name,
        conn.status,
        conn.agentId || null,
        conn.credentialId || null,
        JSON.stringify(conn.configuration),
        conn.createdAt,
        conn.updatedAt,
      ]
    );
    return conn;
  }

  async update(conn: Connection): Promise<Connection> {
    await this.db.query(
      `UPDATE connections
       SET name = $3, status = $4, agent_id = $5, credential_id = $6, configuration = $7, updated_at = $8
       WHERE organization_id = $1 AND id = $2`,
      [
        conn.organizationId,
        conn.id,
        conn.name,
        conn.status,
        conn.agentId || null,
        conn.credentialId || null,
        JSON.stringify(conn.configuration),
        conn.updatedAt,
      ]
    );
    return conn;
  }

  async delete(organizationId: string, id: string): Promise<boolean> {
    const res = await this.db.query(
      `DELETE FROM connections WHERE organization_id = $1 AND id = $2`,
      [organizationId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Connection {
    return {
      id: row['id'] as string,
      organizationId: row['organization_id'] as string,
      connectorId: row['connector_id'] as string,
      name: row['name'] as string,
      status: row['status'] as Connection['status'],
      agentId: row['agent_id'] ? (row['agent_id'] as string) : undefined,
      credentialId: row['credential_id'] ? (row['credential_id'] as string) : undefined,
      configuration: typeof row['configuration'] === 'string' ? JSON.parse(row['configuration']) : (row['configuration'] as Record<string, unknown>),
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
