# Bentian ERP Bridge & Google Merchant Center: Especificación Modular
## Sección 2: Mapeo de Datos Multi-ERP a Google Merchant Center

> **ESTADO:** Aprobado / Especificación de Arquitectura Modular  
> **FECHA:** 31 de Octubre de 2026  
> **ÁMBITO:** Mapeo de Campos ERP, Validación de EAN-13, Directiva Fiscal y DTO Canónico  
> **UBICACIÓN MODULAR:** `docs/architecture/google-merchant/`

---

### 2.1. DTO Canónico: `GoogleMerchantItem`

Para garantizar la independencia total respecto al software de gestión que utilice la empresa, Bentian transforma los datos nativos de cualquier ERP a un objeto de transferencia canónico normalizado (`GoogleMerchantItem`):

```typescript
export interface GoogleMerchantItem {
  /** Identificador único del producto en el ERP (máximo 50 caracteres) */
  id: string;

  /** Título optimizado para búsqueda: Marca + Tipo + Modelo + Atributo clave */
  title: string;

  /** Descripción limpia sin código HTML ni enlaces externos (hasta 5.000 caracteres) */
  description: string;

  /** URL canónica de la ficha de producto en la tienda online (HTTPS) */
  link: string;

  /** URL absoluta a la imagen principal de alta resolución (mínimo 800x800 px) */
  imageLink: string;

  /** URLs secundarias opcionales para galería de fotos */
  additionalImageLinks?: string[];

  /** Disponibilidad normalizada en tiempo real según stock físico del ERP */
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder';

  /** Precio B2C con IVA incluido y código de divisa oficial (ej: "139.15 EUR") */
  price: string;

  /** Precio rebajado con IVA si existe promoción activa (ej: "119.00 EUR") */
  salePrice?: string;

  /** Marca comercial del fabricante o distribuidor */
  brand?: string;

  /** Código internacional de barras validado con checksum módulo 10 (EAN-13 en UE) */
  gtin?: string;

  /** Número de pieza del fabricante (Manufacturer Part Number) */
  mpn?: string;

  /** Bandera obligatoria si no existe GTIN oficial ni MPN ('yes' | 'no') */
  identifierExists: 'yes' | 'no';

  /** Estado del artículo ('new' | 'refurbished' | 'used') */
  condition: 'new' | 'refurbished' | 'used';

  /** Jerarquía de categorías interna del comercio (ej: "Ferretería > Herramienta > Taladros") */
  productType?: string;

  /** Categoría oficial según la Taxonomía de Productos de Google (ID numérico o ruta) */
  googleProductCategory?: string;

  /** Etiquetas personalizadas para segmentación y puja en Google Ads / Performance Max */
  customLabel0?: string; // Margen comercial (ej: "alto_margen", "margen_medio")
  customLabel1?: string; // Nivel de stock (ej: "stock_alto", "ultimas_unidades")
  customLabel2?: string; // Temporada / Campaña (ej: "black_friday", "primavera")
  customLabel3?: string; // Tarifa o familia especial
  customLabel4?: string; // Tipo de envío o peso

  /** Atributos legales del Reglamento de Seguridad General de Productos (GPSR UE 2023/988) */
  responsiblePersonName?: string;
  responsiblePersonAddress?: string;
  responsiblePersonEmail?: string;
}
```

---

### 2.2. Matriz de Mapeo Campo a Campo por ERP Soportado

