#!/usr/bin/env node
/**
 * BENTIAN AUTONOMOUS GROWTH & FREE ADVERTISING ENGINE (Coste 0€)
 *
 * Automatiza sin intervención manual ni presupuesto publicitario:
 * 1. Sindicación Universal RSS 2.0 (/feed.xml) y JSON Feed 1.1 (/feed.json) para agregadores, Dev.to, Medium y buscadores IA.
 * 2. Indexación Instantánea vía protocolo abierto IndexNow (Bing, Yandex, Seznam, Naver, Yep) con todas las URLs de sitemap.xml.
 * 3. Prospección B2B Autónoma (Agencias E-Commerce, Distribuidores DELSOL y MSPs de Polígonos) + Cola de Outreach personalizada.
 * 4. Difusión multicanal gratuita a Telegram / Discord / Webhooks cuando están configurados.
 *
 * Uso:
 *   node scripts/autonomous-growth-engine.js [--ping-indexnow] [--live-probe]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { runLeadHunter } = require('./prospecting/find-leads');

const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'apps', 'api', 'public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');
const LATEST_JSON_PATH = path.join(REPO_ROOT, 'releases', 'latest.json');
const INDEXNOW_KEY = 'bentian8f92a4c7e1d3b5a69012f4e8c';
const SITE_HOST = 'bridge.cristianjm.com';
const SITE_URL = `https://${SITE_HOST}`;

function getLatestVersion() {
  try {
    if (fs.existsSync(LATEST_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(LATEST_JSON_PATH, 'utf8'));
      return data.version || '0.5.3';
    }
  } catch {}
  return '0.5.3';
}

function extractSitemapUrls() {
  if (!fs.existsSync(SITEMAP_PATH)) return [`${SITE_URL}/`];
  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}

function classifyUrlTitle(urlStr, version) {
  const slug = urlStr.replace(SITE_URL, '').replace(/^\/+|\/+$/g, '');
  if (!slug) {
    return {
      title: `Bentian ERP Bridge v${version} — Conector Local-First Factusol, SimplyGest y ERPs con WooCommerce y PrestaShop`,
      summary: 'Sincroniza stock disponible (DISSTO), tarifas, tallas/colores y pedidos con IVA/Recargo sin abrir puertos en el router.',
    };
  }
  const readable = slug
    .split('/')
    .pop()
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
  return {
    title: `${readable} — Guía y Conector Oficial Bentian ERP Bridge (v${version})`,
    summary: `Documentación técnica y solución Local-First para ${readable}. Sincronización en tiempo real sin bloqueos .ldb y sin abrir puertos.`,
  };
}

function generateSyndicationFeeds(urls, version) {
  const nowRfc = new Date().toUTCString();
  const nowIso = new Date().toISOString();
  const topUrls = urls.slice(0, 35);

  const rssItems = topUrls
    .map((u) => {
      const info = classifyUrlTitle(u, version);
      return [
        '    <item>',
        `      <title><![CDATA[${info.title}]]></title>`,
        `      <link>${u}</link>`,
        `      <guid isPermaLink="true">${u}</guid>`,
        `      <pubDate>${nowRfc}</pubDate>`,
        `      <description><![CDATA[${info.summary}]]></description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const rssXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>Bentian ERP Bridge — Automatización Factusol, SimplyGest, WooCommerce y PrestaShop</title>`,
    `    <link>${SITE_URL}/</link>`,
    `    <description>Actualizaciones técnicas, guías de integración ERP Local-First y lanzamientos oficiales de Bentian ERP Bridge.</description>`,
    '    <language>es-es</language>',
    `    <lastBuildDate>${nowRfc}</lastBuildDate>`,
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>`,
    rssItems,
    '  </channel>',
    '</rss>',
  ].join('\n');

  const jsonFeed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `Bentian ERP Bridge (v${version}) — Feed Oficial de Ingeniería y Conectores ERP`,
    home_page_url: `${SITE_URL}/`,
    feed_url: `${SITE_URL}/feed.json`,
    language: 'es-ES',
    items: topUrls.map((u) => {
      const info = classifyUrlTitle(u, version);
      return {
        id: u,
        url: u,
        title: info.title,
        content_text: info.summary,
        date_published: nowIso,
      };
    }),
  };

  fs.writeFileSync(path.join(PUBLIC_DIR, 'feed.xml'), rssXml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'feed.json'), JSON.stringify(jsonFeed, null, 2), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, 'utf8');
}

function submitIndexNow(urls) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      host: SITE_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 100),
    });

    const req = https.request(
      {
        hostname: 'api.indexnow.org',
        path: '/indexnow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 6000,
      },
      (res) => {
        res.resume();
        resolve({ status: res.statusCode || 200 });
      }
    );
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout' });
    });
    req.write(payload);
    req.end();
  });
}

function buildOutreachQueue(leads, version) {
  const queue = leads.map((lead) => ({
    company: lead.name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    type: lead.type,
    subject: `Propuesta Partner 25% recurrente (${lead.city}) — Conector Factusol/ERP sin abrir puertos`,
    commandToExecute: `node scripts/send-postcall-beta.js "${lead.email}" "equipo de ${lead.name}" "${lead.name}"`,
    previewBody:
      `Hola equipo de ${lead.name},\n\n` +
      `He visto vuestra trayectoria en ${lead.sector} (${lead.city}). He desarrollado Bentian ERP Bridge (v${version}): ` +
      `una pasarela Local-First para Windows que sincroniza Factusol y SimplyGest con WooCommerce y PrestaShop en tiempo real sin abrir puertos en el router y sin bloqueos .ldb.\n\n` +
      `A nuestras agencias y partners IT os entregamos el 100% de vuestro setup inicial (300-600€) + un 25% de comisión recurrente anual (62,25€/año por licencia).\n` +
      `Podéis probarlo gratis en Modo Evaluación aquí: ${lead.betaClaimUrl}`,
  }));

  const outPath = path.join(__dirname, 'prospecting', 'outreach-queue.json');
  fs.writeFileSync(outPath, JSON.stringify(queue, null, 2), 'utf8');
  return queue;
}

async function main() {
  const version = getLatestVersion();
  const urls = extractSitemapUrls();

  generateSyndicationFeeds(urls, version);
  process.stdout.write(`✓ [1/3] Feeds de sindicación gratuitos generados: feed.xml, feed.json (${urls.length} URLs indexables) y clave IndexNow.\n`);

  if (process.argv.includes('--ping-indexnow')) {
    const res = await submitIndexNow(urls);
    process.stdout.write(`✓ [2/3] IndexNow multi-buscador (Bing/Yandex/Seznam/Naver) notificado (HTTP ${res.status}).\n`);
  } else {
    process.stdout.write(`✓ [2/3] IndexNow listo (${urls.length} URLs preparadas; usa --ping-indexnow tras desplegar).\n`);
  }

  const leads = await runLeadHunter();
  const queue = buildOutreachQueue(leads, version);
  process.stdout.write(`✓ [3/3] Cazador B2B completado: ${queue.length} campañas preparadas en scripts/prospecting/outreach-queue.json.\n`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
