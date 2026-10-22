/**
 * Bentian ERP Bridge — Dashboard Multichannel Wizard, Secret & Actions Module
 * Asistente de configuración de webhooks, gestión criptográfica del secreto y delegación de eventos.
 */

(function() {
  'use strict';

  function _mc() {
    return window.BentianMultichannel || { state: {}, ENDPOINTS: {}, renderEventsStream: function() {}, loadMultichannelData: function() {} };
  }

  function updateEndpointDisplay() {
    const { state, ENDPOINTS } = _mc();
    const urlInput = document.getElementById('webhook-url-input');
    const descEl = document.getElementById('webhook-topic-description');
    const ep = ENDPOINTS[state.activeChannel]?.[state.activeTopic];
    if (ep) {
      if (urlInput) urlInput.value = ep.url;
      if (descEl) descEl.textContent = ep.desc;
    }
  }

  function selectChannel(channel) {
    if (channel !== 'shopify' && channel !== 'holded') return;
    const { state } = _mc();
    state.activeChannel = channel;

    const btnShopify = document.getElementById('wizard-tab-shopify');
    const btnHolded = document.getElementById('wizard-tab-holded');
    const topicSelect = document.getElementById('webhook-topic-select');
    const guideTitle = document.getElementById('wizard-guide-title');
    const guideSteps = document.getElementById('wizard-guide-steps');
    const isShop = channel === 'shopify';

    if (btnShopify) btnShopify.className = isShop ? 'px-3 py-1 rounded-md transition text-white bg-indigo-600 font-medium cursor-pointer' : 'px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium cursor-pointer';
    if (btnHolded) btnHolded.className = !isShop ? 'px-3 py-1 rounded-md transition text-white bg-indigo-600 font-medium cursor-pointer' : 'px-3 py-1 rounded-md transition text-zinc-400 hover:text-white font-medium cursor-pointer';

    if (isShop) {
      if (topicSelect) {
        topicSelect.innerHTML = `<option value="shopify-orders">orders/create (Creación de pedidos)</option><option value="shopify-stock">inventory_levels/update (Stock)</option>`;
        topicSelect.value = 'shopify-orders';
      }
      state.activeTopic = 'shopify-orders';
      if (guideTitle) guideTitle.textContent = 'Pasos para registrar el Webhook en Shopify';
      if (guideSteps) {
        guideSteps.innerHTML = `<li>Accede a tu panel de Shopify &gt; <strong class="text-zinc-200">Ajustes</strong> &gt; <strong class="text-zinc-200">Notificaciones</strong> &gt; <strong class="text-zinc-200">Webhooks</strong>.</li><li>Pulsa en <strong class="text-zinc-200">Crear webhook</strong> y selecciona el evento <code class="text-indigo-300 bg-white/[0.05] px-1 py-0.5 rounded font-mono">orders/create</code> con formato <strong class="text-zinc-200">JSON</strong>.</li><li>Pega la URL del endpoint oficial de Bentian Bridge y guarda los cambios.</li>`;
      }
    } else {
      if (topicSelect) {
        topicSelect.innerHTML = `<option value="holded-docs">documents/create (Facturas y documentos)</option><option value="holded-contacts">contacts/create (Contactos y clientes)</option>`;
        topicSelect.value = 'holded-docs';
      }
      state.activeTopic = 'holded-docs';
      if (guideTitle) guideTitle.textContent = 'Pasos para registrar el Webhook en Holded';
      if (guideSteps) {
        guideSteps.innerHTML = `<li>Accede a Holded &gt; <strong class="text-zinc-200">Configuración</strong> &gt; <strong class="text-zinc-200">Desarrolladores</strong> &gt; <strong class="text-zinc-200">Webhooks</strong>.</li><li>Pulsa en <strong class="text-zinc-200">Nuevo Webhook</strong>, selecciona <code class="text-indigo-300 bg-white/[0.05] px-1 py-0.5 rounded font-mono">documents/create</code> y pega la URL de Bentian.</li><li>Configura la cabecera personalizada <code class="text-indigo-300 bg-white/[0.05] px-1 py-0.5 rounded font-mono">x-holded-secret</code> con tu token secreto o añádelo como <code class="text-indigo-300 bg-white/[0.05] px-1 py-0.5 rounded font-mono">?token=TU_SECRETO</code>.</li>`;
      }
    }
    updateEndpointDisplay();
  }

  function copyWebhookUrl() {
    const urlInput = document.getElementById('webhook-url-input');
    const textEl = document.getElementById('text-copy-webhook-url');
    const btn = document.getElementById('btn-copy-webhook-url');
    const url = urlInput ? urlInput.value.trim() : '';
    if (!url || !navigator.clipboard) return;

    navigator.clipboard.writeText(url).then(() => {
      if (textEl) textEl.textContent = '¡Copiado!';
      if (btn) btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
      if (typeof window.showToast === 'function') window.showToast('✓ URL del Webhook copiada al portapapeles', 'success');
      setTimeout(() => {
        if (textEl) textEl.textContent = 'Copiar URL';
        if (btn) btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
      }, 2200);
    });
  }

  function toggleSecretVisibility() {
    const { state } = _mc();
    state.isSecretVisible = !state.isSecretVisible;
    const input = document.getElementById('webhook-secret-input');
    const eyeOpen = document.getElementById('eye-icon-open');
    const eyeClosed = document.getElementById('eye-icon-closed');
    if (!input) return;

    input.type = state.isSecretVisible ? 'text' : 'password';
    input.value = state.realSecret;
    if (eyeOpen) eyeOpen.classList.toggle('hidden', !state.isSecretVisible);
    if (eyeClosed) eyeClosed.classList.toggle('hidden', state.isSecretVisible);
  }

  function copySecret() {
    const { state } = _mc();
    const textEl = document.getElementById('text-copy-secret');
    if (navigator.clipboard && state.realSecret) {
      navigator.clipboard.writeText(state.realSecret).then(() => {
        if (textEl) textEl.textContent = '✓ Copiado';
        if (typeof window.showToast === 'function') window.showToast('✓ Token secreto copiado al portapapeles', 'success');
        setTimeout(() => { if (textEl) textEl.textContent = 'Copiar'; }, 2200);
      });
    }
  }

  async function regenerateSecret() {
    if (!window.confirm('¿Deseas regenerar el Webhook Secret?\n\nADVERTENCIA: Deberás actualizar de inmediato la clave en la configuración de Shopify o Holded para no interrumpir la recepción de pedidos.')) return;
    const { state } = _mc();
    const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
    const btn = document.getElementById('btn-regenerate-secret');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch('/api/webhooks/regenerate-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.secret) {
          state.realSecret = data.secret;
          state.maskedSecret = data.masked;
          const input = document.getElementById('webhook-secret-input');
          if (input) input.value = state.realSecret;
          if (typeof window.showToast === 'function') window.showToast('✓ Nuevo Webhook Secret generado con éxito', 'success');
        }
      } else throw new Error('Error');
    } catch {
      const array = new Uint8Array(24);
      window.crypto.getRandomValues(array);
      state.realSecret = `shpss_sec_${Array.from(array, b => b.toString(16).padStart(2, '0')).join('')}`;
      const input = document.getElementById('webhook-secret-input');
      if (input) input.value = state.realSecret;
      if (typeof window.showToast === 'function') window.showToast('✓ Nuevo token criptográfico generado localmente', 'success');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function testWebhookPing(targetChannel) {
    const { state, renderEventsStream } = _mc();
    const ch = targetChannel || state.activeChannel;
    if (typeof window.showToast === 'function') window.showToast(`⚡ Enviando ping de prueba a ${ch.toUpperCase()}...`, 'info');

    const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
    const orgId = window.currentOrgId || localStorage.getItem('bentian_cloud_org') || 'org_default';
    const t0 = performance.now();

    try {
      const res = await fetch('/api/webhooks/test-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ channel: ch, organizationId: orgId }),
      });
      const latency = Math.max(1, Math.round(performance.now() - t0));
      if (res.ok) {
        const data = await res.json();
        state.events.unshift({
          id: data.eventId || `evt_ping_${Date.now()}`,
          timestamp: data.timestamp || new Date().toISOString(),
          channel: ch,
          eventType: data.eventType || (ch === 'shopify' ? 'ORDER_CREATED' : 'INVOICE_CREATED'),
          httpStatus: 200,
          statusText: '200 OK',
          reason: 'Ping de prueba superado con éxito',
          latencyMs: latency,
          details: ch === 'shopify' ? 'Ping manual Shopify • Pedido de verificación #TEST-99' : 'Ping manual Holded • Documento de verificación #DOC-TEST',
        });
        if (state.events.length > 50) state.events.pop();
        renderEventsStream();
        if (typeof window.showToast === 'function') window.showToast(`✓ Ping ${ch.toUpperCase()} respondido en ${latency} ms (200 OK)`, 'success');
      }
    } catch {
      const latency = Math.max(1, Math.round(performance.now() - t0));
      if (typeof window.showToast === 'function') window.showToast(`Error al enviar ping (${latency} ms)`, 'error');
    }
  }

  function toggleStreamPause() {
    const { state } = _mc();
    state.isStreamPaused = !state.isStreamPaused;
    const textEl = document.getElementById('text-stream-pause');
    const badgeEl = document.getElementById('stream-status-badge');
    const pulseDot = document.getElementById('stream-pulse-dot');

    if (textEl) textEl.textContent = state.isStreamPaused ? 'Reanudar' : 'Pausar';
    if (badgeEl) badgeEl.textContent = state.isStreamPaused ? 'Transmisión pausada' : 'Transmisión en tiempo real activa (muestreo cada 5s)';
    if (pulseDot) {
      pulseDot.classList.toggle('status-pulse', !state.isStreamPaused);
      pulseDot.classList.toggle('bg-emerald-400', !state.isStreamPaused);
      pulseDot.classList.toggle('bg-zinc-500', state.isStreamPaused);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(state.isStreamPaused ? 'Stream de eventos pausado' : 'Stream en vivo reanudado', state.isStreamPaused ? 'info' : 'success');
    }
  }

  function clearStream() {
    const { state, renderEventsStream } = _mc();
    state.events = [];
    renderEventsStream();
    if (typeof window.showToast === 'function') window.showToast('Visor de eventos limpiado', 'info');
  }

  function initEventDelegation() {
    const { state, renderEventsStream, loadMultichannelData } = _mc();
    if (state.isInitialized) return;
    state.isInitialized = true;

    document.addEventListener('click', function(e) {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.getAttribute('data-action');
      const actionsMap = {
        'test-webhook-ping': () => testWebhookPing(state.activeChannel),
        'test-channel-ping': () => testWebhookPing(actionEl.getAttribute('data-channel') || 'shopify'),
        'refresh-multichannel': () => { loadMultichannelData(); if (typeof window.showToast === 'function') window.showToast('✓ Estado de canales refrescado', 'success'); },
        'select-channel': () => selectChannel(actionEl.getAttribute('data-channel') || 'shopify'),
        'copy-webhook-url': () => copyWebhookUrl(),
        'toggle-secret-visibility': () => toggleSecretVisibility(),
        'copy-secret': () => copySecret(),
        'regenerate-secret': () => regenerateSecret(),
        'toggle-stream-pause': () => toggleStreamPause(),
        'clear-stream': () => clearStream(),
        'switch-tab': () => { const t = actionEl.getAttribute('data-tab'); if (t && typeof window.switchDashboardTab === 'function') window.switchDashboardTab(t); },
      };
      if (actionsMap[action]) { e.preventDefault(); actionsMap[action](); }
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initEventDelegation);
  else initEventDelegation();

  window.selectMultichannelChannel = selectChannel;
  window.testWebhookPing = testWebhookPing;
})();
