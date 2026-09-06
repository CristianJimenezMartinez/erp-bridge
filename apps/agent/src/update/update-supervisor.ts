import { Logger } from '@erp-bridge/shared';

export interface SupervisorOptions {
  healthCheckTimeoutMs?: number; // e.g. 30,000 ms
  maxCrashRetries?: number;
}

export class UpdateSupervisor {
  private readonly logger = new Logger('UpdateSupervisor');

  constructor(private options: SupervisorOptions = {}) {
    this.options.healthCheckTimeoutMs = options.healthCheckTimeoutMs ?? 30000;
  }

  /**
   * Verifies that an updated executable can start up and respond within the timeout window.
   */
  public async observePostUpdateHealth(
    healthCheckFn: () => Promise<boolean>,
    onRollback: () => Promise<void>
  ): Promise<boolean> {
    this.logger.info(`Iniciando supervisión de salud post-actualización (${this.options.healthCheckTimeoutMs}ms ventana)...`);

    const startTime = Date.now();
    const timeout = this.options.healthCheckTimeoutMs!;

    while (Date.now() - startTime < timeout) {
      try {
        const isHealthy = await healthCheckFn();
        if (isHealthy) {
          this.logger.info('✓ Supervisión post-actualización completada: El nuevo binario está saludable.');
          return true;
        }
      } catch {}

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    this.logger.error('❌ Tiempo de espera de salud post-actualización agotado. Iniciando rollback automático...');
    try {
      await onRollback();
    } catch (err) {
      this.logger.error(`Error crítico ejecutando rollback: ${String(err)}`);
    }

    return false;
  }
}
