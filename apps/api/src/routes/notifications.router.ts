import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { MailerService } from '../services/mailer.service';
import { EmailProtectionService } from '../services/email-protection.service';
import { DatabaseService, LicenseKeyGenerator } from '@erp-bridge/core';
import { AuthenticatedRequest, AuthService } from './auth.router';
import { consumeRateLimit } from '../middleware/rate-limit';
import { Logger } from '@erp-bridge/shared';

const SendNotificationSchema = z.object({
  to: z.string().trim().max(200),
  subject: z.string().trim().max(200),
  html: z.string().max(100000).optional(),
  text: z.string().max(50000).optional(),
  orderReference: z.string().trim().max(100).optional(),
  licenseKey: z.string().trim().max(100).optional(),
});

const logger = new Logger('NotificationsRouter');
export const notificationsRouter = Router();

notificationsRouter.post('/notifications/order', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user && req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.slice(7).trim();
      const verified = AuthService.verifyToken(token);
      if (verified.valid && verified.payload) {
        authReq.user = verified.payload;
      }
    }
    const isAuth = Boolean(authReq.user);
    const rawLicenseKey = ((req.headers['x-license-key'] as string) || req.body?.licenseKey || '').trim();

    // 1. Exigir autenticación o clave de licencia válida
    let licenseKey = rawLicenseKey;
    let licRow: any = null;
    const db = DatabaseService.getInstance();

    if (!isAuth) {
      if (!licenseKey) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación o clave de licencia en x-license-key requerida para enviar notificaciones',
        });
      }

      const valResult = LicenseKeyGenerator.validate(licenseKey);
      if (!valResult.valid) {
        return res.status(401).json({
          success: false,
          message: 'Formato de clave de licencia inválido',
        });
      }

      if (db.isAvailable()) {
        const queryRes = await db.query(
          `SELECT l.id, l.key, l.status, l.customer_email, l.organization_id, o.email as org_email
           FROM licenses l
           LEFT JOIN organizations o ON l.organization_id = o.id
           WHERE l.key = $1
           LIMIT 1`,
          [licenseKey]
        ).catch(() => ({ rows: [] }));

        licRow = queryRes.rows[0];
        if (!licRow || licRow.status === 'revoked' || licRow.status === 'suspended') {
          return res.status(401).json({
            success: false,
            message: 'Clave de licencia no encontrada o inactiva',
          });
        }
      }
    } else {
      licenseKey = licenseKey || authReq.user?.organizationId || 'auth_user';
    }

    const parsed = SendNotificationSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: to, subject, y al menos html o text',
      });
    }

    const { to, subject, html, text, orderReference } = parsed.data;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: to, subject, y al menos html o text',
      });
    }

    // 2. Rechazar caracteres CRLF (\r o \n) para prevenir inyección de cabeceras SMTP
    if (/[\r\n]/.test(String(to)) || /[\r\n]/.test(String(subject))) {
      return res.status(400).json({
        success: false,
        message: 'Caracteres de salto de línea (CRLF) no permitidos en destinatario o asunto',
      });
    }

    // 3. Validar que no se use para reenvíos masivos arbitrarios (dirección única)
    const cleanTo = String(to).trim();
    const emailRegex = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
    if (!emailRegex.test(cleanTo)) {
      return res.status(400).json({
        success: false,
        message: 'El destinatario debe ser una única dirección de correo electrónico válida',
      });
    }

    // Restringir a los correos registrados del cliente u organización si la licencia está en BD
    let effectiveTo = cleanTo;
    if (db.isAvailable() && licRow) {
      const allowed = [
        licRow.customer_email,
        licRow.org_email,
      ].filter(Boolean).map((e: string) => e.toLowerCase().trim());

      if (allowed.length > 0 && allowed[0] && !allowed.includes(cleanTo.toLowerCase())) {
        logger.warn(`Destinatario no verificado ${cleanTo} para licencia ${licenseKey}. Limitando al email registrado ${allowed[0]}`);
        effectiveTo = allowed[0];
      }
    }

    // 4. Rate limiting por licencia/IP
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const rateLimitKey = `notify:${licenseKey}:${clientIp}`;
    const rateCheck = consumeRateLimit('notifications_order', rateLimitKey, 60_000, 30);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Límite de notificaciones excedido. Reintenta en ${rateCheck.retryAfterSeconds} segundos.`,
      });
    }

    const orderRef = orderReference || subject;

    // Deduplicación en el servidor: evitar bucles de sincronización que envíen el mismo pedido en 24h
    if (!EmailProtectionService.shouldSendOrderAlert(licenseKey, orderRef)) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Alerta de pedido ya despachada previamente en las últimas 24h (deduplicada)',
      });
    }

    logger.info(`Solicitud de notificación de pedido recibida para: ${effectiveTo} (Licencia: ${licenseKey}, Ref: ${orderRef})`);

    const sanitizedHtml = html ? String(html).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : '';
    const bodyText = text ? String(text) : (sanitizedHtml ? sanitizedHtml.replace(/<[^>]*>?/gm, '') : '');

    const result = await MailerService.sendEmail({
      to: effectiveTo,
      subject: String(subject).trim(),
      html: sanitizedHtml || bodyText,
      text: bodyText,
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        provider: result.provider,
        message: 'Notificación de pedido despachada con éxito',
      });
    } else {
      return res.status(502).json({
        success: false,
        provider: result.provider,
        message: result.error || 'Error en el proveedor de correo',
      });
    }
  } catch (err: unknown) {
    logger.error('Error procesando notificación de pedido:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({
      success: false,
      message: 'Error interno al despachar la notificación',
    });
  }
});
