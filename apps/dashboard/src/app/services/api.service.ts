import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HealthResponse {
  status: string;
  uptimeSeconds: number;
  database: { healthy: boolean; message: string; latencyMs: number };
}

export interface ConnectorInfo {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  icon?: string;
}

export interface ConnectionItem {
  id: string;
  organizationId: string;
  connectorId: string;
  name: string;
  status: 'CONNECTED' | 'ERROR' | 'DISCONNECTED' | 'PAUSED';
  configuration: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentItem {
  id: string;
  organizationId: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'PENDING_PAIRING' | 'REVOKED';
  version: string;
  platform?: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PairingTokenResponse {
  token: string;
  expiresAt: string;
}

export interface FlowItem {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  triggerEventType: string;
  filters: Array<{ field: string; operator: string; value: any }>;
  actions: Array<{ id: string; type: string; name?: string; configuration: Record<string, any> }>;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlowExecutionItem {
  id: string;
  flowId: string;
  organizationId: string;
  triggerEventId: string;
  triggerEventType: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  results: Array<{ actionId: string; actionType: string; success: boolean; data?: any; error?: string }>;
  durationMs: number;
  createdAt: string;
}

export interface SyncJobItem {
  id: string;
  organizationId: string;
  name: string;
  sourceConnectionId: string;
  destinationConnectionId: string;
  entity: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  schedule: string;
  createdAt: string;
}

export interface SyncExecutionItem {
  id: string;
  syncJobId: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS' | 'RUNNING';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  errors: Array<{
    itemSku?: string;
    code: string;
    message: string;
  }>;
  metadata?: {
    sourceConnectionId?: string;
    destinationConnectionId?: string;
    options?: Record<string, any>;
    retryOfExecutionId?: string;
  };
}

export interface BridgeEventItem {
  id: string;
  type: string;
  organizationId: string;
  source: string;
  timestamp: string;
  data: Record<string, any>;
  status: string;
  error?: string;
}

export interface AuditLogItem {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface LicenseItem {
  id: string;
  key: string;
  organizationId: string;
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  maxActivations: number;
  currentActivations: number;
  createdAt: string;
  expiresAt?: string;
  trialEndsAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  activations?: Array<{
    id: string;
    hwid: string;
    agentId?: string;
    machineInfo?: Record<string, any>;
    activatedAt: string;
    lastValidatedAt: string;
  }>;
}

export interface UpdateHistoryItem {
  id: string;
  agentId: string;
  fromVersion?: string;
  toVersion?: string;
  status: 'success' | 'rollback' | 'failed';
  errorMessage?: string;
  attemptedAt: string;
}

export interface UpdateManifestItem {
  id: string;
  version: string;
  channel: 'stable' | 'beta' | 'critical';
  platform: string;
  downloadUrl: string;
  sha256: string;
  releaseNotes?: string;
  mandatory?: boolean;
  publishedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private get baseUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      if (origin.startsWith('http://localhost:4200')) {
        return 'http://localhost:3000/api/v1';
      }
      return `${origin}/api/v1`;
    }
    return '/api/v1';
  }

  constructor(private http: HttpClient) {}

  getHealth(): Observable<HealthResponse> {
    const healthUrl = (typeof window !== 'undefined' && window.location && !window.location.origin.startsWith('http://localhost:4200'))
      ? `${window.location.origin}/health`
      : 'http://localhost:3000/health';
    return this.http.get<HealthResponse>(healthUrl);
  }

  getConnectors(): Observable<{ data: ConnectorInfo[] }> {
    return this.http.get<{ data: ConnectorInfo[] }>(`${this.baseUrl}/connectors`);
  }

  getConnections(): Observable<{ data: ConnectionItem[] }> {
    return this.http.get<{ data: ConnectionItem[] }>(`${this.baseUrl}/connections`);
  }

  createConnection(payload: {
    connectorId: string;
    name: string;
    configuration: Record<string, any>;
  }): Observable<{ data: ConnectionItem }> {
    return this.http.post<{ data: ConnectionItem }>(`${this.baseUrl}/connections`, payload);
  }

  testConnection(payload: {
    connectorId: string;
    configuration: Record<string, any>;
  }): Observable<{ data: { status: string; message: string; latencyMs?: number; details?: any } }> {
    return this.http.post<{ data: any }>(`${this.baseUrl}/connections/test`, payload);
  }

  testExistingConnection(id: string): Observable<{ data: { status: string; message: string; latencyMs?: number } }> {
    return this.http.post<{ data: any }>(`${this.baseUrl}/connections/${id}/test`, {});
  }

  // Agent Operations
  getAgents(): Observable<{ data: AgentItem[] }> {
    return this.http.get<{ data: AgentItem[] }>(`${this.baseUrl}/agents`);
  }

  generatePairingToken(): Observable<{ data: PairingTokenResponse }> {
    return this.http.post<{ data: PairingTokenResponse }>(`${this.baseUrl}/agents/pairing-token`, {});
  }

  // License Operations
  getLicenses(): Observable<{ data: LicenseItem[] }> {
    return this.http.get<{ data: LicenseItem[] }>(`${this.baseUrl}/licenses`);
  }

  createLicense(payload: {
    plan: 'trial' | 'starter' | 'professional' | 'enterprise';
    maxActivations: number;
    trialDays?: number;
    expiresAt?: string;
  }): Observable<{ data: LicenseItem }> {
    return this.http.post<{ data: LicenseItem }>(`${this.baseUrl}/licenses`, payload);
  }

  getLicenseDetails(key: string): Observable<{ data: LicenseItem }> {
    return this.http.get<{ data: LicenseItem }>(`${this.baseUrl}/licenses/${key}`);
  }

  revokeLicense(id: string, reason?: string): Observable<{ data: LicenseItem }> {
    return this.http.post<{ data: LicenseItem }>(`${this.baseUrl}/licenses/${id}/revoke`, { reason });
  }

  deactivateLicense(licenseKey: string, hwid: string): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(`${this.baseUrl}/licenses/deactivate`, { licenseKey, hwid });
  }

