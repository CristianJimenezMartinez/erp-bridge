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
        suggestion: 'Pulsa en "Examinar en Windows" para buscar y seleccionar directamente tu archivo .accdb o .mdb en tu equipo o unidad de red.',
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
        code: 'ERR_FACTUSOL_CORRUPTED',
        pattern: /unrecognized database format|formato de base de datos no reconocido|database is in an inconsistent state|archivo de base de datos dañado|needs to be repaired|base de datos dañada/i,
        title: 'Base de datos Factusol dañada o incoherente',
        message: 'Microsoft Access indica que el archivo de base de datos de Factusol tiene una incoherencia interna o necesita ser reparado.',
        suggestion: 'Abre Factusol, ve a Archivo > Mantenimiento > "Compactar y Reparar base de datos", o restaura una copia de seguridad reciente.',
        actionLabel: 'Comprobar archivo de Factusol',
        targetTab: 'factusol',
        targetInputId: 'input-factusol-db',
        helpUrl: 'https://bridge.cristianjm.com/docs/factusol-setup/'
      },
      {
        code: 'ERR_FACTUSOL_TABLE_MISSING',
        pattern: /F_ART|F_PCL|F_LPC|tabla no encontrada|could not find table|el objeto no se encontró|no se encuentra el objeto.*F_/i,
        title: 'El archivo seleccionado no es una empresa de Factusol',
        message: 'La base de datos seleccionada no contiene las tablas de artículos (F_ART) o pedidos (F_PCL) de Factusol. Es posible que pertenezca a Contasol o Nominasol.',
        suggestion: 'Asegúrate de seleccionar el archivo de datos comerciales de Factusol dentro de la carpeta "DATOS" (por ejemplo: DATOS\\\\1A.FDB o similar).',
        actionLabel: 'Buscar empresa en Factusol',
        targetTab: 'factusol',
        targetInputId: 'btn-browse-native',
        helpUrl: 'https://bridge.cristianjm.com/docs/factusol-setup/'
      },
      {
        code: 'ERR_FACTUSOL_READONLY_FILE',
        pattern: /read[- ]only|solo lectura.*archivo|cannot update.*database or object is read-only|permiso de escritura denegado|EACCES|EPERM.*\\.accdb/i,
        title: 'Archivo de Factusol en modo "Solo Lectura"',
        message: 'El archivo de base de datos tiene activo el atributo de solo lectura en Windows o la carpeta compartida no te concede permisos de escritura.',
        suggestion: 'Haz clic derecho sobre el archivo .accdb > Propiedades > Desmarca la casilla "Solo lectura". Si está en un NAS o servidor, pide permisos de escritura en la red.',
        actionLabel: 'Ver ruta de Factusol',
        targetTab: 'factusol',
        targetInputId: 'input-factusol-db',
        helpUrl: 'https://bridge.cristianjm.com/docs/factusol-setup/'
      },
      {
        code: 'ERR_FACTUSOL_NAS_TIMEOUT',
        pattern: /0x80070035|network path was not found|nombre de red ya no está disponible|network name no longer available|unidad de red desconectada|NAS.*timeout|recurso de red no responde/i,
        title: 'Unidad de red o NAS temporalmente inaccesible',
        message: 'Windows no puede acceder a la carpeta compartida o servidor NAS donde está Factusol. Es posible que haya un corte de red local o Wi-Fi.',
        suggestion: 'Comprueba que el servidor o NAS está encendido y accesible desde el Explorador de Windows. Bentian mantendrá la ruta y reconectará en cuanto vuelva la red.',
        actionLabel: 'Revisar conexión con Factusol',
        targetTab: 'factusol',
        targetInputId: 'input-factusol-db',
        helpUrl: 'https://bridge.cristianjm.com/docs/factusol-setup/'
      },
      {
        code: 'ERR_TARIFF_NOT_FOUND',
        pattern: /tarifa no encontrada|código de tarifa no válido|F_TAR.*no existe|tariff.*invalid/i,
        title: 'Código de tarifa no encontrado en Factusol',
        message: 'La tarifa configurada para tu tienda online no existe en la tabla de tarifas (F_TAR) de tu Factusol.',
        suggestion: 'Ve a Factusol > Comercial > Tarifas para comprobar tus códigos de tarifa (ejemplo: 1, 2, 3 o TAR1) y selecciónalo en el menú desplegable.',
        actionLabel: 'Configurar tarifas de Factusol',
        targetTab: 'factusol',
        targetInputId: 'select-factusol-tariff',
        helpUrl: 'https://bridge.cristianjm.com/docs/factusol-setup/'
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
        code: 'ERR_WOO_PERMALINKS',
        pattern: /rest_no_route|no route was found matching the url|enlaces permanentes|plain permalinks|no se encontró ninguna ruta que coincida/i,
        title: 'Enlaces permanentes de WordPress sin activar',
        message: 'La API REST de WooCommerce requiere que WordPress tenga activados los enlaces permanentes bonitos para responder en "/wp-json/wc/v3/...".',
        suggestion: 'En tu panel de WordPress, ve a Ajustes > Enlaces permanentes, selecciona "Nombre de la entrada" (/%postname%/) y pulsa Guardar cambios.',
        actionLabel: 'Revisar dirección de WooCommerce',
        targetTab: 'channel',
        targetInputId: 'input-wc-url',
        helpUrl: 'https://bridge.cristianjm.com/docs/woocommerce-api-keys/'
      },
      {
        code: 'ERR_WEB_JSON_PARSE',
        pattern: /JSON\\.parse|unexpected token <|Unexpected token '<'|doctype html|no es json válido|respuesta no válida del servidor web/i,
        title: 'La web devolvió HTML en lugar de datos JSON',
        message: 'Al consultar la tienda, tu servidor devolvió una página web de error PHP, una pantalla de mantenimiento o un aviso de tu hosting en vez de datos.',
        suggestion: 'Abre la dirección de tu tienda en el navegador para comprobar si muestra errores de PHP, o desactiva temporalmente el modo mantenimiento de WordPress.',
        actionLabel: 'Comprobar dirección de la web',
        targetTab: 'channel',
        targetInputId: 'input-wc-url',
        helpUrl: 'https://bridge.cristianjm.com/docs/network-troubleshooting/'
      },
      {
        code: 'ERR_WEB_CLOUDFLARE_BLOCK',
        pattern: /Cloudflare|ray id|cf-ray|managed challenge|bot fight|waf.*block|1020|1015/i,
        title: 'Conexión bloqueada por el cortafuegos de Cloudflare',
        message: 'El cortafuegos WAF o el modo "Bot Fight Mode" de Cloudflare en tu tienda web está interceptando las peticiones del Agente y exigiendo resolver un captcha.',
        suggestion: 'En el panel de Cloudflare de tu dominio, ve a Security > WAF y crea una regla para omitir la inspección en las rutas "/wp-json/wc/" o "/erp-bridge-endpoint.php".',
        actionLabel: 'Revisar canal web',
        targetTab: 'channel',
        targetInputId: 'input-wc-url',
        helpUrl: 'https://bridge.cristianjm.com/docs/network-troubleshooting/'
      },
      {
        code: 'ERR_WEB_TIMEOUT',
        pattern: /504|Gateway Timeout|execution time of \\d+ seconds exceeded|memory size.*exhausted|timeout de ejecución en el servidor web|502 Bad Gateway/i,
        title: 'El servidor de tu web agotó el tiempo de espera',
        message: 'Tu servidor de hosting tardó más de 30 segundos en procesar los artículos o se quedó sin memoria PHP (Memory Limit).',
        suggestion: 'Aumenta "max_execution_time" a 120s y "memory_limit" a 256M o 512M en el panel de tu hosting (cPanel/Plesk), o amplía el intervalo entre ciclos.',
        actionLabel: 'Ajustar reglas de sincronización',
        targetTab: 'sync',
        targetInputId: 'input-sync-interval',
        helpUrl: 'https://bridge.cristianjm.com/docs/network-troubleshooting/'
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
        suggestion: "Comprueba y renueva el certificado SSL gratuito (Let's Encrypt o cPanel) en el panel de control de tu proveedor de hosting.",
        actionLabel: 'Revisar dirección de la web',
        targetTab: 'channel',
        targetInputId: 'input-universal-url',
        helpUrl: 'https://bridge.cristianjm.com/docs/ssl-setup/'
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
        code: 'ERR_CLOCK_DESYNC',
        pattern: /clock drift|diferencia horaria|desfase del reloj|clock_skew|ntp desincronizado|hora del sistema desfasada/i,
        title: 'El reloj de Windows está desfasado',
        message: 'El reloj interno de tu equipo tiene una diferencia superior a 3 minutos con respecto a la hora oficial de Internet, lo que invalida las firmas criptográficas.',
        suggestion: 'En Windows, ve a Configuración > Hora e idioma > Fecha y hora, y pulsa en "Sincronizar ahora".',
        actionLabel: 'Ver comprobación del sistema',
        targetTab: 'overview',
        targetInputId: 'pf-clock-badge',
        helpUrl: 'https://bridge.cristianjm.com/docs/system-clock-ntp/'
      },
      {
        code: 'ERR_DISK_SPACE_LOW',
        pattern: /ENOSPC|no space left on device|espacio en disco insuficiente|disco lleno|sin espacio/i,
        title: 'Espacio en disco insuficiente en Windows',
        message: 'La unidad C: de Windows tiene menos de 500 MB libres, lo que impide guardar los registros locales y las colas de sincronización.',
        suggestion: 'Libera espacio en el disco C: de tu equipo eliminando archivos temporales o usando el Liberador de espacio en disco de Windows.',
        actionLabel: 'Ver estado general',
        targetTab: 'overview',
        targetInputId: 'card-f-path',
        helpUrl: 'https://bridge.cristianjm.com/docs/system-requirements/'
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
        actionText.textContent = err.actionLabel + ' →';
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
      window._lastHumanizedErrors = window._lastHumanizedErrors || {};
      window._lastHumanizedErrors[err.code] = err;

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
            '<strong>¿Cómo solucionarlo?:</strong> ' + err.suggestion +
          '</div>' +
          '<div class="human-alert-actions">' +
            '<button type="button" class="btn btn-primary btn-sm" data-err-code="' + err.code + '" onclick="resolveHumanizedError(window._lastHumanizedErrors[this.getAttribute(&quot;data-err-code&quot;)])">' +
              '<span>' + err.actionLabel + ' →</span>' +
            '</button>' +
            (err.helpUrl ? ('<a href="' + err.helpUrl + '" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">' + (typeof renderIcon === 'function' ? renderIcon('info') : '') + '<span>Guía de ayuda ↗</span></a>') : '') +
          '</div>' +
        '</div>';
    }
`;
