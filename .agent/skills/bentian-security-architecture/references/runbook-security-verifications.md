# Runbook de Verificación de Seguridad y Mantenimiento

Este runbook detalla los comandos y procedimientos exactos para verificar la seguridad, ejecutar pruebas y realizar despliegues seguros en Bentian ERP Bridge.

--------------------------------------------------------------------------------

## 1. Verificación del Quality Gate y Módulos Congelados (Gate 7)

Cualquier cambio en el monorepo debe someterse al Quality Gate estricto:

```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge"
pnpm run quality:check
```

### Qué valida el Gate 7:
Calcula el hash SHA-256 del árbol de archivos de los 6 módulos sellados:
1. `connectors.factusol` (`packages/connectors/factusol/src`)
2. `core.licensing` (`packages/core/src/license`)
3. `core.update.signer` (`packages/core/src/update/update-signer.ts`)
4. `agent.update.swapper` (`apps/agent/src/update/update.swapper.ts`)
5. `agent.config.persistence` (`apps/agent/src/config/config.manager.ts`)
6. `agent.gui.native_dialog` (`apps/agent/src/gui/tray/BentianTray.cs` y `window-launcher.ts`)

Si se modifica un módulo sellado sin autorización o sin regenerar el hash en `ARCHITECTURE_MANIFEST.json`, el Quality Gate falla y prohíbe el commit o release.

--------------------------------------------------------------------------------

## 2. Ejecución de Tests Unitarios de Seguridad

### En la API:
```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge\apps\api"
npm test
```
* **Qué valida:**
  - `auth-security.test.ts`: Eliminación del PIN de partner por defecto, lockout tras intentos fallidos, tasa de refresco de sesión y no fuga de claves en `/licenses/beta/claim`.
  - `org-scope.test.ts`: Aislamiento multi-tenant por rol (`resolveOrgId`) y funcionamiento del mutex concurrente (`withKeyedLock`).
  - `license-api.test.ts`: Flujo completo de activación, validación y expiración.

### En el Agente:
```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge\apps\agent"
npm test
```
* **Qué valida:**
  - `update-system.test.ts`: Verificación Ed25519 de binarios, generación de scripts PowerShell/Batch, reverificación SHA-256 anti-TOCTOU y fallback de rollback automático.
  - `license-proof.test.ts`: Validación de la prueba asimétrica Ed25519 y periodo de gracia offline.
  - `clock-rollback.test.ts`: Resiliencia ante manipulación deliberada del reloj de Windows.

--------------------------------------------------------------------------------

## 3. Despliegue Seguro de Nuevas Versiones a Producción

Para publicar una nueva versión del monorepo y actualizar el servidor central:

```powershell
cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge"
node builder/build.js patch --deploy
```

### Requisitos previos para el despliegue:
1. La clave privada de actualización debe estar presente en:
   `%USERPROFILE%\.bentian-secrets\update-private.pem`
2. El acceso SSH al servidor Hetzner debe estar activo (`ssh -o BatchMode=yes root@178.105.87.40`).
3. El script automáticamente:
   - Incrementa versión en los 12 `package.json`.
   - Genera instalador `Bentian-Setup.exe` y archivos portables.
   - Firma con Ed25519 el ejecutable y genera `manifest.json`.
   - Sube artefactos al directorio de releases de producción.
   - Actualiza el contenedor Docker en Hetzner con `git pull` y `docker compose up -d --build`.
   - Ejecuta un health check en vivo contra `https://bridge.cristianjm.com/health`.

--------------------------------------------------------------------------------

## 4. Diagnóstico y Monitorización del Servidor en Producción

### Comprobar estado de salud inmediato:
```powershell
curl.exe -s -i -k https://bridge.cristianjm.com/health
```

### Comprobar contenedor y logs en el servidor Hetzner:
```powershell
ssh root@178.105.87.40 "docker ps --filter name=bentian-api-prod; docker logs --tail 30 bentian-api-prod"
```

### Comprobar variables de entorno seguras en el servidor:
```powershell
ssh root@178.105.87.40 "cd /opt/bentian/erp-bridge && ls -la .env && grep -E '^(PARTNER_SECRET|LICENSE_SIGNING_PRIVATE_KEY)=' .env | cut -d= -f1"
```
*(Nota: Nunca imprimir los valores de los secretos en logs ni en terminal pública).*
