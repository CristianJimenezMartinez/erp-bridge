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
import { rateLimit } from './middleware/rate-limit';
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
import { contactRouter } from './routes/contact.router';
import { meRouter } from './routes/me.router';
import { getLatestReleasedVersion } from './utils/version.util';

dotenv.config();

const logger = new Logger('Server');

export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const requiredSecrets = [
    { name: 'ADMIN_JWT_SECRET', minLength: 32, disallowed: ['default', 'secret', 'changeme', 'test', 'admin_secret'] },
    { name: 'LICENSE_JWT_SECRET', minLength: 32, disallowed: ['default', 'secret', 'changeme', 'test', 'license_secret'] },
    { name: 'LICENSE_SIGNING_PRIVATE_KEY', minLength: 32, disallowed: ['default', 'placeholder', 'changeme'] },
    { name: 'PARTNER_SECRET', minLength: 16, disallowed: ['default', 'secret', 'changeme', 'partnersecret2026!'] },
  ];

  const missingOrInvalid: string[] = [];

  for (const item of requiredSecrets) {
    const val = process.env[item.name];
    if (!val || !val.trim()) {
      missingOrInvalid.push(`${item.name} is missing or empty`);
      continue;
    }
    const clean = val.trim();
    if (item.minLength && clean.length < item.minLength) {
      missingOrInvalid.push(`${item.name} length is below minimum required (${clean.length} < ${item.minLength})`);
    }
    const isWeak =
      item.disallowed.some((d) => clean.toLowerCase() === d.toLowerCase()) ||
      clean.toLowerCase().includes('changeme') ||
      clean.toLowerCase().includes('placeholder') ||
      clean.toLowerCase() === 'secret';
    if (isWeak) {
      missingOrInvalid.push(`${item.name} contains insecure placeholder value`);
    }
  }

  if (missingOrInvalid.length > 0) {
    const msg = `CRITICAL SECURITY CONFIGURATION ERROR (production):\n  - ${missingOrInvalid.join('\n  - ')}`;
    logger.error(msg);
    throw new Error(msg);
  }
}

