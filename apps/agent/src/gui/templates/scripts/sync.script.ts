export const syncScript = `
    async function triggerManualSync() {
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
          loadSyncHistory();
        } else {
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

    async function loadSyncHistory() {
      try {
        const res = await fetch('/api/local/history');
        if (!res.ok) return;
        const records = await res.json();
        renderHistoryTable(records);
      } catch (e) {}
    }

    function renderHistoryTable(records) {
      const tbody = document.getElementById('history-table-body');
      if (!tbody) return;
      if (!records || records.length === 0) {
        const emptyHtml = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Sin ejecuciones registradas todavía.</td></tr>';
        if (tbody.innerHTML !== emptyHtml) tbody.innerHTML = emptyHtml;
        return;
      }
      const newHtml = records.map(function(r) {
        const statusClass = r.status === 'success' ? 'tag-green' : (r.status === 'warning' ? 'tag-amber' : 'tag-rose');
        return '<tr>' +
          '<td style="font-family: monospace;">' + r.timestamp + '</td>' +
          '<td><span class="tag tag-blue">' + (r.type || 'manual').toUpperCase() + '</span></td>' +
          '<td><span class="tag tag-amber">' + (r.mode || 'full').toUpperCase() + '</span></td>' +
          '<td><span class="tag ' + statusClass + '">' + (r.status || 'OK').toUpperCase() + '</span></td>' +
          '<td style="text-align: right; font-weight: 600;">' + (r.itemsUpdated || 0) + '</td>' +
          '<td style="text-align: right; font-weight: 600;">' + (r.ordersImported || 0) + '</td>' +
          '<td style="text-align: right; font-family: monospace;">' + r.durationSeconds + 's</td>' +
          '<td style="color: var(--text-muted);">' + r.message + '</td>' +
        '</tr>';
      }).join('');
      if (tbody.innerHTML !== newHtml) tbody.innerHTML = newHtml;
    }

    function downloadDiagnostics() {
      window.open('/api/local/export-diagnostic', '_blank');
      showToast('Descargando archivo de diagnóstico...');
    }

    async function triggerCatalogUpload() {
      const btn = document.getElementById('btn-upload-catalog');
      const feedback = document.getElementById('catalog-upload-feedback');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⏳</span> Subiendo catálogo...';
      }
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = 'rgba(59, 130, 246, 0.1)';
        feedback.style.border = '1px solid rgba(59, 130, 246, 0.3)';
        feedback.style.color = '#93c5fd';
        feedback.innerHTML = '⏳ Conectando con Factusol y subiendo artículos nuevos a WooCommerce... Por favor, no cierre esta ventana.';
      }
      showToast('Iniciando subida de catálogo a la tienda...');
      try {
        const res = await fetch('/api/local/upload-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onlyMissing: true }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          if (feedback) {
            feedback.style.background = 'rgba(16, 185, 129, 0.1)';
            feedback.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            feedback.style.color = '#6ee7b7';
            feedback.innerHTML = '✓ ' + data.message;
          }
          fetchStatus();
          loadSyncHistory();
        } else {
          const errInfo = humanizeErrorMessage(data.message, 'channel');
          showSmartToast({
            title: 'Aviso al subir catálogo',
            message: errInfo.message,
            actionLabel: errInfo.actionLabel || 'Corregir en Canal Web →',
            targetTab: errInfo.targetTab || 'channel',
            targetInputId: errInfo.targetInputId,
            type: 'warn'
          });
          if (feedback) {
            feedback.style.background = 'rgba(239, 68, 68, 0.1)';
            feedback.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            feedback.style.color = '#fca5a5';
            feedback.innerHTML = '❌ ' + (errInfo.cause ? ('<strong>' + errInfo.cause + '</strong><br>' + errInfo.suggestion) : data.message);
          }
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        showSmartToast({
          title: 'Error de comunicación',
          message: errInfo.message,
          actionLabel: errInfo.actionLabel || 'Corregir en Canal Web →',
          targetTab: errInfo.targetTab || 'channel',
          type: 'error'
        });
        if (feedback) {
          feedback.style.background = 'rgba(239, 68, 68, 0.1)';
          feedback.style.border = '1px solid rgba(239, 68, 68, 0.3)';
          feedback.style.color = '#fca5a5';
          feedback.innerHTML = '❌ ' + errInfo.message;
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> <span>Subir Catálogo a la Web</span>';
        }
      }
    }

    function toggleOrderAlertsSection(enabled) {
      const panel = document.getElementById('order-alerts-panel');
      if (panel) {
        panel.style.display = enabled ? 'block' : 'none';
      }
    }

    async function saveNotificationSettings() {
      const email = (document.getElementById('input-notif-email')?.value || '').trim();
      const enabled = document.getElementById('check-order-alerts-enabled')?.checked || false;

      if (enabled && !email) {
        showToast('Indica al menos un correo para recibir las alertas', 'warn');
        return;
      }

      const payload = {
        notifications: {
          orderAlertsEnabled: enabled,
          alertEmail: email,
          smtpHost: (document.getElementById('input-notif-smtp-host')?.value || '').trim(),
          smtpPort: parseInt(document.getElementById('input-notif-smtp-port')?.value, 10) || 465,
          smtpUser: (document.getElementById('input-notif-smtp-user')?.value || '').trim(),
          smtpPass: document.getElementById('input-notif-smtp-pass')?.value || '',
          smtpFrom: (document.getElementById('input-notif-smtp-from')?.value || '').trim(),
        }
      };

      await submitConfigUpdates(payload, 'Ajustes de notificaciones de pedidos guardados.');
    }

    async function testOrderEmail() {
      const btn = document.getElementById('btn-test-email');
      const email = (document.getElementById('input-notif-email')?.value || '').trim();
      if (!email) {
        showToast('Escribe primero un correo de destino para la prueba', 'warn');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⏳</span> Enviando prueba...';
      }
      showToast('Enviando correo de prueba a ' + email + '...');

      try {
        const payload = {
          orderAlertsEnabled: true,
          alertEmail: email,
          smtpHost: (document.getElementById('input-notif-smtp-host')?.value || '').trim(),
          smtpPort: parseInt(document.getElementById('input-notif-smtp-port')?.value, 10) || 465,
          smtpUser: (document.getElementById('input-notif-smtp-user')?.value || '').trim(),
          smtpPass: document.getElementById('input-notif-smtp-pass')?.value || '',
          smtpFrom: (document.getElementById('input-notif-smtp-from')?.value || '').trim(),
        };

        const res = await fetch('/api/local/test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
        } else {
          showToast('Aviso: ' + (data.message || 'No se pudo enviar el correo'), 'warn');
        }
      } catch (err) {
        showToast('Error al conectar para enviar la prueba de correo', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> <span>Probar Envío de Email</span>';
        }
      }
    }
`;
