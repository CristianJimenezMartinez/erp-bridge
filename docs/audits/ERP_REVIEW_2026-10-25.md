# Revisión de código de los 12 ERP — 2026-10-25

Revisión **solo por lectura de código** (un revisor por ERP). Nada se ha probado contra un ERP real.
Leyenda: `[ ]` pendiente · `[x]` corregido · 🔒 módulo FROZEN (requiere descongelar o capa superior) · ❓ no verificable sin ERP real.

Ya corregido antes de esta revisión (commit `9d8038c`): BC `/api/v2.0`, rollback de líneas BC, Odoo SKU inexistente + idempotencia, aviso repetido de URL, columnas Sage 200 (`EjercicioPedido`, `ObservacionesPedido`).

---

## 0. Fallos transversales (varios ERP)

- [ ] **T1 Falso éxito**: sin número de pedido real se devuelve `success:true` con número inventado (reloj). Afecta: Ágora 🔒, Sage 50 🔒, a3ERP 🔒, Sage 200, ICG, Visionwin, Aplifisa, FacturaScripts, SimplyGest 🔒.
- [ ] **T2 Stock multiplicado con almacén `GEN`**: el `UPDATE` afecta a todos los almacenes del artículo. Afecta: Ágora 🔒, Sage 50 🔒, a3ERP 🔒, Sage 200, ICG, Visionwin, Aplifisa.
- [ ] **T3 Errores tragados** (`catch → []`): un fallo parece "catálogo vacío / stock 0" y puede despublicar la tienda. Afecta: todos.
- [ ] **T4 Idempotencia por `notes` (texto libre)**: dos pedidos con la misma nota se fusionan. Afecta: Sage 200, ICG, Visionwin, Aplifisa.
- [ ] **T5 Cliente equivocado** (primer cliente de la tabla o código fijo). Afecta: Sage 50 🔒, a3ERP 🔒, Sage 200, ICG, Visionwin, Aplifisa, FacturaScripts, Business Central.
- [ ] **T6 Esquemas incoherentes** entre perfil, builder y modo Access. Afecta: ICG, Visionwin, Aplifisa, Sage 200.
- [ ] **T7 Lote T-SQL en variable de entorno** (~32 000 car. ⇒ ~30-50 líneas) y timeouts de 5-6 s. Afecta: todos los SQL (`sql-server-query.runner.ts` 🔒).
- [ ] **T8 Sin paginación** (truncado silencioso). Afecta: Odoo, FacturaScripts, Business Central.
- [ ] **T9 `sanitizeWarehouseCode`/`cleanSqlText`: escapa y luego trunca** (puede dejar una `'` suelta). Afecta: perfiles SQL 🔒 (`sql-server-profiles.ts`) y `erp-extensions`.
- [ ] **T10 Cantidad `||1`**: cantidad 0 pasa a 1; `NaN`/negativos sin validar. Afecta: todos.
- [ ] **T11 Catálogo ignora tarifa/almacén configurados** (valores fijos `1`/`'01'`). Afecta: Ágora, Sage 50, a3ERP, Sage 200, ICG, Visionwin, Aplifisa, Odoo.
- [ ] **T12 Catálogo con filas duplicadas** (JOIN sin agregar por almacén/talla). Afecta: Sage 200, ICG, Aplifisa, Ágora, a3ERP.

---

## 1. Factusol 🔒 (se va a descongelar)

