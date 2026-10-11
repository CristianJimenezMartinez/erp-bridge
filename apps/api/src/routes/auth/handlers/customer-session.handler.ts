import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { LicenseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { MailerService } from '../../../services/mailer.service';
import { EmailProtectionService } from '../../../services/email-protection.service';
import {
  AdminJwtPayload,
  AuthenticatedRequest,
  computeOrganizationIdFromEmail,
  getClientIp,
} from '../auth.types';
import { AuthService } from '../auth.service';
import { pendingEmailOtps } from '../auth-lockout.manager';

const logger = new Logger('AuthRouter');
export const authLicenseService = new LicenseService();

export const LicenseSessionSchema = z.object({
  licenseKey: z.string().trim().min(1, 'Se requiere una clave de licencia válida').max(100),
});

export const EmailSessionSchema = z.object({
  email: z.string().trim().email('Introduce una dirección de correo electrónico válida').max(200),
  otp: z.string().trim().max(20).optional(),
  licenseKey: z.string().trim().max(100).optional(),
  action: z.string().trim().max(50).optional(),
});

export function handleMe(req: AuthenticatedRequest, res: Response): void {
  res.json({
    user: req.user,
  });
}

export async function handleLicenseSession(req: Request, res: Response): Promise<void> {
  try {
    const parsed = LicenseSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'MISSING_LICENSE_KEY',
          message: 'Se requiere una clave de licencia válida',
        },
      });
      return;
    }

    const { licenseKey } = parsed.data;

    const trimmedKey = licenseKey.trim();
    const license = await authLicenseService.getLicenseByKey(trimmedKey);
    if (!license) {
      res.status(401).json({
        error: {
          code: 'INVALID_LICENSE',
          message: 'Clave de licencia no encontrada o formato no válido',
        },
      });
      return;
    }

    if (license.status === 'revoked' || license.status === 'suspended') {
      res.status(403).json({
        error: {
          code: 'LICENSE_INACTIVE',
          message: `La licencia no está activa (Estado: ${license.status})`,
        },
      });
      return;
    }

    const exp = Date.now() + 48 * 60 * 60 * 1000; // 48 horas de vigencia
    const payload: AdminJwtPayload = {
      sub: license.key,
      role: 'TENANT_CLIENT',
      organizationId: license.organizationId,
      exp,
    };

    const token = AuthService.createToken(payload);

    res.json({
      success: true,
      token,
      user: {
        key: license.key,
        role: 'TENANT_CLIENT',
        organizationId: license.organizationId,
        plan: license.plan,
        alias: license.alias || 'Servidor Factusol',
      },
      expiresAt: new Date(exp).toISOString(),
    });
  } catch {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al verificar la clave de licencia',
      },
    });
  }
}

