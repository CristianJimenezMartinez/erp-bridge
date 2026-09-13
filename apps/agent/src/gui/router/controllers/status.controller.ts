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
}
