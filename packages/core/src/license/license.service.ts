import { v4 as uuidv4 } from 'uuid';
import {
  CreateLicenseDto,
  CreateLicenseDtoSchema,
  License,
  LicenseActivation,
  LicenseActivationRequest,
  LicenseActivationRequestSchema,
  LicenseActivationResponse,
  LicenseValidationRequest,
  LicenseValidationRequestSchema,
  LicenseValidationResponse,
  LicenseWithActivations,
  Logger,
} from '@erp-bridge/shared';
import { ILicenseRepository, PostgresLicenseRepository } from '../database/repositories/license.repository';
import { LicenseKeyGenerator } from './license-key.generator';
import { LicenseTokenManager } from './license-token';
import {
  buildFleetOverview,
  FleetOverviewSummary,
  GRACE_PERIOD_DAYS,
  GRACE_PERIOD_MS,
  issueSignedMachineToken,
  verifyLicenseActiveState,
  withLicenseKeyLock,
} from './license-fleet.helper';
import { EventBus } from '../events/event-bus';

export class LicenseService {
  private readonly logger = new Logger('LicenseService');

  constructor(
    private repository: ILicenseRepository = new PostgresLicenseRepository(),
    private eventBus: EventBus = EventBus.getInstance()
  ) {}

  public async createLicense(dto: CreateLicenseDto): Promise<License> {
    const validated = CreateLicenseDtoSchema.parse(dto);
    const key = LicenseKeyGenerator.generate();

    let expiresAt: Date | undefined;
    let trialEndsAt: Date | undefined;

    if (validated.trialDays) {
      trialEndsAt = new Date(Date.now() + validated.trialDays * 86400000);
      expiresAt = trialEndsAt;
    } else if (validated.expiresAt) {
      expiresAt = new Date(validated.expiresAt);
    }

    const license: License = {
      id: uuidv4(),
      key,
      organizationId: validated.organizationId,
      alias: validated.alias || null,
      plan: validated.plan,
      status: 'active',
      maxActivations: validated.maxActivations ?? 1,
      currentActivations: 0,
      createdAt: new Date(),
      expiresAt,
      trialEndsAt,
    };

    const created = await this.repository.createLicense(license);
    this.logger.info(`Licencia creada con éxito: ${created.key} (Plan: ${created.plan}, Máx: ${created.maxActivations})`);
    return created;
  }

  public async getLicenseByKey(key: string): Promise<License | null> {
    const normalized = LicenseKeyGenerator.normalize(key);
    return this.repository.findLicenseByKey(normalized);
  }

  public async getLicenseById(id: string): Promise<License | null> {
    return this.repository.findLicenseById(id);
  }

  public async listLicenses(organizationId: string): Promise<License[]> {
    return this.repository.listLicensesByOrganization(organizationId);
  }

  public async listActivations(licenseId: string): Promise<LicenseActivation[]> {
    return this.repository.listActivationsByLicense(licenseId);
  }

  public async listLicensesWithActivations(organizationId: string): Promise<LicenseWithActivations[]> {
    const licenses = await this.repository.listLicensesByOrganization(organizationId);
    const result: LicenseWithActivations[] = [];
    for (const lic of licenses) {
      const activations = await this.repository.listActivationsByLicense(lic.id);
      result.push({ ...lic, activations });
    }
    return result;
  }

  public async updateLicenseAlias(licenseId: string, alias: string): Promise<void> {
    await this.repository.updateLicenseAlias(licenseId, alias);
    this.logger.info(`Alias de licencia ${licenseId} actualizado a: "${alias}"`);
  }

  public async unbindMachine(licenseId: string, hwid: string): Promise<{ success: boolean; message?: string }> {
    return withLicenseKeyLock(licenseId, async () => {
      const license = await this.repository.findLicenseById(licenseId);
      if (!license) return { success: false, message: 'Licencia no encontrada' };

      const activation = await this.repository.findActivation(license.id, hwid);
      if (!activation) return { success: false, message: 'No se encontró activación para este equipo' };

      await this.repository.deactivateActivation(activation.id);
      license.currentActivations = Math.max(0, license.currentActivations - 1);
      await this.repository.updateLicense(license);
      this.logger.info(`✓ Equipo HWID ${hwid.substring(0, 16)}... desvinculado con éxito de la licencia ${license.key}`);
      return { success: true };
    });
  }

  public async getFleetOverview(organizationId: string): Promise<FleetOverviewSummary> {
    const licenses = await this.listLicensesWithActivations(organizationId);
    return buildFleetOverview(licenses);
  }

