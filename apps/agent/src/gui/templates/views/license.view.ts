export function renderLicenseTab(): string {
  return `      <!-- ================= TAB 7: LICENCIA Y EQUIPO ================= -->
      <section id="tab-license" class="tab-pane">
        <div class="form-section">
          <div class="section-header">
            <div>
              <div class="section-title">Licencia Bentian ERP Bridge</div>
              <div class="section-desc">Vinculación criptográfica única de este ordenador físico con tu suscripción.</div>
            </div>
            <span id="lic-status-badge" class="tag tag-green">Activa</span>
          </div>

          <div id="lic-expired-banner" style="display:none;margin-bottom:18px;padding:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-weight:600;font-size:14px;color:#fff;display:flex;align-items:center;gap:6px;">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span>Periodo de Beta Pública Finalizado</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Tu periodo de evaluación de 60 días ha concluido. La sincronización se ha detenido de forma segura. Tus rutas y credenciales siguen guardadas intactas en este equipo.</div>
                <div style="font-size:11px;color:#e4e4e7;margin-top:4px;display:inline-flex;align-items:center;gap:5px;">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span>Tarifa Fundador con -30% vitalicio (139 €/año) limitada estrictamente a las primeras 25 plazas. Agotadas las 25 plazas, regirá la tarifa oficial de 199 €/año.</span>
                </div>
              </div>
              <button onclick="openCloudUpgrade(event)" class="btn btn-primary" style="background:#27272a;border:1px solid rgba(255,255,255,0.18);color:#fff;white-space:nowrap;">
                Activar Plan Fundador (139 €/año - Solo 25 plazas) ↗
              </button>
            </div>
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
            <label class="form-label">Clave de Activación del Conector:</label>
            <div class="input-with-button">
              <input type="text" id="input-lic-key" class="form-control" style="font-family: monospace;" placeholder="EB-XXXXX-XXXXX-XXXXX-XXXXX">
              <button onclick="activateLicenseKey()" id="btn-activate-lic" class="btn btn-primary" style="white-space: nowrap;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                <span>Activar / Cambiar Clave</span>
              </button>
            </div>
            <div id="lic-activate-alert" style="margin-top: 8px; font-size: 12px; display: none;"></div>
            <div style="margin-top: 6px; font-size: 11px; color: var(--text-subtle);">
              ¿Aún no tienes tu clave? <a href="https://bridge.cristianjm.com/beta/" target="_blank" style="color: #818cf8; text-decoration: underline;">Consigue tu clave de activación de la Beta (60 días gratis) ↗</a>
            </div>
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
              <div style="font-size: 13px; font-weight: 600; color: #fff;">¿Necesitas transferir tu licencia a otro ordenador o gestionar tu suscripción?</div>
              <div style="font-size: 12px; color: var(--text-muted);">Accede al panel Cloud para consultar tus facturas de Stripe o liberar este equipo para mudarlo.</div>
            </div>
            <button onclick="openCloudDashboard(event)" class="btn btn-secondary">
              Gestionar en Cloud ↗
            </button>
          </div>
        </div>
      </section>`;
}
