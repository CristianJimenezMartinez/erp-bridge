export const coreScript = `
    let currentStatus = null;
    let allArticles = [];
    let allLogs = [];
    let currentLogFilter = 'all';
    let currentChannelType = 'universal_bridge';
    let wizardCurrentStep = 1;

    // Toast
    function showToast(text, type) {
      type = type || 'success';
      const toast = document.getElementById('toast');
      const toastText = document.getElementById('toast-text');
      const toastIcon = document.getElementById('toast-icon');
      toast.className = 'toast-' + type;
      toastText.textContent = text;
      toastIcon.textContent = type === 'success' ? '✓' : (type === 'warn' ? '⚠️' : '✕');
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 3500);
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
      document.getElementById('header-page-title').innerHTML = '<span>' + (titles[tabId] || 'Bentian') + '</span>';

      if (tabId === 'factusol' && allArticles.length === 0) {
        loadArticlePreview();
        loadFactusolMetadata();
      } else if (tabId === 'history') {
        loadSyncHistory();
      }
    }

    // Channel Switcher
    function selectChannelType(type) {
      currentChannelType = type;
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
`;
