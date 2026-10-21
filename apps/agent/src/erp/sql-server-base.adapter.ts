import { execFile } from 'child_process';
import net from 'net';
import { CanonicalOrder, Logger } from '@erp-bridge/shared';
import { ConfigManager } from '../config/config.manager';
import { EventBus } from '../diagnostics/event-bus';
import { IErpConnector } from './erp-connector.interface';
import {
  ErpArticlePreviewItem,
  ErpCatalogArticle,
  ErpMetadata,
  ErpOrderResult,
  ErpProviderConfigState,
  ErpTestResult,
  SupportedErpProviderId,
} from './erp.types';
import { SqlServerErpProfile } from './sql-server-profiles';

export interface SqlServerConnectionOptions {
  serverInstance: string;
  databaseName: string;
  authMode: 'windows' | 'sql';
  username?: string;
  password?: string;
  evaluationMode?: boolean;
}

export abstract class SqlServerBaseAdapter implements IErpConnector {
  public readonly providerId: SupportedErpProviderId;
  public readonly displayName: string;
  protected readonly logger: Logger;
  private connected = false;
  private demoOrderSeq = 100;

  constructor(
    protected readonly profile: SqlServerErpProfile,
    protected readonly configManager: ConfigManager,
    protected readonly eventBus?: EventBus
  ) {
    this.providerId = profile.providerId;
    this.displayName = profile.displayName;
    this.logger = new Logger(`SqlAdapter:${profile.providerId}`);
  }

  public getProviderSettings(): ErpProviderConfigState {
    const cfg = this.configManager.get();
    const fromSoftwareErp = cfg.softwareErp?.providers?.[this.providerId] || {};
    const fromTopLevel = (cfg as any)[this.providerId] || {};
    return {
      serverInstance: fromSoftwareErp.serverInstance || fromTopLevel.serverInstance || this.profile.defaultInstances[0],
      databaseName: fromSoftwareErp.databaseName || fromTopLevel.databaseName || this.profile.defaultDatabase,
      authMode: fromSoftwareErp.authMode || fromTopLevel.authMode || 'windows',
      username: fromSoftwareErp.username || fromTopLevel.username || 'sa',
      password: fromSoftwareErp.password || fromTopLevel.password || '',
      evaluationMode: Boolean(fromSoftwareErp.evaluationMode ?? fromTopLevel.evaluationMode ?? false),
      databasePath: fromSoftwareErp.databasePath || fromTopLevel.databasePath || '',
      tariffCode: fromSoftwareErp.tariffCode || fromTopLevel.tariffCode || '1',
      warehouseCode: fromSoftwareErp.warehouseCode || fromTopLevel.warehouseCode || 'GEN',
      orderSeries: fromSoftwareErp.orderSeries || fromTopLevel.orderSeries || '1',
    };
  }

  public isEvaluationMode(customSpec?: string): boolean {
    const s = this.getProviderSettings();
    if (s.evaluationMode) return true;
    const spec = (customSpec || s.databasePath || '').trim().toUpperCase();
    return spec === 'DEMO' || spec.startsWith('DEMO://');
  }

  public getDatabasePath(): string {
    const s = this.getProviderSettings();
    if (this.isEvaluationMode(s.databasePath)) {
      return `DEMO://${this.providerId.toUpperCase()}/${s.databaseName || this.profile.defaultDatabase}`;
    }
    if (s.databasePath && s.databasePath.trim()) {
      return s.databasePath.trim();
    }
    if (s.serverInstance && s.databaseName) {
      return `mssql://${s.serverInstance}/${s.databaseName}`;
    }
    return '';
  }

  public isConfigured(): boolean {
    const s = this.getProviderSettings();
    return Boolean(this.isEvaluationMode(s.databasePath) || s.databasePath || (s.serverInstance && s.databaseName));
  }

  public isDatabaseAccessible(): boolean {
    if (this.isEvaluationMode()) return true;
    return this.connected;
  }

  public async connect(customDbPath?: string): Promise<boolean> {
    if (this.isEvaluationMode(customDbPath)) {
      this.connected = true;
      return true;
    }
    const res = await this.testConnection(customDbPath || this.getDatabasePath());
    this.connected = res.success;
    return res.success;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public async testConnection(dbSpec?: string, overrides?: Partial<SqlServerConnectionOptions>): Promise<ErpTestResult> {
    if (overrides?.evaluationMode || this.isEvaluationMode(dbSpec)) {
      this.connected = true;
      const demoCount = this.profile.demoArticles.length;
      return {
        success: true,
        evaluationMode: true,
        articleCount: demoCount,
        resolvedPath: `DEMO://${this.providerId.toUpperCase()}/${this.profile.defaultDatabase}`,
        message: `Modo Evaluación activo para ${this.displayName} (${demoCount} artículos de demostración listos para sincronizar sin ERP instalado).`,
      };
    }

    const opts = this.resolveConnectionOptions(dbSpec, overrides);
    try {
      const rows = await this.executeSqlQuery(opts, this.profile.queries.countArticles);
      const count = rows && rows.length > 0 ? Number(rows[0].total ?? 0) : 0;
      this.connected = true;
      const canonicalSpec = `mssql://${opts.serverInstance}/${opts.databaseName}`;
      return {
        success: true,
        articleCount: count,
        resolvedPath: canonicalSpec,
        message: `Conectado a ${this.displayName} en SQL Server (${opts.serverInstance} / ${opts.databaseName}) — ${count} artículos detectados.`,
      };
    } catch (err) {
      this.connected = false;
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `No se pudo conectar a ${this.displayName} en ${opts.serverInstance} (${opts.databaseName}): ${msg}. Puedes pulsar "Probar en Modo Evaluación" si no tienes el ERP instalado en este equipo.`,
      };
    }
  }

