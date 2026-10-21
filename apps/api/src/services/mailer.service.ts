import tls from 'tls';
import net from 'net';
import { Logger } from '@erp-bridge/shared';
import { getLatestReleasedVersion, getLatestInstallerUrl } from '../utils/version.util';

export interface EmailOptions {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface LicenseWelcomeEmailData {
  customerEmail: string;
  licenseKey: string;
  planName?: string;
  alias?: string;
  downloadUrl?: string;
  dashboardUrl?: string;
  companyName?: string;
}

export interface LoginOtpEmailData {
  email: string;
  otp: string;
  validityMinutes?: number;
  dashboardUrl?: string;
}

export interface LicenseReminderEmailData {
  email: string;
  licenses: Array<{
    key: string;
    plan?: string;
    alias?: string;
    status: string;
    expiresAt?: string | null;
  }>;
  dashboardUrl?: string;
}

export interface PaymentFailedEmailData {
  email: string;
  planName?: string;
  updatePaymentUrl?: string;
  gracePeriodDays?: number;
}

export interface SubscriptionCanceledEmailData {
  email: string;
  planName?: string;
  effectiveDate: string;
  reactivateUrl?: string;
}

export interface BrandedEmailParams {
  title: string;
  badgeText: string;
  badgeType: 'success' | 'indigo' | 'warning' | 'danger';
  contentHtml: string;
  footerNote?: string;
  previewText?: string;
}

/**
 * MailerService — Despachador de correos transaccionales con diseño corporativo oficial.
 * 
 * Estrategias de envío soportadas (por orden de prioridad):
 * 1. Resend API (3.000 emails/mes GRATIS de por vida) -> Variable: RESEND_API_KEY
 * 2. Brevo / Sendinblue (300 emails/día GRATIS) -> Variable: BREVO_API_KEY
 * 3. Servidor SMTP propio de Plesk/cPanel/Hosting (100% GRATIS) -> Variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * 4. Modo Simulación / Log (Fallback seguro para desarrollo sin romper pagos)
 */
export class MailerService {
  private static readonly logger = new Logger('MailerService');
  private static readonly LOGO_URL = 'https://bridge.cristianjm.com/assets/icon.png';
  private static readonly DASHBOARD_BASE = 'https://bridge.cristianjm.com/dashboard/';
  private static readonly SUPPORT_EMAIL = 'soporte@cristianjm.com';

