# ERP Bridge: Preparación para Producción, Matriz de Riesgos y Hoja de Ruta

**Autor:** Cristian (Solo Founder) / Antigravity Engineering  
**Fecha:** 2026-09-04  
**Objetivo:** Guía operativa exhaustiva que identifica lo construido, los riesgos reales en clientes y las tareas técnicas inmediatas para salida a producción.

---

## 1. Estado Actual Consolidado (100% Verificado con Tests)

1. **Sincronización Factusol ↔ WooCommerce:**
   - 7 flujos reales programados y verificados con base de datos real Access (`2252025.accdb`, 7.978 artículos):
     - Flujo 1: Catálogo y tarifas (`F_ART`, `F_LTA`).
     - Flujo 2: Stock batch y disponibilidad (`F_STO`).
     - Flujo 3: File watcher reactivo con protección *debounce* (`AccdbFileWatcher`).
     - Flujo 4: Ingesta de pedidos y clientes (`F_CLI`, `F_PCL`, `F_LPC`).
     - Flujo 5: Ciclo de vida y transición de pedidos (`ESTPCL = 2` -> WooCommerce `completed`).
     - Flujo 6: Facturación oficial e IVA (`F_FAC`, `F_LFA`).
     - Flujo 7: Motor de reintentos, *exponential backoff* y Dead-Letter Queue.
2. **Builder Aislado y Empaquetado Windows:**
   - `builder/` desacoplado del código fuente.
   - Single Executable Application nativo (Node 24 SEA) -> `BentianAgent.exe` (88 MB).
   - Instalador Inno Setup Wizard -> `Bentian-Setup-vX.Y.Z.exe` (23 MB, compresión LZMA2 ultra).
   - Sincronizador de versiones SemVer 2.0.0 (`builder/version.js`) con paridad atómica en los 11 paquetes.
3. **Licenciamiento y Cobros (Stripe):**
   - Webhook Stripe (`checkout.session.completed`) genera licencias en PostgreSQL.
   - Vinculación obligatoria por HWID (MAC, MachineGuid, CPU/Disco).
   - Almacenamiento cifrado en `%APPDATA%/erp-bridge/license.enc` (DPAPI + AES-256-GCM).
   - Periodo de gracia offline de 7 días.
4. **Auto-Actualización Autónoma (Zero-Friction):**
   - Firma criptográfica digital Ed25519 infalsificable.
   - Sustitución atómica en Windows sorteando bloqueos del kernel (`.old` rename + proceso detached).
   - Detección inmediata en Heartbeat (<30 segundos de latencia).
   - Distribución directa estática `/releases` y auto-publicación en PostgreSQL.
   - Comprobación post-update y auto-rollback automático en caso de fallo.
5. **Infraestructura de Base de Datos:**
   - Soporte nativo de `DATABASE_URL` con SSL para **Supabase Cloud (PostgreSQL en Frankfurt)**.
   - Conmutable transparentemente con Docker local para desarrollo.

---

## 2. Matriz de Riesgos Operativos y Puntos Ciegos

| # | Riesgo / Preocupación | Causa Raíz | Impacto en Cliente | Solución / Mitigación |
|---|---|---|---|---|
| **R1** | **URL de API incorrecta en cliente** | El código usaba fallback `localhost:3000` si faltaba `agent-config.json`. | El agente no puede conectar al servidor en la máquina del cliente. | **Inyectar `agent-config.json` en el instalador con la URL pública (`https://api.bentian.es`) y comando CLI `set-api`.** |
| **R2** | **Factusol en Red Local o Ruta Inusual** | Factusol instalado en servidor local (ej: `Z:\FACTUSOL\DATOS\FS` o carpetas de red). | El escaneo automático no encuentra la base de datos `.accdb`. | **Comando `BentianAgent.exe set-db [RUTA]` con diálogo visual de Windows (explorador de archivos nativo) si no se especifica ruta.** |
| **R3** | **Bloqueo Concurrente en Factusol (`.laccdb`)** | Varios puestos facturando simultáneamente en la tienda del cliente. | Fallos transitorios de lectura/escritura OLEDB en Access. | **El motor de reintentos ya maneja backoff; asegurar que cortes de red en shares SMB no maten el proceso.** |
| **R4** | **Incompatibilidad 32-bit vs 64-bit en OLEDB** | Factusol es 32-bit; Windows es 64-bit. Motor ACE OLEDB requiere el host adecuado. | Error *"Proveedor OLEDB Microsoft.ACE no registrado"*. | **Selector dinámico en `adodb.js`: probar primero `SysWOW64\cscript.exe` (32-bit) y fallback a 64-bit.** |
| **R5** | **Alerta Azul Windows SmartScreen** | Binarios recién compilados sin certificado Authenticode comercial EV/OV. | Clientes dudan o temen instalar el software. | **Instrucciones claras con captura en el email de bienvenida ("Más información -> Ejecutar de todas formas"). A medio plazo: certificado de firma.** |
| **R6** | **Saturación en Hostings Lentos de WooCommerce** | Cliente con hosting compartido económico (límite de memoria PHP y timeouts). | Error HTTP 504 Gateway Timeout durante subida batch de productos. | **Lotes pequeños (25-50 artículos) con pausas de 200 ms entre peticiones para no saturar el servidor del cliente.** |
| **R7** | **Cambio de Ejercicio Contable Anual** | A fin de año el cliente crea un nuevo archivo (ej. de `2252024.accdb` a `2252025.accdb`). | El agente sigue leyendo el año viejo si la ruta era fija. | **Detector inteligente que prioriza automáticamente el año más reciente de la misma empresa.** |
| **R8** | **API abierta sin autenticación en Dashboard** | Endpoints `/licenses`, `/agents`, etc. no tenían verificación JWT de administrador. | Exposición de datos si la URL de la API es pública. | **Implementar `/api/v1/auth/login` con JWT y contraseñas hasheadas para acceso administrativo.** |

