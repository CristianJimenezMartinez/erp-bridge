import * as fs from 'fs';
import * as path from 'path';

export const SITE = 'https://bridge.cristianjm.com';
export const PUBLIC_DIR = path.resolve(__dirname, '../../public');
export const DATA_DIR = path.resolve(__dirname, '../../data');
const ROOT_PKG = path.resolve(__dirname, '../../../../package.json');

/** Versión canónica (SSoT): package.json raíz. Nunca se escribe a mano en datos ni plantillas. */
export function getCanonicalVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(ROOT_PKG, 'utf8'));
  return String(pkg.version).replace(/^v/, '').trim();
}

export function esc(text: string): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** JSON para incrustar en <script type="application/ld+json"> sin romper el HTML. */
export function jsonLd(obj: unknown): string {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

export function writeIfChanged(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
  fs.writeFileSync(file, content, 'utf8');
}

export interface HeadOptions {
  title: string;
  description: string;
  keywords: string;
  ogDescription?: string;
  canonicalPath: string;
  graph: unknown[];
}

export function renderHead(o: HeadOptions): string {
  const url = `${SITE}${o.canonicalPath}`;
  const ogDesc = o.ogDescription || o.description;
  return `<!DOCTYPE html>
<html lang="es" class="h-full bg-[#09090b] text-[#f4f4f5] antialiased scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(o.title)}</title>
  <meta name="description" content="${esc(o.description)}">
  <meta name="keywords" content="${esc(o.keywords)}">
  <meta name="author" content="Bentian">
  <link rel="canonical" href="${url}">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">

  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="${esc(o.title)}">
  <meta property="og:description" content="${esc(ogDesc)}">
  <meta property="og:image" content="${SITE}/assets/og-preview.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(o.title)}">
  <meta name="twitter:description" content="${esc(ogDesc)}">
  <meta name="twitter:image" content="${SITE}/assets/og-preview.png">

  <!-- Tailwind Play CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { 500: '#10b981', 600: '#059669' }
          }
        }
      }
    }
  </script>

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${jsonLd({ '@context': 'https://schema.org', '@graph': o.graph })}
  </script>
  <link rel="stylesheet" href="/css/styles.css" />
</head>`;
}

export function renderHeader(subtitle: string, version: string): string {
  return `<body class="min-h-screen flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">

  <!-- Navbar -->
  <header class="border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur sticky top-0 z-50 px-6 py-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
      <a href="/" class="flex items-center gap-3 whitespace-nowrap shrink-0">
        <img src="/assets/icon.svg" alt="Bentian" class="w-8 h-8">
        <span class="font-bold text-lg text-white">Bentian <span class="text-zinc-500 font-normal">| ${esc(subtitle)}</span></span>
      </a>
      <div class="flex items-center gap-4">
        <a href="/requisitos-sistema/" class="hidden sm:inline text-sm text-zinc-400 hover:text-white transition whitespace-nowrap shrink-0">Requisitos</a>
        <a href="/#pricing" class="text-sm text-zinc-400 hover:text-white transition whitespace-nowrap shrink-0">Precios</a>
        <a data-download-installer href="/releases/latest/Bentian-Setup.exe" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-emerald-600/20 whitespace-nowrap shrink-0">
          Descargar <span data-app-version>v${version}</span>
        </a>
      </div>
    </div>
  </header>
`;
}

const FOOTER_LINKS: Array<[string, string]> = [
  ['/', 'Inicio'],
  ['/factusol-woocommerce/', 'Factusol'],
  ['/simplygest-woocommerce/', 'SimplyGest'],
  ['/sage50-woocommerce/', 'Sage 50'],
  ['/agora-pos-woocommerce/', 'Ágora POS'],
  ['/a3erp-woocommerce/', 'a3ERP'],
  ['/conector-sage200/', 'Sage 200 (Beta)'],
  ['/conector-icg-manager/', 'ICG Manager (Beta)'],
  ['/conector-visionwin/', 'Visionwin (Beta)'],
  ['/conector-aplifisa/', 'Aplifisa (Beta)'],
  ['/conector-odoo/', 'Odoo (Beta)'],
  ['/conector-facturascripts/', 'FacturaScripts (Beta)'],
  ['/conector-business-central/', 'Business Central (Beta)'],
  ['/novedades/', 'Novedades'],
  ['/requisitos-sistema/', 'Requisitos del sistema'],
  ['/partners/', 'Partners'],
  ['/dashboard', 'Dashboard'],
];

export function renderFooter(): string {
  const links = FOOTER_LINKS.map(([href, label]) => `        <a href="${href}" class="hover:text-zinc-300 transition">${label}</a>`).join('\n');
  return `
  <!-- Footer -->
  <footer class="border-t border-white/[0.08] bg-[#09090b] py-8 px-6 text-xs text-zinc-500">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>© 2026 Bentian ERP Bridge — Desarrollado por <a href="https://cristianjm.com" class="text-zinc-400 hover:text-white transition">Cristian Jiménez Martínez</a></div>
      <div class="flex items-center gap-4 flex-wrap">
${links}
      </div>
    </div>
  </footer>

  <script src="/js/version-sync.js" defer></script>
</body>
</html>
`;
}

/**
 * Inserta o actualiza una URL en sitemap.xml y en sitemap-main.xml (idempotente).
 * Las URLs que no son /docs/ ni /conector-factusol/ pertenecen al sitemap principal
 * (misma clasificación que generate-sitemaps.js), así que se mantienen ambos en paridad
 * sin ejecutar ese script, que reescribe los demás sitemaps.
 */
export function upsertSitemapUrl(loc: string, lastmod: string, comment: string, priority: string, changefreq = 'weekly'): void {
  for (const name of ['sitemap.xml', 'sitemap-main.xml']) {
    upsertInto(path.join(PUBLIC_DIR, name), loc, lastmod, comment, priority, changefreq);
  }
}

function upsertInto(file: string, loc: string, lastmod: string, comment: string, priority: string, changefreq: string): void {
  if (!fs.existsSync(file)) return;
  let xml = fs.readFileSync(file, 'utf8');
  const block = `  <!-- ${comment} -->
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="es-ES" href="${loc}" />
    <xhtml:link rel="alternate" hreflang="es" href="${loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />
  </url>
`;
  const existing = new RegExp(`(?:[ \\t]*<!--[^\\n]*?-->\\s*)?<url>\\s*<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?</url>\\s*`, 'i');
  if (existing.test(xml)) {
    xml = xml.replace(existing, `${block}\n  `);
  } else {
    xml = xml.replace('</urlset>', `\n${block}\n</urlset>`);
  }
  fs.writeFileSync(file, xml, 'utf8');
}
