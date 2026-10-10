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

    // Anti-flooding: Si el último evento es idéntico en nivel y mensaje, agrupar e incrementar contador
    const latest = this.recentEvents[0];
    if (latest && latest.level === level && latest.message === message) {
      latest.count = (latest.count || 1) + 1;
      if (!latest.firstTimestamp) {
        latest.firstTimestamp = latest.timestamp;
      }
      latest.timestamp = timeStr;

      // Persistencia en disco muestreada para evitar saturación de I/O en bucles de error
      const count = latest.count;
      if (count === 5 || count === 25 || count === 100 || count % 200 === 0) {
        try {
          const diskLevel = level === 'success' ? 'SUCCESS' : (level.toUpperCase() as 'INFO' | 'WARN' | 'ERROR');
          AgentDiskLogger.getInstance().log({
            level: diskLevel,
            component: extra?.component || 'EventBus',
            action: extra?.action || 'event_repeat',
            duration_ms: extra?.durationMs ?? null,
            message: `[x${count}] ${message}`,
          });
        } catch {}
      }
      return;
    }

    this.recentEvents.unshift({ timestamp: timeStr, level, message, count: 1 });
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
