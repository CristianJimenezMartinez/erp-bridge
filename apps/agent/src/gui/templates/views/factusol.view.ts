export function renderFactusolTab(): string {
  return `      <!-- ================= TAB 2: ERP CONFIGURATION ================= -->
      <section id="tab-factusol" class="tab-pane">
        <!-- Cabecera de ERP Activo & Switch Modal Trigger -->
        <div class="form-section" style="padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div id="erp-active-icon-container" style="width: 42px; height: 42px; border-radius: 10px; background: rgba(59,130,246,0.12); display: flex; align-items: center; justify-content: center; color: #60a5fa; flex-shrink: 0;">
              <svg id="erp-active-icon-factusol" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
              <svg id="erp-active-icon-simplygest" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: none;"><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M3 9h18"/><path d="M7 15h4"/><path d="M15 15h2"/></svg>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="erp-active-title" style="font-weight: 700; font-size: 16px; color: #fff;">Factusol (Software DELSOL)</span>
                <span id="erp-active-status-badge" class="tag tag-blue" style="font-size: 10px;">● Activo</span>
              </div>
              <div id="erp-active-desc" style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Sincronización directa mediante motor OLEDB de Factusol (.accdb / .mdb).
              </div>
            </div>
          </div>
          <div>
            <button onclick="openSwitchErpModal()" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
              <span>Cambiar Software de Gestión...</span>
            </button>
          </div>
        </div>

        <!-- ================= PANEL 1: FACTUSOL ERP ================= -->
        <div id="panel-erp-factusol">
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

          <!-- Explorador de Artículos Factusol -->
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
        </div>

        <!-- ================= PANEL 2: SIMPLYGEST DESKTOP ================= -->
        <div id="panel-erp-simplygest" style="display: none;">
          <div class="form-section">
            <div class="section-header">
              <div>
                <div class="section-title">Base de Datos SimplyGest (Datos.mdb)</div>
                <div class="section-desc">Selecciona la base de datos principal de SimplyGest (<code>Datos.mdb</code>). Admite disco local (<code>C:\\SimplyGest\\Datos.mdb</code>), unidades de red (<code>Z:\\...</code>) y rutas de red UNC (<code>\\\\NAS\\Datos\\...</code>).</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button onclick="detectSimplyGest()" id="btn-detect-simplygest" class="btn btn-secondary btn-sm">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <span>Auto-detectar SimplyGest</span>
                </button>
                <button onclick="openNativeWindowsDialogSimplyGest()" id="btn-browse-native-simplygest" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #059669, #10b981); border: none; font-weight: 600;" title="Abre el selector nativo de Windows (Local / Red / NAS)">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/></svg>
                  <span>Examinar en Windows (Local / Red / NAS)</span>
                </button>
              </div>
            </div>

            <div id="simplygest-detected-box" class="form-group" style="display: none;">
              <label class="form-label" id="simplygest-detected-label">Instalaciones detectadas de SimplyGest:</label>
              <div id="simplygest-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                <label class="form-label" style="margin-bottom: 0;">Ruta del archivo Datos.mdb (o carpeta de SimplyGest):</label>
                <span style="font-size: 11px; color: #34d399; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="document.getElementById('input-simplygest-db').focus()" title="Puedes escribir o pegar cualquier ruta directamente">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  <span>Escribir o pegar directamente</span>
                </span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">
                Introduce la ruta del archivo <code>Datos.mdb</code>. Si tu base de datos está en un servidor o NAS (ej: <code>Z:\\SimplyGest\\Datos.mdb</code> o <code>\\\\SERVIDOR\\SimplyGest\\Datos.mdb</code>), escríbela directamente aquí y haz clic en <strong>Guardar Ajustes SimplyGest</strong>.
              </div>
              <div class="input-with-button">
                <input type="text" id="input-simplygest-db" oninput="cleanPathInput(this)" onblur="handleSimplyGestInputBlur()" class="form-control" placeholder="C:\\\\SimplyGest\\\\Datos.mdb  o  Z:\\\\SimplyGest\\\\Datos.mdb  o  \\\\\\\\NAS\\\\SimplyGest\\\\Datos.mdb" style="font-family: monospace; font-size: 13px;">
                <button onclick="testSimplyGestConnection()" id="btn-test-simplygest" class="btn btn-secondary" style="white-space: nowrap;">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                  <span>Probar Conexión</span>
                </button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                <span style="font-size: 11px; color: var(--text-subtle); display: inline-flex; align-items: center; gap: 5px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span>Soporta rutas con espacios y comillas de Windows limpiadas automáticamente.</span>
                </span>
              </div>
              <div id="simplygest-test-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Tarifa de Venta Habitual (SimplyGest):</label>
                <select id="select-simplygest-tariff" class="form-control form-select">
                  <option value="1">1: Tarifa 1 (PVP / General)</option>
                  <option value="2">2: Tarifa 2 (Web / Comercio)</option>
                  <option value="3">3: Tarifa 3 (Mayorista)</option>
                  <option value="4">4: Tarifa 4 (Especial)</option>
                  <option value="5">5: Tarifa 5 (Distribuidor)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Almacén de Stock:</label>
                <select id="select-simplygest-warehouse" class="form-control form-select">
                  <option value="1">1: Almacén Principal</option>
                  <option value="2">2: Almacén Secundario</option>
                  <option value="GEN">GEN: Todos los Almacenes (Consolidado)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Serie de Pedidos Web:</span>
                  <span class="tag" style="font-size: 10px; padding: 2px 7px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #e4e4e7; display: inline-flex; align-items: center; gap: 4px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span>Recomendado: 1</span>
                  </span>
                </label>
                <input type="text" id="input-simplygest-order-series" class="form-control" value="1" maxlength="2" placeholder="1" style="text-transform: uppercase; font-weight: 700; width: 64px;">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px; line-height: 1.4;">
                  <strong style="color: #6ee7b7;">Recomendado '1':</strong> los pedidos de tu tienda online entran en la bandeja principal de ventas de SimplyGest con visibilidad inmediata para tu equipo.
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
              <button onclick="saveSimplyGestSettings()" class="btn btn-primary" style="background: linear-gradient(135deg, #059669, #10b981); border: none;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Guardar Ajustes SimplyGest</span>
              </button>
            </div>
          </div>

          <!-- Explorador de Artículos SimplyGest -->
          <div class="table-container">
            <div class="table-toolbar">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 14px; font-weight: 600; color: #fff;">Vista Previa de Artículos SimplyGest</span>
                <span id="simplygest-article-count-tag" class="tag tag-green">0 arts.</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="filter-simplygest-articles-input" onkeyup="filterSimplyGestArticlesTable()" placeholder="Filtrar por código o nombre..." class="form-control" style="width: 220px; padding: 5px 10px; font-size: 11px;">
                <button onclick="loadSimplyGestPreview()" id="btn-refresh-simplygest-preview" class="btn btn-secondary btn-sm">
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
              <tbody id="simplygest-articles-table-body">
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Cargando catálogo SimplyGest...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ================= MODAL: CAMBIAR ERP CON CONFIRMACIÓN (GRID 3x2) ================= -->
        <div id="modal-switch-erp" class="modal-overlay" style="display: none;" onclick="if(event.target === this) closeSwitchErpModal()">
          <div class="modal-card" style="max-width: 960px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 24px 28px;">
            <div class="modal-header" style="margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; color: #818cf8;">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 3 4 4-4 4"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7H4"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 21-4-4 4-4"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 17h16"/></svg>
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 16px; color: #fff;">Cambiar Software ERP Activo</div>
                  <div style="font-size: 12px; color: var(--text-muted);">Selecciona el programa con el que sincronizarás ventas, precios y existencias. Cada software conserva sus rutas y ajustes guardados de forma independiente.</div>
                </div>
              </div>
              <button onclick="closeSwitchErpModal()" class="btn btn-secondary btn-sm" style="padding: 0; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="modal-body" style="padding-top: 14px;">
              <!-- GRID DE 6 TARJETAS EN 3x2 -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 14px; margin-bottom: 20px;">
                
                <!-- 1. FACTUSOL -->
                <div id="modal-choice-factusol" class="channel-card selected" style="cursor: pointer; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 130px; transition: all 0.2s;" onclick="selectModalErp('factusol')">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(59,130,246,0.15); display: flex; align-items: center; justify-content: center; color: #60a5fa;">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
                        </div>
                        <span style="font-weight: 700; color: #fff; font-size: 13.5px;">Factusol</span>
                      </div>
                      <span id="modal-badge-factusol" class="tag tag-blue" style="font-size: 9.5px;">Seleccionado</span>
                    </div>
                    <div style="font-size: 11px; color: #93c5fd; margin-bottom: 4px; font-weight: 600;">Software DELSOL (Local o Red)</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Bases de datos Access (.accdb y .mdb). Versiones 2018 a 2026, unidades de red y NAS.</div>
                  </div>
                </div>

                <!-- 2. SIMPLYGEST -->
                <div id="modal-choice-simplygest" class="channel-card" style="cursor: pointer; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 130px; transition: all 0.2s;" onclick="selectModalErp('simplygest')">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(16,185,129,0.15); display: flex; align-items: center; justify-content: center; color: #34d399;">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M3 9h18"/><path d="M7 15h4"/><path d="M15 15h2"/></svg>
                        </div>
                        <span style="font-weight: 700; color: #fff; font-size: 13.5px;">SimplyGest</span>
                      </div>
                      <span id="modal-badge-simplygest" class="tag" style="font-size: 9.5px; background: rgba(255,255,255,0.06); color: var(--text-muted);">Disponible</span>
                    </div>
                    <div style="font-size: 11px; color: #6ee7b7; margin-bottom: 4px; font-weight: 600;">SimplyGest Software</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Base de datos Datos.mdb. Acceso directo a tarifas, existencias y pedidos comerciales.</div>
                  </div>
                </div>

                <!-- 3. SAGE 50 / 200 -->
                <div class="channel-card" style="cursor: pointer; opacity: 0.65; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 130px;" onclick="showSmartToast({ title: 'Sage 50 / 200', message: 'Conector en fase de desarrollo en el roadmap de Bentian. ¡Próximamente disponible!', type: 'info' })">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(34,197,94,0.12); display: flex; align-items: center; justify-content: center; color: #4ade80;">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.5L19 7.5V19a2 2 0 0 1-2 2z"/></svg>
                        </div>
                        <span style="font-weight: 700; color: #fff; font-size: 13.5px;">Sage 50 / 200</span>
                      </div>
                      <span class="tag tag-amber" style="font-size: 9px;">Próximamente</span>
                    </div>
                    <div style="font-size: 11px; color: #86efac; margin-bottom: 4px; font-weight: 600;">Sage Connected</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Integración con contabilidad y gestión comercial Sage para empresas y despachos.</div>
                  </div>
                </div>

                <!-- 4. HOLDED CLOUD ERP -->
                <div class="channel-card" style="cursor: pointer; opacity: 0.65; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 130px;" onclick="showSmartToast({ title: 'Holded ERP Cloud', message: 'Conector Cloud en fase de pruebas beta. Estará disponible en la siguiente versión.', type: 'info' })">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(168,85,247,0.15); display: flex; align-items: center; justify-content: center; color: #c084fc;">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 0 0 4 4h9a5 5 0 1 0-.1-9.999 5.002 5.002 0 0 0-9.78 2.096A4.001 4.001 0 0 0 3 15z"/></svg>
                        </div>
                        <span style="font-weight: 700; color: #fff; font-size: 13.5px;">Holded Cloud</span>
                      </div>
                      <span class="tag" style="font-size: 9px; background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.3);">En Desarrollo</span>
                    </div>
                    <div style="font-size: 11px; color: #d8b4fe; margin-bottom: 4px; font-weight: 600;">Holded Technologies</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Sincronización API cloud-to-cloud de inventario en tiempo real y facturación automática.</div>
                  </div>
                </div>

                <!-- 5. ODOO ERP -->
                <div class="channel-card" style="cursor: pointer; opacity: 0.65; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 130px;" onclick="showSmartToast({ title: 'Odoo ERP', message: 'Conector Odoo Community & Enterprise en roadmap oficial.', type: 'info' })">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(20,184,166,0.15); display: flex; align-items: center; justify-content: center; color: #2dd4bf;">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"/></svg>
                        </div>
                        <span style="font-weight: 700; color: #fff; font-size: 13.5px;">Odoo Community / Ent.</span>
                      </div>
                      <span class="tag tag-blue" style="font-size: 9px;">Próximamente</span>
                    </div>
                    <div style="font-size: 11px; color: #99f6e4; margin-bottom: 4px; font-weight: 600;">Odoo S.A.</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Conexión XML-RPC / JSON-RPC para artículos, existencias multialmacén y ventas.</div>
                  </div>
                </div>

                <!-- 6. A3ERP (WOLTERS KLUWER) -->
                <div class="channel-card" style="cursor: pointer; opacity: 0.65; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; min-height: 130px;" onclick="showSmartToast({ title: 'A3ERP', message: 'Conector para A3ERP (Wolters Kluwer) en roadmap oficial de Bentian.', type: 'info' })">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(245,158,11,0.15); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"/></svg>
                        </div>
                        <span style="font-weight: 700; color: #fff; font-size: 13.5px;">A3ERP</span>
                      </div>
                      <span class="tag tag-amber" style="font-size: 9px;">Próximamente</span>
                    </div>
                    <div style="font-size: 11px; color: #fde68a; margin-bottom: 4px; font-weight: 600;">Wolters Kluwer</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Software estándar de gestión empresarial y contabilidad integral para PYMES.</div>
                  </div>
                </div>

              </div>

              <!-- AVISO PEDAGÓGICO DE CAMBIO -->
              <div style="padding: 12px 16px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 8px; font-size: 12px; color: #fde68a; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span><strong>Aislamiento de tareas de sincronización:</strong> Al confirmar, la interfaz y las tareas en segundo plano operarán exclusivamente con el ERP seleccionado. Las rutas y ajustes del software anterior se conservan en disco para que puedas volver cuando lo desees.</span>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="closeSwitchErpModal()" class="btn btn-secondary">Cancelar</button>
                <button onclick="confirmSwitchErp()" id="btn-confirm-switch-erp" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px; padding: 8px 18px; font-weight: 600;">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Confirmar y Cambiar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>`;
}
