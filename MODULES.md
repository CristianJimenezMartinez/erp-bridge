# Arquitectura Modular y Manifiesto de Congelación de Código

> **DOCUMENTO MANDATARIO PARA DESARROLLADORES Y AGENTES DE IA**  
> Este documento define el mapa de módulos de **Bentian ERP Bridge**, su ciclo de vida formal y las normas inviolables de congelación arquitectónica (*Code Freeze*).

---

## 1. Ciclo de Vida Formal de los Módulos

Cada paquete o subsistema se encuentra clasificado en uno de los siguientes 4 estados:

| Estado | Significado | Regla de Modificación |
| :--- | :--- | :--- |
| **`FROZEN`** | **Módulo sellado y certificado al 100%.** Libre de errores, con tests de integración exhaustivos pasando en entornos reales y protegido por Hash SHA-256 inmutable. | **PROHIBIDO EDITAR.** Cualquier cambio debe realizarse extendiendo por la capa superior (Decoradores, Adaptadores o Middleware). |
| **`STABLE`** | **Módulo maduro en producción.** Contratos públicos estables y tests unitarios completos. | Permitidas adiciones retrocompatibles y correcciones de bugs menores. |
| **`EXPERIMENTAL`** | **En desarrollo activo.** Diseños o integraciones nuevas sujetas a iteración continua. | Libre edición sujeta al paso de tests. |
| **`DEPRECATED`** | **Módulo en retirada.** Marcado para sustitución. | No añadir nuevas funcionalidades. |

---

## 2. Registro Oficial de Módulos

Consultar el archivo canónico [`ARCHITECTURE_MANIFEST.json`](./ARCHITECTURE_MANIFEST.json) para los hashes de integridad en tiempo de compilación.

### Módulos Congelados (`FROZEN`)

#### 1. `connectors.factusol` (`packages/connectors/factusol/src`)
* **Propósito:** Conector del ERP Factusol mediante driver nativo OLEDB (`adodb.js` + `cscript.exe`), transacciones atómicas agrupadas (`BeginTrans`/`CommitTrans`), consultas SQL parametrizadas y truncadas defensivamente, compatibilidad con años fiscales (2025/2026) y cuadre fiscal al céntimo en 4 tramos de IVA.
* **Pruebas de Certificación:** 11 suites de pruebas, incluyendo 4 tests de integración E2E reales contra la base de datos física `2252025.accdb`.
* **Contrato Público:** `packages/connectors/factusol/src/index.ts`
* **Directriz de Congelación:** **NO TOCAR.** Si se desea soportar otro ERP o modificar el formato de pedidos, implementar un nuevo conector bajo la interfaz `Connector` de `@erp-bridge/sdk`.

#### 2. `core.licensing` (`packages/core/src/license`)
* **Propósito:** Generador y validador de claves canónicas (`EB-XXXXX-XXXXX-XXXXX-XXXXX`), tokens criptográficos HMAC-SHA256, período de gracia offline de 7 días (168h) y vinculación con la huella digital del hardware (HWID).
* **Pruebas de Certificación:** `license-key.test.ts`, `license-token.test.ts`, `license-service.test.ts`.
* **Contrato Público:** `packages/core/src/license/index.ts`

#### 3. `core.update.signer` (`packages/core/src/update/update-signer.ts`)
* **Propósito:** Firmado asimétrico y verificación criptográfica de binarios ejecutables de Windows mediante curvas elípticas Ed25519 y sumas de verificación SHA-256.
* **Pruebas de Certificación:** `update-service.test.ts`, `auto-updater.test.ts`.
* **Contrato Público:** `packages/core/src/update/update-signer.ts`

#### 4. `agent.update.swapper` (`apps/agent/src/update/update.swapper.ts`)
* **Propósito:** Intercambio atómico de ejecutables en Windows. Se desacopla en `%TEMP%`, eleva privilegios mediante UAC (`Start-Process -Verb RunAs`) si el destino es `Program Files`, detiene procesos bloqueantes, reemplaza el binario y monitoriza 10 segundos de estabilidad con rollback automático a `.bak` si hay crash.
* **Pruebas de Certificación:** `update-system.test.ts`.

#### 5. `agent.config.persistence` (`apps/agent/src/config/config.manager.ts`)
* **Propósito:** Persistencia atómica e inmutable en JSON estructurado en `%APPDATA%\Bentian Agent\agent-config.json` mediante archivos `.tmp` y reemplazo atómico seguro con backup defensivo `.bak` (sin motor SQLite). Implementa la regla Anti-Wiping para preservar rutas NAS (`\\NAS\...`) y unidades mapeadas (`Z:\...`) cuando la red no responde en el inicio.
* **Pruebas de Certificación:** `config-persistence.test.ts`, `nas-dialog-e2e.test.ts`.

