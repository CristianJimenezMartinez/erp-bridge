import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { LicenseService, DatabaseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { requireAuth, AuthService, requireRole, AuthenticatedRequest } from './auth.router';
import { MailerService } from '../services/mailer.service';
import { EmailProtectionService } from '../services/email-protection.service';


export const billingRouter = Router();
const licenseService = new LicenseService();
const logger = new Logger('BillingRouter');

const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'] || '';
const DEFAULT_DASHBOARD_URL = process.env['DASHBOARD_URL'] || 'https://bridge.cristianjm.com/dashboard/';

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
       ON CONFLICT (id) DO UPDATE SET reseller_id = COALESCE(EXCLUDED.reseller_id, organizations.reseller_id), updated_at = NOW()`,
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

/**
 * 1. Catálogo público de planes, add-ons y servicios
 */
billingRouter.get('/billing/plans', (_req: Request, res: Response) => {
  return res.json({
    currency: 'EUR',
    trialDays: 0,
    trialCardRequired: true,
    plans: CATALOG_PLANS,
  });
});

/**
 * 1.1 Plazas restantes del Plan Fundador (Blindaje estricto: máximo 25 claves a 139 €/año)
 */
billingRouter.get('/billing/founder-spots', async (_req: Request, res: Response) => {
  const MAX_FOUNDER_KEYS = 25;
  const db = DatabaseService.getInstance();
  let founderCount = 0;
  if (db.isAvailable()) {
    const r = await db.query(
      `SELECT COUNT(*)::int as count FROM licenses WHERE (plan = 'founder_annual' OR plan = 'founder' OR alias ILIKE '%Fundador%') AND billing_status = 'ACTIVE'`
    ).catch(() => ({ rows: [{ count: 0 }] }));
    founderCount = r.rows[0]?.count || 0;
  }
  const remaining = Math.max(0, MAX_FOUNDER_KEYS - founderCount);
  return res.json({
    data: {
      totalSpots: MAX_FOUNDER_KEYS,
      claimedSpots: founderCount,
      remainingSpots: remaining,
      isAvailable: remaining > 0,
      priceEur: 139,
      officialPriceEur: 199,
    },
  });
});

/**
 * 2. Crear sesión de Stripe Checkout (Planes Anuales/Mensuales, Add-ons o Setup)
 */
billingRouter.post('/billing/create-checkout-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      plan = 'base_annual',
      email,
      organizationId: customOrgId,
      billingCycle = 'annual',
      isEarlyBird = true,
      successUrl = `${DEFAULT_DASHBOARD_URL}?checkout=success`,
      cancelUrl = `${DEFAULT_DASHBOARD_URL}?checkout=cancel`,
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: { message: 'El parámetro email es obligatorio para generar la suscripción.' } });
    }

    // Blindaje comercial: El Add-on Tienda Extra fue retirado para evitar arbitraje y subarriendo no autorizado.
    if (plan && (plan.startsWith('addon_extra_store') || plan.startsWith('addon_'))) {
      return res.status(400).json({
        error: {
          code: 'ADDON_STORE_DISCONTINUED',
          message: 'La política oficial de Bentian ERP Bridge establece 1 Licencia Base por cada Tienda Online conectada. Para sincronizar múltiples tiendas o entornos multiempresa, adquiere una Licencia Base adicional o contacta con soporte.'
        }
      });
    }

    // Normalizar identificador de plan
    let matchedPlan = CATALOG_PLANS.find(p => p.id === plan);
    if (!matchedPlan) {
      if (billingCycle === 'monthly' || plan === 'base_monthly' || plan === 'monthly') {
        matchedPlan = CATALOG_PLANS[1]!;
      } else if (plan === 'setup' || plan === 'setup_assisted') {
        matchedPlan = CATALOG_PLANS[2]!;
      } else {
        matchedPlan = CATALOG_PLANS[0]!; // Por defecto Plan Base Anual
      }
    }
    if (!matchedPlan) {
      matchedPlan = CATALOG_PLANS[0]!;
    }

    // Blindaje estricto: El Plan Fundador (139 €/año) está limitado exclusivamente a 25 plazas para los participantes de la Beta
    const MAX_FOUNDER_KEYS = 25;
    const isAuthed = !!(req as any).user;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const orgId = (isAuthed && customOrgId) ? customOrgId : computeOrganizationIdFromEmail(normalizedEmail);
    const providedKey = String(req.body.licenseKey || req.body.key || req.query['key'] || '').trim().toUpperCase();

    if (matchedPlan.id === 'founder_annual') {
      const db = DatabaseService.getInstance();

      if (db.isAvailable()) {
        // Regla 1 (Anti-Acaparamiento): Máximo 1 sola Licencia Fundador por cliente / correo / organización
        const alreadyHasFounder = await db.query(
          `SELECT COUNT(*)::int as count FROM licenses l 
           JOIN organizations o ON l.organization_id = o.id 
           WHERE (l.plan = 'founder_annual' OR l.plan = 'founder' OR l.alias ILIKE '%Fundador%') 
             AND l.billing_status = 'ACTIVE' 
             AND (o.id = $1 OR o.slug = $2)`,
          [orgId, normalizedEmail]
        ).catch(() => ({ rows: [{ count: 0 }] }));

        if (alreadyHasFounder.rows[0]?.count > 0) {
          return res.status(400).json({
            error: {
              message: 'Ya dispones de una Licencia del Plan Fundador vinculada a tu cuenta. Para evitar el acaparamiento y la reventa especulativa, el Plan Fundador está estrictamente limitado a 1 licencia por empresa.',
              code: 'FOUNDER_LIMIT_PER_CUSTOMER_EXCEEDED',
            },
          });
        }

        // Regla 2 (Exclusividad Beta Testers): Debe existir una clave Beta o registro previo en la BD
        const betaCheck = await db.query(
          `SELECT l.id, l.key, l.plan FROM licenses l 
           JOIN organizations o ON l.organization_id = o.id 
           WHERE (o.id = $1 OR o.slug = $2 OR l.key = $3)`,
          [orgId, normalizedEmail, providedKey || 'NO_KEY']
        ).catch(() => ({ rows: [] }));

        if (betaCheck.rows.length === 0) {
          return res.status(400).json({
            error: {
              message: 'El Plan Fundador con descuento vitalicio (139 €/año) es exclusivo para empresas participantes en la Beta Pública. No se ha encontrado ninguna clave Beta asociada a este correo. Para activar el conector, adquiere la Licencia Oficial Estándar (199 €/año) o solicita primero tu acceso en bridge.cristianjm.com/beta/.',
              code: 'FOUNDER_BETA_PARTICIPANT_REQUIRED',
            },
          });
        }

        // Regla 2.1 (Anti-Reuso de Clave Beta): Comprobar si esta clave Beta ya fue utilizada para una plaza Fundador
        if (providedKey) {
          const alreadyUpgraded = await db.query(
            `SELECT l.id, l.key FROM licenses l 
             WHERE (l.upgraded_from_key = $1 OR l.key = $1) 
               AND (l.plan = 'founder_annual' OR l.plan = 'founder' OR l.alias ILIKE '%Fundador%')
               AND l.billing_status = 'ACTIVE'`,
            [providedKey]
          ).catch(() => ({ rows: [] }));

          if (alreadyUpgraded.rows.length > 0) {
            return res.status(400).json({
              error: {
                message: 'Esta clave Beta ya ha sido utilizada previamente para canjear una plaza del Plan Fundador. Cada clave de la Beta solo puede ser mejorada una única vez.',
                code: 'FOUNDER_BETA_KEY_ALREADY_UPGRADED',
              },
            });
          }
        }

        // Regla 3 (Cupo Global): Máximo 25 plazas en total
        const resCount = await db.query(
          `SELECT COUNT(*)::int as count FROM licenses WHERE (plan = 'founder_annual' OR plan = 'founder' OR alias ILIKE '%Fundador%') AND billing_status = 'ACTIVE'`
        ).catch(() => ({ rows: [{ count: 0 }] }));
        const founderCount = resCount.rows[0]?.count || 0;

        if (founderCount >= MAX_FOUNDER_KEYS) {
          return res.status(400).json({
            error: {
              message: `Las ${MAX_FOUNDER_KEYS} plazas exclusivas del Plan Fundador (139 €/año) ya han sido cubiertas por los primeros participantes. El conector está disponible bajo la Licencia Oficial Estándar (199 €/año).`,
              code: 'FOUNDER_LIMIT_REACHED',
            },
          });
        }
      }
    }

    const isSubscription = matchedPlan.mode === 'subscription';
    const interval = matchedPlan.billingCycle === 'monthly' ? 'month' : 'year';

    // Determinar precio real (aplicar oferta Early Bird de 199€ o tarifa Fundador de 139€ si corresponde)
    const finalPriceEur = (matchedPlan.id === 'founder_annual' && matchedPlan.promoPriceEur)
      ? matchedPlan.promoPriceEur
      : ((matchedPlan.id === 'base_annual' && isEarlyBird && matchedPlan.promoPriceEur)
        ? matchedPlan.promoPriceEur
        : matchedPlan.priceEur);

    logger.info(`Iniciando Checkout Session: ${matchedPlan.name} para ${email} (${finalPriceEur}€)`);

    // Si Stripe está configurado con clave real (live o test):
    if (STRIPE_SECRET_KEY && (STRIPE_SECRET_KEY.startsWith('sk_live_') || STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
      const params = new URLSearchParams();
      params.append('mode', matchedPlan.mode);
      params.append('customer_email', email);
      params.append('allow_promotion_codes', 'true');
      params.append('success_url', successUrl.includes('{CHECKOUT_SESSION_ID}') ? successUrl : `${successUrl}&session_id={CHECKOUT_SESSION_ID}`);
      params.append('cancel_url', cancelUrl);
      params.append('metadata[organizationId]', orgId);
      params.append('metadata[planId]', matchedPlan.id);
      params.append('metadata[planName]', matchedPlan.name);
      const safeActivations = typeof matchedPlan.seats === 'number' && matchedPlan.seats > 0 ? matchedPlan.seats : 1;
      params.append('metadata[maxActivations]', String(safeActivations));
      params.append('metadata[storesIncluded]', String(matchedPlan.storesIncluded || 1));

      if (matchedPlan.id === 'founder_annual') {
        params.append('expires_at', String(Math.floor(Date.now() / 1000) + 1800)); // Caducidad 30 min para proteger el cupo
        if (providedKey) {
          params.append('metadata[upgradedFromKey]', providedKey);
        }
      }

      const partnerCode = (req.body.partnerCode || req.body.ref || req.query['ref'] || '') as string;
      if (partnerCode) {
        params.append('metadata[resellerId]', String(partnerCode).trim().toUpperCase());
      }

      if (isSubscription) {
        params.append('subscription_data[metadata][organizationId]', orgId);
        params.append('subscription_data[metadata][planId]', matchedPlan.id);
        params.append('subscription_data[metadata][maxActivations]', String(safeActivations));
        if (matchedPlan.id === 'founder_annual' && providedKey) {
          params.append('subscription_data[metadata][upgradedFromKey]', providedKey);
        }
        if (partnerCode) {
          params.append('subscription_data[metadata][resellerId]', String(partnerCode).trim().toUpperCase());
        }
      }

      // Línea de producto
      params.append('line_items[0][price_data][currency]', 'eur');
      params.append('line_items[0][price_data][unit_amount]', String(finalPriceEur * 100));
      params.append('line_items[0][price_data][product_data][name]', matchedPlan.name);
      params.append('line_items[0][quantity]', '1');

      if (isSubscription) {
        params.append('line_items[0][price_data][recurring][interval]', interval);
      }

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const sessionData = (await response.json()) as any;

      if (!response.ok) {
        logger.error('Error devuelto por Stripe API:', sessionData);
        return res.status(502).json({ error: { message: sessionData.error?.message || 'Error al conectar con Stripe' } });
      }

      logger.info(`✓ Sesión Stripe Checkout creada: ${sessionData.id}`);
      return res.json({
        success: true,
        sessionId: sessionData.id,
        url: sessionData.url,
      });
    }

    // Modo Mock / Desarrollo local
    logger.warn('STRIPE_SECRET_KEY no configurada. Retornando Checkout Session simulada.');
    const mockSessionId = `cs_test_mock_${Date.now()}`;
    return res.json({
      success: true,
      sessionId: mockSessionId,
      url: `${successUrl}&session_id=${mockSessionId}&demo_mode=true&plan=${matchedPlan.id}&price=${finalPriceEur}`,
      plan: matchedPlan.id,
      amountEur: finalPriceEur,
      demo: true,
    });
  } catch (error) {
    logger.error('Error creando Checkout Session:', error);
    next(error);
    return;
  }
});

/**
 * 2.1 Crear sesión de Stripe Checkout Mayorista para Partners (Tarifa Distribuidor -25%: 149,25 €)
 */
billingRouter.post('/billing/partner-checkout', requireAuth, requireRole(['RESELLER', 'SUPERADMIN', 'ADMIN']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { clientName, clientTaxId, clientEmail, alias, returnUrl = DEFAULT_DASHBOARD_URL } = req.body;
    if (!clientName || !clientTaxId) {
      return res.status(400).json({ error: { message: 'Razón Social y CIF/NIF del cliente son obligatorios' } });
    }

    const resellerCode = req.user?.resellerId || req.user?.sub || 'PT-PARTNER';
    const cleanTaxId = clientTaxId.trim().toUpperCase();
    const targetEmail = (clientEmail || `${cleanTaxId.toLowerCase()}@cliente.cristianjm.com`).trim().toLowerCase();
    const orgId = `org_${crypto.createHash('md5').update(cleanTaxId).digest('hex').substring(0, 10)}`;
    const wholesalePriceEur = 149.25;

    if (STRIPE_SECRET_KEY && (STRIPE_SECRET_KEY.startsWith('sk_live_') || STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
      const params = new URLSearchParams();
      params.append('mode', 'subscription');
      params.append('customer_email', targetEmail);
      params.append('success_url', returnUrl.includes('{CHECKOUT_SESSION_ID}') ? returnUrl : `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&checkout=partner_success`);
      params.append('cancel_url', `${returnUrl}?checkout=cancel`);
      params.append('metadata[organizationId]', orgId);
      params.append('metadata[resellerId]', resellerCode);
      params.append('metadata[clientTaxId]', cleanTaxId);
      params.append('metadata[clientName]', clientName);
      params.append('metadata[alias]', alias || `Servidor Factusol - ${clientName}`);
      params.append('metadata[planId]', 'partner_reseller_annual');
      params.append('metadata[maxActivations]', '1');

      params.append('subscription_data[metadata][organizationId]', orgId);
      params.append('subscription_data[metadata][resellerId]', resellerCode);
      params.append('subscription_data[metadata][clientTaxId]', cleanTaxId);
      params.append('subscription_data[metadata][planId]', 'partner_reseller_annual');

      params.append('line_items[0][price_data][currency]', 'eur');
      params.append('line_items[0][price_data][unit_amount]', String(Math.round(wholesalePriceEur * 100)));
      params.append('line_items[0][price_data][recurring][interval]', 'year');
      params.append('line_items[0][price_data][product_data][name]', `Licencia Bentian ERP Bridge — Distribuidor Partner (-25%) [${clientName}]`);
      params.append('line_items[0][price_data][product_data][description]', `Tarifa Mayorista Partner: 149,25 €/año. Cliente: ${clientName} (${cleanTaxId})`);
      params.append('line_items[0][quantity]', '1');

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const session = (await response.json()) as any;
      if (response.ok && session.url) {
        return res.json({ success: true, url: session.url, sessionId: session.id, wholesalePriceEur });
      }
    }

    return res.json({
      success: true,
      url: `${DEFAULT_DASHBOARD_URL}?checkout=mock_partner_success`,
      demo: true,
      wholesalePriceEur
    });
  } catch (error) {
    next(error);
    return;
  }
});

/**
 * 3. Crear sesión del Portal de Clientes de Stripe (Stripe Customer Portal)
 */
billingRouter.post('/billing/create-portal-session', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let { returnUrl = DEFAULT_DASHBOARD_URL } = req.body || {};
    const isSuperadmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';

    // Validar returnUrl para que pertenezca al dominio configurado (o localhost en no-prod)
    try {
      const parsedUrl = new URL(returnUrl);
      const defaultHost = new URL(DEFAULT_DASHBOARD_URL).host;
      const isDevLocal = process.env.NODE_ENV !== 'production' && (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1');
      if (parsedUrl.host !== defaultHost && !isDevLocal) {
        logger.warn(`returnUrl rechazado por no pertenecer al dominio configurado: ${returnUrl}`);
        returnUrl = DEFAULT_DASHBOARD_URL;
      }
    } catch {
      returnUrl = DEFAULT_DASHBOARD_URL;
    }

    // Resolver Stripe Customer ID desde la base de datos para la organización del usuario
    const db = DatabaseService.getInstance();
    let effectiveCustomerId: string | null = null;
    const orgId = isSuperadmin && req.body?.organizationId ? req.body.organizationId : req.user?.organizationId;

    if (isSuperadmin && req.body?.customerId) {
      effectiveCustomerId = req.body.customerId;
    } else if (db.isAvailable() && orgId) {
      const custRow = await db.query(
        `SELECT stripe_customer_id, customer_email FROM licenses 
         WHERE organization_id = $1 AND stripe_customer_id IS NOT NULL AND stripe_customer_id <> '' 
         ORDER BY updated_at DESC LIMIT 1`,
        [orgId]
      ).then(r => r.rows[0] as Record<string, any> | undefined).catch(() => undefined);

      if (custRow?.stripe_customer_id) {
        effectiveCustomerId = custRow.stripe_customer_id;
      }
    }

    // Si aún no se encontró customerId y es superadmin buscando por email
    if (!effectiveCustomerId && isSuperadmin && req.body?.email && STRIPE_SECRET_KEY && (STRIPE_SECRET_KEY.startsWith('sk_live_') || STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
      try {
        const custRes = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(req.body.email)}&limit=1`, {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
        if (custRes.ok) {
          const custData = (await custRes.json()) as any;
          if (custData.data && custData.data.length > 0) {
            effectiveCustomerId = custData.data[0].id;
          }
        }
      } catch (err) {
        logger.warn(`No se pudo buscar cliente por email en Stripe: ${String(err)}`);
      }
    }

    logger.info(`Solicitud de Portal de Clientes de Stripe para ${effectiveCustomerId || orgId || 'desconocido'}`);

    if (STRIPE_SECRET_KEY && effectiveCustomerId && (STRIPE_SECRET_KEY.startsWith('sk_live_') || STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
      const params = new URLSearchParams();
      params.append('customer', effectiveCustomerId);
      params.append('return_url', returnUrl);

      const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const portalData = (await response.json()) as any;
      if (response.ok && portalData.url) {
        return res.json({ success: true, url: portalData.url });
      }
    }

    return res.json({
      success: true,
      url: 'https://billing.stripe.com/p/login/test',
      demo: true,
    });
  } catch (error) {
    logger.error('Error creando Portal Session:', error);
    next(error);
    return;
  }
});