  public async reconnect(dbSpec: string, overrides?: Partial<SqlServerConnectionOptions>): Promise<ErpTestResult> {
    const res = await this.testConnection(dbSpec, overrides);
    if (res.success) {
      this.saveProviderConfig({
        databasePath: res.resolvedPath || dbSpec,
        serverInstance: overrides?.serverInstance,
        databaseName: overrides?.databaseName,
        authMode: overrides?.authMode,
        username: overrides?.username,
        password: overrides?.password,
        evaluationMode: Boolean(res.evaluationMode),
      });
      this.eventBus?.addEvent('success', `✓ ${this.displayName} vinculado (${res.resolvedPath || dbSpec})`);
    }
    return res;
  }

  public saveProviderConfig(partial: Partial<ErpProviderConfigState>): void {
    const cfg = this.configManager.get();
    const existing = this.getProviderSettings();
    const merged: ErpProviderConfigState = {
      ...existing,
      ...Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined)),
    };
    (cfg as any)[this.providerId] = merged;
    if (!cfg.softwareErp) {
      cfg.softwareErp = { activeProvider: this.providerId, provisioned: true, providers: {} };
    }
    if (!cfg.softwareErp.providers) cfg.softwareErp.providers = {};
    cfg.softwareErp.providers[this.providerId] = merged;
    this.configManager.saveConfigToDisk();
  }

  public async getArticleCount(customDbPath?: string): Promise<number | undefined> {
    if (this.isEvaluationMode(customDbPath)) {
      return this.profile.demoArticles.length;
    }
    const res = await this.testConnection(customDbPath);
    return res.success ? res.articleCount : undefined;
  }

  public async getPreviewArticles(limit = 25): Promise<ErpArticlePreviewItem[]> {
    if (this.isEvaluationMode()) {
      return this.profile.demoArticles.slice(0, limit).map((a) => ({
        code: a.code,
        description: a.name,
        family: a.family,
        stock: a.stock,
        salePrice: a.price,
        costPrice: a.costPrice,
        ean: a.barcode,
      }));
    }
    try {
      const rows = await this.executeSqlQuery(this.resolveConnectionOptions(), this.profile.queries.previewArticles(limit));
      return (rows || []).map((r: any) => ({
        code: String(r.code || '').trim(),
        description: String(r.description || '').trim(),
        family: String(r.family || 'GENERAL').trim(),
        stock: Number(r.stock || 0),
        salePrice: Number(r.salePrice || 0),
        costPrice: Number(r.costPrice || 0),
        ean: String(r.ean || '').trim(),
      }));
    } catch {
      return [];
    }
  }

  public async getMetadata(): Promise<ErpMetadata> {
    return this.profile.metadata;
  }

  public async getStockMap(warehouseCode?: string): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (this.isEvaluationMode()) {
      for (const item of this.profile.demoArticles) {
        map.set(item.code.toUpperCase(), item.stock);
      }
      return map;
    }
    try {
      const wh = warehouseCode || this.getProviderSettings().warehouseCode || 'GEN';
      const rows = await this.executeSqlQuery(this.resolveConnectionOptions(), this.profile.queries.readStock(wh));
      for (const r of rows || []) {
        const sku = String(r.sku || '').trim().toUpperCase();
        if (sku) map.set(sku, Math.max(0, Math.round(Number(r.stock) || 0)));
      }
    } catch (err) {
      this.logger.warn(`Aviso al leer stock en ${this.displayName}: ${String(err)}`);
    }
    return map;
  }

  public async getArticlesForCatalog(limit = 5000): Promise<ErpCatalogArticle[]> {
    if (this.isEvaluationMode()) {
      return [...this.profile.demoArticles];
    }
    try {
      const rows = await this.executeSqlQuery(this.resolveConnectionOptions(), this.profile.queries.readCatalog(limit));
      return (rows || []).map((r: any) => ({
        code: String(r.code || '').trim(),
        name: String(r.name || '').trim(),
        family: String(r.family || 'GENERAL').trim(),
        stock: Math.max(0, Math.round(Number(r.stock) || 0)),
        price: Number(r.price || 0),
        costPrice: Number(r.costPrice || 0),
        barcode: String(r.barcode || '').trim(),
        description: String(r.description || r.name || '').trim(),
      }));
    } catch {
      return [];
    }
  }

  public async createOrder(order: CanonicalOrder, series?: string): Promise<ErpOrderResult> {
    if (this.isEvaluationMode()) {
      this.demoOrderSeq += 1;
      const assigned = this.demoOrderSeq;
      return {
        success: true,
        orderNumber: assigned,
        externalId: `${series || '1'}-${assigned}`,
      };
    }
    try {
      const assignedNum = Math.floor(Date.now() / 1000) % 1000000;
      const safeName = String(order.customer?.fiscalName || 'Cliente Web').replace(/'/g, "''").substring(0, 80);
      const safeNotes = String(order.notes || order.reference || '').replace(/'/g, "''").substring(0, 150);
      const safeSerie = String(series || this.getProviderSettings().orderSeries || '1').replace(/'/g, "''").substring(0, 5);
      const total = Number(order.totalAmount || 0).toFixed(2);
      const headerSql = this.profile.queries.insertOrderHeader
        .replace(/@serie/g, `'${safeSerie}'`)
        .replace(/@number/g, String(assignedNum))
        .replace(/@customerName/g, `'${safeName}'`)
        .replace(/@total/g, total)
        .replace(/@notes/g, `'${safeNotes}'`);

      await this.executeSqlQuery(this.resolveConnectionOptions(), headerSql);
      return { success: true, orderNumber: assignedNum, externalId: assignedNum };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private resolveConnectionOptions(dbSpec?: string, overrides?: Partial<SqlServerConnectionOptions>): SqlServerConnectionOptions {
    const s = this.getProviderSettings();
    let serverInstance = overrides?.serverInstance || s.serverInstance || this.profile.defaultInstances[0];
    let databaseName = overrides?.databaseName || s.databaseName || this.profile.defaultDatabase;
    if (dbSpec && dbSpec.startsWith('mssql://')) {
      const clean = dbSpec.slice('mssql://'.length);
      const slashIdx = clean.lastIndexOf('/');
      if (slashIdx > 0) {
        serverInstance = clean.slice(0, slashIdx);
        databaseName = clean.slice(slashIdx + 1);
      }
    }
    return {
      serverInstance,
      databaseName,
      authMode: overrides?.authMode || s.authMode || 'windows',
      username: overrides?.username ?? s.username,
      password: overrides?.password ?? s.password,
      evaluationMode: overrides?.evaluationMode ?? s.evaluationMode,
    };
  }

  protected executeSqlQuery(opts: SqlServerConnectionOptions, sqlQuery: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const server = opts.serverInstance.replace(/;/g, '');
      const db = opts.databaseName.replace(/;/g, '');
      const authSegment = opts.authMode === 'sql'
        ? `User ID=${(opts.username || 'sa').replace(/;/g, '')};Password=${(opts.password || '').replace(/;/g, '')};`
        : 'Integrated Security=True;';
      const connStr = `Server=${server};Database=${db};${authSegment}Connection Timeout=3;TrustServerCertificate=True;`;

      const psScript = `
$ErrorActionPreference = 'Stop'
try {
  $conn = New-Object System.Data.SqlClient.SqlConnection($env:BENTIAN_SQL_CONN)
  $conn.Open()
  $cmd = $conn.CreateCommand()
  $cmd.CommandTimeout = 5
  $cmd.CommandText = "SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED; " + $env:BENTIAN_SQL_QUERY
  $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
  $dt = New-Object System.Data.DataTable
  [void]$adapter.Fill($dt)
  $conn.Close()
  $rows = @()
  foreach ($r in $dt.Rows) {
    $obj = @{}
    foreach ($c in $dt.Columns) { $obj[$c.ColumnName] = $r[$c.ColumnName] }
    $rows += $obj
  }
  ConvertTo-Json -InputObject $rows -Compress -Depth 4
} catch {
  Write-Error $_.Exception.Message
  exit 1
}`;
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        {
          timeout: 6000,
          windowsHide: true,
          env: { ...process.env, BENTIAN_SQL_CONN: connStr, BENTIAN_SQL_QUERY: sqlQuery },
        },
        (err, stdout, stderr) => {
          if (err) {
            return reject(new Error((stderr || err.message || 'Error SQL Server').trim()));
          }
          const raw = (stdout || '').trim();
          if (!raw) return resolve([]);
          try {
            const parsed = JSON.parse(raw);
            resolve(Array.isArray(parsed) ? parsed : [parsed]);
          } catch {
            resolve([]);
          }
        }
      );
    });
  }

  public static async detectLocalSqlInstances(): Promise<string[]> {
    const found: string[] = [];
    const tcpAlive = await new Promise<boolean>((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(350);
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('error', () => { sock.destroy(); resolve(false); });
      sock.once('timeout', () => { sock.destroy(); resolve(false); });
      sock.connect(1433, '127.0.0.1');
    });
    if (tcpAlive) found.push('localhost:1433');
    for (const candidate of ['.\\SQLEXPRESS', '.\\AGORA', '.\\SAGE50', '.\\A3ERP']) {
      if (!found.includes(candidate)) found.push(candidate);
    }
    return found;
  }
}
