=== Bentian ERP Bridge for Factusol ===
Contributors: cristianjimeneztrabajo, cristianjm
Donate link: https://bridge.cristianjm.com
Tags: factusol, woocommerce, erp, sync, stock
Requires at least: 5.8
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.3.8
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Bridge connector to sync Factusol ERP with WooCommerce. Real-time bidirectional stock, product catalog, variations, and automated order sync.

== Description ==

**Bentian ERP Bridge for Factusol** connects your local **Factusol** business management software with your **WooCommerce** store.

Bentian operates through a hybrid architecture:

1. **WordPress Plugin (this plugin):** Acts as the receiver on your WordPress site, integrating with the native WooCommerce REST API, declaring full compatibility with **HPOS (High-Performance Order Storage)**, and generating secure API credentials with 1 click.
2. **Bentian Agent (Windows Desktop):** A lightweight background service running on the Windows PC or local server where your Factusol database (`.accdb`, local network drive, or NAS share) is located.

### Key Features

* **Product Catalog Synchronization:** Create and update products, descriptions, categories, and families directly from Factusol.
* **Real-Time Stock Management:** Immediate stock level updates to prevent overselling, calculating physical and available stock by warehouse and price rate.
* **Variations, Sizes, and Colors Support:** Native mapping of Factusol size and color matrices into WooCommerce variable products.
* **Accurate Tax and Pricing Alignment:** Strict calculation of Spanish VAT brackets (21%, 10%, 4%, 0%) and equivalence surcharge (recargo de equivalencia).
* **Automated Order Download:** Confirmed WooCommerce orders are automatically imported as customer orders into Factusol, ready for delivery notes and invoicing.
* **Network Disconnection Resilience:** If your internet or local office network experiences downtime, the desktop agent buffers tasks defensively and resumes sync once connectivity is restored.
* **1-Click Credential Generator:** Quickly create WooCommerce REST API keys (Consumer Key & Consumer Secret) with the required permissions from the plugin dashboard.

### Third-Party Service and Complementary Software Disclosure (Guideline 6)

This plugin connects and syncs with the **Bentian ERP Bridge** desktop application and cloud sync service to provide bidirectional integration between your local Factusol database and WooCommerce:

* **Service and Software Name:** Bentian ERP Bridge
* **Author / Provider:** Cristian Jiménez Martínez (Bentian)
* **Functionality:** Reads catalog, pricing, and stock data from your local Factusol database and transmits it securely via HTTPS to your WooCommerce store; also retrieves confirmed web orders to create them in Factusol.
* **Windows Agent Download:** [Bentian Setup Installer](https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe)
* **Terms of Service:** [https://bridge.cristianjm.com/terminos/](https://bridge.cristianjm.com/terminos/)
* **Privacy Policy:** [https://bridge.cristianjm.com/privacidad/](https://bridge.cristianjm.com/privacidad/)

== Installation ==

1. Upload the `bentian-erp-bridge-for-factusol` folder to the `/wp-content/plugins/` directory, or upload the `.zip` file via **Plugins > Add New > Upload Plugin**.
2. Activate the plugin through the **Plugins** screen in WordPress.
3. Navigate to **WooCommerce > Factusol Bridge** in your WordPress admin sidebar.
4. Click **"Generate Keys for Bentian Agent (1-Click)"** to obtain your Site URL, Consumer Key, and Consumer Secret.
5. Download and install **Bentian Agent for Windows** from [bridge.cristianjm.com](https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe) on the PC or server where Factusol is installed.
6. Enter the WooCommerce credentials into the Bentian Agent desktop interface and select your Factusol company code. Your store is now ready to sync!

== Frequently Asked Questions ==

= Does it work with Factusol on a local network or NAS? =
Yes. Bentian Agent natively supports UNC network paths (`\\SERVER\Factusol\...`) and mapped network drives (`Z:\...`), with built-in tolerance for network reconnects.

= What version of WooCommerce is required? =
WooCommerce 5.0 up to 9.3+ is supported. The plugin is compatible with both classic post storage and High-Performance Order Storage (HPOS).

= Do I need a static IP address in my office? =
No. Communication is initiated outbound over HTTPS from the Factusol PC to your WooCommerce store, so no router port forwarding or static IP is required.

= Can I test the integration before purchasing a license? =
Yes. A fully functional trial period is available so merchants and agencies can test the integration with their local Factusol database. You can request your key at [bridge.cristianjm.com](https://bridge.cristianjm.com).

= Are tax-inclusive and tax-exclusive prices supported? =
Yes. Prices can be configured with or without tax in Factusol and WooCommerce. Bentian performs exact rounding to the cent to ensure accounting consistency.

== Screenshots ==

1. Diagnostic dashboard and 1-click credential generator in WooCommerce admin.
2. Bentian desktop agent interface for Windows.
3. WooCommerce store synchronizing in real time with Factusol.

== Changelog ==

= 0.3.8 =
* Initial release for the WooCommerce and WordPress.org ecosystem.
* 1-Click WooCommerce REST API credential generator with read/write permissions.
* System diagnostics panel (HTTPS, Permalinks, HPOS compatibility).
* Fast latency diagnostic endpoint at `/wp-json/bentian/v1/ping`.
* Declared HPOS compatibility (`custom_order_tables`).

== Upgrade Notice ==

= 0.3.8 =
Initial release of Bentian ERP Bridge for Factusol.
