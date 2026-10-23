export const syncScript = `
    async function triggerManualSync() {
      if (typeof currentStatus !== 'undefined' && currentStatus && currentStatus.license) {
        const licStatus = currentStatus.license.status;
        if (licStatus !== 'VALID' && licStatus !== 'GRACE_PERIOD') {
          if (typeof showSmartToast === 'function') {
            showSmartToast({
              title: 'Licencia Requerida',
              message: 'Activa tu clave de licencia antes de iniciar una sincronización.',
              actionLabel: 'Activar Licencia →',
              targetTab: 'license',
              targetInputId: 'input-lic-key',
              type: 'warn'
            });
          }
          if (typeof navigateToResolution === 'function') {
            navigateToResolution('license', 'input-lic-key');
          }
          return;
        }
      }
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
        const res = await fetch('/api/local/sync-now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
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
          const rawMsg = data.message || data.error || '';
          if (/ya hay un proceso de sincronización en ejecución|ya está ejecutando/i.test(rawMsg)) {
            showSmartToast({
              title: 'Sincronización en curso',
              message: 'Ya se está ejecutando una sincronización automática con Factusol en este momento.',
              type: 'info'
            });
            fetchStatus();
            return;
          }
          // Si el mensaje del backend indica ausencia de URL, redirigir al canal web
          const isMissingUrlError = /url.*no configurada|url.*requerida|falta.*url|dirección.*requerida|tienda.*no configurada/i.test(rawMsg);
          if (isMissingUrlError && typeof navigateToChannelUrlInput === 'function') {
            navigateToChannelUrlInput(rawMsg);
            return;
          }
          const errInfo = humanizeErrorMessage(rawMsg, 'sync');
          showSmartToast({
            title: errInfo.title || 'Aviso en sincronización',
            message: (errInfo.message || rawMsg) + timeSuffix,
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
          enableFileWatcher: true,
          debounceSeconds: 5,
          periodicIntervalMinutes: 15,
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
        if (chk) chk.checked = true;
        if (data && data.enabled === false) {
          await fetch('/api/local/autostart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true })
          }).catch(function() {});
        }
        window.__autoStartLoaded = true;
      } catch (e) {}
    }
    window.loadAutoStart = loadAutoStart;

    async function toggleAutoStart() {
      try {
        await fetch('/api/local/autostart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: true })
        });
        showToast('Inicio con Windows permanente activo', 'info');
      } catch (e) {}
    }
    window.toggleAutoStart = toggleAutoStart;

    function downloadDiagnostics() {
      window.open('/api/local/export-diagnostic', '_blank');
      showToast('Descargando archivo de diagnóstico...');
    }
    window.downloadDiagnostics = downloadDiagnostics;

    function closeTestOrderModal() {
      const modal = document.getElementById('modal-test-order-simulation');
      if (modal) modal.classList.remove('open');
    }
    window.closeTestOrderModal = closeTestOrderModal;

    async function runSimulationOrder(dryRun) {
      if (dryRun === undefined) dryRun = true;
      if (typeof currentStatus !== 'undefined' && currentStatus && currentStatus.license) {
        const licStatus = currentStatus.license.status;
        if (licStatus !== 'VALID' && licStatus !== 'GRACE_PERIOD') {
          if (typeof showSmartToast === 'function') {
            showSmartToast({
              title: 'Licencia Requerida',
              message: 'Debes activar una licencia válida antes de simular o insertar pedidos en el ERP.',
              actionLabel: 'Activar Licencia →',
              targetTab: 'license',
              targetInputId: 'input-lic-key',
              type: 'warn'
            });
          }
          if (typeof navigateToResolution === 'function') {
            navigateToResolution('license', 'input-lic-key');
          }
          return;
        }
      }
      const btn = document.getElementById('btn-simulate-order');
      const spinner = document.getElementById('btn-sim-spinner');
      const modal = document.getElementById('modal-test-order-simulation');
      const modalChecklist = document.getElementById('modal-sim-order-checklist');
      const modalDetails = document.getElementById('modal-sim-order-details-card');
      const modalTiming = document.getElementById('modal-sim-order-timing');
      const btnViewOrders = document.getElementById('btn-modal-sim-view-orders');
      const modalTitle = document.getElementById('modal-sim-order-title');
      const modalSubtitle = document.getElementById('modal-sim-order-subtitle');

      const inlineContainer = document.getElementById('sim-order-results-container');
      const inlineChecklist = document.getElementById('sim-order-checklist');

      if (btn) btn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';

      if (modalTitle) {
        modalTitle.textContent = dryRun ? '🧪 Simulación de Pedido de Factusol (Dry-Run)' : '⚡ Registro Real de Pedido en Factusol';
      }
      if (modalSubtitle) {
        modalSubtitle.textContent = 'Ejecutando circuito de verificación paso a paso...';
      }
      if (modalDetails) modalDetails.style.display = 'none';
      if (btnViewOrders) btnViewOrders.style.display = 'none';
      if (modalTiming) modalTiming.textContent = 'Conectando con Factusol OLEDB...';

      const initialSteps = [
        { id: 1, name: '1. Conexión con Factusol OLEDB', status: 'loading', details: 'Verificando archivo .accdb en modo Share Deny None...' },
        { id: 2, name: '2. Búsqueda de artículo de catálogo', status: 'pending', details: 'Consultando F_ART y stock en F_STO...' },
        { id: 3, name: '3. Cuadre de IVA y céntimos (21%)', status: 'pending', details: 'Validando plausibilidad fiscal y aritmética...' },
        { id: 4, name: '4. Inserción atómica en F_PCL', status: 'pending', details: dryRun ? 'Simulando correlativo y líneas en F_LPC...' : 'Escribiendo cabecera y líneas en Factusol...' },
        { id: 5, name: '5. Actualización de stock disponible DISSTO', status: 'pending', details: 'Calculando nuevo stock resultante...' },
      ];

      function renderChecklist(targetEl, stepsList) {
        if (!targetEl) return;
        const esc = window.escapeHtml || function(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
        targetEl.innerHTML = stepsList.map(s => {
          let iconHtml = '';
          let badgeClass = '';
          let statusText = '';
          if (s.status === 'ok') {
            iconHtml = '<span style="color:#10b981;font-weight:700;font-size:14px;">✓</span>';
            badgeClass = 'tag tag-green';
            statusText = 'OK';
          } else if (s.status === 'loading') {
            iconHtml = '<span class="spin" style="display:inline-block;font-size:12px;">⏳</span>';
            badgeClass = 'tag tag-blue';
            statusText = 'PROCESANDO';
          } else if (s.status === 'failed') {
            iconHtml = '<span style="color:#f87171;font-weight:700;font-size:14px;">✕</span>';
            badgeClass = 'tag tag-rose';
            statusText = 'FALLO';
          } else {
            iconHtml = '<span style="color:var(--text-subtle);font-size:12px;">•</span>';
            badgeClass = 'tag';
            statusText = 'PENDIENTE';
          }

          return '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;">' +
            '<div style="display:flex;align-items:flex-start;gap:10px;">' +
              '<div style="margin-top:2px;">' + iconHtml + '</div>' +
              '<div>' +
                '<div style="font-weight:600;font-size:12.5px;color:#fff;">' + esc(s.name) + '</div>' +
                '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + esc(s.details || '') + '</div>' +
              '</div>' +
            '</div>' +
            '<span class="' + badgeClass + '" style="font-size:9.5px;padding:1px 6px;">' + statusText + '</span>' +
          '</div>';
        }).join('');
      }

      renderChecklist(modalChecklist, initialSteps);
      if (inlineChecklist) renderChecklist(inlineChecklist, initialSteps);
      if (inlineContainer) inlineContainer.style.display = 'block';
      if (modal) modal.classList.add('open');

      try {
        const res = await fetch('/api/local/simulate-test-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun })
        });
        const data = await res.json();

        if (data.success && data.details && Array.isArray(data.details.steps)) {
          const finalSteps = data.details.steps.map(st => ({
            id: st.step,
            name: st.step + '. ' + st.name,
            status: st.status === 'ok' ? 'ok' : 'failed',
            details: st.details
          }));

          renderChecklist(modalChecklist, finalSteps);
          if (inlineChecklist) renderChecklist(inlineChecklist, finalSteps);

          if (modalSubtitle) {
            modalSubtitle.textContent = dryRun 
              ? '✓ Simulación completada con éxito. Todos los chequeos pasaron.'
              : '✓ Pedido oficial insertado con éxito en Factusol.';
          }

          if (modalTiming) {
            modalTiming.textContent = 'Duración: ' + (data.durationMs || 0) + ' ms' + (dryRun ? ' (Modo seguro sin escritura)' : ' (Escritura atómica OLEDB)');
          }

          if (modalDetails) {
            const esc = window.escapeHtml || function(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
            const art = data.details.article || {};
            const cust = data.details.customer || {};
            const safeOrderNum = esc(data.orderNumber || '');
            const safeSeries = esc(data.series ? data.series + '-' : '');
            const safeArtCode = esc(data.articleCode || '');
            const safeArtDesc = esc(data.articleDescription || '');
            const safeCustName = esc(cust.name || 'Cliente de Pruebas');
            const safeCustTax = esc(cust.taxId || 'Sin NIF');
            const safeCustProv = esc(cust.province || 'Alicante');

            modalDetails.innerHTML = 
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;">' +
                '<div>' +
                  '<div style="color:var(--text-subtle);font-size:10.5px;text-transform:uppercase;">Nº Pedido Factusol</div>' +
                  '<div style="font-weight:700;font-size:14px;color:#fff;margin-top:2px;">#' + safeSeries + safeOrderNum + (dryRun ? ' (Simulado)' : '') + '</div>' +
                '</div>' +
                '<div>' +
                  '<div style="color:var(--text-subtle);font-size:10.5px;text-transform:uppercase;">Total con 21% IVA</div>' +
                  '<div style="font-weight:700;font-size:14px;color:#10b981;margin-top:2px;">' + Number(data.totalAmount || 0).toFixed(2) + ' €</div>' +
                '</div>' +
                '<div style="grid-column:1 / -1;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">' +
                  '<div style="color:var(--text-subtle);font-size:10.5px;text-transform:uppercase;">Artículo Asignado</div>' +
                  '<div style="color:#e4e4e7;margin-top:2px;"><strong>' + safeArtCode + '</strong> — ' + safeArtDesc + '</div>' +
                  '<div style="color:var(--text-muted);font-size:11px;margin-top:2px;">Stock: ' + (art.stockBefore !== undefined ? art.stockBefore : '--') + ' → <strong>' + (art.stockAfter !== undefined ? art.stockAfter : '--') + ' uds</strong></div>' +
                '</div>' +
                '<div style="grid-column:1 / -1;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">' +
                  '<div style="color:var(--text-subtle);font-size:10.5px;text-transform:uppercase;">Cliente Factusol</div>' +
                  '<div style="color:#e4e4e7;margin-top:2px;">' + safeCustName + ' (' + safeCustTax + ') — ' + safeCustProv + '</div>' +
                '</div>' +
              '</div>';
            modalDetails.style.display = 'block';
          }

          if (!dryRun && btnViewOrders) {
            btnViewOrders.style.display = 'inline-flex';
          }

          showSmartToast({
            title: dryRun ? 'Simulación Exitosa' : 'Pedido de Prueba Creado',
            message: 'Pedido #' + data.orderNumber + ' verificado (' + data.articleCode + ' - ' + Number(data.totalAmount || 0).toFixed(2) + ' €)',
            actionLabel: 'Ver en Historial →',
            targetTab: 'history',
            type: 'success'
          });

          if (!dryRun) {
            if (typeof fetchStatus === 'function') fetchStatus();
            if (typeof loadSalesOrders === 'function') loadSalesOrders();
          }
        } else {
          const errMsg = data.error || (data.details && data.details.error) || 'Fallo desconocido en la simulación de pedido';
          const failedSteps = (data.details && Array.isArray(data.details.steps) && data.details.steps.length > 0)
            ? data.details.steps.map(st => ({
                id: st.step,
                name: st.step + '. ' + st.name,
                status: st.status === 'ok' ? 'ok' : 'failed',
                details: st.details
              }))
            : initialSteps.map((s, idx) => idx === 0 ? { ...s, status: 'failed', details: errMsg } : s);

          renderChecklist(modalChecklist, failedSteps);
          if (inlineChecklist) renderChecklist(inlineChecklist, failedSteps);

          if (modalSubtitle) {
            modalSubtitle.textContent = '❌ Incidencia durante la verificación de Factusol.';
          }

          showSmartToast({
            title: 'Error en Simulación',
            message: errMsg,
            actionLabel: 'Ver Registro →',
            targetTab: 'logs',
            type: 'error'
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (modalSubtitle) modalSubtitle.textContent = '❌ Error de comunicación con el agente.';
        showSmartToast({
          title: 'Error de Red / Agente',
          message: msg,
          type: 'error'
        });
      } finally {
        if (btn) btn.disabled = false;
        if (spinner) spinner.style.display = 'none';
      }
    }
    window.runSimulationOrder = runSimulationOrder;
`;

