export function renderNotificationsTab(): string {
  return `      <!-- ================= TAB 5: CENTRO DE NOTIFICACIONES ================= -->
      <section id="tab-notifications" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                <span>Centro de Notificaciones & Alertas en Tiempo Real</span>
              </div>
              <div class="section-desc">Recibe avisos instantáneos con los datos del comprador, importes contables y número asignado en Factusol cada vez que entra un pedido web.</div>
            </div>
          </div>
        </div>

        <!-- ================= 1. ALERTA POR CORREO ELECTRÓNICO (SMTP PROPIO) ================= -->
        <div class="form-section" style="margin-top: 16px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.02);">
          <div class="section-header">
            <div>
              <div class="section-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; color: #fff;">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <span>1. Correo Electrónico (Servidor SMTP Propio)</span>
                </div>
                <span class="tag tag-blue" style="font-size: 11px;">Remitente Corporativo Propio</span>
              </div>
              <div class="section-desc">Envía correos electrónicos directamente desde el servidor de tu empresa (Gmail, Outlook, hosting Plesk/cPanel) sin límites ni intermediarios.</div>
            </div>
          </div>

          <label class="checkbox-row" style="margin-top: 10px;">
            <input type="checkbox" id="check-order-alerts-enabled" onchange="toggleOrderAlertsSection(this.checked)">
            <div>
              <div class="checkbox-label">Activar alertas de nuevos pedidos por correo electrónico</div>
              <div class="checkbox-desc">Envía el desglose completo del pedido, cliente, base imponible, desglose de IVA y número de albarán/pedido en Factusol.</div>
            </div>
          </label>

          <div id="order-alerts-panel" style="margin-top: 16px; display: none;">
            <div class="form-group">
              <label class="form-label">Email(s) para recibir las alertas:</label>
              <input type="text" id="input-notif-email" class="form-control" placeholder="pedidos@empresa.com, almacen@empresa.com">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Puedes indicar varios destinatarios separándolos por comas.</div>
            </div>

            <div style="margin-top: 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 14px 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #e4e4e7; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                <span>Configuración de tu Servidor de Correo Saliente (SMTP)</span>
              </div>
              <div style="font-size: 11px; color: var(--text-subtle); margin-bottom: 12px;">
                Introduce los datos del servidor de correo de tu dominio para que el agente despache las alertas con total seguridad desde tu propia cuenta.
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Servidor SMTP (Host):</label>
                  <input type="text" id="input-notif-smtp-host" class="form-control" placeholder="mail.tudominio.com o smtp.gmail.com">
                </div>
                <div class="form-group">
                  <label class="form-label">Puerto SMTP:</label>
                  <input type="number" id="input-notif-smtp-port" class="form-control" placeholder="465" value="465">
                </div>
              </div>

              <div class="form-grid" style="margin-top: 10px;">
                <div class="form-group">
                  <label class="form-label">Usuario / Email de envío:</label>
                  <input type="text" id="input-notif-smtp-user" class="form-control" placeholder="pedidos@tudominio.com">
                </div>
                <div class="form-group">
                  <label class="form-label">Contraseña SMTP:</label>
                  <input type="password" id="input-notif-smtp-pass" class="form-control" placeholder="••••••••••••">
                </div>
              </div>

              <div class="form-group" style="margin-top: 10px;">
                <label class="form-label">Nombre del Remitente (Opcional):</label>
                <input type="text" id="input-notif-smtp-from" class="form-control" placeholder="Bentian Factusol &lt;pedidos@tudominio.com&gt;">
              </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px;">
              <button onclick="testOrderEmail()" id="btn-test-email" type="button" class="btn" style="border: 1px solid rgba(255, 255, 255, 0.15); background: #1f1f23; color: #e4e4e7;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                <span>Enviar Correo de Prueba</span>
              </button>
            </div>
            <div id="email-test-status" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>
        </div>

        <!-- ================= 2. ALERTA INSTANTÁNEA POR TELEGRAM BOT ================= -->
        <div class="form-section" style="margin-top: 20px; border: 1px solid rgba(56, 189, 248, 0.2); background: rgba(56, 189, 248, 0.02);">
          <div class="section-header">
            <div>
              <div class="section-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; color: #fff;">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  <span>2. Telegram Bot (Avisos Instantáneos al Móvil)</span>
                </div>
                <span class="tag tag-green" style="font-size: 11px;">100% Gratuito & Sin Límites</span>
              </div>
              <div class="section-desc">Recibe un mensaje push en tu teléfono en el mismo segundo en que el cliente compra en la web y el pedido entra en Factusol.</div>
            </div>
          </div>

          <label class="checkbox-row" style="margin-top: 10px;">
            <input type="checkbox" id="check-telegram-alerts-enabled" onchange="toggleTelegramSection(this.checked)">
            <div>
              <div class="checkbox-label">Activar alertas de nuevos pedidos por Telegram</div>
              <div class="checkbox-desc">Envía el aviso directamente a tu chat privado de Telegram o a un grupo de empleados del almacén.</div>
            </div>
          </label>

          <div id="telegram-alerts-panel" style="margin-top: 16px; display: none;">
            <div class="p-3 rounded-lg bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 mb-4" style="background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 12px 14px; color: #bae6fd; font-size: 11.5px; line-height: 1.5;">
              <strong style="color: #fff; display: block; margin-bottom: 4px;">¿Cómo configurar tu Bot de Telegram en 30 segundos?</strong>
              1. En Telegram, abre una conversación con <b>@BotFather</b> y escribe <code>/newbot</code>.<br>
              2. Elige un nombre para tu bot y copia el <b>HTTP API Token</b> que te entregue.<br>
              3. Abre tu nuevo bot, pulsa <b>Iniciar</b> (o escribe <code>/start</code>), y pega tu Chat ID (puedes obtenerlo hablando con <b>@userinfobot</b>).
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Token del Bot de Telegram (Bot Token):</label>
                <input type="text" id="input-notif-telegram-token" class="form-control font-mono" placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ">
              </div>
              <div class="form-group">
                <label class="form-label">Chat ID o Grupo de Telegram:</label>
                <input type="text" id="input-notif-telegram-chatid" class="form-control font-mono" placeholder="123456789 o -100123456789">
              </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px;">
              <button onclick="testTelegramAlert()" id="btn-test-telegram" type="button" class="btn" style="border: 1px solid rgba(56, 189, 248, 0.3); background: rgba(56, 189, 248, 0.1); color: #7dd3fc;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                <span>Enviar Mensaje de Prueba a Telegram</span>
              </button>
            </div>
            <div id="telegram-test-status" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>
        </div>

        <!-- ================= 3. ALERTA PARA EL EQUIPO EN DISCORD WEBHOOK ================= -->
        <div class="form-section" style="margin-top: 20px; border: 1px solid rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.02);">
          <div class="section-header">
            <div>
              <div class="section-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; color: #fff;">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 6h0a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h0"/><path d="m9 10 2 2 4-4"/></svg>
                  <span>3. Discord (Webhook para Canales de Equipo)</span>
                </div>
                <span class="tag tag-indigo" style="font-size: 11px;">Canales de Empresa</span>
              </div>
              <div class="section-desc">Publica una tarjeta enriquecida con los artículos y totales directamente en el canal de ventas o almacén de tu servidor de Discord.</div>
            </div>
          </div>

          <label class="checkbox-row" style="margin-top: 10px;">
            <input type="checkbox" id="check-discord-alerts-enabled" onchange="toggleDiscordSection(this.checked)">
            <div>
              <div class="checkbox-label">Activar alertas de nuevos pedidos por Discord Webhook</div>
              <div class="checkbox-desc">Publica notificaciones embed automáticas con el desglose de líneas y datos del cliente.</div>
            </div>
          </label>

          <div id="discord-alerts-panel" style="margin-top: 16px; display: none;">
            <div class="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200 mb-4" style="background: rgba(99, 102, 241, 0.06); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; padding: 12px 14px; color: #c7d2fe; font-size: 11.5px; line-height: 1.5;">
              <strong style="color: #fff; display: block; margin-bottom: 4px;">¿Cómo obtener tu Webhook de Discord?</strong>
              En tu servidor de Discord, entra a los <b>Ajustes del Canal</b> (rueda de engranaje) ➔ <b>Integraciones</b> ➔ <b>Webhooks</b> ➔ <b>Nuevo Webhook</b> y pulsa en <b>Copiar URL del Webhook</b>.
            </div>

            <div class="form-group">
              <label class="form-label">URL del Webhook de Discord:</label>
              <input type="text" id="input-notif-discord-webhook" class="form-control font-mono" placeholder="https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz...">
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px;">
              <button onclick="testDiscordAlert()" id="btn-test-discord" type="button" class="btn" style="border: 1px solid rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.1); color: #a5b4fc;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                <span>Enviar Tarjeta de Prueba a Discord</span>
              </button>
            </div>
            <div id="discord-test-status" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>
        </div>

        <!-- ================= BOTÓN GLOBAL DE GUARDAR ================= -->
        <div style="display: flex; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <button onclick="saveNotificationSettings()" class="btn btn-primary btn-lg" style="background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25);">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Guardar Configuración de Notificaciones</span>
          </button>
        </div>
      </section>`;
}
