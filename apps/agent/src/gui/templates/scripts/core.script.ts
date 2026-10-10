export const coreScript = `
    // Interceptor global para inyectar token de sesión local en peticiones a la API
    (function() {
      const origFetch = window.fetch;
      window.fetch = function(input, init) {
        init = init || {};
        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (typeof url === 'string' && (url.startsWith('/api/local/') || url.startsWith('/v1/'))) {
          const metaEl = document.querySelector('meta[name="bentian-token"]');
          const token = window.__BENTIAN_TOKEN__ || (metaEl ? metaEl.getAttribute('content') : '');
          if (token) {
            init.headers = init.headers || {};
            if (typeof Headers !== 'undefined' && init.headers instanceof Headers) {
              if (!init.headers.has('X-Bentian-Token')) init.headers.set('X-Bentian-Token', token);
            } else if (Array.isArray(init.headers)) {
              init.headers.push(['X-Bentian-Token', token]);
            } else {
              init.headers['X-Bentian-Token'] = token;
            }
          }
        }
        return origFetch.call(this, input, init);
      };
    })();

    // Helper canónico global anti-XSS
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split("'").join('&#39;');
    }
    window.escapeHtml = escapeHtml;

    // Catálogo Centralizado de Iconos SVG Minimalistas Sobrios (Lucide style)
    const ICONS = {
      check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
      error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      close: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      tip: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
      refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>',
      edit: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
      key: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>',
      lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      download: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
      box: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
      mail: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
      star: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      arrowRight: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
    };
    window.ICONS = ICONS;

    function renderIcon(name, extraStyle) {
      const svg = ICONS[name] || ICONS.info;
      const style = 'display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0;vertical-align:middle;' + (extraStyle || '');
      return '<span style="' + style + '">' + svg + '</span>';
    }
    window.renderIcon = renderIcon;

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

    function stripLeadingIcons(str) {
      if (!str) return '';
      let s = String(str).trim();
      const icons = ['✓', '✔', '✕', '❌', '⚠️', 'ℹ️', '🎉', '💡', '🚨', '•', '—', '–', '-', ':'];
      let changed = true;
      while (changed && s.length > 0) {
        changed = false;
        s = s.trim();
        for (let i = 0; i < icons.length; i++) {
          if (s.startsWith(icons[i])) {
            s = s.substring(icons[i].length).trim();
            changed = true;
            break;
          }
        }
      }
      return s;
    }
    window.stripLeadingIcons = stripLeadingIcons;

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

      // Sanitización anti-duplicado de iconos y emojis
      const cleanMessage = stripLeadingIcons(message);
      const cleanTitle = stripLeadingIcons(title);

      toast.className = 'toast-' + type;
      if (toastIcon) {
        toastIcon.style.display = 'inline-flex';
        toastIcon.style.alignItems = 'center';
        toastIcon.style.justifyContent = 'center';
        toastIcon.style.width = '18px';
        toastIcon.style.height = '18px';
        toastIcon.style.flexShrink = '0';
        if (type === 'success') {
          toastIcon.innerHTML = ICONS.check;
          toastIcon.style.color = '#34d399';
        } else if (type === 'warn') {
          toastIcon.innerHTML = ICONS.warn;
          toastIcon.style.color = '#fbbf24';
        } else if (type === 'info') {
          toastIcon.innerHTML = ICONS.info;
          toastIcon.style.color = '#a5b4fc';
        } else {
          toastIcon.innerHTML = ICONS.error;
          toastIcon.style.color = '#f87171';
        }
      }
      if (toastTitle) {
        if (cleanTitle) {
          toastTitle.textContent = cleanTitle;
          toastTitle.style.display = 'block';
        } else {
          toastTitle.style.display = 'none';
        }
      }
      if (toastText) {
        toastText.textContent = cleanMessage;
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
      while (clean.endsWith('/')) {
        clean = clean.slice(0, -1);
      }
      return clean;
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

    function fixInputHttps(inputId) {
      const el = document.getElementById(inputId);
      if (el && el.value) {
        let val = el.value.trim();
        while (val.toLowerCase().startsWith('http://')) {
          val = val.substring(7);
        }
        while (val.toLowerCase().startsWith('https://')) {
          val = val.substring(8);
        }
        el.value = 'https://' + val;
      }
    }
    window.fixInputHttps = fixInputHttps;

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
        history: 'Historial de Ventas',
        logs: 'Diagnóstico Técnico y Ayuda',
        license: 'Licencia del Equipo'
      };
      const titleEl = document.getElementById('header-page-title');
      if (titleEl) {
        titleEl.textContent = titles[tabId] || 'Bentian ERP Bridge';
      }

      if (tabId === 'factusol' && allArticles.length === 0) {
        loadArticlePreview();
        loadFactusolMetadata();
      } else if (tabId === 'history') {
        if (typeof loadSalesOrders === 'function') loadSalesOrders();
      }
    }
    window.switchTab = switchTab;

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
        } else if (inputId.indexOf('shopify') !== -1) {
          if (typeof selectChannelType === 'function') selectChannelType('shopify');
        } else if (inputId.indexOf('holded') !== -1) {
          if (typeof selectChannelType === 'function') selectChannelType('holded');
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
      const cardShopify = document.getElementById('card-choice-shopify');
      const cardHolded = document.getElementById('card-choice-holded');
      const panelUniv = document.getElementById('panel-universal-bridge');
      const panelWoo = document.getElementById('panel-woocommerce');
      const panelShopify = document.getElementById('panel-shopify');
      const panelHolded = document.getElementById('panel-holded');

      [cardUniv, cardWoo, cardShopify, cardHolded].forEach(function(c) { if (c) c.classList.remove('selected'); });
      [panelUniv, panelWoo, panelShopify, panelHolded].forEach(function(p) { if (p) p.style.display = 'none'; });

      if (type === 'universal_bridge') {
        if (cardUniv) cardUniv.classList.add('selected');
        if (panelUniv) panelUniv.style.display = 'block';
      } else if (type === 'shopify') {
        if (cardShopify) cardShopify.classList.add('selected');
        if (panelShopify) panelShopify.style.display = 'block';
      } else if (type === 'holded') {
        if (cardHolded) cardHolded.classList.add('selected');
        if (panelHolded) panelHolded.style.display = 'block';
      } else {
        if (cardWoo) cardWoo.classList.add('selected');
        if (panelWoo) panelWoo.style.display = 'block';
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
          '<button type="button" onclick="closeSpotlightTour()" style="background:none;border:none;color:var(--text-subtle);display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;cursor:pointer;padding:0;line-height:1;" title="Cerrar recorrido">' + ICONS.close + '</button>' +
        '</div>' +
        '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
          '<span>' + step.title + '</span>' +
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
              ? '<button type="button" onclick="finishSpotlightTour()" class="btn btn-primary btn-sm" style="padding:5px 14px;font-weight:700;font-size:12px;background:linear-gradient(135deg, #10b981, #059669);border:none;box-shadow:0 0 15px rgba(16,185,129,0.4);"><span>Entendido, finalizar</span></button>'
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
        showToast('¡Recorrido completado! Bentian Agent está activo.', 'success');
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

    window.startSpotlightTour = startSpotlightTour;
    window.nextSpotlightStep = nextSpotlightStep;
    window.prevSpotlightStep = prevSpotlightStep;
    window.finishSpotlightTour = finishSpotlightTour;
    window.closeSpotlightTour = closeSpotlightTour;
`;
