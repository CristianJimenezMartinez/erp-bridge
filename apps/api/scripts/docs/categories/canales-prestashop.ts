import { DocArticle } from '../types';

export const prestashopArticle: DocArticle = {
  slug: 'canales/prestashop',
  categorySlug: 'canales',
  title: 'Conector Factusol PrestaShop (1.7 y 8.x): Sincronización de Stock y Pedidos por Webservice',
  subtitle: 'Guía técnica paso a paso para conectar Factusol (y SimplyGest, Sage 50, Ágora o a3ERP) con PrestaShop 1.7 y 8.x mediante su API Webservice nativa sin instalar módulos pesados.',
  badge: 'Conector PrestaShop Oficial',
  readingTime: '7 min de lectura',
  metaTitle: 'Conector Factusol PrestaShop (1.7 y 8.x) — Stock y Pedidos en Tiempo Real | Bentian ERP',
  metaDescription: 'Conector Factusol PrestaShop oficial para PrestaShop 1.7 y 8.x. Sincroniza stock disponible (F_STO DISSTO), combinaciones, tarifas y pedidos (F_PCL/F_LPC) por Webservice API sin módulos pesados. Descarga gratis.',
  keywords: 'prestashop factusol, conector factusol prestashop, conector prestashop, factusol prestashop, sincronizar factusol prestashop, modulo factusol prestashop 8, webservice prestashop factusol, sincronizar stock prestashop factusol',
  toc: [
    { id: 'comparativa-modulos-addons', label: '1. Conector Nativo Webservice vs Módulos de PrestaShop Addons', level: 2 },
    { id: 'mapeo-tablas-factusol-prestashop', label: '2. Mapeo Técnico de Tablas: Factusol (.accdb) ↔ PrestaShop API', level: 2 },
    { id: 'activar-webservices', label: '3. Paso 1: Activar el Servicio Web en el Backoffice de PrestaShop', level: 2 },
    { id: 'recursos-necesarios', label: '4. Paso 2: Clave de 32 Caracteres y Permisos (GET / POST / PUT)', level: 2 },
    { id: 'combinaciones-y-dissto', label: '5. Combinaciones (Tallas/Colores) y Stock Real Disponible (DISSTO)', level: 2 },
    { id: 'configuracion-bentian', label: '6. Paso 3: Vincular PrestaShop en el Asistente de Bentian ERP Bridge', level: 2 },
    { id: 'preguntas-frecuentes-prestashop', label: '7. Preguntas Frecuentes (FAQ): Factusol y PrestaShop', level: 2 },
  ],
  image: '/assets/screenshots/03-ecommerce-channels.png',
  faqs: [
    {
      question: '¿Necesito comprar o instalar algún módulo en PrestaShop para conectarlo con Factusol?',
      answer: 'No. Bentian ERP Bridge se conecta directamente a la API RESTful nativa de PrestaShop (Parámetros Avanzados > Webservice) incluida de serie en PrestaShop 1.7 y PrestaShop 8.x. Evitas instalar módulos de terceros que ralentizan el servidor PHP o rompen actualizaciones.',
    },
    {
      question: '¿Cómo sincroniza el conector Factusol PrestaShop el stock para evitar sobreventas?',
      answer: 'El agente calcula el stock disponible real en Factusol (DISSTO = ACTSTO - PENPCL en la tabla F_STO) y actualiza únicamente los recursos stock_availables cuyo stock ha variado (dirty-checking) mediante peticiones PUT autenticadas.',
    },
    {
      question: '¿Es compatible con combinaciones de productos (tallas, colores, formatos) en PrestaShop?',
      answer: 'Sí. Bentian cruza tanto las referencias de productos simples (/api/products) como las referencias específicas de cada combinación (/api/combinations) con el código de artículo (CODART / CODSTO) de tu ERP.',
    },
    {
      question: '¿Qué ocurre cuando entra un pedido nuevo en PrestaShop?',
      answer: 'Bentian descarga automáticamente los pedidos pagados (/api/orders), valida la integridad fiscal (IVA 21%, 10%, 4% y Recargo de Equivalencia), crea o vincula la ficha del cliente por NIF/DNI en F_CLI e inyecta el pedido de forma atómica en F_PCL (cabecera) y F_LPC (líneas) sin bloquear Factusol.',
    },
  ],
  contentHtml: `
    <p class="text-base text-zinc-300 leading-relaxed mb-6">
      Si buscas un <strong>conector Factusol PrestaShop</strong> fiable, rápido y sin cuotas ocultas por pedido, <strong>Bentian ERP Bridge</strong> conecta tu base de datos local de <strong>Factusol</strong> (así como <em>SimplyGest, Sage 50, Ágora POS y a3ERP</em>) directamente con <strong>PrestaShop 1.7 y PrestaShop 8.x</strong> utilizando el motor nativo de <strong>Webservices RESTful</strong> de PrestaShop. Sin instalar módulos pesados en tu hosting y sin abrir puertos en el router de tu empresa.
    </p>

    <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <strong class="text-white text-sm block mb-1">⚡ Prueba el Conector Factusol ↔ PrestaShop hoy mismo</strong>
        <span>Incluye Modo Evaluación con datos de prueba e integración nativa en el Paso 3 del Asistente de Configuración.</span>
      </div>
      <a href="/releases/latest/Bentian-Setup.exe" data-download-installer class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold whitespace-nowrap transition shadow-lg shadow-indigo-600/20">
        Descargar Agente Oficial (<span data-app-version>Última Versión</span>)
      </a>
    </div>

    <h2 id="comparativa-modulos-addons" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Conector Nativo Webservice vs Módulos de PrestaShop Addons</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Los módulos tradicionales para conectar PrestaShop con Factusol suelen costar entre 250 € y 450 € de alta más renovaciones de soporte, se instalan dentro de la carpeta <code class="text-zinc-200">/modules/</code> de tu tienda y ejecutan pesadas tareas cron en PHP que agotan la memoria del servidor (errores 500 / 504 Gateway Timeout). Bentian resuelve este problema de raíz:
    </p>
    <div class="overflow-x-auto mb-8">
      <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
        <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
          <tr>
            <th class="px-4 py-2.5">Característica Técnica</th>
            <th class="px-4 py-2.5 text-emerald-400">Bentian ERP Bridge (Webservice Nativo)</th>
            <th class="px-4 py-2.5 text-zinc-400">Módulos PHP Tradicionales (Addons)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.06] text-zinc-300">
          <tr>
            <td class="px-4 py-2.5 font-semibold text-white">Instalación en PrestaShop</td>
            <td class="px-4 py-2.5 text-emerald-300">0 módulos (usa la API oficial integrada en PrestaShop)</td>
            <td class="px-4 py-2.5 text-zinc-400">Requiere instalar plugin PHP y overrides en el servidor</td>
          </tr>
          <tr>
            <td class="px-4 py-2.5 font-semibold text-white">Impacto en PHP / Hosting</td>
            <td class="px-4 py-2.5 text-emerald-300">Mínimo (solo actualiza SKUs cuyo stock ha cambiado)</td>
            <td class="px-4 py-2.5 text-zinc-400">Alto (volcados masivos CSV/XML que bloquean MySQL)</td>
          </tr>
          <tr>
            <td class="px-4 py-2.5 font-semibold text-white">Seguridad de Red</td>
            <td class="px-4 py-2.5 text-emerald-300">100% Tráfico HTTPS saliente (0 puertos abiertos en el router)</td>
            <td class="px-4 py-2.5 text-zinc-400">Suele requerir abrir puertos o subir el archivo .accdb por FTP</td>
          </tr>
          <tr>
            <td class="px-4 py-2.5 font-semibold text-white">Compatibilidad PHP 8.1 / 8.2</td>
            <td class="px-4 py-2.5 text-emerald-300">Total en PrestaShop 1.7.x y PrestaShop 8.x</td>
            <td class="px-4 py-2.5 text-zinc-400">Frecuentes roturas al actualizar versión de PrestaShop</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 id="mapeo-tablas-factusol-prestashop" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Mapeo Técnico de Tablas: Factusol (.accdb) ↔ PrestaShop API</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      El motor de sincronización (<code class="text-indigo-300 font-mono">PrestashopSyncHelper</code>) enlaza de forma bidireccional las tablas relacionales de Factusol con las entidades del Webservice de PrestaShop:
    </p>
    <div class="overflow-x-auto mb-8">
      <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
        <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
          <tr>
            <th class="px-4 py-2.5">Entidad</th>
            <th class="px-4 py-2.5">Tabla / Campo en Factusol</th>
            <th class="px-4 py-2.5">Recurso en PrestaShop API</th>
            <th class="px-4 py-2.5">Dirección y Comportamiento</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.06] text-zinc-400">
          <tr>
            <td class="px-4 py-2 text-white font-sans font-semibold">Referencia / SKU</td>
            <td class="px-4 py-2 text-indigo-300">F_ART.CODART / F_STO.CODSTO</td>
            <td class="px-4 py-2 text-emerald-300">products.reference / combinations.reference</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Clave unívoca de cruce (normalizada en mayúsculas).</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-semibold">Stock Disponible</td>
            <td class="px-4 py-2 text-indigo-300">F_STO.DISSTO (ACTSTO - PENPCL)</td>
            <td class="px-4 py-2 text-emerald-300">PUT /api/stock_availables/{id}</td>
            <td class="px-4 py-2 font-sans text-zinc-300">ERP → PrestaShop con dirty-checking en tiempo real.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-semibold">Cabecera Pedido</td>
            <td class="px-4 py-2 text-indigo-300">F_PCL (TIPPCL, CODPCL, TOTPCL)</td>
            <td class="px-4 py-2 text-emerald-300">GET /api/orders?display=full</td>
            <td class="px-4 py-2 font-sans text-zinc-300">PrestaShop → ERP con idempotencia anti-duplicados.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-semibold">Líneas Pedido</td>
            <td class="px-4 py-2 text-indigo-300">F_LPC (ARTLPC, CANLPC, PRELPC)</td>
            <td class="px-4 py-2 text-emerald-300">orders.associations.order_rows</td>
            <td class="px-4 py-2 font-sans text-zinc-300">PrestaShop → ERP con desglose de base imponible e IVA.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 id="activar-webservices" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Paso 1: Activar el Servicio Web en el Backoffice de PrestaShop</h2>
    <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
      <li>Accede al panel de administración (Backoffice) de tu tienda PrestaShop 1.7 u 8.x.</li>
      <li>En el menú lateral izquierdo, dirígete a <strong class="text-white">Parámetros avanzados → Webservice (Servicio web)</strong>.</li>
      <li>En el bloque <em>Configuración</em>, activa la opción <strong class="text-emerald-400">Activar el servicio web de PrestaShop: SÍ</strong> y pulsa <strong>Guardar</strong>.</li>
    </ol>

    <h2 id="recursos-necesarios" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Paso 2: Clave de 32 Caracteres y Permisos (GET / POST / PUT)</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Haz clic en el botón superior <strong class="text-indigo-400">Añadir una nueva clave de servicio web</strong>, pulsa en <em>Generar</em> para crear tu clave de 32 caracteres alfanuméricos y marca los siguientes permisos en la matriz de recursos:
    </p>
    <div class="overflow-x-auto mb-6">
      <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
        <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
          <tr>
            <th class="px-4 py-2.5">Recurso</th>
            <th class="px-4 py-2.5">GET (Ver)</th>
            <th class="px-4 py-2.5">POST (Crear)</th>
            <th class="px-4 py-2.5">PUT (Modificar)</th>
            <th class="px-4 py-2.5 font-sans">Propósito en el Conector</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.06] text-zinc-400">
          <tr>
            <td class="px-4 py-2 text-white font-bold">products</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Mapear referencias (<code class="text-zinc-200">reference</code>) con códigos de Factusol.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-bold">combinations</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 text-zinc-600">-</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Sincronizar stock de variantes (tallas, colores, medidas).</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-bold">stock_availables</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 text-zinc-600">-</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Actualizar cantidades disponibles en tiempo real mediante XML PUT.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-bold">orders / order_details</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 text-zinc-600">-</td>
            <td class="px-4 py-2 text-emerald-400">✓</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Descargar pedidos validados e inyectarlos en <code class="text-zinc-200">F_PCL</code> y <code class="text-zinc-200">F_LPC</code>.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 id="combinaciones-y-dissto" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Combinaciones (Tallas/Colores) y Stock Real Disponible (DISSTO)</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-6">
      En PrestaShop, las existencias tanto de un producto simple (<code class="text-zinc-200 font-mono">id_product_attribute = 0</code>) como de sus combinaciones (<code class="text-zinc-200 font-mono">id_product_attribute &gt; 0</code>) se almacenan en el recurso <code class="text-indigo-300 font-mono">stock_availables</code>. Bentian resuelve automáticamente el SKU de cada combinación y actualiza su cantidad exacta tomando el campo <code class="text-emerald-400 font-mono">DISSTO</code> de tu almacén configurado (por defecto <code class="text-zinc-200 font-mono">GEN</code>).
    </p>

    <h2 id="configuracion-bentian" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Paso 3: Vincular PrestaShop en el Asistente de Bentian ERP Bridge</h2>
    <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-8">
      <li>Abre el panel local de Bentian (<code class="text-zinc-200 font-mono">http://127.0.0.1:39281</code>) y dirígete al <strong>Paso 3 del Asistente</strong> o a la pestaña <strong>Canal Web</strong>.</li>
      <li>Selecciona la tarjeta <strong class="text-white">PrestaShop 1.7 / 8.x</strong>.</li>
      <li>Introduce la URL de tu tienda (ej: <code class="text-zinc-200">https://www.mitienda.es</code>) y pega tu clave Webservice de 32 caracteres.</li>
      <li>Pulsa en <strong class="text-indigo-400">Comprobar Conexión PrestaShop</strong>: el agente verificará en tiempo real el servidor, el certificado SSL, la respuesta JSON del Webservice y los permisos sobre <code class="text-zinc-200">products</code>, <code class="text-zinc-200">stock_availables</code> y <code class="text-zinc-200">orders</code>.</li>
    </ol>

    <h2 id="preguntas-frecuentes-prestashop" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">7. Preguntas Frecuentes (FAQ): Factusol y PrestaShop</h2>
    <div class="space-y-4 mb-6">
      <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
        <h3 class="text-sm font-bold text-white mb-1">¿Necesito comprar o instalar algún módulo en PrestaShop para conectarlo con Factusol?</h3>
        <p class="text-xs text-zinc-300 leading-relaxed">No. Bentian ERP Bridge se conecta directamente a la API RESTful nativa de PrestaShop (Parámetros Avanzados → Webservice) incluida de serie en PrestaShop 1.7 y PrestaShop 8.x. Evitas instalar módulos de terceros que ralentizan el servidor PHP o rompen actualizaciones.</p>
      </div>
      <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
        <h3 class="text-sm font-bold text-white mb-1">¿Cómo sincroniza el conector Factusol PrestaShop el stock para evitar sobreventas?</h3>
        <p class="text-xs text-zinc-300 leading-relaxed">El agente calcula el stock disponible real en Factusol (<code class="text-indigo-300">DISSTO = ACTSTO - PENPCL</code> en la tabla <code class="text-indigo-300">F_STO</code>) y actualiza únicamente los recursos <code class="text-emerald-300">stock_availables</code> cuyo stock ha variado (dirty-checking) mediante peticiones PUT autenticadas.</p>
      </div>
      <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
        <h3 class="text-sm font-bold text-white mb-1">¿Es compatible con combinaciones de productos (tallas, colores, formatos) en PrestaShop?</h3>
        <p class="text-xs text-zinc-300 leading-relaxed">Sí. Bentian cruza tanto las referencias de productos simples (<code class="text-zinc-200">/api/products</code>) como las referencias específicas de cada combinación (<code class="text-zinc-200">/api/combinations</code>) con el código de artículo (<code class="text-zinc-200">CODART / CODSTO</code>) de tu ERP.</p>
      </div>
      <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
        <h3 class="text-sm font-bold text-white mb-1">¿Funciona también con SimplyGest, Sage 50, Ágora POS o a3ERP además de Factusol?</h3>
        <p class="text-xs text-zinc-300 leading-relaxed">Sí. Gracias a la arquitectura polimórfica Multi-ERP de Bentian, el mismo canal de PrestaShop sincroniza stock y pedidos contra Factusol (<code class="text-zinc-200">.accdb</code>), SimplyGest (<code class="text-zinc-200">Datos.mdb</code>), Sage 50, Ágora POS y Wolters Kluwer a3ERP.</p>
      </div>
    </div>
  `,
};
