import * as fs from 'fs';
import * as path from 'path';
import { DOC_CATEGORIES, DOC_ARTICLES, getArticlesByCategory } from './docs/docs-data';
import { DocArticle } from './docs/types';

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const DOCS_OUTPUT_ROOT = path.resolve(PUBLIC_DIR, 'docs');
const SITEMAP_FILE = path.resolve(PUBLIC_DIR, 'sitemap.xml');
const LLMS_FILE = path.resolve(PUBLIC_DIR, 'llms.txt');

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

function renderSidebar(currentSlug?: string): string {
  const isHubActive = currentSlug === 'hub' || !currentSlug;
  return `
    <aside id="docs-sidebar" class="fixed top-16 bottom-0 left-0 z-40 w-72 bg-[#09090b] border-r border-white/[0.08] pt-4 pb-8 px-4 overflow-y-auto transform -translate-x-full lg:translate-x-0 transition-transform duration-200 ease-in-out">
      <!-- Direct Hub Link -->
      <div class="mb-4 pb-3 border-b border-white/[0.06]">
        <a href="/docs/" class="group flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-md transition ${isHubActive ? 'bg-indigo-500/10 text-indigo-300 border-l-2 border-indigo-500 pl-2' : 'text-zinc-300 hover:text-white hover:bg-white/[0.03]'}">
          <span class="w-4 h-4 inline-flex items-center justify-center shrink-0 text-zinc-400 group-hover:text-white transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </span>
          <span>Inicio Documentación</span>
        </a>
      </div>

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
              <div class="group flex items-center gap-2 px-2 py-1 mb-1.5 text-xs font-bold uppercase tracking-wider select-none ${isCategoryActive ? 'text-indigo-400' : 'text-zinc-400'}">
                <span class="w-4 h-4 inline-flex items-center justify-center shrink-0 ${isCategoryActive ? 'text-indigo-400' : 'text-zinc-400'} group-hover:text-white transition">${cat.icon}</span>
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
    <div id="sidebar-overlay" class="fixed top-16 inset-x-0 bottom-0 z-30 bg-black/60 backdrop-blur-sm hidden lg:hidden"></div>
  `;
}

