/**
 * Bentian ERP Bridge — Dashboard Utilities Module
 * Notificaciones Toast, sanitización HTML, portapapeles y controles modales / dropdown.
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const dot = document.getElementById('toast-dot');
  const msgEl = document.getElementById('toast-msg');
  if (msgEl) msgEl.innerText = msg;

  if (dot) {
    dot.className = 'w-2 h-2 rounded-full ' + (
      type === 'success' ? 'bg-emerald-400' :
      type === 'error' ? 'bg-red-400' : 'bg-indigo-400'
    );
  }

  if (toast) {
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }
}

function copyKey(key) {
  if (!key) return;
  navigator.clipboard.writeText(key);
  showToast(`Clave ${key} copiada al portapapeles`, 'success');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function openInstructionsModal() {
  const el = document.getElementById('modal-instructions');
  if (el) el.classList.remove('hidden');
}

async function openStripePortal() {
  showToast('Conectando con el Portal de Facturación de Stripe...', 'info');
  try {
    const email = localStorage.getItem('bentian_cloud_email');
    if (!email) {
      showToast('No se encontró el email de sesión activa.', 'error');
      return;
    }
    const token = window.currentAuthToken || localStorage.getItem('bentian_cloud_token') || '';
    const res = await fetch('/api/v1/billing/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data && data.url) {
      window.open(data.url, '_blank');
    } else {
      showToast(data.error?.message || 'No se pudo generar la sesión de facturación Stripe.', 'error');
    }
  } catch (err) {
    showToast('Error al contactar con Stripe', 'error');
  }
}

function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('user-dropdown-menu');
  const chevron = document.getElementById('user-dropdown-chevron');
  if (!menu) return;
  if (menu.classList.contains('hidden')) {
    menu.classList.remove('hidden');
    if (chevron) chevron.classList.add('rotate-180');
  } else {
    menu.classList.add('hidden');
    if (chevron) chevron.classList.remove('rotate-180');
  }
}

// Cierre automático del menú desplegable de usuario al hacer click fuera
document.addEventListener('click', function(e) {
  const container = document.getElementById('user-menu-container');
  const menu = document.getElementById('user-dropdown-menu');
  const chevron = document.getElementById('user-dropdown-chevron');
  if (menu && !menu.classList.contains('hidden')) {
    if (!container || !container.contains(e.target)) {
      menu.classList.add('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
    }
  }
});

// Cierre al pulsar tecla Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const menu = document.getElementById('user-dropdown-menu');
    const chevron = document.getElementById('user-dropdown-chevron');
    if (menu && !menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
    }
  }
});

function copiarClaveBienvenida() {
  const el = document.getElementById('welcome-license-key');
  const key = el ? el.innerText.trim() : '';
  if (key) {
    navigator.clipboard.writeText(key);
    showToast(`✓ Clave ${key} copiada al portapapeles`, 'success');
  }
}

// -------------------------------------------------------------
// Medidor de Latencia y Tiempos de Respuesta en Tiempo Real
// -------------------------------------------------------------
function recordLatency(durationMs) {
  const badge = document.getElementById('top-latency-badge');
  const dot = document.getElementById('top-latency-dot');
  const text = document.getElementById('top-latency-text');
  const rounded = Math.max(1, Math.round(durationMs));
  if (text) text.innerText = `${rounded} ms`;

  if (dot && badge) {
    if (rounded < 200) {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400';
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#18181b] hover:bg-[#222228] text-emerald-400 border border-emerald-500/30 transition cursor-pointer';
    } else if (rounded < 600) {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#18181b] hover:bg-[#222228] text-amber-400 border border-amber-500/30 transition cursor-pointer';
    } else {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-red-400';
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#18181b] hover:bg-[#222228] text-red-400 border border-red-500/30 transition cursor-pointer';
    }
  }
}

async function pingLiveServer() {
  const t0 = performance.now();
  try {
    const res = await fetch('/api/v1/health');
    const elapsed = Math.round(performance.now() - t0);
    recordLatency(elapsed);
    if (res.ok) {
      const data = await res.json();
      const dbMs = data.database?.latencyMs !== undefined ? ` (DB: ${data.database.latencyMs} ms)` : '';
      showToast(`⚡ Ping del servidor: ${elapsed} ms${dbMs}`, 'success');
    } else {
      showToast(`Ping respondido con código ${res.status} (${elapsed} ms)`, 'warning');
    }
  } catch (err) {
    const elapsed = Math.round(performance.now() - t0);
    recordLatency(elapsed);
    showToast(`Error al medir ping (${elapsed} ms)`, 'error');
  }
}

// Interceptor global de fetch: mide el tiempo real de cada clic, petición y acción
if (typeof window !== 'undefined' && window.fetch) {
  const nativeFetch = window.fetch;
  window.fetch = async function(...args) {
    const start = performance.now();
    try {
      const response = await nativeFetch.apply(this, args);
      const elapsed = performance.now() - start;
      recordLatency(elapsed);
      return response;
    } catch (error) {
      const elapsed = performance.now() - start;
      recordLatency(elapsed);
      throw error;
    }
  };
}

function copyToClipboard(text, successMsg = 'Copiado al portapapeles') {
  if (!text) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => {
      showToast('Error al copiar al portapapeles', 'error');
    });
  }
}

// Exposición en el ámbito global para atributos onclick HTML
window.escapeHtml = escapeHtml;
window.showToast = showToast;
window.copyKey = copyKey;
window.copyToClipboard = copyToClipboard;
window.copiarClaveBienvenida = copiarClaveBienvenida;
window.closeModal = closeModal;
window.openInstructionsModal = openInstructionsModal;
window.openStripePortal = openStripePortal;
window.toggleUserDropdown = toggleUserDropdown;
window.recordLatency = recordLatency;
window.pingLiveServer = pingLiveServer;

