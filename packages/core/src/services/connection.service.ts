import { v4 as uuidv4 } from 'uuid';
import { Connection, CreateConnectionDto, UpdateConnectionDto } from '@erp-bridge/shared';
import { BridgeError, ErrorCode, HealthCheckResult } from '@erp-bridge/sdk';
import { IConnectionRepository, PostgresConnectionRepository } from '../database';
import { ConnectorRegistry } from '../registry';

export class ConnectionService {
  constructor(
    private readonly repo: IConnectionRepository = new PostgresConnectionRepository(),
    private readonly registry: ConnectorRegistry = ConnectorRegistry.getInstance()
  ) {}

  public async list(organizationId: string): Promise<Connection[]> {
    return this.repo.listByOrganization(organizationId);
  }

  public async getById(organizationId: string, id: string): Promise<Connection> {
    const conn = await this.repo.findById(organizationId, id);
    if (!conn) {
      throw new BridgeError(ErrorCode.CONNECTION_NOT_FOUND, `Conexión no encontrada con ID: ${id}`);
    }
    return conn;
  }

  public async create(dto: CreateConnectionDto): Promise<Connection> {
    if (!this.registry.hasConnector(dto.connectorId)) {
      throw new BridgeError(
        ErrorCode.CONNECTOR_NOT_FOUND,
        `Tipo de conector no válido o no registrado: ${dto.connectorId}`
      );
    }

    const id = `conn_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const newConn: Connection = {
      id,
      organizationId: dto.organizationId,
      connectorId: dto.connectorId,
      name: dto.name,
      status: 'DISCONNECTED',
      agentId: dto.agentId,
      configuration: dto.configuration,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repo.create(newConn);
  }

  public async update(organizationId: string, id: string, dto: UpdateConnectionDto): Promise<Connection> {
    const existing = await this.getById(organizationId, id);
    const updated: Connection = {
      ...existing,
      name: dto.name || existing.name,
      status: dto.status || existing.status,
      configuration: dto.configuration || existing.configuration,
      updatedAt: new Date(),
    };
    return this.repo.update(updated);
  }

  public async delete(organizationId: string, id: string): Promise<boolean> {
    await this.getById(organizationId, id);
    return this.repo.delete(organizationId, id);
  }

  public async testConnection(
    connectorId: string,
    configuration: Record<string, unknown>,
    credentials?: Record<string, unknown>
  ): Promise<HealthCheckResult> {
    const connector = this.registry.createConnector(connectorId);
    try {
      await connector.connect({
        configuration,
        credentials,
      });
      const health = await connector.healthCheck();
      await connector.disconnect();
      return health;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        status: 'DOWN',
        message: `Fallo al verificar la conexión: ${msg}`,
      };
    }
  }

  public async testExistingConnection(organizationId: string, id: string): Promise<HealthCheckResult> {
    const conn = await this.getById(organizationId, id);
    const result = await this.testConnection(conn.connectorId, conn.configuration);
    
    // Update connection status in repository based on test result
    const newStatus = result.status === 'HEALTHY' ? 'CONNECTED' : 'ERROR';
    if (conn.status !== newStatus) {
      conn.status = newStatus;
      conn.updatedAt = new Date();
      await this.repo.update(conn);
    }

    return result;
  }
}
