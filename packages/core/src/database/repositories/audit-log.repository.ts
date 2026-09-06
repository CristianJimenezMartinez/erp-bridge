import { AuditLog } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface IAuditLogRepository {
  create(log: AuditLog): Promise<AuditLog>;
  listByOrganization(organizationId: string, limit?: number, offset?: number): Promise<AuditLog[]>;
  listAll(limit?: number): Promise<AuditLog[]>;
}

export class PostgresAuditLogRepository implements IAuditLogRepository {
  private inMemoryFallback: AuditLog[] = [];

  constructor(private readonly db: DatabaseService = DatabaseService.getInstance()) {}

  async create(log: AuditLog): Promise<AuditLog> {
    if (!this.db.isAvailable()) {
      this.inMemoryFallback.unshift(log);
      if (this.inMemoryFallback.length > 500) {
        this.inMemoryFallback.pop();
      }
      return log;
    }

    await this.db.query(
      `INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, timestamp, result, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        log.id,
        log.organizationId,
        log.userId || null,
        log.action,
        log.resourceType,
        log.resourceId,
        log.timestamp,
        log.result,
        JSON.stringify(log.metadata || {}),
      ]
    );

    return log;
  }

  async listByOrganization(organizationId: string, limit = 100, offset = 0): Promise<AuditLog[]> {
    if (!this.db.isAvailable()) {
      return this.inMemoryFallback
        .filter((l) => l.organizationId === organizationId)
        .slice(offset, offset + limit);
    }

    const res = await this.db.query(
      `SELECT id, organization_id, user_id, action, resource_type, resource_id, timestamp, result, metadata
       FROM audit_logs
       WHERE organization_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );

    return res.rows.map((r) => this.mapRow(r as Record<string, unknown>));
  }

  async listAll(limit = 100): Promise<AuditLog[]> {
    if (!this.db.isAvailable()) {
      return this.inMemoryFallback.slice(0, limit);
    }

    const res = await this.db.query(
      `SELECT id, organization_id, user_id, action, resource_type, resource_id, timestamp, result, metadata
       FROM audit_logs
       ORDER BY timestamp DESC
       LIMIT $1`,
      [limit]
    );

    return res.rows.map((r) => this.mapRow(r as Record<string, unknown>));
  }

  private mapRow(row: Record<string, unknown>): AuditLog {
    return {
      id: row['id'] as string,
      organizationId: row['organization_id'] as string,
      userId: (row['user_id'] as string) || undefined,
      action: row['action'] as string,
      resourceType: (row['resource_type'] as string) || 'system',
      resourceId: (row['resource_id'] as string) || (row['id'] as string),
      timestamp: new Date(row['timestamp'] as string),
      result: (row['result'] as AuditLog['result']) || 'SUCCESS',
      metadata: typeof row['metadata'] === 'object' && row['metadata'] !== null ? (row['metadata'] as Record<string, unknown>) : {},
    };
  }
}
