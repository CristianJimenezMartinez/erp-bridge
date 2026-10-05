# Auditoría Exhaustiva de Seguridad, Vectores de Explotación y Racional de Ingeniería

Este documento desglosa cada vector de amenaza auditado, el análisis de explotación práctica (Proof of Concept conceptual), el impacto para el negocio y el código exacto antes/después de la corrección.

--------------------------------------------------------------------------------

## 1. Vector: Fuga y Exposición de Claves Privadas Asimétricas

### 1.1 Contexto y Riesgo Inicial
En versiones tempranas, la clave privada de firma de actualizaciones (`builder/keys/update-private.pem`) residía dentro del repositorio. 
* **Impacto:** Si un atacante compromete la clave privada Ed25519 con la que se firman las actualizaciones del Agente, puede emitir binarios maliciosos que cualquier instalación de Bentian en Windows descargará, validará como legítimos e instalará con permisos elevados de administrador.
* **Agravante:** El monorepo reside en una unidad sincronizada con la nube (`G:\Otros ordenadores\Mi PC\Bentian`). La replicación automática multiplica la superficie de ataque al dejar copias en cachés de proveedores cloud.

### 1.2 Remediación Aplicada
1. Las claves se reubicaron en `%USERPROFILE%\.bentian-secrets\`.
2. Se aplicó restricción de permisos NTFS nativos (`icacls "%USERPROFILE%\.bentian-secrets" /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F"`), impidiendo que cualquier otro usuario o servicio del equipo lea las claves.
3. Se modificó `builder/build.js` y `scripts/test-auto-update-flow.js` para resolver la clave en este orden:
   ```javascript
   const privateKeyCandidates = [
     process.env.BENTIAN_UPDATE_PRIVATE_KEY_PATH,
     path.join(require('os').homedir(), '.bentian-secrets', 'update-private.pem'),
     path.resolve(__dirname, 'keys', 'update-private.pem')
   ].filter(Boolean);
   ```
4. **Principio Fail-Closed:** Si se ejecuta con `--deploy` y la clave real no está presente, el script aborta inmediatamente con código de salida 1:
   ```javascript
   } else if (shouldDeploy) {
     console.error('❌ Clave privada no encontrada. Abortando despliegue.');
     process.exit(1);
   }
   ```

--------------------------------------------------------------------------------

## 2. Vector: Bypass de Licencia Offline por Alteración del Reloj (Clock Rollback)

### 2.1 Mecanismo de Ataque
El Agente de Bentian opera bajo el paradigma Local-First. Si la conexión a Internet o al servidor central falla, se activa un periodo de gracia offline (7 días) para que la facturación y la expedición en el almacén de la empresa física no se interrumpan.
* **Fallo anterior:** Si el periodo de gracia dependía de comparar `Date.now()` contra un timestamp guardado en un token simétrico local o archivo JSON, un usuario técnico o administrador de sistemas podía atrasar el reloj del BIOS o del sistema operativo (`Set-Date`) cada 5 días. De este modo, el Agente creía estar siempre dentro del periodo de gracia original.

### 2.2 Defensa Criptográfica (RFC 8032 Ed25519)
Para solucionar esto sin obligar a una conexión a Internet permanente:
1. **Firma Asimétrica Exclusiva de la API:** La API firma digitalmente una prueba con formato:
   `bentian-license-proof-v1\n{licenseId}:{orgId}:{plan}:{issuedAt}:{expiresAt}`
   utilizando su clave privada Ed25519 (`LICENSE_SIGNING_PRIVATE_KEY`).
2. **Validación Inmutable en el Agente:** El Agente tiene embebida en su código compilado la clave pública oficial:
   `MCowBQYDK2VwAyEACVVTSQZYMUTWHDxBgc0ISCVN1NqLkkmW8qH3Dy+2Kwo=`
3. **Persistencia Cifrada con DPAPI:** La prueba se almacena localmente en `%APPDATA%\Bentian Agent\license-proof.enc` cifrada mediante AES-256-GCM.
4. **Anti-Rollback Local:** Al arrancar en modo offline:
   - El Agente verifica la firma asimétrica de la prueba.
   - Comprueba que la fecha actual no sea anterior a `issuedAt` (detección de atraso de reloj).
   - Comprueba que la fecha actual no supere `expiresAt` certificado por la API.
   - Si la prueba no es válida o el reloj fue manipulado, el motor rechaza el arranque offline y entra en modo restringido.

--------------------------------------------------------------------------------

## 3. Vector: TOCTOU en Actualizaciones con Elevación UAC de Windows (CWE-367 / T1548.002)

