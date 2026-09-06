import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.75rem; max-width: 1100px; margin: 0 auto;">
      
      <!-- Cabecera -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <div>
          <h1 style="font-size: 1.375rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.01em;">Monitor de Sincronización Continua</h1>
          <p style="color: #71717a; font-size: 0.8125rem; margin-top: 0.25rem;">
            El sistema opera de forma 100% desatendida. No necesitas pulsar ningún botón: el Agente sincroniza en tiempo real.
          </p>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #34d399; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.2); padding: 0.35rem 0.75rem; border-radius: 9999px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span>
          Motor Autónomo Activo
        </div>
      </div>

      <!-- Banner de Estado Global -->
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(79, 70, 229, 0.04) 100%); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 10px; padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(52, 211, 153, 0.15); display: flex; align-items: center; justify-content: center; color: #34d399;">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div>
            <div style="font-size: 1rem; font-weight: 600; color: #f4f4f5;">
              Factusol y WooCommerce están 100% sincronizados
            </div>
            <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.2rem;">
              Última verificación del archivo <span style="color: #f4f4f5; font-family: monospace;">2252025.accdb</span>: hace 14 segundos. Cero colisiones de bloqueo.
            </div>
          </div>
        </div>

        <span style="font-size: 0.75rem; color: #34d399; font-weight: 600; font-family: monospace;">
          DISPONIBILIDAD 99.99%
        </span>
      </div>

      <!-- 4 Métricas Clave del Pipeline -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem;">
        
        <div class="stat-tile">
          <div style="color: #71717a; font-size: 0.75rem; font-weight: 500;">CATÁLOGO DE PRODUCTOS</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: #f4f4f5; margin-top: 0.35rem; font-family: monospace;">7.978</div>
          <div style="font-size: 0.6875rem; color: #34d399; margin-top: 0.25rem;">Tarifa 1 vinculada • Al día</div>
        </div>

        <div class="stat-tile">
          <div style="color: #71717a; font-size: 0.75rem; font-weight: 500;">STOCK EN TIEMPO REAL</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: #f4f4f5; margin-top: 0.35rem; font-family: monospace;">En Vivo</div>
          <div style="font-size: 0.6875rem; color: #34d399; margin-top: 0.25rem;">File Watcher reactivo activo</div>
        </div>

        <div class="stat-tile">
          <div style="color: #71717a; font-size: 0.75rem; font-weight: 500;">PEDIDOS PROCESADOS HOY</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: #f4f4f5; margin-top: 0.35rem; font-family: monospace;">18</div>
          <div style="font-size: 0.6875rem; color: #34d399; margin-top: 0.25rem;">0 pendientes en cola</div>
        </div>

        <div class="stat-tile">
          <div style="color: #71717a; font-size: 0.75rem; font-weight: 500;">TIEMPO DE RESPUESTA</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: #f4f4f5; margin-top: 0.35rem; font-family: monospace;">12 ms</div>
          <div style="font-size: 0.6875rem; color: #34d399; margin-top: 0.25rem;">Conexión directa OLEDB</div>
        </div>

      </div>

      <!-- Canales de Sincronización Autónoma -->
      <div class="card-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5;">Canales Autónomos de Datos</div>
            <div style="font-size: 0.75rem; color: #71717a; margin-top: 0.15rem;">Supervisión continua de los flujos automáticos gestionados por el Agente.</div>
          </div>
          <span style="font-size: 0.75rem; color: #a1a1aa; font-family: monospace;">Todos Operativos</span>
        </div>

        <div style="border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; overflow: hidden; font-size: 0.75rem;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead style="background: #18181b; color: #71717a; font-size: 0.6875rem; text-transform: uppercase;">
              <tr>
                <th style="padding: 0.75rem 1rem;">Canal de Sincronización</th>
                <th style="padding: 0.75rem 1rem;">Origen ➔ Destino</th>
                <th style="padding: 0.75rem 1rem;">Método de Detección</th>
                <th style="padding: 0.75rem 1rem;">Último Ciclo</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Estado</th>
              </tr>
            </thead>
            <tbody style="divide-y divide-white/[0.04]">
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.75rem 1rem; font-weight: 500; color: #f4f4f5;">Stock & Existencias</td>
                <td style="padding: 0.75rem 1rem; font-family: monospace; color: #cbd5e1;">Factusol (F_STO) ➔ WooCommerce</td>
                <td style="padding: 0.75rem 1rem; color: #a1a1aa;">File Watcher (.accdb modificado)</td>
                <td style="padding: 0.75rem 1rem; color: #a1a1aa;">Hace 3 min</td>
                <td style="padding: 0.75rem 1rem; text-align: right;"><span style="color: #34d399; font-weight: 600;">● Autónomo</span></td>
              </tr>
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.75rem 1rem; font-weight: 500; color: #f4f4f5;">Ingesta de Pedidos Web</td>
                <td style="padding: 0.75rem 1rem; font-family: monospace; color: #cbd5e1;">WooCommerce ➔ Factusol (F_PCL)</td>
                <td style="padding: 0.75rem 1rem; color: #a1a1aa;">Polling activo + Webhook</td>
                <td style="padding: 0.75rem 1rem; color: #a1a1aa;">Hace 4 min</td>
                <td style="padding: 0.75rem 1rem; text-align: right;"><span style="color: #34d399; font-weight: 600;">● Autónomo</span></td>
              </tr>
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.75rem 1rem; font-weight: 500; color: #f4f4f5;">Catálogo y Tarifas</td>
                <td style="padding: 0.75rem 1rem; font-family: monospace; color: #cbd5e1;">Factusol (F_ART, F_LTA) ➔ Web</td>
                <td style="padding: 0.75rem 1rem; color: #a1a1aa;">Programado cada 15 min</td>
                <td style="padding: 0.75rem 1rem; color: #a1a1aa;">Hace 9 min</td>
                <td style="padding: 0.75rem 1rem; text-align: right;"><span style="color: #34d399; font-weight: 600;">● Autónomo</span></td>
              </tr>
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.75rem 1rem; font-weight: 500; color: #f4f4f5;">Facturación Legal</td>
                <td style="padding: 0.75rem 1rem; font-family: monospace; color: #cbd5e1;">Factusol (F_FAC Serie A)</td>
                <td style="padding: 0.75rem 1rem; color: #a1a1aa;">Disparado al entregar pedido</td>
                <td style="padding: 0.75rem 1rem; color: #a1a1aa;">Hace 22 min</td>
                <td style="padding: 0.75rem 1rem; text-align: right;"><span style="color: #34d399; font-weight: 600;">● Autónomo</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .stat-tile {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 1.15rem;
    }
    .card-box {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px;
      padding: 1.25rem;
    }
  `]
})
export class SyncComponent implements OnInit {
  constructor(private api: ApiService) {}

  ngOnInit(): void {}
}
