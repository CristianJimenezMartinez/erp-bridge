# Instrucciones y Reglas de Trabajo Mandatarias - Bentian ERP Bridge & Suministros Rubio

> **AVISO CRÍTICO PARA TODOS LOS AGENTES DE IA (ACTUALES Y FUTUROS):**
> Este documento contiene las decisiones arquitectónicas, lecciones aprendidas y reglas de blindaje del proyecto. Están prohibidas las desviaciones o cambios basados en suposiciones ("pensar X"). Estas reglas deben seguirse siempre sin excepción.

---

## 1. Persistencia de Configuración del Agente (Regla de AppData)
* **Ubicación obligatoria e inmutable:** La configuración del agente (`agent-config.json`) y el historial local deben guardarse **ÚNICAMENTE** en:
  `%APPDATA%\Bentian Agent\agent-config.json` (o equivalente en `process.env.APPDATA`).
* **Motor de Almacenamiento Local (JSON Atómico Certificado):** El almacenamiento local del agente se realiza exclusivamente mediante ficheros JSON estructurados con escritura atómica (`.tmp` + `fs.renameSync`) y respaldo defensivo `.bak`. Queda prohibido afirmar la existencia de un motor SQLite local no implementado; la persistencia verificada es JSON atómico en AppData con protección anti-wiping.
* **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido intentar escribir `agent-config.json` ni archivos de estado en el directorio del ejecutable (`process.execPath`, ej: `C:\Program Files\Bentian Agent\`). En Windows, los usuarios estándar carecen de permisos de escritura allí, lo que genera errores `EPERM` silenciados y pérdida total de datos al reiniciar.
* **Escritura atómica:** Toda escritura en disco debe realizarse escribiendo primero en un fichero temporal (`.tmp`) y realizando un reemplazo atómico (`fs.renameSync`).

---

## 2. Preservación de Rutas NAS y de Red (Anti-Wiping)
* **PROHIBICIÓN ESTRICTA:** **JAMÁS** borrar, limpiar (`""`) o sanitizar destructivamente una ruta de base de datos (`dbPath`) configurada por el usuario porque `fs.existsSync(dbPath)` devuelva `false` o tarde en responder durante el arranque.
* **Comportamiento en caídas de red:** Si una unidad de red mapeada (`Z:\...`), una ruta UNC (`\\NAS_EMPRESA\...`) o un recurso compartido no responde en el inicio, el agente debe marcar su estado interno como **"Desconectado / Offline"**, pero la ruta debe permanecer grabada en disco en `%APPDATA%`.
* **Soporte UNC:** Todo el código del conector Factusol, `AccessDriver`, `cscript.exe` y `adodb.js` debe soportar rutas UNC nativas de Windows con espacios y caracteres especiales.

---

## 3. Selector de Archivos Nativo de Windows (Prohibición de Modales Web)
* **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido volver a crear o reintroducir exploradores de archivos web / modales HTML para navegar por carpetas en Windows.
* **Mecanismo único y exclusivo:** Toda búsqueda de archivos de Factusol en el GUI debe invocar directamente el diálogo nativo oficial de Windows (`OpenFileDialog`):
  1. Vía primaria: `BentianTray.exe --open-file-dialog` ejecutado en hilo STA.
  2. Vía fallback: Script nativo de PowerShell STA (`System.Windows.Forms.OpenFileDialog`).
* **Foco en primer plano obligatorio (`TopMost = true`):** La ventana de selección de archivos debe asociarse siempre a un formulario oculto con `TopMost = true` para que aparezca por delante del navegador y nunca quede oculta detrás de la ventana del usuario.
* **Manejo de cancelación:** Si el usuario cancela la ventana de selección, el sistema debe retornar cadena vacía de inmediato sin disparar fallbacks redundantes ni abrir segundas ventanas.

---

## 4. Instancia Única y Proceso de Actualización Silenciosa
* **Instancia única blindada:** Se utiliza comprobación de proceso y verificación activa del puerto HTTP `39281` (`/health` y `/api/local/open-gui`) con cerrojo de arranque y *debounce* de 2.5 segundos (en lugar de cerrojos hipotéticos por named pipe). Prohibido permitir múltiples procesos en ejecución o bifurcaciones de ventana al abrir con permisos de Administrador.
* **Actualización atómica externa (`UpdateSwapper`):**
  - Un ejecutable en ejecución en Windows nunca debe intentar sobrescribirse a sí mismo dentro de su propio proceso en `Program Files` (provoca `EPERM`).
  - Las actualizaciones deben delegarse **SIEMPRE** a un proceso desacoplado (`UpdateSwapper`) ejecutado desde `%TEMP%\bentian-updates\`.
  - Debe matar previamente los procesos bloqueantes (`BentianAgent.exe`, `BentianTray.exe`), solicitar elevación UAC con `Start-Process -Verb RunAs` si el destino está protegido, sustituir el archivo y monitorizar 10 segundos de estabilidad con rollback automático a `.bak` si hay crash.

---

## 5. Polling de la GUI y Respeto a los Formularios
* **PROHIBICIÓN ESTRICTA:** Las llamadas periódicas de telemetría (`fetchStatus` cada 3 segundos) tienen **prohibido** sobrescribir el valor de campos de texto (`<input>`), selectores de tarifas o casillas de verificación mientras el usuario los esté editando o tengan el foco (`document.activeElement`).
* La renderización de métricas en vivo (CPU, RAM, logs) debe estar completamente desacoplada de la inicialización de los controles de formulario.

---

## 6. Tienda Web de Suministros Rubio (Arquitectura de Tienda Directa)
* **Tienda directa, NO catálogo:** La sección/pantalla intermedia de `/categorias` fue retirada permanentemente por carecer de fotos en Factusol y generar fricción comercial.
* **Ruta canónica de productos:** Toda la navegación del usuario (inicio, botones, menús) debe dirigir directamente a `/articulos` (o `/tienda`), donde los artículos disponen de fotos reales, selector de medidas/variantes, precios con IVA y botón de carrito.
* **Redirección:** Cualquier petición a `/categorias` debe ser redirigida transparentemente a `/articulos`.
* **Subida a Plesk:** El usuario sube los archivos de Angular compilados (`API/web/web/dist/fedeweb/browser`) **A MANO** al Administrador de Archivos de Plesk. Nunca asumir que el servidor web se actualiza solo.

---

## 7. Reglas de Red, Dominios y curl
1. **PROHIBIDO ejecutar `curl -s "https://suministrosrubio.com/..."`**:
   - `suministrosrubio.com` redirige con un código `301 Moved Permanently` a `https://www.suministrosrubio.com`.
   - `curl -s` sin `-L` no sigue la redirección y devuelve un log completamente vacío ("Empty log").
   - La URL oficial SIEMPRE lleva las tres `www`: `https://www.suministrosrubio.com/erp-bridge-endpoint.php`.
   - Para probar en terminal, usar SIEMPRE:
     `curl.exe -i -L -k "https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping"`
     o bien `Invoke-RestMethod -Uri "https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping" -MaximumRedirection 5`.
2. **Prohibición total de DuckDNS:**
   - DuckDNS (`suministrosrubios.duckdns.org`) queda **TOTALMENTE PROHIBIDO**. Todo el tráfico va por HTTPS directo a `www.suministrosrubio.com`.
3. **Servidor Central de Bentian:**
   - La API central y distribución de releases reside en `https://bridge.cristianjm.com`.

---

## 8. Identidad de Git Obligatoria
* Todo commit en cualquier repositorio debe llevar el siguiente autor:
  `CristianJimenezMartinez <cristianjimeneztrabajo@gmail.com>`

---

## 9. Blindaje y Congelación de Módulos ("Code Freeze & Sealed Modules")
* **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido modificar, refactorizar, renombrar o eliminar cualquier archivo listado como `status: "FROZEN"` en `ARCHITECTURE_MANIFEST.json` o documentado como sellado en `MODULES.md`.
* **Módulos Sellados Oficiales:**
  1. `packages/connectors/factusol/src` (Conector Factusol OLEDB, transacciones y motor relacional).
  2. `packages/core/src/license` (Licencias, tokens HMAC y HWID).
  3. `packages/core/src/update/update-signer.ts` (Firmas asimétricas Ed25519).
  4. `apps/agent/src/update/update.swapper.ts` (UpdateSwapper atómico en Windows).
  5. `apps/agent/src/config/config.manager.ts` (Persistencia en AppData y Anti-Wiping NAS).
  6. `apps/agent/src/gui/tray/BentianTray.cs` y `apps/agent/src/gui/window-launcher.ts` (Selector nativo OpenFileDialog y Launcher de escritorio).
* **Mecanismo de Extensión Obligatorio:** Si una nueva característica requiere interactuar con un módulo congelado, se debe extender exclusivamente mediante la capa superior (Decoradores, Adaptadores o Middleware), pero **JAMÁS** editar el código interno del módulo congelado.
* **Integridad Criptográfica Inquebrantable:** El Quality Gate (`pnpm run quality:check`) incluye el Gate 7 que calcula el hash SHA-256 del árbol de cada módulo congelado. Cualquier alteración de un solo byte fallará inmediatamente la compilación impidiendo el commit o despliegue.

---

## 10. Puerto Fijo Inmutable de GUI (Anti Port-Hopping)
* **Puerto Único y Obligatorio:** El servidor HTTP local de la interfaz gráfica del agente debe escuchar **ÚNICAMENTE** en el puerto `39281` (`http://127.0.0.1:39281`).
* **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido saltar a puertos alternativos (`39282`, `39283` o puertos dinámicos) ante un error `EADDRINUSE`. Los accesos directos de Windows, el System Tray (`BentianTray.exe`) y los navegadores llaman de forma canónica a `39281`.
* **Tolerancia a TIME_WAIT:** Al reiniciar el proceso, si el puerto se encuentra en `TIME_WAIT`, el agente debe reintentar con backoff exponencial (8 reintentos de 500ms) sin bifurcar de puerto jamás.

---

## 11. Ventana Nativa de Escritorio Aislada (Modo App Edge & Anti-Ghost Window)
* **Prioridad #1 Microsoft Edge (`msedge.exe`):** En Windows 10 y 11, el agente debe invocar primordialmente Microsoft Edge con flags `--app=http://127.0.0.1:39281 --new-window --window-size=1180,820`. Esto evita mezclarse con pestañas abiertas de Google Chrome del usuario, previene el *Foreground Lockout* de Windows 11 y proporciona una ventana independiente con su propia barra de tareas.
* **PROHIBICIÓN ESTRICTA DE FORMULARIOS FANTASMA Y BLOQUEOS CRUZADOS:** En el selector de archivos (`OpenFileDialog`), queda terminantemente prohibido instanciar formularios auxiliares (`new Form()`) con `.Show()` o `Opacity = 0`. Asimismo, queda terminantemente prohibido pasar como owner un handle foráneo (`GetForegroundWindow()`) perteneciente al proceso de Microsoft Edge, ya que produce un bloqueo modal interproceso (*cross-process modal deadlock*) de 120s. El diálogo debe asociarse a un `owner = new Form()` invisible del mismo proceso e hilo STA con `TopMost = true`, `WindowState = Minimized` y `ShowInTaskbar = false` sin invocar jamás `.Show()`, garantizando apertura instantánea en <30ms por delante de Edge, cero parpadeos, cero ventanas fantasma y fallback en PowerShell puro sin compilación dinámica de C#.

---

## 12. Identidad Visual Completa de la GUI (Favicon, Manifest e Iconos Nativos)
* **Metadatos Web App Obligatorios:** El servidor HTTP local debe exponer `/favicon.ico` (binario oficial `icon.ico`), `/manifest.json` (Web App Manifest con `display: standalone` e icono declarado) y `/api/local/icon` (SVG oficial).
* **Cabecera HTML:** Toda plantilla HTML servida debe declarar en `<head>`: `<link rel="icon">`, `<link rel="manifest">`, `<meta name="theme-color">` y `<meta name="application-name">`.
* **Carga Inicial Garantizada:** El script de polling en el frontend nunca debe cancelar la carga inicial si `document.hidden` es `true`. El flag `_initialFetchCompleted` debe asegurar que los datos del sistema, Factusol y licencia se pinten siempre desde el primer arranque.

---

## 13. Sincronización Automática de Versiones y Fuente Única de Verdad (SSoT Anti-Hardcoding)
* **PROHIBICIÓN ESTRICTA DE HARDCODING DE VERSIONES EN EL FRONTEND:**
  - Queda terminantemente prohibido escribir nombres de instalador con versión fija (ej: `Bentian-Setup-v0.3.2.exe`) o versiones fijas en enlaces `<a>` o textos HTML de la landing page (`apps/api/public/index.html`) o del panel de control (`apps/api/public/dashboard/index.html`).
* **Punteros Permanentes e Inmutables en Servidor (`/releases/latest/`):**
  - Todos los botones de descarga de la web pública y del panel de control deben apuntar **exclusivamente** a las rutas canónicas fijas del servidor:
    * Instalador oficial: `/releases/latest/Bentian-Setup.exe`
    * Instalador ZIP: `/releases/latest/Bentian-Setup.zip`
    * Versión Portable ZIP: `/releases/latest/BentianAgent-Portable.zip`
  - El servidor de producción (`bridge.cristianjm.com`) y el script de despliegue (`scripts/upload-releases.js`) sincronizan automáticamente estos punteros con la última release. El usuario jamás descargará una versión obsoleta y los enlaces nunca se rompen.
* **Inyección Dinámica Semántica en Cliente (`version-sync.js`):**
  - Toda visualización de versión en el DOM debe realizarse mediante data-attributes semánticos:
    * `[data-app-version]`: Renderiza la versión dinámica activa (ej: `v0.3.4`).
    * `[data-download-installer]`, `[data-download-zip]`, `[data-download-portable]`: Enlazan a las rutas canónicas de descarga.
    * `[data-installer-sha256]`, `[data-agent-sha256]`, `[data-agent-size]`: Inyectan sumas criptográficas y tamaño en MB.
  - El script `apps/api/public/js/version-sync.js` consulta `/releases/latest.json` con `{ cache: 'no-cache' }` y actualiza el DOM en caliente mediante `MutationObserver`.
* **Despliegue y Subida de Versión Atómica:**
  - Toda nueva versión debe publicarse exclusivamente mediante `node builder/build.js [patch|minor|major] [--deploy]`.
  - Este script actualiza atómicamente la versión en los 12 archivos `package.json` del monorepo, genera los instaladores, hashes SHA-256, firma criptográfica Ed25519 en `manifest.json`, sincroniza `version-sync.js` y pre-renderiza el HTML para SEO.
* **Aislamiento Estricto de Configuración en Tests de Agente:**
  - Toda prueba de testing en `apps/agent` tiene prohibido modificar o ensuciar el archivo de configuración real del usuario en `%APPDATA%\Bentian Agent\agent-config.json`.
  - Se debe utilizar siempre `process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json')` y limpiar la variable de entorno en el bloque de teardown (`delete process.env.BENTIAN_CONFIG_PATH`).

---

## 14. Propiedad y Estado Permanente de Google Search Console
* **Propietario Verificado Oficial:** Cristian Jiménez Martínez es el propietario oficial verificado en Google Search Console para las propiedades `cristianjm.com` (propiedad de dominio) y `https://bridge.cristianjm.com/` (propiedad de URL con icono de Bentian).
* **Sitemap Oficial Activo:** El sitemap `https://bridge.cristianjm.com/sitemap.xml` ya está enviado, vinculado y en procesamiento por Google Search Console con todas sus URLs canónicas.
* **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido volver a preguntar al usuario si tiene acceso a Google Search Console, si es el propietario o si ha enviado el sitemap. El agente debe asumir siempre que la propiedad está activa, verificada y que el usuario cuenta con los accesos completos de administración.

---

## 15. Arquitectura de Seguridad Criptográfica, Aislamiento de Claves y Protección Multi-Tenant
* **Aislamiento Estricto de Claves Privadas:**
  - Las claves privadas de firma (`update-private.pem`, `license-signing-private.pem`) tienen **PROHIBIDO** residir dentro del repositorio o en directorios sincronizados en la nube (Google Drive, OneDrive, etc.).
  - Deben custodiarse exclusivamente en `%USERPROFILE%\.bentian-secrets\` con permisos restringidos de Windows (`icacls`).
  - Al ejecutar `builder/build.js --deploy`, el script debe abortar de inmediato si la clave privada no existe; queda terminantemente prohibido publicar releases a producción con firmas fallback simuladas.
* **Prueba Asimétrica de Licencia Ed25519 (Anti Clock-Rollback):**
  - El periodo de gracia offline del Agente se valida exclusivamente mediante una prueba criptográfica firmada asimétricamente por la API con Ed25519 (`LicenseProofService`).
  - El Agente verifica la firma contra la clave pública embebida inmutable (`DEFAULT_LICENSE_PROOF_PUBLIC_KEY`). Queda prohibido depender de comparaciones simples de fecha local para validar licencias en modo offline.
* **Blindaje Anti-TOCTOU en Actualizaciones (`UpdateSwapper`):**
  - Todo reemplazo atómico de binarios debe copiar primero el nuevo ejecutable a la carpeta de destino (`.new`) y verificar su suma SHA-256 (`Get-FileHash`) contra el manifiesto firmado antes de detener procesos o modificar archivos existentes.
  - En elevaciones UAC para carpetas protegidas (`Program Files`), el script PowerShell debe pasarse codificado en Base64 en memoria (`-EncodedCommand`), quedando prohibido depender de archivos `.bat` o `.ps1` ubicados en `%TEMP%` que puedan ser manipulados por procesos locales no privilegiados.
* **Aislamiento Multi-Tenant Estricto (`resolveOrgId`):**
  - Solo los roles `SUPERADMIN` y `ADMIN` pueden consultar organizaciones arbitrarias mediante `x-organization-id` o `?organizationId=`.
  - Para cualquier otro rol (`RESELLER`, `TENANT_CLIENT`, `OPERATOR`), la API debe forzar siempre la organización asignada a su propio token JWT (`resolveOrgId`).
  - Un `RESELLER` solo puede emitir licencias `trial` de hasta 15 días y 1 asiento, exclusivamente para organizaciones vinculadas a su `reseller_id`.
* **Cerrojo Concurrente de Activaciones (`withKeyedLock`):**
  - Toda llamada a `/licenses/activate` debe serializarse mediante exclusión mutua en memoria indexada por clave de licencia para prevenir carreras concurrentes que eludan el límite de `maxActivations`.
* **Skill Oficial de Seguridad:**
  - Consulta `.agent/skills/bentian-security-architecture/SKILL.md` para el desglose exhaustivo de arquitectura, runbooks de pruebas y procedimientos de despliegue seguro.


---

## 16. Auditoría de Seguridad 2026-10-06 y Playbook de Remediación (LEER ANTES DE TOCAR SEGURIDAD)
* **Documentos oficiales:** `erp-bridge/docs/security/SECURITY_AUDIT_2026-10-06.md` (hallazgos API-/AGT-/INF-) y `erp-bridge/docs/security/GEMINI_REMEDIATION_PLAYBOOK.md` (tareas P0→P3 con criterios de aceptación y tabla de estado). Todo trabajo de seguridad debe partir del playbook y actualizar su tabla de estado.
* **Prioridad P0 abierta:** clave privada de actualizaciones expuesta en el historial de un repo público (INF-001), path traversal en `/releases/latest/:filename`, endpoints sin autenticación (`/sync/run-reactive`, `/notifications/order`) y endpoint PHP universal. No ejecutar rotación de claves, force-push ni despliegues a producción sin confirmación expresa del propietario.
* **Honestidad documental:** Documentación veraz y certificada: el control de instancia única opera mediante comprobación de proceso y verificación activa del puerto HTTP 39281 (`/health`) con debounce de 2.5s (sin named pipe); y el almacenamiento persistente local es JSON atómico en AppData (`%APPDATA%\Bentian Agent\agent-config.json`) con reemplazo seguro anti-wiping y backup (sin motor SQLite). Se prohíbe prometer capacidades arquitectónicas no respaldadas en código.
* **El Quality Gate no mide seguridad:** una nota ≥ 9,5 no implica ausencia de vulnerabilidades. Los módulos FROZEN solo se mitigan por capa superior.

---

## 17. Ciclo de Vida y Limpieza Obligatoria de Subagentes (Anti-Zombies & Anti-Hang)
* **Terminación Inmediata Obligatoria:**
  - Cuando un subagente entrega su informe o concluye la tarea asignada, el agente principal tiene **PROHIBIDO** dejarlo en estado `idle` o `waiting_for_dependents`.
  - Debe llamar inmediatamente a `manage_subagents` con `Action: 'kill'` (o `Action: 'kill_all'` si completó la ronda de delegación) para destruir el proceso y liberar memoria en el host.
* **Prohibición de Bloqueos por Tareas en Background en Subagentes:**
  - Los subagentes tienen prohibido emitir respuestas de cierre mientras tengan tareas de fondo (`task-xxx`) en ejecución o quedar a la espera indefinida de procesos dependientes. Deben monitorizar la finalización de sus comandos de test o compilación antes de enviar su reporte final.
* **Higiene Operativa del Entorno:**
  - Siempre que se trabaje con subagentes, el agente principal debe auditar el estado con `manage_subagents(Action: 'list')` y `manage_task(Action: 'list')` al terminar la tarea, garantizando que queden exactamente **0 subagentes huérfanos y 0 tareas colgadas**.

---

## 18. Paridad Estricta de Versiones en Documentación y SSoT Anti-Drift
* **PROHIBICIÓN ESTRICTA DE DESFASES DE VERSIÓN:**
  - Queda terminantemente prohibido que existan páginas de documentación (`/docs/*`), hubs de ciudades (`/conector-factusol/*`), metadatos estructurados (`schema-org.html`), landing pages o guías con números de versión desactualizados respecto al `package.json` raíz.
* **Sincronización y Compilación Automática Obligatoria:**
  - Toda subida de versión (`node builder/build.js [patch|minor|major]` o `node builder/version.js [patch|minor|major|set]`) y el comando `node builder/version.js sync` ejecutan obligatoria y atómicamente:
    1. Sincronización de `version-sync.js`, `schema-org.html` (`softwareVersion` y `mpn`), `02-hero.html`, `beta/index.html` y badges `[data-app-version]`.
    2. Compilación completa de la landing page (`apps/api/scripts/build-landing.ts`).
    3. Compilación completa del dashboard de clientes (`apps/api/scripts/build-dashboard.ts`).
    4. Regeneración de todas las páginas de ciudades (`apps/api/scripts/generate-city-pages.ts`).
    5. Recompilación de todas las páginas y manuales del Centro de Documentación (`apps/api/scripts/build-docs.ts`).
* **Blindaje en Quality Gate (Gate 6 Anti-Drift):**
  - El Gate 6 del Quality Gate (`pnpm run quality:check`) audita automáticamente la paridad al 100% entre los 12 archivos `package.json`, `version-sync.js`, `schema-org.html`, `index.html`, `dashboard/index.html`, `docs/index.html` y escanea todo el directorio de documentación pública bloqueando el commit si detecta cualquier versión anterior o desactualizada.
* **Mantenimiento Dual Mandatario:**
  - Cualquier actualización a las reglas debe aplicarse de forma estrictamente simultánea en `AGENTS.md` y `GEMINI.md`.

