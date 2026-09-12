export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bentian ERP Bridge — Centro de Control Local</title>
  <style>
    :root {
      --bg: #09090b;
      --sidebar-bg: #0d0d11;
      --card: #141418;
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.14);
      --input-bg: #1a1a22;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --text-subtle: #71717a;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-glow: rgba(99, 102, 241, 0.25);
      --emerald: #10b981;
      --emerald-glow: rgba(16, 185, 129, 0.25);
      --amber: #f59e0b;
      --rose: #ef4444;
      --blue: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); height: 100vh; overflow: hidden; display: flex; }

    /* Layout */
    .sidebar { width: 256px; background: var(--sidebar-bg); border-right: 1px solid var(--card-border); display: flex; flex-direction: column; flex-shrink: 0; user-select: none; }
    .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
    .header { height: 62px; border-bottom: 1px solid var(--card-border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: rgba(13, 13, 17, 0.65); backdrop-filter: blur(12px); z-index: 10; }
    .content-area { flex: 1; overflow-y: auto; padding: 24px; }
    .content-area::-webkit-scrollbar { width: 6px; }
    .content-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }

    /* Sidebar Items */
    .brand { padding: 18px 16px; border-bottom: 1px solid var(--card-border); display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 34px; height: 34px; border-radius: 9px; background: #18181b; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; }
    .brand-title { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .brand-subtitle { font-size: 11px; color: var(--text-subtle); display: flex; align-items: center; gap: 6px; margin-top: 1px; }

    .nav-list { list-style: none; padding: 14px 10px; flex: 1; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: var(--text-muted); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
    .nav-item:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
    .nav-item.active { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); font-weight: 600; }
    .nav-item svg { width: 17px; height: 17px; flex-shrink: 0; stroke-width: 2; }

    .sidebar-footer { padding: 14px 16px; border-top: 1px solid var(--card-border); font-size: 11px; color: var(--text-subtle); display: flex; flex-direction: column; gap: 6px; }
    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 9999px; font-size: 11px; width: fit-content; }
    .status-online { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25); }
    .status-warn { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.25); }
    .status-offline { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite ease-in-out; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.85); } }

    /* Header */
    .header-title { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: #fff; }
    .header-actions { display: flex; align-items: center; gap: 10px; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; text-decoration: none; user-select: none; }
    .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 2px 10px var(--primary-glow); }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-secondary { background: #1e1e26; color: #e4e4e7; border: 1px solid var(--card-border); }
    .btn-secondary:hover { background: #262632; color: #fff; border-color: var(--card-hover); }
    .btn-success { background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); }
    .btn-success:hover { background: rgba(16, 185, 129, 0.28); color: #fff; }
    .btn-sm { padding: 5px 10px; font-size: 11px; border-radius: 6px; }
    .btn-lg { padding: 11px 20px; font-size: 13px; font-weight: 600; }

    /* Forms */
    .form-section { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 22px; margin-bottom: 20px; }
    .section-header { margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center; }
    .section-title { font-size: 15px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px; }
    .section-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 12px; font-weight: 500; color: var(--text-muted); margin-bottom: 6px; }
    .form-control { width: 100%; background: var(--input-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 9px 12px; font-size: 13px; color: var(--text); outline: none; transition: border-color 0.15s; }
    .form-control:focus { border-color: var(--primary); }
    .form-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; background-size: 16px; padding-right: 32px; }
    .input-with-button { display: flex; gap: 8px; }
    .checkbox-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; cursor: pointer; user-select: none; }
    .checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); }
    .checkbox-label { font-size: 13px; color: var(--text); }
    .checkbox-desc { font-size: 11px; color: var(--text-subtle); margin-left: 26px; }

    /* Cards */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .card { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 18px; transition: border-color 0.2s; position: relative; }
    .card:hover { border-color: var(--card-hover); }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .card-title { font-size: 13px; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
    .card-metric { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; letter-spacing: -0.02em; }
    .card-desc { font-size: 12px; color: var(--text-subtle); line-height: 1.4; word-break: break-all; }
    .card-footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-subtle); }

    /* Badges / Tags */
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; font-family: monospace; }
    .tag-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .tag-green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .tag-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .tag-rose { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    /* Tables */
    .table-container { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
    .table-toolbar { padding: 14px 18px; border-bottom: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
    .data-table th { background: #181820; padding: 10px 14px; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--card-border); }
    .data-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text); }
    .data-table tr:hover td { background: rgba(255, 255, 255, 0.02); }

    /* Logs Panel */
    .logs-panel { background: #0b0b0e; border: 1px solid var(--card-border); border-radius: 12px; padding: 14px; font-family: monospace; font-size: 12px; height: 360px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
    .logs-panel::-webkit-scrollbar { width: 5px; }
    .logs-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    .log-line { display: flex; gap: 10px; padding: 3px 6px; border-radius: 4px; line-height: 1.4; border-left: 2px solid transparent; }
    .log-line:hover { background: rgba(255,255,255,0.03); }
    .log-line.log-info { border-left-color: var(--blue); color: #e4e4e7; }
    .log-line.log-success { border-left-color: var(--emerald); color: #a7f3d0; }
    .log-line.log-warn { border-left-color: var(--amber); color: #fde68a; }
    .log-line.log-error { border-left-color: var(--rose); color: #fca5a5; }
    .log-time { color: var(--text-subtle); flex-shrink: 0; }

    /* Tab Panes */
    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: fadeIn 0.15s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }

    /* Zen View Card */
    .zen-hero { background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 16px; padding: 32px 28px; display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; position: relative; overflow: hidden; }
    .zen-hero::before { content: ''; position: absolute; top: -50px; right: -50px; width: 180px; height: 180px; background: radial-gradient(circle, var(--emerald-glow) 0%, transparent 70%); pointer-events: none; }
    .zen-status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .zen-title { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.02em; margin-bottom: 6px; }
    .zen-sub { font-size: 13px; color: var(--text-muted); line-height: 1.5; max-width: 580px; }

    /* Interactive Checklist */
    .checklist-container { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
    .checklist-step { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #17171e; border: 1px solid var(--card-border); border-radius: 8px; font-size: 13px; color: var(--text); transition: all 0.2s; }
    .checklist-step.ok { border-color: rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.06); color: #ecfdf5; }
    .checklist-step.fail { border-color: rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.06); color: #fef2f2; }
    .checklist-circle { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; background: #262632; color: var(--text-muted); }
    .checklist-step.ok .checklist-circle { background: var(--emerald); color: #fff; }
    .checklist-step.fail .checklist-circle { background: var(--rose); color: #fff; }

    /* Onboarding Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; z-index: 2000; }
    .modal-overlay.open { display: flex; animation: fadeIn 0.2s ease-out; }
    .modal-card { width: 92%; max-width: 680px; background: #131317; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center; background: #17171d; }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center; background: #17171d; }

    .wizard-steps-bar { display: flex; gap: 8px; margin-bottom: 24px; }
    .wizard-step-item { flex: 1; text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 11px; font-weight: 600; background: #1e1e26; color: var(--text-subtle); display: flex; align-items: center; justify-content: center; gap: 6px; }
    .wizard-step-item.active { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); }
    .wizard-step-item.done { background: rgba(16, 185, 129, 0.15); color: #34d399; }

    /* Channel Cards */
    .channel-select-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
    .channel-card { border: 2px solid var(--card-border); background: #17171e; border-radius: 10px; padding: 16px; cursor: pointer; transition: all 0.2s; user-select: none; }
    .channel-card:hover { border-color: var(--card-hover); }
    .channel-card.selected { border-color: var(--primary); background: rgba(99, 102, 241, 0.08); }
    .channel-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }

    /* Toast */
    #toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; color: #fff; background: #1c1c22; border: 1px solid var(--card-border); box-shadow: 0 10px 30px rgba(0,0,0,0.6); transform: translateY(100px); opacity: 0; transition: all 0.25s ease; z-index: 3000; display: flex; align-items: center; gap: 10px; }
    #toast.show { transform: translateY(0); opacity: 1; }
    #toast.toast-success { border-left: 4px solid var(--emerald); }
    #toast.toast-error { border-left: 4px solid var(--rose); }
    #toast.toast-warn { border-left: 4px solid var(--amber); }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <!-- ================= SIDEBAR ================= -->
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo">
        <svg width="20" height="20" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#141418"/><path d="M18 44 C24 38, 28 32, 32 32 C36 32, 40 26, 46 20" stroke="#818cf8" stroke-width="4" stroke-linecap="round"/><circle cx="18" cy="44" r="5" fill="#6366f1"/><circle cx="46" cy="20" r="5" fill="#38bdf8"/><circle cx="32" cy="32" r="3.5" fill="#ffffff"/></svg>
      </div>
      <div>
        <div class="brand-title">Bentian ERP Bridge</div>
        <div class="brand-subtitle">
          <span>Agente Local</span>
          <span id="brand-version" class="tag tag-blue">v0.1.4</span>
        </div>
      </div>
    </div>

    <ul class="nav-list">
      <li class="nav-item active" onclick="switchTab('overview')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        <span>Estado General</span>
      </li>
      <li class="nav-item" onclick="switchTab('factusol')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
        <span>Factusol ERP</span>
      </li>
      <li class="nav-item" onclick="switchTab('channel')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
        <span>Canal Web / Tienda</span>
      </li>
      <li class="nav-item" onclick="switchTab('sync')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span>Automatización</span>
      </li>
      <li class="nav-item" onclick="switchTab('history')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
        <span>Historial de Ventas</span>
      </li>
      <li class="nav-item" onclick="switchTab('logs')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m14 2-4 4 4 4"/><path d="m10 14 4 4-4 4"/><path d="M4 12h16"/></svg>
        <span>Diagnóstico y Ayuda</span>
      </li>
      <li class="nav-item" onclick="switchTab('license')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
        <span>Licencia del Equipo</span>
      </li>
    </ul>

    <div class="sidebar-footer">
      <div style="margin-bottom: 6px;">
        <button onclick="openWizardModal()" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: flex-start; gap: 6px;">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>
          <span>Asistente de Inicio</span>
        </button>
      </div>
      <div class="status-pill status-online" id="sidebar-status-pill">
        <span class="pulse-dot"></span>
        <span id="sidebar-status-text">Operativo</span>
      </div>
      <div>Equipo: <span id="sidebar-hostname" style="color: #fff;">Local</span></div>
      <div>HWID: <span id="sidebar-hwid" style="font-family: monospace;">---</span></div>
    </div>
  </aside>

  <!-- ================= MAIN WRAPPER ================= -->
  <div class="main-wrapper">
    <!-- Header -->
    <header class="header">
      <div class="header-title" id="header-page-title">
        <span>Estado General</span>
      </div>
      <div class="header-actions">
        <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:9999px;font-size:11px;font-weight:500;color:#10b981;">
          <span style="width:7px;height:7px;background:#10b981;border-radius:50%;display:inline-block;box-shadow:0 0 6px #10b981;"></span>
          <span>Motor Autónomo Activo</span>
        </div>
        <button onclick="triggerManualSync()" id="btn-sync-header" class="btn btn-primary">
          <svg id="sync-icon-header" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Sincronizar Ahora</span>
        </button>
        <a href="https://bridge.cristianjm.com/dashboard/" target="_blank" class="btn btn-secondary btn-sm" title="Gestión de Licencias y Facturación Cloud">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
          <span>Panel Cloud</span>
        </a>
      </div>
    </header>

    <!-- Content Area -->
    <main class="content-area">

      <!-- ================= TAB 1: ESTADO GENERAL (VISTA ZEN) ================= -->
      <section id="tab-overview" class="tab-pane active">
        <!-- Semáforo Zen Central -->
        <div class="zen-hero">
          <div>
            <div class="zen-status-badge" id="zen-badge">
              <span class="pulse-dot"></span>
              <span id="zen-badge-text">Sincronización Activa — Todo al día</span>
            </div>
            <h1 class="zen-title" id="zen-title">Tu tienda web y Factusol están sincronizados</h1>
            <p class="zen-sub" id="zen-sub">
              El vigilante de Factusol detecta cualquier cambio en existencias o precios en tiempo real y actualiza tu web inmediatamente.
            </p>
          </div>
          <div style="flex-shrink: 0;">
            <button onclick="triggerManualSync()" class="btn btn-primary btn-lg" style="box-shadow: 0 4px 20px var(--primary-glow);">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Forzar Sincronización Manual</span>
            </button>
          </div>
        </div>

        <!-- 3 Tarjetas Claras de Negocio -->
        <div class="cards-grid">
          <!-- Card Factusol -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>
                Factusol ERP
              </span>
              <span id="card-f-badge" class="tag tag-green">Conectado</span>
            </div>
            <div id="card-f-metric" class="card-metric">7.978 arts.</div>
            <div id="card-f-path" class="card-desc">C:\\Factusol\\Datos\\...</div>
            <div class="card-footer">
              <span id="card-f-watcher">● Vigilante activo</span>
              <button onclick="switchTab('factusol')" class="btn btn-secondary btn-sm">Ajustar</button>
            </div>
          </div>

          <!-- Card Canal Web -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
                Canal Web
              </span>
              <span id="card-wc-badge" class="tag tag-green">Enlace Activo</span>
            </div>
            <div id="card-wc-metric" class="card-metric">Web Universal</div>
            <div id="card-wc-url" class="card-desc">https://mitienda.com</div>
            <div class="card-footer">
              <span>Puerto 443 HTTPS</span>
              <button onclick="switchTab('channel')" class="btn btn-secondary btn-sm">Gestionar</button>
            </div>
          </div>

          <!-- Card Licencia -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/></svg>
                Licencia Local
              </span>
              <span id="card-lic-badge" class="tag tag-green">Activa</span>
            </div>
            <div id="card-lic-plan" class="card-metric">Professional</div>
            <div id="card-lic-key" class="card-desc" style="font-family: monospace;">EB-PRO-XXXXX</div>
            <div class="card-footer">
              <span id="card-lic-grace">Puesto vinculado</span>
              <button onclick="switchTab('license')" class="btn btn-secondary btn-sm">Ver</button>
            </div>
          </div>
        </div>

        <!-- Terminal de Eventos Recientes -->
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Actividad Reciente del Sistema</div>
              <div class="section-desc">Eventos de sincronización y pedidos importados en segundo plano.</div>
            </div>
            <button onclick="switchTab('logs')" class="btn btn-secondary btn-sm">Ver Registro Completo ↗</button>
          </div>
          <div id="overview-logs-list" class="logs-panel" style="height: 180px;">
            <div class="log-line log-info">Cargando eventos...</div>
          </div>
        </div>
      </section>

      <!-- ================= TAB 2: FACTUSOL ERP ================= -->
      <section id="tab-factusol" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Base de Datos Factusol (.accdb / .mdb)</div>
              <div class="section-desc">Selecciona la base de datos de tu empresa en Factusol para lectura directa local.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="detectFactusol()" id="btn-detect-fact" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Auto-detectar Factusol</span>
              </button>
              <button onclick="browseFactusol()" id="btn-browse-fact" class="btn btn-primary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>
                <span>Examinar mi PC</span>
              </button>
            </div>
          </div>

          <div id="factusol-detected-box" class="form-group" style="display: none;">
            <label class="form-label">Empresas detectadas en Factusol:</label>
            <div id="factusol-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Ruta de la base de datos (o carpeta de Factusol):</label>
            <div class="input-with-button">
              <input type="text" id="input-factusol-db" onblur="handleFactusolInputBlur()" class="form-control" placeholder="C:\\Factusol\\Datos\\FS.accdb o 2252025.accdb">
              <button onclick="testFactusolConnection()" id="btn-test-fact" class="btn btn-secondary" style="white-space: nowrap;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Probar Conexión</span>
              </button>
            </div>
            <div id="fact-test-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Tarifa de Precios a Publicar:</label>
              <select id="select-factusol-tariff" class="form-control form-select">
                <option value="1">1: Tarifa General</option>
                <option value="2">2: Tarifa Web / Internet</option>
                <option value="3">3: Tarifa Contado</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Almacén de Stock:</label>
              <select id="select-factusol-warehouse" class="form-control form-select">
                <option value="GEN">GEN: Almacén General</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Serie para Pedidos Web:</label>
              <input type="text" id="input-factusol-order-series" class="form-control" value="A" maxlength="3" placeholder="A">
            </div>
            <div class="form-group">
              <label class="form-label">Serie para Facturas Directas:</label>
              <input type="text" id="input-factusol-inv-series" class="form-control" value="1" maxlength="3" placeholder="1">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
            <button onclick="saveFactusolSettings()" class="btn btn-primary">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Guardar Ajustes Factusol</span>
            </button>
          </div>
        </div>

        <!-- Explorador de Artículos -->
        <div class="table-container">
          <div class="table-toolbar">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 14px; font-weight: 600; color: #fff;">Vista Previa de Artículos Factusol</span>
              <span id="article-count-tag" class="tag tag-green">7.978 arts.</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="filter-articles-input" onkeyup="filterArticlesTable()" placeholder="Filtrar por código o nombre..." class="form-control" style="width: 220px; padding: 5px 10px; font-size: 11px;">
              <button onclick="loadArticlePreview()" id="btn-refresh-preview" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>Recargar</span>
              </button>
            </div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 110px;">Código</th>
                <th>Descripción del Artículo</th>
                <th style="width: 90px;">Familia</th>
                <th style="width: 90px; text-align: right;">Stock Real</th>
                <th style="width: 90px; text-align: right;">Precio Venta</th>
                <th style="width: 120px;">Código EAN</th>
              </tr>
            </thead>
            <tbody id="articles-table-body">
              <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Cargando catálogo Factusol...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ================= TAB 3: CANAL WEB / TIENDA ================= -->
      <section id="tab-channel" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Canal Web de Comercio Electrónico</div>
              <div class="section-desc">Selecciona el tipo de web o plataforma donde vendes por internet.</div>
            </div>
          </div>

          <!-- Selector de Canal -->
          <div class="channel-select-grid">
            <div id="card-choice-universal" class="channel-card selected" onclick="selectChannelType('universal_bridge')">
              <div class="channel-icon" style="color: #38bdf8;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 14px; color: #fff; margin-bottom: 4px;">Conector Web Universal (Recomendado)</div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">Para cualquier web a medida (Angular, React, PHP), hosting (cPanel, Plesk, Nginx, Apache) o WordPress propio por micro-puente HTTPS.</div>
            </div>

            <div id="card-choice-woo" class="channel-card" onclick="selectChannelType('woocommerce')">
              <div class="channel-icon" style="color: #a78bfa;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 14px; color: #fff; margin-bottom: 4px;">WooCommerce / WordPress</div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">Conexión directa mediante claves de la API REST oficial de WooCommerce (Consumer Key / Consumer Secret).</div>
            </div>
          </div>

          <!-- OPCIÓN A: CONECTOR WEB UNIVERSAL (HTTPS 443) -->
          <div id="panel-universal-bridge">
            <div style="padding: 16px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 10px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Paso a Paso: Cómo enlazar tu web en 2 minutos (Cero Puertos, Cero Riesgos)
              </div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
                1. Pulsa el botón de abajo para <strong>descargar el archivo conector</strong> (ya viene con tu clave de seguridad inyectada).<br>
                2. Sube ese archivo a la <strong>carpeta principal de tu web</strong> (por ejemplo <code>public_html</code>, <code>httpdocs</code> o <code>www</code>) mediante el gestor de archivos de tu hosting o por FTP.<br>
                3. Pega la dirección de tu web y pulsa <strong>Comprobar Conexión</strong>.
              </div>
              <div style="margin-top: 12px;">
                <button onclick="downloadUniversalCompanion()" class="btn btn-primary btn-sm">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span>⬇️ Descargar conector erp-bridge-endpoint.php</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Dirección de tu Tienda Web:</label>
              <div class="input-with-button">
                <input type="text" id="input-universal-url" onblur="sanitizeUrlInput('input-universal-url')" class="form-control" placeholder="https://mitienda.com">
                <button onclick="testUniversalConnection()" id="btn-test-univ" class="btn btn-secondary" style="white-space: nowrap;">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                  <span>Comprobar Conexión</span>
                </button>
              </div>
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Si no pones https://, el sistema lo añadirá automáticamente.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Clave Secreta del Conector (Bearer Token):</label>
              <div class="input-with-button">
                <input type="text" id="input-universal-key" class="form-control" style="font-family: monospace;" placeholder="EB_SEC_xxxxxxxxxxxx">
                <button onclick="generateRandomBridgeKey()" class="btn btn-secondary btn-sm" title="Generar nueva clave aleatoria">Generar</button>
              </div>
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Esta misma clave debe estar configurada en el archivo descargado.</div>
            </div>

            <!-- Checklist Interactivo de 4 Pasos -->
            <div id="univ-checklist-box" style="display: none; margin-top: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 8px;">Checklist de Estado de tu Web:</div>
              <div class="checklist-container">
                <div id="chk-server" class="checklist-step">
                  <span class="checklist-circle">1</span>
                  <span>1. Servidor web responde correctamente (HTTP 200 OK)</span>
                </div>
                <div id="chk-ssl" class="checklist-step">
                  <span class="checklist-circle">2</span>
                  <span>2. Certificado SSL seguro verificado (Puerto 443 HTTPS)</span>
                </div>
                <div id="chk-endpoint" class="checklist-step">
                  <span class="checklist-circle">3</span>
                  <span>3. Archivo erp-bridge-endpoint.php detectado en la raíz</span>
                </div>
                <div id="chk-database" class="checklist-step">
                  <span class="checklist-circle">4</span>
                  <span>4. Base de datos MariaDB / MySQL local lista para sincronizar</span>
                </div>
              </div>
              <div id="univ-test-alert" style="margin-top: 10px; font-size: 12px;"></div>
            </div>
          </div>

          <!-- OPCIÓN B: WOOCOMMERCE REST API -->
          <div id="panel-woocommerce" style="display: none;">
            <div class="form-group">
              <label class="form-label">URL de tu Tienda WooCommerce:</label>
              <input type="url" id="input-wc-url" onblur="sanitizeUrlInput('input-wc-url')" class="form-control" placeholder="https://mitienda.com">
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Consumer Key (ck_...):</label>
                <input type="text" id="input-wc-key" class="form-control" placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx">
              </div>
              <div class="form-group">
                <label class="form-label">Consumer Secret (cs_...):</label>
                <input type="password" id="input-wc-secret" class="form-control" placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx">
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 6px;">
              <button onclick="testWooCommerceConnection()" id="btn-test-wc" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg>
                <span>Probar Conexión REST API</span>
              </button>
            </div>
            <div id="wc-test-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <button onclick="saveChannelSettings()" class="btn btn-primary">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Guardar Ajustes del Canal Web</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ================= TAB 4: AUTOMATIZACIÓN & REGLAS ================= -->
      <section id="tab-sync" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Vigilante en Tiempo Real y Reglas</div>
              <div class="section-desc">Controla la periodicidad y qué datos tienen permiso para actualizar tu tienda.</div>
            </div>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" id="check-watcher-enabled" checked>
            <div>
              <div class="checkbox-label">Activar Vigilante en Tiempo Real de Factusol</div>
              <div class="checkbox-desc">Sincroniza al instante cada vez que Factusol guarda un albarán, factura o modifica stock.</div>
            </div>
          </label>

          <div class="form-grid" style="margin-top: 14px;">
            <div class="form-group">
              <label class="form-label">Tiempo de estabilización (segundos):</label>
              <input type="number" id="input-debounce-sec" class="form-control" value="5" min="1" max="60">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Espera a que Factusol libere el archivo antes de leer datos.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Sincronización Periódica de Seguridad:</label>
              <select id="select-periodic-min" class="form-control form-select">
                <option value="5">Cada 5 minutos</option>
                <option value="15" selected>Cada 15 minutos (Recomendado)</option>
                <option value="30">Cada 30 minutos</option>
                <option value="60">Cada 1 hora</option>
              </select>
            </div>
          </div>

          <div class="section-header" style="margin-top: 20px;">
            <div>
              <div class="section-title">Datos a Sincronizar</div>
              <div class="section-desc">Selecciona qué campos de Factusol se publican en tu web.</div>
            </div>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" id="check-sync-stock" checked>
            <div>
              <div class="checkbox-label">Sincronizar Existencias de Stock</div>
              <div class="checkbox-desc">Actualiza el stock real disponible tomando las unidades de Factusol.</div>
            </div>
          </label>

          <label class="checkbox-row">
            <input type="checkbox" id="check-sync-prices" checked>
            <div>
              <div class="checkbox-label">Sincronizar Precios de Venta</div>
              <div class="checkbox-desc">Actualiza los precios en la web según la tarifa seleccionada.</div>
            </div>
          </label>

          <label class="checkbox-row">
            <input type="checkbox" id="check-sync-desc">
            <div>
              <div class="checkbox-label">Sincronizar Nombres y Descripciones</div>
              <div class="checkbox-desc">Sobreescribe el título del producto en la tienda con la descripción de Factusol.</div>
            </div>
          </label>

          <div class="form-grid" style="margin-top: 14px;">
            <div class="form-group">
              <label class="form-label">Stock de Seguridad (Buffer de reserva):</label>
              <input type="number" id="input-safety-stock" class="form-control" value="0" min="0" placeholder="0">
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Resta estas unidades al stock publicado para evitar roturas físicas en tienda.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Filtro de Artículos:</label>
              <label class="checkbox-row" style="margin-top: 8px;">
                <input type="checkbox" id="check-only-stock-pos">
                <div class="checkbox-label">Solo publicar productos con stock mayor a cero</div>
              </label>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
            <button onclick="saveSyncRules()" class="btn btn-primary">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Guardar Reglas de Sincronización</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ================= TAB 5: HISTORIAL ================= -->
      <section id="tab-history" class="tab-pane">
        <div class="table-container">
          <div class="table-toolbar">
            <div>
              <span style="font-size: 14px; font-weight: 600; color: #fff;">Historial de Operaciones y Ventas</span>
              <div style="font-size: 11px; color: var(--text-subtle); margin-top: 2px;">Registro cronológico de sincronizaciones y pedidos importados a Factusol.</div>
            </div>
            <button onclick="loadSyncHistory()" class="btn btn-secondary btn-sm">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
              <span>Actualizar Historial</span>
            </button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 90px;">Hora</th>
                <th style="width: 100px;">Tipo</th>
                <th style="width: 90px;">Modo</th>
                <th style="width: 100px;">Estado</th>
                <th style="width: 90px; text-align: right;">Artículos</th>
                <th style="width: 90px; text-align: right;">Pedidos</th>
                <th style="width: 80px; text-align: right;">Duración</th>
                <th>Resultado / Detalle</th>
              </tr>
            </thead>
            <tbody id="history-table-body">
              <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Cargando historial...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ================= TAB 6: DIAGNÓSTICO Y AYUDA ================= -->
      <section id="tab-logs" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Registro de Eventos y Diagnóstico para Soporte</div>
              <div class="section-desc">Genera un informe descargable para resolución de incidencias con un solo clic.</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="downloadDiagnostics()" id="btn-diag-dl" class="btn btn-primary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                <span>Descargar Informe Técnico (.txt)</span>
              </button>
              <button onclick="fetchStatus()" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">
            <input type="text" id="log-search-input" onkeyup="filterLogs()" placeholder="Buscar en el registro..." class="form-control" style="max-width: 240px; padding: 6px 12px; font-size: 12px;">
            <div style="display: flex; gap: 6px;">
              <button onclick="setLogLevelFilter('all')" class="btn btn-secondary btn-sm log-filter-btn active" data-filter="all">Todos</button>
              <button onclick="setLogLevelFilter('info')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="info">Info</button>
              <button onclick="setLogLevelFilter('success')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="success">Éxito</button>
              <button onclick="setLogLevelFilter('warn')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="warn">Avisos</button>
              <button onclick="setLogLevelFilter('error')" class="btn btn-secondary btn-sm log-filter-btn" data-filter="error">Errores</button>
            </div>
          </div>

          <div id="full-logs-panel" class="logs-panel">
            <div class="log-line log-info">Cargando registros...</div>
          </div>
        </div>
      </section>

      <!-- ================= TAB 7: LICENCIA Y EQUIPO ================= -->
      <section id="tab-license" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Licencia Bentian ERP Bridge</div>
              <div class="section-desc">Vinculación criptográfica única de este ordenador físico con tu suscripción.</div>
            </div>
            <span id="lic-status-badge" class="tag tag-green">Activa</span>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Plan Activo:</label>
              <input type="text" id="lic-plan-name" class="form-control" readonly value="Professional">
            </div>
            <div class="form-group">
              <label class="form-label">Período de Gracia Offline Restante:</label>
              <input type="text" id="lic-grace-period" class="form-control" readonly value="168 horas (7 días)">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Clave de Puesto Activa:</label>
            <div class="input-with-button">
              <input type="text" id="input-lic-key" class="form-control" style="font-family: monospace;" placeholder="EB-XXXXX-XXXXX-XXXXX-XXXXX">
              <button onclick="activateLicenseKey()" id="btn-activate-lic" class="btn btn-primary" style="white-space: nowrap;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                <span>Activar / Cambiar Clave</span>
              </button>
            </div>
            <div id="lic-activate-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>

          <div class="form-group" style="margin-top: 18px;">
            <label class="form-label">Identificador de Hardware Único (HWID):</label>
            <div class="input-with-button">
              <input type="text" id="lic-hwid-val" class="form-control" style="font-family: monospace;" readonly value="...">
              <button onclick="copyHwid()" class="btn btn-secondary">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <span>Copiar HWID</span>
              </button>
            </div>
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 4px;">Este identificador único protege tu licencia ante copias no autorizadas.</div>
          </div>

          <div style="margin-top: 24px; padding: 16px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 13px; font-weight: 600; color: #fff;">¿Necesitas más puestos o transferir esta clave a otro ordenador?</div>
              <div style="font-size: 12px; color: var(--text-muted);">Accede al panel Cloud para gestionar tus puestos, desvincular equipos o gestionar pagos.</div>
            </div>
            <a href="https://bridge.cristianjm.com/dashboard/" target="_blank" class="btn btn-secondary">
              Gestionar en Cloud ↗
            </a>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- ================= ONBOARDING WIZARD MODAL ================= -->
  <div id="modal-wizard" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" fill="none" stroke="#818cf8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>
          <span style="font-weight: 700; font-size: 15px; color: #fff;">Asistente de Configuración Rápida</span>
        </div>
        <button onclick="closeWizardModal()" class="btn btn-secondary btn-sm" style="padding: 4px 8px;">✕</button>
      </div>

      <div class="modal-body">
        <div class="wizard-steps-bar">
          <div id="w-step-1" class="wizard-step-item active">1. Licencia</div>
          <div id="w-step-2" class="wizard-step-item">2. Factusol</div>
          <div id="w-step-3" class="wizard-step-item">3. Tu Canal Web</div>
          <div id="w-step-4" class="wizard-step-item">4. ¡Listo!</div>
        </div>

        <!-- PASO 1: LICENCIA -->
        <div id="wizard-pane-1">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 1: Activa tu Licencia</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Introduce la clave de puesto que recibiste al suscribirte a Bentian ERP Bridge.</p>
          
          <div class="form-group">
            <label class="form-label">Clave de Licencia (EB-XXXXX):</label>
            <div class="input-with-button">
              <input type="text" id="wiz-input-lic" class="form-control" style="font-family: monospace; font-size: 14px;" placeholder="EB-XXXXX-XXXXX-XXXXX-XXXXX">
              <button onclick="wizPasteAndActivateLicense()" id="wiz-btn-activate" class="btn btn-primary">
                <span>📋 Pegar y Activar</span>
              </button>
            </div>
            <div id="wiz-lic-alert" style="margin-top: 10px; font-size: 12px; display: none;"></div>
          </div>
        </div>

        <!-- PASO 2: FACTUSOL -->
        <div id="wizard-pane-2" style="display: none;">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 2: Conecta tu Factusol</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Selecciona la base de datos de tu empresa. El conector la detectará automáticamente.</p>
          
          <div style="display: flex; gap: 10px; margin-bottom: 16px;">
            <button onclick="detectFactusol(true)" class="btn btn-primary" style="flex: 1;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>🔍 Buscar mi Factusol Automáticamente</span>
            </button>
            <button onclick="browseFactusol(true)" class="btn btn-secondary">
              <span>📁 Examinar PC</span>
            </button>
          </div>

          <div id="wiz-fact-detected-box" style="display: none; margin-bottom: 14px;">
            <div id="wiz-fact-detected-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Ruta seleccionada:</label>
            <input type="text" id="wiz-input-fact-path" onblur="handleFactusolInputBlur('wiz-input-fact-path')" class="form-control" placeholder="C:\\Factusol\\Datos\\2252025.accdb">
            <div id="wiz-fact-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
          </div>
        </div>

        <!-- PASO 3: CANAL WEB -->
        <div id="wizard-pane-3" style="display: none;">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">Paso 3: ¿Dónde vendes por Internet?</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Elige el conector que corresponde a tu tienda online.</p>

          <div class="channel-select-grid">
            <div id="wiz-choice-univ" class="channel-card selected" onclick="wizSelectChannel('universal_bridge')">
              <div class="channel-icon" style="color: #38bdf8;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 2px;">Conector Web Universal</div>
              <div style="font-size: 11px; color: var(--text-muted);">Para cualquier web (Angular, PHP, cPanel, Plesk, Nginx).</div>
            </div>

            <div id="wiz-choice-woo" class="channel-card" onclick="wizSelectChannel('woocommerce')">
              <div class="channel-icon" style="color: #a78bfa;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              </div>
              <div style="font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 2px;">WooCommerce</div>
              <div style="font-size: 11px; color: var(--text-muted);">Conexión con claves API oficial.</div>
            </div>
          </div>

          <div id="wiz-panel-univ">
            <div style="padding: 12px; background: rgba(99,102,241,0.08); border-radius: 8px; margin-bottom: 14px; font-size: 12px; color: var(--text-muted);">
              <strong>Paso rápido:</strong> 1. Descarga el archivo <code>erp-bridge-endpoint.php</code> ➡️ 2. Súbelo a la carpeta pública de tu web ➡️ 3. Pega tu web abajo.
              <div style="margin-top: 8px;">
                <button onclick="downloadUniversalCompanion()" class="btn btn-secondary btn-sm">⬇️ Descargar erp-bridge-endpoint.php</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Dirección de tu Tienda Web:</label>
              <div class="input-with-button">
                <input type="text" id="wiz-input-univ-url" onblur="sanitizeUrlInput('wiz-input-univ-url')" class="form-control" placeholder="https://mitienda.com">
                <button onclick="wizTestUniversal()" class="btn btn-secondary">Comprobar</button>
              </div>
              <div id="wiz-univ-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
            </div>
          </div>

          <div id="wiz-panel-woo" style="display: none;">
            <div class="form-group">
              <label class="form-label">URL de tu Tienda WooCommerce:</label>
              <input type="text" id="wiz-input-wc-url" onblur="sanitizeUrlInput('wiz-input-wc-url')" class="form-control" placeholder="https://mitienda.com">
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Consumer Key:</label>
                <input type="text" id="wiz-input-wc-key" class="form-control" placeholder="ck_...">
              </div>
              <div class="form-group">
                <label class="form-label">Consumer Secret:</label>
                <input type="password" id="wiz-input-wc-secret" class="form-control" placeholder="cs_...">
              </div>
            </div>
          </div>
        </div>

        <!-- PASO 4: ¡LISTO! -->
        <div id="wizard-pane-4" style="display: none;">
          <div style="text-align: center; padding: 20px 0;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--emerald);">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">¡Todo Listo para Sincronizar!</h2>
            <p style="font-size: 13px; color: var(--text-muted); max-width: 440px; margin: 0 auto 24px;">
              Tu equipo ha quedado configurado con éxito. El agente comenzará a vigilar Factusol y a procesar los pedidos de tu web de forma 100% autónoma.
            </p>
            <button onclick="finishWizardAndStart()" class="btn btn-primary btn-lg" style="width: 100%; max-width: 320px; box-shadow: 0 4px 20px var(--primary-glow);">
              <span>🚀 Comenzar a Trabajar</span>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button id="wiz-btn-prev" onclick="wizPrevStep()" class="btn btn-secondary" style="visibility: hidden;">
          ← Anterior
        </button>
        <button id="wiz-btn-next" onclick="wizNextStep()" class="btn btn-primary">
          Siguiente Paso →
        </button>
      </div>
    </div>
  </div>

  <!-- ================= TOAST NOTIFICATION ================= -->
  <div id="toast">
    <span id="toast-icon">✓</span>
    <span id="toast-text">Operación completada</span>
  </div>

  <!-- ================= SCRIPTS ================= -->
  <script>
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

    // Status Polling
    async function fetchStatus() {
      try {
        const res = await fetch('/api/local/status');
        if (!res.ok) return;
        currentStatus = await res.json();
        renderStatus(currentStatus);
      } catch (err) {
        console.warn('Servidor local:', err);
      }
    }

    function renderStatus(data) {
      if (!data) return;

      document.getElementById('brand-version').textContent = 'v' + (data.agentVersion || '0.1.4');
      document.getElementById('sidebar-hostname').textContent = (data.system && data.system.hostname) ? data.system.hostname : 'Local';
      document.getElementById('sidebar-hwid').textContent = data.hwid ? (data.hwid.substring(0, 12) + '...') : '---';

      // Factusol
      const fact = data.factusol || {};
      const fSettings = data.factusolSettings || {};
      const cardFBadge = document.getElementById('card-f-badge');
      const cardFMetric = document.getElementById('card-f-metric');
      const cardFPath = document.getElementById('card-f-path');
      const cardFWatcher = document.getElementById('card-f-watcher');

      if (fact.configured && fact.connected) {
        cardFBadge.className = 'tag tag-green';
        cardFBadge.textContent = 'Conectado';
        cardFMetric.textContent = (fact.articleCount !== undefined ? fact.articleCount.toLocaleString('es-ES') : '7.978') + ' arts.';
        cardFPath.textContent = fact.fileName || fact.databasePath;
        cardFWatcher.textContent = fact.watcherActive ? '● Vigilante activo' : '○ En pausa';
      } else if (fact.configured) {
        cardFBadge.className = 'tag tag-amber';
        cardFBadge.textContent = 'Sin Conexión';
        cardFMetric.textContent = 'Revisando';
        cardFPath.textContent = fact.databasePath || 'Sin ruta';
      } else {
        cardFBadge.className = 'tag tag-rose';
        cardFBadge.textContent = 'No Configurado';
        cardFMetric.textContent = 'Sin Base';
        cardFPath.textContent = 'Pulsa en Ajustar para seleccionar tu archivo';
      }

      const inputFactDb = document.getElementById('input-factusol-db');
      if (!inputFactDb.value && (fact.databasePath || fSettings.databasePath)) {
        inputFactDb.value = fact.databasePath || fSettings.databasePath || '';
      }
      if (fSettings.tariffCode) document.getElementById('select-factusol-tariff').value = fSettings.tariffCode;
      if (fSettings.orderSeries) document.getElementById('input-factusol-order-series').value = fSettings.orderSeries;
      if (fSettings.invoiceSeries) document.getElementById('input-factusol-inv-series').value = fSettings.invoiceSeries;

      // Canal Web
      const chType = data.channelType || 'universal_bridge';
      selectChannelType(chType);

      const univ = data.universalBridgeSettings || {};
      if (univ.storeUrl && !document.getElementById('input-universal-url').value) {
        document.getElementById('input-universal-url').value = univ.storeUrl;
      }
      if (univ.secretKey && !document.getElementById('input-universal-key').value) {
        document.getElementById('input-universal-key').value = univ.secretKey;
      }

      const wc = data.woocommerceSettings || {};
      if (wc.storeUrl && !document.getElementById('input-wc-url').value) {
        document.getElementById('input-wc-url').value = wc.storeUrl;
      }
      if (wc.consumerKey && !document.getElementById('input-wc-key').value) {
        document.getElementById('input-wc-key').value = wc.consumerKey;
      }
      if (wc.consumerSecret && !document.getElementById('input-wc-secret').value) {
        document.getElementById('input-wc-secret').value = wc.consumerSecret;
      }

      const cardWcMetric = document.getElementById('card-wc-metric');
      const cardWcUrl = document.getElementById('card-wc-url');
      if (chType === 'universal_bridge') {
        cardWcMetric.textContent = 'Conector Universal';
        cardWcUrl.textContent = univ.storeUrl || 'Sin configurar';
      } else {
        cardWcMetric.textContent = 'WooCommerce';
        cardWcUrl.textContent = wc.storeUrl || 'Sin configurar';
      }

      // Reglas de Sync
      const rules = data.syncRules || {};
      if (rules.enableFileWatcher !== undefined) document.getElementById('check-watcher-enabled').checked = rules.enableFileWatcher;
      if (rules.debounceSeconds) document.getElementById('input-debounce-sec').value = rules.debounceSeconds;
      if (rules.periodicIntervalMinutes) document.getElementById('select-periodic-min').value = rules.periodicIntervalMinutes;
      if (rules.syncStock !== undefined) document.getElementById('check-sync-stock').checked = rules.syncStock;
      if (rules.syncPrices !== undefined) document.getElementById('check-sync-prices').checked = rules.syncPrices;
      if (rules.syncDescriptions !== undefined) document.getElementById('check-sync-desc').checked = rules.syncDescriptions;
      if (rules.safetyStockBuffer !== undefined) document.getElementById('input-safety-stock').value = rules.safetyStockBuffer;
      if (rules.onlyStockAboveZero !== undefined) document.getElementById('check-only-stock-pos').checked = rules.onlyStockAboveZero;

      // Licencia
      const lic = data.license || {};
      const licBadge = document.getElementById('card-lic-badge');
      const licPlan = document.getElementById('card-lic-plan');
      const licKey = document.getElementById('card-lic-key');
      const fullLicStatusBadge = document.getElementById('lic-status-badge');

      if (lic.status === 'VALID' || lic.status === 'GRACE_PERIOD') {
        const isGood = lic.status === 'VALID';
        licBadge.className = isGood ? 'tag tag-green' : 'tag tag-amber';
        licBadge.textContent = isGood ? 'Activa' : 'Gracia Offline';
        fullLicStatusBadge.className = isGood ? 'tag tag-green' : 'tag tag-amber';
        fullLicStatusBadge.textContent = isGood ? 'Licencia Activa' : 'Período Gracia Offline';
        licPlan.textContent = (lic.plan || 'Professional').toUpperCase();
        document.getElementById('lic-plan-name').value = (lic.plan || 'Professional').toUpperCase();
      } else {
        licBadge.className = 'tag tag-rose';
        licBadge.textContent = 'Sin Licencia';
        fullLicStatusBadge.className = 'tag tag-rose';
        fullLicStatusBadge.textContent = 'No Activada';
      }

      if (data.licenseKey) {
        licKey.textContent = data.licenseKey;
        if (!document.getElementById('input-lic-key').value) {
          document.getElementById('input-lic-key').value = data.licenseKey;
        }
      }
      document.getElementById('lic-hwid-val').value = data.hwid || '';

      // Logs
      allLogs = data.recentEvents || [];
      renderLogs(allLogs);

      // Historial
      if (data.syncHistory) {
        renderHistoryTable(data.syncHistory);
      }
    }

    // Auto-resolución de carpeta Factusol
    async function handleFactusolInputBlur(inputId) {
      inputId = inputId || 'input-factusol-db';
      const el = document.getElementById(inputId);
      if (!el || !el.value.trim()) return;

      try {
        const res = await fetch('/api/local/resolve-factusol-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: el.value.trim() })
        });
        const data = await res.json();
        if (data.success && data.resolvedPath) {
          el.value = data.resolvedPath;
          if (data.isDirectory) {
            showToast(data.message, 'success');
          }
        }
      } catch (err) {}
    }

    // Pruebas y Guardado Factusol
    async function browseFactusol(isWizard) {
      try {
        const res = await fetch('/api/local/browse-factusol', { method: 'POST' });
        const data = await res.json();
        if (data.selectedPath) {
          const targetInput = isWizard ? document.getElementById('wiz-input-fact-path') : document.getElementById('input-factusol-db');
          targetInput.value = data.selectedPath;
          handleFactusolInputBlur(isWizard ? 'wiz-input-fact-path' : 'input-factusol-db');
          showToast('Base de datos seleccionada: ' + data.selectedPath);
          if (!isWizard) {
            await testFactusolConnection();
          }
        }
      } catch (err) {
        showToast('Error al abrir selector de Windows', 'error');
      }
    }

    async function detectFactusol(isWizard) {
      try {
        const res = await fetch('/api/local/detect-factusol', { method: 'POST' });
        const data = await res.json();
        const box = isWizard ? document.getElementById('wiz-fact-detected-box') : document.getElementById('factusol-detected-box');
        const list = isWizard ? document.getElementById('wiz-fact-detected-list') : document.getElementById('factusol-detected-list');

        if (data.instances && data.instances.length > 0) {
          box.style.display = 'block';
          list.innerHTML = data.instances.map(function(inst) {
            const safePath = inst.databasePath.replace(/\\\\/g, '\\\\\\\\');
            const label = inst.companyCode ? ('Empresa ' + inst.companyCode) : 'Factusol';
            return '<div onclick="selectFactusolInstance(\\'' + safePath + '\\', ' + isWizard + ')" style="background: #1e1e26; border: 1px solid var(--card-border); padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">' +
              '<div><strong>' + label + '</strong> <span style="color: var(--text-subtle); margin-left: 8px; font-family: monospace;">' + inst.databasePath + '</span></div>' +
              '<span class="tag tag-blue">Seleccionar</span>' +
            '</div>';
          }).join('');
          showToast('Se encontraron ' + data.instances.length + ' bases de datos Factusol');
        } else {
          showToast('No se encontraron bases de datos en las rutas estándar', 'warn');
        }
      } catch (err) {
        showToast('Error al escanear discos', 'error');
      }
    }

    function selectFactusolInstance(dbPath, isWizard) {
      const targetInput = isWizard ? document.getElementById('wiz-input-fact-path') : document.getElementById('input-factusol-db');
      targetInput.value = dbPath;
      if (isWizard) {
        document.getElementById('wiz-fact-detected-box').style.display = 'none';
        const alertBox = document.getElementById('wiz-fact-alert');
        alertBox.style.display = 'block';
        alertBox.style.color = '#34d399';
        alertBox.textContent = '✓ Base de datos seleccionada';
      } else {
        document.getElementById('factusol-detected-box').style.display = 'none';
        testFactusolConnection();
      }
    }

    async function testFactusolConnection() {
      const dbPath = document.getElementById('input-factusol-db').value.trim();
      const alertBox = document.getElementById('fact-test-alert');
      const btn = document.getElementById('btn-test-fact');
      if (!dbPath) {
        showToast('Selecciona la ruta de tu Factusol', 'warn');
        return;
      }
      btn.disabled = true;
      try {
        const res = await fetch('/api/local/test-factusol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ databasePath: dbPath })
        });
        const data = await res.json();
        alertBox.style.display = 'block';
        if (data.success) {
          alertBox.style.color = '#34d399';
          alertBox.textContent = '✓ ' + data.message;
          showToast('Conexión con Factusol exitosa');
          loadArticlePreview();
        } else {
          alertBox.style.color = '#f87171';
          alertBox.textContent = '✕ ' + data.message;
          showToast('Error conectando con Factusol', 'error');
        }
      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Error al comunicar con Factusol';
      } finally {
        btn.disabled = false;
      }
    }

    async function saveFactusolSettings() {
      const payload = {
        factusol: {
          databasePath: document.getElementById('input-factusol-db').value.trim(),
          tariffCode: document.getElementById('select-factusol-tariff').value,
          warehouseCode: document.getElementById('select-factusol-warehouse').value,
          orderSeries: document.getElementById('input-factusol-order-series').value.trim(),
          invoiceSeries: document.getElementById('input-factusol-inv-series').value.trim(),
        }
      };
      await submitConfigUpdates(payload, 'Ajustes de Factusol guardados con éxito.');
      loadArticlePreview();
    }

    // Pruebas y Guardado Canal Web
    async function testUniversalConnection() {
      sanitizeUrlInput('input-universal-url');
      const url = document.getElementById('input-universal-url').value.trim();
      const key = document.getElementById('input-universal-key').value.trim();
      const chkBox = document.getElementById('univ-checklist-box');
      const alertBox = document.getElementById('univ-test-alert');
      const btn = document.getElementById('btn-test-univ');

      if (!url) {
        showToast('Introduce la dirección de tu web', 'warn');
        return;
      }

      chkBox.style.display = 'block';
      const cServer = document.getElementById('chk-server');
      const cSsl = document.getElementById('chk-ssl');
      const cEnd = document.getElementById('chk-endpoint');
      const cDb = document.getElementById('chk-database');

      [cServer, cSsl, cEnd, cDb].forEach(function(el) { el.className = 'checklist-step'; });
      alertBox.textContent = 'Comprobando tu web en tiempo real...';
      alertBox.style.color = 'var(--text-muted)';
      btn.disabled = true;

      try {
        const res = await fetch('/api/local/test-universal-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl: url, secretKey: key })
        });
        const data = await res.json();
        const chks = data.checks || {};

        cServer.className = chks.serverOnline ? 'checklist-step ok' : 'checklist-step fail';
        cSsl.className = chks.sslValid ? 'checklist-step ok' : 'checklist-step fail';
        cEnd.className = chks.endpointFound ? 'checklist-step ok' : 'checklist-step fail';
        cDb.className = chks.databaseReady ? 'checklist-step ok' : 'checklist-step fail';

        alertBox.textContent = (data.success ? '✓ ' : '✕ ') + data.message;
        alertBox.style.color = data.success ? '#34d399' : '#f87171';
        showToast(data.message, data.success ? 'success' : 'warn');
      } catch (err) {
        alertBox.textContent = 'Error de comunicación local al probar conector';
        alertBox.style.color = '#f87171';
      } finally {
        btn.disabled = false;
      }
    }

    async function testWooCommerceConnection() {
      sanitizeUrlInput('input-wc-url');
      const storeUrl = document.getElementById('input-wc-url').value.trim();
      const consumerKey = document.getElementById('input-wc-key').value.trim();
      const consumerSecret = document.getElementById('input-wc-secret').value.trim();
      const alertBox = document.getElementById('wc-test-alert');
      const btn = document.getElementById('btn-test-wc');

      if (!storeUrl || !consumerKey || !consumerSecret) {
        showToast('Rellena la URL, Consumer Key y Consumer Secret', 'warn');
        return;
      }

      btn.disabled = true;
      try {
        const res = await fetch('/api/local/test-woocommerce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl, consumerKey, consumerSecret })
        });
        const data = await res.json();
        alertBox.style.display = 'block';
        alertBox.style.color = data.success ? '#34d399' : '#f87171';
        alertBox.textContent = (data.success ? '✓ ' : '✕ ') + data.message;
        showToast(data.message, data.success ? 'success' : 'error');
      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Error de comunicación al probar WooCommerce';
      } finally {
        btn.disabled = false;
      }
    }

    async function saveChannelSettings() {
      sanitizeUrlInput('input-universal-url');
      sanitizeUrlInput('input-wc-url');

      const payload = {
        channelType: currentChannelType,
        universalBridge: {
          storeUrl: document.getElementById('input-universal-url').value.trim(),
          secretKey: document.getElementById('input-universal-key').value.trim(),
          enabled: currentChannelType === 'universal_bridge'
        },
        woocommerce: {
          storeUrl: document.getElementById('input-wc-url').value.trim(),
          consumerKey: document.getElementById('input-wc-key').value.trim(),
          consumerSecret: document.getElementById('input-wc-secret').value.trim(),
        }
      };
      await submitConfigUpdates(payload, 'Ajustes del Canal Web guardados con éxito.');
    }

    async function saveSyncRules() {
      const payload = {
        syncRules: {
          enableFileWatcher: document.getElementById('check-watcher-enabled').checked,
          debounceSeconds: parseInt(document.getElementById('input-debounce-sec').value, 10) || 5,
          periodicIntervalMinutes: parseInt(document.getElementById('select-periodic-min').value, 10) || 15,
          syncStock: document.getElementById('check-sync-stock').checked,
          syncPrices: document.getElementById('check-sync-prices').checked,
          syncDescriptions: document.getElementById('check-sync-desc').checked,
          safetyStockBuffer: parseInt(document.getElementById('input-safety-stock').value, 10) || 0,
          onlyStockAboveZero: document.getElementById('check-only-stock-pos').checked,
        }
      };
      await submitConfigUpdates(payload, 'Reglas de automatización guardadas.');
    }

    async function activateLicenseKey() {
      const key = document.getElementById('input-lic-key').value.trim();
      const alertBox = document.getElementById('lic-activate-alert');
      const btn = document.getElementById('btn-activate-lic');
      if (!key) {
        showToast('Introduce una clave de puesto', 'warn');
        return;
      }
      btn.disabled = true;
      try {
        const res = await fetch('/api/local/activate-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key })
        });
        const data = await res.json();
        alertBox.style.display = 'block';
        if (data.success) {
          alertBox.style.color = '#34d399';
          alertBox.textContent = '✓ Licencia activada con éxito.';
          showToast('Licencia vinculada a este equipo con éxito');
          fetchStatus();
        } else {
          alertBox.style.color = '#f87171';
          alertBox.textContent = '✕ Error: ' + (data.error || 'No se pudo activar la clave');
          showToast('Error al activar clave', 'error');
        }
      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Error de red al activar licencia';
      } finally {
        btn.disabled = false;
      }
    }

    async function submitConfigUpdates(updates, successMsg) {
      try {
        const res = await fetch('/api/local/save-full-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (data.success) {
          showToast(successMsg);
          fetchStatus();
        } else {
          showToast('Error al guardar: ' + data.message, 'error');
        }
      } catch (err) {
        showToast('Error al guardar configuración', 'error');
      }
    }

    async function triggerManualSync() {
      const btnH = document.getElementById('btn-sync-header');
      const iconH = document.getElementById('sync-icon-header');
      if (btnH) btnH.disabled = true;
      if (iconH) iconH.classList.add('spin');
      showToast('Iniciando sincronización...');
      try {
        const res = await fetch('/api/local/sync-now', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchStatus();
          loadSyncHistory();
        } else {
          showToast('Aviso: ' + data.message, 'warn');
        }
      } catch (err) {
        showToast('Error en sincronización manual', 'error');
      } finally {
        if (btnH) btnH.disabled = false;
        if (iconH) iconH.classList.remove('spin');
      }
    }

    async function loadSyncHistory() {
      try {
        const res = await fetch('/api/local/history');
        if (!res.ok) return;
        const records = await res.json();
        renderHistoryTable(records);
      } catch (e) {}
    }

    function renderHistoryTable(records) {
      const tbody = document.getElementById('history-table-body');
      if (!tbody) return;
      if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Sin ejecuciones registradas todavía.</td></tr>';
        return;
      }
      tbody.innerHTML = records.map(function(r) {
        const statusClass = r.status === 'success' ? 'tag-green' : (r.status === 'warning' ? 'tag-amber' : 'tag-rose');
        return '<tr>' +
          '<td style="font-family: monospace;">' + r.timestamp + '</td>' +
          '<td><span class="tag tag-blue">' + (r.type || 'manual').toUpperCase() + '</span></td>' +
          '<td><span class="tag tag-amber">' + (r.mode || 'full').toUpperCase() + '</span></td>' +
          '<td><span class="tag ' + statusClass + '">' + (r.status || 'OK').toUpperCase() + '</span></td>' +
          '<td style="text-align: right; font-weight: 600;">' + (r.itemsUpdated || 0) + '</td>' +
          '<td style="text-align: right; font-weight: 600;">' + (r.ordersImported || 0) + '</td>' +
          '<td style="text-align: right; font-family: monospace;">' + r.durationSeconds + 's</td>' +
          '<td style="color: var(--text-muted);">' + r.message + '</td>' +
        '</tr>';
      }).join('');
    }

    function downloadDiagnostics() {
      window.open('/api/local/export-diagnostic', '_blank');
      showToast('Descargando archivo de diagnóstico...');
    }

    function copyHwid() {
      const val = document.getElementById('lic-hwid-val').value;
      if (val) {
        navigator.clipboard.writeText(val);
        showToast('HWID copiado al portapapeles');
      }
    }

    async function loadArticlePreview() {
      const tbody = document.getElementById('articles-table-body');
      try {
        const res = await fetch('/api/local/factusol/preview');
        const data = await res.json();
        allArticles = data.articles || [];
        renderArticlesTable(allArticles);
        document.getElementById('article-count-tag').textContent = allArticles.length + ' arts. mostrados';
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--rose); padding: 20px;">Error al consultar la base de datos Factusol.</td></tr>';
      }
    }

    function renderArticlesTable(articles) {
      const tbody = document.getElementById('articles-table-body');
      if (!articles || articles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron artículos en la base de datos.</td></tr>';
        return;
      }
      tbody.innerHTML = articles.map(function(a) {
        const stockColor = a.stock > 0 ? '#34d399' : '#f87171';
        return '<tr>' +
          '<td><span class="tag tag-blue">' + a.code + '</span></td>' +
          '<td style="font-weight: 500;">' + (a.description || 'Sin descripción') + '</td>' +
          '<td><span class="tag tag-amber">' + (a.family || 'GEN') + '</span></td>' +
          '<td style="text-align: right; font-weight: 700; color: ' + stockColor + '">' + a.stock + '</td>' +
          '<td style="text-align: right; font-family: monospace;">' + Number(a.costPrice).toFixed(2) + ' €</td>' +
          '<td style="color: var(--text-subtle); font-family: monospace;">' + (a.ean || '---') + '</td>' +
        '</tr>';
      }).join('');
    }

    function filterArticlesTable() {
      const q = (document.getElementById('filter-articles-input').value || '').toLowerCase();
      const filtered = allArticles.filter(function(a) {
        return a.code.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.ean && a.ean.toLowerCase().includes(q));
      });
      renderArticlesTable(filtered);
    }

    async function loadFactusolMetadata() {
      try {
        const res = await fetch('/api/local/factusol/metadata');
        if (!res.ok) return;
        const data = await res.json();
        if (data.tariffs && data.tariffs.length > 0) {
          const sel = document.getElementById('select-factusol-tariff');
          sel.innerHTML = data.tariffs.map(function(t) { return '<option value="' + t.code + '">' + t.name + '</option>'; }).join('');
        }
        if (data.warehouses && data.warehouses.length > 0) {
          const sel = document.getElementById('select-factusol-warehouse');
          sel.innerHTML = data.warehouses.map(function(w) { return '<option value="' + w.code + '">' + w.name + '</option>'; }).join('');
        }
      } catch (e) {}
    }

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

    // ================= ONBOARDING WIZARD MODAL LOGIC =================
    function openWizardModal() {
      document.getElementById('modal-wizard').classList.add('open');
      setWizardStep(1);
    }

    function closeWizardModal() {
      document.getElementById('modal-wizard').classList.remove('open');
    }

    function setWizardStep(step) {
      wizardCurrentStep = step;
      [1, 2, 3, 4].forEach(function(i) {
        const pane = document.getElementById('wizard-pane-' + i);
        const stepHeader = document.getElementById('w-step-' + i);
        if (pane) pane.style.display = (i === step) ? 'block' : 'none';
        if (stepHeader) {
          stepHeader.className = 'wizard-step-item' + (i === step ? ' active' : (i < step ? ' done' : ''));
        }
      });

      document.getElementById('wiz-btn-prev').style.visibility = (step === 1) ? 'hidden' : 'visible';
      const nextBtn = document.getElementById('wiz-btn-next');
      if (step === 4) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = 'Siguiente Paso →';
      }
    }

    function wizNextStep() {
      if (wizardCurrentStep < 4) {
        setWizardStep(wizardCurrentStep + 1);
      }
    }

    function wizPrevStep() {
      if (wizardCurrentStep > 1) {
        setWizardStep(wizardCurrentStep - 1);
      }
    }

    async function wizPasteAndActivateLicense() {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('EB-')) {
          document.getElementById('wiz-input-lic').value = text.trim();
        }
      } catch (e) {}

      const key = document.getElementById('wiz-input-lic').value.trim();
      const alertBox = document.getElementById('wiz-lic-alert');
      if (!key) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Introduce o pega tu clave de puesto';
        return;
      }

      alertBox.style.display = 'block';
      alertBox.style.color = 'var(--text-muted)';
      alertBox.textContent = 'Activando clave en la nube...';

      try {
        const res = await fetch('/api/local/activate-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key })
        });
        const data = await res.json();
        if (data.success) {
          alertBox.style.color = '#34d399';
          alertBox.textContent = '✓ Licencia activada con éxito. Pulsa en Siguiente Paso.';
          showToast('Licencia activada con éxito');
          fetchStatus();
        } else {
          alertBox.style.color = '#f87171';
          alertBox.textContent = '✕ Error: ' + (data.error || 'Clave no válida');
        }
      } catch (err) {
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Error de conexión con el servidor de licencias';
      }
    }

    function wizSelectChannel(type) {
      const cardUniv = document.getElementById('wiz-choice-univ');
      const cardWoo = document.getElementById('wiz-choice-woo');
      const panelUniv = document.getElementById('wiz-panel-univ');
      const panelWoo = document.getElementById('wiz-panel-woo');

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
      selectChannelType(type);
    }

    async function wizTestUniversal() {
      sanitizeUrlInput('wiz-input-univ-url');
      const url = document.getElementById('wiz-input-univ-url').value.trim();
      const alertBox = document.getElementById('wiz-univ-alert');
      if (!url) {
        alertBox.style.display = 'block';
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Introduce la dirección de tu web';
        return;
      }
      alertBox.style.display = 'block';
      alertBox.style.color = 'var(--text-muted)';
      alertBox.textContent = 'Comprobando conexión con tu web...';

      try {
        const res = await fetch('/api/local/test-universal-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl: url })
        });
        const data = await res.json();
        alertBox.style.color = data.success ? '#34d399' : '#f87171';
        alertBox.textContent = (data.success ? '✓ ' : '✕ ') + data.message;
      } catch (err) {
        alertBox.style.color = '#f87171';
        alertBox.textContent = 'Fallo al comprobar web';
      }
    }

    async function finishWizardAndStart() {
      // Guardar todo
      const payload = {
        licenseKey: document.getElementById('wiz-input-lic').value.trim() || undefined,
        channelType: currentChannelType,
        factusol: {
          databasePath: document.getElementById('wiz-input-fact-path').value.trim() || undefined,
        },
        universalBridge: {
          storeUrl: document.getElementById('wiz-input-univ-url').value.trim() || undefined,
          enabled: currentChannelType === 'universal_bridge'
        },
        woocommerce: {
          storeUrl: document.getElementById('wiz-input-wc-url').value.trim() || undefined,
          consumerKey: document.getElementById('wiz-input-wc-key').value.trim() || undefined,
          consumerSecret: document.getElementById('wiz-input-wc-secret').value.trim() || undefined,
        }
      };
      await submitConfigUpdates(payload, '¡Configuración completada con éxito!');
      closeWizardModal();
      switchTab('overview');
      triggerManualSync();
    }

    // Inicializar
    fetchStatus();
    setInterval(fetchStatus, 3000);
  </script>
</body>
</html>`;
}
