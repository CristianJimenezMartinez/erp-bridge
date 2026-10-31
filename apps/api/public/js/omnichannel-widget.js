/**
 * Bentian Omnichannel Live Chat & AI Autonomous Widget (0€ SaaS Fee)
 * Conecta visitantes web en tiempo real con el motor autónomo 24/7 y el Telegram/WhatsApp de Cristian.
 */
(function () {
  if (typeof window === 'undefined' || document.getElementById('bentian-omnichannel-widget')) return;

  var STORAGE_KEY = 'bentian_chat_session_v1';
  var sessionId = '';
  try {
    sessionId = localStorage.getItem(STORAGE_KEY) || '';
  } catch (_e) {}

  var isOpen = false;
  var renderedMsgIds = {};
  var pollTimer = null;

  var style = document.createElement('style');
  style.textContent = [
    '#bentian-omnichannel-widget{position:fixed;bottom:20px;right:20px;z-index:9998;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '.boc-btn{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#4f46e5,#059669);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:999px;padding:12px 18px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,0.45);transition:transform .15s ease;}',
    '.boc-btn:hover{transform:translateY(-2px);}',
    '.boc-dot{width:9px;height:9px;background:#34d399;border-radius:50%;box-shadow:0 0 8px #34d399;}',
    '.boc-panel{display:none;flex-direction:column;width:360px;max-width:calc(100vw - 32px);height:500px;max-height:calc(100vh - 96px);background:#09090b;color:#f4f4f5;border:1px solid rgba(255,255,255,0.14);border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.65);overflow:hidden;margin-bottom:12px;}',
    '.boc-panel.open{display:flex;}',
    '.boc-head{padding:14px 16px;background:#18181b;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;}',
    '.boc-title{font-size:14px;font-weight:700;color:#fff;margin:0;}',
    '.boc-sub{font-size:11px;color:#34d399;margin:2px 0 0 0;}',
    '.boc-close{background:transparent;border:none;color:#a1a1aa;font-size:18px;cursor:pointer;padding:4px 8px;}',
    '.boc-body{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.45;}',
    '.boc-msg{padding:10px 12px;border-radius:12px;max-width:86%;word-break:break-word;white-space:pre-wrap;}',
    '.boc-msg.ai,.boc-msg.admin{background:#18181b;border:1px solid rgba(255,255,255,0.08);color:#e4e4e7;align-self:flex-start;}',
    '.boc-msg.admin{border-color:#34d399;}',
    '.boc-msg.visitor{background:#4f46e5;color:#fff;align-self:flex-end;}',
    '.boc-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px 14px;}',
    '.boc-chip{background:rgba(79,70,229,0.16);border:1px solid rgba(99,102,241,0.4);color:#c7d2fe;border-radius:999px;padding:5px 10px;font-size:11px;cursor:pointer;}',
    '.boc-chip:hover{background:rgba(79,70,229,0.32);color:#fff;}',
    '.boc-foot{padding:10px;background:#18181b;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;}',
    '.boc-input{flex:1;background:#09090b;border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:9px 12px;color:#fff;font-size:13px;outline:none;}',
    '.boc-send{background:#059669;color:#fff;border:none;border-radius:10px;padding:0 14px;font-weight:700;font-size:13px;cursor:pointer;}'
  ].join('\n');
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'bentian-omnichannel-widget';
  root.innerHTML = [
    '<div class="boc-panel" id="boc-panel" role="dialog" aria-label="Asistente y Chat en Directo">',
    '  <div class="boc-head">',
    '    <div>',
    '      <p class="boc-title">Bentian Omnichannel Chat</p>',
    '      <p class="boc-sub">● Respuesta IA al instante + Telegram directo con Cristian</p>',
    '    </div>',
    '    <button type="button" class="boc-close" id="boc-close" aria-label="Cerrar">✕</button>',
    '  </div>',
    '  <div class="boc-body" id="boc-body">',
    '    <div class="boc-msg ai">Hola 👋 Soy el asistente autónomo de Bentian (y este chat avisa en directo al móvil de Cristian Jiménez).\n\n¿Quieres conectar Factusol/SimplyGest con tu tienda, pedir una Clave Beta gratuita o conocer el Canal Partner (25% recurrente)?</div>',
    '  </div>',
    '  <div class="boc-chips" id="boc-chips">',
    '    <button type="button" class="boc-chip" data-q="Quiero probar gratis una Clave Beta de 14 días">🔑 Clave Beta Gratis</button>',
    '    <button type="button" class="boc-chip" data-q="Soy Agencia o Informático: ¿cómo funciona el 25% de Partner?">🤝 Canal Partner (25%)</button>',
    '    <button type="button" class="boc-chip" data-q="¿Cómo conectáis Factusol o SimplyGest sin abrir puertos?">🛡️ Factusol / ERPs</button>',
    '    <button type="button" class="boc-chip" data-q="Quiero que Cristian me contacte directamente">📞 Hablar con Cristian</button>',
    '  </div>',
    '  <form class="boc-foot" id="boc-form">',
    '    <input type="text" class="boc-input" id="boc-input" placeholder="Escribe tu duda o tu email/teléfono..." maxlength="600" autocomplete="off" />',
    '    <button type="submit" class="boc-send">Enviar</button>',
    '  </form>',
    '</div>',
    '<button type="button" class="boc-btn" id="boc-toggle">',
    '  <span class="boc-dot"></span>',
    '  <span>Chat Directo / IA 24h</span>',
    '</button>'
  ].join('\n');
  document.body.appendChild(root);

  var panel = document.getElementById('boc-panel');
  var bodyEl = document.getElementById('boc-body');
  var formEl = document.getElementById('boc-form');
  var inputEl = document.getElementById('boc-input');

  function appendMessage(msg) {
    if (!msg || !msg.text) return;
    if (msg.id && renderedMsgIds[msg.id]) return;
    if (msg.id) renderedMsgIds[msg.id] = true;
    var div = document.createElement('div');
    div.className = 'boc-msg ' + (msg.sender || 'ai');
    var prefix = msg.sender === 'admin' ? '👨‍💻 ' + (msg.senderName || 'Cristian') + ':\n' : '';
    div.textContent = prefix + msg.text;
    bodyEl.appendChild(div);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function sendMessage(text) {
    var clean = (text || '').trim();
    if (!clean) return;
    appendMessage({ id: 'local_' + Date.now(), sender: 'visitor', text: clean });
    inputEl.value = '';

    fetch('/api/v1/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId || undefined, message: clean, platform: 'web' })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.sessionId) {
          sessionId = data.sessionId;
          try { localStorage.setItem(STORAGE_KEY, sessionId); } catch (_e) {}
        }
        if (data && Array.isArray(data.messages)) {
          data.messages.forEach(function (m) {
            if (m.sender !== 'visitor') appendMessage(m);
          });
        } else if (data && data.reply) {
          appendMessage({ id: 'ai_' + Date.now(), sender: 'ai', text: data.reply });
        }
      })
      .catch(function () {
        appendMessage({
          id: 'err_' + Date.now(),
          sender: 'ai',
          text: 'Puedes escribirnos directamente por WhatsApp al +34 617 205 053 o en soporte@cristianjm.com.'
        });
      });
  }

  function pollHistory() {
    if (!isOpen || !sessionId) return;
    fetch('/api/v1/chat/history/' + encodeURIComponent(sessionId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && Array.isArray(data.messages)) {
          data.messages.forEach(function (m) {
            if (m.sender !== 'visitor') appendMessage(m);
          });
        }
      })
      .catch(function () {});
  }

  function toggleChat(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    if (isOpen) {
      panel.classList.add('open');
      inputEl.focus();
      if (!pollTimer) pollTimer = setInterval(pollHistory, 5000);
    } else {
      panel.classList.remove('open');
    }
  }

  document.getElementById('boc-toggle').addEventListener('click', function () { toggleChat(); });
  document.getElementById('boc-close').addEventListener('click', function () { toggleChat(false); });
  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage(inputEl.value);
  });

  var chips = root.querySelectorAll('.boc-chip');
  for (var i = 0; i < chips.length; i++) {
    chips[i].addEventListener('click', function (e) {
      var q = e.currentTarget.getAttribute('data-q');
      if (q) sendMessage(q);
    });
  }
})();
