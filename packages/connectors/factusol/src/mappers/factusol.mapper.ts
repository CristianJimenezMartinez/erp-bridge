import { CanonicalProduct, CanonicalCategory } from '@erp-bridge/shared';
import {
  FactusolRawArticle,
  FactusolRawFamily,
  FactusolRawPrice,
  FactusolRawStock,
  FactusolRawBarcode,
} from '../queries';
export {
  FactusolStockRaw,
  FactusolStockMapper,
  mapFactusolStockToCanonical,
  mapCanonicalStockToFactusol,
} from './stock.mapper';

export interface FactusolEnrichmentData {
  stockMap?: Map<string, number>;
  actualStockMap?: Map<string, number>;
  priceMap?: Map<string, number>;
  defaultPriceMap?: Map<string, number>;
  salePriceMap?: Map<string, number>;
  familyMap?: Map<string, string>;
  barcodeMap?: Map<string, string[]>;
}

export function mapTivartToTaxRate(tivart?: number | string | null): number {
  const code = Number(tivart);
  switch (code) {
    case 0:
      return 21.0;
    case 1:
      return 10.0;
    case 2:
      return 4.0;
    case 3:
      return 0.0;
    default:
      return 21.0;
  }
}

export function mapFactusolArticleToCanonical(
  raw: FactusolRawArticle,
  enrichment?: FactusolEnrichmentData
): CanonicalProduct {
  const code = String(raw.CODART ?? '').trim();
  const name = String(raw.DESART ?? '').trim() || `Artículo ${code}`;
  const description = String(raw.DEWART ?? '').trim() || name;
  const costPrice = typeof raw.PCOART === 'number' ? raw.PCOART : Number(raw.PCOART) || 0;

  // Retrieve price from tariff map with fallback to default tariff 1 (PVP).
  // JAMAS asignar PCOART (coste mayorista) como regularPrice.
  let regularPrice = 0;
  if (enrichment?.priceMap && enrichment.priceMap.has(code)) {
    const tariffPrice = enrichment.priceMap.get(code);
    if (tariffPrice !== undefined && tariffPrice > 0) {
      regularPrice = tariffPrice;
    }
  }

  // Fallback to default price map (Tarifa 1 / PVP) if configured tariff has no price or <= 0
  if (regularPrice <= 0 && enrichment?.defaultPriceMap && enrichment.defaultPriceMap.has(code)) {
    const defaultPrice = enrichment.defaultPriceMap.get(code);
    if (defaultPrice !== undefined && defaultPrice > 0) {
      regularPrice = defaultPrice;
    }
  }

  // Precios tachados / ofertas: solo aplica si salePrice > 0 y es menor que regularPrice
  let salePrice: number | undefined;
  if (regularPrice > 0 && enrichment?.salePriceMap && enrichment.salePriceMap.has(code)) {
    const rawSale = enrichment.salePriceMap.get(code);
    if (rawSale !== undefined && rawSale > 0 && rawSale < regularPrice) {
      salePrice = rawSale;
    }
  }

  // Retrieve stock quantity (available quantity DISSTO preferred to prevent overselling)
  // Si no existe ningún precio público en ninguna tarifa, asigna regularPrice = 0 y stock 0 / no disponible para la venta web
  let stockQuantity = 0;
  if (regularPrice > 0) {
    if (enrichment?.stockMap && enrichment.stockMap.has(code)) {
      stockQuantity = enrichment.stockMap.get(code) || 0;
    }
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

  // Status check: si no existe precio público válido, no disponible para la venta web ('draft')
  const suwartStr = String(raw.SUWART ?? '').trim();
  const isWebActive = (suwartStr === '1' || suwartStr === 'S' || suwartStr === 'True' || suwartStr === '-1') && regularPrice > 0;
  const status = isWebActive ? 'published' : 'draft';

  // Barcodes: merge principal EANART with F_EAN auxiliary barcodes
  const mainBarcode = String(raw.EANART ?? '').trim();
  const auxBarcodes = enrichment?.barcodeMap?.get(code) || [];
  const allBarcodes = [mainBarcode, ...auxBarcodes].map((b) => String(b).trim()).filter(Boolean);
  const uniqueBarcodes = Array.from(new Set(allBarcodes));
  const barcode = uniqueBarcodes[0] || undefined;
  const barcodes = uniqueBarcodes;

  // Tax rate from TIVART (0=21%, 1=10%, 2=4%, 3=0%)
  const taxRate = mapTivartToTaxRate(raw.TIVART);

  const weight = typeof raw.PESART === 'number' && raw.PESART > 0 ? raw.PESART : undefined;
  const imgStr = String(raw.IMGART ?? '').trim();

  return {
    id: `factusol_${code}`,
    sku: code,
    name,
    description,
    shortDescription: name,
    regularPrice,
    salePrice,
    costPrice,
    stockQuantity,
    manageStock: true,
    inStock: regularPrice > 0 && stockQuantity > 0,
    status,
    categories,
    barcode,
    barcodes,
    taxRate,
    weight,
    images: imgStr ? [{ url: imgStr, alt: name }] : [],
    attributes: {
      unit: String(raw.DESUME ?? raw.UMEART ?? raw.UUMART ?? '').trim(),
      familyCode,
      taxRate: String(taxRate),
      tivart: String(raw.TIVART ?? 0),
      stoart: String(raw.STOART ?? ''),
      cp1: raw.CP1ART ? String(raw.CP1ART).trim() : '',
      cp2: raw.CP2ART ? String(raw.CP2ART).trim() : '',
      cp3: raw.CP3ART ? String(raw.CP3ART).trim() : '',
      cp4: raw.CP4ART ? String(raw.CP4ART).trim() : '',
      cp5: raw.CP5ART ? String(raw.CP5ART).trim() : '',
      webMemo: raw.MEWART ? String(raw.MEWART).trim() : '',
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
    // Map available quantity (DISSTO) if present, fallback to actual (ACTSTO)
    const qty = typeof s.DISSTO === 'number' ? s.DISSTO : (typeof s.ACTSTO === 'number' ? s.ACTSTO : Number(s.DISSTO ?? s.ACTSTO) || 0);
    map.set(code, current + qty);
  }
  return map;
}

export function buildActualStockMap(stocks: FactusolRawStock[]): Map<string, number> {
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

export function buildAvailableStockMap(stocks: FactusolRawStock[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of stocks) {
    const code = String(s.ARTSTO ?? '').trim();
    if (!code) continue;
    const current = map.get(code) || 0;
    const qty = typeof s.DISSTO === 'number' ? s.DISSTO : Number(s.DISSTO) || 0;
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

export function buildBarcodeMap(barcodes: FactusolRawBarcode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const b of barcodes) {
    const code = String(b.ARTEAN ?? '').trim();
    const barcode = String(b.EANEAN ?? '').trim();
    if (!code || !barcode) continue;
    const list = map.get(code) || [];
    if (!list.includes(barcode)) {
      list.push(barcode);
    }
    map.set(code, list);
  }
  return map;
}

