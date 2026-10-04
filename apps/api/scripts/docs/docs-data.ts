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
    icon: '🚀',
    description: 'Instalación del agente en Windows, requisitos de hardware y activación de licencias.',
    order: 1,
  },
  {
    slug: 'factusol',
    title: 'Factusol ERP',
    icon: '🗄️',
    description: 'Conexión con la base de datos .accdb, rutas de red NAS, controladores OLEDB y stock.',
    order: 2,
  },
  {
    slug: 'canales',
    title: 'Canales eCommerce',
    icon: '🛒',
    description: 'Sincronización con WooCommerce (HPOS), PrestaShop, Shopify y Endpoint Universal.',
    order: 3,
  },
  {
    slug: 'arquitectura',
    title: 'Arquitectura & Sincronización',
    icon: '⚡',
    description: 'Filosofía Local-First, cola SQLite Store-and-Forward y monitoreo en tiempo real.',
    order: 4,
  },
  {
    slug: 'fiscalidad',
    title: 'Fiscalidad & Facturación',
    icon: '🧾',
    description: 'Cuadre de IVA al céntimo, Recargo de Equivalencia y compatibilidad Veri*Factu.',
    order: 5,
  },
  {
    slug: 'troubleshooting',
    title: 'Resolución de Incidencias',
    icon: '🔧',
    description: 'Solución a bases de datos bloqueadas (.laccdb), OLEDB no registrado y errores 401.',
    order: 6,
  },
  {
    slug: 'seguridad',
    title: 'Seguridad & Redes',
    icon: '🛡️',
    description: 'Configuración de antivirus/EDR, Windows SmartScreen y criptografía Ed25519.',
    order: 7,
  },
  {
    slug: 'api',
    title: 'API REST & Esquemas',
    icon: '📡',
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
