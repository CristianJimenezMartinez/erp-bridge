import * as fs from 'fs';
import * as path from 'path';
import { buildValencianoPages } from './build-valenciano';

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const LAYOUT_FILE = path.join(PUBLIC_DIR, 'layout/base.html');
const SCHEMA_FILE = path.join(PUBLIC_DIR, 'layout/schema-org.html');
const SECTIONS_DIR = path.join(PUBLIC_DIR, 'sections');
const MODALS_DIR = path.join(PUBLIC_DIR, 'modals');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'index.html');
const PARTNERS_DIR = path.join(PUBLIC_DIR, 'partners');
const PARTNERS_OUTPUT = path.join(PARTNERS_DIR, 'index.html');
const MAX_SECTION_LOC = 250;

const CONTENT_SECTIONS = [
  '02-hero.html',
  '02b-hero-architecture.html',
  '03-problem.html',
  '04-solution.html',
  '05-philosophy.html',
  '07-operational-safeguards.html',
  '07b-safeguards-comparison.html',
  '07c-comparative-advantage.html',
  '06-pipeline.html',
  '07-data-in-flight.html',
  '08-agent.html',
  '08b-agent-gallery.html',
  '09-observability.html',
  '10-connectors.html',
  '10b-connectors-matrix.html',
  '10c-connectors-tripartite.html',
  '10d-compatibility-checker.html',
  '11-security.html',
  '11b-founder.html',
  '12-pricing.html',
  '12b-roi-calculator.html',
  '13-faq.html',
];

const PARTNERS_SECTIONS = [
  'sections/00-head.html',
  'sections/01-header-hero.html',
  'sections/02-profiles-matrix.html',
  'sections/03-calculator-pilot.html',
  'sections/04-apply-form.html',
  'sections/05-footer.html',
];

function readAndVerifyModule(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Module file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const loc = content.split(/\r?\n/).length;
  if (loc > MAX_SECTION_LOC) {
    throw new Error(
      `[Public Modularity Violation] ${path.relative(PUBLIC_DIR, filePath)} exceeds limit (${loc} > ${MAX_SECTION_LOC} LOC).`
    );
  }
  return content;
}

export function getCanonicalVersion(): string {
  const candidates = [
    path.resolve(__dirname, '../../../package.json'),
    path.resolve(__dirname, '../../../releases/latest.json'),
    path.resolve(__dirname, '../package.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const json = JSON.parse(fs.readFileSync(p, 'utf8'));
        const v = json.version || json.latestVersion;
        if (v) return String(v).replace(/^v/, '').trim();
      } catch {}
    }
  }
  return '0.4.0';
}

export function assembleLandingPage(): string {
  const baseLayout = readAndVerifyModule(LAYOUT_FILE);

  let schemaHtml = '';
  if (fs.existsSync(SCHEMA_FILE)) {
    const rawSchema = fs.readFileSync(SCHEMA_FILE, 'utf8');
    schemaHtml = rawSchema.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_m, json) => {
      try {
        return `<script type="application/ld+json">\n${JSON.stringify(JSON.parse(json))}\n</script>`;
      } catch {
        return _m;
      }
    });
  }

  const headerHtml = readAndVerifyModule(path.join(SECTIONS_DIR, '01-header.html'));
  const contentHtml = CONTENT_SECTIONS.map((s) => readAndVerifyModule(path.join(SECTIONS_DIR, s))).join('\n\n  ');
  const footerHtml = readAndVerifyModule(path.join(SECTIONS_DIR, '14-footer.html'));
  const modalsHtml = ['modal-checkout.html', 'modal-legal.html']
    .map((m) => readAndVerifyModule(path.join(MODALS_DIR, m)))
    .join('\n\n  ');

  const currentVersion = getCanonicalVersion();
  const buildBanner = [
    '<!-- ========================================================================================= -->',
    '<!-- ⚠️ AVISO: ARCHIVO GENERADO AUTOMÁTICAMENTE — NO EDITAR DIRECTAMENTE                      -->',
    '<!-- El código fuente modular (<= 250 LOC) reside en apps/api/public/sections/                 -->',
    '<!-- ========================================================================================= -->\n',
  ].join('\n');

  let assembled =
    buildBanner +
    baseLayout
      .replace('<!-- {{SCHEMA_ORG}} -->', schemaHtml)
      .replace('<!-- {{HEADER}} -->', headerHtml)
      .replace('<!-- {{CONTENT}} -->', contentHtml)
      .replace('<!-- {{FOOTER}} -->', footerHtml)
      .replace('<!-- {{MODALS}} -->', modalsHtml);

  assembled = assembled
    .replace(/"softwareVersion":\s*"[^"]+"/g, `"softwareVersion": "${currentVersion}"`)
    .replace(/"downloadUrl":\s*"[^"]+"/g, `"downloadUrl": "https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe"`)
    .replace(/(<[^>]*data-app-version[^>]*>)(?:v)?[0-9.]+(<\/[^>]+>)/g, `$1v${currentVersion}$2`)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return assembled;
}

export function assemblePartnersPage(): string {
  readAndVerifyModule(path.join(PARTNERS_DIR, 'js/partners.js'));
  const currentVersion = getCanonicalVersion();
  const banner = [
    '<!-- ========================================================================================= -->',
    '<!-- ⚠️ AVISO: PORTAL PARTNERS COMPILADO AUTOMÁTICAMENTE — NO EDITAR DIRECTAMENTE              -->',
    '<!-- El código fuente modular (<= 250 LOC) reside en apps/api/public/partners/sections/        -->',
    '<!-- ========================================================================================= -->\n',
  ].join('\n');

  const raw =
    banner +
    PARTNERS_SECTIONS.map((rel) => readAndVerifyModule(path.join(PARTNERS_DIR, rel))).join('\n\n');

  return raw
    .replace(/(<[^>]*data-app-version[^>]*>)(?:v)?[0-9.]+(<\/[^>]+>)/g, `$1v${currentVersion}$2`)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function buildLanding(): void {
  console.log('[Landing Build] Starting assembly of modular landing & partners pages...');
  const html = assembleLandingPage();
  fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
  console.log(`[Landing Build] Successfully written to ${OUTPUT_FILE} (${(html.length / 1024).toFixed(1)} KB)`);

  const partnersHtml = assemblePartnersPage();
  fs.writeFileSync(PARTNERS_OUTPUT, partnersHtml, 'utf8');
  console.log(`[Partners Build] Successfully written to ${PARTNERS_OUTPUT} (${(partnersHtml.length / 1024).toFixed(1)} KB)`);

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
    'data-product-name',
  ];

  for (const req of requiredElements) {
    if (!html.includes(req)) {
      throw new Error(`[Landing Build Verification Failed] Missing required element: ${req}`);
    }
  }
  console.log('[Landing & Partners Build] All integrity and <= 250 LOC assertions PASSED.');

  // Sincronització de la versió en valencià i fitxa tècnica oficial per a la Generalitat
  buildValencianoPages();
}

if (require.main === module) {
  try {
    buildLanding();
  } catch (err: any) {
    console.error('[Landing Build Error]', err.message);
    process.exit(1);
  }
}
