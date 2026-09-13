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

      function buildHtml(list) {
        if (!list || list.length === 0) {
          return '<div class="log-line log-info"><span class="log-time">--:--:--</span><span>No hay eventos para mostrar.</span></div>';
        }
        return list.map(function(e) {
          return '<div class="log-line log-' + (e.level || 'info') + '">' +
            '<span class="log-time">' + e.timestamp + '</span>' +
            '<span>' + e.message + '</span>' +
          '</div>';
        }).join('');
      }

      if (overviewList) overviewList.innerHTML = buildHtml(events.slice(0, 15));
      if (fullPanel) fullPanel.innerHTML = buildHtml(filtered);
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
