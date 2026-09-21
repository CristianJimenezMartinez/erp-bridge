import { coreScript } from './core.script';
import { renderStatusScript } from './status.script';
import { factusolScript } from './factusol.script';
import { channelScript } from './channel.script';
import { licenseScript } from './license.script';
import { syncScript } from './sync.script';
import { logsScript } from './logs.script';
import { wizardScript } from './wizard.script';

export function renderClientScript(agentVersion: string = '0.2.0'): string {
  return [
    '  <!-- ================= SCRIPTS ================= -->',
    '  <script>',
    coreScript,
    renderStatusScript(agentVersion),
    factusolScript,
    channelScript,
    licenseScript,
    syncScript,
    logsScript,
    wizardScript,
    '    // Inicializar sondeo con protección de timer único',
    '    if (window.__statusPollInterval) clearInterval(window.__statusPollInterval);',
    '    fetchStatus();',
    '    window.__statusPollInterval = setInterval(fetchStatus, 3000);',
    '  </script>',
  ].join('\n');
}
