import { z } from 'zod';

export interface AgentSystemInfo {
  platform: string;
  arch: string;
  osVersion: string;
  hostname: string;
  memoryTotalMb: number;
  memoryFreeMb: number;
  cpuCores: number;
  nodeVersion: string;
  uptimeSeconds: number;
}

export interface FactusolDetectedInstance {
  databasePath: string;
  companyCode?: string;
  year?: string;
  fileSizeBytes: number;
  lastModified: Date;
  isValid: boolean;
}

export interface AgentPairingToken {
  token: string;
  organizationId: string;
  expiresAt: Date;
  createdById?: string;
}

export interface AgentPairingRequest {
  pairingToken: string;
  name: string;
  systemInfo: AgentSystemInfo;
  detectedFactusol?: FactusolDetectedInstance[];
}

export interface AgentHeartbeatPayload {
  agentId: string;
  version?: string;
  status: 'ONLINE' | 'DEGRADED';
  systemInfo: AgentSystemInfo;
  factusolHealth?: {
    status: 'HEALTHY' | 'DOWN' | 'DEGRADED';
    latencyMs?: number;
    databasePath?: string;
    message?: string;
  };
  fileWatcherActive?: boolean;
}

export const AgentPairingRequestSchema = z.object({
  pairingToken: z.string().min(4),
  name: z.string().min(1),
  systemInfo: z.object({
    platform: z.string(),
    arch: z.string(),
    osVersion: z.string(),
    hostname: z.string(),
    memoryTotalMb: z.number(),
    memoryFreeMb: z.number(),
    cpuCores: z.number(),
    nodeVersion: z.string(),
    uptimeSeconds: z.number(),
  }),
  detectedFactusol: z
    .array(
      z.object({
        databasePath: z.string(),
        companyCode: z.string().optional(),
        year: z.string().optional(),
        fileSizeBytes: z.number(),
        lastModified: z.coerce.date(),
        isValid: z.boolean(),
      })
    )
    .optional(),
});

export const AgentHeartbeatPayloadSchema = z.object({
  agentId: z.string().min(1),
  version: z.string().optional(),
  status: z.enum(['ONLINE', 'DEGRADED']),
  systemInfo: z.object({
    platform: z.string(),
    arch: z.string(),
    osVersion: z.string(),
    hostname: z.string(),
    memoryTotalMb: z.number(),
    memoryFreeMb: z.number(),
    cpuCores: z.number(),
    nodeVersion: z.string(),
    uptimeSeconds: z.number(),
  }),
  factusolHealth: z
    .object({
      status: z.enum(['HEALTHY', 'DOWN', 'DEGRADED']),
      latencyMs: z.number().optional(),
      databasePath: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  fileWatcherActive: z.boolean().optional(),
});
