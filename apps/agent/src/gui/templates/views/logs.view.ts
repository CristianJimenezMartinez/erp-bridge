export function renderLogsTab(): string {
  return `      <!-- ================= TAB 6: DIAGNÓSTICO Y AYUDA ================= -->
      <section id="tab-logs" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Registro de Eventos y Diagnóstico para Soporte</div>
              <div class="section-desc">Genera un informe descargable para resolución de incidencias con un solo clic.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="manualCheckUpdate()" id="btn-check-updates" class="btn btn-secondary btn-sm" title="Comprobar si existe una versión más reciente">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span>Buscar Actualizaciones</span>
              </button>
              <button onclick="downloadDiagnostics()" id="btn-diag-dl" class="btn btn-primary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                <span>Descargar Informe Técnico (.txt)</span>
              </button>
              <a href="https://bridge.cristianjm.com/docs/" target="_blank" class="btn btn-secondary btn-sm" title="Consultar documentación oficial y guías paso a paso" style="text-decoration:none;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                <span>Documentación Web ↗</span>
              </a>
              <button onclick="fetchStatus()" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">
            <input type="text" id="log-search-input" onkeyup="filterLogs()" placeholder="Buscar en el registro..." class="form-control" style="max-width: 240px; padding: 6px 12px; font-size: 12px;">
            <div style="display: flex; gap: 6px;">
              <button onclick="setLogLevelFilter('all')" class="btn btn-secondary btn-sm log-filter-btn active" data-filter="all">Todos</button>
              <button onclick="setLogLevelFilter('info')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="info">Info</button>
              <button onclick="setLogLevelFilter('success')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="success">Éxito</button>
              <button onclick="setLogLevelFilter('warn')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="warn">Avisos</button>
              <button onclick="setLogLevelFilter('error')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="error">Errores</button>
            </div>
          </div>

          <div id="full-logs-panel" class="logs-panel">
            <div class="log-line log-info">Cargando registros...</div>
          </div>
        </div>
      </section>`;
}
