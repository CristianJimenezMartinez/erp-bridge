
export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

export interface User {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ConnectorType = 'LOCAL_DATABASE' | 'CLOUD_REST' | 'HYBRID';
export type ConnectorStatus = 'OFFICIAL' | 'VERIFIED' | 'COMMUNITY' | 'DEPRECATED';

export interface ConnectorDefinition {
  id: string;
  name: string;
  slug: string;
  type: ConnectorType;
  version: string;
  status: ConnectorStatus;
  capabilities: string[];
  metadata: {
    description?: string;
    author?: string;
    icon?: string;
    docsUrl?: string;
    [key: string]: unknown;
  };
}

export type ConnectionStatus = 'CONNECTED' | 'ERROR' | 'DISCONNECTED' | 'PAUSED';

export interface Connection {
  id: string;
  organizationId: string;
  connectorId: string;
  name: string;
  status: ConnectionStatus;
  agentId?: string;
  credentialId?: string;
  configuration: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'PENDING_PAIRING' | 'REVOKED';

export interface Agent {
  id: string;
  organizationId: string;
  name: string;
  status: AgentStatus;
  version: string;
  lastSeenAt: Date;
  ipAddress?: string;
  platform?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CredentialType = 'API_KEY' | 'OAUTH2_TOKEN' | 'BASIC_AUTH' | 'ODBC_SECRET' | 'WOOCOMMERCE_KEYS';
export type CredentialStatus = 'VALID' | 'EXPIRED' | 'REVOKED';

export interface Credential {
  id: string;
  organizationId: string;
  type: CredentialType;
  encryptedData: string;
  status: CredentialStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type SyncDirection = 'ONE_WAY_SOURCE_TO_DEST' | 'ONE_WAY_DEST_TO_SOURCE' | 'TWO_WAY';
export type SyncJobStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';

export interface SyncJob {
  id: string;
  organizationId: string;
  name: string;
  sourceConnectionId: string;
  destinationConnectionId: string;
  entity: 'products' | 'stock' | 'orders' | 'customers';
  direction: SyncDirection;
  schedule: string; // Cron expression or 'MANUAL'
  status: SyncJobStatus;
  configuration: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS' | 'RUNNING';

export interface SyncExecutionError {
  itemId?: string;
  itemSku?: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SyncExecution {
  id: string;
  syncJobId: string;
  organizationId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  errors: SyncExecutionError[];
  metadata?: Record<string, unknown>;
}

export interface FieldMapping {
  id: string;
  syncJobId: string;
  sourceField: string;
  destinationField: string;
  transformation?: string;
  defaultValue?: unknown;
  configuration?: Record<string, unknown>;
}

export interface ExternalEntityMapping {
  id: string;
  organizationId: string;
  entityType: string;
  sourceConnectionId: string;
  sourceIdentifier: string;
  targetConnectionId: string;
  targetIdentifier: string;
  lastSyncedAt: Date;
  hash?: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: Date;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  metadata: Record<string, unknown>;
}
