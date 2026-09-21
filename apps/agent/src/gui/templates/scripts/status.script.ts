export function renderStatusScript(agentVersion: string = '0.2.0'): string {
  return `
    // Status Polling
    async function fetchStatus(forceFormSync) {
      try {
        const res = await fetch('/api/local/status');
        if (!res.ok) return;
        currentStatus = await res.json();
        renderStatus(currentStatus);
        updateFormInputs(currentStatus, forceFormSync);
        if (typeof loadAutoStart === 'function') {
          loadAutoStart(forceFormSync);
        }
      } catch (err) {
        console.warn('Servidor local:', err); // quality-allow-console (browser template script)
      }
    }

    function renderStatus(data) {
      if (!data) return;

      document.getElementById('brand-version').textContent = 'v' + (data.agentVersion || '${agentVersion}');
      document.getElementById('sidebar-hostname').textContent = (data.system && data.system.hostname) ? data.system.hostname : 'Local';
      document.getElementById('sidebar-hwid').textContent = data.hwid ? (data.hwid.substring(0, 12) + '...') : '---';

      // Factusol
      const fact = data.factusol || {};
      const cardFBadge = document.getElementById('card-f-badge');
      const cardFMetric = document.getElementById('card-f-metric');
      const cardFPath = document.getElementById('card-f-path');
      const cardFWatcher = document.getElementById('card-f-watcher');

      if (fact.configured && fact.connected) {
        cardFBadge.className = 'tag tag-green';
        cardFBadge.textContent = 'Conectado';
        cardFMetric.textContent = (fact.articleCount !== undefined ? fact.articleCount.toLocaleString('es-ES') : '0') + ' arts.';
        cardFPath.textContent = fact.fileName || fact.databasePath;
        cardFWatcher.textContent = fact.watcherActive ? '● Vigilante activo' : '○ En pausa';
      } else if (fact.configured) {
        cardFBadge.className = 'tag tag-amber';
        cardFBadge.textContent = 'Sin Conexión';
        cardFMetric.textContent = 'Revisando';
        cardFPath.textContent = fact.databasePath || 'Sin ruta';
      } else {
        cardFBadge.className = 'tag tag-rose';
        cardFBadge.textContent = 'No Configurado';
        cardFMetric.textContent = 'Sin Base';
        cardFPath.textContent = 'Pulsa en Ajustar para seleccionar tu archivo';
      }

      const chType = data.channelType || 'universal_bridge';
      const univ = data.universalBridgeSettings || {};
      const wc = data.woocommerceSettings || {};

      const cardWcMetric = document.getElementById('card-wc-metric');
      const cardWcUrl = document.getElementById('card-wc-url');
      if (chType === 'universal_bridge') {
        cardWcMetric.textContent = 'Conector Universal';
        cardWcUrl.textContent = univ.storeUrl || 'Sin configurar';
      } else {
        cardWcMetric.textContent = 'WooCommerce';
        cardWcUrl.textContent = wc.storeUrl || 'Sin configurar';
      }

      // Licencia
      const lic = data.license || {};
      const licBadge = document.getElementById('card-lic-badge');
      const licPlan = document.getElementById('card-lic-plan');
      const licKey = document.getElementById('card-lic-key');
      const fullLicStatusBadge = document.getElementById('lic-status-badge');

      if (lic.status === 'VALID' || lic.status === 'GRACE_PERIOD') {
        const isGood = lic.status === 'VALID';
        licBadge.className = isGood ? 'tag tag-green' : 'tag tag-amber';
        licBadge.textContent = isGood ? 'Activa' : 'Gracia Offline';
        fullLicStatusBadge.className = isGood ? 'tag tag-green' : 'tag tag-amber';
        fullLicStatusBadge.textContent = isGood ? 'Licencia Activa' : 'Período Gracia Offline';
        licPlan.textContent = (lic.plan || 'Professional').toUpperCase();
        document.getElementById('lic-plan-name').value = (lic.plan || 'Professional').toUpperCase();
      } else {
        licBadge.className = 'tag tag-rose';
        licBadge.textContent = 'Sin Licencia';
        fullLicStatusBadge.className = 'tag tag-rose';
        fullLicStatusBadge.textContent = 'No Activada';
      }

      if (data.licenseKey) {
        licKey.textContent = data.licenseKey;
      }
      document.getElementById('lic-hwid-val').value = data.hwid || '';

      // Logs
      allLogs = data.recentEvents || [];
      renderLogs(allLogs);

      // Historial
      if (data.syncHistory) {
        renderHistoryTable(data.syncHistory);
      }

      // Estado de actualización (Botón de cabecera y Banner Zen estilo Google/Antigravity)
      const upd = data.update;
      const btnHeader = document.getElementById('btn-update-restart');
      const btnHeaderText = document.getElementById('btn-update-text');
      const bannerOverview = document.getElementById('overview-update-banner');
      const bannerTitle = document.getElementById('update-banner-title');
      const bannerDesc = document.getElementById('update-banner-desc');
      const bannerBtnText = document.getElementById('btn-update-banner-text');

      if (upd && (upd.status === 'ready' || upd.status === 'available' || upd.status === 'downloading' || upd.pendingUpdate)) {
        const targetVer = upd.pendingUpdate ? ('v' + upd.pendingUpdate.version) : '';
        let btnLabel = 'Actualizar ' + targetVer;
        let bannerText = 'Hay una nueva versión disponible para instalar.';

        if (upd.status === 'ready') {
          btnLabel = 'Reiniciar para actualizar ' + targetVer;
          bannerText = 'La actualización ' + targetVer + ' está lista. Haz clic para reiniciar y aplicar.';
        } else if (upd.status === 'downloading') {
          const pct = upd.downloadProgress ? (upd.downloadProgress.percentage || 0) : 0;
          btnLabel = 'Descargando ' + targetVer + ' (' + pct + '%)...';
          bannerText = 'Descargando nueva versión en segundo plano (' + pct + '%)...';
        } else if (upd.status === 'applying') {
          btnLabel = 'Aplicando actualización...';
          bannerText = 'Instalando actualización y reiniciando el servicio...';
        }

        if (btnHeader) {
          btnHeader.style.display = 'inline-flex';
          if (btnHeaderText) btnHeaderText.textContent = btnLabel;
        }
        if (bannerOverview) {
          bannerOverview.style.display = 'flex';
          if (bannerTitle) bannerTitle.textContent = 'Actualización ' + targetVer + ' disponible';
          if (bannerDesc) bannerDesc.textContent = bannerText;
          if (bannerBtnText) bannerBtnText.textContent = btnLabel;
        }
      } else {
        if (btnHeader) btnHeader.style.display = 'none';
        if (bannerOverview) bannerOverview.style.display = 'none';
      }
    }

    // Inicializar inputs del formulario de forma defensiva para que el sondeo cada 3s no sobreescriba cambios del usuario
    function updateFormInputs(data, force) {
      if (!data) return;
      if (!window.__formInputsInitialized || force) {
        const fact = data.factusol || {};
        const fSettings = data.factusolSettings || {};

        const inputFactDb = document.getElementById('input-factusol-db');
        if (inputFactDb && (force || !inputFactDb.value || document.activeElement !== inputFactDb)) {
          const dbVal = fact.databasePath || fSettings.databasePath || '';
          if (dbVal || force) inputFactDb.value = dbVal;
        }

        const selTariff = document.getElementById('select-factusol-tariff');
        if (selTariff && fSettings.tariffCode && (force || document.activeElement !== selTariff)) {
          selTariff.value = fSettings.tariffCode;
        }

        const selSaleTariff = document.getElementById('select-factusol-sale-tariff');
        if (selSaleTariff && fSettings.saleTariffCode !== undefined && (force || document.activeElement !== selSaleTariff)) {
          selSaleTariff.value = fSettings.saleTariffCode || '';
        }

        const selWh = document.getElementById('select-factusol-warehouse');
        if (selWh && fSettings.warehouseCode && (force || document.activeElement !== selWh)) {
          selWh.value = fSettings.warehouseCode;
        }

        const inOrderSeries = document.getElementById('input-factusol-order-series');
        if (inOrderSeries && fSettings.orderSeries && (force || !inOrderSeries.value || document.activeElement !== inOrderSeries)) {
          inOrderSeries.value = fSettings.orderSeries;
        }

        const inInvSeries = document.getElementById('input-factusol-inv-series');
        if (inInvSeries && fSettings.invoiceSeries && (force || !inInvSeries.value || document.activeElement !== inInvSeries)) {
          inInvSeries.value = fSettings.invoiceSeries;
        }

        const chType = data.channelType || 'universal_bridge';
        if (typeof selectChannelType === 'function') {
          selectChannelType(chType);
        }

        const univ = data.universalBridgeSettings || {};
        const inUnivUrl = document.getElementById('input-universal-url');
        if (inUnivUrl && (force || !inUnivUrl.value || document.activeElement !== inUnivUrl)) {
          if (univ.storeUrl || force) inUnivUrl.value = univ.storeUrl || '';
        }

        const inUnivKey = document.getElementById('input-universal-key');
        if (inUnivKey && (force || !inUnivKey.value || document.activeElement !== inUnivKey)) {
          if (univ.secretKey || force) inUnivKey.value = univ.secretKey || '';
        }

        const wc = data.woocommerceSettings || {};
        const inWcUrl = document.getElementById('input-wc-url');
        if (inWcUrl && (force || !inWcUrl.value || document.activeElement !== inWcUrl)) {
          if (wc.storeUrl || force) inWcUrl.value = wc.storeUrl || '';
        }

        const inWcKey = document.getElementById('input-wc-key');
        if (inWcKey && (force || !inWcKey.value || document.activeElement !== inWcKey)) {
          if (wc.consumerKey || force) inWcKey.value = wc.consumerKey || '';
        }

        const inWcSec = document.getElementById('input-wc-secret');
        if (inWcSec && (force || !inWcSec.value || document.activeElement !== inWcSec)) {
          if (wc.consumerSecret || force) inWcSec.value = wc.consumerSecret || '';
        }

        // Reglas de Sync
        const rules = data.syncRules || {};
        const chkWatcher = document.getElementById('check-watcher-enabled');
        if (chkWatcher && rules.enableFileWatcher !== undefined && (force || document.activeElement !== chkWatcher)) {
          chkWatcher.checked = rules.enableFileWatcher;
        }

        const inDebounce = document.getElementById('input-debounce-sec');
        if (inDebounce && rules.debounceSeconds && (force || document.activeElement !== inDebounce)) {
          inDebounce.value = rules.debounceSeconds;
        }

        const selInterval = document.getElementById('select-periodic-min');
        if (selInterval && rules.periodicIntervalMinutes && (force || document.activeElement !== selInterval)) {
          selInterval.value = rules.periodicIntervalMinutes;
        }

        const chkStock = document.getElementById('check-sync-stock');
        if (chkStock && rules.syncStock !== undefined && (force || document.activeElement !== chkStock)) {
          chkStock.checked = rules.syncStock;
        }

        const chkPrices = document.getElementById('check-sync-prices');
        if (chkPrices && rules.syncPrices !== undefined && (force || document.activeElement !== chkPrices)) {
          chkPrices.checked = rules.syncPrices;
        }

        const chkDesc = document.getElementById('check-sync-desc');
        if (chkDesc && rules.syncDescriptions !== undefined && (force || document.activeElement !== chkDesc)) {
          chkDesc.checked = rules.syncDescriptions;
        }

        const inSafety = document.getElementById('input-safety-stock');
        if (inSafety && rules.safetyStockBuffer !== undefined && (force || document.activeElement !== inSafety)) {
          inSafety.value = rules.safetyStockBuffer;
        }

        const chkOnlyPos = document.getElementById('check-only-stock-pos');
        if (chkOnlyPos && rules.onlyStockAboveZero !== undefined && (force || document.activeElement !== chkOnlyPos)) {
          chkOnlyPos.checked = rules.onlyStockAboveZero;
        }

        const inLicKey = document.getElementById('input-lic-key');
        if (inLicKey && data.licenseKey && (force || !inLicKey.value || document.activeElement !== inLicKey)) {
          inLicKey.value = data.licenseKey;
        }

        window.__formInputsInitialized = true;
      }
    }

    let isUpdatingInProgress = false;

    async function triggerRestartUpdate() {
      if (isUpdatingInProgress) return;
      if (!confirm('¿Deseas aplicar la actualización y reiniciar Bentian Agent ahora?')) {
        return;
      }
      isUpdatingInProgress = true;
      const btnHeader = document.getElementById('btn-update-restart');
      const btnHeaderText = document.getElementById('btn-update-text');
      const bannerBtn = document.getElementById('btn-update-banner-action');
      const bannerBtnText = document.getElementById('btn-update-banner-text');

      if (btnHeader) btnHeader.disabled = true;
      if (bannerBtn) bannerBtn.disabled = true;
      if (btnHeaderText) btnHeaderText.textContent = 'Actualizando y reiniciando...';
      if (bannerBtnText) bannerBtnText.textContent = 'Actualizando y reiniciando...';

      showToast('Iniciando proceso de actualización y reinicio...', 'info');

      try {
        const res = await fetch('/api/local/apply-update', { method: 'POST' });
        const result = await res.json();
        if (!res.ok || (result && result.success === false)) {
          showToast((result && result.message) || 'No se pudo iniciar la actualización', 'error');
          isUpdatingInProgress = false;
          if (btnHeader) btnHeader.disabled = false;
          if (bannerBtn) bannerBtn.disabled = false;
          return;
        }

        showToast('Actualización en curso. El agente se reiniciará en breves momentos...', 'success');

        // Polling para reconexión y recarga automática
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const check = await fetch('/api/local/status');
            if (check.ok) {
              clearInterval(interval);
              showToast('¡Bentian Agent actualizado y reiniciado con éxito!', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            }
          } catch (e) {
            if (attempts > 60) {
              clearInterval(interval);
              showToast('El agente está tardando en responder. Por favor, recarga la página.', 'warning');
            }
          }
        }, 1500);

      } catch (err) {
        showToast('Error de conexión con el agente: ' + err.message, 'error');
        isUpdatingInProgress = false;
        if (btnHeader) btnHeader.disabled = false;
        if (bannerBtn) bannerBtn.disabled = false;
      }
    }

    async function manualCheckUpdate() {
      const btn = document.getElementById('btn-check-updates');
      if (btn) btn.disabled = true;
      showToast('Comprobando actualizaciones en el servidor central...', 'info');
      try {
        const res = await fetch('/api/local/check-update', { method: 'POST' });
        const data = await res.json();
        if (data && (data.available || (data.checkResult && data.checkResult.available))) {
          const ver = data.version || (data.checkResult && data.checkResult.version) || '';
          showToast('¡Nueva versión ' + (ver ? 'v' + ver : '') + ' detectada! Iniciando descarga...', 'success');
          await fetchStatus(true);
        } else {
          showToast('Bentian Agent ya está actualizado a la última versión disponible.', 'info');
        }
      } catch (err) {
        showToast('Error al comprobar actualizaciones: ' + err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    }
  `;
}
