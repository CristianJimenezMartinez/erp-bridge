import { SyncExecution } from '@erp-bridge/shared';

export interface RetryOptions {
  baseDelaySeconds?: number;
  maxDelaySeconds?: number;
  maxRetries?: number;
}

export class RetryEngine {
  public calculateBackoff(
    attempt: number,
    baseDelaySeconds = 15,
    maxDelaySeconds = 3600
  ): number {
    if (attempt <= 1) return baseDelaySeconds;
    const exponential = baseDelaySeconds * Math.pow(2, attempt - 1);
    // Add minor jitter (0-20%) to avoid thundering herd
    const jitter = exponential * 0.1 * Math.random();
    return Math.min(Math.round(exponential + jitter), maxDelaySeconds);
  }

  public extractFailedSkus(execution: SyncExecution): string[] {
    if (!execution.errors || execution.errors.length === 0) {
      return [];
    }

    const skus = new Set<string>();
    for (const err of execution.errors) {
      if (err.itemSku && err.itemSku.trim()) {
        skus.add(err.itemSku.trim());
      }
    }

    return Array.from(skus);
  }

  public canRetry(execution: SyncExecution): boolean {
    return execution.failedCount > 0 && this.extractFailedSkus(execution).length > 0;
  }
}
