export const errorHumanizerScript = `
    // Catálogo Centralizado de Humanización de Errores y UX de Resolución
    const ERROR_CATALOG = [
      {
        code: 'ERR_OLEDB_MISSING',
        pattern: /0x80004005|Microsoft\\.ACE\\.OLEDB|proveedor no registrado|no está registrado en el equipo local/i,
        title: 'Controlador Access Database Engine no instalado',
        message: 'Windows no dispone del controlador de Microsoft necesario para leer archivos de base de datos Factusol (.accdb / .mdb).',
        suggestion: 'Descarga e instala gratis el controlador oficial "Microsoft Access Database Engine 2016 Redistributable (64 bits)" desde la web de Microsoft.',
        actionLabel: 'Ir a configuración de Factusol',
        targetTab: 'factusol',
        targetInputId: 'input-factusol-db',
        helpUrl: 'https://bridge.cristianjm.com/docs/factusol-oledb-guide/'
      },
      {
        code: 'ERR_FACTUSOL_FILE_NOT_FOUND',
        pattern: /archivo no encontrado|ruta no válida|no existe el archivo|ENOENT|no se encontró la base de datos|fichero no existe|no se detectó factusol/i,
        title: 'Base de datos de Factusol no encontrada',
        message: 'No se pudo localizar el archivo de base de datos en la ruta indicada. Es posible que el archivo haya sido movido o el disco/NAS no esté accesible.',
        suggestion: 'Pulsa en "📁 Examinar en Windows" para buscar y seleccionar directamente tu archivo .accdb o .mdb en tu equipo o unidad de red.',
        actionLabel: 'Seleccionar base de datos de Factusol',
        targetTab: 'factusol',
        targetInputId: 'input-factusol-db',
        helpUrl: 'https://bridge.cristianjm.com/docs/factusol-setup/'
      },
      {
        code: 'ERR_FACTUSOL_EXCLUSIVE_LOCK',
        pattern: /\\.l(acc)?db|bloqueo|en modo exclusivo|exclusively locked|otro usuario está intentando|detuvo el proceso porque otro/i,
        title: 'Base de datos bloqueada por otro usuario o Factusol',
        message: 'Factusol o un usuario de la red tiene la base de datos abierta en modo exclusivo o con un archivo de bloqueo (.laccdb/.ldb) temporal.',
        suggestion: 'Pide a los demás puestos que guarden su trabajo y cierren Factusol momentáneamente, o espera unos segundos a que finalice la operación. Bentian reintentará automáticamente.',
        actionLabel: 'Revisar estado de Factusol',
        targetTab: 'factusol',
        targetInputId: 'btn-test-fact',
        helpUrl: 'https://bridge.cristianjm.com/docs/factusol-locking/'
      },
      {
        code: 'ERR_WEB_AUTH_BLOCKED',
        pattern: /401|unauthorized|cabeceras? de autorización bloqueadas|no autorizado|claves? inválidas?|signature_invalid/i,
        title: 'Cabeceras de autorización bloqueadas en tu servidor web',
        message: 'Tu servidor web (Apache, LiteSpeed, Plesk, cPanel) filtra la cabecera "Authorization" por una directiva de seguridad del hosting antes de llegar a PHP.',
        suggestion: 'Añade estas 2 líneas al principio de tu archivo .htaccess en la raíz de tu web:\\n\\nSetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1\\nRewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\\n\\nO comprueba que la clave del conector web coincide exactamente.',
        actionLabel: 'Revisar claves del canal web',
        targetTab: 'channel',
        targetInputId: 'input-wc-key',
        helpUrl: 'https://bridge.cristianjm.com/docs/hosting-auth-headers/',
        snippet: 'SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1\\nRewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]'
      },
      {
        code: 'ERR_WOO_PERMISSIONS',
        pattern: /403|forbidden|claves? de solo lectura|permisos insuficientes|woocommerce_rest_cannot_edit|read-only/i,
        title: 'Permisos insuficientes en las claves de WooCommerce',
        message: 'Las claves de la API REST que has configurado tienen permisos de "Solo Lectura". Bentian requiere permisos de "Lectura y Escritura" para actualizar stock y pedidos.',
        suggestion: 'En WordPress, ve a WooCommerce > Ajustes > Avanzado > REST API. Edita la clave de Bentian y cambia el permiso a "Lectura y Escritura".',
        actionLabel: 'Comprobar credenciales de WooCommerce',
        targetTab: 'channel',
        targetInputId: 'input-wc-key',
        helpUrl: 'https://bridge.cristianjm.com/docs/woocommerce-api-keys/'
      },
      {
        code: 'ERR_WEB_CONNECTION_FAILED',
        pattern: /ECONNREFUSED|ETIMEDOUT|no se pudo conectar|ENOTFOUND|getaddrinfo|Failed to fetch|NetworkError|host no alcanzable|timeout/i,
        title: 'No se pudo conectar con la tienda web',
        message: 'La dirección web introducida no responde, el servidor está fuera de servicio o hay una errata en la URL configurada.',
        suggestion: 'Verifica que tu tienda abre correctamente en tu navegador y asegúrate de haber escrito "https://" al inicio sin barras al final.',
        actionLabel: 'Corregir dirección de la tienda web',
        targetTab: 'channel',
        targetInputId: 'input-wc-url',
        helpUrl: 'https://bridge.cristianjm.com/docs/network-troubleshooting/'
      },
      {
        code: 'ERR_LICENSE_EXPIRED',
        pattern: /EXPIRED|periodo de prueba finalizado|beta finalizada|licencia caducada|trial expired|periodo de evaluación/i,
        title: 'Periodo de prueba de 60 días concluido',
        message: '¡Gracias por probar Bentian! El periodo de evaluación gratuita de la beta pública ha concluido en este ordenador.',
        suggestion: 'Para seguir sincronizando tu Factusol con tu tienda web de forma desatendida, activa tu Plan Fundador con descuento vitalicio del 30%.',
        actionLabel: 'Ir a activar o renovar licencia',
        targetTab: 'license',
        targetInputId: 'input-lic-key',
        helpUrl: 'https://bridge.cristianjm.com/dashboard/?action=upgrade&plan=founder_annual'
      },
      {
        code: 'ERR_LICENSE_INVALID',
        pattern: /INVALID_KEY|clave no encontrada|clave no válida|formato de clave|invalid license|clave no reconocida/i,
        title: 'Clave de licencia no reconocida',
        message: 'La clave de licencia introducida no tiene el formato estándar o contiene caracteres incorrectos.',
        suggestion: 'Las claves oficiales de Bentian comienzan con "EB-" (ejemplo: EB-PRO-XXXXX) y no deben incluir espacios en blanco.',
        actionLabel: 'Introducir clave de licencia',
        targetTab: 'license',
        targetInputId: 'input-lic-key',
        helpUrl: 'https://bridge.cristianjm.com/beta/'
      },
      {
        code: 'ERR_CSCRIPT_BLOCKED',
        pattern: /cscript(\\.exe)?|windows script host|antivirus|EDR|WScript\\.Shell|bloqueado por directiva/i,
        title: 'Windows Script Host (cscript.exe) bloqueado por antivirus o EDR',
        message: 'El sistema de seguridad de Windows o tu antivirus ha bloqueado el intérprete local "cscript.exe" necesario para la lectura OLEDB de Factusol.',
        suggestion: 'Añade el ejecutable Bentian Agent o el proceso "cscript.exe" a las exclusiones de tu antivirus (Windows Defender, Kaspersky, SentinelOne, etc.).',
        actionLabel: 'Ver diagnóstico del sistema',
        targetTab: 'overview',
        targetInputId: 'pf-alert-box',
        helpUrl: 'https://bridge.cristianjm.com/docs/antivirus-exclusions/'
      },
      {
        code: 'ERR_ENDPOINT_NOT_FOUND',
        pattern: /404|erp-bridge-endpoint\\.php|endpoint no encontrado|archivo conector no encontrado/i,
        title: 'Archivo erp-bridge-endpoint.php no detectado en tu web',
        message: 'El servidor web devolvió un error 404. El archivo del conector no está subido a la carpeta raíz de tu tienda online o la URL no es correcta.',
        suggestion: 'Descarga "erp-bridge-endpoint.php" desde la pestaña Canal Web y súbelo a la carpeta pública de tu hosting (por ejemplo public_html o httpdocs).',
        actionLabel: 'Configurar Canal Web Universal',
        targetTab: 'channel',
        targetInputId: 'input-universal-url',
        helpUrl: 'https://bridge.cristianjm.com/docs/universal-bridge-install/'
      },
      {
        code: 'ERR_SSL_INVALID',
        pattern: /SSL|CERT_|self[- ]signed|DEPTH_ZERO_SELF_SIGNED_CERT|certificado no válido/i,
        title: 'Certificado de seguridad SSL de la tienda no válido',
        message: 'No se pudo establecer una conexión HTTPS cifrada de confianza porque el certificado SSL de tu web ha caducado o no está configurado.',
        suggestion: 'Comprueba y renueva el certificado SSL gratuito (Let\\'s Encrypt o cPanel) en el panel de control de tu proveedor de hosting.',
        actionLabel: 'Revisar dirección de la web',
        targetTab: 'channel',
        targetInputId: 'input-universal-url',
        helpUrl: 'https://bridge.cristianjm.com/docs/ssl-setup/'
      }
    ];

    function humanizeError(rawError) {
      let raw = '';
      if (typeof rawError === 'string') {
        raw = rawError;
      } else if (rawError && typeof rawError === 'object') {
        raw = String(rawError.message || rawError.error || rawError.code || rawError.status || JSON.stringify(rawError));
      } else {
        raw = String(rawError || '');
      }

      for (let i = 0; i < ERROR_CATALOG.length; i++) {
        const item = ERROR_CATALOG[i];
        if (item.pattern.test(raw)) {
          return {
            code: item.code,
            title: item.title,
            message: item.message,
            suggestion: item.suggestion,
            actionLabel: item.actionLabel,
            targetTab: item.targetTab,
            targetInputId: item.targetInputId,
            helpUrl: item.helpUrl,
            snippet: item.snippet
          };
        }
      }

      const cleanSnippet = raw.replace(/\\s+/g, ' ').trim().substring(0, 140);
      return {
        code: 'ERR_INTERNAL_GENERIC',
        title: 'Incidencia en la operación',
        message: cleanSnippet ? ('Se ha producido una incidencia: "' + cleanSnippet + '"') : 'Se ha producido una incidencia técnica interna.',
        suggestion: 'Revisa la configuración del apartado correspondiente o consulta el registro de eventos técnicos para obtener más detalles.',
        actionLabel: 'Ver registro de eventos técnicos',
        targetTab: 'logs',
        targetInputId: 'full-logs-panel',
        helpUrl: 'https://bridge.cristianjm.com/docs/'
      };
    }

    function resolveHumanizedError(errorOrCode) {
      const err = (typeof errorOrCode === 'object' && errorOrCode.targetTab)
        ? errorOrCode
        : humanizeError(errorOrCode);

      closeErrorResolverModal();

      if (typeof switchTab === 'function') {
        switchTab(err.targetTab);
      }

      if (err.targetTab === 'channel' && typeof selectChannelType === 'function') {
        if (err.targetInputId && (err.targetInputId.includes('wc') || err.code.includes('WOO'))) {
          selectChannelType('woocommerce');
        } else if (err.targetInputId && (err.targetInputId.includes('univ') || err.code.includes('UNIVERSAL') || err.code.includes('ENDPOINT'))) {
          selectChannelType('universal_bridge');
        }
      }

      if (err.targetInputId) {
        setTimeout(function() {
          const el = document.getElementById(err.targetInputId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof el.focus === 'function') el.focus();
            el.classList.add('input-highlight-pulse');
            setTimeout(function() {
              el.classList.remove('input-highlight-pulse');
            }, 3600);
          }
        }, 160);
      }

      const tabTitles = {
        overview: 'Estado General',
        factusol: 'Factusol ERP',
        channel: 'Canal Web',
        sync: 'Automatización',
        history: 'Historial',
        logs: 'Diagnóstico',
        license: 'Licencia'
      };
      const dest = tabTitles[err.targetTab] || err.targetTab;
      showToast('Navegando a ' + dest + ' para solucionar el error', 'info');
    }

    let _currentResolverError = null;

    function openErrorResolverModal(rawErrorOrObj) {
      const err = (typeof rawErrorOrObj === 'object' && rawErrorOrObj && rawErrorOrObj.targetTab)
        ? rawErrorOrObj
        : humanizeError(rawErrorOrObj);

      _currentResolverError = err;

      const modal = document.getElementById('modal-error-resolver');
      const titleEl = document.getElementById('modal-err-title');
      const codeEl = document.getElementById('modal-err-code');
      const msgEl = document.getElementById('modal-err-msg');
      const sugEl = document.getElementById('modal-err-suggestion');
      const snippetBox = document.getElementById('modal-err-snippet-box');
      const snippetCode = document.getElementById('modal-err-snippet-code');
      const helpBtn = document.getElementById('modal-err-help-btn');
      const actionBtn = document.getElementById('modal-err-action-btn');
      const actionText = document.getElementById('modal-err-action-text');

      if (!modal) return;

      if (titleEl) titleEl.textContent = err.title;
      if (codeEl) codeEl.textContent = err.code;
      if (msgEl) msgEl.textContent = err.message;
      if (sugEl) sugEl.textContent = err.suggestion;

      if (snippetBox && snippetCode) {
        if (err.snippet) {
          snippetBox.style.display = 'block';
          snippetCode.textContent = err.snippet;
        } else {
          snippetBox.style.display = 'none';
        }
      }

      if (helpBtn) {
        if (err.helpUrl) {
          helpBtn.style.display = 'inline-flex';
          helpBtn.href = err.helpUrl;
        } else {
          helpBtn.style.display = 'none';
        }
      }

      if (actionBtn && actionText) {
        actionText.textContent = err.actionLabel + ' ➔';
        actionBtn.onclick = function() {
          resolveHumanizedError(err);
        };
      }

      modal.classList.add('open');
    }

    function closeErrorResolverModal() {
      const modal = document.getElementById('modal-error-resolver');
      if (modal) modal.classList.remove('open');
    }

    function copySnippetText() {
      if (_currentResolverError && _currentResolverError.snippet) {
        navigator.clipboard.writeText(_currentResolverError.snippet);
        showToast('Código copiado al portapapeles', 'success');
      }
    }

    function renderHumanizedAlert(containerEl, rawMessage) {
      if (!containerEl) return;
      const el = typeof containerEl === 'string' ? document.getElementById(containerEl) : containerEl;
      if (!el) return;

      const err = humanizeError(rawMessage);
      const safeErrJson = JSON.stringify(err).replace(/"/g, '&quot;');

      el.style.display = 'block';
      el.innerHTML =
        '<div class="human-alert-box">' +
          '<div class="human-alert-header">' +
            '<span class="human-alert-title">' +
              '<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' +
              '<span>' + err.title + '</span>' +
            '</span>' +
            '<span class="tag tag-rose" style="font-size: 9px; letter-spacing: 0.5px;">' + err.code + '</span>' +
          '</div>' +
          '<div class="human-alert-body">' + err.message + '</div>' +
          '<div class="human-alert-suggestion">' +
            '<strong>💡 ¿Cómo solucionarlo?:</strong> ' + err.suggestion +
          '</div>' +
          '<div class="human-alert-actions">' +
            '<button type="button" class="btn btn-primary btn-sm" onclick="resolveHumanizedError(' + safeErrJson + ')">' +
              '<span>' + err.actionLabel + ' ➔</span>' +
            '</button>' +
            (err.helpUrl ? ('<a href="' + err.helpUrl + '" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;"><span>📖 Guía de ayuda ↗</span></a>') : '') +
          '</div>' +
        '</div>';
    }
`;
