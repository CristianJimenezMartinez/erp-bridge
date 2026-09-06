# ERP Bridge — Manual de Despliegue en Producción (Playbook de Mañana)

**Para:** Cristian (Solo Founder)  
**Objetivo:** Guía operativa de 15-20 minutos para activar la infraestructura en la nube y la pasarela de cobros sin fricción ni tareas complejas de administración de sistemas.

---

## Resumen de Costes de la Arquitectura
| Servicio | Proveedor | Región | Coste Mensual |
|---|---|---|---|
| **Base de Datos** | Supabase Managed PostgreSQL | Frankfurt (`eu-central-1`) | **0,00 €** (Capa gratuita generosa) |
| **Servidor API** | Hetzner Cloud VPS (CPX11) | Núremberg / Helsinki | **~4,50 €** |
| **Dominio y Proxy SSL** | Cloudflare Zero Trust (Tunnel) | Red Global Edge | **0,00 €** |
| **Dashboard Web** | Cloudflare Pages (CDN) | Red Global Edge | **0,00 €** |
| **Pasarela de Cobro** | Stripe | Europa (SEPA / Tarjetas) | 1.5% + 0.25€ por transacción |
| **Total Mensual Inicial** | | | **~4,50 € / mes** |

---

## Paso 1: Base de Datos en Supabase (Frankfurt) — 3 Minutos

