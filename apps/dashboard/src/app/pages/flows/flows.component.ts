import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface AutoRule {
  id: string;
  title: string;
  icon: string;
  triggerText: string;
  actionText: string;
  frequency: string;
  enabled: boolean;
  executionsToday: number;
}

@Component({
  selector: 'app-flows',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.75rem; max-width: 1100px; margin: 0 auto;">
      
      <!-- Cabecera -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <div>
          <h1 style="font-size: 1.375rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.01em;">Reglas de Automatización</h1>
          <p style="color: #71717a; font-size: 0.8125rem; margin-top: 0.25rem;">
            Comportamientos inteligentes autónomos: qué ocurre en tu negocio y qué acción ejecuta el sistema automáticamente.
          </p>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #34d399; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.2); padding: 0.35rem 0.75rem; border-radius: 9999px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span>
          6 de 6 Reglas Activas
        </div>
      </div>

      <!-- Lista de Reglas de Negocio en Lenguaje Natural -->
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        
        <div *ngFor="let rule of rules" class="rule-card">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
            
            <div style="display: flex; gap: 1rem; align-items: flex-start;">
              <!-- Icon -->
              <div style="width: 42px; height: 42px; border-radius: 8px; background: #18181b; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; shrink: 0;">
                {{ rule.icon }}
              </div>

              <!-- Rule Logic Block -->
              <div>
                <div style="display: flex; align-items: center; gap: 0.625rem;">
                  <h3 style="font-size: 0.9375rem; font-weight: 600; color: #f4f4f5; margin: 0;">
                    {{ rule.title }}
                  </h3>
                  <span style="font-size: 0.6875rem; color: #71717a; font-family: monospace; background: rgba(255,255,255,0.04); padding: 0.1rem 0.4rem; border-radius: 4px;">
                    {{ rule.frequency }}
                  </span>
                </div>

                <!-- SI ... ENTONCES ... -->
                <div style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.625rem; font-size: 0.8125rem;">
                  <div style="display: flex; align-items: baseline; gap: 0.5rem;">
                    <span style="color: #818cf8; font-weight: 600; font-size: 0.75rem; text-transform: uppercase;">CUANDO</span>
                    <span style="color: #cbd5e1;">{{ rule.triggerText }}</span>
                  </div>
                  <div style="display: flex; align-items: baseline; gap: 0.5rem;">
                    <span style="color: #34d399; font-weight: 600; font-size: 0.75rem; text-transform: uppercase;">ENTONCES</span>
                    <span style="color: #f4f4f5; font-weight: 500;">{{ rule.actionText }}</span>
                  </div>
                </div>

              </div>
            </div>

            <!-- Toggle Switch y Contador -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; shrink: 0;">
              
              <!-- Switch -->
              <label class="switch-container">
                <input type="checkbox" [(ngModel)]="rule.enabled" (change)="toggleRule(rule)">
                <span class="switch-slider"></span>
              </label>

              <span style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">
                {{ rule.enabled ? 'Activa' : 'Pausada' }} • {{ rule.executionsToday }} hoy
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  `,
  styles: [`
    .rule-card {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      transition: all 0.15s ease-in-out;
    }
    .rule-card:hover {
      border-color: rgba(255, 255, 255, 0.12);
      background: #141418;
    }
    .switch-container {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
      cursor: pointer;
    }
    .switch-container input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .switch-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #27272a;
      border-radius: 9999px;
      transition: 0.2s;
    }
    .switch-slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: #f4f4f5;
      border-radius: 50%;
      transition: 0.2s;
    }
    input:checked + .switch-slider {
      background-color: #4f46e5;
    }
    input:checked + .switch-slider:before {
      transform: translateX(18px);
    }
  `]
})
export class FlowsComponent implements OnInit {
  rules: AutoRule[] = [
    {
      id: 'r1',
      title: 'Importación Instantánea de Pedidos',
      icon: '🛒',
      triggerText: 'Un cliente completa una compra en WooCommerce.',
      actionText: 'Crea el pedido en Factusol (Serie W) y da de alta al cliente en F_CLI si no existía.',
      frequency: 'Tiempo Real (< 5 seg)',
      enabled: true,
      executionsToday: 18
    },
    {
      id: 'r2',
      title: 'Actualización Reactiva de Stock',
      icon: '⚡',
      triggerText: 'El stock de un artículo varía en Factusol (F_STO) tras una venta física o albarán.',
      actionText: 'El observador detecta el cambio en el .accdb y actualiza las unidades en WooCommerce.',
      frequency: 'Reactivo (< 3 seg)',
      enabled: true,
      executionsToday: 142
    },
    {
      id: 'r3',
      title: 'Sincronización de Catálogo y Precios',
      icon: '🏷️',
      triggerText: 'Se modifica el precio de Tarifa 1 o el nombre de un artículo en Factusol.',
      actionText: 'Actualiza el precio normal y ficha del producto en la tienda online.',
      frequency: 'Cada 15 min',
      enabled: true,
      executionsToday: 96
    },
    {
      id: 'r4',
      title: 'Notificación de Envío al Cliente',
      icon: '🚚',
      triggerText: 'Marcas un pedido como preparado o enviado en Factusol (Estado 2).',
      actionText: 'Cambia el estado en WooCommerce a "Completado" y envía el email al comprador.',
      frequency: 'Cada 2 min',
      enabled: true,
      executionsToday: 12
    },
    {
      id: 'r5',
      title: 'Emisión Legal de Factura',
      icon: '🧾',
      triggerText: 'Un pedido se entrega y confirma el cobro.',
      actionText: 'Genera automáticamente la factura oficial F_FAC con desglose de IVA del 21%.',
      frequency: 'Post-Entrega',
      enabled: true,
      executionsToday: 12
    },
    {
      id: 'r6',
      title: 'Resiliencia y Reintentos Inteligentes',
      icon: '🛡️',
      triggerText: 'La tienda online sufre una microcaída de red o no responde al primer intento.',
      actionText: 'Guarda la operación en cola segura y la reintenta automáticamente con retroceso exponencial.',
      frequency: 'Permanente (Cero pérdidas)',
      enabled: true,
      executionsToday: 0
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {}

  toggleRule(rule: AutoRule): void {
    // State toggle handled by ngModel
  }
}
