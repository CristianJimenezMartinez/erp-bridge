# DOSSIER EJECUTIVO MULTI-ERP 2026: BENTIAN ERP BRIDGE
## Infraestructura Local-First para Conectar Factusol, SimplyGest, Sage 50, a3ERP y Ágora POS con WooCommerce, Shopify, PrestaShop y Holded Cloud

> **Resumen Ejecutivo para Dirección General, Gerencia, Implantadores ERP y Agentes Digitalizadores**  
> **Producto:** Bentian ERP Bridge (`v0.4.11`) — Puente Polimórfico de Datos en Tiempo Real  
> **Página Web Oficial:** [https://bridge.cristianjm.com](https://bridge.cristianjm.com)  
> **Programa de Partners y Distribuidores (25% Recurrente):** [https://bridge.cristianjm.com/partners/](https://bridge.cristianjm.com/partners/)  
> **Contacto Comercial e Ingeniería:** `soporte@cristianjm.com` · Tel/WhatsApp: **+34 617 205 053**

---

## 1. ¿QUÉ ES BENTIAN ERP BRIDGE?

**Bentian ERP Bridge** es una infraestructura de software nativa para Windows diseñada para conectar los **5 sistemas ERP y TPV locales más utilizados por las PYMEs españolas** (**Factusol, SimplyGest, Sage 50, Wolters Kluwer a3ERP y Ágora POS**) con canales de comercio electrónico (**WooCommerce, Shopify, PrestaShop**) y facturación contable en la nube (**Holded Cloud ERP**) de forma bidireccional, automática y sin abrir puertos en el router.

```
┌────────────────────────────────────────────────┐      Sincronización Bidireccional       ┌────────────────────────────────────────────────┐
│          ERP / TPV LOCAL EN WINDOWS            │ ◄─────────────────────────────────────► │        CANALES E-COMMERCE & CLOUD ERP          │
│ • Factusol (.accdb / .mdb OLEDB)               │   • Stock real disponible (DISSTO)      │ • WooCommerce (REST v3 + HPOS)                 │
│ • SimplyGest (DBISAM .dat / API :56985 / .mdb) │   • Tarifas 1-10, IVA y Recargo (R.E.)  │ • Shopify (Admin GraphQL API 2024-10+)         │
│ • Sage 50 (SQL Server Ejercicio 2026XX)        │   • Fotos 100% Automáticas (SHA-256)    │ • PrestaShop (WebServices 1.7 / 8.x)           │
│ • a3ERP (ActiveX COM + SQL IDPEDV)             │   • Inyección atómica de pedidos web    │ • Holded Cloud ERP (Facturación & Gestoría)    │
│ • Ágora Retail / POS (SQL + API HTTP :8984)    │   • Cola Offline Store-and-Forward      │ • Endpoint Universal REST / Webhooks           │
└────────────────────────────────────────────────┘                                         └────────────────────────────────────────────────┘
```

---

## 2. LOS 5 PROBLEMAS CRÍTICOS QUE RESUELVE EN EL DÍA A DÍA

### 1. Fin Radical del Picado Manual de Pedidos (Ahorro de ~15h/semana)
- **El problema:** El equipo administrativo pierde entre 1 y 3 horas diarias copiando a mano cada pedido de WooCommerce o Shopify dentro del ERP local: datos fiscales, NIF, direcciones, referencias, descuentos, portes y régimen de IVA.
- **La solución Bentian:** Cada pedido pagado en la tienda online se inyecta de forma transaccional en el ERP local en menos de 3 segundos (`F_PCL`/`F_LPC` en Factusol, `PEDIDOSC`/`PEDIDOSL` en SimplyGest, `c_pediven`/`d_pediven` con `guid_id` en Sage 50, `a3ERPActiveX.Pedido`/`CABEPEV` en a3ERP o `CustomerOrder` en Ágora POS).

### 2. Inventario Disponible Real (Cero Sobreventas entre Mostrador y Web)
- **El problema:** Se vende la última unidad en el mostrador físico y, minutos después, un cliente online compra ese mismo producto porque la web no estaba enterada.
- **La solución Bentian:** Calcula el **Stock Disponible Real** descontando reservas y pedidos pendientes de servir (`DISSTO` en Factusol, `FINAL - RESERVADO` en Sage 50, `UNIDADES - RESERVADO` en a3ERP) y actualiza el canal online aplicando *Dirty-Checking* criptográfico (solo transmite los SKUs que han cambiado).

### 3. Sincronización 100% Automática de Fotografías (`UniversalErpImageResolver`)
- **El problema:** Subir y mantener actualizadas miles de fotografías de productos en la tienda online obliga a un trabajo manual inasumible.
- **La solución Bentian:** El motor universal detecta y extrae automáticamente las imágenes nativas de los 5 ERPs:
  - **Factusol:** Campo `IMGART` y carpeta local/red `Imagenes\`.
  - **SimplyGest:** Columnas `IMAGEN` / `FOTO`, carpeta `Imagenes\` y endpoint `/api/articulos/:codigo/imagen`.
  - **Sage 50, a3ERP y Ágora POS:** Extracción directa de binarios SQL (`VARBINARY(MAX)` / `IMAGE` desde `d_albimg`, `IMAGENES` y `Product.Image`), autodetección de formato por *Magic Bytes* (`JPEG`, `PNG`, `WEBP`, `GIF`) y deduplicación por hash `SHA-256` para no resubir imágenes sin cambios.

### 4. Arquitectura Tripartita: `Shopify / WooCommerce ➔ ERP Almacén ➔ Holded Gestoría`
- **El problema:** La asesoría fiscal pide trabajar en **Holded Cloud**, pero el almacén no puede abandonar Factusol o SimplyGest porque toda su operativa de pistola de códigos de barras y mostrador depende de su ERP local.
- **La solución Bentian:** El pedido web entra al ERP local para el *picking* de almacén y, simultáneamente, Bentian emite la factura legal correlativa y el asiento en el Libro Diario de **Holded Cloud ERP**, eliminando por completo la doble contabilidad.

### 5. Seguridad Local-First (Sin Abrir Puertos en el Router ni Exponer SQL/Access)
- **El problema:** Otros conectores exigen abrir el puerto `1433` de SQL Server o compartir carpetas SMB en internet, exponiendo la empresa a ataques de ransomware.
- **La solución Bentian:** El agente se ejecuta como servicio local en Windows y solo realiza conexiones salientes HTTPS (`TLS 1.3`, puerto `443`). Incluye **Modo Evaluación Sandbox** para simular toda la sincronización en seco antes de escribir un solo registro en el ERP.

---

## 3. MATRIZ TÉCNICA DE COMPATIBILIDAD MULTI-ERP (2026)

| ERP Local / Cloud | Motor de Conexión Soportado | Lectura de Catálogo, Stock y Fotos | Inyección de Pedidos Web |
| :--- | :--- | :--- | :--- |
| **Factusol ERP** *(Software DELSOL)* | Proveedor nativo OLEDB (`Microsoft.ACE.OLEDB.12.0/16.0`) sobre `.accdb` / `.mdb` en local o NAS UNC (`\\SERVIDOR\...`) | `F_ART`, `F_STO` (`DISSTO`), `F_LTA`, variantes tallas/colores y fotos desde `IMGART` + `Imagenes\` | Transaccional en `F_PCL` y `F_LPC` + alta de cliente en `F_CLI` con IVA y Recargo de Equivalencia |
| **SimplyGest Desktop** *(SimplyGest)* | **Triple Motor:**<br>1. DBISAM (`Datos\Emp1\articulos.dat`)<br>2. Módulo Server API (`:56985`)<br>3. Access OLEDB (`Datos.mdb`) | `ARTICULOS`, `FAMILIAS`, Tarifas 1–10, tallas/colores y fotos desde `IMAGEN`/`FOTO` o API `:56985` | Inyección en `PEDIDOSC`/`PEDIDOSL`, `PEDIDOS_VENTA`/`LINEAS_PEDIDOS`, API REST y CSV `SimplyMove` |
| **Sage 50** *(Sage España)* | MS SQL Server (`WITH (NOLOCK)`) con **auto-detección de BBDD de ejercicio anual** (`2026XX`) + común (`COMUXX`) | `articulo`, `stocks`, `pvp`, `cajas` y extracción binaria BLOB de fotos en `d_albimg` | Transacción ACID en `c_pediven` y `d_pediven` con generación nativa de `guid_id` y serie documental (`LETRA`) |
| **a3ERP** *(Wolters Kluwer)* | **Doble Motor:**<br>1. Puente oficial ActiveX COM (`a3ERPActiveX.Pedido`)<br>2. MS SQL Server transaccional | `ARTICULO`, `STOCKALM`, `TARIFASV` y extracción de fotos binarias desde `IMAGENES` | Vía `a3ERPActiveX.Pedido` (32/64 bits) o SQL transaccional con clave correlativa `IDPEDV` en `CABEPEV`/`LINEPEV` |
| **Ágora Retail / POS** *(Ágora)* | MS SQL Server Express + **API HTTP Oficial de Ágora (`:8984`)** con autenticación `Api-Token` | `SaleItem`, `Stock`, `Price`, códigos EAN y fotos binarias en `Product.Image` | Prioridad vía HTTP API `:8984` (`SaleInitialize` / `CustomerOrder`) para refresco instantáneo en pantallas TPV + respaldo SQL |
| **Holded Cloud ERP** *(Holded)* | Conector nativo REST API v1 HTTPS con control de idempotencia (`customId`) | Sincronización de contactos fiscales (`CIF/NIF`), catálogo y cuentas contables | Emisión automática de facturas de venta, albaranes y asientos en Libro Diario para la gestoría |

---

## 4. RETORNO DE LA INVERSIÓN (ROI) PARA LA EMPRESA FINAL

$$\begin{array}{|l|r|}
\hline
\textbf{Coste anual de gestión manual sin Bentian ERP Bridge} & \\
\hline
\text{Tiempo medio dedicado a transcribir pedidos web, clientes y fotos a mano} & \text{1,5 horas / día} \\
\text{Días laborables al año} & \text{220 días} \\
\text{Coste empresa por hora administrativa (sueldo + Seguridad Social)} & \text{16,00 € / hora} \\
\hline
\mathbf{Coste\ anual\ directo\ en\ picado\ manual\ y\ errores\ de\ stock} & \mathbf{5.280,00\ \text{€} / \text{año}} \\
\hline
\hline
\textbf{Inversión en Bentian ERP Bridge (Plan Anual Todo Incluido)} & \mathbf{199,00\ \text{€} / \text{año}} \\
\text{(Tarifa Fundador Fase 1 / Campaña Beta Gratuita hasta 31/12/2026)} & \mathbf{(139,00\ \text{€} / \text{año})} \\
\hline
\hline
\mathbf{Ahorro\ Neto\ Anual\ Directo\ para\ la\ PYME} & \mathbf{+5.081,00\ \text{€} / \text{año}} \\
\hline
\end{array}$$

---

## 5. PROGRAMA DE PARTNERS, AGENTES DIGITALIZADORES E IMPLANTADORES ERP

¿Eres una **Agencia de Diseño Web / eCommerce**, un **Agente Digitalizador (Kit Digital / Kit Consulting)**, un **Implantador de ERP / Técnico Informático** o una **Asesoría Fiscal conectada con Holded**?

- **25% de Comisión Recurrente y Vitalicia** sobre todas las suscripciones anuales o mensuales de tus clientes.
- **100% de los Honorarios de Puesta en Marcha (Setup Fee) para ti:** Factura directamente a tu cliente entre **250 € y 600 €** por la implantación y parametrización, resolviéndola en 15 minutos con nuestro asistente guiado y Modo Sandbox.
- **Panel Multi-Tenant de Distribuidor (`/dashboard`):** Gestiona múltiples organizaciones clientes, emite licencias Trial de 15 días al instante y cuenta con **asistencia directa de nuestra ingeniería** en tu primer cliente piloto.

👉 **Consulta todos los detalles y la calculadora de comisiones en:**  
**[https://bridge.cristianjm.com/partners/](https://bridge.cristianjm.com/partners/)**

---

## 6. CONTACTO DIRECTO Y DEMOSTRACIÓN TÉCNICA

- **Web Oficial y Descarga:** [https://bridge.cristianjm.com](https://bridge.cristianjm.com)
- **Portal de Partners y Distribuidores:** [https://bridge.cristianjm.com/partners/](https://bridge.cristianjm.com/partners/)
- **Centro de Documentación (41 Guías Técnicas):** [https://bridge.cristianjm.com/docs/](https://bridge.cristianjm.com/docs/)
- **Correo de Ingeniería y Canal B2B:** `soporte@cristianjm.com`
- **Teléfono / WhatsApp Directo:** **+34 617 205 053**
