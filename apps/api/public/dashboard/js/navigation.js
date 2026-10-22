/**
 * Bentian ERP Bridge — Dashboard Navigation & Role UI Module
 * Control de vistas por pestañas y menús adaptativos según rol (Superadmin, Reseller, Cliente).
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
        <button onclick="switchDashboardTab('organizations')" id="nav-tab-organizations" class="px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium flex items-center gap-1.5"><span>🤝 Partners B2B (25%)</span></button>
        <button onclick="switchDashboardTab('fleet')" id="nav-tab-fleet" class="px-2.5 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium">Flota ERP</button>
        <button onclick="switchDashboardTab('fleet-errors')" id="nav-tab-fleet-errors" class="px-2.5 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium flex items-center gap-1.5"><span>Incidencias</span><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span></button>
        <button onclick="switchDashboardTab('multichannel')" id="nav-tab-multichannel" class="px-2.5 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>Webhooks</span></button>
        <div class="h-4 w-[1px] bg-white/[0.08] mx-0.5"></div>
        <button onclick="switchDashboardTab('partner-clients')" id="nav-tab-partner-clients" class="px-2.5 py-1 rounded-md transition text-emerald-300 hover:text-white text-[11px] font-medium flex items-center gap-1 border border-dashed border-emerald-500/30 hover:border-emerald-400/50" title="Previsualizar portal como Partner Instalador"><span>👁️ Vista Partner</span></button>
        <button onclick="switchDashboardTab('client-portal')" id="nav-tab-client-portal" class="px-2.5 py-1 rounded-md transition text-indigo-300 hover:text-white text-[11px] font-medium flex items-center gap-1 border border-dashed border-indigo-500/30 hover:border-indigo-400/50" title="Previsualizar portal como cliente final"><span>👁️ Vista Cliente</span></button>
        <button onclick="switchDashboardTab('audit')" id="nav-tab-audit" class="px-2 py-1 rounded-md transition text-zinc-400 hover:text-white text-[11px] font-medium" title="Logs de Auditoría">Auditoría</button>
      `;
    }

    if (mobNav) {
      mobNav.classList.remove('hidden');
      mobNav.innerHTML = `
        <button onclick="switchDashboardTab('admin-overview')" id="mob-nav-tab-admin-overview" class="px-3 py-1.5 rounded-md transition text-white bg-[#18181b] font-medium whitespace-nowrap">Finanzas & KPIs</button>
        <button onclick="switchDashboardTab('licenses')" id="mob-nav-tab-licenses" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">Parque de Licencias</button>
        <button onclick="switchDashboardTab('organizations')" id="mob-nav-tab-organizations" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">🤝 Partners B2B (25%)</button>
        <button onclick="switchDashboardTab('fleet')" id="mob-nav-tab-fleet" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">Flota ERP</button>
        <button onclick="switchDashboardTab('fleet-errors')" id="mob-nav-tab-fleet-errors" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">Diagnóstico & Incidencias</button>
        <button onclick="switchDashboardTab('multichannel')" id="mob-nav-tab-multichannel" class="px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap">Canales & Webhooks</button>
        <button onclick="switchDashboardTab('partner-clients')" id="mob-nav-tab-partner-clients" class="px-2.5 py-1.5 rounded-md transition text-emerald-300 hover:text-white font-medium whitespace-nowrap text-[11px] border border-dashed border-emerald-500/30">👁️ Vista Partner</button>
        <button onclick="switchDashboardTab('client-portal')" id="mob-nav-tab-client-portal" class="px-2.5 py-1.5 rounded-md transition text-indigo-300 hover:text-white font-medium whitespace-nowrap text-[11px] border border-dashed border-indigo-500/30">👁️ Vista Cliente</button>
        <button onclick="switchDashboardTab('audit')" id="mob-nav-tab-audit" class="px-2.5 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap text-[11px]">Auditoría</button>
      `;
    }

    switchDashboardTab('admin-overview');
    if (typeof window.loadAdminOverview === 'function') window.loadAdminOverview();
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
    if (typeof window.loadPartnerClients === 'function') window.loadPartnerClients();
  } else {
    if (roleBadge) {
      roleBadge.innerText = 'CLIENTE MULTI-ERP';
      roleBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    }
    if (orgLabel) orgLabel.innerText = 'Panel de Gestión y Licencias Factusol';
    if (ddRole) ddRole.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Licencias Factusol Activas';

    if (nav) { nav.innerHTML = ''; nav.classList.add('hidden'); nav.classList.remove('md:flex'); }
    if (mobNav) { mobNav.innerHTML = ''; mobNav.classList.add('hidden'); }

    switchDashboardTab('client-portal');
    if (typeof window.loadClientPortal === 'function') window.loadClientPortal();
  }
}

function switchDashboardTab(tabName) {
  const allViews = [
    'admin-overview', 'fleet-errors', 'partner-clients', 'client-portal',
    'licenses', 'fleet', 'audit', 'organizations', 'multichannel'
  ];

  allViews.forEach(v => {
    const viewEl = document.getElementById('view-tab-' + v);
    const btnEl = document.getElementById('nav-tab-' + v);
    const mobBtnEl = document.getElementById('mob-nav-tab-' + v);

    if (viewEl) viewEl.classList.toggle('hidden', v !== tabName);
    if (btnEl) {
      btnEl.className = v === tabName
        ? 'px-3 py-1 rounded-md transition text-white bg-[#18181b] border border-white/[0.1] shadow-sm font-medium'
        : 'px-3 py-1 rounded-md transition text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium';
    }
    if (mobBtnEl) {
      mobBtnEl.className = v === tabName
        ? 'px-3 py-1.5 rounded-md transition text-white bg-[#18181b] border border-white/[0.1] font-medium whitespace-nowrap'
        : 'px-3 py-1.5 rounded-md transition text-zinc-400 hover:text-white font-medium whitespace-nowrap';
    }
  });

  const mobBtn = document.getElementById('mob-nav-tab-' + tabName);
  if (mobBtn) mobBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

  const isSuper = window.currentUserRole === 'SUPERADMIN' || window.currentUserRole === 'ADMIN';
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
    const ptBanner = document.getElementById('partner-preview-superadmin-banner');
    if (ptBanner) ptBanner.classList.toggle('hidden', !isSuper);
  } else if (tabName === 'client-portal') {
    if (typeof window.loadClientPortal === 'function') window.loadClientPortal();
    const banner = document.getElementById('client-preview-superadmin-banner');
    if (banner) banner.classList.toggle('hidden', !isSuper);
  }
}

window.setupRoleNavigation = setupRoleNavigation;
window.switchDashboardTab = switchDashboardTab;
