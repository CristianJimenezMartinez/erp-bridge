import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { DatabaseService } from '@erp-bridge/core';
import { AdminJwtPayload, getClientIp } from '../auth.types';
import { AuthService } from '../auth.service';
import {
  partnerAttempts,
  registerPartnerFailure,
} from '../auth-lockout.manager';

export const PartnerLoginSchema = z.object({
  partnerCode: z.string().trim().min(1, 'Introduce tu código de Partner o Empresa Instaladora autorizado').max(100),
  partnerSecret: z.string().trim().max(200).optional(),
  partnerEmail: z.string().trim().email('El correo electrónico proporcionado no tiene un formato válido').max(200).optional(),
});

export async function handlePartnerLogin(req: Request, res: Response): Promise<void> {
  const partnerClientIp = getClientIp(req);
  const now = Date.now();
  const partnerRecord = partnerAttempts.get(partnerClientIp);
  if (partnerRecord?.blockedUntil && now < partnerRecord.blockedUntil) {
    const remainingSeconds = Math.ceil((partnerRecord.blockedUntil - now) / 1000);
    res.setHeader('Retry-After', String(remainingSeconds));
    res.status(429).json({
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: `Demasiados intentos fallidos. Bloqueo de seguridad activo por ${remainingSeconds} segundos.`,
      },
    });
    return;
  }

  const parsed = PartnerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'MISSING_PARTNER_CODE',
        message: 'Introduce tu código de Partner o Empresa Instaladora autorizado',
      },
    });
    return;
  }

  const { partnerCode, partnerSecret, partnerEmail } = parsed.data;

  const cleanCode = partnerCode.trim().toUpperCase();
  // Validar formato partner: código tipo PT-XXXX o reseller asignado
  if (!cleanCode.startsWith('PT-') && !cleanCode.startsWith('PARTNER-')) {
    res.status(401).json({
      error: {
        code: 'INVALID_PARTNER_CODE',
        message: 'Código de Partner no reconocido. Los códigos de partner comienzan por PT-',
      },
    });
    return;
  }

  if (partnerEmail) {
    const trimmedEmail = partnerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      res.status(400).json({
        error: {
          code: 'INVALID_PARTNER_EMAIL',
          message: 'El correo electrónico proporcionado no tiene un formato válido',
        },
      });
      return;
    }
  }

  const providedSecret = typeof partnerSecret === 'string' ? partnerSecret.trim() : '';
  let isSecretValid = false;
  let partnerFoundInDb = false;

  const db = DatabaseService.getInstance();
  if (db.isAvailable()) {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS partners (
          partner_code VARCHAR(50) PRIMARY KEY,
          secret_hash VARCHAR(255) NOT NULL,
          contact_email VARCHAR(255),
          active BOOLEAN NOT NULL DEFAULT true,
          quota_trials INT NOT NULL DEFAULT 20,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const partnerRes = await db.query(
        `SELECT partner_code, secret_hash, active, contact_email FROM partners WHERE partner_code = $1`,
        [cleanCode]
      );
      if (partnerRes.rows.length > 0 && partnerRes.rows[0]) {
        partnerFoundInDb = true;
        const row = partnerRes.rows[0];
        if (!row.active) {
          res.status(403).json({
            error: {
              code: 'PARTNER_DEACTIVATED',
              message: 'La cuenta de Partner se encuentra desactivada',
            },
          });
          return;
        }

        const storedHash: string = row.secret_hash;
        if (storedHash.startsWith('sha256:')) {
          const hashExpected = storedHash.substring(7);
          const hashProvided = crypto.createHash('sha256').update(providedSecret).digest('hex');
          if (hashExpected.length === hashProvided.length && crypto.timingSafeEqual(Buffer.from(hashExpected), Buffer.from(hashProvided))) {
            isSecretValid = true;
          }
        } else {
          const provBuf = Buffer.from(providedSecret, 'utf8');
          const storedBuf = Buffer.from(storedHash, 'utf8');
          if (provBuf.length === storedBuf.length && provBuf.length > 0 && crypto.timingSafeEqual(provBuf, storedBuf)) {
            isSecretValid = true;
          }
        }
      }
    } catch {
      partnerFoundInDb = false;
    }
  }

  if (!partnerFoundInDb) {
    const configuredPartnerSecret = process.env['PARTNER_SECRET'];
    if (!configuredPartnerSecret || configuredPartnerSecret.length < 12) {
      res.status(503).json({
        error: {
          code: 'PARTNER_ACCESS_DISABLED',
          message: 'El acceso de partners no está habilitado en este servidor',
        },
      });
      return;
    }

    try {
      const provBuf = Buffer.from(providedSecret, 'utf8');
      const secBuf = Buffer.from(configuredPartnerSecret, 'utf8');
      if (provBuf.length === secBuf.length && provBuf.length > 0) {
        isSecretValid = crypto.timingSafeEqual(provBuf, secBuf);
      }
    } catch {
      isSecretValid = false;
    }
  }

  if (!isSecretValid) {
    registerPartnerFailure(partnerClientIp, now);
    res.status(401).json({
      error: {
        code: 'INVALID_PARTNER_SECRET',
        message: 'Clave secreta o PIN de Partner incorrecto',
      },
    });
    return;
  }
  partnerAttempts.delete(partnerClientIp);

  const resellerId = `reseller_${crypto.createHash('sha256').update(cleanCode).digest('hex').substring(0, 10)}`;
  const email = partnerEmail ? partnerEmail.trim().toLowerCase() : `${cleanCode.toLowerCase()}@partner.cristianjm.com`;

  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload: AdminJwtPayload = {
    sub: email,
    role: 'RESELLER',
    organizationId: resellerId,
    resellerId: cleanCode,
    exp,
  };

  const token = AuthService.createToken(payload);

  res.json({
    success: true,
    token,
    user: {
      email,
      partnerCode: cleanCode,
      role: 'RESELLER',
      resellerId: cleanCode,
      organizationId: resellerId,
    },
    expiresAt: new Date(exp).toISOString(),
  });
}
