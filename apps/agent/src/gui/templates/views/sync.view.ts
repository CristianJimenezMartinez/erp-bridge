export function renderSyncTab(): string {
  return `      <!-- ================= TAB 4: AUTOMATIZACIÓN & REGLAS ================= -->
      <section id="tab-sync" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Vigilante en Tiempo Real y Reglas</div>
              <div class="section-desc">Controla la periodicidad y qué datos tienen permiso para actualizar tu tienda.</div>
            </div>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" id="check-watcher-enabled" checked>
            <div>
              <div class="checkbox-label">Activar Vigilante en Tiempo Real de Factusol</div>
              <div class="checkbox-desc">Sincroniza al instante cada vez que Factusol guarda un albarán, factura o modifica stock.</div>
            </div>
          </label>

          <label class="checkbox-row" style="margin-top: 10px;">
            <input type="checkbox" id="check-autostart-enabled" onchange="toggleAutoStart(this.checked)">
            <div>
              <div class="checkbox-label">Iniciar con Windows (Auto-arranque del Agente)</div>
              <div class="checkbox-desc">Arranca el agente automáticamente en segundo plano en la bandeja del sistema al encender el ordenador.</div>
            </div>
          </label>

          <div class="form-grid" style="margin-top: 14px;">
            <div class="form-group">
              <label class="form-label">Tiempo de estabilización (segundos):</label>
              <input type="number" id="input-debounce-sec" class="form-control" value="5" min="1" max="60">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Espera a que Factusol libere el archivo antes de leer datos.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Sincronización Periódica de Seguridad:</label>
              <select id="select-periodic-min" class="form-control form-select">
                <option value="5">Cada 5 minutos</option>
                <option value="15" selected>Cada 15 minutos (Recomendado)</option>
                <option value="30">Cada 30 minutos</option>
                <option value="60">Cada 1 hora</option>
              </select>
            </div>
          </div>

          <div class="section-header" style="margin-top: 20px;">
            <div>
              <div class="section-title">Datos a Sincronizar</div>
              <div class="section-desc">Selecciona qué campos de Factusol se publican en tu web.</div>
            </div>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" id="check-sync-stock" checked>
            <div>
              <div class="checkbox-label">Sincronizar Existencias de Stock</div>
              <div class="checkbox-desc">Actualiza el stock real disponible tomando las unidades de Factusol.</div>
            </div>
          </label>

          <label class="checkbox-row">
            <input type="checkbox" id="check-sync-prices" checked>
            <div>
              <div class="checkbox-label">Sincronizar Precios de Venta</div>
              <div class="checkbox-desc">Actualiza los precios en la web según la tarifa seleccionada.</div>
            </div>
          </label>

          <label class="checkbox-row">
            <input type="checkbox" id="check-sync-desc">
            <div>
              <div class="checkbox-label">Sincronizar Nombres y Descripciones</div>
              <div class="checkbox-desc">Sobreescribe el título del producto en la tienda con la descripción de Factusol.</div>
            </div>
          </label>

          <div class="form-grid" style="margin-top: 14px;">
            <div class="form-group">
              <label class="form-label">Stock de Seguridad (Buffer de reserva):</label>
              <input type="number" id="input-safety-stock" class="form-control" value="0" min="0" placeholder="0">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Resta estas unidades al stock publicado para evitar roturas físicas en tienda.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Filtro de Artículos:</label>
              <label class="checkbox-row" style="margin-top: 8px;">
                <input type="checkbox" id="check-only-stock-pos">
                <div class="checkbox-label">Solo publicar productos con stock mayor a cero</div>
              </label>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
            <button onclick="saveSyncRules()" class="btn btn-primary">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Guardar Reglas de Sincronización</span>
            </button>
          </div>
        </div>

        <!-- ================= AVISOS DE PEDIDOS POR EMAIL ================= -->
        <div class="form-section" style="margin-top: 20px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03);">
          <div class="section-header">
            <div>
              <div class="section-title" style="display: flex; align-items: center; gap: 8px; color: #fff;">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <span>Avisos de Nuevos Pedidos por Email</span>
              </div>
              <div class="section-desc">Recibe un correo electrónico automático cada vez que un cliente compra en la web y el pedido entra en Factusol (con su serie y número asignado).</div>
            </div>
          </div>

          <label class="checkbox-row" style="margin-top: 10px;">
            <input type="checkbox" id="check-order-alerts-enabled" onchange="toggleOrderAlertsSection(this.checked)">
            <div>
              <div class="checkbox-label">Activar alertas de nuevos pedidos por correo electrónico</div>
              <div class="checkbox-desc">Envía el desglose completo del pedido, cliente, importes y número asignado en Factusol.</div>
            </div>
          </label>

          <div id="order-alerts-panel" style="margin-top: 14px; display: none;">
            <div class="form-group">
              <label class="form-label">Email(s) para recibir las alertas:</label>
              <input type="text" id="input-notif-email" class="form-control" placeholder="pedidos@empresa.com, almacen@empresa.com">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Puedes indicar varios correos separados por comas.</div>
            </div>

            <details style="margin-top: 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 10px 14px;">
              <summary style="font-size: 12px; font-weight: 600; color: #e4e4e7; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                <span>Configuración del Servidor de Correo (SMTP Propio - Opcional)</span>
              </summary>
              <div style="font-size: 11px; color: var(--text-subtle); margin: 6px 0 12px 0;">
                Si lo dejas en blanco, el agente utilizará el servicio de notificaciones seguro de Bentian. Si prefieres enviar desde tu propio correo (Plesk, Gmail, cPanel), completa estos datos:
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
            </details>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; flex-wrap: wrap;">
              <button onclick="testOrderEmail()" id="btn-test-email" type="button" class="btn" style="border: 1px solid rgba(255, 255, 255, 0.15); background: #1f1f23; color: #e4e4e7;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                <span>Probar Envío de Email</span>
              </button>
              <button onclick="saveNotificationSettings()" class="btn btn-primary" style="background: linear-gradient(135deg, #059669, #10b981);">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Guardar Ajustes de Notificaciones</span>
              </button>
            </div>
          </div>
        </div>

        <div class="form-section" style="margin-top: 20px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03);">
          <div class="section-header">
            <div>
              <div class="section-title" style="display: flex; align-items: center; gap: 8px; color: #fff;">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                <span>Subida Inicial de Catálogo (Factusol → Tienda Online)</span>
              </div>
              <div class="section-desc">¿Tu tienda online está recién creada o vacía? Esta función lee los artículos de Factusol y da de alta automáticamente los productos que aún no existan en tu web.</div>
            </div>
          </div>
          <div style="display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-top: 14px; flex-wrap: wrap;">
            <div style="font-size: 12px; color: var(--text-subtle); max-width: 480px; line-height: 1.5;">
              Publica los artículos con su SKU, precio según tarifa, stock inicial, descripción y categoría. Si el producto ya existe en WooCommerce, se omite automáticamente para no duplicarlo ni alterar personalizaciones.
            </div>
            <button onclick="triggerCatalogUpload()" id="btn-upload-catalog" class="btn btn-primary" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              <span>Subir Catálogo a la Web</span>
            </button>
          </div>
          <div id="catalog-upload-feedback" style="display: none; margin-top: 14px; padding: 10px 14px; border-radius: 8px; font-size: 12px; line-height: 1.4;"></div>
        </div>
      </section>`;
}
