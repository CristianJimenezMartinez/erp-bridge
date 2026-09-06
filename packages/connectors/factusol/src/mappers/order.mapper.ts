import {
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalOrderLine,
  OrderStatus,
} from '@erp-bridge/shared';

export interface FactusolOrderRaw {
  TIPPCL: string;
  CODPCL: number;
  REFPCL?: string;
  FECPCL: string | Date;
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
  IIVA1PCL?: number;
  IPOR1PCL?: number;
  TOTPCL?: number;
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
  OBSCLI?: string;
}

export class FactusolOrderMapper {
  public static mapStatusCodeToOrderStatus(code?: number): OrderStatus {
    switch (code) {
      case 0:
        return 'pending';
      case 1:
        return 'processing';
      case 2:
        return 'completed';
      case 3:
        return 'processing';
      case 4:
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  public static mapOrderStatusToStatusCode(status: OrderStatus | string): number {
    switch (status) {
      case 'pending':
      case 'on-hold':
        return 0; // Pte
      case 'processing':
        return 1; // Pte parcial o en preparación
      case 'completed':
        return 2; // Enviado
      case 'cancelled':
      case 'refunded':
      case 'failed':
        return 4; // Anulado
      default:
        return 0;
    }
  }

  public static toCanonicalCustomer(raw: FactusolCustomerRaw): CanonicalCustomer {
    return {
      id: `factusol_cli_${raw.CODCLI}`,
      customerNumber: String(raw.CODCLI),
      taxId: raw.NIFCLI ? String(raw.NIFCLI).trim() : undefined,
      fiscalName: String(raw.NOFCLI ?? '').trim() || `Cliente #${raw.CODCLI}`,
      commercialName: raw.NOCCLI ? String(raw.NOCCLI).trim() : undefined,
      email: raw.OBSCLI && raw.OBSCLI.includes('@') ? String(raw.OBSCLI).trim() : undefined,
      phone: raw.TELCLI ? String(raw.TELCLI).trim() : undefined,
      address: {
        street: raw.DOMCLI ? String(raw.DOMCLI).trim() : undefined,
        city: raw.POBCLI ? String(raw.POBCLI).trim() : undefined,
        postalCode: raw.CPOCLI ? String(raw.CPOCLI).trim() : undefined,
        state: raw.PROCLI ? String(raw.PROCLI).trim() : undefined,
        country: 'ES',
      },
      priceList: raw.TARCLI ? Number(raw.TARCLI) : 1,
      rawSourceData: raw as unknown as Record<string, unknown>,
    };
  }

  public static toCanonicalOrderLine(raw: FactusolOrderLineRaw): CanonicalOrderLine {
    const qty = Number(raw.CANLPC) || 1;
    const price = Number(raw.PRELPC) || 0;
    const total = Number(raw.TOTLPC) || qty * price;

    return {
      id: `line_${raw.TIPLPC || '0'}_${raw.CODLPC}_${raw.POSLPC}`,
      position: Number(raw.POSLPC) || 1,
      sku: String(raw.ARTLPC ?? '').trim(),
      name: String(raw.DESLPC ?? '').trim(),
      quantity: qty,
      unitPrice: price,
      discountPercent: Number(raw.DT1LPC) || 0,
      vatPercent: 21,
      vatType: Number(raw.IVALPC) || 0,
      subtotal: qty * price,
      total,
      rawSourceData: raw as unknown as Record<string, unknown>,
    };
  }

  public static toCanonicalOrder(
    header: FactusolOrderRaw,
    lines: FactusolOrderLineRaw[] = []
  ): CanonicalOrder {
    const orderNumber = String(header.CODPCL);
    const series = String(header.TIPPCL ?? '').trim();
    const dateVal = header.FECPCL instanceof Date ? header.FECPCL : new Date(header.FECPCL);

    const canonicalLines = lines.map((ln) => this.toCanonicalOrderLine(ln));

    return {
      id: `factusol_order_${series ? series + '_' : ''}${orderNumber}`,
      orderNumber,
      series,
      reference: String(header.REFPCL ?? '').trim(),
      date: isNaN(dateVal.getTime()) ? new Date() : dateVal,
      status: this.mapStatusCodeToOrderStatus(header.ESTPCL),
      currency: 'EUR',
      customer: {
        id: `factusol_cli_${header.CLIPCL}`,
        customerNumber: String(header.CLIPCL),
        taxId: header.CNIPCL ? String(header.CNIPCL).trim() : undefined,
        fiscalName: String(header.CNOPCL ?? '').trim() || `Cliente #${header.CLIPCL}`,
        phone: header.TELPCL ? String(header.TELPCL).trim() : undefined,
        address: {
          street: header.CDOPCL ? String(header.CDOPCL).trim() : undefined,
          city: header.CPOPCL ? String(header.CPOPCL).trim() : undefined,
          postalCode: header.CCPPCL ? String(header.CCPPCL).trim() : undefined,
          state: header.CPRPCL ? String(header.CPRPCL).trim() : undefined,
          country: 'ES',
        },
      },
      shippingAddress: {
        street: header.CDOPCL ? String(header.CDOPCL).trim() : undefined,
        city: header.CPOPCL ? String(header.CPOPCL).trim() : undefined,
        postalCode: header.CCPPCL ? String(header.CCPPCL).trim() : undefined,
        state: header.CPRPCL ? String(header.CPRPCL).trim() : undefined,
        country: 'ES',
        phone: header.TELPCL ? String(header.TELPCL).trim() : undefined,
      },
      lines: canonicalLines.length > 0 ? canonicalLines : [
        {
          id: `line_default_${orderNumber}`,
          position: 1,
          sku: 'GENERIC',
          name: 'Línea de pedido',
          quantity: 1,
          unitPrice: Number(header.NET1PCL) || 0,
          discountPercent: 0,
          vatPercent: 21,
          vatType: 0,
          subtotal: Number(header.NET1PCL) || 0,
          total: Number(header.TOTPCL) || 0,
        },
      ],
      netAmount: Number(header.NET1PCL) || 0,
      taxAmount: Number(header.IIVA1PCL) || 0,
      shippingAmount: Number(header.IPOR1PCL) || 0,
      discountAmount: 0,
      totalAmount: Number(header.TOTPCL) || 0,
      warehouse: String(header.ALMPCL ?? 'GEN').trim(),
      rawSourceData: header as unknown as Record<string, unknown>,
      createdAt: dateVal,
      updatedAt: dateVal,
    };
  }
}
