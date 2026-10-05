# Runbook de Verificación, Pruebas y Procedimientos de Emergencia

Este runbook detalla los procedimientos estandarizados para verificar la seguridad, ejecutar pruebas de regresión, rotar material criptográfico y gestionar incidentes en Bentian ERP Bridge.

--------------------------------------------------------------------------------

## 1. Verificación del Quality Gate y Módulos Congelados (Gate 7)

Antes de cualquier despliegue, el Quality Gate de 7 niveles debe ejecutarse y aprobarse sin excepciones:

```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge"
pnpm run quality:check
```

### Tabla de Validación de Gates:
Gate | Propósito | Criterio de Éxito
:--- | :--- | :---
**Gate 1** | Modularidad & Presupuesto LOC | Ningún archivo excede 800 líneas (excluyendo tests y templates compilados).
**Gate 2** | Grafo Acíclico de Dependencias | 0 dependencias circulares detectadas con `madge`.
**Gate 3** | Observabilidad Estructurada | 0 `console.*` directos en código de producción (Logger oficial).
**Gate 4** | Seguridad OLEDB & SQL Access | Sanitización de consultas y prevención de inyección en MS Access.
**Gate 5** | Blindaje Anti-Sobreventas | Uso obligatorio de Stock Disponible (`DISSTO = ACTSTO - RESCLI - PENENT`).
**Gate 6** | Consistencia de Toolchain | `tsconfig.base.json` uniforme en los 12 paquetes del monorepo.
**Gate 7** | Sellado Criptográfico (Code Freeze) | Hash SHA-256 del árbol de cada uno de los 6 módulos sellados coincide al 100% con `ARCHITECTURE_MANIFEST.json`.

---

## 2. Batería de Pruebas Automatizadas de Seguridad

### 2.1 Pruebas de API Cloud (`apps/api`)
```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge\apps\api"
npm test
```
* **Qué se valida:**
  - `auth-security.test.ts`: Bloqueo tras 5 intentos fallidos, eliminación del PIN de partner estático, fail-closed si falta `PARTNER_SECRET`.
  - `org-scope.test.ts`: Verificación de que `resolveOrgId()` neutraliza intentos de BOLA vía cabecera `x-organization-id` en roles `RESELLER`, `TENANT_CLIENT` y `OPERATOR`. Verificación de `withKeyedLock()` con activaciones concurrentes serializadas.
  - `license-api.test.ts`: Ciclo de vida de licencias, token HMAC, validación de caducidad y emisión restringida para distribuidores.
  - `docs-static.test.ts`: Redirecciones 301 de rutas legacy hacia URLs canónicas.

### 2.2 Pruebas del Agente Windows (`apps/agent`)
```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge\apps\agent"
npm test
```
* **Qué se valida:**
  - `update-system.test.ts`: Generación de scripts de swap atómico, validación Ed25519 de binarios, reverificación SHA-256 anti-TOCTOU y rollback automático en 10 segundos ante crash.
  - `license-proof.test.ts`: Firma y verificación asimétrica Ed25519 de la prueba offline.
  - `clock-rollback.test.ts`: Tolerancia a manipulaciones de fecha y protección del periodo de gracia.

---

## 3. Protocolo de Rotación de Claves Criptográficas (Zero-Downtime)

### 3.1 Rotación de la Clave Privada de Actualizaciones (`update-private.pem`)
Si se sospecha compromiso de la clave privada de firma de actualizaciones:

1. **Generación del Nuevo Par de Claves:**
   ```powershell
   node -e "const { generateKeyPairSync } = require('crypto'); const { publicKey, privateKey } = generateKeyPairSync('ed25519'); require('fs').writeFileSync('new-private.pem', privateKey.export({ type: 'pkcs8', format: 'pem' })); require('fs').writeFileSync('new-public.pem', publicKey.export({ type: 'spki', format: 'pem' }));"
   ```
2. **Reemplazo en Secrets Locales:**
   - Mover `new-private.pem` a `%USERPROFILE%\.bentian-secrets\update-private.pem`.
   - Ajustar permisos con `icacls`.
