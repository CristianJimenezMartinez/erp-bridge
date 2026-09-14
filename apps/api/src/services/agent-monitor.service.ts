import { Agent, Logger } from '@erp-bridge/shared';
import { AgentService, EventBus } from '@erp-bridge/core';

export interface InactiveAgentAlert {
  agentId: string;
  agentName: string;
  organizationId: string;
  lastSeen: Date;
  offlineDurationHours: number;
  emailPayload?: MailerDispatchPayload;
}

export interface MailerDispatchPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  metadata: {
    agentId: string;
    organizationId: string;
    alertType: 'INACTIVE_AGENT_DEADMAN_SWITCH';
    offlineDurationHours: number;
    thresholdHours: number;
  };
}

export type AgentFleetClassification = 'active' | 'degraded' | 'inactive';

export interface AgentFleetItem {
  id: string;
  name: string;
  organizationId: string;
  status: Agent['status'];
  classification: AgentFleetClassification;
  lastSeenAt: Date;
  offlineDurationHours: number;
  version?: string;
  platform?: string;
}

export interface FleetHealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  timestamp: string;
  thresholdHours: number;
  summary: {
    total: number;
    active: number;
    degraded: number;
    inactive: number;
  };
  agents: {
    active: AgentFleetItem[];
    degraded: AgentFleetItem[];
    inactive: AgentFleetItem[];
  };
  alerts: InactiveAgentAlert[];
}

export class AgentMonitorService {
  private readonly logger = new Logger('AgentMonitorService');

  constructor(
    private readonly agentService: AgentService = new AgentService(),
    private readonly eventBus: EventBus = EventBus.getInstance()
  ) {}

