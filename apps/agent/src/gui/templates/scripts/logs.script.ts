export const logsScript = `
    let currentLogViewMode = 'journal';
    let currentBottomConsoleFilter = 'all';
    let _bottomConsoleCleared = false;
    let _lastEventsHash = '';

    function setLogViewMode(mode) {
      currentLogViewMode = mode;
      const btnJournal = document.getElementById('btn-mode-journal');
      const btnConsole = document.getElementById('btn-mode-console');
      const techControls = document.getElementById('technical-console-controls');
      if (btnJournal) btnJournal.classList.toggle('active', mode === 'journal');
      if (btnConsole) btnConsole.classList.toggle('active', mode === 'console');
      if (techControls) {
        techControls.style.display = mode === 'console' ? 'flex' : 'none';
      }
      renderLogs(allLogs);
    }
    window.setLogViewMode = setLogViewMode;

    function isBusinessOperation(e) {
      if (!e || !e.message) return false;
      if (e.level === 'error' || e.level === 'warn' || e.level === 'success') return true;
      const msg = e.message.toLowerCase();
      if (msg.includes('pedido') || msg.includes('stock') || msg.includes('catálogo') || 
          msg.includes('catalogo') || msg.includes('venta') || msg.includes('factusol') || 
          msg.includes('sincronización') || msg.includes('sincronizacion') || 
          msg.includes('vigilante') || msg.includes('modo autónomo') || msg.includes('modo autonomo') ||
          msg.includes('ejercicio') || msg.includes('rollover')) {
        if (msg.includes('consultando existencias') || msg.includes('comprobando pedidos')) {
          return false;
        }
        return true;
      }
      return false;
    }

    // Deduplicación y Agrupación Inteligente de Registros Repetitivos (Anti-Flooding)
    function groupLogs(events) {
      if (!events || !events.length) return [];
      const grouped = [];
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (!ev || !ev.message) continue;
        const last = grouped[grouped.length - 1];
        if (last && last.level === ev.level && last.message === ev.message) {
          last.count = (last.count || 1) + (ev.count || 1);
          if (!last.firstTimestamp) last.firstTimestamp = ev.firstTimestamp || ev.timestamp;
        } else {
          grouped.push({
            timestamp: ev.timestamp,
            firstTimestamp: ev.firstTimestamp || ev.timestamp,
            level: ev.level || 'info',
            message: ev.message,
            count: ev.count || 1
          });
        }
      }
      return grouped;
    }
    window.groupLogs = groupLogs;

    function escapeLogAttr(str) {
      if (!str) return '';
      return String(str)
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split("'").join('&#39;');
    }

    function buildLogHtml(list, emptyText) {
      if (!list || list.length === 0) {
        return '<div class="log-line log-info"><span class="log-time">--:--:--</span><span>' + (emptyText || 'No hay eventos para mostrar.') + '</span></div>';
      }
      return list.map(function(e) {
        const isProblem = e.level === 'error' || e.level === 'warn';
        const safeMsg = escapeLogAttr(e.message);

        let countBadge = '';
        if (e.count && e.count > 1) {
          const badgeClass = e.level === 'error' ? 'log-count-badge' : (e.level === 'warn' ? 'log-count-badge log-count-badge-warn' : 'log-count-badge log-count-badge-info');
          const tooltip = 'Repetido ' + e.count + ' veces (desde ' + (e.firstTimestamp || e.timestamp) + ')';
          countBadge = '<span class="' + badgeClass + '" title="' + tooltip + '">×' + e.count + '</span>';
        }

        const solveBtn = isProblem
          ? '<button type="button" class="log-solve-btn" onclick="event.stopPropagation(); if (window.resolveHumanizedError) window.resolveHumanizedError(this.parentElement.getAttribute(&quot;data-raw-msg&quot;));" title="Ir directamente a solucionar este problema">' +
              '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
              '<span>Resolver</span>' +
            '</button>'
          : '';

        const clickAttr = isProblem
          ? ' onclick="if (window.openErrorResolverModal) window.openErrorResolverModal(this.getAttribute(&quot;data-raw-msg&quot;));" title="Clic para ver instrucciones detalladas de solución"'
          : '';

        return '<div class="log-line log-' + (e.level || 'info') + '" data-raw-msg="' + safeMsg + '"' + clickAttr + '>' +
          '<span class="log-time">' + escapeLogAttr(e.timestamp) + '</span>' +
          '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:inline-flex;align-items:center;">' +
            '<span>' + safeMsg + '</span>' +
            countBadge +
          '</span>' +
          solveBtn +
        '</div>';
      }).join('');
    }

    function toggleBottomConsole(forceState) {
      const dock = document.getElementById('bottom-console-dock');
      if (!dock) return;
      if (typeof forceState === 'boolean') {
        dock.classList.toggle('open', forceState);
      } else {
        dock.classList.toggle('open');
      }
      const isOpen = dock.classList.contains('open');
      const toggleText = document.getElementById('dock-toggle-text');
      if (toggleText) {
        toggleText.textContent = isOpen ? 'Ocultar Consola' : 'Consola de Actividad';
      }
      if (isOpen) {
        renderBottomConsoleStream();
        const stream = document.getElementById('dock-logs-stream');
        if (stream) stream.scrollTop = 0;
      }
    }
    window.toggleBottomConsole = toggleBottomConsole;

    function setBottomConsoleFilter(filter) {
      currentBottomConsoleFilter = filter;
      document.querySelectorAll('.dock-filter-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-bfilter') === filter);
      });
      renderBottomConsoleStream();
    }
    window.setBottomConsoleFilter = setBottomConsoleFilter;

    function clearBottomConsoleView() {
      _bottomConsoleCleared = true;
      const stream = document.getElementById('dock-logs-stream');
      if (stream) {
        stream.innerHTML = '<div class="log-line log-info"><span class="log-time">--:--:--</span><span>Vista de consola limpiada temporalmente. Los nuevos eventos aparecerán automáticamente.</span></div>';
      }
      if (typeof showToast === 'function') showToast('Consola de actividad limpiada', 'info');
    }
    window.clearBottomConsoleView = clearBottomConsoleView;

    function copyBottomConsoleLogs() {
      const grouped = groupLogs(allLogs || []);
      if (!grouped.length) {
        if (typeof showToast === 'function') showToast('No hay registros para copiar.', 'info');
        return;
      }
      const text = grouped.map(function(e) {
        const rep = (e.count && e.count > 1) ? ' [×' + e.count + ']' : '';
        return '[' + e.timestamp + '] [' + (e.level || 'INFO').toUpperCase() + ']' + rep + ' ' + e.message;
      }).join('\\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          if (typeof showToast === 'function') showToast('Registros copiados al portapapeles (' + grouped.length + ' líneas)', 'success');
        });
      }
    }
    window.copyBottomConsoleLogs = copyBottomConsoleLogs;

    function renderBottomConsoleStream() {
      const stream = document.getElementById('dock-logs-stream');
      if (!stream) return;
      if (_bottomConsoleCleared) return;

      const grouped = groupLogs(allLogs || []);
      let filtered = grouped;
      if (currentBottomConsoleFilter === 'business') {
        filtered = grouped.filter(isBusinessOperation);
      } else if (currentBottomConsoleFilter === 'warn') {
        filtered = grouped.filter(function(e) { return e.level === 'warn'; });
      } else if (currentBottomConsoleFilter === 'error') {
        filtered = grouped.filter(function(e) { return e.level === 'error'; });
      }

      const html = buildLogHtml(filtered, 'No hay eventos que coincidan con el filtro en la consola.');
      if (stream.innerHTML !== html) stream.innerHTML = html;
    }

    function renderLogs(events) {
      const fullPanel = document.getElementById('full-logs-panel');
      const searchVal = (document.getElementById('log-search-input') ? document.getElementById('log-search-input').value : '').toLowerCase();

      // Agrupación deduplicada de eventos
      const grouped = groupLogs(events || []);
      const businessEvents = grouped.filter(isBusinessOperation);

      // 1. En Diagnóstico y Ayuda: según el modo seleccionado (Diario de Operaciones vs Consola Técnica)
      let fullHtml = '';
      if (currentLogViewMode === 'journal') {
        fullHtml = buildLogHtml(businessEvents, 'No hay operaciones de negocio registradas en esta sesión.');
      } else {
        const filtered = grouped.filter(function(e) {
          if (currentLogFilter !== 'all' && e.level !== currentLogFilter) return false;
          if (searchVal && !e.message.toLowerCase().includes(searchVal)) return false;
          return true;
        });
        fullHtml = buildLogHtml(filtered, 'No hay registros técnicos que coincidan con los filtros.');
      }

      if (fullPanel && fullPanel.innerHTML !== fullHtml) fullPanel.innerHTML = fullHtml;

      // 3. Actualizar la barra inferior persistente (Bottom Dock Console)
      const dockDot = document.getElementById('dock-status-dot');
      const dockText = document.getElementById('dock-status-text');
      const dockMsg = document.getElementById('dock-latest-msg');
      const badgeErrors = document.getElementById('dock-badge-errors');
      const badgeWarns = document.getElementById('dock-badge-warns');

      if (grouped.length > 0) {
        const latest = grouped[0];
        if (dockMsg) {
          const repeatPrefix = (latest.count && latest.count > 1) ? '[×' + latest.count + '] ' : '';
          dockMsg.textContent = repeatPrefix + latest.message;
        }
      }

      const totalErrors = grouped.filter(function(e) { return e.level === 'error'; }).reduce(function(acc, cur) { return acc + (cur.count || 1); }, 0);
      const totalWarns = grouped.filter(function(e) { return e.level === 'warn'; }).reduce(function(acc, cur) { return acc + (cur.count || 1); }, 0);

      if (badgeErrors) {
        if (totalErrors > 0) {
          badgeErrors.style.display = 'inline-flex';
          badgeErrors.textContent = totalErrors + (totalErrors === 1 ? ' error' : ' errores');
        } else {
          badgeErrors.style.display = 'none';
        }
      }

      if (badgeWarns) {
        if (totalWarns > 0) {
          badgeWarns.style.display = 'inline-flex';
          badgeWarns.textContent = totalWarns + (totalWarns === 1 ? ' aviso' : ' avisos');
        } else {
          badgeWarns.style.display = 'none';
        }
      }

      if (dockDot && dockText) {
        if (totalErrors > 0) {
          dockDot.style.background = '#ef4444';
          dockText.textContent = 'Atención Requerida';
        } else if (totalWarns > 0) {
          dockDot.style.background = '#f59e0b';
          dockText.textContent = 'Avisos Detectados';
        } else {
          dockDot.style.background = '#10b981';
          dockText.textContent = 'En Línea';
        }
      }

      // Renderizar el flujo de la consola inferior
      renderBottomConsoleStream();
    }

    function setLogLevelFilter(filter) {
      currentLogFilter = filter;
      document.querySelectorAll('.log-filter-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
      });
      renderLogs(allLogs);
    }

    function filterLogs() {
      renderLogs(allLogs);
    }

    function copySupportSummary() {
      const s = window.currentStatus;
      if (!s) {
        if (typeof showToast === 'function') showToast('Datos del sistema no disponibles para copiar.', 'warn');
        return;
      }
      const pf = s.preflight && s.preflight.checks ? s.preflight.checks : {};
      const cscriptStatus = pf.cscript ? pf.cscript.status + (pf.cscript.message ? ' - ' + pf.cscript.message : '') : 'N/A';
      const oledbStatus = pf.oledbProvider ? pf.oledbProvider.status + (pf.oledbProvider.message ? ' - ' + pf.oledbProvider.message : '') : 'N/A';
      const clockStatus = pf.clockDrift ? pf.clockDrift.status + (pf.clockDrift.message ? ' - ' + pf.clockDrift.message : '') : 'N/A';
      const netStatus = pf.networkStorage ? pf.networkStorage.status + (pf.networkStorage.message ? ' - ' + pf.networkStorage.message : '') : 'N/A';
      const chType = s.channelType || window.currentChannelType || 'universal_bridge';
      let channelUrl = 'N/A';
      if (chType === 'universal_bridge') {
        channelUrl = (s.universalBridgeSettings && s.universalBridgeSettings.storeUrl) || 'N/A';
      } else if (chType === 'woocommerce') {
        channelUrl = (s.woocommerceSettings && s.woocommerceSettings.storeUrl) || 'N/A';
      } else if (chType === 'shopify') {
        channelUrl = (s.shopifySettings && s.shopifySettings.shopSubdomain) ? (s.shopifySettings.shopSubdomain + '.myshopify.com') : 'N/A';
      } else if (chType === 'holded') {
        channelUrl = 'Holded Invoicing API';
      }
      const channelType = chType;
      const factusolDb = s.factusol ? (s.factusol.databasePath || s.factusolDbPath || 'N/A') : 'N/A';
      const factusolConnected = s.factusol ? (s.factusol.connected ? 'Conectado (OK)' : 'Desconectado / Offline') : 'N/A';
      const licPlan = s.license ? (s.license.plan || 'N/A') : 'N/A';
      const licStatus = s.license ? (s.license.status || 'N/A') : 'N/A';

      const lines = [
        '==================================================',
        '   BENTIAN ERP BRIDGE - INFORME TÉCNICO DE SOPORTE',
        '==================================================',
        'Fecha de Captura: ' + new Date().toLocaleString(),
        'Versión Agente:   v' + (s.agentVersion || s.version || '0.5.3'),
        'Equipo Hostname:  ' + (s.hostname || 'Local'),
        'HWID Fingerprint: ' + (s.hwid || 'N/A'),
        '--------------------------------------------------',
        'LICENCIA:',
        '  Estado: ' + licStatus,
        '  Plan:   ' + licPlan,
        '  Clave:  ' + (s.license && s.license.licenseKey ? s.license.licenseKey : 'N/A'),
        '--------------------------------------------------',
        'FACTUSOL ERP:',
        '  Conexión: ' + factusolConnected,
        '  Ruta BD:  ' + factusolDb,
        '  Artículos:' + (s.factusol && s.factusol.articleCount !== undefined ? ' ' + s.factusol.articleCount : ' N/A'),
        '--------------------------------------------------',
        'CANAL WEB:',
        '  Tipo:   ' + channelType,
        '  URL:    ' + channelUrl,
        '  Estado: ' + (s.channel && s.channel.status ? s.channel.status : 'N/A'),
        '--------------------------------------------------',
        'DIAGNÓSTICO PRE-FLIGHT (EDR & SALUD):',
        '  [1] Motor Scripting (cscript): ' + cscriptStatus,
        '  [2] Access OLEDB Provider:    ' + oledbStatus,
        '  [3] Reloj & NTP Clock Drift:  ' + clockStatus,
        '  [4] Red & Almacenamiento:     ' + netStatus,
        '=================================================='
      ];
      const summaryText = lines.join('\\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summaryText).then(function() {
          if (typeof showToast === 'function') showToast('Resumen para soporte copiado al portapapeles', 'success');
        }).catch(function() {
          fallbackClipboard(summaryText);
        });
      } else {
        fallbackClipboard(summaryText);
      }

      function fallbackClipboard(text) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          if (typeof showToast === 'function') showToast('Resumen para soporte copiado al portapapeles', 'success');
        } catch (e) {
          if (typeof showToast === 'function') showToast('No se pudo copiar automáticamente. Por favor descarga el informe .txt.', 'warn');
        }
      }
    }
    window.copySupportSummary = copySupportSummary;
`;
