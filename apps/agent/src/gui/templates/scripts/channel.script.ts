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
        showToast('Introduce la dirección de tu web', 'warn');
        return;
      }

      chkBox.style.display = 'block';
      const cServer = document.getElementById('chk-server');
      const cSsl = document.getElementById('chk-ssl');
      const cEnd = document.getElementById('chk-endpoint');
      const cDb = document.getElementById('chk-database');

      [cServer, cSsl, cEnd, cDb].forEach(function(el) { el.className = 'checklist-step'; });
      alertBox.textContent = 'Comprobando tu web en tiempo real...';
      alertBox.style.color = 'var(--text-muted)';
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

        alertBox.textContent = (data.success ? '✓ ' : '✕ ') + data.message;
        alertBox.style.color = data.success ? '#34d399' : '#f87171';
        showToast(data.message, data.success ? 'success' : 'warn');
      } catch (err) {
        alertBox.textContent = 'Error de comunicación local al probar conector';
        alertBox.style.color = '#f87171';
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
        showToast('Rellena la URL, Consumer Key y Consumer Secret', 'warn');
        return;
      }

      btn.disabled = true;
      try {
        const res = await fetch('/api/local/test-woocommerce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl, consumerKey, consumerSecret })
        });
        const data = await res.json();
        alertBox.style.display = 'block';
        alertBox.style.color = data.success ? '#34d399' : '#f87171';
        alertBox.textContent = (data.success ? '✓ ' : '✕ ') + data.message;
        showToast(data.message, data.success ? 'success' : 'error');
      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Error de comunicación al probar WooCommerce';
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
