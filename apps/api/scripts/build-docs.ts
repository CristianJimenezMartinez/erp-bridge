import * as fs from 'fs';
import * as path from 'path';
import { DOC_CATEGORIES, DOC_ARTICLES, getArticlesByCategory } from './docs/docs-data';
import { DocArticle } from './docs/types';

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const DOCS_OUTPUT_ROOT = path.resolve(PUBLIC_DIR, 'docs');
const SITEMAP_FILE = path.resolve(PUBLIC_DIR, 'sitemap.xml');
const LLMS_FILE = path.resolve(PUBLIC_DIR, 'llms.txt');

function getCanonicalVersion(): string {
  const latestJsonPath = path.resolve(__dirname, '../../../releases/latest.json');
  if (fs.existsSync(latestJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
      if (data.latestVersion) return String(data.latestVersion).replace(/^v/, '').trim();
    } catch {}
  }
  const rootPkgPath = path.resolve(__dirname, '../../../package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      if (pkg.version) return String(pkg.version).replace(/^v/, '').trim();
    } catch {}
  }
  return '0.3.6';
}

function renderSidebar(currentSlug?: string): string {
  return `
    <aside id="docs-sidebar" class="fixed inset-y-0 left-0 z-40 w-72 bg-[#09090b] border-r border-white/[0.08] pt-20 pb-8 px-4 overflow-y-auto transform -translate-x-full lg:translate-x-0 transition-transform duration-200 ease-in-out">
      <!-- Search Input in Sidebar -->
      <div class="mb-6">
        <label for="sidebar-search" class="sr-only">Buscar documentación</label>
        <div class="relative">
          <input type="text" id="sidebar-search" placeholder="Buscar... (Ctrl+K)" 
            class="w-full bg-[#121215] border border-white/[0.1] rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition">
          <svg class="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <!-- Navigation Hierarchy -->
      <nav class="space-y-6" id="docs-nav-tree">
        ${DOC_CATEGORIES.map((cat) => {
          const articles = getArticlesByCategory(cat.slug);
          const isCategoryActive = articles.some((a) => a.slug === currentSlug);
          const headerBadge = isCategoryActive ? `<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>` : '';
          return `
            <div class="category-group" data-category="${cat.slug}">
              <div class="flex items-center gap-2 px-2 py-1 mb-1.5 text-xs font-bold uppercase tracking-wider ${isCategoryActive ? 'text-indigo-400' : 'text-zinc-400'}">
                <span>${cat.icon}</span>
                <span>${cat.title}</span>
                ${headerBadge}
              </div>
              <ul class="space-y-0.5 border-l border-white/[0.06] ml-3 pl-2">
                ${articles.map((art) => {
                  const isActive = art.slug === currentSlug;
                  const activeClasses = isActive
                    ? 'bg-indigo-500/10 text-indigo-300 font-semibold border-l-2 border-indigo-500 -ml-[9px] pl-2 rounded-r-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md';
                  return `
                    <li data-title="${art.title.toLowerCase()}" data-keywords="${art.keywords.toLowerCase()}">
                      <a href="/docs/${art.slug}/" class="block px-2.5 py-1.5 text-xs transition leading-snug ${activeClasses}">
                        ${art.title}
                      </a>
                    </li>
                  `;
                }).join('')}
              </ul>
            </div>
          `;
        }).join('')}
      </nav>

      <!-- Sidebar Footer Badge -->
      <div class="mt-8 pt-4 border-t border-white/[0.08] px-2 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>Agente <span data-app-version>v${getCanonicalVersion()}</span></span>
        <span class="inline-flex items-center gap-1 text-emerald-400">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>100% Local-First</span>
        </span>
      </div>
    </aside>
    <!-- Overlay for mobile -->
    <div id="sidebar-overlay" class="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm hidden lg:hidden"></div>
  `;
}