#### 6. `agent.gui.native_dialog` (`apps/agent/src/gui/window-launcher.ts` y `apps/agent/src/gui/tray/BentianTray.cs`)
* **Propósito:** Selector oficial de archivos nativo de Windows (`OpenFileDialog`) en hilo STA de Windows Forms y fallback de PowerShell puro sin compilación en caliente. Emplea un formulario auxiliar invisible como owner con `TopMost = true`, `WindowState = Minimized` y `ShowInTaskbar = false` sin llamar jamás a `.Show()` ni fijar `Opacity = 0`. Elimina 100% las ventanas fantasma, evita bloqueos modales interproceso (*cross-process deadlocks*) con Microsoft Edge y garantiza apertura instantánea (<30 ms) en primer plano.
* **Pruebas de Certificación:** `gui-router.test.ts`, verificación nativa Win32 STA.
* **Contrato Público:** `apps/agent/src/gui/window-launcher.ts`

#### 7. `agent.erp` (`apps/agent/src/erp`)
* **Propósito:** Registro y adaptadores polimórficos de proveedores ERP mediante el patrón Strategy (`IErpConnector`, `ErpProviderRegistry`, `SqlServerBaseAdapter`) para los 5 ERPs oficiales en España (Factusol, SimplyGest, Ágora POS, Sage 50, a3ERP) con Modo Evaluación Sandbox.
* **Pruebas de Certificación:** `erp-provider-strategy.test.ts`, `multi-erp-milestones.test.ts`.
* **Contrato Público:** `apps/agent/src/erp/index.ts`

#### 8. `connectors.woocommerce` (`packages/connectors/woocommerce/src`)
* **Propósito:** Conector oficial WooCommerce REST API v3 con mapeo canónico bidireccional de productos, stock disponible (`DISSTO` anti-sobreventas), tarifas, variantes padre-hijo (tallas/colores) y descarga de pedidos.
* **Pruebas de Certificación:** `woocommerce-mapper.test.ts`, `woocommerce-order-mapper.test.ts`, `woocommerce-stock.test.ts`, `woocommerce-variations.test.ts`.
* **Contrato Público:** `packages/connectors/woocommerce/src/index.ts`

#### 9. `connectors.simplygest` (`packages/connectors/simplygest/src` y `apps/agent/src/services/sql-erp-enhancer.service.ts`)
* **Propósito:** Conector triple para SimplyGest (tablas físicas DBISAM `articulos.dat`, `Datos.mdb` OLEDB y SimplyGest Server REST `:56985`) y motor de transacciones T-SQL atómicas (`BEGIN TRAN / COMMIT` con `UPDLOCK, HOLDLOCK`) para Ágora POS, Sage 50 y a3ERP.
* **Pruebas de Certificación:** `read-products.spec.ts`, `multi-erp-milestones.test.ts`.
* **Contrato Público:** `packages/connectors/simplygest/src/index.ts`

#### 10. `agent.factusol.resolver_detector` (`apps/agent/src/detector.ts` y `apps/agent/src/factusol/factusol.resolver.ts`)
* **Propósito:** Escaneo de unidades locales y unidades de red mapeadas del usuario en `HKCU\Network` (`W:`, `X:`, `Y:`, `Z:`), montaje automático en sesión elevada UAC, resolución UNC y normalización del directorio padre limpio para `OpenFileDialog`.
* **Pruebas de Certificación:** `gui-router.test.ts`, `nas-dialog-e2e.test.ts`.
* **Contrato Público:** `apps/agent/src/factusol/factusol.resolver.ts`

#### 11. `agent.lifecycle.zero_loss` (`apps/agent/src/lifecycle/config-applier.service.ts`, `apps/agent/src/status/status-aggregator.service.ts`, `apps/agent/src/license/license.service.ts`)
* **Propósito:** Guardado garantizado Zero-Loss de configuración en AppData preservando secretos enmascarados (`••••••••••••`), invalidación instantánea de caché al activar licencia y auto-recuperación del token desde `agent-config.json` en el arranque.
* **Pruebas de Certificación:** `gui-router.test.ts`, `config-persistence.test.ts`.
* **Contrato Público:** `apps/agent/src/lifecycle/config-applier.service.ts`

