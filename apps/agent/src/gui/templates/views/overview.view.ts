export function renderOverviewTab(): string {
  return `      <!-- ================= TAB 1: ESTADO GENERAL (VISTA ZEN) ================= -->
      <section id="tab-overview" class="tab-pane active">
        <!-- Banner de Actualización Disponible -->
        <div id="overview-update-banner" style="display:none;margin-bottom:1.5rem;padding:1.1rem 1.4rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;align-items:center;justify-content:space-between;gap:1rem;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:#e4e4e7;flex-shrink:0;">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </div>
            <div>
              <div style="font-weight:600;font-size:14px;color:#fff;" id="update-banner-title">Nueva versión disponible</div>
              <div style="font-size:12px;color:var(--text-secondary,#94a3b8);margin-top:2px;" id="update-banner-desc">Hay una actualización lista para instalarse.</div>
            </div>
          </div>
          <button onclick="triggerRestartUpdate()" id="btn-update-banner-action" class="btn" style="background:#27272a;border:1px solid rgba(255,255,255,0.18);color:#fff;font-weight:600;padding:8px 18px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:13px;flex-shrink:0;">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span id="btn-update-banner-text">Reiniciar para Actualizar</span>
          </button>
        </div>

        <!-- Banner de Incidencia y Resolución Rápida -->
        <div id="zen-alert-banner" class="zen-alert-banner" style="display:none;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">
            <div id="zen-alert-icon-box" style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:#e4e4e7;flex-shrink:0;">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div style="min-width:0;">
              <div style="font-weight:700;font-size:14px;color:#fff;" id="zen-alert-title">Atención requerida</div>
              <div style="font-size:12px;color:var(--text-muted,#a1a1aa);margin-top:2px;line-height:1.4;" id="zen-alert-desc">Se requiere intervención para sincronizar.</div>
            </div>
          </div>
          <button id="zen-alert-btn" onclick="handleZenAlertClick()" class="btn" style="background:#27272a;border:1px solid rgba(255,255,255,0.18);color:#fff;font-weight:600;padding:8px 18px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:13px;flex-shrink:0;">
            <span id="zen-alert-btn-text">Resolver incidencia →</span>
          </button>
        </div>

        <!-- Semáforo Zen Central -->
        <div class="zen-hero" id="zen-hero-card">
          <div>
            <div class="zen-status-badge" id="zen-badge">
              <span class="pulse-dot" id="zen-badge-dot"></span>
              <span id="zen-badge-text">Sincronización Activa — Todo al día</span>
            </div>
            <h1 class="zen-title" id="zen-title">Tu tienda web y Factusol están sincronizados</h1>
            <p class="zen-sub" id="zen-sub">
              El vigilante de Factusol detecta cualquier cambio en existencias o precios en tiempo real y actualiza tu web inmediatamente.
            </p>
          </div>
          <div style="flex-shrink: 0;" id="zen-action-box">
            <button id="zen-primary-btn" onclick="handleZenPrimaryAction()" class="btn btn-primary btn-lg" style="box-shadow: 0 4px 20px var(--primary-glow);">
              <span id="zen-primary-btn-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></span>
              <span id="zen-primary-btn-text">Forzar Sincronización Manual</span>
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

        <!-- Última Actividad y Ventas -->
        <div class="form-section" id="overview-recent-activity-section">
          <div class="section-header">
            <div>
              <div class="section-title">Última Actividad y Ventas</div>
              <div class="section-desc">Eventos recientes de pedidos importados, ventas y sincronizaciones en tiempo real.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="switchTab('history')" class="btn btn-secondary btn-sm" title="Consultar historial detallado de pedidos y ventas">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                <span>Historial de Ventas ↗</span>
              </button>
              <button onclick="switchTab('logs')" class="btn btn-secondary btn-sm" title="Ir a diagnóstico técnico y consola">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m14 2-4 4 4 4"/><path d="m10 14 4 4-4 4"/><path d="M4 12h16"/></svg>
                <span>Diagnóstico y Ayuda ↗</span>
              </button>
            </div>
          </div>
          <div id="overview-logs-list" class="logs-panel" style="height: 180px;">
            <div class="log-line log-info">Cargando actividad...</div>
          </div>
        </div>
      </section>`;
}
