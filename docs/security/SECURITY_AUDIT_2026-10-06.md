# Auditoría de seguridad de código — Bentian ERP Bridge (2026-10-06)

> Estado del documento: **informe vivo**. Los hallazgos se cierran en
> [`GEMINI_REMEDIATION_PLAYBOOK.md`](./GEMINI_REMEDIATION_PLAYBOOK.md) (tabla de estado al final).
> Detalle completo de cada hallazgo (PoC, archivo:línea, remediación) en `reports/`:
> [API](./reports/API-AUDIT-RAW.md) · [Agente](./reports/AGENT-AUDIT-RAW.md) · [Infra](./reports/INFRA-AUDIT-RAW.md).

## 1. Resumen ejecutivo

Se auditó el código (API cloud, agente Windows + paquetes, infraestructura/CI/web/PHP) buscando **lo que falta o está mal**. Resultado: **82 hallazgos** (API-001…032, AGT-001…024, INF-001…026; algunos se solapan, p. ej. API-001 = INF-002 y API-006 = INF-009).

| Severidad | Qué significa en la práctica |
|---|---|
| **Crítica** | Explotable sin credenciales o con impacto sobre todos los clientes |
| **Alta** | Explotable con cuenta gratuita (clave beta) o con un solo requisito previo |
| **Media / Baja / Info** | Endurecimiento, lógica de negocio, deuda de higiene |

### Lo que hay que saber primero

1. **INF-001 — CONFIRMADO, crítico.** La clave privada Ed25519 de actualizaciones estuvo versionada (`builder/keys/update-private.pem`, commit `bf13909`, retirada del índice en `54cedc2`) en un repositorio de GitHub **público** y **es la clave vigente** (la pública derivada de la del historial coincide con la actual en `~/.bentian-secrets`). Quien la extraiga puede firmar un `BentianAgent.exe` que **todos los agentes instalados aceptarían** (se ejecutan como administrador). Condición para explotarlo: controlar el canal de descarga (MITM, DNS, compromiso del servidor). Requiere decisión del propietario (rotación; ver playbook, tarea P0-1).
2. **Endpoints sin autenticación** que alteran estado o envían correo: `POST /sync/run-reactive` (API-002), `POST /notifications/order` (API-007, relé de correo abierto), heartbeat de agentes (API-009), y en el PHP universal `cancel_order`/`payment_webhook`/`create_order` (INF-010/011).
3. **Aislamiento entre clientes (BOLA)** roto en `/billing/licenses-by-email`, `/billing/create-portal-session`, creación de conexiones/jobs con `organizationId` del body, monitorización y el `FlowEngine` (los flujos de un tenant reciben eventos de **todos** los tenants y pueden enviarlos por webhook).
4. **XSS** en el dashboard (almacenado, vía hwid/hostname/alias) con el JWT en `localStorage` y sin CSP → toma de cuenta SUPERADMIN (API-006/INF-009). XSS equivalente en la GUI local del agente (AGT-002) combinado con una API local sin token (AGT-003).
5. **Path traversal** en `/releases/latest/:filename` (API-001/INF-002) y en los nombres de fichero de actualización del agente (AGT-001).
6. **Cadena de suministro**: 16 vulnerabilidades en dependencias (1 crítica, 7 altas) y CI que ignora el lockfile (INF-003/018).

### Aviso de honestidad sobre el Quality Gate

`pnpm run quality:check` (nota 9,74 «APTO PARA PRODUCCIÓN») es un gate **estático** (LOC, ciclos, `console.*`, sanitización SQL, DISSTO, toolchain, hashes de módulos congelados). **No mide nada de lo anterior**: no hay `pnpm audit`, ni tests de autorización, ni escaneo de secretos. Una nota alta no implica seguridad. La remediación incluye ampliar el gate (tareas P3-x del playbook).

## 2. Metodología y límites (qué está verificado y qué no)

