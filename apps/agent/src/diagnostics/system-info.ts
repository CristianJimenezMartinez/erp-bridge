import os from 'os';
import { AgentSystemInfo } from '@erp-bridge/shared';

export class SystemInfoService {
  public static getSystemInfo(): AgentSystemInfo {
    return {
      platform: os.platform(),
      arch: os.arch(),
      osVersion: os.release(),
      hostname: os.hostname(),
      memoryTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      memoryFreeMb: Math.round(os.freemem() / 1024 / 1024),
      cpuCores: os.cpus().length,
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
