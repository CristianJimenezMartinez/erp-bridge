<USER_REQUEST>
te voy a pasar toda la documentacion, y necesito que la pases a algun archivo.


Quiero que diseñes y construyas la web pública completa de un producto de software B2B de integración empresarial.

IMPORTANTE:

El nombre comercial definitivo del producto todavía NO está establecido.

Por tanto:

* NO inventes un nombre de marca definitivo.
* NO diseñes el logotipo definitivo.
* NO fijes un nombre comercial irreversible en el código.
* Utiliza temporalmente un placeholder neutro como `PRODUCT_NAME` o `BRAND_NAME`.
* Toda la arquitectura visual y de componentes debe permitir sustituir posteriormente ese placeholder por el nombre definitivo sin rehacer la web.

El objetivo de esta tarea es definir y construir una web pública de altísima calidad visual y comercial para el producto, no resolver el naming.

---

# 1. MATERIAL TÉCNICO DE REFERENCIA

Utiliza como fuente técnica el documento proporcionado junto con este prompt.

Ese documento describe:

* API Central Cloud
* Local Agent para Windows
* Dashboard Cloud
* Centro de Control Local
* Factusol
* WooCommerce
* sincronización
* licenciamiento
* telemetría
* actualizaciones
* Stripe
* configuración local
* sincronización manual
* arquitectura Headless / Store-and-Forward
* sistema visual interno

La arquitectura real descrita en la documentación debe respetarse.

NO inventes funcionalidades que no estén soportadas por la documentación.

NO inventes endpoints.

NO inventes integraciones inexistentes.

NO presentes como disponible una funcionalidad futura que todavía no esté implementada.

La documentación indica que la API cloud utiliza `/api/v1/` y el Agent local utiliza `/api/local/`, con API cloud en el dominio técnico actualmente existente y Agent ejecutándose localmente. Respeta esa separación.

---

# 2. OBJETIVO DE LA WEB

La web debe conseguir tres cosas:

### 1. Explicar

Que un empresario no técnico entienda en pocos segundos qué problema resuelve el producto.

### 2. Generar confianza

Debe transmitir que estamos ante una infraestructura seria, estable, segura y profesional.

### 3. Convertir

El visitante debe comprender qué puede hacer, cómo funciona y cuál es el siguiente paso.

NO quiero una simple página corporativa.

NO quiero una página que parezca documentación técnica.

NO quiero una copia de Linear, Vercel, Stripe, Supabase, Zapier, Make o n8n.

Quiero una identidad visual propia para una infraestructura de integración empresarial.

---

# 3. CONCEPTO CREATIVO

El concepto visual debe girar alrededor de:

## SISTEMAS QUE TRABAJAN JUNTOS

El producto actúa como una capa intermedia entre sistemas que normalmente están aislados.

La web debe transmitir visualmente:

* conexión
* flujo
* sincronización
* transformación
* continuidad
* observabilidad
* estabilidad

El elemento gráfico principal debe ser una representación abstracta de sistemas conectados mediante una infraestructura central.

NO quiero utilizar un puente literal como icono principal.

NO quiero utilizar flechas genéricas de “A → B” como recurso único.

NO quiero utilizar clichés de cloud computing.

NO quiero servidores 3D genéricos.

NO quiero robots ni imágenes de inteligencia artificial.

NO quiero stock photography.

---

# 4. DIRECCIÓN ARTÍSTICA

La interfaz del producto ya utiliza un lenguaje dark-tech basado en:

* negro profundo
* superficies oscuras
* microbordes
* tipografía Inter
* JetBrains Mono para datos técnicos
* indigo como color primario
* verdes/ámbar/rojo para estados
* glows difusos

Ese lenguaje puede servir como fundamento visual, pero la web pública debe llevarlo a un nivel mucho más editorial y sofisticado.

El resultado debe parecer una combinación de:

* infraestructura tecnológica
* producto B2B premium
* software serio
* diseño editorial moderno
* visualización de sistemas

Evita que parezca una dashboard app gigante.

---

# 5. PALETA BASE

Utiliza como punto de partida:

Background:
`#09090b`

Surface:
`#121215`

