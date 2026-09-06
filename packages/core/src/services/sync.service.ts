import { v4 as uuidv4 } from 'uuid';
import { CreateSyncJobDto, RunSyncJobDto, SyncExecution, SyncJob } from '@erp-bridge/shared';
import { BridgeError, ErrorCode } from '@erp-bridge/sdk';
import {
  IConnectionRepository,
  ISyncExecutionRepository,
  ISyncJobRepository,
  PostgresConnectionRepository,
  PostgresSyncExecutionRepository,
  PostgresSyncJobRepository,
} from '../database';
import { OrderSyncEngine, StockSyncEngine, SyncEngine } from '../engine';
import { RetryEngine } from '../retry';

export class SyncService {
  private readonly retryEngine = new RetryEngine();

  constructor(
    private readonly jobRepo: ISyncJobRepository = new PostgresSyncJobRepository(),
    private readonly executionRepo: ISyncExecutionRepository = new PostgresSyncExecutionRepository(),
    private readonly connectionRepo: IConnectionRepository = new PostgresConnectionRepository(),
    private readonly syncEngine: SyncEngine = new SyncEngine(),
    private readonly orderSyncEngine: OrderSyncEngine = new OrderSyncEngine(),
    private readonly stockSyncEngine: StockSyncEngine = new StockSyncEngine()
  ) {}

  public async listJobs(organizationId: string): Promise<SyncJob[]> {
    return this.jobRepo.listByOrganization(organizationId);
  }

  public async getJobById(organizationId: string, id: string): Promise<SyncJob> {
    const job = await this.jobRepo.findById(organizationId, id);
    if (!job) {
      throw new BridgeError(ErrorCode.SYNC_JOB_NOT_FOUND, `Trabajo de sincronización no encontrado: ${id}`);
    }
    return job;
  }

  public async createJob(dto: CreateSyncJobDto): Promise<SyncJob> {
    // Validate source and destination exist
    const source = await this.connectionRepo.findById(dto.organizationId, dto.sourceConnectionId);
    if (!source) {
      throw new BridgeError(ErrorCode.CONNECTION_NOT_FOUND, `Conexión origen no encontrada: ${dto.sourceConnectionId}`);
    }
    const dest = await this.connectionRepo.findById(dto.organizationId, dto.destinationConnectionId);
    if (!dest) {
      throw new BridgeError(ErrorCode.CONNECTION_NOT_FOUND, `Conexión destino no encontrada: ${dto.destinationConnectionId}`);
    }

    const id = `job_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const newJob: SyncJob = {
      id,
      organizationId: dto.organizationId,
      name: dto.name,
      sourceConnectionId: dto.sourceConnectionId,
      destinationConnectionId: dto.destinationConnectionId,
      entity: dto.entity,
      direction: dto.direction,
      schedule: dto.schedule,
      status: 'ACTIVE',
      configuration: dto.configuration,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.jobRepo.create(newJob);
  }

  public async updateJobSchedule(organizationId: string, jobId: string, schedule: string): Promise<SyncJob> {
    const job = await this.getJobById(organizationId, jobId);
    job.schedule = schedule;
    job.updatedAt = new Date();
    return this.jobRepo.update(job);
  }

  public async pauseJob(organizationId: string, jobId: string): Promise<SyncJob> {
    const job = await this.getJobById(organizationId, jobId);
    job.status = 'PAUSED';
    job.updatedAt = new Date();
    return this.jobRepo.update(job);
  }

  public async resumeJob(organizationId: string, jobId: string): Promise<SyncJob> {
    const job = await this.getJobById(organizationId, jobId);
    job.status = 'ACTIVE';
    job.updatedAt = new Date();
    return this.jobRepo.update(job);
  }

  public async runJob(
    organizationId: string,
    jobId: string,
    options?: Partial<RunSyncJobDto> & { specificSkus?: string[]; specificOrderRefs?: string[]; retryOfExecutionId?: string }
  ): Promise<SyncExecution> {
    const job = await this.getJobById(organizationId, jobId);
    const sourceConn = await this.connectionRepo.findById(organizationId, job.sourceConnectionId);
    if (!sourceConn) {
      throw new BridgeError(ErrorCode.CONNECTION_NOT_FOUND, `Conexión origen no encontrada: ${job.sourceConnectionId}`);
    }

    const destConn = await this.connectionRepo.findById(organizationId, job.destinationConnectionId);
    if (!destConn) {
      throw new BridgeError(ErrorCode.CONNECTION_NOT_FOUND, `Conexión destino no encontrada: ${job.destinationConnectionId}`);
    }

    // Dispatch depending on entity type
    if (job.entity === 'orders') {
      return this.orderSyncEngine.runJob(job, sourceConn, destConn, options);
    }

    if (job.entity === 'stock') {
      return this.stockSyncEngine.runJob(job, sourceConn, destConn, options);
    }

    return this.syncEngine.runJob(job, sourceConn, destConn, options);
  }

  public async retryExecutionErrors(organizationId: string, executionId: string): Promise<SyncExecution> {
    const execution = await this.getExecutionById(organizationId, executionId);
    if (!this.retryEngine.canRetry(execution)) {
      throw new BridgeError(
        ErrorCode.VALIDATION_ERROR,
        `La ejecución "${executionId}" no contiene errores recuperables para reintentar`
      );
    }

    const failedSkus = this.retryEngine.extractFailedSkus(execution);
    return this.runJob(organizationId, execution.syncJobId, {
      specificSkus: failedSkus,
      retryOfExecutionId: execution.id,
    });
  }

  public async listExecutions(organizationId: string, jobId?: string, limit = 50): Promise<SyncExecution[]> {
    if (jobId) {
      return this.executionRepo.listByJob(jobId, limit);
    }
    return this.executionRepo.listByOrganization(organizationId, limit);
  }

  public async getExecutionById(organizationId: string, id: string): Promise<SyncExecution> {
    const exec = await this.executionRepo.findById(organizationId, id);
    if (!exec) {
      throw new BridgeError(ErrorCode.ENTITY_NOT_FOUND, `Ejecución no encontrada: ${id}`);
    }
    return exec;
  }
}
