import { DocArticle } from '../types';

export const apiArticles: DocArticle[] = [
  {
    slug: 'api/api-rest-local',
    categorySlug: 'api',
    title: 'Referencia de la API REST Local del Agente (39281)',
    subtitle: 'Especificación de endpoints HTTP locales para monitorización, forzado de sincronización, guardado de configuración y telemetría.',
    badge: 'API & Desarrolladores',
    readingTime: '5 min de lectura',
    metaTitle: 'API REST Local de Bentian Agent (Puerto 39281) | Documentación',
    metaDescription: 'Especificación técnica completa de los endpoints HTTP locales de Bentian ERP Bridge: /api/local/status, /api/local/sync-now y configuración.',
    keywords: 'api rest factusol local, endpoints bentian 39281, api local conector factusol, json factusol local, telemetria conector factusol',
    toc: [
      { id: 'arquitectura-api-local', label: '1. Arquitectura de la API Local', level: 2 },
      { id: 'endpoint-status', label: '2. GET /api/local/status (Telemetría y Estado)', level: 2 },
      { id: 'endpoint-sync-now', label: '3. POST /api/local/sync-now (Forzar Sincronización)', level: 2 },
      { id: 'endpoint-save-config', label: '4. POST /api/local/save-full-config', level: 2 },
      { id: 'endpoint-test-notificaciones', label: '5. POST /api/local/test-email, test-telegram y test-discord', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        El agente de Bentian ejecuta un servidor HTTP ligero interno que escucha exclusivamente en la dirección loopback <code class="text-indigo-300 font-mono">http://127.0.0.1:39281</code>. Esta interfaz permite interactuar con el motor de sincronización de forma programática desde scripts de PowerShell, sistemas de monitorización locales (Zabbix, Nagios) o desde la propia interfaz de usuario.
      </p>

      <h2 id="arquitectura-api-local" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Arquitectura de la API Local</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Por seguridad estricta, la API local solo acepta conexiones originadas desde la propia máquina (<code class="text-zinc-200">127.0.0.1</code> o <code class="text-zinc-200">localhost</code>). Cualquier intento de conexión desde otra IP de la red local o desde Internet es rechazado inmediatamente.
      </p>

      <h2 id="endpoint-status" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. GET /api/local/status (Telemetría y Estado)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Devuelve el estado de salud en tiempo real de todos los subsistemas (conexión Factusol, tienda web, licencia y cola de pedidos):
      </p>
      <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 overflow-x-auto mb-6"><code>GET http://127.0.0.1:39281/api/local/status

HTTP/1.1 200 OK
Content-Type: application/json

{
  "running": true,
  "version": "0.3.8",
  "uptimeSeconds": 1420,
  "factusol": {
    "connected": true,
    "configured": true,
    "dbPath": "C:\\\\Software DELSOL\\\\Factusol\\\\Datos\\\\FS\\\\0012026.accdb",
    "orderSeries": "1",
    "latencyMs": 18
  },
  "channel": {
    "type": "woocommerce",
    "connected": true,
    "storeUrl": "https://www.suministrosrubio.com"
  },
  "license": {
    "valid": true,
    "plan": "founder_annual",
    "daysRemaining": 348
  },
  "queue": {
    "pendingOrders": 0,
    "syncedToday": 14,
    "failed": 0
  }
}</code></pre>

      <h2 id="endpoint-sync-now" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. POST /api/local/sync-now (Forzar Sincronización)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Fuerza la ejecución inmediata de una pasada de sincronización de stock y comprobación de nuevos pedidos en la tienda web sin esperar al temporizador automático:
      </p>
      <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 overflow-x-auto mb-6"><code>POST http://127.0.0.1:39281/api/local/sync-now
Content-Type: application/json

{}

HTTP/1.1 200 OK
{
  "success": true,
  "message": "Sincronización manual completada en 245 ms."
}</code></pre>

      <h2 id="endpoint-save-config" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. POST /api/local/save-full-config</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Guarda de forma atómica la configuración completa del sistema en <code class="text-indigo-300 font-mono">%APPDATA%\\Bentian Agent\\agent-config.json</code> y reinicializa los adaptadores de Factusol y canal de ventas en caliente sin necesidad de reiniciar el proceso.
      </p>

      <h2 id="endpoint-test-notificaciones" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Endpoints de Test de Notificaciones (Email, Telegram y Discord)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Permiten validar la recepción en tiempo real de alertas de nuevos pedidos para cada canal configurado de forma independiente:
      </p>
      <ul class="text-xs text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><code class="text-indigo-300 font-mono">POST /api/local/test-email</code>: Envía un correo de prueba conectando directamente con el servidor SMTP propio configurado (Gmail, Outlook, hosting cPanel/Plesk).</li>
        <li><code class="text-indigo-300 font-mono">POST /api/local/test-telegram</code>: Envía un mensaje de prueba al chat o canal de Telegram mediante el Bot API (<code class="text-zinc-300 font-mono">api.telegram.org</code>).</li>
        <li><code class="text-indigo-300 font-mono">POST /api/local/test-discord</code>: Envía un embed interactivo con formato de pedido de Factusol al canal de Discord mediante el Webhook oficial configurado.</li>
      </ul>
    `,
  },
  {
    slug: 'api/esquema-pedidos-json',
    categorySlug: 'api',
    title: 'Esquema JSON de Pedidos (OrderPayload) y Validación Zod',
    subtitle: 'Estructura formal de datos para la ingesta de pedidos: cliente, dirección de entrega, líneas de producto, IVA y recargo.',
    badge: 'Esquemas & Tipos',
    readingTime: '5 min de lectura',
    metaTitle: 'Esquema JSON de Pedidos para Factusol | Bentian ERP Bridge',
    metaDescription: 'Especificación completa del esquema JSON de pedidos (OrderPayload). Validación con Zod, tipos de datos y mapeo a las tablas de Factusol.',
    keywords: 'json pedidos factusol, order payload factusol, esquema json woocommerce factusol, zod pedidos erp bridge, api pedidos f_pcl',
    toc: [
      { id: 'especificacion-esquema', label: '1. Especificación del Esquema JSON', level: 2 },
      { id: 'campos-cabecera', label: '2. Campos de Cabecera y Cliente', level: 2 },
      { id: 'campos-lineas', label: '3. Campos de Detalle de Líneas de Producto', level: 2 },
      { id: 'validacion-zod', label: '4. Validación en TypeScript con Zod', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Para garantizar que ningún pedido malformado o incompleto llegue a corromper la base de datos de Factusol, Bentian valida cada objeto entrante contra un esquema TypeScript estricto validado en runtime mediante la biblioteca <strong>Zod</strong>.
      </p>

      <h2 id="especificacion-esquema" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Especificación del Esquema JSON</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Estructura completa de un pedido válido procesable por el conector:
      </p>
      <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 overflow-x-auto mb-6"><code>{
  "id": "ORD-2026-9041",
  "series": "1",
  "createdAt": "2026-10-05T08:30:00Z",
  "customer": {
    "name": "Suministros Industriales Levante S.L.",
    "cif": "B98765432",
    "email": "compras@suministroslevante.es",
    "phone": "+34 961 234 567",
    "billingAddress": {
      "address": "Calle Mayor 12, Nave 3",
      "city": "Valencia",
      "postalCode": "46001",
      "province": "Valencia",
      "country": "ES"
    }
  },
  "lines": [
    {
      "sku": "TAL-BOSCH-750",
      "description": "Taladro Percutor Bosch GSB 750W",
      "quantity": 2,
      "unitPrice": 89.00,
      "discountPercent": 0.0,
      "vatRate": 21.0,
      "equivalenceSurchargeRate": 5.2
    }
  ],
  "shipping": {
    "cost": 6.50,
    "vatRate": 21.0
  },
  "paymentMethod": "stripe",
  "total": 222.18
}</code></pre>

      <h2 id="campos-cabecera" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Campos de Cabecera y Cliente</h2>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6 font-mono text-xs">
        <li><strong class="text-white font-sans">id (string):</strong> Identificador único del pedido en la tienda web (utilizado para evitar duplicidades).</li>
        <li><strong class="text-white font-sans">series (string, 1 char):</strong> Serie de facturación de Factusol (por defecto <code class="text-emerald-400">"1"</code>).</li>
        <li><strong class="text-white font-sans">customer.cif (string):</strong> NIF, CIF o NIE del cliente para matching en <code class="text-zinc-200">F_CLI</code>.</li>
      </ul>

      <h2 id="campos-lineas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Campos de Detalle de Líneas de Producto</h2>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6 font-mono text-xs">
        <li><strong class="text-white font-sans">sku (string):</strong> Código de artículo en Factusol (<code class="text-zinc-200">F_ART.CODART</code>).</li>
        <li><strong class="text-white font-sans">quantity (number):</strong> Número de unidades (soporta decimales para venta a peso/metros).</li>
        <li><strong class="text-white font-sans">unitPrice (number):</strong> Precio unitario base sin impuestos.</li>
        <li><strong class="text-white font-sans">vatRate (number):</strong> Tipo impositivo de IVA (21, 10, 4 o 0).</li>
        <li><strong class="text-white font-sans">equivalenceSurchargeRate (number, opcional):</strong> Recargo de equivalencia aplicable (5.2, 1.4, 0.5 o 0).</li>
      </ul>

      <h2 id="validacion-zod" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Validación en TypeScript con Zod</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        El pipeline de ingesta de Bentian ejecuta <code class="text-indigo-300 font-mono">OrderSchema.parse(payload)</code>. Si falta algún campo obligatorio o los importes no cuadran matemáticamente, el pedido no se inserta en Factusol y queda registrado en la cola de inspección con una notificación humanizada.
      </p>
    `,
  },
];
