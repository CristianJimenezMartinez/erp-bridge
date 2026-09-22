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

// Exposición en el ámbito global para atributos onclick HTML
window.escapeHtml = escapeHtml;
window.showToast = showToast;
window.copyKey = copyKey;
window.closeModal = closeModal;
window.openInstructionsModal = openInstructionsModal;
window.openStripePortal = openStripePortal;
window.toggleUserDropdown = toggleUserDropdown;
