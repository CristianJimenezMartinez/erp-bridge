/**
 * Bentian ERP Bridge — Dashboard Admin Partners CRM Module
 * Gestión Superadmin del Directorio de Partners B2B, licencias NFR, comisiones y alta rápida.
 */

const _ptEscapeHtml = window.escapeHtml || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
const _ptToast = (msg, type) => { if (typeof window.showToast === 'function') window.showToast(msg, type); };

let _adminPartnersBound = false;
window._adminPartnersCache = [];
window._adminPartnersHideTests = false;

function _isTestPartnerRecord(p) {
  const name = String(p.agency_name || p.contact_name || p.partner_code || '').toUpperCase();
  return name.includes('[TEST]') || name.includes('TEST E2E') || name.includes('SOFTPEDIA');
}

function toggleNewPartnerPanel() {
  const panel = document.getElementById('admin-new-partner-panel');
  if (panel) panel.classList.toggle('hidden');
}

function toggleAdminPartnersHideTests() {
  window._adminPartnersHideTests = !window._adminPartnersHideTests;
  filterAndRenderAdminPartners();
}

function _formatPartnerTypeLabel(pt) {
  if (pt === 'implantador_erp') return 'Implantador ERP';
  if (pt === 'asesoria_holded') return 'Asesoría / Holded';
  return 'Agencia eCommerce';
}

