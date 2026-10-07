/**
 * Bentian ERP Bridge — Dashboard Fleet Health Module
 * Monitorización de estado de agentes Factusol en tiempo real y telemetría de servidores.
 */

function _safeEscapeHtml(str) {
  if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
      const kpiEl = document.getElementById('health-kpi-total-seats');
      if (kpiEl) kpiEl.innerText = agents.length;

      if (!tbody) return;

      if (agents.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="p-8 text-center text-zinc-500 font-mono text-xs">
              No hay agentes registrados en la base de datos central.
            </td>
          </tr>
        `;
        return;
      }

      const latestVerString = json.summary?.latestVersion || (window.BentianVersion ? window.BentianVersion.getVersion() : null);
      const versionKpi = document.getElementById('health-kpi-version');
      if (versionKpi && latestVerString) {
        versionKpi.innerText = latestVerString.startsWith('v') ? latestVerString : ('v' + latestVerString);
      }

      tbody.innerHTML = agents.map(a => {
        const isOnline = a.status === 'ACTIVE' || a.isOnline === true;
        const lastHeartbeat = a.last_heartbeat || a.last_seen_at
          ? new Date(a.last_heartbeat || a.last_seen_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '—';

        const rawAgentVer = a.version || a.installedVersion || (window.BentianVersion ? window.BentianVersion.getVersion() : '—');
        const displayAgentVer = rawAgentVer.startsWith('v') ? rawAgentVer : ('v' + rawAgentVer);
        const rawTargetVer = a.latestVersion || latestVerString || (window.BentianVersion ? window.BentianVersion.getVersion() : '');
        const displayTargetVer = rawTargetVer ? (rawTargetVer.startsWith('v') ? rawTargetVer : ('v' + rawTargetVer)) : '';

        const isLatest = a.isUpToDate !== false;
        const versionBadge = isLatest
          ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>${_safeEscapeHtml(displayAgentVer)} <span class="text-[9px] text-emerald-500 uppercase">Al día</span></span>`
          : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>${_safeEscapeHtml(displayAgentVer)} <span class="text-[9px] text-amber-300 uppercase">${_safeEscapeHtml(displayTargetVer)} disp.</span></span>`;

        const shortHwid = a.hwid ? a.hwid.substring(0, 12) + '...' : '';

        return `
          <tr class="hover:bg-white/[0.02] transition">
            <td class="py-3.5 px-4 font-mono">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-600'}"></span>
                <span class="font-semibold text-white text-xs">${_safeEscapeHtml(a.name || 'Servidor Factusol')}</span>
              </div>
              <div class="text-[10px] text-zinc-500 font-mono mt-0.5">${_safeEscapeHtml(a.platform || 'win32')}${shortHwid ? ' · ' + _safeEscapeHtml(shortHwid) : ''}</div>
            </td>
            <td class="py-3.5 px-4">
              <div class="font-medium text-zinc-200 text-xs">${_safeEscapeHtml(a.organizationName || a.companyName || a.organization_id || 'Cliente')}</div>
              <div class="text-[10px] text-zinc-500 font-mono mt-0.5">${_safeEscapeHtml(a.taxId ? 'CIF: ' + a.taxId : (a.licenseAlias || a.licenseKey || ''))}</div>
            </td>
            <td class="py-3.5 px-4">${versionBadge}</td>
            <td class="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">${lastHeartbeat}</td>
            <td class="py-3.5 px-4 text-right">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}">
                <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}"></span>
                ${isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (e) {
    console.warn('Error cargando salud de agentes:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400 font-mono text-xs">Error al conectar con la telemetría de agentes.</td></tr>`;
    }
  }
}

// Exposición global
window.loadFleetHealthData = loadFleetHealthData;
