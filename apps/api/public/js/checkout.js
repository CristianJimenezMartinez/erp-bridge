// Configuración global de Marca
window.__BRAND_CONFIG__ = {
  productName: "Bentian ERP Bridge",
  brandName: "Bentian"
};

let currentSelectedPlan = 'base_annual';

const PLAN_INFO = {
  base_annual: {
    name: 'Plan Base Todo Incluido (Anual)',
    price: '199 €',
    cycle: '/ año + IVA (Oferta Early Bird)',
    desc: '14 días de prueba gratuita sin compromiso. Incluye 1 ERP y 1 Tienda.'
  },
  base_monthly: {
    name: 'Plan Base Todo Incluido (Mensual)',
    price: '29 €',
    cycle: '/ mes + IVA',
    desc: 'Sin permanencia: cancelable en cualquier momento en 1 clic.'
  }
};

function iniciarCheckout(planId) {
  currentSelectedPlan = planId || 'base_annual';
  const info = PLAN_INFO[currentSelectedPlan] || PLAN_INFO['base_annual'];

  const nameEl = document.getElementById('checkout-plan-name');
  const descEl = document.getElementById('checkout-plan-desc');
  const priceEl = document.getElementById('checkout-plan-price');
  const cycleEl = document.getElementById('checkout-plan-cycle');
  const errEl = document.getElementById('checkout-error-msg');
  const emailInput = document.getElementById('checkout-email-input');

  if (nameEl) nameEl.textContent = info.name;
  if (descEl) descEl.textContent = info.desc;
  if (priceEl) priceEl.textContent = info.price;
  if (cycleEl) cycleEl.textContent = info.cycle;
  if (errEl) errEl.classList.add('hidden');

  const modal = document.getElementById('modal-checkout-landing');
  if (modal) {
    modal.classList.remove('hidden');
    if (emailInput) {
      setTimeout(() => emailInput.focus(), 50);
    }
  }
}

function cerrarCheckoutModal() {
  const modal = document.getElementById('modal-checkout-landing');
  if (modal) modal.classList.add('hidden');
}

// Cerrar con Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarCheckoutModal();
  }
});

async function procesarCheckoutModal(e) {
  e.preventDefault();
  const emailInput = document.getElementById('checkout-email-input');
  const email = emailInput ? emailInput.value.trim() : '';
  const errEl = document.getElementById('checkout-error-msg');
  const btn = document.getElementById('btn-submit-checkout');
  const btnText = document.getElementById('btn-submit-text');

  if (!email || !email.includes('@') || !email.includes('.')) {
    if (errEl) {
      errEl.textContent = 'Por favor, introduce una dirección de correo válida.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (errEl) errEl.classList.add('hidden');
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Conectando con pasarela segura...';

  try {
    const res = await fetch('/api/v1/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: currentSelectedPlan,
        email: email,
        isEarlyBird: true
      })
    });
    const data = await res.json();
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data?.error?.message || 'No se pudo generar la pasarela de pago.');
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Error: ' + err.message;
      errEl.classList.remove('hidden');
    }
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Continuar al Pago Seguro con Stripe';
  }
}

window.iniciarCheckout = iniciarCheckout;
window.cerrarCheckoutModal = cerrarCheckoutModal;
window.procesarCheckoutModal = procesarCheckoutModal;
