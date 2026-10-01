import * as fs from 'fs';
import * as path from 'path';

const DASHBOARD_DIR = path.resolve(__dirname, '../public/dashboard');
const LAYOUT_DIR = path.join(DASHBOARD_DIR, 'layout');
const VIEWS_DIR = path.join(DASHBOARD_DIR, 'views');
const MODALS_DIR = path.join(DASHBOARD_DIR, 'modals');
const OUTPUT_FILE = path.join(DASHBOARD_DIR, 'index.html');
const BASE_LAYOUT_FILE = path.join(LAYOUT_DIR, 'base.html');

/**
 * Orden canónico de vistas del dashboard dentro del contenedor principal
 */
export const DASHBOARD_VIEWS = [
  '02-client-portal.html',
  '03-licenses.html',
  '04-fleet.html',
  '05-partner-clients.html',
  '06-admin-overview.html',
  '07-organizations.html',
  '08-audit.html',
  '09-fleet-errors.html'
];

/**
 * Modales del dashboard
 */
export const DASHBOARD_MODALS = [
  'modal-new-key.html',
  'modal-partner-buy.html',
  'modal-partner-issue.html',
  'modal-edit-alias.html',
  'modal-unbind.html',
  'modal-instructions.html',
  'modal-welcome-checkout.html'
];

/**
 * Obtiene la versión canónica centralizada (SSoT)
 */
export function getCanonicalVersion(): string {
  // 1. releases/latest.json
  const latestJsonPath = path.resolve(__dirname, '../../../releases/latest.json');
  if (fs.existsSync(latestJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
      if (data.latestVersion) return String(data.latestVersion).replace(/^v/, '').trim();
    } catch {}
  }

  // 2. Monorepo root package.json
  const rootPkgPath = path.resolve(__dirname, '../../../package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      if (pkg.version) return String(pkg.version).replace(/^v/, '').trim();
    } catch {}
  }

  // 3. API package.json
  const apiPkgPath = path.resolve(__dirname, '../package.json');
  if (fs.existsSync(apiPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(apiPkgPath, 'utf8'));
      if (pkg.version) return String(pkg.version).replace(/^v/, '').trim();
    } catch {}
  }

  return '0.3.5';
}

/**
 * Calcula la profundidad/balance de etiquetas <div> en un fragmento HTML.
 * Omite comentarios HTML para evitar falsos positivos.
 */
export function calculateDivDepth(html: string): number {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '');
  const openCount = (stripped.match(/<div\b[^>]*>/gi) || []).length;
  const closeCount = (stripped.match(/<\/div>/gi) || []).length;
  return openCount - closeCount;
}

/**
 * Ensambla los componentes modulares en el HTML completo del dashboard
 */
