export const logsScript = `
    function renderLogs(events) {
      const overviewList = document.getElementById('overview-logs-list');
      const fullPanel = document.getElementById('full-logs-panel');
      const searchVal = (document.getElementById('log-search-input') ? document.getElementById('log-search-input').value : '').toLowerCase();

      const filtered = events.filter(function(e) {
        if (currentLogFilter !== 'all' && e.level !== currentLogFilter) return false;
        if (searchVal && !e.message.toLowerCase().includes(searchVal)) return false;
        return true;
      });

      function escapeLogAttr(str) {
        if (!str) return '';
        return String(str)
          .split('&').join('&amp;')
          .split('<').join('&lt;')
          .split('>').join('&gt;')
          .split('"').join('&quot;')
          .split("'").join('&#39;');
      }

      function buildHtml(list) {
        if (!list || list.length === 0) {
          return '<div class="log-line log-info"><span class="log-time">--:--:--</span><span>No hay eventos para mostrar.</span></div>';
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
            '<span class="log-time">' + e.timestamp + '</span>' +
            '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;">' + e.message + '</span>' +
            solveBtn +
          '</div>';
        }).join('');
      }

      const overviewHtml = buildHtml(events.slice(0, 15));
      const fullHtml = buildHtml(filtered);

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
`;
