import tls from 'tls';
import net from 'net';
import { Logger } from '@erp-bridge/shared';
import { CanonicalOrder } from '@erp-bridge/shared';
import { AgentConfigFile, AgentNotificationSettings } from '../config/config.types';
import { AgentDiskLogger } from '../diagnostics/disk-logger';

export interface OrderNotificationPayload {
  order: CanonicalOrder;
  channel: 'woocommerce' | 'universal_bridge';
  factusolOrderNumber: number | string;
  series: string;
  config: AgentConfigFile;
}

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class OrderNotifierService {
  private static readonly logger = new Logger('OrderNotifier');
  private static readonly notifiedOrders = new Map<string, number>();

  public static async notifyNewOrder(payload: OrderNotificationPayload): Promise<{ success: boolean; error?: string }> {
    const { order, channel, factusolOrderNumber, series, config } = payload;
    const notif = config.notifications;

    if (!notif || !notif.orderAlertsEnabled || !notif.alertEmail || !notif.alertEmail.trim()) {
      return { success: false, error: 'Alertas de pedidos desactivadas o sin email de destino' };
    }

    const ref = order.reference || order.orderNumber || 'S/REF';
    const orderKey = `${channel}_${ref}_${series}_${factusolOrderNumber}`;
    const now = Date.now();
    const lastNotified = this.notifiedOrders.get(orderKey);

    // Deduplicación en el agente: Si el pedido ya fue notificado hace menos de 24h, omitir reenvío
    if (lastNotified && now - lastNotified < 24 * 60 * 60 * 1000) {
      this.logger.info(`[Deduplicación Agente] Alerta de pedido #${ref} (${series}-${factusolOrderNumber}) ya enviada hace ${Math.round((now - lastNotified) / 1000)}s. Omitiendo duplicado.`);
      return { success: true };
    }

    const tStart = performance.now();
    const channelLabel = channel === 'woocommerce' ? 'WooCommerce' : 'Tienda Web (Universal Bridge)';
    const totalEur = order.totalAmount.toFixed(2);
    const subject = `📦 [Nuevo Pedido Factusol] Web #${ref} ➔ Serie ${series} Nº ${factusolOrderNumber} (${totalEur} €)`;


    const customerName = order.customer.fiscalName || (order.customer as any).name || 'Cliente Web';
    const customerNif = order.customer.taxId || '';
    const customerPhone = order.customer.phone || '';
    const customerEmail = order.customer.email || '';

    const ship = order.shippingAddress || order.billingAddress;
    const addressStr = ship
      ? [ship.street, ship.postalCode, ship.city, ship.state || (ship as any).province].filter(Boolean).join(', ')
      : 'No especificada';

    const linesText = order.lines.map((l, i) => `  ${i + 1}. [${l.sku}] ${l.name} x ${l.quantity} ud. @ ${l.unitPrice.toFixed(2)} € = ${l.total.toFixed(2)} €`).join('\n');

    const textBody = [
      '====================================================================',
      '  ¡NUEVO PEDIDO WEB REGISTRADO EN FACTUSOL!',
      '====================================================================',
      '',
      `DATOS DE FACTUSOL:`,
      `- Serie de Pedido: [ ${series} ]`,
      `- Número Factusol: [ ${factusolOrderNumber} ]`,
      `- Referencia Web:  [ #${ref} ]`,
      `- Canal Tienda:    [ ${channelLabel} ]`,
      `- Fecha y Hora:    ${new Date().toLocaleString('es-ES')}`,
      '',
      `DATOS DEL CLIENTE:`,
      `- Nombre / Razón:  ${customerName}`,
      `- NIF / CIF:       ${customerNif || 'Cliente Contado'}`,
      `- Teléfono:        ${customerPhone || 'No facilitado'}`,
      `- Email:           ${customerEmail || 'No facilitado'}`,
      `- Envío / Entrega: ${addressStr}`,
      '',
      `ARTÍCULOS DEL PEDIDO:`,
      linesText,
      '',
      `TOTALES DEL PEDIDO:`,
      `- Base Imponible:  ${order.netAmount.toFixed(2)} €`,
      `- Impuestos (IVA): ${order.taxAmount.toFixed(2)} €`,
      `- TOTAL FACTUSOL:  ${totalEur} €`,
      '',
      `OBSERVACIONES:`,
      order.notes || 'Sin observaciones.',
      '',
      '---',
      'Bentian ERP Bridge — Notificación automática en tiempo real',
      'El pedido ya está creado en Factusol y listo para su preparación en almacén.',
    ].join('\n');

    const tableRowsHtml = order.lines.map((l) => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 10px 8px; font-family: monospace; color: #a5b4fc; font-size: 13px;">${escapeHtml(l.sku)}</td>
        <td style="padding: 10px 8px; font-size: 13px; color: #e4e4e7;">${escapeHtml(l.name)}</td>
        <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #ffffff;">${Number(l.quantity)}</td>
        <td style="padding: 10px 8px; text-align: right; font-family: monospace; color: #d4d4d8;">${Number(l.unitPrice).toFixed(2)} €</td>
        <td style="padding: 10px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #34d399;">${Number(l.total).toFixed(2)} €</td>
      </tr>
    `).join('');

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#09090b;padding:30px 15px;">
    <tr><td align="center">
      <table width="100%" style="max-width:620px;background:#121215;border:1px solid rgba(255,255,255,0.1);border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px;background:#18181b;border-bottom:1px solid rgba(255,255,255,0.08);">
            <table width="100%"><tr>
              <td>
                <span style="font-size:18px;font-weight:800;color:#ffffff;">Bentian</span>
                <span style="font-size:13px;color:#a1a1aa;margin-left:4px;">ERP Bridge</span>
              </td>
              <td align="right">
                <span style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#34d399;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;font-family:monospace;">
                  ✓ FACTUSOL OK
                </span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);border-radius:10px;padding:16px 20px;margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.5px;">Nuevo Pedido Inyectado</div>
              <div style="font-size:22px;font-weight:800;color:#ffffff;margin-top:4px;">
                Serie <span style="color:#818cf8;">${escapeHtml(series)}</span> &bull; Nº <span style="color:#34d399;">#${escapeHtml(factusolOrderNumber)}</span>
              </div>
              <div style="font-size:13px;color:#a1a1aa;margin-top:6px;">
                Tienda: <strong>${escapeHtml(channelLabel)}</strong> (Ref: #${escapeHtml(ref)}) &bull; Total: <strong style="color:#34d399;">${escapeHtml(totalEur)} €</strong>
              </div>
            </div>

            <div style="background:#18181b;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px 18px;margin-bottom:20px;font-size:13px;line-height:1.6;">
              <div style="font-weight:700;color:#ffffff;margin-bottom:8px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:6px;">👤 Cliente y Entrega</div>
              <div><strong style="color:#a1a1aa;">Nombre:</strong> ${escapeHtml(customerName)} ${customerNif ? `(${escapeHtml(customerNif)})` : ''}</div>
              ${customerPhone ? `<div><strong style="color:#a1a1aa;">Teléfono:</strong> <a href="tel:${encodeURIComponent(customerPhone)}" style="color:#818cf8;">${escapeHtml(customerPhone)}</a></div>` : ''}
              ${customerEmail ? `<div><strong style="color:#a1a1aa;">Email:</strong> <a href="mailto:${encodeURIComponent(customerEmail)}" style="color:#818cf8;">${escapeHtml(customerEmail)}</a></div>` : ''}
              <div><strong style="color:#a1a1aa;">Dirección:</strong> ${escapeHtml(addressStr)}</div>
              ${order.notes ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.08);"><strong style="color:#fbbf24;">Notas:</strong> ${escapeHtml(order.notes)}</div>` : ''}
            </div>

            <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1);font-size:11px;color:#71717a;text-transform:uppercase;">
                  <th align="left" style="padding:8px;">SKU</th>
                  <th align="left" style="padding:8px;">Artículo</th>
                  <th align="center" style="padding:8px;">Cant.</th>
                  <th align="right" style="padding:8px;">Precio</th>
                  <th align="right" style="padding:8px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <div style="background:#18181b;border-radius:8px;padding:14px 18px;text-align:right;font-size:13px;">
              <div style="color:#a1a1aa;">Base Imponible: <span style="font-family:monospace;color:#ffffff;">${order.netAmount.toFixed(2)} €</span></div>
              <div style="color:#a1a1aa;margin-top:3px;">IVA: <span style="font-family:monospace;color:#ffffff;">${order.taxAmount.toFixed(2)} €</span></div>
              <div style="font-size:17px;font-weight:800;color:#ffffff;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);">
                Total: <span style="font-family:monospace;color:#34d399;">${totalEur} €</span>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;background:#09090b;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#71717a;text-align:center;">
            Bentian ERP Bridge &bull; Notificación autónoma local &bull; Factusol F_PCL / F_LPC
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    const recipients = notif.alertEmail.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
    let anySent = false;
    let lastError: string | undefined;

    for (const recipient of recipients) {
      const res = await this.deliverEmail({
        to: recipient,
        subject,
        html: htmlBody,
        text: textBody,
        settings: notif,
        apiBaseUrl: config.apiBaseUrl,
        licenseKey: config.licenseKey,
        orderReference: ref,
      });

      if (res.success) {
        anySent = true;
        this.notifiedOrders.set(orderKey, now);
      } else {
        lastError = res.error;
      }
    }


    const durationMs = Math.round(performance.now() - tStart);
    AgentDiskLogger.getInstance().log({
      level: anySent ? 'SUCCESS' : 'ERROR',
      component: 'OrderNotifier',
      action: 'send_order_alert',
      duration_ms: durationMs,
      status: anySent ? 'SUCCESS' : 'FAILURE',
      message: anySent
        ? `Aviso de pedido #${ref} (Factusol ${series}-${factusolOrderNumber}) enviado a ${notif.alertEmail} en ${durationMs}ms`
        : `Fallo al enviar aviso de pedido #${ref}: ${lastError}`,
      metadata: { ref, factusolOrderNumber, series, alertEmail: notif.alertEmail },
    });

    return { success: anySent, error: lastError };
  }

  public static async sendTestEmail(
    settings: AgentNotificationSettings,
    apiBaseUrl?: string,
    licenseKey?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!settings.alertEmail || !settings.alertEmail.trim()) {
      return { success: false, message: 'Debe especificar un email de destino en la casilla de alertas.' };
    }

    const subject = `🔔 [Bentian ERP Bridge] Correo de Prueba de Alertas Factusol`;
    const text = `Este es un correo de prueba enviado por Bentian ERP Bridge para verificar la recepción de alertas de nuevos pedidos.\n\nServidor: ${settings.smtpHost || 'Relay Central Bentian'}\nFecha: ${new Date().toISOString()}`;
    const html = `
      <div style="background:#121215;padding:24px;border-radius:12px;color:#f4f4f5;font-family:sans-serif;max-width:500px;border:1px solid rgba(255,255,255,0.1);">
        <h2 style="color:#34d399;margin-top:0;">✓ Conexión de Correo Correcta</h2>
        <p>Tu configuración para recibir avisos de nuevos pedidos de Factusol está funcionando perfectamente.</p>
        <div style="background:#18181b;padding:12px;border-radius:8px;font-size:12px;color:#a1a1aa;margin:16px 0;">
          <strong>Canal de Envío:</strong> ${settings.smtpHost ? `SMTP Propio (${settings.smtpHost}:${settings.smtpPort || 465})` : 'Relay Central Bentian'}<br>
          <strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}
        </div>
        <p style="font-size:12px;color:#71717a;margin:0;">Bentian ERP Bridge — Alertas de pedidos en tiempo real.</p>
      </div>
    `;

    const firstRecipient = (settings.alertEmail.split(/[,;]/)[0] || '').trim();
    const res = await this.deliverEmail({
      to: firstRecipient,
      subject,
      html,
      text,
      settings,
      apiBaseUrl,
      licenseKey,
    });

    return {
      success: res.success,
      message: res.success
        ? `✓ Correo de prueba enviado con éxito a ${firstRecipient}. Revisa tu bandeja de entrada o spam.`
        : `Error al enviar correo de prueba: ${res.error || 'Fallo desconocido'}`,
    };
  }

  private static async deliverEmail(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    settings: AgentNotificationSettings;
    apiBaseUrl?: string;
    licenseKey?: string;
    orderReference?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { to, subject, html, text, settings, apiBaseUrl, licenseKey, orderReference } = opts;

    // 1. Si hay SMTP configurado, enviar vía SMTP directo
    if (settings.smtpHost && settings.smtpUser && settings.smtpPass) {
      try {
        await this.sendViaSmtpSocket({
          host: settings.smtpHost,
          port: settings.smtpPort || 465,
          user: settings.smtpUser,
          pass: settings.smtpPass,
          from: settings.smtpFrom || settings.smtpUser,
          to,
          subject,
          html,
          text,
        });
        return { success: true };
      } catch (smtpErr: any) {
        this.logger.error(`Error en SMTP propio (${settings.smtpHost}):`, smtpErr.message);
        // Si falla el SMTP propio y no hay API, retornar el error
        if (!apiBaseUrl) {
          return { success: false, error: smtpErr.message };
        }
      }
    }

    // 2. Si hay API central configurada, usar relay seguro de Bentian
    if (apiBaseUrl) {
      try {
        const cleanApiUrl = apiBaseUrl.replace(/\/+$/, '');
        const res = await fetch(`${cleanApiUrl}/api/v1/notifications/order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(licenseKey ? { 'x-license-key': licenseKey } : {}),
          },
          body: JSON.stringify({ to, subject, html, text, orderReference }),
          signal: AbortSignal.timeout(12000),
        });


        if (res.ok) {
          return { success: true };
        } else {
          const errData = (await res.json().catch(() => ({}))) as any;
          return { success: false, error: errData.message || `HTTP ${res.status} desde el servidor central` };
        }
      } catch (apiErr: any) {
        this.logger.warn('Aviso en relay de notificaciones con el servidor central:', apiErr.message);
        return { success: false, error: `Fallo al contactar servidor central: ${apiErr.message}` };
      }
    }

    return { success: false, error: 'No se configuró ni servidor SMTP ni conexión con el servidor central' };
  }

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
      const cleanTo = config.to.replace(/[\r\n]/g, '').trim();
      const cleanFrom = config.from.replace(/[\r\n]/g, '').trim();
      const cleanSubject = config.subject.replace(/[\r\n]/g, ' ').trim();
      const rejectUnauthorized = process.env.NODE_ENV === 'test' ? false : true;

      const isSsl = config.port === 465;
      let activeSocket: net.Socket = isSsl
        ? tls.connect({ host: config.host, port: config.port, rejectUnauthorized, servername: config.host })
        : net.connect({ host: config.host, port: config.port });

      let step = 0;
      let buffer = '';
      let isUpgradedTls = isSsl;

      const timeout = setTimeout(() => {
        activeSocket.destroy();
        reject(new Error(`Timeout SMTP tras 15s con ${config.host}:${config.port}`));
      }, 15000);

      const send = (cmd: string) => {
        activeSocket.write(`${cmd}\r\n`);
      };

      const attachListeners = (s: net.Socket) => {
        s.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\r\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const code = parseInt(line.substring(0, 3), 10);
            if (isNaN(code) || line.charAt(3) === '-') continue;

            if (step === 0 && code === 220) {
              step = 1;
              send(`EHLO localhost`);
            } else if (step === 1 && code === 250) {
              // Si no es SSL directo (ej. puerto 587 o 25) y aún no se ha hecho STARTTLS
              if (!isUpgradedTls && (config.port === 587 || config.port === 25)) {
                step = 100; // Estado intermedio para esperar respuesta de STARTTLS
                send(`STARTTLS`);
              } else {
                step = 2;
                send(`AUTH LOGIN`);
              }
            } else if (step === 100 && code === 220) {
              // Negociar capa TLS sobre el socket abierto
              activeSocket.removeAllListeners('data');
              activeSocket.removeAllListeners('error');
              const tlsSocket = tls.connect({
                socket: activeSocket,
                host: config.host,
                rejectUnauthorized,
                servername: config.host,
              });
              activeSocket = tlsSocket;
              isUpgradedTls = true;
              attachListeners(tlsSocket);
              step = 1;
              send(`EHLO localhost`);
            } else if (step === 2 && code === 334) {
              step = 3;
              send(Buffer.from(config.user).toString('base64'));
            } else if (step === 3 && code === 334) {
              step = 4;
              send(Buffer.from(config.pass).toString('base64'));
            } else if (step === 4 && code === 235) {
              step = 5;
              const mailFrom = cleanFrom.includes('<') ? cleanFrom.replace(/.*<([^>]+)>.*/, '$1') : cleanFrom;
              send(`MAIL FROM:<${mailFrom}>`);
            } else if (step === 5 && code === 250) {
              step = 6;
              send(`RCPT TO:<${cleanTo}>`);
            } else if (step === 6 && code === 250) {
              step = 7;
              send(`DATA`);
            } else if (step === 7 && code === 354) {
              step = 8;
              const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
              const message = [
                `From: ${cleanFrom}`,
                `To: ${cleanTo}`,
                `Subject: =?UTF-8?B?${Buffer.from(cleanSubject).toString('base64')}?=`,
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
              activeSocket.end();
              resolve();
              return;
            } else if (code >= 400) {
              clearTimeout(timeout);
              activeSocket.destroy();
              reject(new Error(`Error SMTP (${code}): ${line}`));
              return;
            }
          }
        });

        s.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      };

      attachListeners(activeSocket);
    });
  }
}
