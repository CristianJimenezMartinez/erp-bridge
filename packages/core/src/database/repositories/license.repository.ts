import { License, LicenseActivation } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface ILicenseRepository {
  createLicense(license: License): Promise<License>;
  findLicenseById(id: string): Promise<License | null>;
  findLicenseByKey(key: string): Promise<License | null>;
  listLicensesByOrganization(organizationId: string): Promise<License[]>;
  updateLicense(license: License): Promise<License>;
  createActivation(activation: LicenseActivation): Promise<LicenseActivation>;
  findActivation(licenseId: string, hwid: string): Promise<LicenseActivation | null>;
  listActivationsByLicense(licenseId: string): Promise<LicenseActivation[]>;
  updateActivationValidation(activationId: string): Promise<void>;
  deactivateActivation(activationId: string): Promise<void>;
}

export class PostgresLicenseRepository implements ILicenseRepository {
  private static readonly memoryLicenses: Map<string, License> = new Map();
  private static readonly memoryActivations: Map<string, LicenseActivation> = new Map();

  constructor(private db: DatabaseService = DatabaseService.getInstance()) {}

  async createLicense(license: License): Promise<License> {
    PostgresLicenseRepository.memoryLicenses.set(license.id, { ...license });

    try {
      await this.db.query(
        `INSERT INTO licenses (id, key, organization_id, plan, status, max_activations, current_activations, created_at, expires_at, trial_ends_at, revoked_at, revoked_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE
         SET status = $5, current_activations = $7, expires_at = $9, revoked_at = $11, revoked_reason = $12`,
        [
          license.id,
          license.key,
          license.organizationId,
          license.plan,
          license.status,
          license.maxActivations,
          license.currentActivations,
          license.createdAt,
          license.expiresAt || null,
          license.trialEndsAt || null,
          license.revokedAt || null,
          license.revokedReason || null,
        ]
      );
    } catch {}

    return license;
  }