export function assembleDashboardPage(): string {
  if (!fs.existsSync(BASE_LAYOUT_FILE)) {
    throw new Error(`[Dashboard Build] Base layout template not found: ${BASE_LAYOUT_FILE}`);
  }

  const baseLayout = fs.readFileSync(BASE_LAYOUT_FILE, 'utf8');

  // 1. Layout components
  const headFile = path.join(LAYOUT_DIR, 'head.html');
  const headerFile = path.join(LAYOUT_DIR, 'header.html');
  const footerFile = path.join(LAYOUT_DIR, 'footer.html');

  if (!fs.existsSync(headFile)) throw new Error(`[Dashboard Build] head.html not found: ${headFile}`);
  if (!fs.existsSync(headerFile)) throw new Error(`[Dashboard Build] header.html not found: ${headerFile}`);
  if (!fs.existsSync(footerFile)) throw new Error(`[Dashboard Build] footer.html not found: ${footerFile}`);

  const headHtml = fs.readFileSync(headFile, 'utf8').trim();
  const headerHtml = fs.readFileSync(headerFile, 'utf8').trim();
  const footerHtml = fs.readFileSync(footerFile, 'utf8').trim();

  // Validar balance de layout
  const headDepth = calculateDivDepth(headHtml);
  if (headDepth !== 0) {
    throw new Error(`[Dashboard Build Security] Unbalanced divs in head.html (depth: ${headDepth})`);
  }
  const headerDepth = calculateDivDepth(headerHtml);
  if (headerDepth !== 0) {
    throw new Error(`[Dashboard Build Security] Unbalanced divs in header.html (depth: ${headerDepth})`);
  }
  const footerDepth = calculateDivDepth(footerHtml);
  if (footerDepth !== 0) {
    throw new Error(`[Dashboard Build Security] Unbalanced divs in footer.html (depth: ${footerDepth})`);
  }

  // 2. Login View
  const loginFile = path.join(VIEWS_DIR, '01-login.html');
  if (!fs.existsSync(loginFile)) throw new Error(`[Dashboard Build] 01-login.html not found: ${loginFile}`);
  const loginHtml = fs.readFileSync(loginFile, 'utf8').trim();
  const loginDepth = calculateDivDepth(loginHtml);
  if (loginDepth !== 0) {
    throw new Error(`[Dashboard Build Security] Unbalanced divs in 01-login.html (depth: ${loginDepth})`);
  }

  // 3. Views
  const viewsHtmlParts: string[] = [];
  for (const viewName of DASHBOARD_VIEWS) {
    const viewPath = path.join(VIEWS_DIR, viewName);
    if (!fs.existsSync(viewPath)) {
      throw new Error(`[Dashboard Build] View component not found: ${viewPath}`);
    }
    const viewContent = fs.readFileSync(viewPath, 'utf8').trim();
    const depth = calculateDivDepth(viewContent);
    if (depth !== 0) {
      throw new Error(`[Dashboard Build Security] Unbalanced divs in ${viewName} (depth: ${depth})`);
    }
    viewsHtmlParts.push(viewContent);
  }
  const viewsHtml = viewsHtmlParts.join('\n\n');

  // 4. Modals
  const modalsHtmlParts: string[] = [];
  for (const modalName of DASHBOARD_MODALS) {
    const modalPath = path.join(MODALS_DIR, modalName);
    if (!fs.existsSync(modalPath)) {
      throw new Error(`[Dashboard Build] Modal component not found: ${modalPath}`);
    }
    const modalContent = fs.readFileSync(modalPath, 'utf8').trim();
    const depth = calculateDivDepth(modalContent);
    if (depth !== 0) {
      throw new Error(`[Dashboard Build Security] Unbalanced divs in ${modalName} (depth: ${depth})`);
    }
    modalsHtmlParts.push(modalContent);
  }
  const modalsHtml = modalsHtmlParts.join('\n\n');

  // 5. Inyección en template base
  let assembled = baseLayout
    .replace('<!-- {{HEAD}} -->', headHtml)
    .replace('<!-- {{LOGIN}} -->', loginHtml)
    .replace('<!-- {{HEADER}} -->', headerHtml)
    .replace('<!-- {{VIEWS}} -->', viewsHtml)
    .replace('<!-- {{MODALS}} -->', modalsHtml)
    .replace('<!-- {{FOOTER}} -->', footerHtml);

  // 6. Inyección de versión canónica SSoT y rutas canónicas
  const currentVersion = getCanonicalVersion();

  // Actualizar elementos con data-app-version
  assembled = assembled.replace(
    /(data-app-version[^>]*>)(?:v)?[0-9.]+( Cloud)?(<\/[^>]+>)/g,
    `$1v${currentVersion}$2$3`
  );
  assembled = assembled.replace(
    /(data-version-format="Descargar Instalador \(\{version\}\)">Descargar Instalador \()v[0-9.]+(\)<\/span>)/g,
    `$1v${currentVersion}$2`
  );

  // Normalizar enlaces de descarga canónicos
  assembled = assembled.replace(
    /href="\/releases\/v[0-9.]+\/Bentian-Setup-v[0-9.]+\.exe"/g,
    'href="/releases/latest/Bentian-Setup.exe"'
  );

  // 7. Normalizar saltos de línea consistentes
  assembled = assembled.replace(/\r\n/g, '\n');

  // 8. Verificación final de balance global
  const totalDepth = calculateDivDepth(assembled);
  if (totalDepth !== 0) {
    throw new Error(`[Dashboard Build Security] Assembled dashboard HTML has unbalanced divs (total depth: ${totalDepth})`);
  }

  return assembled;
}

