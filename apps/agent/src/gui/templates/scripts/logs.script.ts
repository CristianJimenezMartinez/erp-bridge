export const logsScript = `
    let currentLogViewMode = 'journal';

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
        // Excluir sondeos rutinarios repetitivos en reposo por si quedara alguno antiguo
        if (msg.includes('consultando existencias') || msg.includes('comprobando pedidos')) {
          return false;
        }
        return true;
      }
      return false;
    }

    function renderLogs(events) {
      const overviewList = document.getElementById('overview-logs-list');
      const fullPanel = document.getElementById('full-logs-panel');
      const searchVal = (document.getElementById('log-search-input') ? document.getElementById('log-search-input').value : '').toLowerCase();

      function escapeLogAttr(str) {
        if (!str) return '';
        return String(str)
          .split('&').join('&amp;')
          .split('<').join('&lt;')
          .split('>').join('&gt;')
          .split('"').join('&quot;')
          .split("'").join('&#39;');
      }

      function buildHtml(list, emptyText) {
        if (!list || list.length === 0) {
          return '<div class="log-line log-info"><span class="log-time">--:--:--</span><span>' + (emptyText || 'No hay eventos para mostrar.') + '</span></div>';
        }
        return list.map(function(e) {
          const isProblem = e.level === 'error' || e.level === 'warn';
          const safeMsg = escapeLogAttr(e.message);
          const solveBtn = isProblem
            ? '<button type="button" class="log-solve-btn" onclick="event.stopPropagation(); if (window.openErrorResolverModal) window.openErrorResolverModal(this.parentElement.getAttribute(&quot;data-raw-msg&quot;));" title="Ver solución recomendada">' +
                '<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
                '<span>Resolver</span>' +
              '</button>'
            : '';
          const clickAttr = isProblem
            ? ' onclick="if (window.openErrorResolverModal) window.openErrorResolverModal(this.getAttribute(&quot;data-raw-msg&quot;));" title="Clic para ver cómo solucionar este problema"'
            : '';

          return '<div class="log-line log-' + (e.level || 'info') + '" data-raw-msg="' + safeMsg + '"' + clickAttr + '>' +
            '<span class="log-time">' + escapeLogAttr(e.timestamp) + '</span>' +
            '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;">' + safeMsg + '</span>' +
            solveBtn +
          '</div>';
        }).join('');
      }

      // 1. En Estado General (Última Actividad y Ventas): siempre mostrar operaciones limpias de negocio
      const businessEvents = (events || []).filter(isBusinessOperation);
      const overviewHtml = buildHtml(businessEvents.slice(0, 15), 'No hay actividad de ventas reciente. El agente vigila cambios en Factusol en segundo plano.');

      // 2. En Diagnóstico y Ayuda: según el modo seleccionado (Diario de Operaciones vs Consola Técnica)
      let fullHtml = '';
      if (currentLogViewMode === 'journal') {
        fullHtml = buildHtml(businessEvents, 'No hay operaciones de negocio registradas en esta sesión.');
      } else {
        const filtered = (events || []).filter(function(e) {
          if (currentLogFilter !== 'all' && e.level !== currentLogFilter) return false;
          if (searchVal && !e.message.toLowerCase().includes(searchVal)) return false;
          return true;
        });
        fullHtml = buildHtml(filtered, 'No hay registros técnicos que coincidan con los filtros.');
      }

      if (overviewList && overviewList.innerHTML !== overviewHtml) overviewList.innerHTML = overviewHtml;
      if (fullPanel && fullPanel.innerHTML !== fullHtml) fullPanel.innerHTML = fullHtml;
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
      const channelUrl = s.channel ? (s.channel.url || s.channel.storeUrl || 'N/A') : 'N/A';
      const channelType = s.channel ? (s.channel.type || window.currentChannelType || 'N/A') : 'N/A';
      const factusolDb = s.factusol ? (s.factusol.databasePath || s.factusolDbPath || 'N/A') : 'N/A';
      const factusolConnected = s.factusol ? (s.factusol.connected ? 'Conectado (OK)' : 'Desconectado / Offline') : 'N/A';
      const licPlan = s.license ? (s.license.plan || 'N/A') : 'N/A';
      const licStatus = s.license ? (s.license.status || 'N/A') : 'N/A';

      const lines = [
        '==================================================',
        '   BENTIAN ERP BRIDGE - INFORME TÉCNICO DE SOPORTE',
        '==================================================',
        'Fecha de Captura: ' + new Date().toLocaleString(),
        'Versión Agente:   v' + (s.agentVersion || s.version || '0.3.7'),
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