---

## 3. Plan de Ejecución Inmediato

1. **Agente e Instalador:**
   - Inyectar `agent-config.json` en `builder/installer.iss` con `apiBaseUrl` configurable y protección `onlyifdoesntexist`.
   - Añadir comandos CLI `BentianAgent.exe set-api <URL>` y `BentianAgent.exe set-db [RUTA]` (con file picker gráfico interactivo de Windows).
   - Perfeccionar `FactusolDetector` para escanear subcarpetas `\FS\*.accdb` y detectar automáticamente el año contable más reciente.
2. **Driver Factusol:**
   - Añadir detección automática de `cscript.exe` de 32 bits (`C:\Windows\SysWOW64\cscript.exe`) para garantizar compatibilidad con el motor OLEDB de Factusol en sistemas x64.
3. **Seguridad API:**
   - Crear endpoint `/api/v1/auth/login` y middleware de autenticación JWT para proteger las rutas administrativas del Dashboard.

---

## 4. Arquitectura de Infraestructura y Análisis de Costes (Solo Founder)

| Componente | Opción Recomendada | Alternativa Autogestionada | Decisión Estratégica y Justificación |
|---|---|---|---|
| **Base de Datos** | **Supabase Cloud (PostgreSQL)**<br>*Región: Frankfurt (eu-central-1)* | PostgreSQL en Docker VPS | **Supabase gana rotundamente.** Cero administración de discos, backups diarios automáticos en la nube, interfaz visual web de tablas, Transaction Pooler (PgBouncer) y 100% de compatibilidad con nuestro driver `pg`. Coste: **0 €/mes** en capa gratuita; escalable a 25 $/mes en producción comercial. Cumple 100% con RGPD europeo. |
| **API Backend (`apps/api`)** | **Hetzner Cloud VPS (CAX11 / CPX11)** con **Cloudflare Tunnel (`cloudflared`)** | Render / Railway PaaS | Un VPS en Hetzner (Núremberg/Helsinki) con Docker cuesta **4,50 €/mes**. El túnel de Cloudflare elimina la necesidad de abrir puertos, configurar Nginx o renovar certificados Let's Encrypt (Cloudflare gestiona el SSL y el WAF gratis). |
| **Dashboard Web (`apps/dashboard`)** | **Cloudflare Pages / Vercel** | Nginx estático en VPS | Distribución global en CDN Edge, despliegue continuo con `git push`, coste **0 €/mes** y rendimiento instantáneo. |
| **Almacenamiento de Releases** | **Servidor API `/releases`** o **Cloudflare R2** | AWS S3 | Cloudflare R2 ofrece 10 GB gratis y **0 € en costes de transferencia saliente (zero egress fees)** para distribución de instaladores y actualizaciones de agentes. |

### Coste Operativo Total Mensual
- **Fase de Lanzamiento (1 - 50 clientes):** ~**4,50 € - 5,00 € / mes** (VPS Hetzner + Supabase Free + Cloudflare Free).
- **Mantenimiento Técnico Requerido:** **0 horas/semana** de administración de bases de datos. Todo el foco de Cristian permanece en producto y ventas.

