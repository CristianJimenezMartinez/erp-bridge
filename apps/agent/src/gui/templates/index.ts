import { dashboardStyles } from './styles';
import {
  renderSidebar,
  renderHeader,
  renderOverviewTab,
  renderFactusolTab,
  renderChannelTab,
  renderSyncTab,
  renderHistoryTab,
  renderLogsTab,
  renderLicenseTab,
  renderWizardModal,
  renderToast,
} from './views';
import { renderClientScript } from './scripts';

export function renderDashboardHtml(agentVersion: string = '0.1.5'): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="es" class="dark">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Bentian ERP Bridge — Centro de Control Local</title>',
    '  <style>',
    dashboardStyles,
    '  </style>',
    '</head>',
    '<body>',
    '',
    renderSidebar(agentVersion),
    '',
    '  <!-- ================= MAIN WRAPPER ================= -->',
    '  <div class="main-wrapper">',
    renderHeader(),
    '',
    '    <!-- Content Area -->',
    '    <main class="content-area">',
    renderOverviewTab(),
    renderFactusolTab(),
    renderChannelTab(),
    renderSyncTab(),
    renderHistoryTab(),
    renderLogsTab(),
    renderLicenseTab(),
    '    </main>',
    '  </div>',
    '',
    renderWizardModal(),
    renderToast(),
    renderClientScript(agentVersion),
    '</body>',
    '</html>',
  ].join('\n');
}

export * from './styles';
export * from './views';
export * from './scripts';
