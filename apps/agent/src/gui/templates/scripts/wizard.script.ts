export const wizardScript = `
    // ================= ONBOARDING WIZARD MODAL LOGIC =================
    function openWizardModal() {
      document.getElementById('modal-wizard').classList.add('open');
      setWizardStep(1);

      // Cargar la serie configurada previamente o '1' por defecto
      let existingSeries = '1';
      try {
        if (typeof currentStatus !== 'undefined' && currentStatus) {
          const fs = currentStatus.factusolSettings || currentStatus.factusol || (currentStatus.config && currentStatus.config.factusol);
          if (fs && fs.orderSeries) {
            existingSeries = fs.orderSeries;
          }
        }
        if (existingSeries === '1') {
          const mainInput = document.getElementById('input-factusol-order-series');
          if (mainInput && mainInput.value) {
            existingSeries = mainInput.value;
          }
        }
      } catch (e) {}
      setWizOrderSeries(existingSeries);

      // Pre-cargar ruta si ya existe en la pantalla de Factusol
      try {
        const wizFactInput = document.getElementById('wiz-input-fact-path');
        const mainFactInput = document.getElementById('input-factusol-db');
        if (wizFactInput && !wizFactInput.value && mainFactInput && mainFactInput.value) {
          wizFactInput.value = mainFactInput.value;
        }
      } catch (e) {}
    }

    function setWizOrderSeries(serie) {
      const cleanSerie = (serie || '1').toString().trim().toUpperCase().substring(0, 1) || '1';
      const input = document.getElementById('wiz-input-fact-order-series');
      if (input) {
        input.value = cleanSerie;
      }
      updateWizOrderSeriesButtons(cleanSerie);
    }

    function updateWizOrderSeriesButtons(serie) {
      const btn1 = document.getElementById('wiz-btn-series-1');
      const btnW = document.getElementById('wiz-btn-series-w');
      const badge1 = document.getElementById('wiz-badge-series-1');
      const badgeW = document.getElementById('wiz-badge-series-w');

      if (btn1) {
        if (serie === '1') {
          btn1.style.background = 'rgba(99, 102, 241, 0.18)';
          btn1.style.border = '2px solid #6366f1';
          if (badge1) {
            badge1.style.background = '#6366f1';
            badge1.style.color = '#fff';
          }
        } else {
          btn1.style.background = '#18181f';
          btn1.style.border = '1px solid var(--card-border)';
          if (badge1) {
            badge1.style.background = 'rgba(255,255,255,0.08)';
            badge1.style.color = 'var(--text-subtle)';
          }
        }
      }

      if (btnW) {
        if (serie === 'W') {
          btnW.style.background = 'rgba(99, 102, 241, 0.18)';
          btnW.style.border = '2px solid #6366f1';
          if (badgeW) {
            badgeW.style.background = '#6366f1';
            badgeW.style.color = '#fff';
          }
        } else {
          btnW.style.background = '#18181f';
          btnW.style.border = '1px solid var(--card-border)';
          if (badgeW) {
            badgeW.style.background = 'rgba(255,255,255,0.08)';
            badgeW.style.color = 'var(--text-subtle)';
          }
        }
      }
    }

    function onWizOrderSeriesInput(val) {
      const cleanVal = (val || '').trim().toUpperCase().substring(0, 1);
      updateWizOrderSeriesButtons(cleanVal);
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

    function renderWizardErrorCard(alertEl, errInfo, extraActionsHtml) {
      if (!alertEl) return;
      const rawTitle = errInfo.title || '¿Qué ha ocurrido?';
      const cleanTitle = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(rawTitle) : rawTitle;
      alertEl.style.display = 'block';
      alertEl.innerHTML = 
        '<div class="smart-error-card">' +
          '<div class="smart-error-header">' +
            (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') +
            '<span>' + cleanTitle + '</span>' +
          '</div>' +
          '<div class="smart-error-cause">' +
            (errInfo.cause ? ('<strong>Causa:</strong> ' + errInfo.cause + '<br>') : '') +
            (errInfo.suggestion ? ('<strong>Solución recomendada:</strong> ' + errInfo.suggestion) : '') +
          '</div>' +
          (extraActionsHtml ? ('<div class="smart-error-actions">' + extraActionsHtml + '</div>') : '') +
        '</div>';
    }

    function renderWizardSuccessCard(alertEl, message) {
      if (!alertEl) return;
      const cleanMsg = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(message) : (message || '');
      alertEl.style.display = 'block';
      alertEl.innerHTML = 
        '<div class="smart-success-card">' +
          (typeof renderIcon === 'function' ? renderIcon('check', 'color:#34d399;') : '') +
          '<span>' + cleanMsg + '</span>' +
        '</div>';
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
        renderWizardErrorCard(alertBox, {
          title: 'Clave de licencia requerida',
          cause: 'No has introducido ninguna clave en el formulario.',
          suggestion: 'Pega la clave que comienza por EB-... recibida por correo electrónico.'
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-lic&quot;).focus()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('edit') : '') + '<span>Escribir clave</span></button>');
        return;
      }

      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Activando clave en la nube...</div>';

      try {
        const res = await fetch('/api/local/activate-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key })
        });
        const data = await res.json();
        if (data.success) {
          renderWizardSuccessCard(alertBox, 'Licencia vinculada a este equipo con éxito. Pulsa en Siguiente Paso para continuar.');
          showSmartToast({
            title: 'Licencia Activada',
            message: 'Puesto vinculado con éxito.',
            type: 'success'
          });
          fetchStatus();
        } else {
          const errInfo = humanizeErrorMessage(data.error || 'Clave no válida', 'license');
          renderWizardErrorCard(alertBox, errInfo, 
            '<button type="button" onclick="document.getElementById(&quot;wiz-input-lic&quot;).focus()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('edit') : '') + '<span>Corregir clave</span></button>' +
            '<button type="button" onclick="window.open(&quot;https://bridge.cristianjm.com/&quot;, &quot;_blank&quot;)" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('key') : '') + '<span>Obtener nueva clave</span></button>'
          );
          showSmartToast({
            title: 'Error de Activación',
            message: errInfo.message,
            type: 'error'
          });
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'license');
        renderWizardErrorCard(alertBox, errInfo, 
          '<button type="button" onclick="wizPasteAndActivateLicense()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar activación</span></button>'
        );
      }
    }

    async function wizClaimBetaOneClick() {
      const emailInput = document.getElementById('wiz-input-claim-email');
      const email = emailInput ? emailInput.value.trim() : '';
      const alertBox = document.getElementById('wiz-quick-claim-alert');
      const btn = document.getElementById('wiz-btn-claim-oneclick');

      if (!email || !email.includes('@') || !email.includes('.')) {
        if (alertBox) {
          renderWizardErrorCard(alertBox, {
            title: 'Correo electrónico requerido',
            cause: 'No has introducido una dirección de correo válida.',
            suggestion: 'Escribe tu correo (ej: info@tuempresa.com) para activar tu clave instantánea.'
          }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-claim-email&quot;).focus()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('edit') : '') + '<span>Escribir correo</span></button>');
        }
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Activando...';
      }

      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Solicitando y activando clave Beta gratuita en la nube...</div>';
      }

      try {
        const res = await fetch('/api/local/claim-beta-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });
        const data = await res.json();
        if (data.success && data.licenseKey) {
          const licInput = document.getElementById('wiz-input-lic');
          if (licInput) {
            licInput.value = data.licenseKey;
          }
          if (alertBox) {
            renderWizardSuccessCard(alertBox, '¡Licencia Beta activada con éxito! Válida hasta el 31/12/2026.');
          }
          if (typeof showSmartToast === 'function') {
            showSmartToast({
              title: '¡Licencia Beta Activada!',
              message: 'Puesto vinculado con éxito. Avanzando...',
              type: 'success'
            });
          }
          if (typeof fetchStatus === 'function') {
            fetchStatus();
          }
          setTimeout(function() {
            setWizardStep(2);
          }, 1200);
        } else {
          const errInfo = (typeof humanizeErrorMessage === 'function')
            ? humanizeErrorMessage(data.error || 'No se pudo reclamar la clave beta', 'license')
            : { title: 'Aviso en activación', message: data.error || 'Error al solicitar la clave', cause: data.error, suggestion: 'Comprueba tu conexión a internet o solicita una clave manual.' };
          if (alertBox) {
            renderWizardErrorCard(alertBox, errInfo, 
              '<button type="button" onclick="wizClaimBetaOneClick()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar activación</span></button>'
            );
          }
          if (typeof showSmartToast === 'function') {
            showSmartToast({
              title: 'Aviso de Activación',
              message: errInfo.message || errInfo.title,
              type: 'warn'
            });
          }
        }
      } catch (err) {
        const errInfo = (typeof humanizeErrorMessage === 'function')
          ? humanizeErrorMessage(err, 'license')
          : { title: 'Error de conexión', message: String(err), cause: 'No hay comunicación con el servidor central', suggestion: 'Verifica tu conexión a internet.' };
        if (alertBox) {
          renderWizardErrorCard(alertBox, errInfo, 
            '<button type="button" onclick="wizClaimBetaOneClick()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar</span></button>'
          );
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>Activar en 1 Clic ⚡</span>';
        }
      }
    }

    function wizSkipFactusolStep() {
      if (typeof showSmartToast === 'function') {
        showSmartToast({
          title: 'Modo Evaluación',
          message: 'Modo evaluación: Podrás vincular tu Factusol en cualquier momento.',
          type: 'info'
        });
      }
      setWizardStep(3);
    }

    function wizSkipToExplore() {
      localStorage.setItem('bentian_onboarding_completed', 'true');
      closeWizardModal();
      if (typeof showSmartToast === 'function') {
        showSmartToast({
          title: 'Modo Exploración',
          message: 'Asistente cerrado. Puedes explorar el programa libremente o configurarlo desde Ajustes.',
          type: 'info'
        });
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
        renderWizardErrorCard(alertBox, {
          title: 'Dirección web requerida',
          cause: 'No has introducido la dirección de tu tienda online.',
          suggestion: 'Escribe la dirección web donde vendes por internet (ejemplo: https://mitienda.com).'
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-univ-url&quot;).focus()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('edit') : '') + '<span>Escribir dirección</span></button>');
        return;
      }

      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Comprobando conexión con tu web...</div>';

      try {
        const res = await fetch('/api/local/test-universal-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl: url })
        });
        const data = await res.json();
        if (data.success) {
          renderWizardSuccessCard(alertBox, 'Conexión verificada con éxito con tu servidor web. El conector erp-bridge-endpoint.php responde correctamente.');
          showSmartToast({
            title: 'Canal Web Conectado',
            message: 'Tu tienda responde correctamente.',
            type: 'success'
          });
        } else {
          const errInfo = humanizeErrorMessage(data.message, 'channel');
          let extraActions = '';
          if (!url.startsWith('https://')) {
            extraActions += '<button type="button" onclick="fixInputHttps(&quot;wiz-input-univ-url&quot;); wizTestUniversal();" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('lock') : '') + '<span>Añadir https://</span></button>';
          }
          extraActions += '<button type="button" onclick="downloadUniversalCompanion()" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('download') : '') + '<span>Descargar erp-bridge-endpoint.php</span></button>';
          extraActions += '<button type="button" onclick="wizTestUniversal()" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar comprobación</span></button>';
          renderWizardErrorCard(alertBox, errInfo, extraActions);
          showSmartToast({
            title: errInfo.title,
            message: errInfo.message,
            type: 'warn'
          });
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        renderWizardErrorCard(alertBox, errInfo, 
          '<button type="button" onclick="wizTestUniversal()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar conexión</span></button>'
        );
      }
    }

    async function wizTestWooCommerce() {
      sanitizeUrlInput('wiz-input-wc-url');
      const storeUrl = document.getElementById('wiz-input-wc-url').value.trim();
      const consumerKey = document.getElementById('wiz-input-wc-key').value.trim();
      const consumerSecret = document.getElementById('wiz-input-wc-secret').value.trim();
      const alertBox = document.getElementById('wiz-wc-alert');
      const btn = document.getElementById('wiz-btn-test-wc');

      if (!storeUrl || !consumerKey || !consumerSecret) {
        renderWizardErrorCard(alertBox, {
          title: 'Credenciales de WooCommerce incompletas',
          cause: 'Se requiere la URL de la tienda, Consumer Key (ck_...) y Consumer Secret (cs_...).',
          suggestion: 'Copia las credenciales desde WooCommerce > Ajustes > Avanzado > REST API con permisos de Lectura/Escritura.'
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-wc-url&quot;).focus()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('edit') : '') + '<span>Completar credenciales</span></button>');
        return;
      }

      if (btn) btn.disabled = true;
      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Comprobando conexión REST API...</div>';

      try {
        const res = await fetch('/api/local/test-woocommerce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl: storeUrl, consumerKey: consumerKey, consumerSecret: consumerSecret })
        });
        const data = await res.json();
        if (data.success) {
          renderWizardSuccessCard(alertBox, 'Conexión con WooCommerce validada correctamente. La API REST está activa y autorizada.');
          showSmartToast({
            title: 'WooCommerce Conectado',
            message: 'Credenciales REST API verificadas.',
            type: 'success'
          });
        } else {
          const errInfo = humanizeErrorMessage(data.message, 'channel');
          let extraActions = '';
          if (!storeUrl.startsWith('https://')) {
            extraActions += '<button type="button" onclick="fixInputHttps(&quot;wiz-input-wc-url&quot;); wizTestWooCommerce();" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('lock') : '') + '<span>Añadir https://</span></button>';
          }
          extraActions += '<button type="button" onclick="wizTestWooCommerce()" class="smart-error-btn">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar conexión REST API</span></button>';
          renderWizardErrorCard(alertBox, errInfo, extraActions);
          showSmartToast({
            title: errInfo.title,
            message: errInfo.message,
            type: 'warn'
          });
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        renderWizardErrorCard(alertBox, errInfo, 
          '<button type="button" onclick="wizTestWooCommerce()" class="smart-error-btn smart-error-btn-primary">' + (typeof renderIcon === 'function' ? renderIcon('refresh') : '') + '<span>Reintentar</span></button>'
        );
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function wizTestFactusolConnection() {
      if (typeof testFactusolConnection === 'function') {
        await testFactusolConnection('wiz-input-fact-path', 'wiz-fact-alert');
      }
    }

    async function finishWizardAndStart() {
      const factInput = document.getElementById('wiz-input-fact-path');
      const factPath = factInput ? ((typeof cleanPathInput === 'function') ? cleanPathInput(factInput) : factInput.value.trim()) : '';
      const orderSeriesInput = document.getElementById('wiz-input-fact-order-series');
      const orderSeriesVal = (orderSeriesInput ? orderSeriesInput.value : '1').trim().toUpperCase().substring(0, 1) || '1';

      // Guardar todo
      const payload = {
        licenseKey: document.getElementById('wiz-input-lic').value.trim() || undefined,
        channelType: currentChannelType,
        factusol: {
          databasePath: factPath || undefined,
          orderSeries: orderSeriesVal
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
      localStorage.setItem('bentian_onboarding_completed', 'true');
      closeWizardModal();
      switchTab('overview');
      triggerManualSync();

      if (typeof startSpotlightTour === 'function') {
        setTimeout(function() {
          startSpotlightTour();
        }, 500);
      }
    }

    const setWizStep = setWizardStep;
    window.setWizStep = setWizardStep;
    window.setWizardStep = setWizardStep;
    window.openWizardModal = openWizardModal;
    window.closeWizardModal = closeWizardModal;
    window.wizNextStep = wizNextStep;
    window.wizPrevStep = wizPrevStep;
    window.wizSelectChannel = wizSelectChannel;
    window.wizPasteAndActivateLicense = wizPasteAndActivateLicense;
    window.wizClaimBetaOneClick = wizClaimBetaOneClick;
    window.wizSkipFactusolStep = wizSkipFactusolStep;
    window.wizSkipToExplore = wizSkipToExplore;
    window.wizTestUniversal = wizTestUniversal;
    window.wizTestWooCommerce = wizTestWooCommerce;
    window.wizTestFactusolConnection = wizTestFactusolConnection;
    window.setWizOrderSeries = setWizOrderSeries;
    window.onWizOrderSeriesInput = onWizOrderSeriesInput;
    window.finishWizardAndStart = finishWizardAndStart;
`;
