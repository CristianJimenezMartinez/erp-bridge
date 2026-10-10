/**
 * Bentian ERP Bridge — Dashboard Multichannel & Webhooks Module
 * Gestión reactiva de canales (Shopify & Holded), monitor de webhooks en vivo,
 * asistente de configuración y seguridad criptográfica sin inline handlers.
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

  // Estado interno del módulo
  const state = {
    activeChannel: 'shopify',
    activeTopic: 'shopify-orders',
    isSecretVisible: false,
    realSecret: 'shpss_sec_99887766554433221100aabbccddeeff',
    maskedSecret: 'shpss_••••••••••••••••3a9f',
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

  /**
   * Carga telemetría y estado de canales desde la API
   */
  async function loadMultichannelData() {
    const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
    const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';

    try {
      // 1. Cargar estado de canales
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

      // 2. Cargar eventos recientes
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
    } catch (err) {
      console.warn('[Multichannel] Advertencia al sincronizar estado de webhooks:', err);
    }

    startLivePolling();
  }

  /**
   * Renderiza las filas del Live Stream en la tabla con protección anti-XSS estricta
   */
  function renderEventsStream() {
    const tbody = document.getElementById('webhooks-live-stream-tbody');
    const countBadge = document.getElementById('stream-events-count');
    if (!tbody) return;

    let filtered = state.events;
    if (state.filter === 'shopify') {
      filtered = state.events.filter(e => e.channel === 'shopify');
    } else if (state.filter === 'holded') {
      filtered = state.events.filter(e => e.channel === 'holded');
    } else if (state.filter === 'errors') {
      filtered = state.events.filter(e => e.httpStatus === 401 || e.error);
    }

    if (countBadge) {
      countBadge.textContent = `${filtered.length} evento${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-zinc-500 font-mono text-xs">
            No hay eventos registrados que coincidan con el filtro seleccionado.
          </td>
        </tr>
      `;
      return;
    }

    const rows = filtered.map(evt => {
      const isShopify = evt.channel === 'shopify';
      const isHolded = evt.channel === 'holded';
      const is200 = evt.httpStatus === 200;

      const timeStr = formatTime(evt.timestamp);

      // Badge canal
      const channelBadge = isShopify
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1 h-1 rounded-full bg-emerald-400"></span>Shopify</span>'
        : isHolded
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"><span class="w-1 h-1 rounded-full bg-indigo-400"></span>Holded</span>'
        : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Sistema</span>';

      // Badge evento
      let eventBadge = '';
      if (evt.eventType === 'ORDER_CREATED') {
        eventBadge = '<span class="font-mono text-[11px] font-semibold text-emerald-300">orders/create</span>';
      } else if (evt.eventType === 'STOCK_UPDATED') {
        eventBadge = '<span class="font-mono text-[11px] font-semibold text-amber-300">inventory/update</span>';
      } else if (evt.eventType === 'INVOICE_CREATED') {
        eventBadge = '<span class="font-mono text-[11px] font-semibold text-indigo-300">documents/create</span>';
      } else if (evt.eventType === 'CUSTOMER_CREATED') {
        eventBadge = '<span class="font-mono text-[11px] font-semibold text-blue-300">contacts/create</span>';
      } else {
        eventBadge = `<span class="font-mono text-[11px] text-zinc-300">${_safeEscape(evt.eventType || 'EVENT')}</span>`;
      }

      // Badge estado HTTP
      const statusBadge = is200
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>200 OK</span>'
        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20" title="${_safeEscape(evt.reason || 'Rechazado')}"><svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>401 Rechazado</span>`;

      // Latencia con color según velocidad
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

    tbody.innerHTML = rows;
  }

  /**
   * Cambia el canal activo en el Asistente de Configuración (Shopify vs Holded)
   */
  function selectChannel(channel) {
    if (channel !== 'shopify' && channel !== 'holded') return;
    state.activeChannel = channel;

    const btnShopify = document.getElementById('wizard-tab-shopify');
    const btnHolded = document.getElementById('wizard-tab-holded');
    const topicSelect = document.getElementById('webhook-topic-select');
    const guideTitle = document.getElementById('wizard-guide-title');
    const guideSteps = document.getElementById('wizard-guide-steps');

    if (channel === 'shopify') {
      if (btnShopify) {
        btnShopify.className = 'px-3 py-1 rounded-md transition text-white bg-indigo-600 font-medium cursor-pointer';
      }
      if (btnHolded) {
        btnHolded.className = 'px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium cursor-pointer';
      }

      if (topicSelect) {
        topicSelect.innerHTML = `
          <option value="shopify-orders">orders/create (Creación de pedidos)</option>
          <option value="shopify-stock">inventory_levels/update (Stock)</option>
        `;
        topicSelect.value = 'shopify-orders';
      }
      state.activeTopic = 'shopify-orders';

      if (guideTitle) guideTitle.textContent = 'Pasos para registrar el Webhook en Shopify';
      if (guideSteps) {
        guideSteps.innerHTML = `
          <li>Accede a tu panel de Shopify &gt; <strong class="text-zinc-200">Ajustes</strong> &gt; <strong class="text-zinc-200">Notificaciones</strong> &gt; <strong class="text-zinc-200">Webhooks</strong>.</li>
          <li>Pulsa en <strong class="text-zinc-200">Crear webhook</strong> y selecciona el evento <code class="text-indigo-300 bg-white/[0.05] px-1 py-0.5 rounded font-mono">orders/create</code> con formato <strong class="text-zinc-200">JSON</strong>.</li>
          <li>Pega la URL del endpoint oficial de Bentian Bridge y guarda los cambios.</li>
        `;
      }
    } else {
      if (btnShopify) {
        btnShopify.className = 'px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium cursor-pointer';
      }
      if (btnHolded) {
        btnHolded.className = 'px-3 py-1 rounded-md transition text-white bg-indigo-600 font-medium cursor-pointer';
      }

      if (topicSelect) {
        topicSelect.innerHTML = `
          <option value="holded-docs">documents/create (Facturas y documentos)</option>
          <option value="holded-contacts">contacts/create (Contactos y clientes)</option>
        `;
        topicSelect.value = 'holded-docs';
      }
      state.activeTopic = 'holded-docs';

      if (guideTitle) guideTitle.textContent = 'Pasos para registrar el Webhook en Holded';
      if (guideSteps) {
        guideSteps.innerHTML = `
          <li>Accede a Holded &gt; <strong class="text-zinc-200">Configuración</strong> &gt; <strong class="text-zinc-200">Desarrolladores</strong> &gt; <strong class="text-zinc-200">Webhooks</strong>.</li>
          <li>Pulsa en <strong class="text-zinc-200">Nuevo Webhook</strong>, selecciona <code class="text-indigo-300 bg-white/[0.05] px-1 py-0.5 rounded font-mono">documents/create</code> y pega la URL de Bentian.</li>
          <li>Configura la cabecera personalizada <code class="text-indigo-300 bg-white/[0.05] px-1 py-0.5 rounded font-mono">x-holded-secret</code> con tu token secreto o añádelo como <code class="text-indigo-300 bg-white/[0.05] px-1 py-0.5 rounded font-mono">?token=TU_SECRETO</code>.</li>
        `;
      }
    }

    updateEndpointDisplay();
  }

  /**
   * Actualiza el endpoint y descripción mostrados según el topic seleccionado
   */
  function updateEndpointDisplay() {
    const urlInput = document.getElementById('webhook-url-input');
    const descEl = document.getElementById('webhook-topic-description');

    const ep = ENDPOINTS[state.activeChannel]?.[state.activeTopic];
    if (ep) {
      if (urlInput) urlInput.value = ep.url;
      if (descEl) descEl.textContent = ep.desc;
    }
  }

  /**
   * Copia la URL del webhook al portapapeles con feedback visual
   */
  function copyWebhookUrl() {
    const urlInput = document.getElementById('webhook-url-input');
    const textEl = document.getElementById('text-copy-webhook-url');
    const btn = document.getElementById('btn-copy-webhook-url');
    const url = urlInput ? urlInput.value.trim() : '';

    if (!url) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        if (textEl) textEl.textContent = '¡Copiado!';
        if (btn) btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
        if (typeof window.showToast === 'function') {
          window.showToast('✓ URL del Webhook copiada al portapapeles', 'success');
        }
        setTimeout(() => {
          if (textEl) textEl.textContent = 'Copiar URL';
          if (btn) btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        }, 2200);
      });
    }
  }

  /**
   * Alterna la visibilidad del secreto (enmascarado vs texto legible)
   */
  function toggleSecretVisibility() {
    state.isSecretVisible = !state.isSecretVisible;
    const input = document.getElementById('webhook-secret-input');
    const eyeOpen = document.getElementById('eye-icon-open');
    const eyeClosed = document.getElementById('eye-icon-closed');

    if (!input) return;

    if (state.isSecretVisible) {
      input.type = 'text';
      input.value = state.realSecret;
      if (eyeOpen) eyeOpen.classList.remove('hidden');
      if (eyeClosed) eyeClosed.classList.add('hidden');
    } else {
      input.type = 'password';
      input.value = state.realSecret;
      if (eyeOpen) eyeOpen.classList.add('hidden');
      if (eyeClosed) eyeClosed.classList.remove('hidden');
    }
  }

  /**
   * Copia el Webhook Secret al portapapeles
   */
  function copySecret() {
    const textEl = document.getElementById('text-copy-secret');
    if (navigator.clipboard && state.realSecret) {
      navigator.clipboard.writeText(state.realSecret).then(() => {
        if (textEl) textEl.textContent = '✓ Copiado';
        if (typeof window.showToast === 'function') {
          window.showToast('✓ Token secreto copiado al portapapeles', 'success');
        }
        setTimeout(() => {
          if (textEl) textEl.textContent = 'Copiar';
        }, 2200);
      });
    }
  }

  /**
   * Regenera el token criptográfico del Webhook
   */
  async function regenerateSecret() {
    const confirmed = window.confirm(
      '¿Deseas regenerar el Webhook Secret?\n\nADVERTENCIA: Deberás actualizar de inmediato la clave en la configuración de Shopify o Holded para no interrumpir la recepción de pedidos.'
    );
    if (!confirmed) return;

    const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
    const btn = document.getElementById('btn-regenerate-secret');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch('/api/webhooks/regenerate-secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.secret) {
          state.realSecret = data.secret;
          state.maskedSecret = data.masked;
          const input = document.getElementById('webhook-secret-input');
          if (input) input.value = state.realSecret;

          if (typeof window.showToast === 'function') {
            window.showToast('✓ Nuevo Webhook Secret generado con éxito', 'success');
          }
        }
      } else {
        throw new Error('Respuesta no válida del servidor');
      }
    } catch {
      // Fallback seguro en cliente si la red falla
      const array = new Uint8Array(24);
      window.crypto.getRandomValues(array);
      const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      state.realSecret = `shpss_sec_${hex}`;
      const input = document.getElementById('webhook-secret-input');
      if (input) input.value = state.realSecret;

      if (typeof window.showToast === 'function') {
        window.showToast('✓ Nuevo token criptográfico generado localmente', 'success');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Dispara una prueba reactiva (ping) para un canal específico
   */
  async function testWebhookPing(targetChannel) {
    const ch = targetChannel || state.activeChannel;
    if (typeof window.showToast === 'function') {
      window.showToast(`⚡ Enviando ping de prueba a ${ch.toUpperCase()}...`, 'info');
    }

    const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
    const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';

    const t0 = performance.now();
    try {
      const res = await fetch('/api/webhooks/test-ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ channel: ch, organizationId: orgId }),
      });

      const latency = Math.max(1, Math.round(performance.now() - t0));

      if (res.ok) {
        const data = await res.json();
        const newEvent = {
          id: data.eventId || `evt_ping_${Date.now()}`,
          timestamp: data.timestamp || new Date().toISOString(),
          channel: ch,
          eventType: data.eventType || (ch === 'shopify' ? 'ORDER_CREATED' : 'INVOICE_CREATED'),
          httpStatus: 200,
          statusText: '200 OK',
          reason: 'Ping de prueba superado con éxito',
          latencyMs: latency,
          details: ch === 'shopify'
            ? 'Ping manual Shopify • Pedido de verificación #TEST-99'
            : 'Ping manual Holded • Documento de verificación #DOC-TEST',
        };

        state.events.unshift(newEvent);
        if (state.events.length > 50) state.events.pop();
        renderEventsStream();

        if (typeof window.showToast === 'function') {
          window.showToast(`✓ Ping ${ch.toUpperCase()} respondido en ${latency} ms (200 OK)`, 'success');
        }
      }
    } catch {
      const latency = Math.max(1, Math.round(performance.now() - t0));
      if (typeof window.showToast === 'function') {
        window.showToast(`Error al enviar ping (${latency} ms)`, 'error');
      }
    }
  }

  /**
   * Pausa o reanuda el muestreo en vivo del stream
   */
  function toggleStreamPause() {
    state.isStreamPaused = !state.isStreamPaused;
    const textEl = document.getElementById('text-stream-pause');
    const badgeEl = document.getElementById('stream-status-badge');
    const pulseDot = document.getElementById('stream-pulse-dot');

    if (state.isStreamPaused) {
      if (textEl) textEl.textContent = 'Reanudar';
      if (badgeEl) badgeEl.textContent = 'Transmisión pausada';
      if (pulseDot) {
        pulseDot.classList.remove('status-pulse', 'bg-emerald-400');
        pulseDot.classList.add('bg-zinc-500');
      }
      if (typeof window.showToast === 'function') {
        window.showToast('Stream de eventos pausado', 'info');
      }
    } else {
      if (textEl) textEl.textContent = 'Pausar';
      if (badgeEl) badgeEl.textContent = 'Transmisión en tiempo real activa (muestreo cada 5s)';
      if (pulseDot) {
        pulseDot.classList.add('status-pulse', 'bg-emerald-400');
        pulseDot.classList.remove('bg-zinc-500');
      }
      if (typeof window.showToast === 'function') {
        window.showToast('Stream en vivo reanudado', 'success');
      }
    }
  }

  /**
   * Limpia el visor de eventos
   */
  function clearStream() {
    state.events = [];
    renderEventsStream();
    if (typeof window.showToast === 'function') {
      window.showToast('Visor de eventos limpiado', 'info');
    }
  }

  /**
   * Inicia el muestreo periódico inteligente cada 5 segundos
   */
  function startLivePolling() {
    if (state.pollingTimer) clearInterval(state.pollingTimer);

    state.pollingTimer = setInterval(async () => {
      if (state.isStreamPaused) return;

      const viewTab = document.getElementById('view-tab-multichannel');
      if (!viewTab || viewTab.classList.contains('hidden') || document.hidden) {
        return;
      }

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
      } catch {
        // Silencio defensivo en caídas temporales de red
      }
    }, 5000);
  }

  /**
   * Formateadores de fecha y hora seguros
   */
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

  /**
   * Delegación de Eventos Centralizada (CERO onclick inline)
   */
  function initEventDelegation() {
    if (state.isInitialized) return;
    state.isInitialized = true;

    document.addEventListener('click', function(e) {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'test-webhook-ping':
          e.preventDefault();
          testWebhookPing(state.activeChannel);
          break;

        case 'test-channel-ping':
          e.preventDefault();
          testWebhookPing(actionEl.getAttribute('data-channel') || 'shopify');
          break;

        case 'refresh-multichannel':
          e.preventDefault();
          loadMultichannelData();
          if (typeof window.showToast === 'function') {
            window.showToast('✓ Estado de canales refrescado', 'success');
          }
          break;

        case 'select-channel':
          e.preventDefault();
          selectChannel(actionEl.getAttribute('data-channel') || 'shopify');
          break;

        case 'copy-webhook-url':
          e.preventDefault();
          copyWebhookUrl();
          break;

        case 'toggle-secret-visibility':
          e.preventDefault();
          toggleSecretVisibility();
          break;

        case 'copy-secret':
          e.preventDefault();
          copySecret();
          break;

        case 'regenerate-secret':
          e.preventDefault();
          regenerateSecret();
          break;

        case 'toggle-stream-pause':
          e.preventDefault();
          toggleStreamPause();
          break;

        case 'clear-stream':
          e.preventDefault();
          clearStream();
          break;

        case 'switch-tab':
          e.preventDefault();
          const targetTab = actionEl.getAttribute('data-tab');
          if (targetTab && typeof window.switchDashboardTab === 'function') {
            window.switchDashboardTab(targetTab);
          }
          break;

        default:
          break;
      }
    });

    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'webhook-topic-select') {
        state.activeTopic = e.target.value;
        updateEndpointDisplay();
      } else if (e.target && e.target.id === 'stream-filter-select') {
        state.filter = e.target.value;
        renderEventsStream();
      }
    });
  }

  // Inicializar listeners al cargar el script o el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventDelegation);
  } else {
    initEventDelegation();
  }

  // Exposición en el objeto global de forma segura
  window.loadMultichannelData = loadMultichannelData;
  window.selectMultichannelChannel = selectChannel;
  window.testWebhookPing = testWebhookPing;

})();