  /**
   * Identifica agentes caídos cuyo último latido (last_seen_at / last_heartbeat) sea anterior a (now - thresholdHours).
   * Genera alertas estructuradas y emite eventos en EventBus y logs con formato listo para dispatch de email (SendGrid, Postmark, Mailer).
   */
  public async checkInactiveAgents(
    thresholdHours: number = 24,
    organizationId?: string
  ): Promise<InactiveAgentAlert[]> {
    const agents = organizationId
      ? await this.agentService.listAgents(organizationId)
      : await this.agentService.listAllAgents();

    const now = Date.now();
    const thresholdMs = thresholdHours * 60 * 60 * 1000;
    const alerts: InactiveAgentAlert[] = [];

    for (const agent of agents) {
      const lastSeenTime = agent.lastSeenAt ? new Date(agent.lastSeenAt).getTime() : 0;
      const diffMs = Math.max(0, now - lastSeenTime);

      if (diffMs >= thresholdMs) {
        const offlineDurationHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1));
        const alert: InactiveAgentAlert = {
          agentId: agent.id,
          agentName: agent.name,
          organizationId: agent.organizationId,
          lastSeen: agent.lastSeenAt ? new Date(agent.lastSeenAt) : new Date(0),
          offlineDurationHours,
        };

        const emailPayload = this.buildEmailPayload(alert, thresholdHours);
        alert.emailPayload = emailPayload;

        // 1. Emit structured warning log ready for Mailer / SendGrid / Postmark dispatch
        this.logger.warn(
          `[DEADMAN_SWITCH] Agente caído detectado: "${agent.name}" (${agent.id}) offline por ${offlineDurationHours}h. Despacho de alerta por correo preparado.`,
          {
            alert: {
              agentId: alert.agentId,
              agentName: alert.agentName,
              organizationId: alert.organizationId,
              lastSeen: alert.lastSeen.toISOString(),
              offlineDurationHours: alert.offlineDurationHours,
            },
            emailDispatch: {
              to: emailPayload.to,
              from: emailPayload.from,
              subject: emailPayload.subject,
              providers: ['Mailer', 'SendGrid', 'Postmark'],
            },
          }
        );

        // 2. Publish SYSTEM_ALERT event on EventBus
        try {
          await this.eventBus.publish({
            type: 'SYSTEM_ALERT',
            organizationId: agent.organizationId,
            source: 'AgentMonitorService',
            data: {
              alertType: 'INACTIVE_AGENT_DEADMAN_SWITCH',
              agentId: alert.agentId,
              agentName: alert.agentName,
              organizationId: alert.organizationId,
              lastSeen: alert.lastSeen.toISOString(),
              offlineDurationHours: alert.offlineDurationHours,
              thresholdHours,
              emailPayload,
            },
          });
        } catch (evtErr) {
          this.logger.error(`Error al publicar evento SYSTEM_ALERT para el agente ${agent.id}`, evtErr);
        }

        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Genera el reporte consolidado de salud de la flota de agentes (activos, degradados, inactivos).
   */
  public async getFleetHealth(
    organizationId?: string,
    thresholdHours: number = 24
  ): Promise<FleetHealthReport> {
    const agents = organizationId
      ? await this.agentService.listAgents(organizationId)
      : await this.agentService.listAllAgents();

    const now = Date.now();
    const activeThresholdMs = 15 * 60 * 1000; // 15 minutes for active status
    const inactiveThresholdMs = thresholdHours * 60 * 60 * 1000;

    const activeList: AgentFleetItem[] = [];
    const degradedList: AgentFleetItem[] = [];
    const inactiveList: AgentFleetItem[] = [];
    const alerts: InactiveAgentAlert[] = [];

    for (const agent of agents) {
      const lastSeenTime = agent.lastSeenAt ? new Date(agent.lastSeenAt).getTime() : 0;
      const diffMs = Math.max(0, now - lastSeenTime);
      const offlineDurationHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1));

      let classification: AgentFleetClassification = 'active';

      if (diffMs >= inactiveThresholdMs) {
        classification = 'inactive';
        const alert: InactiveAgentAlert = {
          agentId: agent.id,
          agentName: agent.name,
          organizationId: agent.organizationId,
          lastSeen: agent.lastSeenAt ? new Date(agent.lastSeenAt) : new Date(0),
          offlineDurationHours,
        };
        alert.emailPayload = this.buildEmailPayload(alert, thresholdHours);
        alerts.push(alert);
      } else if (diffMs >= activeThresholdMs) {
        classification = 'degraded';
      }

      const item: AgentFleetItem = {
        id: agent.id,
        name: agent.name,
        organizationId: agent.organizationId,
        status: agent.status,
        classification,
        lastSeenAt: agent.lastSeenAt ? new Date(agent.lastSeenAt) : new Date(0),
        offlineDurationHours,
        version: agent.version,
        platform: agent.platform,
      };

      if (classification === 'active') {
        activeList.push(item);
      } else if (classification === 'degraded') {
        degradedList.push(item);
      } else {
        inactiveList.push(item);
      }
    }

    let fleetStatus: FleetHealthReport['status'] = 'HEALTHY';
    if (inactiveList.length > 0) {
      fleetStatus = 'CRITICAL';
    } else if (degradedList.length > 0) {
      fleetStatus = 'DEGRADED';
    }

