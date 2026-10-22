/**
 * Bentian ERP Bridge — Dashboard Licenses Module
 * Gestión del listado de licencias, telemetría de parque activo y búsqueda/filtrado avanzado.
 */

const _licEsc = window.escapeHtml || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
const _licToast = (msg, type) => { if (typeof window.showToast === 'function') window.showToast(msg, type); };

window.allLicenses = [];
window._licensesHideTests = false;

const _PROTECTED_KEYS = new Set(['EB-8WEN2-W08N2-8KJAW-0AHCH', 'EB-S6AB3-2MHWP-50DTT-72242', 'EB-6RE3E-HXPS4-XYNRV-HVZWT']);
const _OBSOLETE_KEYS = new Set(['EB-KHT50-6XPQH-DZSE6-BRWRY', 'EB-1E4XK-C7HVV-A4X5Y-YKHNP', 'EB-XDGG0-NQZJA-DP70P-06E3E', 'EB-JTMBG-GT8HJ-MMET1-HE7E2', 'EB-WT35M-64BZH-Y0VE2-Y0314', 'EB-KC3ZV-DEK37-XSS01-58C9D', 'EB-MFFF9-VV92C-M9JNV-0H1P0', 'EB-TZJZ2-Z2ZTN-ZR5J1-XPXPV', 'EB-6WCKT-6S1ST-H816X-D0477', 'EB-QGCES-7ENH2-RR6QC-84675', 'EB-SJR5V-VSJEF-3K56F-11F2F']);

function _isTestLicense(lic) {
  const key = String(lic.key || '').toUpperCase();
  if (_PROTECTED_KEYS.has(key)) return false;
  if (_OBSOLETE_KEYS.has(key)) return true;
  const alias = String(lic.alias || '').toUpperCase();
  const org = String(lic.organization_id || lic.organizationId || '').toUpperCase();
  return alias.includes('[TEST]') || alias.includes('TEST E2E') || alias.includes('SOFTPEDIA') || alias.includes('DEMO CORPORACION') || org.includes('TEST');
}

function _buildSeatBadge(lic) {
  const plan = String(lic.plan || '').toLowerCase();
  const sType = String(lic.seat_type || lic.seatType || '').toUpperCase();
  const key = String(lic.key || '').toUpperCase();
  if (plan === 'nfr' || key.includes('NFR')) return '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40">NFR Partner (2P)</span>';
  if (plan === 'trial') return '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40">Evaluación 15d</span>';
  if (sType === 'ADDITIONAL_SEAT') return '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/40">2ª Tienda (-20%)</span>';
  if (plan.includes('founder') || plan === 'beta') return '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">Plan Fundador</span>';
  return '<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/40">Licencia Base</span>';
}

