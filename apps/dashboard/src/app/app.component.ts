import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div style="display: flex; min-height: 100vh; background: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- 1. SIDEBAR NAVEGACIÓN -->
      <aside *ngIf="!isLoginPage" style="width: 250px; background: #0e0e11; border-right: 1px solid rgba(255, 255, 255, 0.07); display: flex; flex-direction: column; justify-content: space-between; padding: 1.25rem 0.875rem; position: fixed; height: 100vh; top: 0; left: 0; z-index: 20;">
        <div>
          <!-- Brand Logo -->
          <div style="display: flex; items: center; gap: 0.75rem; padding: 0.5rem 0.625rem; margin-bottom: 1.5rem;">
            <div style="background: #4f46e5; width: 32px; height: 32px; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 0.9375rem; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);">
              EB
            </div>
            <div>
              <div style="font-weight: 600; font-size: 0.9375rem; color: #f4f4f5; letter-spacing: -0.01em;">ERP Bridge</div>
              <div style="font-size: 0.6875rem; color: #71717a; font-family: monospace;">Local & Cloud SaaS</div>
            </div>
          </div>

          <!-- Navigation Links -->
          <nav style="display: flex; flex-direction: column; gap: 0.25rem;">
            <a routerLink="/overview" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>Resumen General</span>
            </a>

            <a routerLink="/connections" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              <span>Conexiones</span>
            </a>

            <a routerLink="/agents" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <span>Agentes Locales</span>
            </a>

            <a routerLink="/licenses" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              <span>Licencias & Facturación</span>
            </a>

            <div style="height: 1px; background: rgba(255, 255, 255, 0.06); margin: 0.5rem 0.5rem;"></div>

            <a routerLink="/flows" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span>Automatizaciones</span>
            </a>

            <a routerLink="/sync" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Estado Sincronización</span>
            </a>

            <a routerLink="/history" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Historial de Actividad</span>
            </a>

            <div style="height: 1px; background: rgba(255, 255, 255, 0.06); margin: 0.5rem 0.5rem;"></div>

            <a routerLink="/mappings" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
              <span>Equivalencias (Mapeo)</span>
            </a>

            <a routerLink="/logs" routerLinkActive="nav-active" class="nav-item">
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Seguridad & Auditoría</span>
            </a>
          </nav>
        </div>

        <!-- Sidebar Footer Status -->
        <div style="background: #141418; padding: 0.75rem 0.875rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; color: #a1a1aa; font-weight: 500;">Modo Autónomo</span>
            <span style="display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.6875rem; color: #34d399; font-weight: 600;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: pulse 2s infinite;"></span>
              Activo
            </span>
          </div>
          <div style="font-size: 0.6875rem; color: #71717a; margin-top: 0.25rem; font-family: monospace;">Background Daemon</div>
        </div>
      </aside>

      <!-- 2. CONTENIDO PRINCIPAL CON TOPBAR SUPERIOR -->
      <div [style.margin-left]="isLoginPage ? '0' : '250px'" style="flex: 1; display: flex; flex-direction: column; min-height: 100vh; min-width: 0;">
        
        <!-- TOPBAR MAESTRO -->
        <header *ngIf="!isLoginPage" style="height: 52px; background: #0e0e11; border-bottom: 1px solid rgba(255, 255, 255, 0.07); display: flex; align-items: center; justify-content: space-between; padding: 0 1.75rem; position: sticky; top: 0; z-index: 15;">
          
          <!-- Breadcrumb & Pipeline Info -->
          <div style="display: flex; align-items: center; gap: 0.625rem; font-size: 0.8125rem;">
            <span style="color: #a1a1aa; font-weight: 500;">Bentian</span>
            <span style="color: #52525b;">/</span>
            <span style="color: #f4f4f5; font-weight: 600;">Factusol ↔ WooCommerce</span>
            
            <span style="margin-left: 0.5rem; display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 500; background: rgba(52, 211, 153, 0.1); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.25);">
              <span style="width: 5px; height: 5px; border-radius: 50%; background: #34d399;"></span>
              Sincronización Automática
            </span>
          </div>

          <!-- Topbar Right: Status & User Dropdown -->
          <div style="display: flex; align-items: center; gap: 1rem; position: relative;">
            
            <!-- Agent Version Pill -->
            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.625rem; border-radius: 6px; background: #141418; border: 1px solid rgba(255, 255, 255, 0.06); font-size: 0.75rem; color: #a1a1aa;">
              <span style="color: #71717a;">Agente:</span>
              <span style="font-family: monospace; color: #f4f4f5; font-weight: 600;">v0.1.0</span>
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span>
            </div>

            <!-- Separator -->
            <div style="width: 1px; height: 18px; background: rgba(255, 255, 255, 0.1);"></div>

            <!-- User Menu Trigger -->
            <button 
              (click)="toggleUserDropdown($event)"
              style="display: flex; align-items: center; gap: 0.625rem; background: transparent; border: none; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 6px; transition: background 0.15s;"
              onmouseover="this.style.background='rgba(255, 255, 255, 0.05)';"
              onmouseout="this.style.background='transparent';"
            >
              <!-- Avatar Circle -->
              <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #7c3aed); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.75rem;">
                {{ (auth.currentUser()?.email || 'U').substring(0, 2).toUpperCase() }}
              </div>
              <div style="text-align: left; line-height: 1.2;">
                <div style="font-size: 0.8125rem; font-weight: 600; color: #f4f4f5;">{{ auth.currentUser()?.email || 'Usuario' }}</div>
                <div style="font-size: 0.6875rem; color: #71717a;">Administrador</div>
              </div>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #a1a1aa; margin-left: 0.25rem;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>

            <!-- DROPDOWN MENU FLOTANTE -->
            <div 
              *ngIf="isUserDropdownOpen" 
              (click)="$event.stopPropagation()"
              style="position: absolute; top: 44px; right: 0; width: 260px; background: #141418; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); padding: 0.75rem; z-index: 50;"
            >
              <!-- Info del Usuario -->
              <div style="padding: 0.5rem 0.625rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 0.5rem;">
                <div style="font-size: 0.8125rem; font-weight: 600; color: #f4f4f5;">{{ auth.currentUser()?.email || 'Usuario' }}</div>
                <div style="font-size: 0.6875rem; color: #818cf8; font-weight: 500; margin-top: 0.15rem;">Rol: {{ auth.currentUser()?.role || 'Administrador' }}</div>
                <div style="font-size: 0.6875rem; color: #71717a; margin-top: 0.15rem;">Organización: {{ auth.currentUser()?.organizationId || 'Principal' }}</div>
              </div>

              <!-- Estado de Conexión -->
              <div style="padding: 0.5rem 0.625rem; font-size: 0.75rem; color: #a1a1aa; display: flex; justify-content: space-between; align-items: center;">
                <span>Servidor Local:</span>
                <span style="color: #34d399; font-weight: 500;">Conectado (:3000)</span>
              </div>
              <div style="padding: 0.5rem 0.625rem; font-size: 0.75rem; color: #a1a1aa; display: flex; justify-content: space-between; align-items: center;">
                <span>Base PostgreSQL:</span>
                <span style="color: #34d399; font-weight: 500;">Puerto 5434</span>
              </div>

              <div style="height: 1px; background: rgba(255, 255, 255, 0.06); margin: 0.5rem 0;"></div>

              <!-- Cerrar Sesión -->
              <button 
                (click)="logout()" 
                style="width: 100%; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.625rem; border-radius: 6px; background: transparent; border: none; color: #ef4444; font-size: 0.8125rem; font-weight: 500; cursor: pointer; text-align: left; transition: background 0.15s;"
                onmouseover="this.style.background='rgba(239, 68, 68, 0.1)';"
                onmouseout="this.style.background='transparent';"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span>Cerrar Sesión</span>
              </button>
            </div>

          </div>
        </header>

        <!-- Main Content Area -->
        <main [style.padding]="isLoginPage ? '0' : '1.75rem 2rem'" style="flex: 1; background: #09090b;">
          <router-outlet></router-outlet>
        </main>
      </div>

    </div>
  `,
  styles: [`
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.625rem;
      border-radius: 6px;
      color: #a1a1aa;
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all 0.12s ease-in-out;
    }
    .nav-item:hover {
      color: #f4f4f5;
      background: rgba(255, 255, 255, 0.04);
    }
    .nav-active {
      color: #ffffff !important;
      background: #4f46e5 !important;
      font-weight: 600;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class AppComponent implements OnInit {
  isOnline = false;
  isUserDropdownOpen = false;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  get isLoginPage(): boolean {
    return this.router.url.includes('/login');
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isUserDropdownOpen) {
      this.isUserDropdownOpen = false;
    }
  }

  logout(): void {
    this.isUserDropdownOpen = false;
    this.auth.logout();
  }

  ngOnInit(): void {
    this.api.getHealth().subscribe({
      next: (res) => (this.isOnline = res.status === 'OK'),
      error: () => (this.isOnline = false),
    });
  }
}