    return {
      status: fleetStatus,
      timestamp: new Date().toISOString(),
      thresholdHours,
      summary: {
        total: agents.length,
        active: activeList.length,
        degraded: degradedList.length,
        inactive: inactiveList.length,
      },
      agents: {
        active: activeList,
        degraded: degradedList,
        inactive: inactiveList,
      },
      alerts,
    };
  }

  /**
   * Construye un payload estructurado de correo electrónico compatible con nodemailer, SendGrid y Postmark.
   */
  public buildEmailPayload(alert: InactiveAgentAlert, thresholdHours: number): MailerDispatchPayload {
    const subject = `[Bentian Deadman Switch] ALERTA: Agente ${alert.agentName} (${alert.agentId}) inactivo hace ${alert.offlineDurationHours}h`;

    const text = [
      '================================================================',
      ' BENTIAN ERP BRIDGE — ALERTA DEADMAN SWITCH (AGENTE INACTIVO)',
      '================================================================',
      '',
      `El agente local "${alert.agentName}" no ha enviado señales de latido (heartbeat) en las últimas ${alert.offlineDurationHours} horas (umbral de alerta: ${thresholdHours}h).`,
      '',
      `• ID de Agente:       ${alert.agentId}`,
      `• Nombre del Equipo:  ${alert.agentName}`,
      `• Organización:       ${alert.organizationId}`,
      `• Último Latido:      ${alert.lastSeen ? alert.lastSeen.toISOString() : 'Desconocido'}`,
      `• Tiempo sin Latido:  ${alert.offlineDurationHours} horas`,
      '',
      'ACCIONES DE RECUPERACIÓN RECOMENDADAS:',
      '1. Verificar que la máquina Windows anfitriona está encendida y dispone de conectividad de red.',
      '2. Comprobar que el servicio local de Windows "BentianBridgeAgent" está en ejecución (services.msc).',
      '3. Revisar el archivo de registro en C:\\ProgramData\\Bentian\\logs\\agent.log para diagnosticar posibles caídas.',
      '4. Verificar si las credenciales de emparejamiento o tokens locales han expirado.',
      '',
      '---',
      'Mensaje automático generado por el Monitor Cloud de Bentian ERP Bridge.',
    ].join('\n');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
    .card { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 640px; margin: 0 auto; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); color: #ffffff; padding: 24px; text-align: left; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 28px; }
    .status-banner { display: inline-flex; align-items: center; background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; margin-bottom: 20px; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 24px; }
    .data-table th, .data-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .data-table td.label { font-weight: 600; color: #64748b; width: 38%; }
    .data-table td.val { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0f172a; }
    .highlight-off { color: #dc2626; font-weight: 700; }
    .box-steps { background: #f8fafc; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-top: 20px; }
    .box-steps h4 { margin: 0 0 10px 0; font-size: 14px; color: #1e293b; }
    .box-steps ol { margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6; }
    .footer { padding: 18px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>⚠️ Bentian Deadman Switch Alert</h1>
      <p>Monitor de Agentes Caídos de Bentian ERP Bridge</p>
    </div>
    <div class="content">
      <div class="status-banner">AGENTE CAÍDO / SIN RESPUESTA</div>
      <p style="font-size: 15px; line-height: 1.5; margin-top: 0;">
        El agente local <strong>${alert.agentName}</strong> ha dejado de reportar actividad de sincronización al sistema central.
      </p>
      <table class="data-table">
        <tr><td class="label">ID de Agente:</td><td class="val">${alert.agentId}</td></tr>
        <tr><td class="label">Nombre:</td><td class="val">${alert.agentName}</td></tr>
        <tr><td class="label">Organización:</td><td class="val">${alert.organizationId}</td></tr>
        <tr><td class="label">Último Latido:</td><td class="val">${alert.lastSeen ? alert.lastSeen.toISOString() : 'Sin registro'}</td></tr>
        <tr><td class="label">Tiempo Inactivo:</td><td class="val highlight-off">${alert.offlineDurationHours} horas</td></tr>
        <tr><td class="label">Umbral Configurado:</td><td class="val">${thresholdHours} horas</td></tr>
      </table>
      <div class="box-steps">
        <h4>Acciones recomendadas de recuperación:</h4>
        <ol>
          <li>Verificar que el equipo físico Windows esté encendido y con acceso a Internet.</li>
          <li>Comprobar el servicio del sistema <code>BentianBridgeAgent</code> en el Administrador de Servicios.</li>
          <li>Inspeccionar el registro local en <code>C:\\ProgramData\\Bentian\\logs\\agent.log</code>.</li>
        </ol>
      </div>
    </div>
    <div class="footer">
      Bentian Cloud Infrastructure &bull; Este es un aviso operacional automático de alta prioridad.
    </div>
  </div>
</body>
</html>
`.trim();

    return {
      to: `alerts@bentian.es`,
      from: `no-reply@bridge.cristianjm.com`,
      subject,
      text,
      html,
      metadata: {
        agentId: alert.agentId,
        organizationId: alert.organizationId,
        alertType: 'INACTIVE_AGENT_DEADMAN_SWITCH',
        offlineDurationHours: alert.offlineDurationHours,
        thresholdHours,
      },
    };
  }
}
