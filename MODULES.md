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
* **Propósito:** Persistencia atómica e inmutable en `%APPDATA%\Bentian Agent\agent-config.json` mediante archivos `.tmp` y reemplazo seguro. Implementa la regla Anti-Wiping para preservar rutas NAS (`\\NAS\...`) y unidades mapeadas (`Z:\...`) cuando la red no responde en el inicio.
* **Pruebas de Certificación:** `config-persistence.test.ts`, `nas-dialog-e2e.test.ts`.

---

## 3. Protocolo para Extender Módulos Congelados

Cuando se requiera una nueva funcionalidad que interactúe con un módulo congelado:

1. **Patrón Adaptador / Fachada:** Envolver la llamada al módulo congelado desde una clase superior sin modificar los archivos internos del módulo.
2. **Eventos y Hooks:** Consumir eventos del `EventBus` o suscribirse a las emisiones de estado.
3. **Desbloqueo de Emergencia (`--allow-frozen-edit`):**  
   Si se descubre un fallo crítico de seguridad que requiera alterar un módulo congelado, se debe ejecutar:
   `node scripts/quality-gate.ts --allow-frozen-edit <module-id>`
   y recalcular inmediatamente el hash en `ARCHITECTURE_MANIFEST.json` tras superar todos los tests de regresión.
