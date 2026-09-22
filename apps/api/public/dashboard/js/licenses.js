/**
 * Bentian ERP Bridge — Dashboard Licenses Module
 * Gestión de licencias, puestos adicionales, vinculación/desvinculación HWID y portal de cliente.
 */

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
    const seatBadge = lic.seatType === 'ADDITIONAL_SEAT' 
      ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">Puesto Adic. (99€)</span>'
      : '<span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Base (199€)</span>';

    return `
      <tr class="hover:bg-white/[0.02] transition-colors">
        <td class="p-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-zinc-100 text-xs">${escapeHtml(lic.alias || 'Servidor Factusol')}</span>
            <button onclick="openEditAliasModal('${lic.id}', '${escapeHtml(lic.alias || '')}')" title="Editar Alias" class="text-zinc-500 hover:text-zinc-300 p-0.5">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
          </div>
          <span class="text-[10px] text-zinc-500 font-mono">ID: ${lic.id.substring(0, 8)}</span>
        </td>
        <td class="p-3 font-mono">
          <div class="flex items-center gap-2">
            <span class="text-indigo-400 font-semibold text-xs tracking-wider">${lic.key}</span>
            <button onclick="copyKey('${lic.key}')" title="Copiar Clave" class="px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] flex items-center gap-1 transition">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
              <span>Copiar</span>
            </button>
          </div>
        </td>
        <td class="p-3">${seatBadge}</td>
        <td class="p-3">
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
          <div class="text-zinc-200 text-xs font-medium">${escapeHtml(hostname)}</div>
          <div class="text-[10px] text-zinc-500 font-mono mt-0.5" title="${fullHwid}">HWID: ${shortHwid}</div>
        </td>
        <td class="p-3 text-right">
          ${hasMachine ? `
            <button 
              onclick="openUnbindModal('${lic.id}', '${escapeHtml(lic.key)}', '${escapeHtml(hostname)}', '${act.hwid}')" 
              class="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-medium transition inline-flex items-center gap-1"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
              <span>Mudar PC</span>
            </button>
          ` : `
            <span class="text-[10px] text-zinc-500">Lista para usar</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
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
  } catch (e) {
    console.warn('Error cargando KPIs:', e);
  }
}

async function loadClientPortal() {
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/client/my-license', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      window.currentClientData = json.data;
      const lic = window.currentClientData;
      const keyEl = document.getElementById('client-license-key');
      if (keyEl) keyEl.innerText = lic.key || '—';
      const seatTypeEl = document.getElementById('client-seat-type');
      if (seatTypeEl) {
        seatTypeEl.innerText = lic.seatType === 'ADDITIONAL_SEAT' ? 'Puesto Adicional (99 €/año)' : 'Licencia Base (1 ERP ⇄ 1 Tienda Web)';
      }

      const act = lic.activations && lic.activations.length > 0 ? lic.activations[0] : null;
      const hostnameEl = document.getElementById('client-device-hostname');
      const badgeEl = document.getElementById('client-device-status-badge');
      const hwidEl = document.getElementById('client-device-hwid');
      const unbindBtn = document.getElementById('btn-client-unbind');

      if (act) {
        if (hostnameEl) hostnameEl.innerText = act.machineInfo?.hostname || 'PC Conectado';
        if (hwidEl) hwidEl.innerText = 'HWID: ' + (act.hwid ? act.hwid.substring(0, 20) + '...' : '—');
        if (badgeEl) {
          badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          badgeEl.innerText = 'En Línea';
        }
        if (unbindBtn) unbindBtn.classList.remove('hidden');
      } else {
        if (hostnameEl) hostnameEl.innerText = 'Esperando vinculación...';
        if (hwidEl) hwidEl.innerText = 'HWID: Pendiente de activar en tu ordenador';
        if (badgeEl) {
          badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20';
          badgeEl.innerText = 'Sin activar';
        }
        if (unbindBtn) unbindBtn.classList.add('hidden');
      }
    }
  } catch (e) {
    console.warn('Error cargando portal de cliente:', e);
  }
}

function copyClientKey() {
  const keyEl = document.getElementById('client-license-key');
  const key = keyEl ? keyEl.innerText : '';
  if (key && key !== 'Cargando...') {
    navigator.clipboard.writeText(key);
    showToast('Clave copiada al portapapeles', 'success');
  }
}

function handleClientUnbindClick() {
  if (!window.currentClientData) return;
  const act = window.currentClientData.activations && window.currentClientData.activations[0];
  if (!act) return;
  openUnbindModal(window.currentClientData.id, window.currentClientData.key, act.machineInfo?.hostname || 'PC Actual', act.hwid);
}

