import {
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalProduct,
  CanonicalProductSchema,
  CanonicalStock,
  CanonicalStockUpdate,
  CanonicalTax,
  getSpanishTaxByRate,
} from '@erp-bridge/shared';
import {
  HoldedContact,
  HoldedProduct,
  HoldedSalesOrder,
  HoldedSalesOrderItem,
} from './holded.types';

export class HoldedMapper {
  /**
   * Mapea un producto nativo de Holded ERP al modelo CanonicalProduct del monorepo.
   */
  public static mapHoldedProductToCanonical(p: HoldedProduct): CanonicalProduct {
    const rawStock = p.stock ?? 0;
    const stockQuantity = Math.max(0, Math.floor(rawStock));

    const canonical = {
      id: p.id,
      sku: p.sku || p.id,
      name: p.name,
      description: p.desc || '',
      regularPrice: typeof p.price === 'number' ? p.price : 0,
      costPrice: typeof p.cost === 'number' ? p.cost : undefined,
      stockQuantity,
      manageStock: true,
      inStock: stockQuantity > 0,
      status: 'published' as const,
      categories: [],
      barcode: p.barcode,
      taxRate: p.tax ?? 21,
      attributes: {},
      rawSourceData: p as unknown as Record<string, unknown>,
    };

    return CanonicalProductSchema.parse(canonical);
  }

  /**
   * Mapea actualización de stock usando availableQuantity (DISSTO) para blindaje anti-overselling.
   */
  public static mapCanonicalStockToHolded(
    sku: string,
    stock: Partial<CanonicalStock> & Partial<CanonicalStockUpdate> & { quantity?: number; availableQuantity?: number }
  ): { sku: string; stock: number; warehouseId?: string } {
    // Regla 5: Anti-Overselling prioritario usando availableQuantity sobre stock físico
    let availableQty: number;
    if (stock.availableQuantity !== undefined) {
      availableQty = stock.availableQuantity;
    } else if (stock.availableStock !== undefined) {
      availableQty = stock.availableStock;
    } else if (stock.quantity !== undefined) {
      availableQty = stock.quantity;
    } else {
      availableQty = 0;
    }

    const finalStock = Math.max(0, Math.floor(availableQty));
    const warehouseId = stock.warehouse && stock.warehouse !== 'GEN' ? stock.warehouse : undefined;

    return {
      sku,
      stock: finalStock,
      warehouseId,
    };
  }

  /**
   * Mapea un pedido web canónico a una orden de venta de Holded (salesorder)
   * aplicando CanonicalTax (IVA español 21/10/4/0% + Recargo de Equivalencia 5.2/1.4/0.5/0%).
   */
  public static mapCanonicalOrderToHoldedSalesOrder(
    order: CanonicalOrder,
    defaultWarehouseId?: string
  ): HoldedSalesOrder {
    const appliesSurcharge = Boolean(
      order.hasEquivalenceSurcharge || order.customer?.hasEquivalenceSurcharge
    );

    const items: HoldedSalesOrderItem[] = order.lines.map((line) => {
      // Regla 4: Modelo Canónico Fiscal exclusivamente con CanonicalTax
      const taxDef: CanonicalTax = getSpanishTaxByRate(line.vatPercent, appliesSurcharge);

      return {
        sku: line.sku,
        name: line.name || line.sku,
        desc: line.name || line.sku,
        units: line.quantity,
        subtotal: line.unitPrice,
        tax: taxDef.vatRate,
        re: appliesSurcharge ? taxDef.surchargeRate : 0,
        discount: line.discountPercent || 0,
      };
    });

    const orderTimestampSec = Math.floor(new Date(order.date).getTime() / 1000);
    const cleanContactId = order.customer.id.replace(/^holded_cust_/, '');
    const warehouse = order.warehouse && order.warehouse !== 'GEN' ? order.warehouse : defaultWarehouseId;

    return {
      id: order.id.replace(/^holded_order_/, ''),
      contactId: cleanContactId,
      contactCode: order.customer.taxId || order.customer.customerNumber,
      date: isNaN(orderTimestampSec) ? Math.floor(Date.now() / 1000) : orderTimestampSec,
      desc: order.reference || order.orderNumber,
      notes: order.notes,
      items,
      warehouseId: warehouse,
      currency: order.currency || 'EUR',
    };
  }

  /**
   * Mapea un cliente canónico a un contacto de Holded con verificación de tipo de persona y NIF.
   */
  public static mapCanonicalCustomerToHoldedContact(c: CanonicalCustomer): HoldedContact {
    const taxId = (c.taxId || '').trim();
    // CIF de personas jurídicas en España comienza por letra: A, B, C, D, E, F, G, H, J, N, P, Q, R, S, U, V, W
    const isperson = taxId ? !/^[A-HJ-NP-SUVW]/i.test(taxId) : true;

    return {
      id: c.id.replace(/^holded_cust_/, ''),
      name: c.fiscalName || c.commercialName || 'Cliente Web',
      code: taxId || c.customerNumber || undefined,
      email: c.email || undefined,
      mobile: c.phone || undefined,
      type: 'client',
      isperson,
      billAddress: c.address
        ? {
            address: [c.address.street, c.address.street2].filter(Boolean).join(', ') || undefined,
            city: c.address.city || undefined,
            postalCode: c.address.postalCode || undefined,
            province: c.address.state || undefined,
            country: c.address.country || 'ES',
          }
        : undefined,
    };
  }
}
