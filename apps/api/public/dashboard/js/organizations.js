/**
 * Bentian ERP Bridge — Dashboard Organizations & Partners Module
 * Gestión de organizaciones multi-tenant y cartera de clientes de partners revendedores.
 */

// Utilidades locales desacopladas para garantizar resiliencia total contra fallos de red o carga tardía
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
  } else {
    console.log(`[Bentian Toast ${type || 'info'}]: ${msg}`);
  }
}

function _safeCloseModal(id) {
  if (typeof window.closeModal === 'function') {
    window.closeModal(id);
  } else {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
}

async function loadOrganizations() {
  const tbody = document.getElementById('orgs-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-500 font-mono text-xs">Cargando organizaciones...</td></tr>`;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/organizations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      const orgs = json.data || [];
      if (!tbody) return;
      if (orgs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-500 text-xs">No hay organizaciones registradas.</td></tr>`;
        return;
      }
      tbody.innerHTML = orgs.map(o => {
        const activeLic = o.active_licenses !== undefined ? o.active_licenses : '—';
        const totalLic = o.total_licenses !== undefined ? o.total_licenses : '—';
        const licDisplay = o.active_licenses !== undefined
          ? `<span class="text-emerald-400 font-semibold">${activeLic}</span> <span class="text-zinc-500 font-mono text-[11px]">/ ${totalLic} tot.</span>`
          : '<span class="text-zinc-500 font-mono text-xs">—</span>';

        return `
          <tr class="hover:bg-white/[0.02] transition">
            <td class="py-3.5 px-4 font-semibold text-white">${_safeEscapeHtml(o.legal_name || o.name || 'Organización')}</td>
            <td class="py-3.5 px-4 font-mono text-indigo-300">${_safeEscapeHtml(o.tax_id || '—')}</td>
            <td class="py-3.5 px-4 font-mono">${licDisplay}</td>
            <td class="py-3.5 px-4 font-mono text-zinc-400">${_safeEscapeHtml(o.reseller_id || 'Directo')}</td>
            <td class="py-3.5 px-4 text-zinc-300">${_safeEscapeHtml(o.plan || 'Standard')}</td>
            <td class="py-3.5 px-4 text-right">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVA</span>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (e) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400 font-mono text-xs">Error al cargar organizaciones.</td></tr>`;
    }
  }
}

async function loadPartnerClients() {
  const tbody = document.getElementById('partner-clients-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-zinc-500 font-mono text-xs">Cargando cartera de clientes...</td></tr>`;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/partner/clients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      const clients = json.data || [];
      const countEl = document.getElementById('partner-clients-count');
      if (countEl) countEl.innerText = `${clients.length} Empresas Registradas`;

      // Actualizar enlace de afiliado con el código real del partner
      const partnerCode = localStorage.getItem('bentian_cloud_partner_code') || localStorage.getItem('bentian_cloud_org') || 'PT-PARTNER';
      const affInput = document.getElementById('partner-affiliate-link');
      if (affInput) {
        affInput.value = `https://bridge.cristianjm.com/?ref=${encodeURIComponent(partnerCode)}`;
      }

      if (!tbody) return;

      if (clients.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="p-10 text-center text-zinc-500 text-xs">
              Aún no tienes clientes dados de alta. Pulsa <strong>"Comprar Licencia (-25%)"</strong> o <strong>"+ Clave Evaluación"</strong> para comenzar.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = clients.map(c => {
        const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '—';
        return `
          <tr class="hover:bg-white/[0.02] transition">
            <td class="p-3 font-semibold text-white">${_safeEscapeHtml(c.legal_name || c.name || 'Cliente')}</td>
            <td class="p-3 font-mono text-indigo-300">${_safeEscapeHtml(c.tax_id || '—')}</td>
            <td class="p-3 font-mono">${c.active_licenses || 0} activas / ${c.total_licenses || 0} tot.</td>
            <td class="p-3 text-zinc-400">${dateStr}</td>
            <td class="p-3 text-right">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVO</span>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (e) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400 font-mono text-xs">Error al cargar clientes.</td></tr>`;
    }
  }
}

function copyPartnerAffiliateLink() {
  const affInput = document.getElementById('partner-affiliate-link');
  if (affInput && affInput.value) {
    navigator.clipboard.writeText(affInput.value).then(() => {
      _safeShowToast('✓ Enlace de distribuidor copiado al portapapeles', 'success');
    }).catch(() => {
      affInput.select();
      document.execCommand('copy');
      _safeShowToast('✓ Enlace copiado', 'success');
    });
  }
}

function openPartnerBuyModal() {
  const nameEl = document.getElementById('partner-buy-client-name');
  const taxEl = document.getElementById('partner-buy-tax-id');
  const emailEl = document.getElementById('partner-buy-email');
  const aliasEl = document.getElementById('partner-buy-alias');
  if (nameEl) nameEl.value = '';
  if (taxEl) taxEl.value = '';
  if (emailEl) emailEl.value = '';
  if (aliasEl) aliasEl.value = '';
  const modal = document.getElementById('modal-partner-buy');
  if (modal) modal.classList.remove('hidden');
}

async function handlePartnerBuySubmit(e) {
  e.preventDefault();
  const nameEl = document.getElementById('partner-buy-client-name');
  const taxEl = document.getElementById('partner-buy-tax-id');
  const emailEl = document.getElementById('partner-buy-email');
  const aliasEl = document.getElementById('partner-buy-alias');
  const clientName = nameEl ? nameEl.value.trim() : '';
  const clientTaxId = taxEl ? taxEl.value.trim() : '';
  const clientEmail = emailEl ? emailEl.value.trim() : '';
  const alias = aliasEl ? aliasEl.value.trim() : '';
  const btn = document.getElementById('btn-submit-partner-buy');

  if (!clientName || !clientTaxId) {
    _safeShowToast('La Razón Social y el CIF son obligatorios', 'warning');
    return;
  }

  if (btn) {
    btn.innerText = 'Conectando con Stripe...';
    btn.disabled = true;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/billing/partner-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ clientName, clientTaxId, clientEmail, alias })
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      _safeShowToast(data.error?.message || 'Error al generar la pasarela de pago mayorista', 'error');
    }
  } catch (err) {
    _safeShowToast('Error de conexión con la pasarela de pago', 'error');
  } finally {
    if (btn) {
      btn.innerText = 'Pagar en Stripe (149,25 €) →';
      btn.disabled = false;
    }
  }
}

function openPartnerIssueModal() {
  const nameEl = document.getElementById('partner-issue-client-name');
  const taxEl = document.getElementById('partner-issue-tax-id');
  const aliasEl = document.getElementById('partner-issue-alias');
  if (nameEl) nameEl.value = '';
  if (taxEl) taxEl.value = '';
  if (aliasEl) aliasEl.value = '';
  const modal = document.getElementById('modal-partner-issue');
  if (modal) modal.classList.remove('hidden');
}

async function handlePartnerIssueSubmit(e) {
  e.preventDefault();
  const nameEl = document.getElementById('partner-issue-client-name');
  const taxEl = document.getElementById('partner-issue-tax-id');
  const aliasEl = document.getElementById('partner-issue-alias');
  const clientName = nameEl ? nameEl.value.trim() : '';
  const clientTaxId = taxEl ? taxEl.value.trim() : '';
  const alias = aliasEl ? aliasEl.value.trim() : '';
  const btn = document.getElementById('btn-submit-partner-issue');
  if (btn) {
    btn.innerText = 'Emitiendo...';
    btn.disabled = true;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/partner/licenses/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ clientName, clientTaxId, alias })
    });
    const data = await res.json();
    if (res.ok && data.data?.key) {
      _safeCloseModal('modal-partner-issue');
      _safeShowToast(`✓ Clave de Evaluación (15d) emitida: ${data.data.key}`, 'success');
      loadPartnerClients();
    } else {
      _safeShowToast(data.error?.message || 'Error al emitir licencia', 'error');
    }
  } catch (err) {
    _safeShowToast('Error de conexión con el servidor central', 'error');
  } finally {
    if (btn) {
      btn.innerText = 'Emitir Clave de Evaluación (15d)';
      btn.disabled = false;
    }
  }
}

