import { UpdateHistoryEntry, UpdateManifest } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface IUpdateRepository {
  publishManifest(manifest: UpdateManifest): Promise<UpdateManifest>;
  findLatestManifest(platform: string, channel: string): Promise<UpdateManifest | null>;
  findManifestByVersion(version: string, platform: string): Promise<UpdateManifest | null>;
  listManifests(channel?: string): Promise<UpdateManifest[]>;
  recordUpdateHistory(entry: UpdateHistoryEntry): Promise<UpdateHistoryEntry>;
  listUpdateHistory(agentId?: string): Promise<UpdateHistoryEntry[]>;
}

export class PostgresUpdateRepository implements IUpdateRepository {
  private static readonly memoryManifests: Map<string, UpdateManifest> = new Map();
  private static readonly memoryHistory: UpdateHistoryEntry[] = [];

  constructor(private db: DatabaseService = DatabaseService.getInstance()) {}

  async publishManifest(manifest: UpdateManifest): Promise<UpdateManifest> {
    const id = manifest.id || `manifest_${manifest.version}_${manifest.platform}`;
    const entry: UpdateManifest = { ...manifest, id, publishedAt: manifest.publishedAt || new Date() };
    PostgresUpdateRepository.memoryManifests.set(`${entry.version}_${entry.platform}`, entry);

    try {
      await this.db.query(
        `INSERT INTO update_manifests (id, version, channel, platform, download_url, sha256, signature, file_size, release_notes, mandatory, min_version, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (version) DO UPDATE
         SET channel = $3, platform = $4, download_url = $5, sha256 = $6, signature = $7, file_size = $8, release_notes = $9, mandatory = $10, min_version = $11`,
        [
          entry.id,
          entry.version,
          entry.channel,
          entry.platform,
          entry.downloadUrl,
          entry.sha256,
          entry.signature,
          entry.fileSize || null,
          entry.releaseNotes || null,
          entry.mandatory ?? false,
          entry.minVersion || null,
          entry.publishedAt,
        ]
      );
    } catch {}

    return entry;
  }

  async findLatestManifest(platform: string, channel: string): Promise<UpdateManifest | null> {
    const list = Array.from(PostgresUpdateRepository.memoryManifests.values()).filter(
      (m) => (m.platform === platform || m.platform.startsWith(platform)) && m.channel === channel
    );

    if (list.length > 0) {
      list.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
      return { ...list[0]! };
    }

    try {
      const res = await this.db.query(
        `SELECT id, version, channel, platform, download_url, sha256, signature, file_size, release_notes, mandatory, min_version, published_at
         FROM update_manifests
         WHERE platform = $1 AND channel = $2
         ORDER BY published_at DESC
         LIMIT 1`,
        [platform, channel]
      );
      const row = res.rows[0];
      if (!row) return null;
      return this.mapManifestRow(row as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async findManifestByVersion(version: string, platform: string): Promise<UpdateManifest | null> {
    const mem = PostgresUpdateRepository.memoryManifests.get(`${version}_${platform}`);
    if (mem) return { ...mem };

    try {
      const res = await this.db.query(
        `SELECT id, version, channel, platform, download_url, sha256, signature, file_size, release_notes, mandatory, min_version, published_at
         FROM update_manifests
         WHERE version = $1 AND platform = $2`,
        [version, platform]
      );
      const row = res.rows[0];
      if (!row) return null;
      return this.mapManifestRow(row as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async listManifests(channel?: string): Promise<UpdateManifest[]> {
    const memList = Array.from(PostgresUpdateRepository.memoryManifests.values()).filter(
      (m) => !channel || m.channel === channel
    );

    try {
      const res = await this.db.query(
        `SELECT id, version, channel, platform, download_url, sha256, signature, file_size, release_notes, mandatory, min_version, published_at
         FROM update_manifests
         ${channel ? 'WHERE channel = $1' : ''}
         ORDER BY published_at DESC`,
        channel ? [channel] : []
      );
      const dbList = res.rows.map((r) => this.mapManifestRow(r as Record<string, unknown>));
      const map = new Map<string, UpdateManifest>();
      for (const m of dbList) map.set(`${m.version}_${m.platform}`, m);
      for (const m of memList) map.set(`${m.version}_${m.platform}`, m);
      return Array.from(map.values());
    } catch {
      return memList;
    }
  }

  async recordUpdateHistory(entry: UpdateHistoryEntry): Promise<UpdateHistoryEntry> {
    PostgresUpdateRepository.memoryHistory.unshift({ ...entry });

    try {
      await this.db.query(
        `INSERT INTO update_history (id, agent_id, from_version, to_version, status, error_message, attempted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.id,
          entry.agentId,
          entry.fromVersion || null,
          entry.toVersion || null,
          entry.status,
          entry.errorMessage || null,
          entry.attemptedAt,
        ]
      );
    } catch {}

    return entry;
  }

  async listUpdateHistory(agentId?: string): Promise<UpdateHistoryEntry[]> {
    const memList = agentId
      ? PostgresUpdateRepository.memoryHistory.filter((h) => h.agentId === agentId)
      : PostgresUpdateRepository.memoryHistory;

    try {
      const res = await this.db.query(
        `SELECT id, agent_id, from_version, to_version, status, error_message, attempted_at
         FROM update_history
         ${agentId ? 'WHERE agent_id = $1' : ''}
         ORDER BY attempted_at DESC
         LIMIT 100`,
        agentId ? [agentId] : []
      );
      const dbList = res.rows.map((r) => this.mapHistoryRow(r as Record<string, unknown>));
      const map = new Map<string, UpdateHistoryEntry>();
      for (const h of dbList) map.set(h.id, h);
      for (const h of memList) map.set(h.id, h);
      return Array.from(map.values());
    } catch {
      return memList;
    }
  }

  private mapManifestRow(row: Record<string, unknown>): UpdateManifest {
    return {
      id: row['id'] as string,
      version: row['version'] as string,
      channel: row['channel'] as UpdateManifest['channel'],
      platform: row['platform'] as UpdateManifest['platform'],
      downloadUrl: row['download_url'] as string,
      sha256: row['sha256'] as string,
      signature: row['signature'] as string,
      fileSize: row['file_size'] ? Number(row['file_size']) : undefined,
      releaseNotes: row['release_notes'] ? (row['release_notes'] as string) : undefined,
      mandatory: Boolean(row['mandatory']),
      minVersion: row['min_version'] ? (row['min_version'] as string) : undefined,
      publishedAt: new Date(row['published_at'] as string),
    };
  }

  private mapHistoryRow(row: Record<string, unknown>): UpdateHistoryEntry {
    return {
      id: row['id'] as string,
      agentId: row['agent_id'] as string,
      fromVersion: row['from_version'] ? (row['from_version'] as string) : undefined,
      toVersion: row['to_version'] ? (row['to_version'] as string) : undefined,
      status: row['status'] as UpdateHistoryEntry['status'],
      errorMessage: row['error_message'] ? (row['error_message'] as string) : undefined,
      attemptedAt: new Date(row['attempted_at'] as string),
    };
  }
}
