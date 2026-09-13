export const dashboardStyles = `
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
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 500; border-radius: 8px; border: none; cursor: pointer; transition: all 0.15s; padding: 8px 14px; text-decoration: none; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: rgba(255, 255, 255, 0.08); color: var(--text); border: 1px solid var(--card-border); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.13); }
    .btn-sm { padding: 5px 10px; font-size: 12px; }
    .btn-lg { padding: 12px 20px; font-size: 14px; font-weight: 600; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Tab Panes */
    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    /* Cards */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .card-title { font-size: 13px; font-weight: 500; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
    .card-metric { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
    .card-desc { font-size: 12px; color: var(--text-subtle); }
    .card-footer { border-top: 1px solid var(--card-border); padding-top: 12px; margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); }

    /* Zen Hero Card */
    .zen-hero { background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.08)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 14px; padding: 28px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; gap: 20px; }
    .zen-status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 12px; }
    .zen-title { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px; }
    .zen-sub { font-size: 13px; color: var(--text-muted); max-width: 600px; line-height: 1.5; }

    /* Forms */
    .form-section { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .section-title { font-size: 15px; font-weight: 600; color: #fff; }
    .section-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
    .form-control { background: var(--input-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #fff; outline: none; transition: border-color 0.15s; width: 100%; }
    .form-control:focus { border-color: var(--primary); }
    .form-control[readonly] { background: rgba(255,255,255,0.03); color: var(--text-muted); cursor: default; }
    .form-select { appearance: none; background-image: url('data:image/svg+xml;utf8,<svg fill="%23a1a1aa" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>'); background-repeat: no-repeat; background-position: right 10px center; padding-right: 32px; }
    .input-with-button { display: flex; gap: 8px; }

    .checkbox-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; cursor: pointer; user-select: none; }
    .checkbox-row input[type="checkbox"] { margin-top: 3px; accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }
    .checkbox-label { font-size: 13px; font-weight: 500; color: #fff; }
    .checkbox-desc { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

    /* Tables */
    .table-container { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
    .table-toolbar { padding: 14px 18px; border-bottom: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
    .data-table th { background: rgba(255, 255, 255, 0.02); color: var(--text-muted); font-weight: 600; padding: 10px 16px; border-bottom: 1px solid var(--card-border); }
    .data-table td { padding: 10px 16px; border-bottom: 1px solid var(--card-border); color: var(--text); vertical-align: middle; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }

    /* Tags */
    .tag { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .tag-green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .tag-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .tag-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .tag-rose { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    /* Logs Panel */
    .logs-panel { background: #0c0c10; border: 1px solid var(--card-border); border-radius: 8px; padding: 12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; height: 360px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
    .log-line { display: flex; gap: 10px; line-height: 1.5; word-break: break-all; }
    .log-time { color: var(--text-subtle); flex-shrink: 0; }
    .log-info { color: #a1a1aa; }
    .log-success { color: #34d399; }
    .log-warn { color: #fbbf24; }
    .log-error { color: #f87171; }

    /* Checklist Box */
    .checklist-container { background: #0d0d12; border: 1px solid var(--card-border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .checklist-step { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-muted); }
    .checklist-circle { width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--card-border); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--text-subtle); }
    .checklist-step.ok { color: #34d399; }
    .checklist-step.ok .checklist-circle { background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #10b981; }
    .checklist-step.fail { color: #f87171; }
    .checklist-step.fail .checklist-circle { background: rgba(239, 68, 68, 0.15); border-color: #ef4444; color: #ef4444; }

    /* Modal */
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
`;