/**
 * Ejecuta la compilación y validación de integridad
 */
export function buildDashboard(): void {
  console.log('[Dashboard Build] Starting modular assembly of Bentian Cloud Dashboard...');

  const html = assembleDashboardPage();

  // Guardar archivo index.html en disco
  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
  console.log(`[Dashboard Build] Successfully written to ${OUTPUT_FILE} (${(html.length / 1024).toFixed(1)} KB)`);

  // Verificaciones de Integridad Mandatarias (Zero-Breakage Guarantee)
  const requiredElements = [
    // Vistas principales
    'id="login-view"',
    'id="dashboard-view"',
    'id="view-tab-client-portal"',
    'id="view-tab-licenses"',
    'id="view-tab-fleet"',
    'id="view-tab-partner-clients"',
    'id="view-tab-admin-overview"',
    'id="view-tab-organizations"',
    'id="view-tab-audit"',
    'id="view-tab-fleet-errors"',

    // Formularios de autenticación
    'id="login-form-key"',
    'id="login-form-email"',
    'id="login-form-partner"',
    'id="login-form-admin"',
    'id="login-key-input"',
    'id="login-billing-email"',
    'id="login-billing-otp"',
    'id="login-partner-code"',
    'id="login-email"',
    'id="login-password"',

    // Navegación y Header
    'id="dashboard-nav"',
    'id="mobile-tabs-container"',
    'id="top-role-badge"',
    'id="top-org-label"',
    'id="top-latency-badge"',
    'id="user-menu-btn"',
    'id="user-dropdown-menu"',

    // KPIs y tablas dinámicas
    'id="client-license-key"',
    'id="client-device-hostname"',
    'id="client-device-hwid"',
    'id="btn-client-unbind"',
    'id="licenses-tbody"',
    'id="fleet-health-table-body"',
    'id="partner-clients-tbody"',
    'id="kpi-arr"',
    'id="kpi-mrr"',
    'id="kpi-active-paid"',
    'id="orgs-tbody"',
    'id="audit-logs-container"',
    'id="fleet-errors-tbody"',

    // Modales interactivos
    'id="modal-new-key"',
    'id="modal-partner-buy"',
    'id="modal-partner-issue"',
    'id="modal-edit-alias"',
    'id="modal-unbind"',
    'id="modal-instructions"',
    'id="modal-welcome-checkout"',
    'id="welcome-license-key"',

    // Notificaciones y Scripts
    'id="toast"',
    'src="/js/version-sync.js"',
    'src="js/utils.js"',
    'src="js/auth.js"',
    'src="js/licenses.js"',
    'src="js/fleet.js"',
    'src="js/organizations.js"',
    'src="js/audit-errors.js"',
    'src="js/navigation.js"'
  ];

  for (const req of requiredElements) {
    if (!html.includes(req)) {
      throw new Error(`[Dashboard Build Verification Failed] Missing required element: ${req}`);
    }
  }

  console.log(`[Dashboard Build] Verified ${requiredElements.length} critical UI identifiers.`);
  console.log('[Dashboard Build] HTML div tag balance verified (divDepth === 0).');
  console.log('[Dashboard Build] All integrity assertions PASSED (100% Zero-Breakage Verified).');
}

// Ejecución directa si se invoca por CLI
if (require.main === module) {
  try {
    buildDashboard();
  } catch (err: any) {
    console.error('[Dashboard Build Error]', err.message);
    process.exit(1);
  }
}
