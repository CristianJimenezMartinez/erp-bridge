export function renderCatalogAuditTab(): string {
  return `
      <!-- TAB: AUDITORÍA DE CATÁLOGO MULTI-ERP -->
      <div id="tab-catalog-audit" class="tab-pane">

        <!-- Cabecera Contextual Multi-ERP -->
        <div class="card" style="margin-bottom: 18px; border-color: rgba(99, 102, 241, 0.28); background: linear-gradient(135deg, rgba(99, 102, 241, 0.07) 0%, rgba(18, 18, 24, 0.96) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.28); display: flex; align-items: center; justify-content: center; color: #818cf8; flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="m9 14 2 2 4-4"/>
                </svg>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0;">Auditor de Salud e Integridad del Catálogo</h3>
                  <span id="audit-active-erp-badge" class="tag tag-blue">Factusol ERP</span>
                  <span id="audit-source-mode-badge" class="tag" style="background: rgba(255,255,255,0.06); color: var(--text-muted);">En espera</span>
                </div>
                <p style="font-size: 12.5px; color: var(--text-muted); margin: 6px 0 0 0; line-height: 1.5;">
                  Inspección preventiva en solo lectura adaptada a <strong id="audit-active-erp-name" style="color: #e4e4e7;">Factusol ERP</strong>
                  (<span id="audit-active-erp-engine" style="font-family: monospace; font-size: 11.5px; color: #a5b4fc;">Microsoft Access OLEDB (.accdb)</span>).
                  Detecta artículos a 0,00 €, ventas bajo coste, roturas de stock negativo y productos sin foto antes de sincronizar con tu tienda online.
                </p>
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 8px; font-size: 11.5px; color: var(--text-subtle);">
                  <span style="display: inline-flex; align-items: center; gap: 6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
                    <span>Tablas auditadas: <strong id="audit-active-erp-tables" style="color: #d4d4d8; font-weight: 600;">F_ART, F_STO, F_LTA</strong></span>
                  </span>
                  <span style="display: inline-flex; align-items: center; gap: 6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span id="audit-last-run-label">Último análisis: pendiente</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Botonera de Acciones Minimalista -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="switchTab('factusol')" title="Ir a la configuración del ERP activo" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span>Ajustar ERP</span>
              </button>
              <button id="btn-audit-demo" class="btn btn-secondary btn-sm" onclick="loadCatalogAudit(true)" title="Simular auditoría con datos de prueba del ERP seleccionado" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
                <span>Simular Demo</span>
              </button>
              <button id="btn-audit-export-csv" class="btn btn-secondary btn-sm" onclick="exportCatalogAuditCsv()" title="Descargar informe en formato CSV compatible con Microsoft Excel" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Exportar CSV</span>
              </button>
              <button id="btn-audit-run" class="btn btn-primary btn-sm" onclick="loadCatalogAudit(false)" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>Analizar Catálogo</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tarjetas KPI Minimalistas (Clicables para filtrar) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 12px; margin-bottom: 18px;">

          <!-- KPI 1: Salud Global -->
          <div class="card" onclick="setCatalogAuditFilter('ALL')" style="padding: 14px 16px; cursor: pointer; transition: border-color 0.2s;" onmouseover="this.style.borderColor='rgba(99,102,241,0.45)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Salud del Catálogo</span>
              <span style="color: #34d399; display: inline-flex;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </span>
            </div>
            <div id="audit-kpi-health-score" style="font-size: 24px; font-weight: 800; color: #34d399; letter-spacing: -0.02em;">--%</div>
            <div id="audit-kpi-total-sub" style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">0 artículos analizados</div>
          </div>

          <!-- KPI 2: Precio 0,00 € -->
          <div class="card" onclick="setCatalogAuditFilter('ZERO_PRICE')" style="padding: 14px 16px; cursor: pointer; transition: border-color 0.2s;" onmouseover="this.style.borderColor='rgba(244,63,94,0.45)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Precio 0,00 € / Sin PVP</span>
              <span style="color: #f87171; display: inline-flex;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </span>
            </div>
            <div id="audit-kpi-zero-price" style="font-size: 24px; font-weight: 800; color: #f87171; letter-spacing: -0.02em;">0</div>
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Riesgo de venta a 0 €</div>
          </div>

          <!-- KPI 3: Venta Bajo Coste -->
          <div class="card" onclick="setCatalogAuditFilter('BELOW_COST')" style="padding: 14px 16px; cursor: pointer; transition: border-color 0.2s;" onmouseover="this.style.borderColor='rgba(245,158,11,0.45)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">PVP Bajo Coste</span>
              <span style="color: #fbbf24; display: inline-flex;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
              </span>
            </div>
            <div id="audit-kpi-below-cost" style="font-size: 24px; font-weight: 800; color: #fbbf24; letter-spacing: -0.02em;">0</div>
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Margen comercial negativo</div>
          </div>

          <!-- KPI 4: Stock Negativo -->
          <div class="card" onclick="setCatalogAuditFilter('NEGATIVE_STOCK')" style="padding: 14px 16px; cursor: pointer; transition: border-color 0.2s;" onmouseover="this.style.borderColor='rgba(245,158,11,0.45)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Stock Negativo (&lt; 0)</span>
              <span style="color: #fbbf24; display: inline-flex;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
              </span>
            </div>
            <div id="audit-kpi-negative-stock" style="font-size: 24px; font-weight: 800; color: #fbbf24; letter-spacing: -0.02em;">0</div>
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Descuadre de inventario</div>
          </div>

          <!-- KPI 5: Sin Imagen Web -->
          <div class="card" onclick="setCatalogAuditFilter('MISSING_IMAGE')" style="padding: 14px 16px; cursor: pointer; transition: border-color 0.2s;" onmouseover="this.style.borderColor='rgba(99,102,241,0.45)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Sin Fotografía</span>
              <span style="color: #818cf8; display: inline-flex;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </span>
            </div>
            <div id="audit-kpi-missing-image" style="font-size: 24px; font-weight: 800; color: #818cf8; letter-spacing: -0.02em;">0</div>
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Sin imagen para e-commerce</div>
          </div>

          <!-- KPI 6: Ficha Incompleta -->
          <div class="card" onclick="setCatalogAuditFilter('INCOMPLETE_DATA')" style="padding: 14px 16px; cursor: pointer; transition: border-color 0.2s;" onmouseover="this.style.borderColor='rgba(148,163,184,0.45)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Ficha Incompleta</span>
              <span style="color: #94a3b8; display: inline-flex;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </span>
            </div>
            <div id="audit-kpi-incomplete-data" style="font-size: 24px; font-weight: 800; color: #cbd5e1; letter-spacing: -0.02em;">0</div>
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Falta EAN o familia</div>
          </div>

        </div>

        <!-- Tabla de Hallazgos y Filtros -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
            <!-- Filtros por Tipo de Anomalía -->
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm audit-filter-btn active" data-audit-filter="ALL" onclick="setCatalogAuditFilter('ALL')" style="font-size: 11.5px; padding: 5px 10px;">
                Todos los hallazgos
              </button>
              <button type="button" class="btn btn-secondary btn-sm audit-filter-btn" data-audit-filter="ZERO_PRICE" onclick="setCatalogAuditFilter('ZERO_PRICE')" style="font-size: 11.5px; padding: 5px 10px;">
                Precio 0,00 €
              </button>
              <button type="button" class="btn btn-secondary btn-sm audit-filter-btn" data-audit-filter="BELOW_COST" onclick="setCatalogAuditFilter('BELOW_COST')" style="font-size: 11.5px; padding: 5px 10px;">
                Bajo Coste
              </button>
              <button type="button" class="btn btn-secondary btn-sm audit-filter-btn" data-audit-filter="NEGATIVE_STOCK" onclick="setCatalogAuditFilter('NEGATIVE_STOCK')" style="font-size: 11.5px; padding: 5px 10px;">
                Stock Negativo
              </button>
              <button type="button" class="btn btn-secondary btn-sm audit-filter-btn" data-audit-filter="MISSING_IMAGE" onclick="setCatalogAuditFilter('MISSING_IMAGE')" style="font-size: 11.5px; padding: 5px 10px;">
                Sin Imagen
              </button>
              <button type="button" class="btn btn-secondary btn-sm audit-filter-btn" data-audit-filter="INCOMPLETE_DATA" onclick="setCatalogAuditFilter('INCOMPLETE_DATA')" style="font-size: 11.5px; padding: 5px 10px;">
                Ficha Incompleta
              </button>
            </div>

            <!-- Buscador Rápido -->
            <div style="position: relative; min-width: 240px; flex: 1; max-width: 320px;">
              <input
                type="text"
                id="audit-search-input"
                class="form-control"
                placeholder="Buscar por SKU, nombre, familia o EAN..."
                oninput="renderCatalogAuditTable()"
                style="padding-left: 32px; height: 34px; font-size: 12px;"
              >
              <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-subtle); display: inline-flex; pointer-events: none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </span>
            </div>
          </div>

          <div class="table-container" style="max-height: 460px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th style="width: 110px;">Severidad</th>
                  <th style="width: 120px;">Código SKU</th>
                  <th>Artículo / Familia</th>
                  <th style="text-align: right; width: 90px;">Stock</th>
                  <th style="text-align: right; width: 125px;">PVP / Coste</th>
                  <th style="width: 190px;">Anomalías</th>
                  <th>Dónde Corregirlo en el ERP Seleccionado</th>
                </tr>
              </thead>
              <tbody id="catalog-audit-table-body">
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 28px;">
                    Pulsa en <strong>Analizar Catálogo</strong> para inspeccionar los artículos del ERP seleccionado.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
`;
}
