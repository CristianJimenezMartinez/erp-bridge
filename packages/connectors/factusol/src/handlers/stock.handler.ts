import { ReadStockOptions } from '@erp-bridge/sdk';
import { CanonicalStock, Logger } from '@erp-bridge/shared';
import { AccessDriver } from '../access-driver';
import { readStockBySkusQuery, readStockQuery, resolveStockWarehouse } from '../queries';
import { FactusolStockRaw, FactusolStockMapper } from '../mappers';
import { FactusolConnectionConfig } from '../factusol.types';

export class FactusolStockHandler {
  constructor(
    private readonly driver: AccessDriver,
    private readonly config: FactusolConnectionConfig,
    private readonly logger: Logger
  ) {}

  public async readStock(options?: ReadStockOptions): Promise<CanonicalStock[]> {
    // F2: política única de stock. Vacío/'GEN' => todos los almacenes; otro código => solo ese almacén.
    const warehouse = resolveStockWarehouse(options?.warehouse || this.config?.defaultWarehouse) ?? undefined;
    const query = options?.skus && options.skus.length > 0
      ? readStockBySkusQuery(options.skus, warehouse)
      : readStockQuery({ ...options, warehouse });

    this.logger.info('Leyendo stock desde Factusol (F_STO)...', { warehouse, skusCount: options?.skus?.length });

    const rawStocks = await this.driver.query<FactusolStockRaw>(query);
    return rawStocks.map((raw) => FactusolStockMapper.toCanonicalStock(raw));
  }
}
