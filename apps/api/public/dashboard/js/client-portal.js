/**
 * Bentian ERP Bridge — Dashboard Client Portal Module
 * Gestión de la vista del cliente final: estado de conexión Factusol, HWID y mudanza de máquina.
 */

let _currentClientPortalLicense = null;

async function loadClientPortal(selectedKeyOrId) {
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';

  try {
    const res = await fetch('/api/v1/licenses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-organization-id': orgId
      }
    });

    if (!res.ok) {
      console.warn('[ClientPortal] No se pudieron cargar las licencias del cliente.');
      return;
    }

    const json = await res.json();
    const licenses = json.data || [];

    if (licenses.length === 0) {
      const keyEl = document.getElementById('client-license-key');
      if (keyEl) keyEl.innerText = 'Sin licencias activas';
      return;
    }

    // Configurar banner multi-licencia si hay más de 1
    const multiBanner = document.getElementById('client-multi-license-banner');
    const multiSelect = document.getElementById('client-license-select');
    const multiCount = document.getElementById('client-multi-count-badge');

    if (licenses.length > 1) {
      if (multiBanner) multiBanner.classList.remove('hidden');
      if (multiCount) multiCount.innerText = `${licenses.length} Licencias`;
      if (multiSelect) {
        multiSelect.innerHTML = licenses.map(l => {
          const alias = l.alias || l.key;
          const host = l.activations?.[0]?.machineInfo?.hostname || 'Sin asignar';
          const isSelected = (selectedKeyOrId && (l.id === selectedKeyOrId || l.key === selectedKeyOrId)) ? 'selected' : '';
          return `<option value="${l.id}" ${isSelected}>${alias} (${host})</option>`;
        }).join('');
      }
    } else {
      if (multiBanner) multiBanner.classList.add('hidden');
    }

    // Seleccionar licencia activa
    let target = licenses[0];
    if (selectedKeyOrId) {
      const found = licenses.find(l => l.id === selectedKeyOrId || l.key === selectedKeyOrId);
      if (found) target = found;
    }
    _currentClientPortalLicense = target;

    // Pintar datos de la clave
    const keyEl = document.getElementById('client-license-key');
    if (keyEl) keyEl.innerText = target.key;

    const seatTypeEl = document.getElementById('client-seat-type');
    if (seatTypeEl) seatTypeEl.innerText = 'Licencia Base (1 ERP ⇄ 1 Tienda)';

    const statusBadge = document.getElementById('client-status-badge');
    const subStatus = document.getElementById('client-subscription-status');
    const isActive = target.status === 'ACTIVE';

    if (statusBadge) {
      statusBadge.innerText = isActive ? 'ACTIVA' : target.status;
      statusBadge.className = isActive
        ? 'px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }

    if (subStatus) {
      subStatus.innerHTML = isActive
        ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Suscripción al día'
        : '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Estado: ' + target.status;
    }

    // Banner de upgrade al Plan Fundador si la licencia es BETA o está EXPIRADA
    const upgradeBanner = document.getElementById('client-upgrade-banner');
    if (upgradeBanner) {
      const isBetaOrExpired = (target.plan === 'BETA' || target.status === 'EXPIRED' || target.billingStatus === 'TRIALING');
      if (isBetaOrExpired) {
        upgradeBanner.classList.remove('hidden');
      } else {
        upgradeBanner.classList.add('hidden');
      }
    }

    // Pintar datos del equipo vinculado
    const act = target.activations && target.activations.length > 0 ? target.activations[0] : null;
    const hostEl = document.getElementById('client-device-hostname');
    const badgeEl = document.getElementById('client-device-status-badge');
    const hwidEl = document.getElementById('client-device-hwid');
    const unbindBtn = document.getElementById('btn-client-unbind');

    if (act) {
      const hostname = act.machineInfo?.hostname || 'Servidor Local';
      if (hostEl) hostEl.innerText = hostname;
      if (badgeEl) {
        badgeEl.innerText = 'Conectado';
        badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      }
      if (hwidEl) {
        hwidEl.innerText = `HWID: ${act.hwid || '—'}`;
        hwidEl.title = act.hwid || '';
      }
      if (unbindBtn) unbindBtn.classList.remove('hidden');
    } else {
      if (hostEl) hostEl.innerText = 'Sin asignar';
      if (badgeEl) {
        badgeEl.innerText = 'Pendiente';
        badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
      }
      if (hwidEl) hwidEl.innerText = 'HWID: —';
      if (unbindBtn) unbindBtn.classList.add('hidden');
    }
  } catch (err) {
    console.error('[ClientPortal] Error al cargar portal:', err);
  }
}

function copyClientKey() {
  const keyEl = document.getElementById('client-license-key');
  const key = keyEl ? keyEl.innerText.trim() : '';
  if (key && key !== 'Cargando...' && key !== 'Sin licencias activas') {
    if (typeof window.copyToClipboard === 'function') {
      window.copyToClipboard(key, '✓ Clave de licencia copiada al portapapeles');
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(key).then(() => {
        if (typeof window.showToast === 'function') {
          window.showToast('✓ Clave copiada al portapapeles', 'success');
        }
      });
    }
  }
}

function handleClientUnbindClick() {
  if (!_currentClientPortalLicense) return;
  const lic = _currentClientPortalLicense;
  const act = lic.activations && lic.activations.length > 0 ? lic.activations[0] : null;
  const hostname = act?.machineInfo?.hostname || 'Servidor';
  const hwid = act?.hwid || '';

  if (typeof window.openUnbindModal === 'function') {
    window.openUnbindModal(lic.id, lic.key, hostname, hwid);
  }
}

async function handleClientUpgradeFounder() {
  const email = localStorage.getItem('bentian_cloud_email') || '';
  const btn = document.getElementById('btn-client-upgrade-founder');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Conectando con Stripe...';
  }
  try {
    const res = await fetch('/api/v1/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'founder_annual',
        email: email || undefined,
        isEarlyBird: true
      })
    });
    const data = await res.json();
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data?.error?.message || 'No se pudo generar la pasarela de pago.');
    }
  } catch (err) {
    if (typeof window.showToast === 'function') {
      window.showToast(err.message, 'error');
    } else {
      alert(err.message);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText || '<span>Activar Plan Fundador (139 €/año) ↗</span>';
    }
  }
}

// Exposición global
window.loadClientPortal = loadClientPortal;
window.copyClientKey = copyClientKey;
window.handleClientUnbindClick = handleClientUnbindClick;
window.handleClientUpgradeFounder = handleClientUpgradeFounder;
