/**
 * Bentian ERP Bridge — Dashboard Fleet Health Module
 * Monitorización de estado de agentes Factusol en tiempo real, buscador y telemetría de servidores.
 */

const _fleetEsc = window.escapeHtml || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
window._allFleetAgents = [];
window._fleetLatestVersion = '';

async function loadFleetHealthData() {
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  const tbody = document.getElementById('fleet-health-table-body');

  try {
    const res = await fetch('/api/v1/agents', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const json = await res.json();
      const agents = json.data || [];
      window._allFleetAgents = agents;
      window._fleetLatestVersion = json.summary?.latestVersion || (window.BentianVersion ? window.BentianVersion.getVersion() : '');

      const kpiEl = document.getElementById('health-kpi-total-seats');
      if (kpiEl) kpiEl.innerText = agents.length;

      const onlineCount = agents.filter(a => a.status === 'ACTIVE' || a.isOnline === true).length;
      const sumBadge = document.getElementById('fleet-summary-badge');
      if (sumBadge) {
        sumBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ${onlineCount} Online · ${Math.max(0, agents.length - onlineCount)} Offline`;
      }

      const versionKpi = document.getElementById('health-kpi-version');
      if (versionKpi && window._fleetLatestVersion) {
        versionKpi.innerText = window._fleetLatestVersion.startsWith('v') ? window._fleetLatestVersion : ('v' + window._fleetLatestVersion);
      }

      filterAndRenderFleet();
    }
  } catch {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400 font-mono text-xs">Error al conectar con la telemetría de agentes.</td></tr>`;
    }
  }
}

function filterAndRenderFleet() {
  const tbody = document.getElementById('fleet-health-table-body');
  if (!tbody) return;
  const all = window._allFleetAgents || [];
  const q = (document.getElementById('fleet-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('fleet-status-filter')?.value || 'ALL';

  const list = all.filter(a => {
    const isOnline = a.status === 'ACTIVE' || a.isOnline === true;
    const isLatest = a.isUpToDate !== false;
    if (statusFilter === 'ONLINE' && !isOnline) return false;
    if (statusFilter === 'OFFLINE' && isOnline) return false;
    if (statusFilter === 'OUTDATED' && isLatest) return false;
    if (q) {
      const name = String(a.name || '').toLowerCase();
      const org = String(a.organizationName || a.companyName || a.organization_id || '').toLowerCase();
      const hwid = String(a.hwid || '').toLowerCase();
      if (!name.includes(q) && !org.includes(q) && !hwid.includes(q)) return false;
    }
    return true;
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-zinc-300 font-mono text-xs">No hay agentes registrados que coincidan con el filtro actual.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => {
    const isOnline = a.status === 'ACTIVE' || a.isOnline === true;
    const lastHeartbeat = a.last_heartbeat || a.last_seen_at
      ? new Date(a.last_heartbeat || a.last_seen_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—';

    const rawAgentVer = a.version || a.installedVersion || (window.BentianVersion ? window.BentianVersion.getVersion() : '—');
    const displayAgentVer = rawAgentVer.startsWith('v') ? rawAgentVer : ('v' + rawAgentVer);
    const rawTargetVer = a.latestVersion || window._fleetLatestVersion || '';
    const displayTargetVer = rawTargetVer ? (rawTargetVer.startsWith('v') ? rawTargetVer : ('v' + rawTargetVer)) : '';

    const isLatest = a.isUpToDate !== false;
    const versionBadge = isLatest
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>${_fleetEsc(displayAgentVer)} <span class="text-[9px] text-emerald-200 uppercase">Al día</span></span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>${_fleetEsc(displayAgentVer)} <span class="text-[9px] text-amber-200 uppercase">${_fleetEsc(displayTargetVer)} disp.</span></span>`;

    const shortHwid = a.hwid ? a.hwid.substring(0, 12) + '...' : '';

    return `
      <tr class="hover:bg-white/[0.03] transition">
        <td class="py-3.5 px-4 font-mono">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-500'}"></span>
            <span class="font-semibold text-white text-xs">${_fleetEsc(a.name || 'Servidor Factusol')}</span>
          </div>
          <div class="text-[10px] text-zinc-300 font-mono mt-0.5">${_fleetEsc(a.platform || 'win32')}${shortHwid ? ' · ' + _fleetEsc(shortHwid) : ''}</div>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-white text-xs">${_fleetEsc(a.organizationName || a.companyName || a.organization_id || 'Cliente')}</div>
          <div class="text-[10px] text-indigo-300 font-mono mt-0.5">${_fleetEsc(a.taxId ? 'CIF: ' + a.taxId : (a.licenseAlias || a.licenseKey || ''))}</div>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">${versionBadge}</td>
        <td class="py-3.5 px-4 text-zinc-200 font-mono text-[11px] whitespace-nowrap">${lastHeartbeat}</td>
        <td class="py-3.5 px-4 text-right whitespace-nowrap">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-zinc-500/20 text-zinc-300 border border-zinc-400/40'}">
            <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}"></span>
            ${isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

window.loadFleetHealthData = loadFleetHealthData;
window.filterAndRenderFleet = filterAndRenderFleet;
