import { DocArticle } from '../types';
import { shopifyArticle } from './canales-shopify';
import { holdedArticle } from './canales-holded';

export const canalesArticles: DocArticle[] = [
  {
    slug: 'canales/woocommerce',
    categorySlug: 'canales',
    title: 'Conexión con WooCommerce y Compatibilidad HPOS',
    subtitle: 'Cómo configurar la REST API de WordPress, permisos de Consumer Key/Secret, compatibilidad con High-Performance Order Storage y enlaces permanentes.',
    badge: 'Conector WooCommerce',
    readingTime: '5 min de lectura',
    metaTitle: 'Conectar Factusol con WooCommerce (REST API & HPOS) | Bentian ERP',
    metaDescription: 'Guía paso a paso para conectar Factusol con WooCommerce mediante REST API nativa. Configuración de claves, compatibilidad HPOS y permalinks.',
    keywords: 'conectar factusol woocommerce, rest api woocommerce factusol, hpos factusol, consumer key woocommerce, sincronizar pedidos woocommerce factusol',
    toc: [
      { id: 'generar-claves-api', label: '1. Generación de Claves API en WordPress', level: 2 },
      { id: 'permisos-lectura-escritura', label: '2. Permisos de Lectura y Escritura Obligatorios', level: 2 },
      { id: 'compatibilidad-hpos', label: '3. Compatibilidad con HPOS (High-Performance Order Storage)', level: 2 },
      { id: 'enlaces-permanentes', label: '4. Configuración de Enlaces Permanentes (Permalinks)', level: 2 },
      { id: 'verificacion-conexion', label: '5. Verificación de Conexión en Bentian', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Bentian ERP Bridge se comunica con WooCommerce de forma nativa a través de su <strong>REST API oficial</strong>. A diferencia de los plugins de sincronización de terceros que deben instalarse en WordPress y consumen recursos PHP de tu hosting, Bentian no requiere instalar ningún plugin invasivo en tu web: se comunica directamente mediante llamadas HTTP seguras y autenticadas con OAuth 1.0a / Basic Auth sobre TLS 1.3.
      </p>

      <h2 id="generar-claves-api" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Generación de Claves API en WordPress</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para conectar tu tienda WooCommerce:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Inicia sesión en el panel de administración de WordPress (<code class="text-zinc-200">/wp-admin/</code>).</li>
        <li>Dirígete a <strong class="text-white">WooCommerce → Ajustes → Avanzado → API REST</strong>.</li>
        <li>Haz clic en el botón <strong class="text-indigo-400">Añadir clave</strong>.</li>
        <li>En el campo <em>Descripción</em>, escribe un nombre identificativo (ej: <code class="text-zinc-200">Bentian ERP Bridge</code>).</li>
      </ol>

      <h2 id="permisos-lectura-escritura" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Permisos de Lectura y Escritura Obligatorios</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En el selector de <em>Permisos</em>, es imprescindible seleccionar <strong class="text-emerald-400 font-semibold">Lectura / Escritura</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Lectura:</strong> Necesaria para descargar los pedidos de clientes recién pagados y comprobar si los productos ya existen.</li>
        <li><strong>Escritura:</strong> Necesaria para actualizar el stock disponible (<code class="text-indigo-300">DISSTO</code>), los precios de tarifas y cambiar el estado del pedido a <em>"Procesando"</em> o <em>"Sincronizado"</em>.</li>
      </ul>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Al hacer clic en <strong class="text-white">Generar clave de API</strong>, WordPress te mostrará la <code class="text-indigo-300 font-mono">Consumer Key (ck_...)</code> y el <code class="text-indigo-300 font-mono">Consumer Secret (cs_...)</code>. Cópialos inmediatamente, ya que el secret no volverá a mostrarse.
      </p>

      <h2 id="compatibilidad-hpos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Compatibilidad con HPOS (High-Performance Order Storage)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Desde WooCommerce 8.0, WordPress introdujo el nuevo motor de base de datos de pedidos de alto rendimiento conocido como <strong>HPOS</strong> (tablas dedicadas <code class="text-zinc-200 font-mono">_wc_orders</code> en lugar de <code class="text-zinc-200 font-mono">wp_posts</code>).
      </p>
      <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 mb-6">
        <strong>100% Compatible con HPOS:</strong> Bentian ERP Bridge consulta los endpoints de pedidos a través del adaptador oficial de la REST API v3, siendo plenamente compatible tanto con el almacenamiento tradicional en posts como con las tablas dedicadas HPOS activadas en modo estricto.
      </div>

      <h2 id="enlaces-permanentes" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Configuración de Enlaces Permanentes (Permalinks)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para que la REST API de WooCommerce esté activa y responda adecuadamente, los enlaces permanentes de WordPress <strong>no</strong> pueden estar en modo <em>"Simple"</em> (<code class="text-zinc-400">?p=123</code>).
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Verifícalo en <strong class="text-white">Ajustes → Enlaces permanentes</strong> y asegúrate de tener seleccionada la estructura <strong class="text-indigo-400">Nombre de la entrada</strong> (<code class="text-zinc-200">/%postname%/</code>).
      </p>

      <h2 id="verificacion-conexion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Verificación de Conexión en Bentian</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En el panel de control de Bentian (pestaña <em>Canal Web</em> o Paso 3 del Asistente):
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Introduce la URL de tu tienda con <code class="text-emerald-400">https://</code> (ej: <code class="text-zinc-200">https://www.tutienda.com</code>).</li>
        <li>Pega la Consumer Key y el Consumer Secret.</li>
        <li>Haz clic en <strong class="text-indigo-400">Probar Conexión</strong>.</li>
        <li>El agente validará las credenciales y mostrará una tarjeta de confirmación en verde indicando la versión de WooCommerce detectada.</li>
      </ol>
    `,
  },
  {
    slug: 'canales/prestashop',
    categorySlug: 'canales',
    title: 'Conexión con PrestaShop 1.7 y 8.x mediante Webservices',
    subtitle: 'Cómo activar los servicios web oficiales de PrestaShop, conceder permisos en recursos de pedidos/stock y mapear combinaciones.',
    badge: 'Conector PrestaShop',
    readingTime: '5 min de lectura',
    metaTitle: 'Conectar Factusol con PrestaShop (1.7 y 8.x) | Bentian ERP',
    metaDescription: 'Cómo conectar Factusol con PrestaShop mediante la API de Webservices oficial. Configuración de claves, permisos y combinaciones de atributos.',
    keywords: 'conectar factusol prestashop, webservices prestashop factusol, prestashop 8 factusol, api prestashop conector factusol, sincronizar pedidos prestashop',
    toc: [
      { id: 'activar-webservices', label: '1. Activación del Servicio Web en PrestaShop', level: 2 },
      { id: 'generar-clave-api', label: '2. Creación de la Clave de Servicio Web', level: 2 },
      { id: 'recursos-necesarios', label: '3. Permisos en Recursos (GET / POST / PUT)', level: 2 },
      { id: 'prestashop-8', label: '4. Compatibilidad con PrestaShop 8 y PHP 8.x', level: 2 },
      { id: 'configuracion-bentian', label: '5. Configuración en Bentian ERP Bridge', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        PrestaShop dispone de una arquitectura nativa de servicios web (Webservices RESTful) que permite interactuar con su base de datos sin necesidad de instalar módulos no verificados. Bentian aprovecha este motor estándar para sincronizar pedidos, productos y stock disponible.
      </p>

      <h2 id="activar-webservices" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Activación del Servicio Web en PrestaShop</h2>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Accede al Backoffice de PrestaShop.</li>
        <li>En el menú lateral, dirígete a <strong class="text-white">Parámetros avanzados → Webservice (Servicio web)</strong>.</li>
        <li>Activa la casilla <strong class="text-emerald-400">Activar el servicio web de PrestaShop: SÍ</strong>.</li>
        <li>Guarda los cambios.</li>
      </ol>

      <h2 id="generar-clave-api" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Creación de la Clave de Servicio Web</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Haz clic en <strong class="text-indigo-400">Añadir una nueva clave de servicio web</strong>. Puedes generar una clave aleatoria de 32 caracteres pulsando el botón <em>Generar</em>.
      </p>

      <h2 id="recursos-necesarios" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Permisos en Recursos (GET / POST / PUT)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Marca los siguientes permisos para la clave generada:
      </p>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-2.5">Recurso</th>
              <th class="px-4 py-2.5">GET (Ver)</th>
              <th class="px-4 py-2.5">POST (Crear)</th>
              <th class="px-4 py-2.5">PUT (Modificar)</th>
              <th class="px-4 py-2.5 font-sans">Propósito</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2 text-white font-bold">orders</td>
              <td class="px-4 py-2 text-emerald-400">✓</td>
              <td class="px-4 py-2 text-zinc-600">-</td>
              <td class="px-4 py-2 text-emerald-400">✓</td>
              <td class="px-4 py-2 font-sans text-zinc-300">Descargar pedidos y marcar estado sincronizado.</td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-white font-bold">order_details</td>
              <td class="px-4 py-2 text-emerald-400">✓</td>
              <td class="px-4 py-2 text-zinc-600">-</td>
              <td class="px-4 py-2 text-zinc-600">-</td>
              <td class="px-4 py-2 font-sans text-zinc-300">Lectura de líneas de pedido y referencias.</td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-white font-bold">stock_availables</td>
              <td class="px-4 py-2 text-emerald-400">✓</td>
              <td class="px-4 py-2 text-zinc-600">-</td>
              <td class="px-4 py-2 text-emerald-400">✓</td>
              <td class="px-4 py-2 font-sans text-zinc-300">Actualizar el stock disponible en tiempo real.</td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-white font-bold">products</td>
              <td class="px-4 py-2 text-emerald-400">✓</td>
              <td class="px-4 py-2 text-emerald-400">✓</td>
              <td class="px-4 py-2 text-emerald-400">✓</td>
              <td class="px-4 py-2 font-sans text-zinc-300">Consultar y sincronizar tarifas y referencias.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="prestashop-8" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Compatibilidad con PrestaShop 8 y PHP 8.x</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge es compatible tanto con PrestaShop 1.7 como con las ediciones modernas de PrestaShop 8.x ejecutadas en servidores con PHP 8.1 o PHP 8.2.
      </p>

      <h2 id="configuracion-bentian" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Configuración en Bentian ERP Bridge</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En el panel de control de Bentian, selecciona la plataforma <strong>PrestaShop</strong>, introduce la URL base de tu tienda y la clave de Webservice generada. Haz clic en <strong>Probar Conexión</strong> para confirmar la sincronización.
      </p>
    `,
  },
  shopifyArticle,
  holdedArticle,
  {
    slug: 'canales/endpoint-universal',
    categorySlug: 'canales',
    title: 'Endpoint Universal: Especificación Técnica y Protocolo Bidireccional',
    subtitle: 'Norma de integración Enterprise para tiendas a medida (PHP, Laravel, Node.js, Plesk): ciclo ACK, idempotencia SQLite, diccionario de datos, HMAC-SHA256 y resiliencia.',
    badge: 'Especificación Enterprise',
    readingTime: '9 min de lectura',
    metaTitle: 'Especificación Técnica Endpoint Universal Factusol | Bentian ERP Bridge',
    metaDescription: 'Especificación técnica completa del Endpoint Universal de Bentian: protocolo bidireccional, confirmación ACK, idempotencia SQLite, HMAC-SHA256 y código PHP de producción.',
    keywords: 'endpoint universal factusol, especificacion enterprise erp bridge, protocolo ack pedidos factusol, idempotencia pedidos sqlite, api rest factusol json, hmac sha256 factusol, conectar tienda php factusol',
    toc: [
      { id: 'proposito-arquitectura', label: '1. Propósito y Arquitectura de Integración Enterprise', level: 2 },
      { id: 'protocolo-bidireccional', label: '2. Protocolo Bidireccional de Comunicación (Polling & Flujo ACK)', level: 2 },
      { id: 'flujo-confirmacion-ack', label: '3. Confirmación de Recepción (Flujo ACK) y Cierre de Transacción', level: 2 },
      { id: 'resiliencia-idempotencia', label: '4. Resiliencia ante Fallos de Red e Idempotencia en SQLite', level: 2 },
      { id: 'diccionario-datos', label: '5. Diccionario de Datos: Especificación Rigurosa de Campos JSON', level: 2 },
      { id: 'paginacion-versionado', label: '6. Paginación de Alto Rendimiento, Límites y Versionado', level: 2 },
      { id: 'seguridad-headers-hmac', label: '7. Seguridad: Headers, Criptografía HMAC-SHA256 y Anti-Replay', level: 2 },
      { id: 'rotacion-secretos-env', label: '8. Rotación de Secretos y Variables de Entorno', level: 2 },
      { id: 'matriz-codigos-http', label: '9. Matriz de Códigos de Respuesta HTTP y Rate Limiting', level: 2 },
      { id: 'script-php-produccion', label: '10. Implementación de Referencia en PHP (Plesk / cPanel)', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        No todos los comercios electrónicos operan sobre plataformas cerradas o plugins prefabricados. Miles de empresas gestionan sus ventas mediante plataformas B2B y B2C a medida desarrolladas en PHP nativo, Laravel, Symfony, Node.js, Python o arquitecturas desacopladas (Angular, React, Vue, Next.js) alojadas en servidores Plesk, cPanel o VPS dedicados. El <strong>Endpoint Universal de Bentian ERP Bridge</strong> define el estándar formal de comunicación HTTP/JSON para integrar cualquier aplicación web personalizada con Factusol con garantías transaccionales corporativas.
      </p>

      <h2 id="proposito-arquitectura" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Propósito y Arquitectura de Integración Enterprise</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        A diferencia de las integraciones basadas en webhooks entrantes que exigen abrir puertos en el router del almacén o contratar costosas IPs fijas con configuraciones de DMZ peligrosas, la arquitectura de Bentian opera <strong>exclusivamente mediante tráfico HTTPS saliente</strong> desde el puesto de trabajo hacia la tienda online:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-center my-6">
        [ Servidor Web (Plesk / VPS) ] ◀──(HTTPS Saliente / TLS 1.3)── [ Agente Bentian (Almacén) ] ──(OLEDB)──▶ [ Factusol (.accdb) ]
        <div class="text-[10px] text-emerald-400 mt-2">✓ Cero puertos abiertos en el router local · Cero exposición de Windows a Internet · Comunicación cifrada extremo a extremo</div>
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        El servidor web de la tienda solo necesita exponer un script HTTPS (por ejemplo, <code class="text-indigo-300 font-mono">erp-bridge-endpoint.php</code> o una ruta de API en su framework) capaz de responder a consultas de lectura de pedidos y recibir actualizaciones de inventario y confirmaciones de estado.
      </p>

      <h2 id="protocolo-bidireccional" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Protocolo Bidireccional de Comunicación (Polling & Flujo ACK)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La sincronización de pedidos entre la tienda web y Factusol se rige por un <strong>protocolo bidireccional en dos fases con cierre explícito (Two-Phase Commit / ACK)</strong>:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li><strong>Fase 1 (Sondeo / Pull):</strong> El agente solicita pedidos en espera enviando una petición <code>GET /api/bentian-orders.php?limit=50&status=PENDING</code> (o <code>?action=get_orders</code>).</li>
        <li><strong>Fase 2 (Custodia Local):</strong> El agente almacena el bloque de pedidos en su base de datos local SQLite (<code>queue.db</code>) en modo WAL.</li>
        <li><strong>Fase 3 (Inyección Atómica):</strong> El conector Factusol abre una transacción OLEDB (<code>BeginTrans</code>), busca o crea el cliente en <code>F_CLI</code>, inserta la cabecera en <code>F_PCL</code> y las líneas en <code>F_LPC</code>, y consolida la operación con <code>CommitTrans</code>.</li>
        <li><strong>Fase 4 (Confirmación / ACK):</strong> El agente emite una petición <code>POST /api/bentian-ack.php</code> (o <code>?action=ack_orders</code>) notificando a la tienda online que el pedido ha sido registrado con éxito en Factusol y facilitando el número de pedido oficial del ERP.</li>
        <li><strong>Fase 5 (Transición en Web):</strong> La tienda web cambia el estado del pedido de <code>PENDING</code> a <code>SYNCED</code>, almacenando la referencia y fecha para auditoría.</li>
      </ol>

      <h2 id="flujo-confirmacion-ack" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Confirmación de Recepción (Flujo ACK) y Cierre de Transacción</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para cerrar formalmente el ciclo de vida del pedido, el agente de Bentian invoca el endpoint de confirmación enviando el siguiente contrato JSON:
      </p>

      <div class="mb-4">
        <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Llamada Individual de Confirmación:</span>
        <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 overflow-x-auto mt-2"><code>POST /api/bentian-ack.php HTTP/1.1
Host: www.tutienda.com
Content-Type: application/json; charset=utf-8
X-Bentian-Token: &lt;TOKEN_SECRETO&gt;
X-Bentian-Timestamp: 1791189000

{
  "orderId": "1042",
  "status": "synced",
  "factusolOrderNumber": "2026/0014",
  "factusolSeries": "1",
  "syncedAt": "2026-10-05T08:30:00Z"
}</code></pre>
      </div>

      <div class="mb-6">
        <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Llamada en Bloque (Batch Confirmation para múltiples pedidos):</span>
        <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 overflow-x-auto mt-2"><code>POST /api/erp-bridge-endpoint.php?action=ack_orders HTTP/1.1
Host: www.tutienda.com
Content-Type: application/json; charset=utf-8
X-Bentian-Token: &lt;TOKEN_SECRETO&gt;
X-Bentian-Timestamp: 1791189000

{
  "confirmations": [
    {
      "orderId": "1042",
      "status": "synced",
      "factusolOrderNumber": "2026/0014",
      "factusolSeries": "1",
      "syncedAt": "2026-10-05T08:30:00Z"
    },
    {
      "orderId": "1043",
      "status": "synced",
      "factusolOrderNumber": "2026/0015",
      "factusolSeries": "1",
      "syncedAt": "2026-10-05T08:30:02Z"
    }
  ]
}</code></pre>
      </div>

      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Respuesta esperada por el agente (HTTP 200 OK):
      </p>
      <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-emerald-400 overflow-x-auto mb-6"><code>{
  "success": true,
  "count": 2,
  "message": "Pedidos marcados como sincronizados correctamente"
}</code></pre>

      <h2 id="resiliencia-idempotencia" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Resiliencia ante Fallos de Red e Idempotencia en SQLite</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En cualquier sistema distribuido sobre Internet, las confirmaciones de red pueden fallar: un corte de fibra de 2 segundos, una saturación temporal en el hosting o un error <code>502 Bad Gateway</code> de un proxy inverso pueden impedir que el agente entregue el ACK a la tienda online tras haber insertado el pedido en Factusol.
      </p>
      
      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed mb-6">
        <strong class="text-white font-semibold block mb-1">El Dilema del ACK Fallido:</strong>
        Si la llamada ACK falla por un corte de red, la tienda web no se entera y mantendrá el pedido en estado <code>PENDING</code>. En el siguiente ciclo de sondeo, la tienda volverá a ofrecer el pedido al agente. ¿Cómo se evita que Factusol registre el pedido por segunda vez?
      </div>

      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian resuelve este dilema mediante <strong>idempotencia estricta en su cola local SQLite (<code>queue.db</code>)</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Clave Primaria de Idempotencia:</strong> La tabla local de SQLite indexa unívocamente el identificador del pedido web (<code>web_order_id</code>).</li>
        <li><strong>Detección de Pedido ya Inyectado:</strong> Cuando el agente descarga el lote de pedidos y recibe de nuevo el pedido <code>1042</code>, consulta SQLite antes de tocar Factusol. Al detectar que el pedido ya figura con estado <code>INJECTED</code> y cuenta con el número correlativo <code>2026/0014</code> asignado, <strong>el agente aborta inmediatamente cualquier inserción en <code>F_PCL</code> y <code>F_LPC</code></strong>.</li>
        <li><strong>Reintento Exclusivo del ACK:</strong> El agente detecta que la única tarea pendiente es la confirmación remota. Por tanto, emite de nuevo la llamada <code>POST /api/bentian-ack.php</code> hacia la tienda web. En cuanto el servidor responde con HTTP 200, el agente marca el pedido como <code>ACK_CONFIRMED</code>.</li>
        <li><strong>Resultado Garantizado:</strong> Cero duplicaciones en Factusol, cero descuadres de existencias y entrega garantizada del estado final en la tienda web (*At-Least-Once Delivery con Efecto Exactly-Once en Factusol*).</li>
      </ul>

      <h2 id="diccionario-datos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Diccionario de Datos: Especificación Rigurosa de Campos JSON</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        A continuación se detalla la especificación de todos los campos del payload devuelto en la descarga de pedidos:
      </p>

      <h3 class="text-base font-semibold text-white mb-3">5.1 Cabecera del Pedido</h3>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
            <tr>
              <th class="px-3 py-2.5">Campo JSON</th>
              <th class="px-3 py-2.5">Tipo</th>
              <th class="px-3 py-2.5">Obligatorio</th>
              <th class="px-3 py-2.5">Destino Factusol</th>
              <th class="px-3 py-2.5">Descripción & Ejemplo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">id</td>
              <td class="px-3 py-2">String | Int</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2">queue.db / SUFPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Identificador unívoco del pedido en la tienda web. Clave de idempotencia (ej: <code>"1042"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">orderNumber</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.SUFPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Código visual del pedido presentado al cliente (ej: <code>"PED-2026-0891"</code>). Si se omite, se usa <code>id</code>.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">status</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2">Filtro de descarga</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Estado del pedido en la web. Debe ser <code>"PENDING"</code> o <code>"processing"</code> para su importación.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">total</td>
              <td class="px-3 py-2">Float</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2">F_PCL.TOTPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Importe total del pedido con IVA, recargos y portes incluidos (ej: <code>215.38</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">subtotal</td>
              <td class="px-3 py-2">Float</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.NETPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Base imponible neta total sin impuestos (ej: <code>178.00</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">taxTotal</td>
              <td class="px-3 py-2">Float</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.IVAPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Total acumulado de cuota de IVA (ej: <code>37.38</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">shippingCost</td>
              <td class="px-3 py-2">Float</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.PORPCL / Línea</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Gastos de envío cobrados al cliente (ej: <code>6.50</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">paymentMethod</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.FPOPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Forma de pago empleada (ej: <code>"redsys"</code>, <code>"stripe"</code>, <code>"bizum"</code>, <code>"transfer"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">paymentStatus</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.ESTPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Estado del pago (ej: <code>"COMPLETED"</code>, <code>"PAID"</code>, <code>"PENDING"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">paymentReference</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.OBSPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Identificador de transacción o autorización bancaria (ej: <code>"ch_3NpA4..."</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">notes</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.OBSPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Instrucciones de entrega u observaciones del comprador (ej: <code>"Entregar por la mañana"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">createdAt</td>
              <td class="px-3 py-2">String ISO-8601</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_PCL.FECPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Fecha y hora UTC de la orden (ej: <code>"2026-10-05T08:14:22Z"</code>). Si falta, se usa la fecha actual.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="text-base font-semibold text-white mb-3">5.2 Objeto del Cliente (customer)</h3>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
            <tr>
              <th class="px-3 py-2.5">Campo JSON</th>
              <th class="px-3 py-2.5">Tipo</th>
              <th class="px-3 py-2.5">Obligatorio</th>
              <th class="px-3 py-2.5">Destino Factusol</th>
              <th class="px-3 py-2.5">Descripción & Mapeo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">name / fullName</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2">F_CLI.NOFCLI / CNOFCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Nombre fiscal o comercial del cliente (ej: <code>"Ferretería Industrial del Norte S.L."</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">taxId / cif / nif</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">CRÍTICO</td>
              <td class="px-3 py-2">F_CLI.NIFCLI / CNIPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">NIF, CIF o NIE español/europeo. Clave unívoca de búsqueda en <code>F_CLI</code> para no duplicar fichas.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">email</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-emerald-400 font-sans">Recomendado</td>
              <td class="px-3 py-2">F_CLI.EMACLI / CEMPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Email de facturación y seguimiento (ej: <code>"compras@ferreteria.es"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">phone</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_CLI.TELCLI / TELPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Teléfono móvil o fijo para el albarán de transporte (ej: <code>"612345678"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">address / street</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_CLI.DOMCLI / CDOPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Dirección física de entrega y facturación (ej: <code>"Polígono Industrial Nave 12"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">postalCode / cp</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_CLI.CPOCLI / CCPPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Código postal de 5 dígitos (ej: <code>"28001"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">city</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_CLI.POBCLI / CPOPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Municipio o localidad (ej: <code>"Madrid"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">province / state</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_CLI.PROCLI / CPRPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Provincia (ej: <code>"Madrid"</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">country</td>
              <td class="px-3 py-2">String (ISO 3166-1)</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_CLI.PAICLI / CPAPCL</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Código de país de 2 letras en mayúsculas (por defecto <code>"ES"</code>).</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="text-base font-semibold text-white mb-3">5.3 Array de Líneas de Pedido (lines)</h3>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
            <tr>
              <th class="px-3 py-2.5">Campo JSON</th>
              <th class="px-3 py-2.5">Tipo</th>
              <th class="px-3 py-2.5">Obligatorio</th>
              <th class="px-3 py-2.5">Destino Factusol</th>
              <th class="px-3 py-2.5">Regla de Negocio</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">sku / artlpc</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2">F_LPC.ARTLPC</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Código del artículo en el catálogo de Factusol (<code>F_ART.CODART</code>). Clave de cruce.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">name / deslpc</td>
              <td class="px-3 py-2">String</td>
              <td class="px-3 py-2 text-emerald-400 font-sans">Recomendado</td>
              <td class="px-3 py-2">F_LPC.DESLPC</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Descripción textual de la línea (máx. 50 caracteres para caber en campos legacy de Access).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">quantity / canlpc</td>
              <td class="px-3 py-2">Float | Int</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2">F_LPC.CANLPC</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Número de unidades solicitadas (debe ser mayor estricto que 0).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">priceWithoutVat / prelpc</td>
              <td class="px-3 py-2">Float</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2">F_LPC.PRELPC</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Precio neto unitario antes de impuestos (ej: <code>89.00</code>). Evita la trampa del doble IVA.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">vatRate / ivalpc</td>
              <td class="px-3 py-2">Float</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2">F_LPC.IVALPC</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Porcentaje de IVA aplicable a la línea (valores estándar en España: <code>21.0</code>, <code>10.0</code>, <code>4.0</code>, <code>0.0</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">equivalenceSurcharge / reclpc</td>
              <td class="px-3 py-2">Float</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_LPC.RECLPC</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Porcentaje de Recargo de Equivalencia si el cliente está acogido (ej: <code>5.2</code>, <code>1.4</code>, <code>0.5</code>).</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">discountPercent / dtolpc</td>
              <td class="px-3 py-2">Float</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Opcional</td>
              <td class="px-3 py-2">F_LPC.DTOLPC</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Porcentaje de descuento comercial aplicado a la línea (ej: <code>10.0</code> para un 10%).</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="paginacion-versionado" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Paginación de Alto Rendimiento, Límites y Versionado</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para garantizar que el conector pueda operar en tiendas con cientos de pedidos diarios sin provocar caídas de memoria (<code>memory_limit</code>) en servidores compartidos, el Endpoint Universal incorpora <strong>paginación basada en cursor</strong> y límites estrictos:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Límite por Defecto:</strong> Si no se especifica, el servidor debe retornar hasta <strong>50 pedidos</strong> por bloque.</li>
        <li><strong>Límite Máximo Estricto:</strong> El parámetro <code>limit</code> queda acotado a un máximo de <strong>200 pedidos</strong> (<code>max(1, min(200, intval($_GET['limit'])))</code>). Cualquier solicitud superior es truncada a 200.</li>
        <li><strong>Paginación por Cursor:</strong> El parámetro <code>cursor</code> o <code>since_id</code> permite solicitar los pedidos posteriores al último ID procesado (ej: <code>GET ?action=get_orders&limit=50&cursor=1042</code>).</li>
        <li><strong>Versionado Semántico del Esquema:</strong> Cada respuesta incluye el campo <code>"version": "1.1.0"</code>. El agente utiliza una política de compatibilidad hacia adelante (*forward-compatibility*): los campos JSON nuevos o no reconocidos son ignorados silenciosamente sin romper el deserializador.</li>
      </ul>

      <h2 id="seguridad-headers-hmac" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">7. Seguridad: Headers, Criptografía HMAC-SHA256 y Anti-Replay</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Todas las peticiones HTTP emitidas por el agente hacia el endpoint incluyen un conjunto estándar de cabeceras de seguridad criptográfica:
      </p>

      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
            <tr>
              <th class="px-3 py-2.5">Cabecera HTTP</th>
              <th class="px-3 py-2.5">Formato</th>
              <th class="px-3 py-2.5">Obligatoriedad</th>
              <th class="px-3 py-2.5">Propósito de Seguridad</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">X-Bentian-Token</td>
              <td class="px-3 py-2">String alfanumérico</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Token secreto pre-compartido entre el agente local y el servidor web.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300 font-bold">X-Bentian-Timestamp</td>
              <td class="px-3 py-2">Época UNIX en segundos</td>
              <td class="px-3 py-2 text-rose-400 font-sans font-bold">OBLIGATORIO</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Protección Anti-Replay: el servidor rechaza peticiones con más de 300s de desfase.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">X-Bentian-Signature</td>
              <td class="px-3 py-2">Hexadecimal 64 caracteres</td>
              <td class="px-3 py-2 text-emerald-400 font-sans">Recomendado (HMAC)</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Firma criptográfica HMAC-SHA256 calculada sobre <code>timestamp + '.' + body</code>.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-indigo-300">X-Bentian-Agent-Version</td>
              <td class="px-3 py-2">String semver (ej: v0.3.8)</td>
              <td class="px-3 py-2 text-zinc-400 font-sans">Informativo</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Permite al servidor web auditar qué versión del agente está conectándose.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed mb-6">
        <strong class="text-white font-semibold block mb-1">Protección Anti-Replay de 300 Segundos:</strong>
        El servidor web calcula <code>abs(time() - $requestTimestamp)</code>. Si la diferencia es superior a 300 segundos (5 minutos), la petición se descarta inmediatamente con código <code>HTTP 403 Forbidden</code>. Esto impide que un atacante que intercepte un paquete previo pueda replicarlo para descargar pedidos o alterar stock.
      </div>

      <h2 id="rotacion-secretos-env" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">8. Rotación de Secretos y Variables de Entorno</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para cumplir con las normas de seguridad ISO 27001 y RGPD:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Prohibición de Secretos en el Código:</strong> El token de Bentian <strong>NUNCA</strong> debe quedar grabado en texto plano dentro de scripts PHP accesibles públicamente o subidos a GitHub/GitLab.</li>
        <li><strong>Almacenamiento Canónico en Variables de Entorno:</strong> Debe configurarse en el entorno del sistema operativo o en el panel de hosting (Plesk → Configuración de PHP → Variables de entorno, o fichero <code>.env</code> ubicado <strong>por encima de la carpeta pública <code>httpdocs</code></strong>):
          <div class="p-2.5 rounded bg-[#09090c] border border-white/[0.08] text-xs font-mono text-emerald-400 my-2">
            BENTIAN_ENDPOINT_TOKEN="eb_sec_9f83b2a1c4e7d6f5..."
          </div>
        </li>
        <li><strong>Rotación sin Caída de Servicio (Zero-Downtime Rotation):</strong> Cuando se desee rotar un secreto empresarial, el servidor web puede aceptar temporalmente dos claves durante un período de solapamiento de 24 horas:
          <pre class="p-3 rounded bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 mt-2"><code>$validTokens = [
    getenv('BENTIAN_ENDPOINT_TOKEN'),
    getenv('BENTIAN_PREVIOUS_TOKEN') // Token en retirada
];
$isAuthenticated = false;
foreach ($validTokens as $expected) {
    if (!empty($expected) && hash_equals($expected, $receivedToken)) {
        $isAuthenticated = true;
        break;
    }
}</code></pre>
        </li>
      </ul>

      <h2 id="matriz-codigos-http" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">9. Matriz de Códigos de Respuesta HTTP y Rate Limiting</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El endpoint debe comunicar el resultado de cada operación utilizando códigos de estado HTTP semánticos RFC 9110:
      </p>

      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
            <tr>
              <th class="px-3 py-2.5">Código HTTP</th>
              <th class="px-3 py-2.5">Significado Técnico</th>
              <th class="px-3 py-2.5">Comportamiento del Agente Bentian</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-3 py-2 text-emerald-400 font-bold">200 OK</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Petición procesada con éxito. Payload JSON íntegro.</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Procesa pedidos o confirma el ciclo ACK satisfactoriamente.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-amber-400 font-bold">400 Bad Request</td>
              <td class="px-3 py-2 font-sans text-zinc-300">JSON malformado o campos requeridos ausentes.</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Registra advertencia en el log de diagnóstico y omite el registro corrupto.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-rose-400 font-bold">401 Unauthorized</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Cabecera <code>X-Bentian-Token</code> ausente o incorrecta.</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Marca error de credenciales en el GUI del agente y detiene el polling.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-rose-400 font-bold">403 Forbidden</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Firma HMAC inválida o timestamp expirado (&gt;300s).</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Registra alerta de seguridad y sincroniza el reloj local del sistema con NTP.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-purple-400 font-bold">429 Too Many Requests</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Límite de tasa excedido en el hosting (WAF o Cloudflare).</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Respeta la cabecera <code>Retry-After: 60</code> y activa backoff exponencial suave.</td>
            </tr>
            <tr>
              <td class="px-3 py-2 text-rose-500 font-bold">500 Internal Error</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Error de base de datos MySQL/MariaDB en el servidor.</td>
              <td class="px-3 py-2 font-sans text-zinc-300">Aplica reintentos programados sin perder ningún pedido en la cola local.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        <strong>Recomendación de Rate Limiting:</strong> Configurar un umbral de 60 peticiones/minuto por IP para el agente de Bentian. Esto garantiza margen de sobra para consultas de pedidos y descargas periódicas sin disparar bloqueos de seguridad del WAF.
      </p>

      <h2 id="script-php-produccion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">10. Implementación de Referencia en PHP (Plesk / cPanel)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        A continuación se proporciona una plantilla de integración completa en PHP, lista para subir a <code class="text-indigo-300 font-mono">httpdocs/erp-bridge-endpoint.php</code> en Plesk o cPanel. Incluye lectura segura de token por entorno, validación en tiempo constante (<code>hash_equals</code>), verificación anti-replay, soporte para descarga de pedidos, flujo ACK transaccional y actualización de stock:
      </p>

      <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 overflow-x-auto mb-6"><code>&lt;?php
/**
 * ============================================================================
 * Bentian ERP Bridge — Endpoint Universal Enterprise v1.1.0
 * ============================================================================
 * Ubicación en Plesk: httpdocs/erp-bridge-endpoint.php
 * Requisitos: PHP 7.4+ con extensiones PDO MySQL / OpenSSL activas
 * ============================================================================
 */

error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// 1. Obtención de Secretos y Configuración desde Variables de Entorno
$secretToken = getenv('BENTIAN_ENDPOINT_TOKEN') ?: 'CAMBIA_ESTE_TOKEN_SECRETO_AQUI';
$dbHost      = getenv('BENTIAN_DB_HOST') ?: '127.0.0.1';
$dbName      = getenv('BENTIAN_DB_NAME') ?: 'mi_tienda_db';
$dbUser      = getenv('BENTIAN_DB_USER') ?: 'mi_usuario_db';
$dbPass      = getenv('BENTIAN_DB_PASS') ?: 'mi_password_db';

// 2. Extracción Compatible de Cabeceras HTTP
$headers = function_exists('getallheaders') ? getallheaders() : [];
$receivedToken = $headers['X-Bentian-Token'] 
    ?? $headers['x-bentian-token'] 
    ?? ($_SERVER['HTTP_X_BENTIAN_TOKEN'] ?? '');

$receivedTimestamp = (int)($headers['X-Bentian-Timestamp'] 
    ?? $headers['x-bentian-timestamp'] 
    ?? ($_SERVER['HTTP_X_BENTIAN_TIMESTAMP'] ?? 0));

$receivedSignature = $headers['X-Bentian-Signature'] 
    ?? $headers['x-bentian-signature'] 
    ?? ($_SERVER['HTTP_X_BENTIAN_SIGNATURE'] ?? '');

// 3. Autenticación en Tiempo Constante (Prevención de Timing Attacks)
if (empty($receivedToken) || !hash_equals($secretToken, $receivedToken)) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado: Token de Bentian no coincide o ausente']);
    exit;
}

// 4. Validación de Marca de Tiempo Anti-Replay (Ventana de 300 segundos)
if ($receivedTimestamp > 0 && abs(time() - $receivedTimestamp) > 300) {
    http_response_code(403);
    echo json_encode(['error' => 'Petición expirada: Timestamp fuera de la ventana permitida (300s)']);
    exit;
}

// 5. Conexión PDO a Base de Datos
try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión con la base de datos local']);
    exit;
}

// 6. Enrutador de Acciones
$action = $_GET['action'] ?? 'get_orders';
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true) ?: [];

// Acción A: Verificación de Estado (Ping)
if ($action === 'ping') {
    echo json_encode([
        'status' => 'ok',
        'success' => true,
        'service' => 'Bentian Universal Bridge',
        'version' => '1.1.0',
        'databaseConnected' => true,
        'timestamp' => time()
    ]);
    exit;
}

// Acción B: Descarga de Pedidos Pendientes con Paginación
if ($action === 'get_orders' || $action === 'pull_orders') {
    $limit = isset($_GET['limit']) ? max(1, min(200, intval($_GET['limit']))) : 50;
    $cursor = isset($_GET['cursor']) ? intval($_GET['cursor']) : 0;

    $stmt = $pdo->prepare("
        SELECT id, order_number, status, total, subtotal, tax_total, shipping_cost,
               customer_data, order_lines, payment_method, created_at
        FROM eb_orders
        WHERE status = 'PENDING' AND id > :cursor
        ORDER BY id ASC
        LIMIT :lim
    ");
    $stmt->bindValue(':cursor', $cursor, PDO::PARAM_INT);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $orders = [];
    $lastId = $cursor;
    foreach ($rows as $r) {
        $lastId = intval($r['id']);
        $orders[] = [
            'id' => $lastId,
            'orderNumber' => $r['order_number'] ?: ('PED-' . $lastId),
            'status' => $r['status'],
            'total' => floatval($r['total']),
            'subtotal' => floatval($r['subtotal'] ?? $r['total']),
            'taxTotal' => floatval($r['tax_total'] ?? 0),
            'shippingCost' => floatval($r['shipping_cost'] ?? 0),
            'paymentMethod' => $r['payment_method'] ?? 'web',
            'createdAt' => $r['created_at'],
            'customer' => json_decode($r['customer_data'], true) ?: [],
            'lines' => json_decode($r['order_lines'], true) ?: []
        ];
    }

    echo json_encode([
        'version' => '1.1.0',
        'success' => true,
        'pagination' => [
            'limit' => $limit,
            'count' => count($orders),
            'hasMore' => count($orders) === $limit,
            'nextCursor' => count($orders) === $limit ? $lastId : null
        ],
        'orders' => $orders
    ]);
    exit;
}

// Acción C: Confirmación de Pedidos Sincronizados (Flujo ACK Individual o en Bloque)
if ($action === 'ack_orders' || $action === 'ack') {
    $confirmations = [];
    if (isset($body['confirmations']) && is_array($body['confirmations'])) {
        $confirmations = $body['confirmations'];
    } elseif (isset($body['orderId'])) {
        $confirmations = [$body];
    }

    if (empty($confirmations)) {
        http_response_code(400);
        echo json_encode(['error' => 'Estructura inválida: se esperaba "confirmations" o "orderId"']);
        exit;
    }

    $stmt = $pdo->prepare("
        UPDATE eb_orders
        SET status = 'SYNCED',
            factusol_order_number = :factNum,
            factusol_series = :factSer,
            synced_at = NOW()
        WHERE id = :id AND status = 'PENDING'
    ");

    $updated = 0;
    $pdo->beginTransaction();
    try {
        foreach ($confirmations as $c) {
            $stmt->execute([
                ':id' => intval($c['orderId'] ?? 0),
                ':factNum' => intval($c['factusolOrderNumber'] ?? 0) ?: null,
                ':factSer' => substr(strval($c['factusolSeries'] ?? '1'), 0, 5)
            ]);
            $updated += $stmt->rowCount();
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'updated' => $updated]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al persistir confirmación ACK: ' . $e->getMessage()]);
    }
    exit;
}

// Acción D: Actualización de Stock en Tiempo Real desde Factusol
if ($action === 'push_stock') {
    $updates = $body['stockUpdates'] ?? [];
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['error' => 'Parámetro stockUpdates vacío o ausente']);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO eb_stock (code, stock, updated_at)
        VALUES (:code, :stock, NOW())
        ON DUPLICATE KEY UPDATE stock = :stock_up, updated_at = NOW()
    ");

    $count = 0;
    $pdo->beginTransaction();
    try {
        foreach ($updates as $u) {
            $code = trim($u['sku'] ?? $u['code'] ?? '');
            $stock = floatval($u['stock'] ?? 0);
            if (!empty($code)) {
                $stmt->execute([
                    ':code' => $code,
                    ':stock' => $stock,
                    ':stock_up' => $stock
                ]);
                $count++;
            }
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'count' => $count]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar existencias: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Acción no reconocida: ' . htmlspecialchars($action)]);
</code></pre>
    `,
  },
];
