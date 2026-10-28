import { CityData, selectRelatedCities } from './city-page.types';

export function renderCityHeader(currentVersion: string): string {
  return `  <!-- Header Canónico Unificado -->
  <header class="border-b border-white/[0.08] bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-50">
    <div class="w-full px-3 sm:px-5 lg:px-6 xl:px-8 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg py-1 px-1.5 hover:bg-white/[0.03] transition shrink-0">
        <img src="/assets/icon.svg" alt="Bentian Logo" class="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" width="32" height="32">
        <span class="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-indigo-200 transition">Bentian</span>
      </a>

      <nav class="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3.5 text-[11px] xl:text-xs font-medium shrink-0">
        <a href="/" class="text-zinc-400 hover:text-white transition flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/[0.05] whitespace-nowrap shrink-0">
          <span>&larr; Portada</span>
        </a>
        <a href="/docs/" class="text-zinc-400 hover:text-white transition hidden md:inline px-2 py-1 rounded-md hover:bg-white/[0.05] whitespace-nowrap shrink-0">Docs</a>
        <a href="/partners/" class="text-emerald-400 hover:text-emerald-300 transition hidden sm:inline px-2 py-1 rounded-md hover:bg-emerald-500/10 whitespace-nowrap shrink-0">Partners (30%)</a>
        <a href="/conector-factusol/" class="text-zinc-400 hover:text-white transition hidden sm:inline px-2 py-1 rounded-md hover:bg-white/[0.05] whitespace-nowrap shrink-0">Ciudades</a>
        <a href="/seguridad/" class="text-zinc-400 hover:text-white transition hidden lg:inline px-2 py-1 rounded-md hover:bg-white/[0.05] whitespace-nowrap shrink-0">Seguridad</a>
        <a href="/quien-esta-detras/" class="text-zinc-400 hover:text-white transition hidden xl:inline px-2 py-1 rounded-md hover:bg-white/[0.05] whitespace-nowrap shrink-0">Equipo</a>
        <a href="/dashboard/" rel="nofollow" class="text-zinc-400 hover:text-white transition hidden xl:inline px-2 py-1 rounded-md hover:bg-white/[0.05] whitespace-nowrap shrink-0">Clientes</a>
        
        <div class="relative inline-block text-left" id="city-lang-picker">
          <button type="button" onclick="var m = document.getElementById('city-lang-dropdown'); m.classList.toggle('hidden');" class="flex items-center gap-1 px-2 py-1 rounded-md border border-white/[0.1] bg-[#121215] hover:bg-[#18181c] text-[11px] font-medium text-zinc-300 hover:text-white transition" aria-label="Seleccionar idioma">
            <svg class="w-3 h-3 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5-10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
            <span class="font-bold text-white text-[10px]">ES</span>
            <svg class="w-2.5 h-2.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          <div id="city-lang-dropdown" class="hidden absolute right-0 mt-2 w-40 rounded-xl border border-white/[0.12] bg-[#121215]/95 backdrop-blur-md shadow-2xl py-1.5 z-50 text-xs">
            <a href="/" class="flex items-center justify-between px-3 py-1.5 text-zinc-200 hover:bg-white/[0.08] hover:text-white transition font-medium">
              <span class="flex items-center gap-2"><span>🇪🇸</span> Castellano</span>
              <span class="text-[10px] text-zinc-400 font-mono font-semibold">ES</span>
            </a>
            <a href="/va/" class="flex items-center justify-between px-3 py-1.5 text-zinc-200 hover:bg-white/[0.08] hover:text-white transition font-medium">
              <span class="flex items-center gap-2"><span>🦇</span> Valencià</span>
              <span class="text-[10px] text-zinc-400 font-mono font-semibold">VA</span>
            </a>
          </div>
        </div>

        <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="px-3 sm:px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm hover:shadow-indigo-500/25 transition flex items-center gap-1.5 whitespace-nowrap text-xs shrink-0">
          <span>Descargar</span><span class="hidden sm:inline">&nbsp;Agente</span>
          <span class="text-[10px] font-mono bg-indigo-700/60 px-1.5 py-0.5 rounded text-indigo-200 hidden md:inline" data-app-version>v${currentVersion}</span>
        </a>
      </nav>
    </div>
  </header>`;
}

