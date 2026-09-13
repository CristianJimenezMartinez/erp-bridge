export function renderChannelTab(): string {
  return `      <!-- ================= TAB 3: CANAL WEB / TIENDA ================= -->
      <section id="tab-channel" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Canal Web de Comercio Electrónico</div>
              <div class="section-desc">Selecciona el tipo de web o plataforma donde vendes por internet.</div>
            </div>
          </div>

          <!-- Selector de Canal -->
          <div class="channel-select-grid">
            <div id="card-choice-universal" class="channel-card selected" onclick="selectChannelType('universal_bridge')">
              <div class="channel-icon" style="color: #38bdf8;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 14px; color: #fff; margin-bottom: 4px;">Conector Web Universal (Recomendado)</div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">Para cualquier web a medida (Angular, React, PHP), hosting (cPanel, Plesk, Nginx, Apache) o WordPress propio por micro-puente HTTPS.</div>
            </div>

            <div id="card-choice-woo" class="channel-card" onclick="selectChannelType('woocommerce')">
              <div class="channel-icon" style="color: #a78bfa;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 14px; color: #fff; margin-bottom: 4px;">WooCommerce / WordPress</div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">Conexión directa mediante claves de la API REST oficial de WooCommerce (Consumer Key / Consumer Secret).</div>
            </div>
          </div>

          <!-- OPCIÓN A: CONECTOR WEB UNIVERSAL (HTTPS 443) -->
          <div id="panel-universal-bridge">
            <div style="padding: 16px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 10px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Paso a Paso: Cómo enlazar tu web en 2 minutos (Cero Puertos, Cero Riesgos)
              </div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
                1. Pulsa el botón de abajo para <strong>descargar el archivo conector</strong> (ya viene con tu clave de seguridad inyectada).<br>
                2. Sube ese archivo a la <strong>carpeta principal de tu web</strong> (por ejemplo <code>public_html</code>, <code>httpdocs</code> o <code>www</code>) mediante el gestor de archivos de tu hosting o por FTP.<br>
                3. Pega la dirección de tu web y pulsa <strong>Comprobar Conexión</strong>.
              </div>
              <div style="margin-top: 12px;">
                <button onclick="downloadUniversalCompanion()" class="btn btn-primary btn-sm">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span>⬇️ Descargar conector erp-bridge-endpoint.php</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Dirección de tu Tienda Web:</label>
              <div class="input-with-button">
                <input type="text" id="input-universal-url" onblur="sanitizeUrlInput('input-universal-url')" class="form-control" placeholder="https://mitienda.com">
                <button onclick="testUniversalConnection()" id="btn-test-univ" class="btn btn-secondary" style="white-space: nowrap;">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                  <span>Comprobar Conexión</span>
                </button>
              </div>
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Si no pones https://, el sistema lo añadirá automáticamente.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Clave Secreta del Conector (Bearer Token):</label>
              <div class="input-with-button">
                <input type="text" id="input-universal-key" class="form-control" style="font-family: monospace;" placeholder="EB_SEC_xxxxxxxxxxxx">
                <button onclick="generateRandomBridgeKey()" class="btn btn-secondary btn-sm" title="Generar nueva clave aleatoria">Generar</button>
              </div>
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Esta misma clave debe estar configurada en el archivo descargado.</div>
            </div>

            <!-- Checklist Interactivo de 4 Pasos -->
            <div id="univ-checklist-box" style="display: none; margin-top: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 8px;">Checklist de Estado de tu Web:</div>
              <div class="checklist-container">
                <div id="chk-server" class="checklist-step">
                  <span class="checklist-circle">1</span>
                  <span>1. Servidor web responde correctamente (HTTP 200 OK)</span>
                </div>
                <div id="chk-ssl" class="checklist-step">
                  <span class="checklist-circle">2</span>
                  <span>2. Certificado SSL seguro verificado (Puerto 443 HTTPS)</span>
                </div>
                <div id="chk-endpoint" class="checklist-step">
                  <span class="checklist-circle">3</span>
                  <span>3. Archivo erp-bridge-endpoint.php detectado en la raíz</span>
                </div>
                <div id="chk-database" class="checklist-step">
                  <span class="checklist-circle">4</span>
                  <span>4. Base de datos MariaDB / MySQL local lista para sincronizar</span>
                </div>
              </div>
              <div id="univ-test-alert" style="margin-top: 10px; font-size: 12px;"></div>
            </div>
          </div>

          <!-- OPCIÓN B: WOOCOMMERCE REST API -->
          <div id="panel-woocommerce" style="display: none;">
            <div class="form-group">
              <label class="form-label">URL de tu Tienda WooCommerce:</label>
              <input type="url" id="input-wc-url" onblur="sanitizeUrlInput('input-wc-url')" class="form-control" placeholder="https://mitienda.com">
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Consumer Key (ck_...):</label>
                <input type="text" id="input-wc-key" class="form-control" placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx">
              </div>
              <div class="form-group">
                <label class="form-label">Consumer Secret (cs_...):</label>
                <input type="password" id="input-wc-secret" class="form-control" placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx">
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 6px;">
              <button onclick="testWooCommerceConnection()" id="btn-test-wc" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Probar Conexión REST API</span>
              </button>
            </div>
            <div id="wc-test-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <button onclick="saveChannelSettings()" class="btn btn-primary">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Guardar Ajustes del Canal Web</span>
            </button>
          </div>
        </div>
      </section>`;
}
