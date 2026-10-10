import os from 'os';
import path from 'path';
import { Logger, AgentPairingRequest, FactusolDetectedInstance } from '@erp-bridge/shared';
import { ConfigManager } from '../config';
import { FactusolDetector } from '../detector';
import { SystemInfoService } from '../diagnostics';

export class PairingService {
  private readonly logger = new Logger('PairingService');

  constructor(private readonly configManager: ConfigManager) {}

  public async pair(pairingToken: string, customName?: string): Promise<{
    agentId: string;
    detectedFactusol: FactusolDetectedInstance[];
  }> {
    const cfg = this.configManager.get();
    const name = customName || cfg.agentName || os.hostname();
    this.logger.info(`Iniciando emparejamiento con el Core (Token: ${pairingToken})...`);

    const detected = FactusolDetector.detectAll(cfg.factusolDbPath ? [path.dirname(cfg.factusolDbPath)] : []);
    const primary = detected.length > 0 ? detected[0] : null;

    const requestPayload: AgentPairingRequest = {
      pairingToken,
      name,
      systemInfo: SystemInfoService.getSystemInfo(),
      detectedFactusol: detected,
    };

    const response = await fetch(`${cfg.apiBaseUrl}/api/v1/agents/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(errBody.error?.message || `Fallo al emparejar con el servidor: HTTP ${response.status}`);
    }

    const resJson = (await response.json()) as {
      data: { agent: { id: string; name: string }; authToken: string };
    };

    cfg.agentId = resJson.data.agent.id;
    cfg.agentName = resJson.data.agent.name;
    cfg.authToken = resJson.data.authToken;
    if (primary) {
      cfg.factusolDbPath = primary.databasePath;
    }

    this.configManager.saveConfigToDisk();
    this.logger.info(`Emparejamiento exitoso. Agent ID: ${cfg.agentId}`);

    return {
      agentId: resJson.data.agent.id,
      detectedFactusol: detected,
    };
  }
}
