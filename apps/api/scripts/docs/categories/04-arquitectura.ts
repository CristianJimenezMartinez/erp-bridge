import { DocArticle } from '../types';

export const arquitecturaArticles: DocArticle[] = [
  {
    slug: 'arquitectura/arquitectura-local-first',
    categorySlug: 'arquitectura',
    title: 'Arquitectura Local-First y Privacidad de Datos',
    subtitle: 'Por qué la base de datos de Factusol nunca se sube a la nube de Bentian, cumplimiento estricto del RGPD y seguridad punto a punto.',
    badge: 'Arquitectura de Datos',
    readingTime: '4 min de lectura',
    metaTitle: 'Arquitectura Local-First de Bentian ERP Bridge | Privacidad Total',
    metaDescription: 'Por qué Bentian es 100% Local-First: tus datos de Factusol nunca salen de tu red local ni se copian en servidores de terceros. Cumplimiento RGPD nativo.',
    keywords: 'local first erp bridge, privacidad factusol, seguridad datos factusol, rgpd factusol nube, sincronizacion directa factusol woocommerce',
    toc: [
      { id: 'que-es-local-first', label: '1. ¿Qué es la Arquitectura Local-First?', level: 2 },
      { id: 'el-riesgo-nube-terceros', label: '2. El Riesgo de los Conectores Cloud Centralizados', level: 2 },
      { id: 'flujo-punto-a-punto', label: '3. Flujo de Sincronización Punto a Punto', level: 2 },
      { id: 'cumplimiento-rgpd', label: '4. Cumplimiento RGPD / GDPR Nativo', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        En un mundo donde la mayoría de soluciones exigen subir toda la base de datos de tu empresa a servidores ajenos en la nube, Bentian ERP Bridge adopta un principio de ingeniería innegociable: <strong>Arquitectura 100% Local-First</strong>.
      </p>

      <h2 id="que-es-local-first" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Qué es la Arquitectura Local-First?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Local-First significa que el ordenador de tu empresa es el propietario soberano y exclusivo de la información. Tu archivo de base de datos de Factusol (<code class="text-zinc-200">.accdb</code>), tus listas de precios de coste, los datos de facturación de tus clientes y tus márgenes comerciales <strong>permanecen siempre dentro de tu red local</strong>.
      </p>

      <h2 id="el-riesgo-nube-terceros" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. El Riesgo de los Conectores Cloud Centralizados</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Muchos conectores tradicionales operan copiando tu base de datos completa a un servidor intermedio en la nube para procesarla allí:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Riesgo de brecha de seguridad:</strong> Si el servidor de ese tercero sufre un ciberataque, todos los datos fiscales y comerciales de tu empresa quedan expuestos.</li>
        <li><strong>Dependencia operativa:</strong> Si la plataforma en la nube se cae o tiene cortes de servicio, tu tienda deja de sincronizar aunque tu ordenador y tu web funcionen perfectamente.</li>
        <li><strong>Latencia innecesaria:</strong> Subir y bajar megabytes de datos por Internet en cada ciclo satura la conexión del almacén.</li>
      </ul>

      <h2 id="flujo-punto-a-punto" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Flujo de Sincronización Punto a Punto</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Con Bentian, la sincronización se realiza <strong>punto a punto y en memoria</strong> directamente entre tu equipo de Factusol y tu tienda online mediante HTTPS / TLS 1.3:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-center my-6">
        [ PC Factusol (Almacén) ] ──(HTTPS Directo)──▶ [ Tu Tienda Online (WooCommerce / PrestaShop) ]
        <div class="text-[10px] text-emerald-400 mt-2">✓ Cero intermediarios · Cero copias de datos en la nube · Cero exposición</div>
      </div>

      <h2 id="cumplimiento-rgpd" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Cumplimiento RGPD / GDPR Nativo</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Dado que los servidores de Bentian no almacenan ni procesan datos personales de tus clientes finales (nombres, teléfonos, NIFs o direcciones), tu empresa no necesita formalizar contratos complejos de cesión internacional de datos ni declarar encargados de tratamiento en terceros países. El cumplimiento de la normativa europea de protección de datos es directo y transparente.
      </p>
    `,
  },
  {
    slug: 'arquitectura/cola-store-and-forward',
    categorySlug: 'arquitectura',
    title: 'Cola Desacoplada Store-and-Forward (SQLite)',
    subtitle: 'Cómo Bentian garantiza cero pérdida de pedidos cuando el PC del almacén está apagado o se corta la fibra óptica.',
    badge: 'Tolerancia a Fallos',
    readingTime: '5 min de lectura',
    metaTitle: 'Cola SQLite Store-and-Forward para Factusol | Bentian ERP',
    metaDescription: 'Cómo funciona la cola local Store-and-Forward de Bentian. Protección contra apagados de PC y cortes de fibra sin perder ventas online.',
    keywords: 'store and forward factusol, cola sqlite pedidos factusol, tolerancia caida internet factusol, pc almacen apagado pedidos web, cero perdidas pedidos',
    toc: [
      { id: 'el-problema-del-pc-apagado', label: '1. El Problema del PC del Almacén Apagado', level: 2 },
      { id: 'como-funciona-store-and-forward', label: '2. Principio de Operación Store-and-Forward', level: 2 },
      { id: 'persistencia-sqlite', label: '3. Almacenamiento Local en SQLite Transaccional', level: 2 },
      { id: 'reintentos-exponenciales', label: '4. Reintentos Exponenciales y Garantía de Entrega', level: 2 },
      { id: 'recuperacion-automatica', label: '5. Proceso de Recuperación al Volver la Conexión', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        En una empresa real, los ordenadores se apagan por la noche, los fines de semana se va la luz en el polígono industrial y los operadores de fibra sufren microcortes. La arquitectura <strong>Store-and-Forward (Almacenar y Reenviar)</strong> con base de datos local SQLite es el escudo de ingeniería que garantiza que ni un solo pedido se pierda jamás.
      </p>

      <h2 id="el-problema-del-pc-apagado" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Problema del PC del Almacén Apagado</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Los conectores síncronos sencillos intentan escribir directamente en Factusol en el mismo milisegundo en que el cliente pulsa <em>"Pagar"</em> en la web. Si en ese momento:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
        <li>El ordenador del almacén está apagado por ser domingo por la tarde,</li>
        <li>Un operario ha reiniciado el switch de red local, o</li>
        <li>El router tiene una avería temporal de fibra,</li>
      </ul>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        el conector falla con un error de red y el pedido se queda en el limbo, obligando al departamento de administración a buscar manualmente qué pedidos no se registraron en Factusol.
      </p>

      <h2 id="como-funciona-store-and-forward" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Principio de Operación Store-and-Forward</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian desacopla por completo la <strong>recepción</strong> del pedido de su <strong>inyección</strong> en Factusol:
      </p>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-2.5 font-semibold">Paso</th>
              <th class="px-4 py-2.5 font-semibold">Acción</th>
              <th class="px-4 py-2.5 font-semibold">Garantía</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2 font-mono text-emerald-400 font-bold">1. Captura</td>
              <td class="px-4 py-2 text-zinc-300">El pedido se descarga y se guarda de inmediato en la cola SQLite local en el disco.</td>
              <td class="px-4 py-2">Persistencia inmediata en disco duro con WAL mode (Write-Ahead Logging).</td>
            </tr>
            <tr>
              <td class="px-4 py-2 font-mono text-emerald-400 font-bold">2. Encolado</td>
              <td class="px-4 py-2 text-zinc-300">Si Factusol está disponible, se inyecta en <code class="font-mono">F_PCL</code> en &lt; 50 ms.</td>
              <td class="px-4 py-2">Transacción relacional atómica.</td>
            </tr>
            <tr>
              <td class="px-4 py-2 font-mono text-amber-400 font-bold">3. Reintento</td>
              <td class="px-4 py-2 text-zinc-300">Si la base de datos está bloqueada o apagada, el pedido permanece seguro en la cola local.</td>
              <td class="px-4 py-2 text-emerald-400">Cero pérdida de datos. Reintento automático en cuanto el sistema vuelve.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="persistencia-sqlite" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Almacenamiento Local en SQLite Transaccional</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La cola de pedidos se gestiona mediante un motor SQLite integrado compilado en el agente (<code class="text-indigo-300 font-mono">%APPDATA%\\Bentian Agent\\queue.db</code>). Este archivo dispone de índices por ID de pedido web y estado de sincronización (<code class="text-zinc-200">PENDING</code>, <code class="text-zinc-200">SYNCED</code>, <code class="text-zinc-200">FAILED</code>), evitando procesar pedidos duplicados gracias a claves de <strong>idempotencia</strong>.
      </p>

      <h2 id="reintentos-exponenciales" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Reintentos Exponenciales y Garantía de Entrega</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Ante cualquier fallo temporal (por ejemplo, otro usuario de Factusol abriendo la tabla en modo exclusivo durante un balance), el agente no colapsa: aplica un <strong>retroceso exponencial (*exponential backoff*)</strong>:
      </p>
      <div class="p-3 rounded-lg bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-400 mb-6">
        Reintento 1: 5 seg ──▶ Reintento 2: 15 seg ──▶ Reintento 3: 45 seg ──▶ Reintento 4: 2 min...
      </div>

      <h2 id="recuperacion-automatica" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Proceso de Recuperación al Volver la Conexión</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El lunes a las 08:00 AM, cuando el primer empleado enciende el ordenador del almacén, Bentian se inicia automáticamente con Windows, detecta los pedidos acumulados durante el fin de semana y los inserta de forma secuencial y ordenada en Factusol en cuestión de segundos.
      </p>
    `,
  },
  {
    slug: 'arquitectura/deteccion-tiempo-real',
    categorySlug: 'arquitectura',
    title: 'FileWatcher en Tiempo Real y Ciclos Incrementales',
    subtitle: 'Monitorización de cambios en .accdb sin polling pesado, debounce inteligente y reducción del 99% del tráfico de red.',
    badge: 'Rendimiento Extremo',
    readingTime: '4 min de lectura',
    metaTitle: 'FileWatcher en Tiempo Real para Factusol | Bentian ERP',
    metaDescription: 'Cómo monitoriza Bentian los cambios en Factusol en tiempo real mediante FileWatcher y debounce de 5s, reduciendo el 99% de transferencia innecesaria.',
    keywords: 'filewatcher factusol, cambios tiempo real factusol, debounce factusol bentian, sincronizacion incremental factusol, consumo cpu conector factusol',
    toc: [
      { id: 'el-error-del-polling-masivo', label: '1. El Error del Polling Masivo Continuo', level: 2 },
      { id: 'windows-filewatcher', label: '2. Monitor de Archivos de Windows (FileWatcher)', level: 2 },
      { id: 'debounce-inteligente', label: '3. El Algoritmo de Debounce (5 Segundos)', level: 2 },
      { id: 'ciclos-delta-incrementales', label: '4. Sincronización Delta Incremental', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Sincronizar miles de artículos y existencias requiere un equilibrio perfecto entre inmediatez y consumo de recursos. Consultar toda la base de datos de Factusol cada 10 segundos bloquea el ordenador; hacerlo una vez al día provoca que los clientes compren productos agotados. Bentian resuelve este dilema combinando <strong>FileWatcher de Windows</strong> con <strong>algoritmo de debounce inteligente</strong>.
      </p>

      <h2 id="el-error-del-polling-masivo" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Error del Polling Masivo Continuo</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Los scripts antiguos ejecutan consultas SQL completas (<code class="text-rose-400 font-mono">SELECT * FROM F_ART</code>) en bucle. Si tu empresa tiene 25.000 artículos, cada ciclo lee 15 MB de datos, consume el 100% de un núcleo de CPU y ralentiza a los dependientes que están cobrando en el mostrador.
      </p>

      <h2 id="windows-filewatcher" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Monitor de Archivos de Windows (FileWatcher)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian utiliza las APIs nativas del sistema de archivos NTFS de Windows (<code class="text-indigo-300 font-mono">ReadDirectoryChangesW</code>). El agente no realiza consultas constantes a ciegas: se suscribe a los eventos del kernel del sistema operativo y <strong>solo despierta cuando el archivo de Factusol recibe una escritura física</strong>.
      </p>

      <h2 id="debounce-inteligente" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. El Algoritmo de Debounce (5 Segundos)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando un usuario guarda un albarán con 20 líneas en Factusol, el archivo <code class="text-zinc-200">.accdb</code> recibe docenas de modificaciones por segundo. Si el conector reaccionara a cada una, colapsaría la cola.
      </p>
      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6">
        <strong>Filtro de Debounce de 5 Segundos:</strong> Cuando se detecta un cambio en disco, Bentian inicia una cuenta atrás de 5 segundos. Si durante ese lapso se producen nuevos cambios (por ejemplo, el operario sigue añadiendo líneas al albarán), el contador se reinicia. En cuanto el archivo queda en reposo, se dispara <strong>una única lectura consolidada</strong> en memoria.
      </div>

      <h2 id="ciclos-delta-incrementales" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Sincronización Delta Incremental</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian mantiene en su base de datos local un hash SHA-256 del estado de cada artículo y su stock. En cada ciclo, compara el nuevo cálculo con el previo y <strong>solo transmite a tu tienda online los productos que han cambiado realmente</strong>. Esto reduce en más de un 99% el ancho de banda transferido y permite sincronizar catálogos de 50.000 referencias en apenas 40 milisegundos.
      </p>
    `,
  },
];
