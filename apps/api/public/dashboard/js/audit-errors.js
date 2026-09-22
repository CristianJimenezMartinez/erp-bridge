/**
 * Bentian ERP Bridge — Dashboard Audit & Fleet Errors Module
 * Monitorización de errores de flota, auditoría del sistema y métricas financieras de Superadmin.
 */

async function loadAdminOverview() {
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/admin/licensing/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      const d = json.data || {};
      const arrEl = document.getElementById('kpi-arr');
      const mrrEl = document.getElementById('kpi-mrr');
      const paidEl = document.getElementById('kpi-active-paid');
      const trialsEl = document.getElementById('kpi-trials');
      const unpaidEl = document.getElementById('kpi-unpaid');
      const seatsEl = document.getElementById('kpi-seats-breakdown');

      if (arrEl) arrEl.innerText = (d.arr || 0) + ' €';
      if (mrrEl) mrrEl.innerText = (d.mrr || 0) + ' €';
      if (paidEl) paidEl.innerText = d.activePaid || 0;
      if (trialsEl) trialsEl.innerText = d.trials || 0;
      if (unpaidEl) unpaidEl.innerText = d.unpaidOrCanceled || 0;
      if (seatsEl) {
        seatsEl.innerText = `${d.baseSeats || 0} Puestos Base (199€) · ${d.additionalSeats || 0} Puestos Adic. (99€)`;
      }
    }
  } catch (e) {
    console.warn('Error cargando métricas de Superadmin:', e);
  }
}

async function loadFleetErrors() {
  const tbody = document.getElementById('fleet-errors-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-500 font-mono text-xs">Actualizando registros de incidencias...</td></tr>`;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/admin/fleet/errors', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      const list = json.data || [];
      if (!tbody) return;

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="p-10 text-center text-emerald-400 font-mono text-xs">
              <div class="flex items-center justify-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>✓ Sin incidencias registradas en la flota. Todos los servidores operan con normalidad.</span>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = list.map(err => {
        const dateStr = err.created_at ? new Date(err.created_at).toLocaleString('es-ES') : 'Reciente';
        const isFatal = !!err.fatal;
        return `
          <tr class="hover:bg-white/[0.02] transition">
            <td class="p-3 font-mono font-semibold text-white">${escapeHtml(err.agent_name || err.agent_id || 'Servidor')}</td>
            <td class="p-3 text-zinc-300">${escapeHtml(err.org_name || err.organization_id || 'General')}</td>
            <td class="p-3 font-mono text-zinc-400">${escapeHtml(err.component || 'OLEDB / Factusol')}</td>
            <td class="p-3">
              <div class="text-zinc-200">${escapeHtml(err.message || 'Error de sincronización')}</div>
              <div class="text-[10px] text-zinc-500 font-mono">${escapeHtml(err.error_code || 'ERR_UNKNOWN')}</div>
            </td>
            <td class="p-3 text-zinc-400 font-mono text-[11px]">${dateStr}</td>
            <td class="p-3 text-right">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${isFatal ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                ${isFatal ? 'FATAL' : 'WARNING'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (e) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400 font-mono text-xs">Error al conectar con la telemetría de errores.</td></tr>`;
    }
  }
}

async function loadAuditLogs() {
  const container = document.getElementById('audit-logs-container');
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/audit-logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      const logs = json.data || [];
      if (!container) return;

      if (logs.length === 0) {
        container.innerHTML = '<div class="text-zinc-600 italic">No hay registros de auditoría recientes.</div>';
        return;
      }
      container.innerHTML = logs.map(l => {
        const time = l.created_at ? new Date(l.created_at).toLocaleTimeString('es-ES') : '--:--:--';
        return `<div class="flex gap-3 text-zinc-400"><span class="text-zinc-600">${time}</span> <span class="text-indigo-400 font-semibold">[${escapeHtml(l.action || 'EVENT')}]</span> ${escapeHtml(l.details || l.entity_type || 'Operación registrada')}</div>`;
      }).join('');
    }
  } catch (e) {
    if (container) {
      container.innerHTML = '<div class="text-red-400">Error al cargar logs de auditoría.</div>';
    }
  }
}

function clearAuditStream() {
  const container = document.getElementById('audit-logs-container');
  if (container) {
    container.innerHTML = '<div class="text-zinc-600 italic">Visor limpiado.</div>';
  }
}

// Exposición global
window.loadAdminOverview = loadAdminOverview;
window.loadFleetErrors = loadFleetErrors;
window.loadAuditLogs = loadAuditLogs;
window.clearAuditStream = clearAuditStream;
