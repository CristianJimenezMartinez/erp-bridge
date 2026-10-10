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
    subtitle: 'Delimitación rigurosa del ciclo de vida del pedido en 4 fases: retención web, recuperación, custodia SQLite (WAL) e inyección en Factusol.',
    badge: 'Resiliencia Transaccional',
    readingTime: '6 min de lectura',
    metaTitle: 'Cola SQLite Store-and-Forward para Factusol | Bentian ERP Bridge',
    metaDescription: 'Cómo funciona la arquitectura Store-and-Forward de Bentian: delimitación técnica en 4 fases, retención web con PC apagado, custodia SQLite (WAL) e inyección en Factusol.',
    keywords: 'store and forward factusol, cola sqlite pedidos factusol, ciclo de vida pedidos factusol, pc almacen apagado pedidos web, resiliencia pedidos erp bridge, wal sqlite factusol',
    toc: [
      { id: 'el-problema-del-pc-apagado', label: '1. La Realidad Operativa: El PC del Almacén se Apaga', level: 2 },
      { id: 'delimitacion-4-fases', label: '2. Delimitación Rigurosa del Ciclo de Vida en 4 Fases', level: 2 },
      { id: 'fase-1-tienda-online', label: '3. Fase 1: Retención Inmutable en la Tienda Online (PC Apagado)', level: 2 },
      { id: 'fase-2-descarga-agente', label: '4. Fase 2: Recuperación Automática por el Agente (Arranque y Polling)', level: 2 },
      { id: 'fase-3-custodia-sqlite', label: '5. Fase 3: Custodia en Cola Local SQLite (Modo WAL)', level: 2 },
      { id: 'fase-4-inyeccion-factusol', label: '6. Fase 4: Inyección Atómica en Factusol y Confirmación ACK', level: 2 },
      { id: 'tolerancia-bloqueos', label: '7. Tolerancia a Bloqueos (.laccdb) y Reintentos Exponenciales', level: 2 },
      { id: 'garantia-idempotencia', label: '8. Garantía de Entrega e Idempotencia Extremo a Extremo', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        En un entorno empresarial real, los ordenadores del almacén o de administración se apagan al terminar la jornada (19:00 PM), los fines de semana se interrumpe el suministro eléctrico en el polígono industrial y las líneas de fibra sufren microcortes transitorios. La arquitectura <strong>Store-and-Forward (Almacenar y Reenviar)</strong> de Bentian ERP Bridge es el patrón de ingeniería distribuida diseñado para garantizar que <strong>ningún pedido web se pierda jamás</strong>, independientemente del estado físico del hardware local.
      </p>

      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed mb-6">
        <strong class="text-white font-semibold block mb-1">Aclaración Mandataria de Arquitectura:</strong>
        Si el ordenador del almacén está físicamente apagado, ningún software local puede ejecutar instrucciones ni capturar datos directamente. La promesa técnica de Bentian radica en una <strong>arquitectura de custodia desacoplada en dos niveles</strong>: los pedidos permanecen disponibles y seguros en la base de datos de la tienda online mientras el PC permanezca inactivo; en el instante en que el agente vuelve a estar operativo, recupera los pedidos automáticamente y los custodia en su cola local SQLite transaccional, blindando su posterior inyección en Factusol aunque la base de datos esté temporalmente bloqueada o la tienda web sufra una caída posterior.
      </div>

      <h2 id="el-problema-del-pc-apagado" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. La Realidad Operativa: El PC del Almacén se Apaga</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Los conectores síncronos tradicionales cometen el error crítico de intentar escribir directamente en el ERP en el mismo milisegundo en que el cliente pulsa <em>"Finalizar compra"</em> en el checkout web. Si en ese instante:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
        <li>El ordenador del almacén está apagado por ser domingo por la tarde o festivo,</li>
        <li>Un operario ha reiniciado el switch o router de la red de área local (LAN), o</li>
        <li>La línea de Internet del almacén sufre un microcorte transitorio de DNS o fibra óptica,</li>
      </ul>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        el webhook síncrono del conector tradicional arroja un error <code>504 Gateway Timeout</code> o <code>Connection Refused</code>. Como resultado, el pedido queda huérfano en la tienda online sin registrarse en Factusol, obligando a los administrativos a revisar albarán por albarán cada lunes por la mañana.
      </p>

      <h2 id="delimitacion-4-fases" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Delimitación Rigurosa del Ciclo de Vida en 4 Fases</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para solucionar este problema de raíz, Bentian divide el ciclo de vida del pedido en cuatro fases estrictamente delimitadas e independientes:
      </p>

      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
            <tr>
              <th class="px-4 py-2.5 font-semibold">Fase</th>
              <th class="px-4 py-2.5 font-semibold">Ubicación del Dato</th>
              <th class="px-4 py-2.5 font-semibold">Estado del Pedido</th>
              <th class="px-4 py-2.5 font-semibold">Garantía Operativa</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2 text-white font-bold font-sans">Fase 1: Tienda Online</td>
              <td class="px-4 py-2 text-indigo-300">Base de Datos Web (Cloud / Hosting)</td>
              <td class="px-4 py-2 text-amber-400">PENDING (En espera)</td>
              <td class="px-4 py-2 font-sans text-zinc-300">Retención inmutable en servidor web. Seguro aunque el PC esté apagado.</td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-white font-bold font-sans">Fase 2: Descarga Agente</td>
              <td class="px-4 py-2 text-indigo-300">Canal Seguro HTTPS (TLS 1.3)</td>
              <td class="px-4 py-2 text-cyan-400">DOWNLOADING</td>
              <td class="px-4 py-2 font-sans text-zinc-300">Descarga automática al encender el PC o en ciclo programado de polling.</td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-white font-bold font-sans">Fase 3: Custodia SQLite</td>
              <td class="px-4 py-2 text-indigo-300">%APPDATA%\\Bentian Agent\\queue.db</td>
              <td class="px-4 py-2 text-emerald-400 font-bold">QUEUED (Custodiado)</td>
              <td class="px-4 py-2 font-sans text-zinc-300">Persistencia local con WAL mode. Cero pérdida ante caídas de red o bloqueos.</td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-white font-bold font-sans">Fase 4: Inyección ERP</td>
              <td class="px-4 py-2 text-indigo-300">Factusol OLEDB (F_PCL / F_LPC)</td>
              <td class="px-4 py-2 text-emerald-300">SYNCED (Confirmado)</td>
              <td class="px-4 py-2 font-sans text-zinc-300">Transacción relacional atómica y confirmación ACK bidireccional a la web.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-center my-6">
        [ Fase 1: Web Hosting ] ──(HTTPS Poll / Fase 2)──▶ [ Fase 3: SQLite WAL Local ] ──(Transacción OLEDB)──▶ [ Fase 4: Factusol F_PCL ]
        <div class="text-[10px] text-emerald-400 mt-2">▲ Retención en Web (PC Apagado) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ▲ Blindaje Local Offline en Disco &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ▲ Inyección & Flujo ACK</div>
      </div>

      <h2 id="fase-1-tienda-online" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Fase 1: Retención Inmutable en la Tienda Online (PC Apagado)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Durante la noche o durante el fin de semana, los clientes realizan compras en WooCommerce, PrestaShop o tu tienda personalizada. La tienda web procesa los pagos con tarjeta o transferencia y registra el pedido en su propia base de datos (tablas <code>wp_posts</code> / HPOS <code>_wc_orders</code> en WordPress, <code>ps_orders</code> en PrestaShop, o <code>eb_orders</code> en el Endpoint Universal) marcando su estado como <strong>PENDING</strong> o <strong>processing</strong>.
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        En este punto, la tienda web actúa como el primer buffer de retención. No requiere que el ordenador del almacén esté encendido ni que la base de datos de Factusol esté accesible. La información del pedido, las direcciones de envío y los totales fiscales están perfectamente seguros en el servidor web.
      </p>

      <h2 id="fase-2-descarga-agente" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Fase 2: Recuperación Automática por el Agente (Arranque y Polling)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando el personal del almacén enciende el ordenador o el servidor local, el agente de Bentian se inicia automáticamente como servicio o proceso en segundo plano con Windows. Inmediatamente ejecuta su ciclo de sondeo (*polling*) saliente mediante peticiones HTTPS autenticadas:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
        <li><strong>Detección secuencial:</strong> Consulta la API de la tienda solicitando todos los pedidos con estado <code>PENDING</code>.</li>
        <li><strong>Descarga en bloques seguros:</strong> Recupera los pedidos en lotes controlados (de 50 en 50, máx. 200) para no sobrecargar el servidor web ni la memoria local.</li>
        <li><strong>Validación sintáctica:</strong> Verifica la integridad del JSON entrante (cabecera, cliente, NIF/CIF y líneas con precios sin IVA y tipos impositivos).</li>
      </ul>

      <h2 id="fase-3-custodia-sqlite" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Fase 3: Custodia en Cola Local SQLite (Modo WAL)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En cuanto los pedidos se descargan por HTTPS, el agente <strong>NO</strong> intenta grabarlos directamente en Factusol. Los inserta de inmediato en su motor local transaccional SQLite:
      </p>
      <div class="p-3 rounded-lg bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 mb-4">
        Ruta inmutable: %APPDATA%\\Bentian Agent\\queue.db
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Este almacenamiento se configura en modo <strong>Write-Ahead Logging (WAL)</strong> (<code>PRAGMA journal_mode=WAL</code>; <code>PRAGMA synchronous=NORMAL</code>), garantizando:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Inmunidad ante caídas de Internet:</strong> Si la fibra óptica se corta un segundo después de descargar el pedido, el dato ya reside en el disco NVMe/SSD local. No se perderá aunque el almacén quede incomunicado.</li>
        <li><strong>Inmunidad ante caídas de la tienda web:</strong> Si el servidor de la tienda online sufre un reinicio o mantenimiento en la nube, el agente puede seguir trabajando con los pedidos ya custodiados.</li>
        <li><strong>Concurrencia libre de bloqueos:</strong> El modo WAL permite lecturas continuas desde la interfaz gráfica del agente mientras el motor de sincronización escribe pedidos en disco sin cuellos de botella.</li>
      </ul>

      <h2 id="fase-4-inyeccion-factusol" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Fase 4: Inyección Atómica en Factusol y Confirmación ACK</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Con el pedido custodiado en SQLite, el motor <code>LocalSyncEngine</code> procede a su inyección en la base de datos de Factusol (<code>.accdb</code>):
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li><strong>Apertura de Transacción OLEDB:</strong> Se inicia una transacción atómica agrupada (<code>BeginTrans</code>) en el motor OLEDB de 32 bits de Microsoft ACE.</li>
        <li><strong>Resolución de Cliente:</strong> Se busca la ficha del cliente por CIF/NIF en <code>F_CLI</code>. Si no existe, se crea automáticamente una nueva ficha con su código de provincia, tarifa y datos de contacto.</li>
        <li><strong>Inserción de Cabecera (F_PCL):</strong> Se obtiene el siguiente número correlativo disponible para la serie seleccionada (ej. serie <em>"1"</em> o <em>"W"</em>) y se inserta el registro del pedido con sus totales netos, brutos y fecha.</li>
        <li><strong>Inserción de Líneas (F_LPC):</strong> Se insertan secuencialmente todas las líneas de productos con sus códigos de artículo (<code>ARTLPC</code>), descripción, cantidad, precio unitario sin IVA y porcentaje de recargo si procede.</li>
        <li><strong>Commit Transaccional:</strong> Si todas las líneas se escriben correctamente, se ejecuta <code>CommitTrans</code>. Si ocurriera cualquier error, se ejecuta <code>RollbackTrans</code>, dejando Factusol intacto.</li>
        <li><strong>Confirmación ACK a la Tienda Online:</strong> Tras el commit exitoso, el agente envía una llamada de confirmación (flujo ACK) a la tienda web, informando del número de pedido asignado por Factusol y marcando el pedido web como <strong>SYNCED</strong>.</li>
      </ol>

      <h2 id="tolerancia-bloqueos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">7. Tolerancia a Bloqueos (.laccdb) y Reintentos Exponenciales</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        ¿Qué ocurre si un operario del almacén está realizando un balance contable, una regeneración de stock o una copia de seguridad en Factusol y bloquea la tabla en modo exclusivo (error <code>3045 / Could not use; file already in use</code>)?
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Un conector síncrono colapsaría. Bentian, en cambio, mantiene el pedido en estado <code>PENDING_INJECTION</code> en su cola SQLite y aplica un algoritmo de <strong>retroceso exponencial (*exponential backoff*) con jitter aleatorio</strong>:
      </p>
      <div class="p-3 rounded-lg bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-400 mb-6">
        Intento 1: Inmediato ──▶ Intento 2: 5 seg ──▶ Intento 3: 15 seg ──▶ Intento 4: 45 seg ──▶ Intento 5: 2 min...
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        En cuanto el operario termina su tarea en Factusol y el archivo <code>.laccdb</code> se desbloquea, el agente inserta los pedidos de la cola de forma ordenada y cronológica en cuestión de milisegundos.
      </p>

      <h2 id="garantia-idempotencia" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">8. Garantía de Entrega e Idempotencia Extremo a Extremo</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La cola SQLite local incorpora una restricción de unicidad primaria sobre el identificador original del pedido web (<code>web_order_id</code>). Esta salvaguarda garantiza la propiedad de <strong>idempotencia estricta</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Fallo de red durante el ACK:</strong> Si el agente inyecta el pedido en Factusol pero la llamada de confirmación ACK a la tienda online falla por un timeout de red, la tienda web mantendrá el pedido como <code>PENDING</code>. En el siguiente ciclo de polling, la tienda volverá a enviar el mismo pedido al agente.</li>
        <li><strong>Detección de duplicado en SQLite:</strong> El agente detecta que el <code>web_order_id</code> ya existe en su cola local en estado <code>SYNCED</code> con su número de Factusol asignado. <strong>El agente jamás reinserta el pedido en Factusol</strong>, evitando duplicaciones de albarán o descuadres de inventario. En su lugar, reenvía inmediatamente la confirmación ACK a la tienda web para sincronizar su estado.</li>
      </ul>
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
  {
    slug: 'arquitectura/arquitectura-tripartita',
    categorySlug: 'arquitectura',
    title: 'Arquitectura Tripartita: Tienda Online + Almacén Local + Facturación Cloud',
    subtitle: 'Patrón de ingeniería empresarial para sincronizar Shopify/WooCommerce, almacén físico Factusol y facturación contable en Holded sin fricciones ni duplicidades.',
    badge: 'Patrón Enterprise Tripartito',
    readingTime: '7 min de lectura',
    metaTitle: 'Arquitectura Tripartita: Shopify + Factusol + Holded ERP | Bentian',
    metaDescription: 'Guía completa de la arquitectura tripartita: conecta tu tienda online (Shopify), tu almacén físico (Factusol) y tu facturación cloud (Holded) con cero errores y sincronización en tiempo real.',
    keywords: 'arquitectura tripartita shopify factusol holded, facturacion holded pedidos shopify factusol, conectar tienda online almacen fisico gestoria nube, sincronizar shopify factusol holded, flujo pedidos ecommerce almacen erp cloud, automatizar facturas holded pedidos factusol',
    toc: [
      { id: 'el-reto-omnicanal', label: '1. El Reto Omnicanal: Ventas Web, Almacén Físico y Gestoría Cloud', level: 2 },
      { id: 'diagrama-flujo-tripartito', label: '2. Diagrama de Flujo Extremo a Extremo', level: 2 },
      { id: 'fase-1-venta-checkout', label: '3. Fase 1 (Venta): Ingesta Reactiva del Pedido Web (Shopify)', level: 2 },
      { id: 'fase-2-operaciones-almacen', label: '4. Fase 2 (Operaciones): Inyección Atómica en Factusol y Stock', level: 2 },
      { id: 'fase-3-contabilidad-holded', label: '5. Fase 3 (Contabilidad): Emisión Fiscal Automatizada en Holded', level: 2 },
      { id: 'resiliencia-desacoplada', label: '6. Resiliencia Desacoplada ante Cortes y PC Apagado', level: 2 },
      { id: 'beneficios-roi', label: '7. Beneficios: Ahorro de 15h/semana y Cumplimiento Veri*Factu', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        La mayoría de empresas comerciales en España operan hoy con un ecosistema híbrido: venden online en plataformas líderes como <strong>Shopify</strong> o <strong>WooCommerce</strong>, gestionan la logística, compras y almacén físico en <strong>Factusol</strong> en sus servidores locales de empresa, y coordinan la contabilidad, impuestos y facturación electrónica con su gestoría a través de <strong>Holded Cloud ERP</strong>. La <strong>Arquitectura Tripartita de Bentian ERP Bridge</strong> es el patrón de ingeniería distribuida que sincroniza estos tres pilares en un ciclo continuo, automatizado y a prueba de fallos.
      </p>

      <h2 id="el-reto-omnicanal" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Reto Omnicanal: Ventas Web, Almacén Físico y Gestoría Cloud</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando estos tres sistemas funcionan de forma desconectada, surgen fricciones críticas que frenan el crecimiento del negocio:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Roturas de stock y sobreventas:</strong> Si un producto se vende en la tienda física de mostrador a las 11:00 y alguien lo compra en Shopify a las 11:05 porque el inventario no se actualizó, la empresa debe cancelar el pedido y sufrir daño reputacional.</li>
        <li><strong>Doble entrada administrativa de pedidos:</strong> El personal de administración tiene que transcribir los pedidos de Shopify albarán por albarán en Factusol, y posteriormente volver a crear la factura en Holded para enviársela a la gestoría.</li>
        <li><strong>Descuadres en el modelo 303 de IVA:</strong> Desfases entre las fechas de pedido de la tienda web y las fechas de facturación en la nube, provocando discrepancias tributarias con la AEAT.</li>
      </ul>

      <h2 id="diagrama-flujo-tripartito" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Diagrama de Flujo Extremo a Extremo</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian orquesta el flujo de información de forma completamente desacoplada y orientada a eventos:
      </p>
      <div class="p-5 rounded-2xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-center my-6 space-y-3">
        <div class="text-emerald-400 font-bold text-sm">[ PASO 1: TIENDA ONLINE (Shopify / WooCommerce) ]</div>
        <div class="text-zinc-400">Cliente compra ➔ Pago confirmado ➔ Webhook TLS 1.3 con firma HMAC</div>
        <div class="text-indigo-400">▼ (Descarga en milisegundos a cola local SQLite)</div>
        <div class="text-emerald-400 font-bold text-sm">[ PASO 2: ALMACÉN LOCAL (Factusol ERP) ]</div>
        <div class="text-zinc-400">Ingesta atómica en F_PCL / F_LPC ➔ Reserva de stock DISSTO ➔ Impresión albarán picking</div>
        <div class="text-indigo-400">▼ (Confirmación ACK & Emisión contable cloud)</div>
        <div class="text-emerald-400 font-bold text-sm">[ PASO 3: GESTORÍA & CONTABILIDAD (Holded Cloud ERP) ]</div>
        <div class="text-zinc-400">Factura oficial generada ➔ Asiento en Libro Diario ➔ Sincronización bancaria y fiscal</div>
      </div>

      <h2 id="fase-1-venta-checkout" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Fase 1 (Venta): Ingesta Reactiva del Pedido Web (Shopify)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En cuanto el cliente finaliza la compra en Shopify:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
        <li>Shopify emite un webhook seguro <code class="text-indigo-300 font-mono">orders/create</code> con el payload del pedido.</li>
        <li>El agente de Bentian valida la firma criptográfica del header <code class="text-zinc-200 font-mono">X-Shopify-Hmac-Sha256</code> para garantizar autenticidad.</li>
        <li>Desglosa los importes brutos, netos, cuotas de IVA (21%, 10%, 4%) y Recargo de Equivalencia si el cliente es comerciante minorista.</li>
      </ul>

      <h2 id="fase-2-operaciones-almacen" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Fase 2 (Operaciones): Inyección Atómica en Factusol y Stock</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Sin que intervenga ningún usuario humano, el agente procesa el pedido en la red local de la empresa:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Abre una transacción atómica OLEDB sobre el archivo <code class="text-zinc-200 font-mono">.accdb</code> de Factusol.</li>
        <li>Crea o localiza la ficha del cliente en <code class="text-indigo-300 font-mono">F_CLI</code> por CIF o DNI.</li>
        <li>Inserta la cabecera del pedido en <code class="text-indigo-300 font-mono">F_PCL</code> y las líneas en <code class="text-indigo-300 font-mono">F_LPC</code>.</li>
        <li>Actualiza de inmediato las unidades pendientes de servir, recalculando el stock disponible (<code class="text-emerald-400 font-mono">DISSTO</code>).</li>
        <li>Los operarios del almacén ven el nuevo albarán en sus terminales locales para comenzar el picking de inmediato.</li>
      </ol>

      <h2 id="fase-3-contabilidad-holded" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Fase 3 (Contabilidad): Emisión Fiscal Automatizada en Holded</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Una vez confirmado el pedido en Factusol, Bentian contacta con la API REST de Holded:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
        <li>Crea la factura oficial de venta con la serie configurada (ej. serie <em>"SHOP"</em> o <em>"2026"</em>).</li>
        <li>Genera automáticamente el asiento contable en el libro diario de Holded vinculando la cuenta 430 del cliente con la 700 de ventas y 477 de IVA.</li>
        <li>Tu gestoría contable puede consultar en cualquier momento los libros de IVA actualizados en tiempo real para las liquidaciones trimestrales sin tener que pedirte extractos.</li>
      </ul>

      <h2 id="resiliencia-desacoplada" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Resiliencia Desacoplada ante Cortes y PC Apagado</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        ¿Qué ocurre si el almacén cierra a las 19:00 o se apaga el ordenador durante el fin de semana?
      </p>
      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6 leading-relaxed">
        <strong>Tolerancia Total a Fallos con Store-and-Forward:</strong> Los pedidos de Shopify quedan retenidos de forma segura en la nube de Shopify. El lunes por la mañana a las 08:00, al encender el PC del almacén, Bentian despierta, recupera todos los pedidos acumulados, los custodia en su cola SQLite local en milisegundos y procede a la inyección secuencial en Factusol y emisión en Holded. Cero pedidos perdidos, cero descuadres.
      </div>

      <h2 id="beneficios-roi" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">7. Beneficios: Ahorro de 15h/semana y Cumplimiento Veri*Factu</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Las empresas que han desplegado la arquitectura tripartita obtienen ventajas comerciales y operativas inmediatas:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Ahorro medio de 15 horas semanales</strong> de trabajo administrativo rutinario eliminando el picado manual de facturas y albaranes.</li>
        <li><strong>Eliminación del 100% de sobreventas</strong> gracias al cálculo matemático de existencias disponibles en menos de 3 segundos.</li>
        <li><strong>Cumplimiento normativo riguroso:</strong> Trazabilidad completa exigida por la Ley Antifraude y el reglamento Veri*Factu, con registros correlativos e inmutables.</li>
      </ul>
    `,
  },
];

