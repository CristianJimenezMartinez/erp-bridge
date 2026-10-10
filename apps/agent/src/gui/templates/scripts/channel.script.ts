export const channelScript = `
    // Pruebas y Guardado Canal Web
    async function testUniversalConnection() {
      sanitizeUrlInput('input-universal-url');
      const url = document.getElementById('input-universal-url').value.trim();
      const key = document.getElementById('input-universal-key').value.trim();
      const chkBox = document.getElementById('univ-checklist-box');
      const alertBox = document.getElementById('univ-test-alert');
      const btn = document.getElementById('btn-test-univ');

      if (!url) {
        showSmartToast({
          title: 'Dirección web requerida',
          message: 'Introduce la dirección de tu tienda web (ejemplo: https://mitienda.com).',
          actionLabel: 'Corregir en Canal Web →',
          targetTab: 'channel',
          targetInputId: 'input-universal-url',
          type: 'warn'
        });
        return;
      }

      chkBox.style.display = 'block';
      const cServer = document.getElementById('chk-server');
      const cSsl = document.getElementById('chk-ssl');
      const cEnd = document.getElementById('chk-endpoint');
      const cDb = document.getElementById('chk-database');

      [cServer, cSsl, cEnd, cDb].forEach(function(el) { el.className = 'checklist-step'; });
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Comprobando tu web en tiempo real...</div>';
      btn.disabled = true;

      try {
        const res = await fetch('/api/local/test-universal-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl: url, secretKey: key })
        });
        const data = await res.json();
        const chks = data.checks || {};

        cServer.className = chks.serverOnline ? 'checklist-step ok' : 'checklist-step fail';
        cSsl.className = chks.sslValid ? 'checklist-step ok' : 'checklist-step fail';
        cEnd.className = chks.endpointFound ? 'checklist-step ok' : 'checklist-step fail';
        cDb.className = chks.databaseReady ? 'checklist-step ok' : 'checklist-step fail';

        const timeSuffix = (typeof data.durationMs === 'number') ? ' (' + data.durationMs + ' ms)' : '';
        if (data.success) {
          const cleanMsg = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(data.message) : (data.message || '');
          const safeMsg = (typeof escapeHtml === 'function') ? escapeHtml(cleanMsg) : cleanMsg;
          alertBox.innerHTML = 
            '<div class="smart-success-card">' +
              (typeof renderIcon === 'function' ? renderIcon('check', 'color:#34d399;') : '') +
              '<span>' + safeMsg + timeSuffix + '</span>' +
            '</div>';
          showSmartToast({
            title: 'Canal Web Conectado',
            message: 'Tu tienda responde correctamente' + timeSuffix,
            type: 'success'
          });
        } else {
          const errInfo = humanizeErrorMessage(data.message, 'channel');
          const cleanTitle = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(errInfo.title) : (errInfo.title || '');
          const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(cleanTitle) : cleanTitle;
          const safeCause = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.cause) : errInfo.cause;
          const safeSuggestion = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.suggestion) : errInfo.suggestion;
          let extraActions = '';
          if (!url.startsWith('https://')) {
            extraActions += '<button type="button" onclick="fixInputHttps(&quot;input-universal-url&quot;); testUniversalConnection();" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('lock') : '') + '<span>Añadir https://</span></button>';
          }
          extraActions += '<button type="button" onclick="downloadUniversalCompanion()" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('download') : '') + '<span>Descargar erp-bridge-endpoint.php</span></button>';
          extraActions += '<button type="button" onclick="testUniversalConnection()" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar comprobación</span></button>';
          alertBox.innerHTML = 
            '<div class="smart-error-card">' +
              '<div class="smart-error-header">' + (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') + '<span>' + safeTitle + '</span></div>' +
              '<div class="smart-error-cause">' +
                '<strong>Causa:</strong> ' + safeCause + '<br>' +
                '<strong>Solución recomendada:</strong> ' + safeSuggestion +
              '</div>' +
              '<div class="smart-error-actions">' + extraActions + '</div>' +
            '</div>';
          showSmartToast({
            title: errInfo.title,
            message: errInfo.message,
            actionLabel: 'Corregir en Canal Web →',
            targetTab: 'channel',
            targetInputId: 'input-universal-url',
            type: 'error'
          });
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.title) : errInfo.title;
        const safeCause = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.cause) : errInfo.cause;
        alertBox.innerHTML = 
          '<div class="smart-error-card">' +
            '<div class="smart-error-header">' + (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') + '<span>' + safeTitle + '</span></div>' +
            '<div class="smart-error-cause">' + safeCause + '</div>' +
            '<div class="smart-error-actions"><button type="button" onclick="testUniversalConnection()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar</span></button></div>' +
          '</div>';
        showSmartToast({
          title: errInfo.title,
          message: errInfo.message,
          actionLabel: 'Corregir en Canal Web →',
          targetTab: 'channel',
          targetInputId: 'input-universal-url',
          type: 'error'
        });
      } finally {
        btn.disabled = false;
      }
    }

    async function testWooCommerceConnection() {
      sanitizeUrlInput('input-wc-url');
      const storeUrl = document.getElementById('input-wc-url').value.trim();
      const consumerKey = document.getElementById('input-wc-key').value.trim();
      const consumerSecret = document.getElementById('input-wc-secret').value.trim();
      const alertBox = document.getElementById('wc-test-alert');
      const btn = document.getElementById('btn-test-wc');

      if (!storeUrl || !consumerKey || !consumerSecret) {
        showSmartToast({
          title: 'Credenciales incompletas',
          message: 'Rellena la URL de la tienda, Consumer Key y Consumer Secret de WooCommerce.',
          actionLabel: 'Corregir en Canal Web →',
          targetTab: 'channel',
          targetInputId: 'input-wc-url',
          type: 'warn'
        });
        return;
      }

      btn.disabled = true;
      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Comprobando conexión REST API WooCommerce...</div>';

      try {
        const res = await fetch('/api/local/test-woocommerce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl, consumerKey, consumerSecret })
        });
        const data = await res.json();
        const timeSuffix = (typeof data.durationMs === 'number') ? ' (' + data.durationMs + ' ms)' : '';
        if (data.success) {
          const cleanMsg = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(data.message) : (data.message || '');
          const safeMsg = (typeof escapeHtml === 'function') ? escapeHtml(cleanMsg) : cleanMsg;
          alertBox.innerHTML = 
            '<div class="smart-success-card">' +
              (typeof renderIcon === 'function' ? renderIcon('check', 'color:#34d399;') : '') +
              '<span>' + safeMsg + timeSuffix + '</span>' +
            '</div>';
          showSmartToast({
            title: 'WooCommerce Conectado',
            message: 'Conexión REST API verificada' + timeSuffix,
            type: 'success'
          });
        } else {
          const errInfo = humanizeErrorMessage(data.message, 'channel');
          const cleanTitle = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(errInfo.title) : (errInfo.title || '');
          const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(cleanTitle) : cleanTitle;
          const safeCause = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.cause) : errInfo.cause;
          const safeSuggestion = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.suggestion) : errInfo.suggestion;
          let extraActions = '';
          if (!storeUrl.startsWith('https://')) {
            extraActions += '<button type="button" onclick="fixInputHttps(&quot;input-wc-url&quot;); testWooCommerceConnection();" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('lock') : '') + '<span>Añadir https://</span></button>';
          }
          extraActions += '<button type="button" onclick="testWooCommerceConnection()" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar conexión</span></button>';
          alertBox.innerHTML = 
            '<div class="smart-error-card">' +
              '<div class="smart-error-header">' + (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') + '<span>' + safeTitle + '</span></div>' +
              '<div class="smart-error-cause">' +
                '<strong>Causa:</strong> ' + safeCause + '<br>' +
                '<strong>Solución recomendada:</strong> ' + safeSuggestion +
              '</div>' +
              '<div class="smart-error-actions">' + extraActions + '</div>' +
            '</div>';
          showSmartToast({
            title: errInfo.title,
            message: errInfo.message,
            actionLabel: 'Corregir en Canal Web →',
            targetTab: 'channel',
            targetInputId: 'input-wc-url',
            type: 'error'
          });
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.title) : errInfo.title;
        const safeCause = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.cause) : errInfo.cause;
        alertBox.innerHTML = 
          '<div class="smart-error-card">' +
            '<div class="smart-error-header">' + (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') + '<span>' + safeTitle + '</span></div>' +
            '<div class="smart-error-cause">' + safeCause + '</div>' +
            '<div class="smart-error-actions"><button type="button" onclick="testWooCommerceConnection()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar</span></button></div>' +
          '</div>';
        showSmartToast({
          title: errInfo.title,
          message: errInfo.message,
          actionLabel: 'Corregir en Canal Web →',
          targetTab: 'channel',
          targetInputId: 'input-wc-url',
          type: 'error'
        });
      } finally {
        btn.disabled = false;
      }
    }

    async function testShopifyConnection() {
      const subEl = document.getElementById('input-shopify-subdomain');
      const tokEl = document.getElementById('input-shopify-token');
      const shopSubdomain = subEl ? subEl.value.trim() : '';
      const accessToken = tokEl ? tokEl.value.trim() : '';
      const alertBox = document.getElementById('shopify-test-alert');
      const btn = document.getElementById('btn-test-shopify');

      if (!shopSubdomain || !accessToken) {
        showSmartToast({
          title: 'Credenciales incompletas',
          message: 'Introduce el subdominio de Shopify y el Admin Access Token.',
          actionLabel: 'Corregir en Canal Web →',
          targetTab: 'channel',
          targetInputId: 'input-shopify-subdomain',
          type: 'warn'
        });
        return;
      }

      if (btn) btn.disabled = true;
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Comprobando conexión GraphQL Admin API Shopify...</div>';
      }

      try {
        const res = await fetch('/api/local/test-shopify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopSubdomain, accessToken })
        });
        const data = await res.json();
        const timeSuffix = (typeof data.durationMs === 'number') ? ' (' + data.durationMs + ' ms)' : '';
        if (data.success) {
          const cleanMsg = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(data.message) : (data.message || '');
          const safeMsg = (typeof escapeHtml === 'function') ? escapeHtml(cleanMsg) : cleanMsg;
          let locationsListHtml = '';
          if (data.locations && data.locations.length > 0) {
            locationsListHtml = '<div style="margin-top:6px;font-size:11px;color:var(--text-muted);">Ubicaciones detectadas: ' +
              data.locations.map(function(l) { return escapeHtml(l.name) + ' (<code>' + escapeHtml(l.id) + '</code>)'; }).join(', ') +
              '</div>';
          }
          if (alertBox) {
            alertBox.innerHTML = 
              '<div class="smart-success-card">' +
                (typeof renderIcon === 'function' ? renderIcon('check', 'color:#34d399;') : '') +
                '<span>' + safeMsg + timeSuffix + '</span>' +
                locationsListHtml +
              '</div>';
          }
          showSmartToast({
            title: 'Shopify Conectado',
            message: 'Conexión GraphQL API verificada' + timeSuffix,
            type: 'success'
          });
        } else {
          const errInfo = humanizeErrorMessage(data.message, 'channel');
          const cleanTitle = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(errInfo.title) : (errInfo.title || '');
          const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(cleanTitle) : cleanTitle;
          const safeCause = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.cause) : errInfo.cause;
          const safeSuggestion = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.suggestion) : errInfo.suggestion;
          let extraActions = '<button type="button" onclick="testShopifyConnection()" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar conexión</span></button>';
          if (alertBox) {
            alertBox.innerHTML = 
              '<div class="smart-error-card">' +
                '<div class="smart-error-header">' + (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') + '<span>' + safeTitle + '</span></div>' +
                '<div class="smart-error-cause">' +
                  '<strong>Causa:</strong> ' + safeCause + '<br>' +
                  '<strong>Solución recomendada:</strong> ' + safeSuggestion +
                '</div>' +
                '<div class="smart-error-actions">' + extraActions + '</div>' +
              '</div>';
          }
          showSmartToast({
            title: errInfo.title,
            message: errInfo.message,
            actionLabel: 'Corregir en Canal Web →',
            targetTab: 'channel',
            targetInputId: 'input-shopify-subdomain',
            type: 'error'
          });
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.title) : errInfo.title;
        const safeCause = (typeof escapeHtml === 'function') ? escapeHtml(errInfo.cause) : errInfo.cause;
        if (alertBox) {
          alertBox.innerHTML = 
            '<div class="smart-error-card">' +
              '<div class="smart-error-header">' + (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') + '<span>' + safeTitle + '</span></div>' +
              '<div class="smart-error-cause">' + safeCause + '</div>' +
              '<div class="smart-error-actions"><button type="button" onclick="testShopifyConnection()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar</span></button></div>' +
            '</div>';
        }
        showSmartToast({
          title: errInfo.title,
          message: errInfo.message,
          actionLabel: 'Corregir en Canal Web →',
          targetTab: 'channel',
          targetInputId: 'input-shopify-subdomain',
          type: 'error'
        });
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function autoDetectShopifyLocation() {
      const subEl = document.getElementById('input-shopify-subdomain');
      const tokEl = document.getElementById('input-shopify-token');
      const locInput = document.getElementById('input-shopify-location');
      const btn = document.getElementById('btn-detect-shopify-loc');

      const shopSubdomain = subEl ? subEl.value.trim() : '';
      const accessToken = tokEl ? tokEl.value.trim() : '';

      if (!shopSubdomain || !accessToken) {
        showSmartToast({
          title: 'Credenciales requeridas',
          message: 'Introduce primero el subdominio y el Access Token de Shopify para consultar las ubicaciones.',
          type: 'warn'
        });
        return;
      }

      let originalContent = '';
      if (btn) {
        btn.disabled = true;
        originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="spin">⏳</span> Detectando...';
      }

      try {
        const res = await fetch('/api/local/test-shopify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopSubdomain, accessToken })
        });
        const data = await res.json();
        if (data.success && data.locations && data.locations.length > 0) {
          const firstLoc = data.locations[0];
          if (locInput) locInput.value = firstLoc.id;
          showSmartToast({
            title: 'Ubicación Detectada',
            message: 'Ubicación seleccionada: ' + firstLoc.name + ' (' + firstLoc.id + ')',
            type: 'success'
          });
        } else if (data.success) {
          showSmartToast({
            title: 'Sin Ubicaciones',
            message: 'No se encontraron ubicaciones de inventario activas en tu tienda de Shopify.',
            type: 'warn'
          });
        } else {
          showSmartToast({
            title: 'Error de Detección',
            message: data.message || 'No se pudo conectar con Shopify para detectar ubicaciones.',
            type: 'error'
          });
        }
      } catch (err) {
        showSmartToast({
          title: 'Error de Red',
          message: 'No se pudo contactar con el agente local: ' + err.message,
          type: 'error'
        });
      } finally {
        if (btn) {
          btn.disabled = false;
          if (originalContent) btn.innerHTML = originalContent;
        }
      }
    }

    async function saveChannelSettings() {
      sanitizeUrlInput('input-universal-url');
      sanitizeUrlInput('input-wc-url');

      const univUrlEl = document.getElementById('input-universal-url');
      const univKeyEl = document.getElementById('input-universal-key');
      const wcUrlEl = document.getElementById('input-wc-url');
      const wcKeyEl = document.getElementById('input-wc-key');
      const wcSecEl = document.getElementById('input-wc-secret');
      const shopSubEl = document.getElementById('input-shopify-subdomain');
      const shopTokEl = document.getElementById('input-shopify-token');
      const shopLocEl = document.getElementById('input-shopify-location');

      const payload = {
        channelType: currentChannelType,
        universalBridge: {
          storeUrl: univUrlEl ? univUrlEl.value.trim() : '',
          secretKey: univKeyEl ? univKeyEl.value.trim() : '',
          enabled: currentChannelType === 'universal_bridge'
        },
        woocommerce: {
          storeUrl: wcUrlEl ? wcUrlEl.value.trim() : '',
          consumerKey: wcKeyEl ? wcKeyEl.value.trim() : '',
          consumerSecret: wcSecEl ? wcSecEl.value.trim() : '',
        },
        shopify: {
          shopSubdomain: shopSubEl ? shopSubEl.value.trim() : '',
          accessToken: shopTokEl ? shopTokEl.value.trim() : '',
          locationId: shopLocEl ? shopLocEl.value.trim() : '',
        }
      };
      await submitConfigUpdates(payload, 'Ajustes del Canal Web guardados con éxito.');
    }

    async function saveSyncRules() {
      const payload = {
        syncRules: {
          enableFileWatcher: document.getElementById('check-watcher-enabled').checked,
          debounceSeconds: parseInt(document.getElementById('input-debounce-sec').value, 10) || 5,
          periodicIntervalMinutes: parseInt(document.getElementById('select-periodic-min').value, 10) || 15,
          syncStock: document.getElementById('check-sync-stock').checked,
          syncPrices: document.getElementById('check-sync-prices').checked,
          syncDescriptions: document.getElementById('check-sync-desc').checked,
          safetyStockBuffer: parseInt(document.getElementById('input-safety-stock').value, 10) || 0,
          onlyStockAboveZero: document.getElementById('check-only-stock-pos').checked,
        }
      };
      await submitConfigUpdates(payload, 'Reglas de automatización guardadas.');
    }

    async function loadAutoStart(force) {
      if (window.__autoStartLoaded && !force) return;
      try {
        const res = await fetch('/api/local/autostart');
        const data = await res.json();
        const chk = document.getElementById('check-autostart-enabled');
        if (chk && data && typeof data.enabled === 'boolean' && (force || document.activeElement !== chk)) {
          chk.checked = data.enabled;
        }
        window.__autoStartLoaded = true;
      } catch (e) {}
    }

    async function toggleAutoStart(enabled) {
      try {
        const res = await fetch('/api/local/autostart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });
        const data = await res.json();
        if (data.success) {
          showToast(enabled ? 'Auto-arranque con Windows activado' : 'Auto-arranque desactivado', 'info');
        } else {
          showToast('No se pudo cambiar el auto-arranque', 'warn');
        }
      } catch (e) {
        showToast('Error al configurar auto-arranque', 'error');
      }
    }
`;
