/**
 * Bentian ERP Bridge — Dashboard Audit & Fleet Errors Module
 * Monitorización de errores de flota, auditoría del sistema y métricas financieras de Superadmin.
 */

const _audEsc = window.escapeHtml || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
window._allFleetErrors = [];
window._allAuditLogs = [];

async function loadAdminOverview() {
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/admin/licensing/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      const d = json.data || {};
      const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
      setEl('kpi-arr', (d.arr || 0) + ' €');
      setEl('kpi-mrr', (d.mrr || 0) + ' €');
      setEl('kpi-active-paid', d.activePaid || 0);
      setEl('kpi-trials', d.trials || 0);
      setEl('kpi-unpaid', d.unpaidOrCanceled || 0);
      setEl('kpi-seats-breakdown', `${d.baseSeats || 0} Licencias Base · ${d.additionalSeats || 0} Licencias 2ª Tienda`);
    }
  } catch {}
}

async function loadFleetErrors() {
  const tbody = document.getElementById('fleet-errors-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-300 font-mono text-xs">Actualizando registros de incidencias...</td></tr>`;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  try {
    const res = await fetch('/api/v1/admin/fleet/errors', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      window._allFleetErrors = json.data || [];
      filterAndRenderFleetErrors();
    }
  } catch {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400 font-mono text-xs">Error al conectar con la telemetría de errores.</td></tr>`;
    }
  }
}

function filterAndRenderFleetErrors() {
  const tbody = document.getElementById('fleet-errors-tbody');
  if (!tbody) return;
  const all = window._allFleetErrors || [];
  const q = (document.getElementById('fleet-errors-search')?.value || '').toLowerCase().trim();
  const sev = document.getElementById('fleet-errors-filter')?.value || 'ALL';

  const list = all.filter(err => {
    const isFatal = !!err.fatal;
    if (sev === 'FATAL' && !isFatal) return false;
    if (sev === 'WARNING' && isFatal) return false;
    if (q) {
      const hay = `${err.agent_name || ''} ${err.org_name || ''} ${err.component || ''} ${err.message || ''} ${err.error_code || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const countBadge = document.getElementById('fleet-errors-count');
  if (countBadge) {
    countBadge.innerText = `${list.length} incidencias`;
    countBadge.className = list.length === 0
      ? 'px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[11px] font-mono font-bold text-emerald-300'
      : 'px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-400/40 text-[11px] font-mono font-bold text-red-300';
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-emerald-300 font-mono text-xs"><div class="flex items-center justify-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>✓ Sin incidencias registradas en la flota. Todos los servidores operan con normalidad.</span></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(err => {
    const dateStr = err.created_at ? new Date(err.created_at).toLocaleString('es-ES') : 'Reciente';
    const isFatal = !!err.fatal;
    return `
      <tr class="hover:bg-white/[0.03] transition">
        <td class="p-3.5 font-mono font-semibold text-white">${_audEsc(err.agent_name || err.agent_id || 'Servidor')}</td>
        <td class="p-3.5 text-zinc-200">${_audEsc(err.org_name || err.organization_id || 'General')}</td>
        <td class="p-3.5 font-mono text-indigo-300">${_audEsc(err.component || 'OLEDB / Factusol')}</td>
        <td class="p-3.5">
          <div class="text-white max-w-xs truncate" title="${_audEsc(err.message || 'Error de sincronización')}">${_audEsc(err.message || 'Error de sincronización')}</div>
          <div class="text-[10px] text-zinc-300 font-mono">${_audEsc(err.error_code || 'ERR_UNKNOWN')}</div>
        </td>
        <td class="p-3.5 text-zinc-200 font-mono text-[11px] whitespace-nowrap">${dateStr}</td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${isFatal ? 'bg-red-500/20 text-red-300 border border-red-400/40' : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'}">${isFatal ? 'FATAL' : 'WARNING'}</span>
        </td>
      </tr>`;
  }).join('');
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
      window._allAuditLogs = json.data || [];
      filterAndRenderAuditLogs();
    }
  } catch {
    if (container) container.innerHTML = '<div class="text-red-400">Error al cargar logs de auditoría.</div>';
  }
}

function filterAndRenderAuditLogs() {
  const container = document.getElementById('audit-logs-container');
  if (!container) return;
  const all = window._allAuditLogs || [];
  const q = (document.getElementById('audit-search-input')?.value || '').toLowerCase().trim();
  const resFilter = document.getElementById('audit-filter-select')?.value || 'ALL';

  const list = all.filter(l => {
    const isErr = l.result && l.result !== 'SUCCESS';
    if (resFilter === 'SUCCESS' && isErr) return false;
    if (resFilter === 'ERROR' && !isErr) return false;
    if (q) {
      const hay = `${l.action || ''} ${l.details || ''} ${l.entity_type || ''} ${l.resourceType || ''} ${l.resourceId || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const badge = document.getElementById('audit-count-badge');
  if (badge) badge.innerText = `${list.length} eventos`;

  if (list.length === 0) {
    container.innerHTML = '<div class="text-zinc-300 italic">No hay registros de auditoría que coincidan con el filtro.</div>';
    return;
  }

  container.innerHTML = list.map(l => {
    const rawTime = l.timestamp || l.created_at;
    const time = rawTime ? new Date(rawTime).toLocaleTimeString('es-ES') : '--:--:--';
    const actionTag = _audEsc(l.action || 'EVENT');
    const desc = _audEsc(
      l.details ||
      l.entity_type ||
      (l.resourceType ? `${l.resourceType}${l.resourceId ? ` (#${l.resourceId.substring(0, 8)})` : ''}` : '') ||
      'Operación registrada'
    );
    const resultBadge = l.result && l.result !== 'SUCCESS' ? `<span class="text-red-300 font-mono font-bold text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded">[${_audEsc(l.result)}]</span> ` : '';
    return `<div class="flex items-center gap-3 text-zinc-100 py-1 border-b border-white/[0.06] last:border-0"><span class="text-zinc-300 shrink-0">${time}</span> ${resultBadge}<span class="text-indigo-300 font-bold shrink-0">[${actionTag}]</span> <span class="text-zinc-200">${desc}</span></div>`;
  }).join('');
}

function clearAuditStream() {
  const container = document.getElementById('audit-logs-container');
  if (container) container.innerHTML = '<div class="text-zinc-300 italic">Visor limpiado.</div>';
}

window.loadAdminOverview = loadAdminOverview;
window.loadFleetErrors = loadFleetErrors;
window.filterAndRenderFleetErrors = filterAndRenderFleetErrors;
window.loadAuditLogs = loadAuditLogs;
window.filterAndRenderAuditLogs = filterAndRenderAuditLogs;
window.clearAuditStream = clearAuditStream;