Secondary:
`#18181b`

Primary text:
`#f4f4f5`

Muted:
`#a1a1aa`

Subtle:
`#71717a`

Primary accent:
`#6366f1`
`#4f46e5`

Success:
`#10b981`

Warning:
`#f59e0b`

Danger:
`#ef4444`

Blue:
`#3b82f6`

No conviertas el morado en una decoración excesiva.

El color de marca debe utilizarse como señal visual, no cubrir toda la pantalla.

---

# 6. REGLA FUNDAMENTAL DE DISEÑO

NO diseñes una landing basada exclusivamente en:

Hero
+
3 cards
+
logos
+
features
+
pricing
+
FAQ
+
footer

Ese patrón es demasiado genérico.

La composición debe alternar:

* grandes espacios
* narrativa
* visualizaciones
* diagramas
* bloques editoriales
* datos
* movimiento
* comparaciones
* demostraciones

La página debe sentirse como una experiencia de producto.

---

# 7. ESTRUCTURA DE LA WEB

Construye como mínimo:

## HEADER

Navegación:

PRODUCT
HOW IT WORKS
INTEGRATIONS
PRICING
DOCS

Botones:

SIGN IN

GET STARTED

El header debe ser extremadamente limpio.

Sticky al hacer scroll.

Fondo ligeramente translúcido con blur.

No utilizar un navbar gigantesco.

---

# 8. HERO

El hero es la parte más importante.

Debe comunicar el valor en menos de 10 segundos.

Conceptualmente:

## Headline

No utilizar “The ultimate platform…”

No utilizar “Powerful integrations made easy”.

No utilizar copy genérico de SaaS.

El mensaje debe girar alrededor de conectar sistemas empresariales sin obligar al cliente a sustituir su infraestructura.

Concepto de ejemplo:

“Your systems. Finally working together.”

o una formulación equivalente.

NO fijes necesariamente este copy literal.

Genera el mejor copy posible según el concepto.

Subheadline:

Explicar que el producto conecta ERP, ecommerce y software empresarial manteniendo la infraestructura existente.

CTA principal:

GET STARTED

CTA secundario:

SEE HOW IT WORKS

---

# 9. HERO VISUAL

El hero debe contener una visualización dinámica del sistema.

Crear una composición tipo:

SYSTEM A
↓
integration layer
↓
SYSTEM B

pero mucho más sofisticada.

Representar:

FACTUSOL

↓

PRODUCT / DATA FLOW

↓

WOOCOMMERCE

La visualización debe mostrar:

* nodos
* datos moviéndose
* estados
* pequeños paquetes de información
* timestamps
* sincronizaciones
* conexión activa
* pequeños cambios en tiempo real

Debe sentirse como una infraestructura viva.

Ejemplo conceptual:

FACTUSOL
● ONLINE

7,978 PRODUCTS

──────────────

PRODUCT
SKU
PRICE
STOCK

──────────────

SYNC ENGINE

──────────────

WOOCOMMERCE
● ONLINE

428 ORDERS

No convertir esto en una simple tarjeta.

Debe integrarse dentro de la composición principal del hero.

---

# 10. SECCIÓN PROBLEMA

Mostrar visualmente que muchas empresas tienen sistemas desconectados.

Concepto:

ERP
+
Ecommerce
+
CRM
+
software local
+
procesos manuales

Resultado:

* duplicación
* errores
* datos desactualizados
* tareas manuales
* falta de visibilidad

No utilizar una lista aburrida.

Crear una visualización donde el caos se transforme progresivamente en una arquitectura organizada.

---

# 11. SECCIÓN SOLUCIÓN

Introducir el producto como una capa de conectividad.

No presentarlo como:

“otro conector”.

Presentarlo como:

una infraestructura que conecta sistemas existentes.

Mostrar:

SYSTEM
↓
PRODUCT
↓
SYSTEM

y posteriormente:

ERP
Ecommerce
CRM
APIs
Local systems
Cloud systems

IMPORTANTE:

No afirmar que todas estas integraciones estén disponibles actualmente.

Utilizar la visualización para comunicar la arquitectura futura, claramente diferenciando capacidades actuales de expansión.

