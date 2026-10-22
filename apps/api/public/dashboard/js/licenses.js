/**
 * Bentian ERP Bridge — Dashboard Licenses Module
 * Gestión del listado de licencias, telemetría de parque activo y búsqueda filtrada.
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

function _safeShowToast(msg, type) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

window.allLicenses = [];

async function loadLicenses() {
  const tbody = document.getElementById('licenses-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-500 font-mono text-xs">Actualizando parque de licencias...</td></tr>`;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';

  try {
    const res = await fetch('/api/v1/licenses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-organization-id': orgId
      }
    });

    if (res.ok) {
      const json = await res.json();
      window.allLicenses = json.data || [];
      renderLicenses(window.allLicenses);
    } else {
      window.allLicenses = [];
      renderLicenses(window.allLicenses);
    }
  } catch (e) {
    window.allLicenses = [];
    renderLicenses(window.allLicenses);
  }
}

function renderLicenses(list) {
  const tbody = document.getElementById('licenses-tbody');
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-10 text-center text-zinc-500 text-xs">
          No hay licencias registradas en esta vista. Pulsa <strong>"+ Generar Clave"</strong> para dar de alta una nueva conexión.
        </td>
      </tr>
    `;
    return;
  }

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  tbody.innerHTML = list.map(lic => {
    const act = lic.activations && lic.activations.length > 0 ? lic.activations[0] : null;
    const hasMachine = !!act;
    let isOnline = false;
    let lastSeenText = 'Pendiente de activación';

    if (act && act.lastValidatedAt) {
      const diffMs = now - new Date(act.lastValidatedAt).getTime();
      isOnline = diffMs < twentyFourHours;
      const mins = Math.max(1, Math.round(diffMs / 60000));
      lastSeenText = mins < 60 ? `Hace ${mins} min` : `Hace ${Math.round(mins / 60)} h`;
    }

    const hostname = act?.machineInfo?.hostname || 'Sin asignar';
    const shortHwid = act?.hwid ? `${act.hwid.substring(0, 16)}...` : '—';
    const fullHwid = act?.hwid || '';
    const seatBadge = '<span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Licencia Base</span>';

    return `
      <tr class="hover:bg-white/[0.02] transition-colors">
        <td class="p-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-zinc-100 text-xs">${_safeEscapeHtml(lic.alias || 'Servidor Factusol')}</span>
            <button data-action="edit-alias" data-license-id="${_safeEscapeHtml(lic.id)}" data-alias="${_safeEscapeHtml(lic.alias || '')}" title="Editar Alias" class="text-zinc-500 hover:text-zinc-300 p-0.5">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
          </div>
          <span class="text-[10px] text-zinc-500 font-mono">ID: ${_safeEscapeHtml(lic.id.substring(0, 8))}</span>
        </td>
        <td class="p-3 font-mono">
          <div class="flex items-center gap-2">
            <span class="text-indigo-400 font-semibold text-xs tracking-wider">${_safeEscapeHtml(lic.key)}</span>
            <button data-action="copy-key" data-key="${_safeEscapeHtml(lic.key)}" title="Copiar Clave" class="px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] flex items-center gap-1 transition">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
              <span>Copiar</span>
            </button>
          </div>
        </td>
        <td class="p-3 whitespace-nowrap">${seatBadge}</td>
        <td class="p-3 whitespace-nowrap">
          ${hasMachine ? (
            isOnline ? `
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse"></span>
                En Línea (${lastSeenText})
              </span>
            ` : `
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                <span class="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                Desconectado (${lastSeenText})
              </span>
            `
          ) : `
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Esperando Activación
            </span>
          `}
        </td>
        <td class="p-3">
          <div class="text-zinc-200 text-xs font-medium">${_safeEscapeHtml(hostname)}</div>
          <div class="text-[10px] text-zinc-500 font-mono mt-0.5" title="${_safeEscapeHtml(fullHwid)}">HWID: ${_safeEscapeHtml(shortHwid)}</div>
        </td>
        <td class="p-3 text-right whitespace-nowrap"><button data-action="preview-client-license" data-license-id="${_safeEscapeHtml(lic.id)}" class="px-2 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-medium transition inline-flex items-center gap-1 mr-1.5 cursor-pointer" title="Ver cómo ve su portal este cliente">👁️ Portal</button>
          ${hasMachine ? `
            <button data-action="unbind-license" data-license-id="${_safeEscapeHtml(lic.id)}" data-key="${_safeEscapeHtml(lic.key)}" data-hostname="${_safeEscapeHtml(hostname)}" data-hwid="${_safeEscapeHtml(act.hwid || '')}" class="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-medium transition inline-flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
              <span>Mudar PC</span>
            </button>
          ` : `<span class="text-[10px] text-zinc-500">Lista para usar</span>`}
        </td>
      </tr>
    `;
  }).join('');

  if (!tbody._eventsAttached) {
    tbody.addEventListener('click', (e) => {
      const previewBtn = e.target.closest('[data-action="preview-client-license"]');
      if (previewBtn) {
        const id = previewBtn.getAttribute('data-license-id') || '';
        if (typeof window.switchDashboardTab === 'function') window.switchDashboardTab('client-portal');
        if (typeof window.loadClientPortal === 'function') window.loadClientPortal(id);
        return;
      }
      const editBtn = e.target.closest('[data-action="edit-alias"]');
      if (editBtn) {
        const id = editBtn.getAttribute('data-license-id') || '';
        const alias = editBtn.getAttribute('data-alias') || '';
        if (typeof window.openEditAliasModal === 'function') window.openEditAliasModal(id, alias);
        return;
      }
      const unbindBtn = e.target.closest('[data-action="unbind-license"]');
      if (unbindBtn) {
        const id = unbindBtn.getAttribute('data-license-id') || '';
        const key = unbindBtn.getAttribute('data-key') || '';
        const hostname = unbindBtn.getAttribute('data-hostname') || '';
        const hwid = unbindBtn.getAttribute('data-hwid') || '';
        if (typeof window.openUnbindModal === 'function') window.openUnbindModal(id, key, hostname, hwid);
        return;
      }
      const copyBtn = e.target.closest('[data-action="copy-key"]');
      if (copyBtn) {
        const key = copyBtn.getAttribute('data-key') || '';
        if (typeof window.copyKey === 'function') {
          window.copyKey(key);
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(key).then(() => {
            _safeShowToast('✓ Clave copiada al portapapeles', 'success');
          });
        }
        return;
      }
    });
    tbody._eventsAttached = true;
  }
}

async function loadFleetOverview() {
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';

  try {
    const res = await fetch('/api/v1/licenses/fleet-overview', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-organization-id': orgId
      }
    });
    if (res.ok) {
      const json = await res.json();
      const d = json.data || {};
      const planBadge = document.getElementById('kpi-plan-badge');
      if (planBadge) planBadge.innerText = (d.plan || 'BASE').toUpperCase();
      const actSeats = document.getElementById('kpi-active-seats');
      if (actSeats) actSeats.innerText = d.activeSeats || 0;
      const totSeats = document.getElementById('kpi-total-seats');
      if (totSeats) totSeats.innerText = d.totalAllowedSeats || 1;
      const onSeats = document.getElementById('kpi-online-seats');
      if (onSeats) onSeats.innerText = d.onlineSeats || 0;

      const total = d.totalAllowedSeats || 1;
      const active = d.activeSeats || 0;
      const pct = Math.min(100, Math.round((active / total) * 100));
      const progBar = document.getElementById('kpi-progress-bar');
      if (progBar) progBar.style.width = pct + '%';
    }
  } catch (e) {}
}

function handleSearch(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderLicenses(window.allLicenses);
    return;
  }
  const filtered = window.allLicenses.filter(l => {
    const alias = (l.alias || '').toLowerCase();
    const key = (l.key || '').toLowerCase();
    const hostname = (l.activations?.[0]?.machineInfo?.hostname || '').toLowerCase();
    const hwid = (l.activations?.[0]?.hwid || '').toLowerCase();
    return alias.includes(q) || key.includes(q) || hostname.includes(q) || hwid.includes(q);
  });
  renderLicenses(filtered);
}

window.loadLicenses = loadLicenses;
window.renderLicenses = renderLicenses;
window.loadFleetOverview = loadFleetOverview;
window.handleSearch = handleSearch;
