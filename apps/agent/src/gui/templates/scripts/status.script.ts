export function renderStatusScript(agentVersion: string = '0.2.0'): string {
  return `
    // Status Polling & Connection Health Resilience
    let _lastStatusPayload = '';
    let _initialFetchCompleted = false;
    let _consecutiveFailures = 0;
    let _isReconnecting = false;
    let _reconnectTimer = null;

    function showConnectionBanner() {
      const banner = document.getElementById('connection-lost-banner');
      if (banner) banner.classList.add('visible');
      const badge = document.getElementById('header-engine-status');
      const dot = document.getElementById('header-engine-dot');
      const txt = document.getElementById('header-engine-text');
      if (badge && dot && txt) {
        badge.style.background = 'rgba(245,158,11,0.12)';
        badge.style.borderColor = 'rgba(245,158,11,0.35)';
        badge.style.color = '#f59e0b';
        dot.style.background = '#f59e0b';
        dot.style.boxShadow = '0 0 6px #f59e0b';
        txt.textContent = 'Reiniciando motor...';
      }
    }

    function hideConnectionBanner() {
      const banner = document.getElementById('connection-lost-banner');
      if (banner) banner.classList.remove('visible');
      const badge = document.getElementById('header-engine-status');
      const dot = document.getElementById('header-engine-dot');
      const txt = document.getElementById('header-engine-text');
      if (badge && dot && txt) {
        badge.style.background = 'rgba(16,185,129,0.1)';
        badge.style.borderColor = 'rgba(16,185,129,0.25)';
        badge.style.color = '#10b981';
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 6px #10b981';
        txt.textContent = 'Motor Autónomo Activo';
      }
    }

    async function fetchStatus(forceFormSync) {
      if (document.hidden && !forceFormSync && _initialFetchCompleted && !_isReconnecting) return;
      try {
        const res = await fetch('/api/local/status');
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        const text = await res.text();
        _initialFetchCompleted = true;

        if (_isReconnecting) {
          _isReconnecting = false;
          _consecutiveFailures = 0;
          hideConnectionBanner();
          if (typeof showToast === 'function') {
            showToast('✓ Enlace con el motor local restablecido.', 'success');
          }
        }
        _consecutiveFailures = 0;

        if (!forceFormSync && text === _lastStatusPayload) {
          return;
        }
        _lastStatusPayload = text;
        currentStatus = JSON.parse(text);
        renderStatus(currentStatus);
        updateFormInputs(currentStatus, forceFormSync);
        if (typeof loadAutoStart === 'function') {
          loadAutoStart(forceFormSync);
        }
      } catch (err) {
        _consecutiveFailures++;
        if (_consecutiveFailures === 1) {
          console.warn('Servidor local (reintentando reconexión automática):', err); // quality-allow-console (browser template script)
        }
        if (_consecutiveFailures >= 2) {
          _isReconnecting = true;
          showConnectionBanner();
          const countEl = document.getElementById('banner-reconnect-count');
          if (countEl) countEl.textContent = String(_consecutiveFailures);

          // Durante la reconexión, reintentar con sondeo rápido
          if (_reconnectTimer) clearTimeout(_reconnectTimer);
          _reconnectTimer = setTimeout(function() {
            fetchStatus(false);
          }, 1500);
        }
      }
    }

    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        fetchStatus(false);
      }
    });

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
        const bannerExpired = document.getElementById('lic-expired-banner');
        if (bannerExpired) bannerExpired.style.display = 'none';
      } else {
        const isExpired = lic.status === 'EXPIRED';
        licBadge.className = 'tag tag-rose';
        licBadge.textContent = isExpired ? 'Beta Finalizada' : 'Sin Licencia';
        fullLicStatusBadge.className = 'tag tag-rose';
        fullLicStatusBadge.textContent = isExpired ? 'Beta Finalizada' : 'No Activada';
        const bannerExpired = document.getElementById('lic-expired-banner');
        if (bannerExpired) bannerExpired.style.display = isExpired ? 'block' : 'none';
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

      // Pre-Flight Health EDR Semáforos
      if (data.preflight) {
        renderPreflight(data.preflight);
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
          if (dbVal) {
            inputFactDb.value = dbVal;
          }
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
        if (inOrderSeries && (force || !inOrderSeries.value || document.activeElement !== inOrderSeries)) {
          inOrderSeries.value = fSettings.orderSeries || 'W';
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

        // Notificaciones por Email
        const notif = data.notifications || {};
        const chkAlerts = document.getElementById('check-order-alerts-enabled');
        if (chkAlerts && notif.orderAlertsEnabled !== undefined && (force || document.activeElement !== chkAlerts)) {
          chkAlerts.checked = notif.orderAlertsEnabled;
          if (typeof toggleOrderAlertsSection === 'function') {
            toggleOrderAlertsSection(notif.orderAlertsEnabled);
          }
        }

        const inNotifEmail = document.getElementById('input-notif-email');
        if (inNotifEmail && (force || !inNotifEmail.value || document.activeElement !== inNotifEmail)) {
          if (notif.alertEmail || force) inNotifEmail.value = notif.alertEmail || '';
        }

        const inSmtpHost = document.getElementById('input-notif-smtp-host');
        if (inSmtpHost && (force || !inSmtpHost.value || document.activeElement !== inSmtpHost)) {
          if (notif.smtpHost || force) inSmtpHost.value = notif.smtpHost || '';
        }

        const inSmtpPort = document.getElementById('input-notif-smtp-port');
        if (inSmtpPort && (force || !inSmtpPort.value || document.activeElement !== inSmtpPort)) {
          if (notif.smtpPort || force) inSmtpPort.value = notif.smtpPort || 465;
        }

        const inSmtpUser = document.getElementById('input-notif-smtp-user');
        if (inSmtpUser && (force || !inSmtpUser.value || document.activeElement !== inSmtpUser)) {
          if (notif.smtpUser || force) inSmtpUser.value = notif.smtpUser || '';
        }

        const inSmtpPass = document.getElementById('input-notif-smtp-pass');
        if (inSmtpPass && (force || !inSmtpPass.value || document.activeElement !== inSmtpPass)) {
          if (notif.smtpPass || force) inSmtpPass.value = notif.smtpPass || '';
        }

        const inSmtpFrom = document.getElementById('input-notif-smtp-from');
        if (inSmtpFrom && (force || !inSmtpFrom.value || document.activeElement !== inSmtpFrom)) {
          if (notif.smtpFrom || force) inSmtpFrom.value = notif.smtpFrom || '';
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
        _isReconnecting = true;
        showConnectionBanner();

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

    function renderPreflight(pf) {
      if (!pf || !pf.checks) return;

      function updateItem(id, check) {
        const badge = document.getElementById('pf-' + id + '-badge');
        const desc = document.getElementById('pf-' + id + '-desc');
        const dot = document.getElementById('pf-' + id + '-dot');
        if (!badge || !desc || !check) return;

        desc.textContent = check.message || '';
        if (check.status === 'OK') {
          badge.className = 'tag tag-green';
          badge.textContent = 'Correcto';
          if (dot) dot.style.background = '#10b981';
        } else if (check.status === 'WARN') {
          badge.className = 'tag tag-amber';
          badge.textContent = 'Atención';
          if (dot) dot.style.background = '#f59e0b';
        } else {
          badge.className = 'tag tag-rose';
          badge.textContent = 'Fallo';
          if (dot) dot.style.background = '#ef4444';
        }
      }

      updateItem('cscript', pf.checks.cscript);
      updateItem('oledb', pf.checks.oledbProvider);
      updateItem('clock', pf.checks.clockDrift);
      updateItem('net', pf.checks.networkStorage);

      const alertBox = document.getElementById('pf-alert-box');
      const alertMsg = document.getElementById('pf-alert-message');
      if (alertBox && alertMsg) {
        const issues = Object.values(pf.checks).filter(function(c) {
          return c && (c.status === 'FAIL' || c.status === 'WARN') && c.recommendation;
        });
        if (issues.length > 0) {
          alertBox.style.display = 'block';
          alertMsg.innerHTML = issues.map(function(i) {
            return '<strong>' + i.name + ':</strong> ' + i.recommendation;
          }).join('<br style="margin-bottom:6px;"/>');
        } else {
          alertBox.style.display = 'none';
        }
      }
    }

    async function refreshPreflight() {
      const btn = document.getElementById('btn-refresh-preflight');
      if (btn) {
        btn.disabled = true;
        const textSpan = btn.querySelector('span');
        if (textSpan) textSpan.textContent = 'Analizando...';
      }
      try {
        const res = await fetch('/api/local/preflight?force=true');
        if (res.ok) {
          const pf = await res.json();
          renderPreflight(pf);
          showToast('✓ Diagnóstico Pre-Flight actualizado', 'success');
        }
      } catch (err) {
        showToast('Error al ejecutar diagnóstico preflight: ' + err.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          const textSpan = btn.querySelector('span');
          if (textSpan) textSpan.textContent = 'Reanalizar';
        }
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
