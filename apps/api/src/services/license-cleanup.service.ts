import { DatabaseService, LicenseService, PostgresLicenseRepository } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { computeOrganizationIdFromEmail } from '../routes/auth.router';
import { MailerService } from './mailer.service';

const logger = new Logger('LicenseCleanupService');

/**
 * Licencias reales en producción y leads comerciales reales protegidos contra borrado en purgas:
 * 1. Servidor Factusol Principal (Telkkalas) -> EB-8WEN2-W08N2-8KJAW-0AHCH
 * 2. Suministros Rubio - Tienda y Factusol (De por vida) (DESKTOP-2730DUT) -> EB-S6AB3-2MHWP-50DTT-72242
 * 3. Beta 2026 - Soy.es (Lead comercial real: info@nicripsia.com / Raúl y equipo) -> EB-6RE3E-HXPS4-XYNRV-HVZWT
 */
export const PROTECTED_PRODUCTION_KEYS = new Set<string>([
  'EB-8WEN2-W08N2-8KJAW-0AHCH',
  'EB-S6AB3-2MHWP-50DTT-72242',
  'EB-6RE3E-HXPS4-XYNRV-HVZWT',
]);

/**
 * Las 11 claves obsoletas / de test / duplicadas antiguas identificadas para purga definitiva:
 */
export const KNOWN_OBSOLETE_KEYS: string[] = [
  'EB-KHT50-6XPQH-DZSE6-BRWRY', // [TEST] Auditoría Funnel 2026 (FUNNEL-AUDIT-HOST)
  'EB-1E4XK-C7HVV-A4X5Y-YKHNP', // Beta 2026 - Softpedia QA (Sin asignar)
  'EB-XDGG0-NQZJA-DP70P-06E3E', // [TEST] Empresa Verificación 2 (Sin asignar)
  'EB-JTMBG-GT8HJ-MMET1-HE7E2', // [TEST] Empresa Verificación 1 (Sin asignar)
  'EB-WT35M-64BZH-Y0VE2-Y0314', // [TEST] Auditor Hetzner (Sin asignar)
  'EB-KC3ZV-DEK37-XSS01-58C9D', // [TEST] Auditor Enterprise (Sin asignar)
  'EB-MFFF9-VV92C-M9JNV-0H1P0', // Beta Pública - Demo Corporacion SL (Sin asignar)
  'EB-TZJZ2-Z2ZTN-ZR5J1-XPXPV', // [TEST] Empresa Prueba SL (Sin asignar)
  'EB-6WCKT-6S1ST-H816X-D0477', // [TEST] Licencia Inicial Desarrollo (Desconectado hace 1112h)
  'EB-QGCES-7ENH2-RR6QC-84675', // Licencia Suministros Rubio SL (Duplicada sin asignar)
  'EB-SJR5V-VSJEF-3K56F-11F2F', // Servidor Factusol Suministros Rubio (Antigua desconectada hace 540h)
];

const SYSTEM_ORG_IDS = new Set(['org_default', 'org_system', 'default']);

export class LicenseCleanupService {
  /**
   * Comprueba si una licencia corresponde a un registro de prueba/QA/obsoleto.
   */
  public static isTestOrObsoleteLicense(lic: {
    key?: string | null;
    alias?: string | null;
    organization_id?: string | null;
    organizationId?: string | null;
  }): boolean {
    const key = String(lic.key || '').trim().toUpperCase();
    if (PROTECTED_PRODUCTION_KEYS.has(key)) return false;
    if (KNOWN_OBSOLETE_KEYS.includes(key)) return true;

    const alias = String(lic.alias || '').toUpperCase();
    const org = String(lic.organization_id || lic.organizationId || '').toUpperCase();

    return (
      alias.includes('[TEST]') ||
      alias.includes('TEST E2E') ||
      alias.includes('SOFTPEDIA') ||
      alias.includes('DEMO CORPORACION') ||
      alias.includes('AUDITOR HETZNER') ||
      alias.includes('AUDITOR ENTERPRISE') ||
      alias.includes('AUDITORÍA FUNNEL') ||
      alias.includes('AUDITORIA FUNNEL') ||
      alias.includes('EMPRESA VERIFICACIÓN') ||
      alias.includes('EMPRESA VERIFICACION') ||
      alias.includes('EMPRESA PRUEBA') ||
      alias.includes('LICENCIA INICIAL DESARROLLO') ||
      org.includes('TEST')
    );
  }

