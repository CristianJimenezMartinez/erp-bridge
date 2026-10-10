import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Logger } from '@erp-bridge/shared';
import { EventBus, SyncService } from '@erp-bridge/core';
import { sanitizePayload } from './shopify.webhook';

const logger = new Logger('HoldedWebhook');

/**
 * Validador criptográfico en tiempo constante (timingSafeEqual) para tokens secretos de Holded.
 * Ambos valores se resumen mediante SHA-256 para garantizar longitud idéntica de 32 bytes
 * y prevenir fugas de longitud o análisis por temporización.
 */
export function verifyHoldedSecret(
  providedSecret: string | undefined,
  expectedSecret: string | undefined
): boolean {
  if (!providedSecret || !expectedSecret || !providedSecret.trim() || !expectedSecret.trim()) {
    return false;
  }

  const hashProvided = crypto.createHash('sha256').update(providedSecret.trim(), 'utf8').digest();
  const hashExpected = crypto.createHash('sha256').update(expectedSecret.trim(), 'utf8').digest();

  return crypto.timingSafeEqual(hashProvided, hashExpected);
}

export const holdedWebhookRouter = Router();
const syncService = new SyncService();

/**
 * Middleware para validar el secreto de Holded en cabecera `x-holded-secret` o query token.
 */
function validateHoldedSecret(req: Request, res: Response, next: NextFunction): void {
  const expectedSecret = process.env['HOLDED_WEBHOOK_SECRET'];
  if (!expectedSecret || !expectedSecret.trim()) {
    logger.error('CRÍTICO: HOLDED_WEBHOOK_SECRET no configurado en el entorno del servidor.');
    res.status(401).json({ error: 'Configuración de webhook inválida en el servidor' });
    return;
  }

  const providedSecret =
    (req.headers['x-holded-secret'] as string | undefined)?.trim() ||
    (req.query['token'] as string | undefined)?.trim() ||
    (req.query['secret'] as string | undefined)?.trim();

  if (!providedSecret) {
    logger.warn('Petición de Webhook Holded rechazada: Token secreto ausente en cabecera o query.');
    res.status(401).json({ error: 'Token de autenticación de Holded ausente (x-holded-secret o ?token=)' });
    return;
  }

  const isValid = verifyHoldedSecret(providedSecret, expectedSecret);
  if (!isValid) {
    logger.warn('Petición de Webhook Holded rechazada: Token secreto no coincide.');
    res.status(401).json({ error: 'Token de autenticación de Holded no válido' });
    return;
  }

  next();
}

/**
 * POST /api/webhooks/holded/documents-create
 * Recibe eventos de creación de documentos (facturas, albaranes, pedidos) en Holded y emite señal reactiva.
 */
holdedWebhookRouter.post(
  ['/documents-create', '/holded/documents-create'],
  validateHoldedSecret,
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
        type: 'INVOICE_CREATED',
        organizationId: orgId,
        source: 'holded-webhook',
        data: {
          topic: 'documents/create',
          documentId: sanitized?.id || sanitized?.documentId,
          docNumber: sanitized?.docNumber || sanitized?.number,
          contactId: sanitized?.contact || sanitized?.contactId,
          total: sanitized?.total,
          subtotal: sanitized?.subtotal,
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
        `Webhook Holded documents-create procesado exitosamente (org: ${orgId}, eventId: ${event.id}, ${activeJobs.length} trabajos disparados)`
      );

      return res.status(200).json({
        success: true,
        event: 'INVOICE_CREATED',
        eventId: event.id,
        triggeredJobs: activeJobs.length,
        message: 'Webhook de Holded procesado y sincronización reactiva emitida',
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/webhooks/holded/contacts-create
 * Recibe eventos de creación de contactos/clientes en Holded y emite señal reactiva.
 */
holdedWebhookRouter.post(
  ['/contacts-create', '/holded/contacts-create'],
  validateHoldedSecret,
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
        type: 'CUSTOMER_CREATED',
        organizationId: orgId,
        source: 'holded-webhook',
        data: {
          topic: 'contacts/create',
          contactId: sanitized?.id || sanitized?.contactId,
          name: sanitized?.name,
          email: sanitized?.email,
          taxId: sanitized?.code || sanitized?.cif,
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
        `Webhook Holded contacts-create procesado exitosamente (org: ${orgId}, eventId: ${event.id}, ${activeJobs.length} trabajos disparados)`
      );

      return res.status(200).json({
        success: true,
        event: 'CUSTOMER_CREATED',
        eventId: event.id,
        triggeredJobs: activeJobs.length,
        message: 'Webhook de Holded procesado y sincronización reactiva emitida',
      });
    } catch (error) {
      return next(error);
    }
  }
);