### 3.1 Mecanismo de Ataque en Windows
En Windows 10/11, cuando un programa instalado en `C:\Program Files\` requiere actualizarse:
1. El proceso del Agente corre bajo el contexto del usuario (Medium Integrity Level).
2. Para sustituir archivos en `Program Files`, se requiere lanzar un proceso con High Integrity Level mediante `Start-Process ... -Verb RunAs`.
3. **La vulnerabilidad TOCTOU:** Si el proceso escribe `C:\Users\<Usuario>\AppData\Local\Temp\bentian-updates\bentian-apply-update.bat` y descarga allí el nuevo ejecutable:
   - Cualquier proceso no privilegiado corriendo bajo la misma sesión de usuario tiene permisos de escritura en `%TEMP%`.
   - Entre el momento en que el Agente valida el hash del archivo y el usuario pulsa "Sí" en el diálogo UAC (que puede tardar varios segundos), un proceso malicioso local podía:
     * Sustituir el archivo `.bat` por uno que ejecute comandos arbitrarios de administrador.
     * Crear un hardlink, symlink o junction de directorios hacia otra ubicación del sistema.
     * Sustituir el `.exe` recién verificado por un troyano.

### 3.2 Solución de Ingeniería Anti-TOCTOU
La solución implementada en `apps/agent/src/update/update.swapper.ts` neutraliza los tres vectores de la carrera:

1. **Pre-Staging a Directorio Protegido:**
   El nuevo binario se copia inmediatamente a la carpeta de destino final protegida (`C:\Program Files\Bentian Agent\BentianAgent.exe.new`). En este directorio, procesos estándar de usuario no tienen permisos de escritura.
2. **Reverificación Criptográfica en Destino:**
   Inmediatamente antes de detener ningún proceso y antes de sustituir el binario, el script PowerShell ejecuta:
   ```powershell
   $stagedExe = "$targetExe.new"
   $actualSha256 = (Get-FileHash -Path "$stagedExe" -Algorithm SHA256 -ErrorAction Stop).Hash.ToLower()
   if ($actualSha256 -ne $expectedSha256.ToLower()) {
       Log-Msg "SEGURIDAD: SHA-256 no coincide. Abortando sin tocar la instalación."
       Remove-Item -Path "$stagedExe" -Force -ErrorAction SilentlyContinue
       exit 3
   }
   ```
   Si el binario fue manipulado o corrompido, la actualización se cancela de inmediato y el servicio en producción no se detiene.
3. **Ejecución en Memoria sin Archivos en Disco (`-EncodedCommand`):**
   Para la elevación UAC, no se ejecuta ningún archivo `.bat` ubicado en `%TEMP%`. En su lugar, el script PowerShell completo se convierte a UTF-16LE, se codifica en Base64 y se inyecta directamente como argumento en memoria:
   ```typescript
   const encodedScript = Buffer.from(this.generatePowerShellScript(options), 'utf16le').toString('base64');
   childProcess.spawn('powershell.exe', [
     '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
     `Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-EncodedCommand','${encodedScript}' -Verb RunAs -WindowStyle Hidden`
   ]);
   ```
   De este modo, no existe ningún archivo temporal intermedio en disco que pueda ser interceptado.

--------------------------------------------------------------------------------

## 4. Vector: Acceso Transversal Multi-Tenant (OWASP API1:2023 BOLA)

### 4.1 Mecanismo de Ataque
El panel de control enviaba la cabecera `x-organization-id` para permitir al usuario cambiar de contexto.
* **Fallo anterior:** Varios routers de la API (`connections`, `sync`, `agents`, `flows`) implementaban:
  ```typescript
  function getOrgId(req: Request): string {
    return (req.headers['x-organization-id'] as string) || req.user.organizationId;
  }
  ```
  Esto significaba que un usuario malicioso o socio distribuidor (`RESELLER`) podía autenticarse legítimamente y luego inyectar `x-organization-id: org_victima` para listar credenciales de conexión OLEDB/WooCommerce de otros clientes, historiales de sincronización o pausar agentes de terceros.

### 4.2 Solución Centralizada (`apps/api/src/routes/org-scope.ts`)
Se reemplazó toda resolución dispersa por el helper canónico `resolveOrgId()`:
```typescript
export function resolveOrgId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  if (!user) {
    return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || 'org_default';
  }
  // Únicamente SUPERADMIN y ADMIN tienen autorización para actuar en nombre de otras organizaciones
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
    return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || user.organizationId;
  }
  // RESELLER, TENANT_CLIENT y OPERATOR quedan estrictamente anclados a su propio token JWT
  return user.organizationId;
}
```

Adicionalmente, en `POST /licenses` para el rol `RESELLER`:
1. Se valida contra PostgreSQL que la organización pertenezca al reseller:
   `SELECT 1 FROM organizations WHERE id = $1 AND reseller_id = $2`
2. Si no coincide, se devuelve `403 Forbidden`.
3. Se fuerzan los límites: plan `trial`, máximo 15 días, máximo 1 asiento y prohibición de auto-confirmar pagos.

--------------------------------------------------------------------------------

## 5. Vector: Ataque de Concurrencia sobre Límite de Asientos (OWASP API4:2023)

### 5.1 Mecanismo de Ataque
El endpoint `/licenses/activate` valida si la licencia dispone de asientos disponibles consultando el recuento de activaciones previas:
```typescript
const count = await getActivationCount(licenseId);
if (count >= maxActivations) throw new Error('Límite alcanzado');
await insertActivation(licenseId, hwid);
```
Si un cliente con una licencia de 1 puesto enviaba 5 peticiones concurrentes simultáneas (por ejemplo, automatizadas con un script en curl o Node.js), las 5 peticiones leían `count = 0` casi en el mismo milisegundo antes de que ninguna hubiera completado la inserción. Como resultado, los 5 puestos quedaban activados.

### 5.2 Solución: Cerrojo Serializado por Clave (`withKeyedLock`)
En `apps/api/src/middleware/keyed-mutex.ts`, se diseñó una cola de promesas en memoria indexada por recurso:
```typescript
const tails = new Map<string, Promise<unknown>>();

export async function withKeyedLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  tails.set(key, tail);
  try {
    await previous.catch(() => undefined);
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) {
      tails.delete(key);
    }
  }
}
```
En `licenses.router.ts`:
```typescript
const result = await withKeyedLock(`activate:${validated.licenseKey}`, () =>
  licenseService.activateLicense(validated)
);
```
* **Ventajas del diseño:**
  1. Serializa exclusivamente las activaciones que compiten por la **misma clave de licencia**.
  2. Licencias diferentes se activan en paralelo con latencia cero.
  3. No requiere bloqueos de tabla en PostgreSQL ni sobrecarga el pool de conexiones.
  4. Si ocurre un fallo en una activación, el cerrojo se libera limpiamente en el bloque `finally`.
