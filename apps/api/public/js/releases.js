// Bentian ERP Bridge — Auto-hidratación de metadatos de releases
(function initReleaseMetadata() {
  if (window.BentianVersion && typeof window.BentianVersion.applyToDom === 'function') {
    window.BentianVersion.applyToDom();
  }

  fetch('/releases/latest.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data || !data.latestVersion) return;
      var v = String(data.latestVersion).replace(/^v/, '');
      var stable = data.stable || {};

      // Si existe el sincronizador unificado, delegar en él
      if (window.BentianVersion && typeof window.BentianVersion.applyToDom === 'function') {
        window.BentianVersion.applyToDom();
        return;
      }

      // Enlaces canónicos
      var installerUrl = '/releases/latest/Bentian-Setup.exe';
      var zipUrl = '/releases/latest/Bentian-Setup.zip';

      var heroBadge = document.getElementById('hero-version-tag');
      if (heroBadge) {
        var childVer = heroBadge.querySelector('[data-app-version]');
        if (childVer) childVer.textContent = 'v' + v;
        else heroBadge.textContent = 'Release Oficial v' + v + ' para Windows x64';
      }

      var btnHeroExe = document.getElementById('btn-hero-download');
      if (btnHeroExe) btnHeroExe.href = installerUrl;

      var btnHeroZip = document.getElementById('btn-hero-zip');
      if (btnHeroZip) btnHeroZip.href = zipUrl;

      var btnAgentExe = document.getElementById('btn-agent-exe');
      if (btnAgentExe) btnAgentExe.href = installerUrl;

      var btnAgentZip = document.getElementById('btn-agent-zip');
      if (btnAgentZip) btnAgentZip.href = zipUrl;

      var heroHash = document.getElementById('hero-hash-preview');
      if (heroHash && stable.installer && stable.installer.sha256) {
        heroHash.innerText = stable.installer.sha256;
      }

      var agentHash = document.getElementById('agent-sha256');
      if (agentHash && stable.sha256) {
        agentHash.innerText = stable.sha256;
      }

      var agentSize = document.getElementById('agent-file-size');
      if (agentSize && stable.fileSize) {
        var mb = (stable.fileSize / (1024 * 1024)).toFixed(1);
        agentSize.innerText = mb + ' MB';
      }
    })
    .catch(function(err) {
      console.debug('Aviso al hidratar releases:', err);
    });
})();
