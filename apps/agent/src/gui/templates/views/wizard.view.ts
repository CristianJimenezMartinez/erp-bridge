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
          <div id="w-step-3" class="wizard-step-item">3. Tienda Web</div>
          <div id="w-step-4" class="wizard-step-item">4. Avisos por Email</div>
          <div id="w-step-5" class="wizard-step-item">5. ¡Listo!</div>
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
            <button onclick="detectFactusol(true)" id="wiz-btn-detect-fact" class="btn btn-secondary" style="flex: 1;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>🔍 Auto-detectar Factusol</span>
            </button>
            <button onclick="openNativeWindowsDialog(true)" id="wiz-btn-browse-native" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #1d4ed8, #2563eb); border: none; font-weight: 600;" title="Abre el selector nativo de Windows (Local / Red / NAS)">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/></svg>
              <span>📁 Examinar en Windows (Local / Red / NAS)</span>
            </button>
          </div>

          <div id="wiz-fact-detected-box" style="display: none; margin-bottom: 14px;">
            <div id="wiz-fact-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <label class="form-label" style="margin-bottom: 0;">Ruta de la base de datos (o carpeta):</label>
              <span style="font-size: 11px; color: #818cf8; cursor: pointer;" onclick="document.getElementById('wiz-input-fact-path').focus()">✍️ Escribir o pegar directamente</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">
              Si tu Factusol está en un <strong>NAS, servidor o unidad de red</strong> (ej: <code>X:\\Datos\\FS\\...</code> o <code>\\\\NAS\\Datos\\...</code>), puedes pegarla directamente aquí.
            </div>
            <input type="text" id="wiz-input-fact-path" oninput="cleanPathInput(this)" onblur="handleFactusolInputBlur('wiz-input-fact-path'); wizTestFactusolConnection();" class="form-control" placeholder="C:\\\\Software DELSOL\\\\Factusol\\\\Datos\\\\FS\\\\0012026.accdb  o  X:\\\\...  o  \\\\\\\\NAS\\\\..." style="font-family: monospace; font-size: 13px;">
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">💡 Las comillas de 'Copiar como ruta de acceso' de Windows se limpian automáticamente al pegar.</div>
            <div id="wiz-fact-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <!-- BLOQUE PEDAGÓGICO: SERIE PARA PEDIDOS WEB EN FACTUSOL -->
          <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <div>
                <div style="font-weight: 700; font-size: 13px; color: #fff; display: flex; align-items: center; gap: 8px;">
                  <span>Serie para Pedidos Web en Factusol</span>
                  <span style="font-size: 10px; background: rgba(99, 102, 241, 0.25); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.4); padding: 1px 7px; border-radius: 999px; font-weight: 600;">Recomendado: Serie 1 Directo</span>
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
                  <span style="font-weight: 700; font-size: 12px; color: #a5b4fc;">⭐ Serie 1 (Directo a Bandeja Principal)</span>
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
            <div style="padding: 12px 14px; background: rgba(30, 27, 75, 0.45); border: 1px solid rgba(129, 140, 248, 0.28); border-radius: 8px; font-size: 12px; line-height: 1.5; color: #e2e8f0;">
              <div style="font-weight: 700; color: #a5b4fc; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>💡 ¿Por qué recomendamos la Serie 1?</span>
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
            <div style="margin-top: 8px;">
              <button onclick="wizTestWooCommerce()" id="wiz-btn-test-wc" class="btn btn-secondary btn-sm">
                <span>Comprobar Conexión WooCommerce</span>
              </button>
            </div>
            <div id="wiz-wc-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>
        </div>

        <!-- PASO 4: AVISOS DE PEDIDOS POR EMAIL -->
        <div id="wizard-pane-4" style="display: none;">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 4: Avisos de Nuevos Pedidos por Email</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Recibe un correo corporativo automático con el desglose contable cada vez que un cliente compra en la web y el pedido entra en Factusol.</p>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: 10px; padding: 16px; margin-bottom: 18px;">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;">
              <input type="checkbox" id="wiz-check-alerts-enabled" checked style="width: 18px; height: 18px; accent-color: #6366f1; cursor: pointer;">
              <span style="font-weight: 600; font-size: 13.5px; color: #fff;">Activar alertas de nuevos pedidos por correo electrónico</span>
            </label>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px; padding-left: 28px;">
              Te notificaremos al instante con los datos del comprador, líneas de artículos, base imponible e IVA desglosado.
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" for="wiz-input-notif-email">Dirección de correo para recibir los avisos:</label>
            <div class="input-with-button">
              <input type="text" id="wiz-input-notif-email" class="form-control" placeholder="pedidos@tuempresa.com, almacen@tuempresa.com">
              <button onclick="wizTestOrderEmail()" id="wiz-btn-test-email" type="button" class="btn btn-secondary" style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                <span>Probar Envío de Email</span>
              </button>
            </div>
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Puedes indicar varios destinatarios separándolos por comas.</div>
            <div id="wiz-email-alert" style="margin-top: 10px; font-size: 12px; display: none;"></div>
          </div>

          <!-- Card pedagógico relay DKIM -->
          <div style="padding: 12px 14px; background: rgba(30, 27, 75, 0.45); border: 1px solid rgba(129, 140, 248, 0.28); border-radius: 8px; font-size: 12px; line-height: 1.5; color: #e2e8f0;">
            <div style="font-weight: 700; color: #a5b4fc; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              <span>Seguridad y Entrega Garantizada (Bentian Relay)</span>
            </div>
            <p style="margin: 0; color: #cbd5e1; font-size: 11.5px; line-height: 1.45;">
              El conector despacha los correos con firma criptográfica DKIM verificada a través del relay seguro de Bentian. No necesitas configurar servidores SMTP ni contraseñas a menos que quieras usar un correo corporativo propio.
            </p>
          </div>
        </div>

        <!-- PASO 5: ¡LISTO! -->
        <div id="wizard-pane-5" style="display: none;">
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
