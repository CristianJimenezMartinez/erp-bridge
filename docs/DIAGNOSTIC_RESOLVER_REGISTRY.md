# Registro Oficial de Diagnósticos y Resoluciones Guiadas (SSoT) — Bentian Agent

> **Propósito:** Este documento constituye la Fuente Única de Verdad (SSoT) del catálogo de diagnósticos, humanización de incidencias técnicas y acciones guiadas de resolución en Bentian ERP Bridge.
> Siempre que se implemente un nuevo conector, protocolo o verificación técnica, debe registrarse aquí con su código, patrón regex y acción de resolución directa.

---

## 1. Arquitectura del Sistema de Diagnóstico y Resolución

```
  [Evento en Factusol / Web / Sistema]
                   │
                   ▼
       [EventBus (Anti-Flooding)]  ──► Deduplicación consecutiva [×N]
                   │
                   ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                   ERROR_CATALOG (Frontend Engine)               │
  │  Detección por Regex -> Código ERR_* -> Humanización del texto  │
  └────────────────────────┬────────────────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
  [Botón "Resolver" Directo]             [Clic en Fila de Log]
  - Cierra modales auxiliares            - Abre Modal Asistente Humano
  - Navega a targetTab                   - Muestra explicación no técnica
  - Enfoca targetInputId                 - Instrucciones paso a paso
  - Aplica animación .deep-link-target   - Snippet de servidor (.htaccess, etc.)
  - Toast informativo al usuario         - Enlace a guía oficial en web
```

---

## 2. Catálogo Oficial de Incidencias y Resoluciones

| Código | Área / Módulo | Causa Raíz Humana | Pestaña Destino | Elemento Enfocado | Acción Automatizada / Asistida |
|---|---|---|---|---|---|
| `ERR_OLEDB_MISSING` | Factusol ERP | Controlador Access 64-bit no instalado | `factusol` | `#input-factusol-db` | Focus ruta y enlace directo a instalador oficial Microsoft OLEDB. |
| `ERR_FACTUSOL_FILE_NOT_FOUND` | Factusol ERP | Archivo .accdb/.mdb no encontrado en ruta | `factusol` | `#input-factusol-db` | Focus campo y disponibilidad de diálogo nativo de Windows. |
| `ERR_FACTUSOL_EXCLUSIVE_LOCK` | Factusol ERP | Bloqueo concurrente por .laccdb / otro puesto | `factusol` | `#btn-test-fact` | Focus botón probar conexión y reintento automático no destructivo. |
| `ERR_FACTUSOL_CORRUPTED` | Factusol ERP | Base de datos dañada o incoherente | `factusol` | `#input-factusol-db` | Instrucciones de "Compactar y Reparar" en Factusol. |
| `ERR_FACTUSOL_TABLE_MISSING` | Factusol ERP | Archivo no pertenece a empresa comercial | `factusol` | `#btn-browse-native` | Resalta botón "Examinar en Windows" para seleccionar empresa válida. |
| `ERR_FACTUSOL_READONLY_FILE` | Factusol ERP | Atributo de solo lectura o sin permisos NTFS | `factusol` | `#input-factusol-db` | Guía para desmarcar "Solo lectura" en propiedades del archivo. |
| `ERR_FACTUSOL_NAS_TIMEOUT` | Factusol ERP | Recurso de red o servidor NAS inaccesible | `factusol` | `#input-factusol-db` | Marca offline sin borrar la ruta (%APPDATA% anti-wiping). |
| `ERR_TARIFF_NOT_FOUND` | Factusol ERP | Código de tarifa no existe en F_TAR | `factusol` | `#select-factusol-tariff` | Despliega selector de tarifas disponibles. |
| `ERR_WEB_AUTH_BLOCKED` | Canal Web | Hosting filtra cabecera `Authorization` | `channel` (Woo) | `#input-wc-key` | Proporciona snippet `.htaccess` de 2 líneas con copia en un clic. |
| `ERR_WOO_PERMISSIONS` | Canal Web | Clave API REST en modo solo lectura | `channel` (Woo) | `#input-wc-key` | Guía para cambiar clave a "Lectura y Escritura" en WordPress. |
| `ERR_WOO_PERMALINKS` | Canal Web | Enlaces permanentes sin activar | `channel` (Woo) | `#input-wc-url` | Guía para configurar enlaces "Nombre de la entrada" en WordPress. |
| `ERR_WEB_JSON_PARSE` | Canal Web | Servidor web devolvió HTML / error PHP | `channel` | `#input-wc-url` | Enfoca URL para comprobar estado en navegador web. |
| `ERR_WEB_CLOUDFLARE_BLOCK` | Canal Web | Bloqueo por WAF de Cloudflare (cf-ray) | `channel` | `#input-wc-url` | Guía para añadir excepción de WAF en Cloudflare. |
| `ERR_WEB_TIMEOUT` | Canal Web | Hosting agotó tiempo de ejecución PHP (>30s) | `sync` | `#input-sync-interval` | Abre ajuste de intervalos y guía para subir max_execution_time. |
| `ERR_WEB_CONNECTION_FAILED` | Canal Web | Servidor caído, DNS no resuelve o URL errónea | `channel` | `#input-wc-url` | Enfoca campo URL para verificar HTTPS y dominio. |
| `ERR_ENDPOINT_NOT_FOUND` | Canal Web | `erp-bridge-endpoint.php` no subido (404) | `channel` (Universal) | `#input-universal-url` | Selecciona Canal Universal y ofrece botón de descarga del PHP. |
| `ERR_SSL_INVALID` | Canal Web | Certificado SSL caducado o no confiable | `channel` | `#input-universal-url` | Enfoca campo y enlaza a guía de renovación SSL gratuita. |
| `ERR_LICENSE_EXPIRED` | Licencia | Periodo de prueba o licencia finalizada | `license` | `#input-lic-key` | Enfoca input de clave y ofrece enlace a beta pública gratuita. |
| `ERR_LICENSE_INVALID` | Licencia | Formato de clave incorrecto | `license` | `#input-lic-key` | Enfoca input de clave con animación y validación EB-*. |
| `ERR_CSCRIPT_BLOCKED` | Sistema / EDR | Antivirus bloquea `cscript.exe` | `overview` | `#pf-alert-box` | Muestra semáforo Pre-Flight y guía de exclusiones Defender/EDR. |
| `ERR_CLOCK_DESYNC` | Sistema | Desfase horario de Windows superior a 3 min | `overview` | `#pf-clock-badge` | Instrucciones de sincronización horaria NTP en Windows. |
| `ERR_DISK_SPACE_LOW` | Sistema | Disco C: con menos de 500 MB libres | `overview` | `#card-f-path` | Aviso preventivo para evitar corrupción de bases de datos locales. |
| `ERR_PORT_OCCUPIED` | Sistema | Puerto 39281 ocupado por otro proceso | `logs` | `#btn-refresh-preflight` | Recomendación de cerrar procesos huérfanos en Administrador de Tareas. |
| `ERR_NOTIF_TELEGRAM` | Notificaciones | Token de bot o Chat ID no válido | `notifications` | `#input-tele-token` | Salto directo a pestaña Notificaciones y foco en token Telegram. |
| `ERR_NOTIF_DISCORD` | Notificaciones | Webhook URL no válida o eliminada | `notifications` | `#input-disc-webhook` | Salto directo a pestaña Notificaciones y foco en webhook Discord. |
| `ERR_NOTIF_SMTP` | Notificaciones | Servidor SMTP no responde o rechaza login | `notifications` | `#input-smtp-host` | Salto directo a pestaña Notificaciones y foco en servidor SMTP. |

