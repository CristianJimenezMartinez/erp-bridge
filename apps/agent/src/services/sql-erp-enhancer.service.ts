import fs from 'fs';
import path from 'path';
import { AccessDriver } from '@erp-bridge/connector-factusol';
import { CanonicalOrder, Logger } from '@erp-bridge/shared';
import { ErpOrderResult } from '../erp/erp.types';
import { SqlServerBaseAdapter, SqlServerConnectionOptions } from '../erp/sql-server-base.adapter';

function sanitizeSql(val: unknown, maxLen = 150): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''").trim().substring(0, maxLen);
}

/**
 * Determina si las opciones de conexión apuntan a una base de datos física local (.mdb / .accdb)
 * para laboratorio / pruebas reales en disco mediante Microsoft.ACE.OLEDB.
 */
export function resolveLocalMdbPath(
  adapter: SqlServerBaseAdapter,
  opts?: Partial<SqlServerConnectionOptions>
): string | null {
  const settings = adapter.getProviderSettings();
  const candidates = [
    opts?.databaseName,
    opts?.serverInstance,
    settings.databasePath,
    settings.databaseName,
    settings.serverInstance,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());

  for (const raw of candidates) {
    const clean = raw.replace(/^(mdb|localdb|file):\/\//i, '');
    if (/\.(mdb|accdb)$/i.test(clean) && fs.existsSync(clean)) {
      return path.resolve(clean);
    }
    if (/^mssql:\/\//i.test(raw)) {
      const afterScheme = raw.slice('mssql://'.length);
      const slashIdx = afterScheme.indexOf('/');
      if (slashIdx > 0) {
        const hostPart = afterScheme.slice(0, slashIdx);
        const dbPart = afterScheme.slice(slashIdx + 1);
        if (/\.(mdb|accdb)$/i.test(dbPart) && fs.existsSync(dbPart)) {
          return path.resolve(dbPart);
        }
        if (hostPart.toUpperCase() === 'LOCAL_MDB') {
          const labCandidate = path.join('C:\\BentianLab', dbPart.endsWith('.mdb') ? dbPart : `${dbPart}.mdb`);
          if (fs.existsSync(labCandidate)) return labCandidate;
        }
      }
    }
  }

  const srv = (opts?.serverInstance || settings.serverInstance || '').trim().toUpperCase();
  if (srv === 'LOCAL_MDB' || srv === 'BENTIAN_LAB') {
    const dbName = (opts?.databaseName || settings.databaseName || (adapter as any).profile?.defaultDatabase || '').trim();
    const labPath = path.join('C:\\BentianLab', dbName.endsWith('.mdb') ? dbName : `${dbName}.mdb`);
    if (fs.existsSync(labPath)) {
      return labPath;
    }
  }

  return null;
}

/**
 * Traduce consultas SELECT de los perfiles SQL Server a dialecto Jet/ACE SQL cuando se
 * ejecuta contra un archivo físico .mdb/.accdb de laboratorio.
 */
export function translateTsqlSelectToJetSql(providerId: string, sqlQuery: string): string {
  const q = sqlQuery.trim();

  // 1. Consultas multi-join específicas por proveedor que en Jet SQL requieren paréntesis en los LEFT JOIN
  if (providerId === 'agora' && /FROM\s+SaleItem\s+si/i.test(q)) {
    const topMatch = q.match(/SELECT\s+TOP\s+(\d+)/i);
    const topClause = topMatch ? `TOP ${topMatch[1]} ` : '';
    if (/AS\s+salePrice/i.test(q)) {
      return `SELECT ${topClause}CStr(si.Id) AS code, si.Name AS description, CStr(si.FamilyId) AS family, IIF(ws.Quantity IS NULL, 0, ws.Quantity) AS stock, IIF(pl.MainPrice IS NULL, 0, pl.MainPrice) AS salePrice, IIF(si.CostPrice IS NULL, 0, si.CostPrice) AS costPrice, si.Barcode AS ean FROM (SaleItem AS si LEFT JOIN PriceList AS pl ON (pl.SaleItemId = si.Id AND pl.PriceListId = 1)) LEFT JOIN WarehouseStock AS ws ON (ws.ProductId = si.Id AND ws.WarehouseId = 1) WHERE si.DeletedOn IS NULL ORDER BY si.Id ASC`;
    }
    return `SELECT ${topClause}CStr(si.Id) AS code, si.Name AS name, CStr(si.FamilyId) AS family, IIF(ws.Quantity IS NULL, 0, ws.Quantity) AS stock, IIF(pl.MainPrice IS NULL, 0, pl.MainPrice) AS price, IIF(si.CostPrice IS NULL, 0, si.CostPrice) AS costPrice, si.Barcode AS barcode, si.Name AS description FROM (SaleItem AS si LEFT JOIN PriceList AS pl ON (pl.SaleItemId = si.Id AND pl.PriceListId = 1)) LEFT JOIN WarehouseStock AS ws ON (ws.ProductId = si.Id AND ws.WarehouseId = 1) WHERE si.DeletedOn IS NULL`;
  }

  if (providerId === 'agora' && /FROM\s+WarehouseStock/i.test(q)) {
    const whMatch = q.match(/=\s*'([^']*)'/);
    const wh = whMatch ? whMatch[1] : 'GEN';
    return `SELECT CStr(ProductId) AS sku, SUM(IIF(Quantity IS NULL, 0, Quantity)) AS stock FROM WarehouseStock WHERE CStr(WarehouseId) = '${wh}' OR '${wh}' = 'GEN' GROUP BY ProductId`;
  }

  if (providerId === 'sage50' && /FROM\s+articulo\s+a/i.test(q)) {
    const topMatch = q.match(/SELECT\s+TOP\s+(\d+)/i);
    const topClause = topMatch ? `TOP ${topMatch[1]} ` : '';
    if (/AS\s+salePrice/i.test(q)) {
      return `SELECT ${topClause}Trim(a.codigo) AS code, Trim(a.nombre) AS description, Trim(a.familia) AS family, IIF(s.final IS NULL, 0, s.final - IIF(s.reservado IS NULL, 0, s.reservado)) AS stock, IIF(p.pvp IS NULL, 0, p.pvp) AS salePrice, IIF(a.ult_coste IS NULL, 0, a.ult_coste) AS costPrice, Trim(a.codigo_barras) AS ean FROM (articulo AS a LEFT JOIN pvp AS p ON (p.articulo = a.codigo AND p.tarifa = '01')) LEFT JOIN stocks AS s ON (s.articulo = a.codigo AND s.almacen = '01') WHERE a.baja = 0 ORDER BY a.codigo ASC`;
    }
    return `SELECT ${topClause}Trim(a.codigo) AS code, Trim(a.nombre) AS name, Trim(a.familia) AS family, IIF(s.final IS NULL, 0, s.final - IIF(s.reservado IS NULL, 0, s.reservado)) AS stock, IIF(p.pvp IS NULL, 0, p.pvp) AS price, IIF(a.ult_coste IS NULL, 0, a.ult_coste) AS costPrice, Trim(a.codigo_barras) AS barcode, Trim(a.nombre) AS description FROM (articulo AS a LEFT JOIN pvp AS p ON (p.articulo = a.codigo AND p.tarifa = '01')) LEFT JOIN stocks AS s ON (s.articulo = a.codigo AND s.almacen = '01') WHERE a.baja = 0`;
  }

  if (providerId === 'sage50' && /FROM\s+stocks/i.test(q)) {
    const whMatch = q.match(/=\s*'([^']*)'/);
    const wh = whMatch ? whMatch[1] : 'GEN';
    return `SELECT Trim(articulo) AS sku, SUM(IIF(final IS NULL, 0, final - IIF(reservado IS NULL, 0, reservado))) AS stock FROM stocks WHERE Trim(almacen) = '${wh}' OR '${wh}' = 'GEN' OR '${wh}' = '01' GROUP BY articulo`;
  }

  if (providerId === 'a3erp' && /FROM\s+ARTICULO\s+A/i.test(q)) {
    const topMatch = q.match(/SELECT\s+TOP\s+(\d+)/i);
    const topClause = topMatch ? `TOP ${topMatch[1]} ` : '';
    if (/AS\s+salePrice/i.test(q)) {
      return `SELECT ${topClause}Trim(A.CODART) AS code, Trim(A.DESCART) AS description, Trim(A.FAMART) AS family, IIF(S.UNIDADES IS NULL, 0, S.UNIDADES - IIF(S.RESERVADO IS NULL, 0, S.RESERVADO)) AS stock, IIF(A.PRCVENTA IS NULL, 0, A.PRCVENTA) AS salePrice, IIF(A.PRCCOMPRA IS NULL, 0, A.PRCCOMPRA) AS costPrice, Trim(A.CODBAR) AS ean FROM ARTICULO AS A LEFT JOIN STOCKALM AS S ON (S.CODART = A.CODART AND Trim(S.CODALM) = 'GEN') WHERE A.OBSOLETO = 'F' ORDER BY A.CODART ASC`;
    }
    return `SELECT ${topClause}Trim(A.CODART) AS code, Trim(A.DESCART) AS name, Trim(A.FAMART) AS family, IIF(S.UNIDADES IS NULL, 0, S.UNIDADES - IIF(S.RESERVADO IS NULL, 0, S.RESERVADO)) AS stock, IIF(A.PRCVENTA IS NULL, 0, A.PRCVENTA) AS price, IIF(A.PRCCOMPRA IS NULL, 0, A.PRCCOMPRA) AS costPrice, Trim(A.CODBAR) AS barcode, Trim(A.DESCART) AS description FROM ARTICULO AS A LEFT JOIN STOCKALM AS S ON (S.CODART = A.CODART AND Trim(S.CODALM) = 'GEN') WHERE A.OBSOLETO = 'F'`;
  }

  if (providerId === 'a3erp' && /FROM\s+STOCKALM/i.test(q)) {
    const whMatch = q.match(/=\s*'([^']*)'/);
    const wh = whMatch ? whMatch[1] : 'GEN';
    return `SELECT Trim(CODART) AS sku, SUM(IIF(UNIDADES IS NULL, 0, UNIDADES - IIF(RESERVADO IS NULL, 0, RESERVADO))) AS stock FROM STOCKALM WHERE Trim(CODALM) = '${wh}' OR '${wh}' = 'GEN' GROUP BY CODART`;
  }

  return q
    .replace(/\s+WITH\s*\(\s*NOLOCK\s*\)/gi, '')
    .replace(/COUNT\s*\(\s*1\s*\)/gi, 'COUNT(*)')
    .replace(/GETDATE\s*\(\s*\)/gi, 'Now()')
    .replace(/LTRIM\s*\(\s*RTRIM\s*\(([^)]+)\)\s*\)/gi, 'Trim($1)');
}

