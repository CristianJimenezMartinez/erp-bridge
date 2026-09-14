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
   ADMIN_EMAIL="cristian@cristianjm.com"
   ADMIN_PASSWORD="TuContraseñaSeguraAdmin2026!"
   ADMIN_JWT_SECRET="GeneraUnaClaveAleatoriaLargaAqui"
   LICENSE_JWT_SECRET="OtraClaveAleatoriaLargaAqui"
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```
6. Arranca el contenedor o servicio de producción:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

### 2.2. Conectar `bridge.cristianjm.com` (Caddy / Reverse Proxy con SSL Automático)
*El servidor Hetzner ya cuenta con Caddy configurado en `bridge.cristianjm.com`, emitiendo certificados Let's Encrypt de forma 100% automática.*

1. El dominio `bridge.cristianjm.com` apunta a la IP del VPS (`178.105.87.40`).
2. Caddy redirige el tráfico HTTPS directamente a la API interna (`localhost:3000`) y sirve los estáticos de la landing y releases.
3. `https://bridge.cristianjm.com/health` responde en internet con certificado SSL comercial, protección y máxima velocidad.

---

## Paso 3: Dashboard Web y Releases (`bridge.cristianjm.com`)

1. El Dashboard y la Landing residen en el servidor bajo `bridge.cristianjm.com`:
   - Landing Web: `https://bridge.cristianjm.com/`
   - Dashboard Clientes: `https://bridge.cristianjm.com/dashboard/`
   - API Backend: `https://bridge.cristianjm.com/api/v1/`
   - Manifiesto de Releases: `https://bridge.cristianjm.com/releases/latest.json`
2. El acceso administrativo se realiza con `cristian@cristianjm.com`.

---

## Paso 4: Configurar Cobros con Stripe — 4 Minutos

1. Entra en tu panel de [Stripe](https://dashboard.stripe.com).
2. Ve a **Product catalog** -> **Add product**:
   - **Name:** `Bentian ERP Bridge — Factusol & WooCommerce`
   - **Pricing:** Recurrente mensual (29,00 € / mes) o anual (199,00 € promo / 249,00 € / año), incluyendo 3 puestos locales.
   - Haz clic en **Save product** y crea un **Payment Link** (enlace de pago). Este enlace es el que pones en tu botón "Comprar Ahora" en la web o envías al cliente.
3. Ve a **Developers** -> **Webhooks** -> **Add endpoint**:
   - **Endpoint URL:** `https://bridge.cristianjm.com/api/v1/billing/webhook`
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
   - Reinicia la API: `pm2 restart erp-bridge-api` (o `docker compose restart api`).

---

## ¿Qué ocurre cuando un cliente compra? (Flujo 100% Autónomo)

```mermaid
sequenceDiagram
    actor Cliente
    participant Stripe
    participant API as bridge.cristianjm.com
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
