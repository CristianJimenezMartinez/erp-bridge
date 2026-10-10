import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { ConfigManager } from '../config';
import { LicenseService } from '../license';
import { EventBus } from './event-bus';

export interface IncidentReportPayload {
  contact: string;
  category: string;
  description: string;
  includeDiagnostics?: boolean;
  timestamp?: string;
}

export interface IncidentReportResult {
  success: boolean;
  ticketId: string;
  message: string;
  cloudReceived: boolean;
}

export class IncidentReporterService {
  private readonly logger = new Logger('IncidentReporter');

  constructor(
    private readonly configManager: ConfigManager,
    private readonly licenseService: LicenseService,
    private readonly eventBus: EventBus,
    private readonly exportDiagnosticFn: () => string
  ) {}

  public async reportIncident(payload: IncidentReportPayload): Promise<IncidentReportResult> {
    const ticketId = `#INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cfg = this.configManager.get();
    const hwid = await this.licenseService.getHWID();
    const licStatus = this.licenseService.getLicenseStatus();
    const diagnosticsText = payload.includeDiagnostics !== false ? this.exportDiagnosticFn() : null;

    const incidentRecord = {
      ticketId,
      createdAt: new Date().toISOString(),
      contact: payload.contact,
      category: payload.category || 'other',
      description: payload.description,
      agentId: cfg.agentId || 'ag_local',
      organizationId: cfg.organizationId || 'org_default',
      appVersion: this.configManager.getVersion(),
      hwid,
      licenseKey: cfg.licenseKey ? `${cfg.licenseKey.substring(0, 8)}...` : 'Sin clave',
      plan: licStatus.plan,
      diagnostics: diagnosticsText,
    };

    // 1. Persistencia local en %APPDATA%\Bentian Agent\incidents\ (Regla 1 AppData)
    try {
      const appDataDir = path.dirname(this.configManager.getConfigFilePath());
      const incidentsDir = path.join(appDataDir, 'incidents');
      if (!fs.existsSync(incidentsDir)) {
        fs.mkdirSync(incidentsDir, { recursive: true });
      }
      const tempFile = path.join(incidentsDir, `incident-${ticketId.replace('#', '')}.tmp`);
      const finalFile = path.join(incidentsDir, `incident-${ticketId.replace('#', '')}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(incidentRecord, null, 2), 'utf8');
      fs.renameSync(tempFile, finalFile);
    } catch (err) {
      this.logger.warn('Aviso: no se pudo guardar copia local de la incidencia:', { err: String(err) });
    }

    // 2. Intentar despacho al servidor central si hay conectividad
    let cloudReceived = false;
    let serverMessage = 'Incidencia registrada y asignada al equipo de soporte técnico.';
    const apiBaseUrl = cfg.apiBaseUrl || 'https://bridge.cristianjm.com';

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/agents/fleet/report-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          contact: payload.contact,
          category: payload.category,
          description: payload.description,
          diagnostics: diagnosticsText,
          agentId: cfg.agentId || 'ag_local',
          organizationId: cfg.organizationId || 'org_default',
          appVersion: this.configManager.getVersion(),
          hwid,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        cloudReceived = true;
        const data: any = await res.json().catch(() => ({}));
        if (data.message) serverMessage = data.message;
      }
    } catch (netErr) {
      this.logger.warn('No se pudo enviar la incidencia a la API central en este momento:', { err: String(netErr) });
    }

    this.logger.info(`Incidencia técnica registrada: ${ticketId} [${payload.category}]`);
    this.eventBus.emit('event', {
      level: 'INFO',
      component: 'Support',
      action: 'incident_reported',
      message: `Incidencia técnica registrada: ${ticketId} (${payload.category})`,
    });

    return {
      success: true,
      ticketId,
      cloudReceived,
      message: cloudReceived
        ? serverMessage
        : `La incidencia se ha registrado en el equipo con el ticket ${ticketId}. Guardada copia técnica local.`,
    };
  }
}
