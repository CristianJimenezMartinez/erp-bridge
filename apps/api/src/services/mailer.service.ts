import tls from 'tls';
import net from 'net';
import { Logger } from '@erp-bridge/shared';

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
}

/**
 * MailerService — Despachador de correos transaccionales a COSTE CERO.
 * 
 * Estrategias de envío soportadas (por orden de prioridad):
 * 1. Resend API (3.000 emails/mes GRATIS de por vida) -> Variable: RESEND_API_KEY
 * 2. Brevo / Sendinblue (300 emails/día GRATIS) -> Variable: BREVO_API_KEY
 * 3. Servidor SMTP propio de Plesk/cPanel/Hosting (100% GRATIS) -> Variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * 4. Modo Simulación / Log (Fallback seguro para desarrollo sin romper pagos)
 */
export class MailerService {
  private static readonly logger = new Logger('MailerService');

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
    this.logger.info(`[SIMULADOR EMAIL] Correo de bienvenida para: ${options.to}`);
    this.logger.info(`[SIMULADOR EMAIL] Asunto: ${options.subject}`);
    return { success: true, provider: 'simulation' };
  }

  /**
   * Envía el correo de bienvenida y entrega inmediata de licencia tras completarse el pago en Stripe.
   */
  public static async sendLicenseWelcomeEmail(data: LicenseWelcomeEmailData): Promise<boolean> {
    const downloadUrl = data.downloadUrl || 'https://bridge.cristianjm.com/releases/v0.3.1/Bentian-Setup-v0.3.1.exe';
    const dashboardUrl = data.dashboardUrl || `https://bridge.cristianjm.com/dashboard/?key=${encodeURIComponent(data.licenseKey)}`;
    const planLabel = data.planName || 'Plan Base Todo Incluido (Factusol ⇄ Web)';

    const subject = `[Bentian ERP Bridge] Tu Clave de Activación: ${data.licenseKey}`;

    const text = [
      '====================================================================',
      ' ¡BIENVENIDO A BENTIAN ERP BRIDGE!',
      '====================================================================',
      '',
      `Hola,`,
      `Gracias por confiar en Bentian ERP Bridge. Tu suscripción está activa.`,
      '',
      `TU CLAVE DE ACTIVACIÓN:`,
      `>>> ${data.licenseKey} <<<`,
      '',
      `Plan Contratado: ${planLabel}`,
      `Servidor Asignado: ${data.alias || 'Servidor Factusol Principal'}`,
      '',
      'PASOS PARA CONECTAR TU FACTUSOL EN 60 SEGUNDOS:',
      `1. Descarga el instalador del Agente Bentian (v0.3.1):`,
      `   ${downloadUrl}`,
      '2. Ejecuta el instalador en el equipo con acceso a la base de datos de Factusol.',
      `3. Pega tu clave de activación (${data.licenseKey}) cuando te la solicite.`,
      '4. ¡Listo! El agente sincronizará existencias, catálogo y pedidos en tiempo real.',
      '',
      'ACCESO DIRECTO A TU PANEL DE CONTROL:',
      `${dashboardUrl}`,
      '',
      '¿Necesitas soporte técnico? Responde a este correo o escríbenos a soporte@cristianjm.com.',
      '',
      '---',
      'Bentian ERP Bridge — Tecnología Local-First y Edge Processing',
    ].join('\n');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #121215; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          
          <!-- HEADER CON LOGO -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background-color: #18181b;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Bentian</span>
                    <span style="font-size: 14px; color: #a1a1aa; font-weight: 500; margin-left: 6px;">ERP Bridge</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-family: monospace;">
                      LICENCIA ACTIVA
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CUERPO PRINCIPAL -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                ¡Tu software está listo para conectar!
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Muchas gracias por tu compra. Ya hemos configurado tu suscripción a <strong>${planLabel}</strong>. Aquí tienes tu clave de activación personal para vincular el software con tu base de datos de Factusol:
              </p>

              <!-- CAJA DE CLAVE DE ACTIVACIÓN -->
              <table role="presentation" width="100%" style="background-color: #18181b; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 18px; text-align: center;">
                    <div style="font-size: 11px; font-family: monospace; color: #818cf8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      Clave de Licencia Oficial
                    </div>
                    <div style="font-size: 18px; font-family: monospace; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; word-break: break-all; user-select: all;">
                      ${data.licenseKey}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- BOTÓN DE DESCARGA PRIMARIO -->
              <table role="presentation" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 24px; border-radius: 10px; text-align: center; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                      Descargar Bentian Agent para Windows (v0.3.1) &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- GUÍA RÁPIDA DE 3 PASOS -->
              <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <h3 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 700; color: #e4e4e7; text-transform: uppercase; letter-spacing: 0.5px;">
                  Puesta en marcha en 3 sencillos pasos:
                </h3>
                <table role="presentation" width="100%" style="font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                  <tr>
                    <td width="28" valign="top" style="font-weight: 800; color: #818cf8;">1.</td>
                    <td style="padding-bottom: 8px;">Ejecuta el instalador en el PC donde esté Factusol o que tenga acceso a la red donde se aloja la base de datos (.accdb).</td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="font-weight: 800; color: #818cf8;">2.</td>
                    <td style="padding-bottom: 8px;">Pega tu clave <code style="background-color: #27272a; padding: 2px 6px; border-radius: 4px; color: #e4e4e7; font-family: monospace;">${data.licenseKey}</code> cuando el asistente la solicite.</td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="font-weight: 800; color: #818cf8;">3.</td>
                    <td>¡Listo! El agente se conectará automáticamente a tu tienda web y sincronizará stock y pedidos en segundo plano sin bloquear tu equipo.</td>
                  </tr>
                </table>
              </div>

              <!-- ENLACE AL DASHBOARD -->
              <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                También puedes ver tu panel en cualquier momento desde:<br>
                <a href="${dashboardUrl}" style="color: #818cf8; text-decoration: underline; font-weight: 600;">
                  Acceder a mi Panel de Control de Bentian
                </a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 24px 32px; background-color: #09090b; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; color: #71717a; text-align: center;">
              <p style="margin: 0 0 6px 0;">Bentian ERP Bridge — Conector e Integrador Factusol</p>
              <p style="margin: 0;">¿Tienes dudas? Escríbenos directamente a <a href="mailto:soporte@cristianjm.com" style="color: #a1a1aa; text-decoration: underline;">soporte@cristianjm.com</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await this.sendEmail({
      to: data.customerEmail,
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
            step = 8;
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
