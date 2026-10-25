/** Serie de pedido por defecto ÚNICA para todo el stack (conector, servicio y adaptador). */
export const DEFAULT_FACTUSOL_ORDER_SERIES = '1';

export interface FactusolConnectionConfig {
  databasePath: string;
  tariffCode?: string;
  saleTariffCode?: string;
  activeOnly?: boolean;
  provider?: string;
  orderSeries?: string;
  invoiceSeries?: string;
  defaultWarehouse?: string;
  autoRollover?: boolean;
  recordPayments?: boolean;
  /** Código de cliente genérico "contado web" para pedidos sin CIF (por defecto 1). */
  guestCustomerCode?: number;
  /** Timeout (ms) de cada operación OLEDB; por defecto 30 s. */
  operationTimeoutMs?: number;
  /** Si es true, permite catálogos sin ningún precio de tarifa (por defecto se aborta el lote, F3). */
  allowEmptyPrices?: boolean;
}

export interface FactusolConnectorOptions extends Partial<FactusolConnectionConfig> {
  cscriptPath?: string;
}
