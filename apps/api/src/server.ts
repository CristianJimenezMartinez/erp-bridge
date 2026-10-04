import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Logger } from '@erp-bridge/shared';
import {
  ConnectorRegistry,
  DatabaseService,
  FlowEngine,
  OrganizationService,
  SyncScheduler,
} from '@erp-bridge/core';
import { FactusolConnector } from '@erp-bridge/connector-factusol';
import { SimplyGestConnector } from '@erp-bridge/connector-simplygest';
import { WooCommerceConnector } from '@erp-bridge/connector-woocommerce';
import { errorHandler } from './middleware/error.middleware';
import { healthRouter } from './routes/health.router';
import { organizationsRouter } from './routes/organizations.router';
import { connectorsRouter } from './routes/connectors.router';
import { connectionsRouter } from './routes/connections.router';
import { agentsRouter } from './routes/agents.router';
import { syncRouter } from './routes/sync.router';
import { auditRouter } from './routes/audit.router';
import { flowsRouter } from './routes/flows.router';
import { licensesRouter } from './routes/licenses.router';
import { updatesRouter } from './routes/updates.router';
import { billingRouter } from './routes/billing.router';
import { authRouter } from './routes/auth.router';
import { monitoringRouter } from './routes/monitoring.router';
import { notificationsRouter } from './routes/notifications.router';
import { getLatestReleasedVersion } from './utils/version.util';

dotenv.config();

const logger = new Logger('Server');

