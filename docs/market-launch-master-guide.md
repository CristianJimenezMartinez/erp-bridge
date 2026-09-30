# Guía Maestra y Auditoría de Salida al Mercado: Bentian ERP Bridge

> **Fecha de Elaboración:** Septiembre 2026  
> **Objetivo:** Salida oficial a comercialización y cobro en producción el próximo mes.  
> **Estado del Software:** 100% Blindado (Tests E2E Fases 0 a 6 superados, Quality Gate 9.8/10, Módulos sellados intactos).

---

## ÍNDICE DE BLOQUES CRÍTICOS

1. [Bloque 1: Firma de Código Windows (Azure Trusted Signing vs Certum SimplySign)](#bloque-1-firma-de-código-windows)
2. [Bloque 2: Pasarela de Pagos Stripe en Modo Live (Cobros Reales)](#bloque-2-pasarela-de-pagos-stripe-en-modo-live)
3. [Bloque 3: Infraestructura, Servidor Central y Base de Datos de Producción](#bloque-3-infraestructura-servidor-central-y-base-de-datos)
4. [Bloque 4: Dominio, DNS y Entregabilidad de Correos (Claves de Licencia)](#bloque-4-dominio-dns-y-entregabilidad-de-correos)
5. [Bloque 5: Compilación del Instalador y Publicación de Releases](#bloque-5-compilación-del-instalador-y-publicación-de-releases)
6. [Bloque 6: Aspectos Legales, Fiscales y Regulatorios en España](#bloque-6-aspectos-legales-fiscales-y-regulatorios-en-españa)
7. [Bloque 7: Operativa de Soporte Técnico y Servicio Postventa](#bloque-7-operativa-de-soporte-técnico-y-servicio-postventa)

---

## BLOQUE 1: FIRMA DE CÓDIGO WINDOWS (EL PAGO DE AZURE Y LA VERDAD DE SMARTSCREEN)

### 1.1. La realidad técnica de "Editor Desconocido" vs "Administrador"
* **Ejecutar como Administrador NO elimina el aviso de Editor Desconocido.** Al contrario: si un archivo `.exe` sin firmar solicita privilegios de Administrador (como nuestro instalador `installer.iss`), Windows UAC muestra una alerta de color **amarillo chillón** de advertencia de riesgo.
* Lo único que transforma la alerta UAC a un banner **azul seguro** con el texto:
  > **"Editor comprobado: Bentian Solutions S.L."** (o tu nombre)  
  es la firma digital criptográfica Authenticode (SHA-256 con RFC 3161 Timestamp).

---

### 1.2. Hallazgo Clave en Azure Trusted Signing (Artifact Signing)
Microsoft cobra **$9.99/mes** (incluye 5.000 firmas al mes) y elimina la necesidad de comprar llaves USB de hardware físicas (tokens FIPS de 300€). Sin embargo, existe una **regla mandataria geográfica de Microsoft que debes conocer antes de pagar**:

| Tipo de Titular | ¿Permitido en Azure Trusted Signing? | Requisitos / Acción |
| :--- | :---: | :--- |
| **Empresa (S.L., S.L.U., Sociedad con CIF)** | ✅ **SÍ (España y toda la Unión Europea)** | Aportar CIF de la empresa, escrituras/registro mercantil y número D-U-N-S (gratuito). |
| **Persona Física / Autónomo (DNI / NIE)** | ❌ **NO (Restringido a EE.UU. y Canadá)** | El portal de Azure no permite elegir España a desarrolladores individuales. |

#### **¿Cómo proceder según tu situación fiscal?**

#### Opción A: Si dispones de Sociedad / S.L. constituida en España:
1. **Entrar en Azure Portal** (`portal.azure.com`).
2. Crear o usar una Suscripción de pago por uso de Azure.
3. Buscar el recurso: **Trusted Signing Accounts** (o Artifact Signing).
4. Asignarte el rol IAM: `Trusted Signing Identity Verifier`.
5. Solicitar la **Validación de Identidad de Organización**:
   - Nombre legal exacto de la empresa (tal como figura en el CIF).
   - Dirección fiscal oficial y teléfono corporativo.
   - La validación la realiza Microsoft en **2 a 5 días laborables**.
6. Crear un **Certificate Profile** de tipo `Public Trust`.
7. Descargar la librería `Azure.CodeSigning.Dlib.dll` y configurar `builder/config/azure-metadata.json`.

#### Opción B: Si actúas como Autónomo / Persona Física (DNI/NIE):
Microsoft Trusted Signing te rechazará por la restricción geográfica. La alternativa oficial en Europa es:
* **Certum Cloud Code Signing (SimplySign)**:
  - Autoridad de certificación europea (Polonia/UE) homologada por Microsoft Windows.
  - **Coste:** ~99€ - 150€ al año (~8€ a 12€/mes).
  - **100% en la nube:** No requiere pendrive USB físico. La autenticación se realiza mediante la app móvil *SimplySign* con token 2FA en tu móvil.
  - **Válido para particulares/autónomos en España:** La verificación de identidad se hace online por videollamada o DNI (IDnow).
  - Compatible con `signtool.exe` estándar mediante `SimplySign Desktop`.

---

## BLOQUE 2: PASARELA DE PAGOS STRIPE EN MODO LIVE

El código ya está programado con verificación criptográfica HMAC-SHA256 y manejo de eventos. Para cobrar en producción:

1. **Activar cuenta Stripe en modo Live (`dashboard.stripe.com`)**:
   - Completar el perfil comercial con tu CIF/NIF y razón social.
   - Introducir tu cuenta bancaria española (IBAN) para los depósitos semanales o mensuales.
2. **Reemplazar claves en el archivo de entorno (`.env`) del servidor**:
   - Sustituir `STRIPE_SECRET_KEY=sk_test_...` por tu clave de producción `sk_live_...`.
3. **Configurar el Webhook de Stripe en Producción**:
   - URL del Endpoint: `https://bridge.cristianjm.com/api/v1/billing/webhook`.
   - Seleccionar los 4 eventos obligatorios:
     * `checkout.session.completed` (alta de licencia y envío de email tras compra).
     * `invoice.payment_succeeded` (renovación periódica correcta).
     * `customer.subscription.deleted` (revocación de licencia si cancela).
     * `invoice.payment_failed` (aviso de impago).
   - Copiar el *Signing Secret* generado (`whsec_...`) en la variable `STRIPE_WEBHOOK_SECRET` del servidor.
4. **Habilitar el Portal de Clientes de Stripe**:
   - Configuración -> *Customer Portal*.
   - Permitir a los clientes descargar sus facturas con IVA, actualizar su tarjeta y cancelar su suscripción en 1 clic.
5. **Configuración de Impuestos (IVA / Stripe Tax)**:
   - En España, el software SaaS tributa al 21% de IVA para empresas y autónomos nacionales.
   - Activar Stripe Tax para que calcule automáticamente el IVA español o la exención VIES para clientes de la UE.

---

## BLOQUE 3: INFRAESTRUCTURA, SERVIDOR CENTRAL Y BASE DE DATOS

1. **Servidor Central (`bridge.cristianjm.com`)**:
   - El servidor corre sobre Node.js 20 LTS en Docker (`docker-compose.prod.yml`).
   - Verificar que el contenedor esté configurado con `restart: always`.
   - El certificado SSL HTTPS debe renovarse automáticamente vía Let's Encrypt / Certbot o Cloudflare.
2. **Base de Datos PostgreSQL (Supabase o Postgres Gestionado)**:
   - La cadena de conexión en el `.env` debe usar el Connection Pooler SSL:
     `DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
   - Asegurarse de tener activada la política de copias de seguridad automáticas diarias (*Daily Backups*) en Supabase.
3. **Seguridad y Criptografía de Sesiones**:
   - Generar claves aleatorias seguras de 64 caracteres en el `.env` de producción para:
     * `ADMIN_JWT_SECRET`
     * `LICENSE_JWT_SECRET`
   - Cambiar la contraseña por defecto de `ADMIN_PASSWORD`.

---

## BLOQUE 4: DOMINIO, DNS Y ENTREGABILIDAD DE CORREOS

El agente central despacha automáticamente el email de bienvenida con la clave `EB-XXXXX` (`MailerService.sendLicenseWelcomeEmail`). Para que el correo llegue a la **Bandeja de Entrada** (y no a Spam):

1. **Alta gratuita en Resend (`resend.com`)**:
   - Permite enviar **3.000 correos al mes GRATIS de por vida**.
   - Generar API Key y guardarla en el `.env` del servidor: `RESEND_API_KEY=re_...`.
2. **Publicar Registros DNS en el registrador de dominio (`cristianjm.com`)**:
   - **SPF (TXT):**  
     `v=spf1 include:resend.com ~all`  
     *(O combinar con el hosting de Plesk si envías desde ambos: `v=spf1 include:resend.com include:_spf.hosting... ~all`).*
   - **DKIM (CNAME):**  
     Crear los registros CNAME indicados por Resend para firmar criptográficamente los correos con 2048 bits.
   - **DMARC (TXT):**  
     `_dmarc.cristianjm.com` -> `v=DMARC1; p=none; rua=mailto:dmarc@cristianjm.com; adkim=r; aspf=r;`  
     *(Iniciar con política `p=none` durante los primeros 30 días para no perder correos legítimos mientras se asienta la reputación).*

---

## BLOQUE 5: COMPILACIÓN DEL INSTALADOR Y PUBLICACIÓN DE RELEASES

El pipeline de empaquetado en `builder/build.js` ya cuenta con el módulo `builder/sign-authenticode.js` integrado:

1. **Compilar el release oficial**:
   ```powershell
   cd "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge\builder"
   node build.js 0.3.1
   ```
2. **Lo que hace el constructor automáticamente:**
   - Compila el bundle JavaScript optimizado en CJS.
   - Genera el ejecutable nativo Windows `BentianAgent.exe` mediante Node SEA y parchea el encabezado PE a GUI.
   - Compila el System Tray nativo `BentianTray.exe`.
   - Si detecta credenciales de Azure o Certum, **firma digitalmente los binarios**.
   - Invoca Inno Setup (`ISCC.exe`) para generar el instalador `Bentian-Setup-v0.3.1.exe` con privilegios de administrador, reglas de Firewall y exclusiones de Windows Defender.
   - **Firma digitalmente el instalador final**.
   - Empaqueta los archivos ZIP (`Bentian-Setup-v0.3.1.zip` y `BentianAgent-v0.3.1-Portable.zip`).
   - Genera `checksums.txt` y `manifest.json` con firmas Ed25519 para la actualización silenciosa atómica.
3. **Subir a Producción**:
   - Subir el contenido de `releases/v0.3.1/` al directorio de releases del servidor web para que esté disponible en `https://bridge.cristianjm.com/releases/v0.3.1/Bentian-Setup-v0.3.1.exe`.

---

## BLOQUE 6: ASPECTOS LEGALES, FISCALES Y REGULATORIOS EN ESPAÑA

1. **EULA (Contrato de Licencia de Usuario Final)**:
   - Ya está redactado e integrado en el instalador en `builder/EULA.txt`.
   - Especifica legislación española, prohibición de ingeniería inversa, limitación de responsabilidad y arquitectura Local-First (RGPD Art. 28).
2. **Textos Legales en la Web Pública (`apps/api/public/`)**:
   - Añadir en el pie de página de la landing:
     * **Aviso Legal:** Titular (Autónomo o S.L.), NIF/CIF, domicilio social y email de contacto.
     * **Política de Privacidad:** Cumplimiento RGPD (derecho de acceso, rectificación y supresión).
     * **Términos de Contratación:** Explicar la política B2B de activación inmediata sin periodo de prueba ni devoluciones (Art. 103.m TRLGDCU) y la cancelación de renovación en 1 clic.
3. **Facturación a Clientes**:
   - Las cuotas cobradas por Stripe deben registrarse en tu contabilidad con una serie correlativa de facturas (ej. `FRA-2026-001`). Stripe Invoicing puede generar la factura PDF automáticamente para el cliente.

---

## BLOQUE 7: OPERATIVA DE SOPORTE TÉCNICO Y POSTVENTA

1. **Canal Oficial de Asistencia**:
   - Email visible: `soporte@cristianjm.com`.
   - Soporte técnico oficial incluido por correo electrónico y documentación técnica paso a paso.
2. **Documentación de Autoayuda lista para clientes**:
   - `docs/windows-antivirus-smartscreen-guide.md` (cómo permitir la aplicación si algún antivirus de terceros es muy agresivo).
   - `docs/cloudflare-plesk-waf-bypass.md` (por si la tienda web del cliente tiene un firewall de hosting que bloquee la sincronización).

---

## RESUMEN DE COSTES MENSUALES TOTALES PARA EL LANZAMIENTO

| Concepto | Proveedor | Coste Mensual |
| :--- | :--- | :---: |
| **Firma de Código (Code Signing)** | Azure Trusted Signing (Empresa) o Certum SimplySign (Autónomo) | ~$8 a $10 / mes |
| **Pasarela de Pagos** | Stripe | Solo comisión por venta (1.5% + 0.25€) |
| **Base de Datos Gestionada** | Supabase (Tier Gratuito hasta 500MB) | **0.00 €** |
| **Envío de Correos Transaccionales** | Resend (3.000 emails/mes gratis) | **0.00 €** |
| **Hosting y VPS Servidor Central** | Hetzner / VPS existente | ~5.00 € / mes |
| **Dominio y DNS** | Dominio existente | ~1.00 € / mes |
| **TOTAL GASTOS FIJOS OPERATIVOS** | | **~14 a 16 € / mes** |
