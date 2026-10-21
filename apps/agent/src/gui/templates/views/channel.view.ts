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

          <!-- Selector de Canal (4 Plataformas de Tienda Online + Conector Cloud Secundario) -->
          <div class="channel-select-grid">
            <div id="card-choice-universal" class="channel-card selected" onclick="selectChannelType('universal_bridge')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div class="channel-icon" style="color: #38bdf8; margin-bottom: 0;">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
                </div>
                <span class="tag tag-blue" style="font-size:10px;padding:2px 6px;">Recomendado</span>
              </div>
              <div style="font-weight: 600; font-size: 13.5px; color: #fff; margin-bottom: 4px;">Conector Web Universal</div>
              <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Web a medida (Angular, React, PHP), Plesk/cPanel o WordPress por micro-puente HTTPS.</div>
            </div>

            <div id="card-choice-woo" class="channel-card" onclick="selectChannelType('woocommerce')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div class="channel-icon" style="color: #a78bfa; margin-bottom: 0;">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                </div>
                <span class="tag" style="font-size:10px;padding:2px 6px;background:rgba(255,255,255,0.06);color:var(--text-muted);">REST API</span>
              </div>
              <div style="font-weight: 600; font-size: 13.5px; color: #fff; margin-bottom: 4px;">WooCommerce / WP</div>
              <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Conexión directa mediante claves oficiales de WooCommerce (Consumer Key / Secret).</div>
            </div>

            <div id="card-choice-prestashop" class="channel-card" onclick="selectChannelType('prestashop')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div class="channel-icon" style="color: #ea1b75; margin-bottom: 0;">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 16l2 2 4-4M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
                </div>
                <span class="tag" style="font-size:10px;padding:2px 6px;background:rgba(255,255,255,0.06);color:var(--text-muted);">Webservice</span>
              </div>
              <div style="font-weight: 600; font-size: 13.5px; color: #fff; margin-bottom: 4px;">PrestaShop 1.7 / 8.x</div>
              <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Enlace directo con el Webservice API oficial de PrestaShop para catálogo y pedidos.</div>
            </div>

            <div id="card-choice-shopify" class="channel-card" onclick="selectChannelType('shopify')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div class="channel-icon" style="color: #96bf48; margin-bottom: 0;">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <span class="tag" style="font-size:10px;padding:2px 6px;background:rgba(255,255,255,0.06);color:var(--text-muted);">GraphQL</span>
              </div>
              <div style="font-weight: 600; font-size: 13.5px; color: #fff; margin-bottom: 4px;">Shopify Store</div>
              <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">Sincronización de inventario multi-sede y pedidos vía GraphQL Admin API.</div>
            </div>
          </div>

          <div id="card-choice-holded" class="channel-card" onclick="selectChannelType('holded')" style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="channel-icon" style="color: #ff5a5f; margin-bottom: 0; width: 34px; height: 34px; flex-shrink: 0;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
              </div>
              <div>
                <div style="font-weight: 600; font-size: 13px; color: #fff;">Holded Cloud ERP (Puente Híbrido Local ↔ Nube)</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">¿Usas Holded en la nube como canal secundario o facturación? Sincroniza stock, catálogo y pedidos con Holded Invoicing API.</div>
              </div>
            </div>
            <span class="tag" style="font-size:10.5px;padding:3px 8px;background:rgba(255,90,95,0.12);color:#fda4af;border:1px solid rgba(255,90,95,0.25);flex-shrink:0;">Cloud API</span>
          </div>

          <!-- OPCIÓN A: CONECTOR WEB UNIVERSAL (HTTPS 443) -->
          <div id="panel-universal-bridge">
            <div style="padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; margin-bottom: 20px;">
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
                <button onclick="downloadUniversalCompanion()" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span>Descargar conector erp-bridge-endpoint.php</span>
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

          <!-- OPCIÓN C: SHOPIFY ADMIN GRAPHQL API -->
          <div id="panel-shopify" style="display: none;">
            <div style="padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Paso a Paso: Configurar Conexión Oficial con Shopify Store
              </div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
                1. En tu panel de Shopify, ve a <strong>Configuración &gt; Aplicaciones y canales de ventas &gt; Desarrollar aplicaciones</strong>.<br>
                2. Crea una aplicación privada y activa los permisos de API Admin: <code>read_products, write_products, read_inventory, write_inventory, read_orders, write_orders</code>.<br>
                3. Instala la aplicación y copia el <strong>Token de acceso a la API del Administrador</strong> (empieza por <code>shpat_</code>).<br>
                4. Introduce el subdominio y el token, y pulsa <strong>Comprobar Conexión Shopify</strong>.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Subdominio de tu Tienda Shopify:</label>
              <input type="text" id="input-shopify-subdomain" class="form-control" placeholder="mi-tienda (o https://mi-tienda.myshopify.com)">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Introduce tu subdominio (ej: <code>mi-tienda</code>) o la URL completa de tu tienda Shopify.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Admin API Access Token (shpat_...):</label>
              <input type="password" id="input-shopify-token" class="form-control" placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Token de acceso privado generado en Apps Personalizadas de Shopify con permisos de inventario y catálogo.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Location ID (Ubicación de Inventario):</label>
              <div class="input-with-button">
                <input type="text" id="input-shopify-location" class="form-control" placeholder="gid://shopify/Location/123456789">
                <button onclick="autoDetectShopifyLocation()" id="btn-detect-shopify-loc" class="btn btn-secondary" style="white-space: nowrap;">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>Auto-detectar Ubicación</span>
                </button>
              </div>
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Identificador de la ubicación donde Factusol actualizará el stock disponible.</div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
              <button onclick="testShopifyConnection()" id="btn-test-shopify" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Comprobar Conexión Shopify</span>
              </button>
              <span id="shopify-latency-badge" class="tag" style="display: none;"></span>
            </div>
            <div id="shopify-test-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <!-- OPCIÓN D: PRESTASHOP WEBSERVICES API -->
          <div id="panel-prestashop" style="display: none;">
            <div style="padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Paso a Paso: Configurar Conexión Oficial con PrestaShop
              </div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
                1. En tu panel de PrestaShop, entra en <strong>Parámetros Avanzados &gt; Web service</strong>.<br>
                2. Asegúrate de marcar <strong>Activar el servicio Web: SÍ</strong> y pulsa Guardar.<br>
                3. Pulsa <strong>Añadir nueva clave del servicio web</strong>, genera una clave con permisos de Ver / Modificar / Añadir (GET, POST, PUT) y guarda.<br>
                4. Pega la URL de tu tienda y la clave generada a continuación, y pulsa <strong>Comprobar Conexión</strong>.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Dirección de tu Tienda PrestaShop:</label>
              <input type="url" id="input-prestashop-url" onblur="sanitizeUrlInput('input-prestashop-url')" class="form-control" placeholder="https://mitienda.com">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Introduce la dirección URL donde está instalado PrestaShop (añadirá https:// automáticamente).</div>
            </div>

            <div class="form-group">
              <label class="form-label">Clave Webservice de PrestaShop:</label>
              <input type="password" id="input-prestashop-key" class="form-control" placeholder="Clave alfanumérica de 32 caracteres">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Clave alfanumérica de autenticación creada en Parámetros Avanzados &gt; Web service.</div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
              <button onclick="testPrestashopConnection()" id="btn-test-prestashop" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Comprobar Conexión</span>
              </button>
              <span id="prestashop-latency-badge" class="tag" style="display: none;"></span>
            </div>

            <!-- Checklist Interactivo de 4 Pasos -->
            <div id="prestashop-checklist-box" style="display: none; margin-top: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 8px;">Checklist de Estado de PrestaShop:</div>
              <div class="checklist-container">
                <div id="chk-ps-server" class="checklist-step">
                  <span class="checklist-circle">1</span>
                  <span>1. Servidor web OK (HTTP 200 responde)</span>
                </div>
                <div id="chk-ps-ssl" class="checklist-step">
                  <span class="checklist-circle">2</span>
                  <span>2. Certificado SSL OK (Conexión segura HTTPS)</span>
                </div>
                <div id="chk-ps-api" class="checklist-step">
                  <span class="checklist-circle">3</span>
                  <span>3. Webservices API activa (Endpoint /api disponible)</span>
                </div>
                <div id="chk-ps-perms" class="checklist-step">
                  <span class="checklist-circle">4</span>
                  <span>4. Permisos de lectura/escritura y clave verificados</span>
                </div>
              </div>
              <div id="prestashop-test-alert" style="margin-top: 10px; font-size: 12px; display: none;"></div>
            </div>
          </div>

          <!-- OPCIÓN E: HOLDED CLOUD ERP -->
          <div id="panel-holded" style="display: none;">
            <div style="padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Conexión Cloud ERP con Holded (Facturación, Stock y Pedidos)
              </div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
                1. Accede a tu cuenta de Holded y dirígete a <strong>Configuración &gt; Desarrolladores &gt; API Keys</strong>.<br>
                2. Crea una <strong>API Key</strong> con permisos de Facturación / Invoicing (Contactos, Productos, Ventas).<br>
                3. Pega tu API Key a continuación y pulsa <strong>Comprobar Conexión Holded</strong> para verificar la latencia y comunicación en vivo.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Holded API Key:</label>
              <input type="password" id="input-holded-apikey" class="form-control" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Clave privada de API generada en tu cuenta de Holded Cloud.</div>
            </div>

            <div class="form-group">
              <label class="form-label">ID de Almacén Predeterminado (Default Warehouse ID):</label>
              <input type="text" id="input-holded-warehouse" class="form-control" placeholder="64b8f0... (Opcional - dejar vacío para almacén principal)">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Identificador de almacén para gestión multialmacén en Holded (opcional).</div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
              <button onclick="testHoldedConnection()" id="btn-test-holded" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Comprobar Conexión Holded</span>
              </button>
              <span id="holded-latency-badge" class="tag" style="display: none;"></span>
            </div>
            <div id="holded-test-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
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
