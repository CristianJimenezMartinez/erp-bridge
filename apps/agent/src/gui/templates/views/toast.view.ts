export function renderToast(): string {
  return `  <!-- ================= TOAST NOTIFICATION ================= -->
  <div id="toast" role="alert" aria-live="assertive">
    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
      <span id="toast-icon" style="font-size: 16px; flex-shrink: 0;">✓</span>
      <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
        <div id="toast-title" style="display: none; font-weight: 600; font-size: 13px; color: #fff; line-height: 1.3;"></div>
        <div id="toast-text" style="font-size: 12px; color: #e4e4e7; line-height: 1.4; word-break: break-word;">Operación completada</div>
      </div>
    </div>
    <button id="toast-action" type="button" class="toast-action-btn" style="display: none;" onclick="handleToastAction()">
      <span id="toast-action-text">Resolver →</span>
    </button>
    <button id="toast-close" type="button" class="toast-close-btn" onclick="hideToast()" title="Cerrar notificación">✕</button>
  </div>`;
}

