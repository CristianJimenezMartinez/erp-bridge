export interface StockMappingEntry {
  sku: string;
  idProduct: number;
  idProductAttribute: number;
  idStockAvailable: number;
}

export class StockMappingCache {
  private readonly skuToMapping = new Map<string, StockMappingEntry>();
  private readonly productAttrToMapping = new Map<string, StockMappingEntry>();

  public set(entry: StockMappingEntry): void {
    if (entry.sku) {
      this.skuToMapping.set(entry.sku.toLowerCase(), entry);
    }
    const key = `${entry.idProduct}:${entry.idProductAttribute}`;
    this.productAttrToMapping.set(key, entry);
  }

  public getBySku(sku: string): StockMappingEntry | undefined {
    return this.skuToMapping.get(sku.toLowerCase());
  }

  public getByProductAttr(idProduct: number, idProductAttribute: number): StockMappingEntry | undefined {
    return this.productAttrToMapping.get(`${idProduct}:${idProductAttribute}`);
  }

  public has(sku: string): boolean {
    return this.skuToMapping.has(sku.toLowerCase());
  }

  public populate(entries: StockMappingEntry[]): void {
    for (const entry of entries) {
      this.set(entry);
    }
  }

  public size(): number {
    return this.skuToMapping.size;
  }

  public clear(): void {
    this.skuToMapping.clear;
    this.skuToMapping.clear();
    this.productAttrToMapping.clear();
  }
}