function renderHeader(): string {
  const version = getCanonicalVersion();
  return `
    <header class="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- Mobile hamburger toggle -->
        <button id="mobile-menu-btn" class="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition" aria-label="Abrir navegación">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>

        <a href="/" class="flex items-center gap-3">
          <img src="/assets/icon.svg" alt="Bentian" class="w-7 h-7">
          <span class="font-bold text-base text-white tracking-tight">Bentian <span class="text-zinc-500 font-normal">| Documentación</span></span>
        </a>
      </div>

      <div class="flex items-center gap-3 sm:gap-4">
        <a href="/docs/" class="text-xs text-zinc-300 hover:text-white transition hidden sm:inline-block">Índice General</a>
        <a href="https://github.com/CristianJimenezMartinez/Bentian" target="_blank" rel="noopener noreferrer" class="text-zinc-400 hover:text-white transition p-1.5 hidden md:inline-block" title="GitHub">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </a>
        <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5">
          <span>Descargar</span>
          <span class="text-[10px] bg-indigo-700/60 px-1 py-0.2 rounded text-indigo-200" data-app-version>v${version}</span>
        </a>
      </div>
    </header>
  `;
}

function renderDocArticlePage(article: DocArticle): string {
  const version = getCanonicalVersion();
  const category = DOC_CATEGORIES.find((c) => c.slug === article.categorySlug);

  // Find previous and next articles in overall index
  const currentIndex = DOC_ARTICLES.findIndex((a) => a.slug === article.slug);
  const prevArticle = currentIndex > 0 ? DOC_ARTICLES[currentIndex - 1] : null;
  const nextArticle = currentIndex < DOC_ARTICLES.length - 1 ? DOC_ARTICLES[currentIndex + 1] : null;

  const pageUrl = `https://bridge.cristianjm.com/docs/${article.slug}/`;

  return `<!DOCTYPE html>
<html lang="es" class="h-full bg-[#09090b] text-[#f4f4f5] antialiased scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.metaTitle}</title>
  <meta name="description" content="${article.metaDescription}">
  <meta name="keywords" content="${article.keywords}">
  <meta name="author" content="Cristian Jiménez Martínez">
  <link rel="canonical" href="${pageUrl}">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">

  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="${article.metaTitle}">
  <meta property="og:description" content="${article.metaDescription}">
  <meta property="og:image" content="https://bridge.cristianjm.com/assets/og-preview.png">
  <meta property="og:locale" content="es_ES">

  <script src="https://cdn.tailwindcss.com"></script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": "${pageUrl}#article",
        "headline": ${JSON.stringify(article.title)},
        "description": ${JSON.stringify(article.metaDescription)},
        "inLanguage": "es-ES",
        "author": {
          "@type": "Person",
          "name": "Cristian Jiménez Martínez",
          "url": "https://cristianjm.com"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Bentian",
          "url": "https://bridge.cristianjm.com",
          "logo": {
            "@type": "ImageObject",
            "url": "https://bridge.cristianjm.com/assets/icon.svg"
          }
        },
        "datePublished": "2026-10-04T20:00:00+02:00",
        "dateModified": "2026-10-05T00:00:00+02:00"
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Inicio",
            "item": "https://bridge.cristianjm.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Documentación",
            "item": "https://bridge.cristianjm.com/docs/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": ${JSON.stringify(category ? category.title : 'Guías')},
            "item": "https://bridge.cristianjm.com/docs/"
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": ${JSON.stringify(article.title)},
            "item": "${pageUrl}"
          }
        ]
      }
    ]
  }
  </script>
</head>
<body class="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-indigo-500/30 selection:text-indigo-200">

  ${renderHeader()}
  ${renderSidebar(article.slug)}

  <!-- Main Layout Container (Sidebar width: lg:pl-72, Right TOC width: xl:pr-64) -->
  <div class="pt-16 lg:pl-72">
    <div class="max-w-7xl mx-auto flex">
      
      <!-- Center Content Column -->
      <main class="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-10 max-w-4xl">
        
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-zinc-500 mb-6 flex-wrap">
          <a href="/" class="hover:text-zinc-300 transition">Inicio</a>
          <span>/</span>
          <a href="/docs/" class="hover:text-zinc-300 transition">Docs</a>
          <span>/</span>
          <span class="text-zinc-400">${category ? category.title : 'Guía'}</span>
          <span>/</span>
          <span class="text-indigo-400 font-medium truncate max-w-xs">${article.title}</span>
        </nav>

        <!-- Article Header -->
        <div class="mb-8 pb-6 border-b border-white/[0.08]">
          <div class="flex items-center gap-2 mb-3">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              ${article.badge}
            </span>
            <span class="text-xs text-zinc-500">·</span>
            <span class="text-xs text-zinc-500 font-mono">${article.readingTime}</span>
            <span class="text-xs text-zinc-500">·</span>
            <span class="text-xs text-zinc-500 font-mono">Actualizado v${version}</span>
          </div>

          <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-3">
            ${article.title}
          </h1>
          <p class="text-sm sm:text-base text-zinc-400 leading-relaxed">
            ${article.subtitle}
          </p>
        </div>

        <!-- Article Rich Content Body -->
        <article class="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed space-y-6">
          ${article.contentHtml}
        </article>

        <!-- Pagination: Prev / Next Buttons -->
        <div class="mt-12 pt-6 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${prevArticle ? `
            <a href="/docs/${prevArticle.slug}/" class="p-4 rounded-xl border border-white/[0.06] hover:border-indigo-500/30 bg-[#121215] hover:bg-[#16161b] transition group flex flex-col items-start">
              <span class="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-indigo-400 transition mb-1">← Artículo Anterior</span>
              <span class="text-xs font-semibold text-white group-hover:text-indigo-200 transition">${prevArticle.title}</span>
            </a>
          ` : '<div></div>'}
          ${nextArticle ? `
            <a href="/docs/${nextArticle.slug}/" class="p-4 rounded-xl border border-white/[0.06] hover:border-indigo-500/30 bg-[#121215] hover:bg-[#16161b] transition group flex flex-col items-end text-right">
              <span class="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-indigo-400 transition mb-1">Siguiente Artículo →</span>
              <span class="text-xs font-semibold text-white group-hover:text-indigo-200 transition">${nextArticle.title}</span>
            </a>
          ` : '<div></div>'}
        </div>

        <!-- Support Assistance Card -->
        <div class="mt-10 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/30 via-[#121215] to-[#121215] border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 class="text-sm font-bold text-white mb-1">¿Tienes dudas sobre la configuración en tu empresa?</h4>
            <p class="text-xs text-zinc-400">Nuestro equipo de ingeniería te asiste con tu base de datos Factusol o red local.</p>
          </div>
          <a href="mailto:cristianjimeneztrabajo@gmail.com" class="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white shrink-0 transition">
            Contactar con Soporte
          </a>
        </div>

      </main>

      <!-- Right Table of Contents Column (Sticky) -->
      <aside class="hidden xl:block w-64 shrink-0 px-6 py-10 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <div class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">En esta página</div>
        <ul class="space-y-2 text-xs border-l border-white/[0.06] pl-3" id="toc-list">
          ${article.toc.map((t) => `
            <li>
              <a href="#${t.id}" class="block text-zinc-400 hover:text-white transition leading-snug toc-link" data-id="${t.id}">
                ${t.label}
              </a>
            </li>
          `).join('')}
        </ul>

        <!-- Action Card -->
        <div class="mt-8 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
          <div class="text-[11px] font-bold text-white mb-1">Bentian ERP Bridge</div>
          <p class="text-[10px] text-zinc-400 mb-3 leading-relaxed">Conector nativo Windows local-first para Factusol y tiendas web.</p>
          <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="block text-center py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition">
            Descargar v${version}
          </a>
        </div>
      </aside>

    </div>
  </div>

  <script src="/js/version-sync.js" defer></script>
  <script>
    // 1. Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('docs-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileBtn && sidebar && overlay) {
      const toggleSidebar = () => {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
      };
      mobileBtn.addEventListener('click', toggleSidebar);
      overlay.addEventListener('click', toggleSidebar);
    }

    // 2. Client-side Search in Sidebar
    const searchInput = document.getElementById('sidebar-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('#docs-nav-tree li');
        const groups = document.querySelectorAll('#docs-nav-tree .category-group');

        items.forEach((li) => {
          const title = li.getAttribute('data-title') || '';
          const keywords = li.getAttribute('data-keywords') || '';
          const matches = title.includes(query) || keywords.includes(query);
          li.style.display = matches ? '' : 'none';
        });

        groups.forEach((group) => {
          const visibleItems = group.querySelectorAll('li:not([style*="display: none"])');
          group.style.display = visibleItems.length > 0 ? '' : 'none';
        });
      });

      // Shortcut: Ctrl+K / Cmd+K to focus search
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          searchInput.focus();
        }
      });
    }

    // 3. Scrollspy for Table of Contents
    const tocLinks = document.querySelectorAll('.toc-link');
    const headings = Array.from(document.querySelectorAll('article h2, article h3'));

    if (tocLinks.length > 0 && headings.length > 0) {
      window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY + 100;
        let currentHeading = null;
        for (const h of headings) {
          if (h.offsetTop <= scrollPos) {
            currentHeading = h;
          } else {
            break;
          }
        }
        if (currentHeading) {
          const currentId = currentHeading.id;
          tocLinks.forEach((link) => {
            if (link.getAttribute('data-id') === currentId) {
              link.classList.add('text-indigo-400', 'font-semibold');
              link.classList.remove('text-zinc-400');
            } else {
              link.classList.remove('text-indigo-400', 'font-semibold');
              link.classList.add('text-zinc-400');
            }
          });
        }
      }, { passive: true });
    }
  </script>
</body>
</html>`;
}

