import { ExternalEntityMapping } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface IEntityMappingRepository {
  findMapping(
    organizationId: string,
    entityType: string,
    sourceConnectionId: string,
    sourceIdentifier: string,
    targetConnectionId: string
  ): Promise<ExternalEntityMapping | null>;

  getMappingMap(
    organizationId: string,
    entityType: string,
    sourceConnectionId: string,
    targetConnectionId: string
  ): Promise<Map<string, string>>;

  saveMapping(mapping: ExternalEntityMapping): Promise<ExternalEntityMapping>;
  saveBatchMappings(mappings: ExternalEntityMapping[]): Promise<void>;
}

export class PostgresEntityMappingRepository implements IEntityMappingRepository {
  constructor(private db: DatabaseService = DatabaseService.getInstance()) {}

  async findMapping(
    organizationId: string,
    entityType: string,
    sourceConnectionId: string,
    sourceIdentifier: string,
    targetConnectionId: string
  ): Promise<ExternalEntityMapping | null> {
    const res = await this.db.query(
      `SELECT id, organization_id, entity_type, source_connection_id, source_identifier, target_connection_id, target_identifier, last_synced_at, hash
       FROM external_entity_mappings
       WHERE organization_id = $1 AND entity_type = $2 AND source_connection_id = $3 AND source_identifier = $4 AND target_connection_id = $5`,
      [organizationId, entityType, sourceConnectionId, sourceIdentifier, targetConnectionId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row as Record<string, unknown>);
  }

  async getMappingMap(
    organizationId: string,
    entityType: string,
    sourceConnectionId: string,
    targetConnectionId: string
  ): Promise<Map<string, string>> {
    const res = await this.db.query(
      `SELECT source_identifier, target_identifier
       FROM external_entity_mappings
       WHERE organization_id = $1 AND entity_type = $2 AND source_connection_id = $3 AND target_connection_id = $4`,
      [organizationId, entityType, sourceConnectionId, targetConnectionId]
    );
    const map = new Map<string, string>();
    for (const row of res.rows) {
      map.set(row['source_identifier'] as string, row['target_identifier'] as string);
    }
    return map;
  }

  async saveMapping(mapping: ExternalEntityMapping): Promise<ExternalEntityMapping> {
    await this.db.query(
      `INSERT INTO external_entity_mappings (id, organization_id, entity_type, source_connection_id, source_identifier, target_connection_id, target_identifier, last_synced_at, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (organization_id, entity_type, source_connection_id, source_identifier, target_connection_id)
       DO UPDATE SET target_identifier = $7, last_synced_at = $8, hash = $9`,
      [
        mapping.id,
        mapping.organizationId,
        mapping.entityType,
        mapping.sourceConnectionId,
        mapping.sourceIdentifier,
        mapping.targetConnectionId,
        mapping.targetIdentifier,
        mapping.lastSyncedAt,
        mapping.hash || null,
      ]
    );
    return mapping;
  }

  async saveBatchMappings(mappings: ExternalEntityMapping[]): Promise<void> {
    for (const m of mappings) {
      await this.saveMapping(m);
    }
  }

  private mapRow(row: Record<string, unknown>): ExternalEntityMapping {
    return {
      id: row['id'] as string,
      organizationId: row['organization_id'] as string,
      entityType: row['entity_type'] as string,
      sourceConnectionId: row['source_connection_id'] as string,
      sourceIdentifier: row['source_identifier'] as string,
      targetConnectionId: row['target_connection_id'] as string,
      targetIdentifier: row['target_identifier'] as string,
      lastSyncedAt: new Date(row['last_synced_at'] as string),
      hash: row['hash'] ? (row['hash'] as string) : undefined,
    };
  }
}
