import { Router } from 'express';
import { rateLimit } from '../../middleware/rate-limit';
import { requireAuth } from './auth.middleware';
import { handleLogin, handleLogout } from './handlers/login.handler';
import { handlePartnerLogin } from './handlers/partner-login.handler';
import { handleMe, handleLicenseSession, handleEmailSession } from './handlers/customer-session.handler';

export const authRouter = Router();

// POST /api/v1/auth/logout (Revocación inmediata del token de sesión)
authRouter.post('/auth/logout', requireAuth, handleLogout);

// POST /api/v1/auth/login
authRouter.post('/auth/login', handleLogin);

// POST /api/v1/auth/partner-login (Acceso para Empresas Instaladoras / Partners / Resellers)
authRouter.post('/auth/partner-login', handlePartnerLogin);

// GET /api/v1/auth/me
authRouter.get('/auth/me', requireAuth, handleMe);

// POST /api/v1/auth/license-session (Acceso 1-clic y login directo por clave)
authRouter.post(
  '/auth/license-session',
  rateLimit({ name: 'license-session', windowMs: 15 * 60 * 1000, max: 30 }),
  handleLicenseSession
);

// POST /api/v1/auth/email-session (Acceso por correo de facturación Stripe con verificación OTP o Clave)
authRouter.post('/auth/email-session', handleEmailSession);

export * from './auth.types';
export * from './auth.service';
export * from './auth.middleware';
export * from './auth-lockout.manager';
export * from './handlers/login.handler';
export * from './handlers/partner-login.handler';
export * from './handlers/customer-session.handler';