1. Entra en [supabase.com](https://supabase.com) e inicia sesión con tu cuenta.
2. Haz clic en **"New Project"**:
   - **Name:** `bentian-prod`
   - **Database Password:** Elige una contraseña segura y anótala.
   - **Region:** Selecciona **`Central EU (Frankfurt)`** (fundamental para baja latencia con España y estricto cumplimiento del RGPD europeo).
   - Haz clic en **"Create new project"**.
3. Una vez creado el proyecto:
   - Ve a **Project Settings** (icono de engranaje abajo a la izquierda) -> **Database**.
   - En la sección **Connection string**, selecciona la pestaña **URI** y modo **Session** (puerto 5432 o Transaction Pooler 6543).
   - Copia la cadena generada. Tendrá un formato como este:
     ```bash
     postgresql://postgres.xxxxxx:[TU_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
     ```
4. **¡Listo el Paso 1!** Guarda esta URL. En el momento en que arranquemos la API por primera vez, nuestro código ejecutará automáticamente todas las migraciones (`DatabaseService.runMigrations()`) y creará las tablas en Supabase en menos de 5 segundos.

---

## Paso 2: Servidor API y Dominio con Cloudflare Tunnel — 7 Minutos

### 2.1. Crear el VPS en Hetzner (o Railway)
1. Entra en [console.hetzner.cloud](https://console.hetzner.cloud).
2. Crea un servidor:
   - **Ubicación:** Falkenstein o Núremberg (Alemania).
   - **Imagen:** Ubuntu 24.04 LTS.
   - **Tipo:** Shared vCPU -> CPX11 (2 vCPU, 2 GB RAM, 40 GB NVMe SSD) = **~4,50 €/mes**.
3. Conéctate por SSH al servidor e instala Docker con 1 comando:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
4. Clona tu repositorio o sube la carpeta `erp-bridge`:
   ```bash
   git clone <TU_REPOSITORIO_GIT> erp-bridge
   cd erp-bridge
   ```
5. Crea el archivo `.env` en la raíz del servidor:
   ```bash
   DATABASE_URL="postgresql://postgres.xxxxxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
   ADMIN_EMAIL="admin@bentian.es"
   ADMIN_PASSWORD="TuContraseñaSeguraAdmin2026!"
   ADMIN_JWT_SECRET="GeneraUnaClaveAleatoriaLargaAqui"
   LICENSE_JWT_SECRET="OtraClaveAleatoriaLargaAqui"
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```
6. Arranca el contenedor de producción:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

### 2.2. Conectar `api.bentian.es` con Cloudflare Tunnel (Cero Puertos Abiertos)
*Con Cloudflare Tunnel no necesitas abrir el puerto 80 ni 443 en tu servidor, ni configurar Nginx, ni preocuparte por renovar certificados SSL.*

1. En el panel de [Cloudflare](https://dash.cloudflare.com) -> Selecciona tu dominio `bentian.es`.
2. En el menú lateral ve a **Zero Trust** -> **Networks** -> **Tunnels**.
3. Haz clic en **"Add a tunnel"** -> Elige **Cloudflared** -> Nombre: `bentian-api-tunnel`.
4. Cloudflare te dará un comando de instalación para Ubuntu. Cópialo y pégalo en la terminal de tu VPS (lo instalará como servicio de sistema que arranca solo).
5. En la siguiente pantalla de Cloudflare (**Public Hostnames**):
   - **Subdomain:** `api`
   - **Domain:** `bentian.es`
   - **Service Type:** `HTTP`
   - **URL:** `localhost:3000`
6. Haz clic en **Save Tunnel**.
7. **¡Listo!** `https://api.bentian.es/health` estará respondiendo en internet con certificado SSL comercial gratis, protección contra ataques y máxima velocidad.

---

## Paso 3: Dashboard Web en Cloudflare Pages (`app.bentian.es`) — 3 Minutos

1. En tu máquina local, compila el Dashboard Angular:
   ```bash
   cd apps/dashboard
   npm run build
   ```
   *(Los archivos estáticos se generarán en `apps/dashboard/dist/`)*.
2. En el panel de Cloudflare:
   - Ve a **Workers & Pages** -> **Create application** -> **Pages** -> **Upload assets**.
   - Nombre del proyecto: `bentian-dashboard`.
   - Arrastra y suelta la carpeta compilada de Angular (`browser`).
3. Una vez subido:
   - Ve a **Custom Domains** -> **Set up a custom domain** -> Escribe: `app.bentian.es`.
   - Cloudflare configurará automáticamente el DNS y el certificado SSL.
4. **¡Listo!** Ya puedes entrar a `https://app.bentian.es`, ver la pantalla de Login e iniciar sesión con `admin@bentian.es`.

---

## Paso 4: Configurar Cobros con Stripe — 4 Minutos

1. Entra en tu panel de [Stripe](https://dashboard.stripe.com).
2. Ve a **Product catalog** -> **Add product**:
   - **Name:** `ERP Bridge — Factusol & WooCommerce`
   - **Pricing:** Recurrente mensual (ej. 29,00 € o 49,00 € / mes).
   - Haz clic en **Save product** y crea un **Payment Link** (enlace de pago). Este enlace es el que pones en tu botón "Comprar Ahora" en la web o envías al cliente.
3. Ve a **Developers** -> **Webhooks** -> **Add endpoint**:
   - **Endpoint URL:** `https://api.bentian.es/api/v1/billing/webhook/stripe`
   - **Events to listen:** Selecciona:
     - `checkout.session.completed`
     - `customer.subscription.deleted`
   - Haz clic en **Add endpoint**.
4. En la página del webhook recién creado:
   - Haz clic en **Reveal** bajo "Signing secret" (`whsec_...`).
   - Añade ese valor a tu archivo `.env` en el servidor:
     ```bash
     STRIPE_WEBHOOK_SECRET="whsec_..."
     ```
   - Reinicia la API: `docker compose -f docker-compose.prod.yml restart api`.

---

## ¿Qué ocurre cuando un cliente compra? (Flujo 100% Autónomo)

```mermaid
sequenceDiagram
    actor Cliente
    participant Stripe
    participant API as api.bentian.es
    participant DB as Supabase (Postgres)
    participant Windows as PC Windows del Cliente

    Cliente->>Stripe: Paga su suscripción con tarjeta (29€/mes)
    Stripe->>API: Webhook (checkout.session.completed)
    API->>DB: Crea registro en licenses (EB-XXXXX-XXXXX, active, plan pro)
    API->>Cliente: Envia email con clave EB-... y enlace al instalador Bentian-Setup.exe
    Cliente->>Windows: Ejecuta Bentian-Setup.exe (Instalación limpia)
    Cliente->>Windows: Clic en "Configurar Factusol" (Elige su archivo .accdb)
    Cliente->>Windows: Clic en "Activar Licencia" (Pega su clave EB-...)
    Windows->>API: POST /licenses/activate con HWID único
    API->>Windows: Licencia validada. Token firmado local.
    Note over Windows,API: SINCRONIZACIÓN ACTIVA 24/7 EN SEGUNDO PLANO
```

---

## Verificación Local Antes de Salir a Producción
En cualquier momento puedes verificar que todo el sistema sigue funcionando al 100% en tu máquina ejecutando:
```cmd
scripts\test-all.bat
```
*(Valida los 31 tests del sistema en menos de 30 segundos).*
