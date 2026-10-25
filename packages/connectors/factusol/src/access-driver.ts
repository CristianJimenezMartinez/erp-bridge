import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { ConnectionError, ErrorCode } from '@erp-bridge/sdk';
import { Logger } from '@erp-bridge/shared';
import {
  OLEDB_CANDIDATES,
  buildSafeOledbConnectionString,
  decodeCscriptStreamBuffer,
  resolveTrustedAdodbJsPath,
  sanitizeDatabasePath,
  sanitizeOledbProvider,
} from './access-connection.helper';

export class AccessDatabaseTimeoutError extends Error {
  constructor(
    message = 'Tiempo de espera agotado al consultar la base de datos Access (posible bloqueo exclusivo o compactación en curso)'
  ) {
    super(message);
    this.name = 'AccessDatabaseTimeoutError';
    Object.setPrototypeOf(this, AccessDatabaseTimeoutError.prototype);
  }
}

export interface AccessDriverConfig {
  databasePath: string;
  provider?: string;
  cscriptPath?: string;
  /** Timeout (ms) por operación OLEDB. Por defecto 30 s (o env BENTIAN_ACCESS_TIMEOUT_MS). */
  timeoutMs?: number;
}

const DEFAULT_OPERATION_TIMEOUT_MS = 30000;

/**
 * F11: cola por base de datos para operaciones de ESCRITURA (execute/transaction).
 * Serializa las escrituras concurrentes dentro del proceso del agente para que no compitan por el bloqueo
 * de Access ni disparen timeouts en cadena. Las lecturas siguen siendo concurrentes (Share Deny None).
 */
const writeQueues = new Map<string, Promise<unknown>>();

async function runExclusiveWrite<T>(key: string, task: () => Promise<T>): Promise<T> {
  const normalizedKey = key.toLowerCase();
  const previous = writeQueues.get(normalizedKey) ?? Promise.resolve();
  const run = previous.then(task, task);
  const tail = run.catch(() => undefined);
  writeQueues.set(normalizedKey, tail);
  try {
    return await run;
  } finally {
    if (writeQueues.get(normalizedKey) === tail) writeQueues.delete(normalizedKey);
  }
}

export class AccessDriver {
  private readonly logger = new Logger('AccessDriver');
  private readonly databasePath: string;
  private provider: string;
  private cscriptPath: string;
  private readonly adodbJsPath: string;
  private readonly timeoutMs: number;

  constructor(config: AccessDriverConfig) {
    this.databasePath = sanitizeDatabasePath(config.databasePath);
    this.provider = sanitizeOledbProvider(config.provider);
    const envTimeout = Number(process.env['BENTIAN_ACCESS_TIMEOUT_MS']);
    const requestedTimeout = Number(config.timeoutMs);
    this.timeoutMs =
      Number.isFinite(requestedTimeout) && requestedTimeout >= 1000
        ? requestedTimeout
        : Number.isFinite(envTimeout) && envTimeout >= 1000
          ? envTimeout
          : DEFAULT_OPERATION_TIMEOUT_MS;

    const winDir = process.env['WINDIR'] || process.env['SystemRoot'] || 'C:\\Windows';
    const sysWow64 = path.join(winDir, 'SysWOW64', 'cscript.exe');
    const system32 = path.join(winDir, 'System32', 'cscript.exe');

    if (config.cscriptPath && fs.existsSync(config.cscriptPath)) {
      this.cscriptPath = config.cscriptPath;
    } else if (fs.existsSync(sysWow64)) {
      this.cscriptPath = sysWow64;
    } else {
      this.cscriptPath = system32;
    }

    this.adodbJsPath = resolveTrustedAdodbJsPath(__dirname);
  }

  public getConnectionString(): string {
    // Mantiene Mode=Share Deny None; requerido para concurrencia con Factusol en caliente
    return buildSafeOledbConnectionString(this.provider, this.databasePath, true);
  }

  public getDatabasePath(): string {
    return this.databasePath;
  }

