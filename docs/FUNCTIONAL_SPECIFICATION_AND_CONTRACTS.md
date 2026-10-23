# Registro Maestro de Funcionalidades y Contratos Inmutables — Bentian ERP Bridge & Suministros Rubio

> **PROPÓSITO DE ESTE DOCUMENTO:**
> Este archivo constituye el inventario funcional completo y de referencia obligatoria del ecosistema **Bentian ERP Bridge** y **Suministros Rubio**. Cualquier cambio de código, refactorización o nueva funcionalidad debe respetar el 100% de los contratos aquí descritos y superar la validación automática (`pnpm run verify:features` y `pnpm run quality:check` con Gate 10).

---

## 1. Agente de Escritorio Windows (`BentianAgent.exe` + `BentianTray.exe` + GUI `:39281`)

### 1.1. Servidor Local y Blindaje Anti-CSRF (`MiniRouter` — Puerto Fijo `39281`)
* **Puerto Fijo Inmutable:** Escucha exclusivamente en `http://127.0.0.1:39281` con 12 reintentos de 500ms para tolerar estados `TIME_WAIT` en reinicios o actualizaciones. Prohibido cambiar de puerto.
* **Contrato Anti-CSRF para Peticiones del Navegador (`Origin` / `Sec-Fetch-Site`):**
  1. Toda petición desde la ventana de Microsoft Edge (`--app=http://127.0.0.1:39281`) a `/api/local/*` o `/v1/*` debe incluir la cabecera `X-Bentian-Token` (inyectada automáticamente desde `<meta name="bentian-token">` por el interceptor global `window.fetch` en `core.script.ts`).
  2. **Regla crítica de `POST` / `PUT`:** `MiniRouter` exige estrictamente `Content-Type: application/json` en cualquier petición `POST` o `PUT` que incluya cabecera `Origin` (de lo contrario devuelve `HTTP 415 Unsupported Media Type`).
  3. Tanto el interceptor global `window.fetch` en `core.script.ts` como cada llamada `fetch(..., { method: 'POST' })` en los scripts del GUI deben enviar siempre `Content-Type: application/json` y cuerpo JSON válido (`'{}'` cuando no hay payload).
  4. **Excepción System Tray (`BentianTray.exe`):** Las llamadas desde `BentianTray.exe` (C# local sin cabeceras `Origin` ni `Sec-Fetch-Site`) son aceptadas directamente por `MiniRouter` desde `127.0.0.1`.

### 1.2. Catálogo Completo de Endpoints Locales (`gui-server.ts`)
| Método | Ruta | Controlador | Función / Contrato |
| :--- | :--- | :--- | :--- |
| `GET` | `/`, `/index.html` | `GuiController.serveDashboard` | Renderiza la interfaz completa del Centro de Control con token CSRF efímero. |
| `GET` | `/api/local/status`, `/v1/status` | `StatusController.getStatus` | Estado completo: licencia, ERP activo, ruta DB, canal web, métricas y logs. |
| `GET` | `/api/local/preflight` | `StatusController.getPreflight` | Diagnóstico Pre-Flight: `cscript.exe`, driver OLEDB Access, deriva de reloj NTP y red/NAS. |
| `GET` | `/api/local/live-health`, `/v1/live-health` | `StatusController.getLiveHealth` | Telemetría de salud en vivo y estado de conectores. |
| `GET` | `/api/local/export-diagnostic` | `StatusController.exportDiagnostic` | Descarga paquete JSON sanitizado para soporte técnico. |
| `GET` | `/health`, `/api/local/health` | `handleHealthCheck` | Responde `{ status: 'OK', agentVersion }` para control de instancia única y updater. |
| `GET/POST` | `/api/local/open-file-dialog`, `/api/local/browse-factusol-db` | `FactusolController.openNativeFileDialog` | Abre `OpenFileDialog` nativo de Windows (`TopMost = true`, hilo STA) y persiste la ruta elegida en `agent-config.json`. |
| `POST` | `/api/local/detect-factusol` | `FactusolController.detectFactusol` | Escanea discos locales y unidades de red mapeadas (`HKCU\Network`) buscando `.accdb`/`.mdb`. |
| `POST` | `/api/local/test-factusol` | `FactusolController.testFactusol` | Verifica conexión OLEDB con Factusol, cuenta artículos/pedidos y guarda ruta en disco. |
| `POST` | `/api/local/resolve-factusol-path` | `FactusolController.resolvePath` | Resuelve una carpeta (ej. `C:\Software DELSOL\Factusol\Datos\FS`) al archivo `.accdb` del ejercicio más reciente. |
| `GET` | `/api/local/factusol/metadata` | `FactusolController.getMetadata` | Devuelve tarifas (`F_TAR`), almacenes (`F_ALM`) y series de Factusol. |
| `GET` | `/api/local/factusol/preview` | `FactusolController.getPreview` | Vista previa paginada de artículos reales con stock (`DISSTO`) y precio. |
| `GET/POST` | `/api/local/open-file-dialog-simplygest` | `SimplyGestController.openNativeFileDialog` | Selector nativo de archivos para SimplyGest. |
| `POST` | `/api/local/detect-simplygest` | `SimplyGestController.detectSimplyGest` | Auto-detección de instalaciones locales de SimplyGest. |
| `POST` | `/api/local/test-simplygest` | `SimplyGestController.testSimplyGest` | Prueba de lectura de catálogo SimplyGest. |
| `GET/POST` | `/api/local/detect-sql-instances` | `SqlErpController.detectSqlInstances` | Escaneo de instancias SQL Server locales (Ágora POS, Sage 50, a3ERP). |
| `POST` | `/api/local/test-sql-erp` | `SqlErpController.testSqlErp` | Prueba de conexión T-SQL o activación de Modo Evaluación Sandbox. |
| `POST` | `/api/local/test-universal-bridge` | `ChannelController.testUniversalBridge` | Verifica `erp-bridge-endpoint.php?action=ping` y guarda `storeUrl` y `secretKey`. |
| `POST` | `/api/local/test-woocommerce` | `ChannelController.testWooCommerce` | Verifica REST API v3 de WooCommerce y persiste credenciales. |
| `POST` | `/api/local/test-shopify` | `ChannelController.testShopify` | Verifica Admin API de Shopify. |
| `POST` | `/api/local/test-prestashop` | `ChannelController.testPrestashop` | Verifica Webservice API de PrestaShop. |
| `POST` | `/api/local/test-holded` | `ChannelController.testHolded` | Verifica API Key de Holded. |
| `GET/POST` | `/api/local/download-companion` | `ChannelController.downloadCompanion` | Genera y descarga `erp-bridge-endpoint.php` preconfigurado con la clave secreta del agente. |
| `POST` | `/api/local/sync-now` | `SyncController.syncNow` | Ejecuta un ciclo inmediato de sincronización bidireccional (`triggerManualSync(true)`). |
| `POST` | `/api/local/upload-catalog` | `SyncController.uploadCatalog` | Sube catálogo e imágenes (`factusolImg`) de Factusol a la tienda web. |
| `GET` | `/api/local/history` | `SyncController.getHistory` | Historial de ciclos de sincronización ejecutados. |
| `GET` | `/api/local/sales-orders` | `SalesOrdersController.getOrders` | Libro de pedidos web recibidos e insertados en el ERP. |
| `POST` | `/api/local/sales-orders/:id/retry` | `SalesOrdersController.retryOrder` | Reintenta la inserción en Factusol de un pedido fallido. |
| `POST` | `/api/local/simulate-test-order` | `SalesOrdersController.simulateTestOrder` | Simula un pedido de prueba extremo a extremo. |
| `POST` | `/api/local/activate-license` | `LicenseController.activateLicense` | Vincula la clave `EB-XXXXX-...` con el `HWID` del equipo contra `bridge.cristianjm.com`. |
| `POST` | `/api/local/claim-beta-license` | `LicenseController.claimBetaLicense` | Solicita clave de evaluación de 15 días desde el asistente. |
| `POST` | `/api/local/save-full-config` | `SystemController.saveFullConfig` | Guardado completo Zero-Loss en `%APPDATA%\Bentian Agent\agent-config.json`. |
| `GET/POST` | `/api/local/check-update` | `SystemController.checkUpdate` | Consulta `/releases/latest.json` en `bridge.cristianjm.com`. |
| `POST` | `/api/local/apply-update` | `SystemController.applyUpdate` | Descarga instalador, verifica SHA-256 + firma Ed25519 y lanza `UpdateSwapper`. |

### 1.3. Motores Autónomos y Tiempos de Estabilidad Fijos e Inmutables
Los siguientes tiempos y reglas de ejecución están **fijados por arquitectura y bloqueados en la interfaz** para evitar desconfiguraciones u olvidos del cliente:
1. **Inicio Automático con Windows (`AutoStartService`):**
   - **Siempre Activo e Incondicional:** Se registra automáticamente en `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\BentianAgent` tanto durante la instalación (`builder/installer.iss`) como en cada arranque del agente (`LocalAgent.start()`), ejecutándose minimizado en la bandeja del sistema (`--minimized`).
2. **Vigilante en Tiempo Real (`FileWatcherCoordinatorService`):**
   - **Siempre Activo (`enableFileWatcher: true`).**
   - **Tiempo de Estabilización (Debounce OLEDB):** **`5 segundos` fijos (`5000 ms`)** tras cada guardado en Factusol (con ventana mínima de `30 segundos` entre ráfagas) para permitir que Microsoft Access libere los bloqueos antes de consultar.
   - Al detectar un cambio, registra `Cambio detectado en Factusol (...). Sincronizando stock...`, ejecuta `triggerManualSync(false)` y registra en la consola `✓ Sincronización completada...` al concluir.
3. **Sondeo Bidireccional Periódico (`LocalSyncEngine.startAutoSyncLoop`):**
   - **Ciclo de Pedidos y Stock:** **`Cada 30 segundos` fijos (`30000 ms`)** comprobando pedidos nuevos en la tienda web, cancelaciones de pedidos para reponer stock en Factusol y cambios de stock con *dirty-checking* (`lastUniversalBridgeStock`).
   - **Barrido Periódico de Seguridad:** **`Cada 15 minutos` fijos (`periodicIntervalMinutes: 15`)**.
4. **Disparo Inicial Tras Arranque (*Install & Plug*):**
   - **`3 segundos` fijos (`3000 ms`)** después de iniciar el agente.
5. **Rollover Fiscal Anual Automático (`FactusolYearResolver`):**
   - Si Factusol crea un nuevo archivo al cambiar de año (ej. `2262025.accdb` ➔ `2262026.accdb`), el agente conmuta automáticamente la ruta activa y la persiste en `agent-config.json`.
6. **Persistencia Atómica Zero-Loss (`ConfigManager`):**
   - Guarda siempre en `%APPDATA%\Bentian Agent\agent-config.json` mediante escritura atómica (`.tmp` + `renameSync`) y copia `.bak`. Nunca borra rutas NAS/UNC aunque estén desconectadas al arrancar.

---

## 2. Servidor Central, Licencias y Cloud Dashboard (`https://bridge.cristianjm.com`)

### 2.1. Parque de Licencias Protegidas en Producción (`LicenseCleanupService`)
Las siguientes **3 licencias reales** están protegidas por lista blanca inmutable (`PROTECTED_LICENSE_KEYS` en `apps/api/src/services/license-cleanup.service.ts`) y **JAMÁS** pueden ser eliminadas:
1. **`EB-8WEN2-W08N2-8KJAW-0AHCH`** — *Servidor Factusol Principal* (Equipo vinculado: `Telkkalas`).
2. **`EB-S6AB3-2MHWP-50DTT-72242`** — *Suministros Rubio - Tienda y Factusol (De por vida)* (Equipo vinculado: `DESKTOP-2730DUT`).
3. **`EB-6RE3E-HXPS4-XYNRV-HVZWT`** — *Beta 2026 - Soy.es* (Cliente: Raúl y equipo, `info@nicripsia.com`, Evaluación 15 días con auto-curación `INSERT ... ON CONFLICT (key) DO NOTHING` al arranque del servidor).

### 2.2. Alertas Comerciales y Operativa del Dashboard (`/dashboard/`)
* **Alerta Email de Primera Activación (`notifyFirstMachineActivation`):**
  - Cuando cualquier licencia real (no `[TEST]`) se vincula por primera vez a un equipo Windows en `POST /api/v1/licenses/activate`, el servidor envía inmediatamente un correo a `cristianjimeneztrabajo@gmail.com` con el nombre del cliente, su email de contacto, la clave, el `hostname` del PC y el `HWID`.
* **Columnas y Acciones en el Parque de Licencias (`licenses.js` + `licenses-modals.js`):**
  - Muestra el **email de contacto del cliente** debajo del nombre/alias.
  - Muestra los **días restantes de evaluación** o fecha de vencimiento junto a la modalidad.
  - Botón **`Reenviar`** (`POST /api/v1/licenses/:id/resend-email`): reenvía al correo del cliente su clave y el enlace directo a `https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe`.
  - Botones **`Desvincular PC`**, **`Eliminar`** individual (`DELETE /api/v1/licenses/:id`) y **`Purgar obsoletas`** (`POST /api/v1/licenses/cleanup-obsolete`).
* **Modularidad y Estética B2B Sobria:**
  - Todos los módulos en `apps/api/public/dashboard/{js,views,modals,layout}` y `apps/api/public/partners/` cumplen el límite estricto `<= 250 LOC` y el estilo grafito sobrio (`#12151e` / `#171b26`, tipografía tabular blanca, cero emojis decorativos).

---

## 3. Tienda Suministros Rubio (`https://www.suministrosrubio.com`)

* **Endpoint Oficial del Conector Universal:**
  - `https://www.suministrosrubio.com/erp-bridge-endpoint.php` (siempre con `www.` para evitar redirección `301` sin cabeceras).
  - Acciones soportadas: `ping`, `push_stock`, `pull_orders`, `ack_orders`, `pull_cancelled_orders`, `push_catalog`, `upload_image`.
* **Base de Datos Factusol Vinculada:**
  - Archivo activo: `2262026.accdb` en el equipo `DESKTOP-2730DUT` (5.378 artículos sincronizados con imágenes en `factusolImg`).
* **Arquitectura de Tienda Directa (Angular):**
  - Toda la navegación de productos dirige directamente a `/articulos` (o `/tienda`), redirigiendo `/categorias` a `/articulos`.

---

## 4. Cómo Ejecutar la Comprobación Completa de Funcionalidades

Siempre que se realice cualquier cambio en el proyecto, deben ejecutarse estos dos comandos:

1. **Auditoría de Calidad + Contratos Estáticos (10 Gates):**
   ```powershell
   pnpm run quality:check
   ```
2. **Verificación Funcional E2E y Salud en Vivo (Local + Producción):**
   ```powershell
   pnpm run verify:features
   ```
