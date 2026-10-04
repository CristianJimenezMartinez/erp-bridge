export function renderToast(): string {
  return `  <!-- ================= TOAST NOTIFICATION ================= -->
  <div id="toast" role="alert" aria-live="assertive">
    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
      <span id="toast-icon" style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; color: #a1a1aa;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </span>
      <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
        <div id="toast-title" style="display: none; font-weight: 600; font-size: 13px; color: #fff; line-height: 1.3;"></div>
        <div id="toast-text" style="font-size: 12px; color: #e4e4e7; line-height: 1.4; word-break: break-word;">Operación completada</div>
      </div>
    </div>
    <button id="toast-action" type="button" class="toast-action-btn" style="display: none;" onclick="handleToastAction()">
      <span id="toast-action-text">Resolver →</span>
    </button>
    <button id="toast-close" type="button" class="toast-close-btn" onclick="hideToast()" title="Cerrar notificación">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  </div>`;
}

