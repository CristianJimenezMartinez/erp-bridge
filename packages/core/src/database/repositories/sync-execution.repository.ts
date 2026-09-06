import { SyncExecution, SyncExecutionError } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface ISyncExecutionRepository {
  findById(organizationId: string, id: string): Promise<SyncExecution | null>;
  listByJob(syncJobId: string, limit?: number): Promise<SyncExecution[]>;
  listByOrganization(organizationId: string, limit?: number): Promise<SyncExecution[]>;
  create(execution: SyncExecution): Promise<SyncExecution>;
  update(execution: SyncExecution): Promise<SyncExecution>;
}

export class PostgresSyncExecutionRepository implements ISyncExecutionRepository {
  constructor(private db: DatabaseService = DatabaseService.getInstance()) {}

  async findById(organizationId: string, id: string): Promise<SyncExecution | null> {
    const res = await this.db.query(
      `SELECT id, sync_job_id, organization_id, status, started_at, completed_at, duration_ms, processed_count, success_count, failed_count, errors, metadata
       FROM sync_executions
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row as Record<string, unknown>);
  }

  async listByJob(syncJobId: string, limit = 50): Promise<SyncExecution[]> {
    const res = await this.db.query(
      `SELECT id, sync_job_id, organization_id, status, started_at, completed_at, duration_ms, processed_count, success_count, failed_count, errors, metadata
       FROM sync_executions
       WHERE sync_job_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [syncJobId, limit]
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async listByOrganization(organizationId: string, limit = 50): Promise<SyncExecution[]> {
    const res = await this.db.query(
      `SELECT id, sync_job_id, organization_id, status, started_at, completed_at, duration_ms, processed_count, success_count, failed_count, errors, metadata
       FROM sync_executions
       WHERE organization_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [organizationId, limit]
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async create(execution: SyncExecution): Promise<SyncExecution> {
    await this.db.query(
      `INSERT INTO sync_executions (id, sync_job_id, organization_id, status, started_at, completed_at, duration_ms, processed_count, success_count, failed_count, errors, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        execution.id,
        execution.syncJobId,
        execution.organizationId,
        execution.status,
        execution.startedAt,
        execution.completedAt || null,
        execution.durationMs || null,
        execution.processedCount,
        execution.successCount,
        execution.failedCount,
        JSON.stringify(execution.errors || []),
        JSON.stringify(execution.metadata || {}),
      ]
    );
    return execution;
  }

  async update(execution: SyncExecution): Promise<SyncExecution> {
    await this.db.query(
      `UPDATE sync_executions
       SET status = $3, completed_at = $4, duration_ms = $5, processed_count = $6, success_count = $7, failed_count = $8, errors = $9, metadata = $10
       WHERE organization_id = $1 AND id = $2`,
      [
        execution.organizationId,
        execution.id,
        execution.status,
        execution.completedAt || null,
        execution.durationMs || null,
        execution.processedCount,
        execution.successCount,
        execution.failedCount,
        JSON.stringify(execution.errors || []),
        JSON.stringify(execution.metadata || {}),
      ]
    );
    return execution;
  }

  private mapRow(row: Record<string, unknown>): SyncExecution {
    return {
      id: row['id'] as string,
      syncJobId: row['sync_job_id'] as string,
      organizationId: row['organization_id'] as string,
      status: row['status'] as SyncExecution['status'],
      startedAt: new Date(row['started_at'] as string),
      completedAt: row['completed_at'] ? new Date(row['completed_at'] as string) : undefined,
      durationMs: row['duration_ms'] ? Number(row['duration_ms']) : undefined,
      processedCount: Number(row['processed_count']) || 0,
      successCount: Number(row['success_count']) || 0,
      failedCount: Number(row['failed_count']) || 0,
      errors: typeof row['errors'] === 'string' ? JSON.parse(row['errors']) : ((row['errors'] || []) as SyncExecutionError[]),
      metadata: typeof row['metadata'] === 'string' ? JSON.parse(row['metadata']) : ((row['metadata'] || {}) as Record<string, unknown>),
    };
  }
}
