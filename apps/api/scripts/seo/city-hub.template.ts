import { CityData } from './city-page.types';
import { renderCityHeader, renderNationalDirectoryFooter } from './city-page.template';

function getCitySvgCoordinates(c: CityData): { x: number; y: number } {
  if (c.slug === 'santa-cruz-de-tenerife') return { x: 75, y: 535 };
  if (c.slug === 'las-palmas') return { x: 135, y: 545 };
  const x = Math.round(65 + ((c.coordinates.lng - -9.5) / 14.0) * 735);
  const y = Math.round(45 + ((44.0 - c.coordinates.lat) / 8.2) * 475);
  return { x, y };
}

function slugifyRegion(region: string): string {
  return region
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getRegionalFiscalBadge(region: string): string {
  if (region === 'País Vasco') return 'TicketBAI / Batuz (Haciendas Forales Bizkaia, Gipuzkoa y Araba)';
  if (region === 'Comunidad Foral de Navarra') return 'Hacienda Foral de Navarra • Régimen Fiscal Propio';
  if (region === 'Canarias') return 'REF Canarias • IGIC, AIEM y Gestión Aduanera DUA';
  return 'Territorio Común AEAT • IVA, Recargo de Equivalencia y RD 1007/2023 Veri*Factu';
}

export function renderHubPage(cities: CityData[], currentVersion: string): string {
  const fmt = (n: number) => n.toLocaleString('es-ES');

  // Agrupar ciudades por Comunidad Autónoma
  const regionsMap = new Map<string, CityData[]>();
  for (const c of cities) {
    const arr = regionsMap.get(c.region) || [];
    arr.push(c);
    regionsMap.set(c.region, arr);
  }
  const sortedRegions = Array.from(regionsMap.entries()).sort((a, b) => b[1].length - a[1].length);

  const filterChipsHtml =
    `
    <button type="button" class="filter-chip active px-3.5 py-1.5 rounded-full text-xs font-medium transition bg-indigo-600 text-white shadow-sm hover:bg-indigo-500" data-region="all">
      Todas (${cities.length})
    </button>
  ` +
    sortedRegions
      .map(
        ([reg, list]) => `
    <button type="button" class="filter-chip px-3.5 py-1.5 rounded-full text-xs font-medium transition bg-[#18181b] text-zinc-400 hover:text-white border border-white/[0.06] hover:border-zinc-700" data-region="${reg.toLowerCase()}">
      ${reg} (${list.length})
    </button>`
      )
      .join('\n');

  const regionJumpLinksHtml = sortedRegions
    .map(
      ([reg, list]) =>
        `<a href="#region-${slugifyRegion(reg)}" class="px-3 py-1.5 rounded-lg bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 text-xs text-zinc-300 hover:text-white transition">${reg} <span class="text-zinc-500 font-mono">(${list.length})</span></a>`
    )
    .join('\n');

  const pinsHtml = cities
    .map((c) => {
      const { x, y } = getCitySvgCoordinates(c);
      const safeTagline = c.tagline.replace(/"/g, '&quot;');
      return `
        <g class="city-pin cursor-pointer transition-all duration-150" 
           data-slug="${c.slug}" 
           data-name="${c.name}" 
           data-province="${c.province}" 
           data-region="${c.region}" 
           data-tagline="${safeTagline}"
           data-x="${x}"
           data-y="${y}">
          <circle cx="${x}" cy="${y}" r="14" class="city-halo opacity-0 fill-indigo-500/25 transition-all duration-200 pointer-events-none" />
          <circle cx="${x}" cy="${y}" r="5" class="city-core fill-indigo-500 stroke-[#09090b] stroke-2 hover:fill-emerald-400 hover:r-7 transition-all duration-200" />
          <text x="${x}" y="${y - 8}" text-anchor="middle" class="city-label text-[9px] fill-zinc-400 font-sans font-medium pointer-events-none select-none transition-all">${c.name}</text>
        </g>`;
    })
    .join('\n');

  // Secciones estructuradas por Comunidad Autónoma (Directorio Enterprise)
  const regionalSectionsHtml = sortedRegions
    .map(([region, regCities]) => {
      const regSlug = slugifyRegion(region);
      const seenProvinces = new Set<string>();
      let regTotalEmpresas = 0;
      let regPymes = 0;
      for (const c of regCities) {
        if (c.ineStats && !seenProvinces.has(c.ineStats.provincia)) {
          seenProvinces.add(c.ineStats.provincia);
          regTotalEmpresas += c.ineStats.totalEmpresas;
          regPymes += c.ineStats.pymes1a49;
        }
      }
      const fiscalBadge = getRegionalFiscalBadge(region);

      const cityCardsHtml = regCities
        .map((c) => {
          const hubList = c.industrialHubs.map((h) => h.name).join(' • ');
          const topSectors = c.sectors.slice(0, 3).join(' • ');
          const pymesText = c.ineStats ? `${fmt(c.ineStats.pymes1a49)} pymes (1-49 empl.) en ${c.ineStats.provincia}` : c.province;
          return `
            <article class="city-card p-6 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-zinc-900/60 transition-all flex flex-col justify-between group"
                     data-name="${c.name.toLowerCase()} ${hubList.toLowerCase()}"
                     data-province="${c.province.toLowerCase()}"
                     data-region="${c.region.toLowerCase()}"
                     data-slug="${c.slug}">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">${c.province}</span>
                  <span class="text-[11px] text-emerald-400 font-mono">${pymesText}</span>
                </div>
                <h3 class="text-lg font-bold text-white group-hover:text-indigo-300 transition mb-2">
                  <a href="/conector-factusol/${c.slug}/" class="focus:outline-none">Conector Factusol en ${c.name}</a>
                </h3>
                <p class="text-xs text-zinc-400 leading-relaxed mb-3">${c.tagline}</p>
                <div class="p-3 rounded-xl bg-[#09090b] border border-white/[0.05] text-[11px] text-zinc-400 space-y-1.5 mb-4">
                  <div><strong class="text-zinc-200">Polígonos clave:</strong> ${hubList}</div>
                  <div><strong class="text-zinc-200">Sectores:</strong> ${topSectors}</div>
                </div>
              </div>
              <a href="/conector-factusol/${c.slug}/" class="inline-flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition">
                <span>Ficha técnica y polígonos de ${c.name}</span>
                <span class="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </a>
            </article>`;
        })
        .join('\n');

      return `
        <section id="region-${regSlug}" class="region-section pt-8 pb-10 border-b border-white/[0.08]" data-region-section="${region.toLowerCase()}">
          <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div>
              <div class="inline-flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
                <span>COMUNIDAD AUTÓNOMA</span>
                <span>&bull;</span>
                <span>${regCities.length} ${regCities.length === 1 ? 'NODO INDUSTRIAL' : 'NODOS INDUSTRIALES'}</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-bold text-white">Conector Factusol en ${region}</h2>
              <p class="text-xs sm:text-sm text-zinc-400 mt-1">${fiscalBadge}</p>
            </div>
            ${
              regTotalEmpresas > 0
                ? `<div class="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[#121215] border border-white/[0.08] text-xs font-mono">
                    <div><span class="text-zinc-500">Empresas DIRCE:</span> <strong class="text-white">${fmt(regTotalEmpresas)}</strong></div>
                    <span class="text-zinc-700">|</span>
                    <div><span class="text-zinc-500">Pymes 1-49:</span> <strong class="text-indigo-300">${fmt(regPymes)}</strong></div>
                  </div>`
                : ''
            }
          </div>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${cityCardsHtml}
          </div>
        </section>`;
    })
    .join('\n');

  const itemListSchema = cities
    .map(
      (c, idx) => `
          {
            "@type": "ListItem",
            "position": ${idx + 1},
            "name": "Conector Factusol en ${c.name} (${c.province})",
            "url": "https://bridge.cristianjm.com/conector-factusol/${c.slug}/"
          }`
    )
    .join(',\n');

  return `<!DOCTYPE html>
<html lang="es" class="h-full bg-[#09090b] text-[#f4f4f5] antialiased scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Directorio Nacional de Ciudades y Polígonos Factusol (${cities.length} Sedes) | Bentian ERP Bridge</title>
  <meta name="description" content="Directorio nacional por Comunidades Autónomas y polígonos industriales de Bentian ERP Bridge. Sincroniza Factusol (.accdb) con WooCommerce, PrestaShop y Shopify en ${cities.length} ciudades de España.">
  <link rel="canonical" href="https://bridge.cristianjm.com/conector-factusol/">

  <meta property="og:locale" content="es_ES">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bridge.cristianjm.com/conector-factusol/">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="Directorio Nacional de Ciudades y Polígonos Factusol | Bentian ERP Bridge">
  <meta property="og:description" content="Explora los ${cities.length} nodos industriales de España con soporte Local-First para Factusol, WooCommerce y PrestaShop.">
  <meta property="og:image" content="https://bridge.cristianjm.com/assets/og-preview.png">

  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">
  <link rel="apple-touch-icon" href="/assets/icon.png">

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
        "@type": "CollectionPage",
        "name": "Directorio Nacional de Conectores Factusol por Ciudades y Polígonos Industriales",
        "url": "https://bridge.cristianjm.com/conector-factusol/",
        "description": "Directorio estructurado de las ${cities.length} principales áreas industriales y logísticas de España con soporte nativo OLEDB para Factusol."
      },
      {
        "@type": "ItemList",
        "name": "Nodos Industriales Factusol en España",
        "numberOfItems": ${cities.length},
        "itemListElement": [
${itemListSchema}
        ]
      }
    ]
  }
  </script>
</head>
<body class="bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-indigo-500/30 font-sans min-h-screen flex flex-col justify-between">

${renderCityHeader(currentVersion)}

  <main class="py-12 md:py-16 px-4 sm:px-6 flex-1 bg-[#09090b]">
    <div class="max-w-6xl mx-auto">
      
      <div class="text-center max-w-3xl mx-auto mb-12">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          DIRECTORIO NACIONAL B2B &bull; ${cities.length} ÁREAS INDUSTRIALES Y LOGÍSTICAS
        </div>
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
          Directorio Nacional de Integración Factusol por Ciudades y Polígonos
        </h1>
        <p class="text-base sm:text-lg text-zinc-400 leading-relaxed">
          Consulta la arquitectura técnica, polígonos industriales cubiertos, datos empresariales INE DIRCE y particularidades fiscales (Veri*Factu, TicketBAI, Régimen Foral Navarro e IGIC Canario) en las ${cities.length} principales capitales y nodos logísticos de España.
        </p>
      </div>

      <!-- Índice Rápido por Comunidad Autónoma -->
      <div class="mb-10 p-5 rounded-2xl bg-[#121215] border border-white/[0.08]">
        <div class="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">Acceso directo por Comunidad Autónoma (${sortedRegions.length} Regiones):</div>
        <div class="flex flex-wrap gap-2">
          ${regionJumpLinksHtml}
        </div>
      </div>

      <!-- MAPA INTERACTIVO DE ESPAÑA -->
      <div class="mb-14 rounded-3xl bg-[#121215] border border-white/[0.08] p-4 sm:p-8 relative shadow-2xl overflow-hidden" id="map-container">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.06]">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-ping"></div>
            <span class="text-xs font-semibold text-white uppercase tracking-wider font-mono">Mapa Peninsular, Balear y Canario</span>
            <span class="text-xs text-zinc-500">Haz clic sobre cualquier ciudad para abrir su ficha técnica local</span>
          </div>
          <div class="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> ${cities.length} Sedes Documentadas</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> 100% OLEDB Local-First</span>
          </div>
        </div>

        <div class="relative w-full aspect-[920/620] max-h-[560px] flex items-center justify-center">
          <svg viewBox="0 0 920 620" class="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="spain-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#18181b" stop-opacity="0.8" />
                <stop offset="100%" stop-color="#0e0e11" stop-opacity="0.9" />
              </linearGradient>
              <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#6366f1" stop-opacity="0.15" />
                <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
              </radialGradient>
            </defs>
            <circle cx="430" cy="280" r="280" fill="url(#radar-glow)" />
            <circle cx="430" cy="280" r="180" fill="none" stroke="#27272a" stroke-dasharray="3 6" stroke-width="1" />
            <circle cx="430" cy="280" r="280" fill="none" stroke="#27272a" stroke-dasharray="4 8" stroke-width="1" />
            <path d="M 115,75 L 170,55 L 280,50 L 390,60 L 460,75 L 530,95 L 610,135 L 690,165 L 735,160 L 730,195 L 685,250 L 650,290 L 590,340 L 570,390 L 530,440 L 470,470 L 390,500 L 310,510 L 250,500 L 230,480 L 190,440 L 175,380 L 155,320 L 140,250 L 130,180 L 115,130 Z" fill="url(#spain-bg)" stroke="#3f3f46" stroke-width="1.8" />
            <path d="M 190,440 L 175,380 L 155,320 L 140,250 L 130,180 L 175,180 L 210,240 L 230,320 L 250,400 L 230,480" fill="none" stroke="#27272a" stroke-dasharray="4 4" stroke-width="1.5" />
            <text x="180" y="310" class="text-[10px] fill-zinc-600 font-mono tracking-widest pointer-events-none select-none">PORTUGAL</text>
            <path d="M 680,270 L 710,260 L 720,280 L 690,295 Z" fill="#18181b" stroke="#3f3f46" stroke-width="1.5" />
            <path d="M 730,245 L 750,240 L 745,255 L 730,255 Z" fill="#18181b" stroke="#3f3f46" stroke-width="1.5" />
            <path d="M 645,305 L 660,295 L 665,315 L 650,320 Z" fill="#18181b" stroke="#3f3f46" stroke-width="1.5" />
            <g transform="translate(25, 450)">
              <rect width="185" height="135" rx="14" fill="#0d0d10" stroke="#27272a" stroke-width="1.5" />
              <text x="16" y="24" class="text-[10px] font-mono fill-zinc-400 font-semibold tracking-wider uppercase">Islas Canarias</text>
              <ellipse cx="75" cy="85" rx="18" ry="12" fill="#18181b" stroke="#3f3f46" stroke-width="1.2" />
              <ellipse cx="135" cy="95" rx="16" ry="14" fill="#18181b" stroke="#3f3f46" stroke-width="1.2" />
            </g>
            ${pinsHtml}
          </svg>

          <div id="map-tooltip" class="hidden absolute pointer-events-auto z-30 transform -translate-x-1/2 -translate-y-full mb-3 w-72 p-4 rounded-xl bg-[#09090b]/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl transition-all duration-150">
            <div class="flex items-center justify-between mb-1.5">
              <span id="tooltip-title" class="text-sm font-bold text-white">Ciudad</span>
              <span id="tooltip-badge" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">Activo</span>
            </div>
            <div id="tooltip-meta" class="text-[11px] font-mono text-zinc-400 mb-2">Provincia • Región</div>
            <p id="tooltip-desc" class="text-xs text-zinc-300 line-clamp-2 mb-3 leading-relaxed">Descripción del área industrial...</p>
            <a id="tooltip-link" href="#" class="inline-flex items-center justify-center w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm">
              Ver conector y polígonos &rarr;
            </a>
          </div>
        </div>
      </div>

      <!-- BUSCADOR EN TIEMPO REAL Y FILTROS POR COMUNIDAD -->
      <div class="mb-8 space-y-5">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="relative w-full md:max-w-md">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
            <input type="text" id="city-search" placeholder="Busca por ciudad, provincia o polígono industrial..." class="w-full pl-10 pr-10 py-3 bg-[#121215] border border-white/[0.08] focus:border-indigo-500 focus:outline-none rounded-xl text-sm text-white placeholder-zinc-500 transition">
            <button id="search-clear" class="hidden absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-white transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div id="visible-count" class="text-xs font-mono text-zinc-400">
            ${cities.length} ciudades disponibles en ${sortedRegions.length} Comunidades Autónomas
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 pt-1">
          ${filterChipsHtml}
        </div>
      </div>

      <!-- DIRECTORIO ESTRUCTURADO POR COMUNIDADES AUTÓNOMAS -->
      <div id="cities-directory">
        ${regionalSectionsHtml}
      </div>

      <!-- MATRIZ COMPARATIVA DE REGÍMENES FISCALES Y CORREDORES LOGÍSTICOS EN ESPAÑA -->
      <section class="mt-16 p-6 sm:p-8 rounded-3xl bg-[#121215] border border-white/[0.08]">
        <div class="max-w-3xl mb-6">
          <span class="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">Arquitectura Fiscal y Logística Multi-Región</span>
          <h2 class="text-2xl font-bold text-white mt-1">Adaptación de Bentian ERP Bridge a cada Jurisdicción Fiscal de España</h2>
          <p class="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
            La sincronización de pedidos e inventario entre Factusol y el comercio electrónico en España exige respetar las particularidades tributarias y aduaneras de cada Comunidad Autónoma sin alterar las series de facturación locales.
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border border-white/[0.06] rounded-xl overflow-hidden">
            <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
              <tr>
                <th class="px-4 py-3 font-semibold">Ámbito Territorial</th>
                <th class="px-4 py-3 font-semibold">Ciudades Representadas</th>
                <th class="px-4 py-3 font-semibold">Normativa Fiscal en Factusol</th>
                <th class="px-4 py-3 font-semibold">Comportamiento del Agente Bentian</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.06] text-zinc-400">
              <tr>
                <td class="px-4 py-3.5 font-semibold text-white">Territorio Común (AEAT)</td>
                <td class="px-4 py-3.5">Madrid, Barcelona, Valencia, Sevilla, Zaragoza, Murcia, Valladolid, A Coruña, Palma y 36 sedes más</td>
                <td class="px-4 py-3.5">IVA (21% / 10% / 4%), Recargo de Equivalencia (5,2% / 1,4% / 0,5%) y RD 1007/2023 Veri*Factu</td>
                <td class="px-4 py-3.5">Inyección exclusiva en <code class="text-indigo-300 font-mono">F_PCL / F_LPC</code> (Pedidos de Cliente) sin tocar series de facturación certificadas.</td>
              </tr>
              <tr>
                <td class="px-4 py-3.5 font-semibold text-white">País Vasco (Haciendas Forales)</td>
                <td class="px-4 py-3.5">Bilbao (Bizkaia), San Sebastián (Gipuzkoa) y Vitoria-Gasteiz (Álava)</td>
                <td class="px-4 py-3.5">TicketBAI / sistema Batuz (encadenamiento criptográfico TBAI en facturas <code class="text-indigo-300 font-mono">F_FAC</code>)</td>
                <td class="px-4 py-3.5">Registra pedidos web en <code class="text-indigo-300 font-mono">F_PCL</code> para que el cierre y timbrado TicketBAI lo ejecute Factusol de forma nativa.</td>
              </tr>
              <tr>
                <td class="px-4 py-3.5 font-semibold text-white">Comunidad Foral de Navarra</td>
                <td class="px-4 py-3.5">Pamplona, Landaben, Ciudad del Transporte (Noáin) y Ribera de Navarra</td>
                <td class="px-4 py-3.5">Convenio Económico Navarro y SII Foral</td>
                <td class="px-4 py-3.5">Mapeo de tipos impositivos y series específicas de pedido web aisladas de la facturación de mostrador.</td>
              </tr>
              <tr>
                <td class="px-4 py-3.5 font-semibold text-white">Islas Canarias (REF)</td>
                <td class="px-4 py-3.5">Las Palmas de Gran Canaria (El Sebadal, Arinaga) y Santa Cruz de Tenerife (Güímar, Los Majuelos)</td>
                <td class="px-4 py-3.5">IGIC (Tipo general 7%, reducido 3%, 0%), AIEM y despachos DUA de importación/exportación</td>
                <td class="px-4 py-3.5">Detección por código postal (35xxx / 38xxx) de operaciones exentas o sujetas a IGIC y preservación de tarifas insulares en <code class="text-indigo-300 font-mono">F_LTA</code>.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  </main>

${renderNationalDirectoryFooter(cities)}

  <script>
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('city-search');
    const clearBtn = document.getElementById('search-clear');
    const chips = document.querySelectorAll('.filter-chip');
    const cards = document.querySelectorAll('.city-card');
    const regionSections = document.querySelectorAll('.region-section');
    const pins = document.querySelectorAll('.city-pin');
    const tooltip = document.getElementById('map-tooltip');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipMeta = document.getElementById('tooltip-meta');
    const tooltipDesc = document.getElementById('tooltip-desc');
    const tooltipLink = document.getElementById('tooltip-link');
    const countBadge = document.getElementById('visible-count');
    const mapContainer = document.getElementById('map-container');

    let activeRegion = 'all';
    let searchTerm = '';

    function filterAll() {
      let visibleCount = 0;
      const term = searchTerm.trim().toLowerCase();

      cards.forEach(card => {
        const name = card.dataset.name || '';
        const province = card.dataset.province || '';
        const region = card.dataset.region || '';

        const matchRegion = activeRegion === 'all' || region === activeRegion;
        const matchSearch = !term || name.includes(term) || province.includes(term) || region.includes(term);

        if (matchRegion && matchSearch) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      regionSections.forEach(sec => {
        const visibleCardsInSec = sec.querySelectorAll('.city-card:not(.hidden)').length;
        if (visibleCardsInSec > 0) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      });

      pins.forEach(pin => {
        const name = (pin.dataset.name || '').toLowerCase();
        const province = (pin.dataset.province || '').toLowerCase();
        const region = (pin.dataset.region || '').toLowerCase();

        const matchRegion = activeRegion === 'all' || region === activeRegion;
        const matchSearch = !term || name.includes(term) || province.includes(term) || region.includes(term);

        const core = pin.querySelector('.city-core');
        const halo = pin.querySelector('.city-halo');
        const label = pin.querySelector('.city-label');

        if (matchRegion && matchSearch) {
          pin.style.opacity = '1';
          if (term && (name.includes(term) || province.includes(term))) {
            core.setAttribute('fill', '#10b981');
            halo.style.opacity = '0.7';
            halo.setAttribute('fill', '#10b981');
            if (label) {
              label.style.fill = '#ffffff';
              label.style.fontWeight = 'bold';
            }
          } else {
            core.setAttribute('fill', '#6366f1');
            halo.style.opacity = '0';
            halo.setAttribute('fill', '#6366f1');
            if (label) {
              label.style.fill = '#a1a1aa';
              label.style.fontWeight = 'normal';
            }
          }
        } else {
          pin.style.opacity = '0.2';
          core.setAttribute('fill', '#52525b');
          halo.style.opacity = '0';
          if (label) {
            label.style.fill = '#3f3f46';
          }
        }
      });

      if (countBadge) {
        countBadge.textContent = visibleCount + ' ciudades mostradas';
      }
    }

    pins.forEach(pin => {
      function showTooltip() {
        const name = pin.dataset.name;
        const province = pin.dataset.province;
        const region = pin.dataset.region;
        const tagline = pin.dataset.tagline;
        const slug = pin.dataset.slug;

        tooltipTitle.textContent = name;
        tooltipMeta.textContent = province + ' • ' + region;
        tooltipDesc.textContent = tagline;
        tooltipLink.href = '/conector-factusol/' + slug + '/';

        const rect = pin.getBoundingClientRect();
        const containerRect = mapContainer.getBoundingClientRect();

        let left = rect.left - containerRect.left + (rect.width / 2);
        let top = rect.top - containerRect.top;

        if (left < 150) left = 150;
        if (left > containerRect.width - 150) left = containerRect.width - 150;

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.remove('hidden');
      }

      pin.addEventListener('mouseenter', showTooltip);
      pin.addEventListener('click', () => {
        window.location.href = '/conector-factusol/' + pin.dataset.slug + '/';
      });
    });

    mapContainer.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        if (clearBtn) clearBtn.style.display = searchTerm ? 'flex' : 'none';
        filterAll();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchTerm = '';
        clearBtn.style.display = 'none';
        filterAll();
      });
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => {
          c.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
          c.classList.add('bg-[#18181b]', 'text-zinc-400');
        });
        chip.classList.remove('bg-[#18181b]', 'text-zinc-400');
        chip.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');

        activeRegion = chip.dataset.region;
        filterAll();
      });
    });
  });
  </script>

  <script src="/js/version-sync.js"></script>
  <script src="/js/omnichannel-widget.js" defer></script>
</body>
</html>`;
}