/**
 * Helper criptográfico para verificar la firma de Webhooks de Stripe (HMAC-SHA256)
 */
export function verifyStripeWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300
): { valid: boolean; error?: string } {
  if (!signatureHeader || !webhookSecret) {
    return { valid: false, error: 'Cabecera stripe-signature o STRIPE_WEBHOOK_SECRET ausente' };
  }

  const items = signatureHeader.split(',');
  let timestamp = '';
  const signatures: string[] = [];

  for (const item of items) {
    const [prefix, val] = item.trim().split('=');
    if (prefix === 't' && val) {
      timestamp = val;
    } else if (prefix === 'v1' && val) {
      signatures.push(val);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return { valid: false, error: 'Formato de cabecera stripe-signature no válido' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(timestamp, 10);
  if (isNaN(tsNum) || Math.abs(nowSeconds - tsNum) > toleranceSeconds) {
    return { valid: false, error: 'Timestamp de firma expirado o fuera de tolerancia' };
  }

  const payload = Buffer.isBuffer(rawBody)
    ? Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), rawBody])
    : Buffer.from(`${timestamp}.${rawBody}`, 'utf8');

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  const match = signatures.some((sig) => {
    try {
      const sigBuffer = Buffer.from(sig, 'hex');
      return sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });

  if (!match) {
    return { valid: false, error: 'La firma del webhook no coincide con el secret configurado' };
  }

  return { valid: true };
}

/**
 * 4. Stripe Webhook Handler:
 * Alta y revocación automática de licencias en base de datos con verificación criptográfica de firma.
 */
billingRouter.post('/billing/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!webhookSecret) {
      logger.error('CRÍTICO: STRIPE_WEBHOOK_SECRET no configurado en el servidor. Rechazando webhook.');
      return res.status(500).json({ error: { message: 'Webhook secret no configurado en el servidor' } });
    }

    const signature = req.headers['stripe-signature'] as string;
    const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const verification = verifyStripeWebhookSignature(rawBody, signature, webhookSecret);
    if (!verification.valid) {
      logger.warn(`Intento de webhook de Stripe no autorizado rechazado: ${verification.error}`);
      return res.status(400).json({ error: { message: verification.error || 'Firma de webhook no válida' } });
    }

    const event = req.body;
    logger.info(`Stripe Webhook recibido y validado: ${event.type || 'unknown'}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object || {};
        const customerEmail = (session.customer_details?.email || session.customer_email || 'cliente@cristianjm.com').toLowerCase().trim();
        const organizationId = session.metadata?.organizationId || computeOrganizationIdFromEmail(customerEmail);
        const planId = session.metadata?.planId || session.metadata?.plan || 'base_annual';
        const maxActivations = Number(session.metadata?.maxActivations) || 1;
        const alias = session.metadata?.alias || 'Servidor Factusol Principal';
        const sessionId = (session.id || '') as string;
        const customerId = (session.customer || '') as string;
        const subscriptionId = (session.subscription || '') as string;
        const resellerId = session.metadata?.resellerId || null;
        const upgradedFromKey = session.metadata?.upgradedFromKey || null;

        logger.info(`[Stripe Webhook] checkout.session.completed para ${customerEmail} (Plan: ${planId}, Sesión: ${sessionId})...`);

        const db = DatabaseService.getInstance();
        await ensureOrganizationExists(db, organizationId, customerEmail, resellerId);

        let license: any = null;

        await acquireSessionLock(sessionId, async () => {
          // Idempotencia precisa: verificar si esta sesión de Stripe ya emitió una clave previamente
          if (sessionId && db.isAvailable()) {
            const sessionRow = await db.query(
              `SELECT * FROM licenses WHERE stripe_session_id = $1`,
              [sessionId]
            ).then(r => r.rows[0] as Record<string, any> | undefined).catch(() => undefined);

            if (sessionRow) {
              license = sessionRow;
              logger.info(`✓ [Stripe Webhook] Licencia ${license.key} ya existente para la sesión Stripe ${sessionId}. Reutilizando.`);
            }
          }

          if (!license) {
            if (planId.startsWith('addon_')) {
              logger.warn(`Alerta de seguridad: Intento de generar licencia base mediante add-on huérfano (${planId}) para ${customerEmail}. Operación bloqueada.`);
              return;
            }

            const existingCount = (await licenseService.listLicenses(organizationId)).length;
            const dynamicAlias = alias && alias !== 'Servidor Factusol Principal'
              ? alias
              : (existingCount > 0 ? `Servidor Factusol #${existingCount + 1}` : 'Servidor Factusol Principal');

            const isFounder = planId === 'founder_annual';
            const targetPlan = isFounder ? 'founder_annual' : 'professional';
            const targetAlias = isFounder 
              ? (alias && alias !== 'Servidor Factusol Principal' ? alias : 'Plan Fundador (Suscripción Anual)')
              : dynamicAlias;

            license = await licenseService.createLicense({
              organizationId,
              plan: 'professional', // Mapeo de compatibilidad con schema DB existente
              maxActivations,
              alias: targetAlias,
            });

            if (db.isAvailable() && sessionId) {
              await db.query(
                `UPDATE licenses 
                 SET stripe_session_id = $1, 
                     stripe_customer_id = $2, 
                     stripe_subscription_id = $3, 
                     billing_status = 'ACTIVE',
                     plan = $4,
                     alias = $5,
                     upgraded_from_key = $6
                 WHERE id = $7`,
                [sessionId, customerId || null, subscriptionId || null, targetPlan, targetAlias, upgradedFromKey || null, license.id]
              ).catch((err) => logger.warn(`Aviso al asociar stripe_session_id a licencia: ${err}`));

              // Si se actualizó desde una clave Beta, revocar la clave Beta antigua para que no siga en circulación
              if (upgradedFromKey && upgradedFromKey !== license.key) {
                await db.query(
                  `UPDATE licenses 
                   SET status = 'revoked', revoked_reason = 'Actualizado a Plan Fundador', revoked_at = CURRENT_TIMESTAMP 
                   WHERE key = $1 AND plan = 'trial'`,
                  [upgradedFromKey]
                ).catch(() => null);
                logger.info(`✓ [Stripe Webhook] Clave Beta ${upgradedFromKey} revocada tras migración a Plan Fundador.`);
              }
            }
            logger.info(`✓ [Stripe Webhook] Licencia ${license.key} generada automáticamente para ${customerEmail} [Plan: ${targetPlan}, Alias: ${targetAlias}, Sesión: ${sessionId}]`);
          }
        });

        if (!license) {
          return res.status(400).json({ error: { message: 'No se pudo generar la licencia.' } });
        }

        // Vincular al Partner si la compra vino referida por código PT-XXXX
        if (resellerId && db.isAvailable()) {
          try {
            await db.query(
              `UPDATE organizations SET reseller_id = $1 WHERE id = $2`,
              [resellerId, organizationId]
            );
            logger.info(`✓ Organización ${organizationId} vinculada al Partner ${resellerId}`);
          } catch (dbErr) {
            logger.warn('Aviso al vincular reseller_id en base de datos:', { err: String(dbErr) });
          }
        }

        // Despacho de email transaccional de bienvenida y entrega de clave (con deduplicación)
        const dedupKey = sessionId || license.key;
        if (EmailProtectionService.shouldSendBillingWelcome(dedupKey)) {
          if (license.key) EmailProtectionService.shouldSendBillingWelcome(license.key);
          MailerService.sendLicenseWelcomeEmail({
            customerEmail,
            licenseKey: license.key,
            planName: planId === 'base_annual' ? 'Plan Base Todo Incluido (Anual)' : (planId === 'base_monthly' ? 'Plan Base Todo Incluido (Mensual)' : planId),
            alias: license.alias || undefined,
          }).catch((err) => {
            logger.warn(`Aviso: Error no bloqueante al enviar email de bienvenida a ${customerEmail}: ${err.message}`);
          });
        }

        return res.json({
          received: true,
          licenseKey: license.key,
          plan: planId,
          alias: license.alias,
          maxActivations: license.maxActivations,
          organizationId: license.organizationId,
        });
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data?.object || {};
        const billingReason = invoice.billing_reason || '';
        const customerEmail = (invoice.customer_email || invoice.customer_details?.email || '').toLowerCase().trim();
        const customerId = (invoice.customer || '') as string;

        logger.info(`[Stripe Webhook] invoice.payment_succeeded recibido (Razón: ${billingReason || 'desconocida'}, Cliente: ${customerEmail || customerId})...`);

        // A. Si es el cobro inicial de suscripción, NUNCA emitir nueva clave ni duplicar emails
        if (billingReason === 'subscription_create') {
          logger.info(`[Stripe Webhook] Cobro inicial 'subscription_create' omitido: la licencia canónica se gestiona en checkout.session.completed.`);
          return res.json({ received: true, ignored: true, reason: 'subscription_create handled by checkout.session.completed' });
        }

        // B. Si es una renovación periódica ('subscription_cycle'), extender la validez de la licencia existente
        const db = DatabaseService.getInstance();
        if (db.isAvailable() && customerId) {
          try {
            const periodEndSec = invoice.lines?.data?.[0]?.period?.end || Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
            const periodEndDate = new Date(periodEndSec * 1000);

            const updateRes = await db.query(
              `UPDATE licenses 
               SET expires_at = $1, billing_status = 'ACTIVE', status = 'active'
               WHERE stripe_customer_id = $2`,
              [periodEndDate, customerId]
            );

            logger.info(`✓ Licencia renovada hasta ${periodEndDate.toISOString()} tras ciclo de facturación (${updateRes.rowCount} filas actualizadas).`);
          } catch (renewErr: any) {
            logger.error(`Error al procesar renovación de licencia en invoice.payment_succeeded:`, renewErr?.message || renewErr);
          }
        }

        return res.json({ received: true, action: 'cycle_renewed', billingReason });
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data?.object || {};
        const customerEmail = subscription.customer_email || subscription.metadata?.customerEmail;
        const reason = 'Suscripción cancelada en Stripe';

        logger.warn(`Evento de baja de suscripción para ${customerEmail || 'cliente'}: ${reason}`);

        const db = DatabaseService.getInstance();
        if (subscription.metadata?.licenseKey) {
          const lic = await licenseService.getLicenseByKey(subscription.metadata.licenseKey);
          if (lic) {
            await licenseService.revokeLicense(lic.id, reason);
            logger.info(`Licencia ${subscription.metadata.licenseKey} revocada.`);
          }
        } else if (db.isAvailable() && (subscription.id || subscription.customer)) {
          try {
            const licRow = await db.query(
              `SELECT id, key FROM licenses WHERE stripe_subscription_id = $1 OR stripe_customer_id = $2 LIMIT 1`,
              [subscription.id || 'NO_SUB', (subscription.customer as string) || 'NO_CUST']
            ).then((r: any) => r.rows[0] as { id: string; key: string } | undefined).catch(() => undefined);

            if (licRow) {
              await licenseService.revokeLicense(licRow.id, reason);
              logger.info(`Licencia ${licRow.key} revocada automáticamente por ID de suscripción (${subscription.id}).`);
            }
          } catch (delErr) {
            logger.warn(`Error buscando licencia a revocar por suscripción: ${delErr}`);
          }
        }

        if (customerEmail) {
          const effectiveDate = new Date(subscription.current_period_end ? subscription.current_period_end * 1000 : Date.now())
            .toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
          MailerService.sendSubscriptionCanceledEmail({
            email: customerEmail,
            planName: subscription.metadata?.planId,
            effectiveDate,
          }).catch(err => {
            logger.error('Error al despachar email de cancelación:', err.message);
          });
        }

        return res.json({ received: true, action: 'canceled', reason });
      }

      case 'invoice.payment_failed': {
        const invoice = event.data?.object || {};
        const customerEmail = invoice.customer_email || invoice.metadata?.customerEmail;
        const reason = 'Fallo de cobro recurrente en Stripe';

        logger.warn(`Evento de fallo de cobro para ${customerEmail || 'cliente'}: ${reason}`);

        if (customerEmail) {
          MailerService.sendPaymentFailedEmail({
            email: customerEmail,
            planName: invoice.metadata?.planId,
            updatePaymentUrl: 'https://bridge.cristianjm.com/dashboard/',
            gracePeriodDays: 7,
          }).catch(err => {
            logger.error('Error al despachar email de fallo de cobro:', err.message);
          });
        }

        return res.json({ received: true, action: 'payment_failed_alert', reason });
      }

      default:
        return res.json({ received: true, ignored: true });
    }
  } catch (error) {
    logger.error('Error procesando webhook de Stripe', error);
    next(error);
    return;
  }
});

