export type AgentLicenseStatus = 'VALID' | 'GRACE_PERIOD' | 'EXPIRED' | 'UNLICENSED';

export interface LicenseValidationStatus {
  status: AgentLicenseStatus;
  plan?: string;
  message?: string;
}
