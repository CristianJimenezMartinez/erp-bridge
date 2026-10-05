---
name: bentian-security-architecture
description: >-
  Arquitectura completa de seguridad, criptografía asimétrica Ed25519, blindaje anti-TOCTOU,
  aislamiento multi-tenant, gestión de secretos y runbooks de verificación de Bentian ERP Bridge.
  Activar cuando se realicen cambios de autenticación, licencias, actualizaciones, secretos o infraestructura.
---

# Bentian Security Architecture & Cryptographic Safeguards

Este documento recoge la arquitectura de seguridad integral de Bentian ERP Bridge, las vulnerabilidades mitigadas, el razonamiento técnico de cada decisión y los procedimientos para verificar o extender cualquier módulo crítico sin romper los Quality Gates ni los módulos sellados.

--------------------------------------------------------------------------------

## 1. Resumen Ejecutivo de Salvaguardas Implementadas

Área | Riesgo Previo | Solución Implementada | Archivos Clave
:--- | :--- | :--- | :---
**Secretos y Claves** | Claves `.pem` en carpetas sincronizadas en Google Drive | Claves movidas a `%USERPROFILE%\.bentian-secrets\` con ACLs exclusivas; el build falla si falta la clave al desplegar | `builder/build.js`, `scripts/test-auto-update-flow.js`
**Prueba de Licencia** | Manipulación de reloj local extendiendo periodo de gracia | Firma Ed25519 asimétrica (`LicenseProofService`) con clave privada en API y clave pública fija en Agente (`license-proof.ts`) | `apps/api/src/services/license-proof.service.ts`, `apps/agent/src/license/license-proof.ts`
**Actualizador (Anti-TOCTOU)** | Proceso no privilegiado podía alterar el `.bat` en `%TEMP%` antes de que UAC lo ejecutara | Staging con reverificación SHA-256 previa y ejecución elevada en memoria con `-EncodedCommand` | `apps/agent/src/update/update.swapper.ts`, `ARCHITECTURE_MANIFEST.json`
**Aislamiento Multi-Tenant** | Cabecera `x-organization-id` permitía a un `RESELLER` leer datos de otros clientes | Helper centralizado `resolveOrgId()` que ancla a no-admins a su propia organización; verificación estricta de `reseller_id` | `apps/api/src/routes/org-scope.ts`, routers de la API
**Carrera en Activaciones** | Peticiones simultáneas a `/licenses/activate` podían superar `maxActivations` | Mutex en memoria serializado por clave de licencia (`withKeyedLock`) | `apps/api/src/middleware/keyed-mutex.ts`, `apps/api/src/routes/licenses.router.ts`
**Fuga de Claves Beta** | Respuesta HTTP exponía la licencia en texto claro | La licencia se envía únicamente por email corporativo; rate limiting estricto por IP y por email | `apps/api/src/routes/licenses.router.ts`, `apps/api/src/middleware/rate-limit.ts`
**Falsificación de IP (XFF)** | Clientes podían falsear `X-Forwarded-For` para eludir lockouts | Detección canónica `getClientIp()` basada en `req.ip` de Express configurado tras proxy de confianza | `apps/api/src/routes/auth.router.ts`

--------------------------------------------------------------------------------

## 2. Decisiones Arquitectónicas y Razonamiento Técnico

### 2.1 Gestión de Claves y Secretos (`%USERPROFILE%\.bentian-secrets\`)
* **Problema:** Guardar `update-private.pem` o `license-signing-private.pem` dentro del repositorio o en una carpeta de Google Drive expone material criptográfico en caso de sincronización indebida o fugas de repo.
* **Solución:**
  1. Las claves privadas residen fuera de la raíz del monorepo, en `%USERPROFILE%\.bentian-secrets\`.
  2. Los permisos de archivo se ajustan con `icacls` para herencia deshabilitada y acceso exclusivo al usuario del sistema.
  3. `builder/build.js` busca la clave en orden:
     `process.env.BENTIAN_UPDATE_PRIVATE_KEY_PATH` $\rightarrow$ `~/.bentian-secrets/update-private.pem` $\rightarrow$ `builder/keys/` (solo fallback local).
  4. Si se invoca `--deploy` y la clave no existe, el build aborta con error: **nunca se publica un instalador con firma fallback**.

### 2.2 Prueba Asimétrica de Licencia (Ed25519 License Proof)
* **Problema:** En arquitecturas locales, un usuario con permisos de administrador en Windows puede retrasar el reloj del sistema operativo para forzar al Agente a permanecer perpetuamente en el periodo de gracia offline (7 días).
* **Solución:**
  1. Cada vez que el agente contacta con la API (`/licenses/activate` o `/licenses/validate`), la API firma con Ed25519 un payload con formato:
     `bentian-license-proof-v1\n{licenseId}:{orgId}:{plan}:{issuedAt}:{expiresAt}`
  2. La API firma con `LICENSE_SIGNING_PRIVATE_KEY`.
  3. El Agente valida la firma con la clave pública embebida inmutable (`DEFAULT_LICENSE_PROOF_PUBLIC_KEY`).
  4. La prueba se guarda cifrada en disco (`license-proof.enc`).
  5. Para conceder periodo de gracia offline, el Agente requiere obligatoriamente una prueba criptográfica válida no expirada.

### 2.3 Blindaje Anti-TOCTOU en `UpdateSwapper`
* **Problema:** En Windows, cuando el Agente se instala en `C:\Program Files\`, la actualización requiere elevación UAC. Si el proceso sin privilegios escribe un script en `%TEMP%\bentian-updates\bentian-apply-update.bat` y le pide al usuario elevar `cmd.exe /c ...`, un atacante local o malware en espacio de usuario podía modificar el archivo `.bat` o el binario descargado en `%TEMP%` en la fracción de segundo previa a la ejecución elevada (Time-Of-Check to Time-Of-Use).
* **Solución:**
  1. **Staging protegido y reverificación:** El nuevo binario se copia a la carpeta de destino (protegida si es `Program Files`, ej: `BentianAgent.exe.new`) y se verifica con `Get-FileHash` contra el hash SHA-256 certificado en el manifiesto firmado. Si difiere un solo bit, aborta con código 3 sin tocar nada.
  2. **Ejecución en memoria (`-EncodedCommand`):** En lugar de invocar un `.bat` en disco, el comando PowerShell elevado viaja codificado en Base64 UTF-16LE en la línea de comando del proceso elevado. No existe ningún archivo editable en `%TEMP%` que pueda interceptarse.

### 2.4 Aislamiento Multi-Tenant y Seguridad de Partners
* **Problema:** El código histórico usaba `(req.headers['x-organization-id']) || authReq.user.organizationId` indistintamente, lo que permitía a un `RESELLER` o a un cliente autenticado alterar la cabecera para ver datos de otras empresas.
* **Solución:**
  - Función centralizada `resolveOrgId(req)` en `apps/api/src/routes/org-scope.ts`.
  - Roles no privilegiados (`RESELLER`, `TENANT_CLIENT`, `OPERATOR`) devuelven **siempre** `req.user.organizationId`.
  - Solo `SUPERADMIN` o `ADMIN` pueden inspeccionar organizaciones arbitrarias.
  - Al emitir licencias (`POST /licenses`), si el llamador es `RESELLER`, se verifica en PostgreSQL que la organización destino tenga su `reseller_id`. Si no le pertenece, se rechaza con `403 Forbidden`.
  - Un `RESELLER` solo puede emitir licencias `trial` de máximo 15 días y 1 asiento.

### 2.5 Cerrojo Atómico de Activaciones (`withKeyedLock`)
* **Problema:** Dos agentes arrancando simultáneamente con la misma clave de licencia podían superar el límite de `maxActivations` debido a que la consulta de recuento y la posterior inserción no estaban serializadas.
* **Solución:**
  - Módulo `keyed-mutex.ts` implementa exclusión mutua basada en promesas encadenadas indexadas por clave de recurso (`activate:${licenseKey}`).
  - Peticiones sobre la misma licencia se ejecutan estrictamente en serie, mientras que licencias distintas se procesan concurrentemente sin degradar el rendimiento.

--------------------------------------------------------------------------------

## 3. Runbooks de Verificación Rápida

### 3.1 Comprobación del Quality Gate y Módulos Sellados
```powershell
# En g:\Otros ordenadores\Mi PC\Bentian\erp-bridge
pnpm run quality:check
```
* **Criterio de éxito:** Nota $\ge$ 9.5 / 10.00 y Gate 7 ("FROZEN MODULES") con todos los módulos con estado `✓ sellado e intacto`.

### 3.2 Tests del Agente y Sistema de Actualización
```powershell
cd "apps/agent"
npm test
```
* **Criterio de éxito:** Todos los tests de `update-system.test.ts`, `license-proof.test.ts`, `clock-rollback.test.ts` pasando con exit code 0.

### 3.3 Tests de Seguridad de la API
```powershell
cd "apps/api"
npm test
```
* **Criterio de éxito:** Tests de `auth-security.test.ts`, `org-scope.test.ts`, `license-api.test.ts` pasando con exit code 0.

### 3.4 Salud del Servidor de Producción (Hetzner)
```powershell
curl.exe -s -i -k https://bridge.cristianjm.com/health
```
* **Criterio de éxito:** HTTP 200 OK con JSON `{"status":"OK", ..., "database":{"healthy":true}}`.

--------------------------------------------------------------------------------

## 4. Guía de Referencias Detalladas
* [Histórico de auditoría y análisis de decisiones](./references/audit-and-decisions.md)
* [Runbooks paso a paso de verificación y resolución de incidentes](./references/runbook-security-verifications.md)