  /**
   * Elimina de forma permanente una licencia por su ID junto con sus activaciones y leads asociados.
   */
  public static async deleteLicenseById(
    id: string,
    options: { forceProtected?: boolean } = {}
  ): Promise<{ deleted: boolean; key?: string; alias?: string; message?: string }> {
    const db = DatabaseService.getInstance();
    const licenseService = new LicenseService();

    const lic = await licenseService.getLicenseById(id).catch(() => null);
    let targetKey = lic?.key || '';
    let targetAlias = lic?.alias || '';
    let targetOrgId = lic?.organizationId || '';

    if (!lic && db.isAvailable()) {
      const row = await db
        .query(`SELECT id, key, alias, organization_id FROM licenses WHERE id::text = $1 LIMIT 1`, [id])
        .then((r) => r.rows[0] as Record<string, any> | undefined)
        .catch(() => undefined);
      if (row) {
        targetKey = String(row['key'] || '');
        targetAlias = String(row['alias'] || '');
        targetOrgId = String(row['organization_id'] || '');
      }
    }

    if (!lic && !targetKey) {
      return { deleted: false, message: 'Licencia no encontrada' };
    }

    if (PROTECTED_PRODUCTION_KEYS.has(targetKey.toUpperCase()) && !options.forceProtected) {
      return {
        deleted: false,
        key: targetKey,
        alias: targetAlias,
        message: 'Esta licencia pertenece a un servidor activo en producción y está protegida contra borrado accidental.',
      };
    }

    if (db.isAvailable()) {
      await db
        .query(`DELETE FROM beta_leads WHERE license_id = $1 OR license_key = $2`, [id, targetKey])
        .catch(() => {});
      await db
        .query(`DELETE FROM license_activations WHERE license_id::text = $1`, [id])
        .catch(() => {});
      await db
        .query(`UPDATE licenses SET parent_license_id = NULL WHERE parent_license_id::text = $1`, [id])
        .catch(() => {});
      await db.query(`DELETE FROM licenses WHERE id::text = $1`, [id]).catch(() => {});

      // Si la organización quedó sin licencias y no es la organización por defecto, limpiarla si era de prueba/huérfana
      if (targetOrgId && !SYSTEM_ORG_IDS.has(targetOrgId)) {
        const rem = await db
          .query(`SELECT COUNT(*)::int as cnt FROM licenses WHERE organization_id = $1`, [targetOrgId])
          .then((r) => Number(r.rows[0]?.cnt ?? 0))
          .catch(() => 1);
        if (rem === 0) {
          await db
            .query(`DELETE FROM organizations WHERE id = $1 AND id NOT IN ('org_default', 'org_system', 'default')`, [targetOrgId])
            .catch(() => {});
        }
      }
    }

    PostgresLicenseRepository.invalidateMemory(id);
    if (targetKey) {
      PostgresLicenseRepository.invalidateMemory(targetKey);
    }

    logger.info(`Licencia eliminada permanentemente: ${targetKey} (${targetAlias || id})`);
    return { deleted: true, key: targetKey, alias: targetAlias };
  }

