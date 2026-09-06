import { Router, Request, Response, NextFunction } from 'express';
import { SyncScheduler, SyncService } from '@erp-bridge/core';
import { CreateSyncJobDtoSchema, RunSyncJobDtoSchema } from '@erp-bridge/shared';

export const syncRouter = Router();
const syncService = new SyncService();
const scheduler = SyncScheduler.getInstance();

function getOrgId(req: Request): string {
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || 'org_default';
}

syncRouter.get('/sync-jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const list = await syncService.listJobs(orgId);
    res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

syncRouter.post('/sync-jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const body = { ...req.body, organizationId: req.body.organizationId || orgId };
    const validated = CreateSyncJobDtoSchema.parse(body);
    const job = await syncService.createJob(validated);
    if (job.status === 'ACTIVE' && job.schedule && job.schedule !== 'manual') {
      scheduler.scheduleJob(job);
    }
    res.status(201).json({ data: job });
  } catch (error) {
    next(error);
  }
});

syncRouter.get('/sync-jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const job = await syncService.getJobById(orgId, req.params['id']!);
    res.json({ data: job });
  } catch (error) {
    next(error);
  }
});

syncRouter.post('/sync-jobs/:id/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const schedule = req.body.schedule as string;
    const job = await syncService.updateJobSchedule(orgId, req.params['id']!, schedule);
    scheduler.scheduleJob(job);
    res.json({ data: job });
  } catch (error) {
    next(error);
  }
});

syncRouter.post('/sync-jobs/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const job = await scheduler.pauseJob(orgId, req.params['id']!);
    res.json({ data: job });
  } catch (error) {
    next(error);
  }
});

syncRouter.post('/sync-jobs/:id/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const job = await scheduler.resumeJob(orgId, req.params['id']!);
    res.json({ data: job });
  } catch (error) {
    next(error);
  }
});

syncRouter.post('/sync-jobs/:id/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const validatedOptions = RunSyncJobDtoSchema.parse(req.body || {});
    const execution = await syncService.runJob(orgId, req.params['id']!, validatedOptions);
    res.json({ data: execution });
  } catch (error) {
    next(error);
  }
});

syncRouter.post('/sync-executions/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const execution = await syncService.retryExecutionErrors(orgId, req.params['id']!);
    res.json({ data: execution });
  } catch (error) {
    next(error);
  }
});

syncRouter.get('/sync-executions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const jobId = req.query['jobId'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;
    const list = await syncService.listExecutions(orgId, jobId, limit);
    res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

syncRouter.get('/sync-executions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const execution = await syncService.getExecutionById(orgId, req.params['id']!);
    res.json({ data: execution });
  } catch (error) {
    next(error);
  }
});

syncRouter.post('/sync/run-reactive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const { agentId, reason, timestamp } = req.body || {};
    
    // Buscar trabajos activos de sincronización para esta organización
    const jobs = await syncService.listJobs(orgId);
    const activeJobs = jobs.filter((j) => j.status === 'ACTIVE');
    
    const executionResults = [];
    for (const job of activeJobs) {
      try {
        const execution = await syncService.runJob(orgId, job.id, { forceFullSync: false });
        executionResults.push({ jobId: job.id, status: execution.status, count: execution.processedCount });
      } catch (jobErr) {
        executionResults.push({ jobId: job.id, status: 'FAILED', error: jobErr instanceof Error ? jobErr.message : String(jobErr) });
      }
    }
    
    res.json({
      success: true,
      agentId,
      reason,
      timestamp,
      triggeredJobs: executionResults.length,
      executions: executionResults,
      message: `Sincronización reactiva procesada (${executionResults.length} trabajo(s) ejecutado(s))`
    });
  } catch (error) {
    next(error);
  }
});
