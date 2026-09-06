import { CanonicalProduct, CanonicalCategory } from '@erp-bridge/shared';
import {
  FactusolRawArticle,
  FactusolRawFamily,
  FactusolRawPrice,
  FactusolRawStock,
} from '../queries';

export interface FactusolEnrichmentData {
  stockMap?: Map<string, number>;
  priceMap?: Map<string, number>;
  familyMap?: Map<string, string>;
}

export function mapFactusolArticleToCanonical(
  raw: FactusolRawArticle,
  enrichment?: FactusolEnrichmentData
): CanonicalProduct {
  const code = String(raw.CODART ?? '').trim();
  const name = String(raw.DESART ?? '').trim() || `Artículo ${code}`;
  const description = String(raw.DEWART ?? '').trim() || name;
  const costPrice = typeof raw.PCOART === 'number' ? raw.PCOART : Number(raw.PCOART) || 0;

  // Retrieve price from tariff map or fallback to cost price
  let regularPrice = costPrice;
  if (enrichment?.priceMap && enrichment.priceMap.has(code)) {
    const tariffPrice = enrichment.priceMap.get(code);
    if (tariffPrice !== undefined && tariffPrice > 0) {
      regularPrice = tariffPrice;
    }
  }

  // Retrieve stock quantity
  let stockQuantity = 0;
  if (enrichment?.stockMap && enrichment.stockMap.has(code)) {
    stockQuantity = enrichment.stockMap.get(code) || 0;
  }

  // Retrieve family category
  const categories: CanonicalCategory[] = [];
  const familyCode = String(raw.FAMART ?? '').trim();
  if (familyCode) {
    const familyName = enrichment?.familyMap?.get(familyCode) || familyCode;
    categories.push({
      id: familyCode,
      name: familyName,
      slug: familyCode.toLowerCase(),
    });
  }

  // Status check
  const suwartStr = String(raw.SUWART ?? '').trim();
  const isWebActive = suwartStr === '1' || suwartStr === 'S' || suwartStr === 'True' || suwartStr === '-1';
  const status = isWebActive ? 'published' : 'draft';

  const barcodeStr = String(raw.EANART ?? '').trim();
  const barcode = barcodeStr ? barcodeStr : undefined;
  const weight = typeof raw.PESART === 'number' && raw.PESART > 0 ? raw.PESART : undefined;
  const imgStr = String(raw.IMGART ?? '').trim();

  return {
    id: `factusol_${code}`,
    sku: code,
    name,
    description,
    shortDescription: name,
    regularPrice,
    costPrice,
    stockQuantity,
    manageStock: true,
    inStock: stockQuantity > 0,
    status,
    categories,
    barcode,
    weight,
    images: imgStr ? [{ url: imgStr, alt: name }] : [],
    attributes: {
      unit: String(raw.UUMART ?? '').trim(),
      familyCode,
    },
    rawSourceData: raw as unknown as Record<string, unknown>,
  };
}

export function buildStockMap(stocks: FactusolRawStock[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of stocks) {
    const code = String(s.ARTSTO ?? '').trim();
    if (!code) continue;
    const current = map.get(code) || 0;
    const qty = typeof s.ACTSTO === 'number' ? s.ACTSTO : Number(s.ACTSTO) || 0;
    map.set(code, current + qty);
  }
  return map;
}

export function buildPriceMap(prices: FactusolRawPrice[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of prices) {
    const code = String(p.ARTLTA ?? '').trim();
    if (!code) continue;
    const price = typeof p.PRELTA === 'number' ? p.PRELTA : Number(p.PRELTA) || 0;
    map.set(code, price);
  }
  return map;
}

export function buildFamilyMap(families: FactusolRawFamily[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of families) {
    const code = String(f.CODFAM ?? '').trim();
    if (!code) continue;
    const name = String(f.DESFAM ?? '').trim() || code;
    map.set(code, name);
  }
  return map;
}
