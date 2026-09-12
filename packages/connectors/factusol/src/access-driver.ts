import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { ConnectionError, ErrorCode } from '@erp-bridge/sdk';
import { Logger } from '@erp-bridge/shared';

export interface AccessDriverConfig {
  databasePath: string;
  provider?: string;
  cscriptPath?: string;
}

export class AccessDriver {
  private readonly logger = new Logger('AccessDriver');
  private readonly databasePath: string;
  private provider: string;
  private cscriptPath: string;
  private readonly adodbJsPath: string;

  constructor(config: AccessDriverConfig) {
    this.databasePath = path.resolve(config.databasePath);
    this.provider = config.provider || 'Microsoft.ACE.OLEDB.12.0';

    // Resolve cscript path: on 64-bit Windows, SysWOW64 has the 32-bit cscript needed for 32-bit OLEDB drivers
    if (config.cscriptPath && fs.existsSync(config.cscriptPath)) {
      this.cscriptPath = config.cscriptPath;
    } else if (fs.existsSync('C:\\Windows\\SysWOW64\\cscript.exe')) {
      this.cscriptPath = 'C:\\Windows\\SysWOW64\\cscript.exe';
    } else {
      this.cscriptPath = 'C:\\Windows\\System32\\cscript.exe';
    }

    const possibleAdodbPaths = [
      path.resolve(path.dirname(process.execPath), 'adodb.js'),
      path.resolve(__dirname, 'adodb.js'),
      path.resolve(__dirname, '../src/adodb.js'),
      path.resolve(process.cwd(), 'builder/dist/adodb.js'),
      path.resolve(process.cwd(), 'packages/connectors/factusol/src/adodb.js'),
    ];
    let resolvedAdodb = possibleAdodbPaths.find((p) => fs.existsSync(p));
    if (!resolvedAdodb) {
      try {
        resolvedAdodb = require.resolve('node-adodb/lib/adodb.js');
      } catch {
        resolvedAdodb = path.resolve(__dirname, '../../../node_modules/node-adodb/lib/adodb.js');
      }
    }
    this.adodbJsPath = resolvedAdodb;
  }

  public getConnectionString(): string {
    return `Provider=${this.provider};Data Source=${this.databasePath};Mode=Share Deny None;Persist Security Info=False;`;
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
    const candidates: Array<{ cscript: string; provider: string }> = [
      { cscript: 'C:\\Windows\\SysWOW64\\cscript.exe', provider: 'Microsoft.ACE.OLEDB.12.0' },
      { cscript: 'C:\\Windows\\SysWOW64\\cscript.exe', provider: 'Microsoft.ACE.OLEDB.16.0' },
      { cscript: 'C:\\Windows\\System32\\cscript.exe', provider: 'Microsoft.ACE.OLEDB.16.0' },
      { cscript: 'C:\\Windows\\System32\\cscript.exe', provider: 'Microsoft.ACE.OLEDB.12.0' },
      { cscript: 'C:\\Windows\\SysWOW64\\cscript.exe', provider: 'Microsoft.Jet.OLEDB.4.0' },
    ];

    for (const cand of candidates) {
      if (!fs.existsSync(cand.cscript)) continue;
      if (cand.cscript === this.cscriptPath && cand.provider === this.provider) continue;

      try {
        const testConn = `Provider=${cand.provider};Data Source=${this.databasePath};Persist Security Info=False;`;
        const payload = action === 'transaction'
          ? { connection: testConn, sqls: sqlOrSqls }
          : { connection: testConn, sql: sqlOrSqls };
        const testInput = JSON.stringify(payload);
        const res = await this.runAdodbWith(cand.cscript, action, testInput);
        this.logger.info(
          `✓ Conexión OLEDB auto-reparada y adaptada: cscript=${cand.cscript}, provider=${cand.provider}`
        );
        this.cscriptPath = cand.cscript;
        this.provider = cand.provider;
        return res;
      } catch {
        // Continuar con el siguiente candidato
      }
    }
    throw new Error('Ninguna combinación de proveedor OLEDB / arquitectura de Windows fue capaz de abrir la base de datos.');
  }

