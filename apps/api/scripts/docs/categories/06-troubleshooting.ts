import { DocArticle } from '../types';

export const troubleshootingArticles: DocArticle[] = [
  {
    slug: 'troubleshooting/errores-humanizados',
    categorySlug: 'troubleshooting',
    title: 'Catálogo de Errores Humanizados y Resolución en 1 Clic',
    subtitle: 'Las 22 incidencias técnicas habituales traducidas a lenguaje comprensible con navegación directa a la pantalla de resolución.',
    badge: 'Diagnóstico & UX',
    readingTime: '5 min de lectura',
    metaTitle: 'Catálogo de Errores Humanizados de Bentian ERP Bridge',
    metaDescription: 'Cómo funciona el motor de errores humanizados de Bentian. Traducción de 22 errores crípticos de Windows y Factusol a soluciones claras en 1 clic.',
    keywords: 'errores factusol, solucionar error conector factusol, errores humanizados bentian, mensajes claros factusol, soporte tecnico factusol',
    toc: [
      { id: 'filosofia-cero-jerga', label: '1. Filosofía: Adiós a los Códigos Crípticos', level: 2 },
      { id: 'arquitectura-deep-links', label: '2. Arquitectura de Deep-Links Interactivos', level: 2 },
      { id: 'tabla-errores-comunes', label: '3. Las Incidencias Más Frecuentes y su Solución', level: 2 },
      { id: 'como-reportar', label: '4. Cómo Consultar los Registros Detallados (Logs)', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Uno de los mayores defectos del software empresarial clásico es mostrar ventanas de error incomprensibles como <code class="text-rose-400 font-mono">Error de OLEDB no especificado 0x80004005</code> o <code class="text-rose-400 font-mono">Uncaught exception in adodb.js line 42</code>. Un administrativo o encargado de almacén no sabe qué hacer ante semejante mensaje.
      </p>

      <h2 id="filosofia-cero-jerga" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Filosofía: Adiós a los Códigos Crípticos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge incorpora un <strong>Motor de Humanización de Errores</strong> que intercepta cada fallo del sistema operativo, de la red o del motor Access y lo transforma en:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Título en cristiano:</strong> Explica qué está pasando en una frase clara (ej: <em>"Base de datos de Factusol ocupada por otro usuario"</em>).</li>
        <li><strong>Causa probable:</strong> Detalla por qué se ha producido el evento en términos de negocio.</li>
        <li><strong>Acción inmediata:</strong> Indica exactamente qué paso debes dar para resolverlo.</li>
      </ul>

      <h2 id="arquitectura-deep-links" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Arquitectura de Deep-Links Interactivos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En lugar de obligarte a buscar en menús complejos, cada notificación de Bentian incluye un botón de <strong>Resolución en 1 Clic</strong>:
      </p>
      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6">
        Al hacer clic en <strong class="text-white">[Resolver en Factusol →]</strong> o <strong class="text-white">[Corregir en Canal Web →]</strong>, el panel de control cambia automáticamente a la pestaña correspondiente, realiza un scroll suave hasta el campo erróneo, le aplica un resplandor visual violeta durante 2 segundos y sitúa el cursor directamente en él.
      </div>

      <h2 id="tabla-errores-comunes" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Las Incidencias Más Frecuentes y su Solución</h2>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Código Técnico Interno</th>
              <th class="px-4 py-3 font-semibold text-rose-400">Mensaje Críptico Tradicional</th>
              <th class="px-4 py-3 font-semibold text-emerald-400">Traducción Humanizada Bentian</th>
              <th class="px-4 py-3 font-semibold">Acción 1 Clic</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-mono text-zinc-300">OLEDB_NOT_REGISTERED</td>
              <td class="px-4 py-2.5 font-mono text-rose-400">Provider Microsoft.ACE not found</td>
              <td class="px-4 py-2.5 text-zinc-200">Falta el controlador gratuito Access de 64 bits en Windows.</td>
              <td class="px-4 py-2.5 text-indigo-400 font-semibold">[Descargar Driver]</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-zinc-300">FILE_LOCKED_3045</td>
              <td class="px-4 py-2.5 font-mono text-rose-400">Could not use '...accdb'; file already in use</td>
              <td class="px-4 py-2.5 text-zinc-200">Factusol está bloqueado por otro equipo o hay un archivo .laccdb huérfano.</td>
              <td class="px-4 py-2.5 text-indigo-400 font-semibold">[Ver Solución .laccdb]</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-zinc-300">WC_AUTH_401</td>
              <td class="px-4 py-2.5 font-mono text-rose-400">401 Unauthorized (woocommerce_rest_cannot_view)</td>
              <td class="px-4 py-2.5 text-zinc-200">Tu hosting bloquea la cabecera Authorization en Apache/LiteSpeed.</td>
              <td class="px-4 py-2.5 text-indigo-400 font-semibold">[Solución .htaccess]</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-zinc-300">WC_KEYS_READONLY</td>
              <td class="px-4 py-2.5 font-mono text-rose-400">403 Forbidden (woocommerce_rest_cannot_create)</td>
              <td class="px-4 py-2.5 text-zinc-200">Las claves de WooCommerce se crearon solo con permiso de Lectura.</td>
              <td class="px-4 py-2.5 text-indigo-400 font-semibold">[Editar Claves]</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="como-reportar" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Cómo Consultar los Registros Detallados (Logs)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si requieres asistencia técnica especializada, puedes consultar el historial de eventos en la pestaña <strong>Registro de Actividad (Logs)</strong> del panel de control o abrir directamente el archivo en disco:
      </p>
      <div class="p-3 rounded-lg bg-[#09090c] border border-white/[0.08] text-xs font-mono text-emerald-300 mb-6">
        %APPDATA%\\Bentian Agent\\logs\\agent.log
      </div>
    `,
  },
  {
    slug: 'troubleshooting/error-3045-base-datos-bloqueada',
    categorySlug: 'troubleshooting',
    title: 'Cómo Solucionar el Error 3045: Base de Datos Bloqueada (.laccdb)',
    subtitle: 'Qué hacer cuando Factusol o Bentian muestran que el archivo está en uso exclusivo por otro usuario o proceso.',
    badge: 'Bloqueos de Ficheros',
    readingTime: '5 min de lectura',
    metaTitle: 'Solucionar Error 3045 Factusol (.laccdb Bloqueado) | Bentian ERP',
    metaDescription: 'Cómo desbloquear el archivo .laccdb huérfano de Factusol y solucionar el Error 3045 en red local o NAS sin reiniciar el servidor.',
    keywords: 'error 3045 factusol, desbloquear laccdb factusol, base de datos en uso exclusivo factusol, archivo ldb bloqueado factusol, colapso factusol red',
    toc: [
      { id: 'que-es-el-archivo-laccdb', label: '1. ¿Qué es el Archivo .laccdb o .ldb?', level: 2 },
      { id: 'por-que-se-queda-bloqueado', label: '2. Por qué se Queda Bloqueado en Red Local', level: 2 },
      { id: 'pasos-para-desbloquear', label: '3. Procedimiento Paso a Paso para Desbloquear', level: 2 },
      { id: 'como-evitar-futuros-bloqueos', label: '4. Cómo Previene Bentian Futuros Bloqueos', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        El <strong>Error 3045</strong> (<em>"No se pudo utilizar el archivo; actualmente está en uso por otro usuario o proceso"</em>) es la incidencia más clásica en empresas que utilizan Factusol en red local. Ocurre cuando Microsoft Access detecta un cerrojo exclusivo activo y rechaza cualquier nueva conexión.
      </p>

      <h2 id="que-es-el-archivo-laccdb" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Qué es el Archivo .laccdb o .ldb?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cada vez que alguien abre Factusol, el motor de base de datos crea de forma automática un archivo temporal con el mismo nombre y extensión <code class="text-indigo-300 font-mono">.laccdb</code> (ej: <code class="text-zinc-200">0012026.laccdb</code>) en la misma carpeta. Este fichero registra qué usuarios de la red tienen tablas abiertas para coordinar los bloqueos de registros.
      </p>

      <h2 id="por-que-se-queda-bloqueado" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Por qué se Queda Bloqueado en Red Local</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Normalmente, cuando el último usuario cierra Factusol, Windows elimina automáticamente el archivo <code class="text-zinc-200">.laccdb</code>. Sin embargo, puede quedar <strong>"huérfano" y bloqueado</strong> si:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
        <li>Un ordenador de la oficina sufrió un corte de luz o se apagó a la fuerza sin cerrar Factusol.</li>
        <li>Un PC perdió la conexión Wi-Fi dejando la sesión SMB colgada en el servidor o NAS.</li>
        <li>Un antivirus de terceros está analizando el archivo <code class="text-zinc-200">.accdb</code> y mantiene el handle abierto.</li>
      </ul>

      <h2 id="pasos-para-desbloquear" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Procedimiento Paso a Paso para Desbloquear</h2>
      <ol class="text-sm text-zinc-300 space-y-2.5 list-decimal list-inside mb-6">
        <li><strong>Cerrar Factusol en todos los puestos:</strong> Pide a los empleados que cierren Factusol en sus escritorios durante 1 minuto.</li>
        <li><strong>Cerrar Bentian temporalmente:</strong> Clic derecho en el icono de Bentian en la bandeja del sistema → <em>Salir</em>.</li>
        <li><strong>Navegar a la carpeta de la empresa:</strong> Abre el Explorador de Windows y dirígete a la carpeta donde reside la base de datos (ej: <code class="text-zinc-200">C:\\Software DELSOL\\Factusol\\Datos\\FS\\</code> o la ruta de tu servidor NAS).</li>
        <li><strong>Eliminar el archivo de cerrojo huérfano:</strong> Localiza el archivo con extensión <code class="text-rose-400 font-mono">.laccdb</code> (o <code class="text-rose-400 font-mono">.ldb</code>) y bórralo. Si Windows indica que no se puede borrar porque está en uso por un equipo, reinicia el servicio SMB del servidor o cierra las sesiones abiertas en <em>Administración de equipos → Carpetas compartidas → Sesiones</em>.</li>
        <li><strong>Reiniciar Factusol y Bentian:</strong> Abre Factusol para verificar que entra normalmente y después inicia Bentian ERP Bridge.</li>
      </ol>

      <h2 id="como-evitar-futuros-bloqueos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Cómo Previene Bentian Futuros Bloqueos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Bentian nunca abre la base de datos en modo exclusivo. Todas las conexiones OLEDB utilizan el flag <code class="text-emerald-400 font-mono">Mode=Share Deny None</code> y cierran los recordsets inmediatamente tras completar cada consulta, evitando que el conector bloquee el trabajo diario del mostrador.
      </p>
    `,
  },
  {
    slug: 'troubleshooting/error-oledb-no-registrado',
    categorySlug: 'troubleshooting',
    title: 'Error de Proveedor OLEDB Microsoft.ACE no Registrado',
    subtitle: 'Cómo solucionar el error 0x80004005 e instalar el motor redistribuible Access Database Engine de 64 bits.',
    badge: 'Controladores Windows',
    readingTime: '4 min de lectura',
    metaTitle: 'Solucionar Error Microsoft.ACE.OLEDB no Registrado | Bentian',
    metaDescription: 'Cómo descargar e instalar el Microsoft Access Database Engine 2016 de 64 bits para resolver el error OLEDB no registrado en Factusol.',
    keywords: 'microsoft ace oledb no esta registrado, descargar access database engine 64 bits, error oledb factusol 0x80004005, instalar oledb windows 11',
    toc: [
      { id: 'causa-del-error', label: '1. Causa del Error: Arquitectura de 64 bits', level: 2 },
      { id: 'descarga-oficial', label: '2. Enlace de Descarga Oficial de Microsoft', level: 2 },
      { id: 'instalacion-paso-a-paso', label: '3. Instalación Paso a Paso en Windows', level: 2 },
      { id: 'verificacion-bentian', label: '4. Verificación Inmediata en el Agente', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        El mensaje <em>"El proveedor 'Microsoft.ACE.OLEDB.12.0' (o 16.0) no está registrado en el equipo local"</em> aparece cuando Windows no tiene instaladas las librerías oficiales de acceso a bases de datos Access en su versión de 64 bits.
      </p>

      <h2 id="causa-del-error" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Causa del Error: Arquitectura de 64 bits</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge es una aplicación nativa de 64 bits diseñada para aprovechar toda la memoria de tu equipo. Si en el ordenador está instalado un paquete de Office o Factusol antiguo de 32 bits, Windows solo dispone del controlador de 32 bits en el registro. Para resolverlo, basta con instalar el controlador redistribuible de 64 bits proporcionado gratuitamente por Microsoft.
      </p>

      <h2 id="descarga-oficial" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Enlace de Descarga Oficial de Microsoft</h2>
      <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] mb-6">
        <h4 class="text-sm font-semibold text-white mb-1">Microsoft Access Database Engine 2016 Redistributable</h4>
        <p class="text-xs text-zinc-400 mb-3">
          Descárgalo directamente desde el Centro de Descargas oficial de Microsoft:
        </p>
        <a href="https://www.microsoft.com/es-es/download/details.aspx?id=54920" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition">
          <span>Descargar en Microsoft.com (Oficial) ↗</span>
        </a>
      </div>

      <h2 id="instalacion-paso-a-paso" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Instalación Paso a Paso en Windows</h2>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Al pulsar descargar en la web de Microsoft, selecciona el archivo de 64 bits: <code class="text-emerald-400 font-mono font-bold">accessdatabaseengine_X64.exe</code>.</li>
        <li>Una vez descargado, ejecútalo como Administrador (clic derecho → <em>Ejecutar como Administrador</em>).</li>
        <li>Sigue el asistente de instalación estándar pulsando <em>Siguiente</em> y <em>Aceptar los términos</em>.</li>
        <li>Si el instalador te avisa de que existe una versión de 32 bits instalada, ejecútalo desde una consola de comandos en modo pasivo:
          <pre class="mt-2 p-3 rounded-lg bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300">accessdatabaseengine_X64.exe /passive</pre>
        </li>
      </ol>

      <h2 id="verificacion-bentian" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Verificación Inmediata en el Agente</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Una vez instalado, abre Bentian ERP Bridge y pulsa <strong class="text-indigo-400">Probar Conexión</strong> en la pestaña Factusol. El indicador cambiará a color verde confirmando que la base de datos se lee a la máxima velocidad.
      </p>
    `,
  },
  {
    slug: 'troubleshooting/error-401-autorizacion-hosting',
    categorySlug: 'troubleshooting',
    title: 'Error 401 Unauthorized en WooCommerce (.htaccess)',
    subtitle: 'Cómo solucionar el bloqueo de cabeceras de autorización HTTP en hostings españoles como Raiola Networks, Webempresa o SiteGround.',
    badge: 'Hosting & Servidores',
    readingTime: '4 min de lectura',
    metaTitle: 'Solucionar Error 401 REST API WooCommerce (.htaccess) | Bentian',
    metaDescription: 'Solución en 2 líneas para el Error 401 Unauthorized en la REST API de WooCommerce causada por el bloqueo de cabeceras Authorization en Apache o LiteSpeed.',
    keywords: 'error 401 woocommerce rest api, cabecera authorization bloqueada htaccess, raiola webempresa woocommerce 401, conector factusol woocommerce 401',
    toc: [
      { id: 'por-que-ocurre-error-401', label: '1. ¿Por qué ocurre el Error 401 con Claves Correctas?', level: 2 },
      { id: 'el-filtro-apache-litespeed', label: '2. El Filtro de Cabeceras en Apache y LiteSpeed', level: 2 },
      { id: 'solucion-en-dos-lineas', label: '3. Solución en 2 Líneas en el Archivo .htaccess', level: 2 },
      { id: 'instrucciones-cpanel-plesk', label: '4. Cómo Aplicarlo desde cPanel o Plesk', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Has generado tus claves de WooCommerce (<code class="text-zinc-200">ck_...</code> y <code class="text-zinc-200">cs_...</code>) con permisos de Lectura/Escritura, las has pegado en Bentian y al pulsar <em>"Probar Conexión"</em> el sistema te arroja un <code class="text-rose-400 font-mono font-bold">Error 401 Unauthorized (woocommerce_rest_cannot_view)</code>. ¿Por qué ocurre esto si las claves están bien escritas?
      </p>

      <h2 id="por-que-ocurre-error-401" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Por qué ocurre el Error 401 con Claves Correctas?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La inmensa mayoría de hostings compartidos y VPS gestionados en España (como Raiola Networks, Webempresa, SiteGround o Nominalia) utilizan servidores web Apache o LiteSpeed ejecutando PHP en modo FastCGI / PHP-FPM.
      </p>

      <h2 id="el-filtro-apache-litespeed" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. El Filtro de Cabeceras en Apache y LiteSpeed</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Por razones históricas de seguridad, las configuraciones predeterminadas de estos servidores <strong>eliminan silenciosamente la cabecera HTTP <code class="text-rose-400 font-mono">Authorization</code></strong> antes de que la petición llegue a WordPress. En consecuencia, cuando Bentian envía las credenciales de WooCommerce, WordPress recibe la petición sin cabecera de autenticación y responde con un código 401.
      </p>

      <h2 id="solucion-en-dos-lineas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Solución en 2 Líneas en el Archivo .htaccess</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para indicar al servidor que transmita la cabecera de autorización a WordPress, añade las siguientes dos líneas al principio de tu archivo <code class="text-indigo-300 font-mono">.htaccess</code> (ubicado en la raíz de tu instalación de WordPress):
      </p>
      <pre class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-emerald-400 overflow-x-auto mb-6"><code># Pasar cabeceras de autorización a la REST API de WooCommerce
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]</code></pre>

      <h2 id="instrucciones-cpanel-plesk" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Cómo Aplicarlo desde cPanel o Plesk</h2>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Accede a tu panel de hosting (cPanel o Plesk) y abre el <strong class="text-white">Administrador de Archivos</strong>.</li>
        <li>Entra en la carpeta raíz de tu tienda (generalmente <code class="text-zinc-200">public_html/</code> o <code class="text-zinc-200">httpdocs/</code>).</li>
        <li>Asegúrate de tener activada la opción <em>"Mostrar archivos ocultos (dotfiles)"</em> para ver el archivo <code class="text-zinc-200">.htaccess</code>.</li>
        <li>Edita el archivo, pega el fragmento indicado justo antes de la línea <code class="text-zinc-400 font-mono"># BEGIN WordPress</code> y guarda los cambios.</li>
        <li>Vuelve a Bentian y haz clic en <strong class="text-indigo-400">Probar Conexión</strong>: la conexión responderá con HTTP 200 OK inmediatamente.</li>
      </ol>
    `,
  },
];
