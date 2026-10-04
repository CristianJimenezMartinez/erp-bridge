# Bentian ERP Bridge — Capabilities Manifest & Matriz SSoT

> **FUENTE ÚNICA DE VERDAD (Single Source of Truth - SSoT)**  
> **Objetivo:** Garantizar que ninguna capacidad de ingeniería implementada en el código quede oculta comercialmente en la web pública (`bridge.cristianjm.com`), y que toda promesa de venta cuente con respaldo directo en código fuente y pruebas automatizadas verificables.  
> **Última actualización:** Octubre 2026 • Versión Canónica: `v0.3.6`  
> **Auditoría de Calidad:** Quality Gate nota >= 9.5 / Gate 7 Code Freeze sellado.

---

## 1. Principio Rector de Sincronización Código ➔ Web

Todo módulo de software desarrollado en `apps/agent` o `packages/` debe quedar documentado simultáneamente en:
1. **Landing Page Principal (`apps/api/public/sections/` y `index.html`):** Argumento de impacto para directores y gerentes de operaciones.
2. **Páginas Pilares o Guías Especializadas (`apps/api/public/`):** Explicación técnica detallada y posicionamiento SEO orgánico.
3. **Batería de Pruebas Automatizadas (`apps/agent/test` o `packages/*/test`):** Aserción de no regresión y verificación continua.

---

## 2. Matriz Bidireccional de Capacidades, Código, Web y Pruebas

