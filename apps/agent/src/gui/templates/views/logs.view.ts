export function renderLogsTab(): string {
  return `      <!-- ================= TAB 6: DIAGNÓSTICO Y AYUDA ================= -->
      <section id="tab-logs" class="tab-pane">
        <!-- Diagnóstico Preventivo Pre-Flight (Salud del Sistema & EDR) -->
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title" style="display:flex;align-items:center;gap:8px;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Diagnóstico Preventivo Pre-Flight (Salud del Sistema & EDR)</span>
              </div>
              <div class="section-desc">Monitorización proactiva de componentes críticos de Windows para anticipar fallos de sincronización y bloqueos.</div>
            </div>
            <button onclick="refreshPreflight()" class="btn btn-secondary btn-sm" id="btn-refresh-preflight" title="Reanalizar componentes del sistema">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Reanalizar</span>
            </button>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:1rem;margin-top:1rem;">
            <!-- Semáforo 1: cscript.exe -->
            <div style="padding:1rem;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--card-border);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;">
                  <span id="pf-cscript-dot" class="pulse-dot" style="background:#f59e0b;"></span>
                  Motor Scripting
                </span>
                <span id="pf-cscript-badge" class="tag tag-amber">Comprobando</span>
              </div>
              <div id="pf-cscript-desc" style="font-size:12px;color:var(--text-secondary,#94a3b8);line-height:1.4;">Analizando cscript.exe y JScript...</div>
            </div>

            <!-- Semáforo 2: OLEDB -->
            <div style="padding:1rem;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--card-border);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;">
                  <span id="pf-oledb-dot" class="pulse-dot" style="background:#f59e0b;"></span>
                  Driver Access OLEDB
                </span>
                <span id="pf-oledb-badge" class="tag tag-amber">Comprobando</span>
              </div>
              <div id="pf-oledb-desc" style="font-size:12px;color:var(--text-secondary,#94a3b8);line-height:1.4;">Verificando Microsoft.ACE/Jet...</div>
            </div>

            <!-- Semáforo 3: Clock Drift -->
            <div style="padding:1rem;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--card-border);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;">
                  <span id="pf-clock-dot" class="pulse-dot" style="background:#f59e0b;"></span>
                  Reloj & NTP
                </span>
                <span id="pf-clock-badge" class="tag tag-amber">Comprobando</span>
              </div>
              <div id="pf-clock-desc" style="font-size:12px;color:var(--text-secondary,#94a3b8);line-height:1.4;">Validando hora contra servidor...</div>
            </div>

            <!-- Semáforo 4: Red & Wi-Fi -->
            <div style="padding:1rem;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--card-border);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;">
                  <span id="pf-net-dot" class="pulse-dot" style="background:#f59e0b;"></span>
                  Almacenamiento & Red
                </span>
                <span id="pf-net-badge" class="tag tag-amber">Comprobando</span>
              </div>
              <div id="pf-net-desc" style="font-size:12px;color:var(--text-secondary,#94a3b8);line-height:1.4;">Comprobando ruta y tipo de conexión...</div>
            </div>
          </div>

          <!-- Alerta de Recomendación Pre-Flight si algo falla -->
          <div id="pf-alert-box" style="display:none;margin-top:1rem;padding:0.9rem 1.2rem;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);font-size:12px;color:#e4e4e7;line-height:1.5;">
            <div style="font-weight:600;margin-bottom:4px;color:#fff;" id="pf-alert-title">Acción recomendada requerida:</div>
            <div id="pf-alert-message" style="color:var(--text-muted,#a1a1aa);"></div>
          </div>
        </div>

        <!-- Botonera de Pruebas Rápidas de Conectividad y Soporte -->
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Herramientas de Soporte y Diagnóstico Rápido</div>
              <div class="section-desc">Acciones rápidas para resolución asistida de incidencias y verificación de conectividad.</div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button onclick="openIncidentModal()" id="btn-diag-incident" class="btn btn-secondary btn-sm" title="Reportar incidencia técnica asistida a soporte" style="display:inline-flex;align-items:center;gap:6px;border-color:rgba(239,68,68,0.35);color:#fca5a5;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span>Reportar Incidencia</span>
              </button>
              <button onclick="downloadDiagnostics()" id="btn-diag-dl" class="btn btn-primary btn-sm" title="Descargar informe completo (.txt) para soporte técnico">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                <span>Descargar Informe Técnico (.txt)</span>
              </button>
              <button onclick="copySupportSummary()" id="btn-copy-support" class="btn btn-secondary btn-sm" title="Copiar resumen del sistema al portapapeles para soporte">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                <span>Copiar Resumen para Soporte</span>
              </button>
              <button onclick="manualCheckUpdate()" id="btn-check-updates" class="btn btn-secondary btn-sm" title="Comprobar si existe una versión más reciente">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span>Buscar Actualizaciones</span>
              </button>
              <a href="https://bridge.cristianjm.com/docs/" target="_blank" class="btn btn-secondary btn-sm" title="Consultar documentación oficial y guías paso a paso" style="text-decoration:none;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                <span>Documentación Web ↗</span>
              </a>
              <button onclick="fetchStatus()" class="btn btn-secondary btn-sm" title="Actualizar datos">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Visor de Actividad con Selector (Diario de Operaciones vs Consola Técnica) -->
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Visor de Actividad y Eventos</div>
              <div class="section-desc">Alterna entre los eventos limpios de negocio y la consola técnica detallada.</div>
            </div>
            <!-- Selector de Vista -->
            <div style="display:flex;background:rgba(255,255,255,0.06);padding:3px;border-radius:8px;border:1px solid var(--card-border);gap:4px;">
              <button type="button" id="btn-mode-journal" onclick="setLogViewMode('journal')" class="btn btn-sm log-mode-btn active" style="font-size:12px;padding:5px 12px;border:none;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right:4px;vertical-align:-2px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Diario de Operaciones
              </button>
              <button type="button" id="btn-mode-console" onclick="setLogViewMode('console')" class="btn btn-sm log-mode-btn" style="font-size:12px;padding:5px 12px;border:none;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right:4px;vertical-align:-2px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Consola Técnica
              </button>
            </div>
          </div>

          <!-- Filtros de Consola Técnica (visibles solo en modo consola técnica) -->
          <div id="technical-console-controls" style="display:none;gap:10px;margin-bottom:12px;align-items:center;flex-wrap:wrap;">
            <input type="text" id="log-search-input" onkeyup="filterLogs()" placeholder="Buscar en el registro..." class="form-control" style="max-width: 240px; padding: 6px 12px; font-size: 12px;">
            <div style="display: flex; gap: 6px;">
              <button onclick="setLogLevelFilter('all')" class="btn btn-secondary btn-sm log-filter-btn active" data-filter="all">Todos</button>
              <button onclick="setLogLevelFilter('info')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="info">Info</button>
              <button onclick="setLogLevelFilter('success')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="success">Éxito</button>
              <button onclick="setLogLevelFilter('warn')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="warn">Avisos</button>
              <button onclick="setLogLevelFilter('error')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="error">Errores</button>
            </div>
          </div>

          <div id="full-logs-panel" class="logs-panel" style="min-height: 280px; max-height: 480px;">
            <div class="log-line log-info">Cargando registros...</div>
          </div>
        </div>
      </section>`;
}
