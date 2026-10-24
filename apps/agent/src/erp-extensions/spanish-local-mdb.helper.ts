import { AccessDriver } from '@erp-bridge/connector-factusol';
import { CanonicalOrder } from '@erp-bridge/shared';
import { ErpOrderResult, SqlServerBaseAdapter, SqlServerConnectionOptions } from '../erp';
import { resolveLocalMdbPath } from '../services/sql-erp-enhancer.service';
import { buildExtendedSpanishSqlOrderBatch, sanitizeSqlLiteral } from './spanish-sql-order-tx.builder';

/**
 * Traduce consultas T-SQL de Sage 200, ICG, Visionwin, Aplifisa y Business Central
 * a dialecto Microsoft Access Jet/ACE SQL cuando el cliente opera sobre archivos .mdb/.accdb.
 */
export function translateExtendedTsqlToJetSql(providerId: string, sqlQuery: string): string {
  const q = sqlQuery.trim();

  if (providerId === 'visionwin' && /FROM\s+ARTICULOS\s+A/i.test(q)) {
    const topMatch = q.match(/SELECT\s+TOP\s+(\d+)/i);
    const topClause = topMatch ? `TOP ${topMatch[1]} ` : '';
    const priceAlias = /AS\s+salePrice/i.test(q) ? 'salePrice' : 'price';
    const nameAlias = /AS\s+salePrice/i.test(q) ? 'description' : 'name';
    const eanAlias = /AS\s+salePrice/i.test(q) ? 'ean' : 'barcode';
    return `SELECT ${topClause}Trim(A.CODIGO) AS code, Trim(A.DESCRIPCION) AS ${nameAlias}, IIF(A.FAMILIA IS NULL, 'GEN', Trim(A.FAMILIA)) AS family, IIF(S.ACTUAL IS NULL, 0, S.ACTUAL - IIF(S.RESERVADO IS NULL, 0, S.RESERVADO)) AS stock, IIF(A.PVP1 IS NULL, 0, A.PVP1) AS ${priceAlias}, IIF(A.COSTE IS NULL, 0, A.COSTE) AS costPrice, IIF(A.CODBARRAS IS NULL, '', Trim(A.CODBARRAS)) AS ${eanAlias}, Trim(A.DESCRIPCION) AS description FROM ARTICULOS AS A LEFT JOIN STOCK_ALMACEN AS S ON (S.ARTICULO = A.CODIGO AND S.ALMACEN = '1') WHERE A.BAJA = 0 ORDER BY A.CODIGO ASC`;
  }

  if (providerId === 'aplifisa' && /FROM\s+ARTICULOS\s+A/i.test(q)) {
    const topMatch = q.match(/SELECT\s+TOP\s+(\d+)/i);
    const topClause = topMatch ? `TOP ${topMatch[1]} ` : '';
    const priceAlias = /AS\s+salePrice/i.test(q) ? 'salePrice' : 'price';
    const nameAlias = /AS\s+salePrice/i.test(q) ? 'description' : 'name';
    const eanAlias = /AS\s+salePrice/i.test(q) ? 'ean' : 'barcode';
    return `SELECT ${topClause}Trim(A.CODART) AS code, Trim(A.DESCRIPCION) AS ${nameAlias}, IIF(A.CODFAM IS NULL, 'GEN', Trim(A.CODFAM)) AS family, IIF(E.STOCK IS NULL, 0, E.STOCK - IIF(E.RESERVADO IS NULL, 0, E.RESERVADO)) AS stock, IIF(A.PVP1 IS NULL, 0, A.PVP1) AS ${priceAlias}, IIF(A.ULTCOSTE IS NULL, 0, A.ULTCOSTE) AS costPrice, IIF(A.CODBARRAS IS NULL, '', Trim(A.CODBARRAS)) AS ${eanAlias}, Trim(A.DESCRIPCION) AS description FROM ARTICULOS AS A LEFT JOIN EXISTENCIAS AS E ON (E.CODART = A.CODART AND E.CODALM = '01') WHERE A.BAJA = 0 ORDER BY A.CODART ASC`;
  }

  return q
    .replace(/\s+WITH\s*\(\s*NOLOCK\s*\)/gi, '')
    .replace(/COUNT\s*\(\s*1\s*\)/gi, 'COUNT(*)')
    .replace(/GETDATE\s*\(\s*\)/gi, 'Now()')
    .replace(/ISNULL\s*\(([^,]+),([^)]+)\)/gi, 'IIF($1 IS NULL, $2, $1)')
    .replace(/LTRIM\s*\(\s*RTRIM\s*\(([^)]+)\)\s*\)/gi, 'Trim($1)');
}

/**
 * Ejecuta inserción atómica de pedido (cabecera + líneas + actualización de stock)
 * sobre una base de datos física .mdb/.accdb para Visionwin, Aplifisa, Sage 200 o ICG.
 */