export async function bootstrapApp(): Promise<Express> {
  const app = express();

  // Middleware
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(cors({ origin: '*' }));
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: true }));

  // 1. Initialize & Register Connectors in Core Registry
  const registry = ConnectorRegistry.getInstance();
  registry.register(() => new FactusolConnector());
  try {
    const { PrestaShopConnector } = require('@erp-bridge/connector-prestashop');
    registry.register(() => new PrestaShopConnector());
  } catch {}
  registry.register(() => new SimplyGestConnector());
  registry.register(() => new WooCommerceConnector());

  // 2. Initialize Database and run migrations if PostgreSQL connection is available
  try {
    const db = DatabaseService.getInstance();
    db.initialize({
      connectionString: process.env['DATABASE_URL'],
      host: process.env['DB_HOST'] || 'localhost',
      port: Number(process.env['DB_PORT']) || 5432,
      database: process.env['DB_DATABASE'] || 'Factusol',
      user: process.env['DB_USER'] || 'postgres',
      password: process.env['DB_PASSWORD'] || '123456789',
    });

    const health = await db.checkHealth();
    if (health.healthy) {
      await db.runMigrations();
      const orgService = new OrganizationService();
      await orgService.ensureDefaultOrganization();
      logger.info('Base de datos inicializada y migrada.');
    } else {
      logger.warn(`PostgreSQL no disponible (${health.message}). Continuando en modo memoria/local.`);
    }
  } catch (dbErr) {
    logger.warn('Aviso al inicializar base de datos:', { err: String(dbErr) });
  }

  // 3. Mount Routes
  app.use(healthRouter);
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', organizationsRouter);
  app.use('/api/v1', connectorsRouter);
  app.use('/api/v1', connectionsRouter);
  app.use('/api/v1', agentsRouter);
  app.use('/api/v1', syncRouter);
  app.use('/api/v1', auditRouter);
  app.use('/api/v1', flowsRouter);
  app.use('/api/v1', licensesRouter);
  app.use('/api/v1', updatesRouter);
  app.use('/api/v1', billingRouter);
  app.use('/api/v1', authRouter);
  app.use('/api/v1', monitoringRouter);
  app.use(monitoringRouter);
  app.use('/api/v1', notificationsRouter);
  app.use(notificationsRouter);

  // Servir descargas de releases oficiales (protegiendo claves o archivos privados)
  const releasesDir = path.resolve(__dirname, '../../../releases');
  // Resilient resolver para descargas canónicas /releases/latest/:filename
  app.get('/releases/latest/:filename', (req, res) => {
    const filename = req.params.filename;
    // 1. Si existe en releases/latest/:filename en disco, servir directamente
    const physicalPath = path.join(releasesDir, 'latest', filename);
    if (fs.existsSync(physicalPath)) {
      return res.sendFile(physicalPath);
    }

    // 2. Si no existe la carpeta latest física (ej: dev local), resolver desde la versión canónica
    const version = getLatestReleasedVersion();
    const versionDir = path.join(releasesDir, `v${version}`);

    let targetFile = path.join(versionDir, filename);
    if (!fs.existsSync(targetFile)) {
      if (filename === 'Bentian-Setup.exe') {
        targetFile = path.join(versionDir, `Bentian-Setup-v${version}.exe`);
      } else if (filename === 'Bentian-Setup.zip') {
        targetFile = path.join(versionDir, `Bentian-Setup-v${version}.zip`);
      } else if (filename === 'BentianAgent-Portable.zip') {
        targetFile = path.join(versionDir, `BentianAgent-v${version}-Portable.zip`);
      }
    }

    if (fs.existsSync(targetFile)) {
      return res.sendFile(targetFile);
    }

    return res.status(404).json({ error: { message: `Archivo ${filename} no encontrado para la versión v${version}` } });
  });

  app.use('/releases', (req, res, next): void => {
    const lowerUrl = req.url.toLowerCase();
    if (lowerUrl.includes('.pem') || lowerUrl.includes('.key') || lowerUrl.includes('legal') || lowerUrl.includes('.git') || lowerUrl.includes('..')) {
      res.status(403).json({ error: { message: 'Acceso no autorizado' } });
      return;
    }
    next();
  }, express.static(releasesDir, {
    dotfiles: 'ignore',
    index: false,
  }));

  // Servir documentación técnica oficial y guías de soporte
  const publicDir = path.resolve(__dirname, '../public');
  const docsDir = path.join(publicDir, 'docs');
  app.use('/docs', express.static(docsDir, {
    dotfiles: 'ignore',
    index: ['windows-antivirus-smartscreen-guide.html', 'index.html'],
    extensions: ['html', 'md'],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.md')) {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      }
    }
  }));

  // Servir landing page de descargas y dashboard web con control de caché óptimo
  app.use(express.static(publicDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }
    }
  }));

  app.get('/', (_req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(indexPath);
    }
    return res.json({ message: 'Bentian ERP Bridge API', status: 'OK', docs: '/health' });
  });

  // Rutas directas para Beta Pública y SEO por Ciudades
  app.get('/beta', (_req, res) => {
    res.redirect(301, '/beta/');
  });

  app.get('/beta/', (_req, res) => {
    const betaPath = path.join(publicDir, 'beta/index.html');
    if (fs.existsSync(betaPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(betaPath);
    }
    res.redirect(302, '/');
  });

  app.get('/conector-factusol', (_req, res) => {
    res.redirect(301, '/conector-factusol/');
  });

  app.get('/factusol-verifactu-woocommerce', (_req, res) => {
    res.redirect(301, '/factusol-verifactu-woocommerce/');
  });

  app.get('/factusol-api-rest', (_req, res) => {
    res.redirect(301, '/factusol-api-rest/');
  });

  // Servir Dashboard Cloud Multi-Tenant
  const dashboardDir = path.join(publicDir, 'dashboard');
  app.use('/dashboard', express.static(dashboardDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }
    }
  }));

  // Enrutamiento SPA seguro: solo responder con index.html para rutas de navegación (sin extensiones .js, .css, etc.)
  app.get('/dashboard*', (req, res) => {
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
      return res.status(404).json({ error: { message: `Recurso estático no encontrado: ${req.path}` } });
    }

    const angularIndex = path.join(dashboardDir, 'index.html');
    if (fs.existsSync(angularIndex)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(angularIndex);
    }
    const dashFallback = path.resolve(process.cwd(), 'dashboard.html');
    if (fs.existsSync(dashFallback)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(dashFallback);
    }
    return res.status(404).send('Dashboard file not found');
  });

  // 4. Start Scheduler & FlowEngine for reactive automations
  void SyncScheduler.getInstance().start('org_default');
  FlowEngine.getInstance().startListening();

  // 5. Central Error Handler
  app.use(errorHandler);

  return app;
}