export function renderNationalDirectoryFooter(allCities: CityData[]): string {
  const byRegion = new Map<string, CityData[]>();
  for (const c of allCities) {
    const list = byRegion.get(c.region) || [];
    list.push(c);
    byRegion.set(c.region, list);
  }

  const regionBlocks = Array.from(byRegion.entries())
    .map(
      ([region, list]) => `
        <div class="space-y-1.5">
          <div class="text-[11px] font-semibold text-zinc-300">${region}</div>
          <div class="flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-zinc-500">
            ${list
              .map(
                (c) =>
                  `<a href="/conector-factusol/${c.slug}/" class="hover:text-indigo-300 transition">${c.name}</a>`
              )
              .join('<span>&middot;</span>')}
          </div>
        </div>`
    )
    .join('\n');

  return `  <footer class="border-t border-white/[0.08] py-12 px-6 bg-[#09090b] text-xs text-zinc-500">
    <div class="max-w-6xl mx-auto space-y-8">
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.06]">
          <span class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Directorio Nacional de Nodos Factusol por Comunidad Autónoma (${allCities.length} Ciudades)</span>
          <a href="/conector-factusol/" class="text-indigo-400 hover:text-indigo-300 font-medium transition">Mapa interactivo y buscador nacional &rarr;</a>
        </div>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          ${regionBlocks}
        </div>
      </div>

      <div class="pt-6 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
        <p>&copy; 2026 Bentian ERP Bridge &bull; Ingeniería Local-First para Factusol en España.</p>
        <div class="flex flex-wrap items-center gap-4 text-zinc-400">
          <a href="/" class="hover:text-white transition">Portada</a>
          <a href="/factusol-woocommerce/" class="hover:text-white transition">Factusol WooCommerce</a>
          <a href="/factusol-prestashop-8/" class="hover:text-white transition">Factusol PrestaShop 8</a>
          <a href="/docs/" class="hover:text-white transition">Documentación Técnica</a>
          <a href="/seguridad/" class="hover:text-white transition">Seguridad Criptográfica</a>
          <a href="/quien-esta-detras/" class="hover:text-white transition">Autoría</a>
          <a href="/privacidad/" class="hover:text-white transition">Privacidad</a>
          <a href="/cookies/" class="hover:text-white transition">Cookies</a>
          <a href="/terminos/" class="hover:text-white transition">Términos</a>
        </div>
      </div>
    </div>
  </footer>`;
}