| Atributo Google | Factusol (OLEDB/Access) | SimplyGest (Triple-Modo) | Sage 50 (SQL Server) | a3ERP (SQL Server) | Ágora POS (SQL Server) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`<g:id>`** | `CODART` | `CODIGO` | `codigo` | `CODART` | `Code` o `Id` |
| **`<g:title>`** | `DESART` | `NOMBRE` / `DESCRIPCION` | `nombre` | `DESCRIP` | `Name` |
| **`<g:description>`** | `DETART` (o `MEMART`) | `OBSERVACIONES` / `MEMO` | `observaciones` | `MEMO` | `Description` |
| **`<g:availability>`** | `DISSTO` (`ACTSTO - RESSTO`) | `STOCK - RESERVADO` | `final - reservado` | `STOCKALM - STKRESERV` | `Quantity` |
| **`<g:price>`** | `PRELTA * (1 + TIVART/100)` | `PVP` (o `PVP_IVA`) | `pvp.pvp * (1 + iva/100)` | `PRCVENTA * (1 + IVA/100)`| `MainPrice` (incl. imp.) |
| **`<g:brand>`** | `CP1ART` (o Proveedor) | `MARCA` o `PROVEEDOR` | `marca` | `MARCA` o `PROVEEDOR` | `Brand` o `Family` |
| **`<g:gtin>`** | `EANART` (si valida M10) | `CODBAR` (si valida M10) | `codigo_barras` (M10) | `CODBAR` (si valida M10) | `Barcode` (si valida M10) |
| **`<g:mpn>`** | `REFART` (si no hay GTIN) | `REFERENCIA` | `referencia_fab` | `REFPRO` | `ManufacturerCode` |
| **`<g:product_type>`**| `FAMART` + `SECART` | `FAMILIA` + `SUBFAMILIA` | `familia` + `subfamilia` | `CODFAM` + `CODSEC` | `Family` + `Category` |

---

### 2.3. Lógica Fiscal Mandatoria: Cuadre de IVA al Céntimo (España / UE)

Google Merchant Center exige que el precio publicado en el feed coincida exactamente con el precio final que el cliente visualiza en el carrito y en el checkout.

En la legislación española existen tres tipos generales de IVA:
* **General (21%):** `TIVART = 21.00`
* **Reducido (10%):** `TIVART = 10.00`
* **Superreducido (4%):** `TIVART = 4.00`
* **Exento (0%):** `TIVART = 0.00`

#### Algoritmo de Cálculo Certificado:
```typescript
export function calculateGooglePriceWithVat(basePrice: number, vatPercent: number): string {
  // Redondeo comercial bancario idéntico al motor de facturación
  const vatRate = vatPercent / 100;
  const totalPrice = Math.round(basePrice * (1 + vatRate) * 100) / 100;
  return `${totalPrice.toFixed(2)} EUR`;
}
```
> [!IMPORTANT]
> Si el ERP almacena precios con 4 o 6 decimales, el redondeo debe aplicarse al precio unitario final de venta con impuestos. Discrepancias de ±0,01 € entre el feed y el checkout son la causa #1 de suspensión de cuentas por parte de Googlebot.

---

### 2.4. Algoritmo de Blindaje y Verificación de Códigos de Barras EAN-13 (Módulo 10)

Enviar códigos de barras inválidos (referencias internas, códigos inventados o caracteres alfanuméricos) como `<g:gtin>` provoca el rechazo masivo de productos en Merchant Center.

Bentian implementa la validación oficial GS1 antes de asignar el atributo:

```typescript
export function isValidEan13(barcode: string): boolean {
  if (!barcode || !/^\d{13}$/.test(barcode.trim())) {
    return false;
  }

  const digits = barcode.trim().split('').map(Number);
  const checkDigit = digits[12];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    // Multiplicador 1 para posiciones impares (índices 0, 2, 4...) y 3 para pares (1, 3, 5...)
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3;
  }

  const remainder = sum % 10;
  const calculatedCheckDigit = remainder === 0 ? 0 : 10 - remainder;

  return checkDigit === calculatedCheckDigit;
}
```

#### Tratamiento Defensivo Automático:
1. **Si `isValidEan13(code) === true`:**
   - Se asigna `<g:gtin>{code}</g:gtin>`.
   - Se asigna `<g:identifier_exists>yes</g:identifier_exists>`.
2. **Si el código no es un EAN-13 válido (o es un código corto interno de 4-6 dígitos):**
   - **NO se envía como GTIN** (evita penalización de Google).
   - Se mueve al campo `<g:mpn>{code}</g:mpn>`.
   - Si no existe marca comercial registrada, se asigna `<g:identifier_exists>no</g:identifier_exists>`.
   - De este modo, Google aprueba el producto para fichas gratuitas sin error de validación.
