import { DocArticle } from '../types';

export const erpsLibresArticles: DocArticle[] = [
  {
    slug: 'erps-libres/conector-odoo-community',
    categorySlug: 'erps-libres',
    title: 'Conector Odoo 17 Community: JSON-RPC 2.0, Catálogo y Pedidos Web',
    subtitle: 'Guía técnica para sincronizar Odoo Community (v16/v17/v18) con WooCommerce, PrestaShop y Shopify mediante el protocolo oficial JSON-RPC 2.0 en puerto 8069.',
    badge: 'Open Source · Odoo 17',
    readingTime: '8 min de lectura',
    image: '/assets/screenshots/02-multi-erp-selector.png',
    metaTitle: 'Conector Odoo Community 17: JSON-RPC 2.0, Stock y Pedidos | Bentian',
    metaDescription: 'Manual de integración entre Odoo 17 Community y tiendas online WooCommerce o PrestaShop. Autenticación common.authenticate, res.partner, sale.order y stock en tiempo real.',
    keywords: 'conector odoo woocommerce, sincronizar odoo 17 prestashop, odoo json rpc 2.0 pedidos, odoo product.product stock, odoo community ecommerce',
    toc: [
      { id: 'arquitectura-odoo-jsonrpc', label: '1. Arquitectura y Protocolo JSON-RPC 2.0', level: 2 },
      { id: 'autenticacion-servicio-common', label: '2. Autenticación con common.authenticate', level: 2 },
      { id: 'mapeo-catalogo-stock', label: '3. Mapeo de Catálogo, Variantes y Stock', level: 2 },
      { id: 'inyeccion-pedidos-sale-order', label: '4. Creación Atómica de Pedidos en sale.order', level: 2 },
      { id: 'configuracion-agente-odoo', label: '5. Configuración en Bentian Agent y Pruebas', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        <strong>Odoo Community</strong> es una de las soluciones ERP de código abierto más extendidas en España y Europa. A diferencia de los ERPs tradicionales basados en archivos Access (.accdb/.mdb) o instancias SQL directas, Odoo expone su capa de negocio a través de un servicio <strong>JSON-RPC 2.0</strong> nativo en el puerto <code class="text-emerald-400 font-mono">8069</code>. El <a href="/conector-odoo/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Conector Odoo de Bentian ERP Bridge</a> interactúa directamente con este endpoint oficial, garantizando que todas las reglas de negocio, stock y tarifas sean procesadas por el ORM de Odoo sin tocar la base de datos PostgreSQL por detrás.
      </p>

      <h2 id="arquitectura-odoo-jsonrpc" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Arquitectura y Protocolo JSON-RPC 2.0</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian se comunica con la instancia local o remota de Odoo realizando peticiones POST a <code class="text-emerald-400 font-mono">http://127.0.0.1:8069/jsonrpc</code>. Este mecanismo ofrece tres ventajas fundamentales:
      </p>
      <ul class="list-disc list-inside space-y-2 text-sm text-zinc-300 mb-6">
        <li><strong>Cero riesgo de corrupción de datos:</strong> Toda escritura pasa por los modelos oficiales (<code class="text-indigo-300 font-mono">res.partner</code>, <code class="text-indigo-300 font-mono">sale.order</code>, <code class="text-indigo-300 font-mono">stock.quant</code>).</li>
        <li><strong>Compatibilidad Docker y Cloud:</strong> Funciona tanto en instalaciones locales en Windows como en contenedores Docker o servidores VPS Linux.</li>
        <li><strong>Cálculo automático de impuestos:</strong> Al generar un pedido, Odoo calcula el IVA correspondiente (21%, 10%, 4%) según la posición fiscal del cliente.</li>
      </ul>

      <h2 id="autenticacion-servicio-common" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Autenticación con common.authenticate</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El conector inicia la sesión llamando al servicio <code class="text-indigo-300 font-mono">common</code> con el método <code class="text-indigo-300 font-mono">authenticate</code>, recibiendo el identificador numérico de usuario (<code class="text-emerald-400 font-mono">uid</code>):
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6 overflow-x-auto">
        <span class="text-zinc-500">// Payload JSON-RPC de autenticación en Odoo 17</span><br>
        {<br>
        &nbsp;&nbsp;"jsonrpc": "2.0",<br>
        &nbsp;&nbsp;"method": "call",<br>
        &nbsp;&nbsp;"params": {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;"service": "common",<br>
        &nbsp;&nbsp;&nbsp;&nbsp;"method": "authenticate",<br>
        &nbsp;&nbsp;&nbsp;&nbsp;"args": ["nombre_base_datos", "admin", "clave_o_api_key", {}]<br>
        &nbsp;&nbsp;},<br>
        &nbsp;&nbsp;"id": 1<br>
        }
      </div>

      <h2 id="mapeo-catalogo-stock" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Mapeo de Catálogo, Variantes y Stock</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La lectura de productos se realiza contra el modelo <code class="text-indigo-300 font-mono">product.product</code> mediante <code class="text-indigo-300 font-mono">execute_kw</code>. El adaptador extrae el código SKU (<code class="text-emerald-400 font-mono">default_code</code>), precio de venta (<code class="text-emerald-400 font-mono">list_price</code>), código de barras (<code class="text-emerald-400 font-mono">barcode</code>) y stock disponible libre (<code class="text-emerald-400 font-mono">free_qty</code> o <code class="text-emerald-400 font-mono">qty_available</code>), sincronizándolo de inmediato con WooCommerce o PrestaShop.
      </p>

      <h2 id="inyeccion-pedidos-sale-order" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Creación Atómica de Pedidos en sale.order</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando entra un nuevo pedido desde la web:
      </p>
      <ol class="list-decimal list-inside space-y-2 text-sm text-zinc-300 mb-6">
        <li><strong>Búsqueda de cliente:</strong> Se busca en <code class="text-indigo-300 font-mono">res.partner</code> por email. Si no existe, se crea automáticamente con su nombre fiscal.</li>
        <li><strong>Líneas de pedido:</strong> Se construyen las tuplas Odoo <code class="text-indigo-300 font-mono">[0, 0, { product_id, product_uom_qty, price_unit }]</code>.</li>
        <li><strong>Transacción única:</strong> Se crea el pedido en <code class="text-indigo-300 font-mono">sale.order</code> y Bentian obtiene el número correlativo oficial (ej. <code class="text-emerald-400 font-mono">S00001</code>).</li>
      </ol>

      <h2 id="configuracion-agente-odoo" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Configuración en Bentian Agent y Pruebas</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para conectar Odoo, abre el panel local de Bentian (<code class="text-emerald-400 font-mono">http://127.0.0.1:39281</code>), selecciona el proveedor <strong>Odoo ERP</strong> en el desplegable y rellena:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6">
        • <strong>URL del Servidor:</strong> http://127.0.0.1:8069 (o dominio HTTPS)<br>
        • <strong>Base de Datos:</strong> nombre_de_tu_bd_odoo<br>
        • <strong>Usuario:</strong> tu_usuario_odoo (ej. admin o correo)<br>
        • <strong>Contraseña / API Key:</strong> tu contraseña de acceso o clave API
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed">
        Pulsa <strong>«Probar Conexión»</strong> para validar que el servicio responde y comenzar a sincronizar tu catálogo al instante.
      </p>
    `,
  },
  {
    slug: 'erps-libres/conector-facturascripts-api',
    categorySlug: 'erps-libres',
    title: 'Conector FacturaScripts API REST v3: Variantes, Stock y Pedidos en Tiempo Real',
    subtitle: 'Guía técnica para conectar FacturaScripts (PHP + MySQL/MariaDB) con tiendas online WooCommerce y PrestaShop utilizando la API REST v3 oficial.',
    badge: 'Open Source · FacturaScripts v3',
    readingTime: '7 min de lectura',
    image: '/assets/screenshots/02-multi-erp-selector.png',
    metaTitle: 'Conector FacturaScripts API REST v3: Sincronización Web | Bentian',
    metaDescription: 'Manual de configuración de la API REST v3 de FacturaScripts con Bentian ERP Bridge. Endpoints /api/3/productos, /api/3/crearPedidoCliente, stock y series de venta.',
    keywords: 'conector facturascripts woocommerce, sincronizar facturascripts prestashop, facturascripts api rest v3, facturascripts pedidos cliente, facturascripts ecommerce',
    toc: [
      { id: 'arquitectura-api-facturascripts', label: '1. Arquitectura API REST v3 de FacturaScripts', level: 2 },
      { id: 'activacion-token-config', label: '2. Activación y Token API en config.php', level: 2 },
      { id: 'sincronizacion-productos-stock', label: '3. Lectura de Productos, Variantes y Existencias', level: 2 },
      { id: 'endpoint-crear-pedido', label: '4. Inyección de Pedidos con /api/3/crearPedidoCliente', level: 2 },
      { id: 'paso-a-paso-bentian-fs', label: '5. Paso a Paso en Bentian ERP Bridge', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        <strong>FacturaScripts</strong> es uno de los software de facturación y contabilidad para pymes más populares en el ecosistema hispanohablante, desarrollado bajo licencia libre GNU LGPLv3. El <a href="/conector-facturascripts/" class="text-indigo-400 hover:text-indigo-300 underline font-medium">Conector FacturaScripts de Bentian ERP Bridge</a> se comunica con el motor mediante la <strong>API REST v3 oficial</strong>, permitiendo sincronizar artículos, precios con IVA, stock disponible y descargar pedidos de WooCommerce o PrestaShop directamente al circuito de ventas de FacturaScripts.
      </p>

      <h2 id="arquitectura-api-facturascripts" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Arquitectura API REST v3 de FacturaScripts</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        A diferencia de las conexiones directas a base de datos que pueden omitir triggers o cálculos de costes, la API REST v3 de FacturaScripts procesa los documentos a través de sus controladores oficiales (<code class="text-indigo-300 font-mono">ApiCreateDocument</code>, <code class="text-indigo-300 font-mono">Calculator</code> y <code class="text-indigo-300 font-mono">BusinessDocumentCode</code>). Esto garantiza:
      </p>
      <ul class="list-disc list-inside space-y-2 text-sm text-zinc-300 mb-6">
        <li><strong>Numeración correlativa automática:</strong> Se genera el código de serie oficial (ej. <code class="text-emerald-400 font-mono">PED2026A1</code>) sin saltos.</li>
        <li><strong>Actualización de stock físico y reservado:</strong> Las líneas restan existencias inmediatamente (<code class="text-emerald-400 font-mono">actualizastock = -cantidad</code>).</li>
        <li><strong>Asignación de formas de pago:</strong> Mapeo directo con las formas de pago de FacturaScripts (<code class="text-indigo-300 font-mono">CONT</code>, <code class="text-indigo-300 font-mono">TARJETA</code>, <code class="text-indigo-300 font-mono">TRANS</code>).</li>
      </ul>

      <h2 id="activacion-token-config" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Activación y Token API en config.php</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para habilitar el acceso a la API REST v3 con permisos completos, basta con añadir una línea al archivo <code class="text-emerald-400 font-mono">config.php</code> de tu instalación de FacturaScripts:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6">
        <span class="text-zinc-500">// En /var/www/html/config.php</span><br>
        define('FS_API_KEY', 'tu_clave_secreta_api_bentian');
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cualquier petición con la cabecera <code class="text-indigo-300 font-mono">Token: tu_clave_secreta_api_bentian</code> o <code class="text-indigo-300 font-mono">X-Auth-Token</code> tendrá acceso autorizado inmediato.
      </p>

      <h2 id="sincronizacion-productos-stock" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Lectura de Productos, Variantes y Existencias</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian consulta de forma no invasiva los recursos:
      </p>
      <ul class="list-disc list-inside space-y-1.5 text-sm text-zinc-300 mb-6">
        <li><code class="text-emerald-400 font-mono">GET /api/3/productos</code>: Lista de referencias, descripciones, tarifas e impuestos.</li>
        <li><code class="text-emerald-400 font-mono">GET /api/3/variantes</code>: Códigos de barras y precios específicos por variante.</li>
        <li><code class="text-emerald-400 font-mono">GET /api/3/stocks</code>: Existencias disponibles en el almacén principal (<code class="text-indigo-300 font-mono">ALG</code>).</li>
      </ul>

      <h2 id="endpoint-crear-pedido" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Inyección de Pedidos con /api/3/crearPedidoCliente</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El conector envía la orden web mediante una llamada POST a <code class="text-emerald-400 font-mono">/api/3/crearPedidoCliente</code> incluyendo el cliente, la serie (<code class="text-indigo-300 font-mono">A</code>), el almacén (<code class="text-indigo-300 font-mono">ALG</code>), la divisa (<code class="text-indigo-300 font-mono">EUR</code>), la forma de pago y el array de líneas con sus SKUs, cantidades y precios unitarios.
      </p>

      <h2 id="paso-a-paso-bentian-fs" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Paso a Paso en Bentian ERP Bridge</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En el panel de control del Agente Bentian:
      </p>
      <ol class="list-decimal list-inside space-y-2 text-sm text-zinc-300 mb-6">
        <li>Selecciona <strong>FacturaScripts</strong> en la lista de proveedores ERP.</li>
        <li>Indica la URL base de tu instalación (ej. <code class="text-emerald-400 font-mono">http://127.0.0.1:8096</code> o tu dominio HTTPS).</li>
        <li>Introduce la clave API en el campo de contraseña.</li>
        <li>Guarda y pulsa <strong>«Probar Conexión»</strong>. El agente verificará la comunicación en menos de 2 segundos.</li>
      </ol>
    `,
  },
];
