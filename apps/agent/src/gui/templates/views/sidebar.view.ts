export function renderSidebar(agentVersion: string = '0.2.0'): string {
  return `  <!-- ================= SIDEBAR ================= -->
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo">
        <svg width="20" height="20" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#141418"/><path d="M18 44 C24 38, 28 32, 32 32 C36 32, 40 26, 46 20" stroke="#818cf8" stroke-width="4" stroke-linecap="round"/><circle cx="18" cy="44" r="5" fill="#6366f1"/><circle cx="46" cy="20" r="5" fill="#38bdf8"/><circle cx="32" cy="32" r="3.5" fill="#ffffff"/></svg>
      </div>
      <div>
        <div class="brand-title">Bentian ERP Bridge</div>
        <div class="brand-subtitle">
          <span>Agente Local</span>
          <span id="brand-version" class="tag tag-blue">v${agentVersion}</span>
        </div>
      </div>
    </div>

    <ul class="nav-list">
      <li class="nav-item active" onclick="switchTab('overview')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        <span>Estado General</span>
      </li>
      <li class="nav-item" onclick="switchTab('factusol')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
        <span>Factusol ERP</span>
      </li>
      <li class="nav-item" onclick="switchTab('channel')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
        <span>Canal Web / Tienda</span>
      </li>
      <li class="nav-item" onclick="switchTab('sync')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span>Automatización</span>
      </li>
      <li class="nav-item" onclick="switchTab('history')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
        <span>Historial de Ventas</span>
      </li>
      <li class="nav-item" onclick="switchTab('logs')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m14 2-4 4 4 4"/><path d="m10 14 4 4-4 4"/><path d="M4 12h16"/></svg>
        <span>Diagnóstico y Ayuda</span>
      </li>
      <li class="nav-item" onclick="switchTab('license')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
        <span>Licencia del Equipo</span>
      </li>
    </ul>

    <div class="sidebar-footer">
      <div style="margin-bottom: 6px;">
        <button onclick="openWizardModal()" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: flex-start; gap: 6px;">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>
          <span>Asistente de Inicio</span>
        </button>
      </div>
      <div class="status-pill status-online" id="sidebar-status-pill">
        <span class="pulse-dot"></span>
        <span id="sidebar-status-text">Operativo</span>
      </div>
      <div>Equipo: <span id="sidebar-hostname" style="color: #fff;">Local</span></div>
      <div>HWID: <span id="sidebar-hwid" style="font-family: monospace;">---</span></div>
    </div>
  </aside>`;
}
