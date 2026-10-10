import { Router } from 'express';
import { shopifyWebhookRouter, verifyShopifyHmac, sanitizePayload } from './shopify.webhook';
import { holdedWebhookRouter, verifyHoldedSecret } from './holded.webhook';

export const webhooksRouter = Router();

// Enrutamiento de sub-proveedores
webhooksRouter.use('/shopify', shopifyWebhookRouter);
webhooksRouter.use('/holded', holdedWebhookRouter);

// Compatibilidad directa si se monta como enrutador raíz de webhooks
webhooksRouter.use(shopifyWebhookRouter);
webhooksRouter.use(holdedWebhookRouter);

export {
  shopifyWebhookRouter,
  holdedWebhookRouter,
  verifyShopifyHmac,
  verifyHoldedSecret,
  sanitizePayload,
};
