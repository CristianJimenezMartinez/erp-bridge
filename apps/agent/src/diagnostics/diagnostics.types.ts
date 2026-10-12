import { AgentSystemInfo } from '@erp-bridge/shared';
import { AgentLicenseStatus } from '../license/license.types';
import { AgentFactusolSettings, AgentSimplyGestSettings, AgentWooCommerceSettings, AgentUniversalBridgeSettings, AgentShopifySettings, AgentPrestashopSettings, AgentHoldedSettings, AgentSyncRules, AgentNotificationSettings, SoftwareErpConfig } from '../config/config.types';
import { SyncHistoryRecord } from '../history/history.types';
import { UpdateClientState } from '../update/update.types';

import { PreflightHealthReport } from './preflight-health.types';

export interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  count?: number;
  firstTimestamp?: string;
}

export interface AgentStatusDetails {
  agentName: string;
  agentVersion: string;
  agentId: string;
  apiBaseUrl: string;
  hwid: string;
  licenseKey?: string;
  license: { status: AgentLicenseStatus; plan?: string; message?: string };
  erpType?: 'factusol' | 'simplygest';
  softwareErp?: SoftwareErpConfig;
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
  simplygest?: {
    configured: boolean;
    databasePath: string;
    fileName: string;
    connected: boolean;
    articleCount?: number;
    fileSizeBytes?: number;
    statusMessage: string;
  };
  simplygestSettings?: AgentSimplyGestSettings;
  woocommerceSettings?: AgentWooCommerceSettings;
  universalBridgeSettings?: AgentUniversalBridgeSettings;
  shopifySettings?: AgentShopifySettings;
  prestashopSettings?: AgentPrestashopSettings;
  holdedSettings?: AgentHoldedSettings;
  channelType?: string;
  syncRules?: AgentSyncRules;
  notifications?: AgentNotificationSettings;
  syncHistory?: SyncHistoryRecord[];
  system: AgentSystemInfo;
  recentEvents: LogEvent[];
  update?: UpdateClientState;
  preflight?: PreflightHealthReport;
}
