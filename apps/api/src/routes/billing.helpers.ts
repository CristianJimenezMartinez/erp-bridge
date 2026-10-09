import crypto from 'crypto';
import { DatabaseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('BillingHelpers');

export const DEFAULT_DASHBOARD_URL = process.env['DASHBOARD_URL'] || 'https://bridge.cristianjm.com/dashboard/';

export const ANONYMOUS_BUYABLE_PLANS = [
  'base_annual',
  'founder_annual',
  'base_monthly',
  'setup_assisted',
  'setup_vip',
];

export function sanitizeReturnUrl(urlStr: string | undefined, fallback: string): string {
  if (!urlStr || typeof urlStr !== 'string') return fallback;
  try {
    const parsed = new URL(urlStr);
    const defaultHost = new URL(DEFAULT_DASHBOARD_URL).host;
    const isAllowedHost =
      parsed.host === defaultHost ||
      parsed.host === 'bridge.cristianjm.com' ||
      parsed.host === 'www.cristianjm.com' ||
      (process.env.NODE_ENV !== 'production' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'));
    return isAllowedHost ? urlStr : fallback;
  } catch {
    return fallback;
  }
}

const inFlightSessionLocks = new Map<string, Promise<any>>();

export async function acquireSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  if (!sessionId) return fn();
  while (inFlightSessionLocks.has(sessionId)) {
    try {
      await inFlightSessionLocks.get(sessionId);
    } catch {}
  }
  const promise = fn();
  inFlightSessionLocks.set(sessionId, promise);
  try {
    return await promise;
  } finally {
    inFlightSessionLocks.delete(sessionId);
  }
}

export function computeOrganizationIdFromEmail(email: string): string {
  const normalized = (email || '').toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  return `org_${hash}`;
}

export async function ensureOrganizationExists(
  db: DatabaseService,
  organizationId: string,
  customerEmail: string,
  resellerId?: string | null
): Promise<void> {
  if (!db.isAvailable()) return;
  try {
    const slug = organizationId.toLowerCase();
    const name = customerEmail.split('@')[0] || customerEmail;
    await db.query(
      `INSERT INTO organizations (id, name, slug, status, plan, reseller_id, created_at, updated_at)
       VALUES ($1, $2, $3, 'ACTIVE', 'standard', $4, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET reseller_id = COALESCE(organizations.reseller_id, EXCLUDED.reseller_id), updated_at = NOW()`,
      [organizationId, name, slug, resellerId || null]
    );
  } catch (err: any) {
    logger.warn(`Aviso al asegurar organización ${organizationId}: ${err?.message || err}`);
  }
}

export interface PlanDefinition {
  id: string;
  name: string;
  priceEur: number;
  promoPriceEur?: number;
  billingCycle: 'annual' | 'monthly' | 'one_off';
  mode: 'subscription' | 'payment';
  popular?: boolean;
  seats: number;
  storesIncluded: number;
  description: string;
  features: string[];
}

export const CATALOG_PLANS: PlanDefinition[] = [
  {
    id: 'base_annual',
    name: 'Plan Base Todo Incluido (Anual)',
    priceEur: 199,
    billingCycle: 'annual',
    mode: 'subscription',
    popular: true,
    seats: 1,
    storesIncluded: 1,
    description: 'Sincronización completa sin límites artificiales para 1 ERP y 1 Tienda Online.',
    features: [
      'Catálogo ilimitado de productos (sin límites de SKUs)',
      'Sincronización de pedidos y clientes ilimitada en tiempo real',
      '1 ERP (Factusol / SimplyGest) ⇄ 1 Tienda Online (WooCommerce / PrestaShop)',
      '1 Conexión ERP / Servidor (instalación única en el equipo con Factusol)',
      'Delta Sync por triada de hashes (descarte en local <100ms)',
      'Blindaje de imágenes por MD5 y Recargo de Equivalencia (R.E.)',
      'Centro de Control Local nativo y System Tray permanente',
      'Activación y entrega de clave inmediata',
      'Actualizaciones continuas y soporte técnico por email',
    ],
  },
  {
    id: 'founder_annual',
    name: 'Plan Fundador Beta (Anual -30% Vitalicio - Cupo 25 Plazas)',
    priceEur: 199,
    promoPriceEur: 139,
    billingCycle: 'annual',
    mode: 'subscription',
    popular: false,
    seats: 1,
    storesIncluded: 1,
    description: 'Tarifa exclusiva limitada estrictamente a las primeras 25 claves de la Beta. 139 €/año renovable de por vida.',
    features: [
      'Sincronización completa Factusol con WooCommerce o PrestaShop',
      'Descuento Fundador del 30% vitalicio garantizado (139 € vs 199 €)',
      'Cupo estricto limitado a las primeras 25 empresas',
      '1 ERP ⇄ 1 Tienda Online conectada sin límites de SKUs',
      'Actualizaciones automáticas y soporte técnico prioritario',
      'Condiciones blindadas de por vida sin subidas de precio',
    ],
  },
  {
    id: 'partner_reseller_annual',
    name: 'Licencia Cliente Final (Tarifa Distribuidor Partner -25%)',
    priceEur: 149.25,
    billingCycle: 'annual',
    mode: 'subscription',
    popular: false,
    seats: 1,
    storesIncluded: 1,
    description: 'Tarifa mayorista para agencias y partners B2B acreditados. Margen directo del 25% retenido en origen.',
    features: [
      'Licencia Base Completa para 1 cliente final',
      'Descuento del 25% directo de distribuidor ya aplicado (149,25 € vs 199,00 €)',
      'Asignación automática a la cartera del partner',
      'Sincronización ilimitada Factusol ⇄ WooCommerce / PrestaShop',
      'Soporte técnico prioritario de segundo nivel para el partner',
    ],
  },
  {
    id: 'base_monthly',
    name: 'Plan Base Todo Incluido (Mensual)',
    priceEur: 29,
    billingCycle: 'monthly',
    mode: 'subscription',
    seats: 1,
    storesIncluded: 1,
    description: 'Máxima flexibilidad mensual sin compromiso de permanencia.',
    features: [
      'Catálogo ilimitado de productos y pedidos',
      '1 ERP ⇄ 1 Tienda Online conectada',
      '1 Conexión ERP / Servidor (instalación en el equipo con Factusol)',
      'Delta Sync y blindaje de imágenes',
      'Activación y entrega de clave inmediata',
      'Sin permanencia: cancelable en cualquier momento en 1 clic',
    ],
  },
  {
    id: 'setup_assisted',
    name: 'Puesta en Marcha Asistida (Setup One-Off)',
    priceEur: 99,
    billingCycle: 'one_off',
    mode: 'payment',
    seats: 0,
    storesIncluded: 0,
    description: 'Sesión remota guiada de 45 min por AnyDesk con un ingeniero para dejar todo funcionando.',
    features: [
      'Instalación del Agente en el equipo con Factusol / SimplyGest',
      'Vinculación segura de credenciales de WooCommerce / PrestaShop',
      'Configuración de familias, tarifas y Recargo de Equivalencia',
      'Prueba de sincronización en vivo de artículos y pedido de test',
    ],
  },
  {
    id: 'setup_vip',
    name: 'Implementación Completa & Mapeo VIP',
    priceEur: 249,
    billingCycle: 'one_off',
    mode: 'payment',
    seats: 0,
    storesIncluded: 0,
    description: 'Implantación llave en mano para catálogos complejos con matrices de tallas y tarifas B2B.',
    features: [
      'Todo lo incluido en la Puesta en Marcha Asistida',
      'Mapeo exhaustivo de matrices de tallas y colores',
      'Configuración de tarifas mayoristas B2B escalonadas',
      '30 días de soporte prioritario directo por WhatsApp',
    ],
  },
];
