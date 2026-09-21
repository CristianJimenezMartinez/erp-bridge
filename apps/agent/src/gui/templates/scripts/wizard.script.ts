export const wizardScript = `
    // ================= ONBOARDING WIZARD MODAL LOGIC =================
    function openWizardModal() {
      document.getElementById('modal-wizard').classList.add('open');
      setWizardStep(1);
    }

    function closeWizardModal() {
      document.getElementById('modal-wizard').classList.remove('open');
    }

    function setWizardStep(step) {
      wizardCurrentStep = step;
      [1, 2, 3, 4].forEach(function(i) {
        const pane = document.getElementById('wizard-pane-' + i);
        const stepHeader = document.getElementById('w-step-' + i);
        if (pane) pane.style.display = (i === step) ? 'block' : 'none';
        if (stepHeader) {
          stepHeader.className = 'wizard-step-item' + (i === step ? ' active' : (i < step ? ' done' : ''));
        }
      });

      document.getElementById('wiz-btn-prev').style.visibility = (step === 1) ? 'hidden' : 'visible';
      const nextBtn = document.getElementById('wiz-btn-next');
      if (step === 4) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = 'Siguiente Paso →';
      }
    }

    function wizNextStep() {
      if (wizardCurrentStep < 4) {
        setWizardStep(wizardCurrentStep + 1);
      }
    }

    function wizPrevStep() {
      if (wizardCurrentStep > 1) {
        setWizardStep(wizardCurrentStep - 1);
      }
    }

    async function wizPasteAndActivateLicense() {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('EB-')) {
          document.getElementById('wiz-input-lic').value = text.trim();
        }
      } catch (e) {}

      const key = document.getElementById('wiz-input-lic').value.trim();
      const alertBox = document.getElementById('wiz-lic-alert');
      if (!key) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Introduce o pega tu clave de puesto';
        return;
      }

      alertBox.style.display = 'block';
      alertBox.style.color = 'var(--text-muted)';
      alertBox.textContent = 'Activando clave en la nube...';

      try {
        const res = await fetch('/api/local/activate-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key })
        });
        const data = await res.json();
        if (data.success) {
          alertBox.style.color = '#34d399';
          alertBox.textContent = '✓ Licencia activada con éxito. Pulsa en Siguiente Paso.';
          showToast('Licencia activada con éxito');
          fetchStatus();
        } else {
          alertBox.style.color = '#f87171';
          alertBox.textContent = '✕ Error: ' + (data.error || 'Clave no válida');
        }
      } catch (err) {
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Error de conexión con el servidor de licencias';
      }
    }

    function wizSelectChannel(type) {
      const cardUniv = document.getElementById('wiz-choice-univ');
      const cardWoo = document.getElementById('wiz-choice-woo');
      const panelUniv = document.getElementById('wiz-panel-univ');
      const panelWoo = document.getElementById('wiz-panel-woo');

      if (type === 'universal_bridge') {
        cardUniv.classList.add('selected');
        cardWoo.classList.remove('selected');
        panelUniv.style.display = 'block';
        panelWoo.style.display = 'none';
      } else {
        cardWoo.classList.add('selected');
        cardUniv.classList.remove('selected');
        panelWoo.style.display = 'block';
        panelUniv.style.display = 'none';
      }
      selectChannelType(type);
    }

    async function wizTestUniversal() {
      sanitizeUrlInput('wiz-input-univ-url');
      const url = document.getElementById('wiz-input-univ-url').value.trim();
      const alertBox = document.getElementById('wiz-univ-alert');
      if (!url) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Introduce la dirección de tu web';
        return;
      }
      alertBox.style.display = 'block';
      alertBox.style.color = 'var(--text-muted)';
      alertBox.textContent = 'Comprobando conexión con tu web...';

      try {
        const res = await fetch('/api/local/test-universal-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl: url })
        });
        const data = await res.json();
        alertBox.style.color = data.success ? '#34d399' : '#f87171';
        alertBox.textContent = (data.success ? '✓ ' : '✕ ') + data.message;
      } catch (err) {
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Fallo al comprobar web';
      }
    }

    async function wizTestFactusolConnection() {
      if (typeof testFactusolConnection === 'function') {
        await testFactusolConnection('wiz-input-fact-path', 'wiz-fact-alert');
      }
    }

    async function finishWizardAndStart() {
      // Guardar todo
      const payload = {
        licenseKey: document.getElementById('wiz-input-lic').value.trim() || undefined,
        channelType: currentChannelType,
        factusol: {
          databasePath: document.getElementById('wiz-input-fact-path').value.trim() || undefined,
        },
        universalBridge: {
          storeUrl: document.getElementById('wiz-input-univ-url').value.trim() || undefined,
          enabled: currentChannelType === 'universal_bridge'
        },
        woocommerce: {
          storeUrl: document.getElementById('wiz-input-wc-url').value.trim() || undefined,
          consumerKey: document.getElementById('wiz-input-wc-key').value.trim() || undefined,
          consumerSecret: document.getElementById('wiz-input-wc-secret').value.trim() || undefined,
        }
      };
      await submitConfigUpdates(payload, '¡Configuración completada con éxito!');
      closeWizardModal();
      switchTab('overview');
      triggerManualSync();
    }
`;
