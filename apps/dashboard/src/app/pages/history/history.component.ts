import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

interface ActivityItem {
  id: string;
  category: 'PEDIDOS' | 'STOCK' | 'FACTURAS' | 'CATALOGO';
  icon: string;
  title: string;
  description: string;
  timeAgo: string;
  timestamp: string;
  status: 'EXITO' | 'EN_CURSO';
  badgeColor: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.75rem; max-width: 1100px; margin: 0 auto;">
      
      <!-- Cabecera -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <div>
          <h1 style="font-size: 1.375rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.01em;">Historial de Actividad</h1>
          <p style="color: #71717a; font-size: 0.8125rem; margin-top: 0.25rem;">
            Registro cronológico de operaciones comerciales: pedidos recibidos, stock sincronizado y facturas generadas.
          </p>
        </div>

        <!-- Filtros por Categoría Comercial -->
        <div style="display: flex; background: #141418; padding: 0.25rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06); gap: 0.25rem;">
          <button 
            *ngFor="let tab of tabs" 
            (click)="activeTab = tab.id"
            [style.background]="activeTab === tab.id ? '#27272a' : 'transparent'"
            [style.color]="activeTab === tab.id ? '#f4f4f5' : '#71717a'"
            style="border: none; border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.15s;"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Feed de Actividades -->
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        
        <div *ngFor="let item of filteredActivities" class="activity-card">
          
          <div style="display: flex; gap: 1rem; align-items: flex-start;">
            
            <!-- Icon Avatar -->
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #18181b; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; align-items: center; justify-content: center; font-size: 1.125rem; shrink: 0;">
              {{ item.icon }}
            </div>

            <!-- Content -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5;">{{ item.title }}</span>
                  <span [style.color]="item.badgeColor" [style.background]="item.badgeColor + '15'" [style.border]="'1px solid ' + item.badgeColor + '30'" style="font-size: 0.6875rem; font-weight: 600; padding: 0.1rem 0.4rem; border-radius: 4px;">
                    {{ item.category }}
                  </span>
                </div>
                <span style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">{{ item.timeAgo }}</span>
              </div>

              <div style="font-size: 0.8125rem; color: #a1a1aa; margin-top: 0.25rem; line-height: 1.4;">
                {{ item.description }}
              </div>

              <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; font-size: 0.6875rem; color: #52525b; font-family: monospace;">
                <span>Hora: {{ item.timestamp }}</span>
                <span>•</span>
                <span style="color: #34d399;">✓ Completado con éxito</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  `,
  styles: [`
    .activity-card {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      transition: all 0.12s ease-in-out;
    }
    .activity-card:hover {
      background: #151519;
      border-color: rgba(255, 255, 255, 0.12);
    }
  `]
})
export class HistoryComponent implements OnInit {
  activeTab = 'ALL';

  tabs = [
    { id: 'ALL', label: 'Todos' },
    { id: 'PEDIDOS', label: 'Pedidos (18)' },
    { id: 'STOCK', label: 'Stock (142)' },
    { id: 'FACTURAS', label: 'Facturas (12)' },
    { id: 'CATALOGO', label: 'Catálogo' }
  ];

  activities: ActivityItem[] = [
    {
      id: 'act-1',
      category: 'PEDIDOS',
      icon: '🛒',
      title: 'Pedido #1043 importado correctamente',
      description: 'Cliente Laura Gómez (142,00 €) registrado en F_CLI. Pedido creado en Factusol en Serie W (#W-2026/089) con 3 líneas de detalle.',
      timeAgo: 'Hace 4 min',
      timestamp: '23:25:12',
      status: 'EXITO',
      badgeColor: '#818cf8'
    },
    {
      id: 'act-2',
      category: 'STOCK',
      icon: '⚡',
      title: 'Stock actualizado en tiempo real',
      description: 'Detección reactiva en tabla F_STO tras venta en almacén. SKU 000047 (M. TUBO PVC ENC 16/160 MM) actualizado a 180 unidades en WooCommerce.',
      timeAgo: 'Hace 11 min',
      timestamp: '23:18:04',
      status: 'EXITO',
      badgeColor: '#34d399'
    },
    {
      id: 'act-3',
      category: 'FACTURAS',
      icon: '🧾',
      title: 'Factura Oficial emitida F26-0042',
      description: 'Generada factura oficial en Factusol (F_FAC Serie A) para el pedido entregado #1042. Base: 117,36 € + IVA (21%): 24,64 € = Total 142,00 €.',
      timeAgo: 'Hace 24 min',
      timestamp: '23:05:40',
      status: 'EXITO',
      badgeColor: '#c084fc'
    },
    {
      id: 'act-4',
      category: 'CATALOGO',
      icon: '🏷️',
      title: 'Precio de Tarifa 1 actualizado en tienda',
      description: 'Art. VÁLVULA ESFERA 1/2" (Ref: 000102). Precio regular sincronizado a 14,50 € en la web según la tabla F_LTA.',
      timeAgo: 'Hace 38 min',
      timestamp: '22:51:19',
      status: 'EXITO',
      badgeColor: '#fbbf24'
    },
    {
      id: 'act-5',
      category: 'PEDIDOS',
      icon: '🚚',
      title: 'Pedido #1042 marcado como Completado',
      description: 'Factusol reportó cambio de estado a Enviado (ESTPCL=2). WooCommerce actualizó el pedido a "Completado" y notificó al comprador por email.',
      timeAgo: 'Hace 1 hora',
      timestamp: '22:30:00',
      status: 'EXITO',
      badgeColor: '#818cf8'
    }
  ];

  get filteredActivities(): ActivityItem[] {
    if (this.activeTab === 'ALL') return this.activities;
    return this.activities.filter(a => a.category === this.activeTab);
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {}
}
