/**
 * Bentian ERP Bridge — Dashboard Navigation & Role UI Module
 * Control de vistas por pestañas y menús adaptativos según rol (Superadmin, Reseller, Cliente).
 */

const _ACTIVE_TAB_CLS = 'px-3 py-1.5 rounded-lg transition text-white bg-indigo-600 border border-indigo-400/50 shadow-md shadow-indigo-600/25 font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1.5';
const _INACTIVE_TAB_CLS = 'px-2.5 py-1.5 rounded-lg transition text-zinc-200 hover:text-white hover:bg-white/[0.08] font-medium whitespace-nowrap cursor-pointer flex items-center gap-1.5';

function setupRoleNavigation(role) {
  const nav = document.getElementById('dashboard-nav');
  const mobNav = document.getElementById('mobile-tabs-container');
  const roleBadge = document.getElementById('top-role-badge');
  const orgLabel = document.getElementById('top-org-label');
  const ddRole = document.getElementById('dropdown-role-label');

  if (role === 'SUPERADMIN') {
    if (roleBadge) {
      roleBadge.innerText = 'SUPERADMIN GLOBAL';
      roleBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/25 text-purple-200 border border-purple-400/50 whitespace-nowrap';
    }
    if (orgLabel) orgLabel.innerText = 'Organización: Sistema Central Bentian';
    if (ddRole) ddRole.innerHTML = '<span class="w-2 h-2 rounded-full bg-purple-400"></span> Superadministrador Global';

    if (nav) {
      nav.classList.remove('hidden');
      nav.classList.add('md:flex');
      nav.innerHTML = `
        <button onclick="switchDashboardTab('admin-overview')" id="nav-tab-admin-overview" class="${_ACTIVE_TAB_CLS}">Finanzas & KPIs</button>
        <button onclick="switchDashboardTab('licenses')" id="nav-tab-licenses" class="${_INACTIVE_TAB_CLS}">Licencias</button>
        <button onclick="switchDashboardTab('organizations')" id="nav-tab-organizations" class="${_INACTIVE_TAB_CLS}"><span>🤝 Partners (25%)</span></button>
        <button onclick="switchDashboardTab('fleet')" id="nav-tab-fleet" class="${_INACTIVE_TAB_CLS}">Flota ERP</button>
        <button onclick="switchDashboardTab('fleet-errors')" id="nav-tab-fleet-errors" class="${_INACTIVE_TAB_CLS}"><span>Incidencias</span><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span></button>
        <button onclick="switchDashboardTab('multichannel')" id="nav-tab-multichannel" class="${_INACTIVE_TAB_CLS}"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>Webhooks</span></button>
        <div class="h-4 w-[1px] bg-white/[0.15] mx-0.5 shrink-0"></div>
        <button onclick="switchDashboardTab('partner-clients')" id="nav-tab-partner-clients" class="${_INACTIVE_TAB_CLS}" title="Previsualizar portal como Partner Instalador"><span>👁️ Partner</span></button>
        <button onclick="switchDashboardTab('client-portal')" id="nav-tab-client-portal" class="${_INACTIVE_TAB_CLS}" title="Previsualizar portal como cliente final"><span>👁️ Cliente</span></button>
        <button onclick="switchDashboardTab('audit')" id="nav-tab-audit" class="${_INACTIVE_TAB_CLS}" title="Logs de Auditoría">Auditoría</button>
      `;
    }

    if (mobNav) {
      mobNav.classList.remove('hidden');
      mobNav.innerHTML = `
        <button onclick="switchDashboardTab('admin-overview')" id="mob-nav-tab-admin-overview" class="${_ACTIVE_TAB_CLS}">Finanzas & KPIs</button>
        <button onclick="switchDashboardTab('licenses')" id="mob-nav-tab-licenses" class="${_INACTIVE_TAB_CLS}">Parque de Licencias</button>
        <button onclick="switchDashboardTab('organizations')" id="mob-nav-tab-organizations" class="${_INACTIVE_TAB_CLS}">🤝 Partners B2B (25%)</button>
        <button onclick="switchDashboardTab('fleet')" id="mob-nav-tab-fleet" class="${_INACTIVE_TAB_CLS}">Flota ERP</button>
        <button onclick="switchDashboardTab('fleet-errors')" id="mob-nav-tab-fleet-errors" class="${_INACTIVE_TAB_CLS}">Incidencias</button>
        <button onclick="switchDashboardTab('multichannel')" id="mob-nav-tab-multichannel" class="${_INACTIVE_TAB_CLS}">Webhooks</button>
        <button onclick="switchDashboardTab('partner-clients')" id="mob-nav-tab-partner-clients" class="${_INACTIVE_TAB_CLS}">👁️ Vista Partner</button>
        <button onclick="switchDashboardTab('client-portal')" id="mob-nav-tab-client-portal" class="${_INACTIVE_TAB_CLS}">👁️ Vista Cliente</button>
        <button onclick="switchDashboardTab('audit')" id="mob-nav-tab-audit" class="${_INACTIVE_TAB_CLS}">Auditoría</button>
      `;
    }

    switchDashboardTab('admin-overview');
    if (typeof window.loadAdminOverview === 'function') window.loadAdminOverview();
  } else if (role === 'RESELLER') {
    const partnerCode = localStorage.getItem('bentian_cloud_partner_code') || 'PT-PARTNER';
    if (roleBadge) {
      roleBadge.innerText = 'PARTNER INSTALADOR';
      roleBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 whitespace-nowrap';
    }
    if (orgLabel) orgLabel.innerText = `Partner: ${partnerCode}`;
    if (ddRole) ddRole.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span> Partner Autorizado Bentian';

    if (nav) {
      nav.classList.remove('hidden');
      nav.classList.add('md:flex');
      nav.innerHTML = `
        <button onclick="switchDashboardTab('partner-clients')" id="nav-tab-partner-clients" class="${_ACTIVE_TAB_CLS}">Mi Cartera Comercial</button>
        <button onclick="switchDashboardTab('licenses')" id="nav-tab-licenses" class="${_INACTIVE_TAB_CLS}">Licencias Emitidas</button>
      `;
    }

    if (mobNav) {
      mobNav.classList.remove('hidden');
      mobNav.innerHTML = `
        <button onclick="switchDashboardTab('partner-clients')" id="mob-nav-tab-partner-clients" class="${_ACTIVE_TAB_CLS}">Mi Cartera Comercial</button>
        <button onclick="switchDashboardTab('licenses')" id="mob-nav-tab-licenses" class="${_INACTIVE_TAB_CLS}">Licencias Emitidas</button>
      `;
    }

    switchDashboardTab('partner-clients');
    if (typeof window.loadPartnerClients === 'function') window.loadPartnerClients();
  } else {
    if (roleBadge) {
      roleBadge.innerText = 'CLIENTE MULTI-ERP';
      roleBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-200 border border-indigo-400/50 whitespace-nowrap';
    }
    if (orgLabel) orgLabel.innerText = 'Panel de Gestión y Licencias Factusol';
    if (ddRole) ddRole.innerHTML = '<span class="w-2 h-2 rounded-full bg-indigo-400"></span> Licencias Factusol Activas';

    if (nav) { nav.innerHTML = ''; nav.classList.add('hidden'); nav.classList.remove('md:flex'); }
    if (mobNav) { mobNav.innerHTML = ''; mobNav.classList.add('hidden'); }

    switchDashboardTab('client-portal');
    if (typeof window.loadClientPortal === 'function') window.loadClientPortal();
  }
}

