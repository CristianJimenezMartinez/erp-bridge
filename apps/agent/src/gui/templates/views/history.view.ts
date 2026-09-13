export function renderHistoryTab(): string {
  return `      <!-- ================= TAB 5: HISTORIAL ================= -->
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
      </section>`;
}
