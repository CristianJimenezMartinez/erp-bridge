# Software Directories Submission Pack — Bentian ERP Bridge v0.4.7

This pack contains copy-paste-ready submission sheets for the major global software directories:
- **AlternativeTo**
- **SourceForge**
- **Uptodown**
- Bonus: **SaaSHub & Capterra**

---

## Master Metadata & Quick Reference

| Field | Canonical Value |
| :--- | :--- |
| **Product Name** | Bentian ERP Bridge |
| **Moniker / Package ID** | `Bentian.ERPBridge` |
| **Latest Version** | `0.4.7` (Stable) |
| **Release Date** | October 11, 2026 |
| **Author / Developer** | Cristian Jiménez Martínez |
| **Publisher** | Bentian ERP Bridge |
| **Official Website** | https://bridge.cristianjm.com |
| **Press & Media Kit** | https://bridge.cristianjm.com/press/ |
| **Documentation** | https://bridge.cristianjm.com/docs/ |
| **Download Page** | https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe |
| **License Model** | Proprietary / Commercial with Free Trial (No adware, no bloatware) |
| **Primary Category** | Business Software / ERP & POS Integration / eCommerce Sync |
| **Supported OS** | Windows 10, Windows 11, Windows Server 2016/2019/2022/2025 (x64) |
| **SHA-256 Installer** | `e20fa745c14b1bdb3456168182de31b96ed31243de733368a739e41716513b3f` |

---

## 1. AlternativeTo (`alternativeto.net`)

### Application Name
```text
Bentian ERP Bridge
```

### Short Pitch / Tagline (under 140 chars)
```text
Local-first multi-ERP sync bridge connecting Factusol & SimplyGest with WooCommerce, PrestaShop, and Shopify with zero open inbound ports.
```

### Alternatives To (Select or enter during submission):
- DELSOL Conecta
- Conector Factusol Oficial
- Zapier
- Make (Integromat)
- Syncee
- LitExtension
- eSwap
- Cart2Cart

### Application Type & Platforms
- **Type**: Desktop Software + Local Web UI
- **Platforms**: Windows (64-bit), Self-hosted / Local Server
- **License**: Commercial / Free Trial available

### Tags / Keywords
```text
factusol, simplygest, woocommerce, prestashop, shopify, erp, erp-integration, ecommerce-sync, local-first, zero-knowledge, inventory-management, point-of-sale, order-management, store-and-forward, accounting
```

### Long Description (AlternativeTo Markdown)
```markdown
**Bentian ERP Bridge** is an enterprise-grade, local-first connectivity bridge engineered to connect desktop ERP systems (**Factusol** and **SimplyGest**) directly with modern eCommerce platforms (**WooCommerce**, **PrestaShop**, and **Shopify**) in real time.

Unlike traditional cloud SaaS synchronizers or third-party plugins that require uploading proprietary company databases to intermediate cloud servers or opening vulnerable database ports on the office router, Bentian ERP Bridge operates on a **Local-First, Zero-Knowledge architecture**:

### Why Bentian ERP Bridge?
- **Zero Inbound Open Ports**: Communicates exclusively via outbound HTTPS (TLS 1.3). Your corporate network remains completely shielded against external intrusion.
- **Native OLEDB & Direct Database Reading**: Accesses Factusol `.accdb`/`.mdb` tables using non-locking OLEDB drivers, eradicating the infamous `.laccdb` file lock errors (Error 3045). Your sales staff can continue invoicing while the bridge syncs in the background.
- **Polymorphic Multi-ERP Support**: Single Active ERP engine allows dynamic switching between Factusol and SimplyGest with isolated profiles.
- **Atomic Store-and-Forward Queue**: New web orders are buffered in an atomic local disk journal. If internet connectivity drops, orders are safely stored and injected into the ERP automatically upon reconnection with idempotent UUID deduplication.
- **Real-Time DISSTO Stock Computation**: Calculates true available stock (physical stock minus pending customer reservations and web orders) to prevent overselling and out-of-stock incidents.
- **Fiscal Compliance**: Built-in support for Spanish multi-rate VAT (4%, 10%, 21%), Equivalence Surcharge (*Recargo de Equivalencia*), and customer price tiers, while strictly respecting Veri*Factu boundaries.
- **Ultra-Lightweight Windows Agent**: Idle footprint below 35 MB RAM, with a built-in tray companion and web dashboard accessible at `http://127.0.0.1:39281`.
```

### Official Links
- **Website**: `https://bridge.cristianjm.com`
- **Download**: `https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe`
- **Documentation**: `https://bridge.cristianjm.com/docs/`
- **Press Kit**: `https://bridge.cristianjm.com/press/`

---

## 2. SourceForge (`sourceforge.net`)

### Project Details
- **Project Name**: Bentian ERP Bridge
- **Project Unix Name / URL Slug**: `bentian-erp-bridge`
- **License**: Commercial / Proprietary (Free evaluation available)
- **Primary Language**: Spanish (es-ES) / Secondary: English (en-US)