function openNewKeyModal() {
  const aliasInput = document.getElementById('new-key-alias');
  if (aliasInput) aliasInput.value = '';
  const modal = document.getElementById('modal-new-key');
  if (modal) modal.classList.remove('hidden');
}

function openEditAliasModal(id, currentAlias) {
  const idEl = document.getElementById('edit-alias-id');
  if (idEl) idEl.value = id;
  const inputEl = document.getElementById('edit-alias-input');
  if (inputEl) inputEl.value = currentAlias;
  const modal = document.getElementById('modal-edit-alias');
  if (modal) modal.classList.remove('hidden');
}

function openUnbindModal(licenseId, key, hostname, hwid) {
  const idEl = document.getElementById('unbind-license-id');
  if (idEl) idEl.value = licenseId;
  const keyEl = document.getElementById('unbind-key-display');
  if (keyEl) keyEl.innerText = key;
  const hostEl = document.getElementById('unbind-machine-name');
  if (hostEl) hostEl.innerText = hostname || 'PC Asignado';
  const hwidEl = document.getElementById('unbind-hwid');
  if (hwidEl) hwidEl.value = hwid;
  const modal = document.getElementById('modal-unbind');
  if (modal) modal.classList.remove('hidden');
}

async function handleCreateLicenseSubmit(e) {
  e.preventDefault();
  const aliasEl = document.getElementById('new-key-alias');
  const seatTypeEl = document.getElementById('new-key-seat-type');
  const alias = aliasEl ? aliasEl.value.trim() : '';
  const seatType = seatTypeEl ? seatTypeEl.value : 'BASE_LICENSE';
  const btn = document.getElementById('btn-submit-key');
  if (btn) {
    btn.innerText = 'Generando...';
    btn.disabled = true;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';

  try {
    const res = await fetch('/api/v1/licenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-organization-id': orgId
      },
      body: JSON.stringify({ alias, plan: 'starter', maxActivations: 1, seatType })
    });
    const data = await res.json();
    if (res.ok && data.data?.key) {
      closeModal('modal-new-key');
      showToast(`✓ Clave ${data.data.key} generada para ${alias}`, 'success');
      loadLicenses();
      loadFleetOverview();
    } else {
      showToast(data.error?.message || 'Error al generar clave', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  } finally {
    if (btn) {
      btn.innerText = 'Generar Clave';
      btn.disabled = false;
    }
  }
}

async function handleSaveAlias() {
  const idEl = document.getElementById('edit-alias-id');
  const inputEl = document.getElementById('edit-alias-input');
  const id = idEl ? idEl.value : '';
  const newAlias = inputEl ? inputEl.value.trim() : '';
  if (!newAlias) return;

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch(`/api/v1/licenses/${id}/alias`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ alias: newAlias })
    });
    if (res.ok) {
      closeModal('modal-edit-alias');
      showToast('✓ Alias actualizado con éxito', 'success');
      loadLicenses();
    } else {
      showToast('Error al actualizar alias', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

async function confirmUnbind() {
  const idEl = document.getElementById('unbind-license-id');
  const hwidEl = document.getElementById('unbind-hwid');
  const id = idEl ? idEl.value : '';
  const hwid = hwidEl ? hwidEl.value : '';
  const btn = document.getElementById('btn-confirm-unbind');
  if (btn) {
    btn.innerText = 'Liberando licencia...';
    btn.disabled = true;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  const role = window.currentUserRole || localStorage.getItem('bentian_cloud_role') || 'TENANT_CLIENT';

  try {
    const res = await fetch(`/api/v1/licenses/${id}/unbind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ hwid })
    });
    if (res.ok) {
      closeModal('modal-unbind');
      showToast('✓ Licencia liberada. Ya puedes activarla en el nuevo PC.', 'success');
      if (role === 'TENANT_CLIENT') {
        loadClientPortal();
      } else {
        loadLicenses();
        loadFleetOverview();
      }
    } else {
      showToast('Error al desvincular equipo', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  } finally {
    if (btn) {
      btn.innerText = 'Confirmar y Liberar Licencia';
      btn.disabled = false;
    }
  }
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

// Exposición global
window.loadLicenses = loadLicenses;
window.renderLicenses = renderLicenses;
window.loadFleetOverview = loadFleetOverview;
window.loadClientPortal = loadClientPortal;
window.copyClientKey = copyClientKey;
window.handleClientUnbindClick = handleClientUnbindClick;
window.openNewKeyModal = openNewKeyModal;
window.openEditAliasModal = openEditAliasModal;
window.openUnbindModal = openUnbindModal;
window.handleCreateLicenseSubmit = handleCreateLicenseSubmit;
window.handleSaveAlias = handleSaveAlias;
window.confirmUnbind = confirmUnbind;
window.handleSearch = handleSearch;
