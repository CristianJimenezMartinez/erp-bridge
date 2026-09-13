import { CanonicalAddress, CanonicalCustomer } from '@erp-bridge/shared';
import { PrestaShopAddress, PrestaShopCustomer } from '../types';

export class PrestaShopCustomerMapper {
  public static toCanonicalCustomer(
    psCustomer: PrestaShopCustomer,
    psAddress?: PrestaShopAddress,
    reGroupIds: number[] = []
  ): CanonicalCustomer {
    const id = String(psCustomer.id);
    const taxId = psAddress?.dni || psAddress?.vat_number || psCustomer.siret || undefined;
    const fiscalName = psCustomer.company || psAddress?.company || `${psCustomer.firstname} ${psCustomer.lastname}`.trim();
    const commercialName = psCustomer.company || `${psCustomer.firstname} ${psCustomer.lastname}`.trim();

    // Check if customer belongs to a Recargo de Equivalencia group
    const customerGroupIds: number[] = [];
    if (psCustomer.id_default_group) {
      customerGroupIds.push(Number(psCustomer.id_default_group));
    }
    if (psCustomer.associations?.groups) {
      for (const g of psCustomer.associations.groups) {
        customerGroupIds.push(Number(g.id));
      }
    }
    const hasEquivalenceSurcharge = reGroupIds.some((rgId) => customerGroupIds.includes(rgId));

    let address: CanonicalAddress | undefined;
    if (psAddress) {
      address = {
        firstName: psAddress.firstname || psCustomer.firstname,
        lastName: psAddress.lastname || psCustomer.lastname,
        company: psAddress.company || psCustomer.company,
        street: psAddress.address1 || '',
        street2: psAddress.address2 || '',
        city: psAddress.city || '',
        postalCode: psAddress.postcode || '',
        country: 'ES',
        phone: psAddress.phone || psAddress.phone_mobile,
        email: psCustomer.email,
      };
    }

    return {
      id,
      customerNumber: id,
      taxId,
      fiscalName: fiscalName || `Cliente ${id}`,
      commercialName,
      email: psCustomer.email,
      phone: psAddress?.phone || psAddress?.phone_mobile,
      address,
      hasEquivalenceSurcharge,
      rawSourceData: {
        customer: psCustomer as unknown as Record<string, unknown>,
        address: psAddress as unknown as Record<string, unknown>,
      },
    };
  }

  public static toPsCustomerPayload(customer: CanonicalCustomer, defaultGroupId = 3): Record<string, unknown> {
    const nameParts = (customer.fiscalName || 'Cliente').split(' ');
    const firstname = customer.address?.firstName || nameParts[0] || 'Cliente';
    const lastname = customer.address?.lastName || nameParts.slice(1).join(' ') || 'ERP';

    const payload: Record<string, unknown> = {
      firstname,
      lastname,
      email: customer.email || `cliente_${customer.id}@erpbridge.local`,
      company: customer.fiscalName,
      siret: customer.taxId || '',
      id_default_group: defaultGroupId,
      active: 1,
    };

    return payload;
  }

  public static toPsAddressPayload(customer: CanonicalCustomer, psCustomerId: number): Record<string, unknown> {
    const nameParts = (customer.fiscalName || 'Cliente').split(' ');
    const firstname = customer.address?.firstName || nameParts[0] || 'Cliente';
    const lastname = customer.address?.lastName || nameParts.slice(1).join(' ') || 'ERP';

    return {
      id_customer: psCustomerId,
      alias: 'Facturacion ERP',
      firstname,
      lastname,
      company: customer.fiscalName || '',
      address1: customer.address?.street || 'Sin direccion',
      address2: customer.address?.street2 || '',
      postcode: customer.address?.postalCode || '28001',
      city: customer.address?.city || 'Madrid',
      id_country: 6, // España default ID en PrestaShop
      phone: customer.phone || customer.address?.phone || '',
      dni: customer.taxId || '',
      vat_number: customer.taxId || '',
    };
  }
}
