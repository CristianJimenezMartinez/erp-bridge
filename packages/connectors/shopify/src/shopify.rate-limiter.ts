import { Logger } from '@erp-bridge/shared';
import { ShopifyThrottleStatus } from './shopify.types';

export class ShopifyRateLimiter {
  private readonly logger = new Logger('ShopifyRateLimiter');
  private maximumAvailable: number = 2000;
  private currentlyAvailable: number = 2000;
  private restoreRate: number = 50;
  private lastUpdate: number = Date.now();
  private readonly minAvailableThreshold: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(minAvailableThreshold: number = 100) {
    this.minAvailableThreshold = minAvailableThreshold;
  }

  public updateThrottleStatus(status: ShopifyThrottleStatus): void {
    this.maximumAvailable = status.maximumAvailable;
    this.currentlyAvailable = status.currentlyAvailable;
    this.restoreRate = status.restoreRate || 50;
    this.lastUpdate = Date.now();
  }

  public getEstimatedAvailablePoints(): number {
    const elapsedSec = (Date.now() - this.lastUpdate) / 1000;
    const restored = elapsedSec * this.restoreRate;
    return Math.min(this.maximumAvailable, this.currentlyAvailable + restored);
  }

  public async acquire(estimatedCost: number = 10): Promise<number> {
    const currentPoints = this.getEstimatedAvailablePoints();
    const targetPoints = Math.max(this.minAvailableThreshold, estimatedCost);

    if (currentPoints < targetPoints) {
      const deficit = targetPoints - currentPoints;
      const waitMs = Math.max(50, Math.ceil((deficit / this.restoreRate) * 1000));

      this.logger.warn('Shopify API points throttle reached. Pausing request.', {
        currentPoints: Math.round(currentPoints),
        targetPoints,
        waitMs,
      });

      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.currentlyAvailable = this.getEstimatedAvailablePoints();
      this.lastUpdate = Date.now();
      return waitMs;
    }

    return 0;
  }

  public async schedule<T>(task: () => Promise<T>, estimatedCost: number = 10): Promise<T> {
    const runTask = async (): Promise<T> => {
      await this.acquire(estimatedCost);
      return task();
    };

    const nextPromise = this.queue.then(runTask, runTask);
    this.queue = nextPromise.then(() => undefined, () => undefined);
    return nextPromise;
  }

  public getStatus(): ShopifyThrottleStatus {
    return {
      maximumAvailable: this.maximumAvailable,
      currentlyAvailable: Math.round(this.getEstimatedAvailablePoints()),
      restoreRate: this.restoreRate,
    };
  }
}
