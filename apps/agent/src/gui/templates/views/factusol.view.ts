export function renderFactusolTab(): string {
  return `      <!-- ================= TAB 2: FACTUSOL ERP ================= -->
      <section id="tab-factusol" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Base de Datos Factusol (.accdb / .mdb)</div>
              <div class="section-desc">Selecciona o introduce la base de datos de tu Factusol. Admite disco local (C:\\...), unidades de red (X:\\...) y rutas de red UNC hacia tu NAS u otro equipo (\\\\NAS\\...).</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="detectFactusol()" id="btn-detect-fact" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Auto-detectar Factusol</span>
              </button>
              <button onclick="openNativeWindowsDialog()" id="btn-browse-native" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #1d4ed8, #2563eb); border: none; font-weight: 600;" title="Abre el selector nativo de Windows donde aparece el equipo, la Red y el NAS">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/></svg>
                <span>Examinar en Windows (Local / Red / NAS)</span>
              </button>
            </div>
          </div>

          <div id="factusol-detected-box" class="form-group" style="display: none;">
            <label class="form-label" id="factusol-detected-label">Empresas detectadas en Factusol:</label>
            <div id="factusol-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <label class="form-label" style="margin-bottom: 0;">Ruta de la base de datos (o carpeta de Factusol):</label>
              <span style="font-size: 11px; color: #818cf8; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="document.getElementById('input-factusol-db').focus()" title="Puedes escribir o pegar cualquier ruta directamente">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                <span>Escribir o pegar directamente</span>
              </span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">
              Introduce la ruta del archivo <code>.accdb</code> o la carpeta de datos. Si tu Factusol está en un <strong>NAS, servidor o unidad de red</strong> (ej: <code>X:\\Datos\\FS\\2262026.accdb</code> o <code>\\\\192.168.1.50\\Datos\\FS\\...</code>), pégala directamente aquí y pulsa en <strong>Guardar Ajustes Factusol</strong>.
            </div>
            <div class="input-with-button">
              <input type="text" id="input-factusol-db" oninput="cleanPathInput(this)" onblur="handleFactusolInputBlur()" class="form-control" placeholder="C:\\\\Software DELSOL\\\\Factusol\\\\Datos\\\\FS\\\\2262026.accdb  o  X:\\\\Datos\\\\FS\\\\...  o  \\\\\\\\NAS\\\\Datos\\\\..." style="font-family: monospace; font-size: 13px;">
              <button onclick="testFactusolConnection()" id="btn-test-fact" class="btn btn-secondary" style="white-space: nowrap;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Probar Conexión</span>
              </button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
              <span style="font-size: 11px; color: var(--text-subtle); display: inline-flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>Las comillas de 'Copiar como ruta de acceso' de Windows se limpian automáticamente al pegar.</span>
              </span>
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
              <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
                <span>Serie para Pedidos Web:</span>
                <span class="tag" style="font-size: 10px; padding: 2px 7px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #e4e4e7; display: inline-flex; align-items: center; gap: 4px;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>Recomendado: 1</span>
                </span>
              </label>
              <input type="text" id="input-factusol-order-series" class="form-control" value="1" maxlength="1" placeholder="1" style="text-transform: uppercase; font-weight: 700; width: 64px;">
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px; line-height: 1.4;">
                <strong style="color: #a5b4fc;">Recomendado '1' (Directo y a prueba de despistes):</strong> los pedidos entran en la bandeja principal de Factusol y están a la vista de cualquiera al entrar. Si usas <strong>'W' (Separada)</strong>, los pedidos quedan contablemente aislados pero requerirá cambiar el filtro en Factusol a 'Todas' o 'Serie W' para verlos.
              </div>
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
