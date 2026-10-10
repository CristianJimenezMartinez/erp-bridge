import { FileEventQueue } from './file-queue';
import {
  FileQueueOptions,
  QueueEvent,
  QueueEventType,
  EnqueueOptions,
  QueueEventHandler,
} from './queue.types';
import { Logger } from '@erp-bridge/shared';

export interface StoreAndForwardOptions extends FileQueueOptions {
  /**
   * Estado de conectividad inicial (default: true).
   */
  initialOnlineState?: boolean;
}

/**
 * Cola Store-and-Forward transaccional para operaciones locales resilientes.
 *
 * En caso de pérdida de conexión o caídas del servicio central/remoto:
 * 1. "Store": Almacena los eventos ('STOCK_SYNC', 'ORDER_PUSH', 'ORDER_ACK', etc.)
 *    de forma duradera y atómica en disco (%APPDATA% o directorio local).
 * 2. "Forward": Despacha secuencialmente los eventos cuando se restablece la
 *    conectividad, garantizando ordenación FIFO, reintentos con backoff exponencial
 *    y tolerancia a reinicios abruptos del proceso.
 */
export class StoreAndForwardQueue extends FileEventQueue {
  private readonly sfLogger = new Logger('StoreAndForwardQueue');
  private online: boolean;

  constructor(options?: StoreAndForwardOptions) {
    super(options);
    this.online = options?.initialOnlineState ?? true;
  }

  /**
   * Consulta el estado de conectividad actual.
   */
  public isOnline(): boolean {
    return this.online;
  }

  /**
   * Actualiza el estado de conectividad online/offline.
   */
  public setOnline(status: boolean): void {
    const previous = this.online;
    this.online = status;
    if (previous !== status) {
      if (status) {
        this.sfLogger.info('✓ Conectividad restablecida: Cola Store-and-Forward lista para reenviar eventos pendientes');
      } else {
        this.sfLogger.warn('⚠️ Conectividad interrumpida: Cola Store-and-Forward en modo offline (almacenamiento local activo)');
      }
    }
  }

  /**
   * Almacena un evento en cola persistente local (fase "Store").
   */
  public async store<T = any>(
    type: QueueEventType,
    payload: T,
    options?: EnqueueOptions
  ): Promise<QueueEvent<T>> {
    return this.enqueue(type, payload, options);
  }

  /**
   * Intenta reenviar el siguiente lote de eventos pendientes hacia el destino (fase "Forward").
   * Si la cola está offline, pospone la transmisión sin perder eventos.
   */
  public async forwardNext<T = any>(handler: QueueEventHandler<T>): Promise<boolean> {
    if (!this.online) {
      return false;
    }

    const event = await this.dequeue();
    if (!event) {
      return false;
    }

    try {
      const result = await handler(event);
      if (result === false) {
        await this.fail(event.id, 'Handler returned false', true);
        return false;
      }
      await this.acknowledge(event.id);
      return true;
    } catch (err) {
      await this.fail(event.id, err instanceof Error ? err : String(err), true);
      return false;
    }
  }
}

export { FileEventQueue };