---

## 3. Protocolo de Anti-Flooding y Agrupación de Registros

1. **En Backend (`EventBus`):**
   - Cuando se emite un evento con el mismo nivel y mensaje que el evento anterior, **no se inserta un nuevo registro**.
   - Se incrementa el contador `count`, se actualiza la hora del último evento `timestamp` y se mantiene `firstTimestamp`.
   - La persistencia en disco se muestrea para evitar saturación de I/O de disco.
2. **En Frontend (`logs.script.ts`):**
   - La función `groupLogs()` combina registros idénticos consecutivos.
   - Si `count > 1`, se inyecta la insignia visual: `<span class="log-count-badge">×N</span>`.
   - 300 errores repetitivos se renderizan como **1 sola fila limpia** indicando cuántas veces ocurrió y la hora del último suceso.
3. **Consola Inferior Desplegable (Bottom Dock Console):**
   - Permite al usuario supervisar la actividad en vivo desde cualquier pestaña sin desplazarse.
   - Cuenta con filtros por tipo (`Todos`, `Operaciones`, `Avisos`, `Errores`), copia rápida y limpieza temporal.

---

## 4. Guía para Nuevos Módulos y Desarrolladores

Para añadir una nueva regla de diagnóstico:
1. Añadir el objeto a `ERROR_CATALOG` en `apps/agent/src/gui/templates/scripts/error-humanizer.script.ts`.
2. Definir:
   - `code`: Código único en formato `ERR_[MODULO]_[DESCRIPCION]`.
   - `pattern`: Expresión regular que atrapa el error técnico.
   - `title`: Título comprensible por un usuario de negocio.
   - `message`: Explicación en lenguaje no técnico.
   - `suggestion`: Paso a paso claro de solución.
   - `actionLabel`: Texto del botón de acción (ej: "Configurar X").
   - `targetTab`: Pestaña del panel a la que debe saltar.
   - `targetInputId`: ID del elemento DOM que debe enfocarse y resaltarse con resplandor.
   - `helpUrl`: Enlace a la documentación oficial.
3. Registrar la fila en la tabla de este documento.