- [ ] **F1 ALTO** Cambio de ejercicio: `getStockMap`, `testConnection`, `getArticleCount`, `getMetadata`, `getPreviewArticles` abren la ruta configurada (año viejo) y no la resuelta por `FactusolYearResolver`. Desde enero el stock reactivo sale del año anterior.
- [ ] **F2 ALTO** Stock distinto entre catálogo (suma DISSTO de todos los almacenes) y stock reactivo (`ALMSTO = almacén OR 'GEN'`); fallback sin filtro de almacén.
- [ ] **F3 ALTO** `product.handler.ts` hace `.catch(() => [])`: si falla stock/tarifas, precio 0 ⇒ `draft` y stock 0 sin señal de error.
- [ ] **F4 ALTO** `createOrder` reintenta hasta 5 veces tras cualquier error (incl. timeout con SIGKILL): riesgo de pedido duplicado y doble descuento. La idempotencia solo se comprueba antes del bucle.
- [ ] **F5 ALTO** `series` y `warehouse` de `createOrder` se ignoran con conector existente; series por defecto incoherentes (`'W'`, `'1'`, `' '`); `FactusolService` no lee `softwareErp.providers.factusol.*`.
- [ ] **F6 MEDIO** `updateOrderStatus`: reposición de stock no idempotente (cancelar/reembolsar dos veces suma dos veces) y usa serie de config.
- [ ] **F7 MEDIO** Decremento de stock sin comprobar filas afectadas ni `DISSTO >= qty`.
- [ ] **F8 MEDIO** IVA/cabecera fijos (`CPAPCL='724'`, tipos 21/10/4, canarios por CP); sin CIF ⇒ `CODCLI=1` (❓ que exista).
- [ ] **F9 MEDIO** Ruta offline devuelve mapa/lista vacíos (el anti-wiping de `dbPath` está bien); distinguir "offline" de "vacío".
- [ ] **F10 MEDIO** `sanitizeDatabasePath` rechaza `;` y `=` (válidos en carpetas de Windows).
- [ ] **F11 MEDIO** Un `cscript.exe` por operación, timeout fijo 30 s, sin cola ni mutex.
- [ ] **F12 MEDIO** `tryCandidates` reintenta la transacción completa y el `catch` vacío oculta el error original.
- [ ] **F13 BAJO** Preview usa ACTSTO sin sumar almacenes (no coincide con lo enviado a la web).
- [ ] **F14 BAJO** Consultas de tarifas repetidas. · [ ] **F15 BAJO** `MEMLPC` sin límite (❓ literales >255 en Jet). · [ ] **F16 BAJO** Log de `databasePath` en vez de `activeDbPath`.
- [ ] **F17 PENDIENTE** Revisar `apps/agent/src/sync/*` y `factusol.resolver.ts` (no se pudieron leer).

## 2. SimplyGest 🔒

- [ ] **S1 CRÍTICO** Modo `.dat`: los pedidos nunca llegan a SimplyGest (solo espejo JSON/CSV) y se devuelve éxito; puede sobrescribir `pedidosc.dat` vacío con JSON.
- [ ] **S2 CRÍTICO** Modo `.dat`: lectura de catálogo/stock desde espejo sembrado con datos inventados (49,9 / 25 / 10, artículos demo); `tryOdbcDbisamQuery` siempre devuelve `null`.
- [ ] **S3 CRÍTICO** Modo REST: ignora `res.ok`, descarta líneas y stock, contrato `{rawSql, rawValues}` ❓; devuelve éxito.
- [ ] **S4 CRÍTICO** Modo REST: cliente fijo "Cliente Web SimplyGest", errores tragados (idempotencia y numeración rotas).
- [ ] **S5 ALTO** Idempotencia por subcadena (`WC-1` coincide con `WC-10`). · [ ] **S6 ALTO** Referencia truncada a 50 al insertar pero no al buscar.
- [ ] **S7 ALTO** `MAX(NUMERO)+1` sin cerrojo (❓ columna texto). · [ ] **S8 ALTO** Serie y almacén ignorados.
- [ ] **S9 ALTO** Si falla `createCustomer` el pedido sigue con cliente `'1'`; `MAX(CODIGO)` con `Number()`.
- [ ] **S10 ALTO** Sonda ODBC ejecuta la SQL real y cachea `odbcAvailable=false` de por vida. · [ ] **S11 ALTO** Escribe en el directorio del ERP sin comprobar permisos, `catch` vacíos.
- [ ] **S12–S18 MEDIO/BAJO** Lógica duplicada adapter/enhancer; métodos sin envolver; redondeo de stock; descuento directo de `ARTICULOS.STOCK` (❓ doble descuento); `order.date` string lanza `TypeError`; `readOrders` sin filtrar líneas por pedido; `readProducts` traga errores; metadatos fijos.