  private runAdodbWith(
    cscript: string,
    action: 'query' | 'execute' | 'transaction',
    input: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = childProcess.spawn(cscript, ['//Nologo', this.adodbJsPath, action], {
        windowsHide: true,
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      child.on('error', (err) => reject(err));

      child.on('close', (code) => {
        if (stderrChunks.length > 0) {
          const stderrText = Buffer.concat(stderrChunks).toString('utf8').trim();
          let errMsg = stderrText;
          try {
            const parsedErr = JSON.parse(stderrText);
            errMsg = parsedErr.message || stderrText;
          } catch {
            // Mantener texto en bruto
          }
          return reject(new Error(errMsg));
        }

        if (code !== 0) {
          const stdoutText = Buffer.concat(stdoutChunks).toString('utf8').trim();
          return reject(new Error(stdoutText || `cscript process exited with code ${code}`));
        }

        const outBuf = Buffer.concat(stdoutChunks);
        let text = outBuf.toString('utf8');
        try {
          JSON.parse(text);
          return resolve(text);
        } catch {
          text = outBuf.toString('latin1');
          return resolve(text);
        }
      });

      child.stdin.end(input, 'utf8');
    });
  }

  private runAdodb(action: 'query' | 'execute' | 'transaction', input: string): Promise<string> {
    return this.runAdodbWith(this.cscriptPath, action, input);
  }

  public async query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    this.verifyFileExists();

    const connectionString = this.getConnectionString();
    const input = JSON.stringify({
      connection: connectionString,
      sql,
    });

    const startTime = Date.now();
    try {
      const resultJson = await this.runAdodb('query', input);
      const parsed = JSON.parse(resultJson) as T[];
      this.logger.debug(`Query executed in ${Date.now() - startTime}ms: ${sql.substring(0, 80)}...`);
      return parsed;
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage = err?.message || 'Error desconocido al ejecutar consulta en Access';

      if (this.isProviderOrArchError(errorMessage)) {
        try {
          this.logger.warn(`Detectado posible conflicto de arquitectura OLEDB (${errorMessage}). Probando arquitecturas alternativas...`);
          const fallbackJson = await this.tryCandidates('query', sql);
          const parsed = JSON.parse(fallbackJson) as T[];
          return parsed;
        } catch {
          // Si fallan los candidatos, continúa hacia el throw de ConnectionError
        }
      }

      this.logger.error(`Error ejecutando consulta Access: ${sql}`, error);
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        `Error en consulta Access: ${errorMessage}`,
        {
          sql,
          databasePath: this.databasePath,
          cscriptPath: this.cscriptPath,
          rawError: errorMessage,
        }
      );
    }
  }

  public async execute(sql: string): Promise<void> {
    this.verifyFileExists();

    const connectionString = this.getConnectionString();
    const input = JSON.stringify({
      connection: connectionString,
      sql,
    });

    const startTime = Date.now();
    try {
      await this.runAdodb('execute', input);
      this.logger.debug(`Execute completed in ${Date.now() - startTime}ms: ${sql.substring(0, 80)}...`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage = err?.message || 'Error desconocido al ejecutar comando en Access';

      if (this.isProviderOrArchError(errorMessage)) {
        try {
          this.logger.warn(`Detectado posible conflicto de arquitectura OLEDB (${errorMessage}). Probando arquitecturas alternativas...`);
          await this.tryCandidates('execute', sql);
          return;
        } catch {
          // Continúa hacia el throw si fallan los candidatos
        }
      }

      this.logger.error(`Error ejecutando comando Access: ${sql}`, error);
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        `Error ejecutando comando Access: ${errorMessage}`,
        {
          sql,
          databasePath: this.databasePath,
          cscriptPath: this.cscriptPath,
          rawError: errorMessage,
        }
      );
    }
  }

  public async executeTransaction(sqlStatements: string[]): Promise<void> {
    const validStatements = (sqlStatements || []).filter((s) => s && s.trim().length > 0);
    if (validStatements.length === 0) return;

    this.verifyFileExists();

    const connectionString = this.getConnectionString();
    const input = JSON.stringify({
      connection: connectionString,
      sqls: validStatements,
    });

    const startTime = Date.now();
    try {
      await this.runAdodb('transaction', input);
      this.logger.debug(
        `Transacción atómica ejecutada (${validStatements.length} sentencias) en ${Date.now() - startTime}ms`
      );
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage = err?.message || 'Error desconocido al ejecutar transacción en Access';

      if (this.isProviderOrArchError(errorMessage)) {
        try {
          this.logger.warn(`Detectado posible conflicto de arquitectura OLEDB (${errorMessage}). Probando arquitecturas alternativas...`);
          await this.tryCandidates('transaction', validStatements);
          return;
        } catch {
          // Continúa hacia el throw si fallan los candidatos
        }
      }

      this.logger.error(`Error ejecutando transacción Access (${validStatements.length} sentencias)`, error);
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        `Error ejecutando transacción Access: ${errorMessage}`,
        {
          statementCount: validStatements.length,
          databasePath: this.databasePath,
          cscriptPath: this.cscriptPath,
          rawError: errorMessage,
        }
      );
    }
  }
}