function renderHeader(): string {
  const version = getCanonicalVersion();
  return `
    <header class="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      <div class="flex items-center gap-3 sm:gap-4">
        <!-- Mobile hamburger toggle -->
        <button id="mobile-menu-btn" class="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition" aria-label="Abrir navegación">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>

        <a href="/docs/" class="flex items-center gap-3">
          <img src="/assets/icon.svg" alt="Bentian" class="w-7 h-7">
          <span class="font-bold text-base text-white tracking-tight">Bentian <span class="text-zinc-500 font-normal">| Documentación</span></span>
        </a>
      </div>

      <div class="flex items-center gap-2.5 sm:gap-3">
        <!-- Botón directo para regresar a la web principal -->
        <a href="/" class="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-[#121215] transition flex items-center gap-1.5" title="Volver a la portada principal de Bentian">
          <svg class="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          <span class="hidden sm:inline">Web Principal</span>
        </a>

        <!-- Acceso directo al Dashboard de Clientes -->
        <a href="/dashboard" class="text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition hidden md:flex items-center gap-1.5" title="Acceso a panel de clientes y licencias">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Clientes</span>
        </a>

        <!-- Botón canónico de descarga oficial -->
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
  <style>
    /* Minimalist Dark Scrollbars */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    #docs-sidebar::-webkit-scrollbar,
    aside::-webkit-scrollbar {
      width: 5px;
    }
    #docs-sidebar::-webkit-scrollbar-track,
    aside::-webkit-scrollbar-track {
      background: transparent;
    }
    #docs-sidebar::-webkit-scrollbar-thumb,
    aside::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
    }
    #docs-sidebar::-webkit-scrollbar-thumb:hover,
    aside::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    html, body, #docs-sidebar, aside {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
  </style>
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
  <style>
    /* Minimalist Dark Scrollbars */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    #docs-sidebar::-webkit-scrollbar,
    aside::-webkit-scrollbar {
      width: 5px;
    }
    #docs-sidebar::-webkit-scrollbar-track,
    aside::-webkit-scrollbar-track {
      background: transparent;
    }
    #docs-sidebar::-webkit-scrollbar-thumb,
    aside::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
    }
    #docs-sidebar::-webkit-scrollbar-thumb:hover,
    aside::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    html, body, #docs-sidebar, aside {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
  </style>
</head>
<body class="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-indigo-500/30 selection:text-indigo-200">

  ${renderHeader()}
  ${renderSidebar('hub')}

  <!-- Main Layout Container (Sidebar width: lg:pl-72, Right TOC width: xl:pr-64) -->
  <div class="pt-16 lg:pl-72">
    <div class="max-w-7xl mx-auto flex">
      
      <!-- Center Content Column -->
      <main class="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-10 max-w-4xl">
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-zinc-500 mb-6">
          <a href="/" class="hover:text-zinc-300 transition">Inicio</a>
          <span>/</span>
          <span class="text-indigo-400 font-medium">Documentación Oficial</span>
        </nav>

        <!-- Hub Hero Header -->
        <div class="mb-10 pb-6 border-b border-white/[0.08]">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-3">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Manuales Oficiales de Ingeniería y Soporte B2B</span>
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Documentación Técnica de Bentian ERP Bridge
          </h1>
          <p class="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Arquitectura de sincronización local-first, conexión punto a punto con Factusol en Windows y mapeo de pedidos, existencias e impuestos en tiempo real.
          </p>
        </div>

        <!-- Section 1: Inicio Rápido en 3 Pasos -->
        <div id="inicio-rapido" class="mb-12">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="w-5 h-5 inline-flex items-center justify-center shrink-0 text-zinc-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
              </span>
              <span>Puesta en Marcha Rápida (3 Pasos)</span>
            </h2>
            <span class="text-xs text-zinc-500 font-mono">De 0 a sincronización en &lt;5 min</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <a href="/docs/primeros-pasos/instalacion-y-despliegue/" class="p-4 rounded-xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 transition group flex flex-col justify-between">
              <div>
                <div class="text-xs font-mono text-indigo-400 font-semibold mb-1">Paso 1</div>
                <h3 class="text-xs font-bold text-white group-hover:text-indigo-300 transition mb-1">Instalación Agente</h3>
                <p class="text-[11px] text-zinc-400 leading-snug">Modo Edge App y servicio silencioso.</p>
              </div>
              <span class="text-[10px] text-indigo-400 mt-3 font-semibold group-hover:underline">Leer guía &rarr;</span>
            </a>

            <a href="/docs/factusol/localizacion-base-datos/" class="p-4 rounded-xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 transition group flex flex-col justify-between">
              <div>
                <div class="text-xs font-mono text-indigo-400 font-semibold mb-1">Paso 2</div>
                <h3 class="text-xs font-bold text-white group-hover:text-indigo-300 transition mb-1">Conectar Factusol</h3>
                <p class="text-[11px] text-zinc-400 leading-snug">Rutas locales vs NAS y Serie 1.</p>
              </div>
              <span class="text-[10px] text-indigo-400 mt-3 font-semibold group-hover:underline">Leer guía &rarr;</span>
            </a>

            <a href="/docs/canales/woocommerce/" class="p-4 rounded-xl bg-[#121215] border border-white/[0.08] hover:border-indigo-500/40 transition group flex flex-col justify-between">
              <div>
                <div class="text-xs font-mono text-indigo-400 font-semibold mb-1">Paso 3</div>
                <h3 class="text-xs font-bold text-white group-hover:text-indigo-300 transition mb-1">Vincular Tienda</h3>
                <p class="text-[11px] text-zinc-400 leading-snug">REST API WooCommerce / PrestaShop.</p>
              </div>
              <span class="text-[10px] text-indigo-400 mt-3 font-semibold group-hover:underline">Leer guía &rarr;</span>
            </a>
          </div>
        </div>

        <!-- Section 2: Mapa de Categorías y Artículos -->
        <div id="categorias" class="mb-12">
          <div class="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.08]">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="w-5 h-5 inline-flex items-center justify-center shrink-0 text-zinc-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                  <path d="M6 6h10"/>
                  <path d="M6 10h10"/>
                </svg>
              </span>
              <span>Manuales por Categoría (${DOC_CATEGORIES.length})</span>
            </h2>
            <span class="text-xs text-zinc-500">${DOC_ARTICLES.length} artículos disponibles</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${DOC_CATEGORIES.map((cat) => {
              const articles = getArticlesByCategory(cat.slug);
              return `
                <div class="group p-4 rounded-xl bg-[#121215] border border-white/[0.08] hover:border-zinc-700/60 transition flex flex-col justify-between">
                  <div>
                    <div class="flex items-center gap-2 mb-2">
                      <span class="w-4 h-4 inline-flex items-center justify-center shrink-0 text-zinc-400 group-hover:text-white transition">${cat.icon}</span>
                      <h3 class="text-xs font-bold text-white group-hover:text-zinc-100 transition">${cat.title}</h3>
                    </div>
                    <p class="text-[11px] text-zinc-400 leading-relaxed mb-3">${cat.description}</p>

                    <ul class="space-y-1.5 mt-3 pt-3 border-t border-white/[0.06]">
                      ${articles.slice(0, 3).map((art) => `
                        <li>
                          <a href="/docs/${art.slug}/" class="text-[11px] text-zinc-300 hover:text-white transition flex items-center gap-1.5 group/item">
                            <span class="text-zinc-600 group-hover/item:text-zinc-400 transition">&rarr;</span>
                            <span class="truncate">${art.title}</span>
                          </a>
                        </li>
                      `).join('')}
                      ${articles.length > 3 && articles[0] ? `
                        <li class="pt-0.5">
                          <a href="/docs/${articles[0].slug}/" class="text-[10px] font-semibold text-zinc-400 hover:text-white transition">
                            + ${articles.length - 3} artículos más en ${cat.title} &rarr;
                          </a>
                        </li>
                      ` : ''}
                    </ul>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Section 3: Salvaguardas Operativas -->
        <div id="salvaguardas" class="mb-12 p-6 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-[#14141c] to-[#121215] border border-indigo-500/20">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 mb-2 inline-block">Calidad de Código Blindada</span>
          <h2 class="text-base sm:text-lg font-bold text-white mb-2">Diseñado para los fallos que otros conectores ignoran</h2>
          <p class="text-xs text-zinc-300 leading-relaxed mb-4">
            Bentian resuelve la parte crítica y fea de la gestión: caídas de red local, microcortes de Internet, números correlativos en mostrador, archivos de bloqueo .laccdb y el encuadre exacto del IVA al céntimo.
          </p>
          <div class="flex items-center gap-3 flex-wrap">
            <a href="/docs/factusol/matriz-compatibilidad/" class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition">
              Consultar Matriz Oficial Factusol
            </a>
            <a href="/docs/troubleshooting/errores-humanizados/" class="px-3.5 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-zinc-300 hover:text-white transition">
              Ver Catálogo de Errores Humanizados
            </a>
          </div>
        </div>

        <!-- Section 4: Asistencia Técnica -->
        <div id="asistencia" class="p-5 rounded-xl bg-[#121215] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-xs font-bold text-white mb-0.5">¿Necesitas soporte técnico con tu instalación?</h3>
            <p class="text-[11px] text-zinc-400">Atención personalizada y validación asistida en tu servidor de Factusol.</p>
          </div>
          <a href="mailto:soporte@cristianjm.com" class="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-zinc-200 hover:text-white transition whitespace-nowrap">
            Contactar con Soporte &rarr;
          </a>
        </div>
      </main>

      <!-- Right Table of Contents Column (Sticky) -->
      <aside class="hidden xl:block w-64 shrink-0 px-6 py-10 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <div class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">En esta página</div>
        <ul class="space-y-2 text-xs border-l border-white/[0.06] pl-3" id="toc-list">
          <li>
            <a href="#inicio-rapido" class="block text-zinc-400 hover:text-white transition leading-snug toc-link" data-id="inicio-rapido">
              1. Inicio Rápido (3 Pasos)
            </a>
          </li>
          <li>
            <a href="#categorias" class="block text-zinc-400 hover:text-white transition leading-snug toc-link" data-id="categorias">
              2. Manuales por Categoría
            </a>
          </li>
          <li>
            <a href="#salvaguardas" class="block text-zinc-400 hover:text-white transition leading-snug toc-link" data-id="salvaguardas">
              3. Salvaguardas Operativas
            </a>
          </li>
          <li>
            <a href="#asistencia" class="block text-zinc-400 hover:text-white transition leading-snug toc-link" data-id="asistencia">
              4. Asistencia Técnica
            </a>
          </li>
        </ul>

        <!-- Action Card -->
        <div class="mt-8 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
          <div class="text-[11px] font-bold text-white mb-1">Bentian ERP Bridge</div>
          <p class="text-[10px] text-zinc-400 mb-3 leading-relaxed">Conector nativo Windows local-first para Factusol y tiendas web.</p>
          <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="block text-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition">
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
    const headings = Array.from(document.querySelectorAll('#inicio-rapido, #categorias, #salvaguardas, #asistencia'));

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

function updateSitemap(articles: DocArticle[]) {
  if (!fs.existsSync(SITEMAP_FILE)) {
    console.warn(`[sitemap] No se encontró sitemap en ${SITEMAP_FILE}`);
    return;
  }
  let sitemap = fs.readFileSync(SITEMAP_FILE, 'utf8');

  // 1. Eliminar espacio de nombres y etiquetas de imagen del sitemap principal
  sitemap = sitemap.replace(/\s*xmlns:image="[^"]*"/g, '');
  sitemap = sitemap.replace(/\s*<image:image>[\s\S]*?<\/image:image>/gi, '');

  // 2. Eliminar URLs legacy no canónicas para evitar contenido duplicado
  const legacyUrlsToRemove = new Set([
    'https://bridge.cristianjm.com/docs/windows-antivirus-smartscreen-guide.html',
    'https://bridge.cristianjm.com/docs/error-base-datos-bloqueada-factusol-laccdb.html',
    'https://bridge.cristianjm.com/docs/matriz-compatibilidad-factusol/',
    'https://bridge.cristianjm.com/docs/matriz-compatibilidad-factusol',
    'https://bridge.cristianjm.com/docs/protocolo-beta-precios-fundador.html',
    'https://bridge.cristianjm.com/docs/error-proveedor-oledb-factusol-microsoft-ace.html',
    'https://bridge.cristianjm.com/docs/sincronizar-pedidos-woocommerce-factusol.html',
    'https://bridge.cristianjm.com/docs/evitar-roturas-stock-factusol-dissto.html',
  ]);

  // Procesar cada bloque <url>...</url> de forma estrictamente aislada
  sitemap = sitemap.replace(/(?:\s*<!--[^\n]*?-->)?\s*<url>([\s\S]*?)<\/url>/gi, (match, inner) => {
    const locMatch = /<loc>\s*(.*?)\s*<\/loc>/i.exec(inner);
    const loc = locMatch?.[1]?.trim();
    if (loc && legacyUrlsToRemove.has(loc)) {
      return '';
    }
    return match;
  });

  // 3. Asegurar entrada del Hub central
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

  // 4. Asegurar cada uno de los artículos canónicos
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

  // 5. Deduplicación estricta de cualquier <loc> repetido
  const seenLocs = new Set<string>();
  sitemap = sitemap.replace(/(?:\s*<!--[^\n]*?-->)?\s*<url>([\s\S]*?)<\/url>/gi, (match, inner) => {
    const locMatch = /<loc>\s*(.*?)\s*<\/loc>/i.exec(inner);
    const loc = locMatch?.[1]?.trim();
    if (!loc) return match;
    if (seenLocs.has(loc)) {
      return '';
    }
    seenLocs.add(loc);
    return match;
  });

  // Normalizar saltos de línea sobrantes
  sitemap = sitemap.replace(/\n\s*\n\s*\n/g, '\n\n');

  fs.writeFileSync(SITEMAP_FILE, sitemap, 'utf8');
  console.log(`✓ [sitemap] Sitemap actualizado y sanitizado (100% URLs canónicas, 0 legacy, 0 duplicados, 0 imágenes).`);
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

  // 5. Limpieza de artefactos HTML legacy para delegar a redirecciones 301 canónicas
  // Nota: 'windows-antivirus-smartscreen-guide.md' se preserva intacto para descarga/lectura cruda
  const legacyArtifactsToPurge = [
    'windows-antivirus-smartscreen-guide.html',
    'error-base-datos-bloqueada-factusol-laccdb.html',
    'error-proveedor-oledb-factusol-microsoft-ace.html',
    'evitar-roturas-stock-factusol-dissto.html',
    'sincronizar-pedidos-woocommerce-factusol.html',
    'protocolo-beta-precios-fundador.html',
    'matriz-compatibilidad-factusol',
  ];

  for (const item of legacyArtifactsToPurge) {
    const fullPath = path.join(DOCS_OUTPUT_ROOT, item);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✓ [cleanup legacy folder] Eliminada carpeta legacy /docs/${item} (gestionada por 301)`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`✓ [cleanup legacy html] Eliminado archivo legacy /docs/${item} (gestionado por 301)`);
      }
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