---

# 12. SECCIÓN ESPECIAL: NO CAMBIES TU ERP

Esta debe ser una de las secciones más fuertes de la página.

Mensaje conceptual:

## Keep the systems that already work.

Explicar que el objetivo no es obligar a la empresa a migrar de ERP.

Caso inicial:

Factusol + WooCommerce.

Representar visualmente un entorno local y un entorno cloud comunicándose a través de la plataforma.

Mostrar además que cuando un sistema requiere acceso local, existe un agente local.

Nunca representar una conexión directa desde cloud hacia la base de datos local.

La representación correcta debe ser:

LOCAL SYSTEM
→ LOCAL AGENT
→ CLOUD INFRASTRUCTURE
→ ECOMMERCE

NO:

CLOUD
→
DATABASE LOCAL

---

# 13. SECCIÓN HOW IT WORKS

Tres pasos.

## 01 CONNECT

Conecta tus sistemas.

## 02 SYNC

Sincróniza y transforma los datos.

## 03 RECONCILE

Detecta divergencias y permite comprobar el estado.

Esta sección debe tener una visualización interactiva.

Al hacer hover o scroll:

Connect
→
Sync
→
Reconcile

Los elementos visuales deben reaccionar.

---

# 14. SECCIÓN DE DATOS

Crear una demostración visual de sincronización.

Ejemplo:

FACTUSOL

SKU:
FS-28492

STOCK:
42

PRICE:
19.90€

↓

SINCRONIZING

↓

WOOCOMMERCE

SKU:
FS-28492

STOCK:
42

PRICE:
19.90€

Utilizar JetBrains Mono para los datos.

Animación sutil.

No utilizar animaciones exageradas.

---

# 15. SECCIÓN LOCAL AGENT

Explicar el Agent como una pieza técnica cuando el sistema lo necesita.

NO presentarlo como obligatorio para cualquier integración.

Concepto:

## Your local systems stay local.

Explicar visualmente:

Windows PC
Factusol / local resources
↓
Local Agent
↓
Secure communication
↓
Cloud

Destacar:

* acceso local
* no exposición pública de la base de datos
* operación en segundo plano
* actualización automática
* estado online/offline

La arquitectura documentada contempla un ejecutable Windows x64 y un servicio local loopback para la configuración local.

---

# 16. SECCIÓN OBSERVABILITY

Este apartado debe diferenciar visualmente el producto.

Mostrar:

ONLINE
LAST SYNC
PRODUCTS
ORDERS
ERRORS
VERSION

Crear una mini visualización de actividad:

14:32:08
SYNC STARTED

14:32:09
1,204 PRODUCTS CHECKED

14:32:10
18 CHANGES FOUND

14:32:11
SYNC COMPLETED

Esto debe utilizar datos de demostración claramente identificables como ejemplos.

---

# 17. SECCIÓN CONNECTORS

Mostrar el concepto de conectores.

Actualmente:

Factusol
WooCommerce

Los demás deben aparecer únicamente como:

COMING LATER

o conceptos de expansión, nunca como integraciones ya disponibles.

Diseñar los conectores como nodos de un sistema, no como una cuadrícula aburrida de logos.

No llenar la pantalla con logos de empresas externas.

---

# 18. SECCIÓN SEGURIDAD

Debe transmitir confianza sin convertir la web en documentación técnica.

Temas:

* autenticación
* licenciamiento
* comunicaciones seguras
* actualizaciones verificadas
* aislamiento local
* trazabilidad

La documentación contempla validación criptográfica de licencias, HWID, período de gracia offline y actualización firmada del Agent.

Representarlo visualmente de forma elegante.

---

# 19. SECCIÓN PRODUCT EXPERIENCE

Mostrar fragmentos reales del producto:

Dashboard
Agent
Sync
Logs
Licenses

No hacer screenshots gigantes.

Utilizar pequeños recortes integrados dentro de composiciones editoriales.

El visitante debe sentir:

“esto existe”.

---

# 20. PRICING

La sección de pricing debe ser extremadamente limpia.

No inventes precios definitivos si todavía no están establecidos en la documentación de producto.

