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

dotenv.config();

const logger = new Logger('Server');

export async function bootstrapApp(): Promise<Express> {
  const app = express();

  // Middleware
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 1. Initialize & Register Connectors in Core Registry
  const registry = ConnectorRegistry.getInstance();
  registry.register(() => new FactusolConnector());
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

  // Servir descargas de releases y actualizaciones del agente
  const releasesDir = path.resolve(__dirname, '../../../releases');
  app.use('/releases', express.static(releasesDir));

  // Servir landing page de descargas y dashboard web
  const publicDir = path.resolve(__dirname, '../public');
  app.use(express.static(publicDir));
  app.get('/', (_req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.json({ message: 'Bentian ERP Bridge API', status: 'OK', docs: '/health' });
  });

  // Servir Dashboard Angular 17 SPA real
  const dashboardDir = path.join(publicDir, 'dashboard');
  app.use('/dashboard', express.static(dashboardDir));
  app.get('/dashboard*', (_req, res) => {
    const angularIndex = path.join(dashboardDir, 'index.html');
    if (fs.existsSync(angularIndex)) {
      return res.sendFile(angularIndex);
    }
    const dashFallback = path.resolve(process.cwd(), 'dashboard.html');
    if (fs.existsSync(dashFallback)) {
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