  async findLicenseById(id: string): Promise<License | null> {
    const mem = PostgresLicenseRepository.memoryLicenses.get(id);
    if (mem) return { ...mem };

    try {
      const res = await this.db.query(
        `SELECT id, key, organization_id, plan, status, max_activations, current_activations, created_at, expires_at, trial_ends_at, revoked_at, revoked_reason
         FROM licenses
         WHERE id = $1`,
        [id]
      );
      const row = res.rows[0];
      if (!row) return null;
      return this.mapLicenseRow(row as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async findLicenseByKey(key: string): Promise<License | null> {
    for (const lic of PostgresLicenseRepository.memoryLicenses.values()) {
      if (lic.key === key) return { ...lic };
    }

    try {
      const res = await this.db.query(
        `SELECT id, key, organization_id, plan, status, max_activations, current_activations, created_at, expires_at, trial_ends_at, revoked_at, revoked_reason
         FROM licenses
         WHERE key = $1`,
        [key]
      );
      const row = res.rows[0];
      if (!row) return null;
      return this.mapLicenseRow(row as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async listLicensesByOrganization(organizationId: string): Promise<License[]> {
    const memList = Array.from(PostgresLicenseRepository.memoryLicenses.values()).filter(
      (l) => l.organizationId === organizationId
    );

    try {
      const res = await this.db.query(
        `SELECT id, key, organization_id, plan, status, max_activations, current_activations, created_at, expires_at, trial_ends_at, revoked_at, revoked_reason
         FROM licenses
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [organizationId]
      );
      const dbList = res.rows.map((row) => this.mapLicenseRow(row as Record<string, unknown>));
      const map = new Map<string, License>();
      for (const l of dbList) map.set(l.id, l);
      for (const l of memList) map.set(l.id, l);
      return Array.from(map.values());
    } catch {
      return memList;
    }
  }

  async updateLicense(license: License): Promise<License> {
    PostgresLicenseRepository.memoryLicenses.set(license.id, { ...license });

    try {
      await this.db.query(
        `UPDATE licenses
         SET plan = $2, status = $3, max_activations = $4, current_activations = $5, expires_at = $6, trial_ends_at = $7, revoked_at = $8, revoked_reason = $9
         WHERE id = $1`,
        [
          license.id,
          license.plan,
          license.status,
          license.maxActivations,
          license.currentActivations,
          license.expiresAt || null,
          license.trialEndsAt || null,
          license.revokedAt || null,
          license.revokedReason || null,
        ]
      );
    } catch {}

    return license;
  }

  async createActivation(activation: LicenseActivation): Promise<LicenseActivation> {
    PostgresLicenseRepository.memoryActivations.set(activation.id, { ...activation });

    try {
      await this.db.query(
        `INSERT INTO license_activations (id, license_id, hwid, agent_id, machine_info, activated_at, last_validated_at, deactivated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (license_id, hwid) DO UPDATE
         SET agent_id = $4, machine_info = $5, last_validated_at = $7, deactivated_at = $8`,
        [
          activation.id,
          activation.licenseId,
          activation.hwid,
          activation.agentId || null,
          activation.machineInfo ? JSON.stringify(activation.machineInfo) : null,
          activation.activatedAt,
          activation.lastValidatedAt,
          activation.deactivatedAt || null,
        ]
      );
    } catch {}

    return activation;
  }

  async findActivation(licenseId: string, hwid: string): Promise<LicenseActivation | null> {
    for (const act of PostgresLicenseRepository.memoryActivations.values()) {
      if (act.licenseId === licenseId && act.hwid === hwid && !act.deactivatedAt) {
        return { ...act };
      }
    }

    try {
      const res = await this.db.query(
        `SELECT id, license_id, hwid, agent_id, machine_info, activated_at, last_validated_at, deactivated_at
         FROM license_activations
         WHERE license_id = $1 AND hwid = $2 AND deactivated_at IS NULL`,
        [licenseId, hwid]
      );
      const row = res.rows[0];
      if (!row) return null;
      return this.mapActivationRow(row as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async listActivationsByLicense(licenseId: string): Promise<LicenseActivation[]> {
    const memList = Array.from(PostgresLicenseRepository.memoryActivations.values()).filter(
      (a) => a.licenseId === licenseId && !a.deactivatedAt
    );

    try {
      const res = await this.db.query(
        `SELECT id, license_id, hwid, agent_id, machine_info, activated_at, last_validated_at, deactivated_at
         FROM license_activations
         WHERE license_id = $1 AND deactivated_at IS NULL
         ORDER BY activated_at DESC`,
        [licenseId]
      );
      const dbList = res.rows.map((row) => this.mapActivationRow(row as Record<string, unknown>));
      const map = new Map<string, LicenseActivation>();
      for (const a of dbList) map.set(a.id, a);
      for (const a of memList) map.set(a.id, a);
      return Array.from(map.values());
    } catch {
      return memList;
    }
  }

  async updateActivationValidation(activationId: string): Promise<void> {
    const mem = PostgresLicenseRepository.memoryActivations.get(activationId);
    if (mem) {
      mem.lastValidatedAt = new Date();
    }

    try {
      await this.db.query(
        `UPDATE license_activations
         SET last_validated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [activationId]
      );
    } catch {}
  }

  async deactivateActivation(activationId: string): Promise<void> {
    const mem = PostgresLicenseRepository.memoryActivations.get(activationId);
    if (mem) {
      mem.deactivatedAt = new Date();
    }

    try {
      await this.db.query(
        `UPDATE license_activations
         SET deactivated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [activationId]
      );
    } catch {}
  }

  private mapLicenseRow(row: Record<string, unknown>): License {
    return {
      id: row['id'] as string,
      key: row['key'] as string,
      organizationId: row['organization_id'] as string,
      plan: row['plan'] as License['plan'],
      status: row['status'] as License['status'],
      maxActivations: Number(row['max_activations']),
      currentActivations: Number(row['current_activations']),
      createdAt: new Date(row['created_at'] as string),
      expiresAt: row['expires_at'] ? new Date(row['expires_at'] as string) : undefined,
      trialEndsAt: row['trial_ends_at'] ? new Date(row['trial_ends_at'] as string) : undefined,
      revokedAt: row['revoked_at'] ? new Date(row['revoked_at'] as string) : undefined,
      revokedReason: row['revoked_reason'] ? (row['revoked_reason'] as string) : undefined,
    };
  }

  private mapActivationRow(row: Record<string, unknown>): LicenseActivation {
    let machineInfo = row['machine_info'] as Record<string, unknown> | undefined;
    if (typeof machineInfo === 'string') {
      try {
        machineInfo = JSON.parse(machineInfo) as Record<string, unknown>;
      } catch {}
    }

    return {
      id: row['id'] as string,
      licenseId: row['license_id'] as string,
      hwid: row['hwid'] as string,
      agentId: row['agent_id'] ? (row['agent_id'] as string) : undefined,
      machineInfo,
      activatedAt: new Date(row['activated_at'] as string),
      lastValidatedAt: new Date(row['last_validated_at'] as string),
      deactivatedAt: row['deactivated_at'] ? new Date(row['deactivated_at'] as string) : undefined,
    };
  }
}
