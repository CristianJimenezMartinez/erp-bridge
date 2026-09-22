/**
 * Bentian ERP Bridge — Dashboard Fleet Health Module
 * Monitorización de estado de agentes Factusol en tiempo real y telemetría de servidores.
 */

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

      tbody.innerHTML = agents.map(a => {
        const isOnline = a.status === 'ACTIVE';
        const lastHeartbeat = a.last_heartbeat ? new Date(a.last_heartbeat).toLocaleTimeString('es-ES') : '—';
        return `
          <tr class="hover:bg-white/[0.02] transition">
            <td class="py-3.5 px-4 font-mono font-semibold text-white">${escapeHtml(a.name || 'Servidor')}</td>
            <td class="py-3.5 px-4 text-zinc-300">${escapeHtml(a.organization_id || 'org_default')}</td>
            <td class="py-3.5 px-4 font-mono text-indigo-300">${escapeHtml(a.version || 'v0.2.9')}</td>
            <td class="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">${lastHeartbeat}</td>
            <td class="py-3.5 px-4 text-right">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}">
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
