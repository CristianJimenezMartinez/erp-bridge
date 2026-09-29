import { EventEmitter } from 'events';
import { LogEvent } from './diagnostics.types';
import { AgentDiskLogger } from './disk-logger';

export class EventBus extends EventEmitter {
  private recentEvents: LogEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents = 80) {
    super();
    this.maxEvents = maxEvents;
  }

  public addEvent(level: 'info' | 'warn' | 'error' | 'success', message: string, extra?: { component?: string; action?: string; durationMs?: number }): void {
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.recentEvents.unshift({ timestamp: timeStr, level, message });
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents.pop();
    }

    // Persistencia continua en disco (%APPDATA%\Bentian Agent\logs\agent.log)
    try {
      const diskLevel = level === 'success' ? 'SUCCESS' : (level.toUpperCase() as 'INFO' | 'WARN' | 'ERROR');
      AgentDiskLogger.getInstance().log({
        level: diskLevel,
        component: extra?.component || 'EventBus',
        action: extra?.action || 'event',
        duration_ms: extra?.durationMs ?? null,
        message,
      });
    } catch {}
  }

  public getRecentEvents(): LogEvent[] {
    return [...this.recentEvents];
  }

  public disconnectAllListeners(): void {
    this.removeAllListeners();
  }

  public clear(): void {
    this.removeAllListeners();
    this.recentEvents = [];
  }
}
