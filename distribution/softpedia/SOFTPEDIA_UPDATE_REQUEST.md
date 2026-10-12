# Softpedia Editorial Update Request — Bentian ERP Bridge v0.4.7

This document contains the official editorial submission package for **Softpedia** (`editor@softpedia.com` / `submit@softpedia.com`) to update or publish the product listing for **Bentian ERP Bridge** version **0.4.7**.

---

## 1. Editorial Submission Email Template

```text
To: editor@softpedia.com
Subject: [Product Update] Bentian ERP Bridge 0.4.7 - Local-First Multi-ERP Connector for Factusol & SimplyGest

Dear Softpedia Editorial Team,

We would like to request an update to the listing for Bentian ERP Bridge on Softpedia to the latest stable release: v0.4.7.

Bentian ERP Bridge is a high-performance, local-first connectivity agent and middleware that bridges legacy desktop ERP databases (Factusol and SimplyGest) directly with modern e-commerce storefronts (WooCommerce, PrestaShop, and Shopify) with zero open inbound ports and zero intermediary cloud custody of customer databases.

Below are the complete release details, official download URLs, cryptographic verification hashes, updated descriptions, changelog, and direct links to 6 high-resolution Retina screenshots on our public CDN:

=======================================================
PRODUCT METADATA & DOWNLOADS
=======================================================
- Product Name: Bentian ERP Bridge
- Version: 0.4.7
- Release Date: October 11, 2026
- Category: Windows -> Business -> Inventory & ERP / POS
- License Type: Commercial / Free Trial (No adware, no spyware, no bundled third-party tools)
- Official Website: https://bridge.cristianjm.com
- Press Kit & Media Resources: https://bridge.cristianjm.com/press/
- Developer / Publisher: Bentian ERP Bridge (Author: Cristian Jimenez Martinez)
- Support Email: soporte@cristianjm.com

DOWNLOAD LINKS & VERIFICATION:
- Official Setup Installer (Inno Setup x64):
  https://bridge.cristianjm.com/releases/v0.4.7/Bentian-Setup-v0.4.7.exe
- Canonical Latest Setup Alias:
  https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe
- Installer ZIP Archive:
  https://bridge.cristianjm.com/releases/v0.4.7/Bentian-Setup-v0.4.7.zip
- Standalone Portable Edition (ZIP):
  https://bridge.cristianjm.com/releases/v0.4.7/BentianAgent-v0.4.7-Portable.zip
- Official Checksums File:
  https://bridge.cristianjm.com/releases/v0.4.7/checksums.txt

CRYPTOGRAPHIC SHA-256 HASHES:
- Bentian-Setup-v0.4.7.exe:
  e20fa745c14b1bdb3456168182de31b96ed31243de733368a739e41716513b3f
- Bentian-Setup-v0.4.7.zip:
  89de8bc03007d7e551d59608a22676681b1066d4bb4084d6669d1e6b5ce6a9d3
- BentianAgent-v0.4.7-Portable.zip:
  b81056cd539470466a1c285a84ff97cbd1b53b9ce0e62d097cd145eb46361dc2
- BentianAgent.exe (Binary):
  99a60ffa303c442bacfd70f1dedd43d29e3484b3d4ae31598f60cfee1c080b6f

HIGH-RESOLUTION SCREENSHOTS (Retina 2x / 4K):
1. Real-time Zen Dashboard Overview:
   https://bridge.cristianjm.com/assets/screenshots/01-dashboard-overview.png
2. Polymorphic Multi-ERP Selector (Factusol & SimplyGest):
   https://bridge.cristianjm.com/assets/screenshots/02-multi-erp-selector.png
3. Multi-Channel eCommerce Connectors:
   https://bridge.cristianjm.com/assets/screenshots/03-ecommerce-channels.png
4. Synchronization Policies & Automated Scheduling:
   https://bridge.cristianjm.com/assets/screenshots/04-automation-sync.png
5. Transactional Sales Order History & Audit Trail:
   https://bridge.cristianjm.com/assets/screenshots/05-sales-order-history.png
6. Step-by-Step Initial Setup Wizard:
   https://bridge.cristianjm.com/assets/screenshots/06-setup-wizard.png

We would appreciate it if you could update your editorial listing with these files. Please let us know if you need any additional technical information or evaluation licenses.

Best regards,
Cristian Jiménez Martínez
Founder & Software Architect, Bentian ERP Bridge
https://bridge.cristianjm.com
```

---

## 2. Product Descriptions

