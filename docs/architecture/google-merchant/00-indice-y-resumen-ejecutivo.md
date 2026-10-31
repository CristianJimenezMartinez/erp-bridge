# Bentian ERP Bridge & Google Merchant Center: Especificación Modular
## Sección 0: Índice General y Resumen Ejecutivo

> **ESTADO:** Aprobado / Especificación de Arquitectura Modular  
> **FECHA:** 31 de Octubre de 2026  
> **ÁMBITO:** Connectors Multi-ERP, Feed Google Shopping, Fichas Gratuitas UE, WooCommerce, PrestaShop, Shopify  
> **UBICACIÓN MODULAR:** `docs/architecture/google-merchant/`

---

### Estructura de Secciones de la Documentación

Esta especificación se encuentra dividida modularmente en 6 secciones de referencia técnica:

| Sección | Archivo | Contenido Principal |
| :---: | :--- | :--- |
| **00** | [`00-indice-y-resumen-ejecutivo.md`](./00-indice-y-resumen-ejecutivo.md) | Visión global, oportunidad de negocio, comparativa de ahorro y candados de coste cero. |
| **01** | [`01-requisitos-legales-y-politicas-google-2026.md`](./01-requisitos-legales-y-politicas-google-2026.md) | Atributos obligatorios en España/UE, IVA incluido (Directiva 98/6/CE), Ómnibus y causas de suspensión. |
| **02** | [`02-mapeo-datos-multi-erp-google-merchant.md`](./02-mapeo-datos-multi-erp-google-merchant.md) | Mapeo exacto de Factusol (`EANART`, `DISSTO`, `PRELTA` + IVA), SimplyGest, Sage 50, a3ERP y Ágora POS. |
| **03** | [`03-arquitectura-tecnica-tres-vias.md`](./03-arquitectura-tecnica-tres-vias.md) | Vía A (Feed XML streaming), Vía B (Metadatos WooCommerce/PrestaShop) y Vía C (Content API v2.1 push). |
| **04** | [`04-bentian-shield-prevencion-suspensiones.md`](./04-bentian-shield-prevencion-suspensiones.md) | Motor de sincronización reactiva anti-desajuste de stock y verificador de integridad de EAN-13. |
| **05** | [`05-guia-puesta-en-marcha-y-metricas.md`](./05-guia-puesta-en-marcha-y-metricas.md) | Guía paso a paso de configuración en 5 minutos para comerciantes y agencias de marketing. |

---

### 1. Resumen Ejecutivo: La Oportunidad de Google Shopping

Google Shopping y las **Fichas Gratuitas** (*Free Product Listings* en la pestaña de Shopping y en Google Imágenes) suponen entre el **40% y el 60% de las ventas totales** de los comercios electrónicos en España.

Sin embargo, las empresas con ERPs tradicionales se enfrentan a dos grandes barreras:
1. **Costes mensuales desproporcionados en herramientas de feeds:** SaaS como **Channable** (39 € a 249 €/mes), **Lengow** (>300 €/mes) o **DataFeedWatch** (59 $ a 199 $/mes).
2. **Suspensiones fulminantes de cuenta en Google Merchant Center:** Al actualizarse los feeds convencionales solo una vez al día, si la tienda física vende existencias en el mostrador, el anuncio de Google sigue activo. Cuando Googlebot rastrea la web y detecta falta de stock o variación de precio, **suspende la cuenta del dominio por *Disponibilidad inconsistente* o *Discrepancia de precios***.

---

### 2. Tabla de Ahorro Comparativo para el Cliente

| Parámetro | Channable | Lengow | DataFeedWatch | Bentian ERP Bridge |
| :--- | :---: | :---: | :---: | :---: |
| **Coste 1.000 artículos** | 39 € / mes (468 €/año) | >300 € / mes | 59 $ / mes | **0 € añadido** |
| **Coste 5.000 artículos** | 99 € / mes (1.188 €/año) | >300 € / mes | 99 $ / mes | **0 € añadido** |
| **Coste 15.000 artículos** | 179 € / mes (2.148 €/año) | >500 € / mes | 199 $ / mes | **0 € añadido** |
| **Frecuencia de actualización**| Cada 1h - 24h | Cada 1h - 24h | Cada 1h - 24h | **Tiempo real (<5s / 30s)** |
| **Detección de stock físico** | Indirecta (desde la web) | Indirecta (desde la web) | Indirecta (desde la web) | **Directa en el ERP físico** |
| **Riesgo de suspensión Google**| Medio / Alto | Medio | Medio | **Nulo (*Bentian Shield*)** |

---

### 3. Los 4 Candados de Coste Cero para la Infraestructura de Bentian (Hetzner CX23)

Para garantizar que el módulo de Google Merchant Center **no añada ni un solo céntimo de coste ni sobrecargue el servidor de Hetzner CX23 (6 €/mes)**:

1. **Generación Local o en el Hosting del Cliente (Cero CPU en Hetzner):**
   - El feed XML se genera en streaming en el PC local del cliente mediante Bentian Agent o en el propio hosting del comercio mediante `erp-bridge-endpoint.php`. El servidor central de Bentian jamás procesa feeds masivos de miles de referencias.
2. **Entrega a través de Cloudflare CDN (Ancho de banda gratuito):**
   - Si se sirve un feed XML, este se cachea con cabeceras `Cache-Control` y compresión GZIP directa desde el hosting o CDN, con **0 MB de transferencia en Hetzner**.
3. **Credenciales Propias en la Content API (BYOK):**
   - Si el cliente utiliza la Google Content API v2.1 para micro-actualizaciones push instantáneas, utiliza su propia cuenta de servicio gratuita (*Service Account*) de Google Cloud. Cero costes de API para Bentian.
4. **Respeto a los Módulos Congelados (Regla 9):**
   - La funcionalidad se desarrollará como una capa superior desacoplada sin tocar los 13 módulos sellados en Gate 7.
