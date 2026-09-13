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

    if (rawArticles.length === 0) {
      this.logger.info('No se encontraron artículos en Factusol.');
      return [];
    }

    const skus = rawArticles.map((a) => a.CODART);
    const tariffCode = this.config.tariffCode || '1';

    // 2. Fetch stock, prices, and families sequentially for enrichment
    // Query in batches of 100 SKUs if skus.length > 150 to stay within Access query length limits
    const queryInBatches = async <T>(queryFn: (chunk: string[]) => string): Promise<T[]> => {
      if (skus.length > 150) {
        const results: T[] = [];
        const chunkSize = 100;
        for (let i = 0; i < skus.length; i += chunkSize) {
          const chunk = skus.slice(i, i + chunkSize);
          const chunkResults = await this.driver.query<T>(queryFn(chunk)).catch(() => [] as T[]);
          results.push(...chunkResults);
        }
        return results;
      }
      return this.driver.query<T>(queryFn(skus)).catch(() => [] as T[]);
    };

    const stocks = await queryInBatches<FactusolRawStock>((chunk) => FACTUSOL_QUERIES.getStock(chunk));
    const prices = await queryInBatches<FactusolRawPrice>((chunk) => FACTUSOL_QUERIES.getPrices(tariffCode, chunk));
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
