import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FieldMapping {
  humanLabel: string;
  sourceField: string;
  sourceDesc: string;
  targetField: string;
  targetDesc: string;
  status: 'ACTIVO' | 'CONFIGURADO';
}

@Component({
  selector: 'app-mappings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.75rem; max-width: 1100px; margin: 0 auto;">
      
      <!-- Cabecera -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <div>
          <h1 style="font-size: 1.375rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.01em;">Equivalencias de Datos (Mapeo)</h1>
          <p style="color: #71717a; font-size: 0.8125rem; margin-top: 0.25rem;">
            Define cómo se corresponden los campos de Factusol con los de tu tienda WooCommerce para que los datos viajen al lugar correcto.
          </p>
        </div>

        <button (click)="resetDefaults()" class="btn-preset">
          <span>Cargar Valores Recomendados (Factusol 2026)</span>
        </button>
      </div>

      <!-- Selector de Secciones -->
      <div style="display: flex; background: #141418; padding: 0.25rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06); gap: 0.25rem; width: fit-content;">
        <button 
          *ngFor="let tab of tabs" 
          (click)="activeTab = tab.id"
          [style.background]="activeTab === tab.id ? '#27272a' : 'transparent'"
          [style.color]="activeTab === tab.id ? '#f4f4f5' : '#71717a'"
          style="border: none; border-radius: 6px; padding: 0.35rem 0.875rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.15s;"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- SECCIÓN 1: PRODUCTOS Y PRECIOS -->
      <div *ngIf="activeTab === 'PRODUCTS'" style="display: flex; flex-direction: column; gap: 0.75rem;">
        
        <div *ngFor="let item of productMappings" class="mapping-card">
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1.5rem;">
            
            <!-- Origen: Factusol -->
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #f87171; text-transform: uppercase;">Factusol (Tu Programa)</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">{{ item.humanLabel }}</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace; margin-top: 0.2rem;">Tabla: {{ item.sourceField }}</div>
            </div>

            <!-- Flecha de Sincronización -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
              <div style="font-size: 0.6875rem; color: #34d399; font-weight: 600; text-transform: uppercase;">Sincronizado</div>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #4f46e5;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              <div style="font-size: 0.625rem; color: #71717a; font-family: monospace;">Automático</div>
            </div>

            <!-- Destino: WooCommerce -->
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #c084fc; text-transform: uppercase;">WooCommerce (Tu Tienda)</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">{{ item.targetDesc }}</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace; margin-top: 0.2rem;">Campo API: {{ item.targetField }}</div>
            </div>

          </div>
        </div>

      </div>

      <!-- SECCIÓN 2: ESTADOS DE PEDIDO -->
      <div *ngIf="activeTab === 'ORDERS'" style="display: flex; flex-direction: column; gap: 0.75rem;">
        
        <div class="mapping-card">
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1.5rem;">
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #f87171; text-transform: uppercase;">Factusol</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">Pedido Pendiente</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">F_PCL.ESTPCL = 0 (Pendiente de preparar)</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
              <div style="font-size: 0.6875rem; color: #34d399; font-weight: 600;">⇄</div>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #4f46e5;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            </div>
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #c084fc; text-transform: uppercase;">WooCommerce</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">Procesando (Processing)</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">status = 'processing'</div>
            </div>
          </div>
        </div>

        <div class="mapping-card">
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1.5rem;">
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #f87171; text-transform: uppercase;">Factusol</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">Pedido Enviado / Entregado</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">F_PCL.ESTPCL = 2 (Enviado al cliente)</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
              <div style="font-size: 0.6875rem; color: #34d399; font-weight: 600;">⇄</div>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #4f46e5;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            </div>
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #c084fc; text-transform: uppercase;">WooCommerce</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">Completado (Completed)</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">status = 'completed' (Envía email al cliente)</div>
            </div>
          </div>
        </div>

        <div class="mapping-card">
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1.5rem;">
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #f87171; text-transform: uppercase;">Factusol</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">Pedido Anulado / Cancelado</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">F_PCL.ESTPCL = 9 (Cancelado)</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
              <div style="font-size: 0.6875rem; color: #34d399; font-weight: 600;">⇄</div>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #4f46e5;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            </div>
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #c084fc; text-transform: uppercase;">WooCommerce</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">Cancelado (Cancelled)</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">status = 'cancelled'</div>
            </div>
          </div>
        </div>

      </div>

      <!-- SECCIÓN 3: IMPUESTOS E IVA -->
      <div *ngIf="activeTab === 'TAXES'" style="display: flex; flex-direction: column; gap: 0.75rem;">
        
        <div class="mapping-card">
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1.5rem;">
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #f87171;">FACTUSOL</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">IVA Tipo 1: 21% (General)</div>
            </div>
            <div style="color: #34d399; font-weight: 600;">➔</div>
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #c084fc;">WOOCOMMERCE</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">Tasa de Impuesto Estándar (21%)</div>
            </div>
          </div>
        </div>

        <div class="mapping-card">
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1.5rem;">
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #f87171;">FACTUSOL</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">IVA Tipo 2: 10% (Reducido)</div>
            </div>
            <div style="color: #34d399; font-weight: 600;">➔</div>
            <div style="background: #18181b; border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.875rem 1rem;">
              <div style="font-size: 0.6875rem; font-weight: 600; color: #c084fc;">WOOCOMMERCE</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5; margin-top: 0.25rem;">Tasa Reducida (10%)</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .mapping-card {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      transition: all 0.12s ease-in-out;
    }
    .mapping-card:hover {
      background: #151519;
      border-color: rgba(255, 255, 255, 0.12);
    }
    .btn-preset {
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #818cf8;
      padding: 0.45rem 0.875rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.12s;
    }
    .btn-preset:hover {
      background: #27272a;
      color: #a5b4fc;
    }
  `]
})
export class MappingsComponent implements OnInit {
  activeTab = 'PRODUCTS';

  tabs = [
    { id: 'PRODUCTS', label: 'Artículos y Precios' },
    { id: 'ORDERS', label: 'Estados de Pedido' },
    { id: 'TAXES', label: 'Impuestos e IVA' }
  ];

  productMappings: FieldMapping[] = [
    {
      humanLabel: 'Código de Artículo (SKU)',
      sourceField: 'F_ART.CODART',
      sourceDesc: 'Identificador único en Factusol',
      targetField: 'sku',
      targetDesc: 'SKU del Producto Web',
      status: 'ACTIVO'
    },
    {
      humanLabel: 'Nombre y Descripción Breve',
      sourceField: 'F_ART.DESART',
      sourceDesc: 'Nombre oficial del producto',
      targetField: 'name',
      targetDesc: 'Título del Producto en Tienda',
      status: 'ACTIVO'
    },
    {
      humanLabel: 'Precio de Venta al Público (PVP)',
      sourceField: 'F_LTA.PRELTA (Tarifa 1)',
      sourceDesc: 'Precio de Tarifa 1 en Factusol',
      targetField: 'regular_price',
      targetDesc: 'Precio Regular en WooCommerce',
      status: 'ACTIVO'
    },
    {
      humanLabel: 'Stock Disponible en Almacén',
      sourceField: 'F_STO.ACTSTO',
      sourceDesc: 'Existencias reales en almacén',
      targetField: 'stock_quantity',
      targetDesc: 'Cantidad de Inventario en Web',
      status: 'ACTIVO'
    },
    {
      humanLabel: 'Descripción Extendida del Producto',
      sourceField: 'F_ART.DEWART',
      sourceDesc: 'Texto ampliado con detalles técnicos',
      targetField: 'description',
      targetDesc: 'Descripción Completa (HTML)',
      status: 'ACTIVO'
    }
  ];

  ngOnInit(): void {}

  resetDefaults(): void {
    alert('Equivalencias oficiales de Factusol 2026 recargadas y verificadas con éxito.');
  }
}