  /**
   * Genera un botón CTA con HTML a prueba de balas para compatibilidad 100% con
   * Microsoft Outlook (Word engine), Gmail móvil y clientes web modernos.
   */
  public static renderButton(text: string, href: string, variant: 'indigo' | 'amber' = 'indigo'): string {
    const isAmber = variant === 'amber';
    const bg = isAmber ? '#f59e0b' : '#4f46e5';
    const border = isAmber ? '#d97706' : '#6366f1';
    const color = isAmber ? '#09090b' : '#ffffff';

    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" bgcolor="${bg}" style="border-radius: 9px; background-color: ${bg};">
                  <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: ${color}; text-decoration: none; border-radius: 9px; background-color: ${bg}; border: 1px solid ${border}; text-align: center; line-height: 1.2;">
                    ${text}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `.trim();
  }

  /**
   * Generador de plantilla HTML corporativa con logotipo oficial, diseño responsive
   * y compatibilidad probada con Gmail, Outlook, Apple Mail y clientes móviles.
   */
  public static renderBrandedEmail(params: BrandedEmailParams): string {
    const badgeColors: Record<string, { bg: string; border: string; text: string }> = {
      success: { bg: '#064e3b', border: '#059669', text: '#34d399' },
      indigo:  { bg: '#1e1b4b', border: '#4338ca', text: '#a5b4fc' },
      warning: { bg: '#451a03', border: '#d97706', text: '#fbbf24' },
      danger:  { bg: '#450a0a', border: '#dc2626', text: '#f87171' },
    };

    const defaultBadge = { bg: '#1e1b4b', border: '#4338ca', text: '#a5b4fc' };
    const badge = badgeColors[params.badgeType] || defaultBadge;

    return `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>${params.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <div style="display: none; font-size: 1px; color: #09090b; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${params.previewText || params.title}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #09090b; padding: 36px 12px; margin: 0; width: 100%;">
    <tr>
      <td align="center" valign="top">
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" border="0" style="width: 600px;">
          <tr>
            <td>
        <![endif]-->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #121216; border: 1px solid #27272a; border-radius: 14px; overflow: hidden;">
          
          <!-- CABECERA CON LOGOTIPO OFICIAL BENTIAN -->
          <tr>
            <td style="padding: 24px 30px; background-color: #18181f; border-bottom: 1px solid #27272a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${this.LOGO_URL}" width="38" height="38" alt="Bentian Logo" style="display: block; width: 38px; height: 38px; border-radius: 8px; border: 1px solid #3f3f46;" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Bentian <span style="font-size: 13px; color: #818cf8; font-weight: 600; margin-left: 4px;">ERP Bridge</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="right">
                      <tr>
                        <td bgcolor="${badge.bg}" style="background-color: ${badge.bg}; border: 1px solid ${badge.border}; border-radius: 6px; padding: 5px 12px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; font-weight: 700; color: ${badge.text}; letter-spacing: 0.5px; text-transform: uppercase;">
                          ${params.badgeText}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTENIDO ESPECÍFICO DEL MENSAJE -->
          <tr>
            <td style="padding: 32px 30px 28px 30px; background-color: #121216; color: #f4f4f5; font-size: 14px; line-height: 1.6;">
              ${params.contentHtml}
            </td>
          </tr>

          <!-- PIE CORPORATIVO Y TITULARIDAD LEGAL -->
          <tr>
            <td style="padding: 24px 30px; background-color: #0d0d11; border-top: 1px solid #27272a; font-size: 12px; color: #71717a; text-align: center; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <p style="margin: 0 0 6px 0; color: #a1a1aa; font-weight: 600;">
                Bentian ERP Bridge - Conector Autónomo y Local-First para Factusol
              </p>
              <p style="margin: 0 0 8px 0;">
                Plataforma oficial: <a href="https://bridge.cristianjm.com" target="_blank" style="color: #818cf8; text-decoration: underline;">bridge.cristianjm.com</a> | Titular: Cristian Jiménez Martínez
              </p>
              <p style="margin: 0;">
                ¿Dudas o soporte técnico? Responde directamente a este correo o escríbenos a <a href="mailto:${this.SUPPORT_EMAIL}" style="color: #818cf8; text-decoration: underline;">${this.SUPPORT_EMAIL}</a>
              </p>
              ${params.footerNote ? `<p style="margin: 12px 0 0 0; font-size: 11px; color: #52525b;">${params.footerNote}</p>` : ''}
            </td>
          </tr>

        </table>
        <!--[if (gte mso 9)|(IE)]>
            </td>
          </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Convierte HTML a texto plano limpio reemplazando entidades HTML (&rarr;, &bull;, &copy;, &nbsp;)
   * y caracteres fuera de Latin-1 (⇄, ↔, —) por equivalentes ASCII limpios antes de eliminar etiquetas.
   */
  private static sanitizePlainText(input: string, isHtmlFallback = false): string {
    let out = input
      .replace(/&rarr;|&#8594;|&#x2192;/gi, '->')
      .replace(/&larr;|&#8592;|&#x2190;/gi, '<-')
      .replace(/&bull;|&#8226;|&#x2022;/gi, '*')
      .replace(/&copy;|&#169;|&#xa9;/gi, '(c)')
      .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
      .replace(/&mdash;|&#8212;|&#x2014;/gi, '-')
      .replace(/&ndash;|&#8211;|&#x2013;/gi, '-')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/[⇄↔]/g, '-')
      .replace(/[—–]/g, '-');

    if (isHtmlFallback) {
      out = out
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]*>?/gm, '');
    }

    return out;
  }

  public static async sendEmail(options: EmailOptions): Promise<{ success: boolean; provider: string; error?: string }> {
    if (process.env['NODE_ENV'] === 'test' || process.env['DISABLE_MAILING'] === 'true') {
      this.logger.info(`[TEST MODE] Email omitido en pruebas a ${options.to}: ${options.subject}`);
      return { success: true, provider: 'mock' };
    }

    const from = options.from || process.env['MAIL_FROM'] || process.env['SMTP_FROM'] || 'Bentian ERP Bridge <soporte@cristianjm.com>';
    const cleanSubject = this.sanitizePlainText(options.subject, false);
    const cleanText = options.text
      ? this.sanitizePlainText(options.text, false)
      : this.sanitizePlainText(options.html, true);

    // 1. Prioridad: Resend API (Gratis 3.000 emails/mes de por vida)
    const resendKey = process.env['RESEND_API_KEY'];
    if (resendKey && resendKey.startsWith('re_')) {
      try {
        this.logger.info(`Enviando email a ${options.to} vía Resend API...`);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            from,
            to: options.to,
            subject: cleanSubject,
            html: options.html,
            text: cleanText,
            ...(options.replyTo ? { reply_to: options.replyTo } : {}),
          }),
        });

        const data = (await res.json()) as any;
        if (res.ok) {
          this.logger.info(`✓ Email despachado exitosamente con Resend. ID: ${data?.id}`);
          return { success: true, provider: 'resend' };
        } else {
          this.logger.warn(`Resend API devolvió error: ${data?.message || JSON.stringify(data)}`);
        }
      } catch (err: any) {
        this.logger.error('Error al conectar con Resend API:', err.message);
      }
    }

    // 2. Prioridad: Brevo / Sendinblue API (Gratis 300 emails/día)
    const brevoKey = process.env['BREVO_API_KEY'];
    if (brevoKey) {
      try {
        this.logger.info(`Enviando email a ${options.to} vía Brevo API...`);
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            sender: { email: from.includes('<') ? from.replace(/.*<([^>]+)>.*/, '$1') : from, name: 'Bentian ERP Bridge' },
            to: [{ email: options.to }],
            subject: cleanSubject,
            htmlContent: options.html,
            textContent: cleanText,
          }),
        });

        if (res.ok) {
          this.logger.info(`✓ Email despachado exitosamente con Brevo.`);
          return { success: true, provider: 'brevo' };
        }
      } catch (err: any) {
        this.logger.error('Error al conectar con Brevo API:', err.message);
      }
    }

