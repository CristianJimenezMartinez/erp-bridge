import { DocArticle } from '../types';

export const sqlErpsArticles: DocArticle[] = [
  {
    slug: 'sql-erps/conector-sage50-sql-server',
    categorySlug: 'sql-erps',
    title: 'Conector Sage 50 SQL Server: Arquitectura, Tablas y Pedidos Web',
    subtitle: 'Guía técnica de ingeniería para conectar la instancia Microsoft SQL Server de Sage 50 España con WooCommerce, PrestaShop y Shopify mediante lecturas no bloqueantes WITH (NOLOCK) y transacciones atómicas.',
    badge: 'SQL Server · Sage 50',
    readingTime: '9 min de lectura',
    image: '/assets/screenshots/02-multi-erp-selector.png',
    metaTitle: 'Conector Sage 50 SQL Server: Tablas articulo, stocks y c_pediven | Bentian',
    metaDescription: 'Manual técnico de integración SQL Server local para Sage 50 España. Mapeo de tablas articulo, stocks, pvp, clientes, c_pediven y d_pediven, IVA, Recargo de Equivalencia y Modo Sandbox.',
    keywords: 'conector sage 50 sql server, tablas sage 50 sql, c_pediven d_pediven sage 50, sincronizar sage 50 woocommerce prestashop shopify, instancia sql sage50',
    toc: [
      { id: 'instancia-sql-sage50', label: '1. Instancia SQL Server y Ejercicio Activo en Sage 50', level: 2 },
      { id: 'mapeo-tablas-sage50', label: '2. Mapeo Relacional de Tablas en Sage 50', level: 2 },
      { id: 'lecturas-nolock-dirty-checking', label: '3. Lecturas No Bloqueantes WITH (NOLOCK) y Dirty-Checking', level: 2 },
      { id: 'inyeccion-pedidos-impuestos', label: '4. Inyección Transaccional en c_pediven y d_pediven', level: 2 },
      { id: 'configuracion-json-sandbox', label: '5. Configuración JSON en AppData y Modo Sandbox', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        <strong>Sage 50 España</strong> (evolución sobre motor Microsoft SQL Server de la histórica línea Eurowin / Sage Murano) almacena toda su operativa mercantil, contable y logística en bases de datos relacionales alojadas en el servidor local de la empresa. El <a href="/sage50-woocommerce/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Conector Sage 50 de Bentian ERP Bridge</a> se ejecuta como un servicio nativo en Windows y opera directamente contra dicha instancia SQL Server sin exponer puertos TCP a Internet ni depender de conectores cloud intermedios.
      </p>

      <div class="my-6 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#121215] shadow-2xl">
        <img src="/assets/screenshots/02-multi-erp-selector.png" alt="Configuración de Sage 50 SQL Server en Bentian ERP Bridge" class="w-full h-auto block" loading="lazy">
        <div class="px-4 py-2.5 bg-zinc-900/90 border-t border-white/[0.06] text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Selector Polimórfico Multi-ERP con perfil nativo para Sage 50 SQL Server y Modo Evaluación Sandbox</span>
          <span class="text-emerald-400 font-semibold">SqlServerBaseAdapter · Local-First</span>
        </div>
      </div>

      <h2 id="instancia-sql-sage50" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Instancia SQL Server y Base de Datos del Ejercicio Activo</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En una instalación estándar de Sage 50, el motor de base de datos se despliega bajo una instancia dedicada de SQL Server (habitualmente <code class="text-emerald-400 font-mono">localhost\\SAGE50</code>, <code class="text-emerald-400 font-mono">.\\SQLEXPRESS</code> o el nombre del servidor de dominio en red local). A diferencia de otros ERPs monolíticos, Sage 50 organiza la información separando la base de datos común de grupo y las bases de datos anuales de cada ejercicio fiscal:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono space-y-1.5 text-zinc-300 mb-6">
        <div><strong class="text-emerald-400">Instancias SQL Server habituales en instalaciones Sage 50:</strong></div>
        <div class="text-emerald-300">SERVIDOR_LOCAL\\SAGE50</div>
        <div class="text-zinc-300">127.0.0.1\\SQLEXPRESS  (o puerto estático 1433 en LAN privada)</div>
        <div class="pt-2"><strong class="text-sky-400">Nomenclatura de Base de Datos de Ejercicio Activo:</strong></div>
        <div class="text-zinc-300">2026AA / 202601  (Año del ejercicio + código de grupo o empresa en Sage 50)</div>
        <div class="pt-2"><strong class="text-amber-400">Modos de Autenticación Soportados por SqlServerBaseAdapter:</strong></div>
        <div class="text-zinc-300">• Autenticación Integrada de Windows (SSPI / Trusted_Connection=yes)</div>
        <div class="text-zinc-400">• Autenticación SQL Server dedicada (Usuario de mínimo privilegio con db_datareader / db_datawriter)</div>
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando la empresa realiza la apertura del nuevo año contable en Sage 50, basta con actualizar el identificador de base de datos en la interfaz local del Agente (<code class="text-indigo-400 font-mono">http://127.0.0.1:39281</code>) para continuar sincronizando sobre el nuevo ejercicio manteniendo intactas las reglas de negocio, almacenes y series.
      </p>

      <h2 id="mapeo-tablas-sage50" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Mapeo Relacional de Tablas en Sage 50</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El adaptador <code class="text-emerald-400 font-mono">Sage50Adapter</code> traduce entre el modelo canónico de Bentian y las tablas físicas del esquema <code class="text-zinc-200 font-mono">dbo</code> de Sage 50. A continuación se detalla la correspondencia exacta de entidades y columnas:
      </p>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Tabla SQL Sage 50</th>
              <th class="px-4 py-3 font-semibold">Columnas Clave Mapeadas</th>
              <th class="px-4 py-3 font-semibold">Rol en el Ciclo de Sincronización</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">dbo.articulo</td>
              <td class="px-4 py-2.5 font-mono">CODIGO, NOMBRE, FAMILIA, MARCA, TIPO_IVA, PESO, BAJA</td>
              <td class="px-4 py-2.5 text-zinc-300">Maestro de artículos. Se filtran automáticamente las referencias marcadas con <code class="font-mono">BAJA = 0</code> y se vincula su tipo impositivo con el catálogo web.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-sky-400 font-bold">dbo.stocks</td>
              <td class="px-4 py-2.5 font-mono">ARTICULO, ALMACEN, FINAL, RESERVADO, PENDIENTE</td>
              <td class="px-4 py-2.5 text-zinc-300">Existencias por almacén. Bentian calcula el stock disponible real descontando unidades pendientes de servir y aplicando el buffer de seguridad configurado.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-indigo-400 font-bold">dbo.pvp</td>
              <td class="px-4 py-2.5 font-mono">ARTICULO, TARIFA, PVP, IVA_INC</td>
              <td class="px-4 py-2.5 text-zinc-300">Matriz de precios multiescalón. Permite seleccionar la tarifa de venta pública (B2C) o profesional (B2B) normalizando base imponible e IVA.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-amber-400 font-bold">dbo.clientes</td>
              <td class="px-4 py-2.5 font-mono">CODIGO, CIF, NOMBRE, DIRECCION, CODPOST, POBLACION, EMAIL, RECARGO</td>
              <td class="px-4 py-2.5 text-zinc-300">Resolución de clientes web por NIF/CIF o correo electrónico. Si el comprador es nuevo, se da de alta con su código contable correlativo.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-violet-400 font-bold">dbo.c_pediven</td>
              <td class="px-4 py-2.5 font-mono">EMPRESA, NUMERO, LETRA, FECHA, CLIENTE, ALMACEN, TOTALPED, OBSERVACIO</td>
              <td class="px-4 py-2.5 text-zinc-300">Cabecera de pedidos de venta. Almacena la serie documental (<code class="font-mono">LETRA</code>), el código de cliente y la referencia única del pedido eCommerce.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-rose-400 font-bold">dbo.d_pediven</td>
              <td class="px-4 py-2.5 font-mono">EMPRESA, NUMERO, LETRA, LINIA, ARTICULO, DEFINICION, UNIDADES, PRECIO, DTO1, TIPO_IVA, RECARGO</td>
              <td class="px-4 py-2.5 text-zinc-300">Detalle de líneas de pedido de venta, incluyendo artículos comprados, línea de gastos de transporte, descuentos e impuestos desglosados.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="lecturas-nolock-dirty-checking" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Lecturas No Bloqueantes WITH (NOLOCK) y Dirty-Checking Criptográfico</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Uno de los problemas más graves en integraciones de terceros con Sage 50 ocurre cuando un conector externo lanza consultas pesadas de lectura sobre <code class="text-emerald-400 font-mono">dbo.articulo</code> y <code class="text-emerald-400 font-mono">dbo.stocks</code> sin especificar nivel de aislamiento, provocando bloqueos compartidos (<em>Shared Locks</em>) que congelan la pantalla de los operarios de facturación o almacén.
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian erradica este cuello de botella combinando dos técnicas de ingeniería:
      </p>
      <ul class="space-y-2.5 text-sm text-zinc-300 mb-6">
        <li>• <strong>Hints explícitos <code class="text-emerald-400 font-mono">WITH (NOLOCK)</code> / <code class="text-emerald-400 font-mono">READ UNCOMMITTED</code>:</strong> Todas las consultas de catálogo y stock se ejecutan sin adquirir cerrojos de lectura en SQL Server, completándose en menos de 25 milisegundos incluso en catálogos de más de 25.000 referencias.</li>
        <li>• <strong>Motor Dirty-Checking SHA-256 en RAM:</strong> El Agente calcula una huella criptográfica por cada tupla <code class="text-zinc-200 font-mono">(SKU, StockDisponible, PrecioTarifa, TipoIVA)</code>. En cada ciclo de sincronización solo se envían hacia WooCommerce, PrestaShop o Shopify los artículos que realmente han sufrido una variación en SQL Server, reduciendo en un 98% las llamadas HTTP salientes.</li>
      </ul>

      <h2 id="inyeccion-pedidos-impuestos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Inyección Transaccional en c_pediven y d_pediven y Cuadre Fiscal</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando entra un pedido pagado desde la tienda online, el conector abre una transacción ACID en SQL Server para garantizar que nunca quede una cabecera en <code class="text-emerald-400 font-mono">c_pediven</code> huérfana de líneas en <code class="text-emerald-400 font-mono">d_pediven</code>:
      </p>
      <ol class="space-y-2 text-sm text-zinc-300 mb-6 list-decimal list-inside">
        <li><strong>Control de Idempotencia:</strong> Se verifica que el identificador externo del pedido web (ej. <code class="text-zinc-200 font-mono">WOO-48291</code>) no haya sido registrado previamente en la serie asignada (<code class="text-emerald-400 font-mono">LETRA</code>).</li>
        <li><strong>Resolución de Cliente:</strong> Se busca el NIF/CIF normalizado en <code class="text-emerald-400 font-mono">dbo.clientes</code>. Si existe y tiene activada la marca de <strong>Recargo de Equivalencia</strong>, el motor fiscal aplica automáticamente los tipos vigentes (<code class="text-zinc-200 font-mono">5,2%</code> para IVA 21%, <code class="text-zinc-200 font-mono">1,4%</code> para IVA 10% y <code class="text-zinc-200 font-mono">0,5%</code> para IVA 4%).</li>
        <li><strong>Numeración Correlativa Segura:</strong> Se bloquea brevemente el contador de la serie (<code class="text-emerald-400 font-mono">LETRA = 'W'</code> o la serie configurada) para obtener <code class="text-zinc-200 font-mono">MAX(NUMERO) + 1</code> sin colisionar con pedidos creados manualmente en oficina.</li>
        <li><strong>Escritura de Cabecera y Líneas:</strong> Se insertan los registros en <code class="text-emerald-400 font-mono">c_pediven</code> y <code class="text-emerald-400 font-mono">d_pediven</code> cuadrando al céntimo la base imponible y el total cobrado por Stripe, Redsys o PayPal, y se compromete el stock reservado en <code class="text-emerald-400 font-mono">dbo.stocks</code>.</li>
      </ol>

      <h2 id="configuracion-json-sandbox" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Configuración JSON en AppData y Modo Evaluación Sandbox</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La configuración de Sage 50 se persiste de forma atómica en <code class="text-emerald-400 font-mono">%APPDATA%\\Bentian Agent\\agent-config.json</code>. Además, si deseas probar la integración antes de conectar con el servidor SQL de producción, puedes activar <code class="text-indigo-400 font-mono">"sandboxMode": true</code> para que el Agente levante un entorno simulado de Sage 50 en memoria:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6 overflow-x-auto leading-relaxed">
<pre>{
  "erpType": "sage50",
  "evaluationMode": { "enabled": false, "simulatedErp": "sage50" },
  "softwareErp": {
    "activeProvider": "sage50",
    "provisioned": true,
    "providers": {
      "sage50": {
        "serverInstance": ".\\\\SAGE50",
        "databaseName": "GESTION",
        "authMode": "windows",
        "orderSeries": "1",
        "warehouseCode": "01",
        "tariffCode": "1",
        "evaluationMode": false
      }
    }
  }
}</pre>
      </div>

      <div class="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="text-xs font-bold text-emerald-400 mb-1">Página Comercial y Descarga del Conector Sage 50</div>
          <p class="text-xs text-zinc-400">Consulta planes de licencia (29 €/mes o 199 €/año) y el servicio de Puesta en Marcha Llave en Mano.</p>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <a href="/sage50-woocommerce/" class="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition">Ver Conector Sage 50 &rarr;</a>
          <a href="/docs/arquitectura/arquitectura-polimorfica-multi-erp/" class="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 text-xs font-semibold transition">Arquitectura Multi-ERP</a>
        </div>
      </div>
    `,
  },
  {
    slug: 'sql-erps/conector-agora-pos-retail',
    categorySlug: 'sql-erps',
    title: 'Conector Ágora POS / Retail: Sincronización SQL Express en Tiempo Real',
    subtitle: 'Documentación técnica para integrar terminales TPV Ágora Retail y Hostelería (SQL Server Express local) con WooCommerce, Shopify y PrestaShop con latencia delta inferior a 5 segundos.',
    badge: 'SQL Express · Ágora POS',
    readingTime: '8 min de lectura',
    image: '/assets/screenshots/02-multi-erp-selector.png',
    metaTitle: 'Conector Ágora POS / Retail SQL Express con WooCommerce y Shopify | Bentian',
    metaDescription: 'Guía técnica de conexión SQL Server Express (.\\SQLEXPRESS / .\\AGORA) para Ágora POS y Retail. Tablas Product, PriceList, WarehouseStock y CustomerOrder en tiempo real.',
    keywords: 'conector agora pos sql express, sincronizar agora retail woocommerce shopify, tablas sql agora pos, evitar sobreventas tpv agora, stock tiempo real agora',
    toc: [
      { id: 'arquitectura-sql-agora', label: '1. Motor SQL Server Express en Terminales Ágora POS', level: 2 },
      { id: 'esquema-tablas-agora', label: '2. Mapeo de Tablas Product, PriceList y WarehouseStock', level: 2 },
      { id: 'sincronizacion-delta-5s', label: '3. Sincronización Delta (<5s) Anti-Sobreventas en Mostrador', level: 2 },
      { id: 'descarga-pedidos-omnicanal', label: '4. Recepción de Pedidos Web y Click & Collect', level: 2 },
      { id: 'perfil-json-distribuidores', label: '5. Perfil JSON y Modo Sandbox para Distribuidores TPV', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        <strong>Ágora POS / Retail</strong> es uno de los sistemas de punto de venta (TPV) más veloces y extendidos en el comercio minorista español (tiendas de moda, calzado, alimentación especializada, electrónica, deporte y franquicias). Su motor de persistencia descansa sobre una instancia local de <strong>Microsoft SQL Server Express</strong> alojada en el terminal principal de caja o servidor de backoffice. El <a href="/agora-pos-woocommerce/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Conector Ágora POS de Bentian ERP Bridge</a> enlaza directamente con esa instancia local para sincronizar existencias y pedidos web en menos de 5 segundos.
      </p>

      <div class="my-6 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#121215] shadow-2xl">
        <img src="/assets/screenshots/02-multi-erp-selector.png" alt="Configuración de Ágora POS / Retail sobre SQL Server Express en Bentian ERP Bridge" class="w-full h-auto block" loading="lazy">
        <div class="px-4 py-2.5 bg-zinc-900/90 border-t border-white/[0.06] text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Configuración del adaptador Ágora POS / Retail sobre .\SQLEXPRESS en la interfaz local del Agente</span>
          <span class="text-emerald-400 font-semibold">Delta Sync &lt;5s · Sin Bloqueos TPV</span>
        </div>
      </div>

      <h2 id="arquitectura-sql-agora" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Motor SQL Server Express en Terminales Ágora POS</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En una topología típica de tienda con uno o varios terminales táctiles Ágora, uno de los equipos Windows actúa como nodo servidor ejecutando SQL Server Express. Bentian se instala en ese mismo equipo (o en cualquier ordenador de administración dentro de la misma subred LAN) y establece una conexión local persistente:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono space-y-1.5 text-zinc-300 mb-6">
        <div><strong class="text-emerald-400">Instancias SQL Server por defecto en Ágora Retail:</strong></div>
        <div class="text-emerald-300">localhost\\SQLEXPRESS  o  localhost\\AGORA</div>
        <div class="text-zinc-300">192.168.1.100\\SQLEXPRESS  (conexión desde PC de oficina al TPV maestro en LAN)</div>
        <div class="pt-2"><strong class="text-sky-400">Protocolo y Latencia de Red Local:</strong></div>
        <div class="text-zinc-300">Shared Memory / TCP Loopback con tiempo de respuesta &lt; 10 ms por consulta diferencial</div>
      </div>

      <h2 id="esquema-tablas-agora" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Mapeo de Tablas Product, PriceList y WarehouseStock</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El adaptador <code class="text-emerald-400 font-mono">AgoraPosAdapter</code> inspecciona de forma no intrusiva las tablas relacionales de catálogo, tarifas e inventario de Ágora para construir el estado canónico de sincronización:
      </p>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Entidad SQL Ágora</th>
              <th class="px-4 py-3 font-semibold">Campos y Claves Relacionales</th>
              <th class="px-4 py-3 font-semibold">Mapeo hacia WooCommerce / Shopify / PrestaShop</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">Product / SaleItem</td>
              <td class="px-4 py-2.5 font-mono">Id, Code, Barcodes, Name, FamilyId, VatId, IsForSale</td>
              <td class="px-4 py-2.5 text-zinc-300">Emparejamiento por SKU (<code class="font-mono">Code</code>) o código de barras EAN-13, nombre comercial, categoría y tipo de IVA aplicable.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-sky-400 font-bold">PriceList / PriceListItem</td>
              <td class="px-4 py-2.5 font-mono">PriceListId, SaleItemId, MainPrice, StandardPrice</td>
              <td class="px-4 py-2.5 text-zinc-300">Sincronización del precio de venta al público de la tarifa asignada al canal online o tarifa general de mostrador.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-indigo-400 font-bold">Stock / WarehouseStock</td>
              <td class="px-4 py-2.5 font-mono">WarehouseId, ProductId, Quantity, MinStock</td>
              <td class="px-4 py-2.5 text-zinc-300">Control de existencias reales del almacén vinculado (<code class="font-mono">WarehouseId</code>) tras cada venta de ticket o entrada de albarán.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-violet-400 font-bold">CustomerOrder / Document</td>
              <td class="px-4 py-2.5 font-mono">Serie, Number, CustomerId, WarehouseId, GrossAmount, NetAmount, Lines</td>
              <td class="px-4 py-2.5 text-zinc-300">Inyección de pedidos online con su referencia web, líneas de producto, impuestos y descuento automático de inventario.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="sincronizacion-delta-5s" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Sincronización Delta (&lt;5s) Anti-Sobreventas en Mostrador</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En el comercio minorista físico, las roturas de stock suelen producirse los viernes por la tarde o sábados: un cliente presencial pasa por caja el último par de zapatillas o el último artículo de exposición con el lector de código de barras y, minutos después, un comprador online adquiere esa misma referencia porque el conector web tradicional solo sincroniza cada 30 o 60 minutos.
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian elimina este riesgo mediante un ciclo reactivo de baja latencia:
      </p>
      <ul class="space-y-2.5 text-sm text-zinc-300 mb-6">
        <li>• <strong>Sondeo ligero con <code class="text-emerald-400 font-mono">WITH (NOLOCK)</code>:</strong> Cada pocos segundos, el Agente consulta en memoria el vector de existencias de <code class="text-emerald-400 font-mono">WarehouseStock</code> sin bloquear jamás el hilo de cobro del TPV ni retrasar la apertura del cajón portamonedas.</li>
        <li>• <strong>Propagación inmediata de deltas:</strong> En cuanto detecta que la cantidad de un SKU ha disminuido por una venta en mostrador, dispara únicamente la actualización de ese producto hacia la API de WooCommerce, Shopify o PrestaShop en menos de 5 segundos.</li>
        <li>• <strong>Buffer de Stock de Vitrina:</strong> Puedes configurar <code class="text-zinc-200 font-mono">safetyStockBuffer</code> (ej. reservar 1 unidad) para que la tienda online marque el producto como agotado cuando solo quede la unidad expuesta en el escaparate físico.</li>
      </ul>

      <h2 id="descarga-pedidos-omnicanal" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Recepción de Pedidos Web y Click &amp; Collect</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Los pedidos confirmados en el eCommerce se descargan automáticamente y se registran en Ágora asociando el cliente web (o cliente genérico de tienda online según preferencia contable), las líneas con su tipo de IVA correspondiente y la referencia del pedido (<code class="text-emerald-400 font-mono">WOO-...</code> o <code class="text-emerald-400 font-mono">SHOP-...</code>). Si el terminal TPV se apaga por la noche al cerrar el comercio, la cola <strong>Store-and-Forward</strong> retiene las ventas nocturnas y las inyecta secuencialmente al encender el equipo por la mañana.
      </p>

      <h2 id="perfil-json-distribuidores" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Perfil JSON y Modo Evaluación Sandbox para Distribuidores de TPV</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Los distribuidores e instaladores oficiales de TPV Ágora disponen del <strong>Modo Evaluación Sandbox</strong> integrado en el Agente para realizar demostraciones comerciales en vivo ante sus clientes sin necesidad de conectarse a una caja en producción:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6 overflow-x-auto leading-relaxed">
<pre>{
  "erpType": "agora",
  "evaluationMode": { "enabled": false, "simulatedErp": "agora" },
  "softwareErp": {
    "activeProvider": "agora",
    "provisioned": true,
    "providers": {
      "agora": {
        "serverInstance": ".\\\\SQLEXPRESS",
        "databaseName": "AgoraDB",
        "authMode": "windows",
        "warehouseCode": "1",
        "tariffCode": "1",
        "orderSeries": "W",
        "evaluationMode": false
      }
    }
  }
}</pre>
      </div>

      <div class="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="text-xs font-bold text-emerald-400 mb-1">Conector Oficial Ágora POS / Retail</div>
          <p class="text-xs text-zinc-400">Descubre los planes para tiendas físicas, franquicias y partners instaladores de TPV.</p>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <a href="/agora-pos-woocommerce/" class="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition">Ver Conector Ágora POS &rarr;</a>
          <a href="/docs/sql-erps/conector-sage50-sql-server/" class="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 text-xs font-semibold transition">Manual Sage 50 SQL</a>
        </div>
      </div>
    `,
  },
  {
    slug: 'sql-erps/conector-a3erp-wolters-kluwer',
    categorySlug: 'sql-erps',
    title: 'Conector a3ERP Wolters Kluwer: Integración SQL Server y Pedidos',
    subtitle: 'Manual de ingeniería para sincronizar Wolters Kluwer a3ERP (tablas ARTICULO, STOCKALM, CABEPEV y LINEPEV en SQL Server) con WooCommerce, PrestaShop y Shopify sin bloqueos.',
    badge: 'SQL Server · a3ERP',
    readingTime: '9 min de lectura',
    image: '/assets/screenshots/02-multi-erp-selector.png',
    metaTitle: 'Conector a3ERP Wolters Kluwer SQL Server: ARTICULO, STOCKALM y CABEPEV | Bentian',
    metaDescription: 'Documentación técnica para integrar Wolters Kluwer a3ERP sobre Microsoft SQL Server con tiendas online. Mapeo de ARTICULO, STOCKALM, CABEPEV y LINEPEV, tarifas B2B/B2C y cola Store-and-Forward.',
    keywords: 'conector a3erp sql server, tablas a3erp wolters kluwer, cabepev linepev stockalm a3erp, sincronizar a3erp woocommerce prestashop shopify, integracion b2b a3erp',
    toc: [
      { id: 'conexion-sql-a3erp', label: '1. Conexión Local con el Servidor SQL Server de a3ERP', level: 2 },
      { id: 'tablas-maestras-a3erp', label: '2. Esquema de Tablas ARTICULO, STOCKALM, CABEPEV y LINEPEV', level: 2 },
      { id: 'tarifas-b2b-b2c-almacenes', label: '3. Gestión Multialmacén (CODALM) y Tarifas B2B / B2C', level: 2 },
      { id: 'transacciones-store-forward', label: '4. Ingesta Transaccional de Pedidos y Cola Store-and-Forward', level: 2 },
      { id: 'configuracion-json-a3erp', label: '5. Configuración JSON en el Agente y Modo Sandbox', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        <strong>Wolters Kluwer a3ERP</strong> es una solución integral de planificación de recursos empresariales ampliamente implantada en pymes industriales, distribuidoras mayoristas y empresas de servicios en España. Su arquitectura se apoya íntegramente en <strong>Microsoft SQL Server</strong>. El <a href="/a3erp-woocommerce/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Conector a3ERP de Bentian ERP Bridge</a> proporciona una integración directa, local-first y preconfigurada sobre las tablas maestras de a3ERP, eliminando la necesidad de costosos proyectos de consultoría a medida.
      </p>

      <div class="my-6 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#121215] shadow-2xl">
        <img src="/assets/screenshots/02-multi-erp-selector.png" alt="Configuración de Wolters Kluwer a3ERP en Bentian ERP Bridge" class="w-full h-auto block" loading="lazy">
        <div class="px-4 py-2.5 bg-zinc-900/90 border-t border-white/[0.06] text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Selección del perfil Wolters Kluwer a3ERP y validación de instancia SQL Server en el Agente Windows</span>
          <span class="text-emerald-400 font-semibold">CABEPEV · LINEPEV · STOCKALM</span>
        </div>
      </div>

      <h2 id="conexion-sql-a3erp" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Conexión Local con el Servidor SQL Server de a3ERP</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El Agente de Bentian se despliega dentro de la red corporativa (en el propio Windows Server donde reside la instancia SQL de a3ERP o en un equipo de operaciones conectado por LAN) y se comunica mediante el proveedor nativo ADO / SQL Server de Windows:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono space-y-1.5 text-zinc-300 mb-6">
        <div><strong class="text-emerald-400">Parámetros habituales de instancia SQL en a3ERP:</strong></div>
        <div class="text-emerald-300">SERVIDOR_A3\\A3ERP  o  SERVIDOR_SQL (Instancia predeterminada MSSQLSERVER)</div>
        <div class="pt-2"><strong class="text-sky-400">Seguridad y Aislamiento de Red:</strong></div>
        <div class="text-zinc-300">• 0 puertos abiertos en el firewall perimetral: no se expone el puerto 1433 a Internet.</div>
        <div class="text-zinc-300">• Soporte para cuenta de servicio SQL con permisos acotados exclusivamente a la base de datos de la empresa.</div>
      </div>

      <h2 id="tablas-maestras-a3erp" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Esquema de Tablas Maestras: ARTICULO, STOCKALM, CABEPEV y LINEPEV</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El adaptador <code class="text-emerald-400 font-mono">A3ErpAdapter</code> interactúa con las tablas relacionales estándar de Wolters Kluwer a3ERP aplicando lecturas no bloqueantes <code class="text-zinc-200 font-mono">WITH (NOLOCK)</code> y escrituras parametrizadas:
      </p>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Tabla SQL a3ERP</th>
              <th class="px-4 py-3 font-semibold">Columnas Principales Mapeadas</th>
              <th class="px-4 py-3 font-semibold">Función en Bentian ERP Bridge</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">dbo.ARTICULO</td>
              <td class="px-4 py-2.5 font-mono">CODART, DESCART, FAMILIA, PRCVENTA, TIPIVA, BLOQUEADO, OBVIARWEB</td>
              <td class="px-4 py-2.5 text-zinc-300">Extracción del catálogo maestro de artículos activos (<code class="font-mono">BLOQUEADO = 'F'</code>), tipos de IVA y precios base de venta.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-sky-400 font-bold">dbo.STOCKALM</td>
              <td class="px-4 py-2.5 font-mono">CODART, CODALM, UNIDADES, RESERVADO, PENDIENTE</td>
              <td class="px-4 py-2.5 text-zinc-300">Cálculo de existencias disponibles por almacén (<code class="font-mono">CODALM</code>), restando unidades reservadas en pedidos en curso.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-amber-400 font-bold">dbo.CLIENTES</td>
              <td class="px-4 py-2.5 font-mono">CODCLI, NOMCLI, NIFCLI, DIRCLI, CODPOSTAL, POBCLI, EMAIL, RECARGO</td>
              <td class="px-4 py-2.5 text-zinc-300">Búsqueda de clientes por NIF/CIF o email y creación automática de fichas de nuevos compradores B2C/B2B.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-violet-400 font-bold">dbo.CABEPEV</td>
              <td class="px-4 py-2.5 font-mono">IDPEDV, SERIE, NUMDOC, FECHA, CODCLI, CODALM, TOTBRUTO, TOTIVA, TOTDOC, REFERENCIA</td>
              <td class="px-4 py-2.5 text-zinc-300">Inserción atómica de la cabecera del pedido de venta con su serie dedicada y referencia externa para garantizar idempotencia.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-rose-400 font-bold">dbo.LINEPEV</td>
              <td class="px-4 py-2.5 font-mono">IDPEDV, NUMLIN, CODART, DESCLIN, UNIDADES, PRECIO, DESC1, TIPIVA, RECARGO</td>
              <td class="px-4 py-2.5 text-zinc-300">Registro detallado de cada línea de producto vendida, gastos de envío, descuentos comerciales e impuestos aplicables.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="tarifas-b2b-b2c-almacenes" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Gestión Multialmacén (CODALM) y Tarifas B2B / B2C</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En entornos industriales y de distribución con a3ERP es habitual disponer de múltiples almacenes lógicos o físicos (almacén central de expediciones, almacén de materia prima, delegaciones comerciales o depósito de defectuosos). Desde la configuración del Agente puedes especificar exactamente qué <code class="text-emerald-400 font-mono">CODALM</code> alimenta el stock de tu tienda online para evitar publicar inventario no vendible.
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Asimismo, el motor fiscal de Bentian traduce los códigos de impuesto de a3ERP (<code class="text-zinc-200 font-mono">TIPIVA</code>) a los porcentajes impositivos vigentes (<code class="text-emerald-400 font-mono">21%</code>, <code class="text-emerald-400 font-mono">10%</code>, <code class="text-emerald-400 font-mono">4%</code> o exento) y soporta clientes profesionales acogidos a <strong>Recargo de Equivalencia</strong>, asegurando que el importe total en <code class="text-emerald-400 font-mono">CABEPEV</code> coincida al céntimo con el cobro de la pasarela de pago web.
      </p>

      <h2 id="transacciones-store-forward" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Ingesta Transaccional de Pedidos y Cola Store-and-Forward</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La creación de pedidos en <code class="text-emerald-400 font-mono">dbo.CABEPEV</code> y <code class="text-emerald-400 font-mono">dbo.LINEPEV</code> se ejecuta dentro de una transacción SQL atómica. Si durante la madrugada el servidor de SQL Server entra en ventana de mantenimiento o copia de seguridad, la <a href="/docs/arquitectura/cola-store-and-forward/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">cola persistente Store-and-Forward</a> de Bentian conserva los pedidos entrantes en disco local (<code class="text-zinc-200 font-mono">%APPDATA%</code>) con escritura JSON atómica y los inyecta en a3ERP en cuanto la base de datos vuelve a aceptar conexiones.
      </p>

      <h2 id="configuracion-json-a3erp" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Configuración JSON en el Agente y Modo Evaluación Sandbox</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        A continuación se muestra un ejemplo de perfil técnico de a3ERP en <code class="text-emerald-400 font-mono">agent-config.json</code>. Recuerda que puedes activar el <strong>Modo Evaluación Sandbox</strong> desde la interfaz gráfica para realizar pruebas completas de extremo a extremo antes de conectar con tu servidor SQL corporativo:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6 overflow-x-auto leading-relaxed">
<pre>{
  "erpType": "a3erp",
  "evaluationMode": { "enabled": false, "simulatedErp": "a3erp" },
  "softwareErp": {
    "activeProvider": "a3erp",
    "provisioned": true,
    "providers": {
      "a3erp": {
        "serverInstance": ".\\\\SQLEXPRESS",
        "databaseName": "A3ERP",
        "authMode": "windows",
        "orderSeries": "W",
        "warehouseCode": "GEN",
        "tariffCode": "1",
        "evaluationMode": false
      }
    }
  }
}</pre>
      </div>

      <div class="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="text-xs font-bold text-emerald-400 mb-1">Conector Oficial Wolters Kluwer a3ERP</div>
          <p class="text-xs text-zinc-400">Consulta las licencias anuales (199 €/año) y el servicio de implantación asistida Llave en Mano.</p>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <a href="/a3erp-woocommerce/" class="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition">Ver Conector a3ERP &rarr;</a>
          <a href="/docs/sql-erps/conector-agora-pos-retail/" class="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 text-xs font-semibold transition">Manual Ágora POS SQL</a>
        </div>
      </div>
    `,
  },
];
