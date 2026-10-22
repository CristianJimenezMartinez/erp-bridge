/**
 * Bentian ERP Bridge — Dashboard Admin Partners CRM Module
 * Gestión Superadmin del Directorio de Partners B2B, licencias NFR, comisiones y alta rápida.
 */

function _ptEscapeHtml(str) {
  if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function _ptToast(msg, type) {
  if (typeof window.showToast === 'function') window.showToast(msg, type);
}

let _adminPartnersBound = false;

function toggleNewPartnerPanel() {
  const panel = document.getElementById('admin-new-partner-panel');
  if (panel) panel.classList.toggle('hidden');
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
        if (typeof window.switchDashboardTab === 'function') window.switchDashboardTab('partner-clients');
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

    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
    setTxt('kpi-partners-total', String(kpis.totalPartners ?? partners.length));
    setTxt('kpi-partners-active', String(kpis.activePartners ?? 0));
    setTxt('kpi-partners-clients', String(kpis.totalReferredClients ?? 0));
    setTxt('kpi-partners-arr', `${(kpis.estimatedPartnerArr ?? 0).toLocaleString('es-ES')} €`);
    setTxt('kpi-partners-commissions', `${(kpis.estimatedPartnerCommissions ?? 0).toLocaleString('es-ES')} €`);

    if (!tbody) return;
    if (partners.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-zinc-500 text-xs">Aún no hay Partners registrados. Pulsa <strong>"+ Alta Rápida Partner (NFR 2 Puestos)"</strong> o comparte <code class="text-emerald-400 font-mono">bridge.cristianjm.com/partners/</code>.</td></tr>`;
      return;
    }

    tbody.innerHTML = partners.map(p => {
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

      return `<tr class="hover:bg-white/[0.02] transition">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-bold text-emerald-400">${_ptEscapeHtml(code)}</span>
            <button type="button" data-action="copy-partner-code" data-val="${_ptEscapeHtml(code)}" class="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-zinc-300 cursor-pointer">Copiar</button>
          </div>
          <button type="button" data-action="copy-partner-link" data-val="${_ptEscapeHtml(refUrl)}" class="text-[10px] text-indigo-400 hover:underline mt-0.5 block cursor-pointer">Copiar link afiliado</button>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-white">${_ptEscapeHtml(agency)}</div>
          ${p.website ? `<div class="text-[10px] text-zinc-500 truncate max-w-[180px]">${_ptEscapeHtml(p.website)}</div>` : ''}
        </td>
        <td class="py-3.5 px-4">
          <div class="text-zinc-200 font-medium">${_ptEscapeHtml(contact)}</div>
          <div class="flex items-center gap-2 mt-0.5 text-[11px]">
            ${email ? `<a href="mailto:${_ptEscapeHtml(email)}" class="text-indigo-300 hover:underline">${_ptEscapeHtml(email)}</a>` : ''}
            ${waLink ? `<a href="${_ptEscapeHtml(waLink)}" target="_blank" rel="noopener noreferrer" class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono hover:bg-emerald-500/25">WhatsApp</a>` : ''}
          </div>
        </td>
        <td class="py-3.5 px-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">${_ptEscapeHtml(typeLabel)}</span>
          <div class="text-[11px] text-zinc-400 mt-1">${_ptEscapeHtml(erps)}</div>
        </td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-1.5">
            <code class="text-[11px] font-mono text-indigo-300">${_ptEscapeHtml(nfrKey)}</code>
            ${nfrKey !== '—' ? `<button type="button" data-action="copy-nfr-key" data-val="${_ptEscapeHtml(nfrKey)}" class="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-zinc-300 cursor-pointer">Copiar</button>` : ''}
          </div>
          <span class="text-[10px] text-zinc-500 block mt-0.5">Sandbox 2 puestos · Clave Portal</span>
        </td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-1.5">
            <button type="button" data-action="dec-partner-clients" data-id="${_ptEscapeHtml(idOrCode)}" data-val="${clientsCount}" class="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 text-xs flex items-center justify-center cursor-pointer">-</button>
            <span class="font-mono font-bold text-white px-1.5">${clientsCount}</span>
            <button type="button" data-action="inc-partner-clients" data-id="${_ptEscapeHtml(idOrCode)}" data-val="${clientsCount}" class="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 text-xs flex items-center justify-center cursor-pointer">+</button>
          </div>
          <div class="text-[10px] text-emerald-400 font-mono mt-0.5">${annualComm} € / año (${commRate}%)</div>
        </td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" data-action="preview-partner-portal" data-val="${_ptEscapeHtml(code)}" class="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 cursor-pointer" title="Ver cómo ve su portal este Partner">👁️ Portal</button>
            <button type="button" data-action="toggle-partner-status" data-id="${_ptEscapeHtml(idOrCode)}" data-val="${_ptEscapeHtml(status)}" class="px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${isAct ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">${isAct ? 'ACTIVO' : 'SUSPENDIDO'}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-400 font-mono text-xs">Error al cargar el directorio de partners.</td></tr>`;
  }
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
  } catch (e) {
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
  } catch (err) {
    _ptToast('Error de red al crear Partner', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'Emitir Código PT-XXXX + Licencia NFR Ahora →'; }
  }
}

window.loadAdminPartners = loadAdminPartners;
window.toggleNewPartnerPanel = toggleNewPartnerPanel;
window.handleAdminCreatePartner = handleAdminCreatePartner;
