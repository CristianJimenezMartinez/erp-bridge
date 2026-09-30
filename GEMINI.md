# Instrucciones y Reglas de Trabajo Mandatarias - Bentian ERP Bridge & Suministros Rubio

> **AVISO CRÍTICO PARA TODOS LOS AGENTES DE IA (ACTUALES Y FUTUROS):**
> Este documento contiene las decisiones arquitectónicas, lecciones aprendidas y reglas de blindaje del proyecto. Están prohibidas las desviaciones o cambios basados en suposiciones ("pensar X"). Estas reglas deben seguirse siempre sin excepción.

---

## 1. Persistencia de Configuración del Agente (Regla de AppData)
* **Ubicación obligatoria e inmutable:** La configuración del agente (`agent-config.json`) debe guardarse **ÚNICAMENTE** en:
  `%APPDATA%\Bentian Agent\agent-config.json` (o equivalente en `process.env.APPDATA`).
* **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido intentar escribir `agent-config.json` o bases de datos SQLite/JSON en el directorio del ejecutable (`process.execPath`, ej: `C:\Program Files\Bentian Agent\`). En Windows, los usuarios estándar carecen de permisos de escritura allí, lo que genera errores `EPERM` silenciados y pérdida total de datos al reiniciar.
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
* **Instancia única blindada:** Se utiliza cerrojo `SingleInstanceLock` con named pipe y *debounce* de 2.5 segundos. Prohibido permitir múltiples ventanas al abrir con permisos de Administrador.
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
