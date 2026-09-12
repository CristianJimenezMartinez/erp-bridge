import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AdminUser {
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  organizationId?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AdminUser;
  expiresAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'bentian_admin_token';
  private readonly USER_KEY = 'bentian_admin_user';
  private get baseUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      if (origin.startsWith('http://localhost:4200')) {
        return 'https://bridge.cristianjm.com/api/v1';
      }
      return `${origin}/api/v1`;
    }
    return 'https://bridge.cristianjm.com/api/v1';
  }

  public currentUser = signal<AdminUser | null>(this.loadUserFromStorage());

  constructor(private http: HttpClient, private router: Router) {}

  public login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.token) {
            localStorage.setItem(this.TOKEN_KEY, res.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
            this.currentUser.set(res.user);
          }
        })
      );
  }

  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && Date.now() >= payload.exp) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private loadUserFromStorage(): AdminUser | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? (JSON.parse(stored) as AdminUser) : null;
    } catch {
      return null;
    }
  }
}