function renderIneStatsBlock(city: CityData): string {
  const s = city.ineStats;
  if (!s) return '';
  const fmt = (n: number) => n.toLocaleString('es-ES');
  const pctAsal = Math.round((s.conAsalariados / s.totalEmpresas) * 100);
  const pctPymesSobreAsal = Math.round((s.pymes1a49 / Math.max(1, s.conAsalariados)) * 100);
  const sinAsalariados = s.totalEmpresas - s.conAsalariados;
  const commentary =
    city.ineAnalysis ||
    `En la demarcación provincial de ${s.provincia}, el ${pctPymesSobreAsal}% de las sociedades empleadoras operan en el tramo de 1 a 49 trabajadores (${fmt(s.pymes1a49)} pymes), junto a ${fmt(sinAsalariados)} profesionales y comercios autónomos.`;

  return `<div class="mb-14 p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-white/[0.06]">
            <h3 class="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Demografía Empresarial DIRCE • Provincia de ${s.provincia} (${s.year})</h3>
            <span class="text-[11px] font-mono text-zinc-500">${s.source}</span>
          </div>
          <div class="grid sm:grid-cols-4 gap-4 text-center mb-4">
            <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div class="text-xl sm:text-2xl font-extrabold text-white font-mono">${fmt(s.totalEmpresas)}</div>
              <div class="text-[11px] text-zinc-400 mt-1">Unidades empresariales en ${s.provincia}</div>
            </div>
            <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div class="text-xl sm:text-2xl font-extrabold text-indigo-300 font-mono">${fmt(s.pymes1a49)}</div>
              <div class="text-[11px] text-zinc-400 mt-1">Pymes de 1 a 49 empleados (${pctPymesSobreAsal}% del tejido empleador)</div>
            </div>
            <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div class="text-xl sm:text-2xl font-extrabold text-emerald-300 font-mono">${fmt(s.conAsalariados)}</div>
              <div class="text-[11px] text-zinc-400 mt-1">Sociedades con plantilla (${pctAsal}% del censo)</div>
            </div>
            <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div class="text-xl sm:text-2xl font-extrabold text-amber-300 font-mono">${fmt(sinAsalariados)}</div>
              <div class="text-[11px] text-zinc-400 mt-1">Autónomos y despachos sin asalariados</div>
            </div>
          </div>
          <p class="text-xs text-zinc-400 leading-relaxed">${commentary} <a href="/#calculadora-ahorro" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Simular retorno de inversión en ${city.name} &rarr;</a></p>
        </div>`;
}

