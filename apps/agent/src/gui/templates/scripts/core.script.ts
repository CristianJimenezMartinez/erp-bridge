export const coreScript = `
    let currentStatus = null;
    let allArticles = [];
    let allLogs = [];
    let currentLogFilter = 'all';
    let currentChannelType = 'universal_bridge';
    let wizardCurrentStep = 1;

    // Interactive Toast with Smart Deep-Linking Actions
    let _toastTimer = null;
    let _currentToastAction = null;

    function hideToast() {
      const toast = document.getElementById('toast');
      if (toast) toast.classList.remove('show');
      if (_toastTimer) {
        clearTimeout(_toastTimer);
        _toastTimer = null;
      }
      _currentToastAction = null;
    }

    function handleToastAction() {
      if (_currentToastAction) {
        if (typeof _currentToastAction.handler === 'function') {
          _currentToastAction.handler();
        } else if (_currentToastAction.targetTab) {
          navigateToResolution(_currentToastAction.targetTab, _currentToastAction.targetInputId);
        }
      }
      hideToast();
    }

    function showSmartToast(options) {
      if (!options) return;
      if (typeof options === 'string') {
        const text = options;
        const type = arguments[1] || 'success';
        options = { message: text, type: type };
      }

      const title = options.title || '';
      const message = options.message || '';
      const type = options.type || 'info';
      const actionLabel = options.actionLabel || '';
      const targetTab = options.targetTab || null;
      const targetInputId = options.targetInputId || null;
      const onAction = options.onAction || null;
      const duration = options.duration || (actionLabel ? 7500 : 3800);

      const toast = document.getElementById('toast');
      const toastText = document.getElementById('toast-text');
      const toastTitle = document.getElementById('toast-title');
      const toastIcon = document.getElementById('toast-icon');
      const toastAction = document.getElementById('toast-action');
      const toastActionText = document.getElementById('toast-action-text');

      if (!toast) return;

      toast.className = 'toast-' + type;
      if (toastIcon) {
        toastIcon.textContent = type === 'success' ? '✓' : (type === 'warn' ? '⚠️' : (type === 'info' ? 'ℹ️' : '✕'));
      }
      if (toastTitle) {
        if (title) {
          toastTitle.textContent = title;
          toastTitle.style.display = 'block';
        } else {
          toastTitle.style.display = 'none';
        }
      }
      if (toastText) {
        toastText.textContent = message;
      }

      if (actionLabel && (targetTab || targetInputId || onAction)) {
        _currentToastAction = {
          targetTab: targetTab,
          targetInputId: targetInputId,
          handler: onAction
        };
        if (toastAction) {
          toastAction.style.display = 'inline-flex';
          if (toastActionText) toastActionText.textContent = actionLabel;
        }
      } else {
        _currentToastAction = null;
        if (toastAction) toastAction.style.display = 'none';
      }

      toast.classList.add('show');

      if (_toastTimer) clearTimeout(_toastTimer);
      _toastTimer = setTimeout(hideToast, duration);
    }

    function showToast(text, type) {
      if ((type === 'error' || type === 'warn') && typeof humanizeError === 'function') {
        const err = humanizeError(text);
        if (err && err.targetTab) {
          showSmartToast({
            title: err.title,
            message: err.message,
            type: type,
            actionLabel: err.actionLabel + ' →',
            targetTab: err.targetTab,
            targetInputId: err.targetInputId,
            onAction: function() {
              if (typeof resolveHumanizedError === 'function') {
                resolveHumanizedError(err);
              } else if (typeof navigateToResolution === 'function') {
                navigateToResolution(err.targetTab, err.targetInputId);
              }
            }
          });
          return;
        }
      }
      showSmartToast({ message: text, type: type || 'success' });
    }

    // Humanizador de Errores con Diagnóstico en Lenguaje Natural y Sugerencia de Resolución
    function humanizeErrorMessage(raw, context) {
      if (typeof humanizeError === 'function') {
        const h = humanizeError(raw);
        if (h && h.code !== 'ERR_INTERNAL_GENERIC') {
          return {
            code: h.code,
            title: h.title,
            message: h.message,
            cause: h.message,
            suggestion: h.suggestion,
            actionLabel: h.actionLabel + ' →',
            targetTab: h.targetTab,
            targetInputId: h.targetInputId,
            helpUrl: h.helpUrl,
            snippet: h.snippet
          };
        }
      }

      if (!raw) {
        return {
          title: 'Aviso del Sistema',
          message: 'Ha ocurrido una incidencia temporal en el sistema.',
          cause: 'El servicio no pudo completar la operación solicitada.',
          suggestion: 'Revisa los ajustes o pulsa en reintentar en unos instantes.',
          actionLabel: 'Ver Registro →',
          targetTab: 'logs',
          targetInputId: null
        };
      }

      const text = typeof raw === 'string' ? raw : (raw.message || raw.error || JSON.stringify(raw));
      const lower = text.toLowerCase();

      // Incidencias en Factusol ERP
      if (context === 'factusol' || lower.includes('.accdb') || lower.includes('.mdb') || lower.includes('factusol') || lower.includes('oledb') || lower.includes('jet') || lower.includes('ace.oledb')) {
        if (lower.includes('no such file') || lower.includes('no se encuentra') || lower.includes('not found') || lower.includes('no existe') || lower.includes('sin ruta') || lower.includes('ruta no válida')) {
          return {
            title: 'Base de datos Factusol no encontrada',
            message: 'No se ha podido localizar el archivo de Factusol en la ruta indicada.',
            cause: 'Es posible que el archivo haya cambiado de ubicación, el disco de red o NAS esté desconectado o el nombre del archivo contenga un error tipográfico.',
            suggestion: 'Comprueba que el archivo .accdb exista o utiliza el botón Auto-detectar Factusol.',
            actionLabel: 'Resolver en Factusol ERP →',
            targetTab: 'factusol',
            targetInputId: 'input-factusol-db'
          };
        }
        if (lower.includes('lock') || lower.includes('bloquead') || lower.includes('in use') || lower.includes('exclusiv')) {
          return {
            title: 'Base de datos Factusol en uso exclusivo',
            message: 'Factusol o un usuario en red tiene bloqueado el archivo de datos temporalmente.',
            cause: 'Microsoft Access restringe el acceso al archivo mientras se realizan procesos masivos o cierres de ejercicio.',
            suggestion: 'Espera unos segundos a que finalicen las operaciones en Factusol y vuelve a probar.',
            actionLabel: 'Revisar Factusol →',
            targetTab: 'factusol',
            targetInputId: 'input-factusol-db'
          };
        }
        if (lower.includes('driver') || lower.includes('provider') || lower.includes('clase no registrada') || lower.includes('microsoft.ace')) {
          return {
            title: 'Componente Microsoft Access OLEDB requerido',
            message: 'Windows necesita el componente oficial Microsoft Access Database Engine.',
            cause: 'El controlador OLEDB del sistema no está registrado para abrir bases de datos .accdb.',
            suggestion: 'Revisa el semáforo en la pestaña de Diagnóstico Pre-Flight en Estado General.',
            actionLabel: 'Ver Diagnóstico Pre-Flight →',
            targetTab: 'overview',
            targetInputId: 'pf-oledb-badge'
          };
        }
        return {
          title: 'Incidencia en Factusol ERP',
          message: text,
          cause: 'El agente no pudo consultar la información de artículos o pedidos de Factusol.',
          suggestion: 'Revisa la ruta del archivo y los permisos en la pestaña de Factusol.',
          actionLabel: 'Resolver en Factusol ERP →',
          targetTab: 'factusol',
          targetInputId: 'input-factusol-db'
        };
      }

      // Incidencias en Canal Web (Universal / WooCommerce)
      if (context === 'channel' || lower.includes('endpoint') || lower.includes('curl') || lower.includes('http') || lower.includes('woocommerce') || lower.includes('wordpress')) {
        if (lower.includes('404') || lower.includes('not found') || lower.includes('no encontrado') || lower.includes('endpointfound') || lower.includes('endpoint')) {
          return {
            title: 'Conector web no detectado (Error 404)',
            message: 'Tu servidor web responde, pero no encuentra el conector "erp-bridge-endpoint.php".',
            cause: 'El conector PHP aún no ha sido subido a la carpeta raíz de tu hosting (public_html o httpdocs).',
            suggestion: 'Descarga el conector erp-bridge-endpoint.php y súbelo a la carpeta pública de tu web mediante tu panel de hosting o FTP.',
            actionLabel: 'Corregir en Canal Web →',
            targetTab: 'channel',
            targetInputId: 'input-universal-url'
          };
        }
        if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('clave') || lower.includes('token') || lower.includes('secret')) {
          return {
            title: 'Clave de seguridad rechazada',
            message: 'La clave de seguridad no coincide con la configurada en tu tienda online.',
            cause: 'El token secreto configurado en el agente es diferente al del archivo en tu servidor o las claves REST API son incorrectas.',
            suggestion: 'Descarga de nuevo el conector con tu clave actual o actualiza la clave en la pestaña Canal Web.',
            actionLabel: 'Corregir en Canal Web →',
            targetTab: 'channel',
            targetInputId: 'input-universal-key'
          };
        }
        if (lower.includes('ssl') || lower.includes('cert_') || lower.includes('certificate') || lower.includes('https')) {
          return {
            title: 'Certificado de seguridad SSL no válido',
            message: 'Tu web no tiene un certificado SSL HTTPS seguro y verificado.',
            cause: 'El agente requiere una conexión cifrada por HTTPS para proteger los datos de tus clientes y pedidos.',
            suggestion: 'Verifica que tu dominio funcione bajo https:// y que el certificado SSL de tu hosting esté activo.',
            actionLabel: 'Corregir en Canal Web →',
            targetTab: 'channel',
            targetInputId: 'input-universal-url'
          };
        }
        if (lower.includes('timeout') || lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('red') || lower.includes('no responde')) {
          return {
            title: 'Tu tienda web no responde',
            message: 'No pudimos contactar con el servidor de tu tienda en el tiempo esperado.',
            cause: 'La dirección web podría tener una errata, el hosting estar temporalmente caído o haber una caída en la conexión a Internet.',
            suggestion: 'Verifica que la dirección de tu tienda abra correctamente en tu navegador.',
            actionLabel: 'Corregir en Canal Web →',
            targetTab: 'channel',
            targetInputId: 'input-universal-url'
          };
        }
        return {
          title: 'Incidencia en tu Canal Web',
          message: text,
          cause: 'El agente no pudo comunicarse con tu tienda online.',
          suggestion: 'Revisa la dirección web y las credenciales en la pestaña Canal Web.',
          actionLabel: 'Corregir en Canal Web →',
          targetTab: 'channel',
          targetInputId: 'input-universal-url'
        };
      }

      // Incidencias en Licencia
      if (context === 'license' || lower.includes('licenc') || lower.includes('hwid') || lower.includes('expir') || lower.includes('grace')) {
        return {
          title: 'Licencia del Puesto requerida',
          message: text,
          cause: 'Este equipo no cuenta con una clave de suscripción activa o ha concluido el período de prueba.',
          suggestion: 'Introduce la clave de tu licencia en la pestaña Licencia para restablecer la sincronización.',
          actionLabel: 'Ver Licencia →',
          targetTab: 'license',
          targetInputId: 'input-lic-key'
        };
      }

      return {
        title: 'Aviso del Sistema',
        message: text,
        cause: 'La operación no se pudo completar con éxito.',
        suggestion: 'Revisa la sección de Registros Técnicos para más detalles.',
        actionLabel: 'Ver Registro →',
        targetTab: 'logs',
        targetInputId: null
      };
    }

    // Auto-sanitización de URLs
    function sanitizeUrl(raw) {
      if (!raw) return '';
      let clean = raw.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      return clean.replace(/\\/+$/, '');
    }

    function sanitizeUrlInput(inputId) {
      const el = document.getElementById(inputId);
      if (el && el.value) {
        const sanitized = sanitizeUrl(el.value);
        if (sanitized !== el.value) {
          el.value = sanitized;
          showToast('Dirección web formateada con https://');
        }
      }
    }

    // Auto-sanitización de rutas de Windows (eliminar comillas de 'Copiar como ruta de acceso')
    function cleanPathValue(val) {
      if (!val) return '';
      let cleaned = String(val).trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.substring(1, cleaned.length - 1).trim();
      }
      return cleaned;
    }

    function cleanPathInput(inputIdOrEl) {
      const el = typeof inputIdOrEl === 'string' ? document.getElementById(inputIdOrEl) : inputIdOrEl;
      if (!el) return '';
      const original = el.value;
      const cleaned = cleanPathValue(original);
      if (cleaned !== original) {
        el.value = cleaned;
      }
      return cleaned;
    }

    // Tabs
    function switchTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });

      const targetPane = document.getElementById('tab-' + tabId);
      if (targetPane) targetPane.classList.add('active');

      const tabs = ['overview', 'factusol', 'channel', 'sync', 'history', 'logs', 'license'];
      const navItems = document.querySelectorAll('.nav-list .nav-item');
      const idx = tabs.indexOf(tabId);
      if (idx !== -1 && navItems[idx]) {
        navItems[idx].classList.add('active');
      }

      const titles = {
        overview: 'Estado General',
        factusol: 'Factusol ERP (Acceso Local)',
        channel: 'Canal Web / Tienda Online',
        sync: 'Automatización y Reglas',
        history: 'Historial de Operaciones',
        logs: 'Diagnóstico Técnico y Ayuda',
        license: 'Licencia del Equipo'
      };
      document.getElementById('header-page-title').innerHTML =
        '<div style="display:inline-flex;align-items:center;gap:8px;padding:3px 10px 3px 6px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:8px;">' +
          '<img src="/api/local/icon" width="18" height="18" alt="Bentian" style="border-radius:4px;display:block;" />' +
          '<span style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:#c7d2fe;text-transform:uppercase;">Bentian</span>' +
        '</div>' +
        '<span style="color:var(--text-muted);font-weight:400;font-size:13px;">/</span>' +
        '<span style="font-weight:600;font-size:15px;color:#f3f4f6;">' + (titles[tabId] || 'Bentian') + '</span>';

      if (tabId === 'factusol' && allArticles.length === 0) {
        loadArticlePreview();
        loadFactusolMetadata();
      } else if (tabId === 'history') {
        loadSyncHistory();
      }
    }

    // Navegación asistida directa con foco y animación de resplandor visual (Deep-Linking)
    function navigateToResolution(tabId, inputId) {
      if (tabId) {
        switchTab(tabId);
      }

      // Si el destino está en el Canal Web, activar la sub-vista correspondiente
      if (tabId === 'channel' && inputId) {
        if (inputId.indexOf('wc') !== -1) {
          if (typeof selectChannelType === 'function') selectChannelType('woocommerce');
        } else if (inputId.indexOf('univ') !== -1) {
          if (typeof selectChannelType === 'function') selectChannelType('universal_bridge');
        }
      }

      if (inputId) {
        setTimeout(function() {
          const el = document.getElementById(inputId);
          if (el) {
            try {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {
              el.scrollIntoView();
            }
            el.classList.remove('deep-link-target');
            void el.offsetWidth; // Forzar reflow para reiniciar la animación
            el.classList.add('deep-link-target');
            try {
              el.focus();
              if (typeof el.select === 'function' && el.value) {
                el.select();
              }
            } catch (e) {}
            setTimeout(function() {
              el.classList.remove('deep-link-target');
            }, 2600);
          }
        }, 200);
      }
    }


    // Channel Switcher
    function selectChannelType(type) {
      currentChannelType = type;
      window.__channelTypeInitialized = true;
      const cardUniv = document.getElementById('card-choice-universal');
      const cardWoo = document.getElementById('card-choice-woo');
      const panelUniv = document.getElementById('panel-universal-bridge');
      const panelWoo = document.getElementById('panel-woocommerce');

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
    }

    function generateRandomBridgeKey() {
      const randKey = 'EB_SEC_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      document.getElementById('input-universal-key').value = randKey;
      showToast('Nueva clave de seguridad generada');
    }

    function downloadUniversalCompanion() {
      const key = document.getElementById('input-universal-key').value || 'EB_SEC_' + Math.random().toString(36).substring(2, 12);
      window.open('/api/local/download-companion?secretKey=' + encodeURIComponent(key), '_blank');
      showToast('Descargando erp-bridge-endpoint.php...');
    }

    // ================= SPOTLIGHT TOUR (GUIDED WALKTHROUGH) =================
    let _spotlightCurrentStep = 0;
    const _spotlightSteps = [
      {
        target: '#zen-hero-card',
        badge: 'Foco 1 de 3',
        title: 'Estado en Tiempo Real',
        description: 'Monitorea Factusol, tu tienda web y la salud de la sincronización en vivo.',
        position: 'bottom'
      },
      {
        target: '#overview-recent-activity-section',
        fallback: '#overview-logs-list',
        badge: 'Foco 2 de 3',
        title: 'Cola de Pedidos',
        description: 'Cada pedido web que entra en Factusol aparece aquí con su serie, número y total.',
        position: 'top'
      },
      {
        target: '#btn-sync-header',
        fallback: '.sidebar',
        badge: 'Foco 3 de 3',
        title: 'Sincronización Manual',
        description: 'Puedes forzar lecturas de stock o pausar el agente cuando lo necesites.',
        position: 'bottom'
      }
    ];

    function startSpotlightTour(force) {
      if (!force && localStorage.getItem('bentian_spotlight_completed') === 'true') {
        return;
      }
      if (typeof switchTab === 'function') {
        switchTab('overview');
      }

      _spotlightCurrentStep = 0;
      createSpotlightDom();
      renderSpotlightStep(_spotlightCurrentStep);
    }

    function createSpotlightDom() {
      removeSpotlightDom();

      const frame = document.createElement('div');
      frame.id = 'bentian-spotlight-frame';
      document.body.appendChild(frame);

      const card = document.createElement('div');
      card.id = 'bentian-spotlight-card';
      document.body.appendChild(card);

      window.addEventListener('resize', handleSpotlightReposition);
      window.addEventListener('scroll', handleSpotlightReposition, true);
    }

    function handleSpotlightReposition() {
      if (document.getElementById('bentian-spotlight-frame')) {
        updateSpotlightPositions(_spotlightCurrentStep);
      }
    }

    function renderSpotlightStep(index) {
      const step = _spotlightSteps[index];
      if (!step) return;

      const card = document.getElementById('bentian-spotlight-card');
      if (!card) return;

      const isLast = (index === _spotlightSteps.length - 1);

      card.innerHTML = 
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span class="spotlight-badge">' + step.badge + '</span>' +
            '<span style="font-size:11px;color:var(--text-muted);">' + (index + 1) + ' de ' + _spotlightSteps.length + '</span>' +
          '</div>' +
          '<button type="button" onclick="closeSpotlightTour()" style="background:none;border:none;color:var(--text-subtle);font-size:16px;cursor:pointer;padding:2px 6px;line-height:1;" title="Cerrar recorrido">✕</button>' +
        '</div>' +
        '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
          '<span>✨</span><span>' + step.title + '</span>' +
        '</div>' +
        '<p style="font-size:12.5px;color:#cbd5e1;line-height:1.5;margin:0 0 16px 0;">' +
          step.description +
        '</p>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">' +
          '<div style="display:flex;gap:4px;">' +
            _spotlightSteps.map(function(_, i) {
              return '<span style="width:7px;height:7px;border-radius:50%;background:' + (i === index ? '#818cf8' : 'rgba(255,255,255,0.18)') + ';display:inline-block;transition:all 0.2s;"></span>';
            }).join('') +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            (index > 0 ? '<button type="button" onclick="prevSpotlightStep()" class="btn btn-secondary btn-sm" style="padding:4px 10px;font-size:11.5px;">← Anterior</button>' : '') +
            (isLast 
              ? '<button type="button" onclick="finishSpotlightTour()" class="btn btn-primary btn-sm" style="padding:5px 14px;font-weight:700;font-size:12px;background:linear-gradient(135deg, #10b981, #059669);border:none;box-shadow:0 0 15px rgba(16,185,129,0.4);"><span>Entendido, ¡a trabajar!</span> 🚀</button>'
              : '<button type="button" onclick="nextSpotlightStep()" class="btn btn-primary btn-sm" style="padding:4px 12px;font-size:11.5px;">Siguiente Paso →</button>'
            ) +
          '</div>' +
        '</div>';

      updateSpotlightPositions(index);
    }

    function updateSpotlightPositions(index) {
      const step = _spotlightSteps[index];
      if (!step) return;

      let el = document.querySelector(step.target);
      if (!el && step.fallback) {
        el = document.querySelector(step.fallback);
      }
      if (!el) return;

      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } catch (e) {}

      setTimeout(function() {
        const rect = el.getBoundingClientRect();
        const pad = 8;
        const frame = document.getElementById('bentian-spotlight-frame');
        if (frame) {
          frame.style.top = Math.max(0, rect.top - pad) + 'px';
          frame.style.left = Math.max(0, rect.left - pad) + 'px';
          frame.style.width = Math.max(20, rect.width + (pad * 2)) + 'px';
          frame.style.height = Math.max(20, rect.height + (pad * 2)) + 'px';
        }

        const card = document.getElementById('bentian-spotlight-card');
        if (card) {
          const cardWidth = 360;
          const cardHeight = card.offsetHeight || 180;
          let cardTop;
          let cardLeft = rect.left + (rect.width / 2) - (cardWidth / 2);

          if (step.position === 'top' || (rect.bottom + cardHeight + pad + 20 > window.innerHeight && rect.top > cardHeight + 20)) {
            cardTop = Math.max(16, rect.top - cardHeight - pad - 12);
          } else {
            cardTop = Math.min(window.innerHeight - cardHeight - 16, rect.bottom + pad + 12);
          }

          cardLeft = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, cardLeft));
          card.style.top = cardTop + 'px';
          card.style.left = cardLeft + 'px';
        }
      }, 120);
    }

    function nextSpotlightStep() {
      if (_spotlightCurrentStep < _spotlightSteps.length - 1) {
        _spotlightCurrentStep++;
        renderSpotlightStep(_spotlightCurrentStep);
      } else {
        finishSpotlightTour();
      }
    }

    function prevSpotlightStep() {
      if (_spotlightCurrentStep > 0) {
        _spotlightCurrentStep--;
        renderSpotlightStep(_spotlightCurrentStep);
      }
    }

    function finishSpotlightTour() {
      localStorage.setItem('bentian_spotlight_completed', 'true');
      removeSpotlightDom();
      if (typeof showToast === 'function') {
        showToast('✓ ¡Recorrido completado! Bentian Agent está activo.', 'success');
      }
    }

    function closeSpotlightTour() {
      localStorage.setItem('bentian_spotlight_completed', 'true');
      removeSpotlightDom();
    }

    function removeSpotlightDom() {
      window.removeEventListener('resize', handleSpotlightReposition);
      window.removeEventListener('scroll', handleSpotlightReposition, true);
      const frame = document.getElementById('bentian-spotlight-frame');
      if (frame) frame.remove();
      const card = document.getElementById('bentian-spotlight-card');
      if (card) card.remove();
    }
`;
