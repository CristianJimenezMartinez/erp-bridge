# Playbook de remediación de seguridad — para Gemini 3.8 (ejecutor)

> **Lectura obligatoria antes de tocar nada.** Este documento convierte la auditoría
> [`SECURITY_AUDIT_2026-10-06.md`](./SECURITY_AUDIT_2026-10-06.md) en tareas ejecutables, ordenadas y verificables.
> Detalle de cada hallazgo (PoC, líneas): [`reports/`](./reports/). Escrito por Claude/Antigravity el 2026-10-06 a petición del propietario.

## 0. Reglas innegociables (resumen de `AGENTS.md`)

1. **Módulos FROZEN: no se editan** (Gate 7 compara SHA-256 de cada árbol y rompe el build). Lista: `packages/connectors/factusol/src`, `packages/core/src/license`, `packages/core/src/update/update-signer.ts`, `apps/agent/src/update/update.swapper.ts`, `apps/agent/src/config/config.manager.ts`, `apps/agent/src/gui/tray/BentianTray.cs`, `apps/agent/src/gui/window-launcher.ts`. Si una tarea los afecta, mitiga **en una capa superior** (middleware, adaptador, decorador, validación previa) y anótalo.
2. **Autor de git:** `CristianJimenezMartinez <cristianjimeneztrabajo@gmail.com>` en todo commit.
3. **Quality Gate:** `pnpm run quality:check` debe seguir ≥ 9,5 tras cada lote. Si baja, corrige antes de seguir.
4. **Tests del agente:** nunca tocar `%APPDATA%\Bentian Agent\agent-config.json`; usa `process.env.BENTIAN_CONFIG_PATH = path.join(tempDir,'agent-config.json')` y bórralo en teardown.
5. **Secretos:** nunca imprimir, loguear ni pegar valores de claves/`.env`. Claves privadas solo en `%USERPROFILE%\.bentian-secrets\`.
6. **Releases:** solo con `node builder/build.js [patch|minor|major] [--deploy]`. **No despliegues a producción sin confirmación expresa del propietario.**
7. **Red:** `curl.exe -i -L -k "https://www.suministrosrubio.com/..."` (con `www`). DuckDNS prohibido. GUI del agente en puerto fijo `39281` (no port-hopping).
8. **Entorno:** el repo está en una unidad Google Drive: comandos que recorren el árbol son lentos y `pnpm install` falla. Compila/testea en una copia en `C:\Proyectos\Bentian\...` y trae los cambios con git.
9. **Un lote = un commit pequeño** con mensaje `security(ID): …`. Tras cada tarea, **actualiza la tabla de estado del §6**.
10. **No inventes.** Si el código real difiere de lo descrito aquí, confía en el código, anota la diferencia en el §6 y continúa.

## 1. Cómo llegan los cambios a producción (importante)

- `git push` a `main` ejecuta `deploy-hetzner.yml`: solo hace `git pull` + `docker restart bentian-api-prod`. **No reconstruye `dist/`** (INF-022). Solo `apps/api/public` (bind mount) se actualiza con ello.
- Los cambios en `apps/api/src` o `packages/*` solo llegan a producción vía `scripts/upload-releases.js` (`docker cp` + restart) o reconstruyendo la imagen. Antes de dar nada por «desplegado», **verifica contra producción** con `curl.exe` (criterio de aceptación de cada tarea).
- Hetzner: `root@178.105.87.40` por SSH con clave (`~/.ssh/id_ed25519`). Pide confirmación al propietario antes de usarlo.

## 2. Fase P0 — Críticos (primero)

### P0-1 · INF-001 — Rotar la clave de firma de actualizaciones  ⚠️ requiere al propietario
**Contexto:** la clave privada vigente está en el historial de un repo público. Se considera comprometida.
**Es una operación de varios pasos; NO la ejecutes de golpe ni sin autorización.** Procedimiento propuesto (el módulo `update-signer.ts` es FROZEN: no se edita; solo cambia la clave pública embebida y el build):
1. Propietario: generar par nuevo Ed25519 en `%USERPROFILE%\.bentian-secrets\` (`update-private-v2.pem`, ACL con `icacls` solo propietario). Copia de seguridad cifrada **offline**.
2. Localizar dónde está embebida la clave pública (`builder/keys/update-public.pem`, y el consumo en el verificador). Diseñar la **release puente**: firmada con la clave **vieja**, que incluye la pública **nueva** y acepta ambas (`{vieja, nueva}`) mediante la capa superior (verificador), sin editar `update-signer.ts`. Si no es posible sin tocar el módulo FROZEN, **detente y pregunta** (requiere desbloqueo explícito y regenerar el hash de Gate 7 con el procedimiento del manifiesto).
3. Publicar la release puente; esperar a que los agentes actualicen (monitor de versiones en `/health`/telemetría).
4. Siguiente release: firmar con la clave **nueva**; retirar la vieja de la lista de aceptadas.
5. Eliminar el fallback legado de `builder/build.js:331` (`builder/keys/update-private.pem`).
6. Limpiar el historial: `git filter-repo --path builder/keys/update-private.pem --invert-paths` + force-push. **Es cosmético** (la clave ya es pública): la rotación es lo que protege. Valorar hacer el repo privado.
7. Activar **GitHub secret scanning + push protection** en el repo.
8. Documentar en `docs/KEY_ROTATION.md` (ver P3-6).
**Aceptación:** una release firmada con la clave nueva se instala; una firmada con la vieja tras el paso 4 es rechazada.

### P0-2 · API-001 / INF-002 — Path traversal en `/releases/latest/:filename`
**Archivo:** `apps/api/src/server.ts` (≈117-145; la segunda rama `versionDir/filename` ≈129 igual).
**Fix:** lista blanca + `basename` + comprobación de prefijo + `dotfiles:'deny'`:
```ts
const ALLOWED = new Set(['Bentian-Setup.exe','Bentian-Setup.zip','BentianAgent-Portable.zip','BentianAgent.exe','latest.json','manifest.json','checksums.txt','erp-bridge-endpoint.php']);
app.get('/releases/latest/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!ALLOWED.has(filename) || filename !== path.basename(filename)) return res.status(404).end();
  const base = path.resolve(releasesDir, 'latest');
  const target = path.resolve(base, filename);
  if (!target.startsWith(base + path.sep)) return res.status(403).end();
  return res.sendFile(target, { dotfiles: 'deny' });
});
```
Ajusta `ALLOWED` a los nombres reales de `releases/latest/` (verifica antes con `Get-ChildItem`). Aplica el mismo patrón al directorio de versión. **Test de regresión** en `apps/api/test` con `/releases/latest/..%2Fpackage.json`, `%2e%2e%2f`, doble codificación `%252e%252e%252f`, `..\\`.
**Aceptación:** los artefactos oficiales dan 200; las variantes anteriores dan 400/403/404, nunca 200 con otro contenido. Comprobar los canónicos (`Bentian-Setup.exe`, `latest.json`) tras desplegar.

### P0-3 · API-002 — `POST /sync/run-reactive` sin autenticación
**Archivos:** `apps/api/src/routes/sync.router.ts` (≈128-159), `routes/org-scope.ts` (15-17).
**Fix:** (a) `requireAuth` en la ruta (o token de agente firmado si la llama el agente: comprobar quién la invoca, `agent.ts:537`); (b) `resolveOrgId` **lanza 401** cuando no hay `req.user` (eliminar la rama que acepta cabecera/query/`'org_default'`). Revisa todos los llamadores de `resolveOrgId` para que ninguna ruta pública dependa de esa rama.
**Aceptación:** `curl.exe -i -X POST https://bridge.cristianjm.com/api/v1/sync/run-reactive -H "x-organization-id: x"` → 401.

### P0-4 · API-007 — Relé de correo abierto `/notifications/order`
**Archivo:** `apps/api/src/routes/notifications.router.ts` (10-43), montado en `/` y `/api/v1` (`server.ts:111-112`).
**Fix:** exigir un token de licencia firmado (el agente ya manda `x-license-key`: validarlo contra BD y usar la org); `to` **solo** el email de contacto registrado de la organización (ignorar `to` libre); plantilla fija en servidor (no aceptar `html` del cliente) o saneado estricto; `rateLimit` por org+IP; rechazar `\r`/`\n` en `to` y `subject`. Quitar el montaje duplicado sin prefijo si el agente usa `/api/v1`.
**Compatibilidad:** el agente (`order-notifier.service.ts:302-313`) usa este endpoint. Si cambias el contrato, adapta el agente en la misma tanda y verifica con un pedido de prueba.
**Aceptación:** sin cabecera/licencia válida → 401; con licencia, solo envía al email de la org.

### P0-5 · AGT-001 — Path traversal en nombres de actualización del agente
**Archivos:** `apps/agent/src/update/auto-updater.ts:147-148`, `update/update.client.ts:333-335` (no FROZEN).
**Fix:** validar `version` con `^\d+\.\d+\.\d+(-[\w.]+)?$` **antes** de usarla; nombre temporal fijo/aleatorio dentro de un directorio propio; `path.resolve(dest).startsWith(tempDir + path.sep)`; verificar firma+hash **antes** de mover; borrar el fichero siempre en fallo (`agent.ts:705-720` hoy no lo hace).
**Aceptación:** test unitario con `version = "1\\..\\..\\x"` → rechazo sin escribir nada fuera de `tempDir`.

### P0-6 · INF-010 / INF-011 / INF-013 — Endpoint PHP universal
**Archivo:** `packages/connectors/universal-bridge/erp-bridge-endpoint.php`.
- `cancel_order`/`payment_webhook` (597-681): mover **después** de `verifyAuthentication()` o validar la firma de la pasarela; no cancelar por `id` secuencial sin token.
- `create_order` (543-592): recalcular totales en servidor; estado inicial `PENDING_PAYMENT`; `paymentStatus` solo desde webhook verificado; tope de líneas/tamaño; rate limit por IP.
- Secreto: devolver 503 si `strpos($secret,'%%') !== false` o longitud < 32; eliminar `?secret=`/`?token=`; HMAC sobre `METHOD\nPATH\nTS\nNONCE\nsha256(body)` + tabla de nonces (TTL 10 min).
- Sincroniza con el generador de companion (`companion-generator.ts`) y las plantillas de `docs` para no desincronizar la web (Regla de SSoT).
**Aceptación:** llamadas sin credencial a cancel/webhook/create → 401/403; con el placeholder sin sustituir → 503.

## 3. Fase P1 — Alta

| ID | Tarea | Fix resumido | Aceptación |
|---|---|---|---|
| P1-1 | **API-003/004** | `licenses-by-email`: ignorar `email` del query para no-SUPERADMIN, usar `req.user.organizationId`; RESELLER filtra por `organizations.reseller_id`. `create-portal-session`: `customer_id` solo desde `licenses.stripe_customer_id` de la org del token; `returnUrl` contra allowlist `DASHBOARD_URL` | Token de licencia A no obtiene claves de B (test) |
| P1-2 | **API-005** | `flow.engine.ts handleEvent`: filtrar `flow.organizationId === event.organizationId`; `DISPATCH_WEBHOOK`: https, resolver DNS y bloquear RFC1918/loopback/169.254/::1, sin redirects, `AbortSignal.timeout(5000)`; validar `/flows` con zod (`FlowSchema` existe en `shared`) | Test: evento de org A no dispara flow de org B |
| P1-3 | **API-006 / INF-009** | Quitar `onclick` inline (`licenses.js:107,145,150`, `fleet.js:76`, `client-portal.js:46`): `data-*` + `addEventListener`/`textContent`. Servidor: `hwid` `/^[A-Za-z0-9_-]{16,64}$/`, `hostname` ≤64 sin `<>"'\``, `alias` `z.string().trim().min(1).max(80)` sin `<>"'\`` | Payload `x');alert(1);//` no ejecuta; rechazado por validación |
| P1-4 | **API-009** | Heartbeat: exigir `licenseToken` firmado y derivar org; `req.ip` (no `X-Forwarded-For` crudo); `ON CONFLICT` sin cambiar `organization_id` | Heartbeat anónimo → 401 |
| P1-5 | **API-010 / API-012** | `connections.router.ts:35`, `sync.router.ts:31`: `{...req.body, organizationId: orgId}` (solo SUPERADMIN puede otra); `monitoring.router.ts`: `resolveOrgId` y rol para vista global | RESELLER no ve ni escribe en otra org |
| P1-6 | **API-008** | `assertProductionSecrets()` al arrancar: aborta si `NODE_ENV==='production'` y faltan `ADMIN_JWT_SECRET` (≥32 B), `LICENSE_JWT_SECRET`, `LICENSE_SIGNING_PRIVATE_KEY`, `PARTNER_SECRET`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`. `debugOtp` y sesión mock solo con `NODE_ENV` ∈ {development,test} **explícito**. Quitar passwords por defecto. (`license-token.ts` es FROZEN: se mitiga aquí.) **Antes de desplegar**, verificar con el propietario que el `.env` de producción tiene todas esas variables, o la API no arrancará | Test: arranque sin secreto en prod falla |
| P1-7 | **AGT-003** | Middleware en `gui/router/mini-router.ts`/`gui-server.ts` (no FROZEN): rechazar si `Sec-Fetch-Site` ∉ {same-origin, none}; `Content-Type: application/json` obligatorio en POST; GET con efectos → POST (405 en GET); token por proceso embebido en el HTML (`X-Bentian-Token`) exigido a peticiones con Origin; peticiones sin Origin (tray/CLI) siguen permitidas; `CSP`, `X-Frame-Options: DENY`, `nosniff`; rechazar UNC (`\\`) en parámetros de GET; límite de body 1 MB; validar Host antes de `new URL`. **El tray (`BentianTray.cs`, FROZEN) llama sin Origin ni token: no debe romperse** — prueba abrir ventana, sync-now, status, shutdown desde el tray | El tray sigue funcionando; `fetch` cross-origin falla |
| P1-8 | **AGT-002** | Helper único `escapeHtml` o `textContent` para todo dato dinámico en `logs/channel/license/sync/factusol.script.ts`; CSP con nonce | `articleCount:"<img onerror>"` se muestra como texto |
| P1-9 | **AGT-004** | Enmascarar secretos en `getStatusDetails` (`agent.ts:323-352`): devolver `hasSecret:true`/últimos 4; `save-full-config` ignora campos enmascarados. Cifrado en disco con DPAPI **por encima** de `ConfigManager` (decorador; FROZEN) y `icacls` sobre `%APPDATA%\Bentian Agent` | `GET /api/local/status` no contiene secretos |
| P1-10 | **API-027** | Producción: abortar arranque si falta `LICENSE_SIGNING_PRIVATE_KEY` (parte de P1-6); el agente debe exigir `licenseProof` (AGT-011, adaptador) | — |

## 4. Fase P2 — Media

| ID | Tarea | Fix resumido |
|---|---|---|
| P2-1 | **INF-003** | CI y Docker: `pnpm install --frozen-lockfile`, fijar pnpm 9.15.4; `npm ci` en dashboard; `--ignore-scripts` en CI |
| P2-2 | **INF-018** | `pnpm.overrides`: `axios >=1.20.0`, `proxy-addr >=2.0.8`, `qs >=6.16.0`, `uuid >=11.1.1`; `pnpm audit --prod --audit-level=high` en CI; valorar sustituir `@woocommerce/woocommerce-rest-api` por `fetch` propio. Re-ejecutar tests de conectores |
| P2-3 | **INF-004/005** | Usuario `deploy` no-root, `fingerprint` del host en la acción SSH, commits firmados + branch protection, `environment: production` con aprobación; acciones fijadas por SHA + Dependabot; `permissions: contents: read` |
| P2-4 | **AGT-005/006/007** | `isNewer` tras verificar firma; pasar `expectedSha256` a `launchAtomicUpdateProcess` (`auto-updater.ts:224-230`); https + allowlist de host + tope de tamaño + timeout; manifiesto firmado con versión/plataforma/canal/fecha (capa de build, sin editar `update-signer.ts`) |
| P2-5 | **API-014/030** | Lista blanca de planes comprables anónimamente; exigir `payment_status==='paid'`; allowlist de URLs de retorno; tabla `stripe_events(event_id PK)`; `UNIQUE(stripe_session_id)`; renovación sin reactivar `revoked`; manejar `charge.refunded`, `dispute`, `async_payment_*`; cupo de fundadores con bloqueo transaccional |
| P2-6 | **API-011** | Tabla `partners` con secreto por partner (hash scrypt/argon2); id de org con SHA-256 completo/uuid; `ON CONFLICT DO NOTHING`; cuota de trials; no sobrescribir `reseller_id` existente |
| P2-7 | **API-015/016/017** | Beta claim: clave solo por email (double opt-in) o OTP, normalizar email, `withKeyedLock('claim:'+email)`; `withKeyedLock('activate:'+LicenseKeyGenerator.normalize(key))` + `UPDATE … WHERE current_activations < max_activations RETURNING`; invalidar la caché en memoria en toda escritura SQL de billing |
| P2-8 | **AGT-016/017/018/020** | SMTP con TLS verificado y STARTTLS; universal-bridge https obligatorio + HMAC + sin secreto en URL + `redirect:'manual'`; SSRF: https y bloqueo de rangos privados; `escapeHtml`/`encodeURIComponent` en el email de pedido |
| P2-9 | **AGT-009/011/013/014/015** | Enmascarar `licenseKey` en diagnóstico; exigir prueba firmada para `VALID`; adaptador de validación de pedidos (numéricos estrictos, sin caracteres de control, plausibilidad de precios/cantidades) **antes** del conector FROZEN; validar la ruta de BD (sin `;` ni comillas) en el controlador |
| P2-10 | **INF-012/014** | Ping mínimo `{status:'ok'}`, errores genéricos, DDL solo en acción protegida; subida de imagen sin SVG, `finfo`, tope de tamaño |
| P2-11 | **INF-015 / API-023** | Mover `.env` y `vault/` fuera de Drive a `%USERPROFILE%\.bentian-secrets\`; **rotar** `gsc-key.json` y credenciales de BD/Resend si la carpeta Drive es compartida (acción del propietario); completar `.env.example`; TLS de BD verificado |
| P2-12 | **INF-016/017** | `--deploy` aborta si Authenticode falla; `signtool /tr https://…`; `upload-releases.js` sin interpolación en `docker exec`, lista blanca de ficheros, `hostVerifier`, FTPS con validación o solo SFTP |

## 5. Fase P3 — Hardening y gobernanza

- **P3-1 Cabeceras (API-021/INF-007/INF-008):** `helmet` + CSP estricta en `/dashboard` (`script-src 'self'`), compilar **Tailwind en build** (sin `cdn.tailwindcss.com`), fuentes self-hosted, HSTS, `Permissions-Policy`, CORS por allowlist, límite JSON 100 kb por defecto, `request_body max_size` en Caddy. JWT a cookie `HttpOnly; Secure; SameSite=Strict` + CSRF (cambio mayor del dashboard).
- **P3-2 Rate limiting (API-025/013/020):** global 300/15 min/IP + específicos; almacén persistente (Postgres/Redis) cuando haya >1 instancia; pairing token ≥64 bits.
- **P3-3 Auth (API-018/019):** `exp` obligatorio, `jti` + revocación, TTL corto + refresh; admin con argon2id/scrypt, ≥12 caracteres y TOTP.
- **P3-4 Validación (API-026):** zod en todos los endpoints enumerados en el informe.
- **P3-5 Docker (INF-006/021/022):** `USER node`, imagen con digest, `.dockerignore`, quitar `|| true`, `read_only`, `cap_drop: [ALL]`, límites; CD real: test → build → registro → `compose pull && up -d`.
- **P3-6 Gobernanza (INF-019/020):** crear `docs/INCIDENT_RESPONSE.md` y `docs/KEY_ROTATION.md` (AEPD 72 h); backups cifrados de PostgreSQL con prueba de restauración; copia offline de `.bentian-secrets`; páginas estáticas `/privacidad` y `/cookies`; endpoints `GET /me/export` y `DELETE /me`; DPAs con Stripe/Resend/Supabase/Hetzner.
- **P3-7 Quality Gate:** añadir al gate: `pnpm audit --prod --audit-level=high`, escaneo de secretos (patrones `BEGIN PRIVATE KEY`, `sk_live_`, `whsec_`), y tests de autorización por endpoint (matriz del informe API, §«MATRIZ DE ENDPOINTS»). Hasta entonces la nota del gate **no** refleja seguridad.
- **P3-8 Documentación veraz (AGT-021/022):** decidir con el propietario entre **implementar** o **retirar** (a) el `SingleInstanceLock` por named pipe y (b) la cola SQLite store-and-forward; corregir `AGENTS.md`/`GEMINI.md` (copias idénticas: editar ambas), `SKILL.md`, `MODULES.md`, `docs/CAPABILITIES_MANIFEST.md` y las páginas públicas que lo prometen.
- **P3-9 Resto:** API-022 (errores genéricos, `/health` mínimo), API-028/029, AGT-008 (DPAPI), AGT-012, AGT-019, AGT-021 (identidad de instancia en `/health`), AGT-023 (minimizar telemetría), INF-020, INF-021…026.

## 6. Tabla de estado (actualizar al cerrar cada tarea)

Formato de estado: `ABIERTO` · `EN CURSO` · `HECHO (commit abc1234)` · `BLOQUEADO (motivo)` · `PRODUCCIÓN VERIFICADA`.

| Tarea | Hallazgos | Estado | Commit | Notas |
|---|---|---|---|---|
| P0-1 | INF-001 | ABIERTO | — | Requiere decisión y claves del propietario |
| P0-2 | API-001, INF-002 | HECHO | — | Whitelist estricta (ALLOWED_RELEASE_FILES), basename, validación de prefijo con path.resolve y dotfiles: deny en /releases/latest/:filename y /releases/:version/:filename |
| P0-3 | API-002 | HECHO | — | requireAuth aplicado a POST /sync/run-reactive y resolveOrgId lanza 401 Unauthorized (BridgeError) si no hay req.user |
| P0-4 | API-007 | HECHO | — | POST /notifications/order exige auth o x-license-key válida en formato y BD; rechazo de CRLF en to/subject; restricción a emails registrados; rate limiting |
| P0-5 | AGT-001 | HECHO | — | Validación estricta SemVer (VERSION_REGEX), confinamiento de ruta en tempDir y borrado atómico garantizado en fallo de descarga o firma Ed25519 |
| P0-6 | INF-010, 011, 013, 014 | HECHO | — | Endpoint PHP blindado: cancel_order/webhook autenticados, create_order limitado (200 líneas) con PENDING_PAYMENT, detección de secreto <16 / placeholder (503), fin de secrets en URL, upload_image sin SVG. Template sincronizada |
| P1-1 | API-003, 004 | HECHO | — | licenses-by-email fuerza req.user.organizationId ignorando query param para no-superadmin; create-portal-session resuelve stripe_customer_id desde BD y valida returnUrl |
| P1-2 | API-005 | HECHO | — | flow.engine.ts handleEvent filtra flow.organizationId === event.organizationId; DISPATCH_WEBHOOK valida HTTPS, anti-SSRF (RFC1918, link-local, cloud metadata) y timeout 5s |
| P1-3 | API-006, INF-009 | HECHO | — | Handlers inline onclick eliminados en licenses.js sustituidos por data-* y delegación en tbody; HWID/hostname/alias escapados en licenses.js, fleet.js y client-portal.js; validación Zod y servidor para alias y HWID |
| P1-4 | API-009 | HECHO | — | agents.router.ts heartbeat previene degradación/reasignación a org_default en agentes existentes y sanitiza req.ip |
| P1-5 | API-010, 012 | HECHO | — | connections.router.ts y sync.router.ts fuerzan organizationId desde token; monitoring.router.ts aplica resolveOrgId para aislar flota de RESELLER y OPERATOR |
| P1-6 | API-008, 027 | HECHO | — | assertProductionSecrets() en server.ts aborta arranque en producción si faltan o son placeholders ADMIN_JWT_SECRET, LICENSE_JWT_SECRET, LICENSE_SIGNING_PRIVATE_KEY o PARTNER_SECRET |
| P1-7 | AGT-003 | HECHO | — | MiniRouter endurecido: validación Host previo a parseo, rechazo Sec-Fetch-Site cross-site, X-Frame-Options: DENY, nosniff, límite 1 MB, Content-Type obligatorio en POST con Origin, X-Bentian-Token para navegador con compatibilidad nativa para tray/CLI sin Origin, bloqueo de UNC en GET /open-file-dialog (Anti-NTLM leak) |
| P1-8 | AGT-002 | HECHO | — | Sanitización y escapeHtml universal de datos dinámicos en templates y scripts GUI (logs, channel, license, sync, factusol) antes de inserción en innerHTML |
| P2-1 | INF-003 | HECHO | — | CI y Docker asegurados con pnpm install --frozen-lockfile, pnpm 9.15.4 fijado, --ignore-scripts en CI y npm ci en dashboard |
| P2-2 | INF-018 | HECHO | — | pnpm.overrides con axios >=1.20.0, proxy-addr >=2.0.8, qs >=6.16.0, uuid >=11.1.1 en root package.json |
| P2-3 | INF-004, 005 | HECHO | — | Workflows de CI/CD endurecidos: permissions: contents: read, environment: production con protecciones |
| P2-4 | AGT-005, 006, 007 | HECHO | — | AutoUpdater verifica isNewer y hash SHA-256 esperado antes de invocar swapper; descarga update vía HTTPS con timeout 60s y límite 150 MB |
| P2-5 | API-014, 030 | HECHO | — | Stripe webhook endurecido contra duplicidad (eventos procesados, sesiones idempotentes); validación de estado paid y planes |
| P2-6 | API-011 | HECHO | — | Gestión de partners y resellers protegida contra sobrescritura de reseller_id y con validaciones estrictas |
| P2-7 | API-015, 016, 017 | HECHO | — | Mutex concurrente conKeyedLock en /licenses/activate para serializar activaciones y prevenir carreras; invalidación de caché y control de maxActivations |
| P2-8 | AGT-016, 017, 018, 020 | HECHO | — | Universal bridge connector con HTTPS obligatorio, validación HMAC, prevención de SSRF (bloqueo IPs privadas) y timeout de 15s |
| P2-9 | AGT-009, 011, 013, 014, 015 | HECHO | — | OrderPlausibilityAdapter creado como decorador de orden previa al conector Factusol (FROZEN) validando límites numéricos y caracteres de control; enmascaramiento de licenseKey en diagnóstico |
| P2-10 | INF-012, 014 | HECHO | — | Endpoint PHP universal blindado: ping sin DDL con SHOW TABLES LIKE, respuesta genérica sin fuga de nombres de BD ni stacktraces, upload_image con límite 10 MB y MIME estricto (JPEG/PNG/WebP sin SVG). Template embebida sincronizada al 100% |
| P2-11 | INF-015, API-023 | HECHO | — | .env.example actualizado con secretos documentados de producción (ADMIN_JWT_SECRET, LICENSE_JWT_SECRET, etc.); TLS de base de datos verificado |
| P2-12 | INF-016, 017 | HECHO | — | Scripts de despliegue y firma blindados: sign-authenticode.js usa servidores RFC 3161 HTTPS y aborta en fallo si DEPLOYING=true; upload-releases.js elimina interpolación cruda en docker exec con payloads Base64, lista blanca de extensiones permitidas y hostVerifier |
| P3-1 … P3-9 | ver §5 | ABIERTO | — | |

## 7. Checklist por tarea (haz esto siempre)

1. Lee los archivos y confirma que el fallo sigue ahí (el código puede haber cambiado).
2. ¿Toca un módulo FROZEN? → capa superior o detente y pregunta.
3. Implementa el fix mínimo + **test de regresión** (con `BENTIAN_CONFIG_PATH` aislado si es del agente).
4. `pnpm run quality:check` ≥ 9,5 y Gate 7 intacto.
5. Commit con autor obligatorio: `security(ID): <resumen>`.
6. Actualiza el §6 y, si cambió algo documentado, `AGENTS.md`/`GEMINI.md` (ambos), `SKILL.md`, `docs/CAPABILITIES_MANIFEST.md`.
7. Si afecta a producción: pide confirmación al propietario → despliega por la vía correcta (§1) → verifica con `curl.exe` → marca `PRODUCCIÓN VERIFICADA`.

## 8. Cosas que NO debes hacer

- No rotar claves, hacer force-push, ni tocar el servidor de producción sin confirmación expresa.
- No reintroducir DuckDNS, modales web de selección de archivos, ni saltar de puerto 39281.
- No «arreglar» el Quality Gate editando sus umbrales.
- No subir secretos a ningún sitio (ni siquiera a este documento).
