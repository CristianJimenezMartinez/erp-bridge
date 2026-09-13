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
          showToast('Aviso: ' + data.message, 'warn');
          if (feedback) {
            feedback.style.background = 'rgba(239, 68, 68, 0.1)';
            feedback.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            feedback.style.color = '#fca5a5';
            feedback.innerHTML = '❌ ' + data.message;
          }
        }
      } catch (err) {
        showToast('Error al procesar la subida de catálogo', 'error');
        if (feedback) {
          feedback.style.background = 'rgba(239, 68, 68, 0.1)';
          feedback.style.border = '1px solid rgba(239, 68, 68, 0.3)';
          feedback.style.color = '#fca5a5';
          feedback.innerHTML = '❌ Error de comunicación con el agente local';
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> <span>Subir Catálogo a la Web</span>';
        }
      }
    }
`;
