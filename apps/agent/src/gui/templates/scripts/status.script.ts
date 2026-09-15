export function renderStatusScript(agentVersion: string = '0.2.0'): string {
  return `
    // Status Polling
    async function fetchStatus() {
      try {
        const res = await fetch('/api/local/status');
        if (!res.ok) return;
        currentStatus = await res.json();
        renderStatus(currentStatus);
      } catch (err) {
        console.warn('Servidor local:', err);
      }
    }

    function renderStatus(data) {
      if (!data) return;

      document.getElementById('brand-version').textContent = 'v' + (data.agentVersion || '${agentVersion}');
      document.getElementById('sidebar-hostname').textContent = (data.system && data.system.hostname) ? data.system.hostname : 'Local';
      document.getElementById('sidebar-hwid').textContent = data.hwid ? (data.hwid.substring(0, 12) + '...') : '---';

      // Factusol
      const fact = data.factusol || {};
      const fSettings = data.factusolSettings || {};
      const cardFBadge = document.getElementById('card-f-badge');
      const cardFMetric = document.getElementById('card-f-metric');
      const cardFPath = document.getElementById('card-f-path');
      const cardFWatcher = document.getElementById('card-f-watcher');

      if (fact.configured && fact.connected) {
        cardFBadge.className = 'tag tag-green';
        cardFBadge.textContent = 'Conectado';
        cardFMetric.textContent = (fact.articleCount !== undefined ? fact.articleCount.toLocaleString('es-ES') : '7.978') + ' arts.';
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

      const inputFactDb = document.getElementById('input-factusol-db');
      if (!inputFactDb.value && (fact.databasePath || fSettings.databasePath)) {
        inputFactDb.value = fact.databasePath || fSettings.databasePath || '';
      }
      if (fSettings.tariffCode) document.getElementById('select-factusol-tariff').value = fSettings.tariffCode;
      if (fSettings.orderSeries) document.getElementById('input-factusol-order-series').value = fSettings.orderSeries;
      if (fSettings.invoiceSeries) document.getElementById('input-factusol-inv-series').value = fSettings.invoiceSeries;

      // Canal Web: solo inicializar la selección en la primera carga para respetar la elección del usuario
      const chType = data.channelType || 'universal_bridge';
      if (!window.__channelTypeInitialized) {
        selectChannelType(chType);
        window.__channelTypeInitialized = true;
      }

      const univ = data.universalBridgeSettings || {};
      if (univ.storeUrl && !document.getElementById('input-universal-url').value) {
        document.getElementById('input-universal-url').value = univ.storeUrl;
      }
      if (univ.secretKey && !document.getElementById('input-universal-key').value) {
        document.getElementById('input-universal-key').value = univ.secretKey;
      }

      const wc = data.woocommerceSettings || {};
      if (wc.storeUrl && !document.getElementById('input-wc-url').value) {
        document.getElementById('input-wc-url').value = wc.storeUrl;
      }
      if (wc.consumerKey && !document.getElementById('input-wc-key').value) {
        document.getElementById('input-wc-key').value = wc.consumerKey;
      }
      if (wc.consumerSecret && !document.getElementById('input-wc-secret').value) {
        document.getElementById('input-wc-secret').value = wc.consumerSecret;
      }

      const cardWcMetric = document.getElementById('card-wc-metric');
      const cardWcUrl = document.getElementById('card-wc-url');
      if (chType === 'universal_bridge') {
        cardWcMetric.textContent = 'Conector Universal';
        cardWcUrl.textContent = univ.storeUrl || 'Sin configurar';
      } else {
        cardWcMetric.textContent = 'WooCommerce';
        cardWcUrl.textContent = wc.storeUrl || 'Sin configurar';
      }

      // Reglas de Sync
      const rules = data.syncRules || {};
      if (rules.enableFileWatcher !== undefined) document.getElementById('check-watcher-enabled').checked = rules.enableFileWatcher;
      if (rules.debounceSeconds) document.getElementById('input-debounce-sec').value = rules.debounceSeconds;
      if (rules.periodicIntervalMinutes) document.getElementById('select-periodic-min').value = rules.periodicIntervalMinutes;
      if (rules.syncStock !== undefined) document.getElementById('check-sync-stock').checked = rules.syncStock;
      if (rules.syncPrices !== undefined) document.getElementById('check-sync-prices').checked = rules.syncPrices;
      if (rules.syncDescriptions !== undefined) document.getElementById('check-sync-desc').checked = rules.syncDescriptions;
      if (rules.safetyStockBuffer !== undefined) document.getElementById('input-safety-stock').value = rules.safetyStockBuffer;
      if (rules.onlyStockAboveZero !== undefined) document.getElementById('check-only-stock-pos').checked = rules.onlyStockAboveZero;

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
        if (!document.getElementById('input-lic-key').value) {
          document.getElementById('input-lic-key').value = data.licenseKey;
        }
      }
      document.getElementById('lic-hwid-val').value = data.hwid || '';

      // Logs
      allLogs = data.recentEvents || [];
      renderLogs(allLogs);

      // Historial
      if (data.syncHistory) {
        renderHistoryTable(data.syncHistory);
      }
    }
`;
}
