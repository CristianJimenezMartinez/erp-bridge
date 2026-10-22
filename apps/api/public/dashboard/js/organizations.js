/**
 * Bentian ERP Bridge — Dashboard Organizations & Partner Portfolio Module
 * Gestión de organizaciones multi-tenant, filtrado, paginación y cartera de Partner.
 */

const _safeEscapeHtml = window.escapeHtml || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));

window._orgsCache = [];
window._orgsHideTests = false;
window._partnerClientsCache = [];
window._partnerClientsFiltered = [];
window._partnerClientsPage = 1;
window._partnerHideTests = false;

function _isTestPartnerClient(c) {
  const name = String(c.legal_name || c.name || '').toUpperCase();
  return name.includes('[TEST]') || name.includes('EMPRESA TEST') || name.includes('SOFTPEDIA QA') || name.includes('DEMO CORPORACION');
}

async function loadOrganizations() {
  const tbody = document.getElementById('orgs-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-zinc-300 font-mono text-xs">Cargando organizaciones...</td></tr>`;
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';

  try {
    const res = await fetch('/api/v1/organizations', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const json = await res.json();
      window._orgsCache = json.data || [];
      filterAndRenderOrgs();
    }
  } catch {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-400 font-mono text-xs">Error al cargar organizaciones.</td></tr>`;
  }
}

function filterAndRenderOrgs() {
  const tbody = document.getElementById('orgs-tbody');
  if (!tbody) return;
  const all = window._orgsCache || [];
  const q = (document.getElementById('orgs-search')?.value || '').toLowerCase().trim();
  const filter = document.getElementById('orgs-status-filter')?.value || 'ALL';

  const testCount = all.filter(_isTestPartnerClient).length;
  const hideBtn = document.getElementById('btn-orgs-hide-tests');
  if (hideBtn) {
    hideBtn.textContent = window._orgsHideTests ? `Mostrar test (${testCount})` : `Ocultar test (${testCount})`;
    hideBtn.className = window._orgsHideTests
      ? 'px-2.5 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-xs font-mono text-indigo-200 transition cursor-pointer whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-md bg-[#0e1118] hover:bg-[#1a1f2e] border border-white/[0.14] text-xs font-mono text-zinc-300 transition cursor-pointer whitespace-nowrap';
  }

  const list = all.filter(o => {
    if (window._orgsHideTests && _isTestPartnerClient(o)) return false;
    const activeLic = Number(o.active_licenses || 0);
    const hasPartner = !!(o.reseller_id && o.reseller_id !== 'Directo');
    if (filter === 'ACTIVE' && activeLic <= 0) return false;
    if (filter === 'NO_LICENSE' && activeLic > 0) return false;
    if (filter === 'PARTNER' && !hasPartner) return false;
    if (filter === 'DIRECT' && hasPartner) return false;
    if (q) {
      const name = String(o.legal_name || o.name || '').toLowerCase();
      const tax = String(o.tax_id || '').toLowerCase();
      const res = String(o.reseller_id || '').toLowerCase();
      if (!name.includes(q) && !tax.includes(q) && !res.includes(q)) return false;
    }
    return true;
  });

  const badge = document.getElementById('orgs-count-badge');
  if (badge) badge.innerText = list.length === all.length ? `${all.length} empresas` : `${list.length} de ${all.length} empresas`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-zinc-300 text-xs">No hay organizaciones que coincidan con el filtro seleccionado.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(o => {
    const activeLic = Number(o.active_licenses || 0);
    const totalLic = o.total_licenses !== undefined ? o.total_licenses : '—';
    const licDisplay = o.active_licenses !== undefined
      ? `<span class="${activeLic > 0 ? 'text-emerald-300' : 'text-amber-300'} font-bold">${activeLic}</span> <span class="text-zinc-300 font-mono text-[11px]">/ ${totalLic} tot.</span>`
      : '<span class="text-zinc-300 font-mono text-xs">—</span>';
    const statusBadge = activeLic > 0
      ? `<span class="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 whitespace-nowrap">● ACTIVA</span>`
      : `<span class="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 whitespace-nowrap">○ SIN LICENCIA</span>`;

    return `<tr class="hover:bg-white/[0.03] transition">
      <td class="py-3.5 px-4 font-semibold text-white">${_safeEscapeHtml(o.legal_name || o.name || 'Organización')}</td>
      <td class="py-3.5 px-4 font-mono text-indigo-300">${_safeEscapeHtml(o.tax_id || '—')}</td>
      <td class="py-3.5 px-4 font-mono">${licDisplay}</td>
      <td class="py-3.5 px-4 font-mono text-emerald-300">${_safeEscapeHtml(o.reseller_id || 'Directo')}</td>
      <td class="py-3.5 px-4 text-zinc-200 font-medium">${_safeEscapeHtml(o.plan || 'Standard')}</td>
      <td class="py-3.5 px-4">${statusBadge}</td>
      <td class="py-3.5 px-4 text-right whitespace-nowrap">
        <button type="button" onclick="inspectPartnerClientOrg(${JSON.stringify(o.id || '').replace(/"/g, '&quot;')})" class="px-2.5 py-1 rounded-md bg-[#181c26] hover:bg-[#222736] border border-white/[0.14] text-[11px] font-medium text-zinc-200 transition cursor-pointer" title="Inspeccionar fichas y licencias de esta organización">Inspeccionar</button>
      </td>
    </tr>`;
  }).join('');
}

