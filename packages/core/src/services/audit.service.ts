import { AuditLog, BridgeEvent } from '@erp-bridge/shared';
import { IAuditLogRepository, PostgresAuditLogRepository } from '../database';
import { EventBus } from '../events';

export class AuditService {
  constructor(
    private readonly auditRepo: IAuditLogRepository = new PostgresAuditLogRepository(),
    private readonly eventBus: EventBus = EventBus.getInstance()
  ) {}

  public async listLogs(organizationId: string, limit = 100, offset = 0): Promise<AuditLog[]> {
    return this.auditRepo.listByOrganization(organizationId, limit, offset);
  }

  public async listAllLogs(limit = 100): Promise<AuditLog[]> {
    return this.auditRepo.listAll(limit);
  }

  public listEvents(organizationId?: string, limit = 50): BridgeEvent[] {
    return this.eventBus.getRecentEvents(organizationId, limit);
  }
}
