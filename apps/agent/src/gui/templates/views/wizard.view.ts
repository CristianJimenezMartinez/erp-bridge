export function renderWizardModal(): string {
  return `  <!-- ================= ONBOARDING WIZARD MODAL ================= -->
  <div id="modal-wizard" class="modal-overlay" onclick="if(event.target === this) closeWizardModal()">
    <div class="modal-card">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" fill="none" stroke="#818cf8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>
          <span style="font-weight: 700; font-size: 15px; color: #fff;">Asistente de Configuración Rápida</span>
        </div>
        <button onclick="closeWizardModal()" class="btn btn-secondary btn-sm" style="padding: 0; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px;" title="Cerrar asistente">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="wizard-steps-bar">
          <div id="w-step-1" class="wizard-step-item active">1. Licencia</div>
          <div id="w-step-2" class="wizard-step-item">2. ERP</div>
          <div id="w-step-3" class="wizard-step-item">3. Tienda Web</div>
          <div id="w-step-4" class="wizard-step-item">4. ¡Listo!</div>
        </div>

        <!-- PASO 1: LICENCIA -->
        <div id="wizard-pane-1">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 1: Activa tu Licencia</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Consigue tu acceso en 1 clic o introduce la clave recibida por correo.</p>
          
          <!-- Bloque destacado: Activar Licencia Beta Gratuita en 1 Clic -->
          <div id="wiz-quick-claim-card" style="padding: 16px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px; font-weight: 700; color: #fff;">⚡ Activar Licencia Beta Gratuita en 1 Clic</span>
                <span style="font-size: 10px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 1px 7px; border-radius: 999px; font-weight: 700;">ACCESO TOTAL 2026</span>
              </div>
              <span style="font-size: 11px; color: #cbd5e1;">Sin tarjeta ni compromiso</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 0; margin-bottom: 12px; line-height: 1.4;">
              Introduce tu correo para vincular de forma inmediata una clave oficial de prueba válida hasta el <strong>31 de Diciembre de 2026</strong>.
            </p>
            <div class="input-with-button">
              <input type="email" id="wiz-input-claim-email" class="form-control" placeholder="tu-email@empresa.com" style="font-size: 13px;">
              <button onclick="wizClaimBetaOneClick()" id="wiz-btn-claim-oneclick" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; font-weight: 600;">
                <span>Activar en 1 Clic ⚡</span>
              </button>
            </div>
            <div id="wiz-quick-claim-alert" style="margin-top: 10px; font-size: 12px; display: none;"></div>
          </div>

          <!-- Separador secundario -->
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
            <div style="flex: 1; height: 1px; background: rgba(255, 255, 255, 0.08);"></div>
            <span style="font-size: 11px; color: var(--text-subtle); text-transform: uppercase; letter-spacing: 0.5px;">O si ya dispones de una clave</span>
            <div style="flex: 1; height: 1px; background: rgba(255, 255, 255, 0.08);"></div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 12px; color: var(--text-muted);">Clave de Licencia (EB-XXXXX):</label>
            <div class="input-with-button">
              <input type="text" id="wiz-input-lic" class="form-control" style="font-family: monospace; font-size: 14px;" placeholder="EB-XXXXX-XXXXX-XXXXX-XXXXX">
              <button onclick="wizPasteAndActivateLicense()" id="wiz-btn-activate" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <span>Pegar y Activar</span>
              </button>
            </div>
            <div id="wiz-lic-alert" style="margin-top: 10px; font-size: 12px; display: none;"></div>
          </div>

          <div style="text-align: center; margin-top: 14px; font-size: 11.5px; color: var(--text-subtle);">
            🔒 Se requiere una clave activa o Licencia Beta Gratuita para desbloquear los conectores ERP y la sincronización.
          </div>
        </div>

        <!-- PASO 2: ERP LOCAL EN WINDOWS (5 ERPs SOPORTADOS) -->
        <div id="wizard-pane-2" style="display: none;">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 2: Conecta tu Software de Gestión (ERP Local)</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">Elige cualquiera de los 5 ERPs locales de escritorio en Windows o activa el Modo Evaluación en 1 clic.</p>

          <!-- BOTÓN DESTACADO: PROBAR EN MODO EVALUACIÓN (SIN ERP INSTALADO) -->
          <div style="margin-bottom: 16px; padding: 12px 14px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(16, 185, 129, 0.10)); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #fde68a; display: flex; align-items: center; gap: 6px;">
                <span>🧪 ¿Estás probando en un PC sin el ERP instalado?</span>
                <span class="tag tag-amber" style="font-size: 9.5px;">Sandbox Multi-ERP</span>
              </div>
              <div style="font-size: 11.5px; color: #e2e8f0; margin-top: 2px;">
                Activa datos de demostración realistas para Factusol, SimplyGest, Ágora POS, Sage 50 o a3ERP y simula pedidos y stock reales.
              </div>
            </div>
            <button type="button" id="wiz-btn-eval-mode" onclick="wizEnableEvaluationMode()" class="btn btn-primary btn-sm" style="white-space: nowrap; background: linear-gradient(135deg, #d97706, #f59e0b); border: none; color: #fff; font-weight: 700; padding: 7px 13px;">
              🧪 Probar en Modo Evaluación (Sin ERP instalado)
            </button>
          </div>

          <!-- SELECTOR DE LOS 5 ERPs LOCALES SOPORTADOS -->
          <div class="channel-select-grid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 18px;">
            <div id="wiz-erp-choice-factusol" class="channel-card selected" style="padding: 11px 12px;" onclick="wizSelectErp('factusol')">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 700; font-size: 12.5px; color: #60a5fa;">Factusol</span>
                <span id="wiz-badge-erp-factusol" class="tag tag-blue" style="font-size: 9px;">● Activo</span>
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">Access .accdb / SQL</div>
            </div>

            <div id="wiz-erp-choice-simplygest" class="channel-card" style="padding: 11px 12px;" onclick="wizSelectErp('simplygest')">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 700; font-size: 12.5px; color: #34d399;">SimplyGest</span>
                <span id="wiz-badge-erp-simplygest" class="tag" style="font-size: 9px; background: rgba(255,255,255,0.06); color: var(--text-muted);">○ Disponible</span>
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">MySQL / SQL Local</div>
            </div>

            <div id="wiz-erp-choice-agora" class="channel-card" style="padding: 11px 12px;" onclick="wizSelectErp('agora')">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 700; font-size: 12.5px; color: #f472b6;">Ágora Retail / POS</span>
                <span id="wiz-badge-erp-agora" class="tag" style="font-size: 9px; background: rgba(255,255,255,0.06); color: var(--text-muted);">○ Disponible</span>
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">MS SQL Server Local</div>
            </div>

            <div id="wiz-erp-choice-sage50" class="channel-card" style="padding: 11px 12px;" onclick="wizSelectErp('sage50')">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 700; font-size: 12.5px; color: #4ade80;">Sage 50</span>
                <span id="wiz-badge-erp-sage50" class="tag" style="font-size: 9px; background: rgba(255,255,255,0.06); color: var(--text-muted);">○ Disponible</span>
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">MS SQL Server Local</div>
            </div>

            <div id="wiz-erp-choice-a3erp" class="channel-card" style="padding: 11px 12px;" onclick="wizSelectErp('a3erp')">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 700; font-size: 12.5px; color: #fbbf24;">a3ERP</span>
                <span id="wiz-badge-erp-a3erp" class="tag" style="font-size: 9px; background: rgba(255,255,255,0.06); color: var(--text-muted);">○ Disponible</span>
              </div>
              <div style="font-size: 10.5px; color: var(--text-muted);">MS SQL Server Local</div>
            </div>
          </div>

          <!-- PANEL SQL SERVER LOCAL EN WIZARD (ÁGORA POS, SAGE 50, A3ERP) -->
          <div id="wiz-panel-sql-erp" style="display: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
              <div>
                <div id="wiz-sql-erp-title" style="font-weight: 700; font-size: 14px; color: #fff;">Conexión Local MS SQL Server</div>
                <div id="wiz-sql-erp-subtitle" style="font-size: 11.5px; color: var(--text-muted);">Lectura no bloqueante WITH (NOLOCK) sin interferir con el TPV ni el ERP.</div>
              </div>
              <button type="button" onclick="wizDetectSqlInstances(true)" id="wiz-btn-detect-sql" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Autodetectar instancias SQL locales</span>
              </button>
            </div>

            <div id="wiz-sql-detected-box" style="display: none; margin-bottom: 12px;">
              <div id="wiz-sql-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>

            <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11.5px;">Instancia SQL Server Local:</label>
                <input type="text" id="wiz-input-sql-instance" class="form-control" value=".\\SQLEXPRESS" placeholder="localhost, 127.0.0.1:1433, .\\SQLEXPRESS, .\\AGORA, .\\SAGE50" style="font-family: monospace; font-size: 12.5px;">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11.5px;">Base de Datos / Ejercicio Activo:</label>
                <input type="text" id="wiz-input-sql-dbname" class="form-control" value="AgoraPOS" placeholder="AgoraPOS / SAGE50 / A3ERP" style="font-family: monospace; font-size: 12.5px;">
              </div>
            </div>

            <div class="form-grid" style="grid-template-columns: 1fr 120px; gap: 12px; margin-bottom: 12px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11.5px;">Modo de Autenticación SQL Server:</label>
                <select id="wiz-select-sql-auth" class="form-control form-select" onchange="wizToggleSqlAuthFields(this.value)" style="font-size: 12.5px;">
                  <option value="windows">Autenticación Integrada de Windows (Recomendado)</option>
                  <option value="sql">Usuario SQL Server (sa y contraseña)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11.5px;">Serie Pedidos:</label>
                <input type="text" id="wiz-input-sql-series" class="form-control" value="1" maxlength="4" style="text-align: center; font-weight: 700; text-transform: uppercase;">
              </div>
            </div>

            <div id="wiz-sql-credentials-row" class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; display: none;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11.5px;">Usuario SQL Server:</label>
                <input type="text" id="wiz-input-sql-user" class="form-control" value="sa" placeholder="sa" style="font-family: monospace; font-size: 12.5px;">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11.5px;">Contraseña SQL Server:</label>
                <input type="password" id="wiz-input-sql-pass" class="form-control" placeholder="••••••••" style="font-size: 12.5px;">
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px;">
              <button type="button" onclick="wizTestSqlErpConnection()" id="wiz-btn-test-sql" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Comprobar Conexión SQL Server</span>
              </button>
              <button type="button" onclick="wizEnableEvaluationMode()" class="btn btn-secondary btn-sm" style="border-color: rgba(245,158,11,0.4); color: #fbbf24;">
                🧪 Activar Datos Demo para este ERP
              </button>
            </div>
            <div id="wiz-sql-alert" style="margin-top: 10px; font-size: 12px; display: none;"></div>
          </div>

          <!-- PANEL FACTUSOL EN WIZARD -->
          <div id="wiz-panel-factusol">
            <div style="display: flex; gap: 10px; margin-bottom: 16px;">
              <button onclick="detectFactusol(true)" id="wiz-btn-detect-fact" class="btn btn-secondary" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Auto-detectar Factusol</span>
              </button>
              <button onclick="openNativeWindowsDialog(true)" id="wiz-btn-browse-native" class="btn btn-primary" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, #1d4ed8, #2563eb); border: none; font-weight: 600;" title="Abre el selector nativo de Windows (Local / Red / NAS)">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/></svg>
                <span>Examinar en Windows (Local / Red / NAS)</span>
              </button>
            </div>

            <div id="wiz-fact-detected-box" style="display: none; margin-bottom: 14px;">
              <div id="wiz-fact-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                <label class="form-label" style="margin-bottom: 0;">Ruta de la base de datos (o carpeta):</label>
                <span style="font-size: 11px; color: #818cf8; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="document.getElementById('wiz-input-fact-path').focus()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  <span>Escribir o pegar directamente</span>
                </span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">
                Si tu Factusol está en un <strong>NAS, servidor o unidad de red</strong> (ej: <code>X:\\Datos\\FS\\...</code> o <code>\\\\NAS\\Datos\\...</code>), puedes pegarla directamente aquí.
              </div>
              <input type="text" id="wiz-input-fact-path" oninput="cleanPathInput(this)" onblur="handleFactusolInputBlur('wiz-input-fact-path'); wizTestFactusolConnection();" class="form-control" placeholder="C:\\\\Software DELSOL\\\\Factusol\\\\Datos\\\\FS\\\\0012026.accdb  o  X:\\\\...  o  \\\\\\\\NAS\\\\..." style="font-family: monospace; font-size: 13px;">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px; display: inline-flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>Las comillas de 'Copiar como ruta de acceso' de Windows se limpian automáticamente al pegar.</span>
              </div>
              <div id="wiz-fact-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
            </div>

            <div style="margin-top:14px;padding:12px 14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;"><div><div style="font-size:13px;font-weight:600;color:#fde68a;">🧪 ¿No tienes Factusol en este ordenador?</div><div style="font-size:12px;color:#cbd5e1;margin-top:2px;">Puedes continuar para configurar tu tienda web o explorar el panel en modo demostración.</div></div><button type="button" onclick="wizSkipFactusolStep()" class="btn btn-secondary btn-sm" style="white-space:nowrap;border-color:rgba(245,158,11,0.4);color:#fbbf24;">Continuar sin Factusol →</button></div>

            <!-- BLOQUE PEDAGÓGICO: SERIE PARA PEDIDOS WEB EN FACTUSOL -->
            <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: #fff; display: flex; align-items: center; gap: 8px;">
                    <span>Serie para Pedidos Web en Factusol</span>
                    <span style="font-size: 10px; background: rgba(255, 255, 255, 0.08); color: #e4e4e7; border: 1px solid rgba(255, 255, 255, 0.12); padding: 2px 7px; border-radius: 999px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span>Recomendado: Serie 1 Directo</span>
                    </span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    Define en qué serie de Factusol se registrarán las ventas de tu tienda online.
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                  <label for="wiz-input-fact-order-series" style="font-size: 11px; color: var(--text-muted); margin: 0;">Serie:</label>
                  <input type="text" id="wiz-input-fact-order-series" value="1" maxlength="1" oninput="this.value = this.value.toUpperCase(); onWizOrderSeriesInput(this.value);" class="form-control" style="width: 44px; text-align: center; font-weight: 700; font-size: 14px; text-transform: uppercase; padding: 4px 6px;">
                </div>
              </div>

              <!-- Opciones rápidas de selección interactiva -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <button type="button" id="wiz-btn-series-1" onclick="setWizOrderSeries('1')" class="btn" style="text-align: left; padding: 10px 12px; background: rgba(99, 102, 241, 0.18); border: 2px solid #6366f1; border-radius: 8px; color: #fff; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 3px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span style="font-weight: 700; font-size: 12px; color: #e4e4e7; display: inline-flex; align-items: center; gap: 6px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span>Serie 1 (Directo a Bandeja Principal)</span>
                    </span>
                    <span id="wiz-badge-series-1" style="font-size: 10px; background: #6366f1; color: #fff; padding: 1px 6px; border-radius: 10px; font-weight: 600;">Recomendado</span>
                  </div>
                  <span style="font-size: 11px; color: #cbd5e1; line-height: 1.3;">Entran en la bandeja principal. Abres Factusol y el pedido está el primero a la vista. Cero despistes.</span>
                </button>

                <button type="button" id="wiz-btn-series-w" onclick="setWizOrderSeries('W')" class="btn" style="text-align: left; padding: 10px 12px; background: #18181f; border: 1px solid var(--card-border); border-radius: 8px; color: #fff; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 3px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span style="font-weight: 700; font-size: 12px; color: var(--text-muted);">Serie W (Separada para Web)</span>
                    <span id="wiz-badge-series-w" style="font-size: 10px; background: rgba(255,255,255,0.08); color: var(--text-subtle); padding: 1px 6px; border-radius: 10px; font-weight: 500;">Contabilidad aislada</span>
                  </div>
                  <span style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">Quedan separados, pero requiere cambiar el filtro de Factusol a "Todas" o "Serie W" para verlos.</span>
                </button>
              </div>

              <!-- Card visual pedagógico: ¿Por qué recomendamos la Serie 1? -->
              <div style="padding: 12px 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; font-size: 12px; line-height: 1.5; color: #e2e8f0;">
                <div style="font-weight: 700; color: #e4e4e7; margin-bottom: 6px; display: inline-flex; align-items: center; gap: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span>¿Por qué recomendamos la Serie 1?</span>
                </div>
                <p style="margin: 0 0 6px 0; color: #cbd5e1; font-size: 11.5px;">
                  En Factusol, cada documento tiene una Serie. La pantalla de <strong>Comercial → Pedidos de cliente</strong> suele abrirse por defecto filtrada en la <strong>Serie 1</strong>:
                </p>
                <ul style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 11px; line-height: 1.45;">
                  <li style="margin-bottom: 4px;"><strong style="color: #38bdf8;">Si entran en la Serie 1 (Directo):</strong> Entran en la bandeja principal de Factusol. Abres Factusol y el pedido web está el primero de la lista a la vista de cualquiera. No hay que tocar filtros, ni desplegables, ni configurar series nuevas en Factusol. <em>Cero líos.</em></li>
                  <li><strong style="color: #cbd5e1;">Si llegan con la Serie W (Web):</strong> Contablemente quedan separados de la tienda física, pero si un usuario entra a Factusol y ve la Serie 1 vacía, pensará que el pedido no ha entrado, cuando en realidad está en la pestaña/filtro de la Serie W.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- PANEL SIMPLYGEST EN WIZARD -->
          <div id="wiz-panel-simplygest" style="display: none;">
            <div style="display: flex; gap: 10px; margin-bottom: 16px;">
              <button onclick="detectSimplyGest(true)" id="wiz-btn-detect-simplygest" class="btn btn-secondary" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Auto-detectar SimplyGest</span>
              </button>
              <button onclick="openNativeWindowsDialogSimplyGest(true)" id="wiz-btn-browse-native-simplygest" class="btn btn-primary" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, #059669, #10b981); border: none; font-weight: 600;" title="Abre el selector nativo de Windows (Local / Red / NAS)">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/></svg>
                <span>Examinar en Windows (Local / Red / NAS)</span>
              </button>
            </div>

            <div id="wiz-simplygest-detected-box" style="display: none; margin-bottom: 14px;">
              <div id="wiz-simplygest-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                <label class="form-label" style="margin-bottom: 0;">Ruta de la base de datos (Datos.mdb):</label>
                <span style="font-size: 11px; color: #34d399; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="document.getElementById('wiz-input-simplygest-path').focus()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  <span>Escribir o pegar directamente</span>
                </span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">
                Si tu SimplyGest está en un servidor, NAS o unidad de red (ej: <code>Z:\\SimplyGest\\Datos.mdb</code> o <code>\\\\NAS\\...</code>), puedes pegarla directamente aquí.
              </div>
              <input type="text" id="wiz-input-simplygest-path" oninput="cleanPathInput(this)" onblur="handleSimplyGestInputBlur('wiz-input-simplygest-path'); wizTestSimplyGestConnection();" class="form-control" placeholder="C:\\\\SimplyGest\\\\Datos.mdb  o  Z:\\\\SimplyGest\\\\Datos.mdb  o  \\\\\\\\NAS\\\\..." style="font-family: monospace; font-size: 13px;">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px; display: inline-flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/></svg>
                <span>Las comillas de 'Copiar como ruta de acceso' de Windows se limpian automáticamente.</span>
              </div>
              <div id="wiz-simplygest-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
            </div>

            <div style="margin-top:14px;padding:12px 14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;"><div><div style="font-size:13px;font-weight:600;color:#fde68a;">🧪 ¿No tienes SimplyGest en este ordenador?</div><div style="font-size:12px;color:#cbd5e1;margin-top:2px;">Puedes continuar para configurar tu tienda web o explorar el panel en modo demostración.</div></div><button type="button" onclick="wizSkipFactusolStep()" class="btn btn-secondary btn-sm" style="white-space:nowrap;border-color:rgba(245,158,11,0.4);color:#fbbf24;">Continuar sin SimplyGest →</button></div>
          </div>
        </div>

        <!-- PASO 3: CANAL WEB -->
        <div id="wizard-pane-3" style="display: none;">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 3: ¿Dónde vendes por Internet?</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Elige el conector que corresponde a tu tienda online.</p>

          <div class="channel-select-grid">
            <div id="wiz-choice-univ" class="channel-card selected" onclick="wizSelectChannel('universal_bridge')">
              <div class="channel-icon" style="color: #38bdf8;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 2px;">Conector Web Universal</div>
              <div style="font-size: 11px; color: var(--text-muted);">Para cualquier web (Angular, PHP, cPanel, Plesk, Nginx).</div>
            </div>

            <div id="wiz-choice-woo" class="channel-card" onclick="wizSelectChannel('woocommerce')">
              <div class="channel-icon" style="color: #a78bfa;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 2px;">WooCommerce</div>
              <div style="font-size: 11px; color: var(--text-muted);">Conexión con claves API oficial.</div>
            </div>

            <div id="wiz-choice-prestashop" class="channel-card" onclick="wizSelectChannel('prestashop')">
              <div class="channel-icon" style="color: #f43f5e;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 2px;">PrestaShop 1.7 / 8.x</div>
              <div style="font-size: 11px; color: var(--text-muted);">Webservices API nativo sin módulos.</div>
            </div>

            <div id="wiz-choice-shopify" class="channel-card" onclick="wizSelectChannel('shopify')">
              <div class="channel-icon" style="color: #34d399;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 2px;">Shopify</div>
              <div style="font-size: 11px; color: var(--text-muted);">GraphQL Admin API y multiubicación.</div>
            </div>
          </div>

          <div id="wiz-panel-univ">
            <div style="padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin-bottom: 14px; font-size: 12px; color: var(--text-muted);">
              <strong>Paso rápido:</strong> 1. Descarga el archivo <code>erp-bridge-endpoint.php</code> <span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span> 2. Súbelo a la carpeta pública de tu web <span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span> 3. Pega tu web abajo.
              <div style="margin-top: 8px;">
                <button onclick="downloadUniversalCompanion()" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span>Descargar erp-bridge-endpoint.php</span>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Dirección de tu Tienda Web:</label>
              <div class="input-with-button">
                <input type="text" id="wiz-input-univ-url" onblur="sanitizeUrlInput('wiz-input-univ-url')" class="form-control" placeholder="https://mitienda.com">
                <button onclick="wizTestUniversal()" class="btn btn-secondary">Comprobar</button>
              </div>
              <div id="wiz-univ-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
            </div>
          </div>

          <div id="wiz-panel-woo" style="display: none;">
            <div class="form-group">
              <label class="form-label">URL de tu Tienda WooCommerce:</label>
              <input type="text" id="wiz-input-wc-url" onblur="sanitizeUrlInput('wiz-input-wc-url')" class="form-control" placeholder="https://mitienda.com">
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Consumer Key:</label>
                <input type="text" id="wiz-input-wc-key" class="form-control" placeholder="ck_...">
              </div>
              <div class="form-group">
                <label class="form-label">Consumer Secret:</label>
                <input type="password" id="wiz-input-wc-secret" class="form-control" placeholder="cs_...">
              </div>
            </div>
            <div style="margin-top: 8px;">
              <button onclick="wizTestWooCommerce()" id="wiz-btn-test-wc" class="btn btn-secondary btn-sm">
                <span>Comprobar Conexión WooCommerce</span>
              </button>
            </div>
            <div id="wiz-wc-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <div id="wiz-panel-prestashop" style="display: none;">
            <div class="form-group">
              <label class="form-label">URL de tu Tienda PrestaShop:</label>
              <input type="text" id="wiz-input-ps-url" onblur="sanitizeUrlInput('wiz-input-ps-url')" class="form-control" placeholder="https://mitienda.com">
            </div>
            <div class="form-group">
              <label class="form-label">Clave de Servicio Web (Webservice API Key):</label>
              <input type="password" id="wiz-input-ps-key" class="form-control" placeholder="32 caracteres alfanuméricos">
            </div>
            <div style="margin-top: 8px;">
              <button onclick="wizTestPrestashop()" id="wiz-btn-test-ps" class="btn btn-secondary btn-sm">
                <span>Comprobar Conexión PrestaShop</span>
              </button>
            </div>
            <div id="wiz-ps-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <div id="wiz-panel-shopify" style="display: none;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Subdominio Shopify:</label>
                <input type="text" id="wiz-input-shopify-subdomain" class="form-control" placeholder="mi-tienda.myshopify.com">
              </div>
              <div class="form-group">
                <label class="form-label">Admin API Access Token:</label>
                <input type="password" id="wiz-input-shopify-token" class="form-control" placeholder="shpat_...">
              </div>
            </div>
            <div style="margin-top: 8px;">
              <button onclick="wizTestShopify()" id="wiz-btn-test-shopify" class="btn btn-secondary btn-sm">
                <span>Comprobar Conexión Shopify</span>
              </button>
            </div>
            <div id="wiz-shopify-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>
        </div>

        <!-- PASO 4: ¡LISTO! -->
        <div id="wizard-pane-4" style="display: none;">
          <div style="text-align: center; padding: 20px 0;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--emerald);">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">¡Todo Listo para Sincronizar!</h2>
            <p id="wiz-ready-desc" style="font-size: 13px; color: var(--text-muted); max-width: 440px; margin: 0 auto 24px;">
              Tu equipo ha quedado configurado con éxito. El agente comenzará a sincronizar tu catálogo y existencias y a procesar los pedidos de tu web de forma 100% autónoma.
            </p>
            <button onclick="finishWizardAndStart()" class="btn btn-primary btn-lg" style="width: 100%; max-width: 320px; box-shadow: 0 4px 20px var(--primary-glow); display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Comenzar a Trabajar</span>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button id="wiz-btn-prev" onclick="wizPrevStep()" class="btn btn-secondary" style="visibility: hidden;">
          ← Anterior
        </button>
        <button id="wiz-btn-next" onclick="wizNextStep()" class="btn btn-primary">
          Siguiente Paso →
        </button>
      </div>
    </div>
  </div>`;
}
