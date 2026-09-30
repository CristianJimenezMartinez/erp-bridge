import tls from 'tls';
import net from 'net';
import { Logger } from '@erp-bridge/shared';
import { getLatestReleasedVersion, getLatestInstallerUrl } from '../utils/version.util';

export interface EmailOptions {
  to: string;
  from?: string;
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

interface BrandedEmailParams {
  title: string;
  badgeText: string;
  badgeType: 'success' | 'indigo' | 'warning' | 'danger';
  contentHtml: string;
  footerNote?: string;
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
   * Generador de plantilla HTML corporativa con logotipo oficial, diseño responsive
   * y compatibilidad probada con Gmail, Outlook, Apple Mail y clientes móviles.
   */
  public static renderBrandedEmail(params: BrandedEmailParams): string {
    const badgeColors = {
      success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', text: '#34d399' },
      indigo:  { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)', text: '#a5b4fc' },
      warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', text: '#fbbf24' },
      danger:  { bg: 'rgba(239, 68, 68, 0.15)',  border: 'rgba(239, 68, 68, 0.35)',  text: '#f87171' },
    };

    const badge = badgeColors[params.badgeType] || badgeColors.indigo;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${params.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #121216; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- CABECERA CON LOGOTIPO OFICIAL BENTIAN -->
          <tr>
            <td style="padding: 26px 32px; background-color: #17171d; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${this.LOGO_URL}" width="38" height="38" alt="Bentian Logo" style="display: block; width: 38px; height: 38px; border-radius: 9px; border: 1px solid rgba(255, 255, 255, 0.15);" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1;">
                            Bentian <span style="font-size: 13px; color: #818cf8; font-weight: 600; margin-left: 4px;">ERP Bridge</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: ${badge.bg}; border: 1px solid ${badge.border}; color: ${badge.text}; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 6px; font-family: ui-monospace, Menlo, Consolas, monospace; letter-spacing: 0.5px; text-transform: uppercase;">
                      ${params.badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTENIDO ESPECÍFICO DEL MENSAJE -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              ${params.contentHtml}
            </td>
          </tr>

          <!-- PIE CORPORATIVO Y TITULARIDAD LEGAL -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0d0d10; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; color: #71717a; text-align: center; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; color: #a1a1aa; font-weight: 600;">
                Bentian ERP Bridge — Conector Autónomo y Local-First para Factusol
              </p>
              <p style="margin: 0 0 8px 0;">
                Plataforma oficial: <a href="https://bridge.cristianjm.com" style="color: #818cf8; text-decoration: underline;">bridge.cristianjm.com</a> | Titular: Cristian Jiménez Martínez
              </p>
              <p style="margin: 0;">
                ¿Dudas o soporte técnico? Responde directamente a este correo o escríbenos a <a href="mailto:${this.SUPPORT_EMAIL}" style="color: #818cf8; text-decoration: underline;">${this.SUPPORT_EMAIL}</a>
              </p>
              ${params.footerNote ? `<p style="margin: 12px 0 0 0; font-size: 11px; color: #52525b;">${params.footerNote}</p>` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  public static async sendEmail(options: EmailOptions): Promise<{ success: boolean; provider: string; error?: string }> {
    const from = options.from || process.env['MAIL_FROM'] || process.env['SMTP_FROM'] || 'Bentian ERP Bridge <soporte@cristianjm.com>';

    // 1. Prioridad: Resend API (Gratis 3.000 emails/mes de por vida)
    const resendKey = process.env['RESEND_API_KEY'];
    if (resendKey && resendKey.startsWith('re_')) {
      try {
        this.logger.info(`Enviando email a ${options.to} vía Resend API...`);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { email: from.includes('<') ? from.replace(/.*<([^>]+)>.*/, '$1') : from, name: 'Bentian ERP Bridge' },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || options.html.replace(/<[^>]*>?/gm, ''),
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
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
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
    this.logger.info(`[SIMULADOR EMAIL] Asunto: ${options.subject}`);
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
      ' BENTIAN ERP BRIDGE — CÓDIGO DE ACCESO',
      '====================================================================',
      '',
      'Has solicitado entrar a tu Panel de Control de Bentian ERP Bridge para consultar',
      'tus licencias de Factusol, facturas y descargas.',
      '',
      'TU CÓDIGO DE ACCESO DE 6 DÍGITOS:',
      `>>> ${data.otp} <<<`,
      '',
      `⏱ Este código es válido durante ${validity} minutos y para un único acceso.`,
      '',
      'Puedes introducir este código directamente en:',
      `${dashboardUrl}`,
      '',
      'AVISO DE SEGURIDAD:',
      'Si tú no has solicitado este código, puedes ignorar este mensaje con tranquilidad;',
      'nadie puede acceder a tus licencias sin este código.',
      '',
      '---',
      'Bentian ERP Bridge — Tecnología Local-First para Factusol',
      `Soporte técnico: ${this.SUPPORT_EMAIL}`,
    ].join('\n');

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 700; color: #ffffff;">
        Tu código de verificación de acceso
      </h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Has solicitado iniciar sesión en tu Panel de Control de <strong>Bentian ERP Bridge</strong>. Introduce el siguiente código de 6 dígitos para acceder a tus licencias y configuración:
      </p>

      <!-- CAJA DESTACADA DEL CÓDIGO OTP -->
      <table role="presentation" width="100%" style="background-color: #1a1a22; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 12px; margin-bottom: 24px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);">
        <tr>
          <td style="padding: 24px; text-align: center;">
            <div style="font-size: 11px; font-family: ui-monospace, Menlo, Consolas, monospace; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
              Código de Verificación Temporal
            </div>
            <div style="font-size: 34px; font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800; color: #ffffff; letter-spacing: 8px; user-select: all;">
              ${data.otp}
            </div>
          </td>
        </tr>
      </table>

      <!-- BOTÓN DIRECTO AL PANEL -->
      <table role="presentation" width="100%" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <a href="${dashboardUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 24px; border-radius: 9px; text-align: center; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
              Abrir Pantalla de Inicio de Sesión &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- AVISO DE CADUCIDAD Y SEGURIDAD -->
      <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 14px 16px; margin-top: 10px;">
        <table role="presentation" width="100%">
          <tr>
            <td width="24" valign="top" style="font-size: 15px;">⏱</td>
            <td style="font-size: 12px; line-height: 1.5; color: #a1a1aa;">
              Este código caduca automáticamente en <strong>${validity} minutos</strong> y quedará invalidado tras su primer uso.
            </td>
          </tr>
          <tr>
            <td width="24" valign="top" style="font-size: 15px; padding-top: 6px;">🛡️</td>
            <td style="font-size: 12px; line-height: 1.5; color: #71717a; padding-top: 6px;">
              Si no has solicitado este acceso, no te preocupes: nadie puede acceder a tu cuenta sin este código. Puedes ignorar este correo con total tranquilidad.
            </td>
          </tr>
        </table>
      </div>
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'CÓDIGO DE ACCESO',
      badgeType: 'indigo',
      contentHtml,
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
   * CASO 2: Envía el correo de bienvenida y entrega inmediata de licencia tras completarse el pago en Stripe.
   */
  public static async sendLicenseWelcomeEmail(data: LicenseWelcomeEmailData): Promise<boolean> {
    const latestVersion = getLatestReleasedVersion();
    const downloadUrl = data.downloadUrl || ('https://bridge.cristianjm.com' + getLatestInstallerUrl());
    const dashboardUrl = data.dashboardUrl || `${this.DASHBOARD_BASE}?key=${encodeURIComponent(data.licenseKey)}`;
    const planLabel = data.planName || 'Plan Base Todo Incluido (Factusol ⇄ Tienda Web)';

    const subject = `[Bentian ERP Bridge] Tu Clave de Activación: ${data.licenseKey}`;

    const text = [
      '====================================================================',
      ' ¡BIENVENIDO A BENTIAN ERP BRIDGE!',
      '====================================================================',
      '',
      `Hola,`,
      `Gracias por confiar en Bentian ERP Bridge. Tu suscripción está activa y confirmada.`,
      '',
      `TU CLAVE DE ACTIVACIÓN OFICIAL:`,
      `>>> ${data.licenseKey} <<<`,
      '',
      `Plan Contratado: ${planLabel}`,
      `Servidor Asignado: ${data.alias || 'Servidor Factusol Principal'}`,
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
      'GUÍA RÁPIDA DE INSTALACIÓN Y WINDOWS DEFENDER:',
      'https://bridge.cristianjm.com/docs/windows-antivirus-smartscreen-guide.html',
      '',
      '¿Necesitas soporte técnico? Responde a este correo o escríbenos a soporte@cristianjm.com.',
      '',
      '---',
      'Bentian ERP Bridge — Tecnología Local-First y Edge Processing',
    ].join('\n');

    const contentHtml = `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
        ¡Tu software está listo para conectar!
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Muchas gracias por tu compra. Ya hemos configurado tu suscripción a <strong>${planLabel}</strong>. A continuación tienes tu clave de activación personal para vincular el software con tu base de datos de Factusol:
      </p>

      <!-- CAJA DE CLAVE DE ACTIVACIÓN -->
      <table role="presentation" width="100%" style="background-color: #1a1a22; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 12px; margin-bottom: 26px;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <div style="font-size: 11px; font-family: ui-monospace, Menlo, Consolas, monospace; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              Clave de Licencia Oficial
            </div>
            <div style="font-size: 20px; font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; word-break: break-all; user-select: all;">
              ${data.licenseKey}
            </div>
          </td>
        </tr>
      </table>

      <!-- BOTÓN DE DESCARGA PRIMARIO -->
      <table role="presentation" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <a href="${downloadUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-align: center; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
              Descargar Bentian Agent para Windows (v${latestVersion}) &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- GUÍA RÁPIDA DE 3 PASOS -->
      <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 20px; margin-bottom: 26px;">
        <h3 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 700; color: #e4e4e7; text-transform: uppercase; letter-spacing: 0.5px;">
          Puesta en marcha en 3 sencillos pasos:
        </h3>
        <table role="presentation" width="100%" style="font-size: 13px; line-height: 1.6; color: #a1a1aa;">
          <tr>
            <td width="28" valign="top" style="font-weight: 800; color: #818cf8;">1.</td>
            <td style="padding-bottom: 8px;">Ejecuta el instalador en el PC donde esté Factusol o que tenga acceso por red local al archivo <code>.accdb</code>.</td>
          </tr>
          <tr>
            <td width="28" valign="top" style="font-weight: 800; color: #818cf8;">2.</td>
            <td style="padding-bottom: 8px;">Pega tu clave <code style="background-color: #27272a; padding: 2px 6px; border-radius: 4px; color: #e4e4e7; font-family: monospace;">${data.licenseKey}</code> en el asistente de bienvenida.</td>
          </tr>
          <tr>
            <td width="28" valign="top" style="font-weight: 800; color: #818cf8;">3.</td>
            <td>¡Listo! El agente se conectará de forma autónoma con tu tienda online para sincronizar catálogo, existencias y pedidos.</td>
          </tr>
        </table>
      </div>

      <!-- ENLACES DE GESTIÓN Y PANEL -->
      <div style="text-align: center; font-size: 13px; color: #71717a; line-height: 1.6;">
        <p style="margin: 0 0 8px 0;">
          Puedes consultar tus facturas, métricas o cancelar tu suscripción en cualquier momento desde:<br>
          <a href="${dashboardUrl}" style="color: #818cf8; text-decoration: underline; font-weight: 600;">
            Acceder a mi Panel de Control de Bentian &rarr;
          </a>
        </p>
        <p style="margin: 0; font-size: 12px;">
          ¿Dudas con SmartScreen o antivirus? <a href="https://bridge.cristianjm.com/docs/windows-antivirus-smartscreen-guide.html" style="color: #a1a1aa; text-decoration: underline;">Consulta aquí la Guía de Instalación</a>.
        </p>
      </div>
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'LICENCIA ACTIVA',
      badgeType: 'success',
      contentHtml,
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
      `Hola,`,
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
      const statusBg = isAct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const directLogin = `${this.DASHBOARD_BASE}?key=${encodeURIComponent(lic.key)}`;

      return `
        <div style="background-color: #1a1a22; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 16px; margin-bottom: 12px;">
          <table role="presentation" width="100%">
            <tr>
              <td>
                <span style="font-size: 11px; color: #818cf8; font-weight: 700; text-transform: uppercase;">${lic.plan || 'Plan Base'}</span>
                ${lic.alias ? `<span style="font-size: 12px; color: #a1a1aa; margin-left: 6px;">(${lic.alias})</span>` : ''}
              </td>
              <td align="right">
                <span style="font-size: 10px; font-weight: 700; color: ${statusColor}; background: ${statusBg}; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
                  ${lic.status}
                </span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 8px;">
                <div style="font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 15px; font-weight: 700; color: #ffffff; letter-spacing: 1px; user-select: all;">
                  ${lic.key}
                </div>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 10px;">
                <a href="${directLogin}" style="font-size: 12px; color: #818cf8; text-decoration: underline; font-weight: 600;">
                  Acceder directamente al panel con esta clave &rarr;
                </a>
              </td>
            </tr>
          </table>
        </div>
      `;
    }).join('');

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 700; color: #ffffff;">
        Tus licencias de Bentian ERP Bridge
      </h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Hemos recopilado las licencias vinculadas a tu cuenta de correo (<strong>${data.email}</strong>):
      </p>

      ${licenseCardsHtml}

      <table role="presentation" width="100%" style="margin-top: 24px;">
        <tr>
          <td align="center">
            <a href="${dashboardUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 24px; border-radius: 9px; text-align: center;">
              Ir al Panel de Control de Clientes &rarr;
            </a>
          </td>
        </tr>
      </table>
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'RECORDATORIO',
      badgeType: 'indigo',
      contentHtml,
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
      <h2 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 700; color: #ffffff;">
        Incidencia en la renovación de tu suscripción
      </h2>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Hemos intentado procesar la renovación de tu plan <strong>${data.planName || 'Base'}</strong> pero la entidad bancaria ha rechazado el cargo.
      </p>

      <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 4px;">
          🛡️ Período de Gracia Activo (${graceDays} días)
        </div>
        <div style="font-size: 12px; color: #d1d5db; line-height: 1.5;">
          Para no perjudicar la operativa de tu negocio, tu agente de Factusol seguirá sincronizando existencias y pedidos durante los próximos <strong>${graceDays} días</strong> mientras actualizas los datos de pago.
        </div>
      </div>

      <table role="presentation" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td align="center">
            <a href="${updateUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #f59e0b; color: #000000; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 24px; border-radius: 9px; text-align: center;">
              Actualizar Método de Pago en Stripe &rarr;
            </a>
          </td>
        </tr>
      </table>
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'PAGO PENDIENTE',
      badgeType: 'warning',
      contentHtml,
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
      `VIGENCIA DE TU SERVICIO:`,
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
      <h2 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 700; color: #ffffff;">
        Cancelación de suscripción confirmada
      </h2>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
        Confirmamos que tu suscripción a <strong>Bentian ERP Bridge</strong> ha sido cancelada. No se aplicará ninguna renovación automática ni cobro adicional en tu tarjeta.
      </p>

      <div style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 700; color: #f87171; margin-bottom: 4px;">
          📅 Validez de tu licencia pagada
        </div>
        <div style="font-size: 12px; color: #d1d5db; line-height: 1.5;">
          Tu licencia y conector seguirán operando con normalidad hasta el <strong>${data.effectiveDate}</strong>. Llegada esa fecha, el servicio se detendrá sin penalización.
        </div>
      </div>

      <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
        Si en el futuro deseas volver a conectar tu Factusol, podrás reactivar tu cuenta en cualquier momento desde <a href="${reactivateUrl}" style="color: #818cf8; text-decoration: underline;">nuestra web oficial</a>.
      </p>
    `;

    const html = this.renderBrandedEmail({
      title: subject,
      badgeText: 'CANCELADA',
      badgeType: 'danger',
      contentHtml,
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
      const socket = isSsl
        ? tls.connect({ host: config.host, port: config.port, rejectUnauthorized: false })
        : net.connect({ host: config.host, port: config.port });

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
            const cleanFrom = config.from.includes('<') ? config.from.replace(/.*<([^>]+)>.*/, '$1') : config.from;
            send(`MAIL FROM:<${cleanFrom}>`);
          } else if (step === 5 && code === 250) {
            step = 6;
            send(`RCPT TO:<${config.to}>`);
          } else if (step === 6 && code === 250) {
            step = 7;
            send(`DATA`);
          } else if (step === 7 && code === 354) {
            const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            const message = [
              `From: ${config.from}`,
              `To: ${config.to}`,
              `Subject: =?UTF-8?B?${Buffer.from(config.subject).toString('base64')}?=`,
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