Si necesitas representar pricing, utiliza placeholders claramente marcados.

No diseñes pricing como si estuviera finalizado.

---

# 21. FAQ

Preguntas orientadas a objeciones reales:

¿Tengo que cambiar mi ERP?

¿Dónde se almacenan mis datos?

¿Necesito instalar algo?

¿Qué ocurre si mi ordenador está apagado?

¿Puedo conectar varias estaciones?

¿Cómo funciona la sincronización?

¿Qué sistemas puedo conectar?

¿Puedo cancelar?

Responder solo con información realmente soportada.

---

# 22. FOOTER

Minimalista.

Brand placeholder.

PRODUCT
COMPANY
DOCUMENTATION
LEGAL
STATUS

Social links solo si existen.

---

# 23. ANIMACIONES

La web debe tener movimiento.

Pero movimiento sofisticado, no espectáculo.

Utiliza:

* partículas mínimas
* líneas de conexión
* glow ambiental
* transición de estados
* aparición progresiva
* desplazamiento suave
* números que cambian
* pequeños eventos de sincronización

NO utilizar:

* parallax excesivo
* rotaciones 3D constantes
* elementos rebotando
* animaciones infantiles
* exceso de blur
* confetti
* sliders innecesarios

La sensación debe ser:

**quiet power**

No “tech demo”.

---

# 24. DISEÑO RESPONSIVE

La web debe diseñarse desde el principio para:

Desktop
Tablet
Mobile

En móvil:

* mantener jerarquía visual
* no ocultar información esencial
* convertir diagramas complejos en composiciones verticales
* simplificar visualizaciones sin destruir el concepto

No simplemente reducir el tamaño del desktop.

---

# 25. ACCESIBILIDAD

Cumplir como mínimo:

* contraste adecuado
* navegación por teclado
* focus states
* aria labels
* reduced motion
* botones correctamente identificados
* semántica HTML

---

# 26. PERFORMANCE

La web debe ser rápida.

Evitar:

* librerías innecesarias
* animaciones pesadas
* vídeos enormes
* imágenes decorativas sin propósito
* dependencias innecesarias

Optimizar para Core Web Vitals.

---

# 27. SEO

Preparar:

* title
* description
* canonical
* Open Graph
* Twitter card
* structured data cuando proceda
* headings semánticos
* contenido indexable
* URLs limpias

No hacer keyword stuffing.

---

# 28. COMPONENTES

Crear componentes reutilizables para:

* Header
* Hero
* SystemDiagram
* ConnectionNode
* IntegrationFlow
* StatusIndicator
* ProductPreview
* ConnectorCard
* Metric
* Timeline
* SecurityBlock
* CTA
* Footer

La arquitectura debe permitir reutilizarlos en futuras páginas.

---

# 29. DESIGN TOKENS

Crear variables centralizadas:

--bg
--surface
--surface-elevated
--border
--text
--text-muted
--accent
--success
--warning
--danger

y tokens de:

* spacing
* radius
* shadows
* typography
* transition

No dispersar valores arbitrarios por toda la aplicación.

---

# 30. TIPOGRAFÍA

Principal:

Inter

Monospace:

JetBrains Mono

Utilizar JetBrains Mono únicamente cuando tenga sentido técnico:

* SKU
* IDs
* timestamps
* logs
* rutas
* estados técnicos
* métricas técnicas

No utilizar monospace como decoración indiscriminada.

---

# 31. ICONOGRAFÍA

Utilizar una familia de iconos consistente.

Preferencia:

Lucide o equivalente limpio.

Stroke fino.

No mezclar diferentes estilos de iconografía.

No utilizar emojis en la interfaz pública.

---

# 32. LOGOTIPO

NO crear todavía un logotipo definitivo.

Crear únicamente un espacio preparado para:

`BRAND_MARK`

y:

`BRAND_NAME`

Debe poder sustituirse posteriormente sin alterar la composición.

---

# 33. NOMBRE

No fijar el nombre definitivo.

Utiliza temporalmente:

`PRODUCT_NAME`

No escribir un nombre comercial inventado.

No decidir naming.

No generar branding definitivo.

---

# 34. VOZ

El copy debe ser:

