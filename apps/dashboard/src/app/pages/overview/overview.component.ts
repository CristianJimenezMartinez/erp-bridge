import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 1200px; margin: 0 auto;">
      
      <!-- Top Overview Banner -->
      <div style="background: #121215; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h1 style="font-size: 1.25rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.01em; margin: 0;">
              Puente de Integración Factusol ↔ WooCommerce
            </h1>
            <span style="font-size: 0.6875rem; font-weight: 600; color: #34d399; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.25); padding: 0.15rem 0.5rem; border-radius: 9999px;">
              Producción Local-First
            </span>
          </div>
          <p style="color: #71717a; font-size: 0.8125rem; margin-top: 0.35rem; margin-bottom: 0;">
            Sincronización desatendida entre tu servidor local Windows y tu comercio electrónico. Sin puertos abiertos.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.625rem;">
          <span style="font-size: 0.75rem; color: #34d399; font-weight: 500; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span>
            Sincronización Continua Activa
          </span>
        </div>
      </div>

      <!-- 4 Stat Badges (Clean, Sharp) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
        
        <div class="stat-box">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; color: #71717a; font-weight: 600; text-transform: uppercase;">
            <span>Base Factusol</span>
            <span style="color: #34d399; font-family: monospace;">12ms</span>
          </div>
          <div style="font-size: 1.125rem; font-weight: 600; color: #f4f4f5; margin-top: 0.35rem; font-family: monospace;">
            2252025.accdb
          </div>
          <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.2rem;">
            7.978 Artículos • Tarifa 1 (PVP)
          </div>
        </div>

        <div class="stat-box">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; color: #71717a; font-weight: 600; text-transform: uppercase;">
            <span>Agente Windows</span>
            <span style="color: #34d399; font-weight: 600;">Online</span>
          </div>
          <div style="font-size: 1.125rem; font-weight: 600; color: #f4f4f5; margin-top: 0.35rem;">
            Telkkalas-PC
          </div>
          <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.2rem; font-family: monospace;">
            BentianAgent v0.1.0 • Ed25519
          </div>
        </div>

        <div class="stat-box">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; color: #71717a; font-weight: 600; text-transform: uppercase;">
            <span>Licencia Stripe</span>
            <span style="color: #818cf8; font-weight: 600;">PRO</span>
          </div>
          <div style="font-size: 1.125rem; font-weight: 600; color: #f4f4f5; margin-top: 0.35rem; font-family: monospace;">
            EB-6JDYR...
          </div>
          <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.2rem;">
            1/1 Puestos • Gracia 7 días
          </div>
        </div>

        <div class="stat-box">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; color: #71717a; font-weight: 600; text-transform: uppercase;">
            <span>Operación</span>
            <span style="color: #34d399; font-weight: 600;">100% OK</span>
          </div>
          <div style="font-size: 1.125rem; font-weight: 600; color: #f4f4f5; margin-top: 0.35rem;">
            Totalmente Autónomo
          </div>
          <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.2rem;">
            File Watcher + Webhooks activos
          </div>
        </div>

      </div>

      <!-- Topología de Datos en Tiempo Real -->
      <div style="background: #121215; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 1.25rem 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div>
            <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5;">Topología del Pipeline de Datos</div>
            <div style="font-size: 0.75rem; color: #71717a; margin-top: 0.15rem;">Flujo bidireccional local-first entre el ERP y tu tienda WooCommerce.</div>
          </div>
          <span style="font-size: 0.6875rem; font-family: monospace; color: #818cf8; background: rgba(79, 70, 229, 0.1); border: 1px solid rgba(79, 70, 229, 0.25); padding: 0.15rem 0.5rem; border-radius: 4px;">
            OLEDB SysWOW64 ACE
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: center; gap: 1rem;">
          
          <!-- Node 1: Factusol -->
          <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 1rem; text-align: center;">
            <div style="width: 36px; height: 36px; border-radius: 6px; background: rgba(239, 68, 68, 0.12); color: #f87171; font-weight: 700; font-size: 0.8125rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto;">
              FS
            </div>
            <div style="font-size: 0.8125rem; font-weight: 600; color: #f4f4f5;">Factusol (MS Access)</div>
            <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace; margin-top: 0.25rem;">2252025.accdb</div>
            <div style="font-size: 0.6875rem; color: #34d399; margin-top: 0.35rem;">✓ 7.978 Artículos</div>
          </div>

          <!-- Arrow 1 -->
          <div style="color: #4f46e5; font-size: 1.25rem; font-weight: 700;">⇄</div>

          <!-- Node 2: BentianAgent SEA -->
          <div style="background: #18181b; border: 1px solid rgba(79, 70, 229, 0.3); border-radius: 8px; padding: 1rem; text-align: center; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.08);">
            <div style="width: 36px; height: 36px; border-radius: 6px; background: rgba(79, 70, 229, 0.15); color: #818cf8; font-weight: 700; font-size: 0.8125rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto;">
              EB
            </div>
            <div style="font-size: 0.8125rem; font-weight: 600; color: #f4f4f5;">BentianAgent (SEA)</div>
            <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace; margin-top: 0.25rem;">Servicio Windows</div>
            <div style="font-size: 0.6875rem; color: #818cf8; margin-top: 0.35rem;">File Watcher + Queue</div>
          </div>

          <!-- Arrow 2 -->
          <div style="color: #4f46e5; font-size: 1.25rem; font-weight: 700;">⇄</div>

          <!-- Node 3: WooCommerce -->
          <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 1rem; text-align: center;">
            <div style="width: 36px; height: 36px; border-radius: 6px; background: rgba(147, 51, 234, 0.12); color: #c084fc; font-weight: 700; font-size: 0.8125rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto;">
              WC
            </div>
            <div style="font-size: 0.8125rem; font-weight: 600; color: #f4f4f5;">WooCommerce Store</div>
            <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace; margin-top: 0.25rem;">tienda.bentian.es</div>
            <div style="font-size: 0.6875rem; color: #34d399; margin-top: 0.35rem;">✓ REST API v3 OK</div>
          </div>

        </div>
      </div>

      <!-- Resumen de Flujos Activos -->
      <div style="background: #121215; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 1.25rem 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5;">Flujos de Integración Activos</div>
          <a routerLink="/flows" style="color: #818cf8; font-size: 0.75rem; text-decoration: none; font-weight: 500;">
            Ver todas las automatizaciones ➔
          </a>
        </div>

        <div style="border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; overflow: hidden; font-size: 0.75rem;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead style="background: #18181b; color: #71717a; font-size: 0.6875rem; text-transform: uppercase;">
              <tr>
                <th style="padding: 0.625rem 0.875rem;">Flujo</th>
                <th style="padding: 0.625rem 0.875rem;">Tablas Involucradas</th>
                <th style="padding: 0.625rem 0.875rem;">Frecuencia</th>
                <th style="padding: 0.625rem 0.875rem; text-align: right;">Estado</th>
              </tr>
            </thead>
            <tbody style="divide-y divide-white/[0.04]">
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.625rem 0.875rem; font-weight: 500; color: #f4f4f5;">1. Catálogo & Tarifas</td>
                <td style="padding: 0.625rem 0.875rem; font-family: monospace; color: #a1a1aa;">F_ART, F_LTA ➔ WC Products</td>
                <td style="padding: 0.625rem 0.875rem; color: #71717a;">Cada 15 min</td>
                <td style="padding: 0.625rem 0.875rem; text-align: right;"><span style="color: #34d399;">● Activo</span></td>
              </tr>
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.625rem 0.875rem; font-weight: 500; color: #f4f4f5;">2. Stock & Existencias</td>
                <td style="padding: 0.625rem 0.875rem; font-family: monospace; color: #a1a1aa;">F_STO ➔ WC Inventory</td>
                <td style="padding: 0.625rem 0.875rem; color: #71717a;">Reactivo (File Watcher)</td>
                <td style="padding: 0.625rem 0.875rem; text-align: right;"><span style="color: #34d399;">● Activo</span></td>
              </tr>
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.625rem 0.875rem; font-weight: 500; color: #f4f4f5;">3. Ingesta de Pedidos</td>
                <td style="padding: 0.625rem 0.875rem; font-family: monospace; color: #a1a1aa;">WC Orders ➔ F_CLI, F_PCL (Serie W)</td>
                <td style="padding: 0.625rem 0.875rem; color: #71717a;">Tiempo Real (< 5s)</td>
                <td style="padding: 0.625rem 0.875rem; text-align: right;"><span style="color: #34d399;">● Activo</span></td>
              </tr>
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.625rem 0.875rem; font-weight: 500; color: #f4f4f5;">4. Notificación de Entrega</td>
                <td style="padding: 0.625rem 0.875rem; font-family: monospace; color: #a1a1aa;">ESTPCL=2 ➔ WC Completed</td>
                <td style="padding: 0.625rem 0.875rem; color: #71717a;">Cada 2 min</td>
                <td style="padding: 0.625rem 0.875rem; text-align: right;"><span style="color: #34d399;">● Activo</span></td>
              </tr>
              <tr style="border-top: 1px solid rgba(255, 255, 255, 0.04);">
                <td style="padding: 0.625rem 0.875rem; font-weight: 500; color: #f4f4f5;">5. Facturación Legal (IVA 21%)</td>
                <td style="padding: 0.625rem 0.875rem; font-family: monospace; color: #a1a1aa;">F_FAC, F_LFA (Serie A)</td>
                <td style="padding: 0.625rem 0.875rem; color: #71717a;">Automático post-entrega</td>
                <td style="padding: 0.625rem 0.875rem; text-align: right;"><span style="color: #34d399;">● Activo</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .stat-box {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }
  `]
})
export class OverviewComponent implements OnInit {
  constructor(private api: ApiService) {}

  ngOnInit(): void {}
}
