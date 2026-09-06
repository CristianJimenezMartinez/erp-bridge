import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';

export interface DatabaseConfig {
  connectionString?: string;
  ssl?: boolean | { rejectUnauthorized?: boolean };
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  maxPoolSize?: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private readonly logger = new Logger('DatabaseService');
  private pool: Pool | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public isAvailable(): boolean {
    return this.pool !== null;
  }

  public initialize(config: DatabaseConfig): void {
    const connStr = config.connectionString || process.env['DATABASE_URL'];
    const isCloudPostgres = connStr && (
      connStr.includes('supabase.co') || 
      connStr.includes('supabase.com') || 
      connStr.includes('neon.tech') || 
      connStr.includes('sslmode=require') ||
      process.env['DB_SSL'] === 'true'
    );

    const sslConfig = config.ssl !== undefined
      ? config.ssl
      : isCloudPostgres
      ? { rejectUnauthorized: false }
      : undefined;

    const poolConfig: PoolConfig = connStr
      ? {
          connectionString: connStr,
          ssl: sslConfig,
          max: config.maxPoolSize || 10,
        }
      : {
          host: config.host || process.env['DB_HOST'] || 'localhost',
          port: config.port || Number(process.env['DB_PORT']) || 5432,
          database: config.database || process.env['DB_DATABASE'] || 'Factusol',
          user: config.user || process.env['DB_USER'] || 'postgres',
          password: config.password || process.env['DB_PASSWORD'] || '123456789',
          ssl: sslConfig,
          max: config.maxPoolSize || 10,
        };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (err) => {
      this.logger.error('Error inesperado en el pool de PostgreSQL', err);
    });
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('DatabaseService no está inicializado. Llame a initialize() primero.');
    }
    return this.pool.query<T>(text, params);
  }

  public async checkHealth(): Promise<{ healthy: boolean; message: string; latencyMs: number }> {
    if (!this.pool) {
      return { healthy: false, message: 'DatabaseService no inicializado', latencyMs: 0 };
    }

    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      const latencyMs = Date.now() - start;
      return { healthy: true, message: 'Conexión a PostgreSQL activa', latencyMs };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const msg = error instanceof Error ? error.message : String(error);
      return { healthy: false, message: `Error conectando a PostgreSQL: ${msg}`, latencyMs };
    }
  }

  public async runMigrations(): Promise<void> {
    this.logger.info('Ejecutando migraciones de base de datos...');
    const migrationsDir = path.resolve(__dirname, './migrations');
    const altDir = path.resolve(process.cwd(), 'packages/core/src/database/migrations');
    const targetDir = fs.existsSync(migrationsDir) ? migrationsDir : altDir;

    if (!fs.existsSync(targetDir)) {
      throw new Error(`Directorio de migraciones no encontrado en ${migrationsDir} ni en ${altDir}`);
    }

    const migrationFiles = fs
      .readdirSync(targetDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(targetDir, file);
      this.logger.info(`Ejecutando migración: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await this.query(sql);
    }

    this.logger.info(`Migraciones ejecutadas exitosamente (${migrationFiles.length} archivos procesados).`);
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.info('Pool de conexiones de PostgreSQL cerrado.');
    }
  }
}
