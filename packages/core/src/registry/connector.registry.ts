import { Connector, ConnectorMetadata, ErrorCode, BridgeError } from '@erp-bridge/sdk';
import { Logger } from '@erp-bridge/shared';

export type ConnectorFactory = () => Connector;

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private readonly logger = new Logger('ConnectorRegistry');
  private readonly connectors = new Map<string, ConnectorFactory>();
  private readonly metadataMap = new Map<string, ConnectorMetadata>();

  private constructor() {}

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  public register(factory: ConnectorFactory): void {
    const instance = factory();
    const metadata = instance.getMetadata();
    this.connectors.set(metadata.id, factory);
    this.metadataMap.set(metadata.id, metadata);
    this.logger.info(`Connector registrado: ${metadata.name} (${metadata.id}) v${metadata.version}`);
  }

  public createConnector(connectorId: string): Connector {
    const factory = this.connectors.get(connectorId);
    if (!factory) {
      throw new BridgeError(
        ErrorCode.CONNECTOR_NOT_FOUND,
        `No se encontró el conector registrado con ID: "${connectorId}". Conectores disponibles: ${Array.from(this.connectors.keys()).join(', ')}`
      );
    }
    return factory();
  }

  public getAvailableConnectors(): ConnectorMetadata[] {
    return Array.from(this.metadataMap.values());
  }

  public hasConnector(connectorId: string): boolean {
    return this.connectors.has(connectorId);
  }
}
