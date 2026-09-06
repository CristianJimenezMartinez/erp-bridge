export interface ConnectorCapabilities {
  supportsReadProducts: boolean;
  supportsWriteProducts: boolean;
  supportsReadStock: boolean;
  supportsWriteStock: boolean;
  supportsReadOrders: boolean;
  supportsWriteOrders: boolean;
  supportsReadCustomers: boolean;
  supportsWriteCustomers: boolean;
  supportsWebhooks: boolean;
  supportsBatchOperations: boolean;
}

export const DEFAULT_CAPABILITIES: ConnectorCapabilities = {
  supportsReadProducts: false,
  supportsWriteProducts: false,
  supportsReadStock: false,
  supportsWriteStock: false,
  supportsReadOrders: false,
  supportsWriteOrders: false,
  supportsReadCustomers: false,
  supportsWriteCustomers: false,
  supportsWebhooks: false,
  supportsBatchOperations: false,
};