### Short Description (English - 148 characters)
> Universal local-first synchronization bridge connecting desktop ERPs (Factusol & SimplyGest) with WooCommerce, PrestaShop, and Shopify in real time.

### Short Description (Spanish - 150 caracteres)
> Conector universal y sincronizador local-first de Factusol y SimplyGest con WooCommerce, PrestaShop y Shopify sin abrir puertos ni ceder tus datos.

### Long Description (English)

**Bentian ERP Bridge** is an enterprise-grade, local-first synchronization middleware and Windows desktop agent designed to bridge traditional desktop enterprise resource planning software—specifically **Factusol** (2016 through 2026 editions) and **SimplyGest**—with modern online storefronts including **WooCommerce**, **PrestaShop**, and **Shopify**.

Unlike conventional synchronization plugins or invasive cloud SaaS connectors that require exposing local database ports (such as opening port 3306 or SMB network shares) or uploading proprietary customer catalogs to external third-party servers, Bentian ERP Bridge operates entirely on a **Zero-Knowledge, Local-First paradigm**:

- **Zero Inbound Open Ports**: The desktop agent initiates all communications outward via secure HTTPS connections protected by TLS 1.3. Your local server or desktop PC remains completely sealed against external port scanning, DDOS attacks, and unauthorized access.
- **Native Non-Locking Database Access**: Employs optimized local OLEDB (Microsoft ACE) and ODBC abstraction layers that read catalog and stock tables without ever acquiring locks on `.laccdb` or `.ldb` lockfiles. Your sales, billing, and accounting staff can operate Factusol or SimplyGest concurrently with zero freezes or Error 3045 exceptions.
- **Atomic Store-and-Forward Order Injection**: When new orders arrive from WooCommerce or PrestaShop, Bentian ERP Bridge validates, deduplicates, and buffers them into an atomic local disk journal. Even during total internet outages or local network drops, orders are reliably stored and automatically flushed into the ERP upon reconnection with guaranteed idempotency.
- **Polymorphic Multi-ERP Architecture**: Version 0.4.7 introduces seamless polymorphic switching between Factusol and SimplyGest through an intuitive desktop GUI running on a zero-overhead local webview (`http://127.0.0.1:39281`).
- **Comprehensive Spanish Fiscal Compliance**: Native handling of multi-rate VAT (IVA 4%, 10%, 21%), Equivalence Surcharge (Recargo de Equivalencia), customer price tiers (Tarifas 1-5), and Veri*Factu regulatory boundaries without altering official billing registers or invoicing series.
- **Zero-Footprint Windows Agent**: Consumes under 35 MB of RAM in background mode. Includes a native system tray companion (`BentianTray.exe`), silent startup options, and cryptographically verified automatic updates powered by Ed25519 digital signatures.

### Long Description (Spanish)

**Bentian ERP Bridge** es una solución de conectividad y sincronización bidireccional local-first diseñada para conectar sistemas de gestión empresarial de escritorio —principalmente **Factusol** (ediciones 2016 a 2026) y **SimplyGest**— con tiendas de comercio electrónico líderes como **WooCommerce**, **PrestaShop** y **Shopify**.

Frente a soluciones cloud invasivas que exigen subir la base de datos empresarial a servidores externos o abrir puertos vulnerables en el router del negocio, Bentian ERP Bridge revoluciona la integración mediante una arquitectura de **Soberanía y Privacidad Total**:

- **Cero Puertos Abiertos**: Toda la comunicación se efectúa en sentido saliente cifrada bajo TLS 1.3. La red local de la empresa permanece impermeable a ciberataques externos.
- **Lectura OLEDB de Alto Rendimiento**: Acceso directo y no bloqueante al archivo `.accdb`/`.mdb`, eliminando para siempre las colisiones de bloqueo de ficheros (`.laccdb`) y permitiendo que los operarios de la empresa continúen facturando con total agilidad.
- **Cálculo de Stock Disponible DISSTO**: Computa en milisegundos las existencias reales deduciendo pedidos de cliente pendientes, reservas de almacén y pedidos web entrantes para erradicar las roturas de stock en tienda online.
- **Cola Transaccional Store-and-Forward**: Si la conexión a Internet o el servidor sufren una interrupción, los pedidos se retienen con seguridad en disco local y se inyectan ordenadamente en el ERP en cuanto se restablece la comunicación, evitando pedidos duplicados mediante control estricto de identificadores UUID.
- **Gestión Fiscal Avanzada**: Soporte nativo para recargo de equivalencia, múltiples tipos impositivos y tarifas diferenciadas de cliente, salvaguardando en todo momento el marco normativo de Veri*Factu.

