import * as fs from 'fs';
import * as path from 'path';
import { CityData } from './seo/city-page.types';
import { renderCityPage } from './seo/city-page.template';
import { renderHubPage } from './seo/city-hub.template';

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const DATA_FILE = path.resolve(__dirname, '../data/cities.json');
const SITEMAP_FILE = path.resolve(PUBLIC_DIR, 'sitemap.xml');
const CITIES_OUTPUT_ROOT = path.resolve(PUBLIC_DIR, 'conector-factusol');
const DEFAULT_CITY_LASTMOD = '2026-10-28T10:30:00.000Z';

function getCanonicalVersion(): string {
  const rootPkgPath = path.resolve(__dirname, '../../../package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      if (pkg.version) return String(pkg.version).replace(/^v/, '').trim();
    } catch {}
  }
  const latestJsonPath = path.resolve(__dirname, '../../../releases/latest.json');
  if (fs.existsSync(latestJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
      if (data.latestVersion) return String(data.latestVersion).replace(/^v/, '').trim();
    } catch {}
  }
  return '0.5.3';
}

function getCityLastMod(city: CityData): string {
  return city.lastModified || DEFAULT_CITY_LASTMOD;
}

function updateSitemap(cities: CityData[]) {
  const hubUrl = 'https://bridge.cristianjm.com/conector-factusol/';
  const hubLastMod = cities.reduce((max, c) => {
    const lm = getCityLastMod(c);
    return lm > max ? lm : max;
  }, DEFAULT_CITY_LASTMOD);

  if (fs.existsSync(SITEMAP_FILE)) {
    let sitemap = fs.readFileSync(SITEMAP_FILE, 'utf8');

    if (!sitemap.includes(hubUrl)) {
      const hubEntry = `
  <!-- Hub Nacional: Conector Factusol por Ciudades -->
  <url>
    <loc>${hubUrl}</loc>
    <lastmod>${hubLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es-ES" href="${hubUrl}" />
    <xhtml:link rel="alternate" hreflang="es" href="${hubUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${hubUrl}" />
  </url>
`;
      sitemap = sitemap.replace('</urlset>', `${hubEntry}</urlset>`);
    } else {
      sitemap = sitemap.replace(
        /(<loc>https:\/\/bridge\.cristianjm\.com\/conector-factusol\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/i,
        `$1${hubLastMod}$2`
      );
    }

    for (const c of cities) {
      const cityUrl = `https://bridge.cristianjm.com/conector-factusol/${c.slug}/`;
      const cityLastMod = getCityLastMod(c);
      if (!sitemap.includes(cityUrl)) {
        const cityEntry = `
  <!-- Conector Factusol: ${c.name} (${c.province}) -->
  <url>
    <loc>${cityUrl}</loc>
    <lastmod>${cityLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es-ES" href="${cityUrl}" />
    <xhtml:link rel="alternate" hreflang="es" href="${cityUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${cityUrl}" />
  </url>
`;
        sitemap = sitemap.replace('</urlset>', `${cityEntry}</urlset>`);
      } else {
        const reg = new RegExp(
          `(<loc>https:\\/\\/bridge\\.cristianjm\\.com\\/conector-factusol\\/${c.slug}\\/<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`,
          'i'
        );
        sitemap = sitemap.replace(reg, `$1${cityLastMod}$2`);
      }
    }

    fs.writeFileSync(SITEMAP_FILE, sitemap, 'utf8');
    console.log(`✓ [sitemap] Sitemap principal sincronizado para las ${cities.length} ciudades.`);
  }

  const SITEMAP_CITIES_FILE = path.resolve(PUBLIC_DIR, 'sitemap-ciudades.xml');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n`;
  xml += `  <!-- Hub Nacional: Conector Factusol por Ciudades -->\n`;
  xml += `  <url>\n`;
  xml += `    <loc>${hubUrl}</loc>\n`;
  xml += `    <lastmod>${hubLastMod}</lastmod>\n`;
  xml += `    <changefreq>weekly</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="es-ES" href="${hubUrl}" />\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="es" href="${hubUrl}" />\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${hubUrl}" />\n`;
  xml += `  </url>\n\n`;

  for (const c of cities) {
    const cityUrl = `https://bridge.cristianjm.com/conector-factusol/${c.slug}/`;
    const cityLastMod = getCityLastMod(c);
    xml += `  <!-- Conector Factusol: ${c.name} (${c.province}) -->\n`;
    xml += `  <url>\n`;
    xml += `    <loc>${cityUrl}</loc>\n`;
    xml += `    <lastmod>${cityLastMod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="es-ES" href="${cityUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="es" href="${cityUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${cityUrl}" />\n`;
    xml += `  </url>\n\n`;
  }
  xml += `</urlset>\n`;
  fs.writeFileSync(SITEMAP_CITIES_FILE, xml, 'utf8');
  console.log(`✓ [sitemap-ciudades] Regenerado sitemap-ciudades.xml (${cities.length} ciudades).`);

  const SITEMAP_INDEX_FILE = path.resolve(PUBLIC_DIR, 'sitemap-index.xml');
  if (fs.existsSync(SITEMAP_INDEX_FILE)) {
    let idxXml = fs.readFileSync(SITEMAP_INDEX_FILE, 'utf8');
    idxXml = idxXml.replace(
      /(<loc>https:\/\/bridge\.cristianjm\.com\/sitemap-ciudades\.xml<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/i,
      `$1${hubLastMod.slice(0, 10)}$2`
    );
    fs.writeFileSync(SITEMAP_INDEX_FILE, idxXml, 'utf8');
    console.log(`✓ [sitemap-index] Actualizado lastmod de sitemap-ciudades.xml a ${hubLastMod.slice(0, 10)}.`);
  }
}

export function generateCityPages() {
  console.log(`[cities] Cargando dataset de ciudades desde ${DATA_FILE}...`);
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Dataset no encontrado: ${DATA_FILE}`);
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const cities: CityData[] = JSON.parse(raw);
  const currentVersion = getCanonicalVersion();

  if (!fs.existsSync(CITIES_OUTPUT_ROOT)) {
    fs.mkdirSync(CITIES_OUTPUT_ROOT, { recursive: true });
  }

  for (const city of cities) {
    const cityDir = path.join(CITIES_OUTPUT_ROOT, city.slug);
    if (!fs.existsSync(cityDir)) {
      fs.mkdirSync(cityDir, { recursive: true });
    }
    const html = renderCityPage(city, cities, currentVersion, getCityLastMod(city));
    const outFile = path.join(cityDir, 'index.html');
    fs.writeFileSync(outFile, html, 'utf8');
    console.log(`✓ [cities] Generada página para ${city.name} -> ${outFile}`);
  }

  const hubHtml = renderHubPage(cities, currentVersion);
  const hubFile = path.join(CITIES_OUTPUT_ROOT, 'index.html');
  fs.writeFileSync(hubFile, hubHtml, 'utf8');
  console.log(`✓ [cities] Generado Hub central nacional -> ${hubFile}`);

  updateSitemap(cities);

  console.log(`[cities] Generación completada con éxito. ${cities.length} ciudades generadas.`);
}

if (require.main === module) {
  generateCityPages();
}
