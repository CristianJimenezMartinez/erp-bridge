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

        <!-- Banner de Incidencia y Resolución Rápida -->
        <div id="zen-alert-banner" class="zen-alert-banner" style="display:none;background:linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.08));border:1px solid rgba(239,68,68,0.35);">
          <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">
            <div id="zen-alert-icon-box" style="width:40px;height:40px;border-radius:10px;background:rgba(239,68,68,0.18);display:flex;align-items:center;justify-content:center;color:#f87171;flex-shrink:0;">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div style="min-width:0;">
              <div style="font-weight:700;font-size:14px;color:#fecaca;" id="zen-alert-title">Atención requerida</div>
              <div style="font-size:12px;color:#e2e8f0;margin-top:2px;line-height:1.4;" id="zen-alert-desc">Se requiere intervención para sincronizar.</div>
            </div>
          </div>
          <button id="zen-alert-btn" onclick="handleZenAlertClick()" class="btn" style="background:linear-gradient(135deg, #ef4444, #dc2626);color:#fff;border:none;box-shadow:0 0 14px rgba(239,68,68,0.35);font-weight:600;padding:8px 18px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:13px;flex-shrink:0;">
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

        <!-- Pre-Flight EDR & Diagnóstico Preventivo de Salud -->
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title" style="display:flex;align-items:center;gap:8px;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Diagnóstico Preventivo Pre-Flight (Salud del Sistema & EDR)</span>
              </div>
              <div class="section-desc">Monitorización proactiva de componentes críticos de Windows para anticipar fallos de sincronización y bloqueos.</div>
            </div>
            <button onclick="refreshPreflight()" class="btn btn-secondary btn-sm" id="btn-refresh-preflight">
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
          <div id="pf-alert-box" style="display:none;margin-top:1rem;padding:0.9rem 1.2rem;border-radius:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);font-size:12px;color:#fca5a5;line-height:1.5;">
            <div style="font-weight:600;margin-bottom:4px;" id="pf-alert-title">Acción recomendada requerida:</div>
            <div id="pf-alert-message"></div>
          </div>
        </div>

        <!-- Terminal de Eventos Recientes -->
        <div class="form-section" id="overview-recent-activity-section">
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
