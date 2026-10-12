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
        Al seleccionar SimplyGest en el asistente o en la pestaña ERP de Bentian, puedes pulsar el botón <strong>"Detectar en discos"</strong>. El agente escaneará automáticamente las unidades del sistema y sugerirá las bases de datos encontradas junto con el tamaño y nombre de la empresa.
      </p>
    `
  },
  {
    slug: 'simplygest/configuracion-series-almacenes',
    categorySlug: 'simplygest',
    title: 'Configuración de Series, Almacenes y Tarifas en SimplyGest',
    subtitle: 'Cómo parametrizar la serie de pedidos web, el almacén de stock y la tarifa comercial a sincronizar.',
    badge: 'Configuración',
    readingTime: '4 min de lectura',
    metaTitle: 'Series, Almacenes y Tarifas en SimplyGest | Bentian ERP Bridge',
    metaDescription: 'Guía de parametrización comercial para SimplyGest. Asignación de serie de facturación web, selección de tarifas 1 a 5 y control de almacenes.',
    keywords: 'configuracion simplygest woocommerce, series pedidos simplygest, tarifas simplygest web, almacenes simplygest',
    toc: [
      { id: 'seleccion-serie', label: '1. Selección de la Serie de Pedidos', level: 2 },
      { id: 'tarifas-comerciales', label: '2. Tarifas Comerciales de Venta (1 a 5)', level: 2 },
      { id: 'almacenes-stock', label: '3. Aislamiento de Almacenes', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Para garantizar una operativa ordenada entre las ventas online y las ventas de mostrador en SimplyGest, Bentian permite configurar la serie de pedidos, el almacén asignado y la tarifa comercial directamente desde la interfaz gráfica del agente.
      </p>

      <h2 id="seleccion-serie" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Selección de la Serie de Pedidos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Es una buena práctica contable separar los pedidos de la tienda online de los pedidos presenciales. En SimplyGest se recomienda utilizar una serie específica como <code class="text-emerald-400 font-mono">1</code> o <code class="text-emerald-400 font-mono">W</code> (hasta 2 caracteres). Bentian generará la numeración correlativa correspondiente sin solaparse con las ventas del TPV.
      </p>

      <h2 id="tarifas-comerciales" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Tarifas Comerciales de Venta (1 a 5)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        SimplyGest permite definir múltiples precios de venta para cada producto. En el panel de configuración de Bentian puedes elegir qué tarifa publicar en la tienda online:
      </p>
      <ul class="space-y-2 text-sm text-zinc-300 mb-6">
        <li>• <strong>Tarifa 1:</strong> Tarifa general de venta al público (PVP recomendado).</li>
        <li>• <strong>Tarifa 2 / Tarifa 3:</strong> Tarifas para distribuidores, profesionales o promociones online.</li>
        <li>• <strong>Cálculo de IVA:</strong> Bentian detecta el porcentaje impositivo asociado al artículo (21%, 10%, 4%) e inyecta en WooCommerce el precio final con impuestos desglosados con precisión de céntimo.</li>
      </ul>

      <h2 id="almacenes-stock" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Aislamiento de Almacenes</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si gestionas varios almacenes físicos (por ejemplo, Almacén Central y Tienda Física), puedes configurar el código de almacén que servirá los pedidos web (<code class="text-emerald-400 font-mono">GEN</code> o <code class="text-emerald-400 font-mono">1</code>), evitando que las ventas online comprometan el stock reservado para la tienda física.
      </p>
    `
  },
  {
    slug: 'simplygest/sincronizacion-stock-pedidos',
    categorySlug: 'simplygest',
    title: 'Sincronización de Stock y Descarga de Pedidos en SimplyGest',
    subtitle: 'Flujo completo de pedidos web, reserva de existencias y tolerancia a caídas de red.',
    badge: 'Operaciones',
    readingTime: '6 min de lectura',
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
        La sincronización entre SimplyGest y canales eCommerce (WooCommerce, PrestaShop o Shopify) opera de forma autónoma mediante el servicio local en segundo plano de Bentian.
      </p>

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
        <li>Genera el registro de cabecera en <code class="text-emerald-400 font-mono">PEDIDOS_VENTA</code> asignando el número correlativo y guardando la referencia web en <code class="text-zinc-300 font-mono">REFPEDIDO</code> (evitando duplicados en caso de reintentos).</li>
        <li>Inserta las líneas de compra en <code class="text-emerald-400 font-mono">LINEAS_PEDIDOS</code> con precios, unidades e impuestos correctos.</li>
        <li>Actualiza el stock disponible del artículo para que no vuelva a venderse en mostrador ni en la web.</li>
      </ol>

      <h2 id="tolerancia-offline" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Tolerancia a Caídas de Red y Equipos Apagados</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si el ordenador de SimplyGest se apaga al cerrar el negocio, la tienda web sigue recibiendo compras normalmente. En cuanto el ordenador se enciende por la mañana y el agente arranca, la cola <strong>Store-and-Forward</strong> de Bentian procesa todos los pedidos pendientes de forma secuencial y limpia.
      </p>

      <h2 id="garantias-antioverselling" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Garantías contra Sobreventas</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El motor de stock de Bentian descuenta los pedidos en trámite para calcular las existencias reales. Adicionalmente, puedes configurar un buffer de seguridad (por ejemplo, marcar agotado si quedan menos de 2 unidades) para proteger artículos de alta rotación en mostrador.
      </p>
    `
  }
];
