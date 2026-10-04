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

      // Pre-cargar avisos por email si ya existen en la configuración
      try {
        const notif = (typeof currentStatus !== 'undefined' && currentStatus) ? (currentStatus.notifications || (currentStatus.config && currentStatus.config.notifications)) : null;
        if (notif) {
          const chk = document.getElementById('wiz-check-alerts-enabled');
          if (chk && notif.orderAlertsEnabled !== undefined) {
            chk.checked = !!notif.orderAlertsEnabled;
          }
          const emailInput = document.getElementById('wiz-input-notif-email');
          if (emailInput && notif.alertEmail) {
            emailInput.value = notif.alertEmail;
          }
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
      [1, 2, 3, 4, 5].forEach(function(i) {
        const pane = document.getElementById('wizard-pane-' + i);
        const stepHeader = document.getElementById('w-step-' + i);
        if (pane) pane.style.display = (i === step) ? 'block' : 'none';
        if (stepHeader) {
          stepHeader.className = 'wizard-step-item' + (i === step ? ' active' : (i < step ? ' done' : ''));
        }
      });

      document.getElementById('wiz-btn-prev').style.visibility = (step === 1) ? 'hidden' : 'visible';
      const nextBtn = document.getElementById('wiz-btn-next');
      if (step === 5) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = 'Siguiente Paso →';
      }
    }

    function wizNextStep() {
      if (wizardCurrentStep < 5) {
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
      alertEl.style.display = 'block';
      alertEl.innerHTML = 
        '<div class="smart-error-card">' +
          '<div class="smart-error-header">' +
            '<span>💡</span>' +
            '<span>' + (errInfo.title || '¿Qué ha ocurrido?') + '</span>' +
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
      alertEl.style.display = 'block';
      alertEl.innerHTML = 
        '<div class="smart-success-card">' +
          '<span>✓</span>' +
          '<span>' + message + '</span>' +
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
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-lic&quot;).focus()" class="smart-error-btn smart-error-btn-primary"><span>✍️ Escribir clave</span></button>');
        return;
      }

      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Activando clave en la nube...</div>';

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
            '<button type="button" onclick="document.getElementById(&quot;wiz-input-lic&quot;).focus()" class="smart-error-btn smart-error-btn-primary"><span>✏️ Corregir clave</span></button>' +
            '<button type="button" onclick="window.open(&quot;https://bridge.cristianjm.com/&quot;, &quot;_blank&quot;)" class="smart-error-btn"><span>🔑 Obtener nueva clave</span></button>'
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
          '<button type="button" onclick="wizPasteAndActivateLicense()" class="smart-error-btn smart-error-btn-primary"><span>🔄 Reintentar activación</span></button>'
        );
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
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-univ-url&quot;).focus()" class="smart-error-btn smart-error-btn-primary"><span>✍️ Escribir dirección</span></button>');
        return;
      }

      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Comprobando conexión con tu web...</div>';

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
            extraActions += '<button type="button" onclick="fixInputHttps(&quot;wiz-input-univ-url&quot;); wizTestUniversal();" class="smart-error-btn smart-error-btn-primary"><span>🔒 Añadir https://</span></button>';
          }
          extraActions += '<button type="button" onclick="downloadUniversalCompanion()" class="smart-error-btn"><span>⬇️ Descargar erp-bridge-endpoint.php</span></button>';
          extraActions += '<button type="button" onclick="wizTestUniversal()" class="smart-error-btn"><span>🔄 Reintentar comprobación</span></button>';
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
          '<button type="button" onclick="wizTestUniversal()" class="smart-error-btn smart-error-btn-primary"><span>🔄 Reintentar conexión</span></button>'
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
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-wc-url&quot;).focus()" class="smart-error-btn smart-error-btn-primary"><span>✍️ Completar credenciales</span></button>');
        return;
      }

      if (btn) btn.disabled = true;
      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Comprobando conexión REST API...</div>';

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
            extraActions += '<button type="button" onclick="fixInputHttps(&quot;wiz-input-wc-url&quot;); wizTestWooCommerce();" class="smart-error-btn smart-error-btn-primary"><span>🔒 Añadir https://</span></button>';
          }
          extraActions += '<button type="button" onclick="wizTestWooCommerce()" class="smart-error-btn"><span>🔄 Reintentar conexión REST API</span></button>';
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
          '<button type="button" onclick="wizTestWooCommerce()" class="smart-error-btn smart-error-btn-primary"><span>🔄 Reintentar</span></button>'
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

    async function wizTestOrderEmail() {
      const emailInput = document.getElementById('wiz-input-notif-email');
      const email = emailInput ? emailInput.value.trim() : '';
      const alertBox = document.getElementById('wiz-email-alert');
      const btn = document.getElementById('wiz-btn-test-email');

      if (!email) {
        renderWizardErrorCard(alertBox, {
          title: 'Correo de destino requerido',
          cause: 'No has especificado ninguna dirección de email para recibir las notificaciones.',
          suggestion: 'Introduce la dirección de correo corporativa donde deseas recibir los avisos de pedidos.'
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-notif-email&quot;).focus()" class="smart-error-btn smart-error-btn-primary"><span>✍️ Escribir correo</span></button>');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⏳</span> Enviando prueba...';
      }
      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;"><span class="spin">⏳</span> Enviando correo de prueba a ' + email + ' a través de Bentian Relay...</div>';

      try {
        const res = await fetch('/api/local/test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderAlertsEnabled: true,
            alertEmail: email
          })
        });
        const data = await res.json();
        if (data.success) {
          renderWizardSuccessCard(alertBox, data.message || 'Correo de prueba enviado con éxito a ' + email + '. Revisa tu bandeja de entrada o spam.');
          showSmartToast({
            title: 'Correo de Prueba Enviado',
            message: 'Mensaje de verificación entregado a ' + email,
            type: 'success'
          });
        } else {
          const errInfo = humanizeErrorMessage(data.message || 'No se pudo enviar el correo', 'channel');
          renderWizardErrorCard(alertBox, errInfo, 
            '<button type="button" onclick="wizTestOrderEmail()" class="smart-error-btn smart-error-btn-primary"><span>🔄 Reintentar envío</span></button>'
          );
          showSmartToast({
            title: 'Aviso en Envío de Email',
            message: data.message || 'Revisa la dirección indicada',
            type: 'warn'
          });
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        renderWizardErrorCard(alertBox, errInfo, 
          '<button type="button" onclick="wizTestOrderEmail()" class="smart-error-btn smart-error-btn-primary"><span>🔄 Reintentar</span></button>'
        );
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> <span>Probar Envío de Email</span>';
        }
      }
    }

    async function finishWizardAndStart() {
      const factInput = document.getElementById('wiz-input-fact-path');
      const factPath = factInput ? ((typeof cleanPathInput === 'function') ? cleanPathInput(factInput) : factInput.value.trim()) : '';
      const orderSeriesInput = document.getElementById('wiz-input-fact-order-series');
      const orderSeriesVal = (orderSeriesInput ? orderSeriesInput.value : '1').trim().toUpperCase().substring(0, 1) || '1';
      const alertsChk = document.getElementById('wiz-check-alerts-enabled');
      const wizAlertsEnabled = alertsChk ? alertsChk.checked : true;
      const emailInput = document.getElementById('wiz-input-notif-email');
      const wizAlertEmail = emailInput ? emailInput.value.trim() : '';

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
        },
        notifications: {
          orderAlertsEnabled: wizAlertsEnabled,
          alertEmail: wizAlertEmail
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

    window.openWizardModal = openWizardModal;
    window.closeWizardModal = closeWizardModal;
    window.setWizStep = setWizStep;
    window.setWizOrderSeries = setWizOrderSeries;
    window.wizTestOrderEmail = wizTestOrderEmail;
    window.finishWizardAndStart = finishWizardAndStart;
`;