export function renderCityPage(
  city: CityData,
  allCities: CityData[],
  currentVersion: string,
  lastModifiedIso: string
): string {
  const neighborLinks = selectRelatedCities(city, allCities);

  const relatedCitiesHtml = neighborLinks
    .map(
      ({ city: rc, distanceKm, relationLabel }) => `
        <a href="/conector-factusol/${rc.slug}/" class="px-3.5 py-3 rounded-xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 hover:bg-zinc-900 transition flex items-center justify-between gap-2 group">
          <div>
            <span class="text-xs font-semibold text-white group-hover:text-indigo-300 transition block">${rc.name} (${rc.province})</span>
            <span class="text-[10px] text-zinc-500 font-mono">${distanceKm} km &bull; ${relationLabel}</span>
          </div>
          <span class="text-xs text-indigo-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
        </a>`
    )
    .join('\n');

  const hubsHtml = city.industrialHubs
    .map(
      (hub) => `
        <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 transition flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-3">
              <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
              <h3 class="text-base font-semibold text-white tracking-tight">${hub.name}</h3>
            </div>
            <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-3">${hub.desc}</p>
          </div>
          ${
            hub.accessRoads || hub.warehouseProfile
              ? `<div class="pt-3 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500 space-y-1">
                  ${hub.accessRoads ? `<div><span class="text-indigo-400">Vías:</span> ${hub.accessRoads}</div>` : ''}
                  ${hub.warehouseProfile ? `<div><span class="text-emerald-400">Operativa:</span> ${hub.warehouseProfile}</div>` : ''}
                </div>`
              : ''
          }
        </div>`
    )
    .join('\n');

  const sectorsList =
    city.sectorsDetail && city.sectorsDetail.length > 0
      ? city.sectorsDetail
      : city.sectors.map((s) => ({ name: s, desc: '' }));

  const sectorsHtml = sectorsList
    .map(
      (sec) => `
        <div class="p-5 rounded-2xl bg-[#121215] border border-white/[0.08] flex flex-col gap-2">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            <h4 class="text-sm font-semibold text-white">${sec.name}</h4>
          </div>
          ${sec.desc ? `<p class="text-xs text-zinc-400 leading-relaxed pl-6">${sec.desc}</p>` : ''}
        </div>`
    )
    .join('\n');

  const useCaseHtml = city.localUseCase
    ? `
    <!-- Caso Práctico de Implantación Local en ${city.name} -->
    <section class="py-14 md:py-18 px-6 border-b border-white/[0.08] bg-[#0c0c10]">
      <div class="max-w-5xl mx-auto">
        <div class="p-6 sm:p-8 rounded-3xl bg-[#121215] border border-indigo-500/25 shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span class="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">ESCENARIO REAL DE ARQUITECTURA EN ${city.name.toUpperCase()}</span>
            <span class="text-xs font-mono text-emerald-400 font-semibold">${city.localUseCase.metricsBadge}</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold text-white mb-6">${city.localUseCase.heading}</h2>
          <div class="grid md:grid-cols-3 gap-6 text-xs sm:text-sm">
            <div class="p-5 rounded-2xl bg-[#09090b] border border-white/[0.06]">
              <h3 class="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-2">1. Perfil del Almacén en ${city.name}</h3>
              <p class="text-zinc-300 leading-relaxed">${city.localUseCase.companyProfile}</p>
            </div>
            <div class="p-5 rounded-2xl bg-[#09090b] border border-white/[0.06]">
              <h3 class="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mb-2">2. Cuello de Botella Detectado</h3>
              <p class="text-zinc-300 leading-relaxed">${city.localUseCase.challenge}</p>
            </div>
            <div class="p-5 rounded-2xl bg-[#09090b] border border-emerald-500/20">
              <h3 class="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-2">3. Solución con Bentian Agent</h3>
              <p class="text-zinc-300 leading-relaxed">${city.localUseCase.solution}</p>
            </div>
          </div>
        </div>
      </div>
    </section>`
    : '';

  const pillars = city.technicalPillars || [];
  const pillarsHtml = pillars
    .map(
      (p) => `
          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div class="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-mono text-[11px] font-semibold mb-3">${p.badge}</div>
              <h3 class="text-base font-semibold text-white mb-2">${p.title}</h3>
              <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">${p.desc}</p>
            </div>
            <a href="${p.docUrl}" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition inline-flex items-center gap-1">${p.docLabel} <span>&rarr;</span></a>
          </div>`
    )
    .join('\n');

  const specs = city.techSpecs || [];
  const specsHtml = specs
    .map(
      (row) => `
                <tr>
                  <td class="px-5 py-3.5 font-medium text-white">${row.param}</td>
                  <td class="px-5 py-3.5 text-zinc-300">${row.value}</td>
                  <td class="px-5 py-3.5 whitespace-nowrap"><a href="${row.docUrl}" class="text-indigo-400 hover:underline font-medium">${row.docLabel} &rarr;</a></td>
                </tr>`
    )
    .join('\n');

  const faqsHtml = city.faqs
    .map(
      (faq) => `
        <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
          <h3 class="text-sm sm:text-base font-semibold text-white mb-2">${faq.q}</h3>
          <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed">${faq.a}</p>
        </div>`
    )
    .join('\n');

  const schemaFaqs = city.faqs
    .map(
      (faq) => `
          {
            "@type": "Question",
            "name": ${JSON.stringify(faq.q)},
            "acceptedAnswer": {
              "@type": "Answer",
              "text": ${JSON.stringify(faq.a)}
            }
          }`
    )
    .join(',\n');

  const h1Text =
    city.customH1 ||
    `Sincroniza Factusol con tu Tienda Online en <span class="text-indigo-400">${city.name}</span>`;
  const contextH2 =
    city.contextHeading ||
    `Integración de Factusol adaptada al tejido empresarial de ${city.name} (${city.province})`;
  const hubsH3 =
    city.hubsHeading ||
    `Polígonos Industriales y Nodos Logísticos en ${city.name}`;
  const sectorsH3 =
    city.sectorsHeading ||
    `Verticales y Catálogos de Factusol Dominantes en ${city.name}`;
  const technicalH2 =
    city.technicalHeading ||
    `Ingeniería OLEDB Local-First para Almacenes de ${city.name}`;
  const technicalLeadText =
    city.technicalLead ||
    `Operativa directa sobre la red local de tu nave o comercio en ${city.name} (${city.region}), manteniendo el archivo .accdb de Factusol blindado en tus equipos Windows.`;
  const faqH2 =
    city.faqHeading ||
    `Preguntas Técnicas Frecuentes sobre Factusol en ${city.name}`;
  const ctaH2 =
    city.ctaHeading ||
    `Conecta tu almacén de Factusol en ${city.name} en menos de 2 minutos`;
  const ctaSub =
    city.ctaSubtitle ||
    `Descarga el ejecutable nativo para Windows x64 y comprueba la lectura en vivo de tus tablas F_ART, F_STO y F_LTA en ${city.name}.`;

  return `<!DOCTYPE html>
<html lang="es" class="h-full bg-[#09090b] text-[#f4f4f5] antialiased scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${city.metaTitle}</title>
  <meta name="description" content="${city.metaDescription}">
  <meta name="keywords" content="${city.keywords}">
  <meta name="author" content="Bentian">
  <link rel="canonical" href="https://bridge.cristianjm.com/conector-factusol/${city.slug}/">
  ${
    city.region === 'Comunidad Valenciana'
      ? `
  <link rel="alternate" hreflang="es" href="https://bridge.cristianjm.com/conector-factusol/${city.slug}/">
  <link rel="alternate" hreflang="ca-ES" href="https://bridge.cristianjm.com/va/">
  <link rel="alternate" hreflang="ca" href="https://bridge.cristianjm.com/va/">`
      : ''
  }

  <meta name="geo.region" content="${city.schemaRegion}">
  <meta name="geo.placename" content="${city.name}">
  <meta name="geo.position" content="${city.coordinates.lat};${city.coordinates.lng}">
  <meta name="ICBM" content="${city.coordinates.lat}, ${city.coordinates.lng}">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">
  <link rel="apple-touch-icon" href="/assets/icon.png">

  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  
  <meta property="og:locale" content="es_ES">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://bridge.cristianjm.com/conector-factusol/${city.slug}/">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="${city.metaTitle}">
  <meta property="og:description" content="${city.metaDescription}">
  <meta property="og:image" content="https://bridge.cristianjm.com/assets/og-preview.png">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${city.metaTitle}">
  <meta name="twitter:description" content="${city.metaDescription}">
  <meta name="twitter:image" content="https://bridge.cristianjm.com/assets/og-preview.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="/css/styles.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/js/tailwind.config.js"></script>

  <meta name="theme-color" content="#09090b">
  <meta name="application-name" content="Bentian ERP Bridge">
  <link rel="manifest" href="/manifest.json">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://bridge.cristianjm.com/" },
          { "@type": "ListItem", "position": 2, "name": "Directorio Nacional Factusol", "item": "https://bridge.cristianjm.com/conector-factusol/" },
          { "@type": "ListItem", "position": 3, "name": "${city.name} (${city.province})", "item": "https://bridge.cristianjm.com/conector-factusol/${city.slug}/" }
        ]
      },
      {
        "@type": "Service",
        "name": ${JSON.stringify(city.metaTitle)},
        "serviceType": "Integración ERP Factusol y Comercio Electrónico",
        "description": ${JSON.stringify(city.metaDescription)},
        "provider": {
          "@type": "Organization",
          "name": "Bentian ERP Bridge",
          "url": "https://bridge.cristianjm.com/"
        },
        "areaServed": {
          "@type": "City",
          "name": "${city.name}",
          "containedInPlace": {
            "@type": "AdministrativeArea",
            "name": "${city.province}, ${city.region}"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": ${city.coordinates.lat},
            "longitude": ${city.coordinates.lng}
          }
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "Bentian ERP Bridge - Nodo ${city.name}",
        "operatingSystem": "Windows 10, Windows 11, Windows Server",
        "applicationCategory": "BusinessApplication",
        "softwareVersion": "${currentVersion}",
        "dateModified": "${lastModifiedIso}",
        "downloadUrl": "https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe",
        "image": "https://bridge.cristianjm.com/assets/screenshots/01-dashboard-overview.png",
        "brand": { "@type": "Brand", "name": "Bentian" },
        "sku": "BENTIAN-ERP-BRIDGE-${city.slug.toUpperCase()}",
        "mpn": "EB-${currentVersion.replace(/\./g, '')}-${city.slug.toUpperCase()}",
        "offers": {
          "@type": "Offer",
          "price": "199.00",
          "priceCurrency": "EUR",
          "priceValidUntil": "2027-12-31",
          "url": "https://bridge.cristianjm.com/#pricing",
          "availability": "https://schema.org/InStock",
          "seller": { "@type": "Organization", "name": "Bentian" },
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": { "@type": "MonetaryAmount", "value": "0.00", "currency": "EUR" },
            "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "ES" },
            "deliveryTime": {
              "@type": "ShippingDeliveryTime",
              "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 0, "unitCode": "DAY" },
              "transitTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 0, "unitCode": "DAY" }
            }
          },
          "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "ES",
            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays": 60,
            "returnMethod": "https://schema.org/ReturnOnline",
            "returnFees": "https://schema.org/FreeReturn"
          }
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
${schemaFaqs}
        ]
      }
    ]
  }
  </script>
</head>
<body class="bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-indigo-500/30 font-sans min-h-screen flex flex-col justify-between">

${renderCityHeader(currentVersion)}

  <main>
    <nav class="border-b border-white/[0.08] bg-[#09090b] text-xs py-3 px-6" aria-label="Breadcrumb">
      <div class="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 text-zinc-500">
        <div class="flex items-center gap-2">
          <a href="/" class="hover:text-zinc-300 transition">Inicio</a>
          <span>/</span>
          <a href="/conector-factusol/" class="hover:text-zinc-300 transition">Directorio Nacional (${allCities.length} Ciudades)</a>
          <span>/</span>
          <a href="/conector-factusol/#region-${city.schemaRegion.toLowerCase()}" class="hover:text-zinc-300 transition">${city.region}</a>
          <span>/</span>
          <span class="text-zinc-300 font-medium">${city.name}</span>
        </div>
        <span class="font-mono text-[11px] text-zinc-500">${city.schemaRegion} &bull; ${city.coordinates.lat.toFixed(2)}°N, ${city.coordinates.lng.toFixed(2)}°E</span>
      </div>
    </nav>

    <section class="py-14 md:py-20 px-6 border-b border-white/[0.08] relative overflow-hidden bg-[#09090b]">
      <div class="max-w-4xl mx-auto text-center relative z-10">
        ${
          city.region === 'Comunidad Valenciana'
            ? `
        <div class="mb-4">
          <a href="/va/" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition">
            <span>🦇 Disponible en Valencià: Documentació i Fitxa Tècnica</span>
            <span>&rarr;</span>
          </a>
        </div>`
            : ''
        }
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-6">
          <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
          ${city.heroBadge || `${city.name} (${city.province}) • ${city.region}`}
        </div>
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
          ${h1Text}
        </h1>
        <p class="text-base sm:text-lg text-zinc-400 mb-8 max-w-3xl mx-auto leading-relaxed">
          ${city.heroSubtitle}
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
            Descargar Agente Windows (.exe)
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </a>
          <a href="/beta/" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#121215] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] transition text-center font-medium">
            Acceso a Beta en ${city.name}
          </a>
        </div>
        <p class="mt-4 text-xs text-zinc-500 font-mono">Versión <span data-app-version>v${currentVersion}</span> &bull; ${city.fiscalRegime || `Normativa fiscal ${city.region}`}</p>
      </div>
    </section>

    <section class="py-16 md:py-20 px-6 border-b border-white/[0.08] bg-[#09090b]">
      <div class="max-w-5xl mx-auto">
        <div class="max-w-3xl mx-auto mb-12">
          <h2 class="text-2xl md:text-3xl font-bold text-white mb-5 text-center">${contextH2}</h2>
          <div class="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
            <p>${city.localContextParagraph}</p>
            ${city.localLogisticsParagraph ? `<p>${city.localLogisticsParagraph}</p>` : ''}
          </div>
        </div>

        ${renderIneStatsBlock(city)}

        <div class="mb-14">
          <h3 class="text-sm uppercase tracking-wider text-zinc-400 font-semibold mb-6 text-center">${hubsH3}</h3>
          <div class="grid md:grid-cols-3 gap-6">
            ${hubsHtml}
          </div>
        </div>

        <div>
          <h3 class="text-sm uppercase tracking-wider text-zinc-400 font-semibold mb-5 text-center">${sectorsH3}</h3>
          <div class="grid sm:grid-cols-2 gap-4">
            ${sectorsHtml}
          </div>
        </div>
      </div>
    </section>

    ${useCaseHtml}

    <section class="py-16 md:py-20 px-6 border-b border-white/[0.08] bg-[#09090b]">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-white text-center mb-4">${technicalH2}</h2>
        <p class="text-sm sm:text-base text-zinc-400 text-center max-w-3xl mx-auto mb-10">
          ${technicalLeadText}
        </p>

        ${
          pillarsHtml
            ? `<div class="grid md:grid-cols-3 gap-6 mb-12">
          ${pillarsHtml}
        </div>`
            : ''
        }

        ${
          specsHtml
            ? `<div class="rounded-2xl border border-white/[0.08] bg-[#121215] overflow-hidden">
          <div class="px-6 py-4 bg-zinc-900/80 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 class="text-sm font-bold text-white">${city.techSpecsHeading || `Parámetros de Implantación Factusol en ${city.name} (${city.province})`}</h3>
            <span class="text-[11px] font-mono text-indigo-400">${city.corridorName || city.region} &bull; v${currentVersion}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-zinc-900/40 text-zinc-400 border-b border-white/[0.06]">
                <tr>
                  <th class="px-5 py-3 font-semibold">Dimensión Técnica</th>
                  <th class="px-5 py-3 font-semibold">Configuración en ${city.name}</th>
                  <th class="px-5 py-3 font-semibold">Documentación</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/[0.06]">
                ${specsHtml}
              </tbody>
            </table>
          </div>
        </div>`
            : ''
        }
      </div>
    </section>

    <section class="py-16 md:py-20 px-6 border-b border-white/[0.08] bg-[#09090b]">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-white text-center mb-10">${faqH2}</h2>
        <div class="space-y-4">
          ${faqsHtml}
        </div>
      </div>
    </section>

    <section class="py-14 px-6 border-b border-white/[0.08] bg-[#09090b]">
      <div class="max-w-5xl mx-auto">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span class="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">Proximidad Geográfica y Corredores desde ${city.name}</span>
            <h2 class="text-xl md:text-2xl font-bold text-white mt-1">Nodos Factusol Cercanos a ${city.name} (${city.region})</h2>
          </div>
          <a href="/conector-factusol/" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">Ver las ${allCities.length} ciudades en el Directorio Nacional &rarr;</a>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          ${relatedCitiesHtml}
        </div>
      </div>
    </section>

    <section class="py-16 md:py-20 px-6 text-center bg-[#09090b]">
      <div class="max-w-3xl mx-auto rounded-2xl bg-[#121215] border border-white/[0.08] p-8 sm:p-12 text-center">
        <h2 class="text-2xl md:text-3xl font-bold text-white mb-4">${ctaH2}</h2>
        <p class="text-sm text-zinc-400 mb-8 max-w-xl mx-auto">
          ${ctaSub}
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-600/20 flex items-center gap-2">
            <span>Descargar Bentian Agent (.exe)</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </a>
          <a href="/conector-factusol/" class="px-6 py-3.5 rounded-xl bg-[#18181b] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] transition font-medium">
            Directorio Nacional de Ciudades
          </a>
        </div>
      </div>
    </section>
  </main>

${renderNationalDirectoryFooter(allCities)}

  <script src="/js/version-sync.js"></script>
</body>
</html>`;
}
