import type {
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalOrderLine,
} from '@erp-bridge/shared';
import type {
  OrderMutationResult,
} from '@erp-bridge/sdk';

export interface FactusolRawArticle {
  CODART: string;
  DESART: string;
  DEWART?: string;
  EANART?: string;
  FAMART?: string;
  PCOART?: number;
  SUWART?: string;
  IMGART?: string;
  UUMART?: string;
  PESART?: number;
  FALART?: string;
  FUMART?: string;
  UMEART?: string;
  CP1ART?: string;
  CP2ART?: string;
  CP3ART?: string;
  CP4ART?: string;
  CP5ART?: string;
  MEWART?: string;
  variants?: Array<{
    code: string;
    sku: string;
    name: string;
    size?: string;
    color?: string;
    barcode?: string;
    stock?: number;
    price?: number;
  }>;
}

export interface FactusolRawStock {
  ARTSTO: string;
  ALMSTO: string;
  ACTSTO: number;
  DISSTO: number;
  MINSTO: number;
}

export interface FactusolRawPrice {
  TARLTA: string;
  ARTLTA: string;
  PRELTA: number;
}

export interface FactusolCustomerRaw {
  CODCLI: number;
  NOFCLI: string;
  NOCCLI?: string;
  NIFCLI?: string;
  DOMCLI?: string;
  POBCLI?: string;
  CPOCLI?: string;
  PROCLI?: string;
  TELCLI?: string;
  TARCLI?: number;
  EMACLI?: string;
  OBSCLI?: string;
  REQCLI?: number; // 1 = recargo de equivalencia, 0 = no
  FALCLI?: string;
}

export interface FactusolDeliveryAddressRaw {
  CLIDCL: number;
  CODDCL: number;
  NOMDCL: string;
  DOMDCL: string;
  POBDCL: string;
  CPODCL: string;
  PRODCL: string;
  TELDCL: string;
}

export interface FactusolOrderRaw {
  TIPPCL: string;
  CODPCL: number;
  REFPCL?: string;
  FECPCL: string;
  AGEPCL?: number;
  CLIPCL: number;
  CNOPCL?: string;
  CDOPCL?: string;
  CPOPCL?: string;
  CCPPCL?: string;
  CPRPCL?: string;
  CNIPCL?: string;
  TELPCL?: string;
  TIVPCL?: number;
  REQPCL?: number;
  ESTPCL?: number;
  ALMPCL?: string;
  NET1PCL?: number;
  PIVA1PCL?: number;
  PIVA2PCL?: number;
  PIVA3PCL?: number;
  IIVA1PCL?: number;
  IPOR1PCL?: number;
  TOTPCL?: number;
  FOPPCL?: string;
  OB1PCL?: string;
  CEMPCL?: string;
  HORPCL?: string;
}

export interface FactusolOrderLineRaw {
  TIPLPC: string;
  CODLPC: number;
  POSLPC: number;
  ARTLPC: string;
  DESLPC?: string;
  CANLPC: number;
  DT1LPC?: number;
  IVALPC?: number;
  PRELPC: number;
  TOTLPC: number;
  PIVLPC?: number;
  TIVLPC?: number;
}

export interface OrderFinancialSummary {
  netAmount: number;
  taxAmount: number;
  surchargeAmount: number;
  shippingAmount: number;
  totalAmount: number;
  brackets: Array<{
    vatRate: number;
    reRate: number;
    base: number;
    vatAmount: number;
    reAmount: number;
  }>;
}

export class MockErpSimulator {
  // In-memory Factusol tables
  public articles = new Map<string, FactusolRawArticle>();
  public stock = new Map<string, FactusolRawStock>(); // key: `${ALMSTO}_${ARTSTO}`
  public prices = new Map<string, FactusolRawPrice>(); // key: `${TARLTA}_${ARTLTA}`
  public customers = new Map<number, FactusolCustomerRaw>();
  public deliveryAddresses = new Map<string, FactusolDeliveryAddressRaw>(); // key: `${CLIDCL}_${CODDCL}`
  public orders = new Map<string, FactusolOrderRaw>(); // key: `${TIPPCL}_${CODPCL}`
  public orderLines: FactusolOrderLineRaw[] = [];