function switchDashboardTab(tabName, skipAutoLoad) {
  const allViews = [
    'admin-overview', 'fleet-errors', 'partner-clients', 'client-portal',
    'licenses', 'fleet', 'audit', 'organizations', 'multichannel'
  ];

  allViews.forEach(v => {
    const viewEl = document.getElementById('view-tab-' + v);
    const btnEl = document.getElementById('nav-tab-' + v);
    const mobBtnEl = document.getElementById('mob-nav-tab-' + v);

    if (viewEl) viewEl.classList.toggle('hidden', v !== tabName);
    if (btnEl) btnEl.className = v === tabName ? _ACTIVE_TAB_CLS : _INACTIVE_TAB_CLS;
    if (mobBtnEl) mobBtnEl.className = v === tabName ? _ACTIVE_TAB_CLS : _INACTIVE_TAB_CLS;
  });

  const mobBtn = document.getElementById('mob-nav-tab-' + tabName);
  if (mobBtn) mobBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

  const isSuper = window.currentUserRole === 'SUPERADMIN' || window.currentUserRole === 'ADMIN';
  if (tabName === 'partner-clients') {
    const ptBanner = document.getElementById('partner-preview-superadmin-banner');
    if (ptBanner) ptBanner.classList.toggle('hidden', !isSuper);
  } else if (tabName === 'client-portal') {
    const banner = document.getElementById('client-preview-superadmin-banner');
    if (banner) banner.classList.toggle('hidden', !isSuper);
  }

  if (skipAutoLoad) return;

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
    if (typeof window.loadAdminPartners === 'function') window.loadAdminPartners();
    if (typeof window.loadOrganizations === 'function') window.loadOrganizations();
  } else if (tabName === 'multichannel') {
    if (typeof window.loadMultichannelData === 'function') window.loadMultichannelData();
  } else if (tabName === 'partner-clients') {
    if (typeof window.loadPartnerClients === 'function') window.loadPartnerClients();
  } else if (tabName === 'client-portal') {
    if (typeof window.loadClientPortal === 'function') window.loadClientPortal();
  }
}

window.setupRoleNavigation = setupRoleNavigation;
window.switchDashboardTab = switchDashboardTab;
