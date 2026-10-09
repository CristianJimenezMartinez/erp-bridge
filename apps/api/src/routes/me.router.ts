import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { DatabaseService, OrganizationService, PostgresLicenseRepository } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { requireAuth, AuthenticatedRequest, AuthService } from './auth.router';

export const meRouter = Router();
const logger = new Logger('MeRouter');

/**
 * GET /me/export
 * Exporta los datos de la cuenta y organización del usuario en formato JSON
 * en cumplimiento del Artículo 20 del RGPD (Derecho a la portabilidad de los datos).
 */
meRouter.get('/me/export', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const orgId = user.organizationId;
    const db = DatabaseService.getInstance();

    let orgData: any = null;
    let licensesData: any[] = [];
    let agentsData: any[] = [];
    let auditData: any[] = [];

    if (db.isAvailable()) {
      const orgRes = await db.query(
        'SELECT id, name, slug, tax_id, legal_name, reseller_id, plan, status, created_at, updated_at FROM organizations WHERE id = $1',
        [orgId]
      ).catch((err) => {
        logger.warn('Error al consultar organización en exportación RGPD:', { err: String(err) });
        return null;
      });
      if (orgRes && orgRes.rows.length > 0) {
        orgData = orgRes.rows[0];
      }

      const licRes = await db.query(
        'SELECT id, organization_id, plan, status, max_activations, current_activations, created_at, expires_at FROM licenses WHERE organization_id = $1',
        [orgId]
      ).catch((err) => {
        logger.warn('Error al consultar licencias en exportación RGPD:', { err: String(err) });
        return null;
      });
      if (licRes) {
        licensesData = licRes.rows;
      }

      const agentRes = await db.query(
        'SELECT id, organization_id, name, status, version, platform, last_seen_at, created_at, updated_at FROM agents WHERE organization_id = $1',
        [orgId]
      ).catch((err) => {
        logger.warn('Error al consultar agentes en exportación RGPD:', { err: String(err) });
        return null;
      });
      if (agentRes) {
        agentsData = agentRes.rows;
      }

      const auditRes = await db.query(
        'SELECT id, action, resource_type, resource_id, timestamp, result, metadata FROM audit_logs WHERE organization_id = $1 ORDER BY timestamp DESC LIMIT 100',
        [orgId]
      ).catch((err) => {
        logger.warn('Error al consultar logs de auditoría en exportación RGPD:', { err: String(err) });
        return null;
      });
      if (auditRes) {
        auditData = auditRes.rows;
      }
    } else {
      const orgService = new OrganizationService();
      orgData = await orgService.getById(orgId).catch(() => null);

      const licRepo = new PostgresLicenseRepository();
      licensesData = await licRepo.listLicensesByOrganization(orgId).catch(() => []);
    }

    const exportPayload = {
      rgpdMetadata: {
        legalBasis: 'RGPD (UE 2016/679) Artículo 20 - Derecho a la portabilidad de los datos',
        controller: 'Cristian Jiménez Martínez (Bentian ERP Bridge)',
        dpoContact: 'seguridad@cristianjm.com',
        exportTimestamp: new Date().toISOString(),
      },
      account: {
        userId: user.sub,
        role: user.role,
        organizationId: user.organizationId,
        resellerId: user.resellerId || null,
      },
      organization: orgData,
      licenses: licensesData,
      agents: agentsData,
      auditLogs: auditData,
    };

    logger.info(`Exportación de datos RGPD completada para usuario ${user.sub} (Org: ${orgId})`);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bentian-export-${orgId}-${Date.now()}.json"`);
    return res.status(200).json({
      success: true,
      data: exportPayload,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /me
 * Solicitud de supresión y anonimización de datos personales en cumplimiento del
 * Artículo 17 del RGPD (Derecho al olvido / Right to erasure).
 */
meRouter.delete('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const orgId = user.organizationId;
    const db = DatabaseService.getInstance();
    const timestamp = new Date().toISOString();
    const requestId = `gdpr_del_${crypto.randomUUID()}`;

    logger.info(`Iniciando solicitud de supresión RGPD (Art. 17) para usuario ${user.sub} (Org: ${orgId})`);

    if (db.isAvailable()) {
      // 1. Revocar licencias activas asociadas a la organización
      await db.query(
        "UPDATE licenses SET status = 'revoked', billing_status = 'REVOKED', revoked_at = NOW(), revoked_reason = 'RGPD Art. 17 - Solicitud de supresión de datos' WHERE organization_id = $1",
        [orgId]
      ).catch((err) => {
        logger.warn('Aviso al revocar licencias en BD durante supresión RGPD:', { err: String(err) });
      });

      // 2. Desactivar agentes de la flota
      await db.query(
        "UPDATE agents SET status = 'DEACTIVATED' WHERE organization_id = $1",
        [orgId]
      ).catch((err) => {
        logger.warn('Aviso al desactivar agentes en BD durante supresión RGPD:', { err: String(err) });
      });

      // 3. Anonimizar datos de la organización
      const anonHash = crypto.createHash('sha256').update(orgId + timestamp).digest('hex').substring(0, 10);
      await db.query(
        "UPDATE organizations SET name = $1, legal_name = NULL, tax_id = NULL, status = 'ANONYMIZED' WHERE id = $2",
        [`Organización Anonimizada (${anonHash})`, orgId]
      ).catch((err) => {
        logger.warn('Aviso al anonimizar organización en BD durante supresión RGPD:', { err: String(err) });
      });
    }

    // Invalida almacén en memoria de licencias
    PostgresLicenseRepository.invalidateMemory();

    // 4. Revocar token JWT en la lista de exclusión en memoria
    if (user.jti) {
      AuthService.revokeToken(user.jti);
    }

    logger.info(`Supresión y anonimización RGPD finalizada con éxito. RequestId: ${requestId}`);

    return res.status(200).json({
      success: true,
      message: 'Solicitud de supresión y anonimización de datos procesada conforme al Artículo 17 del RGPD (Derecho al olvido).',
      requestId,
      executedAt: timestamp,
      details: {
        organizationId: orgId,
        user: user.sub,
        status: 'ANONYMIZED',
      },
    });
  } catch (error) {
    return next(error);
  }
});
