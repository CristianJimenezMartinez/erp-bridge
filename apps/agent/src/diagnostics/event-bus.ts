import { EventEmitter } from 'events';
import { LogEvent } from './diagnostics.types';

export class EventBus extends EventEmitter {
  private recentEvents: LogEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents = 80) {
    super();
    this.maxEvents = maxEvents;
  }

  public addEvent(level: 'info' | 'warn' | 'error' | 'success', message: string): void {
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.recentEvents.unshift({ timestamp: timeStr, level, message });
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents.pop();
    }
  }

  public getRecentEvents(): LogEvent[] {
    return [...this.recentEvents];
  }
}