export async function bootstrapApp(): Promise<Express> {
  assertProductionSecrets();
  const app = express();

  // Middleware
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; frame-ancestors 'self';"
    );
    next();
  });

  const ALLOWED_CORS_ORIGINS = new Set([
    'https://bridge.cristianjm.com',
    'https://www.suministrosrubio.com',
    'https://cristianjm.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:39281',
  ]);

  app.use(cors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin cabecera Origin (CLI, tray, agente de escritorio, tests)
      if (!origin || ALLOWED_CORS_ORIGINS.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }));

  app.use(express.json({
    limit: '100kb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: true }));

  // Rate Limiting Global: 300 peticiones / 15 minutos por IP (P3-2 / API-025)
  app.use(rateLimit({
    name: 'global',
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: 'Demasiadas solicitudes al servidor. Por favor, espere antes de reintentar.',
  }));

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
  app.use('/api/v1', contactRouter);
  app.use(contactRouter);
  app.use('/api/v1', meRouter);
  app.use(meRouter);
  // Eliminado app.use(notificationsRouter) sin prefijo para mitigar relé de email abierto (API-007)

  // Servir descargas de releases oficiales (protegiendo claves o archivos privados)
  const releasesDir = path.resolve(__dirname, '../../../releases');
  const ALLOWED_RELEASE_FILES = new Set([
    'Bentian-Setup.exe',
    'Bentian-Setup.zip',
    'BentianAgent-Portable.zip',
    'BentianAgent.exe',
    'latest.json',
    'manifest.json',
    'checksums.txt',
    'erp-bridge-endpoint.php',
  ]);

  // Resilient resolver para descargas canónicas /releases/latest/:filename (API-001 / INF-002)
  app.get('/releases/latest/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!ALLOWED_RELEASE_FILES.has(filename) || filename !== path.basename(filename)) {
      return res.status(404).end();
    }
    const base = path.resolve(releasesDir, 'latest');
    const target = path.resolve(base, filename);
    if (!target.startsWith(base + path.sep)) {
      return res.status(403).end();
    }
    if (fs.existsSync(target)) {
      return res.sendFile(target, { dotfiles: 'deny' });
    }

    // 2. Si no existe la carpeta latest física (ej: dev local), resolver desde la versión canónica
    const version = getLatestReleasedVersion();
    const versionBase = path.resolve(releasesDir, `v${version}`);
    let versionTarget = path.resolve(versionBase, filename);

    if (!fs.existsSync(versionTarget)) {
      if (filename === 'Bentian-Setup.exe') {
        versionTarget = path.resolve(versionBase, `Bentian-Setup-v${version}.exe`);
      } else if (filename === 'Bentian-Setup.zip') {
        versionTarget = path.resolve(versionBase, `Bentian-Setup-v${version}.zip`);
      } else if (filename === 'BentianAgent-Portable.zip') {
        versionTarget = path.resolve(versionBase, `BentianAgent-v${version}-Portable.zip`);
      }
    }

    if (versionTarget.startsWith(versionBase + path.sep) && fs.existsSync(versionTarget)) {
      return res.sendFile(versionTarget, { dotfiles: 'deny' });
    }

    return res.status(404).json({ error: { message: `Archivo ${filename} no encontrado para la versión v${version}` } });
  });

  // Resolver por versión específica /releases/:version/:filename con whitelist y anti-traversal
  app.get('/releases/:version/:filename', (req, res) => {
    const { version, filename } = req.params;
    if (!ALLOWED_RELEASE_FILES.has(filename) || filename !== path.basename(filename)) {
      return res.status(404).end();
    }
    if (!version || version !== path.basename(version) || !/^v?\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
      return res.status(404).end();
    }

    const cleanVer = version.startsWith('v') ? version.slice(1) : version;
    const baseCandidates = [
      path.resolve(releasesDir, `v${cleanVer}`),
      path.resolve(releasesDir, cleanVer),
    ];

    for (const base of baseCandidates) {
      if (!base.startsWith(releasesDir + path.sep)) continue;
      let target = path.resolve(base, filename);
      if (!fs.existsSync(target)) {
        if (filename === 'Bentian-Setup.exe') {
          target = path.resolve(base, `Bentian-Setup-v${cleanVer}.exe`);
        } else if (filename === 'Bentian-Setup.zip') {
          target = path.resolve(base, `Bentian-Setup-v${cleanVer}.zip`);
        } else if (filename === 'BentianAgent-Portable.zip') {
          target = path.resolve(base, `BentianAgent-v${cleanVer}-Portable.zip`);
        }
      }
      if (target.startsWith(base + path.sep) && fs.existsSync(target)) {
        return res.sendFile(target, { dotfiles: 'deny' });
      }
    }

    return res.status(404).json({ error: { message: `Archivo ${filename} no encontrado para la versión ${version}` } });
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

  // Acceso directo al markdown crudo de la guía para agentes de IA / crawlers LLM
  app.get('/docs/windows-antivirus-smartscreen-guide.md', (_req, res) => {
    const mdPath = path.join(docsDir, 'windows-antivirus-smartscreen-guide.md');
    if (fs.existsSync(mdPath)) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.sendFile(mdPath);
    }
    return res.status(404).send('Markdown guide not found');
  });

  // Redirecciones 301 canónicas permanentes para URLs legacy de documentación técnica
  const legacyDocsMap: Record<string, string> = {
    'windows-antivirus-smartscreen-guide': '/docs/seguridad/antivirus-edr-smartscreen/',
    'error-base-datos-bloqueada-factusol-laccdb': '/docs/troubleshooting/error-3045-base-datos-bloqueada/',
    'matriz-compatibilidad-factusol': '/docs/factusol/matriz-compatibilidad/',
    'protocolo-beta-precios-fundador': '/docs/primeros-pasos/activacion-de-licencias/',
    'error-proveedor-oledb-factusol-microsoft-ace': '/docs/troubleshooting/error-oledb-no-registrado/',
    'sincronizar-pedidos-woocommerce-factusol': '/docs/canales/woocommerce/',
    'evitar-roturas-stock-factusol-dissto': '/docs/factusol/calculo-stock-disponible/',
  };

  for (const [legacySlug, canonicalTarget] of Object.entries(legacyDocsMap)) {
    const legacyRoutes = [
      `/docs/${legacySlug}`,
      `/docs/${legacySlug}/`,
      `/docs/${legacySlug}.html`,
    ];
    app.get(legacyRoutes, (req, res) => {
      // Mantener acceso a lectura de markdown si se solicita explícitamente vía cabecera Accept
      if (legacySlug === 'windows-antivirus-smartscreen-guide' && req.headers.accept?.includes('text/markdown')) {
        const mdPath = path.join(docsDir, 'windows-antivirus-smartscreen-guide.md');
        if (fs.existsSync(mdPath)) {
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          return res.sendFile(mdPath);
        }
      }
      return res.redirect(301, canonicalTarget);
    });
  }

  app.use('/docs', express.static(docsDir, {
    dotfiles: 'ignore',
    index: ['index.html'],
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

  // Rutas directas para Páginas Legales, Beta Pública y SEO por Ciudades
  app.get(['/privacidad', '/privacidad.html'], (_req, res) => {
    res.sendFile(path.join(publicDir, 'privacidad', 'index.html'));
  });

  app.get(['/cookies', '/cookies.html'], (_req, res) => {
    res.sendFile(path.join(publicDir, 'cookies', 'index.html'));
  });

  app.get(['/terminos', '/terminos.html'], (_req, res) => {
    res.sendFile(path.join(publicDir, 'terminos', 'index.html'));
  });

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

  // Redirecciones canónicas 301 para páginas pilar SEO y guías
  app.get('/factusol-woocommerce', (_req, res) => {
    res.redirect(301, '/factusol-woocommerce/');
  });
  app.get('/factusol-prestashop', (_req, res) => {
    res.redirect(301, '/factusol-prestashop/');
  });
  app.get('/alternativa-delsol-conecta', (_req, res) => {
    res.redirect(301, '/alternativa-delsol-conecta/');
  });
  app.get('/factusol-verifactu-woocommerce', (_req, res) => {
    res.redirect(301, '/factusol-verifactu-woocommerce/');
  });
  app.get('/factusol-api-rest', (_req, res) => {
    res.redirect(301, '/factusol-api-rest/');
  });
  app.get('/comparativa-conector-windows-vs-plugin-wordpress', (_req, res) => {
    res.redirect(301, '/comparativa-conector-windows-vs-plugin-wordpress/');
  });
  app.get('/factusol-prestashop-8', (_req, res) => {
    res.redirect(301, '/factusol-prestashop-8/');
  });
  app.get('/factusol-tallas-colores', (_req, res) => {
    res.redirect(301, '/factusol-tallas-colores/');
  });
  app.get('/factusol-shopify', (_req, res) => {
    res.redirect(301, '/factusol-shopify/');
  });
  app.get('/factusol-ferreterias-suministros', (_req, res) => {
    res.redirect(301, '/factusol-ferreterias-suministros/');
  });
  app.get('/factusol-recargo-equivalencia', (_req, res) => {
    res.redirect(301, '/factusol-recargo-equivalencia/');
  });
  app.get('/casos-de-exito/suministros-rubio', (_req, res) => {
    res.redirect(301, '/casos-de-exito/suministros-rubio/');
  });
  app.get('/terminos', (_req, res) => {
    res.redirect(301, '/terminos/');
  });
  app.get('/docs', (_req, res) => {
    res.redirect(301, '/docs/');
  });
  app.get('/guias/conectar-factusol-local-con-woocommerce', (_req, res) => {
    res.redirect(301, '/guias/conectar-factusol-local-con-woocommerce/');
  });
  app.get('/guias/solucionar-bloqueo-ficheros-ldb-factusol', (_req, res) => {
    res.redirect(301, '/guias/solucionar-bloqueo-ficheros-ldb-factusol/');
  });
  app.get('/guias/pasar-pedidos-woocommerce-a-factusol-con-recargo', (_req, res) => {
    res.redirect(301, '/guias/pasar-pedidos-woocommerce-a-factusol-con-recargo/');
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
