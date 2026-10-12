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
              <div class="checkbox-label">Activar Vigilante en Tiempo Real del Software ERP</div>
              <div class="checkbox-desc">Sincroniza al instante cada vez que tu ERP guarda un albarán, factura o modifica existencias.</div>
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
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Espera a que el software ERP libere el archivo antes de leer datos.</div>
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
              <div class="section-desc">Selecciona qué campos de tu ERP se publican en tu web.</div>
            </div>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" id="check-sync-stock" checked>
            <div>
              <div class="checkbox-label">Sincronizar Existencias de Stock</div>
              <div class="checkbox-desc">Actualiza el stock real disponible tomando las unidades de tu software ERP.</div>
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
              <div class="checkbox-desc">Sobreescribe el título del producto en la tienda con la descripción de tu software ERP.</div>
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

          <!-- ================= SECCIÓN HERRAMIENTA SIMULACIÓN PEDIDO DE PRUEBA ================= -->
          <div class="section-header" style="margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--card-border);">
            <div>
              <div class="section-title">🧪 Herramienta de Diagnóstico: Pedido de Prueba & Simulación de Flujo</div>
              <div class="section-desc">Valida el circuito completo con Factusol (OLEDB, catálogo, cuadre de IVA 21% e inserción atómica) sin compra web.</div>
            </div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--card-border); border-radius: 10px; padding: 18px; margin-top: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
              <div>
                <div style="font-weight: 600; font-size: 13.5px; color: #fff;">Simulador de Flujo Factusol (End-to-End)</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; max-width: 580px; line-height: 1.45;">
                  Verifica el decremento de stock y la inserción correlativa en <code style="font-size:11px;color:#a5b4fc;">F_PCL</code> y <code style="font-size:11px;color:#a5b4fc;">F_LPC</code> con total seguridad en modo simulación (Dry-Run) o registro real.
                </div>
              </div>
              <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button type="button" id="btn-simulate-order" onclick="runSimulationOrder(true)" class="btn btn-secondary" style="font-weight: 600; padding: 8px 16px; border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.08);">
                  <span id="btn-sim-spinner" style="display: none; margin-right: 6px;" class="spin">⏳</span>
                  <span>🧪 Simular Pedido de Prueba</span>
                </button>
                <button type="button" id="btn-simulate-order-real" onclick="runSimulationOrder(false)" class="btn btn-primary" style="font-weight: 600; padding: 8px 16px; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);">
                  <span>⚡ Generar Pedido Real</span>
                </button>
              </div>
            </div>

            <!-- Contenedor del checklist de resultados interactivo inline -->
            <div id="sim-order-results-container" style="display: none; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--card-border);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
                  <span id="sim-order-badge-status" class="tag tag-green">Simulación Completada</span>
                  <span id="sim-order-summary-title">Checklist de Verificación</span>
                </div>
                <button type="button" onclick="document.getElementById('sim-order-results-container').style.display='none'" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 11px;">Ocultar</button>
              </div>
              <div id="sim-order-checklist" style="display: flex; flex-direction: column; gap: 8px;">
                <!-- Rellenado dinámicamente con sync.script.ts -->
              </div>
            </div>
          </div>
        </div>

        <!-- ================= MODAL VISUALIZADOR DE PEDIDO DE PRUEBA ================= -->
        <div id="modal-test-order-simulation" class="modal-overlay" onclick="if(event.target === this) closeTestOrderModal()">
          <div class="modal-card" style="max-width: 640px;">
            <div class="modal-header" style="border-bottom: 1px solid var(--card-border); background: #17171d;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(99, 102, 241, 0.15); display: flex; align-items: center; justify-content: center; color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3);">
                  🧪
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 14px; color: #fff;" id="modal-sim-order-title">Simulación de Pedido de Factusol</div>
                  <div style="font-size: 11px; color: var(--text-muted);" id="modal-sim-order-subtitle">Comprobando circuito de integración Factusol OLEDB...</div>
                </div>
              </div>
              <button onclick="closeTestOrderModal()" class="btn btn-secondary btn-sm" style="padding: 0; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;">✕</button>
            </div>
            <div class="modal-body" style="padding: 20px 24px;">
              <div id="modal-sim-order-checklist" style="display: flex; flex-direction: column; gap: 10px;">
                <!-- Checklist visual inyectado -->
              </div>
              <div id="modal-sim-order-details-card" style="display: none; margin-top: 18px; padding: 14px 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: 8px;">
                <!-- Detalles de totales, artículo y stock -->
              </div>
            </div>
            <div class="modal-footer" style="padding: 12px 24px; display: flex; justify-content: space-between; align-items: center;">
              <div id="modal-sim-order-timing" style="font-size: 11.5px; color: var(--text-subtle);"></div>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="closeTestOrderModal()">Cerrar</button>
                <button type="button" id="btn-modal-sim-view-orders" class="btn btn-primary btn-sm" style="display: none;" onclick="closeTestOrderModal(); if (typeof switchTab === 'function') switchTab('history'); if (typeof loadSalesOrders === 'function') loadSalesOrders();">
                  Ver en Historial de Pedidos →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>`;

}
