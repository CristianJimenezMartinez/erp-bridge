import { SITE, esc, renderFooter, renderHead, renderHeader } from './seo-shared';

export interface ErpPage {
  slug: string;
  code: string;
  name: string;
  short: string;
  lastmod: string;
  title: string;
  description: string;
  keywords: string;
  kicker: string;
  h1a: string;
  h1b: string;
  lead: string;
  badge: string;
  statusNote: string;
  howTitle: string;
  howIntro: string;
  howSteps: string[];
  syncsTitle: string;
  syncs: Array<{ t: string; d: string }>;
  schemaTitle: string;
  schemaIntro: string;
  schemaRows: Array<{ n: string; c: string; o: string }>;
  requirements: string[];
  limitsTitle: string;
  limits: string[];
  faq: Array<{ q: string; a: string }>;
  related: Array<{ slug: string; label: string; why: string }>;
}

const CARD = 'border border-white/[0.08] rounded-2xl p-8 bg-[#121215] mb-12';
const KICKER = 'text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold';

function relatedHref(slug: string): string {
  return `/${slug}/`;
}

function buildGraph(p: ErpPage, version: string): unknown[] {
  const url = `${SITE}/${p.slug}/`;
  return [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: `Conector ${p.short} (Beta)`, item: url },
      ],
    },
    {
      '@type': 'SoftwareApplication',
      name: `Bentian Conector ${p.name} (Beta)`,
      softwareVersion: version,
      operatingSystem: 'Windows 10, Windows 11, Windows Server',
      applicationCategory: 'BusinessApplication',
      image: `${SITE}/assets/og-preview.png`,
      url,
      description: `Conector en fase Beta entre ${p.name} y tiendas WooCommerce, PrestaShop y Shopify. En validación con clientes piloto.`,
      brand: { '@type': 'Brand', name: 'Bentian' },
      sku: `BENTIAN-ERP-BRIDGE-${p.code}`,
    },
    {
      '@type': 'FAQPage',
      mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
}

function li(items: string[], mark: string, cls: string): string {
  return items.map((i) => `            <li class="${cls}">${mark} ${esc(i)}</li>`).join('\n');
}

