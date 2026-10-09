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
        const esc = window.escapeHtml || function(s) { return s; };
        const statusClass = r.status === 'success' ? 'tag-green' : (r.status === 'warning' ? 'tag-amber' : 'tag-rose');
        const safeTs = esc(r.timestamp);
        const safeType = esc((r.type || 'manual').toUpperCase());
        const safeMode = esc((r.mode || 'full').toUpperCase());
        const safeStatus = esc((r.status || 'OK').toUpperCase());
        const safeUpdated = Number(r.itemsUpdated) || 0;
        const safeOrders = Number(r.ordersImported) || 0;
        const safeDuration = Number(r.durationSeconds) || 0;
        const safeMsg = esc(r.message || '');
        return '<tr>' +
          '<td style="font-family: monospace;">' + safeTs + '</td>' +
          '<td><span class="tag tag-blue">' + safeType + '</span></td>' +
          '<td><span class="tag tag-amber">' + safeMode + '</span></td>' +
          '<td><span class="tag ' + statusClass + '">' + safeStatus + '</span></td>' +
          '<td style="text-align: right; font-weight: 600;">' + safeUpdated + '</td>' +
          '<td style="text-align: right; font-weight: 600;">' + safeOrders + '</td>' +
          '<td style="text-align: right; font-family: monospace;">' + safeDuration + 's</td>' +
          '<td style="color: var(--text-muted);">' + safeMsg + '</td>' +
        '</tr>';
      }).join('');
      if (tbody.innerHTML !== newHtml) tbody.innerHTML = newHtml;
    }

    function downloadDiagnostics() {
      window.open('/api/local/export-diagnostic', '_blank');
      showToast('Descargando archivo de diagnóstico...');
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
