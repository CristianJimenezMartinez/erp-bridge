# Bentian AI Commerce Assistant: Especificación Modular
## Sección 5: Mapeo de Datos Unificado para los 5 ERPs Soportados

Bentian ERP Bridge soporta cinco de los principales ERPs del mercado español. Cada uno almacena sus datos en motores diferentes. El módulo de IA interactúa a través del adaptador unificado aplicando consultas de **sólo lectura no bloqueantes**.

---

### 5.1. Matriz de Mapeo Comparativo por ERP

| Entidad / Campo | 1. Factusol (OLEDB/Access) | 2. SimplyGest (Access/SQL Server) | 3. Sage 50 (MS SQL Server) | 4. Wolters Kluwer a3ERP (MS SQL Server) | 5. Ágora POS (MS SQL Server) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tabla Artículos** | `F_ART` | `ARTICULOS` | `articulo` | `ARTICULO` | `SaleItem` |
| **Código / SKU** | `CODART` | `CODIGO` | `codigo` | `CODART` | `Id` |
| **Nombre** | `DESART` | `NOMBRE` | `nombre` | `DESCART` | `Name` |
| **Familia** | `FAMART` | `FAMILIA` | `familia` | `FAMART` | `FamilyId` |
| **Código de Barras** | `EANART` | `CODBAR` | `codigo_barras` | `CODBAR` | `Barcode` |
| **PVP Base (Sin IVA)**| `F_LTA.PRELTA` (Tarifa 1)| `PVP` (o `PVP1`) | `pvp.pvp` (Tarifa '01') | `PRCVENTA` | `PriceList.MainPrice` |
| **Tipo de IVA** | `F_ART.IART` / `F_IVA` | `TIPOIVA` | `tipo_iva` | `TIPOIVA` | `VatPercent` |
| **Tabla de Stocks** | `F_STO` | `STOCKS` / `ARTICULOS` | `stocks` | `STOCKALM` | `WarehouseStock` |
| **Stock Disponible** | `ACTSTO - RESSTO` (`DISSTO`)| `STOCK - RESERVADO` | `final - reservado` | `UNIDADES - RESERVADO` | `Quantity` |
| **Campo de Coste (PROHIBIDO)**| `PCOART` | `COSTE` / `PCOSTE` | `ult_coste` / `cost_medio` | `PRCCOMPRA` / `PRCCOSTE` | `CostPrice` |
| **Cabecera Pedidos** | `F_PCL` | `PEDIDOS_CLI` | `c_pediven` | `CABEPEV` | `CustomerOrder` |
| **Nº de Pedido** | `NUPPCL` | `NUMERO` | `numero` | `NUMDOC` | `Number` |
| **Email Comprador** | `CLIECL` ➔ `F_CLI.EMACLI` | `EMAIL` / `CLIENTES.EMAIL` | `c_pediven.cliente` ➔ `clientes.email` | `CABEPEV.CODCLI` ➔ `CLIENTES.EMAIL` | `CustomerOrder` ➔ `Customer.Email` |
| **Estado del Pedido**| `ESTPCL` (0=Pend, 1=Serv, 2=Fact) | `ESTADO` | `estado` | `ESTADO` | `Status` |

---

### 5.2. Consultas Técnicas Optimizadas (Lecturas No Bloqueantes)

Para no provocar bloqueos de base de datos (*deadlocks*) mientras se cobra en caja o se emiten albaranes:

#### A) Microsoft SQL Server (Sage 50, a3ERP, Ágora POS)
Se utiliza obligatoriamente la directiva `WITH (NOLOCK)`:

* **Stock en Tiempo Real en Sage 50:**
  ```sql
  SELECT LTRIM(RTRIM(a.codigo)) AS sku,
         LTRIM(RTRIM(a.nombre)) AS name,
         ISNULL(p.pvp, 0) AS salePrice,
         ISNULL(s.final - s.reservado, 0) AS availableStock
  FROM articulo a WITH (NOLOCK)
  LEFT JOIN pvp p WITH (NOLOCK) ON p.articulo = a.codigo AND p.tarifa = '01'
  LEFT JOIN stocks s WITH (NOLOCK) ON s.articulo = a.codigo AND s.almacen = '01'
  WHERE a.codigo = @sku AND a.baja = 0;
  ```

* **Consulta Autenticada de Pedido en a3ERP:**
  ```sql
  SELECT c.NUMDOC AS orderNumber,
         c.FECHA AS orderDate,
         c.TOTDOC AS totalAmount,
         c.ESTADO AS statusCode,
         cli.EMAIL AS buyerEmail
  FROM CABEPEV c WITH (NOLOCK)
  LEFT JOIN CLIENTES cli WITH (NOLOCK) ON cli.CODCLI = c.CODCLI
  WHERE c.NUMDOC = @orderNumber AND LOWER(LTRIM(RTRIM(cli.EMAIL))) = LOWER(@buyerEmail);
  ```

#### B) Microsoft Access / OLEDB (Factusol, SimplyGest)
Se utilizan Recordsets desconectados (`adUseClient`, `adOpenStatic`, `adLockReadOnly`):

* **Stock Disponible en Factusol:**
  ```sql
  SELECT a.CODART, a.DESART, l.PRELTA, (s.ACTSTO - s.RESSTO) AS DISSTO
  FROM (F_ART a
  LEFT JOIN F_LTA l ON (l.ARTLTA = a.CODART AND l.TARLTA = '1'))
  LEFT JOIN F_STO s ON (s.ARTSTO = a.CODART AND s.ALMSTO = 'GEN')
  WHERE a.CODART = ?;
  ```
