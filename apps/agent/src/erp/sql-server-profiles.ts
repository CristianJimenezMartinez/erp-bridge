import { ErpCatalogArticle, ErpMetadata, SupportedErpProviderId } from './erp.types';

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

export interface SqlServerErpProfile {
  providerId: SupportedErpProviderId;
  displayName: string;
  defaultInstances: string[];
  defaultDatabase: string;
  metadata: ErpMetadata;
  queries: {
    countArticles: string;
    previewArticles: (top: number) => string;
    readStock: (warehouseCode: string) => string;
    readCatalog: (top: number) => string;
    insertOrderHeader: string;
    insertOrderLine: string;
  };
  demoArticles: ErpCatalogArticle[];
}

export const DEMO_ARTICLES_BY_ERP: Record<SupportedErpProviderId, ErpCatalogArticle[]> = {
  factusol: [
    { code: 'FS-1001', name: 'Bomba Solar Sumergible 750W Inox', family: 'BOMBAS', stock: 14, price: 289.0, costPrice: 175.0, barcode: '8435100100018', description: 'Bomba solar DC sin escobillas' },
    { code: 'FS-1002', name: 'Panel Solar Monocristalino 455W PERC', family: 'SOLAR', stock: 42, price: 115.0, costPrice: 78.0, barcode: '8435100100025', description: 'Módulo fotovoltaico alta eficiencia' },
    { code: 'FS-1003', name: 'Programador Riego 6 Estaciones WiFi', family: 'RIEGO', stock: 19, price: 84.5, costPrice: 49.0, barcode: '8435100100032', description: 'Controlador de riego inteligente' },
  ],
  simplygest: [
    { code: 'SG-2001', name: 'Terminal TPV Táctil 15" Capacitivo J6412', family: 'TPV', stock: 8, price: 420.0, costPrice: 285.0, barcode: '8435200200015', description: 'Terminal punto de venta fanless' },
    { code: 'SG-2002', name: 'Impresora Térmica Tickets 80mm USB/LAN', family: 'IMPRESORAS', stock: 26, price: 95.0, costPrice: 54.0, barcode: '8435200200022', description: 'Corte automático 260mm/s' },
    { code: 'SG-2003', name: 'Lector Código de Barras 2D Inalámbrico', family: 'LECTORES', stock: 31, price: 68.0, costPrice: 36.0, barcode: '8435200200039', description: 'Escáner QR y 1D/2D con base' },
  ],
  agora: [
    { code: 'AG-3001', name: 'Estuche Vino Reserva Selección D.O. Rioja', family: 'BODEGA', stock: 24, price: 34.9, costPrice: 19.5, barcode: '8435300300012', description: 'Caja madera 3 botellas 75cl' },
    { code: 'AG-3002', name: 'Aceite Oliva Virgen Extra Picual 5L', family: 'ALIMENTACION', stock: 50, price: 42.0, costPrice: 29.0, barcode: '8435300300029', description: 'Cosecha temprana extracción en frío' },
    { code: 'AG-3003', name: 'Jamón Ibérico Cebo de Campo 50% 8kg', family: 'IBERICOS', stock: 6, price: 165.0, costPrice: 112.0, barcode: '8435300300036', description: 'Curación tradicional 28 meses' },
  ],
  sage50: [
    { code: 'S50-4001', name: 'Taladro Percutor Brushless 18V 2x5.0Ah', family: 'MAQUINARIA', stock: 12, price: 219.0, costPrice: 142.0, barcode: '8435400400019', description: 'Maletín profesional con 2 baterías' },
    { code: 'S50-4002', name: 'Cuadro Protección Eléctrica IP65 12ód', family: 'ELECTRICIDAD', stock: 35, price: 48.5, costPrice: 27.0, barcode: '8435400400026', description: 'Estanco para exterior e industria' },
    { code: 'S50-4003', name: 'Bobina Cable Libre Halógenos 3G2.5 100m', family: 'CABLEADO', stock: 18, price: 112.0, costPrice: 79.0, barcode: '8435400400033', description: 'Normativa CPR alta seguridad' },
  ],
  a3erp: [
    { code: 'A3-5001', name: 'Válvula Hidráulica Solenoide 2" 24V AC', family: 'HIDRAULICA', stock: 29, price: 64.0, costPrice: 38.0, barcode: '8435500500016', description: 'Cuerpo poliamida reforzada fibra vidrio' },
    { code: 'A3-5002', name: 'Variador de Frecuencia Trifásico 5.5kW', family: 'AUTOMATIZACION', stock: 7, price: 385.0, costPrice: 245.0, barcode: '8435500500023', description: 'Control vectorial para bombeo' },
    { code: 'A3-5003', name: 'Contador Volumétrico Brida DN50 R160', family: 'MEDICION', stock: 11, price: 198.0, costPrice: 124.0, barcode: '8435500500030', description: 'Emisor de pulsos incluido' },
  ],
};

