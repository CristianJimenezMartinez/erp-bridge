export const syncScript = `
    async function triggerManualSync() {
      // Directiva de usuario: si la url del sitio web no está puesta, llevar hasta el canal web
      if (typeof isStoreUrlConfigured === 'function' && !isStoreUrlConfigured()) {
        if (typeof navigateToChannelUrlInput === 'function') {
          navigateToChannelUrlInput('Antes de sincronizar necesitas indicar la dirección de tu tienda online.');
        } else if (typeof navigateToResolution === 'function') {
          navigateToResolution('channel', 'input-universal-url');
        }
        return;
      }

      const btnH = document.getElementById('btn-sync-header');
      const iconH = document.getElementById('sync-icon-header');
      if (btnH) btnH.disabled = true;
      if (iconH) iconH.classList.add('spin');
      showSmartToast({ message: 'Iniciando sincronización autónoma...', type: 'info' });
      try {
        const res = await fetch('/api/local/sync-now', { method: 'POST' });
        const data = await res.json();
        const timeSuffix = (typeof data.durationMs === 'number') ? ' (' + data.durationMs + ' ms)' : '';
        if (data.success) {
          showSmartToast({
            title: 'Sincronización Completada',
            message: data.message + timeSuffix,
            type: 'success'
          });
          fetchStatus();
          if (typeof loadSalesOrders === 'function') loadSalesOrders();
        } else {
          // Si el mensaje del backend indica ausencia de URL, redirigir al canal web
          const isMissingUrlError = /url.*no configurada|url.*requerida|falta.*url|dirección.*requerida|tienda.*no configurada/i.test(data.message || '');
          if (isMissingUrlError && typeof navigateToChannelUrlInput === 'function') {
            navigateToChannelUrlInput(data.message);
            return;
          }
          const errInfo = humanizeErrorMessage(data.message, 'sync');
          showSmartToast({
            title: errInfo.title || 'Aviso en sincronización',
            message: (errInfo.message || data.message) + timeSuffix,
            actionLabel: errInfo.actionLabel || 'Ver Registro →',
            targetTab: errInfo.targetTab || 'logs',
            targetInputId: errInfo.targetInputId,
            type: 'warn'
          });
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'sync');
        showSmartToast({
          title: 'Error de Sincronización',
          message: errInfo.message,
          actionLabel: errInfo.actionLabel || 'Ver Registro →',
          targetTab: errInfo.targetTab || 'logs',
          type: 'error'
        });
      } finally {
        if (btnH) btnH.disabled = false;
        if (iconH) iconH.classList.remove('spin');
      }
    }
    window.triggerManualSync = triggerManualSync;

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
      await submitConfigUpdates(payload, 'Reglas de automatización guardadas con éxito.');
    }
    window.saveSyncRules = saveSyncRules;

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
    window.loadAutoStart = loadAutoStart;

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
        showToast('Error de red al actualizar auto-arranque', 'error');
      }
    }
    window.toggleAutoStart = toggleAutoStart;

    function downloadDiagnostics() {
      window.open('/api/local/export-diagnostic', '_blank');
      showToast('Descargando archivo de diagnóstico...');
    }
    window.downloadDiagnostics = downloadDiagnostics;
`;