export async function handleEmailSession(req: Request, res: Response): Promise<void> {
  try {
    const parsed = EmailSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_EMAIL',
          message: 'Introduce una dirección de correo electrónico válida',
        },
      });
      return;
    }

    const { email, otp, licenseKey, action } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();
    const adminEmail = process.env['ADMIN_EMAIL'];
    if (adminEmail && cleanEmail === adminEmail.toLowerCase()) {
      res.status(400).json({
        error: {
          code: 'ADMIN_ACCOUNT',
          message: 'Esta dirección corresponde al Superadministrador. Inicia sesión en la pestaña Superadmin con tu contraseña.',
        },
      });
      return;
    }

    const orgId = computeOrganizationIdFromEmail(cleanEmail);
    const licenses = await authLicenseService.listLicenses(orgId);

    if (!licenses || licenses.length === 0) {
      res.status(404).json({
        error: {
          code: 'NO_LICENSES_FOUND',
          message: `No se encontraron licencias activas vinculadas a ${cleanEmail}. Comprueba el correo o usa tu clave de licencia.`,
        },
      });
      return;
    }

    // Caso 0: Solicitud expresa de recordatorio de claves por correo
    if (action === 'remind_licenses') {
      MailerService.sendLicenseReminderEmail({
        email: cleanEmail,
        licenses: licenses.map((l) => ({
          key: l.key,
          plan: l.plan,
          alias: l.alias || undefined,
          status: l.status,
          expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
        })),
      }).catch((err) => {
        logger.error('Error enviando recordatorio de licencias:', err instanceof Error ? err.message : String(err));
      });

      res.json({
        success: true,
        message: `Hemos enviado el listado de tus claves de activación a ${cleanEmail}`,
      });
      return;
    }

    const exp = Date.now() + 48 * 60 * 60 * 1000;
    const payload: AdminJwtPayload = {
      sub: cleanEmail,
      role: 'TENANT_CLIENT',
      organizationId: orgId,
      exp,
    };

    // Caso 1: Se proporciona licenseKey para validación directa 2-factor
    if (licenseKey && typeof licenseKey === 'string') {
      const match = licenses.find((l) => l.key.toUpperCase() === licenseKey.trim().toUpperCase());
      if (!match) {
        res.status(401).json({
          error: {
            code: 'INVALID_LICENSE_KEY',
            message: 'La clave de licencia proporcionada no corresponde a esta cuenta',
          },
        });
        return;
      }

      const token = AuthService.createToken(payload);
      res.json({
        success: true,
        token,
        user: {
          email: cleanEmail,
          role: 'TENANT_CLIENT',
          organizationId: orgId,
        },
        licenses,
        expiresAt: new Date(exp).toISOString(),
      });
      return;
    }

    // Caso 2: Se proporciona código OTP
    if (otp && typeof otp === 'string') {
      const otpRecord = pendingEmailOtps.get(cleanEmail);
      if (!otpRecord || Date.now() > otpRecord.expiresAt) {
        pendingEmailOtps.delete(cleanEmail);
        res.status(401).json({
          error: {
            code: 'OTP_EXPIRED',
            message: 'El código de acceso ha expirado o no existe. Solicita un nuevo código.',
          },
        });
        return;
      }

      if (otpRecord.attempts >= 3) {
        pendingEmailOtps.delete(cleanEmail);
        res.status(429).json({
          error: {
            code: 'OTP_TOO_MANY_ATTEMPTS',
            message: 'Demasiados intentos fallidos. Se ha invalidado el código. Solicita uno nuevo.',
          },
        });
        return;
      }

      const provBuf = Buffer.from(otp.trim(), 'utf8');
      const expBuf = Buffer.from(otpRecord.code, 'utf8');
      let isOtpMatch = false;
      if (provBuf.length === expBuf.length) {
        isOtpMatch = crypto.timingSafeEqual(provBuf, expBuf);
      } else {
        crypto.timingSafeEqual(expBuf, expBuf);
      }

      if (!isOtpMatch) {
        otpRecord.attempts += 1;
        res.status(401).json({
          error: {
            code: 'INVALID_OTP',
            message: `Código de acceso no válido. Intentos restantes: ${3 - otpRecord.attempts}`,
          },
        });
        return;
      }

      // Código verificado con éxito: limpiar OTP
      pendingEmailOtps.delete(cleanEmail);

      const token = AuthService.createToken(payload);
      res.json({
        success: true,
        token,
        user: {
          email: cleanEmail,
          role: 'TENANT_CLIENT',
          organizationId: orgId,
        },
        licenses,
        expiresAt: new Date(exp).toISOString(),
      });
      return;
    }

    // Caso 3: No se proporciona OTP ni licenseKey -> Solicitar código OTP por correo
    const clientIp = getClientIp(req);

    // A. Comprobar rate limit, cooldown y presupuesto de Resend
    const check = EmailProtectionService.checkOtpAllowed(cleanEmail, clientIp);
    if (!check.allowed) {
      if (check.retryAfterSeconds) {
        res.setHeader('Retry-After', String(check.retryAfterSeconds));
      }
      res.status(429).json({
        error: {
          code: check.code || 'TOO_MANY_REQUESTS',
          message: check.reason,
          retryAfterSeconds: check.retryAfterSeconds,
        },
      });
      return;
    }

    // B. Reutilización de código existente vigente vs nuevo código
    let generatedOtp: string;
    const existingOtp = pendingEmailOtps.get(cleanEmail);
    const validityMinutes = 10;

    if (existingOtp && Date.now() < existingOtp.expiresAt && existingOtp.attempts < 3) {
      // Reutilizar el mismo código para no desincronizar al usuario si el anterior sigue en tránsito
      generatedOtp = existingOtp.code;
    } else {
      // Generar nuevo código criptográfico de 6 dígitos
      generatedOtp = crypto.randomInt(100000, 999999).toString();

      // Limpieza de OTPs expirados o exceso de tamaño (máx 5000 entradas)
      const nowMs = Date.now();
      for (const [k, v] of pendingEmailOtps.entries()) {
        if (nowMs > v.expiresAt) pendingEmailOtps.delete(k);
      }
      while (pendingEmailOtps.size >= 5000) {
        const oldestKey = pendingEmailOtps.keys().next().value;
        if (oldestKey) pendingEmailOtps.delete(oldestKey);
        else break;
      }

      pendingEmailOtps.set(cleanEmail, {
        code: generatedOtp,
        expiresAt: Date.now() + validityMinutes * 60 * 1000,
        attempts: 0,
      });
    }

    // C. Registrar consumo en el monitor de cuota y rate-limiting
    EmailProtectionService.recordOtpSent(cleanEmail, clientIp);

    // D. Despachar email oficial formateado con texto plano y HTML responsive
    MailerService.sendLoginOtpEmail({
      email: cleanEmail,
      otp: generatedOtp,
      validityMinutes,
    }).catch((err) => {
      // Registrar en log pero no romper la respuesta del cliente
      logger.error('Error al despachar email de código OTP:', err instanceof Error ? err.message : String(err));
    });

    res.json({
      success: true,
      requireOtp: true,
      message: `Hemos enviado un código de acceso de 6 dígitos a ${cleanEmail}`,
      email: cleanEmail,
      cooldownSeconds: 60,
      ...(process.env['NODE_ENV'] !== 'production' ? { debugOtp: generatedOtp } : {}),
    });
  } catch {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al procesar la sesión por correo',
      },
    });
  }
}