---

## 3. Comprehensive Changelog — Version 0.4.7

### Release Date: 2026-10-11
### Build: 0.4.7-stable (x64)

#### What's New in v0.4.7:
1. **SimplyGest Official Connector Integration**:
   - Added full polymorphic driver support for SimplyGest ERP database structures.
   - Real-time catalog extraction: Articles, families, stock, multiple rates, and customer accounts.
   - Bi-directional sales order injection into SimplyGest order registries with automatic order numbering resolution.
2. **Polymorphic Multi-ERP Dynamic Switching**:
   - Single Active ERP selector in UI allows instant switching between Factusol and SimplyGest with complete profile isolation.
3. **Factusol 2026 DISSTO Stock Calculation Engine**:
   - Upgraded stock aggregation engine to support Factusol 2026 table layouts.
   - Real-time stock delta caching with SHA-256 hash comparison in memory, reducing database read cycles by 78%.
4. **Enhanced Store-and-Forward Atomic Journal**:
   - Persistent write-ahead log ensures zero order loss across system reboots, unexpected shutdowns, or transient network failures.
   - Idempotent deduplication headers verify every transaction against e-commerce order IDs.
5. **Security & Cryptographic Hardening**:
   - Windows Data Protection API (DPAPI) integration for local encryption of API keys and database credentials.
   - Ed25519 asymmetric signature verification (RFC 8032) before applying any automatic software updates.
6. **User Experience & Management**:
   - Refined Zen Dashboard interface (`127.0.0.1:39281`) with real-time KPI metrics, latency monitor, and visual health indicators.
   - Redesigned 5-step Setup Wizard for rapid initial onboarding in less than 3 minutes.
   - Windows System Tray dock integration with fast status indicators and one-click diagnostics.

---

## 4. Technical Specifications Summary

| Property | Value |
| :--- | :--- |
| **Product Version** | `0.4.7` |
| **Architecture** | 64-bit (`x64`) |
| **Operating Systems** | Windows 10, Windows 11, Windows Server 2016/2019/2022/2025 |
| **Memory Footprint** | ~32–48 MB RAM (idle / background) |
| **Database Drivers** | Microsoft Access Database Engine (ACE OLEDB 12.0/16.0), ODBC 64-bit |
| **Local Port Usage** | Local loopback only (`127.0.0.1:39281`), 0 WAN open ports |
| **Security Standards** | Windows DPAPI, TLS 1.3, Ed25519 signatures, SHA-256 checksums |
| **Installer Type** | Inno Setup 6.x modern uninstaller, silent deployment `/VERYSILENT` |
| **Cleanliness Rating** | 100% Clean — Tested against Microsoft Defender, Bitdefender, ESET, Kaspersky |

---

## 5. Direct Screenshot Index for Editorial Publishing

| # | Caption | Direct URL (Retina 2x) | WebP High-Compression URL |
| :---: | :--- | :--- | :--- |
| **1** | Real-time Dashboard Zen Overview | `https://bridge.cristianjm.com/assets/screenshots/01-dashboard-overview.png` | `https://bridge.cristianjm.com/assets/screenshots/01-dashboard-overview.webp` |
| **2** | Multi-ERP Architecture Selector | `https://bridge.cristianjm.com/assets/screenshots/02-multi-erp-selector.png` | `https://bridge.cristianjm.com/assets/screenshots/02-multi-erp-selector.webp` |
| **3** | eCommerce Channels Management | `https://bridge.cristianjm.com/assets/screenshots/03-ecommerce-channels.png` | `https://bridge.cristianjm.com/assets/screenshots/03-ecommerce-channels.webp` |
| **4** | Synchronization Schedules & Rules | `https://bridge.cristianjm.com/assets/screenshots/04-automation-sync.png` | `https://bridge.cristianjm.com/assets/screenshots/04-automation-sync.webp` |
| **5** | Sales Order Audit Trail & History | `https://bridge.cristianjm.com/assets/screenshots/05-sales-order-history.png` | `https://bridge.cristianjm.com/assets/screenshots/05-sales-order-history.webp` |
| **6** | Setup Wizard & Guided Onboarding | `https://bridge.cristianjm.com/assets/screenshots/06-setup-wizard.png` | `https://bridge.cristianjm.com/assets/screenshots/06-setup-wizard.webp` |
