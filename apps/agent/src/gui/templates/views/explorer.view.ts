export function renderExplorerModal(): string {
  return `  <!-- ================= FACTUSOL FILE EXPLORER MODAL ================= -->
  <div id="modal-fs-explorer" class="modal-overlay">
    <div class="modal-card" style="max-width: 760px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" fill="none" stroke="#60a5fa" viewBox="0 0 24 24"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>
          <span style="font-weight: 700; font-size: 15px; color: #fff;">Explorador de Base de Datos Factusol</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button onclick="openNativeWindowsDialog()" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #1d4ed8, #2563eb); font-weight: 600; padding: 5px 12px; font-size: 12px; border: 1px solid #3b82f6;" title="Abre el explorador de Windows estándar para buscar en la Red o NAS">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/></svg>
            <span>📂 Ventana de Windows (Red / NAS)</span>
          </button>
          <button onclick="closeExplorerModal()" class="btn btn-secondary btn-sm" style="padding: 4px 8px;">✕</button>
        </div>
      </div>

      <div class="modal-body" style="padding: 16px;">
        <!-- Accesos rápidos a unidades y carpetas -->
        <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 12px; color: var(--text-subtle); margin-right: 4px;">Unidades / Atajos:</span>
          <div id="explorer-drives-list" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
        </div>

        <!-- Barra de navegación con botón subir nivel -->
        <div style="display: flex; gap: 8px; margin-bottom: 14px;">
          <button onclick="explorerGoUp()" id="btn-explorer-up" class="btn btn-secondary btn-sm" title="Subir a la carpeta superior">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            <span>Subir</span>
          </button>
          <input type="text" id="explorer-current-path-input" onkeydown="if(event.key==='Enter') explorerNavigateTo(this.value)" class="form-control" style="font-family: monospace; font-size: 12px; padding: 6px 10px;" placeholder="C:\\Software DELSOL\\Factusol\\Datos\\FS">
          <button onclick="explorerNavigateTo(document.getElementById('explorer-current-path-input').value)" class="btn btn-secondary btn-sm">
            <span>Ir</span>
          </button>
        </div>

        <!-- Lista de carpetas y archivos -->
        <div id="explorer-file-list" style="background: #0d0d12; border: 1px solid var(--card-border); border-radius: 8px; height: 320px; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px;">
          <div style="text-align: center; color: var(--text-muted); padding: 30px;">Cargando explorador...</div>
        </div>
      </div>

      <div class="modal-footer">
        <span style="font-size: 11px; color: var(--text-subtle);">Haz clic en una carpeta para abrirla, o pulsa en <strong>Seleccionar</strong> sobre tu archivo .accdb</span>
        <button onclick="closeExplorerModal()" class="btn btn-secondary btn-sm">Cancelar</button>
      </div>
    </div>
  </div>`;
}