| ID | Capacidad del Sistema | Archivos de Código Fuente | Ubicación y Estado en Web Pública | Argumento de Venta para Gerentes / CFOs | Prueba de Verificación Automatizada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CAP-01** | **Pedidos Protegidos Offline (Store-and-Forward)** | `packages/core/src/queue`<br>`apps/agent/src/sync/sync.engine.ts`<br>`packages/connectors/universal-bridge/erp-bridge-endpoint.php` | `sections/07-operational-safeguards.html`<br>`sections/06-pipeline.html`<br>`comparativa-conector-windows-vs-plugin-wordpress/` | **Tus ventas nunca se pierden:** Aunque el PC de almacén se apague a las 19:00 o la fibra de la nave se corte, las ventas web quedan retenidas y se vuelcan a Factusol ordenadas al reconectar. | `npx ts-node apps/agent/test/overnight-orders.test.ts`<br>`npx ts-node apps/agent/test/e2e-network-orders-lab.test.ts` |
| **CAP-02** | **Preservación de Rutas NAS (Anti-Wiping)** | `apps/agent/src/config/config.manager.ts`<br>`apps/agent/src/diagnostics/preflight-probes.ts` | `sections/07-operational-safeguards.html`<br>`docs/guias-empresas/`<br>`AGENTS.md (Regla 2)` | **Cero reconfiguraciones y cero pánico:** Si el servidor NAS o la unidad `Z:\` tarda en arrancar por la mañana, la configuración nunca se borra. El sistema espera de forma segura y reconecta solo. | `npx ts-node apps/agent/test/config-persistence.test.ts`<br>`npx ts-node apps/agent/test/nas-dialog-e2e.test.ts` |
| **CAP-03** | **Cálculo Exacto de IVA y Céntimos (Anti-Doble IVA)** | `apps/agent/src/sync/order-sync.helper.ts`<br>`packages/connectors/factusol/src/mappers/order.mapper.ts` | `sections/07-operational-safeguards.html`<br>`factusol-recargo-equivalencia/`<br>`guias/pasar-pedidos-woocommerce-a-factusol-con-recargo/` | **Cuadre contable y fiscal milimétrico:** Desglose exacto de base y cuota (ej: 89,00 € = 73,55 € + 15,45 €). Evita que Factusol aplique un segundo 21% de IVA por error sobre precios brutos. | `npx ts-node packages/connectors/factusol/test/factusol-order-mapper.test.ts` |
| **CAP-04** | **Inyección Directa en Bandeja Principal (Serie 1 F_PCL)** | `apps/agent/src/sync/order-sync.helper.ts`<br>`packages/connectors/factusol/src/handlers/order.handler.ts` | `sections/07-operational-safeguards.html`<br>`sections/04-solution.html`<br>`docs/sincronizar-pedidos-woocommerce-factusol.html` | **Expedición inmediata:** Los pedidos web entran directamente en la Serie 1 de pedidos pendientes de Factusol, la misma pantalla donde tu equipo prepara bultos cada día. Sin filtros ocultos. | `npx ts-node packages/connectors/factusol/test/real-factusol-order-e2e.test.ts` |
| **CAP-05** | **Catálogo de Errores Amigables (22 Reglas en 1 Clic)** | `apps/agent/src/gui/error-humanizer.ts`<br>`apps/agent/src/gui/templates/scripts/error-humanizer.script.ts` | `sections/07-operational-safeguards.html`<br>`sections/09-observability.html`<br>`docs/factusol-oledb-guide/` | **Autonomía total sin depender de informáticos:** Traduce errores crípticos OLEDB (0x80004005, bloqueo .ldb) a explicaciones claras en español con botón de solución directa. | `npx ts-node apps/agent/test/error-humanizer.test.ts` |
| **CAP-06** | **Alertas Transaccionales Email con DKIM y Correlativo** | `apps/agent/src/notifications/order-notifier.service.ts`<br>`apps/api/src/routes/notifications.router.ts`<br>`apps/api/src/services/mailer.service.ts` | `sections/07-operational-safeguards.html`<br>`docs/email-deliverability-setup.md` | **Control instantáneo para almacén y administración:** Recibe un email corporativo con el número oficial de Factusol en el asunto al minuto de entrar una venta web, con entregabilidad verificada. | `npx ts-node apps/agent/test/order-notifier.test.ts` |
| **CAP-07** | **Selector Nativo Windows STA (Anti-Ghost Window)** | `apps/agent/src/gui/tray/BentianTray.cs`<br>`apps/agent/src/gui/window-launcher.ts` | `sections/07-operational-safeguards.html`<br>`sections/08-agent.html`<br>`docs/desktop-gui-window-port-hardening.md` | **Experiencia de usuario nativa y profesional:** Diálogo oficial de Windows en primer plano (`TopMost`) sin modales web lentos, sin parpadeos y sin bloquear las ventanas de Microsoft Edge. | `npx ts-node apps/agent/test/nas-dialog-e2e.test.ts` |
| **CAP-08** | **Compatibilidad Universal (WooCommerce + Plesk/PHP)** | `packages/connectors/woocommerce/src/`<br>`packages/connectors/universal-bridge/erp-bridge-endpoint.php`<br>`apps/agent/src/channels/universal-bridge.tester.ts` | `sections/07-operational-safeguards.html`<br>`sections/10-connectors.html`<br>`factusol-api-rest/` | **Libertad tecnológica total:** Conecta WooCommerce nativo y tiendas a medida en Plesk, Angular o PHP/MariaDB sin obligar a cambiar de hosting ni contratar plataformas externas. | `npx ts-node apps/agent/test/lab/docker-bridge-test.ts` |
| **CAP-09** | **Concurrencia OLEDB sin Bloqueos .ldb (Share Deny None)** | `packages/connectors/factusol/src/drivers/access.driver.ts`<br>`packages/connectors/factusol/src/factusol.connector.ts` | `sections/04-solution.html`<br>`guias/solucionar-bloqueo-ficheros-ldb-factusol/` | **Tu tienda física y web conviven en armonía:** Microtransacciones en <15 ms con apertura no exclusiva de tablas. Los operarios cobran en caja sin notar interferencias. | `pnpm run quality:check (Gate 4 SQL Access Sanitization)` |
| **CAP-10** | **Cálculo de Stock Disponible Atómico (DISSTO vs ACTSTO)** | `packages/connectors/factusol/src/mappers/stock.mapper.ts`<br>`apps/agent/src/sync/sync.engine.ts` | `sections/04-solution.html`<br>`sections/07-data-in-flight.html`<br>`comparativa-conector-windows-vs-plugin-wordpress/` | **Prevención matemática de sobreventas:** Se descuentan automáticamente los pedidos web y de mostrador pendientes de servir (`DISSTO`), evitando vender artículos agotados. | `pnpm run quality:check (Gate 5 Anti-Sobreventas)`<br>`npx ts-node packages/connectors/factusol/test/factusol-stock.test.ts` |
| **CAP-11** | **Blindaje Legal Veri*Factu (Ley Antifraude RD 1007/2023)** | `packages/connectors/factusol/src/handlers/order.handler.ts`<br>`packages/core/src/models/canonical-order.ts` | `sections/11-security.html`<br>`factusol-verifactu-woocommerce/`<br>`guias/pasar-pedidos-woocommerce-a-factusol-con-recargo/` | **Tranquilidad jurídica absoluta:** Bentian solo traslada pedidos comerciales (`F_PCL`). La emisión de la factura inalterable con QR y encadenamiento hash la realiza Factusol certificado. | `npx ts-node packages/connectors/factusol/test/real-factusol-invoice-e2e.test.ts` |
| **CAP-12** | **Actualizaciones Atómicas y Firmadas con Clave Ed25519** | `packages/core/src/update/update-signer.ts`<br>`apps/agent/src/update/update.swapper.ts`<br>`apps/agent/src/update/auto-updater.ts` | `sections/11-security.html`<br>`sections/08-agent.html`<br>`docs/RELEASE_AND_UPDATE_STANDARDS.md` | **Seguridad bancaria en actualizaciones:** Si un binario descargado sufre una alteración de 1 solo byte, Windows lo rechaza. Proceso desacoplado `UpdateSwapper` con rollback automático. | `pnpm run quality:check (Gate 7 Code Freeze)`<br>`npx ts-node apps/agent/test/update-system.test.ts` |
| **CAP-13** | **Licenciamiento HWID Bind & Cifrado Local DPAPI** | `packages/core/src/license/`<br>`apps/agent/src/license/license.service.ts`<br>`apps/agent/src/security/secure-store.ts` | `sections/11-security.html`<br>`sections/12-pricing.html` | **Protección de datos y suscripciones:** Claves vinculadas al hardware físico de la empresa y secretos de API custodiados con Windows Data Protection API (DPAPI). | `npx ts-node apps/agent/test/hwid-stability.test.ts`<br>`npx ts-node apps/agent/test/secure-store.test.ts` |
| **CAP-14** | **Reversión de Stock en Pedidos Cancelados Web** | `apps/agent/src/sync/cancellation-sync.helper.ts`<br>`packages/connectors/factusol/src/handlers/order.handler.ts` | `sections/07-operational-safeguards.html`<br>`sections/04-solution.html` | **Inventario real sin pérdidas invisibles:** Si un cliente cancela o reembolsa un pedido en WooCommerce o la tienda web, las unidades se devuelven al almacén de Factusol automáticamente. | `npx ts-node apps/agent/test/cancellation-sync.test.ts` |
| **CAP-15** | **Servidor Web Local Aislado en Puerto Fijo 39281** | `apps/agent/src/gui/gui-server.ts`<br>`apps/agent/src/gui/single-instance.ts` | `sections/08-agent.html`<br>`docs/desktop-gui-window-port-hardening.md` | **Estabilidad permanente en el escritorio:** Cero saltos de puerto (`EADDRINUSE`) y bloqueo de instancia única para evitar múltiples procesos en segundo plano. | `npx ts-node apps/agent/test/gui-router.test.ts` |
| **CAP-16** | **Chequeos Preflight de Salud y Diagnóstico Exportable** | `apps/agent/src/diagnostics/preflight-health.service.ts`<br>`apps/agent/src/diagnostics/diagnostic-exporter.ts` | `sections/09-observability.html`<br>`dashboard/` | **Diagnóstico instantáneo para IT:** Análisis integral de conectividad, controladores de Access, permisos de escritura y puertos antes de iniciar cualquier ciclo de sincronización. | `npx ts-node apps/agent/test/preflight-health.test.ts` |

---

## 3. Formulación Legal Canónica para Veri*Factu (Obligatoria)

Toda referencia a la Ley Antifraude, facturación electrónica o Veri*Factu en materiales públicos, documentación o respuestas comerciales debe ajustarse a esta formulación certificada:

> *"Bentian actúa estrictamente sobre el flujo de pedidos comerciales (F_PCL) y no genera ni altera directamente los registros de facturación sujetos a la Ley Antifraude y Veri\*Factu. De este modo, la inalterabilidad de la serie, el encadenamiento criptográfico (TRZFAC) y la remisión tributaria quedan delegados íntegramente en el motor certificado de Factusol, preservando la plena validez legal de tus facturas."*

---

## 4. Protocolo de Calidad y No Regresión (Quality Gate)

Antes de cualquier despliegue, actualización de la web o publicación de release, se debe ejecutar:

```bash
# 1. Calidad estricta y verificación de módulos sellados
pnpm run quality:check

# 2. Ensamblado de landing page y verificación de Single Source of Truth
npm run build:landing --prefix apps/api
npx ts-node apps/api/test/version-ssot.test.ts
```

**Criterios de Éxito Mandatarios:**
- Puntuación global del Quality Gate >= **9.5 / 10.0**.
- **Gate 7 (Code Freeze):** Los 6 módulos sellados deben conservar su hash SHA-256 intacto.
- **SSoT Verification:** Cero enlaces de versión hardcodeados; 100% de data-attributes semánticos sincronizados.