  // Correlative sequences per series
  private seriesCounters = new Map<string, number>();
  private nextCustomerCode = 1;
  private nextDeliveryAddressCode = new Map<number, number>();

  // Concurrency Mutex for order numbering and customer deduplication
  private orderLockQueue: Array<() => void> = [];
  private isProcessingOrder = false;

  constructor() {}

  // ==========================================
  // Correlative & Series Lock
  // ==========================================

  private async acquireLock(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.orderLockQueue.length > 0) {
          const next = this.orderLockQueue.shift();
          next?.();
        } else {
          this.isProcessingOrder = false;
        }
      };

      if (!this.isProcessingOrder) {
        this.isProcessingOrder = true;
        resolve(release);
      } else {
        this.orderLockQueue.push(() => resolve(release));
      }
    });
  }

  public getNextOrderCode(series = ' '): number {
    const s = series || ' ';
    const current = this.seriesCounters.get(s) ?? 0;
    const next = current + 1;
    this.seriesCounters.set(s, next);
    return next;
  }

  public getCurrentOrderCode(series = ' '): number {
    const s = series || ' ';
    return this.seriesCounters.get(s) ?? 0;
  }

  // ==========================================
  // NIF Normalization & Customer Deduplication
  // ==========================================

  public static normalizeTaxId(taxId?: string): string {
    if (!taxId) return '';
    const cleaned = String(taxId).replace(/[\s\-_.]/g, '').toUpperCase();
    if (cleaned.startsWith('ES') && cleaned.length > 2) {
      return cleaned.substring(2);
    }
    return cleaned;
  }

  public findCustomerByNif(taxId: string): FactusolCustomerRaw | null {
    const clean = MockErpSimulator.normalizeTaxId(taxId);
    if (!clean) return null;
    const withEs = `ES${clean}`;

    for (const cust of this.customers.values()) {
      const custNif = MockErpSimulator.normalizeTaxId(cust.NIFCLI);
      if (custNif && (custNif === clean || custNif === withEs || cust.NIFCLI?.toUpperCase() === clean || cust.NIFCLI?.toUpperCase() === withEs)) {
        return cust;
      }
    }
    return null;
  }

  public findCustomerByEmail(email: string): FactusolCustomerRaw | null {
    if (!email) return null;
    const target = email.trim().toLowerCase();

    for (const cust of this.customers.values()) {
      if (cust.EMACLI?.trim().toLowerCase() === target || cust.OBSCLI?.toLowerCase().includes(target)) {
        return cust;
      }
    }
    return null;
  }

  public async findCustomer(criteria: { taxId?: string; email?: string }): Promise<FactusolCustomerRaw | null> {
    if (criteria.taxId) {
      const found = this.findCustomerByNif(criteria.taxId);
      if (found) return found;
    }
    if (criteria.email) {
      const found = this.findCustomerByEmail(criteria.email);
      if (found) return found;
    }
    return null;
  }

  public async createOrGetCustomer(
    canonicalCust: CanonicalCustomer,
    options?: { hasEquivalenceSurcharge?: boolean }
  ): Promise<{ customer: FactusolCustomerRaw; isNew: boolean }> {
    const release = await this.acquireLock();
    try {
      // 1. Search by NIF
      const normNif = MockErpSimulator.normalizeTaxId(canonicalCust.taxId);
      let existing = normNif ? this.findCustomerByNif(normNif) : null;

      // 2. Search by Email if no NIF match
      if (!existing && canonicalCust.email) {
        existing = this.findCustomerByEmail(canonicalCust.email);
      }

      if (existing) {
        return { customer: existing, isNew: false };
      }

      // 3. Create new customer with unique atomic CODCLI
      const codcli = this.nextCustomerCode++;
      const addr = canonicalCust.address || { country: 'ES' };
      const reqSurcharge = options?.hasEquivalenceSurcharge || canonicalCust.hasEquivalenceSurcharge ? 1 : 0;

      const newCustomer: FactusolCustomerRaw = {
        CODCLI: codcli,
        NOFCLI: (canonicalCust.fiscalName || 'Cliente').substring(0, 100),
        NOCCLI: (canonicalCust.commercialName || canonicalCust.fiscalName || 'Cliente').substring(0, 100),
        NIFCLI: normNif || canonicalCust.taxId || '',
        DOMCLI: (addr.street || '').substring(0, 100),
        POBCLI: (addr.city || '').substring(0, 30),
        CPOCLI: (addr.postalCode || '').substring(0, 10),
        PROCLI: (addr.state || '').substring(0, 40),
        TELCLI: (canonicalCust.phone || addr.phone || '').substring(0, 50),
        TARCLI: canonicalCust.priceList ?? 1,
        EMACLI: (canonicalCust.email || '').substring(0, 100),
        OBSCLI: canonicalCust.email || '',
        REQCLI: reqSurcharge,
        FALCLI: new Date().toISOString().split('T')[0],
      };

      this.customers.set(codcli, newCustomer);
      return { customer: newCustomer, isNew: true };
    } finally {
      release();
    }
  }

  // ==========================================
  // Financial Calculations (IVA + Recargo de Equivalencia)
  // ==========================================

  public static getVatAndReRate(rate: number): { vatRate: number; reRate: number; bracket: number } {
    const roundedRate = Math.round(rate);
    if (roundedRate === 21) {
      return { vatRate: 21.0, reRate: 5.2, bracket: 1 };
    }
    if (roundedRate === 10) {
      return { vatRate: 10.0, reRate: 1.4, bracket: 2 };
    }
    if (roundedRate === 4) {
      return { vatRate: 4.0, reRate: 0.5, bracket: 3 };
    }
    return { vatRate: rate, reRate: 0.0, bracket: 0 };
  }

  public static round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  public calculateOrderFinancials(
    lines: CanonicalOrderLine[],
    hasEquivalenceSurcharge: boolean,
    shippingAmount = 0
  ): OrderFinancialSummary {
    const bracketMap = new Map<number, { vatRate: number; reRate: number; base: number }>();

    for (const line of lines) {
      const qty = Number(line.quantity || 1);
      const price = Number(line.unitPrice || 0);
      const discount = Number(line.discountPercent || 0);
      const lineNet = MockErpSimulator.round2(qty * price * (1 - discount / 100));

      const vatInfo = MockErpSimulator.getVatAndReRate(line.vatPercent ?? (line as any).vatRate ?? 21);
      const current = bracketMap.get(vatInfo.bracket) || {
        vatRate: vatInfo.vatRate,
        reRate: hasEquivalenceSurcharge ? vatInfo.reRate : 0,
        base: 0,
      };
      current.base = MockErpSimulator.round2(current.base + lineNet);
      bracketMap.set(vatInfo.bracket, current);
    }

    let netAmount = 0;
    let taxAmount = 0;
    let surchargeAmount = 0;
    const brackets: OrderFinancialSummary['brackets'] = [];

    for (const [, info] of bracketMap) {
      const vatAmount = MockErpSimulator.round2((info.base * info.vatRate) / 100);
      const reAmount = hasEquivalenceSurcharge ? MockErpSimulator.round2((info.base * info.reRate) / 100) : 0;

      netAmount = MockErpSimulator.round2(netAmount + info.base);
      taxAmount = MockErpSimulator.round2(taxAmount + vatAmount);
      surchargeAmount = MockErpSimulator.round2(surchargeAmount + reAmount);

      brackets.push({
        vatRate: info.vatRate,
        reRate: info.reRate,
        base: info.base,
        vatAmount,
        reAmount,
      });
    }

    const shipNet = MockErpSimulator.round2(shippingAmount);
    const shipVat = MockErpSimulator.round2(shipNet * 0.21);
    const shipRe = hasEquivalenceSurcharge ? MockErpSimulator.round2(shipNet * 0.052) : 0;

    const finalNet = MockErpSimulator.round2(netAmount + shipNet);
    const finalTax = MockErpSimulator.round2(taxAmount + shipVat);
    const finalRe = MockErpSimulator.round2(surchargeAmount + shipRe);
    const totalAmount = MockErpSimulator.round2(finalNet + finalTax + finalRe);

    return {
      netAmount: finalNet,
      taxAmount: finalTax,
      surchargeAmount: finalRe,
      shippingAmount: shipNet,
      totalAmount,
      brackets,
    };
  }

  // ==========================================
  // Order Creation & Idempotency
  // ==========================================

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    const series = (order.series || '1').trim();
    const reference = order.reference || order.orderNumber;

    // 1. Idempotency check: find by reference in existing orders
    if (reference) {
      for (const ord of this.orders.values()) {
        if (ord.REFPCL === reference) {
          return {
            success: true,
            orderId: order.id,
            externalId: String(ord.CODPCL),
            orderNumber: String(ord.CODPCL),
            status: 'processing',
          };
        }
      }
    }

    // 2. Customer Deduplication (thread-safe)
    const hasSurcharge = Boolean(order.customer.hasEquivalenceSurcharge || order.hasEquivalenceSurcharge);
    const { customer } = await this.createOrGetCustomer(order.customer, {
      hasEquivalenceSurcharge: hasSurcharge,
    });

    // 3. Alternative delivery address check
    const fiscalAddr = order.billingAddress || order.customer.address;
    const shipAddr = order.shippingAddress;
    const isDifferent = Boolean(
      shipAddr &&
      fiscalAddr &&
      (
        (shipAddr.street && fiscalAddr.street && shipAddr.street.trim().toLowerCase() !== fiscalAddr.street.trim().toLowerCase()) ||
        (shipAddr.postalCode && fiscalAddr.postalCode && shipAddr.postalCode.trim() !== fiscalAddr.postalCode.trim())
      )
    );

    if (isDifferent && shipAddr && shipAddr.street) {
      const nextDirCode = (this.nextDeliveryAddressCode.get(customer.CODCLI) ?? 0) + 1;
      this.nextDeliveryAddressCode.set(customer.CODCLI, nextDirCode);
      const dclKey = `${customer.CODCLI}_${nextDirCode}`;
      this.deliveryAddresses.set(dclKey, {
        CLIDCL: customer.CODCLI,
        CODDCL: nextDirCode,
        NOMDCL: [shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(' ') || customer.NOFCLI,
        DOMDCL: shipAddr.street,
        POBDCL: shipAddr.city || '',
        CPODCL: shipAddr.postalCode || '',
        PRODCL: shipAddr.state || '',
        TELDCL: shipAddr.phone || customer.TELCLI || '',
      });
    }

    // 4. Calculate Financials
    const financials = this.calculateOrderFinancials(
      order.lines,
      hasSurcharge,
      Number(order.shippingAmount || 0)
    );

    // 5. Atomic Correlative Assignment under lock
    const release = await this.acquireLock();
    let orderCode = 0;
    try {
      orderCode = this.getNextOrderCode(series);

      const orderKey = `${series}_${orderCode}`;
      const orderDate = order.date ? new Date(order.date) : new Date();

      const orderRaw: FactusolOrderRaw = {
        TIPPCL: series,
        CODPCL: orderCode,
        REFPCL: reference,
        FECPCL: orderDate.toISOString().split('T')[0] || '',
        CLIPCL: customer.CODCLI,
        CNOPCL: customer.NOFCLI,
        CDOPCL: order.shippingAddress?.street || customer.DOMCLI,
        CPOPCL: order.shippingAddress?.postalCode || customer.CPOCLI,
        CPRPCL: order.shippingAddress?.state || customer.PROCLI,
        CNIPCL: customer.NIFCLI,
        TELPCL: order.customer.phone || customer.TELCLI,
        REQPCL: hasSurcharge ? 1 : 0,
        ESTPCL: 0, // Pending
        ALMPCL: order.warehouse || 'GEN',
        NET1PCL: financials.netAmount,
        PIVA1PCL: 21.0,
        PIVA2PCL: 10.0,
        PIVA3PCL: 4.0,
        IIVA1PCL: financials.taxAmount,
        IPOR1PCL: financials.shippingAmount,
        TOTPCL: financials.totalAmount,
        FOPPCL: order.paymentMethod || 'TAR',
        OB1PCL: order.notes || '',
        CEMPCL: customer.EMACLI,
        HORPCL: orderDate.toTimeString().split(' ')[0] || '',
      };

      this.orders.set(orderKey, orderRaw);

      // Insert Lines
      order.lines.forEach((line, idx) => {
        const lineTotal = MockErpSimulator.round2(
          Number(line.quantity || 1) * Number(line.unitPrice || 0) * (1 - Number(line.discountPercent || 0) / 100)
        );
        const vatInfo = MockErpSimulator.getVatAndReRate(line.vatPercent ?? (line as any).vatRate ?? 21);

        const lineRaw: FactusolOrderLineRaw = {
          TIPLPC: series,
          CODLPC: orderCode,
          POSLPC: idx + 1,
          ARTLPC: (line.sku || 'GENERICO').substring(0, 13),
          DESLPC: (line.name || 'Artículo').substring(0, 50),
          CANLPC: Number(line.quantity || 1),
          DT1LPC: Number(line.discountPercent || 0),
          IVALPC: 0,
          PRELPC: Number(line.unitPrice || 0),
          TOTLPC: lineTotal,
          PIVLPC: vatInfo.vatRate,
          TIVLPC: vatInfo.bracket,
        };

        this.orderLines.push(lineRaw);

        // Deduct Stock in F_STO
        const warehouse = order.warehouse || 'GEN';
        const stockKey = `${warehouse}_${line.sku.trim().toUpperCase()}`;
        const currentStock = this.stock.get(stockKey);
        if (currentStock) {
          currentStock.DISSTO = Math.max(0, currentStock.DISSTO - Number(line.quantity || 1));
          currentStock.ACTSTO = Math.max(0, currentStock.ACTSTO - Number(line.quantity || 1));
        }
      });
    } finally {
      release();
    }

    return {
      success: true,
      orderId: order.id,
      externalId: String(orderCode),
      orderNumber: String(orderCode),
      status: 'pending',
    };
  }

  // ==========================================
  // Stock & Catalog Seeding API
  // ==========================================

  public seedArticles(articlesList: Partial<FactusolRawArticle>[]): this {
    for (const a of articlesList) {
      if (!a.CODART) continue;
      const cod = a.CODART.trim().toUpperCase();
      const article: FactusolRawArticle = {
        CODART: cod,
        DESART: a.DESART || `Artículo ${cod}`,
        DEWART: a.DEWART,
        EANART: a.EANART || `8400000${cod.slice(-6).padStart(6, '0')}`,
        FAMART: a.FAMART || 'GEN',
        PCOART: a.PCOART ?? 10.0,
        SUWART: a.SUWART ?? '1',
        UMEART: a.UMEART || 'UDS',
        PESART: a.PESART ?? 0.5,
        CP1ART: a.CP1ART,
        CP2ART: a.CP2ART,
        variants: a.variants,
      };
      this.articles.set(cod, article);
    }
    return this;
  }

  public seedStock(stockList: Partial<FactusolRawStock>[]): this {
    for (const s of stockList) {
      if (!s.ARTSTO) continue;
      const sku = s.ARTSTO.trim().toUpperCase();
      const wh = s.ALMSTO || 'GEN';
      const key = `${wh}_${sku}`;
      const qty = s.DISSTO ?? s.ACTSTO ?? 0;
      this.stock.set(key, {
        ARTSTO: sku,
        ALMSTO: wh,
        ACTSTO: s.ACTSTO ?? qty,
        DISSTO: qty,
        MINSTO: s.MINSTO ?? 0,
      });
    }
    return this;
  }

  public setStock(sku: string, quantity: number, warehouse = 'GEN'): this {
    const s = sku.trim().toUpperCase();
    const key = `${warehouse}_${s}`;
    this.stock.set(key, {
      ARTSTO: s,
      ALMSTO: warehouse,
      ACTSTO: quantity,
      DISSTO: quantity,
      MINSTO: 0,
    });
    return this;
  }

  public getStock(sku: string, warehouse = 'GEN'): number {
    const key = `${warehouse}_${sku.trim().toUpperCase()}`;
    return this.stock.get(key)?.DISSTO ?? 0;
  }

  public getAllStock(warehouse = 'GEN'): FactusolRawStock[] {
    const list: FactusolRawStock[] = [];
    for (const [key, val] of this.stock) {
      if (!warehouse || val.ALMSTO === warehouse || key.startsWith(`${warehouse}_`)) {
        list.push({ ...val });
      }
    }
    return list;
  }

  public getArticles(activeOnly = true): FactusolRawArticle[] {
    const all = Array.from(this.articles.values());
    if (!activeOnly) return all;
    return all.filter((a) => a.SUWART === '1' || a.SUWART === 'S' || a.SUWART === '-1');
  }

  public getOrder(orderCode: number, series = '1'): { header: FactusolOrderRaw; lines: FactusolOrderLineRaw[] } | null {
    const key = `${series}_${orderCode}`;
    const header = this.orders.get(key);
    if (!header) return null;
    const lines = this.orderLines.filter((l) => l.CODLPC === orderCode && l.TIPLPC === series);
    return { header: { ...header }, lines: lines.map((l) => ({ ...l })) };
  }

  public getAllOrders(series?: string): Array<{ header: FactusolOrderRaw; lines: FactusolOrderLineRaw[] }> {
    const result: Array<{ header: FactusolOrderRaw; lines: FactusolOrderLineRaw[] }> = [];
    for (const [key, header] of this.orders) {
      if (!series || header.TIPPCL === series || key.startsWith(`${series}_`)) {
        const lines = this.orderLines.filter((l) => l.CODLPC === header.CODPCL && l.TIPLPC === header.TIPPCL);
        result.push({ header: { ...header }, lines: lines.map((l) => ({ ...l })) });
      }
    }
    return result;
  }

  public clearAll(): this {
    this.articles.clear();
    this.stock.clear();
    this.prices.clear();
    this.customers.clear();
    this.deliveryAddresses.clear();
    this.orders.clear();
    this.orderLines = [];
    this.seriesCounters.clear();
    this.nextCustomerCode = 1;
    this.nextDeliveryAddressCode.clear();
    return this;
  }

  // ==========================================
  // Virtual Access Driver Adapter
  // ==========================================

  public createVirtualAccessDriver() {
    return {
      query: async <T = any>(sql: string): Promise<T[]> => {
        const trimmed = sql.trim();

        // 1. SELECT MAX(CODPCL) AS maxid FROM F_PCL ...
        if (trimmed.toUpperCase().includes('MAX(CODPCL)')) {
          const seriesMatch = trimmed.match(/TIPPCL\s*=\s*'([^']+)'/i);
          const series = seriesMatch ? seriesMatch[1] : ' ';
          const maxId = this.getCurrentOrderCode(series);
          return [{ maxid: maxId }] as unknown as T[];
        }

        // 2. SELECT MAX(CODCLI) AS maxid FROM F_CLI
        if (trimmed.toUpperCase().includes('MAX(CODCLI)')) {
          let maxId = 0;
          for (const c of this.customers.keys()) {
            if (c > maxId) maxId = c;
          }
          return [{ maxid: maxId }] as unknown as T[];
        }

        // 3. SELECT * FROM F_CLI WHERE NIFCLI = '...'
        if (trimmed.toUpperCase().includes('FROM F_CLI')) {
          const nifMatch = trimmed.match(/NIFCLI\s*=\s*'([^']+)'/i);
          if (nifMatch && nifMatch[1]) {
            const found = this.findCustomerByNif(nifMatch[1]);
            return found ? ([found] as unknown as T[]) : [];
          }
          const emailMatch = trimmed.match(/EMACLI\s*=\s*'([^']+)'/i);
          if (emailMatch && emailMatch[1]) {
            const found = this.findCustomerByEmail(emailMatch[1]);
            return found ? ([found] as unknown as T[]) : [];
          }
          return Array.from(this.customers.values()) as unknown as T[];
        }

        // 4. SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO ...
        if (trimmed.toUpperCase().includes('FROM F_STO')) {
          const allStock = this.getAllStock();
          const grouped = new Map<string, number>();
          for (const s of allStock) {
            const cur = grouped.get(s.ARTSTO) ?? 0;
            grouped.set(s.ARTSTO, cur + s.DISSTO);
          }
          const rows = Array.from(grouped.entries()).map(([ARTSTO, totalStock]) => ({
            ARTSTO,
            totalStock,
          }));
          return rows as unknown as T[];
        }

        // 5. SELECT * FROM F_PCL WHERE REFPCL = '...'
        if (trimmed.toUpperCase().includes('FROM F_PCL')) {
          const refMatch = trimmed.match(/REFPCL\s*=\s*'([^']+)'/i);
          if (refMatch && refMatch[1]) {
            const ref = refMatch[1];
            for (const ord of this.orders.values()) {
              if (ord.REFPCL === ref) return [ord] as unknown as T[];
            }
            return [];
          }
          return Array.from(this.orders.values()) as unknown as T[];
        }

        // 6. SELECT * FROM F_ART ...
        if (trimmed.toUpperCase().includes('FROM F_ART')) {
          return this.getArticles(true) as unknown as T[];
        }

        return [];
      },

      execute: async (sql: string): Promise<void> => {
        const trimmed = sql.trim();
        // Handle UPDATE F_PCL SET ESTPCL = ...
        if (trimmed.toUpperCase().startsWith('UPDATE F_PCL')) {
          const statusMatch = trimmed.match(/ESTPCL\s*=\s*(\d+)/i);
          const codeMatch = trimmed.match(/CODPCL\s*=\s*(\d+)/i);
          const seriesMatch = trimmed.match(/TIPPCL\s*=\s*'([^']+)'/i);
          if (codeMatch && codeMatch[1]) {
            const code = parseInt(codeMatch[1], 10);
            const series = seriesMatch ? seriesMatch[1] : '1';
            const key = `${series}_${code}`;
            const ord = this.orders.get(key);
            if (ord && statusMatch && statusMatch[1]) {
              ord.ESTPCL = parseInt(statusMatch[1], 10);
            }
          }
        }
      },

      executeTransaction: async (sqls: string[]): Promise<void> => {
        // Execute all sequential statements in virtual transaction
        for (const sql of sqls) {
          const trimmed = sql.trim();
          if (trimmed.toUpperCase().startsWith('INSERT INTO F_PCL')) {
            const codeMatch = trimmed.match(/VALUES\s*\(\s*'([^']*)',\s*(\d+)/i);
            if (codeMatch && codeMatch[1] !== undefined && codeMatch[2]) {
              const series = codeMatch[1] || ' ';
              const code = parseInt(codeMatch[2], 10);
              const key = `${series}_${code}`;
              this.orders.set(key, {
                TIPPCL: series,
                CODPCL: code,
                FECPCL: new Date().toISOString().split('T')[0] || '',
                CLIPCL: 1,
              });
            }
          }
        }
      },
    };
  }
}