function renderDocsHub(): string {
  const version = getCanonicalVersion();

  return `<!DOCTYPE html>
<html lang="es" class="h-full bg-[#09090b] text-[#f4f4f5] antialiased scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Centro de Documentación Técnica y Manuales Oficiales | Bentian ERP Bridge</title>
  <meta name="description" content="Portal oficial de documentación técnica de Bentian ERP Bridge. Guías de conexión con Factusol, WooCommerce, PrestaShop, Shopify, resolución de incidencias OLEDB y arquitectura local-first.">
  <meta name="keywords" content="documentacion bentian, manual factusol woocommerce, guia conectar factusol, api factusol prestashop, soporte tecnico factusol">
  <meta name="author" content="Cristian Jiménez Martínez">
  <link rel="canonical" href="https://bridge.cristianjm.com/docs/">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">

  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bridge.cristianjm.com/docs/">
  <meta property="og:site_name" content="Bentian ERP Bridge">
  <meta property="og:title" content="Centro de Documentación Técnica | Bentian ERP Bridge">
  <meta property="og:description" content="Manuales y guías de arquitectura para conectar Factusol con el comercio electrónico de forma local-first.">
  <meta property="og:image" content="https://bridge.cristianjm.com/assets/og-preview.png">
  <meta property="og:locale" content="es_ES">

  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-indigo-500/30 selection:text-indigo-200">

  ${renderHeader()}

  <!-- Hero Section -->
  <section class="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-6">
      <span>Portal Oficial de Ingeniería y Soporte B2B</span>
    </div>

    <h1 class="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
      Documentación Oficial de Bentian ERP Bridge
    </h1>
    <p class="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
      Todo lo que necesitas para desplegar el conector en Windows, vincular Factusol con tu tienda online y garantizar transacciones atómicas con cuadre exacto de IVA.
    </p>

    <!-- Search Bar in Hero -->
    <div class="max-w-xl mx-auto relative mb-12">
      <input type="text" id="hub-search" placeholder="Buscar por tema, error, tabla de Factusol o plataforma... (Ctrl+K)"
        class="w-full bg-[#121215] border border-white/[0.12] rounded-2xl px-5 py-3.5 pl-12 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 shadow-2xl transition">
      <svg class="w-5 h-5 text-zinc-500 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
    </div>

    <!-- Quick Start Paths (3 Cards) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left mb-16">
      <a href="/docs/primeros-pasos/instalacion-y-despliegue/" class="p-5 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 transition group">
        <div class="text-2xl mb-2">🚀</div>
        <div class="text-xs font-mono text-indigo-400 mb-1">Paso 1</div>
        <h3 class="text-sm font-bold text-white group-hover:text-indigo-300 transition mb-1">Instalación en Windows</h3>
        <p class="text-xs text-zinc-400">Despliegue silencioso del agente y modo Edge App en 2 minutos.</p>
      </a>

      <a href="/docs/factusol/localizacion-base-datos/" class="p-5 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 transition group">
        <div class="text-2xl mb-2">🗄️</div>
        <div class="text-xs font-mono text-indigo-400 mb-1">Paso 2</div>
        <h3 class="text-sm font-bold text-white group-hover:text-indigo-300 transition mb-1">Conexión con Factusol</h3>
        <p class="text-xs text-zinc-400">Rutas locales vs NAS (Anti-Wiping) y elección de Serie 1.</p>
      </a>

      <a href="/docs/canales/woocommerce/" class="p-5 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 transition group">
        <div class="text-2xl mb-2">🛒</div>
        <div class="text-xs font-mono text-indigo-400 mb-1">Paso 3</div>
        <h3 class="text-sm font-bold text-white group-hover:text-indigo-300 transition mb-1">Vincular Tienda Web</h3>
        <p class="text-xs text-zinc-400">REST API en WooCommerce con soporte nativo HPOS.</p>
      </a>
    </div>
  </section>

  <!-- Categories Grid -->
  <section class="pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-8 pb-3 border-b border-white/[0.08]">
      <h2 class="text-xl font-bold text-white">Categorías de Documentación (${DOC_CATEGORIES.length})</h2>
      <span class="text-xs text-zinc-500">${DOC_ARTICLES.length} artículos técnicos disponibles</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="hub-category-grid">
      ${DOC_CATEGORIES.map((cat) => {
        const articles = getArticlesByCategory(cat.slug);
        return `
          <div class="category-card p-6 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/30 transition flex flex-col justify-between" data-category-title="${cat.title.toLowerCase()}" data-category-desc="${cat.description.toLowerCase()}">
            <div>
              <div class="flex items-center gap-3 mb-3">
                <span class="text-2xl">${cat.icon}</span>
                <div>
                  <h3 class="text-base font-bold text-white">${cat.title}</h3>
                  <p class="text-xs text-zinc-400">${cat.description}</p>
                </div>
              </div>

              <ul class="space-y-2 mt-4 pt-4 border-t border-white/[0.06]">
                ${articles.slice(0, 4).map((art) => `
                  <li>
                    <a href="/docs/${art.slug}/" class="text-xs text-zinc-300 hover:text-indigo-300 transition flex items-center gap-2 group">
                      <span class="text-zinc-600 group-hover:text-indigo-400 transition">→</span>
                      <span>${art.title}</span>
                    </a>
                  </li>
                `).join('')}
                ${articles.length > 4 && articles[0] ? `
                  <li class="pt-1">
                    <a href="/docs/${articles[0].slug}/" class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition">
                      + ${articles.length - 4} artículos más en ${cat.title} →
                    </a>
                  </li>
                ` : ''}
              </ul>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </section>

  <!-- Technical Manifesto Banner -->
  <section class="pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
    <div class="p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-[#14141c] to-[#121215] border border-indigo-500/30">
      <div class="max-w-2xl">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 mb-3 inline-block">Calidad de Código Blindada</span>
        <h3 class="text-xl sm:text-2xl font-extrabold text-white mb-2">Diseñado para los fallos que otros conectores ignoran</h3>
        <p class="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
          Bentian resuelve la parte crítica y fea de la gestión: caídas de red local, microcortes de Internet, números correlativos en mostrador, archivos de bloqueo .laccdb y el encuadre exacto del IVA al céntimo.
        </p>
        <div class="flex items-center gap-4 flex-wrap">
          <a href="/docs/matriz-compatibilidad-factusol/" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition">
            Consultar Matriz Oficial Factusol
          </a>
          <a href="/docs/troubleshooting/errores-humanizados/" class="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-zinc-300 hover:text-white transition">
            Ver Catálogo de Errores Humanizados
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-white/[0.08] bg-[#09090b] py-12 text-xs text-zinc-500">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="font-bold text-zinc-300">Bentian ERP Bridge</span>
        <span>— Documentación Técnica Oficial v${version}</span>
      </div>
      <div>
        <span>© 2026 Bentian. Desarrollado por Cristian Jiménez Martínez.</span>
      </div>
    </div>
  </footer>

  <script src="/js/version-sync.js" defer></script>
  <script>
    const hubSearch = document.getElementById('hub-search');
    if (hubSearch) {
      hubSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.category-card');
        cards.forEach((card) => {
          const text = card.innerText.toLowerCase();
          card.style.display = text.includes(q) ? '' : 'none';
        });
      });

      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          hubSearch.focus();
        }
      });
    }
  </script>
