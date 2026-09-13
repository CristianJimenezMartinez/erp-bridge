import { Logger } from '@erp-bridge/shared';

export interface BatchChunkProcessorOptions {
  chunkSize?: number;
  highLatencyThresholdMs?: number;
  throttleDelayMs?: number;
}

export class BatchThrottler {
  public static async processChunks<T, R>(
    items: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    logger: Logger,
    options?: BatchChunkProcessorOptions
  ): Promise<R[]> {
    const chunkSize = options?.chunkSize ?? 25;
    const highLatencyThresholdMs = options?.highLatencyThresholdMs ?? 1500;
    const throttleDelayMs = options?.throttleDelayMs ?? 750;

    const allResults: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkStart = Date.now();

      const chunkResults = await processor(chunk);
      allResults.push(...chunkResults);

      const elapsed = Date.now() - chunkStart;
      if (elapsed > highLatencyThresholdMs && i + chunkSize < items.length) {
        logger.warn(
          `Latencia alta detectada en WooCommerce (${elapsed}ms > ${highLatencyThresholdMs}ms). Aplicando throttling adaptativo de ${throttleDelayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, throttleDelayMs));
      }
    }

    return allResults;
  }
}
