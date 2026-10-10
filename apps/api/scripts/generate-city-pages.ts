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
  <header class="border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <!-- Marca Desacoplada -->
      <a href="/" class="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center border border-white/[0.12] p-1 bg-zinc-900 group-hover:border-indigo-500/50 transition">
          <img src="/assets/icon.svg" alt="Bentian Logo" class="w-full h-full object-contain" width="32" height="32">
        </div>
        <div class="flex items-baseline gap-2">
          <span class="font-bold text-base tracking-tight text-white">Bentian</span>
          <span class="text-[11px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-900 border border-white/[0.06] px-2 py-0.5 rounded">ERP Bridge</span>
        </div>
      </a>

      <!-- Navegación alineada a la derecha -->
      <nav class="flex items-center gap-3 sm:gap-6 text-xs font-medium">
        <a href="/" class="text-zinc-400 hover:text-white transition flex items-center gap-1.5">
          <span>&larr; Web Principal</span>
        </a>
        <a href="/docs/" class="text-zinc-400 hover:text-white transition hidden md:inline">Docs</a>
        <a href="/conector-factusol/" class="text-zinc-400 hover:text-white transition hidden sm:inline">Ciudades</a>
        <a href="/dashboard/" class="text-zinc-400 hover:text-white transition hidden lg:inline">Clientes</a>
        <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition flex items-center gap-1.5 whitespace-nowrap">
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
        <a href="/conector-factusol/" class="hover:text-white transition font-medium text-zinc-400">Ver todas las ciudades</a>
      </div>
    </div>
  </footer>

  <script src="/js/version-sync.js"></script>
</body>
</html>`;
}

function renderHubPage(cities: CityData[], currentVersion: string): string {
  const cardsHtml = cities
    .map(
      (c) => `
        <a href="/conector-factusol/${c.slug}/" class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-zinc-900/60 transition flex flex-col justify-between group">
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
  <title>Conector Factusol por Ciudades y Provincias de España | Bentian ERP Bridge</title>
  <meta name="description" content="Cobertura regional de Bentian ERP Bridge en España. Conecta tu Factusol local con WooCommerce y PrestaShop en las principales áreas industriales y comerciales del país.">
  <link rel="canonical" href="https://bridge.cristianjm.com/conector-factusol/">

  <meta property="og:locale" content="es_ES">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bridge.cristianjm.com/conector-factusol/">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="Conector Factusol por Ciudades y Provincias de España | Bentian ERP Bridge">
  <meta property="og:description" content="Sincronización en tiempo real entre Factusol y eCommerce en las principales áreas industriales de España.">
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

  <main class="py-16 md:py-24 px-6 flex-1 bg-[#09090b]">
    <div class="max-w-5xl mx-auto">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-6">
          RED DE COBERTURA NACIONAL
        </div>
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
          Conector Factusol en las Principales Áreas Industriales de España
        </h1>
        <p class="text-base sm:text-lg text-zinc-400 leading-relaxed">
          Diseñado para pymes, distribuidores y comercios con base de datos Factusol local en cualquier provincia. Selecciona tu ciudad para conocer polígonos compatibles y especificaciones.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        ${cardsHtml}
      </div>
    </div>
  </main>

  <footer class="border-t border-white/[0.08] py-8 text-center text-xs text-zinc-500 bg-[#09090b]">
    <p>&copy; 2026 Bentian ERP Bridge. Conexión nativa Factusol para España.</p>
  </footer>

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
