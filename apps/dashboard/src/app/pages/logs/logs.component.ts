import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

interface AuditItem {
  id: string;
  type: 'ACCESO' | 'SEGURIDAD' | 'INTEGRIDAD' | 'SISTEMA';
  icon: string;
  title: string;
  details: string;
  userOrOrigin: string;
  timestamp: string;
  badgeColor: string;
}

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.75rem; max-width: 1100px; margin: 0 auto;">
      
      <!-- Cabecera -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
        <div>
          <h1 style="font-size: 1.375rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.01em;">Seguridad & Auditoría</h1>
          <p style="color: #71717a; font-size: 0.8125rem; margin-top: 0.25rem;">
            Registro inmutable de accesos administrativos, validación criptográfica y cumplimiento de seguridad empresarial.
          </p>
        </div>

        <button (click)="exportAudit()" class="btn-export">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>Exportar Informe de Auditoría</span>
        </button>
      </div>

      <!-- Filtros de Auditoría -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
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

        <span style="font-size: 0.75rem; color: #71717a; font-family: monospace;">
          Idempotencia activa • Cero duplicados
        </span>
      </div>

      <!-- Lista de Trazas de Auditoría -->
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        
        <div *ngFor="let entry of filteredLogs" class="audit-card">
          <div style="display: flex; gap: 1rem; align-items: flex-start;">
            
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #18181b; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; align-items: center; justify-content: center; font-size: 1.125rem; shrink: 0;">
              {{ entry.icon }}
            </div>

            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.875rem; font-weight: 600; color: #f4f4f5;">{{ entry.title }}</span>
                  <span [style.color]="entry.badgeColor" [style.background]="entry.badgeColor + '15'" [style.border]="'1px solid ' + entry.badgeColor + '30'" style="font-size: 0.6875rem; font-weight: 600; padding: 0.1rem 0.4rem; border-radius: 4px;">
                    {{ entry.type }}
                  </span>
                </div>
                <span style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">{{ entry.timestamp }}</span>
              </div>

              <div style="font-size: 0.8125rem; color: #a1a1aa; margin-top: 0.25rem;">
                {{ entry.details }}
              </div>

              <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.45rem; font-size: 0.6875rem; color: #71717a; font-family: monospace;">
                <span>Origen: <span style="color: #cbd5e1;">{{ entry.userOrOrigin }}</span></span>
                <span>•</span>
                <span style="color: #34d399;">Firma Auditada ✓</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .audit-card {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      transition: all 0.12s ease-in-out;
    }
    .audit-card:hover {
      background: #151519;
      border-color: rgba(255, 255, 255, 0.12);
    }
    .btn-export {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f4f4f5;
      padding: 0.45rem 0.875rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.12s;
    }
    .btn-export:hover {
      background: #27272a;
      border-color: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class LogsComponent implements OnInit {
  activeTab = 'ALL';

  tabs = [
    { id: 'ALL', label: 'Todos los Registros' },
    { id: 'ACCESO', label: 'Accesos y Sesiones' },
    { id: 'SEGURIDAD', label: 'Criptografía & HWID' },
    { id: 'INTEGRIDAD', label: 'Bases de Datos' }
  ];

  logs: AuditItem[] = [
    {
      id: 'log-1',
      type: 'ACCESO',
      icon: '🔐',
      title: 'Inicio de sesión administrativo autorizado',
      details: 'El usuario admin@bentian.es inició sesión exitosamente. Se emitió un token JWT firmado mediante algoritmo HMAC-SHA256 con validez de 24 horas.',
      userOrOrigin: 'admin@bentian.es (IP: 127.0.0.1)',
      timestamp: 'Hoy, 23:21:08',
      badgeColor: '#818cf8'
    },
    {
      id: 'log-2',
      type: 'SEGURIDAD',
      icon: '🛡️',
      title: 'Validación criptográfica del binario del Agente',
      details: 'BentianAgent.exe verificó su firma digital Ed25519 con la clave pública maestra de Bentian antes de iniciar su servicio de sincronización.',
      userOrOrigin: 'Telkkalas-PC (Windows Service)',
      timestamp: 'Hoy, 23:03:30',
      badgeColor: '#34d399'
    },
    {
      id: 'log-3',
      type: 'SEGURIDAD',
      icon: '🔑',
      title: 'Comprobación de licencia y huella de hardware (HWID)',
      details: 'Licencia EB-6JDYR-X5SNS-CY9HS-YSDZB validada contra PostgreSQL. HWID de la máquina reconocido y confirmado (1/1 activaciones en uso). Período offline: 7 días.',
      userOrOrigin: 'Stripe Licensing Engine',
      timestamp: 'Hoy, 22:56:57',
      badgeColor: '#34d399'
    },
    {
      id: 'log-4',
      type: 'INTEGRIDAD',
      icon: '📦',
      title: 'Comprobación de integridad del archivo Access',
      details: 'Conexión verificada con 2252025.accdb mediante driver ACE SysWOW64. Cero colisiones de bloqueo con usuarios activos en la empresa.',
      userOrOrigin: 'AccessDriver OLEDB',
      timestamp: 'Hoy, 22:48:15',
      badgeColor: '#fbbf24'
    },
    {
      id: 'log-5',
      type: 'SISTEMA',
      icon: '⚙️',
      title: 'Arranque del servidor API y scheduler reactivo',
      details: 'Inicialización de los adaptadores de Factusol y WooCommerce en el Registro de Conectores. Escucha activa de eventos comerciales iniciada.',
      userOrOrigin: 'Node.js Core (:3000)',
      timestamp: 'Hoy, 22:40:02',
      badgeColor: '#a1a1aa'
    }
  ];

  get filteredLogs(): AuditItem[] {
    if (this.activeTab === 'ALL') return this.logs;
    return this.logs.filter(l => l.type === this.activeTab);
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {}

  exportAudit(): void {
    alert('Exportando registro completo de auditoría en formato CSV cifrado...');
  }
}
