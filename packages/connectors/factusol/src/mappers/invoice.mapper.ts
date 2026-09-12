import {
  CanonicalInvoice,
  CanonicalInvoiceLine,
  CanonicalInvoiceStatus,
  CanonicalTaxBreakdown,
} from '@erp-bridge/shared';

export class FactusolInvoiceMapper {
  public static mapFactusolStatusToCanonical(status: string | number | null | undefined): CanonicalInvoiceStatus {
    const s = Number(status ?? 1);
    switch (s) {
      case 0:
        return 'draft';
      case 1:
        return 'issued';
      case 2:
        return 'paid';
      case 3:
        return 'cancelled';
      default:
        return 'issued';
    }
  }

  public static mapCanonicalStatusToFactusol(status: CanonicalInvoiceStatus | string): number {
    switch (status) {
      case 'draft':
        return 0;
      case 'issued':
        return 1;
      case 'paid':
        return 2;
      case 'cancelled':
        return 3;
      default:
        return 1;
    }
  }

  public static toCanonical(
    header: Record<string, unknown>,
    lines: Record<string, unknown>[] = []
  ): CanonicalInvoice {
    const series = String(header['TIPFAC'] || header['tipfac'] || '1').trim();
    const invoiceNum = String(header['CODFAC'] || header['codfac'] || '').trim();
    const id = `factusol_inv_${series}_${invoiceNum}`;
    const ref = header['REFFAC'] || header['reffac'] ? String(header['REFFAC'] || header['reffac']).trim() : undefined;

    const rawDate = header['FECFAC'] || header['fecfac'];
    const issueDate = rawDate ? new Date(String(rawDate)) : new Date();

    const netAmount = Number(header['NET1FAC'] || header['net1fac'] || 0);
    const taxAmount = Number(header['IIVA1FAC'] || header['iiva1fac'] || 0);
    const shippingCost = Number(header['IPOR1FAC'] || header['ipor1fac'] || 0);
    const totalAmount = Number(header['TOTFAC'] || header['totfac'] || (netAmount + taxAmount + shippingCost));

    const piva1 = Number(header['PIVA1FAC'] || header['piva1fac'] || 21);
    const taxBreakdown: CanonicalTaxBreakdown[] = [];
    if (taxAmount > 0 || netAmount > 0) {
      taxBreakdown.push({
        rate: piva1,
        baseAmount: netAmount,
        taxAmount: taxAmount,
      });
    }

    const canonicalLines: CanonicalInvoiceLine[] = lines.map((ln, index) => {
      const pos = Number(ln['POSLFA'] || ln['poslfa'] || index + 1);
      const sku = String(ln['ARTLFA'] || ln['artlfa'] || '').trim();
      const desc = String(ln['DESLFA'] || ln['deslfa'] || '').trim();
      const qty = Number(ln['CANLFA'] || ln['canlfa'] || 1);
      const price = Number(ln['PRELFA'] || ln['prelfa'] || 0);
      const lineTotal = Number(ln['TOTLFA'] || ln['totlfa'] || qty * price);

      return {
        id: `${id}_line_${pos}`,
        position: pos,
        sku,
        description: desc,
        quantity: qty,
        unitPrice: price,
        discountPercent: 0,
        taxRate: piva1,
        taxAmount: Number(((lineTotal * piva1) / 100).toFixed(2)),
        lineTotal,
      };
    });

    return {
      id,
      series,
      invoiceNumber: invoiceNum,
      orderReference: ref,
      issueDate,
      status: this.mapFactusolStatusToCanonical(header['ESTFAC'] as string | number || header['estfac'] as string | number),
      customer: {
        customerCode: header['CLIFAC'] || header['clifac'] ? String(header['CLIFAC'] || header['clifac']) : undefined,
        name: String(header['CNOFAC'] || header['cnofac'] || 'CLIENTE CONTADO'),
        email: header['CEMFAC'] || header['cemfac'] ? String(header['CEMFAC'] || header['cemfac']).trim() : undefined,
        phone: header['TELFAC'] || header['telfac'] ? String(header['TELFAC'] || header['telfac']).trim() : undefined,
        billingAddress: {
          street: header['CDOFAC'] || header['cdofac'] ? String(header['CDOFAC'] || header['cdofac']).trim() : undefined,
          postalCode: header['CPOFAC'] || header['cpofac'] ? String(header['CPOFAC'] || header['cpofac']).trim() : undefined,
          city: header['CCPFAC'] || header['ccpfac'] ? String(header['CCPFAC'] || header['ccpfac']).trim() : undefined,
          province: header['CPRFAC'] || header['cprfac'] ? String(header['CPRFAC'] || header['cprfac']).trim() : undefined,
          country: header['CPAFAC'] || header['cpafac'] ? String(header['CPAFAC'] || header['cpafac']).trim() : 'ES',
        },
      },
      lines: canonicalLines.length > 0 ? canonicalLines : [
        {
          position: 1,
          sku: 'GENERIC',
          description: 'Facturación global',
          quantity: 1,
          unitPrice: netAmount,
          discountPercent: 0,
          taxRate: piva1,
          taxAmount,
          lineTotal: netAmount,
        },
      ],
      shippingCost,
      netAmount,
      taxAmount,
      taxBreakdown,
      totalAmount,
      currency: 'EUR',
      sourceSystem: 'factusol',
      externalId: `${series}-${invoiceNum}`,
    };
  }

