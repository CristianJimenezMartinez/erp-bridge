import fs from 'fs';
import path from 'path';
import os from 'os';

export interface StructuredLogEntry {
  timestamp?: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  component: string;
  action: string;
  duration_ms?: number | null;
  status?: 'SUCCESS' | 'FAILURE' | 'RUNNING' | 'SKIPPED' | 'CANCELLED';
  message?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
  } | null;
}

export class AgentDiskLogger {
  private static instance: AgentDiskLogger | null = null;
  private logDir: string;
  private currentFilePath: string;
  private maxSizeBytes = 5 * 1024 * 1024; // 5 MB
  private maxFiles = 3;
  private writeStream: fs.WriteStream | null = null;
  private currentSize = 0;
  private isRotating = false;
  private writeQueue: string[] = [];

  constructor(customLogDir?: string) {
    if (customLogDir) {
      this.logDir = customLogDir;
    } else {
      const baseDir =
        process.env.APPDATA ||
        (os.platform() === 'darwin'
          ? path.join(os.homedir(), 'Library', 'Application Support')
          : path.join(os.homedir(), '.config'));
      this.logDir = path.join(baseDir, 'Bentian Agent', 'logs');
    }

    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch {
      // Fallback a directorio local si AppData no está disponible
      this.logDir = path.resolve(process.cwd(), 'logs');
      if (!fs.existsSync(this.logDir)) {
        try {
          fs.mkdirSync(this.logDir, { recursive: true });
        } catch {}
      }
    }

    this.currentFilePath = path.join(this.logDir, 'agent.log');
    this.initStream();
  }

  public static getInstance(): AgentDiskLogger {
    if (!AgentDiskLogger.instance) {
      AgentDiskLogger.instance = new AgentDiskLogger();
    }
    return AgentDiskLogger.instance;
  }

  public getLogDir(): string {
    return this.logDir;
  }

  public getLogPath(): string {
    return this.currentFilePath;
  }

  private initStream(): void {
    try {
      if (fs.existsSync(this.currentFilePath)) {
        this.currentSize = fs.statSync(this.currentFilePath).size;
      } else {
        this.currentSize = 0;
      }
      this.writeStream = fs.createWriteStream(this.currentFilePath, {
        flags: 'a',
        encoding: 'utf8',
      });
      this.writeStream.on('error', () => {
        // Evitar que errores de escritura de log tiren el proceso
      });
    } catch {
      this.writeStream = null;
    }
  }

  public log(entry: StructuredLogEntry): void {
    const canonicalEntry: StructuredLogEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level || 'INFO',
      component: entry.component || 'Agent',
      action: entry.action || 'general',
      duration_ms: entry.duration_ms ?? null,
      status: entry.status || (entry.level === 'ERROR' ? 'FAILURE' : 'SUCCESS'),
      message: entry.message || '',
      metadata: entry.metadata || {},
      error: entry.error || null,
    };

    const line = JSON.stringify(canonicalEntry) + '\r\n';
    const lineBytes = Buffer.byteLength(line, 'utf8');

    if (this.isRotating) {
      this.writeQueue.push(line);
      return;
    }

    if (this.currentSize + lineBytes >= this.maxSizeBytes) {
      this.rotate(line);
    } else {
      this.currentSize += lineBytes;
      if (this.writeStream && this.writeStream.writable) {
        this.writeStream.write(line);
      } else {
        try {
          fs.appendFileSync(this.currentFilePath, line, 'utf8');
        } catch {}
      }
    }
  }

  private rotate(pendingLine?: string): void {
    this.isRotating = true;

    const performShift = () => {
      try {
        // 1. Eliminar el archivo más viejo
        const oldestFile = path.join(this.logDir, `agent.${this.maxFiles - 1}.log`);
        if (fs.existsSync(oldestFile)) {
          try {
            fs.unlinkSync(oldestFile);
          } catch {}
        }

        // 2. Desplazar hacia arriba (agent.1.log -> agent.2.log)
        for (let i = this.maxFiles - 2; i >= 1; i--) {
          const src = path.join(this.logDir, `agent.${i}.log`);
          const dst = path.join(this.logDir, `agent.${i + 1}.log`);
          if (fs.existsSync(src)) {
            try {
              fs.renameSync(src, dst);
            } catch {}
          }
        }

        // 3. Renombrar agent.log -> agent.1.log
        if (fs.existsSync(this.currentFilePath)) {
          const target = path.join(this.logDir, 'agent.1.log');
          try {
            fs.renameSync(this.currentFilePath, target);
          } catch {}
        }
      } catch {
        // En Windows puede haber bloqueos transitorios; ignorar
      } finally {
        this.isRotating = false;
        this.initStream();

        if (pendingLine) {
          this.currentSize += Buffer.byteLength(pendingLine, 'utf8');
          this.writeStream?.write(pendingLine);
        }

        while (this.writeQueue.length > 0) {
          const queued = this.writeQueue.shift();
          if (queued) {
            this.currentSize += Buffer.byteLength(queued, 'utf8');
            this.writeStream?.write(queued);
          }
        }
      }
    };

    if (this.writeStream) {
      this.writeStream.end(() => {
        performShift();
      });
    } else {
      performShift();
    }
  }

  public getRecentLogs(limit = 100, filterLevel?: string): StructuredLogEntry[] {
    if (!fs.existsSync(this.currentFilePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.currentFilePath, 'utf8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const entries: StructuredLogEntry[] = [];

      for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
        const line = lines[i];
        if (!line) continue;
        try {
          const parsed = JSON.parse(line) as StructuredLogEntry;
          if (!filterLevel || parsed.level.toLowerCase() === filterLevel.toLowerCase()) {
            entries.push(parsed);
          }
        } catch {
          // Ignorar líneas corruptas
        }
      }

      return entries;
    } catch {
      return [];
    }
  }
}
