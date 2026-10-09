# Propuesta de Homologación Tecnológica: Bentian ERP Bridge & Software DELSOL (TeamPartner)

> **Destinatario:** Departamento de Alianzas Tecnológicas y Canal de Distribución (TeamPartner)  
> **Empresa:** Software DELSOL S.A. / TeamSystem  
> **Buzón Oficial:** `altas.distribucion@sdelsol.com` (cc: `comercial@sdelsol.com`)  
> **Remitente:** Cristian Jiménez Martínez — Fundador y Arquitecto de Software en Bentian (`cristian@cristianjm.com`)  
> **Producto:** Bentian ERP Bridge (Conector Nativo Factusol ↔ WooCommerce / Comercio Electrónico)  
> **Web Oficial:** [https://bridge.cristianjm.com](https://bridge.cristianjm.com)  
> **Fecha:** Octubre 2026  

---

## 1. Resumen Ejecutivo y Propósito de la Alianza

**Bentian ERP Bridge** es una solución de integración tecnológica de alto rendimiento diseñada específicamente para sincronizar **Factusol** (versiones 2024, 2025 y 2026 de escritorio y red local) con tiendas online **WooCommerce**.

El objetivo de esta propuesta es solicitar la **homologación técnica e incorporación de Bentian ERP Bridge en el catálogo de soluciones recomendadas para la red de distribuidores (TeamPartners) y clientes de Software DELSOL**, cubriendo de forma solvente y contrastada la creciente demanda de integración e-commerce que Factusol delega en soluciones de terceros (*Factusol Web*).

---

## 2. El Problema del Mercado y la Oportunidad para Software DELSOL

1. **La fuga de clientes de Factusol hacia ERPs en la nube:**  
   Cuando una pyme usuaria de Factusol decide abrir canal de venta online (B2C o B2B), muchas agencias de desarrollo web les recomiendan migrar a ERPs nativos web (Holded, Odoo, Shopify), lo que provoca la **pérdida de licencias y mantenimiento anual para Software DELSOL y sus distribuidores**.
2. **Los problemas de los conectores web tradicionales:**  
   La mayoría de conectores de terceros en el mercado provocan bloqueos de base de datos en Factusol (errores OLEDB por concurrencia no controlada), fallan cuando hay microcortes en la red local o NAS de la empresa, o requieren complejas configuraciones de servidor.
3. **La solución Bentian:**  
   Permite a la pyme **mantener su Factusol de siempre en su infraestructura local o servidor**, garantizando una sincronización bidireccional inmediata con WooCommerce sin tocar la estructura interna del ERP y con tolerancia absoluta a fallos de red.

---

## 3. Ficha Técnica de Integración y Seguridad

* **Arquitectura No Intrusiva:** Bentian Agent se ejecuta como servicio nativo de Windows en el PC o servidor del cliente. Realiza lecturas limpias y transacciones de inserción atómicas en los archivos de datos de Factusol (`.accdb` y bases de datos locales/red), sin modificar esquemas ni requerir drivers externos inestables.
* **Tolerancia a Red y NAS (Mecanismo Anti-Wiping):** Soporte pleno de rutas UNC nativas de Windows (`\\SERVIDOR\Factusol\...`) y unidades mapeadas (`Z:\...`). Si la red local o la conexión a internet sufren una desconexión temporal, el agente pasa a modo defensivo y reanuda la cola automáticamente al restaurarse el enlace, sin bloquear Factusol ni perder pedidos.
* **Cuadre Fiscal al Céntimo:** Respeto estricto a las tarifas de Factusol, con redondeo matemático exacto en los 4 tramos de IVA oficiales (21%, 10%, 4%, 0%) y recargo de equivalencia.
* **Control Anti-Sobreventa:** Sincronización en tiempo real basada en stock disponible (`DISSTO`) descontando pedidos pendientes de servir.
* **Plugin Oficial en WordPress.org:** Registrado y verificado en la Fundación WordPress (`bentian-erp-bridge-for-factusol`), con compatibilidad nativa con tablas de pedidos de alto rendimiento (**HPOS**) y generación de credenciales seguras con 1 solo clic.

---

## 4. Validación en Producción Real (Caso de Éxito)

La solución se encuentra actualmente en producción operativa activa en clientes reales del sector industrial:

* **Empresa:** Suministros Rubio (Ferretería y suministros industriales).
* **Volumen:** Más de 1.500 referencias con múltiples variantes de medida, actualización de stock en tiempo real y descarga automatizada de pedidos de WooCommerce hacia Factusol.
* **Entorno:** Factusol sobre red local de empresa.
* **Tienda en Producción:** [https://tienda.suministrosrubio.com/articulos](https://tienda.suministrosrubio.com/articulos)

---

## 5. Beneficios para Software DELSOL y su Red TeamPartner

| Para Software DELSOL | Para los Distribuidores (TeamPartners) | Para el Cliente Final |
| :--- | :--- | :--- |
| **Retención directa de cartera:** Sus clientes no necesitan cambiar de ERP para vender online. | **Margen comercial:** Pueden comercializar la implantación y el mantenimiento mensual sin necesidad de programar. | Sigue utilizando su Factusol habitual de forma fluida. |
| **Cero carga de soporte técnico:** Bentian asume al 100% las incidencias relacionadas con la sincronización e-commerce. | **Protección de sus contratos:** Evitan que una agencia externa convenza al cliente de sustituir Factusol. | Stock unificado entre tienda física/almacén y tienda online. |
| **Imagen de innovación:** Alianza con un conector moderno y certificado en WordPress.org. | **Licencias NFR de laboratorio:** Disponibilidad de claves gratuitas para pruebas internas. | Puesta en marcha en menos de 15 minutos. |

---

## 6. Propuesta de Colaboración Técnica

1. **Licencias de Laboratorio NFR:** Entrega gratuita e inmediata de licencias NFR (Not For Resale) para el departamento técnico, soporte y formadores de Software DELSOL para pruebas en sus laboratorios de Jaén.
2. **Inclusión en el Directorio de Conectores Homologados:** Recomendación de Bentian ERP Bridge como solución de integración contrastada para WooCommerce en la sección comercial y soporte de Factusol Web.
3. **Condiciones Especiales para TeamPartners:** Acceso a acuerdos de distribución y tarifas preferentes para los socios certificados de DELSOL.
