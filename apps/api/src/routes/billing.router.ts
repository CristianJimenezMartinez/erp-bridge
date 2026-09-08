import { Router, Request, Response, NextFunction } from 'express';
import { LicenseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';

export const billingRouter = Router();
const licenseService = new LicenseService();
const logger = new Logger('BillingRouter');

const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'] || '';
const DEFAULT_DASHBOARD_URL = process.env['DASHBOARD_URL'] || 'https://bridge.cristianjm.com/dashboard/';

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
    priceEur: 249,
    promoPriceEur: 199,
    billingCycle: 'annual',
    mode: 'subscription',
    popular: true,
    seats: 3,
    storesIncluded: 1,
    description: 'Sincronización completa sin límites artificiales para 1 ERP y 1 Tienda Online.',
    features: [
      'Catálogo ilimitado de productos (sin límites de SKUs)',
      'Sincronización de pedidos y clientes ilimitada',
      '1 ERP (Factusol / SimplyGest) ⇄ 1 Tienda Online (WooCommerce / PrestaShop)',
      'Hasta 3 puestos locales de trabajo incluidos',
      'Delta Sync por triada de hashes (descarte en local <100ms)',
      'Blindaje de imágenes por MD5 y Recargo de Equivalencia (R.E.)',
      'Centro de Control Local nativo y System Tray permanente',
      'Prueba de 14 días gratis sin tarjeta',
      'Actualizaciones continuas y soporte técnico por email',
    ],
  },
  {
    id: 'base_monthly',
    name: 'Plan Base Todo Incluido (Mensual)',
    priceEur: 29,
    billingCycle: 'monthly',
    mode: 'subscription',
    seats: 3,
    storesIncluded: 1,
    description: 'Máxima flexibilidad mensual sin compromiso de permanencia.',
    features: [
      'Catálogo ilimitado de productos y pedidos',
      '1 ERP ⇄ 1 Tienda Online conectada',
      'Hasta 3 puestos locales incluidos',
      'Delta Sync y blindaje de imágenes',
      'Prueba de 14 días gratis sin tarjeta',
      'Sin permanencia: cancelable en cualquier momento en 1 clic',
    ],
  },
  {
    id: 'addon_extra_store_annual',
    name: 'Add-on Tienda Extra (Anual)',
    priceEur: 99,
    billingCycle: 'annual',
    mode: 'subscription',
    seats: 0,
    storesIncluded: 1,
    description: '+1 Conexión de Tienda Online adicional (ej. WooCommerce B2B + Shopify B2C).',
    features: [
      '+1 Tienda Online conectada al mismo ERP',
      'Sincronización simultánea multi-tienda',
      'Filtrado por almacenes y tarifas específicas por tienda',
    ],
  },
  {
    id: 'addon_extra_store_monthly',
    name: 'Add-on Tienda Extra (Mensual)',
    priceEur: 12,
    billingCycle: 'monthly',
    mode: 'subscription',
    seats: 0,
    storesIncluded: 1,
    description: '+1 Tienda Online adicional con facturación mensual.',
    features: [
      '+1 Tienda Online conectada al mismo ERP',
      'Cancelable mensualmente',
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
    trialDays: 14,
    trialCardRequired: false,
    plans: CATALOG_PLANS,
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

    // Normalizar identificador de plan
    let matchedPlan = CATALOG_PLANS.find(p => p.id === plan);
    if (!matchedPlan) {
      // Compatibilidad con identificadores antiguos ('starter', 'professional', 'business')
      if (plan === 'starter' || plan === 'base' || plan === 'base_annual' || plan === 'annual') {
        matchedPlan = CATALOG_PLANS[0];
      } else if (plan === 'base_monthly' || plan === 'monthly') {
        matchedPlan = CATALOG_PLANS[1];
      } else if (plan === 'setup' || plan === 'setup_assisted') {
        matchedPlan = CATALOG_PLANS[4];
      } else {
        matchedPlan = CATALOG_PLANS[0]; // Por defecto Plan Base Anual
      }
    }

    const orgId = customOrgId || `org_${Buffer.from(email).toString('hex').substring(0, 10)}`;
    const isSubscription = matchedPlan.mode === 'subscription';
    const interval = matchedPlan.billingCycle === 'monthly' ? 'month' : 'year';

    // Determinar precio real (aplicar oferta de lanzamiento Early Bird de 199€ si corresponde)
    const finalPriceEur = (matchedPlan.id === 'base_annual' && isEarlyBird && matchedPlan.promoPriceEur)
      ? matchedPlan.promoPriceEur
      : matchedPlan.priceEur;

    logger.info(`Iniciando Checkout Session: ${matchedPlan.name} para ${email} (${finalPriceEur}€)`);

    // Si Stripe está configurado con clave real (live o test):
    if (STRIPE_SECRET_KEY && (STRIPE_SECRET_KEY.startsWith('sk_live_') || STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
      const params = new URLSearchParams();
      params.append('mode', matchedPlan.mode);
      params.append('customer_email', email);
      params.append('success_url', successUrl.includes('{CHECKOUT_SESSION_ID}') ? successUrl : `${successUrl}&session_id={CHECKOUT_SESSION_ID}`);
      params.append('cancel_url', cancelUrl);
      params.append('metadata[organizationId]', orgId);
      params.append('metadata[planId]', matchedPlan.id);
      params.append('metadata[planName]', matchedPlan.name);
      params.append('metadata[maxActivations]', String(matchedPlan.seats || 3));
      params.append('metadata[storesIncluded]', String(matchedPlan.storesIncluded || 1));

      if (isSubscription) {
        params.append('subscription_data[metadata][organizationId]', orgId);
        params.append('subscription_data[metadata][planId]', matchedPlan.id);
        params.append('subscription_data[metadata][maxActivations]', String(matchedPlan.seats || 3));
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
    return res.json({
      success: true,
      sessionId: `cs_test_mock_${Date.now()}`,
      url: `${successUrl}&demo_mode=true&plan=${matchedPlan.id}&price=${finalPriceEur}`,
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
 * 3. Crear sesión del Portal de Clientes de Stripe (Stripe Customer Portal)
 */
billingRouter.post('/billing/create-portal-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, customerId, returnUrl = DEFAULT_DASHBOARD_URL } = req.body;

    logger.info(`Solicitud de Portal de Clientes de Stripe para ${customerId || email || 'desconocido'}`);

    if (STRIPE_SECRET_KEY && customerId && (STRIPE_SECRET_KEY.startsWith('sk_live_') || STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
      const params = new URLSearchParams();
      params.append('customer', customerId);
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
 * 4. Stripe Webhook Handler:
 * Alta y revocación automática de licencias en base de datos.
 */
billingRouter.post('/billing/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;
    logger.info(`Stripe Webhook recibido: ${event.type || 'unknown'}`);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'invoice.payment_succeeded': {
        const session = event.data?.object || {};
        const customerEmail = session.customer_details?.email || session.customer_email || 'cliente@bentian.es';
        const organizationId = session.metadata?.organizationId || `org_${Buffer.from(customerEmail).toString('hex').substring(0, 10)}`;
        const planId = session.metadata?.planId || session.metadata?.plan || 'base_annual';
        const maxActivations = Number(session.metadata?.maxActivations) || 3;
        const alias = session.metadata?.alias || 'Puesto Principal (Facturación)';

        logger.info(`Generando licencia tras pago de ${customerEmail} (Plan: ${planId}, Puestos: ${maxActivations})...`);

        const license = await licenseService.createLicense({
          organizationId,
          plan: 'professional', // Mapeo de compatibilidad con schema DB existente
          maxActivations,
          alias,
        });

        logger.info(`✓ Licencia ${license.key} generada automáticamente para ${customerEmail} [Alias: ${alias}]`);

        return res.json({
          received: true,
          licenseKey: license.key,
          plan: planId,
          alias: license.alias,
          maxActivations: license.maxActivations,
          organizationId: license.organizationId,
        });
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const subscription = event.data?.object || {};
        const customerEmail = subscription.customer_email;
        const reason = event.type === 'customer.subscription.deleted'
          ? 'Suscripción cancelada en Stripe'
          : 'Fallo de cobro recurrente en Stripe';

        logger.warn(`Evento de baja de suscripción para ${customerEmail || 'cliente'}: ${reason}`);

        if (subscription.metadata?.licenseKey) {
          const lic = await licenseService.getLicenseByKey(subscription.metadata.licenseKey);
          if (lic) {
            await licenseService.revokeLicense(lic.id, reason);
            logger.info(`Licencia ${subscription.metadata.licenseKey} revocada.`);
          }
        }

        return res.json({ received: true, action: 'revoked', reason });
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
 * 5. Consulta de licencias por email (Autoservicio)
 */
billingRouter.get('/billing/licenses-by-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.query['email'] as string;
    if (!email) {
      return res.status(400).json({ error: { message: 'Parámetro email requerido' } });
    }
    const orgId = `org_${Buffer.from(email).toString('hex').substring(0, 10)}`;
    const list = await licenseService.listLicenses(orgId);
    return res.json({ data: list });
  } catch (error) {
    next(error);
    return;
  }
});
