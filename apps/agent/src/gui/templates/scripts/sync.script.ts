export const syncScript = `
    async function triggerManualSync() {
      const btnH = document.getElementById('btn-sync-header');
      const iconH = document.getElementById('sync-icon-header');
      if (btnH) btnH.disabled = true;
      if (iconH) iconH.classList.add('spin');
      showToast('Iniciando sincronización...');
      try {
        const res = await fetch('/api/local/sync-now', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchStatus();
          loadSyncHistory();
        } else {
          showToast('Aviso: ' + data.message, 'warn');
        }
      } catch (err) {
        showToast('Error en sincronización manual', 'error');
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Sin ejecuciones registradas todavía.</td></tr>';
        return;
      }
      tbody.innerHTML = records.map(function(r) {
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
    }

    function downloadDiagnostics() {
      window.open('/api/local/export-diagnostic', '_blank');
      showToast('Descargando archivo de diagnóstico...');
    }
`;
