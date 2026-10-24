import http from 'http';
import { LocalAgent } from '../../../agent';
import { SupportedErpProviderId, ErpCatalogArticle } from '../../../erp';
import { DEMO_ARTICLES_BY_ERP } from '../../../erp/sql-server-profiles';
import { EXTENDED_DEMO_ARTICLES_BY_ERP, ExtendedErpProviderId } from '../../../erp-extensions';
import { UniversalErpImageResolver } from '../../../sync/universal-erp-image.resolver';

export type CatalogIssueType =
  | 'ZERO_PRICE'
  | 'BELOW_COST'
  | 'NEGATIVE_STOCK'
  | 'MISSING_IMAGE'
  | 'INCOMPLETE_DATA';

export type CatalogIssueSeverity = 'critical' | 'warning' | 'info';

export interface CatalogAuditIssueItem {
  code: string;
  name: string;
  family: string;
  stock: number;
  price: number;
  costPrice: number;
  barcode: string;
  hasImage: boolean;
  issueTypes: CatalogIssueType[];
  primaryIssue: CatalogIssueType;
  severity: CatalogIssueSeverity;
  issueLabels: string[];
  remediationHint: string;
  erpTableRef: string;
}

export interface ErpAuditProfileMeta {
  providerId: ExtendedErpProviderId;
  displayName: string;
  engineLabel: string;
  tablesInspected: string;
  remediationByIssue: Record<CatalogIssueType, { tableRef: string; hint: string }>;
}

