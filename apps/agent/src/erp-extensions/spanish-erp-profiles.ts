import { ErpCatalogArticle, SupportedErpProviderId } from '../erp/erp.types';
import { SqlServerErpProfile } from '../erp/sql-server-profiles';

export type ExtendedErpProviderId =
  | SupportedErpProviderId
  | 'sage200'
  | 'icg'
  | 'visionwin'
  | 'aplifisa'
  | 'odoo'
  | 'facturascripts'
  | 'businesscentral';

function sanitizeTop(top: number): number {
  const n = Math.floor(Number(top));
  if (!Number.isFinite(n) || n <= 0) return 25;
  return Math.min(n, 10000);
}

function sanitizeWarehouseCode(warehouseCode: string): string {
  return String(warehouseCode || 'GEN')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/'/g, "''")
    .trim()
    .substring(0, 20);
}

export const EXTENDED_DEMO_ARTICLES_BY_ERP: Record<
  'sage200' | 'icg' | 'visionwin' | 'aplifisa' | 'odoo' | 'facturascripts' | 'businesscentral',
  ErpCatalogArticle[]
> = {
  sage200: [
    { code: 'S200-6001', name: 'Compresor Tornillo Industrial 15HP 10bar', family: 'NEUMATICA', stock: 5, price: 3450.0, costPrice: 2390.0, barcode: '8435600600013', description: 'Compresor rotativo silencioso secador integrado' },
    { code: 'S200-6002', name: 'Polipasto Eléctrico Cadena 2000kg 6m', family: 'ELEVACION', stock: 9, price: 890.0, costPrice: 580.0, barcode: '8435600600020', description: 'Doble velocidad con mando botonera IP65' },
    { code: 'S200-6003', name: 'Enrollador Manguera Aire Comprimido 15m 3/8"', family: 'TALLER', stock: 34, price: 118.0, costPrice: 69.0, barcode: '8435600600037', description: 'Carcasa acero lacado retorno automático' },
  ],
  icg: [
    { code: 'ICG-7001', name: 'Cafetera Espresso Profesional 2 Grupos Inox', family: 'HOSTELERIA', stock: 4, price: 1890.0, costPrice: 1250.0, barcode: '8435700700010', description: 'Caldera cobre 11.5L dosificación electrónica' },
    { code: 'ICG-7002', name: 'Vitrina Expositora Refrigerada Sobremostrador', family: 'FRIO', stock: 7, price: 640.0, costPrice: 410.0, barcode: '8435700700027', description: 'Cristal curvo iluminación LED 120L' },
    { code: 'ICG-7003', name: 'Cortadora Fiambre Industrial Transmisión Engranaje 300mm', family: 'MAQUINARIA', stock: 12, price: 520.0, costPrice: 335.0, barcode: '8435700700034', description: 'Aleación aluminio anodizado afilador incorporado' },
  ],
  visionwin: [
    { code: 'VW-8001', name: 'Cerradura Seguridad Multipunto Antibumping', family: 'CERRAJERIA', stock: 22, price: 135.0, costPrice: 82.0, barcode: '8435800800017', description: 'Bombillo alta seguridad 5 llaves incopiables' },
    { code: 'VW-8002', name: 'Escalera Telescópica Aluminio Profesional 4x4', family: 'FERRETERIA', stock: 14, price: 149.0, costPrice: 91.0, barcode: '8435800800024', description: 'Articulada multiposición norma EN131' },
    { code: 'VW-8003', name: 'Juego Llaves Vaso Carraca Cromo-Vanadio 108pzs', family: 'HERRAMIENTA', stock: 41, price: 74.5, costPrice: 42.0, barcode: '8435800800031', description: 'Maletín reforzado vasos 1/2 y 1/4' },
  ],
  aplifisa: [
    { code: 'APL-9001', name: 'Caldera Condensación Estanca 28kW Bajo NOx', family: 'CLIMATIZACION', stock: 8, price: 1120.0, costPrice: 785.0, barcode: '8435900900014', description: 'Clase energética A+ modulante' },
    { code: 'APL-9002', name: 'Termostato Inteligente Modulante WiFi', family: 'CONTROL', stock: 31, price: 96.0, costPrice: 54.0, barcode: '8435900900021', description: 'Control por app móvil y programación semanal' },
    { code: 'APL-9003', name: 'Grupo Presión Agua Doméstico 1.5CV Prescontrol', family: 'FONTANERIA', stock: 11, price: 245.0, costPrice: 152.0, barcode: '8435900900038', description: 'Impulsor acero inoxidable silencioso' },
  ],
  odoo: [
    { code: 'ODO-1101', name: 'Transpaleta Eléctrica Litio 1500kg 24V', family: 'LOGISTICA', stock: 6, price: 1290.0, costPrice: 870.0, barcode: '8435110100011', description: 'Batería extraíble carga rápida almacén' },
    { code: 'ODO-1102', name: 'Estantería Carga Paletizada Módulo Inicial 3000kg', family: 'ALMACENAJE', stock: 19, price: 380.0, costPrice: 235.0, barcode: '8435110100028', description: 'Bastidores galvanizados y largueros naranjas' },
    { code: 'ODO-1103', name: 'Enfajadora Palets Semiautomática Plato Giratorio', family: 'EMBALAJE', stock: 3, price: 2450.0, costPrice: 1690.0, barcode: '8435110100035', description: 'Freno electromagnético lectura fotocélula' },
  ],
  facturascripts: [
    { code: 'FSC-1201', name: 'SAI / UPS Online Doble Conversión 3000VA Rack', family: 'ELECTRONICA', stock: 10, price: 680.0, costPrice: 445.0, barcode: '8435120200018', description: 'Onda senoidal pura factor potencia 0.9' },
    { code: 'FSC-1202', name: 'Switch Gestionable PoE+ 24 Puertos Gigabit + 4 SFP', family: 'REDES', stock: 16, price: 295.0, costPrice: 185.0, barcode: '8435120200025', description: 'Chasis metálico rack 19" 370W PoE' },
    { code: 'FSC-1203', name: 'Armario Rack Mural 19" 12U Puerta Cristal', family: 'RACKS', stock: 12, price: 148.0, costPrice: 89.0, barcode: '8435120200032', description: 'Fondo 600mm paneles laterales desmontables' },
  ],
  businesscentral: [
    { code: 'BC-1301', name: 'Centro Mecanizado Taladrado Columna Industrial', family: 'INDUSTRIAL', stock: 4, price: 1980.0, costPrice: 1340.0, barcode: '8435130300015', description: 'Transmisión por engranajes avance automático' },
    { code: 'BC-1302', name: 'Soldadora Inverter MIG/MAG Sinérgica 250A Trifásica', family: 'SOLDADURA', stock: 9, price: 790.0, costPrice: 510.0, barcode: '8435130300022', description: 'Antorcha euroconector carro portabotellas' },
    { code: 'BC-1303', name: 'Mesa Trabajo Industrial Bancada Acero 2000x800mm', family: 'MOBILIARIO', stock: 15, price: 425.0, costPrice: 265.0, barcode: '8435130300039', description: 'Encimera haya maciza 40mm cajonera cierre' },
  ],
};

