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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
                    <circle cx="12" cy="12" r="12" fill="#10b981"/>
                    <path d="M6 8.5l6 4.5 6-4.5v7.5H6V8.5zm12-2H6c-.5 0-1 .4-1 1l7 5 7-5c0-.6-.5-1-1-1z" fill="#ffffff"/>
                  </svg>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
                    <circle cx="12" cy="12" r="12" fill="#2AABEE"/>
                    <path d="M5.4 11.9c3.9-1.7 6.5-2.8 7.8-3.3 3.7-1.5 4.5-1.8 5-1.8.11 0 .36.03.52.17.14.12.18.28.2.39 0 .09.02.35 0 .54-.2 2.1-1.1 7.4-1.6 10-.2 1.1-.6 1.4-1 1.5-.9.08-1.5-.6-2.4-1.2-1.4-.9-2.1-1.5-3.5-2.4-1.6-1.1-.6-1.7.3-2.7.2-.3 4.4-4 4.5-4.3.01-.04.02-.18-.06-.25-.09-.07-.22-.05-.31-.03-.13.03-2.2 1.4-6.2 4.1-.6.4-1.1.6-1.6.6-.5-.01-1.6-.3-2.3-.5-.9-.3-1.6-.5-1.6-1 .03-.3.4-.6 1.1-.9z" fill="#ffffff"/>
                  </svg>
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
              <button onclick="testTelegramAlert()" id="btn-test-telegram" type="button" class="btn" style="border: 1px solid rgba(56, 189, 248, 0.3); background: rgba(56, 189, 248, 0.1); color: #7dd3fc; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#38bdf8" style="flex-shrink:0;">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
                    <circle cx="12" cy="12" r="12" fill="#5865F2"/>
                    <path d="M17.1 7.2a12.8 12.8 0 0 0-3.2-1 .05.05 0 0 0-.05.02c-.14.25-.3.57-.4.82a12.2 12.2 0 0 0-3.6 0 8 8 0 0 0-.42-.82.05.05 0 0 0-.05-.02 12.7 12.7 0 0 0-3.2 1 .05.05 0 0 0-.02.02C4.1 10.3 3.5 13.3 3.8 16.3a.06.06 0 0 0 .02.04 12.9 12.9 0 0 0 3.9 2 .05.05 0 0 0 .06-.02c.3-.41.57-.85.8-1.3a.05.05 0 0 0-.03-.07 8.5 8.5 0 0 1-1.2-.59.05.05 0 0 1 0-.08c.08-.06.16-.13.24-.2a.05.05 0 0 1 .05 0 9.2 9.2 0 0 0 8 0 .05.05 0 0 1 .05 0c.08.07.16.14.25.2a.05.05 0 0 1 0 .08 8.6 8.6 0 0 1-1.22.6.05.05 0 0 0-.03.07c.24.45.5.9.8 1.3a.05.05 0 0 0 .06.02 12.9 12.9 0 0 0 3.9-2 .05.05 0 0 0 .02-.04c.4-3.5-.7-6.5-2.3-9.1a.04.04 0 0 0-.02-.02zM9.1 14.5c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6c.8 0 1.4.7 1.4 1.6s-.6 1.6-1.4 1.6zm5.8 0c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6c.8 0 1.4.7 1.4 1.6s-.6 1.6-1.4 1.6z" fill="#ffffff"/>
                  </svg>
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
              <button onclick="testDiscordAlert()" id="btn-test-discord" type="button" class="btn" style="border: 1px solid rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.1); color: #a5b4fc; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#a5b4fc" style="flex-shrink:0;">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
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
