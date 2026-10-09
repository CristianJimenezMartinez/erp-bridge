export const incidentScript = `
    // ============================================================
    // GESTIÓN DE INCIDENCIAS Y SOPORTE ASISTIDO
    // ============================================================

    function openIncidentModal() {
      const modal = document.getElementById('modal-incident');
      if (!modal) return;

      const formContainer = document.getElementById('incident-form-container');
      const successContainer = document.getElementById('incident-success-container');
      const alertBox = document.getElementById('inc-alert-box');
      const submitBtn = document.getElementById('btn-inc-submit');
      const submitText = document.getElementById('btn-inc-submit-text');

      if (formContainer) formContainer.style.display = 'block';
      if (successContainer) successContainer.style.display = 'none';
      if (alertBox) alertBox.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = 'Enviar Incidencia a Soporte';

      // Pre-cargar contacto si existe en configuración
      const contactInput = document.getElementById('inc-input-contact');
      if (contactInput && !contactInput.value) {
        const notifRecipient = document.getElementById('input-notif-recipient');
        const notifUser = document.getElementById('input-notif-user');
        if (notifRecipient && notifRecipient.value) {
          contactInput.value = notifRecipient.value;
        } else if (notifUser && notifUser.value && notifUser.value.includes('@')) {
          contactInput.value = notifUser.value;
        }
      }

      modal.classList.add('open');
      const descInput = document.getElementById('inc-input-desc');
      if (descInput) {
        setTimeout(() => descInput.focus(), 150);
      }
    }
    window.openIncidentModal = openIncidentModal;

    function closeIncidentModal() {
      const modal = document.getElementById('modal-incident');
      if (modal) modal.classList.remove('open');
    }
    window.closeIncidentModal = closeIncidentModal;

    async function submitIncidentReport() {
      const contactInput = document.getElementById('inc-input-contact');
      const categorySelect = document.getElementById('inc-select-category');
      const descInput = document.getElementById('inc-input-desc');
      const diagCheck = document.getElementById('inc-check-diag');
      const alertBox = document.getElementById('inc-alert-box');
      const submitBtn = document.getElementById('btn-inc-submit');
      const submitText = document.getElementById('btn-inc-submit-text');

      const contact = (contactInput ? contactInput.value : '').trim();
      const category = categorySelect ? categorySelect.value : 'other';
      const description = (descInput ? descInput.value : '').trim();
      const includeDiagnostics = diagCheck ? diagCheck.checked : true;

      // Validación de campos
      if (!contact || contact.length < 4) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = 'rgba(239, 68, 68, 0.15)';
          alertBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          alertBox.style.color = '#fca5a5';
          alertBox.innerHTML = '⚠️ Por favor, introduce un correo electrónico o teléfono válido para que soporte pueda responderte.';
        }
        if (contactInput) contactInput.focus();
        return;
      }

      if (!description || description.length < 8) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = 'rgba(239, 68, 68, 0.15)';
          alertBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          alertBox.style.color = '#fca5a5';
          alertBox.innerHTML = '⚠️ Por favor, explica brevemente qué ocurre para poder ayudarte con eficacia (mínimo 8 caracteres).';
        }
        if (descInput) descInput.focus();
        return;
      }

      if (alertBox) alertBox.style.display = 'none';
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Enviando informe técnico...';

      try {
        const payload = {
          contact,
          category,
          description,
          includeDiagnostics,
          timestamp: new Date().toISOString()
        };

        const res = await fetch('/api/local/report-incident', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const formContainer = document.getElementById('incident-form-container');
          const successContainer = document.getElementById('incident-success-container');
          const ticketIdEl = document.getElementById('inc-success-ticket-id');
          const successMsgEl = document.getElementById('inc-success-msg');

          if (ticketIdEl) ticketIdEl.textContent = data.ticketId || '#INC-REGISTRADO';
          if (successMsgEl && data.message) successMsgEl.textContent = data.message;

          if (formContainer) formContainer.style.display = 'none';
          if (successContainer) successContainer.style.display = 'block';

          if (typeof showToast === 'function') {
            showToast('✓ Incidencia ' + (data.ticketId || '') + ' registrada con éxito', 'success');
          }
          if (descInput) descInput.value = '';
        } else {
          throw new Error(data.message || 'No se pudo registrar la incidencia.');
        }
      } catch (err) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = 'rgba(239, 68, 68, 0.15)';
          alertBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          alertBox.style.color = '#fca5a5';
          alertBox.innerHTML = '❌ Error al enviar la incidencia: ' + (err.message || String(err)) + '. Puedes descargar el informe técnico desde la pestaña de Diagnóstico y enviarlo manualmente a soporte@bentian.es.';
        }
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Reintentar Envío';
      }
    }
    window.submitIncidentReport = submitIncidentReport;
`;
