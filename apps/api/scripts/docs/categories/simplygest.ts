import { DocArticle } from '../types';

export const simplygestArticles: DocArticle[] = [
  {
    slug: 'simplygest/localizacion-base-datos',
    categorySlug: 'simplygest',
    title: 'Localización de la Base de Datos de SimplyGest (Datos.mdb)',
    subtitle: 'Rutas habituales de SimplyGest Software, estructura relacional de Datos.mdb y conexión local OLEDB.',
    badge: 'Arquitectura SimplyGest',
    readingTime: '5 min de lectura',
    metaTitle: 'Dónde está la Base de Datos de SimplyGest (Datos.mdb) | Bentian ERP',
    metaDescription: 'Cómo localizar la base de datos Datos.mdb de SimplyGest en disco local C: o unidades de red compartidas. Estructura de tablas ARTICULOS, CLIENTES y PEDIDOS.',
    keywords: 'donde esta base datos simplygest, datos.mdb simplygest, ruta simplygest, conectar simplygest woocommerce, tablas simplygest oledb',
    toc: [
      { id: 'ruta-estandar', label: '1. Ruta Estándar de Instalación', level: 2 },
      { id: 'estructura-tablas', label: '2. Estructura de Tablas en Datos.mdb', level: 2 },
      { id: 'oledb-conexion', label: '3. Conexión Nativa OLEDB sin Bloqueos', level: 2 },
      { id: 'deteccion-automatica', label: '4. Detección Automática en el Agente', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        SimplyGest Desktop almacena el catálogo de artículos, clientes, ventas y configuraciones de TPV en un archivo principal de base de datos Microsoft Access denominado <code class="text-emerald-400 font-mono">Datos.mdb</code>. Bentian ERP Bridge se conecta a este archivo de forma local mediante el proveedor oficial OLEDB de Windows, sin necesidad de APIs intermedias ni software de terceros.
      </p>

      <h2 id="ruta-estandar" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Ruta Estándar de Instalación</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Por defecto, el instalador oficial de SimplyGest sitúa los datos en la raíz del disco <code class="text-emerald-400 font-mono">C:</code> o en subcarpetas de empresa:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono space-y-1.5 text-zinc-300 mb-6">
        <div><strong class="text-emerald-400">Instalación estándar monopuesto:</strong></div>
        <div class="text-emerald-300">C:\\SimplyGest\\Datos.mdb</div>
        <div class="pt-2"><strong class="text-sky-400">Instalación multiempresa o versiones profesionales:</strong></div>
        <div class="text-zinc-300">C:\\SimplyGest\\Datos\\Empresa1\\Datos.mdb</div>
        <div class="text-zinc-400">C:\\Archivos de programa (x86)\\SimplyGest\\Datos.mdb</div>
        <div class="pt-2"><strong class="text-amber-400">Servidores y unidades de red compartidas:</strong></div>
        <div class="text-zinc-300">Z:\\SimplyGest\\Datos.mdb</div>
        <div class="text-zinc-400">\\\\SERVIDOR\\SimplyGest\\Datos.mdb</div>
      </div>

      <h2 id="estructura-tablas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Estructura de Tablas en Datos.mdb</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El conector de Bentian consulta de manera optimizada y segura las siguientes entidades relacionales de SimplyGest:
      </p>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Tabla SimplyGest</th>
              <th class="px-4 py-3 font-semibold">Campos Clave</th>
              <th class="px-4 py-3 font-semibold">Función en el Puente</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">ARTICULOS</td>
              <td class="px-4 py-2.5 font-mono">CODIGO, DESCR, STOCK, PRECIO_E, IMPUESTO, FAMILIA</td>
              <td class="px-4 py-2.5 text-zinc-300">Lectura de existencias, precios de venta, descripciones e impuestos con dirty checking.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-sky-400 font-bold">CLIENTES</td>
              <td class="px-4 py-2.5 font-mono">CODCLI, NOMBRE, NIF, DIRECCION, CP, PROVINCIA, EMAIL</td>
              <td class="px-4 py-2.5 text-zinc-300">Búsqueda automática y alta de clientes web antes de registrar los pedidos.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-indigo-400 font-bold">PEDIDOS_VENTA</td>
              <td class="px-4 py-2.5 font-mono">NUMERO, SERIE, FECHA, CODCLI, TOTAL, REFPEDIDO</td>
              <td class="px-4 py-2.5 text-zinc-300">Cabecera de pedidos web descargados de WooCommerce, Shopify o PrestaShop.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-violet-400 font-bold">LINEAS_PEDIDOS</td>
              <td class="px-4 py-2.5 font-mono">NUMERO, SERIE, ARTICULO, CANTIDAD, PRECIO, DTO</td>
              <td class="px-4 py-2.5 text-zinc-300">Desglose de productos comprados, unidades y descuentos por línea.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="oledb-conexion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Conexión Nativa OLEDB sin Bloqueos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Al igual que con Factusol, Bentian utiliza el controlador nativo <code class="text-emerald-400 font-mono">Microsoft.Jet.OLEDB.4.0</code> o <code class="text-emerald-400 font-mono">Microsoft.ACE.OLEDB.12.0/16.0</code> con modo compartido <code class="text-zinc-300 font-mono">Mode=Share Deny None</code>. Esto permite que el personal de la tienda siga cobrando y emitiendo tickets en el TPV de SimplyGest sin experimentar lentitud ni bloqueos de concurrencia.
      </p>

      <h2 id="deteccion-automatica" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Detección Automática en el Agente</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Al seleccionar SimplyGest en el asistente o en la pestaña ERP de Bentian, puedes pulsar el botón <strong>"Detectar en discos"</strong>. El agente escaneará automáticamente las unidades del sistema y sugerirá las bases de datos encontradas junto con el tamaño y nombre de la empresa. Una vez validada la ruta de <code class="text-emerald-400 font-mono">Datos.mdb</code>, continúa con la <a href="/docs/simplygest/configuracion-series-almacenes/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">configuración de series de facturación, almacenes y tarifas comerciales en SimplyGest</a>.
      </p>
    `
  },
  {
    slug: 'simplygest/configuracion-series-almacenes',
    categorySlug: 'simplygest',
    title: 'Configuración de Series, Almacenes y Tarifas en SimplyGest',
    subtitle: 'Guía técnica de parametrización comercial en Datos.mdb: numeración de series web en PEDIDOS_VENTA, cruce de tarifas 1 a 5 con IVA/Recargo de Equivalencia y aislamiento de stock frente al TPV.',
    badge: 'Configuración SimplyGest',
    readingTime: '8 min de lectura',
    image: '/assets/screenshots/02-multi-erp-selector.png',
    metaTitle: 'Configuración de Series, Almacenes y Tarifas en SimplyGest | Bentian ERP',
    metaDescription: 'Manual técnico para parametrizar series de pedidos web (PEDIDOS_VENTA), tarifas comerciales 1 a 5 (ARTICULOS) con IVA/Recargo y control de almacenes en SimplyGest.',
    keywords: 'configuracion simplygest woocommerce, series pedidos simplygest, tarifas simplygest web, almacenes simplygest, tabla pedidos_venta simplygest, pvp tarifas simplygest datos.mdb',
    toc: [
      { id: 'seleccion-serie', label: '1. Series de Pedidos en PEDIDOS_VENTA', level: 2 },
      { id: 'tarifas-comerciales', label: '2. Matriz de Tarifas (1 a 5) e IVA', level: 2 },
      { id: 'almacenes-stock', label: '3. Control de Almacenes y Reserva TPV', level: 2 },
      { id: 'configuracion-json-gui', label: '4. Perfil Técnico en el Agente Windows', level: 2 },
      { id: 'preguntas-frecuentes', label: '5. Casos Prácticos y FAQ de Implantación', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Una vez conectada la base de datos local <a href="/docs/simplygest/localizacion-base-datos/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Datos.mdb de SimplyGest</a> mediante OLEDB, el paso crítico antes de activar la sincronización en producción consiste en definir las reglas contables y comerciales del puente: qué <strong>serie documental</strong> agrupará las compras entrantes del canal online, qué <strong>tarifa de precios (1 a 5)</strong> gobernará el catálogo público y cómo se aislará el <strong>stock disponible</strong> para no interferir con los cobros simultáneos del módulo TPV en tienda física.
      </p>

      <div class="my-6 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#121215] shadow-2xl">
        <img src="/assets/screenshots/02-multi-erp-selector.png" alt="Configuración de Series, Almacenes y Tarifas de SimplyGest en Bentian ERP Bridge" class="w-full h-auto block" loading="lazy">
        <div class="px-4 py-2.5 bg-zinc-900/90 border-t border-white/[0.06] text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Selector Multi-ERP y parametrización de Serie, Almacén y Tarifa de SimplyGest en el Agente Windows</span>
          <span class="text-emerald-400 font-semibold">OLEDB Local-First</span>
        </div>
      </div>

      <h2 id="seleccion-serie" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Selección de la Serie de Pedidos en PEDIDOS_VENTA</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En la arquitectura relacional de SimplyGest Desktop, las cabeceras de pedidos de clientes se registran en la tabla <code class="text-emerald-400 font-mono">PEDIDOS_VENTA</code> y su desglose de artículos en <code class="text-emerald-400 font-mono">LINEAS_PEDIDOS</code>. Ambas tablas utilizan una clave compuesta formada por la columna <code class="text-zinc-200 font-mono">SERIE</code> (texto alfanumérico corto) y la columna <code class="text-zinc-200 font-mono">NUMERO</code> (entero autoincremental por serie).
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Separar contablemente las ventas generadas en WooCommerce, PrestaShop o Shopify respecto a los presupuestos y ventas de mostrador evita saltos de numeración y facilita el trimestre fiscal:
      </p>

      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Serie Configurada</th>
              <th class="px-4 py-3 font-semibold">Uso Recomendado</th>
              <th class="px-4 py-3 font-semibold">Comportamiento en PEDIDOS_VENTA</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">W / EC</td>
              <td class="px-4 py-2.5 text-zinc-200">Serie exclusiva eCommerce (Recomendado)</td>
              <td class="px-4 py-2.5 text-zinc-300">Aísla todos los pedidos online bajo su propio contador correlativo (<code class="font-mono">W-1</code>, <code class="font-mono">W-2</code>...), sin mezclarlos con los pedidos telefónicos o de almacén.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-sky-400 font-bold">1</td>
              <td class="px-4 py-2.5 text-zinc-200">Serie general por defecto de SimplyGest</td>
              <td class="px-4 py-2.5 text-zinc-300">Comparte el contador principal de la empresa. Bentian calcula atómicamente <code class="font-mono">MAX(NUMERO) + 1</code> dentro de una transacción OLEDB para impedir colisiones con otros puestos de red.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-indigo-400 font-bold">B2 / PR</td>
              <td class="px-4 py-2.5 text-zinc-200">Tiendas B2B o portales de distribuidores</td>
              <td class="px-4 py-2.5 text-zinc-300">Permite distinguir pedidos mayoristas sujetos a tarifas netas o con Recargo de Equivalencia antes de su conversión a albarán o factura en SimplyGest.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-zinc-300 mb-6 leading-relaxed">
        <strong class="text-indigo-300 block mb-1">Garantía de Idempotencia (<code class="font-mono">REFPEDIDO</code>):</strong>
        Antes de insertar cualquier pedido en <code class="text-emerald-400 font-mono">PEDIDOS_VENTA</code>, el conector verifica si el identificador único del pedido web (por ejemplo, <code class="text-zinc-200 font-mono">WOO-10842</code>) ya existe en el campo <code class="text-emerald-400 font-mono">REFPEDIDO</code>. Si se produce un microcorte de red y la plataforma reintenta el envío, Bentian reconoce la referencia existente y bloquea cualquier duplicidad documental.
      </div>

      <h2 id="tarifas-comerciales" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Matriz de Tarifas Comerciales de Venta (1 a 5) e Impuestos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La tabla maestra <code class="text-emerald-400 font-mono">ARTICULOS</code> de SimplyGest permite almacenar hasta cinco escalones de precios de venta por cada referencia, tanto en base imponible como con impuestos incluidos, vinculados al tipo de IVA del producto. Desde el selector <strong>Tarifa activa</strong> de Bentian puedes decidir qué columna sincronizar hacia tu tienda online:
      </p>

      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Tarifa en Bentian</th>
              <th class="px-4 py-3 font-semibold">Campos en ARTICULOS (Datos.mdb)</th>
              <th class="px-4 py-3 font-semibold">Cruce Impositivo Canónico</th>
              <th class="px-4 py-2.5 font-semibold">Escenario Comercial</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">Tarifa 1 (General)</td>
              <td class="px-4 py-2.5 font-mono">PRECIO_E / PRECIO1 / PVP1</td>
              <td class="px-4 py-2.5 text-zinc-300">Base neta + columna <code class="font-mono">IMPUESTO</code> (21%, 10%, 4%)</td>
              <td class="px-4 py-2.5 text-zinc-300">PVP estándar de mostrador sincronizado al céntimo con la web B2C.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-sky-400 font-bold">Tarifa 2 (Web / Promo)</td>
              <td class="px-4 py-2.5 font-mono">PRECIO2 / PVP2</td>
              <td class="px-4 py-2.5 text-zinc-300">Cálculo automático de precio base y PVP con IVA</td>
              <td class="px-4 py-2.5 text-zinc-300">Precios exclusivos para tienda online sin alterar el precio de etiqueta en tienda física.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-indigo-400 font-bold">Tarifa 3 (Profesional)</td>
              <td class="px-4 py-2.5 font-mono">PRECIO3 / PVP3</td>
              <td class="px-4 py-2.5 text-zinc-300">Soporte de IVA general/reducido + Recargo (<code class="font-mono">RECARGO</code>)</td>
              <td class="px-4 py-2.5 text-zinc-300">Catálogos B2B para instaladores, hostelería o gremios con descuento fijo.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-violet-400 font-bold">Tarifas 4 y 5 (Mayorista)</td>
              <td class="px-4 py-2.5 font-mono">PRECIO4 / PRECIO5 / PVP4 / PVP5</td>
              <td class="px-4 py-2.5 text-zinc-300">Redondeo bancario IEEE 754 a 4 decimales en base</td>
              <td class="px-4 py-2.5 text-zinc-300">Distribuidores por volumen o franquicias conectadas a una tienda secundaria.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        <strong>Precisión fiscal en IVA y Recargo de Equivalencia:</strong> El motor canónico de Bentian lee el porcentaje impositivo asignado a cada artículo en SimplyGest (<code class="text-emerald-400 font-mono">21%</code> general, <code class="text-emerald-400 font-mono">10%</code> reducido, <code class="text-emerald-400 font-mono">4%</code> superreducido o <code class="text-emerald-400 font-mono">0%</code> exento/intracomunitario) y, cuando el cliente web tiene activado el régimen de <strong>Recargo de Equivalencia</strong> (<code class="text-zinc-200 font-mono">5,2%</code>, <code class="text-zinc-200 font-mono">1,4%</code> o <code class="text-zinc-200 font-mono">0,5%</code>), desglosa las líneas en <code class="text-emerald-400 font-mono">LINEAS_PEDIDOS</code> cuadrando el total pagado por pasarela (Stripe, Redsys, PayPal o Bizum) sin desviaciones de redondeo.
      </p>

      <h2 id="almacenes-stock" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Control de Almacenes y Reserva frente al TPV de Mostrador</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En negocios que combinan atención al público mediante <strong>SimplyGest TPV</strong> y venta online 24/7, el mayor riesgo operativo es vender en la web la última unidad que un cliente físico acaba de llevarse en caja. Bentian resuelve este escenario mediante tres mecanismos combinados:
      </p>
      <ul class="space-y-2.5 text-sm text-zinc-300 mb-6">
        <li>• <strong>Selección de Almacén Físico o Lógico (<code class="text-emerald-400 font-mono">GEN</code> / Multialmacén):</strong> En instalaciones monopuesto o estándar, Bentian monitoriza la columna <code class="text-emerald-400 font-mono">STOCK</code> de la tabla <code class="text-emerald-400 font-mono">ARTICULOS</code>. En configuraciones multialmacén de SimplyGest, permite vincular el código específico del almacén logístico (<code class="text-zinc-200 font-mono">ALM1</code>, <code class="text-zinc-200 font-mono">CENTRAL</code> o <code class="text-zinc-200 font-mono">WEB</code>) para no comprometer la exposición de tienda.</li>
        <li>• <strong>Descuento Inmediato en Descarga de Pedidos:</strong> En el mismo instante en que entra un pedido desde WooCommerce, PrestaShop o Shopify (consulta el flujo completo en <a href="/docs/simplygest/sincronizacion-stock-pedidos/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Sincronización de Stock y Descarga de Pedidos en SimplyGest</a>), el puente descuenta las unidades comprometidas para que el cajero vea el stock real actualizado en el TPV.</li>
        <li>• <strong>Umbral de Seguridad Anti-Roturas (Buffer de Stock):</strong> Puedes definir en el agente un margen de protección (por ejemplo, reservar <code class="text-emerald-400 font-mono">1</code> o <code class="text-emerald-400 font-mono">2</code> unidades). Cuando el stock en <code class="text-zinc-200 font-mono">Datos.mdb</code> baja a ese umbral, el producto pasa automáticamente a <em>Agotado</em> en la web mientras conserva esas últimas unidades para la venta presencial.</li>
      </ul>

      <h2 id="configuracion-json-gui" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Estructura del Perfil Técnico en el Agente Windows</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Todos los parámetros seleccionados en la interfaz gráfica (puerto local <code class="text-indigo-400 font-mono">http://127.0.0.1:39281</code>) se guardan de forma atómica en <code class="text-emerald-400 font-mono">%APPDATA%\\Bentian Agent\\agent-config.json</code> con protección anti-wiping ante caídas temporales de red local o NAS:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6 overflow-x-auto leading-relaxed">
<pre>{
  "activeErp": "simplygest",
  "simplygest": {
    "dbPath": "C:\\\\SimplyGest\\\\Datos.mdb",
    "orderSeries": "W",
    "priceTariff": 1,
    "warehouseCode": "GEN",
    "safetyStockBuffer": 1,
    "autoCreateCustomers": true,
    "defaultTaxRate": 21
  }
}</pre>
      </div>

      <h2 id="preguntas-frecuentes" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Casos Prácticos y Preguntas Frecuentes de Implantación</h2>
      <div class="space-y-4 mb-6">
        <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <h3 class="text-xs font-bold text-white mb-1">¿Qué ocurre si cambio la tarifa activa de Tarifa 1 a Tarifa 2 con la tienda ya en marcha?</h3>
          <p class="text-xs text-zinc-400 leading-relaxed">
            Al guardar la nueva tarifa en el panel del Agente, el motor de <em>Dirty-Checking</em> invalida automáticamente las huellas SHA-256 de precios en memoria y ejecuta una sincronización completa de importes hacia WooCommerce, PrestaShop o Shopify en el siguiente ciclo, actualizando todo el catálogo en segundos.
          </p>
        </div>
        <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <h3 class="text-xs font-bold text-white mb-1">¿Puedo probar la configuración de series y tarifas sin tocar el archivo Datos.mdb de producción?</h3>
          <p class="text-xs text-zinc-400 leading-relaxed">
            Sí. Desde el asistente de configuración puedes activar el <strong>Modo Evaluación (Sandbox Demo)</strong> para SimplyGest, que levanta un entorno aislado con artículos, familias, tarifas y pedidos simulados para validar la conexión con tu eCommerce de pruebas antes de apuntar al archivo real <code class="text-zinc-300 font-mono">Datos.mdb</code>.
          </p>
        </div>
      </div>

      <div class="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="text-xs font-bold text-emerald-400 mb-1">Documentación Relacionada de SimplyGest</div>
          <p class="text-xs text-zinc-400">Consulta la arquitectura completa de integración con WooCommerce y el flujo transaccional de pedidos.</p>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <a href="/simplygest-woocommerce/" class="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition">Conector SimplyGest WooCommerce</a>
          <a href="/docs/simplygest/sincronizacion-stock-pedidos/" class="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 text-xs font-semibold transition">Flujo de Stock y Pedidos &rarr;</a>
        </div>
      </div>
    `
  },
  {
    slug: 'simplygest/sincronizacion-stock-pedidos',
    categorySlug: 'simplygest',
    title: 'Sincronización de Stock y Descarga de Pedidos en SimplyGest',
    subtitle: 'Flujo transaccional completo de pedidos web en PEDIDOS_VENTA, reserva de existencias en ARTICULOS y tolerancia a caídas de red.',
    badge: 'Operaciones SimplyGest',
    readingTime: '6 min de lectura',
    image: '/assets/screenshots/05-sales-order-history.png',
    metaTitle: 'Sincronización de Stock y Pedidos SimplyGest | Bentian ERP',
    metaDescription: 'Cómo funciona la sincronización automática de catálogo y la ingesta de pedidos web en SimplyGest sin provocar roturas de stock ni errores en caja.',
    keywords: 'pedidos web simplygest, sincronizacion stock simplygest, stock woocommerce simplygest, tienda online simplygest',
    toc: [
      { id: 'ciclo-sincronizacion', label: '1. Ciclo de Sincronización Automática', level: 2 },
      { id: 'ingesta-pedidos', label: '2. Ingesta Atómica de Pedidos', level: 2 },
      { id: 'tolerancia-offline', label: '3. Tolerancia a Caídas de Red y Equipos Apagados', level: 2 },
      { id: 'garantias-antioverselling', label: '4. Garantías contra Sobreventas', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        La sincronización entre SimplyGest y canales eCommerce (WooCommerce, PrestaShop o Shopify) opera de forma autónoma mediante el servicio local en segundo plano de Bentian, respetando la <a href="/docs/simplygest/configuracion-series-almacenes/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">configuración de series, almacenes y tarifas comerciales de SimplyGest</a> definida por el administrador.
      </p>

      <div class="my-6 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#121215] shadow-2xl">
        <img src="/assets/screenshots/05-sales-order-history.png" alt="Historial de Pedidos Web sincronizados en SimplyGest con Bentian ERP Bridge" class="w-full h-auto block" loading="lazy">
        <div class="px-4 py-2.5 bg-zinc-900/90 border-t border-white/[0.06] text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Monitor de pedidos web descargados e inyectados en PEDIDOS_VENTA y LINEAS_PEDIDOS</span>
          <span class="text-emerald-400 font-semibold">Transacción Atómica</span>
        </div>
      </div>

      <h2 id="ciclo-sincronizacion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Ciclo de Sincronización Automática</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El agente evalúa los cambios en la tabla <code class="text-emerald-400 font-mono">ARTICULOS</code> de <code class="text-zinc-300 font-mono">Datos.mdb</code>. Mediante dirty-checking criptográfico en RAM, solo envía a la tienda web los artículos cuyo stock o precio haya variado, consumiendo un ancho de banda mínimo y completando las actualizaciones en pocos milisegundos.
      </p>

      <h2 id="ingesta-pedidos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Ingesta Atómica de Pedidos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando un comprador completa un pedido en la tienda online:
      </p>
      <ol class="space-y-2 text-sm text-zinc-300 mb-6 list-decimal list-inside">
        <li>Bentian descarga el pedido mediante conexión HTTPS cifrada.</li>
        <li>Valida si el cliente ya existe en <code class="text-emerald-400 font-mono">CLIENTES</code> por NIF o email; si no existe, lo crea automáticamente.</li>
        <li>Genera el registro de cabecera en <code class="text-emerald-400 font-mono">PEDIDOS_VENTA</code> asignando el número correlativo de la serie configurada (ver <a href="/docs/simplygest/configuracion-series-almacenes/#seleccion-serie" class="text-indigo-400 hover:text-indigo-300 underline font-medium">parametrización de series en SimplyGest</a>) y guardando la referencia web en <code class="text-zinc-300 font-mono">REFPEDIDO</code> (evitando duplicados en caso de reintentos).</li>
        <li>Inserta las líneas de compra en <code class="text-emerald-400 font-mono">LINEAS_PEDIDOS</code> con precios, unidades e impuestos correctos.</li>
        <li>Actualiza el stock disponible del artículo para que no vuelva a venderse en mostrador ni en la web.</li>
      </ol>

      <h2 id="tolerancia-offline" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Tolerancia a Caídas de Red y Equipos Apagados</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si el ordenador de SimplyGest se apaga al cerrar el negocio, la tienda web sigue recibiendo compras normalmente. En cuanto el ordenador se enciende por la mañana y el agente arranca, la cola <strong>Store-and-Forward</strong> de Bentian procesa todos los pedidos pendientes de forma secuencial y limpia.
      </p>

      <h2 id="garantias-antioverselling" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Garantías contra Sobreventas</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El motor de stock de Bentian descuenta los pedidos en trámite para calcular las existencias reales. Adicionalmente, puedes configurar un buffer de seguridad (por ejemplo, marcar agotado si quedan menos de 2 unidades) en la <a href="/docs/simplygest/configuracion-series-almacenes/#almacenes-stock" class="text-indigo-400 hover:text-indigo-300 underline font-medium">sección de aislamiento de almacenes y stock de seguridad</a> para proteger artículos de alta rotación en mostrador.
      </p>
    `
  }
];
