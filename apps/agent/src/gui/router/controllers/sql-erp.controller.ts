import fs from 'fs';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { SqlServerBaseAdapter, SupportedErpProviderId } from '../../../erp';
import { CatalogAuditController } from './catalog-audit.controller';

export class SqlErpController {
  public static detectSqlInstances(): RouteHandler {
    return async (_req, res) => {
      const rawInstances = await SqlServerBaseAdapter.detectLocalSqlInstances();
      const instances = rawInstances.map((inst: any) =>
        typeof inst === 'string'
          ? { serverInstance: inst, label: inst, databases: [] }
          : inst
      );
      if (fs.existsSync('C:\\BentianLab\\AgoraDB.mdb') || fs.existsSync('C:\\BentianLab\\GESTION.mdb') || fs.existsSync('C:\\BentianLab\\A3ERP.mdb')) {
        instances.unshift({
          serverInstance: 'LOCAL_MDB',
          label: 'LOCAL_MDB (Base de Datos Física Real en C:\\BentianLab)',
          databases: ['AgoraDB', 'GESTION', 'A3ERP'],
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, instances }));
    };
  }

  public static testSqlErp(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const lic = agent.licenseService?.getLicenseStatus();
      if (lic && lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Licencia requerida: Activa tu clave de licencia en el Paso 1 o en la pestaña Licencia antes de conectar un ERP o el Modo Evaluación.'
        }));
        return;
      }
      const body = ctx.body || {};
      const providerId = (body.providerId || body.erpType || 'agora') as SupportedErpProviderId;
      const rawDbInput = String(body.databaseName || body.databasePath || '').trim();
      const evaluationMode = Boolean(body.evaluationMode) || rawDbInput.toUpperCase().startsWith('DEMO');

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
            databasePath: testRes.resolvedPath || `DEMO://${providerId}`,
          };
          (cfg as any).evaluationMode = { enabled: true, providerId };
          agent.configManager.saveConfigToDisk();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(testRes));
        return;
      }

      const defaultDbs: Record<string, string> = {
        agora: 'AgoraDB',
        sage50: 'GESTION',
        a3erp: 'A3ERP',
        sage200: 'SAGE200',
        icg: 'ICGManager',
        visionwin: 'VISIONWIN',
        aplifisa: 'GESTFUTURO',
        odoo: 'odoo_prod',
        facturascripts: 'facturascripts',
        businesscentral: 'BC_CRONUS_ES',
      };
      const defaultInsts: Record<string, string> = {
        agora: '.\\SQLEXPRESS',
        sage50: '.\\SAGE50',
        a3erp: '.\\SQLEXPRESS',
        sage200: '.\\SAGE200',
        icg: '.\\ICG',
        visionwin: '.\\SQLEXPRESS',
        aplifisa: '.\\APLIFISA',
        odoo: 'http://127.0.0.1:8069',
        facturascripts: 'http://127.0.0.1:8000',
        businesscentral: '.\\BCDEMO',
      };
      const serverInstance = String(body.serverInstance || body.sqlInstance || defaultInsts[providerId] || '.\\SQLEXPRESS').trim();
      const databaseName = (!evaluationMode && rawDbInput && !rawDbInput.startsWith('mssql://'))
        ? rawDbInput
        : (defaultDbs[providerId] || 'AgoraDB');

      const adapter = agent.erpRegistry.getConnector(providerId) as SqlServerBaseAdapter;

      const testRes = await adapter.reconnect(
        evaluationMode ? 'DEMO' : `mssql://${serverInstance}/${databaseName}`,
        {
          serverInstance,
          databaseName,
          authMode: body.authMode || 'windows',
          username: body.username,
          password: body.password,
          evaluationMode,
        }
      );

      if (testRes.success) {
        agent.erpRegistry.setActiveProvider(providerId);
        const cfg = agent.configManager.get();
        (cfg as any).evaluationMode = { enabled: evaluationMode, providerId };
        if (cfg.softwareErp?.providers?.[providerId]) {
          (cfg.softwareErp.providers[providerId] as any).sqlInstance = serverInstance;
          cfg.softwareErp.providers[providerId]!.serverInstance = serverInstance;
          cfg.softwareErp.providers[providerId]!.databaseName = databaseName;
          cfg.softwareErp.providers[providerId]!.databasePath = evaluationMode
            ? `DEMO://${providerId}`
            : `mssql://${serverInstance}/${databaseName}`;
          cfg.softwareErp.providers[providerId]!.evaluationMode = evaluationMode;
        }
        agent.configManager.saveConfigToDisk();
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(testRes));
    };
  }

  public static getPreview(agent: LocalAgent): RouteHandler {
    return async (req, res) => {
      const lic = agent.licenseService?.getLicenseStatus();
      if (lic && lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          articles: [],
          message: 'Licencia requerida para consultar el catálogo del ERP.'
        }));
        return;
      }
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const mode = (url.searchParams.get('mode') || '').trim().toLowerCase();
      if (mode === 'audit') {
        await CatalogAuditController.handleAuditJson(agent, req, res);
        return;
      }
      if (mode === 'audit-csv') {
        await CatalogAuditController.handleAuditCsv(agent, req, res);
        return;
      }
      const providerId = (url.searchParams.get('provider') || url.searchParams.get('erpType') || agent.erpRegistry.getActiveProviderId()) as SupportedErpProviderId;
      const connector = agent.erpRegistry.getConnector(providerId);
      const articles = await connector.getPreviewArticles(25);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, providerId, articles }));
    };
  }
}
