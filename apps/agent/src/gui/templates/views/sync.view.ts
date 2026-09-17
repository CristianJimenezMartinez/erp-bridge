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

        <div class="form-section" style="margin-top: 20px; border: 1px solid rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.03);">
          <div class="section-header">
            <div>
              <div class="section-title" style="color: #60a5fa;">📦 Subida Inicial de Catálogo (Factusol ➔ Tienda Online)</div>
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
