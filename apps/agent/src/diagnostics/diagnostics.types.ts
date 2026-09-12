import { AgentSystemInfo } from '@erp-bridge/shared';
import { AgentLicenseStatus } from '../license/license.types';
import { AgentFactusolSettings, AgentWooCommerceSettings, AgentUniversalBridgeSettings, AgentSyncRules } from '../config/config.types';
import { SyncHistoryRecord } from '../history/history.types';

export interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface AgentStatusDetails {
  agentName: string;
  agentVersion: string;
  agentId: string;
  apiBaseUrl: string;
  hwid: string;
  licenseKey?: string;
  license: { status: AgentLicenseStatus; plan?: string; message?: string };
  factusol: {
    configured: boolean;
    databasePath: string;
    fileName: string;
    connected: boolean;
    watcherActive: boolean;
    articleCount?: number;
    fileSizeBytes?: number;
    statusMessage: string;
  };
  factusolSettings?: AgentFactusolSettings;
  woocommerceSettings?: AgentWooCommerceSettings;
  universalBridgeSettings?: AgentUniversalBridgeSettings;
  channelType?: string;
  syncRules?: AgentSyncRules;
  syncHistory?: SyncHistoryRecord[];
  system: AgentSystemInfo;
  recentEvents: LogEvent[];
}