## 3. Ágora POS 🔒

- [ ] **A1 ALTO** Stock descontado en todos los almacenes con `GEN` (y rama `.mdb` sin filtro).
- [ ] **A2 ALTO** Contraseña SQL reutilizada como `Api-Token` y enviada en claro por HTTP.
- [ ] **A3 ALTO** Posible duplicado: API HTTP OK + inserción en `.mdb`; timeout HTTP cae al INSERT SQL.
- [ ] **A4 MEDIO** Escape y truncado en orden incorrecto (`sanitizeWarehouseCode`, `cleanSqlText`). · [ ] **A5 MEDIO** `qty` negativo/`Infinity`/`NaN`.
- [ ] **A6 MEDIO** Clamp silencioso del stock, sin `@@ROWCOUNT`. · [ ] **A7 MEDIO** Catálogo fija almacén 1 y tarifa 1.
- [ ] **A8 MEDIO** Variable de entorno ~32 K y timeouts; `safeRef='WC-'` constante hace que pedidos sin referencia se tomen por duplicados.
- [ ] **A9 MEDIO** Lecturas O(n²) y errores tragados. · [ ] **A10 ❓** Esquema (`SaleItem`, `PriceList`, `WarehouseStock`, `CustomerOrder*`) sin verificar.
- [ ] **A11–A14 BAJO** `NULL` sin `ISNULL`; codificación OEM; `String.replace` con `$'`; regex Jet frágil.

## 4. Sage 50 🔒

- [ ] **P1 ALTO** Éxito falso si no existen `c_pediven`/`c_pedive` (COMMIT sin insertar, `NULL`). · [ ] **P2 ALTO** Stock en todos los almacenes con `GEN`/`01`; se escribe en `final` (❓ debería ser `reservado`).
- [ ] **P3 ALTO** Catálogo grande ⇒ `[]` por `maxBuffer` 1 MB y timeouts.
- [ ] **P4 MEDIO** Variable de entorno ~32 K. · [ ] **P5 MEDIO** Cliente = primer cliente de la tabla. · [ ] **P6 MEDIO** `@Empresa` de un pedido cualquiera; `MAX(numero)` sin filtrar empresa.
- [ ] **P7 MEDIO** Catálogo ignora tarifa/almacén. · [ ] **P8 MEDIO** Autodetección de BD puede escribir en `2024_backup`; reintenta escrituras.
- [ ] **P9 MEDIO** Ruta `.mdb` con valores fijos y sin bloqueo. · [ ] **P10–P12 BAJO** SKU truncado a 20; `NaN`; codificación; ruta base muerta. · [ ] **P13 ❓** Esquema.

## 5. a3ERP 🔒

- [ ] **E1 ALTO (SEGURIDAD)** Inyección de comandos PowerShell en el puente ActiveX: valores (SKU, referencia, notas, cliente) dentro de comillas dobles de PowerShell (`$(...)` se ejecuta).
- [ ] **E2 ALTO** Comillas SQL rotas en `sp_executesql` (`LINEPEV`): apóstrofes en SKU/descripción rompen el pedido o permiten inyección de 2.º nivel.
- [ ] **E3 ALTO** Cliente arbitrario (primero de `CLIENTES`). · [ ] **E4 ALTO** Éxito falso con `@AssignedNum` nulo.
- [ ] **E5 ALTO** Stock en todos los almacenes con `GEN`. · [ ] **E6 ALTO** Escritura directa en tablas nativas (no actualiza `RESERVADO`, contadores, impuestos) ❓.
- [ ] **E7 MEDIO** Variable de entorno ~32 K. · [ ] **E8 MEDIO** Timeouts 5-6 s en escritura. · [ ] **E9 MEDIO** `HOLDLOCK` bloquea a usuarios; `MAX(NUMDOC)+1` ❓.
- [ ] **E10 MEDIO** ActiveX: timeout cae al INSERT SQL ⇒ duplicado. · [ ] **E11 MEDIO** Catálogo ignora configuración. · [ ] **E12 MEDIO** Errores tragados. · [ ] **E13 MEDIO** Fallback base sin líneas.
- [ ] **E14–E17 BAJO** `String.replace` con `$&`; `NaN`/`||1`; SKU 20 vs 25; stock negativo en preview.

