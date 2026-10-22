import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { AccessDriver } from '@erp-bridge/connector-factusol';
import { SimplyGestConnector } from '@erp-bridge/connector-simplygest';
import { CanonicalOrder, Logger } from '@erp-bridge/shared';
import { ErpCatalogArticle, ErpOrderResult } from '../erp/erp.types';
import { SimplyGestAdapter } from '../erp/adapters/simplygest.adapter';
import { SqlServerBaseAdapter, SqlServerConnectionOptions } from '../erp/sql-server-base.adapter';
import { UniversalErpImageResolver } from '../sync/universal-erp-image.resolver';

function sanitizeSql(val: unknown, maxLen = 150): string {
  if (val === null || val === undefined) return '';
  let clean = String(val).replace(/[\x00-\x1f\x7f]/g, '').trim();
  if (maxLen > 0 && clean.length > maxLen) {
    clean = clean.substring(0, maxLen);
  }
  return clean.replace(/'/g, "''");
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
    const safeTaxId = sanitizeSql(order.customer?.taxId || '', 20);
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
        `INSERT INTO d_pediven (empresa, numero, letra, linia, articulo, definicion, unidades, precio, importe) VALUES (@Empresa, @AssignedNum, '${safeSerie}', ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
      );
      lineInsertsPedive.push(
        `INSERT INTO d_pedive (empresa, numero, letra, linia, articulo, definicion, unidades, precio, importe) VALUES (@Empresa, @AssignedNum, '${safeSerie}', ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
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
DECLARE @Empresa VARCHAR(10) = '01';
DECLARE @Cliente VARCHAR(20) = '43000001';
BEGIN TRY
  BEGIN TRAN;
  IF OBJECT_ID('clientes', 'U') IS NOT NULL
  BEGIN
    IF '${safeTaxId}' <> ''
      SELECT TOP 1 @Cliente = LTRIM(RTRIM(codigo)) FROM clientes WHERE LTRIM(RTRIM(cif)) = '${safeTaxId}';
    IF @Cliente = '43000001'
      SELECT TOP 1 @Cliente = ISNULL(LTRIM(RTRIM(codigo)), '43000001') FROM clientes ORDER BY codigo ASC;
  END
  IF OBJECT_ID('c_pediven', 'U') IS NOT NULL
  BEGIN
    SELECT TOP 1 @Empresa = ISNULL(LTRIM(RTRIM(empresa)), '01') FROM c_pediven;
    SELECT TOP 1 @AssignedNum = numero FROM c_pediven WITH (UPDLOCK, HOLDLOCK) WHERE observacio = '${safeRef}' AND '${safeRef}' <> '';
    IF @AssignedNum IS NULL
    BEGIN
      SELECT @AssignedNum = ISNULL(MAX(numero), 100) + 1 FROM c_pediven WITH (UPDLOCK, HOLDLOCK) WHERE letra = '${safeSerie}';
      IF COL_LENGTH('c_pediven', 'guid_id') IS NOT NULL
        EXEC sp_executesql N'INSERT INTO c_pediven (empresa, numero, letra, fecha, cliente, importe, observacio, guid_id) VALUES (@e, @n, @l, GETDATE(), @c, @t, @o, LOWER(CAST(NEWID() AS VARCHAR(36))))',
          N'@e VARCHAR(10), @n INT, @l VARCHAR(5), @c VARCHAR(20), @t DECIMAL(18,2), @o VARCHAR(150)',
          @e = @Empresa, @n = @AssignedNum, @l = '${safeSerie}', @c = @Cliente, @t = ${total}, @o = '${safeRef}';
      ELSE
        INSERT INTO c_pediven (empresa, numero, letra, fecha, cliente, importe, observacio)
        VALUES (@Empresa, @AssignedNum, '${safeSerie}', GETDATE(), @Cliente, ${total}, '${safeRef}');
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
      VALUES (@Empresa, @AssignedNum, '${safeSerie}', GETDATE(), @Cliente, ${total}, '${safeRef}');
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

  // a3erp (Soporte completo de clave relacional IDPEDV, TIPOCONT, SITUACION y resolución real de CODCLI en CLIENTES)
  const safeTaxId = sanitizeSql(order.customer?.taxId || '', 20);
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
      `IF COL_LENGTH('LINEPEV', 'IDPEDV') IS NOT NULL EXEC sp_executesql N'INSERT INTO LINEPEV (IDPEDV, SERIE, NUMDOC, NUMLIN, CODART, DESCART, UNIDADES, PRECIO, IMPORTE) VALUES (@id, @s, @n, ${pos}, ''${sku}'', ''${desc}'', ${qty}, ${price}, ${lineTotal})', N'@id INT, @s VARCHAR(5), @n INT', @id = @IdPedv, @s = '${safeSerie}', @n = @AssignedNum ELSE INSERT INTO LINEPEV (SERIE, NUMDOC, NUMLIN, CODART, DESCART, UNIDADES, PRECIO, IMPORTE) VALUES ('${safeSerie}', @AssignedNum, ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
    );
    lineInsertsLinepedi.push(
      `IF COL_LENGTH('LINEPEDI', 'IDPEDV') IS NOT NULL EXEC sp_executesql N'INSERT INTO LINEPEDI (IDPEDV, SERIE, NUMDOC, NUMLIN, CODART, DESCART, UNIDADES, PRECIO, IMPORTE) VALUES (@id, @s, @n, ${pos}, ''${sku}'', ''${desc}'', ${qty}, ${price}, ${lineTotal})', N'@id INT, @s VARCHAR(5), @n INT', @id = @IdPedv, @s = '${safeSerie}', @n = @AssignedNum ELSE INSERT INTO LINEPEDI (SERIE, NUMDOC, NUMLIN, CODART, DESCART, UNIDADES, PRECIO, IMPORTE) VALUES ('${safeSerie}', @AssignedNum, ${pos}, '${sku}', '${desc}', ${qty}, ${price}, ${lineTotal});`
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
DECLARE @IdPedv INT = NULL;
DECLARE @CodCli VARCHAR(20) = '000001';
BEGIN TRY
  BEGIN TRAN;
  IF OBJECT_ID('CLIENTES', 'U') IS NOT NULL
  BEGIN
    IF '${safeTaxId}' <> '' AND COL_LENGTH('CLIENTES', 'NIFCLI') IS NOT NULL
      SELECT TOP 1 @CodCli = LTRIM(RTRIM(CODCLI)) FROM CLIENTES WHERE LTRIM(RTRIM(NIFCLI)) = '${safeTaxId}';
    IF @CodCli = '000001'
      SELECT TOP 1 @CodCli = ISNULL(LTRIM(RTRIM(CODCLI)), '000001') FROM CLIENTES ORDER BY CODCLI ASC;
  END
  IF OBJECT_ID('CABEPEV', 'U') IS NOT NULL
  BEGIN
    SELECT TOP 1 @AssignedNum = NUMDOC FROM CABEPEV WITH (UPDLOCK, HOLDLOCK) WHERE OBSERV = '${safeRef}' AND '${safeRef}' <> '';
    IF @AssignedNum IS NULL
    BEGIN
      SELECT @AssignedNum = ISNULL(MAX(NUMDOC), 100) + 1 FROM CABEPEV WITH (UPDLOCK, HOLDLOCK) WHERE SERIE = '${safeSerie}';
      SET @IdPedv = @AssignedNum;
      IF COL_LENGTH('CABEPEV', 'IDPEDV') IS NOT NULL
      BEGIN
        EXEC sp_executesql N'SELECT @outId = ISNULL(MAX(IDPEDV), 1000) + 1 FROM CABEPEV WITH (UPDLOCK, HOLDLOCK)', N'@outId INT OUTPUT', @outId = @IdPedv OUTPUT;
        EXEC sp_executesql N'INSERT INTO CABEPEV (IDPEDV, SERIE, NUMDOC, FECHA, CODCLI, NOMCLI, TOTDOC, OBSERV) VALUES (@id, @s, @n, GETDATE(), @c, @nom, @tot, @obs)',
          N'@id INT, @s VARCHAR(5), @n INT, @c VARCHAR(20), @nom VARCHAR(80), @tot DECIMAL(18,2), @obs VARCHAR(150)',
          @id = @IdPedv, @s = '${safeSerie}', @n = @AssignedNum, @c = @CodCli, @nom = '${safeName}', @tot = ${total}, @obs = '${safeRef}';
      END
      ELSE
      BEGIN
        INSERT INTO CABEPEV (SERIE, NUMDOC, FECHA, CODCLI, NOMCLI, TOTDOC, OBSERV)
        VALUES ('${safeSerie}', @AssignedNum, GETDATE(), @CodCli, '${safeName}', ${total}, '${safeRef}');
      END
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
      SET @IdPedv = @AssignedNum;
      IF COL_LENGTH('CABEPEDV', 'IDPEDV') IS NOT NULL
      BEGIN
        EXEC sp_executesql N'SELECT @outId = ISNULL(MAX(IDPEDV), 1000) + 1 FROM CABEPEDV WITH (UPDLOCK, HOLDLOCK)', N'@outId INT OUTPUT', @outId = @IdPedv OUTPUT;
        EXEC sp_executesql N'INSERT INTO CABEPEDV (IDPEDV, SERIE, NUMDOC, FECHA, CODCLI, NOMCLI, TOTDOC, OBSERV) VALUES (@id, @s, @n, GETDATE(), @c, @nom, @tot, @obs)',
          N'@id INT, @s VARCHAR(5), @n INT, @c VARCHAR(20), @nom VARCHAR(80), @tot DECIMAL(18,2), @obs VARCHAR(150)',
          @id = @IdPedv, @s = '${safeSerie}', @n = @AssignedNum, @c = @CodCli, @nom = '${safeName}', @tot = ${total}, @obs = '${safeRef}';
      END
      ELSE
      BEGIN
        INSERT INTO CABEPEDV (SERIE, NUMDOC, FECHA, CODCLI, NOMCLI, TOTDOC, OBSERV)
        VALUES ('${safeSerie}', @AssignedNum, GETDATE(), @CodCli, '${safeName}', ${total}, '${safeRef}');
      END
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
 * Envía el pedido a la API HTTP oficial del Módulo de Servicios de Integración de Ágora POS (Puerto 8984, Api-Token)
 * para que aparezca instantáneamente en las pantallas táctiles del TPV e imprima comanda en cocina/almacén.
 */
export async function tryPushOrderToAgoraHttpApi(
  opts: SqlServerConnectionOptions,
  order: CanonicalOrder,
  series: string,
  warehouse: string
): Promise<ErpOrderResult | null> {
  const srv = (opts.serverInstance || '').trim();
  let apiBase = '';

  if (/^https?:\/\//i.test(srv)) {
    apiBase = srv.replace(/\/+$/, '');
  } else if (/:8984(\/|$)/.test(srv)) {
    apiBase = `http://${srv.replace(/\/+$/, '')}`;
  } else if (process.env.BENTIAN_AGORA_API_URL) {
    apiBase = process.env.BENTIAN_AGORA_API_URL.trim().replace(/\/+$/, '');
  } else {
    return null;
  }

  const apiToken = opts.password || process.env.BENTIAN_AGORA_API_TOKEN || '';
  const ref = order.reference || order.notes || `WC-${order.orderNumber || order.id || ''}`;
  const payload = {
    CustomerOrders: [
      {
        Serie: series || 'T',
        Number: Number(String(order.orderNumber || '').replace(/\D/g, '')) || Math.floor(Date.now() / 1000) % 100000,
        BusinessDay: new Date().toISOString().slice(0, 10),
        CustomerName: order.customer?.fiscalName || 'Cliente Web',
        CustomerTaxId: order.customer?.taxId || '',
        WarehouseId: Number(warehouse) || 1,
        Notes: ref,
        TotalGross: Number(order.totalAmount || 0),
        Lines: (order.lines || []).map((l, idx) => ({
          LineIndex: Number(l.position) || idx + 1,
          SaleItemId: Number(String(l.sku || '').replace(/\D/g, '')) || l.sku,
          SaleItemCode: l.sku,
          Description: l.name || l.sku,
          Quantity: Number(l.quantity) || 1,
          UnitPrice: Number(l.unitPrice || 0),
          TotalAmount: Number(l.total ?? Number(l.quantity || 1) * Number(l.unitPrice || 0)),
        })),
      },
    ],
  };

  try {
    const res = await fetch(`${apiBase}/api/custom-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { 'Api-Token': apiToken, Authorization: `Bearer ${apiToken}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as any;
    const assigned = json.orderNumber ?? json.Number ?? payload.CustomerOrders[0]!.Number;
    return {
      success: true,
      orderNumber: assigned,
      externalId: assigned,
    };
  } catch {
    return null;
  }
}

/**
 * Invoca el motor COM oficial de Wolters Kluwer (a3ERPActiveX.Pedido) en Windows cuando está registrado en el host,
 * garantizando que a3ERP ejecute sus triggers nativos, contadores IDPEDV, impuestos y reservas de stock.
 */
export async function tryCreateOrderViaA3ErpActiveX(
  order: CanonicalOrder,
  series: string,
  warehouse: string
): Promise<ErpOrderResult | null> {
  if (process.platform !== 'win32' || process.env.BENTIAN_DISABLE_A3_ACTIVEX === '1') {
    return null;
  }

  const safeSerie = sanitizeSql(series || 'A', 5);
  const safeWh = sanitizeSql(warehouse || 'GEN', 10);
  const safeCodCli = sanitizeSql(order.customer?.customerNumber || '000001', 15);
  const safeRef = sanitizeSql(order.reference || order.notes || `WC-${order.orderNumber || order.id || ''}`, 120);
  const lines = Array.isArray(order.lines) ? order.lines : [];

  const psLines = lines
    .map((l) => {
      const sku = sanitizeSql(l.sku, 25);
      const qty = Number(l.quantity) || 1;
      const price = Number(l.unitPrice || 0);
      return `$ped.NuevaLinea(); $ped.AsignaLinea("CODART", "${sku}"); $ped.AsignaLinea("UNIDADES", ${qty}); $ped.AsignaLinea("PRECIO", ${price}); $ped.AnadeLinea();`;
    })
    .join('\n');

  const psScript = `
$ErrorActionPreference = "Stop"
if (-not (Test-Path "HKLM:\\SOFTWARE\\Classes\\a3ERPActiveX.Pedido")) {
  Write-Output "NO_ACTIVEX"
  exit 0
}
$ped = New-Object -ComObject "a3ERPActiveX.Pedido"
$ped.Iniciar()
$ped.Nuevo("${safeSerie}", "${safeCodCli}")
$ped.AsignaCabecera("CODALM", "${safeWh}")
$ped.AsignaCabecera("OBSERV", "${safeRef}")
${psLines}
$numDoc = $ped.Anade()
$ped.Acabar()
Write-Output "OK:$numDoc"
`.trim();

  const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
  return new Promise<ErpOrderResult | null>((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { timeout: 6000 },
      (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const out = stdout.trim();
        if (out.startsWith('OK:')) {
          const num = out.slice(3).trim() || String(Math.floor(Date.now() / 1000) % 100000);
          return resolve({ success: true, orderNumber: num, externalId: num });
        }
        return resolve(null);
      }
    );
  });
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
  const origGetArticlesForCatalog = sqlAdapter.getArticlesForCatalog.bind(sqlAdapter);

  // 1. Interceptar executeSqlQuery para redirigir transparentemente a AccessDriver si apunta a un .mdb/.accdb físico,
  //    y en Sage 50 resolver automáticamente la base de datos del ejercicio activo (ej: 202601 / 2026AB) si dejó el nombre por defecto 'GESTION'.
  (sqlAdapter as any).executeSqlQuery = async (opts: SqlServerConnectionOptions, sqlQuery: string): Promise<any[]> => {
    const mdbPath = resolveLocalMdbPath(sqlAdapter, opts);
    if (mdbPath) {
      const driver = new AccessDriver({ databasePath: mdbPath });
      const jetSql = translateTsqlSelectToJetSql(sqlAdapter.providerId, sqlQuery);
      return driver.query(jetSql);
    }
    try {
      return await origExecuteSqlQuery(opts, sqlQuery);
    } catch (err) {
      if (sqlAdapter.providerId === 'sage50' && (!opts.databaseName || opts.databaseName.toUpperCase() === 'GESTION')) {
        try {
          const masterOpts: SqlServerConnectionOptions = { ...opts, databaseName: 'master' };
          const dbRows = await origExecuteSqlQuery(
            masterOpts,
            "SELECT TOP 1 name FROM sys.databases WHERE name LIKE '20[2-3][0-9]%' ORDER BY name DESC"
          );
          if (dbRows && dbRows.length > 0 && dbRows[0]?.name) {
            const detectedDb = String(dbRows[0].name).trim();
            logger.info(`Base de datos de ejercicio Sage 50 autodetectada en SQL Server: ${detectedDb}`);
            return await origExecuteSqlQuery({ ...opts, databaseName: detectedDb }, sqlQuery);
          }
        } catch {}
      }
      throw err;
    }
  };

  // 1b. Extender getArticlesForCatalog para consultar tablas/columnas multimedia (ART_FOTO, IMAGEN, ButtonImage) y autodetección de fotos
  (sqlAdapter as any).getArticlesForCatalog = async (limit = 5000) => {
    const catalog = await origGetArticlesForCatalog(limit);
    if (!catalog || catalog.length === 0 || sqlAdapter.isEvaluationMode()) {
      return catalog;
    }

    const opts: SqlServerConnectionOptions = (sqlAdapter as any).resolveConnectionOptions();
    const mdbPath = resolveLocalMdbPath(sqlAdapter, opts);
    const dbImgMap = new Map<string, string>();

    try {
      if (mdbPath) {
        // En base de datos .mdb local: inspeccionar SELECT * de la tabla maestra sin provocar errores de columna inexistente
        const tableSpec =
          sqlAdapter.providerId === 'sage50'
            ? { table: 'articulo', codeCol: 'codigo' }
            : sqlAdapter.providerId === 'a3erp'
              ? { table: 'ARTICULO', codeCol: 'CODART' }
              : { table: 'SaleItem', codeCol: 'Id' };
        const rawRows = await (sqlAdapter as any).executeSqlQuery(opts, `SELECT * FROM ${tableSpec.table}`);
        if (Array.isArray(rawRows)) {
          for (const r of rawRows) {
            const skuKey = String(r[tableSpec.codeCol] ?? r.CODIGO ?? r.codigo ?? r.CODART ?? r.Id ?? '').trim().toUpperCase();
            const imgVal = String(
              r.IMAGEN ?? r.imagen ?? r.FOTO ?? r.foto ?? r.FICHERO ?? r.fichero ?? r.ButtonImage ?? r.Image ?? r.Imagen ?? ''
            ).trim();
            if (skuKey && imgVal && !dbImgMap.has(skuKey)) {
              dbImgMap.set(skuKey, imgVal);
            }
          }
        }
      } else {
        // En SQL Server real: usar comprobación defensiva de catálogo (OBJECT_ID / COL_LENGTH) para cero errores en consola
        const safeTsql =
          sqlAdapter.providerId === 'sage50'
            ? `IF OBJECT_ID('ART_FOTO', 'U') IS NOT NULL SELECT LTRIM(RTRIM(ARTICULO)) AS sku, IMAGEN AS img FROM ART_FOTO WHERE LINEA = 1 ELSE IF COL_LENGTH('articulo', 'imagen') IS NOT NULL SELECT LTRIM(RTRIM(codigo)) AS sku, imagen AS img FROM articulo WHERE imagen IS NOT NULL`
            : sqlAdapter.providerId === 'a3erp'
              ? `IF COL_LENGTH('ARTICULO', 'IMAGEN') IS NOT NULL SELECT LTRIM(RTRIM(CODART)) AS sku, IMAGEN AS img FROM ARTICULO WHERE IMAGEN IS NOT NULL ELSE IF COL_LENGTH('ARTICULO', 'FICHERO') IS NOT NULL SELECT LTRIM(RTRIM(CODART)) AS sku, FICHERO AS img FROM ARTICULO WHERE FICHERO IS NOT NULL`
              : `IF COL_LENGTH('SaleItem', 'ButtonImage') IS NOT NULL SELECT CAST(Id AS VARCHAR(50)) AS sku, ButtonImage AS img FROM SaleItem WHERE ButtonImage IS NOT NULL`;
        const imgRows = await (sqlAdapter as any).executeSqlQuery(opts, safeTsql);
        if (Array.isArray(imgRows)) {
          for (const r of imgRows) {
            const skuKey = String(r.sku || '').trim().toUpperCase();
            const imgVal = String(r.img || '').trim();
            if (skuKey && imgVal && !dbImgMap.has(skuKey)) {
              dbImgMap.set(skuKey, imgVal);
            }
          }
        }
      }
    } catch {
      // Ignorar silenciosamente si el motor no expone metadatos de imagen
    }
    const resolver = new UniversalErpImageResolver({
      providerId: sqlAdapter.providerId,
      databasePath: mdbPath || sqlAdapter.getDatabasePath(),
    });

    return catalog.map((item: any) => {
      const skuUpper = String(item.code || '').trim().toUpperCase();
      const rawDbImg = dbImgMap.get(skuUpper) || item.imagePath || '';
      const resolved = resolver.resolveProductImage({
        id: item.code,
        sku: item.code,
        name: item.name,
        regularPrice: item.price,
        stockQuantity: item.stock,
        manageStock: true,
        inStock: item.stock > 0,
        status: 'published',
        barcode: item.barcode,
        images: rawDbImg ? [{ url: rawDbImg }] : [],
        attributes: rawDbImg ? { imgart: rawDbImg } : {},
      });
      if (resolved.exists && resolved.relativeWebPath) {
        return { ...item, imagePath: resolved.relativeWebPath };
      }
      if (rawDbImg) {
        return { ...item, imagePath: rawDbImg };
      }
      return item;
    });
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

    // 2a. En Ágora POS: intentar inyección en tiempo real vía API HTTP de Integración (:8984 con Api-Token)
    if (sqlAdapter.providerId === 'agora') {
      const agoraApiRes = await tryPushOrderToAgoraHttpApi(opts, order, serieStr, String(warehouse || '1'));
      if (agoraApiRes && agoraApiRes.success) {
        const mdbPath = resolveLocalMdbPath(sqlAdapter, opts);
        if (mdbPath) {
          await createOrderInLocalMdb(sqlAdapter.providerId, mdbPath, order, serieStr, String(warehouse || '1')).catch(() => {});
        }
        return agoraApiRes;
      }
    }

    // 2b. En Wolters Kluwer a3ERP: intentar primero puente COM oficial a3ERPActiveX.Pedido si está instalado en Windows
    if (sqlAdapter.providerId === 'a3erp') {
      const activeXRes = await tryCreateOrderViaA3ErpActiveX(order, serieStr, String(warehouse || 'GEN'));
      if (activeXRes && activeXRes.success) {
        return activeXRes;
      }
    }

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

/**
 * Extiende SimplyGestAdapter (sin modificar el módulo congelado apps/agent/src/erp)
 * para soportar nativamente:
 *  1) Tablas físicas DBISAM (.dat: articulos.dat, clientes.dat, pedidosc.dat, pedidosl.dat)
 *  2) SimplyGest Server REST API (http(s)://IP:56985 o sgapi:// con APIKey)
 *  3) Propagación de imagePath en getArticlesForCatalog() para UniversalErpImageResolver
 */
export function enhanceSimplyGestAdapter(adapter: SimplyGestAdapter, logger: Logger): void {
  const isApiUrl = (p?: string) => Boolean(p && (/^https?:\/\//i.test(p.trim()) || /^sgapi:\/\//i.test(p.trim())));
  const isAccessiblePathOrUrl = (p?: string) => Boolean(p && (isApiUrl(p) || fs.existsSync(p)));

  const resolveApiKey = (): string | undefined => {
    const cfg = (adapter as any).configManager?.get?.() || {};
    return (
      cfg.simplygest?.apiKey ||
      cfg.softwareErp?.simplygest?.apiKey ||
      cfg.softwareErp?.simplygest?.password
    );
  };

  const origIsAcc = adapter.isDatabaseAccessible.bind(adapter);
  adapter.isDatabaseAccessible = (): boolean => {
    if ((adapter as any).isEvaluationMode?.()) return true;
    const p = adapter.getDatabasePath();
    if (isApiUrl(p)) return true;
    return origIsAcc();
  };

  const origGetStockMap = adapter.getStockMap.bind(adapter);
  adapter.getStockMap = async (warehouseCode?: string): Promise<Map<string, number>> => {
    if ((adapter as any).isEvaluationMode?.()) {
      return origGetStockMap(warehouseCode);
    }
    const dbPath = adapter.getDatabasePath();
    if (!isAccessiblePathOrUrl(dbPath)) return new Map();

    const sgService = (adapter as any).simplygestService;
    let localConnector: SimplyGestConnector | null = sgService?.getConnector?.() || null;
    let shouldDisconnect = false;
    if (!localConnector) {
      localConnector = new SimplyGestConnector();
      await localConnector.connect({
        configuration: {
          databasePath: dbPath!,
          apiKey: resolveApiKey(),
        },
      });
      shouldDisconnect = true;
    }

    try {
      const stockList = await localConnector.readStock({ warehouse: warehouseCode });
      const map = new Map<string, number>();
      for (const item of stockList) {
        const sku = (item.sku || '').trim().toUpperCase();
        if (sku) map.set(sku, Math.max(0, Math.round(Number(item.quantity) || 0)));
      }
      return map;
    } catch (err) {
      logger.warn(`Fallo al obtener mapa de existencias de SimplyGest: ${String(err)}`);
      return new Map();
    } finally {
      if (shouldDisconnect && localConnector) await localConnector.disconnect().catch(() => {});
    }
  };

  const origCreateOrder = adapter.createOrder.bind(adapter);
  adapter.createOrder = async (
    order: CanonicalOrder,
    series?: string,
    warehouse?: string
  ): Promise<ErpOrderResult> => {
    if ((adapter as any).isEvaluationMode?.()) {
      return origCreateOrder(order, series, warehouse);
    }
    const dbPath = adapter.getDatabasePath();
    if (!isAccessiblePathOrUrl(dbPath)) {
      return { success: false, error: 'Base de datos o servidor de SimplyGest no configurado o inaccesible.' };
    }

    const sgService = (adapter as any).simplygestService;
    let localConnector: SimplyGestConnector | null = sgService?.getConnector?.() || null;
    let shouldDisconnect = false;
    if (!localConnector) {
      localConnector = new SimplyGestConnector();
      await localConnector.connect({
        configuration: {
          databasePath: dbPath!,
          apiKey: resolveApiKey(),
        },
      });
      shouldDisconnect = true;
    }

    try {
      if (series && order) order.series = series;
      if (warehouse && order) order.warehouse = warehouse;
      const res = await localConnector.createOrder(order);
      return {
        success: res.success,
        orderNumber: res.externalId || res.orderNumber,
        externalId: res.externalId,
        error: res.error,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Error al insertar pedido en SimplyGest:', err);
      return { success: false, error: msg };
    } finally {
      if (shouldDisconnect && localConnector) await localConnector.disconnect().catch(() => {});
    }
  };

  const origGetArticlesForCatalog = adapter.getArticlesForCatalog.bind(adapter);
  adapter.getArticlesForCatalog = async (limit?: number): Promise<ErpCatalogArticle[]> => {
    if ((adapter as any).isEvaluationMode?.()) {
      return origGetArticlesForCatalog(limit);
    }
    const dbPath = adapter.getDatabasePath();
    if (!isAccessiblePathOrUrl(dbPath)) return [];

    const sgService = (adapter as any).simplygestService;
    let localConnector: SimplyGestConnector | null = sgService?.getConnector?.() || null;
    let shouldDisconnect = false;
    if (!localConnector) {
      localConnector = new SimplyGestConnector();
      await localConnector.connect({
        configuration: {
          databasePath: dbPath!,
          apiKey: resolveApiKey(),
        },
      });
      shouldDisconnect = true;
    }

    try {
      const products = await localConnector.readProducts({ limit });
      return products.map((p) => ({
        code: p.sku,
        name: p.name,
        family: p.categories?.[0]?.name,
        stock: p.stockQuantity ?? 0,
        price: p.regularPrice ?? 0,
        costPrice: p.costPrice,
        barcode: p.barcode,
        description: p.description,
        imagePath: p.images?.[0],
        raw: p,
      }));
    } finally {
      if (shouldDisconnect && localConnector) await localConnector.disconnect().catch(() => {});
    }
  };
}
