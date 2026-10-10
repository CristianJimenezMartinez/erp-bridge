export function renderHeader(): string {
  return `    <!-- Connection Lost / Reconnecting Banner -->
    <div id="connection-lost-banner" class="connection-banner">
      <div class="banner-spinner"></div>
      <div class="banner-text">
        <strong>Reiniciando motor local...</strong>
        <span id="connection-banner-sub">Reanudando enlace con el servicio en 127.0.0.1:39281 (intento <span id="banner-reconnect-count">1</span>)...</span>
      </div>
    </div>

    <!-- Header -->
    <header class="header">
      <h1 class="header-title" id="header-page-title" style="font-size:16px;font-weight:700;color:#f8fafc;margin:0;letter-spacing:-0.2px;">Estado General</h1>
      <div class="header-actions">
        <div id="header-engine-status" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:9999px;font-size:11px;font-weight:500;color:#10b981;transition:all 0.3s ease;">
          <span id="header-engine-dot" style="width:7px;height:7px;background:#10b981;border-radius:50%;display:inline-block;box-shadow:0 0 6px #10b981;"></span>
          <span id="header-engine-text">Motor Autónomo Activo</span>
        </div>
        <button id="btn-update-restart" onclick="triggerRestartUpdate()" class="btn" style="display:none;align-items:center;gap:6px;font-weight:600;background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;border:none;box-shadow:0 0 12px rgba(245,158,11,0.45);cursor:pointer;padding:6px 14px;border-radius:6px;font-size:12px;transition:all 0.2s ease;">
          <svg id="update-icon-header" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span id="btn-update-text">Reiniciar para Actualizar</span>
        </button>
        <button onclick="triggerManualSync()" id="btn-sync-header" class="btn btn-primary">
          <svg id="sync-icon-header" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Sincronizar Ahora</span>
        </button>
        <button onclick="openIncidentModal()" id="btn-header-incident" class="btn btn-secondary btn-sm" title="Enviar incidencia o consulta a soporte técnico" style="display:inline-flex;align-items:center;gap:6px;border-color:rgba(239,68,68,0.35);color:#fca5a5;">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span>Reportar Incidencia</span>
        </button>
        <button onclick="window.open('https://bridge.cristianjm.com/docs/', '_blank')" class="btn btn-secondary btn-sm" title="Consultar documentación oficial y manuales de integración" style="display:inline-flex;align-items:center;gap:6px;">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <span>Documentación</span>
        </button>
        <button onclick="openCloudDashboard(event)" class="btn btn-secondary btn-sm" title="Gestión de Licencias y Facturación Cloud">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
          <span>Panel Cloud</span>
        </button>
      </div>
    </header>`;
}
