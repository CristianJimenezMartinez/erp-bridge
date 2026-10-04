import { DocArticle } from '../types';

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
  {
    slug: 'canales/shopify',
    categorySlug: 'canales',
    title: 'Conexión con Shopify mediante Admin REST y GraphQL',
    subtitle: 'Conexión directa entre Factusol y Shopify sin intermediarios mensuales cloud. Configuración de Custom App y scopes de inventario.',
    badge: 'Conector Shopify',
    readingTime: '4 min de lectura',
    metaTitle: 'Conectar Factusol con Shopify (Local-First) | Bentian ERP',
    metaDescription: 'Cómo conectar Factusol con Shopify sin intermediarios cloud de 100€/mes. Configuración de Custom App en Shopify Admin y sincronización de stock.',
    keywords: 'conectar factusol shopify, shopify factusol sin intermediarios, conector shopify factusol, custom app shopify factusol, inventario shopify factusol',
    toc: [
      { id: 'ventaja-directa', label: '1. Por qué Conexión Directa vs Conectores Cloud', level: 2 },
      { id: 'crear-custom-app', label: '2. Creación de una Custom App en Shopify', level: 2 },
      { id: 'permisos-scopes', label: '3. Scopes de Permisos Requeridos', level: 2 },
      { id: 'configuracion-agente', label: '4. Vinculación en el Panel de Bentian', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Muchas pymes que eligen Shopify para su tienda online descubren con frustración que los conectores habituales cobran entre 90 € y 250 € al mes por alojar un puente en la nube. Bentian ERP Bridge revoluciona este modelo: se conecta <strong>directamente desde tu PC con Factusol a la API oficial de Shopify</strong>, sin intermediarios ni costes mensuales recurrentes.
      </p>

      <h2 id="ventaja-directa" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Por qué Conexión Directa vs Conectores Cloud</h2>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Ahorro masivo:</strong> Te ahorras entre 1.000 € y 3.000 € al año en plataformas intermediarias.</li>
        <li><strong>Privacidad total:</strong> Tus datos de Factusol no pasan por los servidores de ninguna empresa intermediaria.</li>
        <li><strong>Velocidad:</strong> El agente encola pedidos de Shopify directamente en el archivo de Factusol en milisegundos.</li>
      </ul>

      <h2 id="crear-custom-app" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Creación de una Custom App en Shopify</h2>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Inicia sesión en tu panel de administración de Shopify.</li>
        <li>Ve a <strong class="text-white">Configuración → Aplicaciones y canales de ventas → Desarrollar aplicaciones</strong>.</li>
        <li>Haz clic en <strong class="text-indigo-400">Crear una aplicación</strong> y nómbrala <code>Bentian ERP Bridge</code>.</li>
      </ol>

      <h2 id="permisos-scopes" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Scopes de Permisos Requeridos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En la pestaña <em>Configuración de API de Admin</em>, concede los siguientes permisos:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6 font-mono text-xs">
        <li><code class="text-emerald-400">read_orders, write_orders</code> (Descarga y gestión de pedidos)</li>
        <li><code class="text-emerald-400">read_products, write_products</code> (Artículos y tarifas)</li>
        <li><code class="text-emerald-400">read_inventory, write_inventory</code> (Stock disponible)</li>
      </ul>

      <h2 id="configuracion-agente" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Vinculación en el Panel de Bentian</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Copia el <strong class="text-white">Admin API Access Token</strong> generado por Shopify e introdúcelo en la configuración de canal de Bentian.
      </p>
    `,
  },
  {
    slug: 'canales/endpoint-universal',
    categorySlug: 'canales',
    title: 'Endpoint Universal: Conecta Cualquier Tienda Personalizada',
    subtitle: 'Especificación de API JSON para tiendas a medida desarrolladas en PHP, Laravel, Angular o alojadas en Plesk.',
    badge: 'Universal Bridge API',
    readingTime: '5 min de lectura',
    metaTitle: 'Endpoint Universal Factusol para Tiendas Propias | Bentian ERP',
    metaDescription: 'Cómo conectar Factusol con tiendas online a medida mediante el Endpoint Universal JSON de Bentian. Ideal para tiendas en PHP, Laravel o Plesk.',
    keywords: 'api universal factusol, endpoint json factusol, conectar php factusol, conectar laravel factusol, sincronizar tienda a medida factusol',
    toc: [
      { id: 'para-que-sirve', label: '1. ¿Para qué sirve el Endpoint Universal?', level: 2 },
      { id: 'esquema-comunicacion', label: '2. Esquema de Comunicación', level: 2 },
      { id: 'autenticacion-firmas', label: '3. Seguridad: Autenticación, HMAC y Anti-Replay', level: 2 },
      { id: 'ejemplo-php', label: '4. Script de Ejemplo Seguro en PHP', level: 2 },
      { id: 'formato-pedidos', label: '5. Formato JSON del Pedido Entrante', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        No todas las empresas utilizan WooCommerce o PrestaShop. Muchas cuentan con plataformas de comercio electrónico desarrolladas a medida en PHP nativo, frameworks como Laravel o Symfony, o frontends en Angular y React alojados en servidores Plesk o cPanel.
      </p>

      <h2 id="para-que-sirve" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Para qué sirve el Endpoint Universal?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El <strong>Endpoint Universal</strong> de Bentian permite que cualquier programador conecte una tienda online con Factusol creando un script en su servidor web. El agente de Bentian consulta periódicamente este endpoint para descargar pedidos pendientes e inyectar las actualizaciones de stock en Factusol.
      </p>

      <h2 id="esquema-comunicacion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Esquema de Comunicación</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La comunicación se realiza mediante peticiones HTTP salientes desde el PC con Factusol hacia tu servidor mediante TLS 1.3:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6 font-mono text-xs">
        <li><strong class="text-white font-sans">Descarga de pedidos:</strong> <code class="text-indigo-300">GET https://tutienda.com/api/bentian-orders.php</code></li>
        <li><strong class="text-white font-sans">Actualización de stock:</strong> <code class="text-indigo-300">POST https://tutienda.com/api/bentian-stock.php</code></li>
      </ul>

      <h2 id="autenticacion-firmas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Seguridad: Autenticación, HMAC y Anti-Replay</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para entornos de producción y cumplimiento empresarial, el conector implementa tres salvaguardas de seguridad:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong class="text-white">Token Secreto en Cabecera:</strong> Cada petición incluye <code class="text-emerald-400 font-mono">X-Bentian-Token</code>. Debe almacenarse en variables de entorno del servidor (nunca hardcodeado en ficheros públicos).</li>
        <li><strong class="text-white">Marca de Tiempo Anti-Replay:</strong> La cabecera <code class="text-indigo-300 font-mono">X-Bentian-Timestamp</code> envía la época UNIX. Tu servidor puede rechazar cualquier petición con más de 300 segundos de diferencia para impedir ataques de repetición.</li>
        <li><strong class="text-white">Clave de Idempotencia por Pedido:</strong> Cada pedido retornado debe incluir un identificador unívoco o hash en el campo <code class="text-zinc-200 font-mono">id</code> para garantizar que un reintento de red jamás genere pedidos duplicados en Factusol.</li>
      </ul>

      <h2 id="ejemplo-php" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Script de Ejemplo Seguro en PHP</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Ejemplo de endpoint en PHP con validación de token seguro mediante tiempo constante (<code class="text-zinc-200 font-mono">hash_equals</code>) y lectura desde variable de entorno:
      </p>
      <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 overflow-x-auto mb-6"><code>&lt;?php
// Archivo: erp-bridge-endpoint.php
header('Content-Type: application/json; charset=utf-8');

// 1. Obtener el token secreto desde variable de entorno del sistema o fichero seguro
$expectedToken = getenv('BENTIAN_ENDPOINT_TOKEN') ?: 'CONFIGURA_TU_TOKEN_SECRETO_AQUI';

// 2. Extraer cabeceras HTTP de forma compatible con Apache / Nginx / LiteSpeed
$headers = function_exists('getallheaders') ? getallheaders() : [];
$receivedToken = $headers['X-Bentian-Token'] 
    ?? $headers['x-bentian-token'] 
    ?? ($_SERVER['HTTP_X_BENTIAN_TOKEN'] ?? '');

// 3. Validación en tiempo constante (protección contra timing attacks)
if (empty($receivedToken) || !hash_equals($expectedToken, $receivedToken)) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado: Token de Bentian no coincide o ausente']);
    exit;
}

// 4. Verificación de timestamp anti-replay (opcional, margen de 5 minutos)
$requestTime = (int)($headers['X-Bentian-Timestamp'] ?? $_SERVER['HTTP_X_BENTIAN_TIMESTAMP'] ?? 0);
if ($requestTime > 0 && abs(time() - $requestTime) > 300) {
    http_response_code(403);
    echo json_encode(['error' => 'Peticion expirada']);
    exit;
}

$action = $_GET['action'] ?? 'get_orders';

if ($action === 'get_orders') {
    // Consulta tu base de datos MySQL / PostgreSQL por pedidos pendientes
    $pedidos = [
        [
            'id' => '1042',
            'customer' => [
                'name' => 'Ferretería Industrial S.L.',
                'cif' => 'B12345678',
                'email' => 'compras@ferreteria.es',
                'phone' => '912345678',
                'address' => 'Polígono Industrial Nave 4',
                'city' => 'Madrid',
                'postalCode' => '28001'
            ],
            'lines' => [
                [
                    'sku' => 'TAL-BOSCH-750',
                    'name' => 'Taladro Percutor 750W',
                    'quantity' => 2,
                    'priceWithoutVat' => 89.00,
                    'vatRate' => 21.0
                ]
            ],
            'shippingTotal' => 5.50
        ]
    ];
    echo json_encode(['orders' => $pedidos]);
    exit;
}
</code></pre>

      <h2 id="formato-pedidos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Formato JSON del Pedido Entrante</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El conector de Bentian lee el array de pedidos devuelto por tu endpoint y realiza la transacción relacional atómica en Factusol:
      </p>
      <ol class="text-sm text-zinc-300 space-y-1.5 list-decimal list-inside mb-6">
        <li>Busca al cliente por NIF en <code class="text-zinc-200">F_CLI</code> o crea una nueva ficha si es un cliente nuevo.</li>
        <li>Genera la cabecera en <code class="text-zinc-200">F_PCL</code> con el siguiente número correlativo disponible.</li>
        <li>Inserta cada línea en <code class="text-zinc-200">F_LPC</code> con su precio, tipo de IVA y recargo si aplica.</li>
        <li>Marca el pedido en tu tienda como sincronizado mediante una llamada de confirmación.</li>
      </ol>
    `,
  },
];
