import * as fs from 'fs';
import * as path from 'path';

interface IndustrialHub {
  name: string;
  desc: string;
}

interface FaqItem {
  q: string;
  a: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface CityData {
  slug: string;
  name: string;
  province: string;
  region: string;
  schemaRegion: string;
  coordinates: Coordinates;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  heroSubtitle: string;
  industrialHubs: IndustrialHub[];
  sectors: string[];
  localContextParagraph: string;
  faqs: FaqItem[];
}

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const DATA_FILE = path.resolve(__dirname, '../data/cities.json');
const SITEMAP_FILE = path.resolve(PUBLIC_DIR, 'sitemap.xml');
const CITIES_OUTPUT_ROOT = path.resolve(PUBLIC_DIR, 'conector-factusol');

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
  return '0.4.0';
}

function renderHeader(currentVersion: string): string {
  return `  <!-- Header Canónico Unificado -->
  <header class="border-b border-white/[0.08] bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-50">
    <div class="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 h-20 flex items-center justify-between">
      <!-- Marca Principal Bentian -->
      <a href="/" class="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl py-1.5 px-2 hover:bg-white/[0.03] transition shrink-0">
        <img src="/assets/icon.svg" alt="Bentian Logo" class="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 group-hover:scale-105 transition-transform" width="36" height="36">
        <span class="font-bold text-lg sm:text-xl tracking-tight text-white group-hover:text-indigo-200 transition">Bentian</span>
      </a>

      <!-- Navegación alineada a la derecha -->
      <nav class="flex items-center gap-3 sm:gap-6 lg:gap-8 text-xs sm:text-[13px] font-medium shrink-0">
        <a href="/" class="text-zinc-400 hover:text-white transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] whitespace-nowrap shrink-0">
          <span>&larr; Web Principal</span>
        </a>
        <a href="/docs/" class="text-zinc-400 hover:text-white transition hidden md:inline px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] whitespace-nowrap shrink-0">Docs</a>
        <a href="/conector-factusol/" class="text-zinc-400 hover:text-white transition hidden sm:inline px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] whitespace-nowrap shrink-0">Ciudades</a>
        <a href="/seguridad/" class="text-zinc-400 hover:text-white transition hidden md:inline px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] whitespace-nowrap shrink-0">Seguridad</a>
        <a href="/quien-esta-detras/" class="text-zinc-400 hover:text-white transition hidden lg:inline px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] whitespace-nowrap shrink-0">Equipo</a>
        <a href="/dashboard/" class="text-zinc-400 hover:text-white transition hidden xl:inline px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] whitespace-nowrap shrink-0">Clientes</a>
        <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="px-4.5 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm hover:shadow-indigo-500/25 transition flex items-center gap-2 whitespace-nowrap text-xs sm:text-[13px] shrink-0">
          <span>Descargar Agente</span>
          <span class="text-[10px] font-mono bg-indigo-700/60 px-1.5 py-0.5 rounded text-indigo-200 hidden sm:inline" data-app-version>v${currentVersion}</span>
        </a>
      </nav>
    </div>
  </header>`;
}

