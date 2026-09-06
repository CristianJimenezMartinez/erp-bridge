import { v4 as uuidv4 } from 'uuid';
import { BridgeEvent, BridgeEventType, Logger } from '@erp-bridge/shared';

export type EventHandler = (event: BridgeEvent) => Promise<void> | void;

export class EventBus {
  private static instance: EventBus;
  private readonly logger = new Logger('EventBus');
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly history: BridgeEvent[] = [];
  private readonly maxHistorySize = 500;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe(eventType: BridgeEventType | '*', handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  public async publish<T = Record<string, unknown>>(
    eventInput: Omit<BridgeEvent<T>, 'id' | 'timestamp' | 'status'>
  ): Promise<BridgeEvent<T>> {
    const event: BridgeEvent<T> = {
      ...eventInput,
      id: `evt_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
      timestamp: new Date(),
      status: 'RECEIVED',
    };

    this.logger.debug(`[EventBus] Publicando evento: ${event.type}`, {
      eventId: event.id,
      type: event.type,
      org: event.organizationId,
      source: event.source,
    });

    // Save in history buffer
    this.history.unshift(event as unknown as BridgeEvent);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }

    // Deliver to handlers
    const specificHandlers = this.handlers.get(event.type) || new Set();
    const globalHandlers = this.handlers.get('*') || new Set();
    const allHandlers = [...specificHandlers, ...globalHandlers];

    event.status = 'PROCESSING';

    for (const handler of allHandlers) {
      try {
        await Promise.resolve(handler(event as unknown as BridgeEvent));
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error en manejador del evento ${event.type}`, { error: errorMsg, eventId: event.id });
        event.error = errorMsg;
      }
    }

    event.status = event.error ? 'FAILED' : 'COMPLETED';
    return event;
  }

  public getRecentEvents(organizationId?: string, limit = 50): BridgeEvent[] {
    let list = this.history;
    if (organizationId) {
      list = list.filter((e) => e.organizationId === organizationId);
    }
    return list.slice(0, limit);
  }

  public clearHistory(): void {
    this.history.length = 0;
  }
}
