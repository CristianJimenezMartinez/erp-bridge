# Bentian ERP Bridge & Google Merchant Center: Especificación Modular
## Sección 1: Requisitos Legales, Atributos y Políticas de Google (España / UE 2026)

### 1.1. Atributos Obligatorios del Feed en España y la Unión Europea

| Atributo | Etiqueta XML | Obligatoriedad | Regla Estricta Google 2026 |
| :--- | :--- | :---: | :--- |
| **Identificador** | `<g:id>` | Obligatorio | Código único y persistente. Máximo 50 caracteres. Si cambia, Google reinicia el historial de rendimiento. Se usa el SKU del ERP (`CODART`). |
| **Título** | `<g:title>` | Obligatorio | Máximo 150 caracteres. Prohibido texto promocional ("OFERTA"), mayúsculas completas o emojis. Debe seguir la fórmula: `[Marca] + [Tipo de Producto] + [Modelo/SKU] + [Atributos Clave]`. |
| **Descripción** | `<g:description>` | Obligatorio | Hasta 5.000 caracteres. Descripción comercial clara y técnica. Prohibido incluir enlaces web o políticas de envío en este campo. |
| **Enlace Ficha** | `<g:link>` | Obligatorio | URL canónica (`https://`) a la página del producto. Debe ser accesible para `Googlebot-Shopping` sin bloqueos ni interstitials de registro. |
| **Imagen Principal**| `<g:image_link>` | Obligatorio | URL absoluta a imagen de alta resolución (mínimo 800x800 px). Fondo limpio, sin marcas de agua promocionales ni logos superpuestos. |
| **Disponibilidad** | `<g:availability>` | Obligatorio | Enum estricto: `in_stock`, `out_of_stock`, `preorder` o `backorder`. No se permiten valores como `true/false` ni enteros. |
| **Precio** | `<g:price>` | Obligatorio | **IVA incluido obligatorio en España y UE**. Formato: `XX.YY EUR` (ej: `139.15 EUR`). Debe coincidir al céntimo con el checkout y el marcado Schema.org de la web. |
| **Precio Rebajado**| `<g:sale_price>` | Condicional | Obligatorio si el producto está en promoción. Debe incluir IVA y moneda `EUR`. |
| **Marca** | `<g:brand>` | Obligatorio | Nombre comercial del fabricante o distribuidor. Máximo 70 caracteres. |
| **Código GTIN** | `<g:gtin>` | Obligatorio* | Código de barras oficial internacional (en España y Europa es el **EAN-13**). Google valida el dígito de control (*checksum módulo 10*). |
| **Referencia MPN** | `<g:mpn>` | Condicional | Número de pieza del fabricante (Manufacturer Part Number). Obligatorio junto a la marca si el producto no tiene GTIN oficial. |
| **Identificador Existe**| `<g:identifier_exists>`| Condicional | Si el producto no tiene ni GTIN ni MPN (artesanía, productos a medida), se envía explícitamente `no`. Si se omite, Google rechaza el producto. |
| **Estado** | `<g:condition>` | Obligatorio | Enum: `new`, `refurbished` o `used`. En ERPs de distribución es `new` por defecto. |
| **Gastos de Envío**| `<g:shipping>` | Recomendado | Coste y país (`ES`). Puede configurarse a nivel de cuenta Merchant Center para toda la tienda. |

---

### 1.2. Normativas Legales Específicas de la Unión Europea (2026)

1. **Directiva de Precios con IVA (Directiva 98/6/CE):**
   - En la UE está terminantemente prohibido publicar precios B2C sin impuestos.
   - Si el feed envía el precio neto (`115.00 EUR`) pero la web muestra `139.15 EUR` (con el 21% de IVA), el bot de Google detecta *Price Mismatch* y suspende la cuenta en menos de 48 horas.
   - **Solución Bentian:** El motor de cálculo fiscal de Bentian multiplica automáticamente el precio base por el tipo impositivo exacto del ERP (`TIVART`).
2. **Directiva Ómnibus (UE 2019/2161) sobre Descuentos y Ofertas:**
   - Si se publica un precio de oferta (`g:sale_price`), el precio previo (`g:price`) debe reflejar el precio más bajo aplicado en los últimos 30 días.
3. **Reglamento General de Seguridad de los Productos (GPSR - Reglamento UE 2023/988):**
   - En vigor obligatorio en 2026. Requiere informar al operador económico responsable dentro de la UE para productos importados no alimentarios:
     - `g:responsible_person_or_business_name`
     - `g:responsible_person_or_business_address`
     - `g:responsible_person_or_business_email`

---

### 1.3. Principales Causas de Suspensión de Cuentas en Google y Cómo las Evita Bentian

* **1. Inconsistencia de Disponibilidad (*Availability Mismatch*):**
  - Ocurre cuando el feed dice `in_stock`, pero cuando Googlebot o un comprador entra en la web, el producto está agotado.
  - *Prevención Bentian:* En cuanto el stock disponible en Factusol llega a 0 (`DISSTO <= 0`), la sincronización reactiva actualiza la tienda y el feed inmediatamente a `out_of_stock`.
* **2. Disparidad de Precios (*Price Mismatch*):**
  - Ocurre por redondeos de céntimos en el IVA o por tarifas desactualizadas.
  - *Prevención Bentian:* El cálculo matemático de IVA utiliza la misma lógica certificada que `cuadre-iva-centimos` de Bentian, asegurando paridad del 100% entre el feed y el checkout.
* **3. Códigos EAN Inválidos (*Invalid GTIN*):**
  - Asignar referencias internas o códigos cortos como si fuesen EAN-13 genera errores masivos en Merchant Center.
  - *Prevención Bentian:* El validador previo de Bentian audita el dígito de control del EAN antes de incluirlo; si no es un EAN oficial válido, lo envía como `mpn` y marca `g:identifier_exists = no`.
