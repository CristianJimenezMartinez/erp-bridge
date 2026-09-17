export function renderHeader(): string {
  return `    <!-- Header -->
    <header class="header">
      <div class="header-title" id="header-page-title">
        <span>Estado General</span>
      </div>
      <div class="header-actions">
        <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:9999px;font-size:11px;font-weight:500;color:#10b981;">
          <span style="width:7px;height:7px;background:#10b981;border-radius:50%;display:inline-block;box-shadow:0 0 6px #10b981;"></span>
          <span>Motor Autónomo Activo</span>
        </div>
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
