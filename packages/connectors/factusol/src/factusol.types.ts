export interface FactusolConnectionConfig {
  databasePath: string;
  tariffCode?: string;
  activeOnly?: boolean;
  provider?: string;
  orderSeries?: string;
  invoiceSeries?: string;
  defaultWarehouse?: string;
  autoRollover?: boolean;
  recordPayments?: boolean;
}

export interface FactusolConnectorOptions extends Partial<FactusolConnectionConfig> {
  cscriptPath?: string;
}
