import { Router, Request, Response, NextFunction } from 'express';
import { LicenseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';

export const billingRouter = Router();
const licenseService = new LicenseService();
const logger = new Logger('BillingRouter');

const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'] || '';
const DEFAULT_DASHBOARD_URL = process.env['DASHBOARD_URL'] || 'https://api.veltiatrust.com/dashboard/';

const PLAN_SEATS: Record<string, number> = {
  starter: 1,
  professional: 3,
  business: 10,
  enterprise: 25,
};

const PLAN_PRICES: Record<string, { eur: number; name: string }> = {
  starter: { eur: 29, name: 'Bentian ERP Bridge — Starter (1 Puesto)' },
  professional: { eur: 59, name: 'Bentian ERP Bridge — Profesional (3 Puestos)' },
  business: { eur: 99, name: 'Bentian ERP Bridge — Flota / Business (10 Puestos)' },
};

/**
 * 1. Catálogo público de planes y precios
 */
billingRouter.get('/billing/plans', (_req: Request, res: Response) => {
  return res.json({
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        priceEur: 29,
        billingCycle: 'monthly',
        seats: 1,
        description: 'Ideal para 1 tienda física con Factusol y 1 tienda online WooCommerce.',
        features: [
          '1 Puesto de Factusol vinculado',
          'Sincronización bidireccional automática',
          'Gestión de stock, pedidos y facturas',
          'Centro de Control Local nativo',
          'Actualizaciones automáticas',
        ],
      },
      {
        id: 'professional',
        name: 'Profesional',
        popular: true,
        priceEur: 59,
        billingCycle: 'monthly',
        seats: 3,
        description: 'Perfecto para pymes con varias cajas o puestos en almacén y tienda.',
        features: [
          'Hasta 3 Puestos de Factusol incluidos',
          'Sincronización en tiempo real con AccdbFileWatcher',
          'Soporte multi-tarifa y almacenes específicos',
          'Autoservicio de mudanza de PC (desvinculación HWID)',
          'Soporte prioritario por email y WhatsApp',
        ],
      },
      {
        id: 'business',
        name: 'Business / Flota',
        priceEur: 99,
        billingCycle: 'monthly',
        seats: 10,
        description: 'Para cadenas de tiendas, almacenes centrales y distribución masiva.',
        features: [
          'Hasta 10 Puestos de Factusol incluidos',
          'Panel Cloud central de flota multi-clave',
          'Sincronización concurrente de alta velocidad',
          'Cola de reintentos inteligente y diagnóstico exportable',
          'Soporte dedicado con atención directa de ingeniería',
        ],
      },
    ],
  });
});

/**
 * 2. Crear sesión de Stripe Checkout para contratación de licencias
 */
billingRouter.post('/billing/create-checkout-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      plan = 'professional',
      email,
      organizationId: customOrgId,
      successUrl = `${DEFAULT_DASHBOARD_URL}?checkout=success`,
      cancelUrl = `${DEFAULT_DASHBOARD_URL}?checkout=cancel`,
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: { message: 'El parámetro email es obligatorio para generar la suscripción.' } });
    }

    const cleanPlan = (plan in PLAN_PRICES ? plan : 'professional') as string;
    const seats = PLAN_SEATS[cleanPlan] || 3;
    const planInfo = PLAN_PRICES[cleanPlan] || { eur: 59, name: 'Bentian ERP Bridge' };
    const orgId = customOrgId || `org_${Buffer.from(email).toString('hex').substring(0, 10)}`;

    logger.info(`Iniciando creación de Checkout Session para ${email} (Plan: ${cleanPlan}, Puestos: ${seats})`);

    // Si Stripe está configurado en producción con su API Key:
    if (STRIPE_SECRET_KEY && (STRIPE_SECRET_KEY.startsWith('sk_live_') || STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
      const params = new URLSearchParams();
      params.append('mode', 'subscription');
      params.append('customer_email', email);
      params.append('success_url', successUrl.includes('{CHECKOUT_SESSION_ID}') ? successUrl : `${successUrl}&session_id={CHECKOUT_SESSION_ID}`);
      params.append('cancel_url', cancelUrl);
      params.append('metadata[organizationId]', orgId);
      params.append('metadata[plan]', cleanPlan);
      params.append('metadata[maxActivations]', String(seats));
      params.append('subscription_data[metadata][organizationId]', orgId);
      params.append('subscription_data[metadata][plan]', cleanPlan);
      params.append('subscription_data[metadata][maxActivations]', String(seats));

      // Línea de producto recurrente
      params.append('line_items[0][price_data][currency]', 'eur');
      params.append('line_items[0][price_data][recurring][interval]', 'month');
      params.append('line_items[0][price_data][unit_amount]', String(planInfo.eur * 100));
      params.append('line_items[0][price_data][product_data][name]', planInfo.name);
      params.append('line_items[0][quantity]', '1');

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
        logger.error('Error devuelto por la API de Stripe:', sessionData);
        return res.status(502).json({ error: { message: sessionData.error?.message || 'Error al conectar con Stripe' } });
      }

      logger.info(`✓ Sesión Stripe Checkout creada con éxito: ${sessionData.id}`);
      return res.json({
        success: true,
        sessionId: sessionData.id,
        url: sessionData.url,
      });
    }

    // Modo Mock / Desarrollo local si no hay clave de Stripe configurada
    logger.warn('STRIPE_SECRET_KEY no configurada o en modo demo. Retornando URL de éxito simulada.');
    return res.json({
      success: true,
      sessionId: `cs_test_mock_${Date.now()}`,
      url: `${successUrl}&demo_mode=true&plan=${cleanPlan}`,
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

    // Fallback amigable
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
 * Procesa pagos y suscripciones de Stripe, generando y revocando claves de licencia de forma automática.
 */
billingRouter.post('/billing/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;
    logger.info(`Stripe Webhook recibido: ${event.type || 'unknown'}`);

    switch (event.type) {
      // Pago completado o factura cobrada -> Generar licencia multi-puesto
      case 'checkout.session.completed':
      case 'invoice.payment_succeeded': {
        const session = event.data?.object || {};
        const customerEmail = session.customer_details?.email || session.customer_email || 'cliente@bentian.es';
        const organizationId = session.metadata?.organizationId || `org_${Buffer.from(customerEmail).toString('hex').substring(0, 10)}`;
        const plan = (session.metadata?.plan || 'professional') as 'starter' | 'professional' | 'enterprise';
        const maxActivations = Number(session.metadata?.maxActivations) || PLAN_SEATS[plan] || 3;
        const alias = session.metadata?.alias || 'Puesto Principal (Facturación)';

        logger.info(`Generando licencia tras pago de ${customerEmail} (Plan: ${plan}, Puestos: ${maxActivations})...`);

        const license = await licenseService.createLicense({
          organizationId,
          plan,
          maxActivations,
          alias,
        });

        logger.info(`✓ Licencia ${license.key} generada automáticamente para ${customerEmail} [Alias: ${alias}]`);

        return res.json({
          received: true,
          licenseKey: license.key,
          plan: license.plan,
          alias: license.alias,
          maxActivations: license.maxActivations,
          organizationId: license.organizationId,
        });
      }

      // Suscripción cancelada o impago -> Revocar licencia asociada
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