## 6. Sage 200

- [ ] **M1 CRÍTICO** Reserva de stock multiplicada por almacén (falta `CodigoAlmacen` en el `UPDATE`). · [ ] **M2 CRÍTICO** Catálogo/preview duplicados; `Articulos` sin `CodigoEmpresa`.
- [ ] **M3 CRÍTICO** `GEN` enviado tal cual como `CodigoAlmacen`.
- [ ] **M4 ALTO** Idempotencia por `notes`; no filtra serie ni ejercicio. · [ ] **M5 ALTO** Éxito falso con número inventado. · [ ] **M6 ALTO** `MAX+1` propio ❓. · [ ] **M7 ALTO** Cabecera sin `CodigoCliente` (perfil usa `'4300001'`).
- [ ] **M8 ALTO** Autodetección de `CodigoEmpresa` es código muerto (`includes('CodigoEmpresa = 1')` nunca coincide). · [ ] **M9 ALTO** Caché envenenada por error transitorio y sin invalidar al cambiar config (también prefijo BC).
- [ ] **M10 MEDIO** Variable ~32 K. · [ ] **M11 MEDIO** `.mdb` cae en rama Aplifisa. · [ ] **M12 MEDIO** `ALM` suma todos los almacenes. · [ ] **M13 MEDIO** `qty||1`. · [ ] **M14 MEDIO** Errores tragados.
- [ ] **M15–M17 BAJO** Literales sin `N'...'`; pedido sin líneas; perfil vs builder duplicados. · [ ] **M18 ❓** `AcumuladosStock`/`UnidadesReservadas` (¿`AcumuladoStock`?).

## 7. ICG Manager / FrontRetail

- [ ] **I1 ALTO** Columnas perfil ≠ builder (`FECHA` vs `FECHAPEDIDO`, `UNIDADESATOTAL` vs `UNIDADESTOTAL`; `TALLA/COLOR/CODALMACEN`).
- [ ] **I2 ALTO** Reserva escribe `ASIGNADO`; lectura usa `STOCK - ASERVIR`. · [ ] **I3 ALTO** `UPDATE STOCKS` sin `CODALMACEN` ni `COLOR`. · [ ] **I4 ALTO** `GEN→'01'` vs almacenes `'1'/'2'` del perfil.
- [ ] **I5 ALTO** `split('-')` rompe SKU con guiones; `CODARTICULO` INT ❓.
- [ ] **I6 MEDIO** `.mdb` sin rama `icg` (cae en Aplifisa). · [ ] **I7 MEDIO** Catálogo duplica filas por talla/color. · [ ] **I8 MEDIO** `IDTARIFAV=1`/`CODALMACEN='1'` fijos. · [ ] **I9 MEDIO** `CODCLIENTE=1`; nombre no se guarda. · [ ] **I10 MEDIO** Éxito falso. · [ ] **I11 MEDIO** Idempotencia débil.
- [ ] **I12–I14 BAJO** `NaN`; sin `XACT_ABORT`; numeración propia de ICG ❓.

## 8. Visionwin