async function loadAdminPartners() {
  const tbody = document.getElementById('admin-partners-tbody');
  if (tbody && !_adminPartnersBound) {
    _adminPartnersBound = true;
    tbody.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const partnerId = btn.getAttribute('data-id') || '';
      const val = btn.getAttribute('data-val') || '';

      if (action === 'copy-partner-code' || action === 'copy-partner-link' || action === 'copy-nfr-key') {
        if (!val) return;
        navigator.clipboard.writeText(val).then(() => _ptToast('✓ Copiado al portapapeles', 'success')).catch(() => {});
        return;
      }
      if (action === 'inc-partner-clients' || action === 'dec-partner-clients') {
        const currentCount = parseInt(val, 10) || 0;
        const nextCount = action === 'inc-partner-clients' ? currentCount + 1 : Math.max(0, currentCount - 1);
        await updateAdminPartner(partnerId, { referredClientsCount: nextCount });
        return;
      }
      if (action === 'preview-partner-portal') {
        if (typeof window.switchDashboardTab === 'function') window.switchDashboardTab('partner-clients', true);
        if (typeof window.loadPartnerClients === 'function') await window.loadPartnerClients(val);
        return;
      }
      if (action === 'toggle-partner-status') {
        await updateAdminPartner(partnerId, { status: val === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' });
      }
    });
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  try {
    const res = await fetch('/api/v1/admin/partners', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;
    const json = await res.json();
    const partners = json.data || [];
    const kpis = json.kpis || {};
    window._adminPartnersCache = partners;

    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
    setTxt('kpi-partners-total', String(kpis.totalPartners ?? partners.length));
    setTxt('kpi-partners-active', String(kpis.activePartners ?? 0));
    setTxt('kpi-partners-clients', String(kpis.totalReferredClients ?? 0));
    setTxt('kpi-partners-arr', `${(kpis.estimatedPartnerArr ?? 0).toLocaleString('es-ES')} €`);
    setTxt('kpi-partners-commissions', `${(kpis.estimatedPartnerCommissions ?? 0).toLocaleString('es-ES')} €`);

    filterAndRenderAdminPartners();
  } catch {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-400 font-mono text-xs">Error al cargar el directorio de partners.</td></tr>`;
  }
}

function filterAndRenderAdminPartners() {
  const tbody = document.getElementById('admin-partners-tbody');
  if (!tbody) return;
  const all = window._adminPartnersCache || [];
  const q = (document.getElementById('admin-partners-search')?.value || '').toLowerCase().trim();

  const testCount = all.filter(_isTestPartnerRecord).length;
  const hideBtn = document.getElementById('btn-admin-partners-hide-tests');
  if (hideBtn) {
    hideBtn.textContent = window._adminPartnersHideTests ? `Mostrar test (${testCount})` : `Ocultar test (${testCount})`;
    hideBtn.className = window._adminPartnersHideTests
      ? 'px-2.5 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-xs font-mono text-indigo-200 transition cursor-pointer whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-md bg-[#0e1118] hover:bg-[#1a1f2e] border border-white/[0.14] text-xs font-mono text-zinc-300 transition cursor-pointer whitespace-nowrap';
  }

  const list = all.filter(p => {
    if (window._adminPartnersHideTests && _isTestPartnerRecord(p)) return false;
    if (q) {
      const code = String(p.partner_code || '').toLowerCase();
      const agency = String(p.agency_name || '').toLowerCase();
      const email = String(p.email || p.contact_email || '').toLowerCase();
      const contact = String(p.contact_name || '').toLowerCase();
      if (!code.includes(q) && !agency.includes(q) && !email.includes(q) && !contact.includes(q)) return false;
    }
    return true;
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-zinc-300 text-xs">No hay Partners que coincidan con el filtro. Pulsa <strong>"+ Alta Rápida Partner (NFR 2 Puestos)"</strong> o comparte <code class="text-emerald-300 font-mono">bridge.cristianjm.com/partners/</code>.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const code = p.partner_code || 'PT-BENTIAN';
    const idOrCode = p.id || code;
    const agency = p.agency_name || code;
    const contact = p.contact_name || 'Contacto';
    const email = p.email || p.contact_email || '';
    const cleanPhone = String(p.phone || '').replace(/[^0-9]/g, '');
    const waDigits = cleanPhone.startsWith('34') ? cleanPhone : (cleanPhone.length === 9 ? '34' + cleanPhone : cleanPhone);
    const waLink = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent('Hola ' + contact + ', te escribo desde Bentian ERP Bridge respecto a vuestra cuenta de Partner (' + code + ').')}` : '';
    const typeLabel = _formatPartnerTypeLabel(p.partner_type);
    const erps = p.erps || 'Factusol / Multi-ERP';
    const nfrKey = p.nfr_license_key || '—';
    const clientsCount = Number(p.referred_clients_count || 0);
    const commRate = Number(p.commission_rate || 25);
    const annualComm = (clientsCount * 199 * (commRate / 100)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const status = p.status || (p.active === false ? 'SUSPENDED' : 'ACTIVE');
    const isAct = status === 'ACTIVE';
    const refUrl = `https://bridge.cristianjm.com/?ref=${encodeURIComponent(code)}`;

    return `<tr class="hover:bg-white/[0.03] transition">
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-1.5">
          <span class="font-mono font-bold text-emerald-300">${_ptEscapeHtml(code)}</span>
          <button type="button" data-action="copy-partner-code" data-val="${_ptEscapeHtml(code)}" class="px-1.5 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] text-zinc-200 cursor-pointer">Copiar</button>
        </div>
        <button type="button" data-action="copy-partner-link" data-val="${_ptEscapeHtml(refUrl)}" class="text-[10px] text-indigo-300 hover:underline mt-0.5 block cursor-pointer">Copiar link afiliado</button>
      </td>
      <td class="py-3.5 px-4">
        <div class="font-semibold text-white">${_ptEscapeHtml(agency)}</div>
        ${p.website ? `<div class="text-[10px] text-zinc-400 truncate max-w-[180px]">${_ptEscapeHtml(p.website)}</div>` : ''}
      </td>
      <td class="py-3.5 px-4">
        <div class="text-white font-medium">${_ptEscapeHtml(contact)}</div>
        <div class="flex items-center gap-2 mt-0.5 text-[11px]">
          ${email ? `<a href="mailto:${_ptEscapeHtml(email)}" class="text-indigo-300 hover:underline">${_ptEscapeHtml(email)}</a>` : ''}
          ${waLink ? `<a href="${_ptEscapeHtml(waLink)}" target="_blank" rel="noopener noreferrer" class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 text-[10px] font-mono hover:bg-emerald-500/30">WhatsApp</a>` : ''}
        </div>
      </td>
      <td class="py-3.5 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/40">${_ptEscapeHtml(typeLabel)}</span>
        <div class="text-[11px] text-zinc-300 mt-1">${_ptEscapeHtml(erps)}</div>
      </td>
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-1.5">
          <code class="text-[11px] font-mono font-semibold text-indigo-200">${_ptEscapeHtml(nfrKey)}</code>
          ${nfrKey !== '—' ? `<button type="button" data-action="copy-nfr-key" data-val="${_ptEscapeHtml(nfrKey)}" class="px-1.5 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] text-zinc-200 cursor-pointer">Copiar</button>` : ''}
        </div>
        <span class="text-[10px] text-zinc-300 block mt-0.5">Sandbox 2 puestos · Clave Portal</span>
      </td>
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-1.5">
          <button type="button" data-action="dec-partner-clients" data-id="${_ptEscapeHtml(idOrCode)}" data-val="${clientsCount}" class="w-5 h-5 rounded bg-white/[0.08] hover:bg-white/[0.18] text-white text-xs flex items-center justify-center cursor-pointer">-</button>
          <span class="font-mono font-bold text-white px-1.5">${clientsCount}</span>
          <button type="button" data-action="inc-partner-clients" data-id="${_ptEscapeHtml(idOrCode)}" data-val="${clientsCount}" class="w-5 h-5 rounded bg-white/[0.08] hover:bg-white/[0.18] text-white text-xs flex items-center justify-center cursor-pointer">+</button>
        </div>
        <div class="text-[10px] text-emerald-300 font-mono font-semibold mt-0.5">${annualComm} € / año (${commRate}%)</div>
      </td>
      <td class="py-3.5 px-4 text-right whitespace-nowrap">
        <div class="flex items-center justify-end gap-1.5">
          <button type="button" data-action="preview-partner-portal" data-val="${_ptEscapeHtml(code)}" class="px-2.5 py-1 rounded text-[10px] font-mono font-medium bg-[#181c26] hover:bg-[#222736] text-zinc-200 border border-white/[0.14] cursor-pointer" title="Inspeccionar portal de este Partner">Ver Portal</button>
          <button type="button" data-action="toggle-partner-status" data-id="${_ptEscapeHtml(idOrCode)}" data-val="${_ptEscapeHtml(status)}" class="px-2.5 py-1 rounded text-[10px] font-mono font-semibold cursor-pointer ${isAct ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30'}">${isAct ? 'ACTIVO' : 'SUSPENDIDO'}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function updateAdminPartner(idOrCode, payload) {
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  try {
    const res = await fetch(`/api/v1/admin/partners/${encodeURIComponent(idOrCode)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (res.ok) { _ptToast('✓ Partner actualizado', 'success'); loadAdminPartners(); }
    else _ptToast('No se pudo actualizar el Partner', 'error');
  } catch {
    _ptToast('Error de red al actualizar Partner', 'error');
  }
}

async function handleAdminCreatePartner(e) {
  e.preventDefault();
  const agencyName = (document.getElementById('adm-pt-agency')?.value || '').trim();
  const contactName = (document.getElementById('adm-pt-contact')?.value || '').trim();
  const email = (document.getElementById('adm-pt-email')?.value || '').trim();
  const phone = (document.getElementById('adm-pt-phone')?.value || '').trim();
  const partnerType = document.getElementById('adm-pt-type')?.value || 'agencia_ecommerce';
  const erps = (document.getElementById('adm-pt-erps')?.value || 'Factusol, SimplyGest, Sage 50').trim();
  const btn = document.getElementById('btn-adm-create-partner');

  if (!agencyName || !contactName || !email || !phone) return _ptToast('Completa los campos obligatorios del Partner', 'warning');
  if (btn) { btn.disabled = true; btn.innerText = 'Emitiendo acreditación y NFR...'; }

  try {
    const res = await fetch('/api/v1/partners/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyName, contactName, email, phone, partnerType, erps })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      _ptToast(`✓ Partner ${json.data.partnerCode} creado (Licencia NFR: ${json.data.nfrLicenseKey})`, 'success');
      const panel = document.getElementById('admin-new-partner-panel');
      if (panel) panel.classList.add('hidden');
      loadAdminPartners();
      if (typeof window.loadOrganizations === 'function') window.loadOrganizations();
    } else _ptToast(json.error?.message || 'Error al dar de alta el Partner', 'error');
  } catch {
    _ptToast('Error de red al crear Partner', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'Emitir Código PT-XXXX + Licencia NFR Ahora →'; }
  }
}

window.loadAdminPartners = loadAdminPartners;
window.filterAndRenderAdminPartners = filterAndRenderAdminPartners;
window.toggleAdminPartnersHideTests = toggleAdminPartnersHideTests;
window.toggleNewPartnerPanel = toggleNewPartnerPanel;
window.handleAdminCreatePartner = handleAdminCreatePartner;