function renderBody(p: ErpPage, version: string): string {
  const syncs = p.syncs
    .map((s, i) => `        <div>
          <div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold mb-3">${i + 1}</div>
          <h4 class="font-semibold text-white mb-1.5">${esc(s.t)}</h4>
          <p class="text-xs text-zinc-400 leading-relaxed">${esc(s.d)}</p>
        </div>`)
    .join('\n');
  const rows = p.schemaRows
    .map((r) => `            <tr>
              <td class="px-4 py-3 font-mono text-emerald-400 font-bold">${esc(r.n)}</td>
              <td class="px-4 py-3 font-mono">${esc(r.c)}</td>
              <td class="px-4 py-3 text-zinc-300">${esc(r.o)}</td>
            </tr>`)
    .join('\n');
  const steps = p.howSteps.map((s) => `        <li>${esc(s)}</li>`).join('\n');
  const faq = p.faq
    .map((f) => `        <details class="group border border-white/[0.08] rounded-xl p-5 bg-[#121215] cursor-pointer">
          <summary class="font-semibold text-zinc-200 list-none flex justify-between items-center">
            ${esc(f.q)}
            <span class="text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-sm text-zinc-400 leading-relaxed">${esc(f.a)}</p>
        </details>`)
    .join('\n\n');
  const related = p.related
    .map((r) => `        <a href="${relatedHref(r.slug)}" class="p-5 rounded-2xl border border-white/[0.08] hover:border-emerald-500/40 bg-[#121215] hover:bg-[#16161b] transition flex flex-col justify-between">
          <div>
            <h3 class="text-sm font-bold text-white mb-2">${esc(r.label)}</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">${esc(r.why)}</p>
          </div>
          <span class="text-xs font-semibold text-emerald-400 mt-4">Ver conector ${esc(r.label)} &rarr;</span>
        </a>`)
    .join('\n');

  return `
  <main class="max-w-5xl mx-auto px-6 py-16 flex-grow">

    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium mb-6">
      <span>Beta · ${esc(p.kicker)}</span>
    </div>

    <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
      ${esc(p.h1a)} <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">${esc(p.h1b)}</span>
    </h1>

    <p class="text-lg text-zinc-400 max-w-3xl mb-8 leading-relaxed">${esc(p.lead)}</p>

    <!-- Aviso de estado (honestidad documental) -->
    <div role="note" class="mb-10 rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-5">
      <p class="text-sm font-semibold text-amber-300 mb-1">Estado: Beta, en validación con clientes piloto</p>
      <p class="text-sm text-zinc-300 leading-relaxed">${esc(p.statusNote)}</p>
      <p class="text-xs text-zinc-500 mt-3">No ofrecemos garantías de sincronización en producción para este conector hasta completar la validación. Los conectores de <a href="/factusol-woocommerce/" class="text-emerald-400 hover:underline">Factusol</a> y <a href="/sage50-woocommerce/" class="text-emerald-400 hover:underline">Sage 50</a> tienen su propia página de estado.</p>
    </div>

    <!-- CTAs -->
    <div class="flex flex-col sm:flex-row gap-4 mb-16">
      <a data-download-installer href="/releases/latest/Bentian-Setup.exe" class="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3.5 rounded-xl transition shadow-xl shadow-emerald-600/30 text-sm">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        <span>Descargar Instalador Windows (<span data-app-version>v${version}</span>)</span>
      </a>
      <a href="/requisitos-sistema/" class="inline-flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 font-semibold px-6 py-3.5 rounded-xl transition text-sm">Requisitos del sistema &rarr;</a>
    </div>

    <!-- Cómo se conecta -->
    <div class="${CARD}">
      <span class="${KICKER}">${esc(p.badge)}</span>
      <h2 class="text-2xl font-bold text-white mt-1 mb-3">${esc(p.howTitle)}</h2>
      <p class="text-sm text-zinc-400 leading-relaxed mb-5">${esc(p.howIntro)}</p>
      <ol class="list-decimal pl-5 space-y-2.5 text-sm text-zinc-300 leading-relaxed">
${steps}
      </ol>
    </div>

    <!-- Qué sincroniza -->
    <div class="${CARD}">
      <h2 class="text-2xl font-bold text-white mb-6">${esc(p.syncsTitle)}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
${syncs}
      </div>
    </div>

    <!-- Esquema -->
    <div class="${CARD}">
      <span class="${KICKER}">Esquema previsto</span>
      <h2 class="text-2xl font-bold text-white mt-1 mb-3">${esc(p.schemaTitle)}</h2>
      <p class="text-sm text-zinc-400 leading-relaxed mb-5">${esc(p.schemaIntro)}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/90 text-zinc-200 border-b border-white/[0.08]">
            <tr><th class="px-4 py-3 font-semibold">Recurso</th><th class="px-4 py-3 font-semibold">Campos</th><th class="px-4 py-3 font-semibold">Uso en Bentian</th></tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
${rows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Requisitos y limitaciones -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      <div class="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03]">
        <h2 class="text-lg font-bold text-emerald-400 mb-3">Requisitos para ${esc(p.short)}</h2>
        <ul class="space-y-2.5 text-sm text-zinc-300">
${li(p.requirements, '•', '')}
        </ul>
        <p class="text-xs text-zinc-500 mt-4">Requisitos generales del agente en <a href="/requisitos-sistema/" class="text-emerald-400 hover:underline">Requisitos del sistema</a>.</p>
      </div>
      <div class="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03]">
        <h2 class="text-lg font-bold text-amber-300 mb-3">${esc(p.limitsTitle)}</h2>
        <ul class="space-y-2.5 text-sm text-zinc-300">
${li(p.limits, '•', '')}
        </ul>
      </div>
    </div>

    <!-- Piloto -->
    <div class="${CARD}">
      <h2 class="text-2xl font-bold text-white mb-3">Participa en el piloto de ${esc(p.short)}</h2>
      <p class="text-sm text-zinc-400 leading-relaxed mb-5">Buscamos empresas dispuestas a probar el conector sobre una copia de sus datos y a compartir el esquema real de sus tablas o recursos. Puedes probar el flujo completo en Modo Evaluación sin conectar a tu ERP. Los planes de licencia están en la <a href="/#pricing" class="text-emerald-400 hover:underline">sección de precios</a>.</p>
      <a href="mailto:cristianjimeneztrabajo@gmail.com?subject=Piloto%20Beta%20${encodeURIComponent(p.short)}" class="inline-block text-center py-2.5 px-5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition">Solicitar acceso al piloto de ${esc(p.short)}</a>
    </div>

    <!-- Enlaces cruzados -->
    <div class="mb-16">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span class="${KICKER}">Conectores relacionados</span>
          <h2 class="text-2xl font-bold text-white mt-1">Otros conectores de Bentian que pueden interesarte</h2>
        </div>
        <a href="/docs/arquitectura/arquitectura-polimorfica-multi-erp/" class="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">Arquitectura Multi-ERP &rarr;</a>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
${related}
      </div>
    </div>

    <!-- FAQ -->
    <div class="mb-16">
      <h2 class="text-2xl font-bold text-white mb-6">Preguntas frecuentes sobre ${esc(p.short)} y comercio electrónico</h2>
      <div class="space-y-4">
${faq}
      </div>
    </div>

    <!-- Final CTA -->
    <div class="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-teal-950/60 border border-emerald-500/30 p-8 sm:p-12 text-center">
      <h2 class="text-3xl font-extrabold text-white mb-4">Prueba el conector de ${esc(p.short)} en Modo Evaluación</h2>
      <p class="text-zinc-300 max-w-xl mx-auto mb-8 text-sm">Descarga el instalador para Windows y comprueba el flujo con un catálogo de ejemplo antes de conectar tu ERP. Este conector sigue en Beta.</p>
      <a data-download-installer href="/releases/latest/Bentian-Setup.exe" class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-4 rounded-xl transition shadow-xl shadow-emerald-600/30 text-sm">
        <span>Descargar Instalador Oficial Windows (<span data-app-version>v${version}</span>)</span>
      </a>
    </div>

  </main>
`;
}

export function renderErpPage(p: ErpPage, version: string): string {
  const head = renderHead({
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    canonicalPath: `/${p.slug}/`,
    graph: buildGraph(p, version),
  });
  return `${head}\n${renderHeader(`${p.short} (Beta)`, version)}${renderBody(p, version)}${renderFooter()}`;
}
