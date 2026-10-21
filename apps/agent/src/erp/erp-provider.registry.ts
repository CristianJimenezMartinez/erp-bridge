import { ConfigManager } from '../config/config.manager';
import { IErpConnector } from './erp-connector.interface';
import { SupportedErpProviderId } from './erp.types';

export class ErpProviderRegistry {
  private readonly connectors = new Map<SupportedErpProviderId, IErpConnector>();

  constructor(
    private readonly configManager: ConfigManager,
    factusolAdapterOrList?: IErpConnector | IErpConnector[],
    simplygestAdapter?: IErpConnector
  ) {
    if (Array.isArray(factusolAdapterOrList)) {
      for (const conn of factusolAdapterOrList) {
        this.register(conn);
      }
    } else if (factusolAdapterOrList) {
      this.register(factusolAdapterOrList);
    }
    if (simplygestAdapter) {
      this.register(simplygestAdapter);
    }
  }

  public register(connector: IErpConnector): void {
    this.connectors.set(connector.providerId, connector);
  }

  public getConnector(id: SupportedErpProviderId): IErpConnector {
    const conn = this.connectors.get(id);
    if (!conn) {
      throw new Error(`Proveedor ERP no soportado o no registrado: ${id}`);
    }
    return conn;
  }

  public getActiveProviderId(): SupportedErpProviderId {
    const cfg = this.configManager.get();

    // 1. Configuración explícita en softwareErp
    if (cfg.softwareErp?.activeProvider) {
      return cfg.softwareErp.activeProvider;
    }

    // 2. Campo legacy erpType
    if (
      cfg.erpType === 'simplygest' ||
      cfg.erpType === 'factusol' ||
      cfg.erpType === 'agora' ||
      cfg.erpType === 'sage50' ||
      cfg.erpType === 'a3erp'
    ) {
      return cfg.erpType;
    }

    // 3. Fallback heurístico inteligente
    const hasSg = Boolean(cfg.simplygest?.databasePath || cfg.simplygestDbPath);
    const hasFs = Boolean(cfg.factusol?.databasePath || cfg.factusolDbPath);
    if (hasSg && !hasFs) {
      return 'simplygest';
    }

    return 'factusol';
  }

  public getActiveConnector(): IErpConnector {
    const activeId = this.getActiveProviderId();
    const conn = this.connectors.get(activeId);
    if (conn) {
      return conn;
    }
    // Fallback defensivo al primer conector registrado
    const first = this.connectors.values().next().value;
    if (first) {
      return first;
    }
    throw new Error('No hay conectores ERP registrados en el sistema.');
  }

  public getAllConnectors(): IErpConnector[] {
    return Array.from(this.connectors.values());
  }

  public isProvisioned(): boolean {
    const cfg = this.configManager.get();
    if (cfg.softwareErp?.provisioned !== undefined) {
      return cfg.softwareErp.provisioned;
    }
    return Boolean(
      cfg.factusol?.databasePath ||
      cfg.factusolDbPath ||
      cfg.simplygest?.databasePath ||
      cfg.simplygestDbPath
    );
  }

  public setActiveProvider(id: SupportedErpProviderId): void {
    const cfg = this.configManager.get();
    cfg.erpType = id;
    if (!cfg.softwareErp) {
      cfg.softwareErp = {
        activeProvider: id,
        provisioned: true,
        providers: {},
      };
    }
    cfg.softwareErp.activeProvider = id;
    cfg.softwareErp.provisioned = true;
    this.configManager.saveConfigToDisk();
  }
}
