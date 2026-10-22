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
        if (typeof currentStatus !== 'undefined' && currentStatus && currentStatus.erpType) {
          if (typeof wizSelectErp === 'function') {
            wizSelectErp(currentStatus.erpType);
          }
        }
      } catch (e) {}
      setWizOrderSeries(existingSeries);

      // Pre-cargar clave de licencia, ruta Factusol, SimplyGest y Canal Web desde currentStatus o DOM
      try {
        const st = (typeof currentStatus !== 'undefined' && currentStatus) ? currentStatus : null;
        const wizLicInput = document.getElementById('wiz-input-lic');
        const mainLicInput = document.getElementById('input-lic-key');
        if (wizLicInput && !wizLicInput.value) {
          wizLicInput.value = (st && st.licenseKey) || (mainLicInput && mainLicInput.value) || '';
        }

        const wizFactInput = document.getElementById('wiz-input-fact-path');
        const mainFactInput = document.getElementById('input-factusol-db');
        if (wizFactInput && !wizFactInput.value) {
          const stFactPath = (st && st.factusol && st.factusol.databasePath) || (st && st.factusolSettings && st.factusolSettings.databasePath) || '';
          wizFactInput.value = stFactPath || (mainFactInput && mainFactInput.value) || '';
        }

        const wizSgInput = document.getElementById('wiz-input-simplygest-path');
        const mainSgInput = document.getElementById('input-simplygest-db');
        if (wizSgInput && !wizSgInput.value) {
          const stSgPath = (st && st.simplygest && st.simplygest.databasePath) || (st && st.simplygestSettings && st.simplygestSettings.databasePath) || '';
          wizSgInput.value = stSgPath || (mainSgInput && mainSgInput.value) || '';
        }

        const wizUnivUrl = document.getElementById('wiz-input-univ-url');
        const mainUnivUrl = document.getElementById('input-universal-url');
        if (wizUnivUrl && !wizUnivUrl.value) {
          const stUnivUrl = (st && st.universalBridgeSettings && st.universalBridgeSettings.storeUrl) || '';
          wizUnivUrl.value = stUnivUrl || (mainUnivUrl && mainUnivUrl.value) || '';
        }

        if (st && st.channelType && typeof wizSelectChannel === 'function') {
          wizSelectChannel(st.channelType);
        }

        // Si la licencia ya está activa, avanzar automáticamente al Paso 2 para no mostrar el Paso 1 vacío
        if (typeof isWizardLicenseActive === 'function' && isWizardLicenseActive()) {
          setWizardStep(2);
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

    function wizPersistDraftInputs() {
      try {
        const factInput = document.getElementById('wiz-input-fact-path');
        const factPath = factInput ? ((typeof cleanPathInput === 'function') ? cleanPathInput(factInput) : factInput.value.trim()) : '';
        const mainFactInput = document.getElementById('input-factusol-db');
        if (factPath && mainFactInput) mainFactInput.value = factPath;

        const orderSeriesInput = document.getElementById('wiz-input-fact-order-series');
        const orderSeriesVal = (orderSeriesInput ? orderSeriesInput.value : '1').trim().toUpperCase().substring(0, 1) || '1';

        const sgInput = document.getElementById('wiz-input-simplygest-path');
        const sgPath = sgInput ? ((typeof cleanPathInput === 'function') ? cleanPathInput(sgInput) : sgInput.value.trim()) : '';
        const mainSgInput = document.getElementById('input-simplygest-db');
        if (sgPath && mainSgInput) mainSgInput.value = sgPath;

        const univInput = document.getElementById('wiz-input-univ-url');
        const univUrl = univInput ? univInput.value.trim() : '';
        const mainUnivInput = document.getElementById('input-universal-url');
        if (univUrl && mainUnivInput) mainUnivInput.value = univUrl;

        const wcUrlInput = document.getElementById('wiz-input-wc-url');
        const wcUrl = wcUrlInput ? wcUrlInput.value.trim() : '';

        if (!factPath && !sgPath && !univUrl && !wcUrl) return;

        const activeErp = (typeof currentErpType !== 'undefined' && currentErpType) ? currentErpType : 'factusol';
        const draftPayload = {
          erpType: activeErp,
          channelType: (typeof currentChannelType !== 'undefined' && currentChannelType) ? currentChannelType : undefined,
          factusol: factPath ? { databasePath: factPath, orderSeries: orderSeriesVal } : undefined,
          simplygest: sgPath ? { databasePath: sgPath } : undefined,
          universalBridge: univUrl ? { storeUrl: univUrl, enabled: true } : undefined,
          woocommerce: wcUrl ? {
            storeUrl: wcUrl,
            consumerKey: (document.getElementById('wiz-input-wc-key') ? document.getElementById('wiz-input-wc-key').value.trim() : '') || undefined,
            consumerSecret: (document.getElementById('wiz-input-wc-secret') ? document.getElementById('wiz-input-wc-secret').value.trim() : '') || undefined
          } : undefined
        };
        fetch('/api/local/save-full-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftPayload)
        }).catch(function() {});
      } catch (e) {}
    }

    function closeWizardModal() {
      wizPersistDraftInputs();
      document.getElementById('modal-wizard').classList.remove('open');
    }

    function isWizardLicenseActive() {
      if (window.__wizardLicenseJustActivated) return true;
      if (typeof currentStatus !== 'undefined' && currentStatus && currentStatus.license) {
        const st = currentStatus.license.status;
        if (st === 'VALID' || st === 'GRACE_PERIOD' || currentStatus.license.valid === true) {
          return true;
        }
      }
      return false;
    }

    function setWizardStep(step) {
      if (step > 1 && !isWizardLicenseActive()) {
        step = 1;
        const alertBox = document.getElementById('wiz-lic-alert');
        if (alertBox) {
          renderWizardErrorCard(alertBox, {
            title: 'Activación de licencia obligatoria',
            cause: 'Para configurar un ERP o sincronizar tu tienda es necesario activar primero una clave de licencia en el Paso 1.',
            suggestion: 'Introduce tu correo arriba para activar tu Licencia Beta Gratuita en 1 Clic o pega tu clave EB-...'
          }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-claim-email&quot;).focus()" class="smart-error-btn smart-error-btn-primary">⚡ Activar Beta Gratuita en 1 Clic</button>');
        }
        if (typeof showSmartToast === 'function') {
          showSmartToast({
            title: 'Licencia Requerida',
            message: 'Activa tu clave gratuita en 1 clic o introduce tu código EB-... antes de pasar al Paso 2.',
            type: 'warn'
          });
        }
        return;
      }
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
      if (wizardCurrentStep === 1 && !isWizardLicenseActive()) {
        setWizardStep(2);
        return;
      }
      wizPersistDraftInputs();
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
      const esc = window.escapeHtml || function(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
      const rawTitle = errInfo.title || '¿Qué ha ocurrido?';
      const cleanTitle = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(rawTitle) : rawTitle;
      const safeTitle = esc(cleanTitle);
      const safeCause = errInfo.cause ? esc(errInfo.cause) : '';
      const safeSuggestion = errInfo.suggestion ? esc(errInfo.suggestion) : '';
      alertEl.style.display = 'block';
      alertEl.innerHTML = 
        '<div class="smart-error-card">' +
          '<div class="smart-error-header">' +
            (typeof renderIcon === 'function' ? renderIcon('info', 'color:#f87171;') : '') +
            '<span>' + safeTitle + '</span>' +
          '</div>' +
          '<div class="smart-error-cause">' +
            (safeCause ? ('<strong>Causa:</strong> ' + safeCause + '<br>') : '') +
            (safeSuggestion ? ('<strong>Solución recomendada:</strong> ' + safeSuggestion) : '') +
          '</div>' +
          (extraActionsHtml ? ('<div class="smart-error-actions">' + extraActionsHtml + '</div>') : '') +
        '</div>';
    }

    function renderWizardSuccessCard(alertEl, message) {
      if (!alertEl) return;
      const esc = window.escapeHtml || function(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
      const cleanMsg = (typeof stripLeadingIcons === 'function') ? stripLeadingIcons(message) : (message || '');
      const safeMsg = esc(cleanMsg);
      alertEl.style.display = 'block';
      alertEl.innerHTML = 
        '<div class="smart-success-card">' +
          (typeof renderIcon === 'function' ? renderIcon('check', 'color:#34d399;') : '') +
          '<span>' + safeMsg + '</span>' +
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
          window.__wizardLicenseJustActivated = true;
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
          window.__wizardLicenseJustActivated = true;
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
      if (!isWizardLicenseActive()) {
        const alertBox = document.getElementById('wiz-lic-alert');
        if (alertBox) {
          renderWizardErrorCard(alertBox, {
            title: 'Licencia requerida para utilizar el programa',
            cause: 'El uso sin clave de licencia está deshabilitado por seguridad.',
            suggestion: 'Solicita tu clave Beta Gratuita en 1 Clic introduciendo tu email arriba o pega tu código EB-...'
          }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-claim-email&quot;).focus()" class="smart-error-btn smart-error-btn-primary">⚡ Activar Clave Gratuita en 1 Clic</button>');
        }
        return;
      }
      localStorage.setItem('bentian_onboarding_completed', 'true');
      closeWizardModal();
    }

    function wizSelectChannel(type) {
      const cardUniv = document.getElementById('wiz-choice-univ');
      const cardWoo = document.getElementById('wiz-choice-woo');
      const cardPs = document.getElementById('wiz-choice-prestashop');
      const cardShop = document.getElementById('wiz-choice-shopify');
      const panelUniv = document.getElementById('wiz-panel-univ');
      const panelWoo = document.getElementById('wiz-panel-woo');
      const panelPs = document.getElementById('wiz-panel-prestashop');
      const panelShop = document.getElementById('wiz-panel-shopify');

      [cardUniv, cardWoo, cardPs, cardShop].forEach(function(c) { if (c) c.classList.remove('selected'); });
      [panelUniv, panelWoo, panelPs, panelShop].forEach(function(p) { if (p) p.style.display = 'none'; });

      if (type === 'universal_bridge') {
        if (cardUniv) cardUniv.classList.add('selected');
        if (panelUniv) panelUniv.style.display = 'block';
      } else if (type === 'prestashop') {
        if (cardPs) cardPs.classList.add('selected');
        if (panelPs) panelPs.style.display = 'block';
      } else if (type === 'shopify') {
        if (cardShop) cardShop.classList.add('selected');
        if (panelShop) panelShop.style.display = 'block';
      } else {
        if (cardWoo) cardWoo.classList.add('selected');
        if (panelWoo) panelWoo.style.display = 'block';
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

    async function wizTestPrestashop() {
      sanitizeUrlInput('wiz-input-ps-url');
      const storeUrl = (document.getElementById('wiz-input-ps-url') ? document.getElementById('wiz-input-ps-url').value : '').trim();
      const apiKey = (document.getElementById('wiz-input-ps-key') ? document.getElementById('wiz-input-ps-key').value : '').trim();
      const alertBox = document.getElementById('wiz-ps-alert');
      const btn = document.getElementById('wiz-btn-test-ps');

      if (!storeUrl || !apiKey) {
        renderWizardErrorCard(alertBox, {
          title: 'Credenciales de PrestaShop incompletas',
          cause: 'Se requiere la URL de la tienda y la clave de Webservice (32 caracteres).',
          suggestion: 'Copia la clave desde Parámetros Avanzados > Webservice en tu Backoffice de PrestaShop.'
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-ps-url&quot;).focus()" class="smart-error-btn smart-error-btn-primary">Completar credenciales</button>');
        return;
      }

      if (btn) btn.disabled = true;
      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;">Comprobando conexión con PrestaShop Webservice API...</div>';

      try {
        const res = await fetch('/api/local/test-prestashop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl: storeUrl, apiKey: apiKey })
        });
        const data = await res.json();
        if (data.success) {
          renderWizardSuccessCard(alertBox, 'Conexión con PrestaShop Webservices validada con éxito.');
          showSmartToast({ title: 'PrestaShop Conectado', message: 'Servicio Web verificado.', type: 'success' });
        } else {
          const errInfo = humanizeErrorMessage(data.message || 'Error en PrestaShop', 'channel');
          renderWizardErrorCard(alertBox, errInfo, '<button type="button" onclick="wizTestPrestashop()" class="smart-error-btn smart-error-btn-primary">Reintentar</button>');
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        renderWizardErrorCard(alertBox, errInfo, '<button type="button" onclick="wizTestPrestashop()" class="smart-error-btn smart-error-btn-primary">Reintentar</button>');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function wizTestShopify() {
      const shopSubdomain = (document.getElementById('wiz-input-shopify-subdomain') ? document.getElementById('wiz-input-shopify-subdomain').value : '').trim();
      const accessToken = (document.getElementById('wiz-input-shopify-token') ? document.getElementById('wiz-input-shopify-token').value : '').trim();
      const alertBox = document.getElementById('wiz-shopify-alert');
      const btn = document.getElementById('wiz-btn-test-shopify');

      if (!shopSubdomain || !accessToken) {
        renderWizardErrorCard(alertBox, {
          title: 'Credenciales de Shopify incompletas',
          cause: 'Se requiere el subdominio (.myshopify.com) y el Admin API Access Token (shpat_...).',
          suggestion: 'Copia las credenciales desde Configuración > Aplicaciones en tu Shopify Admin.'
        }, '<button type="button" onclick="document.getElementById(&quot;wiz-input-shopify-subdomain&quot;).focus()" class="smart-error-btn smart-error-btn-primary">Completar credenciales</button>');
        return;
      }

      if (btn) btn.disabled = true;
      alertBox.style.display = 'block';
      alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;">Comprobando conexión con Shopify GraphQL Admin API...</div>';

      try {
        const res = await fetch('/api/local/test-shopify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopSubdomain: shopSubdomain, accessToken: accessToken })
        });
        const data = await res.json();
        if (data.success) {
          renderWizardSuccessCard(alertBox, 'Conexión con Shopify GraphQL Admin API validada con éxito.');
          showSmartToast({ title: 'Shopify Conectado', message: 'GraphQL Admin API verificada.', type: 'success' });
        } else {
          const errInfo = humanizeErrorMessage(data.message || 'Error en Shopify', 'channel');
          renderWizardErrorCard(alertBox, errInfo, '<button type="button" onclick="wizTestShopify()" class="smart-error-btn smart-error-btn-primary">Reintentar</button>');
        }
      } catch (err) {
        const errInfo = humanizeErrorMessage(err, 'channel');
        renderWizardErrorCard(alertBox, errInfo, '<button type="button" onclick="wizTestShopify()" class="smart-error-btn smart-error-btn-primary">Reintentar</button>');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function wizTestFactusolConnection() {
      if (typeof testFactusolConnection === 'function') {
        await testFactusolConnection('wiz-input-fact-path', 'wiz-fact-alert');
      }
    }

    function wizToggleSqlAuthFields(mode) {
      const row = document.getElementById('wiz-sql-credentials-row');
      if (row) {
        row.style.display = (mode === 'sql') ? 'grid' : 'none';
      }
    }

    function toggleMainSqlAuthFields(mode) {
      const row = document.getElementById('main-sql-credentials-row');
      if (row) {
        row.style.display = (mode === 'sql') ? 'grid' : 'none';
      }
    }

    async function wizDetectSqlInstances(isWizard) {
      const btn = document.getElementById(isWizard ? 'wiz-btn-detect-sql' : 'btn-detect-sql-main');
      const box = document.getElementById(isWizard ? 'wiz-sql-detected-box' : 'sql-main-detected-box');
      const list = document.getElementById(isWizard ? 'wiz-sql-detected-list' : 'sql-main-detected-list');
      const originalHtml = btn ? btn.innerHTML : '';

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Escaneando SQL Server local...';
      }

      try {
        const res = await fetch('/api/local/detect-sql-instances', { method: 'POST' });
        const data = await res.json();
        if (box) box.style.display = 'block';
        const esc = window.escapeHtml || function(s) { return String(s || ''); };

        if (data.instances && data.instances.length > 0 && list) {
          list.innerHTML = data.instances.map(function(inst) {
            const safeServer = esc(inst.serverInstance).split('"').join('&quot;');
            const firstDb = (inst.databases && inst.databases[0]) ? esc(inst.databases[0]).split('"').join('&quot;') : '';
            const dbBadges = (inst.databases && inst.databases.length > 0)
              ? inst.databases.slice(0, 5).map(function(d) { return '<span class="tag tag-blue" style="font-size:10px;margin-right:4px;">' + esc(d) + '</span>'; }).join('')
              : '<span style="color:var(--text-muted);font-size:11px;">Instancia activa</span>';
            return '<div data-server="' + safeServer + '" data-db="' + firstDb + '" data-wiz="' + (isWizard ? 'true' : 'false') + '" onclick="selectDetectedSqlInstance(this.getAttribute(&quot;data-server&quot;), this.getAttribute(&quot;data-db&quot;), this.getAttribute(&quot;data-wiz&quot;) === &quot;true&quot;)" style="background:#1e1e26;border:1px solid var(--card-border);padding:9px 12px;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:12px;">' +
              '<div><strong>' + esc(inst.label || inst.serverInstance) + '</strong><div style="margin-top:4px;">' + dbBadges + '</div></div>' +
              '<span class="tag tag-green">Usar instancia</span>' +
            '</div>';
          }).join('');
        } else if (list) {
          list.innerHTML = '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);padding:10px 12px;border-radius:8px;font-size:12px;color:#cbd5e1;">No se detectaron instancias SQL locales con Autenticación de Windows automática. Puedes indicar manualmente la instancia (ej: <code>.\\SQLEXPRESS</code>) o pulsar en <strong>🧪 Probar en Modo Evaluación</strong>.</div>';
        }
      } catch (err) {
        if (typeof showToast === 'function') showToast('Error al detectar instancias SQL', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      }
    }

    function selectDetectedSqlInstance(serverInstance, dbName, isWizard) {
      const instEl = document.getElementById(isWizard ? 'wiz-input-sql-instance' : 'input-sql-erp-instance');
      const dbEl = document.getElementById(isWizard ? 'wiz-input-sql-dbname' : 'input-sql-erp-db');
      if (instEl && serverInstance) instEl.value = serverInstance;
      if (dbEl && dbName) dbEl.value = dbName;
      if (isWizard) {
        wizTestSqlErpConnection();
      } else {
        testMainSqlErpConnection();
      }
    }

    async function wizTestSqlErpConnection() {
      const activeErp = (typeof currentErpType !== 'undefined' && currentErpType) ? currentErpType : 'agora';
      const defaultDbMap = { agora: 'AgoraDB', sage50: 'GESTION', a3erp: 'A3ERP' };
      const sqlInstance = (document.getElementById('wiz-input-sql-instance') ? document.getElementById('wiz-input-sql-instance').value.trim() : '') || (activeErp === 'sage50' ? '.\\SAGE50' : '.\\SQLEXPRESS');
      const databasePath = (document.getElementById('wiz-input-sql-dbname') ? document.getElementById('wiz-input-sql-dbname').value.trim() : '') || (defaultDbMap[activeErp] || 'AgoraDB');
      const authMode = document.getElementById('wiz-select-sql-auth') ? document.getElementById('wiz-select-sql-auth').value : 'windows';
      const username = document.getElementById('wiz-input-sql-user') ? document.getElementById('wiz-input-sql-user').value.trim() : 'sa';
      const password = document.getElementById('wiz-input-sql-pass') ? document.getElementById('wiz-input-sql-pass').value : '';
      const orderSeries = (document.getElementById('wiz-input-sql-series') ? document.getElementById('wiz-input-sql-series').value.trim() : '1') || '1';
      const alertBox = document.getElementById('wiz-sql-alert');

      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = '<div style="color:var(--text-muted);padding:8px 0;font-size:12px;">⏳ Comprobando conexión local con SQL Server...</div>';
      }

      try {
        const res = await fetch('/api/local/test-sql-erp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            erpType: activeErp,
            serverInstance: sqlInstance,
            sqlInstance: sqlInstance,
            databaseName: databasePath,
            databasePath: databasePath,
            authMode: authMode,
            username: username,
            password: password,
            orderSeries: orderSeries,
            evaluationMode: databasePath.toUpperCase() === 'DEMO'
          })
        });
        const data = await res.json();
        if (data.success) {
          renderWizardSuccessCard(alertBox, data.message || 'Conexión SQL Server verificada con éxito.');
          if (typeof showSmartToast === 'function') {
            showSmartToast({ title: 'ERP SQL Conectado', message: data.message, type: 'success' });
          }
        } else {
          renderWizardErrorCard(alertBox, {
            title: 'No se pudo conectar al servidor SQL local',
            cause: data.message || 'Instancia SQL no accesible.',
            suggestion: 'Verifica que el servicio SQL Server esté iniciado o activa el Modo Evaluación (Sin ERP instalado) para hacer pruebas.'
          }, '<button type="button" onclick="wizEnableEvaluationMode()" class="smart-error-btn smart-error-btn-primary">🧪 Activar Modo Evaluación</button>');
        }
      } catch (err) {
        renderWizardErrorCard(alertBox, {
          title: 'Error al probar SQL Server',
          cause: String(err),
          suggestion: 'Puedes activar el Modo Evaluación en 1 clic si estás en un equipo de pruebas.'
        });
      }
    }

    async function testMainSqlErpConnection() {
      const activeErp = (typeof currentErpType !== 'undefined' && currentErpType) ? currentErpType : 'agora';
      const defaultDbMap = { agora: 'AgoraDB', sage50: 'GESTION', a3erp: 'A3ERP' };
      const sqlInstance = (document.getElementById('input-sql-erp-instance') ? document.getElementById('input-sql-erp-instance').value.trim() : '') || (activeErp === 'sage50' ? '.\\SAGE50' : '.\\SQLEXPRESS');
      const databasePath = (document.getElementById('input-sql-erp-db') ? document.getElementById('input-sql-erp-db').value.trim() : '') || (defaultDbMap[activeErp] || 'AgoraDB');
      const authMode = document.getElementById('select-sql-erp-auth') ? document.getElementById('select-sql-erp-auth').value : 'windows';
      const username = document.getElementById('input-sql-erp-user') ? document.getElementById('input-sql-erp-user').value.trim() : 'sa';
      const password = document.getElementById('input-sql-erp-pass') ? document.getElementById('input-sql-erp-pass').value : '';
      const orderSeries = (document.getElementById('input-sql-erp-series') ? document.getElementById('input-sql-erp-series').value.trim() : '1') || '1';
      const alertBox = document.getElementById('sql-main-test-alert');

      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = '<div style="color:var(--text-muted);padding:6px 0;font-size:12px;">⏳ Verificando conexión SQL Server...</div>';
      }

      try {
        const res = await fetch('/api/local/test-sql-erp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            erpType: activeErp,
            serverInstance: sqlInstance,
            sqlInstance: sqlInstance,
            databaseName: databasePath,
            databasePath: databasePath,
            authMode: authMode,
            username: username,
            password: password,
            orderSeries: orderSeries,
            evaluationMode: databasePath.toUpperCase() === 'DEMO'
          })
        });
        const data = await res.json();
        if (data.success) {
          renderWizardSuccessCard(alertBox, data.message || 'Conexión SQL Server verificada.');
          loadSqlErpPreview();
        } else {
          renderWizardErrorCard(alertBox, {
            title: 'Error de conexión SQL Server',
            cause: data.message,
            suggestion: 'Comprueba la instancia SQL o activa el Modo Evaluación (Datos Demo).'
          });
        }
      } catch (err) {
        renderWizardErrorCard(alertBox, { title: 'Error SQL', cause: String(err) });
      }
    }

    async function wizEnableEvaluationMode() {
      const activeErp = (typeof currentErpType !== 'undefined' && currentErpType) ? currentErpType : 'factusol';
      try {
        const factInput = document.getElementById('wiz-input-fact-path');
        const sgInput = document.getElementById('wiz-input-simplygest-path');
        const sqlDbInput = document.getElementById('wiz-input-sql-dbname');
        if (activeErp === 'factusol' && factInput) factInput.value = 'DEMO';
        if (activeErp === 'simplygest' && sgInput) sgInput.value = 'DEMO';
        if (sqlDbInput && (activeErp === 'agora' || activeErp === 'sage50' || activeErp === 'a3erp')) sqlDbInput.value = 'DEMO';

        const res = await fetch('/api/local/test-sql-erp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            erpType: activeErp,
            databasePath: 'DEMO',
            evaluationMode: true
          })
        });
        const data = await res.json();
        const alertId = activeErp === 'simplygest' ? 'wiz-simplygest-alert' : ((activeErp === 'agora' || activeErp === 'sage50' || activeErp === 'a3erp') ? 'wiz-sql-alert' : 'wiz-fact-alert');
        const alertBox = document.getElementById(alertId);
        if (alertBox) {
          renderWizardSuccessCard(alertBox, data.message || 'Modo Evaluación (Datos Demo) activado con éxito.');
        }
        if (typeof showSmartToast === 'function') {
          showSmartToast({
            title: '🧪 Modo Evaluación Activado',
            message: (data.message || 'Datos Demo cargados') + '. Puedes avanzar al Paso 3.',
            type: 'success'
          });
        }
      } catch (err) {
        if (typeof showToast === 'function') showToast('Modo Evaluación activado', 'info');
      }
    }

    async function enableSqlEvaluationModeMain() {
      const dbInput = document.getElementById('input-sql-erp-db');
      if (dbInput) dbInput.value = 'DEMO';
      await testMainSqlErpConnection();
      await saveSqlErpSettings();
    }

    async function saveSqlErpSettings() {
      const activeErp = (typeof currentErpType !== 'undefined' && currentErpType) ? currentErpType : 'agora';
      const defaultDbMap = { agora: 'AgoraDB', sage50: 'GESTION', a3erp: 'A3ERP' };
      const sqlInstance = (document.getElementById('input-sql-erp-instance') ? document.getElementById('input-sql-erp-instance').value.trim() : '') || (activeErp === 'sage50' ? '.\\SAGE50' : '.\\SQLEXPRESS');
      const databasePath = (document.getElementById('input-sql-erp-db') ? document.getElementById('input-sql-erp-db').value.trim() : '') || (defaultDbMap[activeErp] || 'AgoraDB');
      const authMode = document.getElementById('select-sql-erp-auth') ? document.getElementById('select-sql-erp-auth').value : 'windows';
      const username = document.getElementById('input-sql-erp-user') ? document.getElementById('input-sql-erp-user').value.trim() : 'sa';
      const password = document.getElementById('input-sql-erp-pass') ? document.getElementById('input-sql-erp-pass').value : '';
      const warehouseCode = (document.getElementById('input-sql-erp-warehouse') ? document.getElementById('input-sql-erp-warehouse').value.trim() : '1') || '1';
      const orderSeries = (document.getElementById('input-sql-erp-series') ? document.getElementById('input-sql-erp-series').value.trim() : '1') || '1';
      const isDemo = databasePath.toUpperCase() === 'DEMO';

      const providerCfg = {
        serverInstance: sqlInstance,
        sqlInstance: sqlInstance,
        databaseName: databasePath,
        databasePath: databasePath,
        authMode: authMode,
        username: username,
        password: password || undefined,
        warehouseCode: warehouseCode,
        orderSeries: orderSeries,
        evaluationMode: isDemo
      };
      const providersMap = {};
      providersMap[activeErp] = providerCfg;

      const payload = {
        erpType: activeErp,
        evaluationMode: {
          enabled: isDemo,
          simulatedErp: activeErp
        },
        softwareErp: {
          activeProvider: activeErp,
          provisioned: true,
          providers: providersMap
        }
      };
      payload[activeErp] = providerCfg;
      await submitConfigUpdates(payload, 'Ajustes de ' + activeErp.toUpperCase() + ' guardados con éxito.');
      loadSqlErpPreview();
    }

    async function loadSqlErpPreview() {
      const tbody = document.getElementById('sql-erp-articles-table-body');
      if (!tbody) return;
      try {
        const res = await fetch('/api/local/erp/preview');
        const data = await res.json();
        const articles = data.articles || [];
        const tag = document.getElementById('sql-erp-article-count-tag');
        if (tag) tag.textContent = articles.length + ' arts. mostrados';
        if (articles.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">Sin artículos cargados. Conecta tu SQL Server o pulsa en "Activar Modo Evaluación (Datos Demo)".</td></tr>';
          return;
        }
        const esc = window.escapeHtml || function(s) { return String(s || ''); };
        tbody.innerHTML = articles.map(function(a) {
          const stockColor = a.stock > 0 ? '#34d399' : '#f87171';
          const displayPrice = (a.salePrice !== undefined && a.salePrice > 0) ? a.salePrice : a.costPrice;
          return '<tr>' +
            '<td><span class="tag tag-blue">' + esc(a.code) + '</span></td>' +
            '<td style="font-weight:500;">' + esc(a.description || 'Sin descripción') + '</td>' +
            '<td><span class="tag tag-amber">' + esc(a.family || 'GEN') + '</span></td>' +
            '<td style="text-align:right;font-weight:700;color:' + stockColor + '">' + Number(a.stock || 0) + '</td>' +
            '<td style="text-align:right;font-family:monospace;font-weight:600;color:#fff;">' + Number(displayPrice || 0).toFixed(2) + ' €</td>' +
            '<td style="color:var(--text-subtle);font-family:monospace;">' + esc(a.ean || '---') + '</td>' +
          '</tr>';
        }).join('');
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--rose);padding:20px;">Error al consultar vista previa del ERP SQL.</td></tr>';
      }
    }

    async function finishWizardAndStart() {
      if (!isWizardLicenseActive()) {
        setWizardStep(1);
        return;
      }
      const factInput = document.getElementById('wiz-input-fact-path');
      const factPath = factInput ? ((typeof cleanPathInput === 'function') ? cleanPathInput(factInput) : factInput.value.trim()) : '';
      const orderSeriesInput = document.getElementById('wiz-input-fact-order-series');
      const orderSeriesVal = (orderSeriesInput ? orderSeriesInput.value : '1').trim().toUpperCase().substring(0, 1) || '1';

      const sgInput = document.getElementById('wiz-input-simplygest-path');
      const sgPath = sgInput ? ((typeof cleanPathInput === 'function') ? cleanPathInput(sgInput) : sgInput.value.trim()) : '';
      const activeErp = (typeof currentErpType !== 'undefined' && currentErpType) ? currentErpType : 'factusol';

      const sqlInstance = (document.getElementById('wiz-input-sql-instance') ? document.getElementById('wiz-input-sql-instance').value.trim() : '') || '.\\SQLEXPRESS';
      const sqlDbName = (document.getElementById('wiz-input-sql-dbname') ? document.getElementById('wiz-input-sql-dbname').value.trim() : '') || '';
      const sqlAuthMode = document.getElementById('wiz-select-sql-auth') ? document.getElementById('wiz-select-sql-auth').value : 'windows';
      const sqlUser = document.getElementById('wiz-input-sql-user') ? document.getElementById('wiz-input-sql-user').value.trim() : 'sa';
      const sqlPass = document.getElementById('wiz-input-sql-pass') ? document.getElementById('wiz-input-sql-pass').value : '';
      const sqlSeries = (document.getElementById('wiz-input-sql-series') ? document.getElementById('wiz-input-sql-series').value.trim() : '1') || '1';

      const providers = {
        factusol: {
          databasePath: factPath || undefined,
          orderSeries: orderSeriesVal,
          evaluationMode: factPath.toUpperCase() === 'DEMO' ? true : undefined
        },
        simplygest: {
          databasePath: sgPath || undefined,
          evaluationMode: sgPath.toUpperCase() === 'DEMO' ? true : undefined
        }
      };

      if (activeErp === 'agora' || activeErp === 'sage50' || activeErp === 'a3erp') {
        const defaultDbMap = { agora: 'AgoraDB', sage50: 'GESTION', a3erp: 'A3ERP' };
        const effectiveDbName = sqlDbName || defaultDbMap[activeErp] || 'AgoraDB';
        providers[activeErp] = {
          serverInstance: sqlInstance,
          sqlInstance: sqlInstance,
          databaseName: effectiveDbName,
          databasePath: effectiveDbName,
          authMode: sqlAuthMode,
          username: sqlUser,
          password: sqlPass || undefined,
          orderSeries: sqlSeries,
          evaluationMode: effectiveDbName.toUpperCase() === 'DEMO' ? true : undefined
        };
      }

      // Guardar todo
      const payload = {
        licenseKey: document.getElementById('wiz-input-lic').value.trim() || undefined,
        channelType: currentChannelType,
        erpType: activeErp,
        softwareErp: {
          activeProvider: activeErp,
          provisioned: true,
          providers: providers
        },
        factusol: {
          databasePath: factPath || undefined,
          orderSeries: orderSeriesVal
        },
        simplygest: {
          databasePath: sgPath || undefined,
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
        prestashop: {
          storeUrl: (document.getElementById('wiz-input-ps-url') ? document.getElementById('wiz-input-ps-url').value.trim() : '') || undefined,
          apiKey: (document.getElementById('wiz-input-ps-key') ? document.getElementById('wiz-input-ps-key').value.trim() : '') || undefined,
        },
        shopify: {
          shopSubdomain: (document.getElementById('wiz-input-shopify-subdomain') ? document.getElementById('wiz-input-shopify-subdomain').value.trim() : '') || undefined,
          accessToken: (document.getElementById('wiz-input-shopify-token') ? document.getElementById('wiz-input-shopify-token').value.trim() : '') || undefined,
        }
      };
      if (activeErp === 'agora' || activeErp === 'sage50' || activeErp === 'a3erp') {
        payload[activeErp] = providers[activeErp];
      }
      await submitConfigUpdates(payload, '¡Configuración completada con éxito!');
      localStorage.setItem('bentian_onboarding_completed', 'true');
      closeWizardModal();
      switchTab('overview');
      if (typeof isStoreUrlConfigured === 'function' && isStoreUrlConfigured()) {
        triggerManualSync();
      } else {
        if (typeof showSmartToast === 'function') {
          showSmartToast({
            title: '¡Asistente completado!',
            message: 'Recuerda vincular la dirección de tu tienda online en Canal Web para activar la sincronización.',
            actionLabel: 'Vincular Tienda →',
            targetTab: 'channel',
            targetInputId: 'input-universal-url',
            type: 'info'
          });
        }
      }

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
    window.wizTestPrestashop = wizTestPrestashop;
    window.wizTestShopify = wizTestShopify;
    window.wizTestFactusolConnection = wizTestFactusolConnection;
    window.wizToggleSqlAuthFields = wizToggleSqlAuthFields;
    window.toggleMainSqlAuthFields = toggleMainSqlAuthFields;
    window.wizDetectSqlInstances = wizDetectSqlInstances;
    window.selectDetectedSqlInstance = selectDetectedSqlInstance;
    window.wizTestSqlErpConnection = wizTestSqlErpConnection;
    window.testMainSqlErpConnection = testMainSqlErpConnection;
    window.wizEnableEvaluationMode = wizEnableEvaluationMode;
    window.enableSqlEvaluationModeMain = enableSqlEvaluationModeMain;
    window.saveSqlErpSettings = saveSqlErpSettings;
    window.loadSqlErpPreview = loadSqlErpPreview;
    window.setWizOrderSeries = setWizOrderSeries;
    window.onWizOrderSeriesInput = onWizOrderSeriesInput;
    window.finishWizardAndStart = finishWizardAndStart;
`;
