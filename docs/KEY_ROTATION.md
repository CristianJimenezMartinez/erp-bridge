# Manual Operativo de Rotación de Claves Criptográficas y Secretos
## Bentian ERP Bridge — Protocolo de Gestión Segura de Claves (KMS)

> **ESTADO:** DOCUMENTO OFICIAL DE INFRAESTRUCTURA Y CRIPTOGRAFÍA  
> **ÚLTIMA REVISIÓN:** Octubre 2026  
> **ÁMBITO:** Par Ed25519 de actualizaciones y licencias, secretos JWT, credenciales PostgreSQL, Stripe, Resend y Partner Secret.

---

## 1. Inventario y Ciclo de Vida de Claves y Secretos

| Secreto / Clave | Algoritmo / Formato | Ubicación Autorizada | Impacto de Compromiso | Frecuencia de Rotación |
| :--- | :--- | :--- | :--- | :--- |
| **Par Ed25519 de Actualizaciones** | Ed25519 (RFC 8032) | Privada: `%USERPROFILE%\.bentian-secrets\update-private.pem`<br>Pública: Embebida en Agente de escritorio | **CRÍTICO:** Ejecución de código malicioso remoto suplantando updates | Emergencia o cada 24 meses (mediante Release Puente) |
| **Par Ed25519 de Prueba de Licencias** | Ed25519 (RFC 8032) | Privada: `LICENSE_SIGNING_PRIVATE_KEY` (Hetzner / Vault)<br>Pública: `DEFAULT_LICENSE_PROOF_PUBLIC_KEY` (Agente) | **ALTO:** Falsificación de periodos de gracia de licencias offline | Anual o ante sospecha |
| **`ADMIN_JWT_SECRET`** | HMAC-SHA256 (>= 32 bytes) | Hetzner `.env` / Entorno seguro de producción | **ALTO:** Generación de tokens de administración fraudulentos | Cada 6 meses o ante revocación |
| **`LICENSE_JWT_SECRET`** | HMAC-SHA256 (>= 32 bytes) | Hetzner `.env` / Entorno seguro de producción | **ALTO:** Emisión no autorizada de licencias comerciales | Anual o ante compromiso |
| **`DATABASE_URL`** | PostgreSQL URI con SSL (`sslmode=require`) | Hetzner `.env` (PostgreSQL Frankfurt en Supabase) | **CRÍTICO:** Acceso y exfiltración de base de datos de usuarios | Anual o ante cambio de proveedor |
| **`STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`** | API Key & HMAC Secret (`whsec_...`) | Panel de Stripe / Hetzner `.env` | **MEDIO-ALTO:** Facturación no autorizada o spoofing de webhooks | Cada 12 meses |
| **`RESEND_API_KEY`** | Bearer API Key (`re_...`) | Panel de Resend / Hetzner `.env` | **MEDIO:** Relé de emails transaccionales o abuso de cuota | Anual |
| **`PARTNER_SECRET`** | Cadena aleatoria >= 32 car. | Hetzner `.env` | **MEDIO:** Acceso de partners no autorizados | Cada 6 meses |

---

## 2. Aislamiento y Custodia de Claves Privadas (Regla Inviolable)

1. **PROHIBICIÓN EN REPOSITORIO:** Las claves privadas (`.pem`, `.key`, certificados PFX) tienen **PROHIBIDO** ser commiteadas o rastreadas por git, ni siquiera en ramas privadas.
2. **CUSTODIA LOCAL:** En máquinas de desarrollo autorizadas, residen **ÚNICAMENTE** en:
   `%USERPROFILE%\.bentian-secrets\`
   con permisos restrictivos de Windows NT aplicados mediante PowerShell:
   ```powershell
   icacls "$env:USERPROFILE\.bentian-secrets" /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)F"
   ```
3. **PROHIBICIÓN EN CLOUD SYNC:** Prohibido ubicar carpetas de claves en directorios sincronizados por Google Drive, OneDrive, Dropbox o iCloud.

---

## 3. Procedimientos Paso a Paso de Rotación

### 3.1. Procedimiento A: Rotación del Par Ed25519 de Actualizaciones (Release Puente)

Dado que los agentes instalados en los PCs de los clientes (`BentianAgent.exe`) validan las actualizaciones contra la clave pública embebida en su binario, la rotación de la clave de actualizaciones no puede realizarse de golpe (los agentes antiguos rechazarían la nueva clave). Se sigue el protocolo de **Release Puente**:

```
[Versión Actual v0.3.x] (Valida solo Clave Vieja)
          │
          ▼  Se publica Release Puente (Firmada con Clave Vieja)
[Release Puente v0.4.0] (Acepta Clave Vieja O Clave Nueva)
          │
          ▼  La flota de agentes actualiza automáticamente
