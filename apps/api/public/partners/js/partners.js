// =========================================================================
// BENTIAN PARTNERS PORTAL — INTERACTIVE CALCULATOR & NFR APPLICATION
// =========================================================================

function actualizarCalculadoraPartner() {
  var clients = parseInt(document.getElementById('calc-clients').value, 10) || 15;
  var setup = parseInt(document.getElementById('calc-setup').value, 10) || 300;
  var annualCommissionPerClient = 199 * 0.30; // 59.70 EUR
  var setupTotal = clients * setup;
  var recurringTotal = clients * annualCommissionPerClient;
  var year1Total = setupTotal + recurringTotal;

  document.getElementById('calc-clients-label').textContent = clients + (clients === 1 ? ' cliente' : ' clientes');
  document.getElementById('calc-setup-label').textContent = setup + ' € / cliente';
  document.getElementById('res-setup-total').textContent = setupTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  document.getElementById('res-recurring-total').textContent = recurringTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' € / año';
  document.getElementById('res-year1-total').textContent = year1Total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function copyPartnerText(elId) {
  var el = document.getElementById(elId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent.trim()).catch(function() {});
}

async function submitPartnerApplication(e) {
  e.preventDefault();
  var btn = document.getElementById('pt-submit-btn');
  var origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generando Código Partner y Licencia NFR...';

  try {
    var payload = {
      agencyName: document.getElementById('pt-agency-name').value.trim(),
      contactName: document.getElementById('pt-contact-name').value.trim(),
      email: document.getElementById('pt-email').value.trim(),
      phone: document.getElementById('pt-phone').value.trim(),
      partnerType: document.getElementById('pt-type').value,
      estimatedClients: document.getElementById('pt-clients').value,
      erps: document.getElementById('pt-erps').value.trim(),
      website: document.getElementById('pt-website').value.trim()
    };

    var res = await fetch('/api/v1/partners/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var json = await res.json();
    if (!res.ok || !json.success) {
      alert((json.error && json.error.message) || 'No se pudo procesar la solicitud. Verifica los datos.');
      return;
    }

    document.getElementById('pt-res-code').textContent = json.data.partnerCode || 'PT-BENTIAN';
    document.getElementById('pt-res-key').textContent = json.data.nfrLicenseKey || 'Enviada por email';
    document.getElementById('pt-res-title').textContent = json.alreadyRegistered
      ? 'Tu Agencia (' + json.data.agencyName + ') ya está acreditada'
      : '¡' + json.data.agencyName + ' acreditada como Partner Oficial!';
    var box = document.getElementById('pt-result-box');
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    alert('Error de red al conectar con el servidor central. Inténtalo de nuevo.');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

if (window.location.search.indexOf('print=1') !== -1) {
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 500);
  });
}
