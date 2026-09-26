export type PreflightStatus = 'OK' | 'WARN' | 'FAIL';
export type OverallPreflightStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

export interface PreflightCheckItem {
  id: 'cscript' | 'oledb_provider' | 'clock_drift' | 'network_storage';
  name: string;
  code: string;
  status: PreflightStatus;
  message: string;
  details?: Record<string, unknown>;
  recommendation?: string;
  latencyMs?: number;
}

export interface PreflightHealthReport {
  overallStatus: OverallPreflightStatus;
  timestamp: string;
  durationMs: number;
  checks: {
    cscript: PreflightCheckItem;
    oledbProvider: PreflightCheckItem;
    clockDrift: PreflightCheckItem;
    networkStorage: PreflightCheckItem;
  };
  summary: {
    passed: number;
    warnings: number;
    failures: number;
  };
}

export interface DiskLatencyResult {
  avgMs: number;
  maxMs: number;
  minMs: number;
  jitterMs: number;
}

export interface PreflightServiceOptions {
  cscriptPath?: string;
  apiBaseUrl?: string;
  factusolDbPath?: string;
  timeoutMs?: number;
  probeCScript?: () => Promise<{ ok: boolean; path?: string; blocked?: boolean; reason?: string }>;
  probeOleDb?: (cscriptPath?: string) => Promise<{ ok: boolean; providers: string[]; error?: string }>;
  probeClockDrift?: (url?: string) => Promise<{ ok: boolean; driftMs: number; serverDate?: string; error?: string }>;
  probeNetworkStorage?: (dbPath?: string) => Promise<{
    isNetwork: boolean;
    isWifi: boolean;
    storageType: 'local' | 'unc' | 'mapped';
    drive?: string;
    latency?: DiskLatencyResult;
  }>;
}