#### 12. `agent.gui.server_security` (`apps/agent/src/gui/gui-server.ts` y `apps/agent/src/gui/router/mini-router.ts`)
* **Propósito:** Servidor HTTP local en el puerto fijo inmutable `39281` con tolerancia a `TIME_WAIT` (8 reintentos sin port-hopping), validación de token de sesión `X-Bentian-Token` y blindaje Anti-CSRF (`Origin`, `Referer`, `Host`, `Sec-Fetch-Site`).
* **Pruebas de Certificación:** `gui-router.test.ts`.
* **Contrato Público:** `apps/agent/src/gui/gui-server.ts`

#### 13. `agent.sync.images` (`apps/agent/src/sync/image-sync.service.ts` y `apps/agent/src/sync/universal-erp-image.resolver.ts`)
* **Propósito:** Resolución automática de fotografías de productos en los 5 ERPs (Factusol, SimplyGest, Ágora POS, Sage 50 y a3ERP) y sincronización incremental por lotes con caché MD5 para evitar re-subidas innecesarias.
* **Pruebas de Certificación:** `multi-erp-milestones.test.ts`.
* **Contrato Público:** `apps/agent/src/sync/image-sync.service.ts`

---

## 3. Módulos Estables de Producción y Dashboard Canónico

* **`cloud.api` + Dashboard Oficial (`apps/api/src` + `apps/api/public/dashboard`):**  
  Panel web maestro en producción (HTML5 + Tailwind + Vanilla JS) para monitorización en vivo de flota de agentes, resolución de mudanzas de PC (`unbind`), administración de licencias y pasarela de facturación Stripe.
* **`agent.gui` (`apps/agent/src/gui`):**  
  Servidor web local (puerto fijo 39281) con interfaz responsive y bandeja nativa C# (`BentianTray.exe`), control de instancia única mediante sondeo activo de `/health` y debounce de 2.5s (sin named pipe).
* **`connectors.woocommerce` (`packages/connectors/woocommerce`):**  
  Conector REST API certificado contra WooCommerce v3.
* **`connectors.simplygest` (`packages/connectors/simplygest`):**  
  Conector local OLEDB nativo para SimplyGest Desktop (`Datos.mdb`). Sincronización de catálogo, stock multi-tarifa, variantes de tallas/colores e inyección atómica de pedidos en `PEDIDOS_VENTA`.
* **`agent.erp` (`apps/agent/src/erp`):**  
  Registro y adaptadores polimórficos de proveedores ERP mediante el patrón Strategy (`IErpConnector`, `ErpProviderRegistry`). Desacopla el motor de sincronización de las bases de datos relacionales subyacentes, garantizando el modelo de aprovisionamiento exclusivo (*Single Active ERP*) y persistencia aislada en AppData.

---

## 4. Estrategia de Motores de Sincronización y Extensiones

* **Dualidad de Motores de Sincronización:**
  1. **`LocalSyncEngine` (`apps/agent/src/sync/sync.engine.ts`):** Motor de producción exclusivo para puestos de clientes en Windows. Interactúa directamente con el driver OLEDB 32 bits de Factusol (`F_ART`, `F_STO`, `F_PCL`), observador reactivo de archivos (`AccdbFileWatcher`) y el conector universal web.
  2. **Motores de Sincronización en Core (`packages/core/src/engine`):** Preservados como la infraestructura base desacoplada para futuros ERPs sobre Linux o APIs cloud-to-cloud (Odoo, Holded, SAP).
* **Conectores como Extensiones:**
  - **`connectors.prestashop` (`packages/connectors/prestashop`):** Conector Webservice XML preservado para clientes con tiendas PrestaShop.
  - **Conectores Multi-ERP en Roadmap:** Sage 50 / 200, Odoo y A3ERP (Wolters Kluwer).

---

## 5. Protocolo para Extender Módulos Congelados

Cuando se requiera una nueva funcionalidad que interactúe con un módulo congelado:

1. **Patrón Adaptador / Fachada:** Envolver la llamada al módulo congelado desde una clase superior sin modificar los archivos internos del módulo.
2. **Eventos y Hooks:** Consumir eventos del `EventBus` o suscribirse a las emisiones de estado.
3. **Desbloqueo de Emergencia (`--allow-frozen-edit`):**  
   Si se descubre un fallo crítico de seguridad que requiera alterar un módulo congelado, se debe ejecutar:
   `node scripts/quality-gate.ts --allow-frozen-edit <module-id>`
   y recalcular inmediatamente el hash en `ARCHITECTURE_MANIFEST.json` tras superar todos los tests de regresión.
