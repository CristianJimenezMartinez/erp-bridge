/**
 * Bentian ERP Bridge — Dashboard Navigation & Role UI Module
 * Control de vistas por pestañas, menús adaptativos según rol (Superadmin, Reseller, Cliente) e inicialización.
 */

function setupRoleNavigation(role) {
  const nav = document.getElementById('dashboard-nav');
  const mobNav = document.getElementById('mobile-tabs-container');
  const roleBadge = document.getElementById('top-role-badge');
  const orgLabel = document.getElementById('top-org-label');
  const ddRole = document.getElementById('dropdown-role-label');

  if (role === 'SUPERADMIN') {
    if (roleBadge) {
      roleBadge.innerText = 'SUPERADMIN GLOBAL';
      roleBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30';
    }
    if (orgLabel) orgLabel.innerText = 'Organización: Sistema Central Bentian';
    if (ddRole) ddRole.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Superadministrador Global';

    if (nav) {
      nav.classList.remove('hidden');
      nav.classList.add('md:flex');
      nav.innerHTML = `
        <button onclick="switchDashboardTab('admin-overview')" id="nav-tab-admin-overview" class="px-3 py-1 rounded-md transition text-white bg-[#18181b] border border-white/[0.1] shadow-sm font-medium">Finanzas & KPIs</button>
        <button onclick="switchDashboardTab('licenses')" id="nav-tab-licenses" class="px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium">Parque de Licencias</button>
        <button onclick="switchDashboardTab('fleet-errors')" id="nav-tab-fleet-errors" class="px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium flex items-center gap-1.5"><span>Diagnóstico & Incidencias</span><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span></button>
        <button onclick="switchDashboardTab('multichannel')" id="nav-tab-multichannel" class="px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>Canales & Webhooks</span></button>
        <div class="h-4 w-[1px] bg-white/[0.08] mx-0.5"></div>
        <button onclick="switchDashboardTab('client-portal')" id="nav-tab-client-portal" class="px-2.5 py-1 rounded-md transition text-zinc-400 hover:text-white text-[11px] font-medium flex items-center gap-1 border border-dashed border-white/[0.1] hover:border-white/[0.25]" title="Previsualizar portal como cliente final">
          <svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          <span>Vista Cliente</span>
        </button>
        <button onclick="switchDashboardTab('audit')" id="nav-tab-audit" class="px-2 py-1 rounded-md transition text-zinc-400 hover:text-white text-[11px] font-medium" title="Logs de Auditoría">Auditoría</button>
      `;
    }

    if (mobNav) {
      mobNav.classList.remove('hidden');
      mobNav.innerHTML = `
        <button onclick="switchDashboardTab('admin-overview')" id="mob-nav-tab-admin-overview" class="px-3 py-1.5 rounded-md transition text-white bg-[#18181b] font-medium whitespace-nowrap">Finanzas & KPIs</button>
        <button onclick="switchDashboardTab('licenses')" id="mob-nav-tab-licenses" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">Parque de Licencias</button>
        <button onclick="switchDashboardTab('fleet-errors')" id="mob-nav-tab-fleet-errors" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">Diagnóstico & Incidencias</button>
        <button onclick="switchDashboardTab('multichannel')" id="mob-nav-tab-multichannel" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">Canales & Webhooks</button>
        <button onclick="switchDashboardTab('client-portal')" id="mob-nav-tab-client-portal" class="px-2.5 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap text-[11px] border border-dashed border-white/[0.1]">Vista Cliente</button>
        <button onclick="switchDashboardTab('audit')" id="mob-nav-tab-audit" class="px-2.5 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap text-[11px]">Auditoría</button>
      `;
    }

    switchDashboardTab('admin-overview');
    if (typeof window.loadAdminOverview === 'function') {
      window.loadAdminOverview();
    }
  } else if (role === 'RESELLER') {
    const partnerCode = localStorage.getItem('bentian_cloud_partner_code') || 'PT-PARTNER';
    if (roleBadge) {
      roleBadge.innerText = 'PARTNER INSTALADOR';
      roleBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
    if (orgLabel) orgLabel.innerText = `Partner: ${partnerCode}`;
    if (ddRole) ddRole.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Partner Autorizado Bentian';

    if (nav) {
      nav.classList.remove('hidden');
      nav.classList.add('md:flex');
      nav.innerHTML = `
        <button onclick="switchDashboardTab('partner-clients')" id="nav-tab-partner-clients" class="px-3 py-1 rounded-md transition text-white bg-[#18181b] border border-white/[0.1] shadow-sm font-medium">Mi Cartera Comercial</button>
        <button onclick="switchDashboardTab('licenses')" id="nav-tab-licenses" class="px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium">Licencias Emitidas</button>
      `;
    }

    if (mobNav) {
      mobNav.classList.remove('hidden');
      mobNav.innerHTML = `
        <button onclick="switchDashboardTab('partner-clients')" id="mob-nav-tab-partner-clients" class="px-3 py-1.5 rounded-md transition text-white bg-[#18181b] font-medium whitespace-nowrap">Mi Cartera Comercial</button>
        <button onclick="switchDashboardTab('licenses')" id="mob-nav-tab-licenses" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">Licencias Emitidas</button>
      `;
    }

    switchDashboardTab('partner-clients');
    if (typeof window.loadPartnerClients === 'function') {
      window.loadPartnerClients();
    }
  } else {
    // TENANT_CLIENT (Cliente Final / Cartera de Licencias)
    if (roleBadge) {
      roleBadge.innerText = 'CLIENTE MULTI-ERP';
      roleBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    }
    if (orgLabel) orgLabel.innerText = 'Panel de Gestión y Licencias Factusol';
    if (ddRole) ddRole.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Licencias Factusol Activas';

    // Ocultar barra de pestañas para cliente final
    if (nav) {
      nav.innerHTML = '';
      nav.classList.add('hidden');
      nav.classList.remove('md:flex');
    }
    if (mobNav) {
      mobNav.innerHTML = '';
      mobNav.classList.add('hidden');
    }

    switchDashboardTab('client-portal');
    if (typeof window.loadClientPortal === 'function') {
      window.loadClientPortal();
    }
  }
}

function switchDashboardTab(tabName) {
  const allViews = [
    'admin-overview',
    'fleet-errors',
    'partner-clients',
    'client-portal',
    'licenses',
    'fleet',
    'audit',
    'organizations',
    'multichannel'
  ];

  allViews.forEach(v => {
    const viewEl = document.getElementById('view-tab-' + v);
    const btnEl = document.getElementById('nav-tab-' + v);
    const mobBtnEl = document.getElementById('mob-nav-tab-' + v);

    if (viewEl) {
      if (v === tabName) viewEl.classList.remove('hidden');
      else viewEl.classList.add('hidden');
    }

    if (btnEl) {
      if (v === tabName) {
        btnEl.className = 'px-3 py-1 rounded-md transition text-white bg-[#18181b] border border-white/[0.1] shadow-sm font-medium';
      } else {
        btnEl.className = 'px-3 py-1 rounded-md transition text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium';
      }
    }

    if (mobBtnEl) {
      if (v === tabName) {
        mobBtnEl.className = 'px-3 py-1.5 rounded-md transition text-white bg-[#18181b] border border-white/[0.1] font-medium whitespace-nowrap';
      } else {
        mobBtnEl.className = 'px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap';
      }
    }
  });

  const mobBtn = document.getElementById('mob-nav-tab-' + tabName);
  if (mobBtn) mobBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

  // Carga según pestaña seleccionada
  if (tabName === 'licenses') {
    if (typeof window.loadLicenses === 'function') window.loadLicenses();
    if (typeof window.loadFleetOverview === 'function') window.loadFleetOverview();
  } else if (tabName === 'fleet-errors') {
    if (typeof window.loadFleetErrors === 'function') window.loadFleetErrors();
  } else if (tabName === 'fleet') {
    if (typeof window.loadFleetHealthData === 'function') window.loadFleetHealthData();
  } else if (tabName === 'audit') {
    if (typeof window.loadAuditLogs === 'function') window.loadAuditLogs();
  } else if (tabName === 'organizations') {
    if (typeof window.loadOrganizations === 'function') window.loadOrganizations();
  } else if (tabName === 'multichannel') {
    if (typeof window.loadMultichannelData === 'function') window.loadMultichannelData();
  } else if (tabName === 'client-portal') {
    if (typeof window.loadClientPortal === 'function') window.loadClientPortal();
    const banner = document.getElementById('client-preview-superadmin-banner');
    if (banner) {
      if (window.currentUserRole === 'SUPERADMIN' || window.currentUserRole === 'ADMIN') {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  }
}

// Inicialización automática con Verificación Real de Identidad y Rol
window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutStatus = urlParams.get('checkout');
  const sessionId = urlParams.get('session_id');

  // Flujo Post-Pago de Stripe: canjear session_id por licencia y auto-login
  if (checkoutStatus === 'success' && sessionId) {
    if (typeof window.showToast === 'function') {
      window.showToast('Verificando tu compra con Stripe y activando tu licencia...', 'info');
    }
    try {
      const res = await fetch(`/api/v1/billing/session-license?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        if (typeof window.setSession === 'function') {
          window.setSession(data.token, 'TENANT_CLIENT', data.organizationId || 'org_default', data.email || 'Cliente');
        }

        // Limpiar URL para que no quede expuesta la sesión en el historial
        window.history.replaceState({}, document.title, window.location.pathname);

        if (typeof window.showDashboard === 'function') {
          window.showDashboard();
        }

        // Configurar y abrir modal de entrega de licencia
        const keyEl = document.getElementById('welcome-license-key');
        if (keyEl && data.licenseKey) {
          keyEl.innerText = data.licenseKey;
        }

        const modal = document.getElementById('modal-welcome-checkout');
        if (modal) {
          modal.classList.remove('hidden');
        }

        if (typeof window.showToast === 'function') {
          window.showToast('✓ ¡Suscripción y licencia activadas con éxito!', 'success');
        }
        return;
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast(data.error?.message || 'No se pudo validar la sesión de pago de Stripe', 'error');
        }
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast('Error de conexión al validar la sesión de pago con Stripe', 'error');
      }
    }
  }

  const urlKey = urlParams.get('key') || urlParams.get('licenseKey');
  if (urlKey) {
    if (typeof window.handleAutoLoginWithKey === 'function') {
      await window.handleAutoLoginWithKey(urlKey);
    }
    return;
  }

  const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
  if (token) {
    try {
      // Validar con la API Central el rol real y vigencia de la sesión
      const meRes = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user;
        if (user && user.role) {
          const verifiedRole = (user.role === 'ADMIN' || user.role === 'SUPERADMIN') ? 'SUPERADMIN' : user.role;
          window.currentAuthToken = token;
          window.currentUserRole = verifiedRole;
          window.currentOrgId = user.organizationId || 'org_default';
          localStorage.setItem('bentian_cloud_role', verifiedRole);
          localStorage.setItem('bentian_cloud_org', window.currentOrgId);
          if (user.sub) {
            localStorage.setItem('bentian_cloud_email', user.sub);
          }
          if (typeof window.showDashboard === 'function') {
            window.showDashboard();
          }
          return;
        }
      } else {
        // Token expirado o revocado: limpiar sesión
        localStorage.removeItem('bentian_cloud_token');
        localStorage.removeItem('bentian_cloud_role');
        window.currentAuthToken = '';
        if (typeof window.showLogin === 'function') window.showLogin();
        return;
      }
    } catch {
      // Fallback offline si no hay red inmediata
      if (typeof window.showDashboard === 'function') window.showDashboard();
      return;
    }
  } else {
    if (typeof window.showLogin === 'function') window.showLogin();
  }
});

// Exposición global
window.setupRoleNavigation = setupRoleNavigation;
window.switchDashboardTab = switchDashboardTab;
