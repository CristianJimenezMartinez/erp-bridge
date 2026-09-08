import { v4 as uuidv4 } from 'uuid';
import {
  CreateLicenseDto,
  CreateLicenseDtoSchema,
  License,
  LicenseActivation,
  LicenseActivationRequest,
  LicenseActivationRequestSchema,
  LicenseActivationResponse,
  LicenseTokenPayload,
  LicenseValidationRequest,
  LicenseValidationRequestSchema,
  LicenseValidationResponse,
  LicenseWithActivations,
  Logger,
} from '@erp-bridge/shared';
import { ILicenseRepository, PostgresLicenseRepository } from '../database/repositories/license.repository';
import { LicenseKeyGenerator } from './license-key.generator';
import { LicenseTokenManager } from './license-token';
import { EventBus } from '../events/event-bus';

const GRACE_PERIOD_DAYS = 7;
const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

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
      result.push({
        ...lic,
        activations,
      });
    }
    return result;
  }

  public async updateLicenseAlias(licenseId: string, alias: string): Promise<void> {
    await this.repository.updateLicenseAlias(licenseId, alias);
    this.logger.info(`Alias de licencia ${licenseId} actualizado a: "${alias}"`);
  }

  public async unbindMachine(licenseId: string, hwid: string): Promise<{ success: boolean; message?: string }> {
    const license = await this.repository.findLicenseById(licenseId);
    if (!license) {
      return { success: false, message: 'Licencia no encontrada' };
    }
    const activation = await this.repository.findActivation(license.id, hwid);
    if (!activation) {
      return { success: false, message: 'No se encontró activación para este equipo' };
    }
    await this.repository.deactivateActivation(activation.id);
    license.currentActivations = Math.max(0, license.currentActivations - 1);
    await this.repository.updateLicense(license);
    this.logger.info(`✓ Equipo HWID ${hwid.substring(0, 16)}... desvinculado con éxito de la licencia ${license.key}`);
    return { success: true };
  }

  public async getFleetOverview(organizationId: string): Promise<{
    totalLicenses: number;
    totalAllowedSeats: number;
    activeSeats: number;
    onlineSeats: number;
    plan: string;
    licenses: LicenseWithActivations[];
  }> {
    const licenses = await this.listLicensesWithActivations(organizationId);
    let totalAllowedSeats = 0;
    let activeSeats = 0;
    let onlineSeats = 0;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    for (const lic of licenses) {
      totalAllowedSeats += lic.maxActivations;
      activeSeats += lic.activations.length;
      for (const act of lic.activations) {
        const lastVal = new Date(act.lastValidatedAt).getTime();
        if (now - lastVal < twentyFourHours) {
          onlineSeats++;
        }
      }
    }

    const primaryPlan = licenses[0]?.plan || 'starter';

    return {
      totalLicenses: licenses.length,
      totalAllowedSeats: Math.max(totalAllowedSeats, 1),
      activeSeats,
      onlineSeats,
      plan: primaryPlan,
      licenses,
    };
  }

  public async activateLicense(request: LicenseActivationRequest): Promise<LicenseActivationResponse> {
    const validated = LicenseActivationRequestSchema.parse(request);
    const keyValidation = LicenseKeyGenerator.validate(validated.licenseKey);

    if (!keyValidation.valid) {
      return { success: false, error: keyValidation.reason || 'Clave de licencia con formato inválido' };
    }

    const normalizedKey = LicenseKeyGenerator.normalize(validated.licenseKey);
    const license = await this.repository.findLicenseByKey(normalizedKey);

    if (!license) {
      return { success: false, error: 'La clave de licencia especificada no existe en el sistema' };
    }

    if (license.status === 'revoked') {
      return { success: false, error: `Licencia revocada: ${license.revokedReason || 'Contacte con soporte'}` };
    }

    if (license.status === 'suspended') {
      return { success: false, error: 'Licencia temporalmente suspendida' };
    }

    // Check expiration
    if (license.expiresAt && new Date() > license.expiresAt) {
      license.status = 'expired';
      await this.repository.updateLicense(license);
      return { success: false, error: 'La licencia ha expirado' };
    }

    // Check if this HWID is already activated for this license
    const existingActivation = await this.repository.findActivation(license.id, validated.hwid);

    if (!existingActivation) {
      // Check activation capacity limit
      if (license.currentActivations >= license.maxActivations) {
        return {
          success: false,
          error: `Límite de activaciones alcanzado (${license.currentActivations}/${license.maxActivations}). Desactive un equipo previo para continuar.`,
        };
      }

      // Create new activation
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
      // Refresh existing activation
      await this.repository.updateActivationValidation(existingActivation.id);
    }

    // Generate signed JWT token
    const tokenPayload: LicenseTokenPayload = {
      licenseId: license.id,
      organizationId: license.organizationId,
      plan: license.plan,
      hwid: validated.hwid,
      agentId: validated.agentId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + GRACE_PERIOD_MS,
    };

    const licenseToken = LicenseTokenManager.createToken(tokenPayload);

    return {
      success: true,
      licenseToken,
      plan: license.plan,
      expiresAt: new Date(tokenPayload.expiresAt).toISOString(),
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  public async validateLicense(request: LicenseValidationRequest): Promise<LicenseValidationResponse> {
    const validated = LicenseValidationRequestSchema.parse(request);

    // 1. Verify cryptographic token
    const verification = LicenseTokenManager.verifyToken(validated.licenseToken);
    if (!verification.valid || !verification.payload) {
      return { valid: false, message: verification.reason || 'Token de licencia inválido' };
    }

    const payload = verification.payload;

    // 2. Hardware binding check
    if (payload.hwid !== validated.hwid) {
      return { valid: false, message: 'Hardware fingerprint mismatch (el token no corresponde a esta máquina)' };
    }

    // 3. Database check
    const license = await this.repository.findLicenseById(payload.licenseId);
    if (!license) {
      return { valid: false, message: 'La licencia asociada al token ya no existe' };
    }

    if (license.status === 'revoked') {
      return { valid: false, message: `Licencia revocada: ${license.revokedReason || 'Contacte con soporte'}` };
    }

    if (license.status === 'suspended') {
      return { valid: false, message: 'Licencia suspendida' };
    }

    if (license.expiresAt && new Date() > license.expiresAt) {
      license.status = 'expired';
      await this.repository.updateLicense(license);
      return { valid: false, message: 'La licencia ha expirado' };
    }

    const activation = await this.repository.findActivation(license.id, validated.hwid);
    if (!activation) {
      return { valid: false, message: 'Esta máquina no está activada en la licencia' };
    }

    // Update validation timestamp
    await this.repository.updateActivationValidation(activation.id);

    // Renew token with new 7-day validity
    const renewedPayload: LicenseTokenPayload = {
      licenseId: license.id,
      organizationId: license.organizationId,
      plan: license.plan,
      hwid: validated.hwid,
      agentId: payload.agentId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + GRACE_PERIOD_MS,
    };

    const renewedToken = LicenseTokenManager.createToken(renewedPayload);

    return {
      valid: true,
      plan: license.plan,
      renewedToken,
      expiresAt: new Date(renewedPayload.expiresAt).toISOString(),
      gracePeriodRemainingSeconds: Math.floor(GRACE_PERIOD_MS / 1000),
    };
  }

  public async deactivateLicense(licenseKey: string, hwid: string): Promise<{ success: boolean; message?: string }> {
    const normalizedKey = LicenseKeyGenerator.normalize(licenseKey);
    const license = await this.repository.findLicenseByKey(normalizedKey);

    if (!license) {
      return { success: false, message: 'Licencia no encontrada' };
    }

    const activation = await this.repository.findActivation(license.id, hwid);
    if (!activation) {
      return { success: false, message: 'No hay activación registrada para este equipo en la licencia' };
    }

    await this.repository.deactivateActivation(activation.id);
    license.currentActivations = Math.max(0, license.currentActivations - 1);
    await this.repository.updateLicense(license);

    this.logger.info(`Activación liberada para HWID ${hwid.substring(0, 16)}... en licencia ${license.key}`);
    return { success: true };
  }

  public async revokeLicense(licenseId: string, reason: string): Promise<License> {
    const license = await this.repository.findLicenseById(licenseId);
    if (!license) {
      throw new Error(`Licencia no encontrada con ID: ${licenseId}`);
    }

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
