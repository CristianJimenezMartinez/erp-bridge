export function renderWizardModal(): string {
  return `  <!-- ================= ONBOARDING WIZARD MODAL ================= -->
  <div id="modal-wizard" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" fill="none" stroke="#818cf8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>
          <span style="font-weight: 700; font-size: 15px; color: #fff;">Asistente de Configuración Rápida</span>
        </div>
        <button onclick="closeWizardModal()" class="btn btn-secondary btn-sm" style="padding: 4px 8px;">✕</button>
      </div>

      <div class="modal-body">
        <div class="wizard-steps-bar">
          <div id="w-step-1" class="wizard-step-item active">1. Licencia</div>
          <div id="w-step-2" class="wizard-step-item">2. Factusol</div>
          <div id="w-step-3" class="wizard-step-item">3. Tu Canal Web</div>
          <div id="w-step-4" class="wizard-step-item">4. ¡Listo!</div>
        </div>

        <!-- PASO 1: LICENCIA -->
        <div id="wizard-pane-1">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 1: Activa tu Licencia</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Introduce la clave de puesto que recibiste al suscribirte a Bentian ERP Bridge.</p>
          
          <div class="form-group">
            <label class="form-label">Clave de Licencia (EB-XXXXX):</label>
            <div class="input-with-button">
              <input type="text" id="wiz-input-lic" class="form-control" style="font-family: monospace; font-size: 14px;" placeholder="EB-XXXXX-XXXXX-XXXXX-XXXXX">
              <button onclick="wizPasteAndActivateLicense()" id="wiz-btn-activate" class="btn btn-primary">
                <span>📋 Pegar y Activar</span>
              </button>
            </div>
            <div id="wiz-lic-alert" style="margin-top: 10px; font-size: 12px; display: none;"></div>
          </div>
        </div>

        <!-- PASO 2: FACTUSOL -->
        <div id="wizard-pane-2" style="display: none;">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 2: Conecta tu Factusol</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Selecciona la base de datos de tu empresa. El conector la detectará automáticamente.</p>
          
          <div style="display: flex; gap: 10px; margin-bottom: 16px;">
            <button onclick="detectFactusol(true)" id="wiz-btn-detect-fact" class="btn btn-primary" style="flex: 1;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>🔍 Buscar mi Factusol Automáticamente</span>
            </button>
            <button onclick="browseFactusol(true)" id="wiz-btn-browse-fact" class="btn btn-secondary">
              <span>📁 Examinar Carpetas</span>
            </button>
            <button onclick="openNativeWindowsDialog(true)" id="wiz-btn-browse-native" class="btn btn-primary" style="background: linear-gradient(135deg, #1d4ed8, #2563eb); border: none;" title="Abre el explorador de Windows estándar para buscar en la Red o NAS">
              <span>🌐 Red / NAS</span>
            </button>
          </div>

          <div id="wiz-fact-detected-box" style="display: none; margin-bottom: 14px;">
            <div id="wiz-fact-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Ruta seleccionada:</label>
            <input type="text" id="wiz-input-fact-path" onblur="handleFactusolInputBlur('wiz-input-fact-path')" class="form-control" placeholder="C:\\\\Software DELSOL\\\\Factusol\\\\Datos\\\\FS\\\\0012026.accdb">
            <div id="wiz-fact-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
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
          </div>

          <div id="wiz-panel-univ">
            <div style="padding: 12px; background: rgba(99,102,241,0.08); border-radius: 8px; margin-bottom: 14px; font-size: 12px; color: var(--text-muted);">
              <strong>Paso rápido:</strong> 1. Descarga el archivo <code>erp-bridge-endpoint.php</code> ➡️ 2. Súbelo a la carpeta pública de tu web ➡️ 3. Pega tu web abajo.
              <div style="margin-top: 8px;">
                <button onclick="downloadUniversalCompanion()" class="btn btn-secondary btn-sm">⬇️ Descargar erp-bridge-endpoint.php</button>
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
          </div>
        </div>

        <!-- PASO 4: ¡LISTO! -->
        <div id="wizard-pane-4" style="display: none;">
          <div style="text-align: center; padding: 20px 0;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--emerald);">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">¡Todo Listo para Sincronizar!</h2>
            <p style="font-size: 13px; color: var(--text-muted); max-width: 440px; margin: 0 auto 24px;">
              Tu equipo ha quedado configurado con éxito. El agente comenzará a vigilar Factusol y a procesar los pedidos de tu web de forma 100% autónoma.
            </p>
            <button onclick="finishWizardAndStart()" class="btn btn-primary btn-lg" style="width: 100%; max-width: 320px; box-shadow: 0 4px 20px var(--primary-glow);">
              <span>🚀 Comenzar a Trabajar</span>
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
