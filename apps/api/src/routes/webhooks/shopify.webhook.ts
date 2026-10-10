import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Logger } from '@erp-bridge/shared';
import { EventBus, SyncService } from '@erp-bridge/core';

const logger = new Logger('ShopifyWebhook');

/**
 * Validador criptográfico HMAC-SHA256 con protección contra ataques de temporización (timingSafeEqual).
 * Soporta cabecera en base64 (estándar Shopify) y formato hexadecimal.
 */
export function verifyShopifyHmac(
  rawBody: Buffer | string | undefined,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!signature || !secret || !signature.trim() || !secret.trim()) {
    return false;
  }

  const rawBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {}), 'utf8');

  const calculatedDigest = crypto.createHmac('sha256', secret.trim()).update(rawBuffer).digest();

  const trimmedSig = signature.trim();
  let providedDigest: Buffer;
  try {
    if (/^[0-9a-fA-F]{64}$/.test(trimmedSig)) {
      providedDigest = Buffer.from(trimmedSig, 'hex');
    } else {
      providedDigest = Buffer.from(trimmedSig, 'base64');
    }
  } catch {
    return false;
  }

  // Prevenir discrepancia de longitudes realizando comparación dummy en tiempo constante
  if (providedDigest.length !== calculatedDigest.length) {
    const dummy = Buffer.alloc(32, 0);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  return crypto.timingSafeEqual(providedDigest, calculatedDigest);
}

/**
 * Sanitiza recursivamente el payload para prevenir contaminación de prototipos (Prototype Pollution),
 * inyecciones y caracteres de control no permitidos.
 */
export function sanitizePayload<T = any>(data: any, depth = 0): T {
  if (depth > 20 || data === null || data === undefined) return data;
  if (typeof data === 'string') {
    return data.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item, depth + 1)) as any;
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      clean[key] = sanitizePayload(val, depth + 1);
    }
    return clean as any;
  }
  return data;
}

export const shopifyWebhookRouter = Router();
const syncService = new SyncService();

/**
 * Middleware para validar la firma HMAC de Shopify en cada petición.
 */
function validateShopifySignature(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env['SHOPIFY_WEBHOOK_SECRET'];
  if (!secret || !secret.trim()) {
    logger.error('CRÍTICO: SHOPIFY_WEBHOOK_SECRET no configurado en las variables de entorno del servidor.');
    res.status(401).json({ error: 'Configuración de webhook inválida en el servidor' });
    return;
  }

  const hmacHeader = (req.headers['x-shopify-hmac-sha256'] as string | undefined)?.trim();
  if (!hmacHeader) {
    logger.warn('Petición de Webhook Shopify rechazada: Cabecera x-shopify-hmac-sha256 ausente.');
    res.status(401).json({ error: 'Cabecera x-shopify-hmac-sha256 requerida' });
    return;
  }

  const rawBody = (req as any).rawBody ?? req.body;
  const isValid = verifyShopifyHmac(rawBody, hmacHeader, secret);
  if (!isValid) {
    logger.warn('Petición de Webhook Shopify rechazada: Firma HMAC inválida.');
    res.status(401).json({ error: 'Firma HMAC de Shopify no válida' });
    return;
  }

  next();
}

/**
 * POST /api/webhooks/shopify/orders-create
 * Recibe eventos de creación de pedidos en Shopify y emite señal reactiva.
 */
shopifyWebhookRouter.post(
  ['/orders-create', '/shopify/orders-create'],
  validateShopifySignature,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId =
        (req.query['organizationId'] as string) ||
        (req.headers['x-organization-id'] as string) ||
        req.body?.organizationId ||
        'org_default';

      const sanitized = sanitizePayload(req.body);

      // 1. Publicar evento en EventBus
      const event = await EventBus.getInstance().publish({
        type: 'ORDER_CREATED',
        organizationId: orgId,
        source: 'shopify-webhook',
        data: {
          topic: 'orders/create',
          orderId: sanitized?.id,
          orderNumber: sanitized?.order_number || sanitized?.name,
          totalPrice: sanitized?.total_price,
          currency: sanitized?.currency,
          customer: sanitized?.customer
            ? {
                id: sanitized.customer.id,
                email: sanitized.customer.email,
                firstName: sanitized.customer.first_name,
                lastName: sanitized.customer.last_name,
              }
            : undefined,
          payload: sanitized,
        },
      });

      // 2. Disparar señal de sincronización reactiva al agente
      const activeJobs = (await syncService.listJobs(orgId).catch(() => [])).filter(
        (j) => j.status === 'ACTIVE'
      );

      for (const job of activeJobs) {
        void syncService.runJob(orgId, job.id, { forceFullSync: false }).catch((err) => {
          logger.warn(`Error al ejecutar trabajo reactivo ${job.id}:`, err);
        });
      }

      logger.info(
        `Webhook Shopify orders-create procesado exitosamente (org: ${orgId}, eventId: ${event.id}, ${activeJobs.length} trabajos disparados)`
      );

      return res.status(200).json({
        success: true,
        event: 'ORDER_CREATED',
        eventId: event.id,
        triggeredJobs: activeJobs.length,
        message: 'Webhook de Shopify procesado y sincronización reactiva emitida',
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/webhooks/shopify/inventory-levels-update
 * Recibe eventos de actualización de stock en Shopify y emite señal reactiva.
 */
shopifyWebhookRouter.post(
  ['/inventory-levels-update', '/shopify/inventory-levels-update'],
  validateShopifySignature,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId =
        (req.query['organizationId'] as string) ||
        (req.headers['x-organization-id'] as string) ||
        req.body?.organizationId ||
        'org_default';

      const sanitized = sanitizePayload(req.body);

      // 1. Publicar evento en EventBus
      const event = await EventBus.getInstance().publish({
        type: 'STOCK_UPDATED',
        organizationId: orgId,
        source: 'shopify-webhook',
        data: {
          topic: 'inventory_levels/update',
          inventoryItemId: sanitized?.inventory_item_id,
          locationId: sanitized?.location_id,
          available: sanitized?.available,
          payload: sanitized,
        },
      });

      // 2. Disparar señal de sincronización reactiva al agente
      const activeJobs = (await syncService.listJobs(orgId).catch(() => [])).filter(
        (j) => j.status === 'ACTIVE'
      );

      for (const job of activeJobs) {
        void syncService.runJob(orgId, job.id, { forceFullSync: false }).catch((err) => {
          logger.warn(`Error al ejecutar trabajo reactivo de stock ${job.id}:`, err);
        });
      }

      logger.info(
        `Webhook Shopify inventory-levels-update procesado exitosamente (org: ${orgId}, eventId: ${event.id}, ${activeJobs.length} trabajos disparados)`
      );

      return res.status(200).json({
        success: true,
        event: 'STOCK_UPDATED',
        eventId: event.id,
        triggeredJobs: activeJobs.length,
        message: 'Webhook de Shopify procesado y sincronización reactiva emitida',
      });
    } catch (error) {
      return next(error);
    }
  }
);
