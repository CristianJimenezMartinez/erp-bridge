import {
  CanonicalAddress,
  CanonicalOrder,
  CanonicalOrderLine,
  CanonicalCustomer,
} from '@erp-bridge/shared';

/**
 * Servicio desacoplado para transformar pedidos de tiendas online
 * (Universal Bridge MariaDB/PHP y WooCommerce REST API) al formato canónico de Factusol.
 */
export class OrderSyncHelper {
  /**
   * Extrae el NIF/CIF/DNI de un pedido WooCommerce inspeccionando metadatos y campos de facturación.
   */
  public static extractTaxIdFromWcOrder(wcOrder: any): string {
    const metaList = Array.isArray(wcOrder.meta_data) ? wcOrder.meta_data : [];
    const nifMeta = metaList.find(
      (m: any) =>
        m.key === '_billing_nif' ||
        m.key === 'billing_nif' ||
        m.key === '_billing_cif' ||
        m.key === 'billing_cif' ||
        m.key === '_billing_dni' ||
        m.key === 'billing_dni' ||
        m.key === 'nif' ||
        m.key === 'cif' ||
        m.key === 'vat_number' ||
        m.key === '_vat_number' ||
        m.key === 'tax_id'
    );
    if (nifMeta && nifMeta.value) {
      return String(nifMeta.value).trim();
    }
    if (wcOrder.billing?.nif) return String(wcOrder.billing.nif).trim();
    if (wcOrder.billing?.cif) return String(wcOrder.billing.cif).trim();
    if (wcOrder.billing?.tax_id) return String(wcOrder.billing.tax_id).trim();
    return '';
  }

  /**
   * Comprueba si un pedido de WooCommerce ya ha sido importado previamente en Factusol
   * buscando el metadato canónico '_bentian_factusol_pcl'.
   */
  public static isWcOrderAlreadyProcessed(wcOrder: any): boolean {
    if (!wcOrder || !Array.isArray(wcOrder.meta_data)) return false;
    return wcOrder.meta_data.some(
      (m: any) => m.key === '_bentian_factusol_pcl' && m.value !== undefined && m.value !== null && String(m.value).trim() !== ''
    );
  }