export const SQL_SERVER_PROFILES: Record<'agora' | 'sage50' | 'a3erp', SqlServerErpProfile> = {
  agora: {
    providerId: 'agora',
    displayName: 'Ágora Retail / POS',
    defaultInstances: ['.\\AGORA', '.\\SQLEXPRESS', 'localhost:1433'],
    defaultDatabase: 'AgoraDB',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Tarifa General / Mostrador (PriceList 1)' },
        { code: '2', name: '2: Tarifa Tienda Online / Web (PriceList 2)' },
        { code: '3', name: '3: Tarifa VIP / Profesional (PriceList 3)' },
      ],
      warehouses: [
        { code: '1', name: '1: Almacén Principal Tienda' },
        { code: '2', name: '2: Almacén Secundario / Reserva' },
      ],
      series: ['1', 'W', 'T'],
    },
    queries: {
      countArticles: 'SELECT COUNT(1) AS total FROM SaleItem WITH (NOLOCK) WHERE DeletedOn IS NULL',
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} si.Id AS code, si.Name AS description, CAST(si.FamilyId AS VARCHAR(20)) AS family, ISNULL(ws.Quantity, 0) AS stock, ISNULL(pl.MainPrice, 0) AS salePrice, ISNULL(si.CostPrice, 0) AS costPrice, si.Barcode AS ean FROM SaleItem si WITH (NOLOCK) LEFT JOIN PriceList pl WITH (NOLOCK) ON pl.SaleItemId = si.Id AND pl.PriceListId = 1 LEFT JOIN WarehouseStock ws WITH (NOLOCK) ON ws.ProductId = si.Id AND ws.WarehouseId = 1 WHERE si.DeletedOn IS NULL ORDER BY si.Id ASC`,
      readStock: (warehouseCode: string) => {
        const safeWh = sanitizeWarehouseCode(warehouseCode);
        return `SELECT CAST(ProductId AS VARCHAR(50)) AS sku, SUM(ISNULL(Quantity, 0)) AS stock FROM WarehouseStock WITH (NOLOCK) WHERE CAST(WarehouseId AS VARCHAR(20)) = '${safeWh}' OR '${safeWh}' = 'GEN' GROUP BY ProductId`;
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} CAST(si.Id AS VARCHAR(50)) AS code, si.Name AS name, CAST(si.FamilyId AS VARCHAR(20)) AS family, ISNULL(ws.Quantity, 0) AS stock, ISNULL(pl.MainPrice, 0) AS price, ISNULL(si.CostPrice, 0) AS costPrice, si.Barcode AS barcode, si.Name AS description FROM SaleItem si WITH (NOLOCK) LEFT JOIN PriceList pl WITH (NOLOCK) ON pl.SaleItemId = si.Id AND pl.PriceListId = 1 LEFT JOIN WarehouseStock ws WITH (NOLOCK) ON ws.ProductId = si.Id AND ws.WarehouseId = 1 WHERE si.DeletedOn IS NULL`,
      insertOrderHeader: 'INSERT INTO CustomerOrder (Serie, Number, BusinessDay, CustomerName, TotalGross, Notes) VALUES (@serie, @number, GETDATE(), @customerName, @total, @notes)',
      insertOrderLine: 'INSERT INTO CustomerOrderLine (OrderSerie, OrderNumber, LineIndex, SaleItemCode, Description, Quantity, UnitPrice, TotalAmount) VALUES (@serie, @number, @pos, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: DEMO_ARTICLES_BY_ERP.agora,
  },
  sage50: {
    providerId: 'sage50',
    displayName: 'Sage 50',
    defaultInstances: ['.\\SAGE50', '.\\SQLEXPRESS', 'localhost:1433'],
    defaultDatabase: 'GESTION',
    metadata: {
      tariffs: [
        { code: '01', name: '01: Tarifa General PVP (pvp)' },
        { code: '02', name: '02: Tarifa E-Commerce / Web' },
        { code: '03', name: '03: Tarifa Distribuidor' },
      ],
      warehouses: [
        { code: '01', name: '01: Almacén General' },
        { code: '02', name: '02: Almacén Logístico Web' },
      ],
      series: ['1', 'A', 'W'],
    },
    queries: {
      countArticles: 'SELECT COUNT(1) AS total FROM articulo WITH (NOLOCK) WHERE baja = 0',
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(a.codigo)) AS code, LTRIM(RTRIM(a.nombre)) AS description, LTRIM(RTRIM(a.familia)) AS family, ISNULL(s.final - s.reservado, 0) AS stock, ISNULL(p.pvp, 0) AS salePrice, ISNULL(a.ult_coste, 0) AS costPrice, LTRIM(RTRIM(a.codigo_barras)) AS ean FROM articulo a WITH (NOLOCK) LEFT JOIN pvp p WITH (NOLOCK) ON p.articulo = a.codigo AND p.tarifa = '01' LEFT JOIN stocks s WITH (NOLOCK) ON s.articulo = a.codigo AND s.almacen = '01' WHERE a.baja = 0 ORDER BY a.codigo ASC`,
      readStock: (warehouseCode: string) => {
        const safeWh = sanitizeWarehouseCode(warehouseCode);
        return `SELECT LTRIM(RTRIM(articulo)) AS sku, SUM(ISNULL(final - reservado, 0)) AS stock FROM stocks WITH (NOLOCK) WHERE LTRIM(RTRIM(almacen)) = '${safeWh}' OR '${safeWh}' = 'GEN' GROUP BY articulo`;
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(a.codigo)) AS code, LTRIM(RTRIM(a.nombre)) AS name, LTRIM(RTRIM(a.familia)) AS family, ISNULL(s.final - s.reservado, 0) AS stock, ISNULL(p.pvp, 0) AS price, ISNULL(a.ult_coste, 0) AS costPrice, LTRIM(RTRIM(a.codigo_barras)) AS barcode, LTRIM(RTRIM(a.nombre)) AS description FROM articulo a WITH (NOLOCK) LEFT JOIN pvp p WITH (NOLOCK) ON p.articulo = a.codigo AND p.tarifa = '01' LEFT JOIN stocks s WITH (NOLOCK) ON s.articulo = a.codigo AND s.almacen = '01' WHERE a.baja = 0`,
      insertOrderHeader: 'INSERT INTO c_pediven (empresa, numero, letra, fecha, cliente, importe, observacio) VALUES (\'01\', @number, @serie, GETDATE(), \'43000001\', @total, @notes)',
      insertOrderLine: 'INSERT INTO d_pediven (empresa, numero, letra, linia, articulo, definicion, unidades, precio, importe) VALUES (\'01\', @number, @serie, @pos, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: DEMO_ARTICLES_BY_ERP.sage50,
  },
  a3erp: {
    providerId: 'a3erp',
    displayName: 'Wolters Kluwer a3ERP',
    defaultInstances: ['.\\SQLEXPRESS', 'localhost:1433', '.\\A3ERP'],
    defaultDatabase: 'A3ERP',
    metadata: {
      tariffs: [
        { code: '1', name: '1: Tarifa Venta General (PRCVENTA)' },
        { code: '2', name: '2: Tarifa Canal Online' },
        { code: '3', name: '3: Tarifa Mayorista' },
      ],
      warehouses: [
        { code: 'GEN', name: 'GEN: Almacén Central' },
        { code: 'WEB', name: 'WEB: Almacén Dedicado E-Commerce' },
      ],
      series: ['1', 'A', 'W'],
    },
    queries: {
      countArticles: "SELECT COUNT(1) AS total FROM ARTICULO WITH (NOLOCK) WHERE OBSOLETO = 'F'",
      previewArticles: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(A.CODART)) AS code, LTRIM(RTRIM(A.DESCART)) AS description, LTRIM(RTRIM(A.FAMART)) AS family, ISNULL(S.UNIDADES - S.RESERVADO, 0) AS stock, ISNULL(A.PRCVENTA, 0) AS salePrice, ISNULL(A.PRCCOMPRA, 0) AS costPrice, LTRIM(RTRIM(A.CODBAR)) AS ean FROM ARTICULO A WITH (NOLOCK) LEFT JOIN STOCKALM S WITH (NOLOCK) ON S.CODART = A.CODART AND LTRIM(RTRIM(S.CODALM)) = 'GEN' WHERE A.OBSOLETO = 'F' ORDER BY A.CODART ASC`,
      readStock: (warehouseCode: string) => {
        const safeWh = sanitizeWarehouseCode(warehouseCode);
        return `SELECT LTRIM(RTRIM(CODART)) AS sku, SUM(ISNULL(UNIDADES - RESERVADO, 0)) AS stock FROM STOCKALM WITH (NOLOCK) WHERE LTRIM(RTRIM(CODALM)) = '${safeWh}' OR '${safeWh}' = 'GEN' GROUP BY CODART`;
      },
      readCatalog: (top: number) =>
        `SELECT TOP ${sanitizeTop(top)} LTRIM(RTRIM(A.CODART)) AS code, LTRIM(RTRIM(A.DESCART)) AS name, LTRIM(RTRIM(A.FAMART)) AS family, ISNULL(S.UNIDADES - S.RESERVADO, 0) AS stock, ISNULL(A.PRCVENTA, 0) AS price, ISNULL(A.PRCCOMPRA, 0) AS costPrice, LTRIM(RTRIM(A.CODBAR)) AS barcode, LTRIM(RTRIM(A.DESCART)) AS description FROM ARTICULO A WITH (NOLOCK) LEFT JOIN STOCKALM S WITH (NOLOCK) ON S.CODART = A.CODART AND LTRIM(RTRIM(S.CODALM)) = 'GEN' WHERE A.OBSOLETO = 'F'`,
      insertOrderHeader: 'INSERT INTO CABEPEV (SERIE, NUMDOC, FECHA, CODCLI, NOMCLI, TOTDOC, OBSERV) VALUES (@serie, @number, GETDATE(), \'000001\', @customerName, @total, @notes)',
      insertOrderLine: 'INSERT INTO LINEPEV (SERIE, NUMDOC, NUMLIN, CODART, DESCART, UNIDADES, PRECIO, IMPORTE) VALUES (@serie, @number, @pos, @sku, @name, @qty, @price, @total)',
    },
    demoArticles: DEMO_ARTICLES_BY_ERP.a3erp,
  },
};
