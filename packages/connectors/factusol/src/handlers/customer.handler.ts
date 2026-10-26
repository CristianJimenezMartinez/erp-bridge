import { CustomerMutationResult } from '@erp-bridge/sdk';
import { CanonicalCustomer, Logger } from '@erp-bridge/shared';
import { AccessDatabaseTimeoutError, AccessDriver } from '../access-driver';
import {
  findCustomerByEmailQuery,
  findCustomerByNifQuery,
  getNextCustomerIdQuery,
  insertCustomerQuery,
  findDeliveryAddressQuery,
  getNextDeliveryAddressIdQuery,
  insertDeliveryAddressQuery,
} from '../queries';
import { FactusolCustomerRaw, FactusolOrderMapper } from '../mappers';

function isCustomerCollisionError(err: unknown): boolean {
  const msg = ((err as { message?: string })?.message || String(err)).toLowerCase();
  return (
    msg.includes('duplicate') ||
    msg.includes('duplicad') ||
    msg.includes('primary key') ||
    msg.includes('clave principal') ||
    msg.includes('unique') ||
    msg.includes('índice') ||
    msg.includes('index') ||
    msg.includes('3022')
  );
}

export class FactusolCustomerHandler {
  constructor(
    private readonly driver: AccessDriver,
    private readonly logger: Logger
  ) {}

  public async findCustomer(criteria: { taxId?: string; email?: string }): Promise<CanonicalCustomer | null> {
    if (criteria.taxId && criteria.taxId.trim()) {
      const rows = await this.driver.query<FactusolCustomerRaw>(findCustomerByNifQuery(criteria.taxId.trim()));
      if (rows.length > 0) {
        return FactusolOrderMapper.toCanonicalCustomer(rows[0]!);
      }
    }

    if (criteria.email && criteria.email.trim()) {
      const rows = await this.driver.query<FactusolCustomerRaw>(findCustomerByEmailQuery(criteria.email.trim()));
      if (rows.length > 0) {
        return FactusolOrderMapper.toCanonicalCustomer(rows[0]!);
      }
    }

    return null;
  }

  public async createCustomer(customer: CanonicalCustomer): Promise<CustomerMutationResult> {
    const MAX_RETRIES = 5;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1 && (customer.taxId || customer.email)) {
          const existing = await this.findCustomer({ taxId: customer.taxId, email: customer.email });
          if (existing?.customerNumber) {
            return {
              success: true,
              customerId: customer.id,
              externalId: String(existing.customerNumber),
            };
          }
        }

        const maxRows = await this.driver.query<{ maxid: number }>(getNextCustomerIdQuery());
        const nextId = (Number(maxRows[0]?.maxid) || 0) + 1;

        const sql = insertCustomerQuery(customer, nextId);
        await this.driver.execute(sql);

        this.logger.info(`Cliente creado en Factusol (CODCLI=${nextId}): ${customer.fiscalName}`);

        return {
          success: true,
          customerId: customer.id,
          externalId: String(nextId),
        };
      } catch (error: unknown) {
        lastError = error;
        if (error instanceof AccessDatabaseTimeoutError || !isCustomerCollisionError(error)) {
          break;
        }
        this.logger.warn(`Colisión de CODCLI al crear cliente (intento ${attempt}/${MAX_RETRIES}); reintentando...`);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 60 * attempt));
        }
      }
    }

    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    this.logger.error('Error al crear cliente en Factusol', lastError);
    return {
      success: false,
      customerId: customer.id,
      externalId: '',
      error: msg,
    };
  }

  public async ensureDeliveryAddress(
    customerCode: number,
    shipAddr: any,
    fallbackRecipientName?: string
  ): Promise<void> {
    if (!shipAddr || !shipAddr.street || customerCode <= 1) return;

    const street = shipAddr.street.trim();
    const postalCode = (shipAddr.postalCode || '').trim();

    try {
      const existingAddr = await this.driver.query<Record<string, unknown>>(
        findDeliveryAddressQuery(customerCode, street, postalCode)
      );

      if (!existingAddr || existingAddr.length === 0) {
        const maxDirRows = await this.driver.query<{ maxid: number }>(
          getNextDeliveryAddressIdQuery(customerCode)
        );
        const nextDirCode = (Number(maxDirRows[0]?.maxid) || 0) + 1;
        const recipientName = [shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(' ') ||
          fallbackRecipientName ||
          'Destinatario';

        const insertDirSql = insertDeliveryAddressQuery(
          customerCode,
          nextDirCode,
          shipAddr,
          recipientName
        );
        await this.driver.execute(insertDirSql);
        this.logger.info(`Dirección de entrega alternativa creada en F_OBR (CODOBR=${nextDirCode}) para cliente ${customerCode}`);
      }
    } catch (addrErr) {
      this.logger.warn(`Aviso al gestionar dirección alternativa F_OBR: ${addrErr instanceof Error ? addrErr.message : String(addrErr)}`);
    }
  }
}