export async function createOrderInExtendedLocalMdb(
  providerId: string,
  mdbPath: string,
  order: CanonicalOrder,
  series: string,
  warehouse: string
): Promise<ErpOrderResult> {
  const driver = new AccessDriver({ databasePath: mdbPath });
  const safeSerie = sanitizeSqlLiteral(series || 'A', 10);
  const safeWh = sanitizeSqlLiteral(warehouse || '1', 10);
  const safeName = sanitizeSqlLiteral(order.customer?.fiscalName || 'Cliente Web', 80);
  const safeRef = sanitizeSqlLiteral(
    order.reference || order.notes || `WC-${order.orderNumber || order.id || ''}`,
    150
  );
  const total = Number(order.totalAmount || 0).toFixed(2);
  const lines = Array.isArray(order.lines) ? order.lines : [];

  if (providerId === 'visionwin') {
    if (safeRef) {
      const existing = await driver.query<{ NUMERO: number }>(
        `SELECT TOP 1 NUMERO FROM PEDIDOS_CLI WHERE OBSERVACIONES = '${safeRef}'`
      );
      if (existing.length > 0 && existing[0]?.NUMERO !== undefined) {
        const num = Number(existing[0].NUMERO);
        return { success: true, orderNumber: num, externalId: num };
      }
    }
    const maxRows = await driver.query<{ maxnum: number }>(
      `SELECT MAX(NUMERO) AS maxnum FROM PEDIDOS_CLI WHERE SERIE = '${safeSerie}'`
    );
    const nextNum = (Number(maxRows[0]?.maxnum) || 1000) + 1;
    const stmts: string[] = [
      `INSERT INTO PEDIDOS_CLI (SERIE, NUMERO, FECHA, NOMBRE_CLIENTE, TOTAL_PEDIDO, OBSERVACIONES) VALUES ('${safeSerie}', ${nextNum}, Now(), '${safeName}', ${total}, '${safeRef}')`,
    ];
    lines.forEach((l, idx) => {
      const numLin = Number(l.position) || idx + 1;
      const sku = sanitizeSqlLiteral(l.sku, 30);
      const desc = sanitizeSqlLiteral(l.name || sku, 120);
      const qty = Number(l.quantity) || 1;
      const price = Number(l.unitPrice || 0).toFixed(4);
      const imp = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
      stmts.push(
        `INSERT INTO LINEAS_PEDIDOS_CLI (SERIE, NUMERO, LINEA, ARTICULO, DESCRIPCION, CANTIDAD, PRECIO, TOTAL, ALMACEN) VALUES ('${safeSerie}', ${nextNum}, ${numLin}, '${sku}', '${desc}', ${qty}, ${price}, ${imp}, '${safeWh}')`
      );
      stmts.push(
        `UPDATE STOCK_ALMACEN SET RESERVADO = IIF(RESERVADO IS NULL, 0, RESERVADO) + ${qty} WHERE Trim(ARTICULO) = '${sku}'`
      );
    });
    await driver.executeTransaction(stmts);
    return { success: true, orderNumber: nextNum, externalId: nextNum };
  }

  // Default / Aplifisa .mdb/.accdb
  if (safeRef) {
    const existing = await driver.query<{ NUMERO: number }>(
      `SELECT TOP 1 NUMERO FROM PEDIDOSCLI_CAB WHERE OBSERVACIONES = '${safeRef}'`
    );
    if (existing.length > 0 && existing[0]?.NUMERO !== undefined) {
      const num = Number(existing[0].NUMERO);
      return { success: true, orderNumber: num, externalId: num };
    }
  }
  const maxRows = await driver.query<{ maxnum: number }>(
    `SELECT MAX(NUMERO) AS maxnum FROM PEDIDOSCLI_CAB WHERE SERIE = '${safeSerie}'`
  );
  const nextNum = (Number(maxRows[0]?.maxnum) || 1000) + 1;
  const stmts: string[] = [
    `INSERT INTO PEDIDOSCLI_CAB (SERIE, NUMERO, FECHA, NOMCLI, TOTAL, OBSERVACIONES) VALUES ('${safeSerie}', ${nextNum}, Now(), '${safeName}', ${total}, '${safeRef}')`,
  ];
  lines.forEach((l, idx) => {
    const numLin = Number(l.position) || idx + 1;
    const sku = sanitizeSqlLiteral(l.sku, 30);
    const desc = sanitizeSqlLiteral(l.name || sku, 120);
    const qty = Number(l.quantity) || 1;
    const price = Number(l.unitPrice || 0).toFixed(4);
    const imp = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
    stmts.push(
      `INSERT INTO PEDIDOSCLI_LIN (SERIE, NUMERO, LINEA, CODART, DESCRIPCION, UNIDADES, PRECIO, IMPORTE, CODALM) VALUES ('${safeSerie}', ${nextNum}, ${numLin}, '${sku}', '${desc}', ${qty}, ${price}, ${imp}, '${safeWh === '1' ? '01' : safeWh}')`
    );
    stmts.push(
      `UPDATE EXISTENCIAS SET RESERVADO = IIF(RESERVADO IS NULL, 0, RESERVADO) + ${qty} WHERE Trim(CODART) = '${sku}'`
    );
  });
  await driver.executeTransaction(stmts);
  return { success: true, orderNumber: nextNum, externalId: nextNum };
}