</body>
</html>`;
}

function updateSitemap(articles: DocArticle[]) {
  if (!fs.existsSync(SITEMAP_FILE)) {
    console.warn(`[sitemap] No se encontró sitemap en ${SITEMAP_FILE}`);
    return;
  }
  let sitemap = fs.readFileSync(SITEMAP_FILE, 'utf8');

  // Asegurar entrada del Hub central
  const hubUrl = 'https://bridge.cristianjm.com/docs/';
  if (!sitemap.includes(hubUrl)) {
    const hubEntry = `
  <!-- Centro de Documentación Técnica -->
  <url>
    <loc>${hubUrl}</loc>
    <lastmod>2026-10-05T00:00:00+02:00</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="es-ES" href="${hubUrl}" />
    <xhtml:link rel="alternate" hreflang="es" href="${hubUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${hubUrl}" />
  </url>
`;
    sitemap = sitemap.replace('</urlset>', `${hubEntry}</urlset>`);
  }

  // Asegurar cada uno de los 29 artículos
  for (const art of articles) {
    const docUrl = `https://bridge.cristianjm.com/docs/${art.slug}/`;
    if (!sitemap.includes(docUrl)) {
      const entry = `
  <!-- Doc: ${art.title} -->
  <url>
    <loc>${docUrl}</loc>
    <lastmod>2026-10-05T00:00:00+02:00</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es-ES" href="${docUrl}" />
    <xhtml:link rel="alternate" hreflang="es" href="${docUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${docUrl}" />
  </url>
`;
      sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
    }
  }

  fs.writeFileSync(SITEMAP_FILE, sitemap, 'utf8');
  console.log(`✓ [sitemap] Sitemap actualizado con los ${articles.length} artículos de documentación.`);
}

