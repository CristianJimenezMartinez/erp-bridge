import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';

export class StatusController {
  public static getStatus(agent: LocalAgent): RouteHandler {
    return async (_req, res) => {
      const status = await agent.getStatusDetails();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    };
  }

  public static getLogs(agent: LocalAgent): RouteHandler {
    return (_req, res) => {
      const logs = agent.getRecentEvents();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs));
    };
  }

  public static exportDiagnostic(agent: LocalAgent): RouteHandler {
    return (_req, res) => {
      const diagnosticText = agent.exportDiagnostic();
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bentian-diagnostics.txt"',
      });
      res.end(diagnosticText);
    };
  }

  public static getPreflight(agent: LocalAgent): RouteHandler {
    return async (req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const force = url.searchParams.get('force') === 'true';
      const report = await agent.getPreflightHealth(force);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(report));
    };
  }

  public static getLiveHealth(agent: LocalAgent): RouteHandler {
    return async (_req, res) => {
      const health = await agent.getLiveHealth();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
    };
  }

  public static getStructuredLogs(): RouteHandler {
    return (req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const level = url.searchParams.get('level') || undefined;
      const { AgentDiskLogger } = require('../../../diagnostics/disk-logger');
      const logs = AgentDiskLogger.getInstance().getRecentLogs(limit, level);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs));
    };
  }
}


