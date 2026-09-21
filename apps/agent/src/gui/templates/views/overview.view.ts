export function renderOverviewTab(): string {
  return `      <!-- ================= TAB 1: ESTADO GENERAL (VISTA ZEN) ================= -->
      <section id="tab-overview" class="tab-pane active">
        <!-- Banner de Actualización Disponible -->
        <div id="overview-update-banner" style="display:none;margin-bottom:1.5rem;padding:1.1rem 1.4rem;background:linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08));border:1px solid rgba(245,158,11,0.35);border-radius:12px;align-items:center;justify-content:space-between;gap:1rem;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:10px;background:rgba(245,158,11,0.18);display:flex;align-items:center;justify-content:center;color:#f59e0b;flex-shrink:0;">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </div>
            <div>
              <div style="font-weight:600;font-size:14px;color:#f59e0b;" id="update-banner-title">Nueva versión disponible</div>
              <div style="font-size:12px;color:var(--text-secondary,#94a3b8);margin-top:2px;" id="update-banner-desc">Hay una actualización lista para instalarse.</div>
            </div>
          </div>
          <button onclick="triggerRestartUpdate()" id="btn-update-banner-action" class="btn" style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;border:none;box-shadow:0 0 12px rgba(245,158,11,0.35);font-weight:600;padding:8px 18px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:13px;flex-shrink:0;">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span id="btn-update-banner-text">Reiniciar para Actualizar</span>
          </button>
        </div>

        <!-- Semáforo Zen Central -->
        <div class="zen-hero">
          <div>
            <div class="zen-status-badge" id="zen-badge">
              <span class="pulse-dot"></span>
              <span id="zen-badge-text">Sincronización Activa — Todo al día</span>
            </div>
            <h1 class="zen-title" id="zen-title">Tu tienda web y Factusol están sincronizados</h1>
            <p class="zen-sub" id="zen-sub">
              El vigilante de Factusol detecta cualquier cambio en existencias o precios en tiempo real y actualiza tu web inmediatamente.
            </p>
          </div>
          <div style="flex-shrink: 0;">
            <button onclick="triggerManualSync()" class="btn btn-primary btn-lg" style="box-shadow: 0 4px 20px var(--primary-glow);">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Forzar Sincronización Manual</span>
            </button>
          </div>
        </div>

        <!-- 3 Tarjetas Claras de Negocio -->
        <div class="cards-grid">
          <!-- Card Factusol -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>
                Factusol ERP
              </span>
              <span id="card-f-badge" class="tag tag-amber">Comprobando...</span>
            </div>
            <div id="card-f-metric" class="card-metric">---</div>
            <div id="card-f-path" class="card-desc">Sin configurar</div>
            <div class="card-footer">
              <span id="card-f-watcher">○ Iniciando...</span>
              <button onclick="switchTab('factusol')" class="btn btn-secondary btn-sm">Ajustar</button>
            </div>
          </div>

          <!-- Card Canal Web -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
                Canal Web
              </span>
              <span id="card-wc-badge" class="tag tag-amber">Comprobando...</span>
            </div>
            <div id="card-wc-metric" class="card-metric">---</div>
            <div id="card-wc-url" class="card-desc">Sin configurar</div>
            <div class="card-footer">
              <span>Puerto 443 HTTPS</span>
              <button onclick="switchTab('channel')" class="btn btn-secondary btn-sm">Gestionar</button>
            </div>
          </div>

          <!-- Card Licencia -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/></svg>
                Licencia Local
              </span>
              <span id="card-lic-badge" class="tag tag-green">Activa</span>
            </div>
            <div id="card-lic-plan" class="card-metric">Professional</div>
            <div id="card-lic-key" class="card-desc" style="font-family: monospace;">EB-PRO-XXXXX</div>
            <div class="card-footer">
              <span id="card-lic-grace">Puesto vinculado</span>
              <button onclick="switchTab('license')" class="btn btn-secondary btn-sm">Ver</button>
            </div>
          </div>
        </div>

        <!-- Terminal de Eventos Recientes -->
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Actividad Reciente del Sistema</div>
              <div class="section-desc">Eventos de sincronización y pedidos importados en segundo plano.</div>
            </div>
            <button onclick="switchTab('logs')" class="btn btn-secondary btn-sm">Ver Registro Completo ↗</button>
          </div>
          <div id="overview-logs-list" class="logs-panel" style="height: 180px;">
            <div class="log-line log-info">Cargando eventos...</div>
          </div>
        </div>
      </section>`;
}