/**
 * Potencia un adaptador SQL español extendido (sage200, icg, visionwin, aplifisa, businesscentral) con:
 * 1. Autodetección de prefijo real [Empresa$Item] en Business Central / Navision.
 * 2. Autodetección de CodigoEmpresa activo en Sage 200.
 * 3. Soporte transparente de bases de datos locales .mdb/.accdb vía OLEDB.
 * 4. Creación de pedidos con transacción T-SQL atómica completa (cabecera + líneas + reserva de stock).
 */
export function enhanceExtendedSpanishSqlAdapter(adapter: SqlServerBaseAdapter): void {
  const origExecuteSqlQuery = (adapter as any).executeSqlQuery.bind(adapter);
  const origCreateOrder = adapter.createOrder.bind(adapter);
  let cachedBcCompanyPrefix: string | null = null;
  let cachedSage200Company: number | null = null;

  (adapter as any).executeSqlQuery = async (opts: SqlServerConnectionOptions, sqlQuery: string): Promise<any[]> => {
    const mdbPath = resolveLocalMdbPath(adapter, opts);
    if (mdbPath) {
      const driver = new AccessDriver({ databasePath: mdbPath });
      const jetSql = translateExtendedTsqlToJetSql(adapter.providerId, sqlQuery);
      return driver.query(jetSql);
    }

    let finalQuery = sqlQuery;

    const providerStr = String(adapter.providerId);

    // En Business Central / Navision SQL On-Premises: resolver prefijo real [NombreEmpresa$Item]
    if (providerStr === 'businesscentral' && finalQuery.includes('[CRONUS$')) {
      if (!cachedBcCompanyPrefix) {
        try {
          const rows = await origExecuteSqlQuery(
            opts,
            "SELECT TOP 1 LEFT(name, LEN(name) - 5) AS prefix FROM sys.tables WHERE name LIKE '%$Item' ORDER BY CASE WHEN name LIKE 'CRONUS%' THEN 1 ELSE 0 END, name ASC"
          );
          if (rows && rows[0]?.prefix) {
            cachedBcCompanyPrefix = String(rows[0].prefix).replace(/\]/g, '');
          }
        } catch {}
      }
      if (cachedBcCompanyPrefix && cachedBcCompanyPrefix !== 'CRONUS') {
        finalQuery = finalQuery.replace(/\[CRONUS\$/g, `[${cachedBcCompanyPrefix}$`);
      }
    }

    // En Sage 200: si CodigoEmpresa = 1 no es la empresa principal, autodetectar CodigoEmpresa con más artículos
    if (providerStr === 'sage200' && finalQuery.includes('CodigoEmpresa = 1')) {
      if (cachedSage200Company === null) {
        try {
          const rows = await origExecuteSqlQuery(
            opts,
            'SELECT TOP 1 CodigoEmpresa AS emp FROM Articulos WHERE ISNULL(Obsoleto, 0) = 0 GROUP BY CodigoEmpresa ORDER BY COUNT(1) DESC'
          );
          if (rows && rows[0]?.emp !== undefined) {
            cachedSage200Company = Number(rows[0].emp) || 1;
          }
        } catch {
          cachedSage200Company = 1;
        }
      }
      if (cachedSage200Company && cachedSage200Company !== 1) {
        finalQuery = finalQuery.replace(/CodigoEmpresa\s*=\s*1/g, `CodigoEmpresa = ${cachedSage200Company}`);
      }
    }

    return origExecuteSqlQuery(opts, finalQuery);
  };

  (adapter as any).createOrder = async (
    order: CanonicalOrder,
    series?: string,
    warehouse = 'GEN'
  ): Promise<ErpOrderResult> => {
    const serieStr = String(series || adapter.getProviderSettings().orderSeries || 'A');
    const srv = String(adapter.getProviderSettings().serverInstance || '').trim();
    if (adapter.isEvaluationMode() || /^https?:\/\//i.test(srv)) {
      return origCreateOrder(order, serieStr, warehouse);
    }

    const opts: SqlServerConnectionOptions = (adapter as any).resolveConnectionOptions();
    const mdbPath = resolveLocalMdbPath(adapter, opts);
    if (mdbPath) {
      try {
        return await createOrderInExtendedLocalMdb(adapter.providerId, mdbPath, order, serieStr, warehouse);
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    try {
      const { tsql, fallbackOrderNum } = buildExtendedSpanishSqlOrderBatch(
        adapter.providerId,
        order,
        serieStr,
        warehouse
      );
      const rows = await (adapter as any).executeSqlQuery(opts, tsql);
      const assigned = rows && rows[0]?.orderNumber ? Number(rows[0].orderNumber) : fallbackOrderNum;
      return { success: true, orderNumber: assigned, externalId: `${serieStr}-${assigned}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  };
}
