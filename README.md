# Bentian ERP Bridge

> Sistema de integración de alto rendimiento y grado empresarial para PYMEs: Factusol ERP ↔ WooCommerce.

---

## 1. Visión y Posicionamiento Comercial

Bentian ERP Bridge es un middleware desacoplado y autónomo diseñado para conectar el software de gestión líder en España (**Factusol**) con plataformas de comercio electrónico, comenzando por **WooCommerce (WordPress)** como conector insignia oficial.

### Alcance de Lanzamiento
- **Conector Insignia:** **Factusol ↔ WooCommerce** (100% verificado, soporte prioritario en producción).
- **Conectores en Core:** El repositorio incluye implementaciones en árbol para otros canales (como PrestaShop y SimplyGest) dentro de `packages/connectors/`. No obstante, a nivel comercial, de soporte y de marketing en esta fase de lanzamiento, el foco absoluto es la integración Factusol ↔ WooCommerce para garantizar máxima solidez operativa y cero dispersión.

---

## 2. Arquitectura del Sistema

```
                         ┌─────────────────────────────┐
                         │   Panel Cloud / Dashboard   │
                         │   (Angular en Cloudflare)   │
                         └──────────────┬──────────────┘
                                        │ HTTPS / JWT
                                        ▼
                         ┌─────────────────────────────┐
                         │     Backend Cloud API       │
                         │    (Node.js + Express)      │
                         │  - Licenciamiento HWID      │
                         │  - Webhooks Stripe (HMAC)   │
                         │  - Actualizaciones Ed25519  │
                         └──────────────┬──────────────┘
                                        │ HTTPS (Heartbeat / Sync)
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Máquina Local del Cliente                       │
│                                                                        │
│   ┌─────────────────────┐                 ┌────────────────────────┐   │
│   │    Factusol ERP     │                 │   Bentian Agent Local  │   │
│   │   (Base de Datos    │◄── OLEDB / ─────┤   - GUI Centro Control │   │
│   │   Access .accdb)    │    ADO nativo   │   - System Tray C#     │   │
│   └─────────────────────┘                 │   - Motor de Sync      │   │
│                                           └───────────┬────────────┘   │
└───────────────────────────────────────────────────────┼────────────────┘
                                                        │ HTTPS (REST API)
                                                        ▼
                                            ┌────────────────────────┐
                                            │      WooCommerce       │
                                            │   (WordPress Hosting)  │
                                            └────────────────────────┘
```

---

## 3. Guía de Instalación y Onboarding

### Alerta de Windows SmartScreen ("Editor Desconocido")
Al instalar o ejecutar `Bentian-Setup-vX.Y.Z.exe` o `BentianAgent.exe`, Windows Defender SmartScreen puede mostrar una advertencia azul indicando:
> *"Windows protegió su PC. Microsoft Defender SmartScreen impidió el inicio de una aplicación no reconocida."*

**¿Por qué sucede?**
Los certificados de firma de código comerciales de validación extendida (EV) requieren un historial previo y un coste elevado. Como el software se compila y actualiza frecuentemente, Windows aún no ha indexado el binario en su base de datos de telemetría. El ejecutable está libre de amenazas y compilado con Node SEA y firmas internas Ed25519.

**Instrucciones para el cliente o técnico:**
1. En la ventana azul de SmartScreen, haz clic en el enlace **"Más información"** (*More info*).
2. Aparecerá el botón **"Ejecutar de todas formas"** (*Run anyway*). Haz clic en él.
3. El asistente se iniciará normalmente y abrirá el Centro de Control.

---

## 4. Subida Inicial de Catálogo (Factusol ➔ WooCommerce)

Para clientes que configuran una tienda online vacía o desean poblar el catálogo de WooCommerce desde Factusol por primera vez:
- Dentro del Centro de Control (`http://127.0.0.1:41123` o menú de bandeja -> *Reglas y Sincronización*):
  - Localiza la tarjeta **"Importación Inicial de Catálogo"**.
  - Pulsa en **"Subir Catálogo a WooCommerce"**.
  - El agente leerá los artículos y tarifas de Factusol, omitirá automáticamente aquellos que ya existan en WooCommerce (por SKU), y los cargará en lotes controlados (50 artículos por petición con pausas de 100 ms) para no saturar el hosting del cliente.

---

## 5. Programa de Partners y Liquidación de Comisiones

Para agencias de diseño web, mantenedores de Factusol y consultores informáticos que prescriban e implanten Bentian ERP Bridge:
- **Comisión:** **25% recurrente trimestral** sobre el importe de suscripción de las licencias activas captadas.
- **Modelo Operativo Inicial (Primeros 5 - 10 Partners):**
  - Para evitar la complejidad administrativa y de comisiones bancarias de plataformas como Stripe Connect en la fase de validación, la liquidación se efectúa de forma **manual y directa**.
  - Al cierre de cada trimestre natural, se genera un informe de conciliación con el listado de licencias activas vinculadas al código del partner.
  - El partner emite su factura por el 25% devengado y se liquida mediante transferencia bancaria estándar en un plazo de 5 días hábiles.

---

## 6. Seguridad y Criptografía

- **Protección de Rutas Administrativas:** Todas las rutas sensibles de `apps/api` (`/connections`, `/licenses`, `/updates`) requieren autenticación Bearer JWT.
- **Webhooks de Stripe:** Verificación estricta de firma HMAC-SHA256 con protección contra ataques de repetición (timestamp tolerance: 300 segundos).
- **Actualizaciones Desatendidas:** Cada manifiesto y binario de actualización se firma criptográficamente con curva Ed25519; el agente local rechaza cualquier actualización cuya firma no coincida exactamente con la clave pública integrada.
- **Claves Privadas Aisladas:** Las claves de firma (`*.pem`, `*.key`) están permanentemente fuera del control de versiones (`.gitignore`).