const ERP_AUDIT_PROFILES: Record<ExtendedErpProviderId, ErpAuditProfileMeta> = {
  factusol: {
    providerId: 'factusol',
    displayName: 'Factusol ERP',
    engineLabel: 'Microsoft Access OLEDB (.accdb)',
    tablesInspected: 'F_ART (Artículos), F_STO (Stock), F_LTA (Tarifas)',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'F_LTA / F_ART', hint: 'Factusol > Solapa Empresa > Artículos > Revisar PVP en Tarifa Activa' },
      BELOW_COST: { tableRef: 'F_ART.PCOART vs F_LTA', hint: 'Factusol > Ficha del Artículo > Precios: PVP inferior al Precio de Coste (PCOART)' },
      NEGATIVE_STOCK: { tableRef: 'F_STO.DISSTO', hint: 'Factusol > Solapa Almacén > Regularización o Consolidación de Inventario' },
      MISSING_IMAGE: { tableRef: 'F_ART.IMGART', hint: 'Factusol > Ficha del Artículo > Solapa Técnica > Imagen o carpeta Fotos/<CÓDIGO>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'F_ART (EANART / FAMART)', hint: 'Factusol > Ficha del Artículo > Completar Código EAN y Familia' },
    },
  },
  simplygest: {
    providerId: 'simplygest',
    displayName: 'SimplyGest Desktop',
    engineLabel: 'DBISAM (.dat) / Access (Datos.mdb)',
    tablesInspected: 'Articulos (articulos.dat / Datos.mdb), Tarifas, Almacenes',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'Articulos.Precio1', hint: 'SimplyGest > Módulo Artículos > Pestaña Precios y Tarifas > Asignar PVP' },
      BELOW_COST: { tableRef: 'Articulos (Coste vs PVP)', hint: 'SimplyGest > Ficha del Artículo > PVP sin IVA inferior al Precio de Coste' },
      NEGATIVE_STOCK: { tableRef: 'Articulos.StockActual', hint: 'SimplyGest > Almacén > Regularización de Existencias / Inventario' },
      MISSING_IMAGE: { tableRef: 'Articulos.Imagen', hint: 'SimplyGest > Ficha del Artículo > Pestaña Imagen o carpeta Fotos/<CODIGO>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'Articulos (CodBarras / Familia)', hint: 'SimplyGest > Ficha del Artículo > Completar Código de Barras y Familia' },
    },
  },
  agora: {
    providerId: 'agora',
    displayName: 'Ágora Retail / POS',
    engineLabel: 'SQL Server Local (AgoraDB)',
    tablesInspected: 'SaleItem, PriceList, WarehouseStock',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'PriceList.MainPrice', hint: 'Ágora Administración > Productos > Tarifas de Precios > Asignar MainPrice' },
      BELOW_COST: { tableRef: 'SaleItem.CostPrice vs MainPrice', hint: 'Ágora Administración > Ficha de Producto > PVP inferior a CostPrice' },
      NEGATIVE_STOCK: { tableRef: 'WarehouseStock.Quantity', hint: 'Ágora Administración > Almacén > Regularización de Stock del Almacén Activo' },
      MISSING_IMAGE: { tableRef: 'SaleItem (Images)', hint: 'Ágora Administración > Ficha de Producto > Imagen o carpeta Images/<Id>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'SaleItem (Barcode / FamilyId)', hint: 'Ágora Administración > Ficha de Producto > Completar Barcode y Familia' },
    },
  },
  sage50: {
    providerId: 'sage50',
    displayName: 'Sage 50 ERP',
    engineLabel: 'SQL Server Ejercicio Activo (GESTION)',
    tablesInspected: 'articulo, pvp, stocks, ART_FOTO',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'pvp.pvp (Tarifa 01)', hint: 'Sage 50 > Ventas > Artículos > Pestaña Tarifas > Asignar PVP en tarifa activa' },
      BELOW_COST: { tableRef: 'articulo.ult_coste vs pvp', hint: 'Sage 50 > Ficha de Artículo > Condiciones de Compra (ult_coste) mayor que PVP' },
      NEGATIVE_STOCK: { tableRef: 'stocks (final - reservado)', hint: 'Sage 50 > Almacén > Regularización de Stock del almacén activo' },
      MISSING_IMAGE: { tableRef: 'ART_FOTO.IMAGEN', hint: 'Sage 50 > Ficha de Artículo > Imágenes (ART_FOTO) o carpeta Fotos/<codigo>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'articulo (codigo_barras / familia)', hint: 'Sage 50 > Ficha de Artículo > Completar Código de Barras y Familia' },
    },
  },
  a3erp: {
    providerId: 'a3erp',
    displayName: 'Wolters Kluwer a3ERP',
    engineLabel: 'SQL Server + ActiveX (A3ERP)',
    tablesInspected: 'ARTICULO, STOCKALM',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'ARTICULO.PRCVENTA', hint: 'a3ERP > Ficheros > Artículos > Precios de Venta > Asignar PRCVENTA' },
      BELOW_COST: { tableRef: 'ARTICULO (PRCCOMPRA vs PRCVENTA)', hint: 'a3ERP > Ficha de Artículo > Precio de Venta inferior a PRCCOMPRA' },
      NEGATIVE_STOCK: { tableRef: 'STOCKALM (UNIDADES - RESERVADO)', hint: 'a3ERP > Almacén > Regularización de Existencias en almacén GEN' },
      MISSING_IMAGE: { tableRef: 'ARTICULO (Gestión Documental)', hint: 'a3ERP > Ficha de Artículo > Imagen o carpeta Imagenes/<CODART>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'ARTICULO (CODBAR / FAMART)', hint: 'a3ERP > Ficha de Artículo > Completar Código de Barras (CODBAR) y Familia' },
    },
  },
  sage200: {
    providerId: 'sage200',
    displayName: 'Sage 200 (Sage Murano)',
    engineLabel: 'SQL Server Local (SAGE200 / Murano)',
    tablesInspected: 'Articulos, AcumuladosStock, TarifasArticulo',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'Articulos.PrecioVenta', hint: 'Sage 200 > Almacén > Maestros > Artículos > Precios y Tarifas (PrecioVenta)' },
      BELOW_COST: { tableRef: 'Articulos (PrecioCompra vs PrecioVenta)', hint: 'Sage 200 > Ficha de Artículo > Condiciones Económicas: PrecioVenta menor que PrecioCompra' },
      NEGATIVE_STOCK: { tableRef: 'AcumuladosStock.UnidadesSaldo', hint: 'Sage 200 > Almacén > Inventario > Regularización de Existencias (Periodo 99)' },
      MISSING_IMAGE: { tableRef: 'Articulos (Gestión Documental)', hint: 'Sage 200 > Ficha de Artículo > Documentos / Imagen asociada o carpeta Fotos/<CodigoArticulo>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'Articulos (CodigoAlternativo / CodigoFamilia)', hint: 'Sage 200 > Ficha de Artículo > Completar Código EAN (CodigoAlternativo) y Familia' },
    },
  },
  icg: {
    providerId: 'icg',
    displayName: 'ICG Manager / FrontRetail',
    engineLabel: 'SQL Server Local (ICGManager)',
    tablesInspected: 'ARTICULOS, ARTICULOSLIN, PRECIOSVENTA, STOCKS',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'PRECIOSVENTA.PNETO', hint: 'ICG Manager > Maestros > Artículos > Pestaña Tarifas de Venta (IDTARIFAV=1)' },
      BELOW_COST: { tableRef: 'ARTICULOS.ULTCOSTE vs PNETO', hint: 'ICG Manager > Ficha de Artículo > Último Coste superior al PVP Neto' },
      NEGATIVE_STOCK: { tableRef: 'STOCKS.STOCK', hint: 'ICG Manager > Almacén > Regularización de Stock / Inventario Físico' },
      MISSING_IMAGE: { tableRef: 'ARTICULOS.FOTO', hint: 'ICG Manager > Ficha de Artículo > Pestaña Imagen o carpeta Fotos/<CODARTICULO>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'ARTICULOSLIN.CODBARRAS / FAMILIA', hint: 'ICG Manager > Ficha de Artículo > Tallas/Colores > Completar Código de Barras y Familia' },
    },
  },
  visionwin: {
    providerId: 'visionwin',
    displayName: 'Visionwin Gestión',
    engineLabel: 'Firebird / SQL Local (VISIONWIN)',
    tablesInspected: 'ARTICULOS, STOCK_ALMACEN, PEDIDOS_CLI',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'ARTICULOS.PVP1', hint: 'Visionwin > Ficheros > Artículos > Pestaña Precios > Asignar PVP Tarifa 1' },
      BELOW_COST: { tableRef: 'ARTICULOS (COSTE vs PVP1)', hint: 'Visionwin > Ficha de Artículo > Precio de Coste superior a PVP1' },
      NEGATIVE_STOCK: { tableRef: 'ARTICULOS.STOCK', hint: 'Visionwin > Almacén > Regularización de Almacén / Inventario' },
      MISSING_IMAGE: { tableRef: 'ARTICULOS.IMAGEN', hint: 'Visionwin > Ficha de Artículo > Pestaña Imagen o carpeta Fotos/<CODIGO>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'ARTICULOS (CODBARRAS / FAMILIA)', hint: 'Visionwin > Ficha de Artículo > Completar Código de Barras y Familia' },
    },
  },
  aplifisa: {
    providerId: 'aplifisa',
    displayName: 'Aplifisa (GestFuturo / Factus)',
    engineLabel: 'SQL Server / Firebird (GESTFUTURO)',
    tablesInspected: 'ARTICULOS, EXISTENCIAS, PEDIDOSCLI_CAB',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'ARTICULOS.PVP1', hint: 'Aplifisa > Archivos > Artículos > Tarifas de Venta (PVP1)' },
      BELOW_COST: { tableRef: 'ARTICULOS (ULTCOSTE vs PVP1)', hint: 'Aplifisa > Ficha de Artículo > Último Coste superior al PVP de Venta' },
      NEGATIVE_STOCK: { tableRef: 'EXISTENCIAS.STOCKACTUAL', hint: 'Aplifisa > Almacén > Regularización de Existencias en almacén 01' },
      MISSING_IMAGE: { tableRef: 'ARTICULOS.FOTO', hint: 'Aplifisa > Ficha de Artículo > Imagen asociada o carpeta Fotos/<CODART>.jpg' },
      INCOMPLETE_DATA: { tableRef: 'ARTICULOS (CODBARRAS / FAMART)', hint: 'Aplifisa > Ficha de Artículo > Completar Código de Barras y Familia' },
    },
  },
  odoo: {
    providerId: 'odoo',
    displayName: 'Odoo ERP',
    engineLabel: 'JSON-RPC (/jsonrpc) & PostgreSQL (product.product)',
    tablesInspected: 'product.product, product.template, stock.quant',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'product.template.list_price', hint: 'Odoo > Inventario / Ventas > Productos > Pestaña Información General > Precio de Venta' },
      BELOW_COST: { tableRef: 'standard_price vs list_price', hint: 'Odoo > Ficha de Producto > Coste (standard_price) superior al Precio de Venta' },
      NEGATIVE_STOCK: { tableRef: 'stock.quant.quantity', hint: 'Odoo > Inventario > Operaciones > Ajustes de Inventario (Ubicación WH/Stock)' },
      MISSING_IMAGE: { tableRef: 'product.product.image_1920', hint: 'Odoo > Ficha de Producto > Subir fotografía principal del producto' },
      INCOMPLETE_DATA: { tableRef: 'product.product (barcode / categ_id)', hint: 'Odoo > Ficha de Producto > Completar Código de Barras (EAN13) y Categoría' },
    },
  },
  facturascripts: {
    providerId: 'facturascripts',
    displayName: 'FacturaScripts',
    engineLabel: 'API REST v3 (/api/3) & SQL (productos / variantes)',
    tablesInspected: 'productos, variantes, stocks',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'variantes.precio', hint: 'FacturaScripts > Ventas > Productos > Pestaña Variantes > Asignar Precio' },
      BELOW_COST: { tableRef: 'variantes (coste vs precio)', hint: 'FacturaScripts > Ficha de Producto > Variantes: Precio inferior al Coste' },
      NEGATIVE_STOCK: { tableRef: 'stocks.disponible', hint: 'FacturaScripts > Almacén > Stock > Regularizar cantidad disponible en almacén ALG' },
      MISSING_IMAGE: { tableRef: 'productos_imagenes', hint: 'FacturaScripts > Ficha de Producto > Pestaña Imágenes > Subir foto' },
      INCOMPLETE_DATA: { tableRef: 'variantes.codbarras / productos.codfamilia', hint: 'FacturaScripts > Ficha de Producto > Completar Código de Barras y Familia' },
    },
  },
  businesscentral: {
    providerId: 'businesscentral',
    displayName: 'Microsoft Dynamics 365 Business Central / NAV',
    engineLabel: 'SQL Server ([CRONUS$Item]) & OData API v2.0',
    tablesInspected: '[CRONUS$Item], [CRONUS$Item Ledger Entry]',
    remediationByIssue: {
      ZERO_PRICE: { tableRef: 'Item.[Unit Price]', hint: 'Business Central > Productos (Items) > Precios y Ventas > Asignar Precio Unitario (Unit Price)' },
      BELOW_COST: { tableRef: 'Item ([Unit Cost] vs [Unit Price])', hint: 'Business Central > Ficha de Producto > Coste Unitario superior al Precio Unitario' },
      NEGATIVE_STOCK: { tableRef: 'Item Ledger Entry.[Remaining Quantity]', hint: 'Business Central > Diarios de Productos (Item Journals) > Ajuste Positivo de Inventario' },
      MISSING_IMAGE: { tableRef: 'Item.Picture', hint: 'Business Central > Ficha de Producto > Panel lateral Imagen > Importar fotografía' },
      INCOMPLETE_DATA: { tableRef: 'Item ([GTIN] / [Item Category Code])', hint: 'Business Central > Ficha de Producto > Completar GTIN y Código Categoría Producto' },
    },
  },
};

