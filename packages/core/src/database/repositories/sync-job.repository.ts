import { SyncJob } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface ISyncJobRepository {
  findById(organizationId: string, id: string): Promise<SyncJob | null>;
  findByIdGlobal(id: string): Promise<SyncJob | null>;
  listByOrganization(organizationId: string): Promise<SyncJob[]>;
  create(job: SyncJob): Promise<SyncJob>;
  update(job: SyncJob): Promise<SyncJob>;
  delete(organizationId: string, id: string): Promise<boolean>;
}

export class PostgresSyncJobRepository implements ISyncJobRepository {
  constructor(private db: DatabaseService = DatabaseService.getInstance()) {}

  async findById(organizationId: string, id: string): Promise<SyncJob | null> {
    const res = await this.db.query(
      `SELECT id, organization_id, name, source_connection_id, destination_connection_id, entity, direction, schedule, status, configuration, created_at, updated_at
       FROM sync_jobs
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row as Record<string, unknown>);
  }

  async findByIdGlobal(id: string): Promise<SyncJob | null> {
    const res = await this.db.query(
      `SELECT id, organization_id, name, source_connection_id, destination_connection_id, entity, direction, schedule, status, configuration, created_at, updated_at
       FROM sync_jobs
       WHERE id = $1`,
      [id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row as Record<string, unknown>);
  }

  async listByOrganization(organizationId: string): Promise<SyncJob[]>;
  async listByOrganization(organizationId: string): Promise<SyncJob[]> {
    const res = await this.db.query(
      `SELECT id, organization_id, name, source_connection_id, destination_connection_id, entity, direction, schedule, status, configuration, created_at, updated_at
       FROM sync_jobs
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async create(job: SyncJob): Promise<SyncJob> {
    await this.db.query(
      `INSERT INTO sync_jobs (id, organization_id, name, source_connection_id, destination_connection_id, entity, direction, schedule, status, configuration, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        job.id,
        job.organizationId,
        job.name,
        job.sourceConnectionId,
        job.destinationConnectionId,
        job.entity,
        job.direction,
        job.schedule,
        job.status,
        JSON.stringify(job.configuration),
        job.createdAt,
        job.updatedAt,
      ]
    );
    return job;
  }

  async update(job: SyncJob): Promise<SyncJob> {
    await this.db.query(
      `UPDATE sync_jobs
       SET name = $3, source_connection_id = $4, destination_connection_id = $5, entity = $6, direction = $7, schedule = $8, status = $9, configuration = $10, updated_at = $11
       WHERE organization_id = $1 AND id = $2`,
      [
        job.organizationId,
        job.id,
        job.name,
        job.sourceConnectionId,
        job.destinationConnectionId,
        job.entity,
        job.direction,
        job.schedule,
        job.status,
        JSON.stringify(job.configuration),
        job.updatedAt,
      ]
    );
    return job;
  }

  async delete(organizationId: string, id: string): Promise<boolean> {
    const res = await this.db.query(
      `DELETE FROM sync_jobs WHERE organization_id = $1 AND id = $2`,
      [organizationId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): SyncJob {
    return {
      id: row['id'] as string,
      organizationId: row['organization_id'] as string,
      name: row['name'] as string,
      sourceConnectionId: row['source_connection_id'] as string,
      destinationConnectionId: row['destination_connection_id'] as string,
      entity: row['entity'] as SyncJob['entity'],
      direction: row['direction'] as SyncJob['direction'],
      schedule: row['schedule'] as string,
      status: row['status'] as SyncJob['status'],
      configuration: typeof row['configuration'] === 'string' ? JSON.parse(row['configuration']) : (row['configuration'] as Record<string, unknown>),
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