  /**
   * Transforma un pedido de Universal Bridge (MariaDB / PHP `erp-bridge-endpoint.php`)
   * a `CanonicalOrder` para inserción directa en Factusol.
   *
   * Resuelve:
   * - Esquemas mixtos: tanto nomenclatura Factusol (artlpc, canlpc, prelpc) como estándar (sku, quantity, price).
   * - Trampa del doble IVA: recalcula el importe neto de línea si el frontend envió precio bruto en totlpc.
   * - Idempotencia: preserva order_number sin saltos de línea ni espacios corrompidos.
   * - Cliente y dirección: mapeo de fullName y province -> state.
   */
  public static universalBridgeToCanonical(
    po: any,
    series = '1',
    defaultWarehouse = 'GEN'
  ): CanonicalOrder {
    const rawCustomer = po.customer || {};
    const rawLines = Array.isArray(po.lines) ? po.lines : Array.isArray(po.lineas) ? po.lineas : [];

    // 1. Cliente y Direcciones
    const fullName = (
      String(rawCustomer.fullName || rawCustomer.name || '').trim() ||
      `${rawCustomer.firstName || ''} ${rawCustomer.lastName || ''}`.trim() ||
      'CLIENTE CONTADO WEB'
    );

    const nameParts = fullName.split(/\s+/);
    const firstName = rawCustomer.firstName || nameParts[0] || 'Cliente';
    const lastName = rawCustomer.lastName || nameParts.slice(1).join(' ') || (fullName === 'CLIENTE CONTADO WEB' ? 'Web' : '');

    const street = String(rawCustomer.address || rawCustomer.street || rawCustomer.cdopcl || '').trim();
    const city = String(rawCustomer.city || rawCustomer.cpopcl || '').trim();
    const postalCode = String(rawCustomer.postalCode || rawCustomer.postal_code || rawCustomer.cp || rawCustomer.ccppcl || '').trim();
    const state = String(rawCustomer.province || rawCustomer.state || rawCustomer.cprpcl || '').trim();
    const country = String(rawCustomer.country || rawCustomer.cpapcl || 'ES').trim();
    const phone = String(rawCustomer.phone || rawCustomer.telpcl || '').trim();
    const email = String(rawCustomer.email || rawCustomer.cempcl || 'cliente@tienda.com').trim();
    const taxId = String(rawCustomer.taxId || rawCustomer.cif || rawCustomer.nif || rawCustomer.dni || rawCustomer.cnipcl || '').trim();

    const addressObj: CanonicalAddress = {
      firstName,
      lastName,
      company: rawCustomer.company || '',
      street,
      city,
      state,
      postalCode,
      country: country || 'ES',
      phone,
      email,
    };

    // 2. Líneas de Pedido
    const lines: CanonicalOrderLine[] = rawLines.map((l: any, idx: number) => {
      const rawSku = String(l.artlpc || l.sku || l.code || l.id || `ART_${idx + 1}`).trim();
      const rawName = String(l.deslpc || l.name || l.description || 'Artículo').trim();
      const quantity = Math.max(0.01, Number(l.canlpc ?? l.quantity ?? l.qty ?? 1));
      const unitPrice = Number(l.prelpc ?? l.unitPrice ?? l.price ?? 0);
      const discountPercent = Math.max(0, Math.min(100, Number(l.dt1lpc ?? l.discountPercent ?? l.discount ?? 0)));

      // Mapeo seguro de IVA (tramo 0=21%, 1=10%, 2=4%, 3=0%)
      let vatType = 0;
      let vatPercent = 21;
      const rawVat = l.ivaplc ?? l.ivalpc ?? l.vatType ?? l.vatRate ?? l.vatPercent;

      if (rawVat !== undefined && rawVat !== null && rawVat !== '') {
        const v = String(rawVat).trim().toLowerCase();
        if (v === '0' || v === '21') {
          vatType = 0;
          vatPercent = 21;
        } else if (v === '1' || v === '10') {
          vatType = 1;
          vatPercent = 10;
        } else if (v === '2' || v === '4') {
          vatType = 2;
          vatPercent = 4;
        } else if (v === '3' || v === '0%' || v.includes('exent')) {
          vatType = 3;
          vatPercent = 0;
        } else {
          const numVat = Number(v);
          if (!isNaN(numVat)) {
            vatPercent = numVat;
            vatType = numVat === 21 ? 0 : numVat === 10 ? 1 : numVat === 4 ? 2 : numVat === 0 ? 3 : 0;
          }
        }
      }

      // BLINDAJE ANTI-DOBLE IVA:
      // Si el frontend calculó totlpc con precio bruto (totlpc = price_with_vat * qty),
      // NO debemos usar totlpc como base imponible neta porque Factusol volvería a sumar el 21% de IVA.
      // Calculamos siempre la base imponible neta oficial: qty * unitPrice * (1 - dto/100).
      const calculatedNet = Number((quantity * unitPrice * (1 - discountPercent / 100)).toFixed(2));

      return {
        id: String(l.id || l.poslpc || idx + 1),
        position: idx + 1,
        sku: rawSku,
        name: rawName,
        quantity,
        unitPrice,
        discountPercent,
        vatPercent,
        vatType,
        subtotal: calculatedNet,
        total: calculatedNet,
        rawSourceData: {
          originalSku: rawSku,
          originalDescription: rawName,
          ...(l && typeof l === 'object' ? l : {}),
        },
      };
    });

    // 3. Referencia única e idempotente
    const rawRef = String(po.order_number || po.orderNumber || (po.id ? `WEB-${po.id}` : Date.now())).trim();
    const cleanRef = rawRef.replace(/[\r\n\t]/g, '').substring(0, 50);

    const netSum = lines.reduce((acc, l) => acc + l.total, 0);
    const netAmount = Number(po.subtotal ?? netSum.toFixed(2));
    const shippingAmount = Number(po.shipping_cost ?? po.shippingCost ?? 0);
    const taxAmount = Number(po.tax_total ?? po.taxTotal ?? 0);
    const totalAmount = Number(po.total ?? (netAmount + taxAmount + shippingAmount).toFixed(2));

    const customer: CanonicalCustomer = {
      id: email || taxId || String(po.id),
      fiscalName: fullName,
      taxId,
      email,
      phone,
      hasEquivalenceSurcharge: false,
      address: addressObj,
    };

    return {
      id: String(po.id),
      orderNumber: cleanRef,
      reference: cleanRef,
      series: series || '1',
      date: po.created_at || po.createdAt ? new Date(po.created_at || po.createdAt) : new Date(),
      status: 'processing',
      currency: 'EUR',
      warehouse: defaultWarehouse || 'GEN',
      hasEquivalenceSurcharge: false,
      customer,
      shippingAddress: addressObj,
      billingAddress: addressObj,
      netAmount,
      taxAmount,
      shippingAmount,
      discountAmount: 0,
      totalAmount,
      paymentMethod: po.payment_method || po.paymentMethod || 'TAR',
      paymentMethodTitle: po.payment_method_title || po.paymentMethod || 'Pasarela Web',
      notes: `Pedido Web ${cleanRef} - Pago: ${po.payment_method || po.paymentMethod || 'Pasarela'}`,
      lines:
        lines.length > 0
          ? lines
          : [
              {
                id: '1',
                position: 1,
                sku: 'GENERICO',
                name: 'Artículo Web',
                quantity: 1,
                unitPrice: totalAmount,
                discountPercent: 0,
                vatPercent: 21,
                vatType: 0,
                subtotal: totalAmount,
                total: totalAmount,
              },
            ],
      rawSourceData: po,
    };
  }