### Short Summary (max 250 characters)
```text
High-performance local-first middleware connecting Factusol and SimplyGest desktop ERPs with WooCommerce, PrestaShop, and Shopify with zero open inbound ports, real-time stock computation, and atomic store-and-forward order processing.
```

### Categorization
- **Topic / Category**: Business & Enterprise -> Financial & Accounting -> Point of Sale (POS) / Inventory Control
- **Database Environment**: Microsoft Access, OLEDB, ODBC
- **Intended Audience**: Information Technology, System Administrators, Small & Medium Businesses, eCommerce Managers, Developers
- **Operating System**: Windows 10, Windows 11, Windows Server (64-bit)
- **Programming Languages**: TypeScript, Node.js, C#, Inno Setup

### Long Description (SourceForge Formatted)
```text
Bentian ERP Bridge is a robust, local-first connectivity solution designed to synchronize desktop business management software (Factusol 2016-2026 and SimplyGest) with modern online stores (WooCommerce, PrestaShop, and Shopify).

Traditional integration methods frequently suffer from database locking (Error 3045), high hosting latency, or severe security risks caused by opening MySQL/Access ports to the public internet. Bentian ERP Bridge eliminates these issues through an on-premise agent that reads database deltas in real time and handles bi-directional data flow using secure outbound HTTPS connections.

KEY HIGHLIGHTS:

1. LOCAL-FIRST & ZERO-KNOWLEDGE
Your ERP database (.accdb, .mdb) never leaves your premises. Data transformations, stock calculations, and encryption occur locally on your machine. API credentials and secrets are encrypted in Windows DPAPI storage.

2. NATIVE MULTI-ERP ARCHITECTURE
Polymorphic driver layer supports both Factusol and SimplyGest. Effortlessly switch ERP backends without altering your eCommerce store configuration.

3. ADVANCED DISSTO STOCK ENGINE
Instantly computes available stock by taking physical inventory and subtracting pending customer orders, warehouse allocations, and inbound web orders. Say goodbye to stockouts.

4. TRANSACTIONAL STORE-AND-FORWARD
Orders placed on WooCommerce or PrestaShop are immediately saved to a local write-ahead journal. In the event of network disruption or power loss, transactions are queued and re-injected into ERP order tables idempotently as soon as connectivity resumes.

5. ZERO INBOUND NETWORK PORTS
Operates behind firewalls and NATs without port forwarding or VPN requirements. All syncing relies on outbound TLS 1.3 connections.

6. FAST SETUP & MINIMAL FOOTPRINT
Installs in less than 3 minutes via Inno Setup. Consumes under 35 MB RAM during operation. Includes a clean browser-based GUI at 127.0.0.1:39281 and a lightweight system tray utility.
```

### Features List (Bulleted)
- Native OLEDB and ODBC read drivers for Factusol (2016-2026) and SimplyGest
- Real-time bi-directional synchronization with WooCommerce, PrestaShop, and Shopify
- Zero open inbound ports required; fully firewall and NAT friendly
- Real-time stock delta calculation with DISSTO formula to prevent overselling
- Persistent Store-and-Forward order queue with atomic recovery and UUID deduplication
- Built-in multi-rate VAT, customer price tariffs (1-5), and Equivalence Surcharge support
- Local encryption of API keys and credentials using Windows Data Protection API (DPAPI)
- Cryptographically signed auto-updates via Ed25519 (RFC 8032)
- Lightweight Windows desktop service & tray icon consuming < 35 MB RAM
- Comprehensive local web dashboard with live KPI monitoring at `127.0.0.1:39281`

### Screenshot Gallery URLs & Capturas
1. `https://bridge.cristianjm.com/assets/screenshots/01-dashboard-overview.png` (Real-time Zen Dashboard Overview)
2. `https://bridge.cristianjm.com/assets/screenshots/02-multi-erp-selector.png` (Multi-ERP Selector - Factusol & SimplyGest)
3. `https://bridge.cristianjm.com/assets/screenshots/03-ecommerce-channels.png` (eCommerce Channels Management)
4. `https://bridge.cristianjm.com/assets/screenshots/04-automation-sync.png` (Automation & Sync Schedules)
5. `https://bridge.cristianjm.com/assets/screenshots/05-sales-order-history.png` (Sales Order History & Audit Trail)
6. `https://bridge.cristianjm.com/assets/screenshots/06-setup-wizard.png` (Guided Setup Wizard)

---

## 3. Uptodown (`uptodown.com`)

### Basic App Information
- **App Name**: Bentian ERP Bridge
- **Package ID**: `Bentian.ERPBridge`
- **Developer**: Cristian Jiménez Martínez
- **Platform**: Windows (x64)
- **Category**: Productivity / Business / Management
- **Price**: Free Trial / Paid
- **Current Version**: `0.4.7`
- **File Name**: `Bentian-Setup-v0.4.7.exe`
- **File Size**: `24,256,743 bytes` (~23.1 MB)
- **SHA-256**: `e20fa745c14b1bdb3456168182de31b96ed31243de733368a739e41716513b3f`

