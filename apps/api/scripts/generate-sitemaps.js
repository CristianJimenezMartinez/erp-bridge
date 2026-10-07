const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SITEMAP_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');

function generateSegmentedSitemaps() {
  if (!fs.existsSync(SITEMAP_FILE)) {
    console.error(`[sitemaps] No se encontró ${SITEMAP_FILE}`);
    return;
  }

  const rawXml = fs.readFileSync(SITEMAP_FILE, 'utf8');

  // Extraer bloques <url>...</url>
  const urlRegex = /(?:[ \t]*<!--([^\n]*?)-->\s*)?<url>([\s\S]*?)<\/url>/gi;
  const mainUrls = [];
  const ciudadesUrls = [];
  const docsUrls = [];

  let match;
  while ((match = urlRegex.exec(rawXml)) !== null) {
    const fullMatch = match[0].trim();
    const innerContent = (match && match[2]) || '';
    const locMatch = /<loc>\s*(.*?)\s*<\/loc>/i.exec(innerContent);
    const loc = (locMatch && locMatch[1]) ? locMatch[1].trim() : '';

    if (!loc) continue;

    if (loc.includes('/conector-factusol/')) {
      ciudadesUrls.push(fullMatch);
    } else if (loc.includes('/docs/')) {
      docsUrls.push(fullMatch);
    } else {
      mainUrls.push(fullMatch);
    }
  }

  console.log(`[sitemaps] Desglose encontrado: Main=${mainUrls.length}, Ciudades=${ciudadesUrls.length}, Docs=${docsUrls.length} (Total=${mainUrls.length + ciudadesUrls.length + docsUrls.length})`);

  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  \n`;
  const footer = `\n</urlset>\n`;

  // 1. sitemap-main.xml
  const mainContent = header + mainUrls.join('\n\n  ') + footer;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-main.xml'), mainContent, 'utf8');
  console.log(`✓ [sitemaps] Generado public/sitemap-main.xml (${mainUrls.length} URLs)`);

  // 2. sitemap-ciudades.xml
  const ciudadesContent = header + ciudadesUrls.join('\n\n  ') + footer;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-ciudades.xml'), ciudadesContent, 'utf8');
  console.log(`✓ [sitemaps] Generado public/sitemap-ciudades.xml (${ciudadesUrls.length} URLs)`);

  // 3. sitemap-docs.xml
  const docsContent = header + docsUrls.join('\n\n  ') + footer;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-docs.xml'), docsContent, 'utf8');
  console.log(`✓ [sitemaps] Generado public/sitemap-docs.xml (${docsUrls.length} URLs)`);

  // 4. sitemap-index.xml
  const now = new Date().toISOString().split('T')[0];
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://bridge.cristianjm.com/sitemap-main.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://bridge.cristianjm.com/sitemap-docs.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://bridge.cristianjm.com/sitemap-ciudades.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-index.xml'), sitemapIndex, 'utf8');
  console.log(`✓ [sitemaps] Generado public/sitemap-index.xml (Índice de 3 sub-sitemaps)`);

  // 5. Actualizar robots.txt
  const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    let robots = fs.readFileSync(robotsPath, 'utf8');
    const sitemapDirectives = [
      'Sitemap: https://bridge.cristianjm.com/sitemap.xml',
      'Sitemap: https://bridge.cristianjm.com/sitemap-index.xml',
      'Sitemap: https://bridge.cristianjm.com/sitemap-main.xml',
      'Sitemap: https://bridge.cristianjm.com/sitemap-docs.xml',
      'Sitemap: https://bridge.cristianjm.com/sitemap-ciudades.xml'
    ].join('\n');

    if (!robots.includes('sitemap-index.xml')) {
      robots = robots.replace(
        /Sitemap:\s*https:\/\/bridge\.cristianjm\.com\/sitemap\.xml/g,
        sitemapDirectives
      );
      fs.writeFileSync(robotsPath, robots, 'utf8');
      console.log(`✓ [sitemaps] Actualizado robots.txt con directivas de sitemaps segmentados`);
    }
  }
}

generateSegmentedSitemaps();
