/**
 * Bentian ERP Bridge — Dashboard Organizations & Partners Module
 * Gestión de organizaciones multi-tenant y cartera de clientes de partners revendedores.
 */

async function loadOrganizations() {
  const tbody = document.getElementById('orgs-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-zinc-500 font-mono text-xs">Cargando organizaciones...</td></tr>`;
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
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-zinc-500 text-xs">No hay organizaciones registradas.</td></tr>`;
        return;
      }
      tbody.innerHTML = orgs.map(o => {
        return `
          <tr class="hover:bg-white/[0.02] transition">
            <td class="py-3.5 px-4 font-semibold text-white">${escapeHtml(o.legal_name || o.name || 'Organización')}</td>
            <td class="py-3.5 px-4 font-mono text-indigo-300">${escapeHtml(o.tax_id || '—')}</td>
            <td class="py-3.5 px-4 font-mono text-zinc-400">${escapeHtml(o.reseller_id || 'Directo')}</td>
            <td class="py-3.5 px-4 text-zinc-300">${escapeHtml(o.plan || 'Standard')}</td>
            <td class="py-3.5 px-4 text-right">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVA</span>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (e) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400 font-mono text-xs">Error al cargar organizaciones.</td></tr>`;
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

      if (!tbody) return;

      if (clients.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="p-10 text-center text-zinc-500 text-xs">
              Aún no tienes clientes dados de alta. Pulsa <strong>"+ Alta de Cliente"</strong> para emitir tu primera licencia.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = clients.map(c => {
        const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '—';
        return `
          <tr class="hover:bg-white/[0.02] transition">
            <td class="p-3 font-semibold text-white">${escapeHtml(c.legal_name || c.name || 'Cliente')}</td>
            <td class="p-3 font-mono text-indigo-300">${escapeHtml(c.tax_id || '—')}</td>
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
      closeModal('modal-partner-issue');
      showToast(`✓ Licencia Base emitida para ${clientName} (${data.data.key})`, 'success');
      loadPartnerClients();
    } else {
      showToast(data.error?.message || 'Error al emitir licencia', 'error');
    }
  } catch (err) {
    showToast('Error de conexión con el servidor central', 'error');
  } finally {
    if (btn) {
      btn.innerText = 'Emitir Licencia Base';
      btn.disabled = false;
    }
  }
}

// Exposición global
window.loadOrganizations = loadOrganizations;
window.loadPartnerClients = loadPartnerClients;
window.openPartnerIssueModal = openPartnerIssueModal;
window.handlePartnerIssueSubmit = handlePartnerIssueSubmit;
