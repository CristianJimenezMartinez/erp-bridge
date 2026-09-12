import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top, #1e1b4b 0%, #0f172a 60%, #020617 100%); padding: 1.5rem;">
      <div class="glass-card" style="width: 100%; max-width: 440px; padding: 2.5rem; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
        <!-- Logo & Title -->
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="display: inline-flex; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); width: 48px; height: 48px; border-radius: 12px; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1.5rem; margin-bottom: 1rem; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);">
            EB
          </div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; margin-bottom: 0.375rem;">
            ERP Bridge
          </h1>
          <p style="color: #94a3b8; font-size: 0.875rem;">
            Acceso Administrativo al Centro de Control
          </p>
        </div>

        <!-- Error Alert -->
        <div *ngIf="errorMessage" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 0.875rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; color: #fca5a5; font-size: 0.875rem;">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">
              Correo Electrónico
            </label>
            <input 
              type="email" 
              name="email"
              [(ngModel)]="email" 
              required
              placeholder="usuario@dominio.com"
              style="width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 0.75rem 1rem; color: #f8fafc; font-size: 0.9375rem; outline: none; transition: border-color 0.2s;"
              (focus)="errorMessage = ''"
            />
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.375rem;">
              Contraseña
            </label>
            <input 
              type="password" 
              name="password"
              [(ngModel)]="password" 
              required
              placeholder="••••••••••••"
              style="width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 0.75rem 1rem; color: #f8fafc; font-size: 0.9375rem; outline: none; transition: border-color 0.2s;"
              (focus)="errorMessage = ''"
            />
          </div>

          <button 
            type="submit" 
            [disabled]="loading"
            class="btn-primary"
            style="width: 100%; padding: 0.875rem; font-size: 0.9375rem; font-weight: 600; border-radius: 8px; margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
          >
            <span *ngIf="loading" style="display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
            <span>{{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}</span>
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  public email = '';
  public password = '';
  public loading = false;
  public errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  public onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, complete todos los campos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/overview';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.errorMessage = 'Credenciales no válidas. Compruebe usuario y contraseña.';
        } else {
          this.errorMessage = 'No se pudo conectar con el servidor API. Verifique que está iniciado.';
        }
      },
    });
  }
}