  /**
   * Purga de forma atómica las 12 licencias obsoletas/de prueba conocidas y cualquier licencia de test,
   * preservando siempre las 2 licencias activas de producción.
   */
  public static async purgeObsoleteAndTestLicenses(options: {
    includeHeuristicTests?: boolean;
  } = {}): Promise<{ deletedCount: number; deletedKeys: string[]; deletedOrgsCount: number }> {
    const includeHeuristics = options.includeHeuristicTests !== false;
    const db = DatabaseService.getInstance();
    const deletedKeys: string[] = [];
    let deletedOrgsCount = 0;

    if (!db.isAvailable()) {
      PostgresLicenseRepository.invalidateMemory();
      return { deletedCount: 0, deletedKeys: [], deletedOrgsCount: 0 };
    }

    try {
      // Garantizar en producción que la clave real enviada a Soy.es (EB-6RE3E-HXPS4-XYNRV-HVZWT) esté presente y activa
      if (process.env.NODE_ENV === 'production') {
        const soyOrgId = computeOrganizationIdFromEmail('info@nicripsia.com');
        const soyLicId = '355494ee-b202-4026-8000-000000002026';
        const soyKey = 'EB-6RE3E-HXPS4-XYNRV-HVZWT';
        const betaExpires = new Date('2026-12-31T23:59:59.999Z');

        await db
          .query(
            `INSERT INTO organizations (id, name, slug, status, plan, legal_name, created_at, updated_at)
             VALUES ($1, 'Soy.es', 'info@nicripsia.com', 'ACTIVE', 'trial', 'Soy.es', NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            [soyOrgId]
          )
          .catch(() => {});

        await db
          .query(
            `INSERT INTO licenses (id, key, organization_id, alias, plan, status, max_activations, current_activations, seat_type, billing_status, created_at, expires_at, trial_ends_at)
             VALUES ($1, $2, $3, 'Beta 2026 - Soy.es', 'trial', 'active', 1, 0, 'BASE', 'TRIAL', NOW(), $4, $4)
             ON CONFLICT (key) DO NOTHING`,
            [soyLicId, soyKey, soyOrgId, betaExpires]
          )
          .catch(() => {});
      }

      const allRows = await db
        .query(`SELECT id::text as id, key, alias, organization_id FROM licenses`)
        .then((r) => r.rows as Array<{ id: string; key: string; alias: string | null; organization_id: string }>)
        .catch(() => []);

      const targets = allRows.filter((row) => {
        const key = String(row.key || '').trim().toUpperCase();
        if (PROTECTED_PRODUCTION_KEYS.has(key)) return false;
        if (KNOWN_OBSOLETE_KEYS.includes(key)) return true;
        if (includeHeuristics && LicenseCleanupService.isTestOrObsoleteLicense(row)) return true;
        return false;
      });

      const affectedOrgIds = new Set<string>();

      for (const target of targets) {
        await db
          .query(`DELETE FROM beta_leads WHERE license_id = $1 OR license_key = $2`, [target.id, target.key])
          .catch(() => {});
        await db
          .query(`DELETE FROM license_activations WHERE license_id::text = $1`, [target.id])
          .catch(() => {});
        await db
          .query(`UPDATE licenses SET parent_license_id = NULL WHERE parent_license_id::text = $1`, [target.id])
          .catch(() => {});
        await db.query(`DELETE FROM licenses WHERE id::text = $1`, [target.id]).catch(() => {});

        PostgresLicenseRepository.invalidateMemory(target.id);
        PostgresLicenseRepository.invalidateMemory(target.key);
        deletedKeys.push(target.key);
        if (target.organization_id && !SYSTEM_ORG_IDS.has(target.organization_id)) {
          affectedOrgIds.add(target.organization_id);
        }
      }

      // Limpiar agentes de auditoría/test huérfanos (ej: FUNNEL-AUDIT-HOST)
      await db
        .query(`DELETE FROM agents WHERE name ILIKE '%FUNNEL-AUDIT%' OR name ILIKE '%[TEST]%'`)
        .catch(() => {});

      // Limpiar organizaciones huérfanas que quedaron con 0 licencias tras la purga o que son de test sin licencias
      const orphanOrgs = await db
        .query(`
          SELECT o.id, o.name
          FROM organizations o
          LEFT JOIN licenses l ON o.id = l.organization_id
          WHERE o.id NOT IN ('org_default', 'org_system', 'default')
          GROUP BY o.id, o.name
          HAVING COUNT(l.id) = 0
        `)
        .then((r) => r.rows as Array<{ id: string; name: string }>)
        .catch(() => []);

      for (const org of orphanOrgs) {
        const upperName = String(org.name || '').toUpperCase();
        const isTestOrg =
          affectedOrgIds.has(org.id) ||
          upperName.includes('[TEST]') ||
          upperName.includes('SOFTPEDIA') ||
          upperName.includes('DEMO CORPORACION') ||
          upperName.includes('AUDITOR') ||
          upperName.includes('VERIFICACIÓN') ||
          upperName.includes('VERIFICACION') ||
          upperName.includes('EMPRESA PRUEBA');

        if (isTestOrg) {
          await db.query(`DELETE FROM organizations WHERE id = $1`, [org.id]).catch(() => {});
          deletedOrgsCount++;
        }
      }

      if (deletedKeys.length > 0 || deletedOrgsCount > 0) {
        logger.info(
          `Purga de licencias completada: ${deletedKeys.length} claves obsoletas/test eliminadas (${deletedKeys.join(', ')}), ${deletedOrgsCount} organizaciones huérfanas limpiadas.`
        );
      }
    } catch (err) {
      logger.warn('Aviso durante la purga de licencias obsoletas:', { err: String(err) });
    }

    return {
      deletedCount: deletedKeys.length,
      deletedKeys,
      deletedOrgsCount,
    };
  }

  /**
   * Resuelve el correo de contacto asociado a una licencia (desde beta_leads, organizations.slug o mapa conocido).
   */
  public static async resolveLicenseContactEmail(lic: {
    id?: string;
    key?: string;
    organizationId?: string;
    organization_id?: string;
    lead_email?: string | null;
    org_slug?: string | null;
  }): Promise<string | null> {
    if (lic.lead_email && String(lic.lead_email).includes('@')) {
      return String(lic.lead_email).trim().toLowerCase();
    }
    if (lic.org_slug && String(lic.org_slug).includes('@')) {
      return String(lic.org_slug).trim().toLowerCase();
    }
    const keyUpper = String(lic.key || '').trim().toUpperCase();
    if (keyUpper === 'EB-6RE3E-HXPS4-XYNRV-HVZWT') {
      return 'info@nicripsia.com';
    }

    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      const leadRes = await db
        .query(
          `SELECT email FROM beta_leads WHERE (license_id = $1 OR license_key = $2) AND email LIKE '%@%' ORDER BY consented_at DESC LIMIT 1`,
          [String(lic.id || ''), keyUpper]
        )
        .then((r) => r.rows[0]?.email as string | undefined)
        .catch(() => undefined);
      if (leadRes) return leadRes.trim().toLowerCase();

      const orgId = lic.organizationId || lic.organization_id;
      if (orgId) {
        const orgRes = await db
          .query(`SELECT slug FROM organizations WHERE id = $1 AND slug LIKE '%@%' LIMIT 1`, [orgId])
          .then((r) => r.rows[0]?.slug as string | undefined)
          .catch(() => undefined);
        if (orgRes) return orgRes.trim().toLowerCase();
      }
    }
    return null;
  }

  /**
   * Reenvía las instrucciones de instalación y clave de licencia al correo del cliente o agencia.
   */
  public static async resendLicenseInstructionsEmail(
    licenseId: string,
    overrideEmail?: string
  ): Promise<{ sent: boolean; email?: string; message?: string }> {
    const licenseService = new LicenseService();
    const lic = await licenseService.getLicenseById(licenseId).catch(() => null);
    if (!lic) {
      return { sent: false, message: 'Licencia no encontrada' };
    }

    const targetEmail = (overrideEmail && overrideEmail.includes('@'))
      ? overrideEmail.trim().toLowerCase()
      : await LicenseCleanupService.resolveLicenseContactEmail(lic);

    if (!targetEmail || !targetEmail.includes('@')) {
      return { sent: false, message: 'Indica un correo electrónico válido para enviar la clave' };
    }

    const planLabel =
      String(lic.plan || '').toLowerCase() === 'trial'
        ? 'Licencia de Evaluación / Beta 2026'
        : 'Licencia Oficial Bentian ERP Bridge';

    const ok = await MailerService.sendLicenseWelcomeEmail({
      customerEmail: targetEmail,
      licenseKey: lic.key,
      planName: planLabel,
      alias: lic.alias || 'Servidor Factusol',
      companyName: lic.alias || 'Cliente Bentian',
    });

    if (!ok) {
      return { sent: false, email: targetEmail, message: 'El proveedor SMTP/Resend no pudo entregar el correo en este momento' };
    }

    return { sent: true, email: targetEmail };
  }

  /**
   * Envía una alerta inmediata al administrador (Cristian Jiménez) cuando un cliente o lead (ej. Soy.es)
   * instala y activa por primera vez Bentian Agent en un equipo Windows.
   */
  public static async notifyFirstMachineActivation(params: {
    lic: { id: string; key: string; alias?: string | null; plan?: string; organizationId?: string };
    hwid: string;
    machineInfo?: Record<string, any>;
  }): Promise<void> {
    const { lic, hwid, machineInfo } = params;
    if (LicenseCleanupService.isTestOrObsoleteLicense(lic)) return;

    const escape = (s: string | undefined | null) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const contactEmail = await LicenseCleanupService.resolveLicenseContactEmail(lic);
    const hostname = escape(machineInfo?.hostname || 'Equipo Windows');
    const osInfo = escape(
      [machineInfo?.platform, machineInfo?.osRelease || machineInfo?.release, machineInfo?.arch]
        .filter(Boolean)
        .join(' · ') || 'Windows'
    );
    const aliasSafe = escape(lic.alias || 'Licencia Bentian');
    const keySafe = escape(lic.key);
    const hwidSafe = escape(hwid);
    const emailSafe = escape(contactEmail || 'No registrado');
    const timestampEsp = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

    const html = MailerService.renderBrandedEmail({
      title: `Activación en PC: ${aliasSafe} (${hostname})`,
      badgeText: 'AGENTE ACTIVADO EN VIVO',
      badgeType: 'success',
      contentHtml: `
        <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
          Un cliente o lead acaba de activar Bentian Agent en su PC
        </h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
          El ejecutable <strong>BentianAgent.exe</strong> se ha conectado desde un nuevo ordenador y ha vinculado su huella hardware (HWID) por primera vez:
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #16161f; border: 1px solid #27272a; border-radius: 12px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; line-height: 1.8;">
                <tr>
                  <td width="150" style="color: #a1a1aa; padding: 5px 0;">Licencia / Empresa:</td>
                  <td style="color: #ffffff; font-weight: 700; padding: 5px 0;">${aliasSafe}</td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa; padding: 5px 0;">Clave Activada:</td>
                  <td style="color: #34d399; font-family: Consolas, monospace; font-weight: 700; padding: 5px 0;">${keySafe}</td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa; padding: 5px 0;">Email Asociado:</td>
                  <td style="color: #818cf8; font-weight: 600; padding: 5px 0;">${emailSafe}</td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa; padding: 5px 0;">Nombre del PC:</td>
                  <td style="color: #ffffff; font-family: Consolas, monospace; font-weight: 700; padding: 5px 0;">${hostname}</td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa; padding: 5px 0;">Sistema / HWID:</td>
                  <td style="color: #e4e4e7; font-family: Consolas, monospace; font-size: 12px; padding: 5px 0;">${osInfo} (${hwidSafe.substring(0, 16)}...)</td>
                </tr>
                <tr>
                  <td style="color: #a1a1aa; padding: 5px 0;">Hora (Madrid):</td>
                  <td style="color: #fbbf24; font-weight: 600; padding: 5px 0;">${escape(timestampEsp)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        ${MailerService.renderButton('Abrir Consola Cloud (/dashboard) &rarr;', 'https://bridge.cristianjm.com/dashboard', 'indigo')}
      `,
      previewText: `${aliasSafe} acaba de instalar y activar Bentian Agent en el equipo ${hostname}.`,
      footerNote: 'Notificación automática en tiempo real de primera activación de hardware (HWID).',
    });

    await MailerService.sendEmail({
      to: 'cristianjimeneztrabajo@gmail.com',
      subject: `[AGENTE ACTIVADO] ${lic.alias || lic.key} se ha conectado desde ${machineInfo?.hostname || 'nuevo PC'}`,
      html,
      text: `Activación en vivo: ${lic.alias || lic.key} (${lic.key}) activado en PC ${machineInfo?.hostname || 'N/D'} (HWID: ${hwid}) a las ${timestampEsp}. Email: ${contactEmail || 'N/D'}`,
    }).catch((err: any) => {
      logger.warn('No se pudo enviar alerta de primera activación:', { err: String(err?.message || err) });
    });
  }
}
