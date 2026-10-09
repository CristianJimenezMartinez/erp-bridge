import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { DatabaseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { MailerService } from '../services/mailer.service';
import { rateLimit } from '../middleware/rate-limit';

export const contactRouter = Router();
const logger = new Logger('ContactRouter');

const SERVICE_LABELS: Record<string, string> = {
  'factusol-bridge': 'Bentian ERP Bridge / Integración Factusol',
  'verifactu-audit': 'Auditoría Técnica y Adaptación VeriFactu (RD 1007/2023)',
  'erp-rescue': 'Rescate y Optimización de Integración ERP Caída',
  'software-architecture': 'Desarrollo de Software & Arquitectura Cloud',
  'consulting': 'Consultoría Técnica & Auditoría ERP',
  'other': 'Otro asunto o propuesta personalizada',
};

contactRouter.post(
  ['/contact', '/api/v1/contact'],
  rateLimit({
    name: 'contact-submission',
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Has enviado varios mensajes recientemente. Por favor, espera unos minutos antes de enviar otro.',
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, phone, service, message, source } = req.body as {
        name?: string;
        email?: string;
        phone?: string;
        service?: string;
        message?: string;
        source?: string;
      };

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: { message: 'El nombre es obligatorio (mínimo 2 caracteres).' } });
      }

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: { message: 'El correo electrónico es obligatorio.' } });
      }

      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: { message: 'El formato del correo electrónico no es válido.' } });
      }

      if (!message || typeof message !== 'string' || message.trim().length < 5) {
        return res.status(400).json({ error: { message: 'El mensaje es obligatorio (mínimo 5 caracteres).' } });
      }

      const cleanName = name.trim();
      const cleanPhone = phone ? String(phone).trim() : null;
      const cleanServiceKey = service ? String(service).trim() : 'general';
      const cleanServiceLabel = SERVICE_LABELS[cleanServiceKey] || cleanServiceKey;
      const cleanMessage = message.trim();
      const cleanSource = source ? String(source).trim() : 'web';
      const leadId = `lead_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || req.ip || null;
      const clientUserAgent = (req.headers['user-agent'] as string) || null;

      // 1. Guardar en Base de Datos PostgreSQL si está disponible
      const db = DatabaseService.getInstance();
      if (db.isAvailable()) {
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS contact_leads (
              id VARCHAR(64) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL,
              phone VARCHAR(64),
              service VARCHAR(128),
              message TEXT NOT NULL,
              source VARCHAR(64),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              ip_address VARCHAR(128),
              user_agent TEXT
            )
          `);

          await db.query(`
            INSERT INTO contact_leads (id, name, email, phone, service, message, source, created_at, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
          `, [leadId, cleanName, cleanEmail, cleanPhone, cleanServiceLabel, cleanMessage, cleanSource, clientIp, clientUserAgent]);
          logger.info(`✓ Lead ${leadId} registrado en base de datos (${cleanEmail})`);
        } catch (dbErr: any) {
          logger.warn('Aviso: No se pudo persistir el lead en PostgreSQL:', dbErr.message);
        }
      }

      // 2. Notificación Inmediata por Email a Cristian vía Resend
      const adminNotificationHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #f4f4f5; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
            <div style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #818cf8; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">
              ⚡
            </div>
            <div>
              <h2 style="margin: 0; font-size: 18px; color: #ffffff;">Nuevo Lead Entrante</h2>
              <span style="font-size: 12px; color: #a1a1aa;">Origen: <strong>${cleanSource}</strong></span>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; width: 120px;">Nombre:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${cleanName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${cleanEmail}" style="color: #818cf8; text-decoration: none;">${cleanEmail}</a></td>
              </tr>
              ${cleanPhone ? `
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Teléfono:</td>
                <td style="padding: 8px 0;"><a href="tel:${cleanPhone}" style="color: #34d399; text-decoration: none;">${cleanPhone}</a></td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Servicio:</td>
                <td style="padding: 8px 0; color: #fbbf24; font-weight: 500;">${cleanServiceLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Fecha / Hora:</td>
                <td style="padding: 8px 0; color: #71717a;">${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa;">Mensaje del Cliente:</h3>
            <div style="background: #18181b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #e4e4e7; white-space: pre-wrap;">
${cleanMessage}
            </div>
          </div>

          <div style="text-align: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);">
            <a href="mailto:${cleanEmail}?subject=Re:%20${encodeURIComponent(cleanServiceLabel)}%20-%20Cristian%20Jiménez" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Responder al Cliente Directamente →
            </a>
          </div>
        </div>
      `;

      try {
        await MailerService.sendEmail({
          to: 'cristianjimeneztrabajo@gmail.com',
          from: 'Bentian Lead Tracker <soporte@cristianjm.com>',
          subject: `🚨 [Nuevo Lead] ${cleanName} - ${cleanServiceLabel}`,
          html: adminNotificationHtml,
          text: `Nuevo lead de ${cleanSource}:\nNombre: ${cleanName}\nEmail: ${cleanEmail}\nTel: ${cleanPhone || 'No facilitado'}\nServicio: ${cleanServiceLabel}\nMensaje:\n${cleanMessage}`,
        });
      } catch (mailErr: any) {
        logger.error('Error al notificar lead por email:', mailErr.message);
      }

      // 3. Confirmación automática de cortesía al remitente
      const autoresponderHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #09090b; color: #f4f4f5; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
          <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px;">Hemos recibido tu consulta</h2>
          <p style="font-size: 14px; color: #d4d4d8; line-height: 1.6; margin-bottom: 16px;">
            Hola <strong>${cleanName}</strong>,
          </p>
          <p style="font-size: 14px; color: #d4d4d8; line-height: 1.6; margin-bottom: 16px;">
            Gracias por ponerte en contacto. He recibido correctamente tu mensaje sobre <strong>${cleanServiceLabel}</strong>.
          </p>
          <p style="font-size: 14px; color: #d4d4d8; line-height: 1.6; margin-bottom: 24px;">
            Revisaré los detalles técnicos de tu solicitud personalmente y me pondré en contacto contigo a la mayor brevedad (habitualmente en menos de 24 horas laborables).
          </p>
          <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; font-size: 13px; color: #a1a1aa;">
            <p style="margin: 0; font-weight: 600; color: #ffffff;">Cristian Jiménez Martínez</p>
            <p style="margin: 2px 0 0 0;">Arquitecto de Software & Consultor ERP · Bentian ERP Bridge</p>
            <p style="margin: 2px 0 0 0;"><a href="https://cristianjm.com" style="color: #818cf8; text-decoration: none;">cristianjm.com</a> | <a href="https://bridge.cristianjm.com" style="color: #818cf8; text-decoration: none;">bridge.cristianjm.com</a></p>
          </div>
        </div>
      `;

      try {
        await MailerService.sendEmail({
          to: cleanEmail,
          from: 'Cristian Jiménez Martínez <soporte@cristianjm.com>',
          subject: 'Hemos recibido tu solicitud - Cristian Jiménez Martínez',
          html: autoresponderHtml,
          text: `Hola ${cleanName},\n\nGracias por tu mensaje sobre ${cleanServiceLabel}. He recibido tu solicitud y me pondré en contacto contigo en menos de 24 horas laborables.\n\nUn saludo,\nCristian Jiménez Martínez\nhttps://cristianjm.com`,
        });
      } catch (_autoErr) {
        // Fallo no bloqueante del acuse de recibo
      }

      return res.status(200).json({
        success: true,
        message: '¡Mensaje recibido con éxito! Te responderé en menos de 24 horas laborables.',
      });
    } catch (err: any) {
      logger.error('Error procesando formulario de contacto:', err.message);
      return next(err);
    }
  }
);