- [ ] **V1 ALTO** `PEDIDOS_CLI`: perfil (`CLIENTE, NOMBRE_CLI, TOTAL`) ≠ builder/mdb (`NOMBRE_CLIENTE, TOTAL_PEDIDO`). · [ ] **V2 ALTO** `LINEAS_PEDIDOS_CLI`: `IMPORTE` vs `TOTAL, ALMACEN`.
- [ ] **V3 ALTO** Stock con 3 fuentes (`ARTICULOS.STOCK`, `STOCK_ALMACEN.ACTUAL-RESERVADO`, reserva en `STOCK_ALMACEN`). · [ ] **V4 ALTO** Reserva sin filtro de almacén. · [ ] **V5 ALTO** `.mdb` graba `ALMACEN='GEN'`.
- [ ] **V6 MEDIO** Idempotencia por texto libre. · [ ] **V7 MEDIO** Éxito falso. · [ ] **V8 MEDIO** Jet: alias duplicado y `DESCRIPCION` vs `NOMBRE`. · [ ] **V9 MEDIO** Jet `GROUP BY`. · [ ] **V10 MEDIO** Tarifas/almacenes ignorados. · [ ] **V11 MEDIO** `MAX+1` sin bloqueo en `.mdb`. · [ ] **V12 MEDIO** `qty||1`.
- [ ] **V13–V18 BAJO** Escape/truncado; cliente `'00001'`; `BAJA=0` vs `ISNULL`; esquema ❓ (todo).

## 9. Aplifisa

- [ ] **L1 ALTO** Tres esquemas distintos (perfil `CODCLI,NOMCLI,TOTALPED` vs builder `NOMCLI,TOTAL`; `CODALM`; catálogo `NOMART/FAMART/STOCKACTUAL` vs Jet `DESCRIPCION/CODFAM/STOCK`).
- [ ] **L2 ALTO** Reserva `RESERVADO` en todos los almacenes. · [ ] **L3 ALTO** `GEN` no se traduce en `.mdb`. · [ ] **L4 ALTO** `readStock` en `.mdb` roto (`ISNULL` anidado).
- [ ] **L5 MEDIO** Idempotencia por `notes`. · [ ] **L6 MEDIO** `.mdb` no atómico/serializado. · [ ] **L7 MEDIO** Cliente perdido/fijo. · [ ] **L8 MEDIO** Fallback silencioso. · [ ] **L9 MEDIO** Sin validar SKU/líneas. · [ ] **L10 MEDIO** Almacén `'01'` fijo en lecturas.
- [ ] **L11–L15 BAJO** `BAJA` NULL; sin `XACT_ABORT`; línea duplicada; rama por defecto engañosa; ❓ recálculo de `RESERVADO`.

## 10. Odoo

- [ ] **O1 ALTO** `getStockMap` ignora almacén y empresa (sin `context`), descarga catálogo completo. · [ ] **O2 ALTO** Sin paginación, timeout 8 s, errores ⇒ `[]` sin log.
- [ ] **O3 ALTO** Idempotencia parcial: la comprobación ya existe pero no es atómica; el partner se crea antes de validar los SKU (partner huérfano, pendiente reordenar); `orderNumber` devuelve el ID numérico y no el `name` (S00012).
- [ ] **O4 ALTO** Impuestos/precio/UoM/descuento sin mapear (IVA doble ❓); redondeo de stock.
- [ ] **O5 ALTO** Perfil SQL de Odoo inutilizable (T-SQL sobre PostgreSQL): eliminar rama.
- [ ] **O6 MEDIO** Auth: `uid` no cacheado, N+1 de `product.product`. · [ ] **O7 MEDIO** `res.json()` sobre HTML. · [ ] **O8 MEDIO** `getCleanBaseUrl` con paths; HTTP en claro. · [ ] **O9 MEDIO** Cliente solo por email `=`. · [ ] **O10 MEDIO** `series`/`warehouse`/`company_id` ignorados. · [ ] **O11 MEDIO** Catálogo sin `sale_ok`/`type`; `ODO-<id>` no resoluble.
- [ ] **O12–O15 BAJO** Credenciales en errores; BD por defecto incoherente; `Math.max(0)`.

## 11. FacturaScripts