async function loadLicenses() {
  const tbody = document.getElementById('licenses-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-zinc-300 font-mono text-xs">Actualizando parque de licencias...</td></tr>`;
  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';
  try {
    const res = await fetch('/api/v1/licenses', { headers: { 'Authorization': `Bearer ${token}`, 'x-organization-id': orgId } });
    const json = res.ok ? await res.json() : {};
    window.allLicenses = json.data || [];
  } catch { window.allLicenses = []; }
  applyLicensesFilter();
}

function toggleLicensesHideTests() { window._licensesHideTests = !window._licensesHideTests; applyLicensesFilter(); }

function applyLicensesFilter() {
  const all = window.allLicenses || [];
  const q = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('licenses-status-filter')?.value || 'ALL';
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const testCount = all.filter(_isTestLicense).length;
  const hideBtn = document.getElementById('btn-licenses-hide-tests');
  if (hideBtn) {
    hideBtn.textContent = window._licensesHideTests ? `Mostrar test (${testCount})` : `Ocultar test (${testCount})`;
    hideBtn.className = window._licensesHideTests
      ? 'px-2.5 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-xs font-mono text-indigo-200 transition cursor-pointer whitespace-nowrap'
      : 'px-2.5 py-1.5 rounded-md bg-[#0e1118] hover:bg-[#1a1f2e] border border-white/[0.14] text-xs font-mono text-zinc-300 transition cursor-pointer whitespace-nowrap';
  }

  const filtered = all.filter(l => {
    if (window._licensesHideTests && _isTestLicense(l)) return false;
    const act = l.activations && l.activations.length > 0 ? l.activations[0] : null;
    const isOnline = act && act.lastValidatedAt && (now - new Date(act.lastValidatedAt).getTime() < dayMs);
    if (statusFilter === 'ONLINE' && !isOnline) return false;
    if (statusFilter === 'PENDING' && act) return false;
    if (statusFilter === 'OFFLINE' && (!act || isOnline)) return false;
    if (q) {
      const alias = (l.alias || '').toLowerCase();
      const key = (l.key || '').toLowerCase();
      const email = (l.contact_email || '').toLowerCase();
      const hostname = (act?.machineInfo?.hostname || '').toLowerCase();
      const hwid = (act?.hwid || '').toLowerCase();
      if (!alias.includes(q) && !key.includes(q) && !email.includes(q) && !hostname.includes(q) && !hwid.includes(q)) return false;
    }
    return true;
  });

  const badge = document.getElementById('licenses-count-badge');
  if (badge) {
    badge.innerText = filtered.length === all.length ? `${all.length} licencias` : `${filtered.length} de ${all.length} licencias`;
  }
  renderLicenses(filtered);
}

function renderLicenses(list) {
  const tbody = document.getElementById('licenses-tbody');
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-zinc-300 text-xs">No hay licencias que coincidan con el filtro actual. Pulsa <strong>"+ Generar Clave"</strong> para dar de alta una conexión.</td></tr>`;
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
    const seatBadge = _buildSeatBadge(lic);
    const contactEmail = lic.contact_email || (String(lic.key || '').toUpperCase() === 'EB-6RE3E-HXPS4-XYNRV-HVZWT' ? 'info@nicripsia.com' : '');
    const rawExp = lic.expires_at || lic.expiresAt;
    const expDays = rawExp ? Math.max(0, Math.ceil((new Date(rawExp).getTime() - now) / 86400000)) : null;
    const expText = rawExp ? `Vence: ${new Date(rawExp).toLocaleDateString('es-ES')} (${expDays}d)` : 'Suscripción activa';

    return `
      <tr class="hover:bg-white/[0.03] transition-colors">
        <td class="p-3.5">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-white text-xs">${_licEsc(lic.alias || 'Servidor Factusol')}</span>
            <button data-action="edit-alias" data-license-id="${_licEsc(lic.id)}" data-alias="${_licEsc(lic.alias || '')}" title="Editar Alias" class="text-zinc-300 hover:text-white p-0.5 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
          </div>
          <span class="text-[10px] text-zinc-400 font-mono">ID: ${_licEsc(String(lic.id || '').substring(0, 8))}${contactEmail ? ` · <span class="text-indigo-300">${_licEsc(contactEmail)}</span>` : ''}</span>
        </td>
        <td class="p-3.5 font-mono">
          <div class="flex items-center gap-2">
            <span class="text-indigo-300 font-bold text-xs tracking-wider">${_licEsc(lic.key)}</span>
            <button data-action="copy-key" data-key="${_licEsc(lic.key)}" title="Copiar Clave" class="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer">
              <span>Copiar</span>
            </button>
          </div>
        </td>
        <td class="p-3.5 whitespace-nowrap">${seatBadge}<div class="text-[10px] text-zinc-400 font-mono mt-1">${_licEsc(expText)}</div></td>
        <td class="p-3.5 whitespace-nowrap">
          ${hasMachine ? (
            isOnline ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse"></span>En Línea (${lastSeenText})</span>`
                     : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-500/20 text-zinc-200 border border-zinc-400/40"><span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>Desconectado (${lastSeenText})</span>`
          ) : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Esperando Activación</span>`}
        </td>
        <td class="p-3.5">
          <div class="text-white text-xs font-semibold">${_licEsc(hostname)}</div>
          <div class="text-[10px] text-zinc-300 font-mono mt-0.5" title="${_licEsc(fullHwid)}">HWID: ${_licEsc(shortHwid)}</div>
        </td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <button data-action="preview-client-license" data-license-id="${_licEsc(lic.id)}" class="px-2.5 py-1 rounded-md bg-[#181c26] hover:bg-[#222736] text-zinc-200 border border-white/[0.14] text-[11px] font-medium transition inline-flex items-center gap-1 mr-1 cursor-pointer" title="Inspeccionar portal de cliente de esta licencia">Ver Ficha</button>
          <button data-action="resend-license-email" data-license-id="${_licEsc(lic.id)}" data-key="${_licEsc(lic.key)}" data-alias="${_licEsc(lic.alias || '')}" data-email="${_licEsc(contactEmail)}" class="px-2 py-1 rounded-md bg-[#181c26] hover:bg-[#222736] text-indigo-300 border border-white/[0.14] text-[11px] font-medium transition inline-flex items-center mr-1 cursor-pointer" title="Enviar o reenviar clave e instrucciones por email">Reenviar</button>
          ${hasMachine ? `<button data-action="unbind-license" data-license-id="${_licEsc(lic.id)}" data-key="${_licEsc(lic.key)}" data-hostname="${_licEsc(hostname)}" data-hwid="${_licEsc(act.hwid || '')}" class="px-2.5 py-1 rounded-md bg-[#181c26] hover:bg-[#222736] text-amber-300 border border-white/[0.14] text-[11px] font-medium transition inline-flex items-center gap-1 mr-1 cursor-pointer"><span>Desvincular PC</span></button>` : ''}
          ${!_PROTECTED_KEYS.has(String(lic.key || '').toUpperCase()) ? `<button data-action="delete-license" data-license-id="${_licEsc(lic.id)}" data-key="${_licEsc(lic.key)}" data-alias="${_licEsc(lic.alias || '')}" class="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition inline-flex items-center cursor-pointer" title="Eliminar licencia permanentemente">Eliminar</button>` : `<span class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono">Protegida</span>`}
        </td>
      </tr>`;
  }).join('');

  if (!tbody._eventsAttached) {
    tbody.addEventListener('click', (e) => {
      const previewBtn = e.target.closest('[data-action="preview-client-license"]');
      if (previewBtn) {
        const id = previewBtn.getAttribute('data-license-id') || '';
        if (typeof window.switchDashboardTab === 'function') window.switchDashboardTab('client-portal', true);
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
        if (typeof window.copyKey === 'function') window.copyKey(key);
        else if (navigator.clipboard) navigator.clipboard.writeText(key).then(() => _licToast('✓ Clave copiada al portapapeles', 'success'));
        return;
      }
      const delBtn = e.target.closest('[data-action="delete-license"]');
      if (delBtn && typeof window.deleteLicenseById === 'function') {
        window.deleteLicenseById(delBtn.getAttribute('data-license-id') || '', delBtn.getAttribute('data-key') || '', delBtn.getAttribute('data-alias') || '');
        return;
      }
      const resendBtn = e.target.closest('[data-action="resend-license-email"]');
      if (resendBtn && typeof window.resendLicenseEmail === 'function') {
        window.resendLicenseEmail(resendBtn.getAttribute('data-license-id') || '', resendBtn.getAttribute('data-key') || '', resendBtn.getAttribute('data-alias') || '', resendBtn.getAttribute('data-email') || '');
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
      headers: { 'Authorization': `Bearer ${token}`, 'x-organization-id': orgId }
    });
    if (res.ok) {
      const json = await res.json();
      const d = json.data || {};
      const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
      setEl('kpi-plan-badge', (d.plan || 'BASE').toUpperCase());
      setEl('kpi-active-seats', d.activeSeats || 0);
      setEl('kpi-total-seats', d.totalAllowedSeats || 1);
      setEl('kpi-online-seats', d.onlineSeats || 0);
      const pct = Math.min(100, Math.round(((d.activeSeats || 0) / (d.totalAllowedSeats || 1)) * 100));
      const progBar = document.getElementById('kpi-progress-bar');
      if (progBar) progBar.style.width = pct + '%';
    }
  } catch {}
}

function handleSearch() {
  applyLicensesFilter();
}

window.loadLicenses = loadLicenses;
window.renderLicenses = renderLicenses;
window.loadFleetOverview = loadFleetOverview;
window.handleSearch = handleSearch;
window.applyLicensesFilter = applyLicensesFilter;
window.toggleLicensesHideTests = toggleLicensesHideTests;
