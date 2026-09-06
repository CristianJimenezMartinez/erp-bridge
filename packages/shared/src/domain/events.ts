import { z } from 'zod';

export type BridgeEventType =
  | 'SYNC_STARTED'
  | 'SYNC_COMPLETED'
  | 'SYNC_FAILED'
  | 'SYNC_ITEM_FAILED'
  | 'SYNC_ITEM_RETRY'
  | 'SYNC_JOB_SCHEDULED'
  | 'SYNC_JOB_PAUSED'
  | 'SYNC_JOB_RESUMED'
  | 'ORDER_SYNC_STARTED'
  | 'ORDER_SYNC_COMPLETED'
  | 'ORDER_SYNC_FAILED'
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_UPDATED'
  | 'CUSTOMER_CREATED'
  | 'STOCK_SYNC_STARTED'
  | 'STOCK_SYNC_COMPLETED'
  | 'STOCK_SYNC_FAILED'
  | 'STOCK_UPDATED'
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'FILE_CHANGE_DETECTED'
  | 'CONNECTION_HEALTH_CHANGED'
  | 'AGENT_HEARTBEAT'
  | 'LICENSE_ACTIVATED'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_REVOKED'
  | 'UPDATE_AVAILABLE'
  | 'UPDATE_INSTALLED'
  | 'UPDATE_ROLLED_BACK'
  | 'SYSTEM_ALERT';

export interface BridgeEvent<T = Record<string, unknown>> {
  id: string;
  type: BridgeEventType;
  organizationId: string;
  source: string;
  timestamp: Date;
  data: T;
  status: 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export const BridgeEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    'SYNC_STARTED',
    'SYNC_COMPLETED',
    'SYNC_FAILED',
    'SYNC_ITEM_FAILED',
    'SYNC_ITEM_RETRY',
    'SYNC_JOB_SCHEDULED',
    'SYNC_JOB_PAUSED',
    'SYNC_JOB_RESUMED',
    'ORDER_SYNC_STARTED',
    'ORDER_SYNC_COMPLETED',
    'ORDER_SYNC_FAILED',
    'ORDER_CREATED',
    'ORDER_STATUS_UPDATED',
    'CUSTOMER_CREATED',
    'STOCK_SYNC_STARTED',
    'STOCK_SYNC_COMPLETED',
    'STOCK_SYNC_FAILED',
    'STOCK_UPDATED',
    'INVOICE_CREATED',
    'INVOICE_UPDATED',
    'FILE_CHANGE_DETECTED',
    'CONNECTION_HEALTH_CHANGED',
    'AGENT_HEARTBEAT',
    'LICENSE_ACTIVATED',
    'LICENSE_EXPIRED',
    'LICENSE_REVOKED',
    'UPDATE_AVAILABLE',
    'UPDATE_INSTALLED',
    'UPDATE_ROLLED_BACK',
    'SYSTEM_ALERT',
  ]),
  organizationId: z.string(),
  source: z.string(),
  timestamp: z.coerce.date(),
  data: z.record(z.unknown()),
  status: z.enum(['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED']),
  error: z.string().optional(),
});
