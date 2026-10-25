import { ReadProductsOptions } from '@erp-bridge/sdk';
import { CanonicalProduct, Logger } from '@erp-bridge/shared';
import { AccessDriver } from '../access-driver';
import {
  FACTUSOL_QUERIES,
  FactusolRawArticle,
  FactusolRawFamily,
  FactusolRawPrice,
  FactusolRawStock,
  FactusolRawBarcode,
} from '../queries';
import {
  buildBarcodeMap,
  buildFamilyMap,
  buildPriceMap,
  buildStockMap,
  mapFactusolArticleToCanonical,
} from '../mappers';
import { FactusolConnectionConfig } from '../factusol.types';

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
    // Query in batches of 100 SKUs if skus.length > 150 to stay within Access query length limits.
    // F3: un fallo de lectura NUNCA se convierte en "sin datos" (precio 0 => draft / stock 0):
    // el error se propaga y el lote completo se aborta para no despublicar la tienda por un fallo transitorio.
    const queryInBatches = async <T>(queryFn: (chunk: string[]) => string): Promise<T[]> => {
      if (skus.length > 150) {
        const results: T[] = [];
        const chunkSize = 100;
        for (let i = 0; i < skus.length; i += chunkSize) {
          const chunk = skus.slice(i, i + chunkSize);
          results.push(...(await this.driver.query<T>(queryFn(chunk))));
        }
        return results;
      }
      return this.driver.query<T>(queryFn(skus));
    };

    // F14: cada tarifa distinta se consulta una sola vez por lectura de catálogo.
    const priceCache = new Map<string, Promise<FactusolRawPrice[]>>();
    const getPricesCached = (code: string): Promise<FactusolRawPrice[]> => {
      let p = priceCache.get(code);
      if (!p) {
        p = queryInBatches<FactusolRawPrice>((chunk) => FACTUSOL_QUERIES.getPrices(code, chunk));
        priceCache.set(code, p);
      }
      return p;
    };

    // F2: política única de stock (todos los almacenes salvo almacén configurado distinto de GEN).
    const stocks = await queryInBatches<FactusolRawStock>((chunk) =>
      FACTUSOL_QUERIES.getStock(chunk, this.config.defaultWarehouse)
    );
    const prices = await getPricesCached(tariffCode);
    const defaultPrices = tariffCode !== '1' ? await getPricesCached('1') : prices;
    const saleTariffCode = this.config.saleTariffCode?.trim();
    const salePrices = (saleTariffCode && saleTariffCode !== tariffCode)
      ? await getPricesCached(saleTariffCode)
      : [];
    const families = await this.driver.query<FactusolRawFamily>(FACTUSOL_QUERIES.getFamilies());
    const auxiliaryBarcodes = await queryInBatches<FactusolRawBarcode>((chunk) =>
      FACTUSOL_QUERIES.getAuxiliaryBarcodes(chunk)
    );

    // F3 fail-safe: ningún precio positivo en la tarifa configurada ni en la tarifa 1 con artículos presentes
    // indica casi seguro un fallo de lectura/tarifa errónea: abortar en vez de publicar todo como draft.
    if (!this.config.allowEmptyPrices) {
      const hasAnyPrice = [...prices, ...defaultPrices].some((p) => Number(p.PRELTA) > 0);
      if (!hasAnyPrice) {
        throw new Error(
          `Factusol: la tarifa '${tariffCode}' (ni la tarifa 1) devolvió ningún precio positivo para ${rawArticles.length} artículos. ` +
            'Lote abortado para evitar despublicar el catálogo (revise la tarifa configurada o la integridad de F_LTA).'
        );
      }
    }
    const stockMap = buildStockMap(stocks);
    const priceMap = buildPriceMap(prices);
    const defaultPriceMap = tariffCode !== '1' ? buildPriceMap(defaultPrices) : priceMap;
    const salePriceMap = buildPriceMap(salePrices);
    const familyMap = buildFamilyMap(families);
    const barcodeMap = buildBarcodeMap(auxiliaryBarcodes);

    // 3. Map to CanonicalProduct
    const canonicalProducts: CanonicalProduct[] = rawArticles.map((raw) =>
      mapFactusolArticleToCanonical(raw, { stockMap, priceMap, defaultPriceMap, salePriceMap, familyMap, barcodeMap })
    );

    this.logger.info(`Lectura de productos de Factusol completada: ${canonicalProducts.length} productos procesados.`);
    return canonicalProducts;
  }
}
