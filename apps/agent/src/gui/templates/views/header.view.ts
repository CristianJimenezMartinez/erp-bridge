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
      <div class="header-title" id="header-page-title" style="display:flex;align-items:center;gap:10px;">
        <div style="display:inline-flex;align-items:center;gap:8px;padding:3px 10px 3px 6px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:8px;">
          <img src="/api/local/icon" width="18" height="18" alt="Bentian" style="border-radius:4px;display:block;" />
          <span style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:#c7d2fe;text-transform:uppercase;">Bentian</span>
        </div>
        <span style="color:var(--text-muted);font-weight:400;font-size:13px;">/</span>
        <span style="font-weight:600;font-size:15px;color:#f3f4f6;">Estado General</span>
      </div>
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
        <button onclick="openCloudDashboard(event)" class="btn btn-secondary btn-sm" title="Gestión de Licencias y Facturación Cloud">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
          <span>Panel Cloud</span>
        </button>
      </div>
    </header>`;
}
