export function renderErrorResolverModal(): string {
  return `  <!-- ================= HUMAN ERROR RESOLVER MODAL ================= -->
  <div id="modal-error-resolver" class="modal-overlay">
    <div class="modal-card" style="max-width: 620px;">
      <div class="modal-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.25); background: linear-gradient(180deg, rgba(239, 68, 68, 0.08), rgba(20, 20, 24, 0.95));">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #fff;">Asistente de Solución de Incidencias</div>
            <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 2px;">
              <span>Código:</span>
              <span id="modal-err-code" class="tag tag-rose" style="font-size: 9px; padding: 1px 6px;">ERR_INTERNAL</span>
            </div>
          </div>
        </div>
        <button onclick="closeErrorResolverModal()" class="btn btn-secondary btn-sm" style="padding: 4px 8px;" title="Cerrar ventana">✕</button>
      </div>

      <div class="modal-body" style="padding: 22px;">
        <h3 id="modal-err-title" style="font-size: 16px; font-weight: 700; color: #f87171; margin-bottom: 12px; line-height: 1.4;">
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
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #fbbf24; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>💡 ¿Cómo solucionarlo paso a paso?</span>
          </div>
          <div id="modal-err-suggestion" style="font-size: 12.5px; color: #fef08a; line-height: 1.5; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 8px; white-space: pre-line;">
            Instrucciones claras y directas para resolver el error sin conocimientos técnicos.
          </div>
        </div>

        <!-- Snippet Opcional -->
        <div id="modal-err-snippet-box" style="display: none; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; color: var(--text-subtle); font-weight: 600;">Código a copiar en tu servidor:</span>
            <button type="button" onclick="copySnippetText()" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 3px 8px;">
              📋 Copiar código
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
          <button type="button" id="modal-err-action-btn" class="btn btn-primary" style="background: linear-gradient(135deg, #6366f1, #4f46e5); box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            <span id="modal-err-action-text">Ir a solucionarlo ➔</span>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}
