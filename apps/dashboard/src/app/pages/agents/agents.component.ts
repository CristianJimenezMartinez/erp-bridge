import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentItem, ApiService, PairingTokenResponse } from '../../services/api.service';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <!-- Page Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.05em;">Fase 4 & 5 — Conectividad Local Outbound</span>
          <h1 style="font-size: 1.75rem; font-weight: 700; color: #ffffff; margin-top: 0.25rem;">Agentes Locales (Windows)</h1>
          <p style="color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem;">
            Administra los agentes instalados en las redes locales de tus clientes para conectar Factusol y Access sin abrir puertos en el firewall.
          </p>
        </div>

        <button (click)="openPairingModal()" class="btn-primary" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem;">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Vincular Nuevo Agente
        </button>
      </div>

      <!-- PAIRING MODAL / PROMPT -->
      <div *ngIf="showPairingModal" class="glass-card" style="padding: 2rem; border-color: rgba(56, 189, 248, 0.4); background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #38bdf8;">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 700; color: #f8fafc;">Vincular Agente Local en 3 Minutos</h2>
              <p style="font-size: 0.875rem; color: #94a3b8;">Sigue estos pasos en el PC o Servidor Windows donde esté instalado Factusol:</p>
            </div>
          </div>
          <button (click)="showPairingModal = false" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1.25rem;">✕</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
          <!-- Step 1 -->
          <div style="background: rgba(15, 23, 42, 0.7); padding: 1.25rem; border-radius: 8px; border: 1px solid #1e293b;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #38bdf8; font-size: 0.875rem; margin-bottom: 0.5rem;">
              <span style="background: #38bdf8; color: #0f172a; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">1</span>
              Código de Emparejamiento
            </div>
            <div *ngIf="pairingTokenData" style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; border: 2px dashed rgba(56, 189, 248, 0.4); padding: 1rem; border-radius: 6px; margin-top: 0.75rem;">
              <span style="font-size: 1.75rem; font-weight: 800; letter-spacing: 0.1em; color: #38bdf8; font-family: 'JetBrains Mono', monospace;">
                {{ pairingTokenData.token }}
              </span>
              <span style="font-size: 0.75rem; color: #94a3b8;">Expira en 15 min</span>
            </div>
            <div *ngIf="!pairingTokenData" style="color: #94a3b8; font-size: 0.875rem; padding: 1rem 0;">
              Generando código seguro...
            </div>
          </div>

          <!-- Step 2 -->
          <div style="background: rgba(15, 23, 42, 0.7); padding: 1.25rem; border-radius: 8px; border: 1px solid #1e293b;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #34d399; font-size: 0.875rem; margin-bottom: 0.5rem;">
              <span style="background: #34d399; color: #0f172a; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">2</span>
              Ejecutar en PowerShell (PC Factusol)
            </div>
            <p style="font-size: 0.8125rem; color: #94a3b8; margin-bottom: 0.5rem;">
              Abre una terminal en el PC del cliente y ejecuta el comando de emparejamiento automático:
            </p>
            <div style="background: #0f172a; padding: 0.75rem 1rem; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.8125rem; color: #a5f3fc; border: 1px solid #334155; word-break: break-all;">
              pnpm --filter &#64;erp-bridge/agent start pair {{ pairingTokenData?.token || 'EB-XXXXXX' }}
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button (click)="loadAgents()" class="btn-secondary" style="font-size: 0.875rem;">
            Actualizar Lista
          </button>
          <button (click)="showPairingModal = false" class="btn-primary" style="font-size: 0.875rem;">
            Listo / Cerrar
          </button>
        </div>
      </div>

      <!-- AGENTS LIST -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem;">
        <div *ngFor="let agent of agents" class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="background: rgba(99, 102, 241, 0.15); width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #818cf8;">
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <div>
                  <h3 style="font-size: 1.0625rem; font-weight: 600; color: #f8fafc;">{{ agent.name }}</h3>
                  <div style="font-size: 0.75rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">{{ agent.id }}</div>
                </div>
              </div>
              <span [ngClass]="agent.status === 'ONLINE' ? 'badge-healthy' : 'badge-down'">
                {{ agent.status }}
              </span>
            </div>

            <!-- Agent Details -->
            <div style="background: rgba(15, 23, 42, 0.6); padding: 1rem; border-radius: 8px; border: 1px solid #1e293b; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8125rem;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Plataforma:</span>
                <span style="color: #cbd5e1; font-weight: 500;">{{ agent.platform || 'Windows' }}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Versión Node:</span>
                <span style="color: #cbd5e1; font-weight: 500;">{{ agent.version || 'v20.x' }}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Último Latido:</span>
                <span style="color: #38bdf8; font-weight: 500;">{{ agent.lastSeenAt | date:'shortTime' }}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Comunicación:</span>
                <span style="color: #34d399; font-weight: 500;">Outbound-Only (Seguro)</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; color: #64748b;">Vinculado: {{ agent.createdAt | date:'shortDate' }}</span>
            <span style="font-size: 0.8125rem; color: #10b981; display: flex; align-items: center; gap: 0.35rem;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Factusol Conectado
            </span>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="agents.length === 0" class="glass-card" style="grid-column: 1 / -1; padding: 3rem; text-align: center;">
          <div style="width: 56px; height: 56px; background: rgba(56, 189, 248, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #38bdf8;">
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
          <h3 style="font-size: 1.125rem; font-weight: 600; color: #f8fafc;">No hay agentes vinculados</h3>
          <p style="color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; max-width: 460px; margin-left: auto; margin-right: auto;">
            Instala el agente en el equipo con Factusol para sincronizar datos locales de forma segura y automatizada.
          </p>
          <button (click)="openPairingModal()" class="btn-primary" style="margin-top: 1.5rem;">
            Vincular Primer Agente
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AgentsComponent implements OnInit {
  agents: AgentItem[] = [];
  showPairingModal = false;
  pairingTokenData: PairingTokenResponse | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.api.getAgents().subscribe({
      next: (res) => (this.agents = res.data),
      error: () => {},
    });
  }

  openPairingModal(): void {
    this.showPairingModal = true;
    this.pairingTokenData = null;
    this.api.generatePairingToken().subscribe({
      next: (res) => (this.pairingTokenData = res.data),
      error: () => {},
    });
  }
}
