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

    const hasEmail = Boolean(notif?.orderAlertsEnabled && notif?.alertEmail?.trim() && notif?.smtpHost && notif?.smtpUser && notif?.smtpPass);
    const hasTelegram = Boolean(notif?.telegramAlertsEnabled && notif?.telegramBotToken?.trim() && notif?.telegramChatId?.trim());
    const hasDiscord = Boolean(notif?.discordAlertsEnabled && notif?.discordWebhookUrl?.trim());

    if (!hasEmail && !hasTelegram && !hasDiscord) {
      return { success: false, error: 'Ningún canal de notificaciones (Email SMTP, Telegram o Discord) está activo y configurado.' };
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

    // Formato para Telegram
    const telegramText = [
      `📦 <b>¡Nuevo Pedido en Factusol!</b>`,
      `<b>Serie:</b> <code>${escapeHtml(series)}</code> | <b>Factusol Nº:</b> <code>#${escapeHtml(factusolOrderNumber)}</code>`,
      `<b>Tienda:</b> ${escapeHtml(channelLabel)} (Ref: #${escapeHtml(ref)})`,
      `<b>Cliente:</b> ${escapeHtml(customerName)}${customerPhone ? ` (${escapeHtml(customerPhone)})` : ''}`,
      `<b>Total:</b> <b>${escapeHtml(totalEur)} €</b>`,
      order.lines && order.lines.length > 0
        ? `<b>Artículos:</b>\n` + order.lines.slice(0, 8).map(l => ` • ${escapeHtml(l.name)} x${Number(l.quantity)} (${Number(l.total).toFixed(2)} €)`).join('\n')
        : '',
      order.notes ? `<b>Notas:</b> <i>${escapeHtml(order.notes)}</i>` : '',
      `\n<i>Bentian ERP Bridge — Alerta en tiempo real</i>`
    ].filter(Boolean).join('\n');

    // Formato para Discord Webhook
    const discordPayload = {
      embeds: [{
        title: `📦 Nuevo Pedido Factusol: Serie ${series} Nº ${factusolOrderNumber}`,
        description: `Se ha registrado e inyectado con éxito un nuevo pedido desde **${channelLabel}** en Factusol.`,
        color: 0x10b981,
        fields: [
          { name: 'Referencia Web', value: `#${ref}`, inline: true },
          { name: 'Factusol', value: `Serie ${series} - Nº ${factusolOrderNumber}`, inline: true },
          { name: 'Total Pedido', value: `**${totalEur} €**`, inline: true },
          { name: 'Cliente', value: customerName, inline: false },
          { name: 'Artículos', value: order.lines.slice(0, 6).map(l => `• \`${l.sku || 'S/SKU'}\` **${l.name}** x${l.quantity} (${Number(l.total).toFixed(2)} €)`).join('\n') || 'Sin líneas', inline: false }
        ],
        footer: { text: 'Bentian ERP Bridge — Conector Local Factusol' },
        timestamp: new Date().toISOString()
      }]
    };

    const dispatches: Promise<{ channel: string; success: boolean; error?: string }>[] = [];

    // 1. Despacho por Email (SMTP Propio)
    if (hasEmail) {
      dispatches.push((async () => {
        const recipients = notif!.alertEmail!.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
        let anySent = false;
        let lastError: string | undefined;
        for (const recipient of recipients) {
          const res = await this.deliverEmail({
            to: recipient,
            subject,
            html: htmlBody,
            text: textBody,
            settings: notif!,
          });
          if (res.success) anySent = true;
          else lastError = res.error;
        }
        return { channel: 'Email', success: anySent, error: lastError };
      })());
    }

    // 2. Despacho por Telegram
    if (hasTelegram) {
      dispatches.push((async () => {
        const res = await this.sendViaTelegram(notif!.telegramBotToken!, notif!.telegramChatId!, telegramText);
        return { channel: 'Telegram', success: res.success, error: res.error };
      })());
    }

    // 3. Despacho por Discord
    if (hasDiscord) {
      dispatches.push((async () => {
        const res = await this.sendViaDiscord(notif!.discordWebhookUrl!, discordPayload);
        return { channel: 'Discord', success: res.success, error: res.error };
      })());
    }

    const settled = await Promise.allSettled(dispatches);
    let anySuccess = false;
    const errors: string[] = [];

    for (const r of settled) {
      if (r.status === 'fulfilled') {
        if (r.value.success) {
          anySuccess = true;
        } else if (r.value.error) {
          errors.push(`[${r.value.channel}] ${r.value.error}`);
        }
      } else {
        errors.push(`Fallo inesperado: ${r.reason?.message || String(r.reason)}`);
      }
    }

    if (anySuccess) {
      this.notifiedOrders.set(orderKey, now);
    }

    const durationMs = Math.round(performance.now() - tStart);
    AgentDiskLogger.getInstance().log({
      level: anySuccess ? 'SUCCESS' : 'ERROR',
      component: 'OrderNotifier',
      action: 'send_order_alert',
      duration_ms: durationMs,
      status: anySuccess ? 'SUCCESS' : 'FAILURE',
      message: anySuccess
        ? `Aviso de pedido #${ref} (Factusol ${series}-${factusolOrderNumber}) despachado con éxito en ${durationMs}ms`
        : `Fallo al enviar alertas de pedido #${ref}: ${errors.join(', ')}`,
      metadata: { ref, factusolOrderNumber, series, hasEmail, hasTelegram, hasDiscord },
    });

    return { success: anySuccess, error: errors.length > 0 ? errors.join(' | ') : undefined };
  }

  public static async sendTestEmail(settings: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    if (!settings.alertEmail || !settings.alertEmail.trim()) {
      return { success: false, message: 'Debe especificar al menos un email de destino en la casilla de alertas.' };
    }
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
      return { success: false, message: 'Debe configurar los datos del servidor SMTP propio (Host, Usuario y Contraseña) para enviar correos.' };
    }

    const subject = `🔔 [Bentian ERP Bridge] Correo de Prueba de Alertas Factusol`;
    const text = `Este es un correo de prueba enviado por Bentian ERP Bridge a través de su servidor SMTP propio para verificar la recepción de alertas de nuevos pedidos.\n\nServidor: ${settings.smtpHost}:${settings.smtpPort || 465}\nFecha: ${new Date().toISOString()}`;
    const html = `
      <div style="background:#121215;padding:24px;border-radius:12px;color:#f4f4f5;font-family:sans-serif;max-width:500px;border:1px solid rgba(255,255,255,0.1);">
        <h2 style="color:#34d399;margin-top:0;">✓ Conexión SMTP Correcta</h2>
        <p>Tu configuración para recibir avisos de nuevos pedidos de Factusol está funcionando perfectamente a través de tu propio servidor de correo.</p>
        <div style="background:#18181b;padding:12px;border-radius:8px;font-size:12px;color:#a1a1aa;margin:16px 0;">
          <strong>Servidor SMTP:</strong> ${settings.smtpHost}:${settings.smtpPort || 465}<br>
          <strong>Usuario:</strong> ${settings.smtpUser}<br>
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
    });

    return {
      success: res.success,
      message: res.success
        ? `✓ Correo de prueba enviado con éxito a ${firstRecipient} vía SMTP propio. Revisa tu bandeja de entrada o spam.`
        : `Error al enviar correo vía SMTP: ${res.error || 'Fallo desconocido'}`,
    };
  }

  public static async sendTestTelegram(settings: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    if (!settings.telegramBotToken || !settings.telegramBotToken.trim()) {
      return { success: false, message: 'Debe especificar el Token del Bot de Telegram (ej. 123456789:ABCdef...).' };
    }
    if (!settings.telegramChatId || !settings.telegramChatId.trim()) {
      return { success: false, message: 'Debe especificar el Chat ID o Grupo de Telegram destinatario.' };
    }

    const msg = [
      '🔔 <b>[Bentian ERP Bridge] Prueba de Conexión con Telegram</b>',
      '',
      '¡Tu Bot de Telegram está correctamente configurado y vinculado con Bentian!',
      'A partir de ahora recibirás un mensaje instantáneo en este chat cada vez que un cliente realice una compra y el pedido se registre en Factusol.',
      '',
      `📅 <b>Fecha y hora:</b> <code>${new Date().toLocaleString('es-ES')}</code>`,
      '🏢 <i>Bentian ERP Bridge — Conector Local Factusol</i>'
    ].join('\n');

    const res = await this.sendViaTelegram(settings.telegramBotToken, settings.telegramChatId, msg);
    return {
      success: res.success,
      message: res.success
        ? '✓ Mensaje de prueba enviado con éxito a Telegram. Revisa la conversación con tu bot.'
        : `Error al conectar con Telegram: ${res.error || 'Fallo desconocido'}`,
    };
  }

  public static async sendTestDiscord(settings: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    if (!settings.discordWebhookUrl || !settings.discordWebhookUrl.trim()) {
      return { success: false, message: 'Debe especificar la URL del Webhook de Discord (comienza por https://discord.com/api/webhooks/...).' };
    }

    const payload = {
      embeds: [{
        title: '🔔 [Bentian ERP Bridge] Prueba de Webhook de Discord',
        description: '¡Tu canal de Discord está conectado con éxito a Bentian ERP Bridge!\n\nRecibirás alertas enriquecidas con todos los datos contables cada vez que un pedido entre en Factusol.',
        color: 0x10b981,
        fields: [
          { name: 'Estado', value: '✓ Vinculado y Operativo', inline: true },
          { name: 'Fecha y Hora', value: new Date().toLocaleString('es-ES'), inline: true },
        ],
        footer: { text: 'Bentian ERP Bridge — Conector Local Factusol' },
        timestamp: new Date().toISOString()
      }]
    };

    const res = await this.sendViaDiscord(settings.discordWebhookUrl, payload);
    return {
      success: res.success,
      message: res.success
        ? '✓ Mensaje de prueba enviado con éxito al canal de Discord.'
        : `Error al enviar a Discord: ${res.error || 'Fallo desconocido'}`,
    };
  }

  public static async sendViaTelegram(token: string, chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanToken = token.trim();
      const cleanChatId = chatId.trim();
      const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as any;
        return { success: false, error: errJson.description || `HTTP ${res.status} desde API de Telegram` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: `Fallo al contactar Telegram: ${err.message}` };
    }
  }

  public static async sendViaDiscord(webhookUrl: string, payload: any): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanUrl = webhookUrl.trim();
      if (!cleanUrl.startsWith('https://discord.com/api/webhooks/') && !cleanUrl.startsWith('https://discordapp.com/api/webhooks/')) {
        return { success: false, error: 'URL de Webhook de Discord no válida (debe comenzar por https://discord.com/api/webhooks/)' };
      }
      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { success: false, error: `HTTP ${res.status} desde Discord: ${text.substring(0, 100)}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: `Fallo al contactar Discord: ${err.message}` };
    }
  }

  private static async deliverEmail(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    settings: AgentNotificationSettings;
  }): Promise<{ success: boolean; error?: string }> {
    const { to, subject, html, text, settings } = opts;

    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
      return { success: false, error: 'Se requiere configurar el servidor SMTP propio (Host, Usuario y Contraseña) para enviar alertas por correo.' };
    }

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
      return { success: false, error: `Error SMTP: ${smtpErr.message}` };
    }
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