export const EXTENDED_SQL_PROFILES: Record<
  'sage200' | 'icg' | 'visionwin' | 'aplifisa' | 'odoo' | 'facturascripts' | 'businesscentral',
  SqlServerErpProfile
> = {
  sage200: {
    providerId: 'sage200' as SupportedErpProviderId,
    displayName: 'Sage 200 (Sage Murano)',
    defaultInstances: ['.\\SAGE200', '.\\SQLEXPRESS', 'localhost:1433'],
    defaultDatabase: 'SAGE200',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Tarifa General Venta (PrecioVenta)' },
        { code: '2', name: '2: Tarifa E-Commerce / B2B' },
        { code: '3', name: '3: Tarifa Distribuidor Mayorista' },
      ],
      warehouses: [
        { code: 'ALM', name: 'ALM: Almacén General Central' },
        { code: 'WEB', name: 'WEB: Almacén Logístico Online' },
      ],
      series: ['A', '1', 'W'],
    },
    queries: {
      countArticles: 'SELECT COUNT(1) AS total FROM Articulos WITH (NOLOCK) WHERE ISNULL(Obsoleto, 0) = 0',
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(A.CodigoArticulo)) AS code, LTRIM(RTRIM(A.DescripcionArticulo)) AS description, LTRIM(RTRIM(A.CodigoFamilia)) AS family, ISNULL(S.UnidadesSaldo - S.UnidadesReservadas, 0) AS stock, ISNULL(A.PrecioVenta, 0) AS salePrice, ISNULL(A.PrecioCompra, 0) AS costPrice, LTRIM(RTRIM(A.CodigoAlternativo)) AS ean FROM Articulos A WITH (NOLOCK) LEFT JOIN AcumuladosStock S WITH (NOLOCK) ON S.CodigoEmpresa = A.CodigoEmpresa AND S.CodigoArticulo = A.CodigoArticulo AND S.Periodo = 99 WHERE ISNULL(A.Obsoleto, 0) = 0 ORDER BY A.CodigoArticulo ASC`,
      readStock: (warehouseCode: string) => {
        const safeWh = sanitizeWarehouseCode(warehouseCode);
        return `SELECT LTRIM(RTRIM(CodigoArticulo)) AS sku, SUM(ISNULL(UnidadesSaldo - UnidadesReservadas, 0)) AS stock FROM AcumuladosStock WITH (NOLOCK) WHERE (LTRIM(RTRIM(CodigoAlmacen)) = '${safeWh}' OR '${safeWh}' = 'GEN' OR '${safeWh}' = 'ALM') AND Periodo = 99 GROUP BY CodigoArticulo`;
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(A.CodigoArticulo)) AS code, LTRIM(RTRIM(A.DescripcionArticulo)) AS name, LTRIM(RTRIM(A.CodigoFamilia)) AS family, ISNULL(S.UnidadesSaldo - S.UnidadesReservadas, 0) AS stock, ISNULL(A.PrecioVenta, 0) AS price, ISNULL(A.PrecioCompra, 0) AS costPrice, LTRIM(RTRIM(A.CodigoAlternativo)) AS barcode, LTRIM(RTRIM(A.DescripcionLinea)) AS description FROM Articulos A WITH (NOLOCK) LEFT JOIN AcumuladosStock S WITH (NOLOCK) ON S.CodigoEmpresa = A.CodigoEmpresa AND S.CodigoArticulo = A.CodigoArticulo AND S.Periodo = 99 WHERE ISNULL(A.Obsoleto, 0) = 0`,
      insertOrderHeader: 'INSERT INTO CabeceraPedidoCliente (CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, FechaPedido, CodigoCliente, RazonSocial, ImporteLiquido, ObservacionesPedido) VALUES (1, YEAR(GETDATE()), @serie, @number, GETDATE(), \'4300001\', @customerName, @total, @notes)',
      insertOrderLine: 'INSERT INTO LineasPedidoCliente (CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, Orden, CodigoArticulo, DescripcionArticulo, UnidadesPedidas, Precio, ImporteLiquido) VALUES (1, YEAR(GETDATE()), @serie, @number, @pos, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: EXTENDED_DEMO_ARTICLES_BY_ERP.sage200,
  },

  icg: {
    providerId: 'icg' as SupportedErpProviderId,
    displayName: 'ICG Manager / FrontRetail (HIOPOS)',
    defaultInstances: ['.\\ICG', '.\\SQLEXPRESS', 'localhost:1433'],
    defaultDatabase: 'ICGManager',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Tarifa PVP General (IDTARIFAV=1)' },
        { code: '2', name: '2: Tarifa Tienda Online (IDTARIFAV=2)' },
        { code: '3', name: '3: Tarifa Profesional (IDTARIFAV=3)' },
      ],
      warehouses: [
        { code: '1', name: '1: Almacén Central (CODALMACEN=1)' },
        { code: '2', name: '2: Tienda Principal (CODALMACEN=2)' },
      ],
      series: ['1', 'W', 'T'],
    },
    queries: {
      countArticles: "SELECT COUNT(1) AS total FROM ARTICULOS WITH (NOLOCK) WHERE ISNULL(DESCATALOGADO, 'F') = 'F'",
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} CAST(A.CODARTICULO AS VARCHAR(30)) AS code, LTRIM(RTRIM(A.DESCRIPCION)) AS description, CAST(A.FAMILIA AS VARCHAR(20)) AS family, ISNULL(S.STOCK - ISNULL(S.ASERVIR, 0), 0) AS stock, ISNULL(P.PNETO, 0) AS salePrice, ISNULL(A.ULTCOSTE, 0) AS costPrice, LTRIM(RTRIM(AL.CODBARRAS)) AS ean FROM ARTICULOS A WITH (NOLOCK) LEFT JOIN ARTICULOSLIN AL WITH (NOLOCK) ON AL.CODARTICULO = A.CODARTICULO LEFT JOIN PRECIOSVENTA P WITH (NOLOCK) ON P.CODARTICULO = A.CODARTICULO AND P.IDTARIFAV = 1 LEFT JOIN STOCKS S WITH (NOLOCK) ON S.CODARTICULO = A.CODARTICULO AND S.CODALMACEN = '1' WHERE ISNULL(A.DESCATALOGADO, 'F') = 'F' ORDER BY A.CODARTICULO ASC`,
      readStock: (warehouseCode: string) => {
        const safeWh = sanitizeWarehouseCode(warehouseCode);
        return `SELECT CAST(CODARTICULO AS VARCHAR(30)) AS sku, SUM(ISNULL(STOCK - ISNULL(ASERVIR, 0), 0)) AS stock FROM STOCKS WITH (NOLOCK) WHERE LTRIM(RTRIM(CODALMACEN)) = '${safeWh}' OR '${safeWh}' = 'GEN' GROUP BY CODARTICULO`;
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} CAST(A.CODARTICULO AS VARCHAR(30)) AS code, LTRIM(RTRIM(A.DESCRIPCION)) AS name, CAST(A.FAMILIA AS VARCHAR(20)) AS family, ISNULL(S.STOCK - ISNULL(S.ASERVIR, 0), 0) AS stock, ISNULL(P.PNETO, 0) AS price, ISNULL(A.ULTCOSTE, 0) AS costPrice, LTRIM(RTRIM(AL.CODBARRAS)) AS barcode, LTRIM(RTRIM(A.DESCRIPCION)) AS description FROM ARTICULOS A WITH (NOLOCK) LEFT JOIN ARTICULOSLIN AL WITH (NOLOCK) ON AL.CODARTICULO = A.CODARTICULO LEFT JOIN PRECIOSVENTA P WITH (NOLOCK) ON P.CODARTICULO = A.CODARTICULO AND P.IDTARIFAV = 1 LEFT JOIN STOCKS S WITH (NOLOCK) ON S.CODARTICULO = A.CODARTICULO AND S.CODALMACEN = '1' WHERE ISNULL(A.DESCATALOGADO, 'F') = 'F'`,
      insertOrderHeader: 'INSERT INTO PEDVENTACAB (NUMSERIE, NUMPEDIDO, N, FECHA, CODCLIENTE, TOTBRUTO, TOTNETO, OBSERVACIONES) VALUES (@serie, @number, \'B\', GETDATE(), 1, @total, @total, @notes)',
      insertOrderLine: 'INSERT INTO PEDVENTALIN (NUMSERIE, NUMPEDIDO, N, NUMLIN, CODARTICULO, DESCRIPCION, UNIDADESATOTAL, PRECIO, TOTAL) VALUES (@serie, @number, \'B\', @pos, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: EXTENDED_DEMO_ARTICLES_BY_ERP.icg,
  },

  visionwin: {
    providerId: 'visionwin' as SupportedErpProviderId,
    displayName: 'Visionwin Gestión',
    defaultInstances: ['.\\SQLEXPRESS', 'localhost:1433', 'LOCAL_MDB'],
    defaultDatabase: 'VISIONWIN',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Tarifa 1 General (PVP1)' },
        { code: '2', name: '2: Tarifa 2 Web (PVP2)' },
        { code: '3', name: '3: Tarifa 3 Profesional (PVP3)' },
      ],
      warehouses: [
        { code: '1', name: '1: Almacén General' },
        { code: '2', name: '2: Almacén Secundario' },
      ],
      series: ['1', 'A', 'W'],
    },
    queries: {
      countArticles: 'SELECT COUNT(1) AS total FROM ARTICULOS WITH (NOLOCK) WHERE ISNULL(BAJA, 0) = 0',
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(A.CODIGO)) AS code, LTRIM(RTRIM(A.NOMBRE)) AS description, LTRIM(RTRIM(A.FAMILIA)) AS family, ISNULL(A.STOCK, 0) AS stock, ISNULL(A.PVP1, 0) AS salePrice, ISNULL(A.COSTE, 0) AS costPrice, LTRIM(RTRIM(A.CODBARRAS)) AS ean FROM ARTICULOS A WITH (NOLOCK) WHERE ISNULL(A.BAJA, 0) = 0 ORDER BY A.CODIGO ASC`,
      readStock: (warehouseCode: string) => {
        void warehouseCode;
        return 'SELECT LTRIM(RTRIM(CODIGO)) AS sku, SUM(ISNULL(STOCK, 0)) AS stock FROM ARTICULOS WITH (NOLOCK) WHERE ISNULL(BAJA, 0) = 0 GROUP BY CODIGO';
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(A.CODIGO)) AS code, LTRIM(RTRIM(A.NOMBRE)) AS name, LTRIM(RTRIM(A.FAMILIA)) AS family, ISNULL(A.STOCK, 0) AS stock, ISNULL(A.PVP1, 0) AS price, ISNULL(A.COSTE, 0) AS costPrice, LTRIM(RTRIM(A.CODBARRAS)) AS barcode, LTRIM(RTRIM(A.OBSERVACIONES)) AS description FROM ARTICULOS A WITH (NOLOCK) WHERE ISNULL(A.BAJA, 0) = 0`,
      insertOrderHeader: 'INSERT INTO PEDIDOS_CLI (SERIE, NUMERO, FECHA, CLIENTE, NOMBRE_CLI, TOTAL, OBSERVACIONES) VALUES (@serie, @number, GETDATE(), \'00001\', @customerName, @total, @notes)',
      insertOrderLine: 'INSERT INTO LINEAS_PEDIDOS_CLI (SERIE, NUMERO, LINEA, ARTICULO, DESCRIPCION, CANTIDAD, PRECIO, IMPORTE) VALUES (@serie, @number, @pos, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: EXTENDED_DEMO_ARTICLES_BY_ERP.visionwin,
  },

  aplifisa: {
    providerId: 'aplifisa' as SupportedErpProviderId,
    displayName: 'Aplifisa (GestFuturo / Factus)',
    defaultInstances: ['.\\APLIFISA', '.\\SQLEXPRESS', 'localhost:1433'],
    defaultDatabase: 'GESTFUTURO',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Tarifa 1 General (PVP1)' },
        { code: '2', name: '2: Tarifa 2 Comercio Online (PVP2)' },
        { code: '3', name: '3: Tarifa 3 Mayorista (PVP3)' },
      ],
      warehouses: [
        { code: '01', name: '01: Almacén Principal' },
        { code: '02', name: '02: Almacén Expediciones' },
      ],
      series: ['1', 'A', 'W'],
    },
    queries: {
      countArticles: 'SELECT COUNT(1) AS total FROM ARTICULOS WITH (NOLOCK) WHERE ISNULL(BAJA, 0) = 0',
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(A.CODART)) AS code, LTRIM(RTRIM(A.NOMART)) AS description, LTRIM(RTRIM(A.FAMART)) AS family, ISNULL(E.STOCKACTUAL - ISNULL(E.RESERVADO, 0), 0) AS stock, ISNULL(A.PVP1, 0) AS salePrice, ISNULL(A.ULTCOSTE, 0) AS costPrice, LTRIM(RTRIM(A.CODBARRAS)) AS ean FROM ARTICULOS A WITH (NOLOCK) LEFT JOIN EXISTENCIAS E WITH (NOLOCK) ON E.CODART = A.CODART AND E.CODALM = '01' WHERE ISNULL(A.BAJA, 0) = 0 ORDER BY A.CODART ASC`,
      readStock: (warehouseCode: string) => {
        const safeWh = sanitizeWarehouseCode(warehouseCode);
        return `SELECT LTRIM(RTRIM(CODART)) AS sku, SUM(ISNULL(STOCKACTUAL - ISNULL(RESERVADO, 0), 0)) AS stock FROM EXISTENCIAS WITH (NOLOCK) WHERE LTRIM(RTRIM(CODALM)) = '${safeWh}' OR '${safeWh}' = 'GEN' GROUP BY CODART`;
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(A.CODART)) AS code, LTRIM(RTRIM(A.NOMART)) AS name, LTRIM(RTRIM(A.FAMART)) AS family, ISNULL(E.STOCKACTUAL - ISNULL(E.RESERVADO, 0), 0) AS stock, ISNULL(A.PVP1, 0) AS price, ISNULL(A.ULTCOSTE, 0) AS costPrice, LTRIM(RTRIM(A.CODBARRAS)) AS barcode, LTRIM(RTRIM(A.NOMART)) AS description FROM ARTICULOS A WITH (NOLOCK) LEFT JOIN EXISTENCIAS E WITH (NOLOCK) ON E.CODART = A.CODART AND E.CODALM = '01' WHERE ISNULL(A.BAJA, 0) = 0`,
      insertOrderHeader: 'INSERT INTO PEDIDOSCLI_CAB (SERIE, NUMERO, FECHA, CODCLI, NOMCLI, TOTALPED, OBSERVACIONES) VALUES (@serie, @number, GETDATE(), \'000001\', @customerName, @total, @notes)',
      insertOrderLine: 'INSERT INTO PEDIDOSCLI_LIN (SERIE, NUMERO, LINEA, CODART, DESCRIPCION, UNIDADES, PRECIO, IMPORTE) VALUES (@serie, @number, @pos, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: EXTENDED_DEMO_ARTICLES_BY_ERP.aplifisa,
  },

  odoo: {
    providerId: 'odoo' as SupportedErpProviderId,
    displayName: 'Odoo ERP (v14–v18 On-Premise & Cloud)',
    defaultInstances: ['http://127.0.0.1:8069', 'localhost:5432', '.\\SQLEXPRESS'],
    defaultDatabase: 'odoo_prod',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Tarifa Pública (list_price)' },
        { code: '2', name: '2: Pricelist B2B / E-Commerce' },
      ],
      warehouses: [
        { code: 'WH', name: 'WH/Stock: Almacén Interno Principal' },
        { code: 'GEN', name: 'GEN: Consolidado (stock.quant)' },
      ],
      series: ['S', 'SO', 'W'],
    },
    queries: {
      countArticles: 'SELECT COUNT(1) AS total FROM product_product WHERE active = 1',
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(pp.default_code)) AS code, LTRIM(RTRIM(pt.name)) AS description, CAST(pt.categ_id AS VARCHAR(20)) AS family, ISNULL(sq.quantity - sq.reserved_quantity, 0) AS stock, ISNULL(pt.list_price, 0) AS salePrice, ISNULL(pp.standard_price, 0) AS costPrice, LTRIM(RTRIM(pp.barcode)) AS ean FROM product_product pp LEFT JOIN product_template pt ON pt.id = pp.product_tmpl_id LEFT JOIN stock_quant sq ON sq.product_id = pp.id WHERE pp.active = 1 ORDER BY pp.id ASC`,
      readStock: (warehouseCode: string) => {
        void warehouseCode;
        return 'SELECT LTRIM(RTRIM(pp.default_code)) AS sku, SUM(ISNULL(sq.quantity - sq.reserved_quantity, 0)) AS stock FROM product_product pp INNER JOIN stock_quant sq ON sq.product_id = pp.id GROUP BY pp.default_code';
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(pp.default_code)) AS code, LTRIM(RTRIM(pt.name)) AS name, CAST(pt.categ_id AS VARCHAR(20)) AS family, ISNULL(sq.quantity - sq.reserved_quantity, 0) AS stock, ISNULL(pt.list_price, 0) AS price, ISNULL(pp.standard_price, 0) AS costPrice, LTRIM(RTRIM(pp.barcode)) AS barcode, LTRIM(RTRIM(pt.name)) AS description FROM product_product pp LEFT JOIN product_template pt ON pt.id = pp.product_tmpl_id LEFT JOIN stock_quant sq ON sq.product_id = pp.id WHERE pp.active = 1`,
      insertOrderHeader: 'INSERT INTO sale_order (name, partner_id, date_order, client_order_ref, state, amount_total, note) VALUES (@serie, 1, GETDATE(), @customerName, \'sale\', @total, @notes)',
      insertOrderLine: 'INSERT INTO sale_order_line (order_id, sequence, name, product_uom_qty, price_unit, price_total) VALUES (@number, @pos, @name, @qty, @price, @total)',
    },
    demoArticles: EXTENDED_DEMO_ARTICLES_BY_ERP.odoo,
  },

  facturascripts: {
    providerId: 'facturascripts' as SupportedErpProviderId,
    displayName: 'FacturaScripts (API v3 & SQL)',
    defaultInstances: ['http://127.0.0.1:8000', 'localhost:3306', '.\\SQLEXPRESS'],
    defaultDatabase: 'facturascripts',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Precio Base Variante (variantes.precio)' },
        { code: '2', name: '2: Tarifa Especial Web' },
      ],
      warehouses: [
        { code: 'ALG', name: 'ALG: Almacén General (stocks.disponible)' },
        { code: 'WEB', name: 'WEB: Almacén Tienda Online' },
      ],
      series: ['A', 'R', 'W'],
    },
    queries: {
      countArticles: 'SELECT COUNT(1) AS total FROM productos WHERE ISNULL(bloqueado, 0) = 0',
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(v.referencia)) AS code, LTRIM(RTRIM(p.descripcion)) AS description, LTRIM(RTRIM(p.codfamilia)) AS family, ISNULL(s.disponible, ISNULL(v.stockfis, 0)) AS stock, ISNULL(v.precio, 0) AS salePrice, ISNULL(v.coste, 0) AS costPrice, LTRIM(RTRIM(v.codbarras)) AS ean FROM variantes v INNER JOIN productos p ON p.idproducto = v.idproducto LEFT JOIN stocks s ON s.referencia = v.referencia AND s.codalmacen = 'ALG' WHERE ISNULL(p.bloqueado, 0) = 0 ORDER BY v.referencia ASC`,
      readStock: (warehouseCode: string) => {
        const safeWh = sanitizeWarehouseCode(warehouseCode);
        return `SELECT LTRIM(RTRIM(referencia)) AS sku, SUM(ISNULL(disponible, cantidad - ISNULL(reservada, 0))) AS stock FROM stocks WHERE LTRIM(RTRIM(codalmacen)) = '${safeWh}' OR '${safeWh}' = 'GEN' OR '${safeWh}' = 'ALG' GROUP BY referencia`;
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(v.referencia)) AS code, LTRIM(RTRIM(p.descripcion)) AS name, LTRIM(RTRIM(p.codfamilia)) AS family, ISNULL(s.disponible, ISNULL(v.stockfis, 0)) AS stock, ISNULL(v.precio, 0) AS price, ISNULL(v.coste, 0) AS costPrice, LTRIM(RTRIM(v.codbarras)) AS barcode, LTRIM(RTRIM(p.descripcion)) AS description FROM variantes v INNER JOIN productos p ON p.idproducto = v.idproducto LEFT JOIN stocks s ON s.referencia = v.referencia AND s.codalmacen = 'ALG' WHERE ISNULL(p.bloqueado, 0) = 0`,
      insertOrderHeader: 'INSERT INTO pedidoscli (codserie, codigo, numero, fecha, codcliente, nombrecliente, total, observaciones) VALUES (@serie, CAST(@number AS VARCHAR(20)), CAST(@number AS VARCHAR(20)), GETDATE(), \'000001\', @customerName, @total, @notes)',
      insertOrderLine: 'INSERT INTO lineaspedidoscli (idpedido, orden, referencia, descripcion, cantidad, pvpunitario, pvptotal) VALUES (@number, @pos, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: EXTENDED_DEMO_ARTICLES_BY_ERP.facturascripts,
  },

  businesscentral: {
    providerId: 'businesscentral' as SupportedErpProviderId,
    displayName: 'Microsoft Dynamics 365 Business Central / NAV',
    defaultInstances: ['.\\BCDEMO', '.\\SQLEXPRESS', 'localhost:1433'],
    defaultDatabase: 'BC_CRONUS_ES',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Unit Price Ficha Item ([Unit Price])' },
        { code: '2', name: '2: Sales Price List Web' },
      ],
      warehouses: [
        { code: 'PRINCIPAL', name: 'PRINCIPAL: Almacén Principal (Item Ledger Entry)' },
        { code: 'GEN', name: 'GEN: Inventario Global Consolidado' },
      ],
      series: ['PED', '1', 'W'],
    },
    queries: {
      countArticles: 'SELECT COUNT(1) AS total FROM [CRONUS$Item] WITH (NOLOCK) WHERE ISNULL([Blocked], 0) = 0',
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(I.[No_])) AS code, LTRIM(RTRIM(I.[Description])) AS description, LTRIM(RTRIM(I.[Item Category Code])) AS family, ISNULL(L.totalStock, 0) AS stock, ISNULL(I.[Unit Price], 0) AS salePrice, ISNULL(I.[Unit Cost], 0) AS costPrice, LTRIM(RTRIM(I.[GTIN])) AS ean FROM [CRONUS$Item] I WITH (NOLOCK) LEFT JOIN (SELECT [Item No_], SUM([Remaining Quantity]) AS totalStock FROM [CRONUS$Item Ledger Entry] WITH (NOLOCK) GROUP BY [Item No_]) L ON L.[Item No_] = I.[No_] WHERE ISNULL(I.[Blocked], 0) = 0 ORDER BY I.[No_] ASC`,
      readStock: (warehouseCode: string) => {
        const safeWh = sanitizeWarehouseCode(warehouseCode);
        return `SELECT LTRIM(RTRIM([Item No_])) AS sku, SUM(ISNULL([Remaining Quantity], 0)) AS stock FROM [CRONUS$Item Ledger Entry] WITH (NOLOCK) WHERE LTRIM(RTRIM([Location Code])) = '${safeWh}' OR '${safeWh}' = 'GEN' OR '${safeWh}' = 'PRINCIPAL' GROUP BY [Item No_]`;
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(I.[No_])) AS code, LTRIM(RTRIM(I.[Description])) AS name, LTRIM(RTRIM(I.[Item Category Code])) AS family, ISNULL(L.totalStock, 0) AS stock, ISNULL(I.[Unit Price], 0) AS price, ISNULL(I.[Unit Cost], 0) AS costPrice, LTRIM(RTRIM(I.[GTIN])) AS barcode, LTRIM(RTRIM(I.[Description])) AS description FROM [CRONUS$Item] I WITH (NOLOCK) LEFT JOIN (SELECT [Item No_], SUM([Remaining Quantity]) AS totalStock FROM [CRONUS$Item Ledger Entry] WITH (NOLOCK) GROUP BY [Item No_]) L ON L.[Item No_] = I.[No_] WHERE ISNULL(I.[Blocked], 0) = 0`,
      insertOrderHeader: 'INSERT INTO [CRONUS$Sales Header] ([Document Type], [No_], [Order Date], [Sell-to Customer No_], [Sell-to Customer Name], [External Document No_]) VALUES (1, CAST(@number AS VARCHAR(20)), GETDATE(), \'10000\', @customerName, @notes)',
      insertOrderLine: 'INSERT INTO [CRONUS$Sales Line] ([Document Type], [Document No_], [Line No_], [Type], [No_], [Description], [Quantity], [Unit Price], [Amount]) VALUES (1, CAST(@number AS VARCHAR(20)), @pos, 2, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: EXTENDED_DEMO_ARTICLES_BY_ERP.businesscentral,
  },
};
