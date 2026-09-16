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
          city: header['CPOFAC'] || header['cpofac'] ? String(header['CPOFAC'] || header['cpofac']).trim() : undefined,
          postalCode: header['CCPFAC'] || header['ccpfac'] ? String(header['CCPFAC'] || header['ccpfac']).trim() : undefined,
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
    horfac: string;
    usufac: number;
    estfac: number;
    almfac: string;
    agefac: number | null;
    clifac: number;
    cnofac: string;
    cdofac: string | null;
    cpofac: string | null;
    ccpfac: string | null;
    cprfac: string | null;
    cnifac: string;
    telfac: string | null;
    cemfac: string | null;
    cpafac: string | null;
    fopfac: string;
    tivfac?: number;
    reqfac?: number;
    piva1fac: number;
    piva2fac: number;
    piva3fac: number;
    ipor1fac: number;
    bas1fac: number;
    bas2fac?: number;
    bas3fac?: number;
    bas4fac?: number;
    iiva1fac: number;
    iiva2fac?: number;
    iiva3fac?: number;
    net1fac: number;
    net2fac?: number;
    net3fac?: number;
    net4fac?: number;
    totfac: number;
  } {
    const d = invoice.issueDate ? new Date(invoice.issueDate) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const accessDate = `#${year}-${month}-${day}#`;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    const accessTime = `#${hours}:${mins}:${secs}#`;

    const series = (invoice.series || '1').substring(0, 1);
    const clientCode = invoice.customer.customerCode ? parseInt(invoice.customer.customerCode, 10) : 1;
    const mainTaxRate = invoice.taxBreakdown && invoice.taxBreakdown[0] ? invoice.taxBreakdown[0].rate : 21;
    const netAmount = invoice.netAmount || (invoice.totalAmount - (invoice.taxAmount || 0) - (invoice.shippingCost || 0));
    const shippingCost = invoice.shippingCost || 0;
    const bas1fac = Number((netAmount + shippingCost).toFixed(2));
    const rawPayment = (invoice as unknown as Record<string, unknown>).paymentMethod;
    const fopfac = typeof rawPayment === 'string' && rawPayment.trim() ? rawPayment.substring(0, 3).toUpperCase() : 'TAR';

    let net1 = netAmount;
    let bas1 = bas1fac;
    let iiva1 = invoice.taxAmount || 0;
    let net2 = 0;
    let bas2 = 0;
    let iiva2 = 0;
    let net3 = 0;
    let bas3 = 0;
    let iiva3 = 0;
    let net4 = 0;
    let bas4 = 0;

    if (invoice.taxBreakdown && invoice.taxBreakdown.length > 1) {
      net1 = 0; bas1 = 0; iiva1 = 0;
      for (const tb of invoice.taxBreakdown) {
        if (tb.rate === 21) {
          net1 += tb.baseAmount;
          iiva1 += tb.taxAmount;
        } else if (tb.rate === 10) {
          net2 += tb.baseAmount;
          iiva2 += tb.taxAmount;
        } else if (tb.rate === 4) {
          net3 += tb.baseAmount;
          iiva3 += tb.taxAmount;
        } else if (tb.rate === 0) {
          net4 += tb.baseAmount;
        }
      }
      bas1 = net1 > 0 ? Number((net1 + shippingCost).toFixed(2)) : 0;
      bas2 = Number(net2.toFixed(2));
      bas3 = Number(net3.toFixed(2));
      bas4 = Number(net4.toFixed(2));
    }

    const hasReq = (invoice.customer as any).hasEquivalenceSurcharge ? 1 : 0;

    return {
      tipfac: series,
      codfac: invoiceNumber,
      reffac: (invoice.orderReference || invoice.invoiceNumber || '').substring(0, 20),
      fecfac: accessDate,
      horfac: accessTime,
      usufac: 0,
      estfac: this.mapCanonicalStatusToFactusol(invoice.status),
      almfac: warehouse.substring(0, 3),
      agefac: null,
      clifac: isNaN(clientCode) ? 1 : clientCode,
      cnofac: (invoice.customer.name || 'CLIENTE CONTADO').substring(0, 50),
      cdofac: invoice.customer.billingAddress?.street ? invoice.customer.billingAddress.street.substring(0, 50) : null,
      cpofac: invoice.customer.billingAddress?.city ? invoice.customer.billingAddress.city.substring(0, 30) : null,
      ccpfac: invoice.customer.billingAddress?.postalCode ? invoice.customer.billingAddress.postalCode.substring(0, 10) : null,
      cprfac: invoice.customer.billingAddress?.province ? invoice.customer.billingAddress.province.substring(0, 40) : null,
      cnifac: (invoice.customer.taxId || '').substring(0, 18),
      telfac: invoice.customer.phone ? invoice.customer.phone.substring(0, 15) : null,
      cemfac: invoice.customer.email ? invoice.customer.email.substring(0, 50) : null,
      cpafac: invoice.customer.billingAddress?.country ? invoice.customer.billingAddress.country.substring(0, 30) : 'ESPAÑA',
      fopfac,
      tivfac: 0,
      reqfac: hasReq,
      piva1fac: mainTaxRate,
      piva2fac: 10,
      piva3fac: 4,
      ipor1fac: shippingCost,
      bas1fac: bas1,
      bas2fac: bas2,
      bas3fac: bas3,
      bas4fac: bas4,
      iiva1fac: iiva1,
      iiva2fac: iiva2,
      iiva3fac: iiva3,
      net1fac: net1,
      net2fac: net2,
      net3fac: net3,
      net4fac: net4,
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
    ivalfa: number;
  }> {
    const series = (invoice.series || '1').substring(0, 1);

    return invoice.lines.map((ln: any, index: number) => {
      const qty = ln.quantity || 1;
      const unitPrice = ln.unitPrice || 0;
      const lineTotal = ln.lineTotal || qty * unitPrice;
      const taxRate = Number(ln.taxRate ?? 21);
      let ivalfa = 0;
      if (taxRate === 10) ivalfa = 1;
      else if (taxRate === 4) ivalfa = 2;
      else if (taxRate === 0) ivalfa = 3;

      return {
        tiplfa: series,
        codlfa: invoiceNumber,
        poslfa: ln.position || index + 1,
        artlfa: (ln.sku || '').substring(0, 13),
        deslfa: (ln.description || '').substring(0, 50),
        canlfa: qty,
        prelfa: unitPrice,
        totlfa: lineTotal,
        ivalfa,
      };
    });
  }
}