/**
 * 5. Consulta de licencias por email (Autoservicio protegido)
 */
billingRouter.get('/billing/licenses-by-email', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperadmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';
    let orgId: string;

    if (isSuperadmin) {
      const email = req.query['email'] as string;
      if (!email) {
        return res.status(400).json({ error: { message: 'Parámetro email requerido' } });
      }
      orgId = computeOrganizationIdFromEmail(email.toLowerCase().trim());
    } else {
      // Forzar exclusivamente la organización del usuario autenticado, ignorando el email de la query
      orgId = req.user?.organizationId || computeOrganizationIdFromEmail((req.user?.sub || '').toLowerCase().trim());
    }

    const list = await licenseService.listLicenses(orgId);
    return res.json({ data: list });
  } catch (error) {
    next(error);
    return;
  }
});

/**
 * 6. Canje y Activación Post-Checkout de Stripe (Onboarding y Auto-Login)
 * Permite al frontend del Dashboard recibir la sesión completada de Stripe,
 * auto-iniciar sesión y entregar en pantalla de inmediato la clave de licencia y el instalador.
 */
billingRouter.get('/billing/session-license', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = (req.query['session_id'] as string || '').trim();
    if (!sessionId) {
      return res.status(400).json({
        error: { code: 'MISSING_SESSION_ID', message: 'Identificador de sesión de pago Stripe requerido' }
      });
    }

    // Modo Mock / Testing Local (ej: cs_test_mock_...) — Desactivado en Producción
    if (process.env.NODE_ENV !== 'production' && (sessionId.startsWith('cs_test_mock_') || (!STRIPE_SECRET_KEY && sessionId.startsWith('cs_')))) {
      const demoEmail = 'cliente-demo@cristianjm.com';
      const orgId = computeOrganizationIdFromEmail(demoEmail);
      let licenses = await licenseService.listLicenses(orgId);
      let license = licenses.length > 0 ? licenses[0]! : null;

      if (!license) {
        license = await licenseService.createLicense({
          organizationId: orgId,
          plan: 'professional',
          maxActivations: 1,
          alias: 'Servidor Factusol Principal (Demo)',
        });
      }

      const exp = Date.now() + 48 * 60 * 60 * 1000;
      const token = AuthService.createToken({
        sub: license.key,
        role: 'TENANT_CLIENT',
        organizationId: orgId,
        exp,
      });

      return res.json({
        success: true,
        licenseKey: license.key,
        token,
        email: demoEmail,
        plan: license.plan,
        organizationId: orgId,
        alias: license.alias,
        expiresAt: new Date(exp).toISOString(),
      });
    }

    if (!STRIPE_SECRET_KEY || (!STRIPE_SECRET_KEY.startsWith('sk_live_') && !STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
      return res.status(503).json({
        error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Servicio de facturación Stripe no configurado en producción' }
      });
    }

    // Consultar sesión oficial en Stripe API
    logger.info(`Consultando sesión de Stripe Checkout: ${sessionId}`);
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });

    const sessionData = (await stripeRes.json()) as any;
    if (!stripeRes.ok || !sessionData) {
      logger.warn(`Sesión Stripe no encontrada o error devuelto: ${sessionData?.error?.message}`);
      return res.status(404).json({
        error: { code: 'SESSION_NOT_FOUND', message: 'Sesión de pago no encontrada en Stripe' }
      });
    }

    // Verificar que el pago fue completado
    const isPaid = sessionData.payment_status === 'paid' || sessionData.status === 'complete';
    if (!isPaid) {
      return res.status(400).json({
        error: {
          code: 'PAYMENT_NOT_COMPLETED',
          message: `El pago aún no ha sido confirmado por la entidad bancaria (Estado: ${sessionData.payment_status || sessionData.status})`
        }
      });
    }

    const customerEmail = (
      sessionData.customer_details?.email ||
      sessionData.customer_email ||
      'cliente@cristianjm.com'
    ).toLowerCase().trim();

    const organizationId = sessionData.metadata?.organizationId || computeOrganizationIdFromEmail(customerEmail);
    const planId = sessionData.metadata?.planId || 'base_annual';
    const maxActivations = Number(sessionData.metadata?.maxActivations) || 1;
    const alias = sessionData.metadata?.alias || 'Servidor Factusol Principal';
    const customerId = (sessionData.customer || '') as string;
    const resellerId = sessionData.metadata?.resellerId || null;

    const db = DatabaseService.getInstance();
    await ensureOrganizationExists(db, organizationId, customerEmail, resellerId);

    // Idempotencia: Verificar si ya existe una licencia para esta sesión específica de Stripe
    let license: any = null;

    await acquireSessionLock(sessionId, async () => {
      if (sessionId && db.isAvailable()) {
        const sessionRow = await db.query(
          `SELECT * FROM licenses WHERE stripe_session_id = $1`,
          [sessionId]
        ).then(r => r.rows[0] as Record<string, any> | undefined).catch(() => undefined);

        if (sessionRow) {
          license = sessionRow;
          logger.info(`✓ [Session-License] Licencia ${license.key} ya existente para sesión ${sessionId}. Reutilizando.`);
        }
      }

      if (!license) {
        if (planId.startsWith('addon_')) {
          logger.warn(`Alerta de seguridad: Intento de onboarding post-checkout con add-on huérfano (${planId}) para ${customerEmail}.`);
          return;
        }

        const existingCount = (await licenseService.listLicenses(organizationId)).length;
        const dynamicAlias = alias && alias !== 'Servidor Factusol Principal'
          ? alias
          : (existingCount > 0 ? `Servidor Factusol #${existingCount + 1}` : 'Servidor Factusol Principal');

        const isFounder = planId === 'founder_annual';
        const targetPlan = isFounder ? 'founder_annual' : 'professional';
        const targetAlias = isFounder 
          ? (alias && alias !== 'Servidor Factusol Principal' ? alias : 'Plan Fundador (Suscripción Anual)')
          : dynamicAlias;
        const subscriptionId = (sessionData.subscription || '') as string;
        const upgradedFromKey = sessionData.metadata?.upgradedFromKey || null;

        logger.info(`Creando licencia on-demand tras validación de sesión ${sessionId} para ${customerEmail}`);
        license = await licenseService.createLicense({
          organizationId,
          plan: 'professional',
          maxActivations,
          alias: targetAlias,
        });

        if (db.isAvailable() && sessionId) {
          await db.query(
            `UPDATE licenses 
             SET stripe_session_id = $1, 
                 stripe_customer_id = $2, 
                 stripe_subscription_id = $3, 
                 billing_status = 'ACTIVE', 
                 plan = $4, 
                 alias = $5,
                 upgraded_from_key = $6
             WHERE id = $7`,
            [sessionId, customerId || null, subscriptionId || null, targetPlan, targetAlias, upgradedFromKey || null, license.id]
          ).catch((err) => logger.warn(`Aviso al asociar stripe_session_id en session-license: ${err}`));

          if (upgradedFromKey && upgradedFromKey !== license.key) {
            await db.query(
              `UPDATE licenses 
               SET status = 'revoked', revoked_reason = 'Actualizado a Plan Fundador', revoked_at = CURRENT_TIMESTAMP 
               WHERE key = $1 AND plan = 'trial'`,
              [upgradedFromKey]
            ).catch(() => null);
            logger.info(`✓ [Session-License] Clave Beta ${upgradedFromKey} revocada tras migración a Plan Fundador.`);
          }
        }

        // Despachar email de bienvenida si no ha sido enviado previamente
        const dedupKey = sessionId || license.key;
        if (EmailProtectionService.shouldSendBillingWelcome(dedupKey)) {
          if (license.key) EmailProtectionService.shouldSendBillingWelcome(license.key);
          MailerService.sendLicenseWelcomeEmail({
            customerEmail,
            licenseKey: license.key,
            planName: planId === 'base_annual' ? 'Plan Base Todo Incluido (Anual)' : (planId === 'base_monthly' ? 'Plan Base Todo Incluido (Mensual)' : planId),
            alias: license.alias || undefined,
          }).catch((err) => {
            logger.warn(`Aviso: Error no bloqueante al enviar email en onboarding on-demand a ${customerEmail}: ${err.message}`);
          });
        }
      }
    });

    if (!license) {
      return res.status(400).json({
        error: { code: 'LICENSE_CREATION_FAILED', message: 'No se pudo generar la licencia para la sesión' }
      });
    }

    const exp = Date.now() + 48 * 60 * 60 * 1000;
    const token = AuthService.createToken({
      sub: license.key,
      role: 'TENANT_CLIENT',
      organizationId,
      exp,
    });

    logger.info(`✓ Onboarding post-checkout completado para ${customerEmail}. Clave: ${license.key}`);

    return res.json({
      success: true,
      licenseKey: license.key,
      token,
      email: customerEmail,
      plan: planId,
      organizationId,
      alias: license.alias,
      expiresAt: new Date(exp).toISOString(),
    });
  } catch (error) {
    logger.error('Error procesando onboarding post-checkout de Stripe:', error);
    next(error);
    return;
  }
});
