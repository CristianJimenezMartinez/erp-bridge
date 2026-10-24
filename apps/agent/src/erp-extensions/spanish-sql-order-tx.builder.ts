import { CanonicalOrder } from '@erp-bridge/shared';

export function sanitizeSqlLiteral(val: unknown, maxLen = 150): string {
  if (val === null || val === undefined) return '';
  let clean = String(val).replace(/[\x00-\x1f\x7f]/g, '').trim();
  if (maxLen > 0 && clean.length > maxLen) {
    clean = clean.substring(0, maxLen);
  }
  return clean.replace(/'/g, "''");
}

/**
 * Construye bloques T-SQL transaccionales atómicos (BEGIN TRAN ... COMMIT TRAN)
 * con idempotencia, correlativo MAX+1 con bloqueo UPDLOCK, inserción de cabecera,
 * inserción de todas las líneas del pedido y actualización de stock disponible
 * para Sage 200, ICG Manager, Visionwin, Aplifisa y Business Central / Navision.
 */
export function buildExtendedSpanishSqlOrderBatch(
  providerId: string,
  order: CanonicalOrder,
  series: string,
  warehouse: string
): { tsql: string; fallbackOrderNum: number } {
  const safeSerie = sanitizeSqlLiteral(series || 'A', 10);
  const safeWh = sanitizeSqlLiteral(warehouse || 'GEN', 15);
  const safeName = sanitizeSqlLiteral(order.customer?.fiscalName || 'Cliente Web', 80);
  const safeRef = sanitizeSqlLiteral(
    order.reference || order.notes || `WC-${order.orderNumber || order.id || ''}`,
    150
  );
  const total = Number(order.totalAmount || 0).toFixed(2);
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const fallbackOrderNum = Math.floor(Date.now() / 1000) % 1000000;

  if (providerId === 'sage200') {
    const lineSql = lines
      .map((l, idx) => {
        const orden = (Number(l.position) || idx + 1) * 10;
        const sku = sanitizeSqlLiteral(l.sku, 30);
        const desc = sanitizeSqlLiteral(l.name || sku, 120);
        const qty = Number(l.quantity) || 1;
        const price = Number(l.unitPrice || 0).toFixed(4);
        const imp = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
        return `
      INSERT INTO LineasPedidoCliente (CodigoEmpresa, Ejercicio, SeriePedido, NumeroPedido, Orden, CodigoArticulo, DescripcionArticulo, CodigoAlmacen, UnidadesPedidas, Precio, ImporteLiquido)
      VALUES (@CodEmp, YEAR(GETDATE()), '${safeSerie}', @AssignedNum, ${orden}, '${sku}', '${desc}', '${safeWh}', ${qty}, ${price}, ${imp});
      IF OBJECT_ID('AcumuladosStock', 'U') IS NOT NULL
        UPDATE AcumuladosStock SET UnidadesReservadas = ISNULL(UnidadesReservadas, 0) + ${qty}
        WHERE CodigoEmpresa = @CodEmp AND LTRIM(RTRIM(CodigoArticulo)) = '${sku}' AND Periodo = 99;`;
      })
      .join('\n');

    const tsql = `
SET NOCOUNT ON;
DECLARE @CodEmp SMALLINT = 1;
DECLARE @AssignedNum INT = NULL;
BEGIN TRY
  BEGIN TRAN;
  IF OBJECT_ID('Articulos', 'U') IS NOT NULL
    SELECT TOP 1 @CodEmp = ISNULL(CodigoEmpresa, 1) FROM Articulos GROUP BY CodigoEmpresa ORDER BY COUNT(*) DESC;
  SELECT TOP 1 @AssignedNum = NumeroPedido FROM CabeceraPedidoCliente WITH (UPDLOCK, HOLDLOCK)
    WHERE CodigoEmpresa = @CodEmp AND Observaciones = '${safeRef}' AND '${safeRef}' <> '';
  IF @AssignedNum IS NULL
  BEGIN
    SELECT @AssignedNum = ISNULL(MAX(NumeroPedido), 1000) + 1 FROM CabeceraPedidoCliente WITH (UPDLOCK, HOLDLOCK)
      WHERE CodigoEmpresa = @CodEmp AND SeriePedido = '${safeSerie}';
    INSERT INTO CabeceraPedidoCliente (CodigoEmpresa, Ejercicio, SeriePedido, NumeroPedido, FechaPedido, RazonSocial, ImporteLiquido, Observaciones)
    VALUES (@CodEmp, YEAR(GETDATE()), '${safeSerie}', @AssignedNum, GETDATE(), '${safeName}', ${total}, '${safeRef}');
    ${lineSql}
  END
  COMMIT TRAN;
  SELECT @AssignedNum AS orderNumber;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH`.trim();
    return { tsql, fallbackOrderNum };
  }

  if (providerId === 'icg') {
    const lineSql = lines
      .map((l, idx) => {
        const numLin = Number(l.position) || idx + 1;
        const rawSku = sanitizeSqlLiteral(l.sku, 40);
        const parts = rawSku.split('-');
        const codArt = parts[0] || rawSku;
        const talla = parts[1] || '.';
        const color = parts[2] || '.';
        const desc = sanitizeSqlLiteral(l.name || rawSku, 120);
        const qty = Number(l.quantity) || 1;
        const price = Number(l.unitPrice || 0).toFixed(4);
        const imp = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
        return `
      INSERT INTO PEDVENTALIN (NUMSERIE, NUMPEDIDO, N, NUMLIN, CODARTICULO, TALLA, COLOR, DESCRIPCION, UNIDADESTOTAL, PRECIO, TOTAL, CODALMACEN)
      VALUES ('${safeSerie}', @AssignedNum, 'B', ${numLin}, '${codArt}', '${talla}', '${color}', '${desc}', ${qty}, ${price}, ${imp}, '${safeWh === 'GEN' ? '01' : safeWh}');
      IF OBJECT_ID('STOCKS', 'U') IS NOT NULL
        UPDATE STOCKS SET ASIGNADO = ISNULL(ASIGNADO, 0) + ${qty}
        WHERE CAST(CODARTICULO AS VARCHAR(30)) = '${codArt}' AND ('${talla}' = '.' OR LTRIM(RTRIM(TALLA)) = '${talla}');`;
      })
      .join('\n');

    const tsql = `
SET NOCOUNT ON;
DECLARE @AssignedNum INT = NULL;
BEGIN TRY
  BEGIN TRAN;
  SELECT TOP 1 @AssignedNum = NUMPEDIDO FROM PEDVENTACAB WITH (UPDLOCK, HOLDLOCK)
    WHERE OBSERVACIONES = '${safeRef}' AND '${safeRef}' <> '';
  IF @AssignedNum IS NULL
  BEGIN
    SELECT @AssignedNum = ISNULL(MAX(NUMPEDIDO), 1000) + 1 FROM PEDVENTACAB WITH (UPDLOCK, HOLDLOCK) WHERE NUMSERIE = '${safeSerie}';
    INSERT INTO PEDVENTACAB (NUMSERIE, NUMPEDIDO, N, FECHAPEDIDO, CODCLIENTE, TOTNETO, TOTBRUTO, OBSERVACIONES)
    VALUES ('${safeSerie}', @AssignedNum, 'B', GETDATE(), 1, ${total}, ${total}, '${safeRef}');
    ${lineSql}
  END
  COMMIT TRAN;
  SELECT @AssignedNum AS orderNumber;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH`.trim();
    return { tsql, fallbackOrderNum };
  }

  if (providerId === 'visionwin') {
    const lineSql = lines
      .map((l, idx) => {
        const numLin = Number(l.position) || idx + 1;
        const sku = sanitizeSqlLiteral(l.sku, 30);
        const desc = sanitizeSqlLiteral(l.name || sku, 120);
        const qty = Number(l.quantity) || 1;
        const price = Number(l.unitPrice || 0).toFixed(4);
        const imp = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
        return `
      INSERT INTO LINEAS_PEDIDOS_CLI (SERIE, NUMERO, LINEA, ARTICULO, DESCRIPCION, CANTIDAD, PRECIO, TOTAL, ALMACEN)
      VALUES ('${safeSerie}', @AssignedNum, ${numLin}, '${sku}', '${desc}', ${qty}, ${price}, ${imp}, '${safeWh === 'GEN' ? '1' : safeWh}');
      IF OBJECT_ID('STOCK_ALMACEN', 'U') IS NOT NULL
        UPDATE STOCK_ALMACEN SET RESERVADO = ISNULL(RESERVADO, 0) + ${qty} WHERE LTRIM(RTRIM(ARTICULO)) = '${sku}';`;
      })
      .join('\n');

    const tsql = `
SET NOCOUNT ON;
DECLARE @AssignedNum INT = NULL;
BEGIN TRY
  BEGIN TRAN;
  SELECT TOP 1 @AssignedNum = NUMERO FROM PEDIDOS_CLI WITH (UPDLOCK, HOLDLOCK)
    WHERE OBSERVACIONES = '${safeRef}' AND '${safeRef}' <> '';
  IF @AssignedNum IS NULL
  BEGIN
    SELECT @AssignedNum = ISNULL(MAX(NUMERO), 1000) + 1 FROM PEDIDOS_CLI WITH (UPDLOCK, HOLDLOCK) WHERE SERIE = '${safeSerie}';
    INSERT INTO PEDIDOS_CLI (SERIE, NUMERO, FECHA, NOMBRE_CLIENTE, TOTAL_PEDIDO, OBSERVACIONES)
    VALUES ('${safeSerie}', @AssignedNum, GETDATE(), '${safeName}', ${total}, '${safeRef}');
    ${lineSql}
  END
  COMMIT TRAN;
  SELECT @AssignedNum AS orderNumber;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH`.trim();
    return { tsql, fallbackOrderNum };
  }

  if (providerId === 'aplifisa') {
    const lineSql = lines
      .map((l, idx) => {
        const numLin = Number(l.position) || idx + 1;
        const sku = sanitizeSqlLiteral(l.sku, 30);
        const desc = sanitizeSqlLiteral(l.name || sku, 120);
        const qty = Number(l.quantity) || 1;
        const price = Number(l.unitPrice || 0).toFixed(4);
        const imp = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
        return `
      INSERT INTO PEDIDOSCLI_LIN (SERIE, NUMERO, LINEA, CODART, DESCRIPCION, UNIDADES, PRECIO, IMPORTE, CODALM)
      VALUES ('${safeSerie}', @AssignedNum, ${numLin}, '${sku}', '${desc}', ${qty}, ${price}, ${imp}, '${safeWh === 'GEN' ? '01' : safeWh}');
      IF OBJECT_ID('EXISTENCIAS', 'U') IS NOT NULL
        UPDATE EXISTENCIAS SET RESERVADO = ISNULL(RESERVADO, 0) + ${qty} WHERE LTRIM(RTRIM(CODART)) = '${sku}';`;
      })
      .join('\n');

    const tsql = `
SET NOCOUNT ON;
DECLARE @AssignedNum INT = NULL;
BEGIN TRY
  BEGIN TRAN;
  SELECT TOP 1 @AssignedNum = NUMERO FROM PEDIDOSCLI_CAB WITH (UPDLOCK, HOLDLOCK)
    WHERE OBSERVACIONES = '${safeRef}' AND '${safeRef}' <> '';
  IF @AssignedNum IS NULL
  BEGIN
    SELECT @AssignedNum = ISNULL(MAX(NUMERO), 1000) + 1 FROM PEDIDOSCLI_CAB WITH (UPDLOCK, HOLDLOCK) WHERE SERIE = '${safeSerie}';
    INSERT INTO PEDIDOSCLI_CAB (SERIE, NUMERO, FECHA, NOMCLI, TOTAL, OBSERVACIONES)
    VALUES ('${safeSerie}', @AssignedNum, GETDATE(), '${safeName}', ${total}, '${safeRef}');
    ${lineSql}
  END
  COMMIT TRAN;
  SELECT @AssignedNum AS orderNumber;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH`.trim();
    return { tsql, fallbackOrderNum };
  }

  // businesscentral (Dynamics NAV / Business Central On-Premises SQL Server)
  const bcLines = lines
    .map((l, idx) => {
      const lineNo = (Number(l.position) || idx + 1) * 10000;
      const sku = sanitizeSqlLiteral(l.sku, 20);
      const desc = sanitizeSqlLiteral(l.name || sku, 100);
      const qty = Number(l.quantity) || 1;
      const price = Number(l.unitPrice || 0).toFixed(4);
      const imp = Number(l.total ?? qty * Number(l.unitPrice || 0)).toFixed(2);
      return `INSERT INTO [CRONUS$Sales Line] ([Document Type], [Document No_], [Line No_], [Type], [No_], [Description], [Location Code], [Quantity], [Unit Price], [Amount]) VALUES (1, @DocNo, ${lineNo}, 2, '${sku}', '${desc}', '${safeWh === 'GEN' ? 'PRINCIPAL' : safeWh}', ${qty}, ${price}, ${imp});`;
    })
    .join('\n    ');

  const tsql = `
SET NOCOUNT ON;
DECLARE @AssignedNum INT = ${fallbackOrderNum};
DECLARE @DocNo VARCHAR(20) = '${safeSerie}-' + CAST(@AssignedNum AS VARCHAR(15));
BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS (SELECT 1 FROM [CRONUS$Sales Header] WITH (UPDLOCK, HOLDLOCK) WHERE [External Document No_] = '${safeRef}' AND '${safeRef}' <> '')
  BEGIN
    INSERT INTO [CRONUS$Sales Header] ([Document Type], [No_], [Sell-to Customer Name], [Order Date], [Posting Date], [External Document No_])
    VALUES (1, @DocNo, '${safeName}', GETDATE(), GETDATE(), '${safeRef}');
    ${bcLines}
  END
  COMMIT TRAN;
  SELECT @AssignedNum AS orderNumber;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH`.trim();

  return { tsql, fallbackOrderNum };
}