| Elemento | Cómo se obtuvo | Fiabilidad |
|---|---|---|
| INF-001 (clave en historial = clave actual) | Verificado directamente: comparación de claves públicas derivadas; la clave **nunca se imprimió** | **Verificado** |
| Repo público | API de GitHub (`visibility: public`) | **Verificado** |
| API-001 / INF-002 traversal | PoC en un Express 4.22.2 local: `req.params` decodifica `%2F`. Contra **producción**, `GET /releases/latest/..%2F..%2F..%2Fpackage.json` devolvió **HTTP 400** (control 404 / oficial 200) | Defecto de código confirmado; **explotabilidad en producción no confirmada** (la capa Cloudflare/Caddy parece rechazar `%2F`). Otras codificaciones **no probadas**. Parchear igualmente |
| `pnpm audit --prod` | Ejecutado por el auditor de infra | Verificado en esa fecha |
| Resto de hallazgos | Lectura de código con archivo:línea por 3 auditores de solo lectura | Alta, pero **sin PoC end-to-end** salvo indicado |
| `.env` de producción, ajustes de Cloudflare/Caddy reales, topología de proxies | No accesibles/no revisados | **No verificado** (API-008, API-031) |

No se ha modificado ningún fichero del producto, ni se ha desplegado ni rotado nada como parte de la auditoría.

## 3. Registro de hallazgos

Leyenda: **F** = toca un módulo FROZEN (mitigar solo por capa superior). Estado inicial de todos: **ABIERTO**.

### 3.1 API cloud (`apps/api`, `packages/core`)

| ID | Sev | Resumen | Ubicación principal | F |
|---|---|---|---|---|
| API-001 | Crítica | Path traversal en `/releases/latest/:filename` (`%2F`) | `apps/api/src/server.ts:117-145` | |
| API-002 | Crítica | `POST /sync/run-reactive` sin auth; org por cabecera | `routes/sync.router.ts:128-159`, `routes/org-scope.ts:15-17` | |
| API-003 | Crítica | BOLA `/billing/licenses-by-email` (tokens de licencia y RESELLER saltan el scoping) | `routes/billing.router.ts:926-947` | |
| API-004 | Alta | Portal de Stripe de cualquier cliente (`customerId`/email del body) | `billing.router.ts:530-585` | |
| API-005 | Crítica | FlowEngine multi-tenant: eventos cruzados + `DISPATCH_WEBHOOK` (exfiltración, SSRF, sin timeout) | `packages/core/src/engine/flow.engine.ts:52,184-204`, `flow.repository.ts:46-50` | |
| API-006 | Alta | XSS almacenado en dashboard (hwid/hostname) + JWT en localStorage + sin CSP | `public/dashboard/js/licenses.js:145,150`, `fleet.js:76` | |
| API-007 | Crítica | Relé de correo abierto sin auth; agota presupuesto Resend → DoS del login OTP | `routes/notifications.router.ts:10-43` | |
| API-008 | Alta | Secretos/flags fail-open (`LICENSE_JWT_SECRET` por defecto, `debugOtp`, sesión mock, password BD `123456789`) | `license-token.ts:18,24,61` **F**, `auth.router.ts:81-82,761`, `billing.router.ts:964`, `server.ts:79` | F |
| API-009 | Alta | Heartbeat anónimo reasigna agentes entre organizaciones | `routes/agents.router.ts:216-267` | |
| API-010 | Alta | `body.organizationId` prevalece sobre el token (escritura cross-tenant) | `connections.router.ts:35`, `sync.router.ts:31` | |
| API-011 | Alta | Reseller: secreto compartido, `ON CONFLICT` roba orgs, trials ilimitados, atribución anónima | `licenses.router.ts:124-182`, `auth.router.ts:361-470`, `billing.router.ts:54,275,389,774` | |
| API-012 | Alta | Monitorización: RESELLER/OPERATOR fijan `x-organization-id` o ven toda la flota | `routes/monitoring.router.ts:22-31` | |
| API-013 | Media | Pairing token de 24 bits sin rate limit | `agent.service.ts:35`, `agents.router.ts:206` | |
| API-014 | Media | Lógica de cobro: planes mayoristas/setup emiten licencia; `isPaid` con OR; URLs sin allowlist | `billing.router.ts` (257, 717, 1023, 238…) | |
| API-015 | Media | Beta claim: clave en HTTP sin verificar email, alias `+`, carrera, enumeración | `licenses.router.ts:185-323` | |
| API-016 | Media | `withKeyedLock` sin normalizar la clave → bypass de `maxActivations` | `licenses.router.ts:620`, `license-key.generator.ts:55-68` | |
| API-017 | Media | Caché en memoria de licencias queda obsoleta frente a SQL directo | `license.repository.ts:19,54-76` | |
| API-018 | Media | JWT sin revocación/refresh/`jti`; `exp` opcional | `auth.router.ts:100-136` | |
| API-019 | Media | Admin: PBKDF2 100k, contraseña en env, lockout en memoria, sin MFA | `auth.router.ts:238-358` | |
| API-020 | Media | `email-session`: enumeración, `remind_licenses` sin throttle | `auth.router.ts:550-771` | |
| API-021 | Media | Sin helmet/HSTS/CSP; CORS `*`; JSON 10 MB global | `server.ts:44-58` | |
| API-022 | Baja | Errores 500 devuelven `err.message`; `/health` público con detalle | `error.middleware.ts`, `health.router.ts` | |
| API-023 | Media | `.env` real en carpeta Drive; `.env.example` incompleto; TLS BD `rejectUnauthorized:false` | `apps/api/.env`, `database.service.ts:45-49` | |
| API-024 | Media | SSRF vía `/connections/test` | `connections.router.ts:75-87` | |
| API-025 | Media | Rate limiting ausente en endpoints sensibles; solo en memoria | `rate-limit.ts` | |
| API-026 | Baja | Falta zod en ~15 endpoints | varios | |
| API-027 | Media | Sin `LICENSE_SIGNING_PRIVATE_KEY` se omite la prueba Ed25519 en silencio | `licenses.router.ts:25`, `license-proof.service.ts:61-66` | |
| API-028 | Baja | DoS: límites sin tope, `uncaughtException` tragada, Maps sin evicción, fetch sin timeout | varios | |
| API-029 | Baja | Logs con pairing token/emails; `X-Forwarded-For` crudo | `agent.service.ts:47`, `agents.router.ts:242` | |
| API-030 | Media | Webhook Stripe sin dedupe por `event.id`, sin refund/dispute, renovación reactiva licencias revocadas | `billing.router.ts:661-914` | |
| API-031 | Info | `trust proxy 1`: verificar topología (Cloudflare→Caddy→app) | `server.ts:43` | |
| API-032 | Info | Deps OK por versión; falta helmet/limitador persistente | `package.json` | |

