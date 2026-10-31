# Bentian ERP Bridge — Official Technical Datasheet & Media Factsheet

**Document Version:** 1.1 (Release 0.5.3)  
**Publication Date:** October 2026  
**Canonical Reference:** https://bridge.cristianjm.com/press/  
**Founder & Software Architect:** Cristian Jiménez Martínez  

---

## 1. Executive Summary

**Bentian ERP Bridge** is an enterprise-grade, local-first connectivity agent and middleware engineered for small-to-medium enterprises (SMEs) and digital agencies. It provides real-time, bi-directional synchronization between legacy on-premise ERP desktop databases (**Factusol** and **SimplyGest**) and modern online storefronts (**WooCommerce**, **PrestaShop**, and **Shopify**).

Unlike conventional cloud-hosted integration connectors that require transferring confidential customer and inventory databases to external cloud hosts or opening vulnerable database ports on company firewalls, Bentian ERP Bridge runs locally on the enterprise's Windows workstation or server. It performs non-locking direct reads via OLEDB/ODBC, transforms data locally in RAM, and pushes encrypted updates directly to customer web storefronts via standard outbound HTTPS (TLS 1.3).

---

## 2. Technical Specifications

### System & Runtime Requirements
- **Operating System:** Windows 10, Windows 11, Windows Server 2016, 2019, 2022, 2025 (64-bit architecture only).
- **RAM Footprint:** ~32 MB – 48 MB in background idle mode (< 90 MB during high-volume batch sync of 50,000+ SKU catalogs).
- **Disk Footprint:** < 65 MB installed storage (including binary dependencies and embedded tray supervisor).
- **Network Requirements:** Standard outbound HTTPS port 443 (TLS 1.3/1.2). **Zero inbound ports required**; runs fully behind strict NATs, dynamic IPs, and corporate firewalls without VPN configuration.
- **Database Access Engines:** Microsoft Access Database Engine (ACE OLEDB 12.0/16.0 64-bit), Native 64-bit ODBC Abstraction Layer.

### Supported ERP Systems
1. **Factusol (DELSOL):**
   - Supported versions: Factusol 2016 through Factusol 2026.
   - Database formats: `.accdb` (Access 2007-2026) and legacy `.mdb`.
   - Concurrency: Read-only non-exclusive OLEDB sessions with zero `.laccdb` lock contention.
   - Stock calculation: DISSTO formula engine (Physical Stock minus Customer Reserved Orders and Inbound Web Allocations).
   - Injected entities: Sales Orders (`F_PCL` header, `F_LPC` lines) without touching closed invoices or Veri*Factu regulatory ledgers.

2. **SimplyGest (Simply Software):**
   - Supported versions: SimplyGest Standard, Professional, and Premium.
   - Multi-ERP Polymorphic Engine: Single Active ERP profile isolation with dynamic driver loading.

### Supported eCommerce Platforms
- **WooCommerce:** Version 6.x through 9.x+ (WordPress 5.8+). High-Performance Order Storage (HPOS) compatible.
- **PrestaShop:** Version 1.7.x and PrestaShop 8.x+ (native Webservice API).
- **Shopify:** Admin REST & GraphQL Storefront APIs.

---

## 3. Security & Cryptographic Architecture

- **Zero-Knowledge Architecture:** Neither catalog data, customer names, nor financial documents are ever sent to Bentian servers.
- **Local Credential Encryption:** API tokens, database paths, and channel secrets are encrypted using the **Windows Data Protection API (DPAPI)**, binding decryption strictly to the local Windows machine and user context.
- **Store-and-Forward Atomic Journal:** Inbound web orders are immediately written to an append-only atomic local journal before processing. During internet outages, power loss, or database maintenance, orders are queued safely without data loss.
- **Idempotency & Deduplication:** Every incoming transaction carries a cryptographically validated UUID and order sequence check, guaranteeing that orders cannot be duplicated in the ERP under any retry condition.
- **Cryptographic Auto-Updates:** Software binaries, installer packages, and security hotfixes are signed with an **Ed25519 (RFC 8032)** asymmetric key pair. Hashes are verified via SHA-256 prior to atomic payload swapping.

---

## 4. Packaging, Distribution & Verification

| Asset | Format / Filename | Canonical Download URL | SHA-256 Hash |
| :--- | :--- | :--- | :--- |
| **Official Installer** | Inno Setup `Bentian-Setup-v0.5.3.exe` | `https://bridge.cristianjm.com/releases/v0.5.3/Bentian-Setup-v0.5.3.exe` | `1ae92e5df522c78f12eb14b1067b9d09c83e0667bb788c34783a2f5adc31a949` |
| **Setup Archive** | ZIP `Bentian-Setup-v0.5.3.zip` | `https://bridge.cristianjm.com/releases/v0.5.3/Bentian-Setup-v0.5.3.zip` | `91d0e4774cfd35160df1f24a94fdc7338007b9ab1150d4d1c27d42923ee3ad1f` |
| **Portable Edition** | ZIP `BentianAgent-v0.5.3-Portable.zip` | `https://bridge.cristianjm.com/releases/v0.5.3/BentianAgent-v0.5.3-Portable.zip` | `65a3efde6a466b79ef1dc46864225400cb5b2a04716364238e75ee04648f21a0` |
| **Windows Package Manager** | WinGet Manifest `Bentian.ERPBridge` | `distribution/winget/0.5.3/` | Schema 1.28.0 verified |

---

## 5. Media & Corporate Assets

- **Brand Name:** Bentian ERP Bridge
- **Brand Colors:**
  - Deep Background: `#09090b` (Zinc 950)
  - Primary Accent: `#4f46e5` (Indigo 600)
  - Success / Sync Green: `#10b981` (Emerald 500)
  - Surface Border: `rgba(255, 255, 255, 0.08)`
- **Vector Logo:** `https://bridge.cristianjm.com/assets/icon.svg`
- **Raster Icons:** `icon-512.png`, `icon-256.png`, `icon-192.png`, `icon.ico`
- **Retina 2x Screenshots:**
  - `https://bridge.cristianjm.com/assets/screenshots/01-dashboard-overview.png`
  - `https://bridge.cristianjm.com/assets/screenshots/02-multi-erp-selector.png`
  - `https://bridge.cristianjm.com/assets/screenshots/03-ecommerce-channels.png`
  - `https://bridge.cristianjm.com/assets/screenshots/04-automation-sync.png`
  - `https://bridge.cristianjm.com/assets/screenshots/05-sales-order-history.png`
  - `https://bridge.cristianjm.com/assets/screenshots/06-setup-wizard.png`

---

## 6. Press & Analyst Contact

- **Media Relations Lead:** Cristian Jiménez Martínez (Founder & Software Architect)
- **Direct Press Email:** `prensa@cristianjm.com`
- **General Inquiries:** `soporte@cristianjm.com`
- **Official Website:** `https://bridge.cristianjm.com`
- **Personal Web:** `https://cristianjm.com`
- **Response SLA:** Under 24 business hours for accredited press and technical publications.