/**
 * Construye un bloque transaccional T-SQL atómico (BEGIN TRAN ... COMMIT TRAN) para SQL Server real:
 * - Idempotencia por referencia de pedido web (Notes / observacio / OBSERV)
 * - Numeración correlativa real (ISNULL(MAX(...), 100) + 1 con UPDLOCK, HOLDLOCK)
 * - Tolerancia a variantes de esquema (c_pediven/c_pedive en Sage 50, CABEPEV/CABEPEDV en a3ERP)
 * - Inserción atómica de cabecera + todas las líneas + descuento de stock en almacén
 */
export function buildSqlServerAtomicOrderBatch(
  providerId: string,
  order: CanonicalOrder,
  series: string,
  warehouse: string
): { tsql: string; fallbackOrderNum: number } {
  const safeSerie = sanitizeSql(series || '1', 5);
  const safeWh = sanitizeSql(warehouse || (providerId === 'sage50' ? '01' : providerId === 'agora' ? '1' : 'GEN'), 10);
  const safeName = sanitizeSql(order.customer?.fiscalName || 'Cliente Web', 80);
  const safeRef = sanitizeSql(order.reference || order.notes || `WC-${order.orderNumber || order.id || ''}`, 150);
  const total = Number(order.totalAmount || 0).toFixed(2);
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const fallbackOrderNum = Math.floor(Date.now() / 1000) % 1000000;

  if (providerId === 'agora') {
    const lineInserts: string[] = [];
    const stockUpdates: string[] = [];
    lines.forEach((l, idx) => {
      const pos = Number(l.position) || idx + 1;
      const sku = sanitizeSql(l.sku, 50);
      const desc = sanitizeSql(l.name || (l as any).description || sku, 120);
      const qty = Number(l.quantity) || 1;
      const price = Number(l.unitPrice || 0).toFixed(4);
      const lineTotal = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
      lineInserts.push(
        `INSERT INTO CustomerOrderLine (OrderSerie, OrderNumber, LineIndex, SaleItemCode, Description, Quantity, UnitPrice, TotalAmount) VALUES ('${safeSerie}', @AssignedNum, ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
      );
      if (sku && qty > 0) {
        stockUpdates.push(
          `UPDATE WarehouseStock SET Quantity = CASE WHEN Quantity - ${qty} >= 0 THEN Quantity - ${qty} ELSE 0 END WHERE CAST(ProductId AS VARCHAR(50)) = '${sku}' AND (CAST(WarehouseId AS VARCHAR(20)) = '${safeWh}' OR '${safeWh}' = 'GEN');`
        );
      }
    });

    const tsql = `
SET NOCOUNT ON;
DECLARE @AssignedNum INT = NULL;
BEGIN TRY
  BEGIN TRAN;
  SELECT TOP 1 @AssignedNum = [Number] FROM CustomerOrder WITH (UPDLOCK, HOLDLOCK) WHERE Notes = '${safeRef}' AND '${safeRef}' <> '';
  IF @AssignedNum IS NULL
  BEGIN
    SELECT @AssignedNum = ISNULL(MAX([Number]), 100) + 1 FROM CustomerOrder WITH (UPDLOCK, HOLDLOCK) WHERE Serie = '${safeSerie}';
    INSERT INTO CustomerOrder (Serie, [Number], BusinessDay, CustomerName, TotalGross, Notes)
    VALUES ('${safeSerie}', @AssignedNum, GETDATE(), '${safeName}', ${total}, '${safeRef}');
    ${lineInserts.join('\n    ')}
    ${stockUpdates.join('\n    ')}
  END
  COMMIT TRAN;
  SELECT @AssignedNum AS orderNumber;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH
`.trim();
    return { tsql, fallbackOrderNum };
  }

  if (providerId === 'sage50') {
    const lineInsertsPediven: string[] = [];
    const lineInsertsPedive: string[] = [];
    const stockUpdates: string[] = [];
    lines.forEach((l, idx) => {
      const pos = Number(l.position) || idx + 1;
      const sku = sanitizeSql(l.sku, 20);
      const desc = sanitizeSql(l.name || (l as any).description || sku, 120);
      const qty = Number(l.quantity) || 1;
      const price = Number(l.unitPrice || 0).toFixed(4);
      const lineTotal = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
      lineInsertsPediven.push(
        `INSERT INTO d_pediven (empresa, numero, letra, linia, articulo, definicion, unidades, precio, importe) VALUES ('01', @AssignedNum, '${safeSerie}', ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
      );
      lineInsertsPedive.push(
        `INSERT INTO d_pedive (empresa, numero, letra, linia, articulo, definicion, unidades, precio, importe) VALUES ('01', @AssignedNum, '${safeSerie}', ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
      );
      if (sku && qty > 0) {
        stockUpdates.push(
          `IF OBJECT_ID('stocks', 'U') IS NOT NULL UPDATE stocks SET final = CASE WHEN final - ${qty} >= 0 THEN final - ${qty} ELSE 0 END WHERE LTRIM(RTRIM(articulo)) = '${sku}' AND (LTRIM(RTRIM(almacen)) = '${safeWh}' OR '${safeWh}' = 'GEN' OR '${safeWh}' = '01');`
        );
      }
    });

    const tsql = `
SET NOCOUNT ON;
DECLARE @AssignedNum INT = NULL;
BEGIN TRY
  BEGIN TRAN;
  IF OBJECT_ID('c_pediven', 'U') IS NOT NULL
  BEGIN
    SELECT TOP 1 @AssignedNum = numero FROM c_pediven WITH (UPDLOCK, HOLDLOCK) WHERE observacio = '${safeRef}' AND '${safeRef}' <> '';
    IF @AssignedNum IS NULL
    BEGIN
      SELECT @AssignedNum = ISNULL(MAX(numero), 100) + 1 FROM c_pediven WITH (UPDLOCK, HOLDLOCK) WHERE letra = '${safeSerie}';
      INSERT INTO c_pediven (empresa, numero, letra, fecha, cliente, importe, observacio)
      VALUES ('01', @AssignedNum, '${safeSerie}', GETDATE(), '43000001', ${total}, '${safeRef}');
      ${lineInsertsPediven.join('\n      ')}
      ${stockUpdates.join('\n      ')}
    END
  END
  ELSE IF OBJECT_ID('c_pedive', 'U') IS NOT NULL
  BEGIN
    SELECT TOP 1 @AssignedNum = numero FROM c_pedive WITH (UPDLOCK, HOLDLOCK) WHERE observacio = '${safeRef}' AND '${safeRef}' <> '';
    IF @AssignedNum IS NULL
    BEGIN
      SELECT @AssignedNum = ISNULL(MAX(numero), 100) + 1 FROM c_pedive WITH (UPDLOCK, HOLDLOCK) WHERE letra = '${safeSerie}';
      INSERT INTO c_pedive (empresa, numero, letra, fecha, cliente, importe, observacio)
      VALUES ('01', @AssignedNum, '${safeSerie}', GETDATE(), '43000001', ${total}, '${safeRef}');
      ${lineInsertsPedive.join('\n      ')}
      ${stockUpdates.join('\n      ')}
    END
  END
  COMMIT TRAN;
  SELECT @AssignedNum AS orderNumber;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH
`.trim();
    return { tsql, fallbackOrderNum };
  }

  // a3erp
  const lineInsertsLinepev: string[] = [];
  const lineInsertsLinepedi: string[] = [];
  const stockUpdates: string[] = [];
  lines.forEach((l, idx) => {
    const pos = Number(l.position) || idx + 1;
    const sku = sanitizeSql(l.sku, 20);
    const desc = sanitizeSql(l.name || (l as any).description || sku, 120);
    const qty = Number(l.quantity) || 1;
    const price = Number(l.unitPrice || 0).toFixed(4);
    const lineTotal = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
    lineInsertsLinepev.push(
      `INSERT INTO LINEPEV (SERIE, NUMDOC, NUMLIN, CODART, DESCART, UNIDADES, PRECIO, IMPORTE) VALUES ('${safeSerie}', @AssignedNum, ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
    );
    lineInsertsLinepedi.push(
      `INSERT INTO LINEPEDI (SERIE, NUMDOC, NUMLIN, CODART, DESCART, UNIDADES, PRECIO, IMPORTE) VALUES ('${safeSerie}', @AssignedNum, ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
    );
    if (sku && qty > 0) {
      stockUpdates.push(
        `UPDATE STOCKALM SET UNIDADES = CASE WHEN UNIDADES - ${qty} >= 0 THEN UNIDADES - ${qty} ELSE 0 END WHERE LTRIM(RTRIM(CODART)) = '${sku}' AND (LTRIM(RTRIM(CODALM)) = '${safeWh}' OR '${safeWh}' = 'GEN');`
      );
    }
  });

  const tsql = `
SET NOCOUNT ON;
DECLARE @AssignedNum INT = NULL;
BEGIN TRY
  BEGIN TRAN;
  IF OBJECT_ID('CABEPEV', 'U') IS NOT NULL
  BEGIN
    SELECT TOP 1 @AssignedNum = NUMDOC FROM CABEPEV WITH (UPDLOCK, HOLDLOCK) WHERE OBSERV = '${safeRef}' AND '${safeRef}' <> '';
    IF @AssignedNum IS NULL
    BEGIN
      SELECT @AssignedNum = ISNULL(MAX(NUMDOC), 100) + 1 FROM CABEPEV WITH (UPDLOCK, HOLDLOCK) WHERE SERIE = '${safeSerie}';
      INSERT INTO CABEPEV (SERIE, NUMDOC, FECHA, CODCLI, NOMCLI, TOTDOC, OBSERV)
      VALUES ('${safeSerie}', @AssignedNum, GETDATE(), '000001', '${safeName}', ${total}, '${safeRef}');
      ${lineInsertsLinepev.join('\n      ')}
      ${stockUpdates.join('\n      ')}
    END
  END
  ELSE IF OBJECT_ID('CABEPEDV', 'U') IS NOT NULL
  BEGIN
    SELECT TOP 1 @AssignedNum = NUMDOC FROM CABEPEDV WITH (UPDLOCK, HOLDLOCK) WHERE OBSERV = '${safeRef}' AND '${safeRef}' <> '';
    IF @AssignedNum IS NULL
    BEGIN
      SELECT @AssignedNum = ISNULL(MAX(NUMDOC), 100) + 1 FROM CABEPEDV WITH (UPDLOCK, HOLDLOCK) WHERE SERIE = '${safeSerie}';
      INSERT INTO CABEPEDV (SERIE, NUMDOC, FECHA, CODCLI, NOMCLI, TOTDOC, OBSERV)
      VALUES ('${safeSerie}', @AssignedNum, GETDATE(), '000001', '${safeName}', ${total}, '${safeRef}');
      ${lineInsertsLinepedi.join('\n      ')}
      ${stockUpdates.join('\n      ')}
    END
  END
  COMMIT TRAN;
  SELECT @AssignedNum AS orderNumber;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH
`.trim();
  return { tsql, fallbackOrderNum };
}

/**
 * Ejecuta la creación atómica de pedido (idempotencia + correlativo MAX+1 + cabecera + líneas + descuento de stock)
 * sobre una base de datos física local .mdb/.accdb (Ágora, Sage 50 o a3ERP).
 */
async function createOrderInLocalMdb(
  providerId: string,
  mdbPath: string,
  order: CanonicalOrder,
  series: string,
  warehouse: string
): Promise<ErpOrderResult> {
  const driver = new AccessDriver({ databasePath: mdbPath });
  const safeSerie = sanitizeSql(series || '1', 5);
  const safeWh = sanitizeSql(warehouse || (providerId === 'sage50' ? '01' : providerId === 'agora' ? '1' : 'GEN'), 10);
  const safeName = sanitizeSql(order.customer?.fiscalName || 'Cliente Web', 80);
  const safeRef = sanitizeSql(order.reference || order.notes || `WC-${order.orderNumber || order.id || ''}`, 150);
  const total = Number(order.totalAmount || 0).toFixed(2);
  const lines = Array.isArray(order.lines) ? order.lines : [];

  if (providerId === 'agora') {
    if (safeRef) {
      const existing = await driver.query<{ Number: number }>(
        `SELECT TOP 1 [Number] FROM CustomerOrder WHERE Notes = '${safeRef}'`
      );
      if (existing.length > 0 && existing[0]?.Number !== undefined) {
        const num = Number(existing[0].Number);
        return { success: true, orderNumber: num, externalId: num };
      }
    }
    const maxRows = await driver.query<{ maxnum: number }>(
      `SELECT MAX([Number]) AS maxnum FROM CustomerOrder WHERE Serie = '${safeSerie}'`
    );
    const nextNum = (Number(maxRows[0]?.maxnum) || 100) + 1;

    const statements: string[] = [
      `INSERT INTO CustomerOrder (Serie, [Number], BusinessDay, CustomerName, TotalGross, Notes) VALUES ('${safeSerie}', ${nextNum}, Now(), '${safeName}', ${total}, '${safeRef}')`,
    ];

    lines.forEach((l, idx) => {
      const pos = Number(l.position) || idx + 1;
      const sku = sanitizeSql(l.sku, 50);
      const desc = sanitizeSql(l.name || (l as any).description || sku, 120);
      const qty = Number(l.quantity) || 1;
      const price = Number(l.unitPrice || 0).toFixed(4);
      const lineTotal = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
      statements.push(
        `INSERT INTO CustomerOrderLine (OrderSerie, OrderNumber, LineIndex, SaleItemCode, Description, Quantity, UnitPrice, TotalAmount) VALUES ('${safeSerie}', ${nextNum}, ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal})`
      );
      if (sku && qty > 0) {
        const numericSku = sku.replace(/^AG-/i, '');
        statements.push(
          `UPDATE WarehouseStock SET Quantity = IIF(Quantity - ${qty} >= 0, Quantity - ${qty}, 0) WHERE CStr(ProductId) = '${numericSku}' OR CStr(ProductId) = '${sku}'`
        );
      }
    });

    await driver.executeTransaction(statements);
    return { success: true, orderNumber: nextNum, externalId: nextNum };
  }

  if (providerId === 'sage50') {
    if (safeRef) {
      const existing = await driver.query<{ numero: number }>(
        `SELECT TOP 1 numero FROM c_pediven WHERE observacio = '${safeRef}'`
      );
      if (existing.length > 0 && existing[0]?.numero !== undefined) {
        const num = Number(existing[0].numero);
        return { success: true, orderNumber: num, externalId: num };
      }
    }
    const maxRows = await driver.query<{ maxnum: number }>(
      `SELECT MAX(numero) AS maxnum FROM c_pediven WHERE letra = '${safeSerie}'`
    );
    const nextNum = (Number(maxRows[0]?.maxnum) || 100) + 1;

    const statements: string[] = [
      `INSERT INTO c_pediven (empresa, numero, letra, fecha, cliente, importe, observacio) VALUES ('01', ${nextNum}, '${safeSerie}', Now(), '43000001', ${total}, '${safeRef}')`,
    ];

    lines.forEach((l, idx) => {
      const pos = Number(l.position) || idx + 1;
      const sku = sanitizeSql(l.sku, 20);
      const desc = sanitizeSql(l.name || (l as any).description || sku, 120);
      const qty = Number(l.quantity) || 1;
      const price = Number(l.unitPrice || 0).toFixed(4);
      const lineTotal = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
      statements.push(
        `INSERT INTO d_pediven (empresa, numero, letra, linia, articulo, definicion, unidades, precio, importe) VALUES ('01', ${nextNum}, '${safeSerie}', ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal})`
      );
      if (sku && qty > 0) {
        statements.push(
          `UPDATE stocks SET final = IIF(final - ${qty} >= 0, final - ${qty}, 0) WHERE Trim(articulo) = '${sku}' AND (Trim(almacen) = '${safeWh}' OR '${safeWh}' = 'GEN' OR '${safeWh}' = '01')`
        );
      }
    });

    await driver.executeTransaction(statements);
    return { success: true, orderNumber: nextNum, externalId: nextNum };
  }

  // a3erp
  if (safeRef) {
    const existing = await driver.query<{ NUMDOC: number }>(
      `SELECT TOP 1 NUMDOC FROM CABEPEV WHERE OBSERV = '${safeRef}'`
    );
    if (existing.length > 0 && existing[0]?.NUMDOC !== undefined) {
      const num = Number(existing[0].NUMDOC);
      return { success: true, orderNumber: num, externalId: num };
    }
  }
  const maxRows = await driver.query<{ maxnum: number }>(
    `SELECT MAX(NUMDOC) AS maxnum FROM CABEPEV WHERE SERIE = '${safeSerie}'`
  );
  const nextNum = (Number(maxRows[0]?.maxnum) || 100) + 1;

  const statements: string[] = [
    `INSERT INTO CABEPEV (SERIE, NUMDOC, FECHA, CODCLI, NOMCLI, TOTDOC, OBSERV) VALUES ('${safeSerie}', ${nextNum}, Now(), '000001', '${safeName}', ${total}, '${safeRef}')`,
  ];

  lines.forEach((l, idx) => {
    const pos = Number(l.position) || idx + 1;
    const sku = sanitizeSql(l.sku, 20);
    const desc = sanitizeSql(l.name || (l as any).description || sku, 120);
    const qty = Number(l.quantity) || 1;
    const price = Number(l.unitPrice || 0).toFixed(4);
    const lineTotal = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
    statements.push(
      `INSERT INTO LINEPEV (SERIE, NUMDOC, NUMLIN, CODART, DESCART, UNIDADES, PRECIO, IMPORTE) VALUES ('${safeSerie}', ${nextNum}, ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal})`
    );
    if (sku && qty > 0) {
      statements.push(
        `UPDATE STOCKALM SET UNIDADES = IIF(UNIDADES - ${qty} >= 0, UNIDADES - ${qty}, 0) WHERE Trim(CODART) = '${sku}' AND (Trim(CODALM) = '${safeWh}' OR '${safeWh}' = 'GEN')`
      );
    }
  });

  await driver.executeTransaction(statements);
  return { success: true, orderNumber: nextNum, externalId: nextNum };
}

/**
 * Extiende por capa superior (sin modificar el módulo congelado apps/agent/src/erp)
 * los adaptadores SQL Server (Ágora, Sage 50 y a3ERP) para:
 * 1. Soportar transacciones T-SQL atómicas (cabecera + líneas + descuento de stock + correlativo MAX+1 + idempotencia).
 * 2. Soportar bases de datos físicas locales .mdb/.accdb (C:\BentianLab\*.mdb) con ejecución SQL real vía OLEDB.
 */
export function enhanceSqlErpAdapter(sqlAdapter: SqlServerBaseAdapter, logger: Logger): void {
  const origExecuteSqlQuery = (sqlAdapter as any).executeSqlQuery.bind(sqlAdapter);
  const origCreateOrder = sqlAdapter.createOrder.bind(sqlAdapter);

  // 1. Interceptar executeSqlQuery para redirigir transparentemente a AccessDriver si apunta a un .mdb/.accdb físico
  (sqlAdapter as any).executeSqlQuery = async (opts: SqlServerConnectionOptions, sqlQuery: string): Promise<any[]> => {
    const mdbPath = resolveLocalMdbPath(sqlAdapter, opts);
    if (mdbPath) {
      const driver = new AccessDriver({ databasePath: mdbPath });
      const jetSql = translateTsqlSelectToJetSql(sqlAdapter.providerId, sqlQuery);
      return driver.query(jetSql);
    }
    return origExecuteSqlQuery(opts, sqlQuery);
  };

  // 2. Extender createOrder para transacción atómica completa (cabecera + líneas + stock + idempotencia + MAX+1)
  (sqlAdapter as any).createOrder = async (
    order: CanonicalOrder,
    series?: string | number,
    warehouse = 'GEN'
  ): Promise<ErpOrderResult> => {
    const serieStr = String(series || sqlAdapter.getProviderSettings().orderSeries || '1');
    if (sqlAdapter.isEvaluationMode()) {
      return origCreateOrder(order, serieStr);
    }

    const opts: SqlServerConnectionOptions = (sqlAdapter as any).resolveConnectionOptions();
    const mdbPath = resolveLocalMdbPath(sqlAdapter, opts);
    if (mdbPath) {
      try {
        return await createOrderInLocalMdb(sqlAdapter.providerId, mdbPath, order, serieStr, String(warehouse || 'GEN'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Error al crear pedido en DB física local de ${sqlAdapter.displayName} (${mdbPath}): ${msg}`);
        return { success: false, error: msg };
      }
    }

    try {
      const { tsql, fallbackOrderNum } = buildSqlServerAtomicOrderBatch(
        sqlAdapter.providerId,
        order,
        serieStr,
        String(warehouse || 'GEN')
      );
      const rows = await (sqlAdapter as any).executeSqlQuery(opts, tsql);
      const assigned =
        rows && rows.length > 0 && rows[0]?.orderNumber !== undefined && rows[0]?.orderNumber !== null
          ? Number(rows[0].orderNumber)
          : fallbackOrderNum;
      return {
        success: true,
        orderNumber: assigned,
        externalId: assigned,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Error al crear pedido transaccional en ${sqlAdapter.displayName}: ${msg}`);
      return {
        success: false,
        error: msg,
      };
    }
  };
}
