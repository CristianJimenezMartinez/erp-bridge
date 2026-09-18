export function renderFactusolTab(): string {
  return `      <!-- ================= TAB 2: FACTUSOL ERP ================= -->
      <section id="tab-factusol" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Base de Datos Factusol (.accdb / .mdb)</div>
              <div class="section-desc">Selecciona la base de datos de tu empresa en Factusol para lectura directa local.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="detectFactusol()" id="btn-detect-fact" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Auto-detectar Factusol</span>
              </button>
              <button onclick="browseFactusol()" id="btn-browse-fact" class="btn btn-primary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>
                <span>Examinar mi PC</span>
              </button>
            </div>
          </div>

          <div id="factusol-detected-box" class="form-group" style="display: none;">
            <label class="form-label" id="factusol-detected-label">Empresas detectadas en Factusol:</label>
            <div id="factusol-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Ruta de la base de datos (o carpeta de Factusol):</label>
            <div class="input-with-button">
              <input type="text" id="input-factusol-db" onblur="handleFactusolInputBlur()" class="form-control" placeholder="C:\\\\Software DELSOL\\\\Factusol\\\\Datos\\\\FS\\\\0012026.accdb">
              <button onclick="testFactusolConnection()" id="btn-test-fact" class="btn btn-secondary" style="white-space: nowrap;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Probar Conexión</span>
              </button>
            </div>
            <div id="fact-test-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Tarifa de Precios a Publicar (Habitual):</label>
              <select id="select-factusol-tariff" class="form-control form-select">
                <option value="1">1: Tarifa General</option>
                <option value="2">2: Tarifa Web / Internet</option>
                <option value="3">3: Tarifa Contado</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tarifa de Oferta / Rebajas (Opcional):</label>
              <select id="select-factusol-sale-tariff" class="form-control form-select">
                <option value="">-- Ninguna (Sin precio tachado) --</option>
                <option value="2">2: Tarifa Web / Oferta</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Almacén de Stock:</label>
              <select id="select-factusol-warehouse" class="form-control form-select">
                <option value="GEN">GEN: Almacén General</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Serie para Pedidos Web:</label>
              <input type="text" id="input-factusol-order-series" class="form-control" value="A" maxlength="3" placeholder="A">
            </div>
            <div class="form-group">
              <label class="form-label">Serie para Facturas Directas:</label>
              <input type="text" id="input-factusol-inv-series" class="form-control" value="1" maxlength="3" placeholder="1">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
            <button onclick="saveFactusolSettings()" class="btn btn-primary">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Guardar Ajustes Factusol</span>
            </button>
          </div>
        </div>

        <!-- Explorador de Artículos -->
        <div class="table-container">
          <div class="table-toolbar">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 14px; font-weight: 600; color: #fff;">Vista Previa de Artículos Factusol</span>
              <span id="article-count-tag" class="tag tag-amber">0 arts.</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="filter-articles-input" onkeyup="filterArticlesTable()" placeholder="Filtrar por código o nombre..." class="form-control" style="width: 220px; padding: 5px 10px; font-size: 11px;">
              <button onclick="loadArticlePreview()" id="btn-refresh-preview" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>Recargar</span>
              </button>
            </div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 110px;">Código</th>
                <th>Descripción del Artículo</th>
                <th style="width: 90px;">Familia</th>
                <th style="width: 90px; text-align: right;">Stock Real</th>
                <th style="width: 90px; text-align: right;">Precio Venta</th>
                <th style="width: 120px;">Código EAN</th>
              </tr>
            </thead>
            <tbody id="articles-table-body">
              <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Cargando catálogo Factusol...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>`;
}
