/**
 * Bentian ERP Bridge — Dashboard Organizations & Partners Module
 * Gestión de organizaciones multi-tenant y cartera de clientes de partners revendedores.
 */

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
            <td class="py-3.5 px-4 font-semibold text-white">${escapeHtml(o.legal_name || o.name || 'Organización')}</td>
            <td class="py-3.5 px-4 font-mono text-indigo-300">${escapeHtml(o.tax_id || '—')}</td>
            <td class="py-3.5 px-4 font-mono">${licDisplay}</td>
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

function copyPartnerAffiliateLink() {
  const affInput = document.getElementById('partner-affiliate-link');
  if (affInput && affInput.value) {
    navigator.clipboard.writeText(affInput.value).then(() => {
      showToast('✓ Enlace de distribuidor copiado al portapapeles', 'success');
    }).catch(() => {
      affInput.select();
      document.execCommand('copy');
      showToast('✓ Enlace copiado', 'success');
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
    showToast('La Razón Social y el CIF son obligatorios', 'warning');
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
      showToast(data.error?.message || 'Error al generar la pasarela de pago mayorista', 'error');
    }
  } catch (err) {
    showToast('Error de conexión con la pasarela de pago', 'error');
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
      closeModal('modal-partner-issue');
      showToast(`✓ Clave de Evaluación (15d) emitida: ${data.data.key}`, 'success');
      loadPartnerClients();
    } else {
      showToast(data.error?.message || 'Error al emitir licencia', 'error');
    }
  } catch (err) {
    showToast('Error de conexión con el servidor central', 'error');
  } finally {
    if (btn) {
      btn.innerText = 'Emitir Clave de Evaluación (15d)';
      btn.disabled = false;
    }
  }
}

// Exposición global
window.loadOrganizations = loadOrganizations;
window.loadPartnerClients = loadPartnerClients;
window.openPartnerBuyModal = openPartnerBuyModal;
window.handlePartnerBuySubmit = handlePartnerBuySubmit;
window.copyPartnerAffiliateLink = copyPartnerAffiliateLink;
window.openPartnerIssueModal = openPartnerIssueModal;
window.handlePartnerIssueSubmit = handlePartnerIssueSubmit;