const DEMO_ANOMALIES_BY_ERP: Record<ExtendedErpProviderId, Array<ErpCatalogArticle & { _demoHasImage?: boolean }>> = {
  factusol: [
    { code: 'FS-1004', name: 'Inversor Híbrido 5000W MPPT', family: 'SOLAR', stock: 5, price: 0, costPrice: 410.0, barcode: '8435100100049', _demoHasImage: true },
    { code: 'FS-1005', name: 'Electroválvula Latón 1" 24V', family: 'RIEGO', stock: -4, price: 32.5, costPrice: 18.0, barcode: '8435100100056', _demoHasImage: false },
    { code: 'FS-1006', name: 'Batería Litio LiFePO4 48V 100Ah', family: 'BATERIAS', stock: 3, price: 690.0, costPrice: 745.0, barcode: '8435100100063', _demoHasImage: true },
    { code: 'FS-1007', name: 'Kit Racores Polietileno 32mm', family: '', stock: 28, price: 14.9, costPrice: 7.2, barcode: '', _demoHasImage: false },
  ],
  simplygest: [
    { code: 'SG-2004', name: 'Cajón Portamonedas Inteligente RJ11', family: 'TPV', stock: 11, price: 0, costPrice: 39.0, barcode: '8435200200046', _demoHasImage: true },
    { code: 'SG-2005', name: 'Rollo Papel Térmico 80x80 Libre BPA (Caja 50u)', family: 'CONSUMIBLES', stock: -6, price: 54.0, costPrice: 31.0, barcode: '8435200200053', _demoHasImage: false },
    { code: 'SG-2006', name: 'Balanza Comercial Conectada RS232 30kg', family: 'PESAJE', stock: 2, price: 145.0, costPrice: 168.0, barcode: '8435200200060', _demoHasImage: true },
    { code: 'SG-2007', name: 'Soporte VESA Mostrador Abatible', family: '', stock: 15, price: 29.0, costPrice: 14.0, barcode: '', _demoHasImage: false },
  ],
  agora: [
    { code: 'AG-3004', name: 'Queso Oveja Curado Artesano Pieza 3kg', family: 'QUESOS', stock: 9, price: 0, costPrice: 28.5, barcode: '8435300300043', _demoHasImage: true },
    { code: 'AG-3005', name: 'Pack Degustación Cerveza Artesana 12x33cl', family: 'BODEGA', stock: -3, price: 26.9, costPrice: 15.0, barcode: '8435300300050', _demoHasImage: false },
    { code: 'AG-3006', name: 'Lomo Bellota 100% Ibérico Mitad 600g', family: 'IBERICOS', stock: 4, price: 38.0, costPrice: 44.5, barcode: '8435300300067', _demoHasImage: true },
    { code: 'AG-3007', name: 'Conserva Ventresca Bonito del Norte', family: '', stock: 22, price: 12.5, costPrice: 7.1, barcode: '', _demoHasImage: false },
  ],
  sage50: [
    { code: 'S50-4004', name: 'Amoladora Angular Profesional 125mm 1400W', family: 'MAQUINARIA', stock: 7, price: 0, costPrice: 82.0, barcode: '8435400400040', _demoHasImage: true },
    { code: 'S50-4005', name: 'Diferencial Superinmunizado 2P 40A 30mA', family: 'ELECTRICIDAD', stock: -5, price: 64.0, costPrice: 38.0, barcode: '8435400400057', _demoHasImage: false },
    { code: 'S50-4006', name: 'Generador Inverter Insonorizado 3500W', family: 'MAQUINARIA', stock: 2, price: 495.0, costPrice: 540.0, barcode: '8435400400064', _demoHasImage: true },
    { code: 'S50-4007', name: 'Caja Guantes Nitrilo Industrial Talla L', family: '', stock: 40, price: 11.8, costPrice: 5.9, barcode: '', _demoHasImage: false },
  ],
  a3erp: [
    { code: 'A3-5004', name: 'Bomba Dosificadora Digital Membrana 10L/h', family: 'HIDRAULICA', stock: 6, price: 0, costPrice: 185.0, barcode: '8435500500047', _demoHasImage: true },
    { code: 'A3-5005', name: 'Transmisor Presión Industrial 4-20mA 0-16bar', family: 'MEDICION', stock: -2, price: 78.0, costPrice: 42.0, barcode: '8435500500054', _demoHasImage: false },
    { code: 'A3-5006', name: 'Autómata Programable PLC Industrial Ethernet', family: 'AUTOMATIZACION', stock: 3, price: 290.0, costPrice: 325.0, barcode: '8435500500061', _demoHasImage: true },
    { code: 'A3-5007', name: 'Filtro Malla Inoxidable Bridado 3"', family: '', stock: 14, price: 142.0, costPrice: 86.0, barcode: '', _demoHasImage: false },
  ],
  sage200: [
    { code: 'S200-6004', name: 'Secador Frigorífico Aire Comprimido 2500 l/min', family: 'NEUMATICA', stock: 4, price: 0, costPrice: 680.0, barcode: '8435600600044', _demoHasImage: true },
    { code: 'S200-6005', name: 'Cilindro Neumático ISO 15552 D.63 C.200', family: 'NEUMATICA', stock: -3, price: 94.0, costPrice: 52.0, barcode: '8435600600051', _demoHasImage: false },
    { code: 'S200-6006', name: 'Puente Grúa Ligero Modular 1000kg', family: 'ELEVACION', stock: 2, price: 1490.0, costPrice: 1620.0, barcode: '8435600600068', _demoHasImage: true },
    { code: 'S200-6007', name: 'Racor Rápido Inox Seguridad 1/2"', family: '', stock: 50, price: 18.5, costPrice: 9.0, barcode: '', _demoHasImage: false },
  ],
  icg: [
    { code: 'ICG-7004', name: 'Lavavajillas Cúpula Industrial Cesta 50x50', family: 'HOSTELERIA', stock: 3, price: 0, costPrice: 1190.0, barcode: '8435700700041', _demoHasImage: true },
    { code: 'ICG-7005', name: 'Fabricador Cubitos Hielo Macizo 45kg/24h', family: 'FRIO', stock: -2, price: 590.0, costPrice: 380.0, barcode: '8435700700058', _demoHasImage: false },
    { code: 'ICG-7006', name: 'Horno Convección Mixto Gastronorm 6 Bandejas', family: 'COCCION', stock: 1, price: 2150.0, costPrice: 2390.0, barcode: '8435700700065', _demoHasImage: true },
    { code: 'ICG-7007', name: 'Cubeta Gastronorm GN 1/1 Acero Inox 150mm', family: '', stock: 38, price: 24.0, costPrice: 12.5, barcode: '', _demoHasImage: false },
  ],
  visionwin: [
    { code: 'VW-8004', name: 'Nivel Láser Autonivelante 360 Verde 3 Líneas', family: 'MEDICION', stock: 8, price: 0, costPrice: 112.0, barcode: '8435800800048', _demoHasImage: true },
    { code: 'VW-8005', name: 'Disco Diamante Porcelánico Turbo Extrafino 115mm', family: 'ABRASIVOS', stock: -7, price: 19.5, costPrice: 9.8, barcode: '8435800800055', _demoHasImage: false },
    { code: 'VW-8006', name: 'Martillo Demoledor Hexagonal 1700W 50J', family: 'HERRAMIENTA', stock: 2, price: 240.0, costPrice: 275.0, barcode: '8435800800062', _demoHasImage: true },
    { code: 'VW-8007', name: 'Taco Químico Poliéster Libre Estireno 300ml', family: '', stock: 64, price: 8.9, costPrice: 4.5, barcode: '', _demoHasImage: false },
  ],
  aplifisa: [
    { code: 'APL-9004', name: 'Aerotermia Bibloc Bomba Calor 12kW A+++', family: 'CLIMATIZACION', stock: 2, price: 0, costPrice: 2890.0, barcode: '8435900900045', _demoHasImage: true },
    { code: 'APL-9005', name: 'Válvula Termostática Radiador Escuadra 1/2"', family: 'CALEFACCION', stock: -5, price: 16.8, costPrice: 8.4, barcode: '8435900900052', _demoHasImage: false },
    { code: 'APL-9006', name: 'Descalcificador Volumétrico Bajo Consumo 25L', family: 'TRATAMIENTO', stock: 3, price: 410.0, costPrice: 455.0, barcode: '8435900900069', _demoHasImage: true },
    { code: 'APL-9007', name: 'Rollo Tubo Multicapa Aislado 16x2mm 50m', family: '', stock: 19, price: 78.0, costPrice: 46.0, barcode: '', _demoHasImage: false },
  ],
  odoo: [
    { code: 'ODO-1104', name: 'Apilador Eléctrico Conductor Acompañante 1200kg', family: 'LOGISTICA', stock: 3, price: 0, costPrice: 2150.0, barcode: '8435110100042', _demoHasImage: true },
    { code: 'ODO-1105', name: 'Rollo Film Estirable Automático 23 Micras', family: 'EMBALAJE', stock: -8, price: 42.0, costPrice: 26.0, barcode: '8435110100059', _demoHasImage: false },
    { code: 'ODO-1106', name: 'Báscula Pesapalets Industrial 2000kg 4 Células', family: 'PESAJE', stock: 2, price: 590.0, costPrice: 640.0, barcode: '8435110100066', _demoHasImage: true },
    { code: 'ODO-1107', name: 'Contenedor Plástico Euro Apilable 600x400', family: '', stock: 85, price: 14.5, costPrice: 7.8, barcode: '', _demoHasImage: false },
  ],
  facturascripts: [
    { code: 'FSC-1204', name: 'Firewall Hardware Seguridad Perimetral Dual WAN', family: 'REDES', stock: 5, price: 0, costPrice: 310.0, barcode: '8435120200049', _demoHasImage: true },
    { code: 'FSC-1205', name: 'Punto Acceso WiFi 6 Empresarial Techo PoE', family: 'REDES', stock: -4, price: 129.0, costPrice: 79.0, barcode: '8435120200056', _demoHasImage: false },
    { code: 'FSC-1206', name: 'Servidor NAS Rack 4 Bahías 10GbE Redundante', family: 'ALMACENAMIENTO', stock: 2, price: 780.0, costPrice: 845.0, barcode: '8435120200063', _demoHasImage: true },
    { code: 'FSC-1207', name: 'Latiguillo Fibra Óptica Multimodo OM4 LC-LC 3m', family: '', stock: 60, price: 9.5, costPrice: 4.1, barcode: '', _demoHasImage: false },
  ],
  businesscentral: [
    { code: 'BC-1304', name: 'Sierra Cinta Metal Hidráulica Semiautomática', family: 'INDUSTRIAL', stock: 2, price: 0, costPrice: 1850.0, barcode: '8435130300046', _demoHasImage: true },
    { code: 'BC-1305', name: 'Mordaza Hidráulica Precisión Fresadora 160mm', family: 'UTILLAJE', stock: -3, price: 340.0, costPrice: 210.0, barcode: '8435130300053', _demoHasImage: false },
    { code: 'BC-1306', name: 'Aspirador Industrial Viruta y Taladrina Trifásico', family: 'ASPIRACION', stock: 1, price: 1120.0, costPrice: 1240.0, barcode: '8435130300060', _demoHasImage: true },
    { code: 'BC-1307', name: 'Juego Galgas Bloques Patrón Grado 0 Acero', family: '', stock: 9, price: 215.0, costPrice: 132.0, barcode: '', _demoHasImage: false },
  ],
};

