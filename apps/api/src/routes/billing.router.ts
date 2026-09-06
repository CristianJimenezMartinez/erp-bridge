import { Router, Request, Response, NextFunction } from 'express';
import { LicenseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';

export const billingRouter = Router();
const licenseService = new LicenseService();
const logger = new Logger('BillingRouter');

/**
 * 1. Stripe Webhook Handler:
 * Listens to Stripe payment events and automatically issues or revokes license keys.
 */
billingRouter.post('/billing/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;
    logger.info(`Stripe Webhook recibido: ${event.type || 'unknown'}`);

    switch (event.type) {
      // Payment completed -> Issue new license
      case 'checkout.session.completed':
      case 'invoice.payment_succeeded': {
        const session = event.data?.object || {};
        const customerEmail = session.customer_details?.email || session.customer_email || 'cliente@bentian.es';
        const organizationId = session.metadata?.organizationId || `org_${Buffer.from(customerEmail).toString('hex').substring(0, 10)}`;
        const plan = session.metadata?.plan || 'professional';
        const maxActivations = Number(session.metadata?.maxActivations) || 1;

        logger.info(`Generando licencia para pago de ${customerEmail} (Plan: ${plan})...`);

        const license = await licenseService.createLicense({
          organizationId,
          plan: plan as 'starter' | 'professional' | 'enterprise',
          maxActivations,
        });

        logger.info(`✓ Licencia ${license.key} generada automáticamente para ${customerEmail}`);

        return res.json({
          received: true,
          licenseKey: license.key,
          plan: license.plan,
          organizationId: license.organizationId
        });
      }

      // Subscription canceled or unpaid -> Revoke / Suspend license
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const subscription = event.data?.object || {};
        const customerEmail = subscription.customer_email;
        const reason = event.type === 'customer.subscription.deleted'
          ? 'Suscripción cancelada en Stripe'
          : 'Fallo de cobro recurrente en Stripe';

        logger.warn(`Evento de baja de suscripción para ${customerEmail || 'cliente'}: ${reason}`);

        // If metadata has licenseKey:
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
 * 2. Self-service license lookup by email
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
