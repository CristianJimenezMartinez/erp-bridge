import {
  CanonicalInvoice,
  CanonicalInvoiceLine,
  CanonicalOrder,
  CanonicalTaxBreakdown,
  Logger,
} from '@erp-bridge/shared';
import { Connector, InvoiceMutationResult } from '@erp-bridge/sdk';
import { EventBus } from '../events';

export class InvoiceSyncEngine {
  private readonly logger = new Logger('InvoiceSyncEngine');

  constructor(private readonly eventBus: EventBus = EventBus.getInstance()) {}

  public orderToInvoice(order: CanonicalOrder, series = '1'): CanonicalInvoice {
    const lines: CanonicalInvoiceLine[] = order.lines.map((ln, index) => {
      const unitPrice = ln.unitPrice;
      const quantity = ln.quantity;
      const lineTotal = ln.subtotal !== undefined ? ln.subtotal : unitPrice * quantity;
      const taxRate = ln.vatPercent !== undefined ? ln.vatPercent : 21;
      const taxAmount = Number(((lineTotal * taxRate) / 100).toFixed(2));

      return {
        id: `inv_ln_${order.id}_${ln.position || index + 1}`,
        position: ln.position || index + 1,
        sku: ln.sku,
        description: ln.name || ln.sku,
        quantity,
        unitPrice,
        discountPercent: ln.discountPercent || 0,
        taxRate,
        taxAmount,
        lineTotal,
      };
    });

    const netAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const taxAmount = lines.reduce((sum, l) => sum + l.taxAmount, 0);
    const shippingCost = order.shippingAmount || 0;
    const totalAmount = netAmount + taxAmount + shippingCost;

    // Group taxes by rate
    const taxMap = new Map<number, { base: number; tax: number }>();
    for (const l of lines) {
      const current = taxMap.get(l.taxRate) || { base: 0, tax: 0 };
      current.base += l.lineTotal;
      current.tax += l.taxAmount;
      taxMap.set(l.taxRate, current);
    }

    const taxBreakdown: CanonicalTaxBreakdown[] = Array.from(taxMap.entries()).map(
      ([rate, val]) => ({
        rate,
        baseAmount: Number(val.base.toFixed(2)),
        taxAmount: Number(val.tax.toFixed(2)),
      })
    );

    const billingAddr = order.billingAddress || order.shippingAddress;

    return {
      id: `inv_${order.id}`,
      series,
      invoiceNumber: order.orderNumber || order.id,
      orderReference: order.reference || order.orderNumber || order.id,
      issueDate: order.date || new Date(),
      status: 'issued',
      customer: {
        id: order.customer.id,
        customerCode: order.customer.customerNumber,
        name: order.customer.fiscalName || order.customer.commercialName || 'CLIENTE',
        taxId: order.customer.taxId,
        email: order.customer.email,
        phone: order.customer.phone,
        billingAddress: billingAddr ? {
          street: billingAddr.street,
          city: billingAddr.city,
          postalCode: billingAddr.postalCode,
          province: billingAddr.state,
          country: billingAddr.country || 'ES',
        } : undefined,
      },
      lines,
      shippingCost,
      netAmount: Number(netAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      taxBreakdown,
      totalAmount: Number(totalAmount.toFixed(2)),
      currency: order.currency || 'EUR',
      sourceSystem: 'woocommerce',
      externalId: order.reference || order.orderNumber,
    };
  }

  public async syncOrderToFactusolInvoice(
    order: CanonicalOrder,
    factusolConnector: Connector,
    series = '1',
    organizationId = 'org_default'
  ): Promise<InvoiceMutationResult> {
    if (!factusolConnector.createInvoice) {
      throw new Error('El conector no soporta la creación de facturas.');
    }

    this.logger.info(`Convirtiendo pedido ${order.id} (${order.reference || order.orderNumber}) a Factura Factusol...`);
    const invoice = this.orderToInvoice(order, series);

    const result = await factusolConnector.createInvoice(invoice);

    if (result.success) {
      this.logger.info(`Factura creada exitosamente en Factusol (CODFAC=${result.externalId}) para el pedido ${order.id}`);

      await this.eventBus.publish({
        type: 'INVOICE_CREATED',
        organizationId,
        source: 'InvoiceSyncEngine',
        data: {
          invoiceId: result.invoiceId,
          externalId: result.externalId,
          orderId: order.id,
          orderReference: order.reference,
          totalAmount: invoice.totalAmount,
        },
      });
    }

    return result;
  }
}
