import * as fs from 'fs';
import * as path from 'path';
import { getCanonicalVersion } from './build-landing';

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const VA_DIR = path.join(PUBLIC_DIR, 'va');
const VA_FITXA_DIR = path.join(VA_DIR, 'fitxa-tecnica');

export function renderValencianoLanding(currentVersion: string): string {
  return `<!DOCTYPE html>
<html lang="ca-valencia" class="h-full bg-[#09090b] text-[#f4f4f5] antialiased scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connector Factusol WooCommerce &amp; PrestaShop — Bentian ERP Bridge</title>
  <meta name="description" content="Connector i sincronitzador bidireccional en temps real entre Factusol ERP i botigues online (WooCommerce, PrestaShop). Control autònom de catàleg, estoc disponible, tarifes, comandes i facturació sense exposar la base de dades a internet.">
  <meta name="keywords" content="connector factusol woocommerce, sincronitzar factusol woocommerce, connector factusol prestashop, integracio factusol valencia, sincronitzacio estoc factusol, comandes factusol woocommerce, recarrec equivalencia woocommerce">
  <meta name="author" content="Bentian">
  <link rel="canonical" href="https://bridge.cristianjm.com/va/">

  <!-- Favicon i Branding Oficial -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">
  <link rel="apple-touch-icon" href="/assets/icon.png">

  <!-- Directives d'Indexació i Rastrejament -->
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">

  <!-- Metadades de Geolocalització (Comunitat Valenciana & Espanya) -->
  <meta name="geo.region" content="ES-VC">
  <meta name="geo.placename" content="Comunitat Valenciana">
  <meta name="geo.position" content="39.4699;-0.3763">
  <meta name="ICBM" content="39.4699, -0.3763">
  <link rel="alternate" hreflang="es-ES" href="https://bridge.cristianjm.com/">
  <link rel="alternate" hreflang="es" href="https://bridge.cristianjm.com/">
  <link rel="alternate" hreflang="ca-ES" href="https://bridge.cristianjm.com/va/">
  <link rel="alternate" hreflang="ca" href="https://bridge.cristianjm.com/va/">
  <link rel="alternate" hreflang="x-default" href="https://bridge.cristianjm.com/">

  <!-- Open Graph / Xarxes Socials -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bridge.cristianjm.com/va/">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="Connector Factusol WooCommerce &amp; PrestaShop — Bentian ERP Bridge">
  <meta property="og:description" content="Sincronització autònoma en temps real entre Factusol ERP i la teua botiga online. Arquitectura Local-First, Zero-Knowledge i sense obrir ports al router.">
  <meta property="og:locale" content="ca_ES">
  <meta property="og:image" content="https://bridge.cristianjm.com/assets/og-preview.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://bridge.cristianjm.com/va/">
  <meta name="twitter:title" content="Connector Factusol WooCommerce &amp; PrestaShop — Bentian ERP Bridge">
  <meta name="twitter:description" content="Els teus sistemes empresarials treballant junts. Connecta Factusol amb WooCommerce de manera local, en temps real i segura.">
  <meta name="twitter:image" content="https://bridge.cristianjm.com/assets/og-preview.png">

  <!-- Tipografia Oficial -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

  <!-- Tailwind CSS CDN & Configuració Externa -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/js/tailwind.config.js"></script>
  <link rel="stylesheet" href="/css/styles.css">

  <!-- Schema.org JSON-LD en Valencià -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Bentian ERP Bridge",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Windows 10, Windows 11, Windows Server (x64)",
        "softwareVersion": "${currentVersion}",
        "inLanguage": ["ca", "es"],
        "description": "Connector i sincronitzador bidireccional en temps real entre programari de gestió ERP (Factusol, SimplyGest, Ágora, Odoo) i botigues en línia (WooCommerce, PrestaShop).",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
          "description": "Beta Oberta d'Accés Gratuït fins al 31 de desembre de 2026",
          "url": "https://bridge.cristianjm.com/va/"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Bentian",
          "url": "https://bridge.cristianjm.com"
        }
      }
    ]
  }
  </script>
</head>
<body class="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-indigo-500/30">

  <!-- 0. BARRA D'ANUNCIS BETA -->
  <div id="beta-announcement-bar" class="relative bg-zinc-900 border-b border-indigo-500/20 px-4 py-2.5 sm:px-8 lg:px-12 flex items-center justify-center transition-all duration-300">
    <div class="text-xs sm:text-sm font-medium text-zinc-300 flex items-center gap-2.5 flex-wrap justify-center text-center">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[11px] font-semibold tracking-wide uppercase text-indigo-300">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        Beta Oberta
      </span>
      <span>Accés complet gratuït per a totes les empreses fins al 31 de desembre.</span>
      <a href="/beta/" class="inline-flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-xs px-3 py-1 rounded-md transition shadow-sm ml-1">
        Sol·licitar Clau Gratuïta <span aria-hidden="true">&rarr;</span>
      </a>
    </div>
  </div>

  <!-- 1. CAPÇALERA I NAVEGACIÓ -->
  <header class="sticky top-0 z-50 border-b border-white/[0.08] bg-[#09090b]/85 backdrop-blur-md">
    <div class="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 h-20 flex items-center justify-between">
      
      <!-- Marca Principal -->
      <a href="/va/" class="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl py-1.5 px-2 hover:bg-white/[0.03] transition shrink-0">
        <img src="/assets/icon.svg" alt="Bentian Logo" class="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 group-hover:scale-105 transition-transform" width="36" height="36">
        <span class="font-bold text-lg sm:text-xl tracking-tight text-white group-hover:text-indigo-200 transition" data-brand-name>Bentian</span>
      </a>

      <!-- Menú en Valencià -->
      <nav class="hidden lg:flex items-center gap-4 xl:gap-6 2xl:gap-8 text-xs xl:text-[13px] 2xl:text-sm text-zinc-400 font-medium shrink-0">
        <a href="#salvaguardes" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition whitespace-nowrap shrink-0">Salvaguardes</a>
        <a href="#com-funciona" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition whitespace-nowrap shrink-0">Com Funciona</a>
        <a href="#connectors" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition whitespace-nowrap shrink-0">Connectors</a>
        <a href="#seguretat" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition whitespace-nowrap shrink-0">Seguretat</a>
        <a href="/va/fitxa-tecnica/" class="px-2.5 py-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-500/10 transition flex items-center gap-1 whitespace-nowrap shrink-0 font-semibold">
          <span>🏛️ Fitxa Oficial</span>
        </a>
        <a href="/casos-de-exito/suministros-rubio/" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span>Casos d'Èxit</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
        </a>
        <a href="#tarifes" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition whitespace-nowrap shrink-0">Tarifes</a>
        <a href="/partners/" class="px-2.5 py-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-500/10 transition flex items-center gap-1 whitespace-nowrap shrink-0">
          <span>Partners</span>
          <span class="text-[10px] font-mono bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 px-1.5 py-0.2 rounded">30%</span>
        </a>
        <a href="#faq" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition whitespace-nowrap shrink-0">FAQ</a>
      </nav>

      <!-- Botons d'Acció i Selector d'Idioma -->
      <div class="flex items-center gap-2.5 sm:gap-4 shrink-0 pl-3 sm:pl-6 lg:pl-8 border-l border-white/[0.1]">
        
        <!-- Selector d'Idioma (ES | VA | FR) -->
        <div class="relative inline-block text-left" id="lang-selector-container">
          <button type="button" id="lang-menu-btn" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#121215] hover:bg-[#18181c] text-xs font-medium text-zinc-300 hover:text-white transition focus:outline-none focus:ring-1 focus:ring-indigo-500" aria-expanded="false" aria-haspopup="true" aria-label="Seleccionar idioma">
            <svg class="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
            <span id="current-lang-text" class="font-semibold text-indigo-300 tracking-wider">VA</span>
            <svg id="lang-chevron-icon" class="w-3 h-3 text-zinc-400 transition-transform duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          
          <div id="lang-menu-dropdown" class="hidden absolute right-0 mt-2 w-44 rounded-xl border border-white/[0.12] bg-[#121215]/95 backdrop-blur-md shadow-2xl py-1.5 z-50 text-xs">
            <a href="/" id="lang-link-es" class="flex items-center justify-between px-3 py-2 text-zinc-200 hover:bg-white/[0.08] hover:text-white transition font-medium">
              <span class="flex items-center gap-2"><span>🇪🇸</span> Castellano</span>
              <span class="text-[10px] text-zinc-400 font-mono font-semibold">ES</span>
            </a>
            <a href="/va/" id="lang-link-va" class="flex items-center justify-between px-3 py-2 text-indigo-300 bg-white/[0.05] hover:bg-white/[0.08] hover:text-white transition font-medium">
              <span class="flex items-center gap-2"><span>🦇</span> Valencià</span>
              <span class="text-[10px] text-indigo-400 font-mono font-semibold">VA</span>
            </a>
            <div class="my-1 border-t border-white/[0.06]"></div>
            <div class="flex items-center justify-between px-3 py-2 text-zinc-500 opacity-60 cursor-not-allowed select-none" title="Français (bientôt disponible)">
              <span class="flex items-center gap-2"><span>🇫🇷</span> Français</span>
              <span class="text-[9px] bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded font-mono">Próx</span>
            </div>
          </div>
        </div>

        <a href="/docs/" class="text-xs sm:text-[13px] font-medium text-zinc-300 hover:text-white px-3 sm:px-3.5 py-2 rounded-lg hover:bg-white/[0.06] transition flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          <span class="inline">Docs</span>
        </a>
        <a href="/dashboard" class="text-xs sm:text-[13px] font-medium text-zinc-300 hover:text-white px-3.5 sm:px-4 py-2 rounded-lg border border-white/[0.1] hover:border-white/[0.22] bg-[#121215] hover:bg-[#18181c] transition hidden sm:flex items-center gap-2 whitespace-nowrap shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
          Accés Clients
        </a>
        <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="text-xs sm:text-[13px] font-semibold px-4.5 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm hover:shadow-indigo-500/25 whitespace-nowrap shrink-0">
          Descarregar Agent
        </a>
      </div>
    </div>
  </header>

  <!-- 2. HERO PRINCIPAL EN VALENCIÀ -->
  <main class="flex-1">
    <section class="relative pt-20 pb-16 px-6 overflow-hidden">
      <div class="max-w-6xl mx-auto">
        
        <!-- Insígnia de Versió i Certificació -->
        <div class="flex items-center gap-3 mb-8 flex-wrap">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#121215] border border-white/[0.1] text-xs font-mono text-zinc-300">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Versió Oficial <span data-app-version>v${currentVersion}</span> per a Windows x64</span>
          </div>
          <a href="/va/fitxa-tecnica/" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 hover:border-indigo-400 text-xs font-medium transition">
            <span>🏛️ Fitxa Oficial per a Organismes Valencians</span>
            <span>&rarr;</span>
          </a>
        </div>

        <!-- Títol Principal d'Alt Impacte -->
        <h1 class="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-4xl">
          Connector Factusol WooCommerce.<br/>
          <span class="text-zinc-400 font-normal">Sincronització autònoma en temps real.</span>
        </h1>

        <!-- Descripció en Valencià Normatiu -->
        <p class="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Connecta el teu programari de gestió local a Windows (Factusol, SimplyGest, Ágora POS, Sage 50, a3ERP) amb la teua botiga online a WooCommerce, PrestaShop o Shopify sense substituir el teu ERP ni obrir ports al router. Catàleg, estoc net disponible (DISSTO), tarifes professionals, comandes i facturació sincronitzats de forma autònoma sense exposar mai la teua base de dades a internet.
        </p>

        <!-- Chips d'ERPs Locals Suportats -->
        <div class="mt-5 flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400">
          <span class="text-zinc-500">ERPs Locals Compatibles:</span>
          <span class="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-medium">✓ Factusol</span>
          <span class="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-medium">✓ SimplyGest</span>
          <span class="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-medium">✓ Ágora POS</span>
          <span class="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-medium">✓ FacturaScripts</span>
          <span class="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-medium">✓ Odoo Community</span>
        </div>

        <!-- Botons de Descàrrega i Acció -->
        <div class="mt-10 flex flex-wrap items-center gap-4">
          <a id="btn-hero-download" data-download-installer href="/releases/latest/Bentian-Setup.exe" download="Bentian-Setup.exe"
             class="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2.5 transition shadow-lg shadow-indigo-600/20">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.801"/>
            </svg>
            <span>Descarregar Agent Windows (.exe)</span>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-black/25 text-zinc-200">Oficial x64</span>
          </a>

          <a id="btn-hero-beta" href="/beta/" class="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 transition shadow-lg shadow-emerald-600/25">
            <span>🎁 Sol·licitar Clau Beta Gratuïta</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>

          <a href="/va/fitxa-tecnica/" class="px-5 py-3 rounded-lg bg-[#121215] hover:bg-[#18181b] text-zinc-300 hover:text-white border border-white/[0.08] font-medium text-sm transition flex items-center gap-2">
            <span>Fitxa Tècnica per a Pimes</span>
            <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>

        <!-- Targetes de Garanties Operatives per al Teixit Valencià -->
        <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/[0.08]">
          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h3 class="text-base font-semibold text-white">Privacitat 100% Local-First</h3>
            <p class="mt-2 text-xs text-zinc-400 leading-relaxed">
              La base de dades del teu Factusol no s'allotja en núvols de tercers. L'agent s'executa al teu servidor o PC, garantint secret empresarial i compliment estricte del RGPD.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="text-base font-semibold text-white">Blindatge Anti-Sobrevendes</h3>
            <p class="mt-2 text-xs text-zinc-400 leading-relaxed">
              Calcula en menys de 100 ms l'estoc realment disponible (DISSTO), restant comandes pendents abans de publicar a WooCommerce. Evita vendre material reservat a la botiga física.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 class="text-base font-semibold text-white">0% Comissions per Venda</h3>
            <p class="mt-2 text-xs text-zinc-400 leading-relaxed">
              Sense peatges abusius ni tarifes fixes mensuals per cada referència sincronitzada. El teu catàleg i les teues comandes són completament teus sense límits artificials.
            </p>
          </div>
        </div>

      </div>
    </section>

    <!-- 3. SECCIÓ INSTITUCIONAL I HOMOLOGACIÓ COMUNITAT VALENCIANA -->
    <section class="py-16 px-6 bg-[#0c0d12] border-y border-white/[0.08]">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col lg:flex-row items-center justify-between gap-8 p-8 rounded-3xl bg-[#121215] border border-indigo-500/20 relative overflow-hidden">
          <div class="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <span>🏛️ Homologació i Programari a la Comunitat Valenciana</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Desenvolupat per a la Indústria, Distribució i Comerç Valencià
            </h2>
            <p class="mt-3 text-sm text-zinc-400 leading-relaxed">
              Des dels polígons industrials de València (Fuente del Jarro, Ribarroja, Almussafes) fins a la ceràmica de Castelló i el calçat i marroquineria d'Alacant i Elx. Bentian ERP Bridge compleix tots els criteris de seguretat, sobirania de dades i normativa lingüística requerits pels catàlegs de la Generalitat Valenciana (Softvalencià, IVACE i Acelera Pyme).
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 shrink-0">
            <a href="/va/fitxa-tecnica/" class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm text-center transition shadow-md">
              Consultar Fitxa Tècnica Oficial
            </a>
            <a href="/conector-factusol/valencia/" class="px-5 py-3 rounded-xl bg-[#18181c] hover:bg-[#202025] text-zinc-300 hover:text-white border border-white/[0.1] text-xs sm:text-sm text-center transition">
              Polígons de València &rarr;
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. COM FUNCIONA (EN VALENCIÀ) -->
    <section id="com-funciona" class="py-20 px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <h2 class="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-3">Desplegament en 3 Passos</h2>
          <p class="text-3xl sm:text-4xl font-bold text-white tracking-tight">Com connectar el teu Factusol amb WooCommerce</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="p-8 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-5">1</div>
            <h3 class="text-lg font-bold text-white mb-2">Instal·lació de l'Agent Local</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              Executa l'instal·lador oficial desatès al teu ordinador o servidor Windows. L'agent detecta automàticament la ruta de dades de Factusol o el servidor SQL local.
            </p>
          </div>

          <div class="p-8 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-5">2</div>
            <h3 class="text-lg font-bold text-white mb-2">Vinculació Segura amb WooCommerce</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              Introdueix les claus API REST de la teua botiga online mitjançant connexió HTTPS encriptada punt a punt. Sense tocar la configuració del teu encaminador (router).
            </p>
          </div>

          <div class="p-8 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-5">3</div>
            <h3 class="text-lg font-bold text-white mb-2">Sincronització en Segon Pla</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              El servei monitoritza l'estoc, les tarifes i importa noves comandes web automàticament cap a Factusol (F_PCL) amb desglossament d'IVA i recàrrec d'equivalència.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. PREGUNTES FREQÜENTS EN VALENCIÀ -->
    <section id="faq" class="py-20 px-6 bg-[#0c0d12] border-t border-white/[0.08]">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2">Dubtes Habituals</h2>
          <p class="text-3xl font-bold text-white tracking-tight">Preguntes Freqüents per a Pimes i Comerços</p>
        </div>

        <div class="space-y-4">
          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <h3 class="text-base font-semibold text-white">Com gestiona el Recàrrec d'Equivalència per al comerç detallista?</h3>
            <p class="mt-2 text-xs text-zinc-400 leading-relaxed">
              Bentian identifica automàticament la condició fiscal del client registrat a la botiga online. Quan s'importa la comanda cap a Factusol, s'apliquen els tipus impositius exactes d'IVA i de Recàrrec d'Equivalència (5,2%, 1,4% o 0,5%), registrant-se a les línies de comanda (F_PCL) amb exactitud matemàtica fins a l'últim cèntim.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <h3 class="text-base font-semibold text-white">Funciona si Factusol està en un servidor compartit o unitat de xarxa NAS?</h3>
            <p class="mt-2 text-xs text-zinc-400 leading-relaxed">
              Sí. Bentian compta amb blindatge anti-wiping per a rutes UNC de xarxa (<code class="text-indigo-300 font-mono">\\\\NAS_EMPRESA\\...</code>) i unitats mapejades (<code class="text-indigo-300 font-mono">Z:\\...</code>). Si la xarxa local pateix una desconnexió temporal, l'agent commuta a mode d'espera sense perdre la configuració i reprèn la sincronització en restablir-se la comunicació.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <h3 class="text-base font-semibold text-white">Cal obrir ports al router o tindre una adreça IP pública fixa?</h3>
            <p class="mt-2 text-xs text-zinc-400 leading-relaxed">
              No. L'agent efectua connexions salients segures directament cap a la botiga mitjançant el protocol HTTPS estàndard (port 443). La teua xarxa local i els teus servidors queden completament aïllats de qualsevol escaneig o atac extern d'internet.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
            <h3 class="text-base font-semibold text-white">Quins requisits exigeix la Generalitat Valenciana per a homologar el programari?</h3>
            <p class="mt-2 text-xs text-zinc-400 leading-relaxed">
              Disposar de versió i documentació en valencià, certificació d'absència de programari maliciós (Softpedia 100% Clean) i instal·lador directe accessible. Pots consultar la nostra <a href="/va/fitxa-tecnica/" class="text-indigo-400 underline font-medium">Fitxa Tècnica Oficial</a> amb totes les dades requerides per a la tramitació pública.
            </p>
          </div>
        </div>

      </div>
    </section>

    <!-- 6. CRIDA A L'ACCIÓ FINAL -->
    <section class="py-20 px-6 text-center">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-3xl sm:text-4xl font-bold text-white tracking-tight">Comença a sincronitzar el teu negoci en 2 minuts</h2>
        <p class="mt-4 text-sm text-zinc-400 leading-relaxed">
          Descarrega l'instal·lador oficial per a Windows o sol·licita la teua clau gratuïta de la Beta Oberta. Sense targeta de crèdit ni compromís.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/25">
            Descarregar Agent Oficial Windows
          </a>
          <a href="/beta/" class="px-6 py-3.5 rounded-xl bg-[#121215] hover:bg-[#18181c] text-white border border-white/[0.1] font-semibold text-sm transition">
            🎁 Sol·licitar Clau Beta Gratuïta
          </a>
        </div>
      </div>
    </section>
  </main>

  <!-- 7. PEU DE PÀGINA EN VALENCIÀ -->
  <footer class="border-t border-white/[0.08] bg-[#09090b] py-12 px-6 text-xs text-zinc-500">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-3">
        <img src="/assets/icon.svg" alt="Bentian Logo" class="w-6 h-6 object-contain" width="24" height="24">
        <span>&copy; ${new Date().getFullYear()} Bentian ERP Bridge. Tots els drets reservats.</span>
      </div>
      <div class="flex items-center gap-5 flex-wrap justify-center">
        <a href="/va/fitxa-tecnica/" class="text-indigo-400 hover:text-indigo-300 transition">Fitxa Tècnica Oficial</a>
        <a href="/docs/" class="hover:text-zinc-300 transition">Documentació</a>
        <a href="/casos-de-exito/suministros-rubio/" class="hover:text-zinc-300 transition">Casos d'Èxit</a>
        <a href="/conector-factusol/valencia/" class="hover:text-zinc-300 transition">València</a>
        <a href="/conector-factusol/alicante/" class="hover:text-zinc-300 transition">Alacant</a>
        <a href="/conector-factusol/castellon/" class="hover:text-zinc-300 transition">Castelló</a>
        <a href="/" class="text-zinc-400 hover:text-white transition">Versió en Castellà (ES)</a>
      </div>
    </div>
  </footer>

  <script src="/js/version-sync.js"></script>
  <script>
    // Selector d'idioma reactiu
    (function() {
      var btn = document.getElementById('lang-menu-btn');
      var menu = document.getElementById('lang-menu-dropdown');
      var icon = document.getElementById('lang-chevron-icon');
      if (!btn || !menu) return;

      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var isClosed = menu.classList.contains('hidden');
        if (isClosed) {
          menu.classList.remove('hidden');
          btn.setAttribute('aria-expanded', 'true');
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          menu.classList.add('hidden');
          btn.setAttribute('aria-expanded', 'false');
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      });

      document.addEventListener('click', function(e) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
          menu.classList.add('hidden');
          btn.setAttribute('aria-expanded', 'false');
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      });
    })();
  </script>
</body>
</html>`;
}

