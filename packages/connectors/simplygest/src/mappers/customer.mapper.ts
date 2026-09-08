import { CanonicalCustomer } from '@erp-bridge/shared';

export interface SimplyGestCustomerRaw {
  CODIGO: string | number;
  NOMBRE: string;
  CIF?: string;
  DIRECCION?: string;
  CP?: string;
  POBLACION?: string;
  PROVINCIA?: string;
  EMAIL?: string;
  TELEFONO?: string;
}

export function mapSimplyGestCustomerToCanonical(raw: SimplyGestCustomerRaw): CanonicalCustomer {
  const code = String(raw.CODIGO ?? '').trim();
  const name = String(raw.NOMBRE ?? '').trim() || `Cliente #${code}`;
  const cif = raw.CIF ? String(raw.CIF).trim() : undefined;
  const email = raw.EMAIL ? String(raw.EMAIL).trim() : undefined;
  const phone = raw.TELEFONO ? String(raw.TELEFONO).trim() : undefined;

  return {
    id: `sg_cli_${code}`,
    customerNumber: code,
    taxId: cif,
    fiscalName: name,
    hasEquivalenceSurcharge: false,
    email,
    phone,
    address: {
      street: raw.DIRECCION ? String(raw.DIRECCION).trim() : undefined,
      city: raw.POBLACION ? String(raw.POBLACION).trim() : undefined,
      postalCode: raw.CP ? String(raw.CP).trim() : undefined,
      state: raw.PROVINCIA ? String(raw.PROVINCIA).trim() : undefined,
      country: 'ES',
    },
    rawSourceData: raw as unknown as Record<string, unknown>,
  };
}