  public async activateLicense(request: LicenseActivationRequest): Promise<LicenseActivationResponse> {
    const validated = LicenseActivationRequestSchema.parse(request);
    const keyValidation = LicenseKeyGenerator.validate(validated.licenseKey);

    if (!keyValidation.valid) {
      return { success: false, error: keyValidation.reason || 'Clave de licencia con formato inválido' };
    }

    const normalizedKey = LicenseKeyGenerator.normalize(validated.licenseKey);

    return withLicenseKeyLock(normalizedKey, async () => {
      const rawLicense = await this.repository.findLicenseByKey(normalizedKey);
      const stateCheck = await verifyLicenseActiveState(
        rawLicense,
        this.repository,
        'La clave de licencia especificada no existe en el sistema'
      );
      if (!stateCheck.ok) {
        return { success: false, error: stateCheck.error };
      }
      const license = stateCheck.license;

      const existingActivation = await this.repository.findActivation(license.id, validated.hwid);

      if (!existingActivation) {
        if (license.currentActivations >= license.maxActivations) {
          return {
            success: false,
            error: `Límite de activaciones alcanzado (${license.currentActivations}/${license.maxActivations}). Desactive un equipo previo para continuar.`,
          };
        }

        const newActivation: LicenseActivation = {
          id: uuidv4(),
          licenseId: license.id,
          hwid: validated.hwid,
          agentId: validated.agentId,
          machineInfo: validated.machineInfo,
          activatedAt: new Date(),
          lastValidatedAt: new Date(),
        };

        await this.repository.createActivation(newActivation);
        license.currentActivations += 1;
        await this.repository.updateLicense(license);

        this.eventBus.publish({
          type: 'LICENSE_ACTIVATED',
          organizationId: license.organizationId,
          source: 'LicenseService',
          data: { licenseId: license.id, hwid: validated.hwid, plan: license.plan },
        });
      } else {
        await this.repository.updateActivationValidation(existingActivation.id);
      }

      const { token, expiresAtIso } = issueSignedMachineToken(license, validated.hwid, validated.agentId);

      return {
        success: true,
        licenseToken: token,
        plan: license.plan,
        expiresAt: expiresAtIso,
        gracePeriodDays: GRACE_PERIOD_DAYS,
      };
    });
  }

  public async validateLicense(request: LicenseValidationRequest): Promise<LicenseValidationResponse> {
    const validated = LicenseValidationRequestSchema.parse(request);

    const verification = LicenseTokenManager.verifyToken(validated.licenseToken);
    if (!verification.valid || !verification.payload) {
      return { valid: false, message: verification.reason || 'Token de licencia inválido' };
    }

    const payload = verification.payload;
    if (payload.hwid !== validated.hwid) {
      return { valid: false, message: 'Hardware fingerprint mismatch (el token no corresponde a esta máquina)' };
    }

    const rawLicense = await this.repository.findLicenseById(payload.licenseId);
    const stateCheck = await verifyLicenseActiveState(
      rawLicense,
      this.repository,
      'La licencia asociada al token ya no existe'
    );
    if (!stateCheck.ok) {
      return { valid: false, message: stateCheck.error };
    }
    const license = stateCheck.license;

    const activation = await this.repository.findActivation(license.id, validated.hwid);
    if (!activation) {
      return { valid: false, message: 'Esta máquina no está activada en la licencia' };
    }

    await this.repository.updateActivationValidation(activation.id);

    const { token: renewedToken, expiresAtIso } = issueSignedMachineToken(license, validated.hwid, payload.agentId);

    return {
      valid: true,
      plan: license.plan,
      renewedToken,
      expiresAt: expiresAtIso,
      gracePeriodRemainingSeconds: Math.floor(GRACE_PERIOD_MS / 1000),
    };
  }

  public async deactivateLicense(licenseKey: string, hwid: string): Promise<{ success: boolean; message?: string }> {
    const normalizedKey = LicenseKeyGenerator.normalize(licenseKey);
    return withLicenseKeyLock(normalizedKey, async () => {
      const license = await this.repository.findLicenseByKey(normalizedKey);
      if (!license) return { success: false, message: 'Licencia no encontrada' };

      const activation = await this.repository.findActivation(license.id, hwid);
      if (!activation) return { success: false, message: 'No hay activación registrada para este equipo en la licencia' };

      await this.repository.deactivateActivation(activation.id);
      license.currentActivations = Math.max(0, license.currentActivations - 1);
      await this.repository.updateLicense(license);

      this.logger.info(`Activación liberada para HWID ${hwid.substring(0, 16)}... en licencia ${license.key}`);
      return { success: true };
    });
  }

  public async revokeLicense(licenseId: string, reason: string): Promise<License> {
    const license = await this.repository.findLicenseById(licenseId);
    if (!license) throw new Error(`Licencia no encontrada con ID: ${licenseId}`);

    license.status = 'revoked';
    license.revokedAt = new Date();
    license.revokedReason = reason;

    const updated = await this.repository.updateLicense(license);

    this.eventBus.publish({
      type: 'LICENSE_REVOKED',
      organizationId: license.organizationId,
      source: 'LicenseService',
      data: { licenseId: license.id, reason },
    });

    this.logger.warn(`Licencia ${license.key} revocada. Motivo: ${reason}`);
    return updated;
  }
}