export function renderValencianoFitxaTecnica(currentVersion: string): string {
  return `<!DOCTYPE html>
<html lang="ca-valencia" class="h-full bg-[#09090b] text-[#f4f4f5] antialiased scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fitxa Tècnica i Dossier Oficial del Programari — Bentian ERP Bridge</title>
  <meta name="description" content="Fitxa tècnica oficial, homologació i especificacions de Bentian ERP Bridge per a la Comunitat Valenciana. Arquitectura local-first, seguretat Ed25519 i compliment RGPD.">
  <link rel="canonical" href="https://bridge.cristianjm.com/va/fitxa-tecnica/">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">

  <meta name="robots" content="index, follow">
  <link rel="alternate" hreflang="ca-ES" href="https://bridge.cristianjm.com/va/fitxa-tecnica/">
  <link rel="alternate" hreflang="ca" href="https://bridge.cristianjm.com/va/fitxa-tecnica/">
  <link rel="alternate" hreflang="es" href="https://bridge.cristianjm.com/">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/js/tailwind.config.js"></script>
  <link rel="stylesheet" href="/css/styles.css">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": "Fitxa Tècnica Oficial de Bentian ERP Bridge",
    "description": "Especificacions tècniques, requisits del sistema i arquitectura de seguretat de Bentian ERP Bridge.",
    "inLanguage": "ca-valencia",
    "version": "${currentVersion}",
    "author": {
      "@type": "Person",
      "name": "Cristian Jiménez Martínez"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Bentian ERP Bridge",
      "url": "https://bridge.cristianjm.com"
    }
  }
  </script>
</head>
<body class="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-indigo-500/30">

  <!-- Capçalera amb Navegació -->
  <header class="border-b border-white/[0.08] bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <a href="/va/" class="flex items-center gap-3">
        <img src="/assets/icon.svg" alt="Bentian Logo" class="w-7 h-7" width="28" height="28">
        <span class="font-bold text-white text-base">Bentian ERP Bridge</span>
        <span class="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Fitxa Oficial</span>
      </a>
      <div class="flex items-center gap-3 text-xs">
        <a href="/va/" class="text-zinc-400 hover:text-white transition">&larr; Tornar a la Web en Valencià</a>
        <a href="javascript:window.print()" class="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          <span>Imprimir / PDF</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Contingut de la Fitxa Tècnica -->
  <main class="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex-1">
    
    <!-- Encapçalament Institucional -->
    <div class="p-8 rounded-3xl bg-[#121215] border border-white/[0.1] mb-10">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6 mb-6">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-indigo-400">Dossier Tècnic d'Acreditació Institucional</span>
          <h1 class="text-2xl sm:text-3xl font-bold text-white mt-1">Bentian ERP Bridge — Fitxa Tècnica Oficial</h1>
          <p class="text-xs text-zinc-400 mt-1">Document homologat per a avaluació en catàlegs de programari, administracions públiques i pimes de la Comunitat Valenciana.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-3 py-1 rounded-md bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-mono text-xs font-semibold">
            Versió: v${currentVersion}
          </span>
          <span class="px-3 py-1 rounded-md bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold">
            Softpedia 100% Clean
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span class="text-zinc-500 block">Titular / Autor:</span>
          <span class="text-white font-medium">Cristian Jiménez Martínez</span>
        </div>
        <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span class="text-zinc-500 block">Categoria de Programari:</span>
          <span class="text-white font-medium">Integració ERP &amp; Comerç Electrònic</span>
        </div>
        <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span class="text-zinc-500 block">Idiomes de la Interfície:</span>
          <span class="text-white font-medium">Valencià, Castellà (i Francès)</span>
        </div>
        <div class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span class="text-zinc-500 block">Llicència del Programari:</span>
          <span class="text-white font-medium">Propietària (Accés Beta Lliure)</span>
        </div>
      </div>
    </div>

    <!-- Taula de Seccions de la Fitxa -->
    <div class="space-y-8 text-sm">
      
      <!-- Secció 1: Descripció Funcional -->
      <section class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-3">
          <span class="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs">1</span>
          Descripció Funcional i Resolució d'Ineficiències en la Pime
        </h2>
        <p class="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
          Bentian ERP Bridge és una passarel·la d'execució local (local-first) que automatitza el flux bidireccional de dades entre el programari de gestió comercial i comptable instal·lat a les empreses (com ara Factusol, SimplyGest, Ágora POS, FacturaScripts o Odoo) i els canals de venda digital (WooCommerce, PrestaShop i Shopify).
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <span class="font-semibold text-emerald-400 block mb-1">✓ Sincronització d'Estoc DISSTO:</span>
            Calcula automàticament l'estoc net restant les comandes pendents abans de pujar-lo a la web, evitant la sobreventa de referències.
          </div>
          <div class="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <span class="font-semibold text-emerald-400 block mb-1">✓ Ingesta de Comandes F_PCL:</span>
            Crea comandes de client directes a la base de dades amb desglossament automàtic d'IVA i Recàrrec d'Equivalència per al comerç minorista.
          </div>
        </div>
      </section>

      <!-- Secció 2: Especificacions Tècniques -->
      <section class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-3">
          <span class="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs">2</span>
          Especificacions Tècniques i Requisits de l'Entorn
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-white/[0.08] text-zinc-400">
                <th class="py-2.5 font-medium">Component</th>
                <th class="py-2.5 font-medium">Requisit Mínim</th>
                <th class="py-2.5 font-medium">Entorn Recomanat</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04] text-zinc-300">
              <tr>
                <td class="py-2 font-mono text-indigo-300">Sistema Operatiu</td>
                <td class="py-2">Windows 10 x64 / Windows 11</td>
                <td class="py-2">Windows 11 Pro o Windows Server 2019/2022</td>
              </tr>
              <tr>
                <td class="py-2 font-mono text-indigo-300">Arquitectura de CPU</td>
                <td class="py-2">x64 (Intel o AMD de 64 bits)</td>
                <td class="py-2">4 nuclis, suport de virtualització</td>
              </tr>
              <tr>
                <td class="py-2 font-mono text-indigo-300">Memòria RAM</td>
                <td class="py-2">4 GB RAM</td>
                <td class="py-2">8 GB RAM o superior</td>
              </tr>
              <tr>
                <td class="py-2 font-mono text-indigo-300">Espai en Disc</td>
                <td class="py-2">120 MB disponibles</td>
                <td class="py-2">Unitat d'estat sòlid (SSD)</td>
              </tr>
              <tr>
                <td class="py-2 font-mono text-indigo-300">Motors de Dades Locals</td>
                <td class="py-2">Access Database Engine (OLEDB), T-SQL</td>
                <td class="py-2">Microsoft SQL Server 2014-2022, Access 2016+</td>
              </tr>
              <tr>
                <td class="py-2 font-mono text-indigo-300">Xarxa i Ports</td>
                <td class="py-2">Port salint HTTPS 443 estàndard</td>
                <td class="py-2">Zero ports oberts al router d'entrada</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Secció 3: Seguretat Criptogràfica i Compliment RGPD -->
      <section class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-3">
          <span class="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs">3</span>
          Arquitectura de Seguretat Criptogràfica i Compliment RGPD (Local-First)
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 class="font-semibold text-white mb-1.5">Signatura Ed25519 (RFC 8032)</h3>
            <p class="text-zinc-400 leading-relaxed">
              Totes les actualitzacions i proves criptogràfiques de llicència es validen mitjançant claus asimètriques d'alta seguretat abans de qualsevol canvi en el sistema.
            </p>
          </div>
          <div class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 class="font-semibold text-white mb-1.5">Protecció Anti-TOCTOU</h3>
            <p class="text-zinc-400 leading-relaxed">
              El motor de substitució atòmica (UpdateSwapper) valida el hash SHA-256 en memòria des d'un entorn aïllat amb permisos restringits UAC de Windows.
            </p>
          </div>
          <div class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <h3 class="font-semibold text-white mb-1.5">Zero-Knowledge RGPD</h3>
            <p class="text-zinc-400 leading-relaxed">
              Cap dada fiscal, de facturació o de clients s'emmagatzema ni es reenvia a servidors aliens. La sobirania de la informació roman exclusivament en l'empresa.
            </p>
          </div>
        </div>
      </section>

      <!-- Secció 4: Enllaços Oficials de Descàrrega -->
      <section class="p-6 rounded-2xl bg-[#121215] border border-white/[0.08]">
        <h2 class="text-base font-bold text-white flex items-center gap-2 mb-3">
          <span class="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs">4</span>
          Punteres Canòniques de Descàrrega i Contacte Oficial
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6">
          <div class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span class="text-zinc-400 block mb-1">Instal·lador Oficial (.exe):</span>
            <a href="/releases/latest/Bentian-Setup.exe" class="font-mono text-indigo-400 hover:underline break-all">
              https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe
            </a>
          </div>
          <div class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span class="text-zinc-400 block mb-1">Versió Portable ZIP:</span>
            <a href="/releases/latest/BentianAgent-Portable.zip" class="font-mono text-indigo-400 hover:underline break-all">
              https://bridge.cristianjm.com/releases/latest/BentianAgent-Portable.zip
            </a>
          </div>
        </div>
        <div class="text-xs text-zinc-400 border-t border-white/[0.06] pt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span class="text-zinc-500">Contacte Tècnic Institucional:</span>
            <span class="text-zinc-300 font-medium ml-1">cristianjimeneztrabajo@gmail.com</span>
          </div>
          <div>
            <span class="text-zinc-500">Punt d'accés principal:</span>
            <a href="https://bridge.cristianjm.com" class="text-indigo-400 hover:underline ml-1">https://bridge.cristianjm.com</a>
          </div>
        </div>
      </section>

    </div>
  </main>

  <footer class="border-t border-white/[0.08] bg-[#09090b] py-8 text-center text-xs text-zinc-500">
    <p>&copy; ${new Date().getFullYear()} Bentian ERP Bridge — Fitxa Tècnica Oficial per a Organismes i Pimes de la Comunitat Valenciana.</p>
  </footer>

</body>
</html>`;
}

