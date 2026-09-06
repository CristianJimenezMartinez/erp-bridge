import { Logger, SyncJob, ScheduleFrequency } from '@erp-bridge/shared';
import { ISyncJobRepository, PostgresSyncJobRepository } from '../database';
import { SyncService } from '../services';
import { EventBus } from '../events';

export class SyncScheduler {
  private static instance: SyncScheduler;
  private readonly logger = new Logger('SyncScheduler');
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly runningJobs = new Set<string>();
  private isStarted = false;

  constructor(
    private readonly jobRepo: ISyncJobRepository = new PostgresSyncJobRepository(),
    private readonly syncService: SyncService = new SyncService(),
    private readonly eventBus: EventBus = EventBus.getInstance()
  ) {}

  public static getInstance(): SyncScheduler {
    if (!SyncScheduler.instance) {
      SyncScheduler.instance = new SyncScheduler();
    }
    return SyncScheduler.instance;
  }

  public async start(organizationId = 'org_default'): Promise<void> {
    if (this.isStarted) {
      this.logger.info('SyncScheduler ya se encuentra en ejecución');
      return;
    }

    this.isStarted = true;
    this.logger.info('Iniciando SyncScheduler para sincronizaciones automáticas...');

    try {
      const jobs = await this.jobRepo.listByOrganization(organizationId);
      for (const job of jobs) {
        if (job.status === 'ACTIVE' && job.schedule && job.schedule !== 'manual') {
          this.scheduleJob(job);
        }
      }
    } catch (err) {
      this.logger.warn('Aviso al cargar jobs en SyncScheduler', { err: String(err) });
    }
  }

  public stop(): void {
    this.isStarted = false;
    for (const [jobId, timer] of this.timers.entries()) {
      clearInterval(timer);
      this.timers.delete(jobId);
    }
    this.logger.info('SyncScheduler detenido.');
  }

  public scheduleJob(job: SyncJob): void {
    // Clear any existing timer for this job
    if (this.timers.has(job.id)) {
      clearInterval(this.timers.get(job.id)!);
      this.timers.delete(job.id);
    }

    if (job.status !== 'ACTIVE' || !job.schedule || job.schedule === 'manual') {
      return;
    }

    const intervalMs = this.frequencyToMilliseconds(job.schedule as ScheduleFrequency);
    if (intervalMs <= 0) return;

    this.logger.info(`Programando sincronización automática para job "${job.name}" cada ${intervalMs / 1000}s`, {
      jobId: job.id,
      schedule: job.schedule,
    });

    const timer = setInterval(() => {
      void this.executeScheduledJob(job);
    }, intervalMs);

    this.timers.set(job.id, timer);

    void this.eventBus.publish({
      type: 'SYNC_JOB_SCHEDULED',
      organizationId: job.organizationId,
      source: 'SyncScheduler',
      data: {
        jobId: job.id,
        jobName: job.name,
        schedule: job.schedule,
        intervalMs,
      },
    });
  }

  public async pauseJob(organizationId: string, jobId: string): Promise<SyncJob> {
    if (this.timers.has(jobId)) {
      clearInterval(this.timers.get(jobId)!);
      this.timers.delete(jobId);
    }

    const job = await this.jobRepo.findById(organizationId, jobId);
    if (job) {
      job.status = 'PAUSED';
      job.updatedAt = new Date();
      await this.jobRepo.update(job);

      await this.eventBus.publish({
        type: 'SYNC_JOB_PAUSED',
        organizationId,
        source: 'SyncScheduler',
        data: { jobId, jobName: job.name },
      });
      return job;
    }
    throw new Error(`Trabajo de sincronización no encontrado: ${jobId}`);
  }

  public async resumeJob(organizationId: string, jobId: string): Promise<SyncJob> {
    const job = await this.jobRepo.findById(organizationId, jobId);
    if (!job) {
      throw new Error(`Trabajo de sincronización no encontrado: ${jobId}`);
    }

    job.status = 'ACTIVE';
    job.updatedAt = new Date();
    const updated = await this.jobRepo.update(job);

    this.scheduleJob(updated);

    await this.eventBus.publish({
      type: 'SYNC_JOB_RESUMED',
      organizationId,
      source: 'SyncScheduler',
      data: { jobId, jobName: job.name },
    });

    return updated;
  }

  private async executeScheduledJob(job: SyncJob): Promise<void> {
    // Concurrency Lock
    if (this.runningJobs.has(job.id)) {
      this.logger.warn(`Ejecución programada omitida: el trabajo "${job.name}" (${job.id}) ya está en progreso.`);
      return;
    }

    this.runningJobs.add(job.id);
    this.logger.info(`Disparando sincronización programada automática: ${job.name}`);

    try {
      await this.syncService.runJob(job.organizationId, job.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error durante ejecución programada de job ${job.id}`, { error: msg });
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  public frequencyToMilliseconds(freq: ScheduleFrequency | string): number {
    switch (freq) {
      case 'every_5_minutes':
        return 5 * 60 * 1000;
      case 'every_15_minutes':
        return 15 * 60 * 1000;
      case 'every_hour':
        return 60 * 60 * 1000;
      case 'every_24_hours':
        return 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  public isJobRunning(jobId: string): boolean {
    return this.runningJobs.has(jobId);
  }

  public isJobScheduled(jobId: string): boolean {
    return this.timers.has(jobId);
  }
}
