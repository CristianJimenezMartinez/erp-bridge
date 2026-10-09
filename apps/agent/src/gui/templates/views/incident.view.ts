export function renderIncidentModal(): string {
  return `  <!-- ================= REPORT INCIDENT MODAL ================= -->
  <div id="modal-incident" class="modal-overlay">
    <div class="modal-card" style="max-width: 620px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center;">
            <svg width="15" height="15" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 15px; color: #fff;">Reportar Incidencia o Consulta Técnica</div>
            <div style="font-size: 11px; color: var(--text-muted, #94a3b8);">Soporte Directo Asistido Bentian</div>
          </div>
        </div>
        <button onclick="closeIncidentModal()" class="btn btn-secondary btn-sm" style="padding: 0; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px;" title="Cerrar ventana">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="modal-body" style="padding: 1.25rem 1.5rem;">
        <!-- Formulario principal de la incidencia -->
        <div id="incident-form-container">
          <div style="padding: 10px 14px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; margin-bottom: 16px; font-size: 12px; color: #c7d2fe; line-height: 1.5;">
            Envía tu incidencia o consulta directamente al equipo de soporte. Si lo autorizas, se adjuntará el diagnóstico del sistema para que podamos identificar y resolver la causa de inmediato.
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="display: flex; justify-content: space-between;">
              <span>Email o Teléfono de Contacto: <span style="color: #ef4444;">*</span></span>
              <span style="font-size: 11px; color: var(--text-muted, #94a3b8); font-weight: normal;">Para responderte</span>
            </label>
            <input type="text" id="inc-input-contact" class="form-control" placeholder="tu-email@empresa.com o 600 00 00 00" style="font-size: 13px;">
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Área o Tipo de Incidencia: <span style="color: #ef4444;">*</span></label>
            <select id="inc-select-category" class="form-control" style="font-size: 13px;">
              <option value="factusol">Factusol ERP (desconexión, tablas bloqueadas .lck, ruta)</option>
              <option value="channel">Tienda Online / Web (error de conexión, WAF, timeout)</option>
              <option value="stock">Sincronización de Stock / Catálogo (no actualiza o descuadre)</option>
              <option value="orders">Descarga de Pedidos (pedidos no bajan a Factusol)</option>
              <option value="license">Licencia o Activación del Puesto</option>
              <option value="performance">Rendimiento, Consumo de RAM o Lentitud</option>
              <option value="other">Otra consulta técnica / Duda general</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">Descripción de lo ocurrido: <span style="color: #ef4444;">*</span></label>
            <textarea id="inc-input-desc" class="form-control" rows="4" placeholder="Explica brevemente qué ha fallado, qué mensaje has visto o desde cuándo ocurre..." style="font-size: 13px; resize: vertical; line-height: 1.4;"></textarea>
          </div>

          <!-- Casilla de telemetría técnica automática -->
          <div style="padding: 12px 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin-bottom: 16px;">
            <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 12px; color: #e2e8f0; margin: 0;">
              <input type="checkbox" id="inc-check-diag" checked style="margin-top: 3px; accent-color: #6366f1;">
              <div>
                <strong style="color: #f1f5f9;">Adjuntar informe técnico de diagnóstico automáticamente (Recomendado)</strong>
                <div style="font-size: 11px; color: var(--text-muted, #94a3b8); margin-top: 3px; line-height: 1.4;">
                  Incluye versión activa, HWID, latencias de red, estado de tablas Factusol y los últimos eventos registrados en el log (sanitizados y sin contraseñas).
                </div>
              </div>
            </label>
          </div>

          <!-- Caja de alerta / errores del formulario -->
          <div id="inc-alert-box" style="display: none; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 12px; line-height: 1.4;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" onclick="closeIncidentModal()" class="btn btn-secondary">Cancelar</button>
            <button type="button" onclick="submitIncidentReport()" id="btn-inc-submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #ef4444, #dc2626); border-color: #ef4444;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              <span id="btn-inc-submit-text">Enviar Incidencia a Soporte</span>
            </button>
          </div>
        </div>

        <!-- Pantalla de confirmación y éxito (oculta por defecto) -->
        <div id="incident-success-container" style="display: none; text-align: center; padding: 1.5rem 0.5rem;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
            <svg width="26" height="26" fill="none" stroke="#10b981" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px;">¡Incidencia Registrada con Éxito!</h3>
          <div style="display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: 700; color: #a5b4fc; margin-bottom: 14px;">
            Referencia: <span id="inc-success-ticket-id">#INC-XXXX</span>
          </div>
          <p style="font-size: 13px; color: var(--text-muted, #94a3b8); max-width: 440px; margin: 0 auto 20px; line-height: 1.5;" id="inc-success-msg">
            Hemos recibido tu solicitud junto con el diagnóstico del equipo. El equipo de soporte técnico la revisará y te contactará a la mayor brevedad.
          </p>
          <div style="display: flex; justify-content: center; gap: 10px;">
            <button type="button" onclick="closeIncidentModal()" class="btn btn-primary" style="padding: 7px 24px;">Entendido</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
