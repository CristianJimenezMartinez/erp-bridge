# Decálogo de Reglas de Ingeniería de Bentian

> **Propósito:** Blindar la calidad, seguridad, integridad contable y mantenibilidad del software Bentian ERP Bridge a medida que se introduzcan nuevos conectores y capacidades. Estas reglas son de cumplimiento estricto y se validan automáticamente mediante el script `pnpm run quality:check`.

---

### Regla 1: Límite de Tamaño y Modularidad en Árbol (Max 250 LOC)
- **Directriz:** Ningún archivo de producción debe superar las **250 líneas de código (LOC)**. El tamaño medio debe mantenerse en torno a ~100 LOC.
- **Zona de Vigilancia:** Cualquier archivo entre 150 y 250 LOC debe ser revisado para detectar responsabilidades múltiples.
- **Prohibición:** Quedan estrictamente prohibidos los "God Objects" (>750 LOC). Si un módulo crece, debe descomponerse en sub-handlers, mappers o queries especializadas.

---

### Regla 2: Grafo Acíclico y Jerarquía Unidireccional
- **Directriz:** Quedan absolutamente prohibidas las dependencias circulares (`madge: 0 cycles`).
- **Jerarquía de Capas:**
  $$\text{shared} \longrightarrow \text{sdk} \longrightarrow \text{core} \longrightarrow \text{connectors} \longrightarrow \text{apps}$$
- **Aislamiento:** Los tipos compartidos entre conectores deben ubicarse en `*.types.ts` independientes para evitar ciclos de importación con los conectores principales.

---

### Regla 3: Observabilidad Estructurada (Zero `console.log` en Núcleo)
- **Directriz:** El código de bibliotecas de negocio (`core`, `connectors`, `sdk`, `shared`) jamás debe emitir llamadas directas a `console.log`, `console.warn` o `console.error`.
- **Estándar:** Toda traza debe realizarse a través de `new Logger('NombreContexto')`, garantizando:
  - Formato JSON estructurado con timestamp ISO-8601.
  - Enmascaramiento automático de PII, NIFs, tokens y datos financieros sensibles.
  - Excepción permitida: Herramientas interactivas de terminal (`apps/agent/src/cli.ts`).

---

### Regla 4: Blindaje Anti-Sobreventas y Existencias Reales
- **Directriz:** En las sincronizaciones de existencias hacia tiendas web (WooCommerce, PrestaShop, etc.), **siempre** debe sincronizarse el **Stock Disponible** (`DISSTO` / `availableQuantity`), nunca el stock físico (`ACTSTO` / `quantity`).
- **Fórmula de Seguridad:**
  ```typescript
  const effectiveQty = Math.max(0, stock.availableQuantity ?? stock.quantity ?? 0);
  ```
- **Integridad:** Al cancelar o reembolsar un pedido, el stock disponible debe reponerse atómicamente en la misma base de datos.

---

### Regla 5: Seguridad OLEDB & "Truncate-Then-Escape" en Consultas
- **Directriz:** Al interactuar con Microsoft Jet/ACE OLEDB en Windows, todas las cadenas provenientes de la web deben pasar obligatoriamente por el patrón defensivo:
  ```typescript
  export function sanitizeAndTruncate(val: unknown, maxLen: number): string {
    if (val === null || val === undefined) return '';
    return String(val).trim().substring(0, maxLen).replace(/'/g, "''");
  }
  ```
- **Concurrencia:** Toda cadena de conexión de `AccessDriver` debe incluir `Mode=Share Deny None;` para permitir la coexistencia en tiempo real con usuarios físicos operando Factusol.

---

### Regla 6: Desacoplamiento de Identidad CMS vs ERP
- **Directriz:** El identificador de cliente de una tienda web (WordPress `customer_id` o PrestaShop `id_customer`) jamás debe asignarse como código contable de cliente (`CODCLI`).
- **Flujo de Asignación:**
  1. Si el pedido tiene NIF/CIF: Buscar cliente existente en `F_CLI`. Si existe, reutilizar su `CODCLI`; si no, crear nuevo cliente con código autoincrementado.
  2. Si el pedido no tiene NIF/CIF (particular/invitado): Asignar cliente genérico `CODCLI = 1` ("CLIENTE CONTADO WEB") y estampar la dirección de entrega directamente en la cabecera del documento (`F_PCL` o `F_FAC`).

---

### Regla 7: Precisión Fiscal y Ajuste del Céntimo (Cent Rounding)
- **Directriz:** Los impuestos en pedidos y facturas deben desglosarse en los 4 tramos fiscales vigentes (21%, 10%, 4% y Exento), respetando recargos de equivalencia (5.2%, 1.4%, 0.5%).
- **Conciliación de Pasarela:** Como las tiendas web calculan impuestos por línea y los ERPs los calculan sobre la suma de bases imponibles, el conector debe implementar **Ajuste del Céntimo** ($\pm 0.01\text{€}$) sobre los gastos de envío o base para que el total contable cuadre al 100% con lo cobrado en Stripe o tarjeta.

---

### Regla 8: Protección Criptográfica de Licencias y Anti-Tampering
- **Directriz:**
  - El token de licencia local debe almacenarse cifrado en disco con `AES-256-GCM` y clave derivada del Hardware ID (`HWID`) del equipo vía `PBKDF2` (100.000 iteraciones).
  - La detección de manipulación de reloj (`Clock Rollback`) debe persistir el último timestamp monotónico en disco (`clock.enc`) para invalidar períodos de gracia si el usuario atrasa la hora del sistema operativo.

---

### Regla 9: Blindaje de Superficie de Red Local (Strict Loopback)
- **Directriz:** El mini-servidor GUI local del agente (`127.0.0.1:39281`):
  - Solo debe escuchar en `127.0.0.1`.
  - La cabecera `Host` debe validarse contra la expresión regular estricta `/^(127\.0\.0\.1|localhost)(:\d+)?$/` para prevenir ataques de DNS Rebinding por subdominios.
  - Las peticiones con cabeceras `Origin` o `Referer` externas no loopback deben rechazarse con `403 Forbidden`.

---

### Regla 10: Idempotencia y Hermeticidad de Pruebas
- **Directriz:**
  - Toda inserción de pedidos o facturas debe validar la referencia externa (`REFPCL` / `REFFAC`) antes de insertar, retornando el registro existente sin duplicar.
  - Toda prueba que impacte la base de datos física real (`2252025.accdb`) debe incluir rutinas de limpieza transaccional que restituyan el estado prístino de existencias y registros.
