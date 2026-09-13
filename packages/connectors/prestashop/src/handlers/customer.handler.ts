import {
  CustomerMutationResult,
} from '@erp-bridge/sdk';
import { CanonicalCustomer, Logger } from '@erp-bridge/shared';
import { PrestaShopClient } from '../client';
import { PrestaShopAddress, PrestaShopCustomer } from '../types';
import { PrestaShopCustomerMapper } from '../mappers';

export class PrestaShopCustomerHandler {
  constructor(
    private readonly client: PrestaShopClient,
    private readonly logger: Logger,
    private readonly reGroupIds: number[] = []
  ) {}

  public async findCustomer(criteria: { taxId?: string; email?: string }): Promise<CanonicalCustomer | null> {
    try {
      let psCust: PrestaShopCustomer | undefined;
      let psAddr: PrestaShopAddress | undefined;

      if (criteria.email) {
        const res = await this.client.get<{ customers?: PrestaShopCustomer[] }>('customers', {
          'filter[email]': `[${criteria.email.trim()}]`,
          display: 'full',
        });
        psCust = res.customers?.[0];
      }

      if (!psCust && criteria.taxId) {
        const cleanTaxId = criteria.taxId.trim();
        const addrRes = await this.client.get<{ addresses?: PrestaShopAddress[] }>('addresses', {
          'filter[dni]': `[${cleanTaxId}]`,
          display: 'full',
        });
        psAddr = addrRes.addresses?.[0];

        if (!psAddr) {
          const vatRes = await this.client.get<{ addresses?: PrestaShopAddress[] }>('addresses', {
            'filter[vat_number]': `[${cleanTaxId}]`,
            display: 'full',
          });
          psAddr = vatRes.addresses?.[0];
        }

        if (psAddr?.id_customer) {
          const custRes = await this.client.get<{ customer?: PrestaShopCustomer }>(`customers/${psAddr.id_customer}`);
          psCust = custRes.customer;
        }
      }

      if (!psCust) return null;

      if (!psAddr) {
        const addrRes = await this.client.get<{ addresses?: PrestaShopAddress[] }>('addresses', {
          'filter[id_customer]': `[${psCust.id}]`,
          display: 'full',
        });
        psAddr = addrRes.addresses?.[0];
      }

      return PrestaShopCustomerMapper.toCanonicalCustomer(psCust, psAddr, this.reGroupIds);
    } catch (error) {
      this.logger.error('Error al consultar cliente en PrestaShop', error);
      return null;
    }
  }

  public async createCustomer(customer: CanonicalCustomer): Promise<CustomerMutationResult> {
    try {
      const custPayload = PrestaShopCustomerMapper.toPsCustomerPayload(customer);
      const custRes = await this.client.post<{ customer?: { id: number } }>('customers', custPayload);
      const newCustomerId = custRes.customer?.id;

      if (!newCustomerId) {
        throw new Error('No se recibio el ID del cliente creado en PrestaShop');
      }

      // Crear direccion fiscal con NIF/CIF
      const addrPayload = PrestaShopCustomerMapper.toPsAddressPayload(customer, newCustomerId);
      await this.client.post('addresses', addrPayload);

      return {
        success: true,
        customerId: customer.id,
        externalId: String(newCustomerId),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al crear cliente B2B ${customer.fiscalName} en PrestaShop`, error);
      return {
        success: false,
        customerId: customer.id,
        externalId: '',
        error: msg,
      };
    }
  }

  public async readCustomers(options?: { limit?: number; offset?: number }): Promise<CanonicalCustomer[]> {
    const params: Record<string, unknown> = { display: 'full' };
    if (options?.limit) {
      params['limit'] = `${options.offset || 0},${options.limit}`;
    }
    const res = await this.client.get<{ customers?: PrestaShopCustomer[] }>('customers', params);
    const customers = res.customers || [];
    return customers.map((c) => PrestaShopCustomerMapper.toCanonicalCustomer(c, undefined, this.reGroupIds));
  }
}
