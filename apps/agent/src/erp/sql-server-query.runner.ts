import { execFile } from 'child_process';
import net from 'net';
import { CanonicalOrder } from '@erp-bridge/shared';
import { ErpArticlePreviewItem, ErpCatalogArticle, ErpProviderConfigState } from './erp.types';
import { SqlServerErpProfile } from './sql-server-profiles';

export const SQL_SECRET_MASK = '••••••••';

export function mapSqlPreviewRows(rows: any[]): ErpArticlePreviewItem[] {
  return (rows || []).map((r: any) => ({
    code: String(r.code || '').trim(),
    description: String(r.description || '').trim(),
    family: String(r.family || 'GENERAL').trim(),
    stock: Number(r.stock || 0),
    salePrice: Number(r.salePrice || 0),
    costPrice: Number(r.costPrice || 0),
    ean: String(r.ean || '').trim(),
  }));
}

export function mapSqlCatalogRows(rows: any[]): ErpCatalogArticle[] {
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
}

export interface SqlServerConnectionOptions {
  serverInstance: string;
  databaseName: string;
  authMode: 'windows' | 'sql';
  username?: string;
  password?: string;
  evaluationMode?: boolean;
}

/**
 * Resolves effective SQL Server connection options from saved settings, mssql:// URI, and overrides.
 */
export function resolveSqlConnectionOptions(
  settings: ErpProviderConfigState,
  profile: SqlServerErpProfile,
  dbSpec?: string,
  overrides?: Partial<SqlServerConnectionOptions>
): SqlServerConnectionOptions {
  let serverInstance = overrides?.serverInstance || settings.serverInstance || profile.defaultInstances[0] || '.\\SQLEXPRESS';
  let databaseName = overrides?.databaseName || settings.databaseName || profile.defaultDatabase;
  if (dbSpec && dbSpec.startsWith('mssql://')) {
    const clean = dbSpec.slice('mssql://'.length);
    const slashIdx = clean.lastIndexOf('/');
    if (slashIdx > 0) {
      serverInstance = clean.slice(0, slashIdx);
      databaseName = clean.slice(slashIdx + 1);
    }
  }
  const rawPass = overrides?.password !== undefined && overrides.password !== '' && overrides.password !== SQL_SECRET_MASK
    ? overrides.password
    : settings.password;
  return {
    serverInstance,
    databaseName,
    authMode: overrides?.authMode || settings.authMode || 'windows',
    username: overrides?.username ?? settings.username,
    password: rawPass,
    evaluationMode: overrides?.evaluationMode ?? settings.evaluationMode,
  };
}

/**
 * Builds a sanitized SQL Server INSERT statement for order header injection.
 */
export function buildSanitizedSqlOrderHeader(
  templateSql: string,
  order: CanonicalOrder,
  series: string,
  assignedNum: number
): string {
  const cleanSqlText = (val: unknown, maxLen: number) =>
    String(val || '')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .replace(/'/g, "''")
      .trim()
      .substring(0, maxLen);

  const safeName = cleanSqlText(order.customer?.fiscalName || 'Cliente Web', 80);
  const safeNotes = cleanSqlText(order.notes || order.reference || '', 150);
  const safeSerie = cleanSqlText(series || '1', 5);
  const rawTotal = Number(order.totalAmount || 0);
  const total = (Number.isFinite(rawTotal) ? rawTotal : 0).toFixed(2);

  return templateSql
    .replace(/@serie/g, `'${safeSerie}'`)
    .replace(/@number/g, String(Math.floor(Number(assignedNum) || 0)))
    .replace(/@customerName/g, `'${safeName}'`)
    .replace(/@total/g, total)
    .replace(/@notes/g, `'${safeNotes}'`);
}

/**
 * Executes a read/write SQL Server query via System.Data.SqlClient using
 * SqlConnectionStringBuilder so credentials and server/database names can never
 * inject connection-string directives.
 */
export function runSqlServerQuery(opts: SqlServerConnectionOptions, sqlQuery: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const cleanField = (val?: string, maxLen = 128) =>
      String(val || '').replace(/[\x00-\x1f\x7f]/g, '').trim().substring(0, maxLen);

    const server = cleanField(opts.serverInstance, 128);
    const db = cleanField(opts.databaseName, 128);
    const authMode = opts.authMode === 'sql' ? 'sql' : 'windows';
    const user = cleanField(opts.username || 'sa', 128);
    const pass = String(opts.password || '').replace(/\x00/g, '').substring(0, 256);

    const psScript = `
$ErrorActionPreference = 'Stop'
try {
  $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $builder['Data Source'] = $env:BENTIAN_SQL_SERVER
  $builder['Initial Catalog'] = $env:BENTIAN_SQL_DB
  $builder['Connect Timeout'] = 3
  $builder['TrustServerCertificate'] = $true
  if ($env:BENTIAN_SQL_AUTH -eq 'sql') {
    $builder['Integrated Security'] = $false
    $builder['User ID'] = $env:BENTIAN_SQL_USER
    $builder['Password'] = $env:BENTIAN_SQL_PASS
  } else {
    $builder['Integrated Security'] = $true
  }
  $conn = New-Object System.Data.SqlClient.SqlConnection($builder.ConnectionString)
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

    const encodedScript = Buffer.from(psScript, 'utf16le').toString('base64');

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedScript],
      {
        timeout: 6000,
        windowsHide: true,
        env: {
          ...process.env,
          BENTIAN_SQL_SERVER: server,
          BENTIAN_SQL_DB: db,
          BENTIAN_SQL_AUTH: authMode,
          BENTIAN_SQL_USER: user,
          BENTIAN_SQL_PASS: pass,
          BENTIAN_SQL_QUERY: sqlQuery,
        },
      },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message || 'Error SQL Server').trim()));
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

/**
 * Probes local SQL Server TCP 1433 and returns standard named instances for Spanish ERPs.
 */
export async function probeLocalSqlServerInstances(): Promise<string[]> {
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
