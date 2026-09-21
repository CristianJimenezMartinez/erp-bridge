import { Router, Request, Response, NextFunction } from 'express';
import { AgentMonitorService } from '../services/agent-monitor.service';
import { requireAuth } from './auth.router';

export const monitoringRouter = Router();
const agentMonitorService = new AgentMonitorService();

/**
 * GET /api/v1/monitoring/agents/health
 * Reporte del estado de la flota de agentes (activos, degradados, inactivos).
 * Query params opcionales:
 *  - thresholdHours: Umbral de horas sin latido para considerar a un agente inactivo/caído (default: 24)
 *  - organizationId: Filtrar por ID de organización (opcional)
 */
monitoringRouter.get('/monitoring/agents/health', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thresholdHours = req.query['thresholdHours']
      ? Math.max(1, Number(req.query['thresholdHours']) || 24)
      : 24;

    const organizationId =
      (req.headers['x-organization-id'] as string) ||
      (req.query['organizationId'] as string) ||
      undefined;

    const report = await agentMonitorService.getFleetHealth(organizationId, thresholdHours);
    res.json({ data: report });
  } catch (error) {
    next(error);
  }
});
