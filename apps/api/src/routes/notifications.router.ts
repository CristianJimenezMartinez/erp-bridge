import { Router, Request, Response } from 'express';
import { MailerService } from '../services/mailer.service';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('NotificationsRouter');
export const notificationsRouter = Router();

notificationsRouter.post('/notifications/order', async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: to, subject, y al menos html o text',
      });
      return;
    }

    const licenseKey = (req.headers['x-license-key'] as string) || req.body.licenseKey;
    logger.info(`Solicitud de notificación de pedido recibida para: ${to}${licenseKey ? ` (Licencia: ${licenseKey})` : ''}`);

    const result = await MailerService.sendEmail({
      to,
      subject,
      html: html || text,
      text: text || html?.replace(/<[^>]*>?/gm, ''),
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        provider: result.provider,
        message: 'Notificación de pedido despachada con éxito',
      });
    } else {
      res.status(502).json({
        success: false,
        provider: result.provider,
        message: result.error || 'Error en el proveedor de correo',
      });
    }
  } catch (err: unknown) {
    logger.error('Error procesando notificación de pedido:', err instanceof Error ? err.message : String(err));
    res.status(500).json({
      success: false,
      message: 'Error interno al despachar la notificación',
    });
  }
});
