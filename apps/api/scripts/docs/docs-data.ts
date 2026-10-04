import { DocCategory, DocArticle } from './types';
import { primerosPasosArticles } from './categories/01-primeros-pasos';
import { factusolArticles } from './categories/02-factusol';
import { canalesArticles } from './categories/03-canales';
import { arquitecturaArticles } from './categories/04-arquitectura';
import { fiscalidadArticles } from './categories/05-fiscalidad';
import { troubleshootingArticles } from './categories/06-troubleshooting';
import { seguridadArticles } from './categories/07-seguridad';
import { apiArticles } from './categories/08-api';

export const DOC_CATEGORIES: DocCategory[] = [
  {
    slug: 'primeros-pasos',
    title: 'Primeros Pasos',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    description: 'Instalación del agente en Windows, requisitos de hardware y activación de licencias.',
    order: 1,
  },
  {
    slug: 'factusol',
    title: 'Factusol ERP',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>',
    description: 'Conexión con la base de datos .accdb, rutas de red NAS, controladores OLEDB y stock.',
    order: 2,
  },
  {
    slug: 'canales',
    title: 'Canales eCommerce',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    description: 'Sincronización con WooCommerce (HPOS), PrestaShop, Shopify y Endpoint Universal.',
    order: 3,
  },
  {
    slug: 'arquitectura',
    title: 'Arquitectura & Sincronización',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    description: 'Filosofía Local-First, cola SQLite Store-and-Forward y monitoreo en tiempo real.',
    order: 4,
  },
  {
    slug: 'fiscalidad',
    title: 'Fiscalidad & Facturación',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>',
    description: 'Cuadre de IVA al céntimo, Recargo de Equivalencia y compatibilidad Veri*Factu.',
    order: 5,
  },
  {
    slug: 'troubleshooting',
    title: 'Resolución de Incidencias',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    description: 'Solución a bases de datos bloqueadas (.laccdb), OLEDB no registrado y errores 401.',
    order: 6,
  },
  {
    slug: 'seguridad',
    title: 'Seguridad & Redes',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
    description: 'Configuración de antivirus/EDR, Windows SmartScreen y criptografía Ed25519.',
    order: 7,
  },
  {
    slug: 'api',
    title: 'API REST & Esquemas',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    description: 'Endpoints HTTP locales (39281), esquemas JSON validados y webhooks transaccionales.',
    order: 8,
  },
];

export const DOC_ARTICLES: DocArticle[] = [
  ...primerosPasosArticles,
  ...factusolArticles,
  ...canalesArticles,
  ...arquitecturaArticles,
  ...fiscalidadArticles,
  ...troubleshootingArticles,
  ...seguridadArticles,
  ...apiArticles,
];

export function getArticleBySlug(slug: string): DocArticle | undefined {
  return DOC_ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(categorySlug: string): DocArticle[] {
  return DOC_ARTICLES.filter((a) => a.categorySlug === categorySlug);
}
