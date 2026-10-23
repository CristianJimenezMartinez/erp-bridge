import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { DatabaseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { MailerService } from '../services/mailer.service';
import { rateLimit } from '../middleware/rate-limit';
import { handleDomainAudit } from './domain-audit.handler';

export const contactRouter = Router();
const logger = new Logger('ContactRouter');

const SERVICE_LABELS: Record<string, string> = {
  'audit-remediation': 'Diagnóstico de Seguridad y Blindaje de Servidor (Auditoría Web)',
  'plan-cloud-200': 'Plan 200 €/mes — Blindaje Cloud, GitHub CI/CD & Parcheo Seguridad (Node/PHP)',
  'plan-erp-350': 'Plan 350 €/mes — Operativa Total: Cloud Blindado + E-Commerce + ERP 24/7',
  'plan-partner-500': 'Plan 500 €/mes — Partner Tecnológico, Evolución Continua & CTO Externo',
  'factusol-bridge': 'Bentian ERP Bridge / Integración Factusol con WooCommerce o PrestaShop',
  'custom-software': 'Desarrollo de Software a Medida, IA Documental o App/TPV',
  'verifactu-audit': 'Auditoría Técnica y Adaptación Veri*Factu (RD 1007/2023)',
  'erp-rescue': 'Rescate y Optimización de Integración ERP Caída (<24h)',
  'software-architecture': 'Arquitectura Cloud, NestJS & Microservicios',
  'consulting': 'Consultoría Técnica & Auditoría ERP',
  'other': 'Otro asunto o propuesta personalizada',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

contactRouter.post(
  ['/audit-domain', '/api/v1/audit-domain'],
  rateLimit({
    name: 'domain-audit',
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Has realizado varios diagnósticos seguidos. Espera unos minutos o escríbenos directamente.',
  }),
  handleDomainAudit
);

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
      const { name, email, phone, website, service, message, source } = req.body as {
        name?: string;
        email?: string;
        phone?: string;
        website?: string;
        service?: string;
        message?: string;
        source?: string;
      };

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: { message: 'El nombre o empresa es obligatorio (mínimo 2 caracteres).' } });
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
      const cleanWebsite = website ? String(website).trim() : null;
      const cleanServiceKey = service ? String(service).trim() : 'general';
      const cleanServiceLabel = SERVICE_LABELS[cleanServiceKey] || cleanServiceKey;
      const cleanMessage = cleanWebsite ? `[Dominio Web: ${cleanWebsite}]\n\n${message.trim()}` : message.trim();
      const cleanSource = source ? String(source).trim() : 'web';
      const leadId = `lead_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || req.ip || null;
      const clientUserAgent = (req.headers['user-agent'] as string) || null;

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

      const safeName = escapeHtml(cleanName);
      const safeEmail = escapeHtml(cleanEmail);
      const safePhone = cleanPhone ? escapeHtml(cleanPhone) : '';
      const safeWebsite = cleanWebsite ? escapeHtml(cleanWebsite) : '';
      const safeServiceLabel = escapeHtml(cleanServiceLabel);
      const safeSource = escapeHtml(cleanSource);
      const safeMessage = escapeHtml(cleanMessage);

      const adminNotificationHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #f4f4f5; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
            <div>
              <h2 style="margin: 0; font-size: 18px; color: #ffffff;">Nuevo Lead Empresarial B2B</h2>
              <span style="font-size: 12px; color: #a1a1aa;">Origen: <strong>${safeSource}</strong></span>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; width: 120px;">Nombre/Empresa:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${safeEmail}" style="color: #34d399; text-decoration: none;">${safeEmail}</a></td>
              </tr>
              ${safePhone ? `<tr><td style="padding: 8px 0; color: #a1a1aa;">Teléfono:</td><td style="padding: 8px 0;"><a href="tel:${safePhone}" style="color: #34d399; font-weight: 600; text-decoration: none;">${safePhone}</a></td></tr>` : ''}
              ${safeWebsite ? `<tr><td style="padding: 8px 0; color: #a1a1aa;">Dominio Web:</td><td style="padding: 8px 0; color: #ffffff; font-family: monospace;">${safeWebsite}</td></tr>` : ''}
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Servicio/Plan:</td>
                <td style="padding: 8px 0; color: #fbbf24; font-weight: 600;">${safeServiceLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Fecha / Hora:</td>
                <td style="padding: 8px 0; color: #71717a;">${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa;">Detalles del Proyecto / Auditoría:</h3>
            <div style="background: #18181b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; color: #e4e4e7; white-space: pre-wrap;">${safeMessage}</div>
          </div>

          <div style="text-align: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);">
            <a href="mailto:${safeEmail}?subject=Re:%20${encodeURIComponent(cleanServiceLabel)}%20-%20Cristian%20Jiménez" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Responder al Cliente Directamente
            </a>
          </div>
        </div>
      `;

      try {
        await MailerService.sendEmail({
          to: 'cristianjimeneztrabajo@gmail.com',
          from: 'Bentian Lead Tracker <soporte@cristianjm.com>',
          subject: `[Lead B2B] ${safeName} — ${safeServiceLabel}`,
          html: adminNotificationHtml,
          text: `Nuevo lead de ${cleanSource}:\nNombre: ${cleanName}\nEmail: ${cleanEmail}\nTel: ${cleanPhone || 'No facilitado'}\nWeb: ${cleanWebsite || 'No facilitada'}\nServicio: ${cleanServiceLabel}\nMensaje:\n${cleanMessage}`,
        });
      } catch (mailErr: any) {
        logger.error('Error al notificar lead por email:', mailErr.message);
      }

      const autoresponderHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #09090b; color: #f4f4f5; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
          <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px;">Hemos recibido tu solicitud</h2>
          <p style="font-size: 14px; color: #d4d4d8; line-height: 1.6; margin-bottom: 16px;">Hola <strong>${safeName}</strong>,</p>
          <p style="font-size: 14px; color: #d4d4d8; line-height: 1.6; margin-bottom: 16px;">
            He recibido correctamente tu solicitud sobre <strong>${safeServiceLabel}</strong>.
          </p>
          <p style="font-size: 14px; color: #d4d4d8; line-height: 1.6; margin-bottom: 24px;">
            Revisaré personalmente los detalles técnicos de tu empresa y me pondré en contacto contigo en menos de 24 horas laborables (también puedes escribirme directamente por WhatsApp o teléfono al +34 617 205 053).
          </p>
          <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; font-size: 13px; color: #a1a1aa;">
            <p style="margin: 0; font-weight: 600; color: #ffffff;">Cristian Jiménez Martínez</p>
            <p style="margin: 2px 0 0 0;">Arquitecto de Software, Ciberseguridad &amp; Sistemas ERP</p>
            <p style="margin: 4px 0 0 0;"><a href="https://cristianjm.com" style="color: #34d399; text-decoration: none;">cristianjm.com</a> · Tel. +34 617 205 053</p>
          </div>
        </div>
      `;

      try {
        await MailerService.sendEmail({
          to: cleanEmail,
          from: 'Cristian Jiménez Martínez <soporte@cristianjm.com>',
          subject: 'Confirmación de solicitud técnica — Cristian Jiménez Martínez',
          html: autoresponderHtml,
          text: `Hola ${cleanName},\n\nHe recibido tu solicitud sobre ${cleanServiceLabel}. Me pondré en contacto contigo en menos de 24 horas laborables.\n\nUn saludo,\nCristian Jiménez Martínez\nhttps://cristianjm.com | +34 617 205 053`,
        });
      } catch (_autoErr) {}

      return res.status(200).json({
        success: true,
        message: 'Solicitud recibida correctamente. Te responderé en menos de 24 horas laborables.',
      });
    } catch (err: any) {
      logger.error('Error procesando formulario de contacto:', err.message);
      return next(err);
    }
  }
);