async function loadPartnerClients(selectedPartnerCode) {
  const tbody = document.getElementById('partner-clients-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-300 font-mono text-xs">Cargando cartera de clientes...</td></tr>`;

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  const isSuper = window.currentUserRole === 'SUPERADMIN' || window.currentUserRole === 'ADMIN';
  const selectEl = document.getElementById('superadmin-partner-preview-select');
  let ptList = [];

  if (isSuper && selectEl) {
    try {
      const ptRes = await fetch('/api/v1/admin/partners', { headers: { 'Authorization': `Bearer ${token}` } });
      if (ptRes.ok) ptList = (await ptRes.json()).data || [];
    } catch {}
  }

  const effectiveCode = selectedPartnerCode || (isSuper && selectEl ? selectEl.value : '') || '';
  const querySuffix = (isSuper && effectiveCode) ? `?partnerCode=${encodeURIComponent(effectiveCode)}` : '';

  try {
    const res = await fetch(`/api/v1/partner/clients${querySuffix}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const clients = (await res.json()).data || [];
      window._partnerClientsCache = clients;

      if (isSuper && selectEl) {
        const currentSelected = effectiveCode || 'ALL';
        selectEl.innerHTML =
          `<option value="ALL" ${currentSelected === 'ALL' ? 'selected' : ''}>Vista Global — ${clients.length} Empresas (${ptList.length} Partners)</option>` +
          ptList.map(p => `<option value="${_safeEscapeHtml(p.partner_code || '')}" ${currentSelected === p.partner_code ? 'selected' : ''}>${_safeEscapeHtml(p.partner_code || '')} — ${_safeEscapeHtml(p.agency_name || p.partner_code || '')}</option>`).join('');
      }

      const rawCode = (effectiveCode && effectiveCode !== 'ALL') ? effectiveCode : (localStorage.getItem('bentian_cloud_partner_code') || 'PT-CENTRAL');
      const cleanPartnerCode = (rawCode === 'org_default' || !rawCode) ? 'PT-CENTRAL' : rawCode;
      const affInput = document.getElementById('partner-affiliate-link');
      if (affInput) affInput.value = `https://bridge.cristianjm.com/?ref=${encodeURIComponent(cleanPartnerCode)}`;

      filterAndRenderPartnerClients(1);
    }
  } catch {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400 font-mono text-xs">Error al cargar clientes.</td></tr>`;
  }
}

function filterAndRenderPartnerClients(targetPage) {
  const all = window._partnerClientsCache || [];
  const search = (document.getElementById('partner-clients-search')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('partner-clients-status-filter')?.value || 'ALL';
  const sortMode = document.getElementById('partner-clients-sort')?.value || 'RECENT';
  const pageSize = parseInt(document.getElementById('partner-clients-page-size')?.value || '10', 10) || 10;

  const testCount = all.filter(_isTestPartnerClient).length;
  const hideBtn = document.getElementById('btn-partner-hide-tests');
  if (hideBtn) {
    hideBtn.textContent = window._partnerHideTests ? `Mostrar test (${testCount})` : `Ocultar test (${testCount})`;
    hideBtn.className = window._partnerHideTests
      ? 'px-2.5 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-xs font-mono text-indigo-200 transition cursor-pointer whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-md bg-[#0e1118] hover:bg-[#1a1f2e] border border-white/[0.14] text-xs font-mono text-zinc-300 transition cursor-pointer whitespace-nowrap';
  }

  let filtered = all.filter(c => {
    if (window._partnerHideTests && _isTestPartnerClient(c)) return false;
    const active = Number(c.active_licenses || 0);
    if (statusFilter === 'ACTIVE' && active <= 0) return false;
    if (statusFilter === 'NO_LICENSE' && active > 0) return false;
    if (search) {
      const name = String(c.legal_name || c.name || '').toLowerCase();
      const tax = String(c.tax_id || '').toLowerCase();
      const id = String(c.id || '').toLowerCase();
      if (!name.includes(search) && !tax.includes(search) && !id.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortMode === 'NAME_ASC') return String(a.legal_name || a.name || '').localeCompare(String(b.legal_name || b.name || ''), 'es');
    if (sortMode === 'LIC_DESC') return Number(b.active_licenses || 0) - Number(a.active_licenses || 0);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  window._partnerClientsFiltered = filtered;

  const countEl = document.getElementById('partner-clients-count');
  if (countEl) countEl.innerText = filtered.length === all.length ? `${all.length} Empresas Registradas` : `${filtered.length} de ${all.length} Empresas`;

  const totalActiveLic = filtered.reduce((acc, c) => acc + Number(c.active_licenses || 0), 0);
  const commEl = document.getElementById('partner-commission-available');
  const commSubEl = document.getElementById('partner-commission-subtitle');
  if (commEl) commEl.innerText = `${(totalActiveLic * 49.75).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  if (commSubEl) commSubEl.innerText = `(${totalActiveLic} lic. activas × 49,75 €)`;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, targetPage || window._partnerClientsPage || 1), totalPages);
  window._partnerClientsPage = page;

  const startIdx = (page - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  const pageInfo = document.getElementById('partner-clients-page-info');
  if (pageInfo) pageInfo.innerText = filtered.length === 0 ? 'Mostrando 0 de 0 empresas' : `Mostrando ${startIdx + 1}–${Math.min(startIdx + pageSize, filtered.length)} de ${filtered.length} empresas`;
  const pageInd = document.getElementById('partner-clients-page-indicator');
  if (pageInd) pageInd.innerText = `Página ${page} / ${totalPages}`;

  const prevBtn = document.getElementById('btn-partner-page-prev');
  const nextBtn = document.getElementById('btn-partner-page-next');
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;

  const tbody = document.getElementById('partner-clients-tbody');
  if (!tbody) return;
  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-zinc-300 text-xs">No hay empresas que coincidan con el filtro actual.</td></tr>`;
    return;
  }

  tbody.innerHTML = pageItems.map(c => {
    const name = c.legal_name || c.name || 'Cliente';
    const tax = c.tax_id || '';
    const active = Number(c.active_licenses || 0);
    const total = Number(c.total_licenses || 0);
    const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '—';
    const statusBadge = active > 0
      ? `<span class="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 whitespace-nowrap">● ACTIVA</span>`
      : `<span class="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 whitespace-nowrap">○ SIN LICENCIA</span>`;
    const licHtml = active > 0
      ? `<span class="text-emerald-300 font-bold">${active} activas</span> <span class="text-zinc-300">/ ${total} tot.</span>`
      : `<span class="text-amber-300 font-bold">0 activas</span> <span class="text-zinc-300">/ ${total} tot.</span>`;

    return `<tr class="hover:bg-white/[0.03] transition">
      <td class="p-3.5 font-semibold text-white">${_safeEscapeHtml(name)}</td>
      <td class="p-3.5 font-mono text-indigo-300">${_safeEscapeHtml(tax || '—')}</td>
      <td class="p-3.5 font-mono">${licHtml}</td>
      <td class="p-3.5 text-zinc-200 font-mono">${dateStr}</td>
      <td class="p-3.5">${statusBadge}</td>
      <td class="p-3.5 text-right whitespace-nowrap space-x-1.5">
        <button type="button" onclick="openPartnerIssueModal(${JSON.stringify(name).replace(/"/g, '&quot;')}, ${JSON.stringify(tax).replace(/"/g, '&quot;')})" class="px-2.5 py-1 rounded-md bg-[#181c26] hover:bg-[#222736] border border-white/[0.14] text-[11px] font-medium text-zinc-200 transition cursor-pointer" title="Emitir clave de evaluación de 15 días">Emitir 15d</button>
        <button type="button" onclick="openPartnerBuyModal(${JSON.stringify(name).replace(/"/g, '&quot;')}, ${JSON.stringify(tax).replace(/"/g, '&quot;')})" class="px-2.5 py-1 rounded-md bg-[#181c26] hover:bg-[#222736] border border-white/[0.14] text-[11px] font-medium text-emerald-300 transition cursor-pointer" title="Contratar licencia anual con descuento Partner (-25%)">Contratar (-25%)</button>
        <button type="button" onclick="inspectPartnerClientOrg(${JSON.stringify(c.id || '').replace(/"/g, '&quot;')})" class="px-2.5 py-1 rounded-md bg-[#181c26] hover:bg-[#222736] border border-white/[0.14] text-[11px] font-medium text-indigo-300 transition cursor-pointer" title="Inspeccionar fichas y licencias de esta empresa">Inspeccionar</button>
      </td>
    </tr>`;
  }).join('');
}

window.loadOrganizations = loadOrganizations;
window.filterAndRenderOrgs = filterAndRenderOrgs;
window.loadPartnerClients = loadPartnerClients;
window.filterAndRenderPartnerClients = filterAndRenderPartnerClients;