SQL: **no se encontró inyección** (todo parametrizado). JWT: `alg` fijo, `timingSafeEqual` (bien).

### 3.2 Agente Windows y paquetes (`apps/agent`, `packages/*`)

| ID | Sev | Resumen | Ubicación principal | F |
|---|---|---|---|---|
| AGT-001 | Alta | Path traversal vía `version` del servidor en nombre de fichero de actualización → .exe arbitrario antes de verificar Ed25519 | `update/auto-updater.ts:147-148`, `update/update.client.ts:333-335` | |
| AGT-002 | Alta | XSS en la GUI (innerHTML con datos de tienda/logs/Factusol), sin CSP | `gui/templates/scripts/logs.script.ts:42`, `channel.script.ts:49-53`, `license/sync/factusol.script.ts` | |
| AGT-003 | Alta/Media | API local sin token; GET con efectos sin Origin → fuga NTLM por UNC, clickjacking, sin límite de body | `gui/gui-server.ts`, `gui/router/mini-router.ts` | parcial |
| AGT-004 | Alta/Media | Secretos en claro en `agent-config.json` y expuestos por `GET /api/local/status` | `config/config.manager.ts` **F**, `agent.ts:323-352` | F |
| AGT-005 | Media | Sin comprobación `isNewer` en la ruta principal (downgrade) | `auto-updater.ts`, `update.client.ts` | |
| AGT-006 | Media | `launchAtomicUpdateProcess` sin `expectedSha256` (TOCTOU) | `auto-updater.ts:224-230` | |
| AGT-007 | Media | URL de descarga de cualquier host, sin límite de tamaño/timeout | `update.client.ts:337-339` | |
| AGT-008 | Media | secure-store con sal estática y HWID público | `security/secure-store.ts` | |
| AGT-009 | Media | Diagnóstico exporta la `licenseKey` completa | `diagnostics/diagnostic-exporter.ts:60` | |
| AGT-010 | Baja | `DEFAULT_SECRET` de `license-token.ts` | `packages/core/src/license/license-token.ts` | F |
| AGT-011 | Media | Licencia online `VALID` sin prueba firmada; `apiBaseUrl` editable | `license.service.ts:233-242` | F |
| AGT-012 | Baja | Generador PHP: `Math.random`, sustitución sin escapar, secretos por GET | `companion-generator.ts:38-43`, `channel.controller.ts:53` | |
| AGT-013 | Baja | SQL por concatenación (numéricos sin validar, LIKE sin escapar, SKU truncado) | `connectors/factusol/src/queries/*` | F |
| AGT-014 | Media | Payload de la tienda es de confianza (precios/cantidades negativas) | `order-sync.helper.ts:160-226` | |
| AGT-015 | Baja | Cadena OLEDB sin comillas; búsqueda de `adodb.js` en `cwd` | `access-driver.ts:65,117` | F |
| AGT-016 | Media | SMTP `rejectUnauthorized:false` y sin STARTTLS; CRLF | `order-notifier.service.ts:343-396` | |
| AGT-017 | Media | Universal-bridge: secreto estático, http permitido, secreto en URL, HMAC sin usar | `sync.engine.ts:40-60`, `universal-bridge.tester.ts:86`, `live-health.service.ts` | |
| AGT-018 | Media | SSRF en endpoints de prueba | `channel.controller.ts`, `*.tester.ts` | |
| AGT-019 | Media | PHP: CORS `*`, SVG, secreto por query | `erp-bridge-endpoint.php` | |
| AGT-020 | Media | HTML injection en emails de pedido; PII al relé | `order-notifier.service.ts:94-143` | |
| AGT-021 | Baja/Media | **No existe SingleInstanceLock/named pipe** (la doc lo afirma). Lock real = puerto 39281 `/health` (squatting posible) | `cli.ts:514-541` | |
| AGT-022 | Info | **No hay SQLite en el agente** (historial JSON); no hay cola cifrada | `history/history.manager.ts` | |
| AGT-023 | Baja/Media | Telemetría incluye ruta de BD (UNC/NAS), hostname, storeUrl | `agent.ts:583-674` | |
| AGT-024 | Info | Sin audit de dependencias en CI; `node-fetch` v2 | `package.json` | |