  // Update Operations
  getUpdateHistory(agentId?: string): Observable<{ data: UpdateHistoryItem[] }> {
    const url = agentId ? `${this.baseUrl}/updates/history?agentId=${agentId}` : `${this.baseUrl}/updates/history`;
    return this.http.get<{ data: UpdateHistoryItem[] }>(url);
  }

  getUpdateManifests(channel?: string): Observable<{ data: UpdateManifestItem[] }> {
    const url = channel ? `${this.baseUrl}/updates/manifests?channel=${channel}` : `${this.baseUrl}/updates/manifests`;
    return this.http.get<{ data: UpdateManifestItem[] }>(url);
  }

  publishUpdate(payload: {
    version: string;
    channel?: 'stable' | 'beta' | 'critical';
    platform?: string;
    downloadUrl: string;
    sha256: string;
    signature: string;
    releaseNotes?: string;
    mandatory?: boolean;
  }): Observable<{ data: UpdateManifestItem }> {
    return this.http.post<{ data: UpdateManifestItem }>(`${this.baseUrl}/updates/publish`, payload);
  }

  // Flow Operations
  getFlows(): Observable<{ data: FlowItem[] }> {
    return this.http.get<{ data: FlowItem[] }>(`${this.baseUrl}/flows`);
  }

  createFlow(payload: {
    name: string;
    description?: string;
    triggerEventType: string;
    filters?: Array<{ field: string; operator: string; value: any }>;
    actions: Array<{ id: string; type: string; configuration: Record<string, any> }>;
    isEnabled?: boolean;
  }): Observable<{ data: FlowItem }> {
    return this.http.post<{ data: FlowItem }>(`${this.baseUrl}/flows`, payload);
  }

  toggleFlow(id: string, isEnabled?: boolean): Observable<{ data: FlowItem }> {
    return this.http.put<{ data: FlowItem }>(`${this.baseUrl}/flows/${id}/toggle`, { isEnabled });
  }

  testFlow(id: string, sampleData?: Record<string, any>): Observable<{ data: FlowExecutionItem }> {
    return this.http.post<{ data: FlowExecutionItem }>(`${this.baseUrl}/flows/${id}/test`, { sampleData });
  }

  getFlowExecutions(flowId?: string, limit = 50): Observable<{ data: FlowExecutionItem[] }> {
    const url = flowId
      ? `${this.baseUrl}/flows/executions?flowId=${flowId}&limit=${limit}`
      : `${this.baseUrl}/flows/executions?limit=${limit}`;
    return this.http.get<{ data: FlowExecutionItem[] }>(url);
  }

  // Sync Operations
  getSyncJobs(): Observable<{ data: SyncJobItem[] }> {
    return this.http.get<{ data: SyncJobItem[] }>(`${this.baseUrl}/sync-jobs`);
  }

  createSyncJob(payload: {
    name: string;
    sourceConnectionId: string;
    destinationConnectionId: string;
    entity?: string;
    schedule?: string;
  }): Observable<{ data: SyncJobItem }> {
    return this.http.post<{ data: SyncJobItem }>(`${this.baseUrl}/sync-jobs`, payload);
  }

  updateSyncJobSchedule(jobId: string, schedule: string): Observable<{ data: SyncJobItem }> {
    return this.http.post<{ data: SyncJobItem }>(`${this.baseUrl}/sync-jobs/${jobId}/schedule`, { schedule });
  }

  pauseSyncJob(jobId: string): Observable<{ data: SyncJobItem }> {
    return this.http.post<{ data: SyncJobItem }>(`${this.baseUrl}/sync-jobs/${jobId}/pause`, {});
  }

  resumeSyncJob(jobId: string): Observable<{ data: SyncJobItem }> {
    return this.http.post<{ data: SyncJobItem }>(`${this.baseUrl}/sync-jobs/${jobId}/resume`, {});
  }

  runSyncJob(jobId: string, options?: { limit?: number; forceFullSync?: boolean }): Observable<{ data: SyncExecutionItem }> {
    return this.http.post<{ data: SyncExecutionItem }>(`${this.baseUrl}/sync-jobs/${jobId}/run`, options || {});
  }

  retrySyncExecution(executionId: string): Observable<{ data: SyncExecutionItem }> {
    return this.http.post<{ data: SyncExecutionItem }>(`${this.baseUrl}/sync-executions/${executionId}/retry`, {});
  }

  getSyncExecutions(limit = 20): Observable<{ data: SyncExecutionItem[] }> {
    return this.http.get<{ data: SyncExecutionItem[] }>(`${this.baseUrl}/sync-executions?limit=${limit}`);
  }

  getAuditLogs(limit = 50): Observable<{ data: AuditLogItem[] }> {
    return this.http.get<{ data: AuditLogItem[] }>(`${this.baseUrl}/audit-logs?limit=${limit}`);
  }

  getEvents(limit = 50): Observable<{ data: BridgeEventItem[] }> {
    return this.http.get<{ data: BridgeEventItem[] }>(`${this.baseUrl}/events?limit=${limit}`);
  }
}
