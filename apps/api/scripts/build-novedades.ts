import * as fs from 'fs';
import * as path from 'path';
import {
  DATA_DIR, PUBLIC_DIR, SITE, esc, getCanonicalVersion, renderFooter, renderHead, renderHeader,
  upsertSitemapUrl, writeIfChanged,
} from './seo/seo-shared';

interface Release {
  version: string;
  versionTo?: string;
  date: string;
  dateFrom?: string;
  title: string;
  items: string[];
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS[(m ?? 1) - 1]} de ${y}`;
}

function versionLabel(r: Release): string {
  return r.versionTo ? `${r.version} – ${r.versionTo}` : r.version;
}

function renderRelease(r: Release, current: string): string {
  const isCurrent = r.version === current && !r.versionTo;
  const badge = isCurrent ? '<span data-app-version>v' + current + '</span>' : `v${esc(versionLabel(r))}`;
  const when = r.dateFrom ? `${fmtDate(r.dateFrom)} al ${fmtDate(r.date)}` : fmtDate(r.date);
  const items = r.items.map((i) => `          <li>• ${esc(i)}</li>`).join('\n');
  return `    <article id="v${esc(r.version.replace(/\./g, '-'))}" class="border border-white/[0.08] rounded-2xl p-6 bg-[#121215] mb-5">
      <div class="flex flex-wrap items-center gap-3 mb-2">
        <span class="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">${badge}</span>
        ${isCurrent ? '<span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Versión actual</span>' : ''}
        <time datetime="${esc(r.date)}" class="text-xs text-zinc-500">${when}</time>
      </div>
      <h2 class="text-lg font-bold text-white mb-3">${esc(r.title)}</h2>
      <ul class="space-y-2 text-sm text-zinc-400 leading-relaxed">
${items}
      </ul>
    </article>`;
}

function main(): void {
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'releases.json'), 'utf8')) as { releases: Release[] };
  const releases = data.releases;
  const version = getCanonicalVersion();
  const latest = releases[0];
  if (!latest) throw new Error('releases.json no contiene ninguna versión.');
  if (latest.version !== version) {
    console.warn(`⚠ [novedades] La última entrada de releases.json (v${latest.version}) no coincide con la versión actual (v${version}). Añade sus notas.`);
  }

  const url = `${SITE}/novedades/`;
  const releaseNotes = `${latest.title}: ${latest.items.slice(0, 2).join(' ')}`;
  const graph = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Novedades', item: url },
      ],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Bentian ERP Bridge',
      softwareVersion: version,
      operatingSystem: 'Windows 10, Windows 11, Windows Server',
      applicationCategory: 'BusinessApplication',
      url,
      image: `${SITE}/assets/og-preview.png`,
      brand: { '@type': 'Brand', name: 'Bentian' },
      releaseNotes: `${url} — ${releaseNotes}`,
    },
  ];

  const head = renderHead({
    title: 'Novedades y historial de versiones de Bentian ERP Bridge',
    description: 'Historial de versiones de Bentian ERP Bridge desde la serie 0.4: cambios del agente, conectores ERP, API y panel, agrupados por versión y fecha.',
    keywords: 'novedades bentian erp bridge, historial de versiones conector erp woocommerce, changelog bentian, notas de versión agente windows',
    canonicalPath: '/novedades/',
    graph,
  });
  const body = `
  <main class="max-w-4xl mx-auto px-6 py-16 flex-grow">
    <span class="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">Historial de versiones</span>
    <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mt-2 mb-4 leading-tight">Novedades de Bentian ERP Bridge</h1>
    <p class="text-lg text-zinc-400 mb-4 leading-relaxed">Versión actual: <span class="text-white font-semibold" data-app-version>v${version}</span>. Cambios publicados desde la serie 0.4, ordenados de más reciente a más antigua.</p>
    <p class="text-sm text-zinc-500 mb-10">Las notas se resumen del historial de cambios del proyecto. Los conectores marcados como Beta (<a href="/conector-sage200/" class="text-emerald-400 hover:underline">Sage 200</a>, <a href="/conector-icg-manager/" class="text-emerald-400 hover:underline">ICG Manager</a>, <a href="/conector-visionwin/" class="text-emerald-400 hover:underline">Visionwin</a>, <a href="/conector-aplifisa/" class="text-emerald-400 hover:underline">Aplifisa</a>, <a href="/conector-odoo/" class="text-emerald-400 hover:underline">Odoo</a>, <a href="/conector-facturascripts/" class="text-emerald-400 hover:underline">FacturaScripts</a> y <a href="/conector-business-central/" class="text-emerald-400 hover:underline">Business Central</a>) están en validación con clientes piloto. Consulta los <a href="/requisitos-sistema/" class="text-emerald-400 hover:underline">requisitos del sistema</a> antes de actualizar.</p>
    <div class="mb-10">
      <a data-download-installer href="/releases/latest/Bentian-Setup.exe" class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3.5 rounded-xl transition shadow-xl shadow-emerald-600/30 text-sm">
        <span>Descargar Instalador Windows (<span data-app-version>v${version}</span>)</span>
      </a>
    </div>

${releases.map((r) => renderRelease(r, version)).join('\n\n')}
  </main>
`;
  const html = `${head}\n${renderHeader('Novedades', version)}${body}${renderFooter()}`;
  writeIfChanged(path.join(PUBLIC_DIR, 'novedades', 'index.html'), html);
  upsertSitemapUrl(url, `${latest.date}T12:00:00+02:00`, 'Novedades e historial de versiones', '0.6');
  console.log(`✓ [novedades] /novedades/ generada con ${releases.length} entradas (v${version}).`);
}

main();