* directo
* seguro
* técnico sin ser incomprensible
* empresarial
* moderno
* claro

Evitar:

“revolutionary”
“game-changing”
“next-generation”
“AI-powered” salvo que realmente corresponda
“all-in-one”
“the world's best”

No utilizar lenguaje de startup exagerado.

---

# 35. DIFERENCIACIÓN VISUAL

La web debe diferenciarse de:

Linear
Vercel
Supabase
Zapier
Make
n8n
Workato
Boomi

No copiar:

* hero típico con gradiente
* grid de logos
* tres columnas de features
* dashboard flotante genérico
* blobs gigantes
* texto centrado sin narrativa

La inspiración puede existir, pero la composición debe ser original.

---

# 36. EXPERIENCIA DE SCROLL

Diseña la página como una historia:

1. PROBLEMA
2. SISTEMAS AISLADOS
3. PRODUCTO
4. CONEXIÓN
5. SINCRONIZACIÓN
6. RECONCILIACIÓN
7. OBSERVABILIDAD
8. SEGURIDAD
9. ESCALABILIDAD
10. CTA

El visitante debe sentir que está atravesando el sistema.

---

# 37. REQUISITO MUY IMPORTANTE

No empieces directamente escribiendo código sin analizar primero:

* arquitectura existente
* framework
* estructura actual
* assets
* componentes existentes
* rutas
* estilos
* build
* dependencias

Primero inspecciona el proyecto.

Determina qué existe realmente.

No reemplaces una aplicación existente simplemente porque sea más cómodo.

Reutiliza cuando tenga sentido.

---

# 38. PROCESO DE TRABAJO

Trabaja en estas fases:

## FASE 1 — AUDITORÍA

Analiza el proyecto existente.

Entregame:

* stack actual
* framework
* estructura
* páginas existentes
* componentes
* assets
* dependencias relevantes
* estado actual de la web
* problemas encontrados

NO MODIFIQUES NADA TODAVÍA.

## FASE 2 — DIRECCIÓN ARTÍSTICA

Define:

* layout
* sistema visual
* jerarquía
* composición
* animaciones
* diagramas
* responsive

Genera una especificación interna antes de implementar.

## FASE 3 — IMPLEMENTACIÓN

Implementa primero:

Header
Hero
System visualization
Problem
Solution
How it works
Agent
Observability
Connectors
Security
CTA
Footer

## FASE 4 — REFINAMIENTO

Comprueba:

* alineación
* espaciado
* tipografía
* contraste
* responsive
* animaciones
* consistencia

## FASE 5 — AUDITORÍA

Ejecuta:

* build
* lint
* typecheck
* tests disponibles

Comprueba consola del navegador.

Corrige errores reales.

---

# 39. NO SOBREDISEÑAR

El objetivo NO es meter 40 animaciones y 100 componentes.

Cada elemento visual debe cumplir una función:

explicar
demostrar
orientar
convencer

Eliminar cualquier decoración que no aporte.

---

# 40. RESULTADO ESPERADO

Quiero una web que pueda mirar un empresario y entender inmediatamente:

> “Tengo un ERP que necesito mantener.
> Tengo una tienda online.
> No quiero cambiar mi ERP.
> Necesito que ambos sistemas trabajen juntos.
> Este producto hace precisamente eso.”

Y que un perfil técnico pueda mirar la misma web y pensar:

> “Esto no es una landing vacía. Hay una arquitectura real detrás.”

El resultado final debe sentirse como:

**premium + técnico + empresarial + propio**

y no como:

**plantilla SaaS + dashboard genérico + gradiente morado**.

---

# 41. REGLA FINAL

Antes de escribir código, entiende el proyecto real.

Después diseña.

Después implementa.

Después prueba.

No inventes capacidades.

No inventes integraciones.

No fijes el nombre comercial.

No fijes el logo definitivo.

No cambies la arquitectura técnica existente sin justificarlo.

No conviertas esta tarea en una reingeniería del producto.

La prioridad es construir una **web pública excepcional, diferenciada y coherente con la infraestructura real del producto**.

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-10T11:15:46+02:00.
</ADDITIONAL_METADATA>