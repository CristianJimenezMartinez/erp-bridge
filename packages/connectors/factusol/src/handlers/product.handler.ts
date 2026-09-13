import { ReadProductsOptions } from '@erp-bridge/sdk';
import { CanonicalProduct, Logger } from '@erp-bridge/shared';
import { AccessDriver } from '../access-driver';
import {
  FACTUSOL_QUERIES,
  FactusolRawArticle,
  FactusolRawFamily,
  FactusolRawPrice,
  FactusolRawStock,
} from '../queries';
import {
  buildFamilyMap,
  buildPriceMap,
  buildStockMap,
  mapFactusolArticleToCanonical,
} from '../mappers';
import { FactusolConnectionConfig } from '../factusol.connector';

export class FactusolProductHandler {
  constructor(
    private readonly driver: AccessDriver,
    private readonly config: FactusolConnectionConfig,
    private readonly logger: Logger
  ) {}

  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    const activeOnly = options?.activeOnly ?? this.config.activeOnly ?? true;
    const limit = options?.limit;

    this.logger.info('Leyendo productos de Factusol...', { activeOnly, limit });

    // 1. Fetch raw articles
    const articleQuery = activeOnly
      ? FACTUSOL_QUERIES.getArticles(true, limit)
      : FACTUSOL_QUERIES.getAllArticles(limit);

    const rawArticles = await this.driver.query<FactusolRawArticle>(articleQuery);

    // 2. Fetch stock, prices, and families sequentially for enrichment
    const stocks = await this.driver.query<FactusolRawStock>(FACTUSOL_QUERIES.getStock()).catch(() => [] as FactusolRawStock[]);
    const prices = await this.driver.query<FactusolRawPrice>(FACTUSOL_QUERIES.getPrices(this.config.tariffCode || '1')).catch(() => [] as FactusolRawPrice[]);
    const families = await this.driver.query<FactusolRawFamily>(FACTUSOL_QUERIES.getFamilies()).catch(() => [] as FactusolRawFamily[]);

    const stockMap = buildStockMap(stocks);
    const priceMap = buildPriceMap(prices);
    const familyMap = buildFamilyMap(families);

    // 3. Map to CanonicalProduct
    const canonicalProducts: CanonicalProduct[] = rawArticles.map((raw) =>
      mapFactusolArticleToCanonical(raw, { stockMap, priceMap, familyMap })
    );

    this.logger.info(`Lectura de productos de Factusol completada: ${canonicalProducts.length} productos procesados.`);
    return canonicalProducts;
  }
}
