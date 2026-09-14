// Auto-hidratación en tiempo real desde /releases/latest.json
(function initReleaseMetadata() {
  fetch('/releases/latest.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data || !data.latestVersion) return;
      var v = data.latestVersion;
      var stable = data.stable || {};

      // Actualizar badges
      var heroBadge = document.getElementById('hero-version-tag');
      if (heroBadge) heroBadge.innerText = 'Release Oficial v' + v + ' para Windows x64';

      // Actualizar enlaces de descarga del Hero
      var btnHeroExe = document.getElementById('btn-hero-download');
      if (btnHeroExe) btnHeroExe.href = '/releases/v' + v + '/Bentian-Setup-v' + v + '.exe';

      var btnHeroZip = document.getElementById('btn-hero-zip');
      if (btnHeroZip) btnHeroZip.href = '/releases/v' + v + '/Bentian-Setup-v' + v + '.zip';

      // Actualizar enlaces de descarga del Agente
      var btnAgentExe = document.getElementById('btn-agent-exe');
      if (btnAgentExe) btnAgentExe.href = '/releases/v' + v + '/Bentian-Setup-v' + v + '.exe';

      var btnAgentZip = document.getElementById('btn-agent-zip');
      if (btnAgentZip) btnAgentZip.href = '/releases/v' + v + '/Bentian-Setup-v' + v + '.zip';

      // Actualizar Hashes SHA-256
      var heroHash = document.getElementById('hero-hash-preview');
      if (heroHash && stable.installer && stable.installer.sha256) {
        heroHash.innerText = stable.installer.sha256;
      }

      var agentHash = document.getElementById('agent-sha256');
      if (agentHash && stable.sha256) {
        agentHash.innerText = stable.sha256;
      }

      // Tamaño de archivo
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
