=== Bentian ERP Bridge for Factusol ===
Contributors: cristianjm
Donate link: https://bridge.cristianjm.com
Tags: factusol, woocommerce, erp, sync, stock, orders, delsol, sincronizacion
Requires at least: 5.8
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.3.8
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Conector oficial y de alto rendimiento para sincronizar Factusol (Software DELSOL) con tu tienda online. Sincronizacion bidireccional de catalogo, stock en tiempo real y pedidos.

== Description ==

**Bentian ERP Bridge for Factusol** es la solucion integral y de alto rendimiento para conectar **Factusol** (el software de gestion empresarial lider en España) con **WooCommerce**.

A diferencia de los conectores web tradicionales basados exclusivamente en consultas lentas o plugins pesados que saturan la base de datos de WordPress, Bentian opera mediante una arquitectura hibrida:

1. **Plugin de WordPress (este plugin):** Actua como el receptor de alta velocidad, optimizando la REST API nativa de WooCommerce, declarando compatibilidad plena con **HPOS (High-Performance Order Storage)** y generando las credenciales seguras con 1 solo clic.
2. **Bentian Agent (Windows Desktop):** Un servicio nativo ligero y blindado que se ejecuta en el PC o servidor local de tu empresa donde reside la base de datos de Factusol (`.accdb`, red local o NAS).

### Caracteristicas Principales

* **Sincronizacion de Catalogo:** Alta y actualizacion de articulos, descripciones, categorias y familias directamente desde Factusol.
* **Control de Stock en Tiempo Real:** Actualizaciones inmediatas que previenen la sobreventa, calculando el stock real y disponible segun tarifas y depositos.
* **Soporte Completo de Variantes y Tallas:** Gestion nativa de tallas, colores y combinaciones de Factusol hacia productos variables de WooCommerce.
* **Precios y Cuadre Fiscal al Centimo:** Gestion rigurosa de los 4 tramos de IVA (21%, 10%, 4%, 0%) y recargo de equivalencia.
* **Descarga Automatica de Pedidos:** Los pedidos confirmados en WooCommerce entran de forma autonoma como pedidos de cliente en Factusol, listos para emision de albaran o factura.
* **Tolerancia a Caidas de Red (Anti-Wiping):** Si se corta la conexion a internet o la red local de la oficina, el agente entra en modo defensivo y reanuda la cola de sincronizacion en cuanto vuelve la conectividad, sin perdida de datos ni bloqueos OLEDB.
* **Generador de Credenciales con 1-Clic:** Olvidate de bucear en configuraciones complejas de WooCommerce; el plugin genera el Consumer Key y Consumer Secret al instante.
* **Probado en Produccion Real:** Desplegado con exito en tiendas con catalogos extensos y variantes (caso real: Suministros Rubio, tienda industrial con mas de 1.500 referencias sincronizadas en tiempo real).

### Dependencia de Servicio y Software Complementario (Guideline 6)

Este plugin se comunica y sincroniza con el agente de escritorio y servicio en la nube **Bentian ERP Bridge** para conectar de manera segura y bidireccional tu base de datos local de Factusol con WooCommerce:

* **Nombre del Software y Servicio:** Bentian ERP Bridge
* **Autor y Proveedor:** Cristian Jimenez Martinez (Bentian)
* **Funcionalidad:** Lee catalogo, precios y stock de tu instalacion local de Factusol y los transmite de forma encriptada via HTTPS a tu tienda WooCommerce; asimismo, descarga los pedidos confirmados para crearlos en Factusol.
* **Descarga del Agente Windows:** [bridge.cristianjm.com/releases/latest/Bentian-Setup.exe](https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe)
* **Terminos del Servicio (Terms of Service):** [https://bridge.cristianjm.com/terminos/](https://bridge.cristianjm.com/terminos/)
* **Politica de Privacidad (Privacy Policy):** [https://bridge.cristianjm.com/privacidad/](https://bridge.cristianjm.com/privacidad/)

== Installation ==

1. Sube la carpeta `bentian-erp-bridge-for-factusol` al directorio `/wp-content/plugins/` o instala el archivo `.zip` desde el menu **Plugins > Añadir nuevo > Subir plugin**.
2. Activa el plugin a traves del menu **Plugins** en WordPress.
3. Ve a **WooCommerce > Factusol Bridge** en tu barra lateral de administracion.
4. Haz clic en **"Generar Claves para Bentian Agent (1-Click)"** para obtener tu URL, Consumer Key y Consumer Secret.
5. Descarga e instala el **Bentian Agent para Windows** desde [bridge.cristianjm.com](https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe) en el ordenador donde tengas Factusol.
6. Pega las credenciales en la interfaz de Bentian Agent y selecciona tu empresa de Factusol. ¡Tu tienda ya estara sincronizada!

== Frequently Asked Questions ==

= ¿Funciona con Factusol instalado en red local o NAS? =
Si, 100%. Bentian Agent esta diseñado especificamente para soportar rutas de red UNC (`\\SERVIDOR\Factusol\...`) y unidades mapeadas (`Z:\...`), con proteccion contra desconexiones temporales de red.

= ¿Que version de WooCommerce necesito? =
Es compatible con WooCommerce 5.0 hasta la version 9.3+. Es 100% compatible tanto con la arquitectura clasica de posts como con las nuevas tablas de pedidos de alto rendimiento (HPOS).

= ¿Necesito una IP fija en mi oficina o tienda fisica? =
No. La comunicacion se realiza de forma saliente y segura mediante HTTPS directo desde el PC de Factusol hacia tu WooCommerce, por lo que no necesitas abrir puertos ni contratar IP fija en tu conexion de fibra.

= ¿Puedo probar el conector antes de adquirir una licencia comercial? =
Si. Bentian ofrece un periodo de prueba completo para que agencias y empresas puedan verificar la sincronizacion en su entorno local de Factusol. Solicita tu clave en [bridge.cristianjm.com](https://bridge.cristianjm.com).

= ¿Se respetan las tarifas con y sin IVA? =
Si. Factusol y WooCommerce pueden configurarse con precios con IVA incluido o excluido. Bentian realiza el redondeo matematico y cuadre fiscal en centimos para garantizar coherencia en la facturacion.

== Screenshots ==

1. Panel de diagnostico y generador de credenciales con 1 clic en WooCommerce.
2. Interfaz nativa del Agente de escritorio Bentian para Windows.
3. Tienda WooCommerce sincronizada en tiempo real con Factusol.

== Changelog ==

= 0.3.8 =
* Lanzamiento oficial inicial en el ecosistema WooCommerce y WordPress.org.
* Compatibilidad probada hasta WordPress 7.1.
* Generador de credenciales REST API de 1-clic con permisos de lectura y escritura.
* Diagnostico integral de compatibilidad (HTTPS, Permalinks, HPOS).
* Endpoint de latencia ultrarrapido en `/wp-json/bentian/v1/ping`.
* Declaracion oficial de compatibilidad HPOS (`custom_order_tables`).

== Upgrade Notice ==

= 0.3.8 =
Lanzamiento oficial de Bentian ERP Bridge for Factusol compatible hasta WordPress 7.1.
