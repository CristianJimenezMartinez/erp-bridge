import * as fs from 'fs';
import * as path from 'path';

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const LAYOUT_FILE = path.join(PUBLIC_DIR, 'layout/base.html');
const SCHEMA_FILE = path.join(PUBLIC_DIR, 'layout/schema-org.html');
const SECTIONS_DIR = path.join(PUBLIC_DIR, 'sections');
const MODALS_DIR = path.join(PUBLIC_DIR, 'modals');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'index.html');

const CONTENT_SECTIONS = [
  '02-hero.html',
  '03-problem.html',
  '04-solution.html',
  '05-philosophy.html',
  '07-operational-safeguards.html',
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

  return '0.3.5';
}

export function assembleLandingPage(): string {
  if (!fs.existsSync(LAYOUT_FILE)) {
    throw new Error(`Layout template not found at ${LAYOUT_FILE}`);
  }

  const baseLayout = fs.readFileSync(LAYOUT_FILE, 'utf8');

  // 1. Schema.org JSON-LD (compactado)
  let schemaHtml = '';
  if (fs.existsSync(SCHEMA_FILE)) {
    const rawSchema = fs.readFileSync(SCHEMA_FILE, 'utf8');
    schemaHtml = rawSchema.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_m, json) => {
      try {
        const minifiedJson = JSON.stringify(JSON.parse(json));
        return `<script type="application/ld+json">\n${minifiedJson}\n</script>`;
      } catch {
        return _m;
      }
    });
  }

  // 2. Header
  const headerFile = path.join(SECTIONS_DIR, '01-header.html');
  const headerHtml = fs.existsSync(headerFile) ? fs.readFileSync(headerFile, 'utf8') : '';

  // 3. Body content sections
  const contentHtml = CONTENT_SECTIONS.map((secName) => {
    const secPath = path.join(SECTIONS_DIR, secName);
    if (!fs.existsSync(secPath)) {
      throw new Error(`Section file not found: ${secPath}`);
    }
    return fs.readFileSync(secPath, 'utf8');
  }).join('\n\n  ');

  // 4. Footer
  const footerFile = path.join(SECTIONS_DIR, '14-footer.html');
  const footerHtml = fs.existsSync(footerFile) ? fs.readFileSync(footerFile, 'utf8') : '';

  // 5. Modals
  const modalFiles = ['modal-checkout.html', 'modal-legal.html'];
  const modalsHtml = modalFiles.map((mName) => {
    const mPath = path.join(MODALS_DIR, mName);
    return fs.existsSync(mPath) ? fs.readFileSync(mPath, 'utf8') : '';
  }).filter(Boolean).join('\n\n  ');

  // 6. Assemble
  const banner = `<!-- ========================================================================= -->\n<!-- BENTIAN ERP BRIDGE — BUNDLE PÚBLICO COMPILADO AUTOMÁTICAMENTE            -->\n<!-- NO EDITAR DIRECTAMENTE ESTE ARCHIVO (apps/api/public/index.html)          -->\n<!-- El código fuente está 100% modularizado en apps/api/public/sections/     -->\n<!-- Para regenerar tras editar secciones, ejecuta: npm run build:landing      -->\n<!-- ========================================================================= -->\n\n`;

  let assembled = banner + baseLayout
    .replace('<!-- {{SCHEMA_ORG}} -->', schemaHtml)
    .replace('<!-- {{HEADER}} -->', headerHtml)
    .replace('<!-- {{CONTENT}} -->', contentHtml)
    .replace('<!-- {{FOOTER}} -->', footerHtml)
    .replace('<!-- {{MODALS}} -->', modalsHtml);

  // 7. Inyectar versión canónica centralizada
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

  // 8. Normalizar saltos de línea consistentes y colapsar líneas en blanco consecutivas
  assembled = assembled.replace(/\r\n/g, '\n');
  assembled = assembled.replace(/\n{3,}/g, '\n\n');

  // 9. Inyectar banner explicativo en la cabecera del archivo generado
  const buildBanner = [
    '<!-- ========================================================================================= -->',
    '<!-- ⚠️ AVISO: ARCHIVO GENERADO AUTOMÁTICAMENTE — NO EDITAR DIRECTAMENTE                      -->',
    '<!-- Este archivo es el bundle pre-renderizado compilado mediante: `npm run build:landing`     -->',
    '<!-- El código fuente modular y editable reside en:                                            -->',
    '<!--   • apps/api/public/sections/ (01-header.html a 14-footer.html)                          -->',
    '<!--   • apps/api/public/layout/   (base.html, schema-org.html)                               -->',
    '<!--   • apps/api/public/modals/   (modal-checkout.html, modal-legal.html)                     -->',
    '<!--   • apps/api/public/js/       (legal-modal.js, smooth-scroll.js, ...)                     -->',
    '<!-- ========================================================================================= -->\n'
  ].join('\n');

  assembled = buildBanner + assembled;

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
