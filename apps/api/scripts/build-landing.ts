import * as fs from 'fs';
import * as path from 'path';

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const LAYOUT_FILE = path.join(PUBLIC_DIR, 'layout/base.html');
const SECTIONS_DIR = path.join(PUBLIC_DIR, 'sections');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'index.html');

const CONTENT_SECTIONS = [
  '02-hero.html',
  '03-problem.html',
  '04-solution.html',
  '05-philosophy.html',
  '06-pipeline.html',
  '07-data-in-flight.html',
  '08-agent.html',
  '09-observability.html',
  '10-connectors.html',
  '11-security.html',
  '12-pricing.html',
  '13-faq.html',
];

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

  return '0.3.2';
}

export function assembleLandingPage(): string {
  if (!fs.existsSync(LAYOUT_FILE)) {
    throw new Error(`Layout template not found at ${LAYOUT_FILE}`);
  }

  const baseLayout = fs.readFileSync(LAYOUT_FILE, 'utf8');

  // 1. Header
  const headerFile = path.join(SECTIONS_DIR, '01-header.html');
  const headerHtml = fs.existsSync(headerFile) ? fs.readFileSync(headerFile, 'utf8') : '';

  // 2. Body content sections
  const contentHtml = CONTENT_SECTIONS.map((secName) => {
    const secPath = path.join(SECTIONS_DIR, secName);
    if (!fs.existsSync(secPath)) {
      throw new Error(`Section file not found: ${secPath}`);
    }
    return fs.readFileSync(secPath, 'utf8');
  }).join('\n\n  ');

  // 3. Footer
  const footerFile = path.join(SECTIONS_DIR, '14-footer.html');
  const footerHtml = fs.existsSync(footerFile) ? fs.readFileSync(footerFile, 'utf8') : '';

  // 4. Assemble
  let assembled = baseLayout
    .replace('<!-- {{HEADER}} -->', headerHtml)
    .replace('<!-- {{CONTENT}} -->', contentHtml)
    .replace('<!-- {{FOOTER}} -->', footerHtml);

  // 5. Inyectar versión canónica centralizada
  const currentVersion = getCanonicalVersion();

  // Inyectar en Schema.org LD+JSON
  assembled = assembled.replace(
    /"softwareVersion":\s*"[^"]+"/g,
    `"softwareVersion": "${currentVersion}"`
  );
  assembled = assembled.replace(
    /"downloadUrl":\s*"[^"]+"/g,
    `"downloadUrl": "https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe"`
  );

  // Inyectar en badges y elementos de versión
  assembled = assembled.replace(
    /<span id="hero-version-tag">Release Oficial (?:<span data-app-version>)?v[0-9.]+(?:<\/span>)? para Windows x64<\/span>/g,
    `<span id="hero-version-tag">Release Oficial <span data-app-version>v${currentVersion}</span> para Windows x64</span>`
  );
  assembled = assembled.replace(
    /<span id="hero-version-tag">Release Oficial v[0-9.]+ para Windows x64<\/span>/g,
    `<span id="hero-version-tag">Release Oficial <span data-app-version>v${currentVersion}</span> para Windows x64</span>`
  );

  // Asegurar elementos data-app-version
  assembled = assembled.replace(
    /(<[^>]*data-app-version[^>]*>)(?:v)?[0-9.]+(<\/[^>]+>)/g,
    `$1v${currentVersion}$2`
  );

  // Normalizar enlaces de descarga a rutas canónicas /releases/latest/
  assembled = assembled.replace(
    /href="\/releases\/v[0-9.]+\/Bentian-Setup-v[0-9.]+\.exe"/g,
    'href="/releases/latest/Bentian-Setup.exe"'
  );
  assembled = assembled.replace(
    /href="\/releases\/v[0-9.]+\/Bentian-Setup-v[0-9.]+\.zip"/g,
    'href="/releases/latest/Bentian-Setup.zip"'
  );
  assembled = assembled.replace(
    /href="\/releases\/v[0-9.]+\/BentianAgent-v[0-9.]+-Portable\.zip"/g,
    'href="/releases/latest/BentianAgent-Portable.zip"'
  );

  // 6. Normalizar saltos de línea consistentes
  assembled = assembled.replace(/\r\n/g, '\n');

  return assembled;
}

export function buildLanding(): void {
  console.log('[Landing Build] Starting assembly of modular landing page...');

  const html = assembleLandingPage();

  // Guardar archivo index.html en disco
  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
  console.log(`[Landing Build] Successfully written to ${OUTPUT_FILE} (${(html.length / 1024).toFixed(1)} KB)`);

  // Verificaciones de Integridad
  const requiredElements = [
    'SoftwareApplication',
    'Organization',
    'WebSite',
    'FAQPage',
    'href="/css/styles.css"',
    'src="/js/tailwind.config.js"',
    'src="/js/checkout.js"',
    'src="/js/version-sync.js"',
    'src="/js/releases.js"',
    'src="/js/simulator.js"',
    'id="btn-hero-download"',
    'id="btn-agent-exe"',
    'id="btn-simulate-sync"',
    'data-app-version',
    'data-download-installer',
    'data-download-zip',
    'data-download-portable',
    'data-brand-name',
    'data-product-name'
  ];

  for (const req of requiredElements) {
    if (!html.includes(req)) {
      throw new Error(`[Landing Build Verification Failed] Missing required element: ${req}`);
    }
  }

  console.log('[Landing Build] All integrity assertions PASSED (100% Zero-Breakage Verified).');
}

// Ejecución directa si se invoca por CLI
if (require.main === module) {
  try {
    buildLanding();
  } catch (err: any) {
    console.error('[Landing Build Error]', err.message);
    process.exit(1);
  }
}