3. **Actualización de la Clave Pública en el Monorepo:**
   - Sustituir `builder/keys/update-public.pem` por la nueva clave pública.
   - Actualizar la clave pública incrustada en `apps/agent/src/update/update.verifier.ts` (`DEFAULT_UPDATE_PUBLIC_KEY`).
4. **Calcular Nuevo Hash del Módulo Sellado:**
   - Al tocar `update-signer.ts` o archivos de actualización, recalcular el hash del módulo `core.update.signer` en `ARCHITECTURE_MANIFEST.json`.
5. **Compilar y Publicar Nueva Release:**
   ```powershell
   node builder/build.js patch --deploy
   ```

### 3.2 Rotación de `PARTNER_SECRET`
Si la clave del portal de partners se ve comprometida:

1. Generar nuevo secreto criptográfico de 32 bytes:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```
2. En el servidor Hetzner (`178.105.87.40`), editar `/opt/bentian/erp-bridge/.env`:
   ```bash
   PARTNER_SECRET=<nuevo_secreto_generado>
   ```
3. Reiniciar el contenedor de producción para aplicar el cambio:
   ```bash
   docker restart bentian-api-prod
   ```
4. Distribuir el nuevo secreto exclusivamente a los socios instaladores acreditados.

---

## 4. Gestión de Antivirus, EDR y Windows SmartScreen

### 4.1 Principio de Mínimo Privilegio para Exclusiones
Nunca solicitar ni recomendar exclusiones globales como `*.accdb` ni exclusión global de `cscript.exe` en todo el sistema operativo.

**Reglas Oficiales Recomendadas para Departamentos IT y Suites EDR (CrowdStrike, Bitdefender, SentinelOne):**
1. **Exclusión de Procesos:**
   - `%PROGRAMFILES%\Bentian Agent\BentianAgent.exe`
   - `%PROGRAMFILES%\Bentian Agent\BentianTray.exe`
2. **Exclusión de Carpeta de Datos de Factusol:**
   - Únicamente la carpeta de la empresa en uso (ejemplo: `C:\Factusol\Datos\FS01\` o ruta UNC `\\SRV-DATOS\Factusol\Datos\FS01\`).
3. **Exclusión de Perfil de Agente:**
   - `%APPDATA%\Bentian Agent\`

### 4.2 Reputación de Windows SmartScreen
- Los instaladores oficiales se empaquetan exclusivamente mediante `builder/build.js`.
- El ejecutable oficial dispone de hash SHA-256 publicado en `https://bridge.cristianjm.com/releases/latest.json`.
- En caso de falsos positivos en SmartScreen en releases nuevas, remitir el hash del instalador a Microsoft Defender Security Intelligence Portal para análisis automatizado de reputación.

---

## 5. Procedimiento de Contingencia y Recuperación ante Desastres (Disaster Recovery)

### 5.1 Caída del Contenedor en Producción
Si `https://bridge.cristianjm.com/health` deja de responder:

1. Conectar vía SSH al servidor Hetzner:
   ```powershell
   ssh root@178.105.87.40
   ```
2. Inspeccionar logs del contenedor:
   ```bash
   docker logs --tail 50 bentian-api-prod
   ```
3. Reinicio rápido:
   ```bash
   cd /opt/bentian/erp-bridge
   docker compose -f docker-compose.prod.yml restart
   ```
4. Si el contenedor no arranca por fallo en build, revertir al commit anterior:
   ```bash
   git log -n 3 --oneline
   git checkout HEAD~1
   docker compose -f docker-compose.prod.yml up -d --build
   ```

### 5.2 Restauración de Base de Datos PostgreSQL
Los respaldos de la base de datos PostgreSQL se gestionan en Supabase / Hetzner:
- La conexión de producción utiliza SSL forzado (`sslmode=require`).
- Si la base de datos entra en modo mantenimiento, la API responde automáticamente `503 Service Unavailable` y el Agente de escritorio conmuta a su **cola local SQLite Store-and-Forward**, acumulando pedidos sin pérdida de datos hasta la restauración del servicio.
