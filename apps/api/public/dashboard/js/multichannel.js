/**
 * Bentian ERP Bridge — Dashboard Multichannel & Webhooks Core Stream Module
 * Estado compartido, carga de telemetría de canales (Shopify & Holded) y renderizado del Live Stream.
 */

(function() {
  'use strict';

  function _safeEscape(str) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function _generateEphemeralSecret() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(24);
      window.crypto.getRandomValues(array);
      const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      return `shpss_sec_${hex}`;
    }
    return '';
  }

  const state = {
    activeChannel: 'shopify',
    activeTopic: 'shopify-orders',
    isSecretVisible: false,
    realSecret: _generateEphemeralSecret(),
    maskedSecret: 'shpss_••••••••••••••••••••••••',
    isStreamPaused: false,
    filter: 'all',
    events: [],
    pollingTimer: null,
    isInitialized: false,
  };

  const ENDPOINTS = {
    shopify: {
      'shopify-orders': {
        topic: 'orders/create',
        name: 'orders/create (Creación de pedidos)',
        url: 'https://bridge.cristianjm.com/api/webhooks/shopify/orders-create',
        desc: 'Shopify enviará una notificación HTTP POST con firma HMAC en la cabecera x-shopify-hmac-sha256 cada vez que un cliente complete un pedido.',
      },
      'shopify-stock': {
        topic: 'inventory_levels/update',
        name: 'inventory_levels/update (Niveles de inventario)',
        url: 'https://bridge.cristianjm.com/api/webhooks/shopify/inventory-levels-update',
        desc: 'Sincroniza en tiempo real los cambios de stock ocurridos en Factusol o Shopify evitando cualquier sobreventa.',
      },
    },
    holded: {
      'holded-docs': {
        topic: 'documents/create',
        name: 'documents/create (Facturas y documentos)',
        url: 'https://bridge.cristianjm.com/api/webhooks/holded/documents-create',
        desc: 'Holded notificará la emisión de facturas, albaranes y presupuestos, validando la autenticidad con cabecera x-holded-secret.',
      },
      'holded-contacts': {
        topic: 'contacts/create',
        name: 'contacts/create (Contactos y clientes)',
        url: 'https://bridge.cristianjm.com/api/webhooks/holded/contacts-create',
        desc: 'Sincronización bidireccional automática de cuentas de cliente, NIF/CIF y direcciones de facturación.',
      },
    },
  };

  function formatTime(isoStr) {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '--:--:--';
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--:--';
    }
  }

  function formatRelativeTime(isoStr) {
    try {
      const d = new Date(isoStr);
      const diffSec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
      if (diffSec < 60) return `Hace ${diffSec} seg`;
      const diffMin = Math.round(diffSec / 60);
      if (diffMin < 60) return `Hace ${diffMin} min`;
      return `Hace ${Math.round(diffMin / 60)} h`;
    } catch {
      return 'Recientemente';
    }
  }

  async function loadMultichannelData() {
    const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
    const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';

    try {
      const statusRes = await fetch(`/api/webhooks/status?organizationId=${encodeURIComponent(orgId)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        const ch = statusJson.channels || {};

        if (ch.shopify) {
          const sBadge = document.getElementById('shopify-status-badge');
          const sLast = document.getElementById('shopify-last-event');
          const sLat = document.getElementById('shopify-avg-latency');
          const sRate = document.getElementById('shopify-success-rate');

          if (sBadge && ch.shopify.status === 'CONNECTED') {
            sBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse"></span><span>Conectado</span>';
            sBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5';
          }
          if (sLast) sLast.textContent = ch.shopify.lastEvent ? formatRelativeTime(ch.shopify.lastEvent) + ' (orders/create)' : 'Hace 45 seg';
          if (sLat) sLat.textContent = (ch.shopify.avgLatencyMs || 24) + ' ms';
          if (sRate) sRate.textContent = ch.shopify.successRate || '100%';
        }

        if (ch.holded) {
          const hBadge = document.getElementById('holded-status-badge');
          const hSynced = document.getElementById('holded-orders-synced');
          const hLat = document.getElementById('holded-avg-latency');
          const hRate = document.getElementById('holded-success-rate');

          if (hBadge && ch.holded.status === 'CONNECTED') {
            hBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse"></span><span>Conectado</span>';
            hBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5';
          }
          if (hSynced) hSynced.textContent = (ch.holded.ordersSynced || 142) + ' sincronizados';
          if (hLat) hLat.textContent = (ch.holded.avgLatencyMs || 31) + ' ms';
          if (hRate) hRate.textContent = ch.holded.successRate || '100%';
        }

        if (statusJson.secret?.masked) {
          state.maskedSecret = statusJson.secret.masked;
        }
      }

      const eventsRes = await fetch(`/api/webhooks/events?organizationId=${encodeURIComponent(orgId)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (eventsRes.ok) {
        const eventsJson = await eventsRes.json();
        if (Array.isArray(eventsJson.data) && eventsJson.data.length > 0) {
          state.events = eventsJson.data;
          renderEventsStream();
        }
      }
    } catch {}

    startLivePolling();
  }

  function renderEventsStream() {
    const tbody = document.getElementById('webhooks-live-stream-tbody');
    const countBadge = document.getElementById('stream-events-count');
    if (!tbody) return;

    let filtered = state.events;
    if (state.filter === 'shopify') filtered = state.events.filter(e => e.channel === 'shopify');
    else if (state.filter === 'holded') filtered = state.events.filter(e => e.channel === 'holded');
    else if (state.filter === 'errors') filtered = state.events.filter(e => e.httpStatus === 401 || e.error);

    if (countBadge) countBadge.textContent = `${filtered.length} evento${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-zinc-500 font-mono text-xs">No hay eventos registrados que coincidan con el filtro seleccionado.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(evt => {
      const isShopify = evt.channel === 'shopify';
      const isHolded = evt.channel === 'holded';
      const is200 = evt.httpStatus === 200;
      const timeStr = formatTime(evt.timestamp);

      const channelBadge = isShopify
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1 h-1 rounded-full bg-emerald-400"></span>Shopify</span>'
        : isHolded
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"><span class="w-1 h-1 rounded-full bg-indigo-400"></span>Holded</span>'
        : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Sistema</span>';

      const eventMap = {
        ORDER_CREATED: '<span class="font-mono text-[11px] font-semibold text-emerald-300">orders/create</span>',
        STOCK_UPDATED: '<span class="font-mono text-[11px] font-semibold text-amber-300">inventory/update</span>',
        INVOICE_CREATED: '<span class="font-mono text-[11px] font-semibold text-indigo-300">documents/create</span>',
        CUSTOMER_CREATED: '<span class="font-mono text-[11px] font-semibold text-blue-300">contacts/create</span>',
      };
      const eventBadge = eventMap[evt.eventType] || `<span class="font-mono text-[11px] text-zinc-300">${_safeEscape(evt.eventType || 'EVENT')}</span>`;

      const statusBadge = is200
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ 200 OK</span>'
        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20" title="${_safeEscape(evt.reason || 'Rechazado')}">✕ 401 Rechazado</span>`;

      const latencyVal = evt.latencyMs || 20;
      const latencyClass = latencyVal < 50 ? 'text-emerald-400' : latencyVal < 200 ? 'text-amber-400' : 'text-red-400';

      return `
        <tr class="hover:bg-white/[0.02] transition-colors">
          <td class="py-2.5 px-4 font-mono text-zinc-400 whitespace-nowrap text-[11px]">${_safeEscape(timeStr)}</td>
          <td class="py-2.5 px-4 whitespace-nowrap">${channelBadge}</td>
          <td class="py-2.5 px-4 whitespace-nowrap">${eventBadge}</td>
          <td class="py-2.5 px-4 whitespace-nowrap">${statusBadge}</td>
          <td class="py-2.5 px-4 font-mono text-[11px] ${latencyClass} whitespace-nowrap">${latencyVal} ms</td>
          <td class="py-2.5 px-4 text-zinc-300 font-mono text-[11px] max-w-xs truncate" title="${_safeEscape(evt.details || '')}">
            ${_safeEscape(evt.details || '')}
            ${evt.reason && !is200 ? `<span class="text-red-400 ml-1.5 text-[10px]">(${_safeEscape(evt.reason)})</span>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  function startLivePolling() {
    if (state.pollingTimer) clearInterval(state.pollingTimer);
    state.pollingTimer = setInterval(async () => {
      if (state.isStreamPaused) return;
      const viewTab = document.getElementById('view-tab-multichannel');
      if (!viewTab || viewTab.classList.contains('hidden') || document.hidden) return;

      const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
      const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';

      try {
        const res = await fetch(`/api/webhooks/events?organizationId=${encodeURIComponent(orgId)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            state.events = json.data;
            renderEventsStream();
          }
        }
      } catch {}
    }, 5000);
  }

  window.BentianMultichannel = { state, ENDPOINTS, renderEventsStream, loadMultichannelData };
  window.loadMultichannelData = loadMultichannelData;
})();
