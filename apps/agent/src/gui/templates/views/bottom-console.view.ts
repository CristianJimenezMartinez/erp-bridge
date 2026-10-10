export function renderBottomConsole(): string {
  return `  <!-- ================= BOTTOM CONSOLE DOCK ================= -->
  <div id="bottom-console-dock" class="bottom-console-dock">
    <!-- Barra inferior siempre visible (Dock Bar) -->
    <div class="dock-bar" onclick="toggleBottomConsole()">
      <div class="dock-bar-left">
        <span id="dock-status-dot" class="pulse-dot" style="background:#10b981;"></span>
        <span id="dock-status-text" class="dock-status-text">Listo</span>
        <span class="dock-divider">|</span>
        <span id="dock-latest-msg" class="dock-latest-msg">Agente inicializado</span>
      </div>
      <div class="dock-bar-right" onclick="event.stopPropagation();">
        <div id="dock-badges" class="dock-badges">
          <span id="dock-badge-errors" class="dock-badge dock-badge-error" style="display:none;" onclick="toggleBottomConsole(true); setBottomConsoleFilter('error');">0 errores</span>
          <span id="dock-badge-warns" class="dock-badge dock-badge-warn" style="display:none;" onclick="toggleBottomConsole(true); setBottomConsoleFilter('warn');">0 avisos</span>
        </div>
        <button type="button" class="dock-toggle-btn" id="dock-toggle-btn" onclick="toggleBottomConsole()" title="Desplegar / ocultar consola de actividad">
          <span id="dock-toggle-text">Consola de Actividad</span>
          <svg id="dock-toggle-icon" width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="transition:transform 0.2s ease;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
        </button>
      </div>
    </div>

    <!-- Cajón desplegable hacia arriba (Drawer) -->
    <div id="dock-drawer" class="dock-drawer">
      <div class="dock-drawer-header">
        <div class="dock-drawer-title">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>Consola de Actividad en Tiempo Real</span>
        </div>
        <div class="dock-filters">
          <button type="button" onclick="setBottomConsoleFilter('all')" class="dock-filter-btn active" data-bfilter="all">Todos</button>
          <button type="button" onclick="setBottomConsoleFilter('business')" class="dock-filter-btn" data-bfilter="business">Operaciones</button>
          <button type="button" onclick="setBottomConsoleFilter('warn')" class="dock-filter-btn" data-bfilter="warn">Avisos</button>
          <button type="button" onclick="setBottomConsoleFilter('error')" class="dock-filter-btn" data-bfilter="error">Errores</button>
        </div>
        <div class="dock-actions">
          <button type="button" onclick="copyBottomConsoleLogs()" class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:11px;" title="Copiar registros al portapapeles">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span>Copiar</span>
          </button>
          <button type="button" onclick="clearBottomConsoleView()" class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:11px;" title="Limpiar vista actual de consola">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            <span>Limpiar</span>
          </button>
          <button type="button" onclick="toggleBottomConsole(false)" class="btn btn-secondary btn-sm" style="padding:3px 6px;" title="Minimizar consola">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
        </div>
      </div>
      <div id="dock-logs-stream" class="dock-logs-stream">
        <div class="log-line log-info"><span class="log-time">--:--:--</span><span>Cargando actividad...</span></div>
      </div>
    </div>
  </div>`;
}
