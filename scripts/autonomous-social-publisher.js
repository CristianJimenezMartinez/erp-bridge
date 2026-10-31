#!/usr/bin/env node
/**
 * BENTIAN AUTONOMOUS SOCIAL MEDIA & TECH COMMUNITY PUBLISHER (Coste 0€)
 *
 * Conecta y publica automáticamente contenido técnico y comercial B2B en:
 * 1. LinkedIn API v2 (LINKEDIN_ACCESS_TOKEN + LINKEDIN_AUTHOR_URN)
 * 2. Dev.to API — DA 85+ Backlinks & SEO Técnico (DEVTO_API_KEY)
 * 3. Bluesky AT Protocol — 100% Gratis con App Password (BLUESKY_HANDLE + BLUESKY_APP_PASSWORD)
 * 4. Mastodon / Fediverso Tech (MASTODON_INSTANCE_URL + MASTODON_ACCESS_TOKEN)
 * 5. Canal Público de Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID)
 * 6. Discord / Slack / n8n Webhook (SOCIAL_WEBHOOK_URL)
 *
 * Uso:
 *   node scripts/autonomous-social-publisher.js [--campaign=0|1|2|3] [--publish]
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(REPO_ROOT, 'package.json');

function getVersion() {
  try {
    return JSON.parse(fs.readFileSync(PKG_PATH, 'utf8')).version || '0.5.3';
  } catch {
    return '0.5.3';
  }
}

function buildCampaigns(version) {
  return [
    {
      id: 'factusol-ldb-zero-lock',
      title: `Cómo eliminar el Error 3045 (.ldb bloqueado) al conectar Factusol con WooCommerce y PrestaShop (v${version})`,
      canonicalUrl: 'https://bridge.cristianjm.com/docs/troubleshooting/error-3045-base-datos-bloqueada/',
      tags: ['ecommerce', 'woocommerce', 'prestashop', 'erp'],
      shortPost:
        `¿Clientes con Factusol en red local que sufren bloqueos .ldb/.laccdb o errores 500 en el hosting al sincronizar stock?\n\n` +
        `En Bentian ERP Bridge v${version} lo resolvemos con ingeniería Local-First en Windows:\n` +
        `• Vigilante en tiempo real con Debounce OLEDB de 5s\n` +
        `• Lecturas ADODB Snapshot sin bloquear el mostrador\n` +
        `• Stock disponible real (DISSTO) + Pedidos con IVA y Recargo al céntimo\n` +
        `• Cero puertos abiertos en el router (TLS 1.3 saliente)\n\n` +
        `Prueba Beta gratuita 14 días (con Modo Evaluación): https://bridge.cristianjm.com/beta/`,
      devtoMarkdown: [
        `Conectar un ERP de escritorio sobre Microsoft Access (como **Factusol**) o SQL Server local (**Sage 50, a3ERP, SimplyGest, Ágora POS**) con **WooCommerce, PrestaShop o Shopify** suele fallar por dos motivos clásicos:`,
        `1. **Scripts PHP en el hosting** que hacen barridos masivos y provocan errores \`500 max_execution_time\`.`,
        `2. **Bloqueos de archivo \`.ldb / .laccdb\` (Error 3045)** cuando un conector externo consulta Access mientras el mostrador está facturando.`,
        '',
        `### Arquitectura Local-First de Bentian ERP Bridge (v${version})`,
        `- **Debounce OLEDB de 5 segundos + ADODB Snapshot:** Espera a que Access libere la escritura antes de leer en modo no bloqueante.`,
        `- **Transacciones Atómicas (\`F_PCL\` / \`F_LCL\`):** Si la red parpadea al insertar un pedido web, ejecuta rollback automático.`,
        `- **Delta Sync cada 30s + Reposición de Cancelados:** Solo envía hashes modificados y repone stock si un pedido se cancela en la tienda.`,
        `- **Multi-ERP Real:** Factusol, SimplyGest, Sage 50, a3ERP, Ágora POS y Holded.`,
        '',
        `Puedes probar el instalador oficial de Windows con **Modo Evaluación Sandbox** (sin necesitar el ERP instalado) en [https://bridge.cristianjm.com/beta/](https://bridge.cristianjm.com/beta/).`,
      ].join('\n'),
    },
    {
      id: 'partner-channel-25-recurring',
      title: `Canal Partner para Agencias PrestaShop/WooCommerce y Empresas IT: 100% Setup + 25% Recurrente`,
      canonicalUrl: 'https://bridge.cristianjm.com/partners/',
      tags: ['prestashop', 'woocommerce', 'b2b', 'saas'],
      shortPost:
        `Si tienes una Agencia E-Commerce (WooCommerce / PrestaShop) o llevas el Mantenimiento IT en polígonos industriales:\n\n` +
        `Deja de perder horas no facturables manteniendo scripts de sincronización con Factusol, SimplyGest, Sage 50 o a3ERP.\n\n` +
        `Con el Canal Partner de Bentian ERP Bridge:\n` +
        `1) Facturas el 100% de tu instalación inicial al cliente (300€–600€ en 10 min)\n` +
        `2) Recibes un 25% de comisión recurrente vitalicia (62,25€/año por licencia)\n` +
        `3) Emites licencias Trial de 15 días en 1 clic desde tu panel\n\n` +
        `Detalles y alta gratuita: https://bridge.cristianjm.com/partners/`,
      devtoMarkdown: `Descubre cómo las agencias WooCommerce y PrestaShop externalizan la integración ERP local (Factusol, SimplyGest, Sage 50, a3ERP, Ágora POS) manteniendo el 100% de su setup inicial y generando ingresos recurrentes sin abrir puertos en el firewall del cliente: [Portal Oficial de Partners Bentian](https://bridge.cristianjm.com/partners/).`,
    },
    {
      id: 'multi-erp-sql-nolock',
      title: `Sincronizar Sage 50, a3ERP, SimplyGest y Ágora POS con WooCommerce/PrestaShop sin abrir puertos SQL`,
      canonicalUrl: 'https://bridge.cristianjm.com/sage50-woocommerce/',
      tags: ['sqlserver', 'erp', 'woocommerce', 'security'],
      shortPost:
        `Abrir el puerto 1433 de SQL Server en el router de una nave industrial para conectar la tienda online es una invitación directa al ransomware.\n\n` +
        `Bentian ERP Bridge v${version} corre dentro del Windows del cliente con tráfico 100% saliente TLS 1.3 y consultas WITH (NOLOCK) para:\n` +
        `• Factusol & SimplyGest\n` +
        `• Sage 50 & Sage 200\n` +
        `• Wolters Kluwer a3ERP\n` +
        `• Ágora POS & Holded\n\n` +
        `Tarifa plana 249€/año SKUs ilimitados. Prueba 14 días gratis: https://bridge.cristianjm.com/beta/`,
      devtoMarkdown: `Arquitectura de sincronización SQL Server local (\`WITH (NOLOCK)\` y transacciones T-SQL) hacia WooCommerce, PrestaShop y Shopify sin abrir puertos NAT en el firewall perimetral: [Guía Sage 50 y Multi-ERP en Bentian](https://bridge.cristianjm.com/sage50-woocommerce/).`,
    },
  ];
}

async function publishBluesky(postText, linkUrl, title) {
  const identifier = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!identifier || !password) return { skipped: true, reason: 'BLUESKY_HANDLE / BLUESKY_APP_PASSWORD no definidos' };

  const sessRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!sessRes.ok) return { ok: false, status: sessRes.status };
  const sess = await sessRes.json();

  const record = {
    $type: 'app.bsky.feed.post',
    text: postText.slice(0, 295),
    createdAt: new Date().toISOString(),
    embed: {
      $type: 'app.bsky.embed.external',
      external: { uri: linkUrl, title, description: 'Bentian ERP Bridge — Sincronización ERP Local-First en tiempo real' },
    },
  };
  const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.accessJwt}` },
    body: JSON.stringify({ repo: sess.did, collection: 'app.bsky.feed.post', record }),
  });
  return { ok: postRes.ok, status: postRes.status };
}

async function publishDevTo(campaign) {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return { skipped: true, reason: 'DEVTO_API_KEY no definida' };

  const res = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      article: {
        title: campaign.title,
        published: true,
        body_markdown: campaign.devtoMarkdown,
        tags: campaign.tags,
        canonical_url: campaign.canonicalUrl,
      },
    }),
  });
  return { ok: res.ok, status: res.status };
}

async function publishMastodon(postText) {
  const baseUrl = process.env.MASTODON_INSTANCE_URL;
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!baseUrl || !token) return { skipped: true, reason: 'MASTODON_INSTANCE_URL / MASTODON_ACCESS_TOKEN no definidos' };

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/statuses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: postText.slice(0, 495), visibility: 'public' }),
  });
  return { ok: res.ok, status: res.status };
}

async function publishLinkedIn(postText, linkUrl, title) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_AUTHOR_URN; // ej. urn:li:person:XXXX
  if (!token || !author) return { skipped: true, reason: 'LINKEDIN_ACCESS_TOKEN / LINKEDIN_AUTHOR_URN no definidos' };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: postText },
          shareMediaCategory: 'ARTICLE',
          media: [{ status: 'READY', originalUrl: linkUrl, title: { text: title } }],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  return { ok: res.ok, status: res.status };
}

async function publishTelegramAndWebhook(postText) {
  const results = {};
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID) {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHANNEL_ID, text: postText }),
    });
    results.telegram = { ok: r.ok, status: r.status };
  }
  if (process.env.SOCIAL_WEBHOOK_URL) {
    const r = await fetch(process.env.SOCIAL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: postText }),
    });
    results.webhook = { ok: r.ok, status: r.status };
  }
  return results;
}

async function main() {
  const version = getVersion();
  const campaigns = buildCampaigns(version);
  const outPath = path.join(__dirname, 'prospecting', 'social-campaigns-ready.json');
  fs.writeFileSync(outPath, JSON.stringify(campaigns, null, 2), 'utf8');
  process.stdout.write(`✓ ${campaigns.length} campañas multicanal generadas en scripts/prospecting/social-campaigns-ready.json (v${version}).\n`);

  if (!process.argv.includes('--publish')) {
    process.stdout.write(`ℹ Modo preparación completado. Añade --publish para disparar las APIs de LinkedIn, Dev.to, Bluesky, Mastodon, Telegram y Discord.\n`);
    return;
  }

  const idxArg = process.argv.find((a) => a.startsWith('--campaign='));
  const idx = idxArg ? Number(idxArg.split('=')[1]) || 0 : new Date().getDate() % campaigns.length;
  const selected = campaigns[idx] || campaigns[0];

  const report = {
    campaign: selected.id,
    linkedin: await publishLinkedIn(selected.shortPost, selected.canonicalUrl, selected.title),
    devto: await publishDevTo(selected),
    bluesky: await publishBluesky(selected.shortPost, selected.canonicalUrl, selected.title),
    mastodon: await publishMastodon(selected.shortPost),
    broadcast: await publishTelegramAndWebhook(selected.shortPost),
  };
  process.stdout.write(`✓ Resultado de publicación social autónoma:\n${JSON.stringify(report, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = { buildCampaigns, main };