### Spanish Submission Sheet

#### Descripción Corta (Español)
```text
Conector y sincronizador local-first de Factusol y SimplyGest con WooCommerce, PrestaShop y Shopify sin abrir puertos.
```

#### Descripción Detallada (Español)
```text
Bentian ERP Bridge es una herramienta imprescindible para pymes, distribuidores y agencias de desarrollo web que necesitan sincronizar su software de gestión de escritorio (Factusol o SimplyGest) con su tienda online (WooCommerce, PrestaShop o Shopify).

A diferencia de otros plugins o plataformas intermediarias que exigen subir la base de datos a servidores externos, Bentian ERP Bridge trabaja bajo un paradigma local-first: el agente se ejecuta en tu ordenador o servidor Windows, lee directamente la información de artículos, tarifas y existencias mediante conexiones OLEDB no bloqueantes, y la envía de forma segura a tu tienda mediante conexiones salientes cifradas HTTPS.

Características destacadas:
- Sincronización bidireccional en tiempo real: cambios de stock y precios reflejados al instante en tu tienda web.
- Descarga automatizada de pedidos: los pedidos online se transforman en pedidos de cliente en Factusol o SimplyGest con desglose de IVA y recargo de equivalencia.
- Cero puertos abiertos: máxima seguridad informática sin necesidad de tocar la configuración del router ni arriesgar la red corporativa.
- Cola Store-and-Forward: si se cae Internet o el equipo se reinicia, ningún pedido se pierde; el agente los guarda atómicamente y los procesa en cuanto vuelve la conexión.
- Muy ligero: apenas consume 35 MB de memoria RAM y cuenta con un icono en la bandeja del sistema para supervisión rápida.
```

### English Submission Sheet

#### Short Description (English)
```text
Local-first multi-ERP sync tool connecting Factusol and SimplyGest with WooCommerce, PrestaShop, and Shopify with zero open inbound ports.
```

#### Detailed Description (English)
```text
Bentian ERP Bridge is a powerful, lightweight Windows synchronization utility that bridges legacy desktop ERP systems (Factusol and SimplyGest) directly with modern online shops (WooCommerce, PrestaShop, and Shopify).

Operating under a strict Local-First, Zero-Knowledge philosophy, Bentian ERP Bridge keeps your sensitive business database securely inside your local office. The agent accesses product, inventory, and pricing data through optimized non-locking OLEDB drivers, ensuring your on-site billing and warehouse staff can work uninterrupted without database lock exceptions.

Key Features:
- Real-time two-way synchronization for stock levels, pricing tiers, and product updates.
- Automated order injection directly into ERP customer order registries with multi-rate tax and surcharge handling.
- Zero inbound open ports: 100% outbound HTTPS TLS 1.3 connectivity keeps your business network safe from intrusion.
- Atomic Store-and-Forward queue: prevents lost orders during network outages or unexpected shutdowns.
- Minimal resource usage: runs smoothly with under 35 MB RAM footprint and an intuitive tray utility.
```

#### Novedades v0.4.7 / Changelog (Español & English)
```text
[v0.4.7]
- Añadido conector nativo oficial para SimplyGest ERP con arquitectura polimórfica Single Active ERP.
- Optimización del cálculo de stock DISSTO para bases de datos Factusol 2026.
- Nueva cola persistente Store-and-Forward con deduplicación por cabeceras de idempotencia.
- Cifrado local de claves API mediante Windows DPAPI.
- Asistente de configuración guiado en 5 pasos desde la interfaz web local (127.0.0.1:39281).
- Comprobación de integridad y firmas asimétricas Ed25519 en el instalador y actualizaciones.
```

---

## 4. Visual Media Assets & Public CDN Links

- **Application Icon (SVG Vector)**:
  `https://bridge.cristianjm.com/assets/icon.svg`
- **Application Icon (PNG 512x512)**:
  `https://bridge.cristianjm.com/assets/icon-512.png`
- **Application Icon (PNG 256x256)**:
  `https://bridge.cristianjm.com/assets/icon-256.png`
- **Application Icon (Windows ICO)**:
  `https://bridge.cristianjm.com/assets/icon.ico`
- **OpenGraph Social Preview**:
  `https://bridge.cristianjm.com/assets/og-preview.png`

### Screenshots Pack (Retina 2x / 4K)
1. **01-dashboard-overview**: `https://bridge.cristianjm.com/assets/screenshots/01-dashboard-overview.png`
2. **02-multi-erp-selector**: `https://bridge.cristianjm.com/assets/screenshots/02-multi-erp-selector.png`
3. **03-ecommerce-channels**: `https://bridge.cristianjm.com/assets/screenshots/03-ecommerce-channels.png`
4. **04-automation-sync**: `https://bridge.cristianjm.com/assets/screenshots/04-automation-sync.png`
5. **05-sales-order-history**: `https://bridge.cristianjm.com/assets/screenshots/05-sales-order-history.png`
6. **06-setup-wizard**: `https://bridge.cristianjm.com/assets/screenshots/06-setup-wizard.png`