  public static toFactusolHeader(
    invoice: CanonicalInvoice,
    invoiceNumber: number,
    warehouse = 'GEN'
  ): {
    tipfac: string;
    codfac: number;
    reffac: string;
    fecfac: string;
    estfac: number;
    almfac: string;
    agefac: number | null;
    clifac: number;
    cnofac: string;
    cdofac: string | null;
    cpofac: string | null;
    ccpfac: string | null;
    cprfac: string | null;
    telfac: string | null;
    cemfac: string | null;
    cpafac: string | null;
    piva1fac: number;
    piva2fac: number;
    piva3fac: number;
    ipor1fac: number;
    iiva1fac: number;
    net1fac: number;
    totfac: number;
  } {
    const d = invoice.issueDate ? new Date(invoice.issueDate) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const accessDate = `#${year}-${month}-${day}#`;

    const series = (invoice.series || '1').substring(0, 1);
    const clientCode = invoice.customer.customerCode ? parseInt(invoice.customer.customerCode, 10) : 1;
    const mainTaxRate = invoice.taxBreakdown && invoice.taxBreakdown[0] ? invoice.taxBreakdown[0].rate : 21;

    return {
      tipfac: series,
      codfac: invoiceNumber,
      reffac: (invoice.orderReference || invoice.invoiceNumber || '').substring(0, 20),
      fecfac: accessDate,
      estfac: this.mapCanonicalStatusToFactusol(invoice.status),
      almfac: warehouse.substring(0, 3),
      agefac: null,
      clifac: isNaN(clientCode) ? 1 : clientCode,
      cnofac: (invoice.customer.name || 'CLIENTE CONTADO').substring(0, 50),
      cdofac: invoice.customer.billingAddress?.street ? invoice.customer.billingAddress.street.substring(0, 50) : null,
      cpofac: invoice.customer.billingAddress?.postalCode ? invoice.customer.billingAddress.postalCode.substring(0, 5) : null,
      ccpfac: invoice.customer.billingAddress?.city ? invoice.customer.billingAddress.city.substring(0, 30) : null,
      cprfac: invoice.customer.billingAddress?.province ? invoice.customer.billingAddress.province.substring(0, 20) : null,
      telfac: invoice.customer.phone ? invoice.customer.phone.substring(0, 15) : null,
      cemfac: invoice.customer.email ? invoice.customer.email.substring(0, 50) : null,
      cpafac: invoice.customer.billingAddress?.country ? invoice.customer.billingAddress.country.substring(0, 30) : 'ESPAÑA',
      piva1fac: mainTaxRate,
      piva2fac: 10,
      piva3fac: 4,
      ipor1fac: invoice.shippingCost || 0,
      iiva1fac: invoice.taxAmount || 0,
      net1fac: invoice.netAmount || (invoice.totalAmount - (invoice.taxAmount || 0) - (invoice.shippingCost || 0)),
      totfac: invoice.totalAmount,
    };
  }

  public static toFactusolLines(
    invoice: CanonicalInvoice,
    invoiceNumber: number
  ): Array<{
    tiplfa: string;
    codlfa: number;
    poslfa: number;
    artlfa: string;
    deslfa: string;
    canlfa: number;
    prelfa: number;
    totlfa: number;
  }> {
    const series = (invoice.series || '1').substring(0, 1);

    return invoice.lines.map((ln: any, index: number) => {
      const qty = ln.quantity || 1;
      const unitPrice = ln.unitPrice || 0;
      const lineTotal = ln.lineTotal || qty * unitPrice;

      return {
        tiplfa: series,
        codlfa: invoiceNumber,
        poslfa: ln.position || index + 1,
        artlfa: (ln.sku || '').substring(0, 13),
        deslfa: (ln.description || '').substring(0, 50),
        canlfa: qty,
        prelfa: unitPrice,
        totlfa: lineTotal,
      };
    });
  }
}
