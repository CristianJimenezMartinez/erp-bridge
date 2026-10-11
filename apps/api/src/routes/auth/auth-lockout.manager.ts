import { LoginAttemptRecord, EmailOtpRecord } from './auth.types';

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // Ventana de 15 minutos
export const loginAttempts = new Map<string, LoginAttemptRecord>();

export const pendingEmailOtps = new Map<string, EmailOtpRecord>();

export function clearEmailOtps(): void {
  pendingEmailOtps.clear();
}

export function clearLoginAttempts(): void {
  loginAttempts.clear();
  pendingEmailOtps.clear();
}

export const MAX_ATTEMPT_STORE_SIZE = 10000;

export function pruneLoginAttempts(now: number): void {
  for (const [key, record] of loginAttempts.entries()) {
    if (record.blockedUntil && now < record.blockedUntil) continue;
    if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
  while (loginAttempts.size > MAX_ATTEMPT_STORE_SIZE) {
    const oldestKey = loginAttempts.keys().next().value;
    if (oldestKey) loginAttempts.delete(oldestKey);
    else break;
  }
}

// Lockout independiente para /auth/partner-login
export const partnerAttempts = new Map<string, LoginAttemptRecord>();

export function clearPartnerAttempts(): void {
  partnerAttempts.clear();
}

export function registerPartnerFailure(ip: string, now: number): void {
  const current = partnerAttempts.get(ip) || { count: 0, firstAttempt: now };
  if (now - current.firstAttempt > ATTEMPT_WINDOW_MS) {
    current.count = 1;
    current.firstAttempt = now;
    current.blockedUntil = undefined;
  } else {
    current.count += 1;
  }
  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.blockedUntil = now + LOCKOUT_MS;
  }
  while (partnerAttempts.size >= MAX_ATTEMPT_STORE_SIZE) {
    const oldestKey = partnerAttempts.keys().next().value;
    if (oldestKey) partnerAttempts.delete(oldestKey);
    else break;
  }
  partnerAttempts.set(ip, current);
}
