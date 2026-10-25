import assert from 'assert';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { bootstrapApp } from '../src/server';
import { SyncScheduler } from '@erp-bridge/core';

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SLUGS = [
  'conector-sage200',
  'conector-icg-manager',
  'conector-visionwin',
  'conector-aplifisa',
  'conector-odoo',
  'conector-facturascripts',
  'conector-business-central',
];

function jsonLdGraph(html: string): any[] {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(m && m[1], 'La página debe incluir JSON-LD');
  return JSON.parse(m[1]!)['@graph'];
}

async function run() {
  console.log('--- Running ERP Beta pages & /novedades/ SEO tests ---');
  const rootVersion = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8')).version as string;
  const sitemap = fs.readFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), 'utf8');
  const sitemapMain = fs.readFileSync(path.join(PUBLIC_DIR, 'sitemap-main.xml'), 'utf8');
  const seenFaq = new Set<string>();

  for (const slug of SLUGS) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, slug, 'index.html'), 'utf8');
    assert.ok(html.includes(`<link rel="canonical" href="https://bridge.cristianjm.com/${slug}/">`), `${slug}: canonical`);
    assert.ok(/Estado: Beta, en validación con clientes piloto/.test(html), `${slug}: aviso de estado Beta visible`);
    assert.ok(html.includes('data-download-installer') && html.includes('data-app-version'), `${slug}: CTA con SSoT de versión`);
    assert.ok(html.includes('/requisitos-sistema/'), `${slug}: enlace a requisitos`);
    assert.ok(!/tiempo real|garantizad/i.test(html.replace(/No ofrecemos garantías[^<]*/g, '').replace(/no está garantizada[^.]*/g, '')), `${slug}: sin promesas de tiempo real / garantía`);
    const graph = jsonLdGraph(html);
    const types = graph.map((g) => g['@type']);
    assert.deepStrictEqual(types, ['BreadcrumbList', 'SoftwareApplication', 'FAQPage'], `${slug}: JSON-LD`);
    assert.strictEqual(graph[1].softwareVersion, rootVersion, `${slug}: softwareVersion = package.json`);
    const faq = graph[2].mainEntity as Array<{ name: string }>;
    assert.strictEqual(faq.length, 5, `${slug}: 5 FAQ`);
    for (const f of faq) {
      assert.ok(!seenFaq.has(f.name), `${slug}: FAQ duplicada ${f.name}`);
      seenFaq.add(f.name);
    }
    assert.ok(sitemap.includes(`<loc>https://bridge.cristianjm.com/${slug}/</loc>`), `${slug}: en sitemap.xml`);
    assert.ok(sitemapMain.includes(`<loc>https://bridge.cristianjm.com/${slug}/</loc>`), `${slug}: en sitemap-main.xml`);
    console.log(`✓ /${slug}/`);
  }

  const nov = fs.readFileSync(path.join(PUBLIC_DIR, 'novedades', 'index.html'), 'utf8');
  const novGraph = jsonLdGraph(nov);
  assert.strictEqual(novGraph[1]['@type'], 'SoftwareApplication');
  assert.ok(String(novGraph[1].releaseNotes || '').length > 20, 'novedades: releaseNotes');
  assert.ok(nov.includes('data-app-version'), 'novedades: versión vigente por data-app-version');
  assert.ok(nov.includes('id="v0-4-0"'), 'novedades: historial desde 0.4.x');
  assert.ok(sitemap.includes('https://bridge.cristianjm.com/novedades/'), 'novedades en sitemap');
  console.log('✓ /novedades/');

  const app = await bootstrapApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const slug of [...SLUGS, 'novedades']) {
      const redirect = await fetch(`${baseUrl}/${slug}`, { redirect: 'manual' });
      assert.strictEqual(redirect.status, 301, `/${slug} debe redirigir 301`);
      assert.strictEqual(redirect.headers.get('location'), `/${slug}/`, `/${slug} -> barra final`);
      const page = await fetch(`${baseUrl}/${slug}/`);
      assert.strictEqual(page.status, 200, `/${slug}/ debe responder 200`);
    }
    console.log('✓ Redirecciones 301 a barra final y respuesta 200 verificadas');
    console.log('\n✓ ERP Beta pages & novedades tests OK');
  } finally {
    try {
      SyncScheduler.getInstance().stop();
    } catch {}
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