function updateLlmsTxt(articles: DocArticle[]) {
  if (!fs.existsSync(LLMS_FILE)) return;
  let llms = fs.readFileSync(LLMS_FILE, 'utf8');

  if (!llms.includes('# Documentación Técnica y Manuales')) {
    let section = `\n\n# Documentación Técnica y Manuales Oficiales\n`;
    for (const art of articles) {
      section += `- [${art.title}](https://bridge.cristianjm.com/docs/${art.slug}/): ${art.subtitle}\n`;
    }
    llms += section;
    fs.writeFileSync(LLMS_FILE, llms, 'utf8');
    console.log(`✓ [llms.txt] Añadidos ${articles.length} artículos a llms.txt`);
  }
}

export function buildDocs() {
  console.log(`\n====================================================`);
  console.log(`📚 COMPILADOR DE DOCUMENTACIÓN OFICIAL (BENTIAN DOCS)`);
  console.log(`====================================================`);

  const currentVersion = getCanonicalVersion();
  console.log(`ℹ Versión activa del agente: v${currentVersion}`);
  console.log(`ℹ Categorías a compilar: ${DOC_CATEGORIES.length}`);
  console.log(`ℹ Artículos técnicos a compilar: ${DOC_ARTICLES.length}`);

  if (!fs.existsSync(DOCS_OUTPUT_ROOT)) {
    fs.mkdirSync(DOCS_OUTPUT_ROOT, { recursive: true });
  }

  // 1. Compilar cada artículo individual
  let generatedCount = 0;
  for (const article of DOC_ARTICLES) {
    const articleDir = path.join(DOCS_OUTPUT_ROOT, article.slug);
    if (!fs.existsSync(articleDir)) {
      fs.mkdirSync(articleDir, { recursive: true });
    }
    const html = renderDocArticlePage(article);
    const outFile = path.join(articleDir, 'index.html');
    fs.writeFileSync(outFile, html, 'utf8');
    generatedCount++;
    console.log(`✓ [doc #${generatedCount}] /docs/${article.slug}/index.html`);
  }

  // 2. Compilar Hub General (/docs/index.html)
  const hubHtml = renderDocsHub();
  const hubOutFile = path.join(DOCS_OUTPUT_ROOT, 'index.html');
  fs.writeFileSync(hubOutFile, hubHtml, 'utf8');
  console.log(`✓ [hub] Portada del Centro de Documentación -> ${hubOutFile}`);

  // 3. Actualizar sitemap.xml
  updateSitemap(DOC_ARTICLES);

  // 4. Actualizar llms.txt
  updateLlmsTxt(DOC_ARTICLES);

  // 5. Unificar páginas legacy para que presenten siempre el layout oficial de 3 columnas
  const legacyMappings: Array<{ legacyPath: string; targetSlug: string }> = [
    { legacyPath: 'windows-antivirus-smartscreen-guide.html', targetSlug: 'seguridad/antivirus-edr-smartscreen' },
    { legacyPath: 'matriz-compatibilidad-factusol/index.html', targetSlug: 'factusol/matriz-compatibilidad' },
    { legacyPath: 'error-base-datos-bloqueada-factusol-laccdb.html', targetSlug: 'troubleshooting/error-3045-base-datos-bloqueada' },
    { legacyPath: 'error-proveedor-oledb-factusol-microsoft-ace.html', targetSlug: 'troubleshooting/error-oledb-no-registrado' },
    { legacyPath: 'evitar-roturas-stock-factusol-dissto.html', targetSlug: 'factusol/calculo-stock-disponible' },
    { legacyPath: 'sincronizar-pedidos-woocommerce-factusol.html', targetSlug: 'canales/woocommerce' },
    { legacyPath: 'protocolo-beta-precios-fundador.html', targetSlug: 'primeros-pasos/licencias-beta-fundador' },
  ];

  for (const mapping of legacyMappings) {
    const targetArticle = DOC_ARTICLES.find((a) => a.slug === mapping.targetSlug);
    if (targetArticle) {
      const legacyFile = path.join(DOCS_OUTPUT_ROOT, mapping.legacyPath);
      const legacyDir = path.dirname(legacyFile);
      if (!fs.existsSync(legacyDir)) {
        fs.mkdirSync(legacyDir, { recursive: true });
      }
      const threeColHtml = renderDocArticlePage(targetArticle);
      fs.writeFileSync(legacyFile, threeColHtml, 'utf8');
      console.log(`✓ [legacy 3-col unified] /docs/${mapping.legacyPath} -> layout 3 columnas sincronizado`);
    }
  }

  console.log(`\n🎉 Compilación de documentación finalizada con éxito.`);
  console.log(`Total páginas generadas: ${generatedCount + 1}`);
  console.log(`====================================================\n`);
}

// Si se ejecuta directamente desde CLI
if (require.main === module) {
  buildDocs();
}