function renderCityPage(city: CityData, currentVersion: string): string {
  const hubsHtml = city.industrialHubs
    .map(
      (hub) => `
        <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 transition">
          <div class="flex items-center gap-3 mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h3 class="text-base font-semibold text-white tracking-tight">${hub.name}</h3>
          </div>
          <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed">${hub.desc}</p>
        </div>`
    )
    .join('\n');

  const sectorsHtml = city.sectors
    .map(
      (sec) => `
        <div class="flex items-center gap-3 p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
          <span class="text-xs sm:text-sm font-medium text-zinc-300">${sec}</span>
        </div>`
    )
    .join('\n');

  const faqsHtml = city.faqs
    .map(
      (faq) => `
        <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
          <h4 class="text-sm sm:text-base font-semibold text-white mb-2">${faq.q}</h4>
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

  <!-- GEO Meta Tags (W3C Standard & Local SEO / GEO) -->
  <meta name="geo.region" content="${city.schemaRegion}">
  <meta name="geo.placename" content="${city.name}">
  <meta name="geo.position" content="${city.coordinates.lat};${city.coordinates.lng}">
  <meta name="ICBM" content="${city.coordinates.lat}, ${city.coordinates.lng}">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">
  <link rel="apple-touch-icon" href="/assets/icon.png">

  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  
  <!-- Open Graph / Redes Sociales -->
  <meta property="og:locale" content="es_ES">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://bridge.cristianjm.com/conector-factusol/${city.slug}/">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="${city.metaTitle}">
  <meta property="og:description" content="${city.metaDescription}">
  <meta property="og:image" content="https://bridge.cristianjm.com/assets/og-preview.png">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${city.metaTitle}">
  <meta name="twitter:description" content="${city.metaDescription}">
  <meta name="twitter:image" content="https://bridge.cristianjm.com/assets/og-preview.png">

  <!-- Tipografía Oficial: Inter + JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

  <!-- TailwindCSS y Config -->
  <link rel="stylesheet" href="/css/styles.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/js/tailwind.config.js"></script>

  <!-- Metadatos de Web App -->
  <meta name="theme-color" content="#09090b">
  <meta name="application-name" content="Bentian ERP Bridge">
  <link rel="manifest" href="/manifest.json">

  <!-- Schema.org JSON-LD Localizado con GEO y Entidades -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://bridge.cristianjm.com/" },
          { "@type": "ListItem", "position": 2, "name": "Conectores Factusol", "item": "https://bridge.cristianjm.com/conector-factusol/" },
          { "@type": "ListItem", "position": 3, "name": "${city.name}", "item": "https://bridge.cristianjm.com/conector-factusol/${city.slug}/" }
        ]
      },
      {
        "@type": "Service",
        "name": "Conector Factusol para WooCommerce y PrestaShop en ${city.name}",
        "serviceType": "Software Integration Service",
        "description": "${city.metaDescription}",
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
        "name": "Bentian ERP Bridge - ${city.name}",
        "operatingSystem": "Windows 10, Windows 11, Windows Server",
        "applicationCategory": "BusinessApplication",
        "softwareVersion": "${currentVersion}",
        "downloadUrl": "https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe",
        "image": "https://bridge.cristianjm.com/assets/og-preview.png",
        "brand": {
          "@type": "Brand",
          "name": "Bentian"
        },
        "sku": "BENTIAN-ERP-BRIDGE-ANNUAL",
        "mpn": "EB-037",
        "offers": {
          "@type": "Offer",
          "price": "199.00",
          "priceCurrency": "EUR",
          "priceValidUntil": "2027-12-31",
          "url": "https://bridge.cristianjm.com/#pricing",
          "availability": "https://schema.org/InStock",
          "seller": {
            "@type": "Organization",
            "name": "Bentian"
          },
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": {
              "@type": "MonetaryAmount",
              "value": "0.00",
              "currency": "EUR"
            },
            "shippingDestination": {
              "@type": "DefinedRegion",
              "addressCountry": "ES"
            },
            "deliveryTime": {
              "@type": "ShippingDeliveryTime",
              "handlingTime": {
                "@type": "QuantitativeValue",
                "minValue": 0,
                "maxValue": 0,
                "unitCode": "DAY"
              },
              "transitTime": {
                "@type": "QuantitativeValue",
                "minValue": 0,
                "maxValue": 0,
                "unitCode": "DAY"
              }
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

${renderHeader(currentVersion)}

  <main>
    <!-- Breadcrumbs -->
    <nav class="border-b border-white/[0.08] bg-[#09090b] text-xs py-3 px-6" aria-label="Breadcrumb">
      <div class="max-w-5xl mx-auto flex items-center gap-2 text-zinc-500">
        <a href="/" class="hover:text-zinc-300 transition">Inicio</a>
        <span>/</span>
        <a href="/conector-factusol/" class="hover:text-zinc-300 transition">Conectores Factusol</a>
        <span>/</span>
        <span class="text-zinc-300 font-medium">${city.name}</span>
      </div>
    </nav>

    <!-- Hero Localizado -->
    <section class="py-16 md:py-24 px-6 border-b border-white/[0.08] relative overflow-hidden bg-[#09090b]">
      <div class="max-w-4xl mx-auto text-center relative z-10">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-6">
          <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
          Conector Factusol • ${city.name} (${city.province})
        </div>
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
          Sincroniza Factusol con tu Tienda Online en <span class="text-indigo-400">${city.name}</span>
        </h1>
        <p class="text-base sm:text-lg text-zinc-400 mb-8 max-w-2xl mx-auto leading-relaxed">
          ${city.heroSubtitle}
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
            Descargar Agente Windows (.exe)
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </a>
          <a href="/beta/" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#121215] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] transition text-center font-medium">
            Ver Condiciones de la Beta Gratuita
          </a>
        </div>
        <p class="mt-4 text-xs text-zinc-500 font-mono">Release oficial <span data-app-version>v${currentVersion}</span> para Windows x64 • Compatible Factusol 2018-2026</p>
      </div>
    </section>

    <!-- Contexto Industrial y Logístico Local -->
    <section class="py-16 md:py-20 px-6 border-b border-white/[0.08] bg-[#09090b]">
      <div class="max-w-5xl mx-auto">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <h2 class="text-2xl md:text-3xl font-bold text-white mb-4">Integración adaptada a las empresas de ${city.name}</h2>
          <p class="text-sm text-zinc-400 leading-relaxed">
            ${city.localContextParagraph}
          </p>
        </div>

        <div class="mb-14">
          <h3 class="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-6 text-center">Polígonos y Áreas de Distribución Principales</h3>
          <div class="grid md:grid-cols-3 gap-6">
            ${hubsHtml}
          </div>
        </div>

        <div>
          <h3 class="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-4 text-center">Sectores Empresariales con Mayor Adopción</h3>
          <div class="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            ${sectorsHtml}
          </div>
        </div>
      </div>
    </section>

    <!-- Cómo Funciona (Arquitectura Local-First) -->
    <section class="py-16 md:py-20 px-6 border-b border-white/[0.08] bg-[#09090b]">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-white text-center mb-4">Arquitectura Local-First: Máxima Privacidad y Cero Caídas</h2>
        <p class="text-sm text-zinc-400 text-center max-w-2xl mx-auto mb-12">
          A diferencia de los conectores que exigen subir tu base de datos contable a servidores de terceros, Bentian se ejecuta en tu propio ordenador en ${city.name}.
        </p>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold mb-4">1</div>
            <h3 class="text-base font-semibold text-white mb-2">Lectura Directa Factusol</h3>
            <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed">El agente se conecta directamente al archivo .accdb o .mdb mediante OLEDB en menos de 100 ms. Cero lentitud.</p>
          </div>
          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold mb-4">2</div>
            <h3 class="text-base font-semibold text-white mb-2">Detección Inteligente de Stock</h3>
            <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed">Calcula el stock disponible real (DISSTO) excluyendo mercancía reservada o pendiente de servir para evitar sobreventas.</p>
          </div>
          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold mb-4">3</div>
            <h3 class="text-base font-semibold text-white mb-2">Buffer Store-and-Forward</h3>
            <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed">Si la conexión de internet de tu nave o polígono sufre cortes, los pedidos se retienen y se vuelcan automáticamente al volver la red.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQs Locales -->
    <section class="py-16 md:py-20 px-6 border-b border-white/[0.08] bg-[#09090b]">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-white text-center mb-10">Preguntas Frecuentes en ${city.name}</h2>
        <div class="space-y-4">
          ${faqsHtml}
        </div>
      </div>
    </section>

    <!-- CTA Final -->
    <section class="py-16 md:py-20 px-6 text-center bg-[#09090b]">
      <div class="max-w-3xl mx-auto rounded-2xl bg-[#121215] border border-white/[0.08] p-8 sm:p-12 text-center">
        <h2 class="text-2xl md:text-4xl font-bold text-white mb-4">Empieza a sincronizar tu Factusol en ${city.name} hoy</h2>
        <p class="text-sm text-zinc-400 mb-8 max-w-xl mx-auto">
          Prueba la Beta Pública sin tarjeta de crédito. Instalación limpia en Windows en menos de 2 minutos.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-600/20 flex items-center gap-2">
            <span>Descargar Bentian Agent (.exe)</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </a>
          <a href="/beta/" class="px-6 py-3.5 rounded-xl bg-[#18181b] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] transition font-medium">
            Más información de la Beta
          </a>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer con Hub de Ciudades -->
  <footer class="border-t border-white/[0.08] py-12 px-6 bg-[#09090b] text-xs text-zinc-500">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
      <p>&copy; 2026 Bentian ERP Bridge. Solución especializada en Factusol para España.</p>
      <div class="flex flex-wrap items-center gap-4">
        <a href="/conector-factusol/madrid/" class="hover:text-zinc-300 transition">Madrid</a>
        <span>&bull;</span>
        <a href="/conector-factusol/barcelona/" class="hover:text-zinc-300 transition">Barcelona</a>
        <span>&bull;</span>
        <a href="/conector-factusol/valencia/" class="hover:text-zinc-300 transition">Valencia</a>
        <span>&bull;</span>
        <a href="/conector-factusol/" class="hover:text-white transition font-medium text-zinc-400">Ver las 51 ciudades</a>
        <span>&bull;</span>
        <a href="/seguridad/" class="hover:text-zinc-300 transition">Seguridad Local-First</a>
        <span>&bull;</span>
        <a href="/quien-esta-detras/" class="hover:text-zinc-300 transition">Quién está detrás</a>
        <span>&bull;</span>
        <a href="/requisitos-sistema/" class="hover:text-zinc-300 transition">Requisitos del Sistema</a>
      </div>
    </div>
  </footer>

  <script src="/js/version-sync.js"></script>
</body>
</html>`;
}

function getCitySvgCoordinates(c: CityData): { x: number; y: number } {
  if (c.slug === 'santa-cruz-de-tenerife') return { x: 75, y: 535 };
  if (c.slug === 'las-palmas') return { x: 135, y: 545 };
  const x = Math.round(65 + ((c.coordinates.lng - (-9.5)) / 14.0) * 735);
  const y = Math.round(45 + ((44.0 - c.coordinates.lat) / 8.2) * 475);
  return { x, y };
}

function renderHubPage(cities: CityData[], currentVersion: string): string {
  // Conteo y ordenación de regiones
  const regionsMap = new Map<string, number>();
  for (const c of cities) {
    regionsMap.set(c.region, (regionsMap.get(c.region) || 0) + 1);
  }
  const sortedRegions = Array.from(regionsMap.entries()).sort((a, b) => b[1] - a[1]);

  const filterChipsHtml = `
    <button type="button" class="filter-chip active px-3.5 py-1.5 rounded-full text-xs font-medium transition bg-indigo-600 text-white shadow-sm hover:bg-indigo-500" data-region="all">
      Todas (${cities.length})
    </button>
  ` + sortedRegions.map(([reg, count]) => `
    <button type="button" class="filter-chip px-3.5 py-1.5 rounded-full text-xs font-medium transition bg-[#18181b] text-zinc-400 hover:text-white border border-white/[0.06] hover:border-zinc-700" data-region="${reg.toLowerCase()}">
      ${reg} (${count})
    </button>
  `).join('\n');

  // Pines SVG
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

  // Tarjetas de ciudades
  const cardsHtml = cities
    .map(
      (c) => `
        <a href="/conector-factusol/${c.slug}/" 
           class="city-card p-6 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-zinc-900/60 transition-all flex flex-col justify-between group"
           data-name="${c.name.toLowerCase()}" 
           data-province="${c.province.toLowerCase()}" 
           data-region="${c.region.toLowerCase()}" 
           data-slug="${c.slug}">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">${c.province}</span>
              <span class="text-xs text-zinc-500 font-mono">${c.region}</span>
            </div>
            <h3 class="text-lg font-bold text-white group-hover:text-indigo-300 transition mb-2">${c.name}</h3>
            <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">${c.tagline}</p>
          </div>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
            Ver cobertura y polígonos <span>&rarr;</span>
          </div>
        </a>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es" class="h-full bg-[#09090b] text-[#f4f4f5] antialiased scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mapa de Cobertura Nacional y Conector Factusol por Ciudades | Bentian ERP Bridge</title>
  <meta name="description" content="Mapa interactivo y cobertura provincial de Bentian ERP Bridge en España. Conecta tu Factusol local con WooCommerce y PrestaShop en 52 áreas industriales y polígonos del país.">
  <link rel="canonical" href="https://bridge.cristianjm.com/conector-factusol/">

  <meta property="og:locale" content="es_ES">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bridge.cristianjm.com/conector-factusol/">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="Mapa de Cobertura Nacional y Conector Factusol por Ciudades | Bentian ERP Bridge">
  <meta property="og:description" content="Mapa interactivo de sincronización en tiempo real entre Factusol y eCommerce en las principales áreas industriales de España.">
  <meta property="og:image" content="https://bridge.cristianjm.com/assets/og-preview.png">

  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">
  <link rel="apple-touch-icon" href="/assets/icon.png">

  <!-- Tipografía Oficial: Inter + JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

  <!-- TailwindCSS y Config -->
  <link rel="stylesheet" href="/css/styles.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/js/tailwind.config.js"></script>

  <!-- Metadatos de Web App -->
  <meta name="theme-color" content="#09090b">
  <meta name="application-name" content="Bentian ERP Bridge">
  <link rel="manifest" href="/manifest.json">
</head>
<body class="bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-indigo-500/30 font-sans min-h-screen flex flex-col justify-between">

${renderHeader(currentVersion)}

  <main class="py-12 md:py-20 px-4 sm:px-6 flex-1 bg-[#09090b]">
    <div class="max-w-6xl mx-auto">
      
      <!-- Encabezado Hero -->
      <div class="text-center max-w-3xl mx-auto mb-12">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          RED DE COBERTURA NACIONAL (52 ÁREAS INDUSTRIALES)
        </div>
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
          Mapa de Cobertura Factusol en España
        </h1>
        <p class="text-base sm:text-lg text-zinc-400 leading-relaxed">
          Diseñado para pymes, distribuidores y mayoristas con base de datos Factusol local en cualquier provincia. Haz clic en el mapa o busca tu ciudad para consultar polígonos industriales y conectividad.
        </p>
      </div>

      <!-- MAPA INTERACTIVO DE ESPAÑA -->
      <div class="mb-14 rounded-3xl bg-[#121215] border border-white/[0.08] p-4 sm:p-8 relative shadow-2xl overflow-hidden" id="map-container">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.06]">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-ping"></div>
            <span class="text-xs font-semibold text-white uppercase tracking-wider font-mono">Mapa Peninsular e Insular</span>
            <span class="text-xs text-zinc-500">Pasa el ratón o pulsa sobre un nodo para explorar</span>
          </div>
          <div class="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> 52 Nodos Locales</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> 100% OLEDB Local</span>
          </div>
        </div>

        <!-- SVG Map Graphic -->
        <div class="relative w-full aspect-[920/620] max-h-[580px] flex items-center justify-center">
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

            <!-- Grid Radar Background -->
            <circle cx="430" cy="280" r="280" fill="url(#radar-glow)" />
            <circle cx="430" cy="280" r="180" fill="none" stroke="#27272a" stroke-dasharray="3 6" stroke-width="1" />
            <circle cx="430" cy="280" r="280" fill="none" stroke="#27272a" stroke-dasharray="4 8" stroke-width="1" />

            <!-- Silueta estilizada Península Ibérica -->
            <path d="M 115,75 L 170,55 L 280,50 L 390,60 L 460,75 L 530,95 L 610,135 L 690,165 L 735,160 L 730,195 L 685,250 L 650,290 L 590,340 L 570,390 L 530,440 L 470,470 L 390,500 L 310,510 L 250,500 L 230,480 L 190,440 L 175,380 L 155,320 L 140,250 L 130,180 L 115,130 Z" 
                  fill="url(#spain-bg)" stroke="#3f3f46" stroke-width="1.8" />

            <!-- Frontera Portugal estilizada -->
            <path d="M 190,440 L 175,380 L 155,320 L 140,250 L 130,180 L 175,180 L 210,240 L 230,320 L 250,400 L 230,480" 
                  fill="none" stroke="#27272a" stroke-dasharray="4 4" stroke-width="1.5" />
            <text x="180" y="310" class="text-[10px] fill-zinc-600 font-mono tracking-widest pointer-events-none select-none">PORTUGAL</text>

            <!-- Islas Baleares -->
            <!-- Mallorca -->
            <path d="M 680,270 L 710,260 L 720,280 L 690,295 Z" fill="#18181b" stroke="#3f3f46" stroke-width="1.5" />
            <!-- Menorca -->
            <path d="M 730,245 L 750,240 L 745,255 L 730,255 Z" fill="#18181b" stroke="#3f3f46" stroke-width="1.5" />
            <!-- Ibiza / Formentera -->
            <path d="M 645,305 L 660,295 L 665,315 L 650,320 Z" fill="#18181b" stroke="#3f3f46" stroke-width="1.5" />

            <!-- Inset Islas Canarias -->
            <g transform="translate(25, 450)">
              <rect width="185" height="135" rx="14" fill="#0d0d10" stroke="#27272a" stroke-width="1.5" />
              <text x="16" y="24" class="text-[10px] font-mono fill-zinc-400 font-semibold tracking-wider uppercase">Islas Canarias</text>
              <ellipse cx="75" cy="85" rx="18" ry="12" fill="#18181b" stroke="#3f3f46" stroke-width="1.2" />
              <ellipse cx="135" cy="95" rx="16" ry="14" fill="#18181b" stroke="#3f3f46" stroke-width="1.2" />
            </g>

            <!-- Pines de Ciudades -->
            ${pinsHtml}
          </svg>

          <!-- Floating Tooltip Card -->
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
      <div class="mb-10 space-y-6">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <!-- Input Buscador -->
          <div class="relative w-full md:max-w-md">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
            <input type="text" id="city-search" placeholder="Busca por ciudad, provincia o polígono..." class="w-full pl-10 pr-10 py-3 bg-[#121215] border border-white/[0.08] focus:border-indigo-500 focus:outline-none rounded-xl text-sm text-white placeholder-zinc-500 transition">
            <button id="search-clear" class="hidden absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-white transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <!-- Contador de Resultados -->
          <div id="visible-count" class="text-xs font-mono text-zinc-400">
            ${cities.length} ciudades disponibles
          </div>
        </div>

        <!-- Filtros por Comunidad Autónoma -->
        <div class="flex flex-wrap items-center gap-2 pt-2">
          ${filterChipsHtml}
        </div>
      </div>

      <!-- LISTADO DE CIUDADES EN GRID -->
      <div id="cities-grid" class="grid md:grid-cols-3 gap-6">
        ${cardsHtml}
      </div>

    </div>
  </main>

  <footer class="border-t border-white/[0.08] py-8 text-center text-xs text-zinc-500 bg-[#09090b]">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-6">
      <p>&copy; 2026 Bentian ERP Bridge. Conexión nativa Factusol para España.</p>
      <div class="flex items-center gap-4 text-zinc-400">
        <a href="/" class="hover:text-white transition">Inicio</a>
        <a href="/factusol-woocommerce/" class="hover:text-white transition">Factusol WooCommerce</a>
        <a href="/docs/" class="hover:text-white transition">Documentación</a>
      </div>
    </div>
  </footer>

  <script>
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('city-search');
    const clearBtn = document.getElementById('search-clear');
    const chips = document.querySelectorAll('.filter-chip');
    const cards = document.querySelectorAll('.city-card');
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

    // Pins Tooltip & Navegación
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

    // Buscador
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

    // Chips
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
</body>
</html>`;
}

function updateSitemap(cities: CityData[]) {
  if (!fs.existsSync(SITEMAP_FILE)) {
    console.warn(`[cities] Sitemap no encontrado en ${SITEMAP_FILE}`);
    return;
  }

  let sitemap = fs.readFileSync(SITEMAP_FILE, 'utf8');

  // Asegurar entrada del Hub central
  const hubUrl = 'https://bridge.cristianjm.com/conector-factusol/';
  if (!sitemap.includes(hubUrl)) {
    const hubEntry = `
  <!-- Hub Nacional: Conector Factusol por Ciudades -->
  <url>
    <loc>${hubUrl}</loc>
    <lastmod>2026-10-04T09:30:00+02:00</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es-ES" href="${hubUrl}" />
    <xhtml:link rel="alternate" hreflang="es" href="${hubUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${hubUrl}" />
  </url>
`;
    sitemap = sitemap.replace('</urlset>', `${hubEntry}</urlset>`);
  }

  // Asegurar cada ciudad
  for (const c of cities) {
    const cityUrl = `https://bridge.cristianjm.com/conector-factusol/${c.slug}/`;
    if (!sitemap.includes(cityUrl)) {
      const cityEntry = `
  <!-- Conector Factusol: ${c.name} (${c.province}) -->
  <url>
    <loc>${cityUrl}</loc>
    <lastmod>2026-10-04T09:30:00+02:00</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es-ES" href="${cityUrl}" />
    <xhtml:link rel="alternate" hreflang="es" href="${cityUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${cityUrl}" />
  </url>
`;
      sitemap = sitemap.replace('</urlset>', `${cityEntry}</urlset>`);
    }
  }

  fs.writeFileSync(SITEMAP_FILE, sitemap, 'utf8');
  console.log(`✓ [sitemap] Sitemap actualizado con URLs de ciudades`);
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

  // 1. Generar páginas de cada ciudad
  for (const city of cities) {
    const cityDir = path.join(CITIES_OUTPUT_ROOT, city.slug);
    if (!fs.existsSync(cityDir)) {
      fs.mkdirSync(cityDir, { recursive: true });
    }
    const html = renderCityPage(city, currentVersion);
    const outFile = path.join(cityDir, 'index.html');
    fs.writeFileSync(outFile, html, 'utf8');
    console.log(`✓ [cities] Generada página para ${city.name} -> ${outFile}`);
  }

  // 2. Generar Hub central
  const hubHtml = renderHubPage(cities, currentVersion);
  const hubFile = path.join(CITIES_OUTPUT_ROOT, 'index.html');
  fs.writeFileSync(hubFile, hubHtml, 'utf8');
  console.log(`✓ [cities] Generado Hub central nacional -> ${hubFile}`);

  // 3. Actualizar sitemap.xml
  updateSitemap(cities);

  console.log(`[cities] Generación completada con éxito. ${cities.length} ciudades generadas.`);
}

if (require.main === module) {
  generateCityPages();
}