let _adminPartnersBound = false;

function toggleNewPartnerPanel() {
  const panel = document.getElementById('admin-new-partner-panel');
  if (panel) {
    panel.classList.toggle('hidden');
  }
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
        navigator.clipboard.writeText(val).then(() => {
          _safeShowToast('✓ Copiado al portapapeles', 'success');
        }).catch(() => {});
        return;
      }

      if (action === 'inc-partner-clients' || action === 'dec-partner-clients') {
        const currentCount = parseInt(val, 10) || 0;
        const nextCount = action === 'inc-partner-clients' ? currentCount + 1 : Math.max(0, currentCount - 1);
        await updateAdminPartner(partnerId, { referredClientsCount: nextCount });
        return;
      }

      if (action === 'toggle-partner-status') {
        const nextStatus = val === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        await updateAdminPartner(partnerId, { status: nextStatus });
      }
    });
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  try {
    const res = await fetch('/api/v1/admin/partners', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const json = await res.json();
    const partners = json.data || [];
    const kpis = json.kpis || {};

    const elTotal = document.getElementById('kpi-partners-total');
    const elActive = document.getElementById('kpi-partners-active');
    const elClients = document.getElementById('kpi-partners-clients');
    const elArr = document.getElementById('kpi-partners-arr');
    const elComm = document.getElementById('kpi-partners-commissions');

    if (elTotal) elTotal.innerText = String(kpis.totalPartners ?? partners.length);
    if (elActive) elActive.innerText = String(kpis.activePartners ?? 0);
    if (elClients) elClients.innerText = String(kpis.totalReferredClients ?? 0);
    if (elArr) elArr.innerText = `${(kpis.estimatedPartnerArr ?? 0).toLocaleString('es-ES')} €`;
    if (elComm) elComm.innerText = `${(kpis.estimatedPartnerCommissions ?? 0).toLocaleString('es-ES')} €`;

    if (!tbody) return;
    if (partners.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-zinc-500 text-xs">
            Aún no hay Partners registrados. Pulsa <strong>"+ Alta Rápida Partner (NFR 2 Puestos)"</strong> o comparte <code class="text-emerald-400 font-mono">bridge.cristianjm.com/partners/</code>.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = partners.map(p => {
      const code = p.partner_code || 'PT-BENTIAN';
      const idOrCode = p.id || code;
      const agency = p.agency_name || code;
      const contact = p.contact_name || 'Contacto';
      const email = p.email || p.contact_email || '';
      const phone = p.phone || '';
      const cleanPhone = String(phone).replace(/[^0-9]/g, '');
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

      return `
        <tr class="hover:bg-white/[0.02] transition">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-emerald-400">${_safeEscapeHtml(code)}</span>
              <button type="button" data-action="copy-partner-code" data-val="${_safeEscapeHtml(code)}" class="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-zinc-300 cursor-pointer" title="Copiar código">Copiar</button>
            </div>
            <button type="button" data-action="copy-partner-link" data-val="${_safeEscapeHtml(refUrl)}" class="text-[10px] text-indigo-400 hover:underline mt-0.5 block cursor-pointer">Copiar link afiliado</button>
          </td>
          <td class="py-3.5 px-4">
            <div class="font-semibold text-white">${_safeEscapeHtml(agency)}</div>
            ${p.website ? `<div class="text-[10px] text-zinc-500 truncate max-w-[180px]">${_safeEscapeHtml(p.website)}</div>` : ''}
          </td>
          <td class="py-3.5 px-4">
            <div class="text-zinc-200 font-medium">${_safeEscapeHtml(contact)}</div>
            <div class="flex items-center gap-2 mt-0.5 text-[11px]">
              ${email ? `<a href="mailto:${_safeEscapeHtml(email)}" class="text-indigo-300 hover:underline">${_safeEscapeHtml(email)}</a>` : ''}
              ${waLink ? `<a href="${_safeEscapeHtml(waLink)}" target="_blank" rel="noopener noreferrer" class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono hover:bg-emerald-500/25">WhatsApp</a>` : ''}
            </div>
          </td>
          <td class="py-3.5 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">${_safeEscapeHtml(typeLabel)}</span>
            <div class="text-[11px] text-zinc-400 mt-1">${_safeEscapeHtml(erps)}</div>
          </td>
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-1.5">
              <code class="text-[11px] font-mono text-indigo-300">${_safeEscapeHtml(nfrKey)}</code>
              ${nfrKey !== '—' ? `<button type="button" data-action="copy-nfr-key" data-val="${_safeEscapeHtml(nfrKey)}" class="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-zinc-300 cursor-pointer">Copiar</button>` : ''}
            </div>
            <span class="text-[10px] text-zinc-500 block mt-0.5">Sandbox 2 puestos · Clave Portal</span>
          </td>
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-1.5">
              <button type="button" data-action="dec-partner-clients" data-id="${_safeEscapeHtml(idOrCode)}" data-val="${clientsCount}" class="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 text-xs flex items-center justify-center cursor-pointer">-</button>
              <span class="font-mono font-bold text-white px-1.5">${clientsCount}</span>
              <button type="button" data-action="inc-partner-clients" data-id="${_safeEscapeHtml(idOrCode)}" data-val="${clientsCount}" class="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 text-xs flex items-center justify-center cursor-pointer">+</button>
            </div>
            <div class="text-[10px] text-emerald-400 font-mono mt-0.5">${annualComm} € / año (${commRate}%)</div>
          </td>
          <td class="py-3.5 px-4 text-right">
            <button type="button" data-action="toggle-partner-status" data-id="${_safeEscapeHtml(idOrCode)}" data-val="${_safeEscapeHtml(status)}" class="px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${isAct ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}" title="Pulsa para activar/suspender">
              ${isAct ? 'ACTIVO' : 'SUSPENDIDO'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-400 font-mono text-xs">Error al cargar el directorio de partners.</td></tr>`;
    }
  }
}

async function updateAdminPartner(idOrCode, payload) {
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  try {
    const res = await fetch(`/api/v1/admin/partners/${encodeURIComponent(idOrCode)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      _safeShowToast('✓ Partner actualizado', 'success');
      loadAdminPartners();
    } else {
      _safeShowToast('No se pudo actualizar el Partner', 'error');
    }
  } catch (e) {
    _safeShowToast('Error de red al actualizar Partner', 'error');
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

  if (!agencyName || !contactName || !email || !phone) {
    _safeShowToast('Completa los campos obligatorios del Partner', 'warning');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Emitiendo acreditación y NFR...';
  }

  try {
    const res = await fetch('/api/v1/partners/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyName, contactName, email, phone, partnerType, erps })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      _safeShowToast(`✓ Partner ${json.data.partnerCode} creado (Licencia NFR: ${json.data.nfrLicenseKey})`, 'success');
      const panel = document.getElementById('admin-new-partner-panel');
      if (panel) panel.classList.add('hidden');
      loadAdminPartners();
      loadOrganizations();
    } else {
      _safeShowToast(json.error?.message || 'Error al dar de alta el Partner', 'error');
    }
  } catch (err) {
    _safeShowToast('Error de red al crear Partner', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Emitir Código PT-XXXX + Licencia NFR Ahora →';
    }
  }
}

// Exposición global
window.loadOrganizations = loadOrganizations;
window.loadAdminPartners = loadAdminPartners;
window.toggleNewPartnerPanel = toggleNewPartnerPanel;
window.handleAdminCreatePartner = handleAdminCreatePartner;
window.loadPartnerClients = loadPartnerClients;
window.openPartnerBuyModal = openPartnerBuyModal;
window.handlePartnerBuySubmit = handlePartnerBuySubmit;
window.copyPartnerAffiliateLink = copyPartnerAffiliateLink;
window.openPartnerIssueModal = openPartnerIssueModal;
window.handlePartnerIssueSubmit = handlePartnerIssueSubmit;
