export function renderHistoryTab(): string {
  return `      <!-- ================= TAB 5: HISTORIAL ================= -->
      <section id="tab-history" class="tab-pane">
        <!-- Tarjetas KPI -->
        <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 20px;">
          <div class="card" style="padding: 16px 20px;">
            <div class="card-header" style="margin-bottom: 4px;">
              <span class="card-title">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>Total Ventas Hoy</span>
              </span>
              <span class="tag tag-green">Hoy</span>
            </div>
            <div class="card-metric" id="kpi-sales-today-eur">0,00 €</div>
            <div class="card-desc">Facturación de pedidos sincronizados hoy</div>
          </div>

          <div class="card" style="padding: 16px 20px;">
            <div class="card-header" style="margin-bottom: 4px;">
              <span class="card-title">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span>Pedidos Hoy</span>
              </span>
              <span class="tag tag-blue">Importados</span>
            </div>
            <div class="card-metric" id="kpi-sales-today-count">0</div>
            <div class="card-desc">Pedidos procesados desde la tienda</div>
          </div>

          <div class="card" style="padding: 16px 20px;">
            <div class="card-header" style="margin-bottom: 4px;">
              <span class="card-title">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span>Incidencias</span>
              </span>
              <span class="tag tag-rose" id="kpi-sales-issues-tag">Atención</span>
            </div>
            <div class="card-metric" id="kpi-sales-issues-count" style="color: #f87171;">0</div>
            <div class="card-desc">Pedidos con error pendientes de reintento</div>
          </div>
        </div>

        <!-- Selector de Sub-Pestañas -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--card-border); padding-bottom: 12px;">
          <button id="subtab-btn-sales" class="btn btn-secondary btn-sm" onclick="switchHistorySubTab('sales')" style="background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); color: #c7d2fe;">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            <span>Pedidos y Ventas</span>
          </button>
          <button id="subtab-btn-technical" class="btn btn-secondary btn-sm" onclick="switchHistorySubTab('technical')" style="color: var(--text-muted);">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            <span>Ciclos Técnicos de Sync</span>
          </button>
        </div>

        <!-- SUB-TAB 1: PEDIDOS Y VENTAS -->
        <div id="history-subtab-sales">
          <div class="table-container">
            <div class="table-toolbar" style="flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <select id="sales-range-select" class="form-control form-select btn-sm" onchange="onSalesRangeChange(this.value)" style="width: 140px;">
                  <option value="today">Hoy</option>
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                  <option value="month">Este mes</option>
                  <option value="all" selected>Todos los rangos</option>
                </select>
                <input type="text" id="sales-search-input" class="form-control btn-sm" placeholder="Buscar por Nº pedido, cliente, Factusol o SKU..." oninput="onSalesSearchInput(this.value)" style="width: 290px;" />
                <select id="sales-limit-select" class="form-control form-select btn-sm" onchange="onSalesLimitChange(this.value)" style="width: 105px;">
                  <option value="20" selected>20 por pág.</option>
                  <option value="50">50 por pág.</option>
                </select>
              </div>
              <button onclick="loadSalesOrders()" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>Actualizar Ventas</span>
              </button>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 140px;">Nº Pedido Web</th>
                  <th style="width: 130px;">Fecha / Hora</th>
                  <th>Cliente</th>
                  <th style="width: 120px;">Nº Factusol</th>
                  <th style="width: 110px; text-align: right;">Total (€)</th>
                  <th style="width: 120px;">Estado Factusol</th>
                  <th style="width: 160px; text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody id="sales-table-body">
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Cargando pedidos de ventas...</td>
                </tr>
              </tbody>
            </table>
            <!-- Paginador Inferior -->
            <div class="table-toolbar" style="border-top: 1px solid var(--card-border); border-bottom: none; display: flex; justify-content: space-between; align-items: center; padding: 12px 18px;">
              <div style="font-size: 12px; color: var(--text-muted);">
                <span id="sales-pagination-info">Mostrando 0 pedidos</span>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button id="btn-sales-prev" class="btn btn-secondary btn-sm" onclick="changeSalesPage(-1)" disabled>
                  ‹ Anterior
                </button>
                <span id="sales-page-indicator" style="font-size: 12px; font-weight: 600; color: #fff; padding: 0 6px;">Página 1 de 1</span>
                <button id="btn-sales-next" class="btn btn-secondary btn-sm" onclick="changeSalesPage(1)" disabled>
                  Siguiente ›
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-TAB 2: CICLOS TÉCNICOS DE SYNC (Retrocompatibilidad) -->
        <div id="history-subtab-technical" style="display: none;">
          <div class="table-container">
            <div class="table-toolbar">
              <div>
                <span style="font-size: 14px; font-weight: 600; color: #fff;">Ciclos Técnicos de Sincronización</span>
                <div style="font-size: 11px; color: var(--text-subtle); margin-top: 2px;">Registro de sondeos de stock, catálogo e intercambios de datos.</div>
              </div>
              <button onclick="loadSyncHistory()" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>Actualizar Ciclos</span>
              </button>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 90px;">Hora</th>
                  <th style="width: 100px;">Tipo</th>
                  <th style="width: 90px;">Modo</th>
                  <th style="width: 100px;">Estado</th>
                  <th style="width: 90px; text-align: right;">Artículos</th>
                  <th style="width: 90px; text-align: right;">Pedidos</th>
                  <th style="width: 80px; text-align: right;">Duración</th>
                  <th>Resultado / Detalle</th>
                </tr>
              </thead>
              <tbody id="history-table-body">
                <tr>
                  <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Cargando historial técnico...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- MODAL ACCESIBLE DE DETALLE DE PEDIDO -->
        <div id="modal-order-detail" class="modal-overlay" onclick="if(event.target === this) closeOrderDetailModal()">
          <div class="modal-card" style="max-width: 720px;">
            <div class="modal-header">
              <div>
                <div style="font-size: 15px; font-weight: 700; color: #fff;" id="modal-order-title">Detalle del Pedido</div>
                <div style="font-size: 11px; color: var(--text-subtle); margin-top: 2px;" id="modal-order-subtitle">---</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="closeOrderDetailModal()" style="padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>
            <div class="modal-body" id="modal-order-body" style="padding: 20px 24px;">
              <!-- Se rellena dinámicamente con JavaScript -->
            </div>
            <div class="modal-footer" style="padding: 12px 24px;">
              <div id="modal-order-footer-left" style="font-size: 12px; color: var(--text-muted);"></div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" onclick="closeOrderDetailModal()">Cerrar</button>
                <span id="modal-order-retry-slot"></span>
              </div>
            </div>
          </div>
        </div>
      </section>`;
}