- [ ] **FS1 CRÍTICO** `createOrder` sin idempotencia. · [ ] **FS2 CRÍTICO** `codcliente` fallback `'000001'`. · [ ] **FS3 CRÍTICO** Falso éxito: número `Date.now()` si no hay código real; no valida `error` en cuerpo 200.
- [ ] **FS4 ALTO ❓** Endpoint `/api/3/crearPedidoCliente` no confirmado (alternativa `pedidoclientes` + `linea_pedido_clientes`). · [ ] **FS5 ALTO** Sin paginación (`offset`). · [ ] **FS6 ALTO** Solo una variante por producto.
- [ ] **FS7 ALTO** Errores tragados. · [ ] **FS8 ALTO** `getStockMap` ignora almacén; catálogo usa `stockfis`.
- [ ] **FS9 MEDIO** Token vacío sin validar; HTTP en claro. · [ ] **FS10 MEDIO** Timeout 8 s fijo, sin diferenciar 429/5xx. · [ ] **FS11 MEDIO** `pvpunitario` con/sin IVA ❓; sin datos fiscales del cliente. · [ ] **FS12 MEDIO** Defaults inventados `'ALG'`/`'A'`. · [ ] **FS13 MEDIO** `Promise.all` ⇒ catálogo vacío si falla una. · [ ] **FS14–FS17 BAJO** Preview pesado; SQL de FS no aplicable (MySQL); `Math.round`.

## 12. Business Central / NAV

- [ ] **B1 ALTO** SQL: prefijo `[CRONUS$...]` fijo; si la autodetección falla escribe en CRONUS; elige la primera empresa; caché obsoleta.
- [ ] **B2 MEDIO-ALTO** Nombre de empresa interpolado: duplicar `]` en vez de eliminarlo.
- [ ] **B3 ALTO** Número de pedido por reloj (colisiones, fuera de `No. Series`). · [ ] **B4 ALTO** Cliente fijo `'10000'` (SQL, OData, perfil).
- [ ] **B5 ALTO ❓** INSERT directo en `Sales Header/Line` sin campos obligatorios (SaaS imposible).
- [ ] **B6 MEDIO** Sin `@odata.nextLink`; `testConnection` cuenta solo 100. · [ ] **B7 MEDIO** `!res.ok` ⇒ `[]` (errores tragados). · [ ] **B8 MEDIO** `cachedCompanyId` sin invalidar; cae a `list[0]` si el nombre no coincide.
- [ ] **B9 MEDIO** Heurística Basic/Bearer (clave WS de 44 car. se envía como Bearer); sin OAuth2 Entra ID. · [ ] **B10 MEDIO** Rollback: timeout en línea no revierte; sin idempotencia por `externalDocumentNumber`. · [ ] **B11 MEDIO** URL SaaS sin tenant/entorno; sin `$select`; `warehouseCode` ignorado.
- [ ] **B12–B17 BAJO** Stock físico no disponible; `PRINCIPAL` suma todo; sin reserva; `External Doc No_` 35 car.; Jet sin rama BC; timeout fijo 8 s con N peticiones.

---

## Orden de ataque propuesto

1. **Capa `erp-extensions` (sin descongelar)**: T1, T2, T4, T5, T6, T9, T10 en Sage 200, ICG, Visionwin, Aplifisa, Odoo, FacturaScripts, Business Central.
2. **Factusol (descongelar)**: F1–F5 primero; luego F6–F12; revisar `sync/*`.
3. **Capa de protección para congelados** (Ágora, Sage 50, a3ERP, SimplyGest): validación de entrada, no éxito sin número real, filtro de almacén.
4. **Decisión del propietario**: E1/E2 (inyección a3ERP) y S1–S4 (SimplyGest `.dat`/REST) requieren tocar módulo congelado y actualizar hash del Gate 7.
5. ❓ **Validar con ERP real**: todos los nombres de tabla/columna de Visionwin, Aplifisa, ICG, Sage 200, Ágora, Sage 50, a3ERP, y el endpoint de pedidos de FacturaScripts.
