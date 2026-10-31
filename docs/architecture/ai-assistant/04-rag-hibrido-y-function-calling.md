# Bentian AI Commerce Assistant: Especificación Modular
## Sección 4: Arquitectura Híbrida (RAG Semántico + Function Calling)

### 4.1. Por Qué el RAG Puro Fracasa en el Comercio
El RAG tradicional convierte textos en vectores numéricos y recupera trozos de texto parecidos. En un ERP esto provoca errores comerciales inadmisibles:
* **Alucinaciones de Stock:** El índice vectorial se indexa cada cierto tiempo. Si un artículo se vende en el mostrador físico a las 11:00, un RAG puro dirá a las 11:05 que todavía hay unidades, provocando roturas de stock.
* **Precios Inexactos:** El RAG confunde si un precio lleva el 21% de IVA, si tiene recargo o si aplica una tarifa especial.
* **Incapacidad Transaccional:** El RAG no puede verificar si un pedido ha sido expedido ni reservar existencias.

---

### 4.2. División de Responsabilidades: Semántica vs. Determinismo

```
[ Comprador / Usuario ]
          │
          ▼
1. "¿Tenéis bombas sumergibles para pozo de 30m?"
          │
          ▼
[ RAG Semántico (ONNX Local) ] ──► Recupera SKUs candidatos: ['FS-1001', 'FS-1004']
          │
          ▼
[ LLM Cero Coste (Groq / Gemini) ] ──► Genera llamada: check_product_realtime('FS-1001')
          │
          ▼
[ Motor Bentian ERP ] ──► Lee DISSTO vivo en Factusol/Sage: Stock=14, PVP_IVA=349.69€
          │
          ▼
[ LLM Cero Coste ] ──► Redacta respuesta final con stock exacto y botón de compra
```

1. **RAG Semántico (Fase 1 - Descubrimiento):** Traduce el lenguaje natural del cliente (*"cable que aguante exterior y calor"*) a candidatos de catálogo en menos de 3 milisegundos.
2. **Function Calling (Fase 2 - Determinación):** Consulta en tiempo real al motor local de Bentian para obtener el stock exacto (`DISSTO`), la tarifa vigente y el estado de entrega. Cero alucinaciones.

---

### 4.3. Especificación Formal de las 4 Herramientas Canónicas

Las 4 herramientas declaradas para el modelo en formato estándar JSON Schema:

#### 1. `search_catalog_semantic`
* **Descripción:** Búsqueda en el índice vectorial local por intenciones, problemas o características del producto.
* **Parámetros:** `userQuery` (string, obligatorio), `familyFilter` (string, opcional), `maxResults` (number, defecto 5).

#### 2. `check_product_realtime`
* **Descripción:** Obtiene en tiempo real el stock físico disponible y el precio oficial actualizado en el ERP.
* **Parámetros:** `sku` (string, obligatorio), `tariffCode` (string, opcional).
* **Retorno:** `{ sku, name, availableStock, inStock, salePrice, priceWithVat, vatRate }`.

#### 3. `get_order_status_authenticated`
* **Descripción:** Consulta el estado y seguimiento de un pedido tras verificar la identidad del cliente.
* **Parámetros:** `orderNumber` (string, obligatorio), `buyerEmail` (string, obligatorio).
* **Retorno:** `{ authenticated, statusText, orderDate, trackingCarrier, trackingNumber, trackingUrl }`.

#### 4. `calculate_shipping_estimate`
* **Descripción:** Calcula los costes de envío y plazo de entrega según el código postal y subtotal de la cesta.
* **Parámetros:** `postalCode` (string de 5 dígitos, obligatorio), `cartSubtotal` (number, obligatorio).
