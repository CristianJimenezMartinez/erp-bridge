// Configuración global de Marca
window.__BRAND_CONFIG__ = {
  productName: "Bentian ERP Bridge",
  brandName: "Bentian"
};

// Función de Checkout con Stripe
async function iniciarCheckout(planId) {
  const email = prompt('Introduce tu correo electrónico para vincular tu licencia:');
  if (!email || !email.trim()) return;

  try {
    const res = await fetch('/api/v1/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId, email: email.trim(), isEarlyBird: true })
    });
    const data = await res.json();
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      alert('No se pudo generar la sesión de pago. Por favor, contacta con soporte.');
    }
  } catch (err) {
    alert('Error al conectar con la pasarela de facturación: ' + err.message);
  }
}
