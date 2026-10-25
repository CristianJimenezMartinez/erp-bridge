/**
 * Bentian ERP Bridge — Partner Portfolio Quick Actions, Modals & CSV Export
 * Acciones en 1 clic por fila de empresa, paginación y exportación contable CSV.
 */

function _partnerToast(msg, type) {
  if (typeof window.showToast === 'function') window.showToast(msg, type);
}

function _partnerCloseModal(id) {
  if (typeof window.closeModal === 'function') window.closeModal(id);
  else {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
}

function togglePartnerHideTests() {
  window._partnerHideTests = !window._partnerHideTests;
  if (typeof window.filterAndRenderPartnerClients === 'function') {
    window.filterAndRenderPartnerClients(1);
  }
}

function toggleOrgsHideTests() {
  window._orgsHideTests = !window._orgsHideTests;
  if (typeof window.filterAndRenderOrgs === 'function') {
    window.filterAndRenderOrgs();
  }
}

function changePartnerClientsPage(delta) {
  const next = (window._partnerClientsPage || 1) + delta;
  if (typeof window.filterAndRenderPartnerClients === 'function') {
    window.filterAndRenderPartnerClients(next);
  }
}

function inspectPartnerClientOrg(orgId) {
  if (typeof window.switchDashboardTab === 'function') {
    window.switchDashboardTab('client-portal', true);
    if (typeof window.loadClientPortal === 'function') {
      window.loadClientPortal(orgId);
    }
  }
}

function exportPartnerClientsCsv() {
  const rows = window._partnerClientsFiltered || window._partnerClientsCache || [];
  if (rows.length === 0) {
    return _partnerToast('No hay empresas en la vista actual para exportar', 'warning');
  }
  const header = ['Empresa / Razon Social', 'CIF / NIF', 'Licencias Activas', 'Total Licencias', 'Fecha Alta', 'Estado', 'Comision Anual (30% EUR)'];
  const csvLines = [
    header.join(';'),
    ...rows.map(c => {
      const name = String(c.legal_name || c.name || 'Cliente').replace(/;/g, ',');
      const tax = String(c.tax_id || '—').replace(/;/g, ',');
      const active = Number(c.active_licenses || 0);
      const total = Number(c.total_licenses || 0);
      const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '—';
      const status = active > 0 ? 'ACTIVA' : 'SIN LICENCIA';
      const comm = (active * 59.70).toFixed(2).replace('.', ',');
      return [name, tax, active, total, dateStr, status, comm].join(';');
    })
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cartera-clientes-bentian-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  _partnerToast(`✓ Exportadas ${rows.length} empresas a CSV`, 'success');
}

function copyPartnerAffiliateLink() {
  const affInput = document.getElementById('partner-affiliate-link');
  if (affInput && affInput.value) {
    navigator.clipboard.writeText(affInput.value).then(() => {
      _partnerToast('✓ Enlace de distribuidor copiado al portapapeles', 'success');
    }).catch(() => {});
  }
}

function openPartnerBuyModal(prefillName, prefillTaxId) {
  const nameEl = document.getElementById('partner-buy-client-name');
  const taxEl = document.getElementById('partner-buy-tax-id');
  const emailEl = document.getElementById('partner-buy-email');
  const aliasEl = document.getElementById('partner-buy-alias');
  if (nameEl) nameEl.value = prefillName || '';
  if (taxEl) taxEl.value = prefillTaxId || '';
  if (emailEl) emailEl.value = '';
  if (aliasEl) aliasEl.value = prefillName ? `Servidor ${prefillName}` : '';
  const modal = document.getElementById('modal-partner-buy');
  if (modal) modal.classList.remove('hidden');
}

async function handlePartnerBuySubmit(e) {
  e.preventDefault();
  const clientName = (document.getElementById('partner-buy-client-name')?.value || '').trim();
  const clientTaxId = (document.getElementById('partner-buy-tax-id')?.value || '').trim();
  const clientEmail = (document.getElementById('partner-buy-email')?.value || '').trim();
  const alias = (document.getElementById('partner-buy-alias')?.value || '').trim();
  const btn = document.getElementById('btn-submit-partner-buy');

  if (!clientName || !clientTaxId) return _partnerToast('La Razón Social y el CIF son obligatorios', 'warning');
  if (btn) { btn.innerText = 'Conectando con Stripe...'; btn.disabled = true; }
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/billing/partner-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ clientName, clientTaxId, clientEmail, alias })
    });
    const data = await res.json();
    if (res.ok && data.url) window.location.href = data.url;
    else _partnerToast(data.error?.message || 'Error al generar la pasarela de pago mayorista', 'error');
  } catch (err) {
    _partnerToast('Error de conexión con la pasarela de pago', 'error');
  } finally {
    if (btn) { btn.innerText = 'Pagar en Stripe (139,30 €) →'; btn.disabled = false; }
  }
}

function openPartnerIssueModal(prefillName, prefillTaxId) {
  const nameEl = document.getElementById('partner-issue-client-name');
  const taxEl = document.getElementById('partner-issue-tax-id');
  const aliasEl = document.getElementById('partner-issue-alias');
  if (nameEl) nameEl.value = prefillName || '';
  if (taxEl) taxEl.value = prefillTaxId || '';
  if (aliasEl) aliasEl.value = prefillName ? `Evaluación ${prefillName}` : '';
  const modal = document.getElementById('modal-partner-issue');
  if (modal) modal.classList.remove('hidden');
}

async function handlePartnerIssueSubmit(e) {
  e.preventDefault();
  const clientName = (document.getElementById('partner-issue-client-name')?.value || '').trim();
  const clientTaxId = (document.getElementById('partner-issue-tax-id')?.value || '').trim();
  const alias = (document.getElementById('partner-issue-alias')?.value || '').trim();
  const btn = document.getElementById('btn-submit-partner-issue');
  if (btn) { btn.innerText = 'Emitiendo...'; btn.disabled = true; }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  try {
    const res = await fetch('/api/v1/partner/licenses/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ clientName, clientTaxId, alias })
    });
    const data = await res.json();
    if (res.ok && data.data?.key) {
      _partnerCloseModal('modal-partner-issue');
      _partnerToast(`✓ Clave de Evaluación (15d) emitida: ${data.data.key}`, 'success');
      if (typeof window.loadPartnerClients === 'function') window.loadPartnerClients();
    } else _partnerToast(data.error?.message || 'Error al emitir licencia', 'error');
  } catch (err) {
    _partnerToast('Error de conexión con el servidor central', 'error');
  } finally {
    if (btn) { btn.innerText = 'Emitir Clave de Evaluación (15d)'; btn.disabled = false; }
  }
}

window.togglePartnerHideTests = togglePartnerHideTests;
window.toggleOrgsHideTests = toggleOrgsHideTests;
window.changePartnerClientsPage = changePartnerClientsPage;
window.inspectPartnerClientOrg = inspectPartnerClientOrg;
window.exportPartnerClientsCsv = exportPartnerClientsCsv;
window.copyPartnerAffiliateLink = copyPartnerAffiliateLink;
window.openPartnerBuyModal = openPartnerBuyModal;
window.handlePartnerBuySubmit = handlePartnerBuySubmit;
window.openPartnerIssueModal = openPartnerIssueModal;
window.handlePartnerIssueSubmit = handlePartnerIssueSubmit;