    // 3. Prioridad: Servidor SMTP Propio de Plesk / Hosting (100% GRATIS)
    const smtpHost = process.env['SMTP_HOST'];
    const smtpUser = process.env['SMTP_USER'];
    const smtpPass = process.env['SMTP_PASS'];
    const smtpPort = parseInt(process.env['SMTP_PORT'] || '465', 10);

    if (smtpHost && smtpUser && smtpPass) {
      try {
        this.logger.info(`Enviando email a ${options.to} vía SMTP nativo (${smtpHost}:${smtpPort})...`);
        await this.sendViaSmtpSocket({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          from,
          to: options.to,
          subject: cleanSubject,
          html: options.html,
          text: cleanText,
        });
        this.logger.info(`✓ Email despachado exitosamente vía SMTP propio.`);
        return { success: true, provider: 'native_smtp' };
      } catch (err: any) {
        this.logger.error(`Error en conexión SMTP directa con ${smtpHost}:`, err.message);
      }
    }

    // 4. Fallback Seguro / Modo Simulación Local
    this.logger.info(`[SIMULADOR EMAIL] No hay SMTP_HOST ni RESEND_API_KEY configurados.`);
    this.logger.info(`[SIMULADOR EMAIL] Correo para: ${options.to}`);
    this.logger.info(`[SIMULADOR EMAIL] Asunto: ${cleanSubject}`);
    return { success: true, provider: 'simulation' };
  }

  /**
   * CASO 1: Envía el código de acceso temporal (OTP) de 6 dígitos para el inicio de sesión.
   */
  public static async sendLoginOtpEmail(data: LoginOtpEmailData): Promise<boolean> {
    const validity = data.validityMinutes || 10;
    const dashboardUrl = data.dashboardUrl || this.DASHBOARD_BASE;
    const subject = `Tu código de acceso a Bentian ERP Bridge: ${data.otp}`;

    const text = [
      '====================================================================',
      ' BENTIAN ERP BRIDGE - CÓDIGO DE ACCESO',
      '====================================================================',
      '',
      'Has solicitado entrar a tu Panel de Control de Bentian ERP Bridge para consultar',
      'tus licencias de Factusol, facturas y descargas.',
      '',
      'TU CÓDIGO DE ACCESO DE 6 DÍGITOS:',
      `>>> ${data.otp} <<<`,
      '',
      `* Este código es válido durante ${validity} minutos y para un único acceso.`,
      '',
      'Puedes introducir este código directamente en:',
      `${dashboardUrl}`,
      '',
      'AVISO DE SEGURIDAD:',
      'Si tú no has solicitado este código, puedes ignorar este mensaje con tranquilidad;',
      'nadie puede acceder a tus licencias sin este código.',
      '',
      '---',
      'Bentian ERP Bridge - Tecnología Local-First para Factusol',
      `Soporte técnico: ${this.SUPPORT_EMAIL}`,
    ].join('\n');

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        Tu código de verificación de acceso
      </h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Has solicitado iniciar sesión en tu Panel de Control de <strong>Bentian ERP Bridge</strong>. Introduce el siguiente código de 6 dígitos para acceder a tus licencias y configuración:
      </p>

      <!-- CAJA DESTACADA DEL CÓDIGO OTP -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #161622; border: 1px solid #4338ca; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px; text-align: center;">
            <div style="font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">
              Código de Verificación Temporal
            </div>
            <div style="background-color: #0b0b10; border: 1px dashed #6366f1; border-radius: 8px; padding: 14px 20px; display: inline-block;">
              <div style="font-size: 34px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-weight: 800; color: #ffffff; letter-spacing: 8px; user-select: all; -webkit-user-select: all; line-height: 1;">
                ${data.otp}
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- BOTÓN DIRECTO AL PANEL (BULLETPROOF) -->
      ${this.renderButton('Abrir Pantalla de Inicio de Sesión &rarr;', dashboardUrl, 'indigo')}

      <!-- AVISO DE CADUCIDAD Y SEGURIDAD -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #16161d; border: 1px solid #27272a; border-radius: 10px; margin-top: 10px;">
        <tr>
          <td style="padding: 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="26" valign="top" style="font-size: 16px; vertical-align: top; padding-right: 8px;">*</td>
                <td style="font-size: 12px; line-height: 1.5; color: #a1a1aa; vertical-align: top;">
                  Este código caduca automáticamente en <strong>${validity} minutos</strong> y quedará invalidado tras su primer uso.
                </td>
              </tr>
              <tr>
                <td width="26" valign="top" style="font-size: 16px; vertical-align: top; padding-top: 8px; padding-right: 8px;">*</td>
                <td style="font-size: 12px; line-height: 1.5; color: #71717a; vertical-align: top; padding-top: 8px;">
                  Si no has solicitado este acceso, no te preocupes: nadie puede acceder a tu cuenta sin este código. Puedes ignorar este correo con total tranquilidad.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'CÓDIGO DE ACCESO',
      badgeType: 'indigo',
      contentHtml,
      previewText: `Tu código de verificación de acceso es ${data.otp}. Válido durante ${validity} minutos.`,
      footerNote: 'Este correo ha sido generado de forma automática por el sistema de seguridad de Bentian.',
    });

    const result = await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });

    return result.success;
  }

  /**
   * CASO 2: Envía el correo de bienvenida y entrega inmediata de licencia tras completarse el registro o pago.
   * Personaliza el tono automáticamente si se trata de la Beta Pública Gratuita o de un cliente de pago.
   */
  public static async sendLicenseWelcomeEmail(data: LicenseWelcomeEmailData): Promise<boolean> {
    const latestVersion = getLatestReleasedVersion();
    const downloadUrl = data.downloadUrl || ('https://bridge.cristianjm.com' + getLatestInstallerUrl());
    const dashboardUrl = data.dashboardUrl || `${this.DASHBOARD_BASE}?key=${encodeURIComponent(data.licenseKey)}`;
    const planLabel = (data.planName || 'Plan Base Todo Incluido (Factusol y SimplyGest - Tienda Web)').replace(/[⇄↔]/g, '-');

    const isBeta = Boolean(
      (data.planName && /beta/i.test(data.planName)) ||
      (data.alias && /beta/i.test(data.alias))
    );

    const subject = isBeta
      ? `[Bentian ERP Bridge] Clave de Activación de tu Beta Gratuita: ${data.licenseKey}`
      : `[Bentian ERP Bridge] Tu Clave de Activación: ${data.licenseKey}`;

    const text = isBeta ? [
      '====================================================================',
      ' ¡BIENVENIDO A LA BETA DE BENTIAN ERP BRIDGE!',
      '====================================================================',
      '',
      'Hola,',
      '¡Enhorabuena! Tu acceso gratuito hasta el 31 de Diciembre de 2026 está listo.',
      'Ya puedes conectar tu base de datos de Factusol con tu tienda online.',
      '',
      'TU CLAVE DE ACTIVACIÓN DE LA BETA:',
      `>>> ${data.licenseKey} <<<`,
      '',
      'Modalidad: Acceso Beta Público Gratuito (Hasta 31/12/2026)',
      `Servidor Asignado: ${data.alias || 'Servidor Factusol Principal'}`,
      ...(data.companyName ? [`Empresa / Comercio: ${data.companyName}`] : []),
      '',
      'PASOS PARA CONECTAR TU FACTUSOL EN 60 SEGUNDOS:',
      `1. Descarga el instalador del Agente Bentian (v${latestVersion}):`,
      `   ${downloadUrl}`,
      '2. Ejecuta el instalador en el equipo con acceso a la base de datos de Factusol (.accdb local o en red).',
      `3. Pega tu clave de activación (${data.licenseKey}) cuando te la solicite el asistente.`,
      '4. ¡Listo! El agente sincronizará existencias, catálogo y pedidos en segundo plano.',
      '',
      'ACCESO DIRECTO A TU PANEL DE CONTROL:',
      `${dashboardUrl}`,
      '',
      'GUÍA OFICIAL DE INSTALACIÓN Y WINDOWS DEFENDER / SMARTSCREEN:',
      'https://bridge.cristianjm.com/docs/seguridad/antivirus-edr-smartscreen/',
      '',
      `¿Necesitas soporte técnico? Responde a este correo o escríbenos a ${this.SUPPORT_EMAIL}.`,
      '',
      '---',
      'Bentian ERP Bridge - Tecnología Local-First y Edge Processing',
    ].join('\n') : [
      '====================================================================',
      ' ¡BIENVENIDO A BENTIAN ERP BRIDGE!',
      '====================================================================',
      '',
      'Hola,',
      'Gracias por confiar en Bentian ERP Bridge. Tu suscripción está activa y confirmada.',
      '',
      'TU CLAVE DE ACTIVACIÓN OFICIAL:',
      `>>> ${data.licenseKey} <<<`,
      '',
      `Plan Contratado: ${planLabel}`,
      `Servidor Asignado: ${data.alias || 'Servidor Factusol Principal'}`,
      ...(data.companyName ? [`Empresa / Comercio: ${data.companyName}`] : []),
      '',
      'PASOS PARA CONECTAR TU FACTUSOL EN 60 SEGUNDOS:',
      `1. Descarga el instalador del Agente Bentian (v${latestVersion}):`,
      `   ${downloadUrl}`,
      '2. Ejecuta el instalador en el equipo con acceso a la base de datos de Factusol (.accdb local o en red).',
      `3. Pega tu clave de activación (${data.licenseKey}) cuando te la solicite el asistente.`,
      '4. ¡Listo! El agente sincronizará existencias, catálogo y pedidos en segundo plano.',
      '',
      'ACCESO DIRECTO A TU PANEL DE CONTROL Y FACTURACIÓN:',
      `${dashboardUrl}`,
      '',
      'GUÍA RÁPIDA DE INSTALACIÓN Y WINDOWS DEFENDER / SMARTSCREEN:',
      'https://bridge.cristianjm.com/docs/seguridad/antivirus-edr-smartscreen/',
      '',
      `¿Necesitas soporte técnico? Responde a este correo o escríbenos a ${this.SUPPORT_EMAIL}.`,
      '',
      '---',
      'Bentian ERP Bridge - Tecnología Local-First y Edge Processing',
    ].join('\n');

    const badgeText = isBeta ? 'BETA PÚBLICA 2026' : 'LICENCIA ACTIVA';
    const heading = isBeta
      ? '¡Bienvenido a la Beta de Bentian ERP Bridge!'
      : '¡Tu software está listo para conectar!';

    const introHtml = isBeta
      ? '¡Enhorabuena! Tu acceso gratuito hasta el <strong>31 de Diciembre de 2026</strong> está listo. Ya puedes sincronizar tu base de datos de Factusol con tu tienda online (WooCommerce, PrestaShop o Shopify) con todas las características profesionales activadas:'
      : `Muchas gracias por tu compra. Ya hemos configurado tu suscripción a <strong>${planLabel}</strong>. A continuación tienes tu clave de activación personal para vincular el software con tu base de datos de Factusol:`;

    const keyBoxLabel = isBeta
      ? 'CLAVE DE ACCESO BETA (HASTA 31/12/2026)'
      : 'CLAVE DE LICENCIA OFICIAL';

    const validezLabel = isBeta
      ? 'Hasta 31/12/2026 (Acceso Gratuito Completo)'
      : 'Suscripción Activa y Confirmada';

    const contentHtml = `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        ${heading}
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        ${introHtml}
      </p>

      <!-- CAJA DE CLAVE DE ACTIVACIÓN -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #161622; border: 1px solid #4338ca; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 22px 24px; text-align: center;">
            <div style="font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px;">
              ${keyBoxLabel}
            </div>
            <div style="background-color: #0b0b10; border: 1px dashed #6366f1; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px;">
              <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; word-break: break-all; -webkit-user-select: all; user-select: all;">
                ${data.licenseKey}
              </div>
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 12px; color: #a1a1aa; line-height: 1.5;">
              <tr>
                <td align="left" style="color: #71717a; padding: 2px 0;">
                  Servidor: <strong style="color: #e4e4e7;">${data.alias || 'Servidor Factusol Principal'}</strong>
                </td>
                <td align="right" style="color: #71717a; padding: 2px 0;">
                  Validez: <strong style="color: ${isBeta ? '#34d399' : '#818cf8'};">${validezLabel}</strong>
                </td>
              </tr>
              ${data.companyName ? `
              <tr>
                <td colspan="2" align="left" style="color: #71717a; padding-top: 6px; border-top: 1px solid #27272a; margin-top: 4px;">
                  Comercio / Titular: <strong style="color: #e4e4e7;">${data.companyName}</strong>
                </td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      </table>

      <!-- BOTÓN DE DESCARGA PRIMARIO (A PRUEBA DE BALAS) -->
      ${this.renderButton(`Descargar Bentian Agent para Windows (v${latestVersion}) &rarr;`, downloadUrl, 'indigo')}

      <!-- GUÍA RÁPIDA DE 3 PASOS -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #16161d; border: 1px solid #27272a; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px 22px;">
            <div style="font-size: 12px; font-weight: 700; color: #e4e4e7; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px;">
              🚀 Puesta en marcha en 3 sencillos pasos (60 segundos):
            </div>

            <!-- Paso 1 -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
              <tr>
                <td width="34" valign="top" style="padding-right: 12px; vertical-align: top;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" valign="middle" bgcolor="#1e1b4b" style="width: 28px; height: 28px; border-radius: 7px; background-color: #1e1b4b; border: 1px solid #4338ca; color: #a5b4fc; font-weight: 800; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        1
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="font-size: 13px; line-height: 1.5; color: #a1a1aa; vertical-align: top;">
                  <strong style="color: #ffffff; display: block; margin-bottom: 2px;">Instala el agente en tu equipo</strong>
                  Ejecuta el instalador en el PC o servidor donde tengas acceso a tu base de datos de Factusol (archivo <code>.accdb</code> local o en red).
                </td>
              </tr>
            </table>

            <!-- Paso 2 -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
              <tr>
                <td width="34" valign="top" style="padding-right: 12px; vertical-align: top;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" valign="middle" bgcolor="#1e1b4b" style="width: 28px; height: 28px; border-radius: 7px; background-color: #1e1b4b; border: 1px solid #4338ca; color: #a5b4fc; font-weight: 800; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        2
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="font-size: 13px; line-height: 1.5; color: #a1a1aa; vertical-align: top;">
                  <strong style="color: #ffffff; display: block; margin-bottom: 2px;">Introduce tu clave de activación</strong>
                  Pega tu clave <code style="background-color: #27272a; border: 1px solid #3f3f46; padding: 2px 6px; border-radius: 4px; color: #e4e4e7; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px;">${data.licenseKey}</code> en el asistente de bienvenida para vincular el software.
                </td>
              </tr>
            </table>

            <!-- Paso 3 -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="34" valign="top" style="padding-right: 12px; vertical-align: top;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" valign="middle" bgcolor="#1e1b4b" style="width: 28px; height: 28px; border-radius: 7px; background-color: #1e1b4b; border: 1px solid #4338ca; color: #a5b4fc; font-weight: 800; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        3
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="font-size: 13px; line-height: 1.5; color: #a1a1aa; vertical-align: top;">
                  <strong style="color: #ffffff; display: block; margin-bottom: 2px;">¡Sincronización en marcha!</strong>
                  El agente conectará de forma autónoma con tu tienda web (WooCommerce, PrestaShop o Shopify) para sincronizar existencias, catálogo y pedidos en segundo plano.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- ENLACES DE GESTIÓN Y PANEL -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="text-align: center;">
        <tr>
          <td style="font-size: 13px; color: #71717a; line-height: 1.6;">
            <p style="margin: 0 0 10px 0;">
              Consulta tus licencias, métricas y configuración en cualquier momento desde:<br>
              <a href="${dashboardUrl}" target="_blank" style="color: #818cf8; text-decoration: underline; font-weight: 600;">
                Acceder a mi Panel de Control de Bentian &rarr;
              </a>
            </p>
            <p style="margin: 0; font-size: 12px; color: #52525b;">
              ¿Dudas durante la instalación o aviso de Windows SmartScreen? <a href="https://bridge.cristianjm.com/docs/seguridad/antivirus-edr-smartscreen/" target="_blank" style="color: #a1a1aa; text-decoration: underline;">Consulta nuestra Guía Oficial de Seguridad y Antivirus</a>.
            </p>
          </td>
        </tr>
      </table>
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText,
      badgeType: 'success',
      contentHtml,
      previewText: isBeta
        ? `¡Bienvenido a la Beta de Bentian ERP Bridge! Tu clave de activación es ${data.licenseKey}.`
        : `Tu software está listo. Tu clave de activación oficial es ${data.licenseKey}.`,
    });

    const result = await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text,
    });

    return result.success;
  }

  /**
   * CASO 3: Recordatorio y recuperación de todas las claves de licencia activas asociadas a un correo.
   */
  public static async sendLicenseReminderEmail(data: LicenseReminderEmailData): Promise<boolean> {
    const dashboardUrl = data.dashboardUrl || this.DASHBOARD_BASE;
    const subject = `Tus claves de licencia activas — Bentian ERP Bridge`;

    const licenseRowsText = data.licenses.map((lic, i) => {
      return `${i + 1}. Clave: ${lic.key} | Plan: ${lic.plan || 'Base'} | Estado: ${lic.status.toUpperCase()} | Servidor: ${lic.alias || 'Principal'}`;
    }).join('\n');

    const text = [
      '====================================================================',
      ' BENTIAN ERP BRIDGE — RECORDATORIO DE LICENCIAS',
      '====================================================================',
      '',
      'Hola,',
      `Aquí tienes el listado de claves de licencia activas asociadas a tu correo (${data.email}):`,
      '',
      licenseRowsText,
      '',
      'ACCESO A TU PANEL DE CONTROL:',
      `${dashboardUrl}`,
      '',
      'Para activar el software en tu equipo, descarga el instalador e introduce cualquiera de estas claves:',
      'https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe',
      '',
      '---',
      'Bentian ERP Bridge — Soporte: soporte@cristianjm.com',
    ].join('\n');

    const licenseCardsHtml = data.licenses.map((lic) => {
      const isAct = lic.status.toLowerCase() === 'active';
      const statusColor = isAct ? '#34d399' : '#f87171';
      const statusBg = isAct ? '#064e3b' : '#450a0a';
      const statusBorder = isAct ? '#059669' : '#dc2626';
      const directLogin = `${this.DASHBOARD_BASE}?key=${encodeURIComponent(lic.key)}`;

      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #16161f; border: 1px solid #27272a; border-radius: 10px; margin-bottom: 14px;">
          <tr>
            <td style="padding: 16px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 11px; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${lic.plan || 'Plan Base'}</span>
                    ${lic.alias ? `<span style="font-size: 12px; color: #a1a1aa; margin-left: 6px;">(${lic.alias})</span>` : ''}
                  </td>
                  <td align="right">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="right">
                      <tr>
                        <td bgcolor="${statusBg}" style="background-color: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: ${statusColor}; text-transform: uppercase;">
                          ${lic.status}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 10px;">
                    <div style="background-color: #0b0b10; border: 1px solid #3f3f46; border-radius: 6px; padding: 8px 12px;">
                      <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: 1px; word-break: break-all; user-select: all; -webkit-user-select: all;">
                        ${lic.key}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 10px;">
                    <a href="${directLogin}" target="_blank" style="font-size: 12px; color: #818cf8; text-decoration: underline; font-weight: 600;">
                      Acceder directamente al panel con esta clave &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    }).join('');

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        Tus licencias de Bentian ERP Bridge
      </h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Hemos recopilado las licencias asociadas a tu cuenta de correo (<strong>${data.email}</strong>):
      </p>

      ${licenseCardsHtml}

      ${this.renderButton('Ir al Panel de Control de Clientes &rarr;', dashboardUrl, 'indigo')}
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'RECORDATORIO',
      badgeType: 'indigo',
      contentHtml,
      previewText: `Tus claves de licencia activas para ${data.email}.`,
    });

    const result = await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });

    return result.success;
  }

  /**
   * CASO 4: Notificación ante incidencia de cobro o tarjeta rechazada en Stripe.
   */
  public static async sendPaymentFailedEmail(data: PaymentFailedEmailData): Promise<boolean> {
    const graceDays = data.gracePeriodDays || 7;
    const updateUrl = data.updatePaymentUrl || this.DASHBOARD_BASE;
    const subject = `[Acción Requerida] Incidencia en el cobro de tu suscripción — Bentian ERP Bridge`;

    const text = [
      '====================================================================',
      ' AVISO DE INCIDENCIA EN EL COBRO',
      '====================================================================',
      '',
      'Hola,',
      'Hemos intentado procesar la renovación de tu suscripción a Bentian ERP Bridge,',
      'pero la entidad bancaria ha rechazado el cargo.',
      '',
      `PERÍODO DE GRACIA: Mantenemos tu servicio activo durante ${graceDays} días`,
      'para que la sincronización con tu Factusol no se detenga de forma imprevista.',
      '',
      'POR FAVOR, ACTUALIZA TU TARJETA EN STRIPE:',
      `${updateUrl}`,
      '',
      'Si tienes cualquier duda, ponte en contacto con nosotros en soporte@cristianjm.com.',
      '',
      '---',
      'Bentian ERP Bridge — Tecnología Local-First para Factusol',
    ].join('\n');

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        Incidencia en la renovación de tu suscripción
      </h2>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Hemos intentado procesar la renovación de tu plan <strong>${data.planName || 'Base'}</strong> pero la entidad bancaria ha rechazado el cargo.
      </p>

      <!-- CAJA PERIODO DE GRACIA -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #2e1a05; border: 1px solid #b45309; border-radius: 10px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #fbbf24; margin-bottom: 6px;">
              🛡️ Período de Gracia Activo (${graceDays} días)
            </div>
            <div style="font-size: 13px; color: #fef3c7; line-height: 1.5;">
              Para no perjudicar la operativa de tu negocio, tu agente de Factusol seguirá sincronizando existencias y pedidos durante los próximos <strong>${graceDays} días</strong> mientras actualizas tus datos de facturación en Stripe.
            </div>
          </td>
        </tr>
      </table>

      <!-- BOTON STRIPE BULLETPROOF -->
      ${this.renderButton('Actualizar Método de Pago en Stripe &rarr;', updateUrl, 'amber')}
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'PAGO PENDIENTE',
      badgeType: 'warning',
      contentHtml,
      previewText: `Incidencia en la renovación de tu plan ${data.planName || 'Base'}. Período de gracia activo de ${graceDays} días.`,
    });

    const result = await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });

    return result.success;
  }

  /**
   * CASO 5: Confirmación de cancelación de suscripción.
   */
  public static async sendSubscriptionCanceledEmail(data: SubscriptionCanceledEmailData): Promise<boolean> {
    const subject = `Confirmación de cancelación de suscripción — Bentian ERP Bridge`;
    const reactivateUrl = data.reactivateUrl || 'https://bridge.cristianjm.com/#pricing';

    const text = [
      '====================================================================',
      ' CONFIRMACIÓN DE CANCELACIÓN DE SUSCRIPCIÓN',
      '====================================================================',
      '',
      'Hola,',
      'Confirmamos que tu suscripción a Bentian ERP Bridge ha sido cancelada a petición tuya.',
      'No se realizarán más cargos automáticos en tu tarjeta.',
      '',
      'VIGENCIA DE TU SERVICIO:',
      `Tu licencia permanecerá activa hasta el final del período pagado: ${data.effectiveDate}.`,
      'A partir de esa fecha, el agente dejará de sincronizar con tu tienda web.',
      '',
      'Si en el futuro deseas reactivar tu servicio, puedes hacerlo en cualquier momento desde:',
      `${reactivateUrl}`,
      '',
      'Gracias por haber formado parte de Bentian.',
      '',
      '---',
      'Bentian ERP Bridge — Tecnología Local-First para Factusol',
    ].join('\n');

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        Cancelación de suscripción confirmada
      </h2>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Confirmamos que tu suscripción a <strong>Bentian ERP Bridge</strong> ha sido cancelada a petición tuya. No se aplicará ninguna renovación automática ni cobro adicional en tu tarjeta.
      </p>

      <!-- CAJA DE VIGENCIA -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #3b0707; border: 1px solid #b91c1c; border-radius: 10px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #f87171; margin-bottom: 6px;">
              📅 Validez de tu licencia pagada
            </div>
            <div style="font-size: 13px; color: #fca5a5; line-height: 1.5;">
              Tu licencia y conector seguirán operando con total normalidad hasta el <strong>${data.effectiveDate}</strong>. Llegada esa fecha, el servicio se detendrá sin penalización alguna.
            </div>
          </td>
        </tr>
      </table>

      <!-- BOTON REACTIVAR -->
      ${this.renderButton('Reactivar Suscripción en Bentian &rarr;', reactivateUrl, 'indigo')}

      <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center; line-height: 1.5;">
        Si en el futuro deseas volver a sincronizar tu Factusol, podrás reactivar tu cuenta en cualquier momento conservando tu configuración.
      </p>
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'CANCELADA',
      badgeType: 'danger',
      contentHtml,
      previewText: `Cancelación confirmada. Tu licencia permanecerá activa hasta el ${data.effectiveDate}.`,
    });

    const result = await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });

    return result.success;
  }

  /**
   * Cliente SMTP directo con sockets nativos TLS/TCP (RFC 5321) sin dependencias externas.
   * Funciona con el servidor de correo Plesk, cPanel o cualquier SMTP estándar.
   */
  private static sendViaSmtpSocket(config: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const isSsl = config.port === 465;
      const rejectUnauthorized = process.env['SMTP_REJECT_UNAUTHORIZED'] === 'true';
      const socket = isSsl
        ? tls.connect({ host: config.host, port: config.port, rejectUnauthorized })
        : net.connect({ host: config.host, port: config.port });

      const safeTo = config.to.replace(/[\r\n]/g, '').trim();
      const safeFrom = config.from.replace(/[\r\n]/g, '').trim();
      const safeSubject = config.subject.replace(/[\r\n]/g, ' ').trim();

      let step = 0;
      let buffer = '';

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Timeout de conexión SMTP con ${config.host}:${config.port}`));
      }, 15000);

      const send = (cmd: string) => {
        socket.write(`${cmd}\r\n`);
      };

      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const code = parseInt(line.substring(0, 3), 10);
          if (isNaN(code)) continue;

          // Ignorar respuestas intermedias multilínea (ej: 250-SIZE)
          if (line.charAt(3) === '-') continue;

          if (step === 0 && code === 220) {
            step = 1;
            send(`EHLO localhost`);
          } else if (step === 1 && code === 250) {
            step = 2;
            send(`AUTH LOGIN`);
          } else if (step === 2 && code === 334) {
            step = 3;
            send(Buffer.from(config.user).toString('base64'));
          } else if (step === 3 && code === 334) {
            step = 4;
            send(Buffer.from(config.pass).toString('base64'));
          } else if (step === 4 && code === 235) {
            step = 5;
            const cleanFrom = safeFrom.includes('<') ? safeFrom.replace(/.*<([^>]+)>.*/, '$1') : safeFrom;
            send(`MAIL FROM:<${cleanFrom}>`);
          } else if (step === 5 && code === 250) {
            step = 6;
            send(`RCPT TO:<${safeTo}>`);
          } else if (step === 6 && code === 250) {
            step = 7;
            send(`DATA`);
          } else if (step === 7 && code === 354) {
            const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            const message = [
              `From: ${safeFrom}`,
              `To: ${safeTo}`,
              `Subject: =?UTF-8?B?${Buffer.from(safeSubject).toString('base64')}?=`,
              `MIME-Version: 1.0`,
              `Content-Type: multipart/alternative; boundary="${boundary}"`,
              ``,
              `--${boundary}`,
              `Content-Type: text/plain; charset=UTF-8`,
              `Content-Transfer-Encoding: base64`,
              ``,
              Buffer.from(config.text).toString('base64'),
              ``,
              `--${boundary}`,
              `Content-Type: text/html; charset=UTF-8`,
              `Content-Transfer-Encoding: base64`,
              ``,
              Buffer.from(config.html).toString('base64'),
              ``,
              `--${boundary}--`,
              `.`,
            ].join('\r\n');
            send(message);
          } else if (step === 8 && code === 250) {
            step = 9;
            send(`QUIT`);
            clearTimeout(timeout);
            socket.end();
            resolve();
            return;
          } else if (code >= 400) {
            clearTimeout(timeout);
            socket.destroy();
            reject(new Error(`Error SMTP devuelto (${code}): ${line}`));
            return;
          }
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }
}
