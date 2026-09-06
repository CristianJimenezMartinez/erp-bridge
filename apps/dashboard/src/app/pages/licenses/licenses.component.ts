import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-licenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.75rem; max-width: 1100px; margin: 0 auto;">
      
      <!-- Cabecera -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <div>
          <h1 style="font-size: 1.375rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.01em;">Licencia & Facturación</h1>
          <p style="color: #71717a; font-size: 0.8125rem; margin-top: 0.25rem;">
            Controla tu plan de suscripción, la clave de activación y los servidores Windows vinculados.
          </p>
        </div>
        
        <a 
          href="https://billing.stripe.com" 
          target="_blank"
          class="btn-stripe"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697.5 12.52.5 7.02.5 3.19 3.42 3.19 8.243c0 5.184 4.502 6.545 7.643 7.697 2.457.9 3.284 1.571 3.284 2.537 0 .976-.881 1.487-2.32 1.487-2.122 0-5.006-.994-6.862-2.1l-.888 5.637C5.932 24.385 8.97 25 12.164 25c5.789 0 9.778-2.83 9.778-7.795 0-5.114-4.22-6.526-7.966-8.055z"/></svg>
          <span>Portal de Facturación Stripe</span>
        </a>
      </div>

      <!-- Resumen del Plan Actual y Cupo -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem;">
        
        <!-- Tarjeta de Plan -->
        <div class="card-box" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; color: #818cf8; letter-spacing: 0.04em;">Suscripción Activa</span>
              <span class="status-pill">Stripe Recurrente</span>
            </div>
            
            <div style="font-size: 1.5rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.02em;">
              Plan Profesional (1 Empresa)
            </div>
            <div style="font-size: 0.8125rem; color: #a1a1aa; margin-top: 0.35rem;">
              <span style="color: #f4f4f5; font-weight: 600;">29,00 €</span> facturados mensualmente. Sincronización continua de catálogo, stock, pedidos y facturas.
            </div>
          </div>

          <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; font-size: 0.75rem;">
            <div>
              <span style="color: #71717a;">Próxima renovación:</span>
              <span style="color: #f4f4f5; font-weight: 500; margin-left: 0.35rem;">04 de Octubre de 2026</span>
            </div>
            <div>
              <span style="color: #71717a;">Método:</span>
              <span style="color: #f4f4f5; font-family: monospace; margin-left: 0.35rem;">Visa •••• 4242</span>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Cupo de Servidores -->
        <div class="card-box" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; color: #71717a; letter-spacing: 0.04em;">Uso de Licencia</span>
            <div style="font-size: 1.75rem; font-weight: 700; color: #f4f4f5; margin-top: 0.5rem; font-family: monospace;">
              1 <span style="font-size: 1rem; color: #71717a; font-weight: 400;">/ 1 Servidor</span>
            </div>
            <div style="margin-top: 0.75rem;">
              <!-- Progress Bar -->
              <div style="height: 6px; width: 100%; background: #27272a; border-radius: 9999px; overflow: hidden;">
                <div style="height: 100%; width: 100%; background: #4f46e5; border-radius: 9999px;"></div>
              </div>
            </div>
          </div>
          
          <div style="font-size: 0.75rem; color: #71717a; margin-top: 1rem;">
            Puestos ocupados: 100%. Para conectar más servidores o tiendas, amplía tu plan.
          </div>
        </div>

      </div>

      <!-- Clave de Activación del Cliente -->
      <div class="card-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div>
            <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5;">Clave de Activación del Agente</div>
            <div style="font-size: 0.75rem; color: #71717a; margin-top: 0.15rem;">Introduce esta clave durante la instalación del Agente Windows en el PC con Factusol.</div>
          </div>
          <span style="font-size: 0.6875rem; color: #34d399; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.25); padding: 0.15rem 0.5rem; border-radius: 9999px;">
            Vinculada
          </span>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input 
            type="text" 
            readonly 
            [value]="licenseKey" 
            class="key-input font-mono"
          />
          <button (click)="copyKey()" class="btn-copy">
            {{ copied ? '¡Copiada!' : 'Copiar Clave' }}
          </button>
        </div>
      </div>

      <!-- Dispositivos Autorizados (Hardware Fingerprint HWID) -->
      <div class="card-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5;">Servidores Windows Autorizados (HWID)</div>
            <div style="font-size: 0.75rem; color: #71717a; margin-top: 0.15rem;">Equipos que ejecutan BentianAgent.exe protegidos con huella de hardware única.</div>
          </div>
          <span style="font-size: 0.75rem; color: #a1a1aa; font-family: monospace;">1 de 1 Activo</span>
        </div>

        <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: 6px; background: rgba(79, 70, 229, 0.12); display: flex; align-items: center; justify-content: center; color: #818cf8;">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5;">Telkkalas-PC (Servidor Principal)</div>
                <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">Windows 11 Pro 64-bit • BentianAgent v0.1.0</div>
              </div>
            </div>

            <span style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.6875rem; font-weight: 600; color: #34d399; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.2); padding: 0.15rem 0.5rem; border-radius: 9999px;">
              <span style="width: 5px; height: 5px; border-radius: 50%; background: #34d399;"></span>
              Conexión Válida
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.04); font-size: 0.75rem;">
            <div>
              <div style="color: #71717a;">Hardware ID (HWID):</div>
              <div style="font-family: monospace; color: #cbd5e1; font-size: 0.6875rem; margin-top: 0.15rem;">5c1fe08e37482c37...</div>
            </div>
            <div>
              <div style="color: #71717a;">Período de Gracia Offline:</div>
              <div style="color: #cbd5e1; margin-top: 0.15rem;">7 días garantizados</div>
            </div>
            <div>
              <div style="color: #71717a;">Última Validación:</div>
              <div style="color: #cbd5e1; margin-top: 0.15rem;">Hace 2 minutos</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Historial de Facturas Emitidas -->
      <div class="card-box">
        <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-bottom: 0.75rem;">
          Historial de Recibos y Facturas
        </div>

        <div style="border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; overflow: hidden; font-size: 0.75rem;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead style="background: #18181b; color: #71717a; font-size: 0.6875rem; text-transform: uppercase;">
              <tr>
                <th style="padding: 0.625rem 0.875rem;">Fecha</th>
                <th style="padding: 0.625rem 0.875rem;">Concepto</th>
                <th style="padding: 0.625rem 0.875rem;">Importe</th>
                <th style="padding: 0.625rem 0.875rem;">Estado</th>
                <th style="padding: 0.625rem 0.875rem; text-align: right;">Recibo</th>
              </tr>
            </thead>
            <tbody style="divide-y divide-white/[0.04] text-zinc-300">
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.625rem 0.875rem; color: #a1a1aa;">04/09/2026</td>
                <td style="padding: 0.625rem 0.875rem; font-weight: 500; color: #f4f4f5;">Suscripción Plan Profesional — Mensual</td>
                <td style="padding: 0.625rem 0.875rem; font-family: monospace;">29,00 €</td>
                <td style="padding: 0.625rem 0.875rem;"><span style="color: #34d399;">Pagada</span></td>
                <td style="padding: 0.625rem 0.875rem; text-align: right;"><span style="color: #818cf8; cursor: pointer;">Descargar PDF</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .card-box {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px;
      padding: 1.25rem;
    }
    .status-pill {
      font-size: 0.6875rem;
      font-weight: 600;
      color: #34d399;
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.25);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
    }
    .btn-stripe {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #635bff;
      color: white;
      text-decoration: none;
      padding: 0.45rem 0.875rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(99, 91, 255, 0.3);
      transition: background 0.12s;
    }
    .btn-stripe:hover {
      background: #5247e6;
    }
    .key-input {
      flex: 1;
      background: #0e0e11;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      color: #818cf8;
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .btn-copy {
      background: #1e1e24;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f4f4f5;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.12s;
      white-space: nowrap;
    }
    .btn-copy:hover {
      background: #272730;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .font-mono {
      font-family: monospace;
    }
  `]
})
export class LicensesComponent implements OnInit {
  licenseKey = 'EB-6JDYR-X5SNS-CY9HS-YSDZB';
  copied = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {}

  copyKey(): void {
    navigator.clipboard.writeText(this.licenseKey);
    this.copied = true;
    setTimeout(() => (this.copied = false), 2500);
  }
}
