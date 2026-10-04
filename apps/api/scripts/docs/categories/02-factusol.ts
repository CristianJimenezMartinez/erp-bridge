import { DocArticle } from '../types';

export const factusolArticles: DocArticle[] = [
  {
    slug: 'factusol/localizacion-base-datos',
    categorySlug: 'factusol',
    title: 'Localización de la Base de Datos de Factusol (.accdb y .mdb)',
    subtitle: 'Estructura de carpetas de Software DELSOL, nomenclatura de empresas (FS / FOP / FCL) y formato de archivos Microsoft Access.',
    badge: 'Arquitectura Factusol',
    readingTime: '5 min de lectura',
    metaTitle: 'Dónde está la Base de Datos de Factusol (.accdb) | Bentian ERP',
    metaDescription: 'Cómo localizar la base de datos de Factusol en disco local o red. Estructura de carpetas FS, códigos de empresa y archivos .accdb y .mdb.',
    keywords: 'donde esta base datos factusol, ruta base de datos factusol, accdb factusol, software delsol datos fs, estructura base datos factusol',
    toc: [
      { id: 'ruta-estandar', label: '1. Ruta Estándar de Instalación', level: 2 },
      { id: 'nomenclatura-archivos', label: '2. Nomenclatura del Archivo de Empresa', level: 2 },
      { id: 'tablas-generales-vs-empresa', label: '3. Tablas Generales vs Tablas de Empresa', level: 2 },
      { id: 'accdb-vs-mdb', label: '4. Formato .accdb vs .mdb Heredado', level: 2 },
      { id: 'selector-nativo', label: '5. Selección con el Selector Nativo de Bentian', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Factusol almacena toda la información comercial y contable en bases de datos relacionales basadas en Microsoft Access. Para que Bentian ERP Bridge pueda sincronizar el catálogo y descargar pedidos, es necesario indicarle la ruta exacta al archivo de la empresa que se desea vincular.
      </p>

      <h2 id="ruta-estandar" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Ruta Estándar de Instalación</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Por defecto, el instalador oficial de Software DELSOL sitúa los datos en una de las siguientes rutas en el disco <code class="text-indigo-300 font-mono">C:</code>:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono space-y-1.5 text-zinc-300 mb-6">
        <div><strong class="text-indigo-400">Instalaciones recientes (Factusol 2020 a 2026):</strong></div>
        <div class="text-emerald-300">C:\\Software DELSOL\\Factusol\\Datos\\FS\\0012026.accdb</div>
        <div class="text-zinc-500">C:\\Software DELSOL\\Factusol\\Datos\\FS\\&lt;CODIGO_EMPRESA&gt;&lt;EJERCICIO&gt;.accdb</div>
        <div class="pt-2"><strong class="text-amber-400">Instalaciones clásicas o heredadas:</strong></div>
        <div class="text-zinc-400">C:\\Archivos de programa (x86)\\Software DELSOL\\Factusol\\Datos\\FS\\...</div>
      </div>

      <h2 id="nomenclatura-archivos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Nomenclatura del Archivo de Empresa</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El nombre del archivo de base de datos sigue una convención estricta de 7 caracteres:
      </p>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Ejemplo</th>
              <th class="px-4 py-3 font-semibold">Código Empresa (3 dígitos)</th>
              <th class="px-4 py-3 font-semibold">Ejercicio Fiscal (4 dígitos)</th>
              <th class="px-4 py-3 font-semibold">Significado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">0012026.accdb</td>
              <td class="px-4 py-2.5 font-mono">001</td>
              <td class="px-4 py-2.5 font-mono">2026</td>
              <td class="px-4 py-2.5 text-zinc-300">Empresa número 1, ejercicio fiscal año 2026.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">0022025.accdb</td>
              <td class="px-4 py-2.5 font-mono">002</td>
              <td class="px-4 py-2.5 font-mono">2025</td>
              <td class="px-4 py-2.5 text-zinc-300">Empresa número 2, ejercicio fiscal año 2025.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="tablas-generales-vs-empresa" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Tablas Generales vs Tablas de Empresa</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Dentro del directorio de Factusol conviven dos tipos de bases de datos:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Base de datos general (<code class="text-zinc-200">FS.accdb</code> o <code class="text-zinc-200">FAC.accdb</code>):</strong> Contiene la configuración global del programa, usuarios y listado de empresas registradas.</li>
        <li><strong>Base de datos de empresa (<code class="text-indigo-300">0012026.accdb</code>):</strong> Contiene las tablas comerciales que Bentian sincroniza:
          <span class="text-xs font-mono text-zinc-400 block ml-6 mt-1">F_ART (Artículos), F_STO (Stock), F_TAR (Tarifas), F_PCL (Pedidos de Clientes), F_LPC (Líneas de Pedidos)</span>
        </li>
      </ul>
      <p class="text-xs text-amber-300/90 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mb-6">
        <strong>Importante:</strong> Debes apuntar el conector al archivo específico de la empresa y año activo (<code class="text-white">0012026.accdb</code>), <strong>no</strong> al archivo general <code class="text-white">FS.accdb</code>.
      </p>

      <h2 id="accdb-vs-mdb" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Formato .accdb vs .mdb Heredado</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Desde la edición 2010 en adelante, Factusol utiliza el formato moderno de Microsoft Access <code class="text-zinc-200">.accdb</code> (Access Database Engine). Las versiones muy antiguas utilizaban <code class="text-zinc-200">.mdb</code> (motor Jet 4.0). Bentian soporta ambos formatos de forma nativa a través del proveedor OLEDB ACE.
      </p>

      <h2 id="selector-nativo" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Selección con el Selector Nativo de Bentian</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En el panel de control de Bentian, haz clic en el botón <strong class="text-indigo-400">Examinar</strong>. Se abrirá directamente el diálogo nativo de Windows (<code class="text-zinc-200">OpenFileDialog</code>), permitiéndote navegar por tu disco local o por recursos de red sin bloqueos web y con filtro automático de archivos <code class="text-zinc-200">*.accdb</code> y <code class="text-zinc-200">*.mdb</code>.
      </p>
    `,
  },
  {
    slug: 'factusol/rutas-red-nas-anti-wiping',
    categorySlug: 'factusol',
    title: 'Rutas de Red, Servidores NAS y Protección Anti-Wiping',
    subtitle: 'Cómo configurar bases de datos compartidas mediante rutas UNC (\\\\NAS\\...), tolerancia a microcortes y almacenamiento blindado en %APPDATA%.',
    badge: 'Redes & Alta Disponibilidad',
    readingTime: '5 min de lectura',
    metaTitle: 'Factusol en Red Local y Servidores NAS (Anti-Wiping) | Bentian',
    metaDescription: 'Cómo conectar Factusol en red local o NAS mediante rutas UNC. Arquitectura Anti-Wiping para que caídas de red nunca borren la configuración en %APPDATA%.',
    keywords: 'factusol en red, factusol nas, factusol synology qnap, ruta unc factusol, anti wiping bentian, desconexion red factusol',
    toc: [
      { id: 'el-problema-red', label: '1. El Problema Común en Redes Locales', level: 2 },
      { id: 'soporte-unc', label: '2. Rutas UNC vs Letras Mapeadas (Z:\\)', level: 2 },
      { id: 'regla-anti-wiping', label: '3. Arquitectura Anti-Wiping Mandataria', level: 2 },
      { id: 'persistencia-appdata', label: '4. Persistencia en %APPDATA% (Regla de Oro)', level: 2 },
      { id: 'reconexiones-automaticas', label: '5. Detección y Reconexión Automática', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        En la mayoría de pymes, Factusol no se instala en un único PC aislado, sino en un servidor central, un recurso compartido de red (SMB) o un almacenamiento NAS (Synology, QNAP, Windows Server) para que varios empleados trabajen simultáneamente. Bentian está diseñado desde sus cimientos para operar en estos entornos de red compartida con máxima tolerancia a fallos.
      </p>

      <h2 id="el-problema-red" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Problema Común en Redes Locales</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Los conectores tradicionales suelen cometer un fallo crítico: al arrancar el ordenador, si la red local tarda 2 segundos más en responder o el servidor NAS está en reposo, el conector ejecuta <code class="text-rose-400 font-mono">fs.existsSync(path)</code>, recibe <code class="text-rose-400">false</code> y <strong>borra la ruta de la base de datos</strong>, dejando el sistema desconectado y requiriendo que alguien vuelva a reconfigurarlo a mano.
      </p>

      <h2 id="soporte-unc" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Rutas UNC vs Letras Mapeadas (Z:\\)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En Windows, las unidades de red mapeadas con letra (ej: <code class="text-zinc-200 font-mono">Z:\\Factusol\\Datos\\...</code>) pertenecen a la sesión interactiva del usuario que inició sesión. Si el equipo se bloquea o el agente corre bajo un servicio con privilegios elevados, la letra <code class="text-zinc-200">Z:</code> puede desaparecer temporalmente.
      </p>
      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6">
        <strong class="text-white block mb-1">💡 Recomendación Oficial: Utiliza Rutas UNC Nativas</strong>
        Configura siempre la ruta en formato UNC de Windows. Ejemplo:
        <div class="text-emerald-300 font-mono text-sm mt-1.5">\\\\SERVIDOR_EMPRESA\\Factusol\\Datos\\FS\\0012026.accdb</div>
        <div class="text-emerald-300 font-mono text-sm">\\\\192.168.1.150\\compartido\\Datos\\FS\\0012026.accdb</div>
        Las rutas UNC son universales, no dependen de qué usuario haya iniciado sesión y permanecen activas permanentemente.
      </div>

      <h2 id="regla-anti-wiping" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Arquitectura Anti-Wiping Mandataria</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge incorpora en su núcleo la directiva inmutable <strong>Anti-Wiping</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Prohibición total de borrado destructivo:</strong> Si el NAS se reinicia o el switch de red pierde señal, el agente marca el estado interno como <span class="text-amber-400 font-semibold">"Desconectado / En Espera"</span>, pero <strong>jamás</strong> borra la ruta configurada en el disco.</li>
        <li><strong>Backoff exponencial de reconexión:</strong> El agente reintenta la lectura de forma silenciosa cada pocos segundos sin mostrar errores molestos al usuario. En cuanto la red vuelve, la sincronización se reanuda al instante.</li>
      </ul>

      <h2 id="persistencia-appdata" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Persistencia en %APPDATA% (Regla de Oro)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En sistemas operativos Windows modernos, escribir archivos de configuración dentro de <code class="text-zinc-400 font-mono">C:\\Program Files\\</code> genera errores silenciosos de permisos (<code class="text-rose-400">EPERM</code>). Por eso, Bentian guarda su archivo de configuración únicamente en:
      </p>
      <div class="p-3 rounded-lg bg-[#09090c] border border-white/[0.08] text-xs font-mono text-emerald-300 mb-6">
        %APPDATA%\\Bentian Agent\\agent-config.json
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Cada guardado se realiza mediante una <strong>escritura atómica</strong>: se escribe primero en un archivo temporal (<code class="text-zinc-400 font-mono">agent-config.json.tmp</code>) y se realiza un reemplazo atómico (<code class="text-zinc-400 font-mono">fs.renameSync</code>), impidiendo que un corte de corriente corrompa tu configuración.
      </p>

      <h2 id="reconexiones-automaticas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Detección y Reconexión Automática</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El motor OLEDB de Bentian utiliza cadenas de conexión con el parámetro <code class="text-indigo-300 font-mono">Mode=Share Deny None</code>. Esto permite que el agente lea artículos y stock mientras múltiples usuarios de Factusol trabajan en sus respectivos escritorios sin colisiones ni cerrojos exclusivos.
      </p>
    `,
  },
  {
    slug: 'factusol/controladores-oledb-ace',
    categorySlug: 'factusol',
    title: 'Controladores Microsoft ACE OLEDB vs ODBC',
    subtitle: 'Por qué OLEDB es el motor de alto rendimiento para Factusol, diferencias con ODBC y resolución de conflictos de 32/64 bits.',
    badge: 'Motor de Datos',
    readingTime: '5 min de lectura',
    metaTitle: 'Controladores OLEDB Microsoft ACE para Factusol | Bentian ERP',
    metaDescription: 'Diferencias técnicas entre OLEDB y ODBC para Factusol. Cómo funciona el proveedor Microsoft.ACE.OLEDB.16.0 y solución a problemas de 64 bits.',
    keywords: 'oledb factusol, microsoft ace oledb 12.0 16.0, oledb vs odbc factusol, access database engine factusol, conexion rapida factusol',
    toc: [
      { id: 'que-es-oledb', label: '1. ¿Qué es Microsoft ACE OLEDB?', level: 2 },
      { id: 'oledb-vs-odbc', label: '2. Comparativa Técnica: OLEDB vs ODBC Clásico', level: 2 },
      { id: 'arquitectura-64bits', label: '3. Compatibilidad de 64 bits y Proceso STA', level: 2 },
      { id: 'modo-share-deny-none', label: '4. Acceso Concurrente: Modo Share Deny None', level: 2 },
      { id: 'descarga-instalador', label: '5. Cómo Descargar el Redistribuible Oficial', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        La velocidad y fiabilidad de un conector para Factusol dependen directamente de cómo interactúa con los archivos de base de datos <code class="text-zinc-200">.accdb</code>. Bentian ERP Bridge utiliza el proveedor de datos de alto rendimiento <strong>Microsoft.ACE.OLEDB</strong>, prescindiendo por completo de puentes lentos por ODBC o emuladores intermedios.
      </p>

      <h2 id="que-es-oledb" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Qué es Microsoft ACE OLEDB?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        <strong>OLE DB (Object Linking and Embedding, Database)</strong> es la API de bajo nivel desarrollada por Microsoft para acceder a almacenes de datos estructurados de forma directa en memoria. El motor ACE (Access Connectivity Engine) es el componente oficial que lee y escribe las páginas binarias de los archivos Access con rendimiento nativo de C++.
      </p>

      <h2 id="oledb-vs-odbc" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Comparativa Técnica: OLEDB vs ODBC Clásico</h2>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Característica</th>
              <th class="px-4 py-3 font-semibold text-emerald-400">Bentian (OLEDB Nativo)</th>
              <th class="px-4 py-3 font-semibold text-zinc-400">Conectores Comunes (ODBC / DSN)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Latencia por consulta</td>
              <td class="px-4 py-2.5 font-mono text-emerald-300 font-bold">&lt; 15 ms</td>
              <td class="px-4 py-2.5 font-mono">120 ms – 450 ms (capa de traducción)</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Configuración requerida</td>
              <td class="px-4 py-2.5 text-emerald-300">Cero. Detección automática en Windows.</td>
              <td class="px-4 py-2.5">Obliga a configurar un DSN en el Administrador ODBC.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Bloqueo de base de datos</td>
              <td class="px-4 py-2.5 text-emerald-300">Modo compartido (<code class="font-mono">Share Deny None</code>).</td>
              <td class="px-4 py-2.5 text-rose-400">Riesgo frecuente de bloqueo exclusivo (.ldb).</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Catálogos masivos (>25.000 refs)</td>
              <td class="px-4 py-2.5 text-emerald-300">Sincronización incremental sin saturar RAM.</td>
              <td class="px-4 py-2.5 text-rose-400">Timeouts frecuentes y cuelgues de memoria.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="arquitectura-64bits" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Compatibilidad de 64 bits y Proceso STA</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian opera en arquitectura de 64 bits y se enlaza con el proveedor <code class="text-indigo-300 font-mono">Microsoft.ACE.OLEDB.16.0</code> (o en su defecto <code class="text-zinc-300 font-mono">12.0</code>). Las llamadas OLEDB se coordinan en hilos STA (Single-Threaded Apartment) para respetar las restricciones de concurrencia de los objetos COM de Windows.
      </p>

      <h2 id="modo-share-deny-none" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Acceso Concurrente: Modo Share Deny None</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La cadena de conexión generada por el conector de Bentian incluye los siguientes modificadores de seguridad relacional:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6">
        Provider=Microsoft.ACE.OLEDB.16.0;Data Source=C:\\...\\0012026.accdb;<span class="text-emerald-300">Mode=Share Deny None</span>;Persist Security Info=False;
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        El modificador <code class="text-emerald-400 font-mono">Mode=Share Deny None</code> indica al motor Access que permita a cualquier otro usuario de Factusol abrir, modificar y guardar facturas o albaranes simultáneamente sin que Bentian mantenga un bloqueo restrictivo sobre el fichero.
      </p>

      <h2 id="descarga-instalador" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Cómo Descargar el Redistribuible Oficial</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si tu equipo no cuenta con el proveedor ACE OLEDB, Microsoft proporciona el paquete oficial gratuito <em>Microsoft Access Database Engine 2016 Redistributable</em>. Consulta nuestra guía de solución paso a paso para descargarlo e instalarlo en 2 minutos:
      </p>
      <a href="/docs/troubleshooting/error-oledb-no-registrado/" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-semibold transition">
        <span>Guía de instalación del controlador Microsoft ACE OLEDB →</span>
      </a>
    `,
  },
  {
    slug: 'factusol/series-de-pedidos',
    categorySlug: 'factusol',
    title: 'Series de Pedidos en Factusol: Serie 1 Directa vs Serie W',
    subtitle: 'Por qué la Serie 1 es la opción recomendada a prueba de despistes, cómo configurar series separadas y evitar pedidos ocultos.',
    badge: 'Operativa de Ventas',
    readingTime: '4 min de lectura',
    metaTitle: 'Series de Pedidos en Factusol (Serie 1 vs Serie W) | Bentian ERP',
    metaDescription: 'Por qué recomendamos la Serie 1 para pedidos web en Factusol. Cómo funciona el filtrado de pedidos de cliente y cómo configurar la Serie W sin despistes.',
    keywords: 'series factusol pedidos, serie 1 factusol, serie w pedidos web factusol, pedidos no aparecen factusol, f_pcl factusol serie',
    toc: [
      { id: 'como-funcionan-series', label: '1. ¿Cómo Funcionan las Series en Factusol?', level: 2 },
      { id: 'problema-serie-w', label: '2. El Problema Clásico de la Serie W (Pedidos Ocultos)', level: 2 },
      { id: 'ventaja-serie-1', label: '3. Por qué la Serie 1 es \'A Prueba de Despistes\'', level: 2 },
      { id: 'cuando-usar-serie-w', label: '4. ¿Cuándo Conviene Usar la Serie W?', level: 2 },
      { id: 'configuracion-agente', label: '5. Cómo Cambiar la Serie en Bentian', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        En Factusol, cada documento comercial (presupuestos, pedidos de clientes, albaranes y facturas) se organiza mediante una <strong>Serie</strong> de facturación identificada por un único carácter (por ejemplo: <code class="text-zinc-200">1</code>, <code class="text-zinc-200">2</code>, <code class="text-zinc-200">W</code>, <code class="text-zinc-200">B</code>...). La elección de la serie para los pedidos de tu tienda online determina cómo los visualizará tu equipo en el día a día.
      </p>

      <h2 id="como-funcionan-series" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Cómo Funcionan las Series en Factusol?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando un usuario abre Factusol y se dirige a <strong>Comercial → Ventas → Pedidos de cliente</strong>, el programa muestra una tabla con los pedidos registrados en la tabla <code class="text-indigo-300 font-mono">F_PCL</code>. Factusol aplica por defecto un filtro en la barra superior que muestra únicamente los documentos de la serie activa.
      </p>

      <h2 id="problema-serie-w" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. El Problema Clásico de la Serie W (Pedidos Ocultos)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Muchos conectores antiguos graban por defecto los pedidos en una serie especial llamada <code class="text-amber-400 font-mono">W</code> (Web). Esto genera una incidencia de soporte muy común en las empresas:
      </p>
      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed mb-6">
        <strong>El despiste habitual del operario:</strong> El cliente compra en WooCommerce. El pedido entra en Factusol perfectamente. Pero el empleado del almacén abre la pantalla de pedidos, ve el filtro fijado en <em>"Serie 1"</em> y no ve el pedido web. Piensa: <em>"¡El conector no funciona, el pedido no ha entrado!"</em>. En realidad, el pedido sí está en la base de datos, pero oculto tras el filtro de series de Factusol.
      </div>

      <h2 id="ventaja-serie-1" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Por qué la Serie 1 es 'A Prueba de Despistes'</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En Bentian ERP Bridge, la opción recomendada y configurada por defecto es la <strong>Serie 1</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Bandeja principal directa:</strong> El pedido web entra directamente en la lista que cualquier operario, contable o administrativo ve nada más abrir Factusol.</li>
        <li><strong>Cero cambios en filtros:</strong> No hace falta que los empleados recuerden cambiar desplegables a <em>"Todas las series"</em> o a <em>"Serie W"</em>.</li>
        <li><strong>Numeración correlativa:</strong> Los pedidos se numeran correlativamente con los pedidos telefónicos o de mostrador, agilizando la preparación del almacén.</li>
      </ul>

      <h2 id="cuando-usar-serie-w" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. ¿Cuándo Conviene Usar la Serie W?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si tu departamento de contabilidad o tu asesor fiscal exigen mantener una separación contable estricta entre las ventas de la tienda física y las de la tienda online (por ejemplo, para estadísticas separadas o auditorías fiscales), puedes configurar la serie en <code class="text-indigo-300 font-mono">W</code>. Solo deberás instruir al personal del almacén para que consulte la Serie W o el filtro <em>"Ver todas las series"</em>.
      </p>

      <h2 id="configuracion-agente" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Cómo Cambiar la Serie en Bentian</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Puedes cambiar la serie en cualquier momento:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>En el panel de control de Bentian, dirígete a la pestaña <strong>Factusol ERP</strong>.</li>
        <li>En el campo <strong>Serie para Pedidos Web</strong>, introduce el carácter deseado (ej: <code class="text-zinc-200">1</code> o <code class="text-zinc-200">W</code>).</li>
        <li>Haz clic en <strong>Guardar Configuración</strong>. Los siguientes pedidos utilizarán la serie elegida.</li>
      </ol>
    `,
  },
  {
    slug: 'factusol/calculo-stock-disponible',
    categorySlug: 'factusol',
    title: 'Cálculo de Stock Disponible (DISSTO) vs Stock Real (ACTSTO)',
    subtitle: 'Por qué sincronizar existencias físicas provoca sobreventas y cómo el cálculo de stock libre protege las ventas de tu tienda.',
    badge: 'Control de Inventario',
    readingTime: '5 min de lectura',
    metaTitle: 'Stock Disponible (DISSTO) vs Real en Factusol | Bentian ERP',
    metaDescription: 'Cómo evitar sobreventas en WooCommerce conectando Factusol. Diferencia entre Stock Real (ACTSTO) y Stock Disponible libre de reservas (DISSTO).',
    keywords: 'dissto factusol, actsto factusol, calcular stock disponible factusol, sobreventas woocommerce factusol, reservas clientes factusol f_sto',
    toc: [
      { id: 'el-peligro-sobreventas', label: '1. El Peligro de las Sobreventas en eCommerce', level: 2 },
      { id: 'formula-dissto', label: '2. La Fórmula Matemática de Stock Disponible', level: 2 },
      { id: 'mapeo-tablas-fsto', label: '3. Mapeo en la Tabla F_STO de Factusol', level: 2 },
      { id: 'soporte-multialmacen', label: '4. Soporte Multialmacén', level: 2 },
      { id: 'comparativa-practica', label: '5. Caso Práctico: Venta en Tienda vs Venta Online', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Uno de los mayores dolores de cabeza para cualquier comercio que vende simultáneamente en tienda física y tienda online es la <strong>rotura de stock por sobreventa</strong>. Vender en la web un producto que un cliente del mostrador ya tiene reservado genera cancelaciones, devoluciones y pérdida de reputación comercial.
      </p>

      <h2 id="el-peligro-sobreventas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Peligro de las Sobreventas en eCommerce</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Muchos conectores de bajo coste cometen el error de leer el campo de existencias físicas (<code class="text-rose-400 font-mono">ACTSTO</code>, Stock Actual). Si tienes 5 taladros en la estantería del almacén pero 4 de ellos corresponden a un pedido ya reservado para entrega mañana, tu stock real para vender en internet <strong>no es 5, sino 1</strong>.
      </p>

      <h2 id="formula-dissto" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. La Fórmula Matemática de Stock Disponible</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge calcula el stock disponible libre de compromisos (<code class="text-emerald-400 font-mono">DISSTO</code>) aplicando la fórmula canónica de Factusol:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-center my-6">
        <div class="text-sm sm:text-base font-mono font-bold text-white">
          Stock Disponible (<span class="text-emerald-400">DISSTO</span>) = <span class="text-indigo-300">ACTSTO</span> - <span class="text-amber-400">RESCLI</span>
        </div>
        <div class="text-xs text-zinc-400 mt-2">
          (Existencias actuales en estantería) menos (Unidades reservadas en pedidos pendientes de servir)
        </div>
      </div>

      <h2 id="mapeo-tablas-fsto" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Mapeo en la Tabla F_STO de Factusol</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El conector consulta la tabla de existencias <code class="text-zinc-200 font-mono">F_STO</code> vinculada a cada artículo (<code class="text-zinc-400 font-mono">F_ART.CODART</code>):
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6 font-mono text-xs">
        <li><strong class="text-white">ACTSTO:</strong> Stock físico actual en el almacén.</li>
        <li><strong class="text-white">RESCLI:</strong> Unidades reservadas por pedidos de clientes confirmados pero no facturados.</li>
        <li><strong class="text-white">PENREC:</strong> Pedidos pendientes de recibir de proveedores (opcionalmente configurable si tu tienda permite venta bajo pedido).</li>
      </ul>

      <h2 id="soporte-multialmacen" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Soporte Multialmacén</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si tu empresa gestiona varios almacenes en Factusol (por ejemplo, Almacén Central <code class="text-zinc-200">GEN</code> y Almacén Tienda <code class="text-zinc-200">TDA</code>), Bentian te permite elegir si deseas sincronizar el stock de un almacén específico o la suma consolidada de todos tus almacenes autorizados para venta online.
      </p>

      <h2 id="comparativa-practica" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Caso Práctico: Venta en Tienda vs Venta Online</h2>
      <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] text-xs text-zinc-300 space-y-2 mb-6">
        <p><strong>10:00 AM:</strong> Tienes 10 unidades de una hidrolimpiadora. Stock en WooCommerce = 10.</p>
        <p><strong>10:15 AM:</strong> Un comercial registra en Factusol un pedido telefónico de 8 unidades para una constructora. <code class="text-amber-400">ACTSTO = 10</code>, pero <code class="text-amber-400">RESCLI = 8</code>.</p>
        <p><strong>10:15:30 AM:</strong> Bentian detecta el cambio en Factusol y actualiza WooCommerce a <code class="text-emerald-400 font-bold">Stock = 2</code>.</p>
        <p class="text-emerald-300 font-semibold pt-1">Resultado: Ningún cliente online puede comprar más de 2 unidades. Cero sobreventas y cero cancelaciones.</p>
      </div>
    `,
  },
  {
    slug: 'factusol/matriz-compatibilidad',
    categorySlug: 'factusol',
    title: 'Matriz Oficial de Compatibilidad de Factusol (2018–2026)',
    subtitle: 'Especificación de versiones de base de datos, tablas relacionales leídas, transacciones atómicas de pedidos y motores de cálculo.',
    badge: 'Especificación Técnica',
    readingTime: '6 min de lectura',
    metaTitle: 'Matriz de Compatibilidad Factusol (2018-2026) | Bentian ERP',
    metaDescription: 'Matriz técnica oficial: versiones compatibles de Factusol (2018 a 2026), formato .accdb, tablas F_ART, F_STO, F_TAR, F_PCL y cálculo de stock.',
    keywords: 'matriz compatibilidad factusol, tablas factusol, factusol 2026 2025 2024, formato accdb factusol, f_art f_pcl factusol',
    toc: [
      { id: 'versiones-soportadas', label: '1. Versiones de Factusol Soportadas', level: 2 },
      { id: 'tablas-leidas', label: '2. Tablas Leídas en Modo Compartido', level: 2 },
      { id: 'tablas-escritas', label: '3. Tablas Escritas en Transacciones Atómicas', level: 2 },
      { id: 'plataformas-ecommerce', label: '4. Compatibilidad con Plataformas eCommerce', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Esta matriz especifica los componentes, tablas y versiones de Factusol oficialmente certificados para Bentian ERP Bridge.
      </p>

      <h2 id="versiones-soportadas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Versiones de Factusol Soportadas</h2>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Edición Factusol</th>
              <th class="px-4 py-3 font-semibold">Formato Base de Datos</th>
              <th class="px-4 py-3 font-semibold">Controlador Certificado</th>
              <th class="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Factusol 2026</td>
              <td class="px-4 py-2.5 font-mono">.accdb</td>
              <td class="px-4 py-2.5 font-mono">ACE.OLEDB.16.0</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Certificado 100%</span></td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Factusol 2025 / 2024</td>
              <td class="px-4 py-2.5 font-mono">.accdb</td>
              <td class="px-4 py-2.5 font-mono">ACE.OLEDB.16.0 / 12.0</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Certificado 100%</span></td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Factusol 2020 – 2023</td>
              <td class="px-4 py-2.5 font-mono">.accdb</td>
              <td class="px-4 py-2.5 font-mono">ACE.OLEDB.16.0 / 12.0</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Certificado 100%</span></td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Factusol 2018 / 2019</td>
              <td class="px-4 py-2.5 font-mono">.accdb / .mdb</td>
              <td class="px-4 py-2.5 font-mono">ACE.OLEDB.12.0</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Compatible</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="tablas-leidas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Tablas Leídas en Modo Compartido</h2>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6 font-mono text-xs">
        <li><strong class="text-white">F_ART:</strong> Artículos, descripciones, estado comercial (DESART, EANART, PHAART).</li>
        <li><strong class="text-white">F_STO:</strong> Stock físico y reservas por almacén (ACTSTO, RESCLI).</li>
        <li><strong class="text-white">F_TAR:</strong> Tarifas de precios (1 a 5) y precios específicos B2B/B2C.</li>
        <li><strong class="text-white">F_TLL / F_COL:</strong> Tallas y colores para variaciones de producto en moda y textil.</li>
        <li><strong class="text-white">F_FAM / F_SEC:</strong> Familias y secciones para generación automática de categorías web.</li>
      </ul>

      <h2 id="tablas-escritas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Tablas Escritas en Transacciones Atómicas</h2>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6 font-mono text-xs">
        <li><strong class="text-white">F_PCL:</strong> Cabecera de pedidos de cliente (Numpcl, Feepcl, Clicpcl, Totpcl, Ivapcl, Reqpcl).</li>
        <li><strong class="text-white">F_LPC:</strong> Líneas de detalle de pedidos de cliente con cálculo exacto de bases y tipos impositivos.</li>
        <li><strong class="text-white">F_CLI:</strong> Creación o vinculación de fichas de cliente con NIF/CIF validado.</li>
      </ul>

      <h2 id="plataformas-ecommerce" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Compatibilidad con Plataformas eCommerce</h2>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>WooCommerce:</strong> Versiones 6.x a 9.x con soporte nativo para almacenamiento de pedidos HPOS (*High-Performance Order Storage*).</li>
        <li><strong>PrestaShop:</strong> Versiones 1.7.x y 8.x mediante Webservices API nativa.</li>
        <li><strong>Shopify:</strong> Integración directa mediante Shopify Admin REST / GraphQL.</li>
        <li><strong>Tiendas a medida / Plesk:</strong> Integración mediante Endpoint Universal JSON sin plugins intermedios.</li>
      </ul>
    `,
  },
];