  public verifyFileExists(): void {
    if (process.platform !== 'win32') {
      throw new ConnectionError(
        ErrorCode.CONNECTOR_UNSUPPORTED_OPERATION,
        `El conector nativo OLEDB de Factusol requiere Windows con el motor Microsoft Access Database Engine (ACE.OLEDB) instalado (plataforma detectada: ${process.platform}).`,
        { platform: process.platform, path: this.databasePath }
      );
    }
    if (!fs.existsSync(this.databasePath)) {
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        `El archivo de base de datos Factusol no existe en la ruta: ${this.databasePath}`,
        { path: this.databasePath }
      );
    }
  }

  private isProviderOrArchError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
      lower.includes('no está registrado') ||
      lower.includes('not registered') ||
      lower.includes('cannot be found') ||
      lower.includes('no se encuentra el proveedor') ||
      lower.includes('800a0e7a')
    );
  }

  private async tryCandidates(
    action: 'query' | 'execute' | 'transaction',
    sqlOrSqls: string | string[]
  ): Promise<string> {
    let lastError: unknown = null;
    for (const cand of OLEDB_CANDIDATES) {
      if (!fs.existsSync(cand.cscript)) continue;
      if (cand.cscript === this.cscriptPath && cand.provider === this.provider) continue;

      try {
        const testConn = buildSafeOledbConnectionString(cand.provider, this.databasePath, false);
        const payload =
          action === 'transaction'
            ? { connection: testConn, sqls: sqlOrSqls }
            : { connection: testConn, sql: sqlOrSqls };
        const res = await this.runAdodbWith(cand.cscript, action, JSON.stringify(payload));
        this.logger.info(
          `✓ Conexión OLEDB auto-reparada y adaptada: cscript=${cand.cscript}, provider=${cand.provider}`
        );
        this.cscriptPath = cand.cscript;
        this.provider = cand.provider;
        return res;
      } catch (err) {
        lastError = err;
        const msg = (err as { message?: string })?.message || String(err);
        // F12: solo se prueba el siguiente candidato si ESTE falló por proveedor/arquitectura (la base de datos
        // ni siquiera llegó a abrirse). Cualquier otro error (SQL, bloqueo, timeout) implica que el proveedor
        // abrió la base de datos: repetir la transacción completa con otro candidato podría duplicar escrituras.
        if (err instanceof AccessDatabaseTimeoutError || !this.isProviderOrArchError(msg)) {
          this.logger.warn(`Candidato OLEDB ${cand.provider} falló por causa no atribuible a la arquitectura; se detienen los reintentos: ${msg}`);
          throw err;
        }
      }
    }
    const lastMsg = (lastError as { message?: string } | null)?.message;
    throw new Error(
      'Ninguna combinación de proveedor OLEDB / arquitectura de Windows fue capaz de abrir la base de datos.' +
        (lastMsg ? ` Último error: ${lastMsg}` : '')
    );
  }

  private runAdodbWith(
    cscript: string,
    action: 'query' | 'execute' | 'transaction',
    input: string,
    timeoutMs = this.timeoutMs
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = childProcess.spawn(cscript, ['//Nologo', '//U', this.adodbJsPath, action], {
        windowsHide: true,
      });

      let killed = false;
      const timer = setTimeout(() => {
        killed = true;
        try {
          child.kill('SIGKILL');
        } catch {}
        reject(
          new AccessDatabaseTimeoutError(
            'Tiempo de espera agotado al consultar la base de datos Access (posible bloqueo exclusivo o compactación en curso)'
          )
        );
      }, timeoutMs);

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      child.on('error', (err) => {
        clearTimeout(timer);
        if (!killed) reject(err);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (killed) return;

        if (stderrChunks.length > 0) {
          const stderrText = decodeCscriptStreamBuffer(Buffer.concat(stderrChunks)).trim();
          let errMsg = stderrText;
          try {
            const parsedErr = JSON.parse(stderrText);
            errMsg = parsedErr.message || stderrText;
          } catch {}
          return reject(new Error(errMsg));
        }

        if (code !== 0) {
          const stdoutText = decodeCscriptStreamBuffer(Buffer.concat(stdoutChunks)).trim();
          return reject(new Error(stdoutText || `cscript process exited with code ${code}`));
        }

        return resolve(decodeCscriptStreamBuffer(Buffer.concat(stdoutChunks)));
      });

      child.stdin.end(Buffer.from(input, 'utf16le'));
    });
  }

  private runAdodb(action: 'query' | 'execute' | 'transaction', input: string): Promise<string> {
    return this.runAdodbWith(this.cscriptPath, action, input);
  }

  private async executeWithArchFallback(
    action: 'query' | 'execute' | 'transaction',
    sqlOrSqls: string | string[],
    errorPrefix: string
  ): Promise<string> {
    this.verifyFileExists();
    const connectionString = this.getConnectionString();
    const input = JSON.stringify(
      action === 'transaction'
        ? { connection: connectionString, sqls: sqlOrSqls }
        : { connection: connectionString, sql: sqlOrSqls }
    );

    try {
      return await this.runAdodb(action, input);
    } catch (error: unknown) {
      if (error instanceof AccessDatabaseTimeoutError) {
        this.logger.error(`Timeout agotado en operación Access (${action}, ${this.timeoutMs}ms)`, error);
        throw error;
      }
      const errorMessage = (error as { message?: string })?.message || 'Error desconocido en operación Access';
      if (this.isProviderOrArchError(errorMessage)) {
        this.logger.warn(`Conflicto de arquitectura OLEDB (${errorMessage}). Probando candidatos alternativos...`);
        try {
          return await this.tryCandidates(action, sqlOrSqls);
        } catch (candidateError) {
          // F12: no ocultar el error original; se informa junto al de los candidatos.
          const candidateMsg = (candidateError as { message?: string })?.message || String(candidateError);
          this.logger.error(`${errorPrefix}: ${errorMessage} | candidatos alternativos: ${candidateMsg}`, candidateError);
          throw new ConnectionError(
            ErrorCode.CONNECTION_FAILED,
            `${errorPrefix}: ${errorMessage} (candidatos alternativos: ${candidateMsg})`,
            { databasePath: this.databasePath, cscriptPath: this.cscriptPath, rawError: errorMessage, candidateError: candidateMsg }
          );
        }
      }
      this.logger.error(`${errorPrefix}: ${errorMessage}`, error);
      throw new ConnectionError(ErrorCode.CONNECTION_FAILED, `${errorPrefix}: ${errorMessage}`, {
        databasePath: this.databasePath,
        cscriptPath: this.cscriptPath,
        rawError: errorMessage,
      });
    }
  }

  public async query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const resultJson = await this.executeWithArchFallback('query', sql, 'Error en consulta Access');
    return JSON.parse(resultJson) as T[];
  }

  public async execute(sql: string): Promise<void> {
    await runExclusiveWrite(this.databasePath, () =>
      this.executeWithArchFallback('execute', sql, 'Error ejecutando comando Access')
    );
  }

  public async executeTransaction(sqlStatements: string[]): Promise<void> {
    const validStatements = (sqlStatements || []).filter((s) => s && s.trim().length > 0);
    if (validStatements.length === 0) return;
    await runExclusiveWrite(this.databasePath, () =>
      this.executeWithArchFallback('transaction', validStatements, 'Error ejecutando transacción Access')
    );
  }
}
