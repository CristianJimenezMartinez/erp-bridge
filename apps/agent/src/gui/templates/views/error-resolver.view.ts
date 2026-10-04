export function renderErrorResolverModal(): string {
  return `  <!-- ================= HUMAN ERROR RESOLVER MODAL ================= -->
  <div id="modal-error-resolver" class="modal-overlay">
    <div class="modal-card" style="max-width: 620px;">
      <div class="modal-header" style="border-bottom: 1px solid var(--card-border); background: #17171d;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); display: flex; align-items: center; justify-content: center; color: #e4e4e7; border: 1px solid rgba(255, 255, 255, 0.1);">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #fff;">Asistente de Solución de Incidencias</div>
            <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 2px;">
              <span>Código:</span>
              <span id="modal-err-code" class="tag" style="font-size: 9px; padding: 1px 6px; background: rgba(255, 255, 255, 0.08); color: #e4e4e7; border: 1px solid rgba(255, 255, 255, 0.12);">ERR_INTERNAL</span>
            </div>
          </div>
        </div>
        <button onclick="closeErrorResolverModal()" class="btn btn-secondary btn-sm" style="padding: 0; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px;" title="Cerrar ventana">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="modal-body" style="padding: 22px;">
        <h3 id="modal-err-title" style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px; line-height: 1.4;">
          Incidencia detectada
        </h3>

        <!-- Explicación Humana -->
        <div style="margin-bottom: 18px;">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-subtle); letter-spacing: 0.5px; margin-bottom: 4px;">¿Qué ha ocurrido?</div>
          <div id="modal-err-msg" style="font-size: 13px; color: var(--text); line-height: 1.5; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); padding: 12px 14px; border-radius: 8px;">
            Mensaje explicativo del problema en lenguaje cotidiano.
          </div>
        </div>

        <!-- Sugerencia Práctica -->
        <div style="margin-bottom: 18px;">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 4px; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>¿Cómo solucionarlo paso a paso?</span>
          </div>
          <div id="modal-err-suggestion" style="font-size: 12.5px; color: #e4e4e7; line-height: 1.5; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 14px; border-radius: 8px; white-space: pre-line;">
            Instrucciones claras y directas para resolver el error sin conocimientos técnicos.
          </div>
        </div>

        <!-- Snippet Opcional -->
        <div id="modal-err-snippet-box" style="display: none; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; color: var(--text-subtle); font-weight: 600;">Código a copiar en tu servidor:</span>
            <button type="button" onclick="copySnippetText()" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Copiar código</span>
            </button>
          </div>
          <pre id="modal-err-snippet-code" style="background: #09090b; border: 1px solid var(--card-border); border-radius: 6px; padding: 10px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: #a5b4fc; overflow-x: auto; white-space: pre;"></pre>
        </div>
      </div>

      <div class="modal-footer" style="padding: 14px 22px;">
        <div>
          <a id="modal-err-help-btn" href="#" target="_blank" class="btn btn-secondary btn-sm" style="display: none; text-decoration: none;">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
            <span>Ver guía en la web ↗</span>
          </a>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" onclick="closeErrorResolverModal()" class="btn btn-secondary">
            Cerrar
          </button>
          <button type="button" id="modal-err-action-btn" class="btn btn-primary" style="background: linear-gradient(135deg, #6366f1, #4f46e5); box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35); display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            <span id="modal-err-action-text">Ir a solucionarlo →</span>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}
