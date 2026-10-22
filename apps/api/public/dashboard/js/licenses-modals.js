/**
 * Bentian ERP Bridge — Dashboard Licenses Modals & Actions Module
 * Modales de emisión de nueva clave, edición de alias y liberación/mudanza de PC (unbind HWID).
 */

function _licModalToast(msg, type) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

function _licCloseModal(id) {
  if (typeof window.closeModal === 'function') {
    window.closeModal(id);
  } else {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
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
      _licCloseModal('modal-new-key');
      _licModalToast(`✓ Clave ${data.data.key} generada para ${alias}`, 'success');
      if (typeof window.loadLicenses === 'function') window.loadLicenses();
      if (typeof window.loadFleetOverview === 'function') window.loadFleetOverview();
    } else {
      _licModalToast(data.error?.message || 'Error al generar clave', 'error');
    }
  } catch (err) {
    _licModalToast('Error de conexión', 'error');
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
      _licCloseModal('modal-edit-alias');
      _licModalToast('✓ Alias actualizado con éxito', 'success');
      if (typeof window.loadLicenses === 'function') window.loadLicenses();
    } else {
      const data = await res.json().catch(() => ({}));
      _licModalToast(data.error?.message || 'Error al actualizar alias', 'error');
    }
  } catch (err) {
    _licModalToast('Error de conexión', 'error');
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
      _licCloseModal('modal-unbind');
      _licModalToast('✓ Licencia liberada. Ya puedes activarla en el nuevo PC.', 'success');
      if (role === 'TENANT_CLIENT') {
        if (typeof window.loadClientPortal === 'function') window.loadClientPortal();
      } else {
        if (typeof window.loadLicenses === 'function') window.loadLicenses();
        if (typeof window.loadFleetOverview === 'function') window.loadFleetOverview();
      }
    } else {
      const data = await res.json().catch(() => ({}));
      _licModalToast(data.error?.message || 'Error al desvincular equipo', 'error');
    }
  } catch (err) {
    _licModalToast('Error de conexión', 'error');
  } finally {
    if (btn) {
      btn.innerText = 'Confirmar y Liberar Licencia';
      btn.disabled = false;
    }
  }
}

window.openNewKeyModal = openNewKeyModal;
window.openEditAliasModal = openEditAliasModal;
window.openUnbindModal = openUnbindModal;
window.handleCreateLicenseSubmit = handleCreateLicenseSubmit;
window.handleSaveAlias = handleSaveAlias;
window.confirmUnbind = confirmUnbind;
