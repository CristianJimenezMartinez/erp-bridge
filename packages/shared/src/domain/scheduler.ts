import { z } from 'zod';

export type ScheduleFrequency =
  | 'every_5_minutes'
  | 'every_15_minutes'
  | 'every_hour'
  | 'every_24_hours'
  | 'custom_cron'
  | 'manual';

export interface SyncJobScheduleConfig {
  enabled: boolean;
  frequency: ScheduleFrequency;
  customCron?: string;
  maxRetries?: number;
  retryDelaySeconds?: number;
  nextRunAt?: Date;
  lastRunAt?: Date;
}

export const SyncJobScheduleConfigSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum([
    'every_5_minutes',
    'every_15_minutes',
    'every_hour',
    'every_24_hours',
    'custom_cron',
    'manual',
  ]),
  customCron: z.string().optional(),
  maxRetries: z.number().int().min(0).max(10).optional().default(3),
  retryDelaySeconds: z.number().int().min(5).max(3600).optional().default(30),
  nextRunAt: z.coerce.date().optional(),
  lastRunAt: z.coerce.date().optional(),
});
