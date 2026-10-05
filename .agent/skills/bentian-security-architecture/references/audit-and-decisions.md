# Auditoría de Seguridad, Vectores de Ataque y Racional de Diseño

Este documento profundiza en cada vector de amenaza auditado, la razón técnica por la que existía el riesgo y la solución de ingeniería adoptada.

--------------------------------------------------------------------------------

## 1. Vector: Fuga de Claves Privadas en Entornos Sincronizados

### Descripción de la Amenaza
Las herramientas de sincronización continua de archivos (Google Drive para escritorio, Dropbox, OneDrive) monitorizan los cambios del árbol de directorios y los replican en la nube. Si una clave privada de firma (`.pem`) reside dentro del monorepo en una carpeta sincronizada:
1. Una brecha en la cuenta cloud expone la clave privada de firma de actualizaciones o de licencias.
2. Un error involuntario de `git add` (incluso con `.gitignore`) o empaquetado de assets podría incluir la clave en artefactos distribuidos.

### Solución y Mitigación
- Las claves se trasladaron a `%USERPROFILE%\.bentian-secrets\`.
- La carpeta tiene deshabilitada la herencia de permisos y solo permite acceso a la cuenta del desarrollador (`icacls`).
- Los scripts `build.js` y `test-auto-update-flow.js` buscan en esa ruta externa.
- Si se ejecuta un build con el flag `--deploy` sin disponer de la clave privada real, el proceso falla de forma ruidosa y explícita, bloqueando cualquier publicación con firmas ficticias o hashes.

--------------------------------------------------------------------------------

## 2. Vector: Bypass de Licencia por Alteración del Reloj del Sistema

### Descripción de la Amenaza
El Agente soporta un periodo de gracia offline (7 días) para soportar caídas de red o fines de semana sin conexión a la API central de Bentian. Si la validación offline se basa únicamente en comparar `Date.now()` contra la expiración de un JWT simétrico local:
- Un usuario malintencionado podría congelar la fecha del sistema Windows o retrasar el reloj antes de iniciar el agente, extendiendo indefinidamente el uso del software sin pagar.

### Solución y Mitigación
- **Firma Asimétrica Ed25519:** La API genera una firma Ed25519 con su clave privada sobre el token y sus metadatos.
- **Clave Pública Incrustada:** El Agente tiene la clave pública Ed25519 embebida en su código de producción (`DEFAULT_LICENSE_PROOF_PUBLIC_KEY`).
- **Prueba Criptográfica Obligatoria:** Durante el arranque offline, si el Agente detecta que no hay conexión, verifica que la prueba local `license-proof.enc` exista, esté íntegra, haya sido firmada por la API central y su rango temporal sea consistente. Sin una prueba válida, el agente pasa a modo restringido.

--------------------------------------------------------------------------------

## 3. Vector: TOCTOU (Time-Of-Check to Time-Of-Use) en Actualizaciones de Windows

### Descripción de la Amenaza
En Windows, cuando el Agente se instala en `C:\Program Files\Bentian Agent\`:
1. El proceso en ejecución carece de permisos de escritura directos.
2. El actualizador escribía un script `.bat` y `.ps1` en `%TEMP%\bentian-updates\` y descargaba el nuevo `BentianAgent.exe` en esa misma carpeta temporal.
3. Se lanzaba una solicitud UAC mediante `powershell.exe Start-Process cmd.exe -Verb RunAs`.
4. En Windows, `%TEMP%` es accesible por cualquier proceso que corra bajo la sesión del usuario. Un proceso no privilegiado (un script malicioso o malware en segundo plano) podía monitorear la carpeta `%TEMP%\bentian-updates\` y sustituir el archivo `.bat` o el `.exe` descargado en el lapso milimétrico entre que el agente verificaba el binario y el usuario aceptaba el diálogo UAC de elevación. El proceso elevado ejecutaba entonces el código malicioso con privilegios administrativos.

### Solución y Mitigación
1. **Pre-Staging a Directorio Protegido:** En la rutina de reemplazo, el archivo se transfiere primero a la carpeta de instalación (`BentianAgent.exe.new`).
2. **Reverificación Criptográfica Post-Copia:** Inmediatamente después de la copia y *antes* de detener los procesos o realizar el swap, el script calcula el hash SHA-256 sobre el archivo ya ubicado en el destino protegido (`Get-FileHash -Path "$stagedExe"`).
3. **Validación de Hash contra el Manifiesto Firmado:** El hash calculado se compara de manera estricta contra `$expectedSha256` (obtenido del manifiesto firmado con Ed25519). Si no coincide exactamente, la operación aborta (`exit 3`) sin tocar la instalación.
4. **Ejecución Elevada sin Archivos Intermedios:** El comando PowerShell elevado se pasa mediante `-EncodedCommand` en memoria (Base64 UTF-16LE). No se depende de la integridad de ningún archivo `.bat` en `%TEMP%`.

--------------------------------------------------------------------------------

## 4. Vector: Acceso Transversal Multi-Tenant vía Cabecera `x-organization-id`

### Descripción de la Amenaza
La API soportaba la cabecera `x-organization-id` para permitir que el frontend del panel de control indicara sobre qué empresa estaba consultando el operador.
- Si un socio comercial (`RESELLER`) o un cliente final (`TENANT_CLIENT`) enviaba peticiones con `x-organization-id: <id_de_otra_empresa>`, la función antigua `getOrgId` adoptaba esa organización como contexto para listar conexiones, flujos, agentes o sincronizaciones.

### Solución y Mitigación
- Creación de `apps/api/src/routes/org-scope.ts` con la función `resolveOrgId(req)`.
- Si el usuario autenticado tiene rol `RESELLER`, `TENANT_CLIENT` u `OPERATOR`, la función **ignora por completo** cualquier cabecera `x-organization-id` o parámetro `?organizationId=`, devolviendo siempre `req.user.organizationId`.
- Solo `SUPERADMIN` y `ADMIN` pueden inspeccionar organizaciones arbitrarias.
- En la emisión de licencias de partners (`POST /licenses`), se consulta explícitamente en la base de datos `organizations.reseller_id`. Si la organización no pertenece al partner emisor, se responde `403 Forbidden`.
- Las licencias de reseller tienen techo forzado de 15 días (`trial`), 1 asiento y no pueden auto-confirmar pagos.

--------------------------------------------------------------------------------

## 5. Vector: Ataque Concurrente a `maxActivations` en Licencias

### Descripción de la Amenaza
El método `activateLicense` consulta las activaciones registradas en base de datos. Si el número de equipos activos es menor que `maxActivations`, inserta una nueva fila.
- Si dos o más equipos intentaban activarse de manera simultánea (por ejemplo, en un script de despliegue automatizado), ambas peticiones leían el recuento antes de que ninguna de las dos hubiera completado la inserción, lo que permitía activar más puestos de los contratados.

### Solución y Mitigación
- Módulo `apps/api/src/middleware/keyed-mutex.ts`.
- Serializa en memoria las peticiones concurrentes para una misma clave de licencia mediante promesas encadenadas (`withKeyedLock("activate:" + licenseKey)`).
- La comprobación e inserción ocurren secuencialmente por cada clave, eliminando la condición de carrera sin requerir bloqueos pesados en el motor de base de datos para el resto de licencias.
