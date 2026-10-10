/**
 * Bentian ERP Bridge — Single Source of Truth Client Version Synchronizer
 * 
 * Centraliza la lectura de la versión oficial desde /releases/latest.json y
 * actualiza dinámicamente todos los data-attributes y enlaces del DOM:
 *   - [data-app-version]
 *   - [data-download-installer]
 *   - [data-download-zip]
 *   - [data-download-portable]
 */
(function(window, document) {
  'use strict';

  var DEFAULT_VERSION = '0.4.1';
  var INSTALLER_URL = '/releases/latest/Bentian-Setup.exe';
  var ZIP_URL = '/releases/latest/Bentian-Setup.zip';
  var PORTABLE_URL = '/releases/latest/BentianAgent-Portable.zip';

  var state = {
    rawVersion: DEFAULT_VERSION,
    version: 'v' + DEFAULT_VERSION,
    installerUrl: INSTALLER_URL,
    zipUrl: ZIP_URL,
    portableUrl: PORTABLE_URL,
    manifest: null,
    isLoaded: false
  };

  function formatVersionText(el, version, rawVersion) {
    var format = el.getAttribute('data-version-format');
    if (format) {
      return format
        .replace('{version}', version)
        .replace('{rawVersion}', rawVersion);
    }

    var prefix = el.getAttribute('data-version-prefix');
    var suffix = el.getAttribute('data-version-suffix') || '';

    if (prefix !== null) {
      return prefix + rawVersion + suffix;
    }

    // Por defecto 'vX.Y.Z' + sufijo opcional
    return version + suffix;
  }

  function applyVersionToElement(el) {
    if (!el) return;

    if (el.hasAttribute('data-app-version')) {
      el.textContent = formatVersionText(el, state.version, state.rawVersion);
    }

    if (el.hasAttribute('data-download-installer')) {
      el.setAttribute('href', state.installerUrl);
    }

    if (el.hasAttribute('data-download-zip')) {
      el.setAttribute('href', state.zipUrl);
    }

    if (el.hasAttribute('data-download-portable')) {
      el.setAttribute('href', state.portableUrl);
    }

    if (el.hasAttribute('data-installer-sha256') && state.manifest && state.manifest.installer && state.manifest.installer.sha256) {
      el.textContent = state.manifest.installer.sha256;
    }

    if (el.hasAttribute('data-agent-sha256') && state.manifest && state.manifest.sha256) {
      el.textContent = state.manifest.sha256;
    }

    if (el.hasAttribute('data-agent-size') && state.manifest && state.manifest.fileSize) {
      var mb = (state.manifest.fileSize / (1024 * 1024)).toFixed(1);
      el.textContent = mb + ' MB';
    }
  }

  function applyToDom(root) {
    var context = root || document;
    if (!context.querySelectorAll) return;

    // 1. Elementos con data-attributes semánticos
    var selectors = [
      '[data-app-version]',
      '[data-download-installer]',
      '[data-download-zip]',
      '[data-download-portable]',
      '[data-installer-sha256]',
      '[data-agent-sha256]',
      '[data-agent-size]'
    ];

    var elements = context.querySelectorAll(selectors.join(','));
    for (var i = 0; i < elements.length; i++) {
      applyVersionToElement(elements[i]);
    }

    // 2. Elementos legacy por ID para máxima retrocompatibilidad
    var heroBadge = document.getElementById('hero-version-tag');
    if (heroBadge && !heroBadge.hasAttribute('data-app-version')) {
      var childVersion = heroBadge.querySelector('[data-app-version]');
      if (!childVersion) {
        heroBadge.textContent = 'Release Oficial ' + state.version + ' para Windows x64';
      }
    }

    var legacyInstallerButtons = ['btn-hero-download', 'btn-agent-exe', 'btn-welcome-download'];
    for (var j = 0; j < legacyInstallerButtons.length; j++) {
      var btn = document.getElementById(legacyInstallerButtons[j]);
      if (btn) btn.setAttribute('href', state.installerUrl);
    }

    var legacyZipButtons = ['btn-hero-zip', 'btn-agent-zip'];
    for (var k = 0; k < legacyZipButtons.length; k++) {
      var zipBtn = document.getElementById(legacyZipButtons[k]);
      if (zipBtn) zipBtn.setAttribute('href', state.zipUrl);
    }

    var heroHash = document.getElementById('hero-hash-preview');
    if (heroHash && state.manifest && state.manifest.installer && state.manifest.installer.sha256) {
      heroHash.textContent = state.manifest.installer.sha256;
    }

    var agentHash = document.getElementById('agent-sha256');
    if (agentHash && state.manifest && state.manifest.sha256) {
      agentHash.textContent = state.manifest.sha256;
    }

    var agentSize = document.getElementById('agent-file-size');
    if (agentSize && state.manifest && state.manifest.fileSize) {
      var agentMb = (state.manifest.fileSize / (1024 * 1024)).toFixed(1);
      agentSize.textContent = agentMb + ' MB';
    }

    var healthKpiVersion = document.getElementById('health-kpi-version');
    if (healthKpiVersion && !healthKpiVersion.hasAttribute('data-app-version')) {
      healthKpiVersion.textContent = state.version;
    }

    // 3. Control de campaña Beta Pública 2026 (ocultación automática tras 31/12/2026)
    if (Date.now() > new Date('2026-12-31T23:59:59Z').getTime()) {
      var betaSelectors = ['#beta-announcement-bar', '#nav-beta-btn', '#btn-hero-beta', '#card-pricing-beta', '#betaClaimCard'];
      for (var b = 0; b < betaSelectors.length; b++) {
        var el = document.querySelector(betaSelectors[b]);
        if (el) el.style.display = 'none';
      }
      var betaClosed = document.getElementById('betaClosedCard');
      if (betaClosed) betaClosed.classList.remove('hidden');
    }
  }

  function initObserver() {
    if (typeof MutationObserver !== 'function') return;

    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes;
        for (var j = 0; j < addedNodes.length; j++) {
          var node = addedNodes[j];
          if (node.nodeType === 1) { // ELEMENT_NODE
            applyToDom(node);
          }
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function fetchLatestVersion() {
    return fetch('/releases/latest.json', { cache: 'no-cache' })
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        if (data && data.latestVersion) {
          state.rawVersion = String(data.latestVersion).replace(/^v/, '').trim();
          state.version = 'v' + state.rawVersion;
          state.manifest = data.stable || data;
          state.isLoaded = true;

          applyToDom();

          try {
            window.dispatchEvent(new CustomEvent('bentian:version-synced', {
              detail: {
                version: state.version,
                rawVersion: state.rawVersion,
                installerUrl: state.installerUrl,
                zipUrl: state.zipUrl,
                portableUrl: state.portableUrl,
                manifest: state.manifest
              }
            }));
          } catch (e) {}
        }
      })
      .catch(function(err) {
        console.debug('[VersionSync] Usando valores canónicos locales:', err.message);
        applyToDom();
      });
  }

  // API Global accesible por otros módulos
  window.BentianVersion = {
    getVersion: function() { return state.version; },
    getRawVersion: function() { return state.rawVersion; },
    getInstallerUrl: function() { return state.installerUrl; },
    getZipUrl: function() { return state.zipUrl; },
    getPortableUrl: function() { return state.portableUrl; },
    getManifest: function() { return state.manifest; },
    applyToDom: applyToDom,
    fetchLatestVersion: fetchLatestVersion
  };

  // Inicialización
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      applyToDom();
      initObserver();
      fetchLatestVersion();
    });
  } else {
    applyToDom();
    initObserver();
    fetchLatestVersion();
  }

})(window, document);
