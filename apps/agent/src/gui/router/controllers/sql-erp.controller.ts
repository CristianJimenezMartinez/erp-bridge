import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { SqlServerBaseAdapter, SupportedErpProviderId } from '../../../erp';

export class SqlErpController {
  public static detectSqlInstances(): RouteHandler {
    return async (_req, res) => {
      const instances = await SqlServerBaseAdapter.detectLocalSqlInstances();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, instances }));
    };
  }

  public static testSqlErp(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const body = ctx.body || {};
      const providerId = (body.providerId || body.erpType || 'agora') as SupportedErpProviderId;
      const evaluationMode = Boolean(body.evaluationMode);

      if (providerId === 'factusol' || providerId === 'simplygest') {
        const connector = agent.erpRegistry.getConnector(providerId);
        const testRes = await connector.testConnection(evaluationMode ? 'DEMO' : (body.databasePath || ''));
        if (evaluationMode) {
          agent.erpRegistry.setActiveProvider(providerId);
          const cfg = agent.configManager.get();
          if (!cfg.softwareErp) cfg.softwareErp = { activeProvider: providerId, provisioned: true, providers: {} };
          if (!cfg.softwareErp.providers) cfg.softwareErp.providers = {};
          cfg.softwareErp.providers[providerId] = {
            ...(cfg.softwareErp.providers[providerId] || {}),
            evaluationMode: true,
            databasePath: testRes.resolvedPath || 'DEMO',
          };
          agent.configManager.saveConfigToDisk();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(testRes));
        return;
      }

      const adapter = providerId === 'sage50'
        ? agent.sage50Adapter
        : providerId === 'a3erp'
          ? agent.a3erpAdapter
          : agent.agoraAdapter;

      const testRes = await adapter.reconnect(
        evaluationMode ? 'DEMO' : `mssql://${body.serverInstance || '.\\SQLEXPRESS'}/${body.databaseName || ''}`,
        {
          serverInstance: body.serverInstance,
          databaseName: body.databaseName,
          authMode: body.authMode || 'windows',
          username: body.username,
          password: body.password,
          evaluationMode,
        }
      );

      if (testRes.success) {
        agent.erpRegistry.setActiveProvider(providerId);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(testRes));
    };
  }

  public static getPreview(agent: LocalAgent): RouteHandler {
    return async (req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const providerId = (url.searchParams.get('provider') || agent.erpRegistry.getActiveProviderId()) as SupportedErpProviderId;
      const connector = agent.erpRegistry.getConnector(providerId);
      const articles = await connector.getPreviewArticles(25);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, providerId, articles }));
    };
  }
}