export function buildValencianoPages(): void {
  console.log('[Valenciano Build] Compilant la landing i fitxa tècnica en valencià...');
  const currentVersion = getCanonicalVersion();

  if (!fs.existsSync(VA_DIR)) {
    fs.mkdirSync(VA_DIR, { recursive: true });
  }
  if (!fs.existsSync(VA_FITXA_DIR)) {
    fs.mkdirSync(VA_FITXA_DIR, { recursive: true });
  }

  // 1. Landing en valencià
  const landingHtml = renderValencianoLanding(currentVersion);
  const landingPath = path.join(VA_DIR, 'index.html');
  fs.writeFileSync(landingPath, landingHtml, 'utf8');
  console.log(`[Valenciano Build] Landing generada: ${landingPath} (${(landingHtml.length / 1024).toFixed(1)} KB)`);

  // 2. Fitxa tècnica oficial en valencià
  const fitxaHtml = renderValencianoFitxaTecnica(currentVersion);
  const fitxaPath = path.join(VA_FITXA_DIR, 'index.html');
  fs.writeFileSync(fitxaPath, fitxaHtml, 'utf8');
  console.log(`[Valenciano Build] Fitxa tècnica generada: ${fitxaPath} (${(fitxaHtml.length / 1024).toFixed(1)} KB)`);

  // 3. Sincronització de sitemaps
  syncSitemapsWithValenciano();
}