### 3.3 Infraestructura, cadena de suministro, web, PHP

| ID | Sev | Resumen | Ubicación principal |
|---|---|---|---|
| INF-001 | **Crítica** | Clave privada de update en historial git público y vigente | `builder/keys/update-private.pem` (hist.), `builder/build.js:331,338` |
| INF-002 | Alta | = API-001 (PoC local confirmado; ver §2) | `server.ts:117-145` |
| INF-003 | Alta | `pnpm install --no-frozen-lockfile`; CI con pnpm v8 vs lockfile v9 | `deploy-hetzner.yml:30,33`, `Dockerfile:21`, `release-desktop.yml:34` |
| INF-004 | Alta | Despliegue SSH como root con acción de terceros, sin pin de host, commits sin firmar | `deploy-hetzner.yml:38-50`, `scripts/upload-releases.js:13-14,336-343` |
| INF-005 | Media | Acciones no fijadas por SHA; sin `permissions:` mínimos | `.github/workflows/*` |
| INF-006 | Media | Docker como root, sin `.dockerignore`, `\|\| true`, sin límites | `Dockerfile`, `docker-compose.prod.yml` |
| INF-007 | Media | Sin CSP/Permissions-Policy; CORS `*`; body 10 MB | `docker/Caddyfile`, `server.ts:44-52` |
| INF-008 | Alta | Dashboard con `cdn.tailwindcss.com` + Google Fonts sin SRI/CSP; JWT en localStorage | `public/dashboard/layout/head.html:13-50`, `public/layout/base.html` |
| INF-009 | Alta | = API-006 (alias/hostname XSS) | `dashboard/js/licenses.js:107`, `client-portal.js:46` |
| INF-010 | Alta | PHP: `cancel_order`/`payment_webhook` sin auth | `erp-bridge-endpoint.php:597-681` |
| INF-011 | Alta | PHP: `create_order` sin auth, confía en totales y `paymentStatus` | `erp-bridge-endpoint.php:543-592` |
| INF-012 | Media | PHP: ping filtra errores PDO y ejecuta DDL anónimo | `erp-bridge-endpoint.php:274-313` |
| INF-013 | Media | PHP: placeholder `%%EB_SECRET_KEY%%` no detectado; secreto en query; HMAC sin nonce | `erp-bridge-endpoint.php:36,203-245` |
| INF-014 | Media | PHP: subida de imagen permite SVG, sin validar contenido | `erp-bridge-endpoint.php:753-791` |
| INF-015 | Media | `.env` y `vault/gsc-key.json` en carpeta sincronizada con Drive | rutas locales |
| INF-016 | Media | Authenticode se omite en silencio con `--deploy`; Tauri sin firma | `builder/sign-authenticode.js`, `builder/build.js` |
| INF-017 | Media | Inyección de comandos en `upload-releases.js` (`docker exec node -e`); FTPS sin validar cert | `scripts/upload-releases.js:268-281`, `scripts/deploy-web.js:141` |
| INF-018 | Media | `pnpm audit --prod`: 16 vulns (1 crítica proxy-addr, 7 altas axios, 8 moderadas qs/uuid) | `pnpm-lock.yaml` |
| INF-019 | Media | Sin backups de PostgreSQL, sin rotación de claves ni plan de incidentes documentados | — |
| INF-020 | Media | RGPD: privacidad solo como modal; sin endpoints de exportación/supresión | `modal-legal.html`, `routes/*` |
| INF-021…026 | Baja/Info | Compose de laboratorio, CD sin tests ni rebuild de imagen, doc de decisiones | ver informe bruto |

