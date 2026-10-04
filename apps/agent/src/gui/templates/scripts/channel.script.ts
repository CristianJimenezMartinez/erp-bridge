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
          alertBox.innerHTML = 
            '<div class="smart-success-card">' +
              '<span>✓</span>' +
              '<span>' + data.message + timeSuffix + '</span>' +
            '</div>';
          showSmartToast({
            title: 'Canal Web Conectado',
            message: 'Tu tienda responde correctamente' + timeSuffix,
            type: 'success'
          });
        } else {
          const errInfo = humanizeErrorMessage(data.message, 'channel');
          let extraActions = '';
          if (!url.startsWith('https://')) {
            extraActions += '<button type="button" onclick="document.getElementById(\\'input-universal-url\\').value=\\'https://\\' + document.getElementById(\\'input-universal-url\\').value.replace(/^http:\\/\\//, \\'\\'); testUniversalConnection();" class="smart-error-btn smart-error-btn-primary"><span>🔒 Añadir https://</span></button>';
          }
          extraActions += '<button type="button" onclick="downloadUniversalCompanion()" class="smart-error-btn"><span>⬇️ Descargar erp-bridge-endpoint.php</span></button>';
          extraActions += '<button type="button" onclick="testUniversalConnection()" class="smart-error-btn"><span>🔄 Reintentar comprobación</span></button>';
          alertBox.innerHTML = 
            '<div class="smart-error-card">' +
              '<div class="smart-error-header"><span>💡</span><span>' + errInfo.title + '</span></div>' +
              '<div class="smart-error-cause">' +
                '<strong>Causa:</strong> ' + errInfo.cause + '<br>' +
                '<strong>Solución recomendada:</strong> ' + errInfo.suggestion +
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
        alertBox.innerHTML = 
          '<div class="smart-error-card">' +
            '<div class="smart-error-header"><span>💡</span><span>' + errInfo.title + '</span></div>' +
            '<div class="smart-error-cause">' + errInfo.cause + '</div>' +
            '<div class="smart-error-actions"><button type="button" onclick="testUniversalConnection()" class="smart-error-btn smart-error-btn-primary"><span>🔄 Reintentar</span></button></div>' +
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
          alertBox.innerHTML = 
            '<div class="smart-success-card">' +
              '<span>✓</span>' +
              '<span>' + data.message + timeSuffix + '</span>' +
            '</div>';
          showSmartToast({
            title: 'WooCommerce Conectado',
            message: 'Conexión REST API verificada' + timeSuffix,
            type: 'success'
          });
        } else {
          const errInfo = humanizeErrorMessage(data.message, 'channel');
          let extraActions = '';
          if (!storeUrl.startsWith('https://')) {
            extraActions += '<button type="button" onclick="document.getElementById(\\'input-wc-url\\').value=\\'https://\\' + document.getElementById(\\'input-wc-url\\').value.replace(/^http:\\/\\//, \\'\\'); testWooCommerceConnection();" class="smart-error-btn smart-error-btn-primary"><span>🔒 Añadir https://</span></button>';
          }
          extraActions += '<button type="button" onclick="testWooCommerceConnection()" class="smart-error-btn"><span>🔄 Reintentar conexión</span></button>';
          alertBox.innerHTML = 
            '<div class="smart-error-card">' +
              '<div class="smart-error-header"><span>💡</span><span>' + errInfo.title + '</span></div>' +
              '<div class="smart-error-cause">' +
                '<strong>Causa:</strong> ' + errInfo.cause + '<br>' +
                '<strong>Solución recomendada:</strong> ' + errInfo.suggestion +
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
        alertBox.innerHTML = 
          '<div class="smart-error-card">' +
            '<div class="smart-error-header"><span>💡</span><span>' + errInfo.title + '</span></div>' +
            '<div class="smart-error-cause">' + errInfo.cause + '</div>' +
            '<div class="smart-error-actions"><button type="button" onclick="testWooCommerceConnection()" class="smart-error-btn smart-error-btn-primary"><span>🔄 Reintentar</span></button></div>' +
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

    async function saveChannelSettings() {
      sanitizeUrlInput('input-universal-url');
      sanitizeUrlInput('input-wc-url');

      const payload = {
        channelType: currentChannelType,
        universalBridge: {
          storeUrl: document.getElementById('input-universal-url').value.trim(),
          secretKey: document.getElementById('input-universal-key').value.trim(),
          enabled: currentChannelType === 'universal_bridge'
        },
        woocommerce: {
          storeUrl: document.getElementById('input-wc-url').value.trim(),
          consumerKey: document.getElementById('input-wc-key').value.trim(),
          consumerSecret: document.getElementById('input-wc-secret').value.trim(),
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
          showToast(enabled ? '✓ Auto-arranque con Windows activado' : 'Auto-arranque desactivado', 'info');
        } else {
          showToast('No se pudo cambiar el auto-arranque', 'warn');
        }
      } catch (e) {
        showToast('Error al configurar auto-arranque', 'error');
      }
    }
`;