[Flota Migrada a v0.4.0+]
          │
          ▼  Se publican releases firmadas con Clave Nueva
[Release Final v0.4.1+] (Firmada con Clave Nueva, retira Clave Vieja)
```

**Paso a paso:**
1. **Generación de nuevo par en máquina de compilación segura:**
   ```powershell
   openssl genpkey -algorithm ed25519 -out "$env:USERPROFILE\.bentian-secrets\update-private-v2.pem"
   openssl pkey -in "$env:USERPROFILE\.bentian-secrets\update-private-v2.pem" -pubout -out "$env:USERPROFILE\.bentian-secrets\update-public-v2.pem"
   ```
2. **Crear Release Puente:**
   - En la capa superior de verificación de actualizaciones del agente, registrar ambas claves públicas como autorizadas (`[OLD_PUBLIC_KEY, NEW_PUBLIC_KEY]`).
   - Firmar la release con la **clave privada antigua** (`update-private.pem`).
   - Desplegar la versión puente y monitorizar mediante el Deadman Switch (`/monitoring/agents/health`) que el 95%+ de la flota ha alcanzado la versión puente.
3. **Transición a Clave Nueva:**
   - Sustituir la clave privada activa en el entorno de build por `update-private-v2.pem`.
   - Compilar la siguiente versión firmada con la clave nueva.
   - Retirar la clave antigua de la lista de claves aceptadas.
4. **Archivo seguro offline:**
   - La clave privada antigua se archiva cifrada con GPG/7-Zip con contraseña fuerte en almacenamiento offline de respaldo.

---

### 3.2. Procedimiento B: Rotación de Claves JWT (`ADMIN_JWT_SECRET` y `LICENSE_JWT_SECRET`)

1. **Generar un secreto de alta entropía (mínimo 64 caracteres hex):**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Actualizar el servidor de producción (Hetzner):**
   - Acceder por SSH autenticado con clave.
   - Editar `.env`:
     ```bash
     ADMIN_JWT_SECRET="<nuevo_secreto_generado>"
     ```
   - Reiniciar el contenedor de forma segura:
     ```bash
     docker restart bentian-api-prod
     ```
3. **Efecto de la rotación:**
   - Todas las sesiones web del Dashboard activas caducarán inmediatamente (401 Unauthorized), obligando a administradores y partners a reautenticarse con sus credenciales o código OTP.
   - Los tokens de licencia activos del agente de escritorio continúan operando mediante su periodo de gracia offline (7 días) mientras renuevan token automáticamente con la API.

---

### 3.3. Procedimiento C: Rotación de Base de Datos (`DATABASE_URL`)

1. En el panel de Supabase / Administrador de PostgreSQL:
   - Crear un nuevo usuario o cambiar la contraseña del usuario `postgres` / `bentian_app`.
2. Probar la nueva cadena de conexión en local con SSL verificado.
3. Actualizar `DATABASE_URL` en `.env` en el servidor Hetzner:
   ```bash
   DATABASE_URL="postgresql://bentian_app:<nueva_password>@db.xxx.supabase.co:5432/postgres?sslmode=require"
   ```
4. Reiniciar la API: `docker restart bentian-api-prod`.
5. Verificar el estado en `/health`:
   ```bash
   curl -i https://bridge.cristianjm.com/health
   ```
   Debe responder `status: "ok"`.

---

### 3.4. Procedimiento D: Rotación de Stripe y Resend

1. **Stripe Webhook Secret (`STRIPE_WEBHOOK_SECRET`):**
   - Acceder al panel de Stripe Dashboard -> Desarrolladores -> Webhooks -> Endpoint `https://bridge.cristianjm.com/api/v1/billing/webhook`.
   - Seleccionar **"Rotar clave para firma"** (Stripe mantiene ambas claves válidas durante 24 horas para evitar caídas).
   - Copiar la nueva clave `whsec_...` al `.env` del servidor Hetzner.
   - Reiniciar `bentian-api-prod`.
   - Una vez verificado que las peticiones se procesan correctamente, revocar la clave antigua en Stripe.
2. **Resend API Key (`RESEND_API_KEY`):**
   - En Resend Dashboard -> API Keys -> Create API Key con permisos Sending Only.
   - Actualizar `RESEND_API_KEY` en `.env` y reiniciar.
   - Enviar email de prueba y revocar la clave antigua en Resend.

---

## 4. Plan de Contingencia y Rollback

Si una rotación de credenciales genera errores `500` o fallos en cascada:
1. **Rollback Inmediato:** Restaurar el fichero `.env.bak` generado antes de la edición.
2. **Reinicio de Emergencia:** `docker restart bentian-api-prod`.
3. **Auditoría de Logs:** Analizar `docker logs bentian-api-prod --tail 100` para determinar la discrepancia antes de reintentar la rotación.