const ISSUE_LABELS: Record<CatalogIssueType, string> = {
  ZERO_PRICE: 'Precio 0,00 € / Sin PVP',
  BELOW_COST: 'PVP inferior a Coste',
  NEGATIVE_STOCK: 'Stock Negativo',
  MISSING_IMAGE: 'Sin Imagen Web',
  INCOMPLETE_DATA: 'Ficha Incompleta',
};

const ALL_SUPPORTED_PROVIDERS: ExtendedErpProviderId[] = [
  'factusol',
  'simplygest',
  'agora',
  'sage50',
  'a3erp',
  'sage200',
  'icg',
  'visionwin',
  'aplifisa',
  'odoo',
  'facturascripts',
  'businesscentral',
];

export class CatalogAuditController {
  public static resolveActiveProvider(agent: LocalAgent, reqUrl: URL): ExtendedErpProviderId {
    const requested = (reqUrl.searchParams.get('provider') || reqUrl.searchParams.get('erpType') || '').trim().toLowerCase() as ExtendedErpProviderId;
    if (ALL_SUPPORTED_PROVIDERS.includes(requested)) {
      return requested;
    }
    return agent.erpRegistry.getActiveProviderId() as ExtendedErpProviderId;
  }

  public static async buildAuditReport(agent: LocalAgent, reqUrl: URL) {
    const t0 = performance.now();
    const providerId = this.resolveActiveProvider(agent, reqUrl);
    const profile = ERP_AUDIT_PROFILES[providerId] || ERP_AUDIT_PROFILES.factusol;
    const connector = agent.erpRegistry.getConnector(providerId as SupportedErpProviderId);
    const cfg = agent.configManager.get();

    const forceDemo = reqUrl.searchParams.get('demo') === '1' || reqUrl.searchParams.get('demo') === 'true';
    const isEvalMode =
      forceDemo ||
      Boolean((cfg as any).evaluationMode?.enabled) ||
      Boolean((cfg.softwareErp?.providers as any)?.[providerId]?.evaluationMode) ||
      (typeof (connector as any).isEvaluationMode === 'function' && Boolean((connector as any).isEvaluationMode()));

    const dbPath = connector.getDatabasePath() || '';
    const isConfigured = isEvalMode || connector.isConfigured();
    const isConnected = isEvalMode || connector.isDatabaseAccessible();

    let rawArticles: Array<ErpCatalogArticle & { _demoHasImage?: boolean }> = [];
    let dataSourceMode: 'live' | 'demo' | 'unconfigured' = 'live';

    const allDemoBase: Record<ExtendedErpProviderId, ErpCatalogArticle[]> = {
      ...DEMO_ARTICLES_BY_ERP,
      ...EXTENDED_DEMO_ARTICLES_BY_ERP,
    };

    if (isEvalMode) {
      dataSourceMode = 'demo';
      const baseDemo = (allDemoBase[providerId] || DEMO_ARTICLES_BY_ERP.factusol).map((a) => ({
        ...a,
        _demoHasImage: true,
      }));
      const extraAnomalies = DEMO_ANOMALIES_BY_ERP[providerId] || DEMO_ANOMALIES_BY_ERP.factusol;
      rawArticles = [...baseDemo, ...extraAnomalies];
    } else if (!isConfigured || !isConnected) {
      dataSourceMode = 'unconfigured';
      rawArticles = [];
    } else {
      try {
        if (typeof connector.getArticlesForCatalog === 'function') {
          rawArticles = await connector.getArticlesForCatalog(2500, true);
        }
        if (!rawArticles || rawArticles.length === 0) {
          const preview = await connector.getPreviewArticles(500);
          rawArticles = preview.map((p) => ({
            code: p.code,
            name: p.description,
            family: p.family,
            stock: p.stock,
            price: p.salePrice ?? 0,
            costPrice: p.costPrice ?? 0,
            barcode: p.ean,
            description: p.description,
          }));
        }
      } catch {
        dataSourceMode = 'unconfigured';
        rawArticles = [];
      }
    }

    const imageResolver =
      dataSourceMode === 'live'
        ? new UniversalErpImageResolver({
            providerId,
            databasePath: dbPath,
            customPhotosPath: (cfg.factusol as any)?.customPhotosPath,
          })
        : null;

    const issues: CatalogAuditIssueItem[] = [];
    let countZeroPrice = 0;
    let countBelowCost = 0;
    let countNegativeStock = 0;
    let countMissingImage = 0;
    let countIncompleteData = 0;
    let healthyArticlesCount = 0;

    for (const item of rawArticles) {
      const code = String(item.code || '').trim();
      const name = String(item.name || item.description || '').trim();
      const family = String(item.family || '').trim();
      const stock = Number(item.stock ?? 0);
      const price = Number(item.price ?? 0);
      const costPrice = Number(item.costPrice ?? 0);
      const barcode = String(item.barcode || '').trim();

      let hasImage = false;
      if (dataSourceMode === 'demo') {
        hasImage = item._demoHasImage !== false;
      } else if (imageResolver) {
        const resolvedImg = imageResolver.resolveProductImage({
          sku: code,
          barcode,
          rawSourceData: item.raw,
        });
        hasImage = Boolean(resolvedImg && resolvedImg.exists);
      }

      const itemIssues: CatalogIssueType[] = [];

      if (!Number.isFinite(price) || price <= 0) {
        itemIssues.push('ZERO_PRICE');
        countZeroPrice++;
      } else if (Number.isFinite(costPrice) && costPrice > 0 && price < costPrice) {
        itemIssues.push('BELOW_COST');
        countBelowCost++;
      }

      if (!Number.isFinite(stock) || stock < 0) {
        itemIssues.push('NEGATIVE_STOCK');
        countNegativeStock++;
      }

      if (!hasImage) {
        itemIssues.push('MISSING_IMAGE');
        countMissingImage++;
      }

      if (!name || name.length < 3 || !family || !barcode) {
        itemIssues.push('INCOMPLETE_DATA');
        countIncompleteData++;
      }

      if (itemIssues.length === 0) {
        healthyArticlesCount++;
        continue;
      }

      const primaryIssue: CatalogIssueType = itemIssues[0]!;
      const severity: CatalogIssueSeverity =
        itemIssues.includes('ZERO_PRICE')
          ? 'critical'
          : itemIssues.includes('BELOW_COST') || itemIssues.includes('NEGATIVE_STOCK')
            ? 'warning'
            : 'info';

      const rem = profile.remediationByIssue[primaryIssue];

      issues.push({
        code: code || 'SIN-CODIGO',
        name: name || 'Artículo sin descripción',
        family: family || '---',
        stock,
        price,
        costPrice,
        barcode: barcode || '---',
        hasImage,
        issueTypes: itemIssues,
        primaryIssue,
        severity,
        issueLabels: itemIssues.map((t) => ISSUE_LABELS[t]),
        remediationHint: rem.hint,
        erpTableRef: rem.tableRef,
      });
    }

    const severityRank: Record<CatalogIssueSeverity, number> = { critical: 0, warning: 1, info: 2 };
    issues.sort((a, b) => {
      const rankDiff = severityRank[a.severity] - severityRank[b.severity];
      if (rankDiff !== 0) return rankDiff;
      return a.code.localeCompare(b.code);
    });

    const totalInspected = rawArticles.length;
    let healthScore = 100;
    if (totalInspected > 0) {
      const weightedPenalty =
        (countZeroPrice * 1.0 +
          countBelowCost * 0.75 +
          countNegativeStock * 0.7 +
          countMissingImage * 0.35 +
          countIncompleteData * 0.25) /
        totalInspected;
      healthScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(weightedPenalty, 1)) * 100)));
    }

    const durationMs = Math.round((performance.now() - t0) * 10) / 10;

    return {
      success: true,
      auditedAt: new Date().toISOString(),
      durationMs,
      providerId,
      erpDisplayName: profile.displayName,
      erpEngineLabel: profile.engineLabel,
      erpTablesInspected: profile.tablesInspected,
      databasePath: isEvalMode ? `DEMO://${providerId.toUpperCase()}` : dbPath,
      dataSourceMode,
      isConfigured,
      isConnected,
      summary: {
        totalInspected,
        healthyArticlesCount,
        affectedArticlesCount: issues.length,
        healthScore,
        countsByType: {
          ZERO_PRICE: countZeroPrice,
          BELOW_COST: countBelowCost,
          NEGATIVE_STOCK: countNegativeStock,
          MISSING_IMAGE: countMissingImage,
          INCOMPLETE_DATA: countIncompleteData,
        },
      },
      issues: issues.slice(0, 500),
    };
  }

  public static async handleAuditJson(agent: LocalAgent, req: http.IncomingMessage, res: http.ServerResponse) {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const report = await this.buildAuditReport(agent, reqUrl);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(report));
  }

  public static async handleAuditCsv(agent: LocalAgent, req: http.IncomingMessage, res: http.ServerResponse) {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const report = await this.buildAuditReport(agent, reqUrl);
    const escCsv = (val: unknown): string => {
      const s = String(val ?? '').replace(/\r?\n/g, ' ').trim();
      if (s.includes(';') || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers = [
      'Software ERP',
      'Codigo SKU',
      'Descripcion Articulo',
      'Familia',
      'Stock Actual',
      'PVP Tarifa (EUR)',
      'Precio Coste (EUR)',
      'Codigo Barras EAN',
      'Foto Detectada',
      'Severidad',
      'Incidencias Detectadas',
      'Tabla / Campo ERP',
      'Ruta de Correccion en ERP',
    ];

    const rows = report.issues.map((it) => [
      escCsv(report.erpDisplayName),
      escCsv(it.code),
      escCsv(it.name),
      escCsv(it.family),
      escCsv(it.stock),
      escCsv(it.price.toFixed(2).replace('.', ',')),
      escCsv(it.costPrice.toFixed(2).replace('.', ',')),
      escCsv(it.barcode),
      escCsv(it.hasImage ? 'SI' : 'NO'),
      escCsv(it.severity === 'critical' ? 'CRITICO' : it.severity === 'warning' ? 'ADVERTENCIA' : 'AVISO'),
      escCsv(it.issueLabels.join(' + ')),
      escCsv(it.erpTableRef),
      escCsv(it.remediationHint),
    ].join(';'));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `auditoria-catalogo-${report.providerId}-${dateStamp}.csv`;

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(csvContent);
  }
}
