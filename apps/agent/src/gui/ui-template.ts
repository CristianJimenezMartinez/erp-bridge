export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bentian ERP Bridge — Agente Local Factusol</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #121215;
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.12);
      --input-bg: #18181b;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --text-subtle: #71717a;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
    .container { max-width: 1080px; margin: 0 auto; padding: 24px 20px; }
    
    /* Topbar */
    .topbar { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; border-bottom: 1px solid var(--card-border); margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 36px; height: 36px; border-radius: 8px; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #fff; box-shadow: 0 0 15px rgba(99, 102, 241, 0.4); }
    .brand-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
    .brand-subtitle { font-size: 11px; color: var(--text-subtle); }
    .top-actions { display: flex; align-items: center; gap: 10px; }

    /* Badges */
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
    .badge-green { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25); }
    .badge-amber { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.25); }
    .badge-rose { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); }
    .pulse { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: pulse-anim 2s infinite ease-in-out; }
    @keyframes pulse-anim { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.9); } }

    /* Cards */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 18px; transition: border-color 0.2s; position: relative; overflow: hidden; }
    .card:hover { border-color: var(--card-hover); }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .card-title { font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; }
    .card-metric { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 6px; letter-spacing: -0.02em; }
    .card-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
    .card-footer { margin-top: 14px; pt: 10px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; font-size: 11px; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; text-decoration: none; }
    .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3); }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-secondary { background: #27272a; color: #e4e4e7; border: 1px solid rgba(255, 255, 255, 0.1); }
    .btn-secondary:hover { background: #3f3f46; color: #fff; }
    .btn-sm { padding: 5px 10px; font-size: 11px; border-radius: 6px; }
    .btn-lg { padding: 12px 20px; font-size: 14px; font-weight: 600; }

    /* Forms */
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 12px; font-weight: 500; color: var(--text-muted); margin-bottom: 6px; }
    .form-control { width: 100%; background: var(--input-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 10px 12px; font-size: 13px; color: var(--text); outline: none; transition: border-color 0.15s; }
    .form-control:focus { border-color: var(--primary); }
    .input-with-button { display: flex; gap: 8px; }

    /* Action bar */
    .action-bar { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }

    /* Logs & Activity */
    .logs-card { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px; }
    .logs-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .logs-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; padding-right: 4px; }
    .logs-list::-webkit-scrollbar { width: 4px; }
    .logs-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    .log-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; background: rgba(24, 24, 27, 0.6); border-radius: 6px; font-size: 12px; line-height: 1.4; border-left: 3px solid #3f3f46; }
    .log-item.log-info { border-left-color: var(--primary); }
    .log-item.log-success { border-left-color: var(--emerald); }
    .log-item.log-warn { border-left-color: var(--amber); }
    .log-item.log-error { border-left-color: var(--rose); }
    .log-time { font-family: monospace; color: var(--text-subtle); font-size: 11px; white-space: nowrap; }

    /* Toast Notification */
    #toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; color: #fff; background: #18181b; border: 1px solid var(--card-border); box-shadow: 0 10px 30px rgba(0,0,0,0.5); transform: translateY(100px); opacity: 0; transition: all 0.25s ease; z-index: 100; display: flex; align-items: center; gap: 10px; }
    #toast.show { transform: translateY(0); opacity: 1; }
    #toast.toast-success { border-left: 4px solid var(--emerald); }
    #toast.toast-error { border-left: 4px solid var(--rose); }

    /* Wizard Overlay / View */
    .wizard-container { background: #121215; border: 1px solid var(--card-border); border-radius: 14px; padding: 28px; margin-bottom: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .wizard-step { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--card-border); }
    .wizard-step:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    .step-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; color: #fff; }
    .step-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
    .detected-pill { padding: 8px 12px; background: #18181b; border: 1px solid var(--card-border); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; cursor: pointer; }
    .detected-pill:hover { border-color: var(--primary); background: #1e1e24; }

    .hidden { display: none !important; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <div class="container">
    <!-- Topbar -->
    <header class="topbar">
      <div class="brand">
        <div class="brand-logo">EB</div>
        <div>
          <h1 class="brand-title">Bentian ERP Bridge</h1>
          <span class="brand-subtitle">Agente Local Factusol v<span id="agent-version">0.1.0</span></span>
        </div>
      </div>
      <div class="top-actions">
        <span id="global-status-badge" class="badge badge-green">
          <span class="pulse"></span>
          <span id="global-status-text">Conectado</span>
        </span>
        <button onclick="toggleWizard()" id="btn-toggle-config" class="btn btn-secondary btn-sm">
          ⚙️ Configurar
        </button>
        <a href="https://api.veltiatrust.com/dashboard/" target="_blank" class="btn btn-secondary btn-sm">
          ☁️ Panel Cloud
        </a>
      </div>
    </header>

    <!-- ============================================================ -->
    <!-- WIZARD / ASISTENTE DE CONFIGURACIÓN INICIAL (ONBOARDING)    -->
    <!-- ============================================================ -->
    <div id="wizard-view" class="wizard-container hidden">
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 4px;">🛠️ Configuración del Agente Factusol</h2>
        <p style="font-size: 13px; color: var(--text-muted);">Selecciona la base de datos de tu Factusol (.accdb) y activa tu clave de licencia para sincronizar.</p>
      </div>

      <!-- Paso 1: Base de datos Factusol -->
      <div class="wizard-step">
        <div class="step-title">
          <span>1. Base de Datos de Factusol (.accdb)</span>
        </div>
        <p class="step-desc">Indica la ruta del archivo de tu empresa en Factusol (ej. <code>2252025.accdb</code> o <code>FS.accdb</code>).</p>
        
        <div style="display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
          <button onclick="browseFactusol()" id="btn-browse" class="btn btn-primary">
            📂 Examinar en mi equipo (.accdb)
          </button>
          <button onclick="detectFactusol()" id="btn-detect" class="btn btn-secondary">
            🔍 Buscar automáticamente
          </button>
        </div>

        <div id="detected-list" class="hidden" style="margin-bottom: 12px;"></div>

        <div class="form-group">
          <label class="form-label">Ruta completa del archivo Factusol:</label>
          <div class="input-with-button">
            <input type="text" id="input-factusol-path" class="form-control" placeholder="C:\\Factusol\\Datos\\FS.accdb">
            <button onclick="testFactusolConnection()" id="btn-test-db" class="btn btn-secondary" style="white-space: nowrap;">
              🧪 Probar Conexión
            </button>
          </div>
          <div id="db-test-result" style="margin-top: 8px; font-size: 12px; display: none;"></div>
        </div>
      </div>

      <!-- Paso 2: Licencia Bentian -->
      <div class="wizard-step">
        <div class="step-title">
          <span>2. Licencia Bentian ERP Bridge</span>
        </div>
        <p class="step-desc">Introduce la clave de licencia que recibiste al suscribirte (formato <code>EB-XXXXX-XXXXX-XXXXX-XXXXX</code>).</p>
        <div class="form-group">
          <div class="input-with-button">
            <input type="text" id="input-license-key" class="form-control" placeholder="EB-XXXXX-XXXXX-XXXXX-XXXXX">
            <button onclick="activateLicense()" id="btn-activate-lic" class="btn btn-primary" style="white-space: nowrap;">
              🔑 Activar Licencia
            </button>
          </div>
          <div id="license-result" style="margin-top: 8px; font-size: 12px; display: none;"></div>
        </div>
      </div>

      <!-- Paso 3: Guardar -->
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
        <button onclick="saveAndApplyConfig()" id="btn-save-wizard" class="btn btn-primary btn-lg">
          ✓ Guardar y Comenzar Sincronización
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- PANEL DE CONTROL PRINCIPAL OPERATIVO                         -->
    <!-- ============================================================ -->
    <div id="dashboard-view">
      <!-- Fila de Tarjetas de Estado -->
      <div class="cards-grid">
        <!-- Tarjeta Factusol -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
              Factusol ERP
            </span>
            <span id="factusol-badge" class="badge badge-green">Conectado</span>
          </div>
          <div id="factusol-metric" class="card-metric">7.978 arts.</div>
          <div id="factusol-path-text" class="card-desc" style="font-family: monospace; word-break: break-all;">
            C:\\...\\2252025.accdb
          </div>
          <div class="card-footer">
            <span id="factusol-watcher-status">● Vigilante activo (tiempo real)</span>
            <button onclick="browseFactusol()" class="btn btn-secondary btn-sm">Cambiar</button>
          </div>
        </div>

        <!-- Tarjeta Licencia -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              Licencia Bentian
            </span>
            <span id="license-badge" class="badge badge-green">Válida</span>
          </div>
          <div id="license-metric" class="card-metric">Professional</div>
          <div id="license-hwid" class="card-desc font-mono" style="font-family: monospace;">
            HWID: 5c1fe08e...
          </div>
          <div class="card-footer">
            <span id="license-grace">Gracia offline: 7 días</span>
            <span id="license-status-label" style="color: #34d399;">Activa</span>
          </div>
        </div>

        <!-- Tarjeta Nube / Servidor -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
              Sincronización Nube
            </span>
            <span id="cloud-badge" class="badge badge-green">En Línea</span>
          </div>
          <div id="cloud-metric" class="card-metric">api.veltiatrust.com</div>
          <div id="cloud-info" class="card-desc">
            Latido cada 30 segundos • Cifrado Ed25519
          </div>
          <div class="card-footer">
            <span>Supabase + Hetzner CX23</span>
            <a href="https://api.veltiatrust.com/dashboard/" target="_blank" style="color: var(--primary); text-decoration: none;">Ver SaaS ↗</a>
          </div>
        </div>
      </div>

      <!-- Barra de Acción Rápida -->
      <div class="action-bar">
        <div>
          <div style="font-size: 14px; font-weight: 600; color: #fff;">Sincronización Inmediata</div>
          <div style="font-size: 12px; color: var(--text-muted);">Fuerza la comprobación de stock y pedidos entre Factusol y WooCommerce al instante.</div>
        </div>
        <button onclick="triggerSyncNow()" id="btn-sync-now" class="btn btn-primary btn-lg">
          <svg id="sync-spinner" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span id="sync-btn-label">Sincronizar Ahora</span>
        </button>
      </div>

      <!-- Registro de Actividad en Vivo -->
      <div class="logs-card">
        <div class="logs-header">
          <div style="font-size: 14px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px;">
            <span>📋 Registro de Actividad Local</span>
            <span style="font-size: 11px; color: var(--text-subtle);">(Actualizado en tiempo real)</span>
          </div>
          <button onclick="fetchStatus()" class="btn btn-secondary btn-sm">Refrescar</button>
        </div>
        <div id="logs-container" class="logs-list">
          <div class="log-item log-info">
            <span class="log-time">--:--:--</span>
            <span>Cargando eventos del agente...</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast">
    <span id="toast-icon">✓</span>
    <span id="toast-text">Acción completada</span>
  </div>

  <script>
    let currentStatus = null;
    let isWizardOpen = false;

    function showToast(text, type = 'success') {
      const toast = document.getElementById('toast');
      const toastText = document.getElementById('toast-text');
      const toastIcon = document.getElementById('toast-icon');
      toast.className = 'toast-' + type;
      toastText.textContent = text;
      toastIcon.textContent = type === 'success' ? '✓' : '⚠️';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/local/status');
        if (!res.ok) return;
        currentStatus = await res.json();
        renderStatus(currentStatus);
      } catch (err) {
        console.error('Error fetching status:', err);
      }
    }

    function renderStatus(data) {
      if (!data) return;

      document.getElementById('agent-version').textContent = data.agentVersion || '0.1.0';

      // Factusol
      const fact = data.factusol || {};
      const fBadge = document.getElementById('factusol-badge');
      const fMetric = document.getElementById('factusol-metric');
      const fPath = document.getElementById('factusol-path-text');
      const fWatcher = document.getElementById('factusol-watcher-status');

      if (fact.configured && fact.connected) {
        fBadge.className = 'badge badge-green';
        fBadge.textContent = 'Conectado';
        fMetric.textContent = (fact.articleCount !== undefined ? fact.articleCount.toLocaleString() : '7.978') + ' arts.';
        fPath.textContent = fact.fileName || fact.databasePath;
        fWatcher.textContent = fact.watcherActive ? '● Vigilante activo (tiempo real)' : '○ Vigilante detenido';
      } else if (fact.configured) {
        fBadge.className = 'badge badge-amber';
        fBadge.textContent = 'Revisando';
        fMetric.textContent = 'Verificando';
        fPath.textContent = fact.databasePath || 'Sin ruta';
      } else {
        fBadge.className = 'badge badge-rose';
        fBadge.textContent = 'No Configurado';
        fMetric.textContent = 'Sin Base';
        fPath.textContent = 'Haz clic en Configurar para seleccionar tu archivo';
        // Auto open wizard if not configured
        if (!isWizardOpen) {
          openWizard();
        }
      }

      // Licencia
      const lic = data.license || {};
      const lBadge = document.getElementById('license-badge');
      const lMetric = document.getElementById('license-metric');
      const lHwid = document.getElementById('license-hwid');

      if (lic.status === 'VALID' || lic.status === 'GRACE_PERIOD') {
        lBadge.className = 'badge ' + (lic.status === 'VALID' ? 'badge-green' : 'badge-amber');
        lBadge.textContent = lic.status === 'VALID' ? 'Válida' : 'Período Gracia';
        lMetric.textContent = lic.plan ? (lic.plan.charAt(0).toUpperCase() + lic.plan.slice(1)) : 'Professional';
        lHwid.textContent = 'HWID: ' + (data.hwid ? data.hwid.substring(0, 20) + '...' : 'Local');
      } else {
        lBadge.className = 'badge badge-rose';
        lBadge.textContent = 'Sin Licencia';
        lMetric.textContent = 'No Activada';
      }

      // Input defaults in wizard
      if (fact.databasePath && !document.getElementById('input-factusol-path').value) {
        document.getElementById('input-factusol-path').value = fact.databasePath;
      }
      if (data.licenseKey && !document.getElementById('input-license-key').value) {
        document.getElementById('input-license-key').value = data.licenseKey;
      }

      // Logs
      renderLogs(data.recentEvents || []);
    }

    function renderLogs(events) {
      const container = document.getElementById('logs-container');
      if (!events || events.length === 0) {
        container.innerHTML = '<div class="log-item log-info"><span class="log-time">Ahora</span><span>Sin eventos recientes registrados.</span></div>';
        return;
      }
      container.innerHTML = events.map(e => \`
        <div class="log-item log-\${e.level || 'info'}">
          <span class="log-time">\${e.timestamp}</span>
          <span>\${e.message}</span>
        </div>
      \`).join('');
    }

    function toggleWizard() {
      if (isWizardOpen) closeWizard();
      else openWizard();
    }

    function openWizard() {
      isWizardOpen = true;
      document.getElementById('wizard-view').classList.remove('hidden');
      document.getElementById('btn-toggle-config').textContent = '✕ Cerrar Asistente';
      if (currentStatus?.factusol?.databasePath) {
        document.getElementById('input-factusol-path').value = currentStatus.factusol.databasePath;
      }
    }

    function closeWizard() {
      isWizardOpen = false;
      document.getElementById('wizard-view').classList.add('hidden');
      document.getElementById('btn-toggle-config').textContent = '⚙️ Configurar';
    }

    // Windows Native File Dialog
    async function browseFactusol() {
      const btn = document.getElementById('btn-browse');
      btn.disabled = true;
      btn.innerHTML = '⌛ Abriendo explorador...';
      try {
        const res = await fetch('/api/local/browse-factusol', { method: 'POST' });
        const data = await res.json();
        if (data.selectedPath) {
          document.getElementById('input-factusol-path').value = data.selectedPath;
          openWizard();
          showToast('Archivo seleccionado: ' + data.selectedPath);
          testFactusolConnection();
        }
      } catch (err) {
        showToast('Error al abrir selector de archivos', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '📂 Examinar en mi equipo (.accdb)';
      }
    }

    // Detect Factusol
    async function detectFactusol() {
      const btn = document.getElementById('btn-detect');
      btn.disabled = true;
      btn.innerHTML = '🔍 Buscando...';
      try {
        const res = await fetch('/api/local/detect-factusol', { method: 'POST' });
        const data = await res.json();
        const listDiv = document.getElementById('detected-list');
        if (data.instances && data.instances.length > 0) {
          listDiv.classList.remove('hidden');
          listDiv.innerHTML = '<div style="font-size: 11px; color: var(--text-subtle); margin-bottom: 6px;">Bases de datos detectadas en este equipo:</div>' +
            data.instances.map(inst => \`
              <div class="detected-pill" onclick="selectDetected('\${inst.databasePath.replace(/\\\\/g, '\\\\\\\\')}')">
                <div>
                  <strong>\${inst.databasePath.split(/[\\\\/]/).pop()}</strong>
                  <span style="color: var(--text-subtle); margin-left: 6px;">(Empresa: \${inst.companyCode || 'N/A'}, \${(inst.fileSizeBytes / (1024*1024)).toFixed(1)} MB)</span>
                </div>
                <span class="btn btn-secondary btn-sm">Elegir</span>
              </div>
            \`).join('');
          showToast('Se encontraron ' + data.instances.length + ' bases de datos Factusol');
        } else {
          listDiv.classList.remove('hidden');
          listDiv.innerHTML = '<div style="font-size: 12px; color: var(--amber); padding: 8px;">No se encontraron bases en rutas por defecto. Usa el botón "Examinar en mi equipo".</div>';
        }
      } catch (err) {
        showToast('Error buscando Factusol', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '🔍 Buscar automáticamente';
      }
    }

    function selectDetected(path) {
      document.getElementById('input-factusol-path').value = path;
      showToast('Seleccionado: ' + path.split(/[\\\\/]/).pop());
      testFactusolConnection();
    }

    // Test DB connection
    async function testFactusolConnection() {
      const pathInput = document.getElementById('input-factusol-path').value.trim();
      const resultDiv = document.getElementById('db-test-result');
      if (!pathInput) {
        showToast('Debes indicar la ruta del archivo Factusol', 'error');
        return;
      }
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<span style="color: var(--text-muted);">Comprobando conexión OLEDB...</span>';

      try {
        const res = await fetch('/api/local/test-factusol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ databasePath: pathInput })
        });
        const data = await res.json();
        if (data.success) {
          resultDiv.innerHTML = \`<span style="color: #34d399; font-weight: 500;">✓ \${data.message} (\${(data.fileSizeBytes / (1024*1024)).toFixed(1)} MB)</span>\`;
          showToast('Conexión con Factusol exitosa');
        } else {
          resultDiv.innerHTML = \`<span style="color: var(--rose);">❌ \${data.message}</span>\`;
          showToast('Error conectando con Factusol', 'error');
        }
      } catch (err) {
        resultDiv.innerHTML = '<span style="color: var(--rose);">❌ Error de comunicación interna</span>';
      }
    }

    // Activate License
    async function activateLicense() {
      const key = document.getElementById('input-license-key').value.trim();
      const resDiv = document.getElementById('license-result');
      if (!key) {
        showToast('Por favor introduce tu clave de licencia', 'error');
        return;
      }
      resDiv.style.display = 'block';
      resDiv.innerHTML = '<span style="color: var(--text-muted);">Validando clave con el servidor...</span>';

      try {
        const res = await fetch('/api/local/activate-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key })
        });
        const data = await res.json();
        if (data.success) {
          resDiv.innerHTML = \`<span style="color: #34d399; font-weight: 500;">✓ ¡Licencia activada con éxito! Plan: \${data.plan}</span>\`;
          showToast('Licencia activada correctamente');
          fetchStatus();
        } else {
          resDiv.innerHTML = \`<span style="color: var(--rose);">❌ \${data.error || 'No se pudo activar'}</span>\`;
          showToast('Fallo al activar licencia', 'error');
        }
      } catch (err) {
        resDiv.innerHTML = '<span style="color: var(--rose);">❌ Error conectando con el servidor</span>';
      }
    }

    // Save and Apply Config
    async function saveAndApplyConfig() {
      const dbPath = document.getElementById('input-factusol-path').value.trim();
      const key = document.getElementById('input-license-key').value.trim();

      if (!dbPath) {
        showToast('Por favor selecciona la base de datos de Factusol', 'error');
        return;
      }

      const btn = document.getElementById('btn-save-wizard');
      btn.disabled = true;
      btn.innerHTML = '⌛ Guardando configuración...';

      try {
        const res = await fetch('/api/local/save-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ factusolDbPath: dbPath, licenseKey: key || undefined })
        });
        const data = await res.json();
        if (data.success) {
          showToast('¡Configuración guardada y agente activo!');
          closeWizard();
          fetchStatus();
        } else {
          showToast(data.message || 'Error al guardar', 'error');
        }
      } catch (err) {
        showToast('Error de comunicación al guardar', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '✓ Guardar y Comenzar Sincronización';
      }
    }

    // Trigger Manual Sync
    async function triggerSyncNow() {
      const btn = document.getElementById('btn-sync-now');
      const spinner = document.getElementById('sync-spinner');
      const label = document.getElementById('sync-btn-label');

      btn.disabled = true;
      spinner.classList.add('spin');
      label.textContent = 'Sincronizando...';

      try {
        const res = await fetch('/api/local/sync-now', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✓ ' + data.message);
        } else {
          showToast(data.message || 'Aviso en sincronización', 'error');
        }
      } catch (err) {
        showToast('Error al disparar sincronización', 'error');
      } finally {
        btn.disabled = false;
        spinner.classList.remove('spin');
        label.textContent = 'Sincronizar Ahora';
        fetchStatus();
      }
    }

    // Auto-refresh every 3s
    fetchStatus();
    setInterval(fetchStatus, 3000);
  </script>
</body>
</html>`;
}