## 4. Lo que SÍ está bien (verificado)

- Claves privadas **actuales** fuera del repo, en `.bentian-secrets` con ACL restringida; `build.js --deploy` aborta sin clave real.
- `.gitignore` sólido; ningún `.env` real ni `.accdb` jamás versionados (la única excepción es la clave de INF-001).
- `resolveOrgId` ancla a RESELLER/TENANT/OPERATOR en conexiones, flows, sync-jobs, agentes, licencias y fleet-overview.
- JWT HS256 propio con `alg` fijo y `timingSafeEqual`; login admin sin enumeración; claves de licencia con `crypto.randomBytes` (90 bits + checksum, UNIQUE).
- Webhook de Stripe: firma sobre raw body, tolerancia ±300 s, fail-closed sin secreto.
- SQL parametrizado en API y PHP (PDO preparado); `spawn/execFile` con arrays (sin shell) en el agente.
- Actualizador: Ed25519 + SHA-256, re-verificación de `.new`, `-EncodedCommand` en UAC, rollback a 10 s.
- GUI local: bind solo a 127.0.0.1, validación de Host/Origin/Referer (anti DNS rebinding y POST cross-site).
- Prueba de licencia Ed25519 con separación de dominio y ligada a HWID; detección de rollback de reloj.

## 5. Desviaciones entre la documentación existente y el código

Corregir en `AGENTS.md`/`GEMINI.md` (copias idénticas), `SKILL.md` y `MODULES.md` cuando se decida el diseño real:

| Afirmación documentada | Realidad en código |
|---|---|
| «`SingleInstanceLock` con named pipe y debounce de 2,5 s» (Regla 4) | **No existe.** El control real es comprobar `http://127.0.0.1:39281/health` (`cli.ts:514-541`). Hay que implementarlo o corregir el texto (AGT-021) |
| «Motor SQLite Store-and-Forward» (web, docs, `CAPABILITIES_MANIFEST`) | **No hay SQLite en el agente**; el historial es JSON en AppData (AGT-022). Las páginas públicas que prometen cola SQLite deben revisarse o la cola debe implementarse |
| «BOLA mitigado por `resolveOrgId`» (SKILL) | Solo en parte: ver API-002/003/004/005/010/012 |
| «Prueba de licencia Ed25519 obligatoria» | Opcional si falta `LICENSE_SIGNING_PRIVATE_KEY` (API-027) y no se exige para pasar a `VALID` (AGT-011) |

> Acción pendiente de producto: decidir si las promesas públicas (cola SQLite, instancia única por named pipe) se **implementan** o se **retiran** de la web/docs. No es un hallazgo técnico menor: afecta a la veracidad comercial.

## 6. Hoja de ruta (resumen; detalle en el playbook)

1. **P0 (inmediato)** — INF-001 (decisión y rotación), API-001, API-002, API-007, AGT-001, PHP INF-010/011/013.
2. **P1** — BOLA/tenant (API-003/004/005/009/010/012), XSS (API-006, AGT-002), API local del agente (AGT-003/004), `assertProductionSecrets()` (API-008).
3. **P2** — Cadena de suministro (INF-003/005/018), CI/CD (INF-004), actualizador (AGT-005/006/007), lógica de cobro (API-014/030), reseller (API-011).
4. **P3** — Hardening (cabeceras, CSP, rate limit persistente, zod), Docker, backups/RGPD, ampliar Quality Gate.
