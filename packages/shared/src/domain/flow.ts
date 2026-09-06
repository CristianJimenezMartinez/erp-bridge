import { z } from 'zod';
import { BridgeEventType } from './events';

export type FlowFilterOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'CONTAINS'
  | 'STARTS_WITH';

export interface FlowFilter {
  field: string;
  operator: FlowFilterOperator;
  value: unknown;
}

export type FlowActionType =
  | 'CREATE_FACTUSOL_ORDER'
  | 'UPDATE_WOOCOMMERCE_STOCK'
  | 'EXECUTE_SYNC_JOB'
  | 'DISPATCH_WEBHOOK';

export interface FlowAction {
  id: string;
  type: FlowActionType;
  name?: string;
  configuration: Record<string, unknown>;
}

export interface Flow {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  triggerEventType: BridgeEventType;
  filters: FlowFilter[];
  actions: FlowAction[];
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionExecutionResult {
  actionId: string;
  actionType: FlowActionType;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  organizationId: string;
  triggerEventId: string;
  triggerEventType: BridgeEventType;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  results: ActionExecutionResult[];
  durationMs: number;
  createdAt: Date;
}

export const FlowFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    'EQUALS',
    'NOT_EQUALS',
    'GREATER_THAN',
    'LESS_THAN',
    'CONTAINS',
    'STARTS_WITH',
  ]),
  value: z.unknown(),
});

export const FlowActionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'CREATE_FACTUSOL_ORDER',
    'UPDATE_WOOCOMMERCE_STOCK',
    'EXECUTE_SYNC_JOB',
    'DISPATCH_WEBHOOK',
  ]),
  name: z.string().optional(),
  configuration: z.record(z.unknown()),
});

export const FlowSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  triggerEventType: z.string() as z.ZodType<BridgeEventType>,
  filters: z.array(FlowFilterSchema),
  actions: z.array(FlowActionSchema),
  isEnabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
