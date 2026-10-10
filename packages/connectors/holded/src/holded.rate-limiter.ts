import { Logger } from '@erp-bridge/shared';
import { HoldedRateLimitStatus } from './holded.types';

export class HoldedRateLimiter {
  private readonly logger = new Logger('HoldedRateLimiter');
  private readonly capacity: number;
  private tokens: number;
  private lastRefillTime: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(maxRequestsPerMinute: number = 250) {
    this.capacity = maxRequestsPerMinute;
    this.tokens = maxRequestsPerMinute;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    if (elapsed > 0) {
      const refillRate = this.capacity / 60000; // tokens por ms
      const restored = elapsed * refillRate;
      this.tokens = Math.min(this.capacity, this.tokens + restored);
      this.lastRefillTime = now;
    }
  }

  public async acquire(cost: number = 1): Promise<number> {
    this.refill();

    if (this.tokens < cost) {
      const deficit = cost - this.tokens;
      const refillRate = this.capacity / 60000;
      const waitMs = Math.max(50, Math.ceil(deficit / refillRate));

      this.logger.warn('Holded API rate limit throttle reached (250 req/min). Pausing request.', {
        availableTokens: Math.floor(this.tokens),
        required: cost,
        waitMs,
      });

      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.refill();
      this.tokens = Math.max(0, this.tokens - cost);
      return waitMs;
    }

    this.tokens -= cost;
    return 0;
  }

  public async schedule<T>(task: () => Promise<T>, cost: number = 1): Promise<T> {
    const runTask = async (): Promise<T> => {
      await this.acquire(cost);
      return task();
    };

    const nextPromise = this.queue.then(runTask, runTask);
    this.queue = nextPromise.then(() => undefined, () => undefined);
    return nextPromise;
  }

  public getStatus(): HoldedRateLimitStatus {
    this.refill();
    const refillRate = this.capacity / 60000;
    const deficit = Math.max(0, this.capacity - this.tokens);
    return {
      limit: this.capacity,
      remaining: Math.max(0, Math.floor(this.tokens)),
      resetInMs: Math.ceil(deficit / refillRate),
    };
  }

  public setTokens(tokens: number): void {
    this.tokens = Math.max(0, Math.min(this.capacity, tokens));
    this.lastRefillTime = Date.now();
  }
}