function syncSitemapsWithValenciano(): void {
  const baseLayoutPath = path.join(PUBLIC_DIR, 'layout/base.html');
  if (fs.existsSync(baseLayoutPath)) {
    let baseContent = fs.readFileSync(baseLayoutPath, 'utf8');
    if (!baseContent.includes('hreflang="ca-ES"')) {
      baseContent = baseContent.replace(
        '<link rel="alternate" hreflang="es" href="https://bridge.cristianjm.com/">',
        '<link rel="alternate" hreflang="es" href="https://bridge.cristianjm.com/">\n  <link rel="alternate" hreflang="ca-ES" href="https://bridge.cristianjm.com/va/">\n  <link rel="alternate" hreflang="ca" href="https://bridge.cristianjm.com/va/">'
      );
      fs.writeFileSync(baseLayoutPath, baseContent, 'utf8');
      console.log("[Valenciano Build] S'han afegit les etiquetes hreflang a base.html");
    }
  }

  const sitemapMainPath = path.join(PUBLIC_DIR, 'sitemap-main.xml');
  const sitemapXmlPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  const lastmod = new Date().toISOString();

  const vaUrlsBlock = `  <!-- Pàgina Principal en Valencià -->
  <url>
    <loc>https://bridge.cristianjm.com/va/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="es" href="https://bridge.cristianjm.com/" />
    <xhtml:link rel="alternate" hreflang="ca-ES" href="https://bridge.cristianjm.com/va/" />
    <xhtml:link rel="alternate" hreflang="ca" href="https://bridge.cristianjm.com/va/" />
  </url>

  <!-- Fitxa Tècnica Oficial per a la Comunitat Valenciana -->
  <url>
    <loc>https://bridge.cristianjm.com/va/fitxa-tecnica/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ca-ES" href="https://bridge.cristianjm.com/va/fitxa-tecnica/" />
    <xhtml:link rel="alternate" hreflang="ca" href="https://bridge.cristianjm.com/va/fitxa-tecnica/" />
  </url>
`;

  [sitemapMainPath, sitemapXmlPath].forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('https://bridge.cristianjm.com/va/')) {
        content = content.replace('</urlset>', `${vaUrlsBlock}\n</urlset>`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[Valenciano Build] S'han afegit les rutes en valencià a ${path.basename(filePath)}`);
      }
    }
  });
}

if (require.main === module) {
  buildValencianoPages();
}