  /**
   * Transforma un pedido de WooCommerce REST API a `CanonicalOrder` para inserción en Factusol.
   */
  public static wooCommerceToCanonical(
    wcOrder: any,
    series = '1',
    defaultWarehouse = 'GEN'
  ): CanonicalOrder {
    const externalRef = String(wcOrder.id);
    const extractedNif = OrderSyncHelper.extractTaxIdFromWcOrder(wcOrder);

    const billing = wcOrder.billing || {};
    const shipping = wcOrder.shipping || {};

    const fiscalName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Cliente Web';

    const customer: CanonicalCustomer = {
      id: String(wcOrder.customer_id || '0'),
      fiscalName,
      taxId: extractedNif,
      email: billing.email || '',
      phone: billing.phone || '',
      hasEquivalenceSurcharge: false,
      address: {
        firstName: billing.first_name,
        lastName: billing.last_name,
        street: billing.address_1,
        city: billing.city,
        state: billing.state,
        postalCode: billing.postcode,
        country: billing.country || 'ES',
        phone: billing.phone,
        email: billing.email,
      },
    };

    const shippingAddress: CanonicalAddress = {
      firstName: shipping.first_name || billing.first_name,
      lastName: shipping.last_name || billing.last_name,
      street: shipping.address_1 || billing.address_1,
      city: shipping.city || billing.city,
      state: shipping.state || billing.state,
      postalCode: shipping.postcode || billing.postcode,
      country: shipping.country || billing.country || 'ES',
      phone: billing.phone,
      email: billing.email,
    };

    const billingAddress: CanonicalAddress = {
      firstName: billing.first_name,
      lastName: billing.last_name,
      street: billing.address_1,
      city: billing.city,
      state: billing.state,
      postalCode: billing.postcode,
      country: billing.country || 'ES',
      phone: billing.phone,
      email: billing.email,
    };

    const lines: CanonicalOrderLine[] = (wcOrder.line_items || []).map((li: any, idx: number) => {
      const rawSku = String(li.sku || `ART_${idx + 1}`).trim();
      const rawName = String(li.name || 'Artículo').trim();
      const quantity = Math.max(0.01, Number(li.quantity || 1));
      const subtotal = Number(li.total || (quantity * Number(li.price || 0)));
      const unitPrice = quantity > 0 ? Number((subtotal / quantity).toFixed(4)) : Number(li.price || 0);

      // Detección de IVA desde tax de WooCommerce
      const lineTax = Number(li.total_tax || 0);
      let vatPercent = 21;
      let vatType = 0;
      if (subtotal > 0 && lineTax >= 0) {
        const calculatedRate = (lineTax / subtotal) * 100;
        if (Math.abs(calculatedRate - 21) < 1.0) {
          vatPercent = 21;
          vatType = 0;
        } else if (Math.abs(calculatedRate - 10) < 1.0) {
          vatPercent = 10;
          vatType = 1;
        } else if (Math.abs(calculatedRate - 4) < 1.0) {
          vatPercent = 4;
          vatType = 2;
        } else if (calculatedRate === 0) {
          vatPercent = 0;
          vatType = 3;
        }
      }

      return {
        id: String(li.id || idx + 1),
        position: idx + 1,
        sku: rawSku,
        name: rawName,
        quantity,
        unitPrice,
        discountPercent: 0,
        vatPercent,
        vatType,
        subtotal,
        total: subtotal,
        rawSourceData: {
          originalSku: rawSku,
          originalName: rawName,
          ...(li && typeof li === 'object' ? li : {}),
        },
      };
    });

    const totalAmount = Number(wcOrder.total || 0);
    const taxAmount = Number(wcOrder.total_tax || 0);
    const shippingAmount = Number(wcOrder.shipping_total || 0);
    const netAmount = Math.max(0, Number((totalAmount - taxAmount - shippingAmount).toFixed(2)));

    return {
      id: externalRef,
      orderNumber: externalRef,
      series: series || '1',
      reference: externalRef,
      date: new Date(wcOrder.date_created || Date.now()),
      status: 'processing',
      hasEquivalenceSurcharge: false,
      discountAmount: 0,
      warehouse: defaultWarehouse || 'GEN',
      paymentMethod: wcOrder.payment_method || 'TAR',
      paymentMethodTitle: wcOrder.payment_method_title,
      currency: wcOrder.currency || 'EUR',
      customer,
      shippingAddress,
      billingAddress,
      netAmount,
      taxAmount,
      shippingAmount,
      totalAmount,
      notes: wcOrder.customer_note || '',
      lines,
      rawSourceData: wcOrder,
    };
  }
}
