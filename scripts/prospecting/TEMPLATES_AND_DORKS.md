# Estrategia de Prospección B2B - Bentian ERP Bridge

Este documento contiene las plantillas de secuencias de email y la estrategia de prospección automatizada para captar PYMEs y Agencias que utilicen Factusol y WooCommerce en España.

## 1. Footprints (Dorks) Avanzados en Google

### a) PYMEs (Tiendas con WooCommerce y catálogos de Factusol)
Para detectar ferreterías, suministros, fontanería, repuestos y hostelería:
- `inurl:tienda "ferreteria" OR "fontaneria" OR "suministros" "woocommerce" OR "wp-content/plugins/woocommerce"`
- `intext:"Powered by WooCommerce" intext:"ferretería" OR intext:"suministros" site:.es`
- `"Añadir al carrito" "repuestos" OR "distribución" "woocommerce" site:.es`

### b) Tiendas con problemas de sincronización visibles
Para detectar empresas cuyo Factusol no se comunica bien con el ecommerce (dolor real):
- `"Añadir al carrito" "consultar stock" "ferretería" OR "suministros" site:.es`
- `intext:"catálogo no disponible" OR "precios sujetos a cambios" "ferretería" site:.es`
- `intext:"consultar disponibilidad" "suministros industriales" "carrito" site:.es`

### c) Agencias de Diseño Web
Para encontrar posibles partners que ofrecen servicios web y se topan con Factusol:
- `intext:"conectar factusol" OR "integración factusol" "agencia" OR "diseño web" site:.es`
- `intext:"sincronizar woocommerce con factusol" "desarrollo web" site:.es`
- `"desarrollo ecommerce" "factusol" "partners" site:.es`

---

## 2. Secuencias de Email Automatizadas (Cold Email B2B)

### Plantilla 1: Apertura (PYMEs) - Orientada al Dolor
**Asunto:** Sincronización de stock en {{Nombre_Empresa}} / Consulta rápida

Hola {{Nombre_Contacto}},

He estado navegando por la tienda de {{Nombre_Empresa}} y he visto que trabajáis con WooCommerce. Quería hacerte una pregunta rápida: 

¿Actualmente tenéis que actualizar los precios y el stock a mano desde Factusol, o ya habéis conseguido automatizarlo?

Te lo comento porque muchas empresas del sector de suministros acaban perdiendo horas picando datos o tienen que poner el aviso de "consultar stock" para evitar vender sin inventario. En Bentian hemos desarrollado un conector que sincroniza todo Factusol en tiempo real y sin cuotas por volumen.

Si te interesa ahorrarte ese trabajo manual, dímelo y te envío un vídeo de 2 minutos donde enseño cómo funciona.

Un saludo,
Cristian Jiménez

---

### Plantilla 2: Seguimiento (Día +3) - Caso de Éxito
**Asunto:** Re: Sincronización de stock en {{Nombre_Empresa}} / Caso Suministros Rubio

Hola {{Nombre_Contacto}},

Te escribía para darle una vuelta al email anterior. Sé que cambiar o tocar la conexión del ERP da bastante respeto.

Por darte algo de contexto real: hace poco implantamos Bentian en Suministros Rubio. Antes perdían horas cuadrando tarifas y actualizando el stock de miles de referencias. Ahora Factusol manda los datos directamente a la web sin tocar un botón, lo que les ha permitido centrarse en vender.

Te dejo aquí un enlace a una demo rápida en vídeo de cómo queda por dentro:
[Enlace a Demo de Bentian / Suministros Rubio]

¿Tenéis 10 minutos la semana que viene para que veamos si encaja en vuestro caso?

Un saludo,
Cristian

---

### Plantilla 3: Propuesta para Agencias (Modelo Partner)
**Asunto:** Integraciones de Factusol para vuestros clientes en {{Nombre_Agencia}}

Hola {{Nombre_Contacto}},

He visto vuestro trabajo en {{Nombre_Agencia}} y sé que hacéis desarrollos potentes en WooCommerce.

A menudo, a las agencias les llega el "marrón" de tener que conectar la web con Factusol. Los conectores del mercado suelen ser lentos, se cuelgan o requieren servidores muy caros. 

Hemos desarrollado **Bentian ERP Bridge**, un software nativo en Windows que conecta Factusol a WooCommerce en 5 minutos, soporta múltiples tarifas, reglas de precios y no se cae.

Tenemos un modelo de **Partners para Agencias**: os lleváis una comisión recurrente por cada licencia, y nosotros nos encargamos del soporte técnico del conector. Vosotros entregáis la web, nosotros la conectamos, y los dos ganamos.

¿Tenéis algún proyecto entre manos que necesite esta integración? Si quieres, agendamos una llamada de 10 min y te enseño el panel de control.

Un saludo,
Cristian Jiménez

---

## 3. Mensaje para LinkedIn o Formulario Web (Corto y directo)

Hola {{Nombre_Contacto}},
He visto que en {{Nombre_Empresa}} trabajáis con WooCommerce. ¿Tenéis automatizada la sincronización de stock y precios con Factusol o lo seguís haciendo manual o con conectores lentos? Hemos montado Bentian, una herramienta que sincroniza en tiempo real sin colgarse. Si os interesa ahorrar horas de gestión, te paso un vídeo de 2 minutos para que lo veas. ¡Un saludo!
