import { v4 as uuidv4 } from 'uuid';
import {
  Logger,
  UpdateCheckRequest,
  UpdateCheckRequestSchema,
  UpdateCheckResponse,
  UpdateConfirmRequest,
  UpdateConfirmRequestSchema,
  UpdateHistoryEntry,
  UpdateManifest,
  UpdateManifestSchema,
} from '@erp-bridge/shared';
import { IUpdateRepository, PostgresUpdateRepository } from '../database/repositories/update.repository';
import { EventBus } from '../events/event-bus';

/**
 * Returns:
 *  1 if v1 > v2
 * -1 if v1 < v2
 *  0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/, '').split('-')[0] || '0.0.0';
  const cleanV2 = v2.replace(/^v/, '').split('-')[0] || '0.0.0';

  const parts1 = cleanV1.split('.').map(Number);
  const parts2 = cleanV2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export class UpdateService {
  private readonly logger = new Logger('UpdateService');

  constructor(
    private repository: IUpdateRepository = new PostgresUpdateRepository(),
    private eventBus: EventBus = EventBus.getInstance()
  ) {}

  public async publishManifest(manifest: UpdateManifest): Promise<UpdateManifest> {
    const validated = UpdateManifestSchema.parse(manifest);
    const saved = await this.repository.publishManifest(validated);

    this.logger.info(`Nueva versión publicada: v${saved.version} [${saved.channel}] (${saved.platform})`);
    return saved;
  }

  public async checkForUpdates(req: UpdateCheckRequest): Promise<UpdateCheckResponse> {
    const validated = UpdateCheckRequestSchema.parse(req);
    const channel = validated.channel || 'stable';
    const platform = validated.platform === 'win32' ? 'win32_x64' : (validated.platform as UpdateManifest['platform']);

    const latest = await this.repository.findLatestManifest(platform, channel);
    if (!latest) {
      return { available: false };
    }

    const isNewer = compareSemver(latest.version, validated.currentVersion) > 0;
    if (!isNewer) {
      return { available: false };
    }

    this.logger.debug(`Actualización disponible para Agent ${validated.agentId}: ${validated.currentVersion} -> ${latest.version}`);

    return {
      available: true,
      version: latest.version,
      downloadUrl: latest.downloadUrl,
      sha256: latest.sha256,
      signature: latest.signature,
      fileSize: latest.fileSize,
      releaseNotes: latest.releaseNotes,
      mandatory: latest.mandatory,
      minVersion: latest.minVersion,
      channel: latest.channel,
    };
  }

  public async recordConfirmation(req: UpdateConfirmRequest): Promise<UpdateHistoryEntry> {
    const validated = UpdateConfirmRequestSchema.parse(req);

    const historyEntry: UpdateHistoryEntry = {
      id: uuidv4(),
      agentId: validated.agentId,
      fromVersion: validated.fromVersion,
      toVersion: validated.toVersion,
      status: validated.status,
      errorMessage: validated.errorMessage,
      attemptedAt: new Date(),
    };

    const saved = await this.repository.recordUpdateHistory(historyEntry);

    const eventType = validated.status === 'success' ? 'UPDATE_INSTALLED' : 'UPDATE_ROLLED_BACK';
    this.eventBus.publish({
      type: eventType,
      organizationId: 'org_default',
      source: 'UpdateService',
      data: {
        agentId: validated.agentId,
        fromVersion: validated.fromVersion,
        toVersion: validated.toVersion,
        status: validated.status,
        error: validated.errorMessage,
      },
    });

    this.logger.info(`Actualización registrada para Agent ${validated.agentId}: ${validated.fromVersion} -> ${validated.toVersion} (${validated.status})`);
    return saved;
  }

  public async listUpdateHistory(agentId?: string): Promise<UpdateHistoryEntry[]> {
    return this.repository.listUpdateHistory(agentId);
  }

  public async listManifests(channel?: string): Promise<UpdateManifest[]> {
    return this.repository.listManifests(channel);
  }
}
