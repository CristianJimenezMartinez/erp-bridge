import { ReadStockOptions } from '@erp-bridge/sdk';
import { CanonicalStock, Logger } from '@erp-bridge/shared';
import { AccessDriver } from '../access-driver';
import { readStockBySkusQuery, readStockQuery } from '../queries';
import { FactusolStockRaw, FactusolStockMapper } from '../mappers';
import { FactusolConnectionConfig } from '../factusol.connector';

export class FactusolStockHandler {
  constructor(
    private readonly driver: AccessDriver,
    private readonly config: FactusolConnectionConfig,
    private readonly logger: Logger
  ) {}

  public async readStock(options?: ReadStockOptions): Promise<CanonicalStock[]> {
    const warehouse = options?.warehouse || this.config?.defaultWarehouse;
    const query = options?.skus && options.skus.length > 0
      ? readStockBySkusQuery(options.skus, warehouse)
      : readStockQuery({ ...options, warehouse });

    this.logger.info('Leyendo stock desde Factusol (F_STO)...', { warehouse, skusCount: options?.skus?.length });

    const rawStocks = await this.driver.query<FactusolStockRaw>(query);
    return rawStocks.map((raw) => FactusolStockMapper.toCanonicalStock(raw));
  }
}
