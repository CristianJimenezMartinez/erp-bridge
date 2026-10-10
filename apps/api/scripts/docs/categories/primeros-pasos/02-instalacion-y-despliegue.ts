import { DocArticle } from '../../types';

export const instalacionYDespliegueArticle: DocArticle = {
  slug: 'primeros-pasos/instalacion-y-despliegue',
  categorySlug: 'primeros-pasos',
  title: 'Instalación y Despliegue del Agente en Windows (Instalador vs Portable)',
  subtitle: 'Procedimiento de despliegue paso a paso, comparativa detallada entre Instalador Oficial (.exe) y Versión Portable (.zip), modo aplicación Edge y actualizaciones atómicas.',
  badge: 'Guía de Despliegue',
  readingTime: '6 min de lectura',
  metaTitle: 'Cómo Instalar Bentian ERP Bridge en Windows | Instalador vs Portable',
  metaDescription: 'Guía completa de instalación de Bentian ERP Bridge en Windows 10, 11 y Windows Server. Comparativa Instalador (.exe) vs Versión Portable (.zip), modo Edge App y actualizaciones automáticas.',
  keywords: 'instalar bentian, instalador factusol woocommerce, bentian setup exe, bentian portable zip, version portable factusol, desplegar conector factusol, bentian tray windows, autoactualizacion bentian',
  toc: [
    { id: 'modalidades-despliegue', label: '1. Modalidades de Despliegue: Instalador Oficial vs Versión Portable', level: 2 },
    { id: 'tabla-comparativa', label: '2. Tabla Comparativa: ¿Cuál Elegir para tu Empresa?', level: 2 },
    { id: 'proceso-instalacion', label: '3. Proceso de Instalación y Despliegue Paso a Paso', level: 2 },
    { id: 'modo-escritorio-edge', label: '4. Modo Escritorio Aislado (Edge App) y Prevención de Cierres', level: 2 },
    { id: 'bandeja-sistema', label: '5. Control en Segundo Plano desde la Bandeja del Sistema (Tray)', level: 2 },
    { id: 'actualizaciones-automaticas', label: '6. Actualizaciones Silenciosas Atómicas (Instalador y Portable)', level: 2 },
    { id: 'documentacion-soporte-app', label: '7. Acceso a Documentación y Soporte Integrado en la Aplicación', level: 2 },
  ],
  contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Bentian ERP Bridge es una solución nativa de Windows compilada con tecnología Node.js SEA (Single Executable Application) con el motor V8 inyectado en el propio binario. No requiere instalar Node, Python ni paquetes externos en los equipos de tu empresa. Para adaptarse a las necesidades de cada tipo de usuario, Bentian se distribuye en dos modalidades oficiales: <strong>Instalador Oficial Guiado (.exe)</strong> y <strong>Versión Portable Zero-Footprint (.zip)</strong>.
      </p>

      <h2 id="modalidades-despliegue" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Modalidades de Despliegue: Instalador Oficial vs Versión Portable</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Ambas versiones incorporan exactamente el mismo motor de sincronización de alta fidelidad, la misma interfaz gráfica y soporte para bases de datos Factusol tanto en disco local como en servidores de red o NAS:
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <!-- Tarjeta Instalador -->
        <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">Despliegue Estándar</span>
              <span class="text-xs font-mono text-zinc-500">Bentian-Setup.exe</span>
            </div>
            <h3 class="text-base font-bold text-white mb-1.5">Instalador Oficial para Windows</h3>
            <p class="text-xs text-zinc-400 leading-relaxed mb-4">
              Instalador clásico asistido para Windows. Ubica los binarios en <code class="text-zinc-300 font-mono">Program Files</code> o <code class="text-zinc-300 font-mono">%LOCALAPPDATA%</code>, crea accesos directos en el Escritorio y Menú Inicio, y registra la ejecución silenciosa en la bandeja del sistema al encender el PC.
            </p>
          </div>
          <a href="/releases/latest/Bentian-Setup.exe" class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Descargar Instalador Oficial (.exe)</span>
          </a>
        </div>

        <!-- Tarjeta Portable -->
        <div class="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-zinc-900/60 to-zinc-900/60 border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Zero-Admin / Sin Instalación</span>
              <span class="text-xs font-mono text-emerald-400/80">BentianAgent-Portable.zip</span>
            </div>
            <h3 class="text-base font-bold text-white mb-1.5">Versión Portable Zero-Footprint</h3>
            <p class="text-xs text-zinc-300 leading-relaxed mb-4">
              Distribución lista para usar: descomprimir y hacer doble clic. <strong>No requiere permisos de Administrador</strong>, no toca el Registro de Windows y se puede ejecutar desde cualquier carpeta personal, disco externo o pendrive USB. <em>SÍ se auto-actualiza automáticamente.</em>
            </p>
          </div>
          <a href="/releases/latest/BentianAgent-Portable.zip" class="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Descargar Versión Portable (.zip)</span>
          </a>
        </div>
      </div>

      <h2 id="tabla-comparativa" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Tabla Comparativa: ¿Cuál Elegir para tu Empresa?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Revisa la siguiente matriz técnica para determinar la edición idónea según tu rol operativo o la infraestructura de tu empresa:
      </p>

      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Criterio Operativo</th>
              <th class="px-4 py-3 font-semibold">Instalador Oficial (.exe)</th>
              <th class="px-4 py-3 font-semibold">Versión Portable (.zip)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Permisos de Administrador UAC</td>
              <td class="px-4 py-2.5 text-zinc-300">Requeridos para crear accesos e inicio en sistema</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">No requeridos (Usuario Estándar)</span></td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Modificaciones en Registro de Windows</td>
              <td class="px-4 py-2.5 text-zinc-300">Añade entrada de ejecución en <code class="text-zinc-200">HKCU\\...\\Run</code></td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Cero modificaciones en Registro</span></td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Ubicación en disco</td>
              <td class="px-4 py-2.5 font-mono text-zinc-300">C:\\Program Files\\ o %LOCALAPPDATA%</td>
              <td class="px-4 py-2.5 text-zinc-300">Cualquier carpeta, Escritorio, Descargas o Pendrive USB</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Inicio automático con Windows</td>
              <td class="px-4 py-2.5 text-emerald-400 font-medium">Configurado automáticamente en instalación</td>
              <td class="px-4 py-2.5 text-zinc-400">Opcional (creando acceso directo en shell:startup)</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Persistencia de configuración</td>
              <td class="px-4 py-2.5 font-mono text-indigo-300">%APPDATA%\\Bentian Agent\\agent-config.json</td>
              <td class="px-4 py-2.5 font-mono text-indigo-300">%APPDATA%\\Bentian Agent\\agent-config.json</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Auto-actualizaciones atómicas en caliente</td>
              <td class="px-4 py-2.5 text-emerald-400 font-medium">Sí (UpdateSwapper con firma Ed25519)</td>
              <td class="px-4 py-2.5 text-emerald-400 font-medium">Sí (Actualiza binario sin tocar configuración)</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Caso de uso recomendado</td>
              <td class="px-4 py-2.5 text-zinc-200">Puestos fijos de facturación, almacén y servidores dedicados</td>
              <td class="px-4 py-2.5 text-emerald-300 font-medium">Evaluadores (Softpedia/Web), comerciales, portátiles y consultores</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Callout especial Evaluadores -->
      <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 mb-8 flex items-start gap-3">
        <svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <strong class="font-semibold text-white block mb-0.5">¿Has descargado Bentian para probarlo o evaluarlo en tu portátil?</strong>
          La <strong>Versión Portable (.zip)</strong> es la opción perfecta para ti. No requiere permisos de administrador, arranca en menos de dos segundos y te permite explorar el panel, probar la conexión con tu tienda online y revisar todas las opciones sin tocar la configuración de tu equipo.
        </div>
      </div>

      <h2 id="proceso-instalacion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Proceso de Instalación y Despliegue Paso a Paso</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Sigue estos sencillos pasos según la opción elegida:
      </p>

      <div class="space-y-4 mb-6">
        <div class="p-4 rounded-xl bg-zinc-900/40 border border-white/[0.08]">
          <h4 class="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">A</span>
            Despliegue con el Instalador Oficial (.exe)
          </h4>
          <ol class="text-xs text-zinc-300 space-y-2 list-decimal list-inside ml-1">
            <li>Ejecuta <code class="text-zinc-200 font-mono font-bold">Bentian-Setup.exe</code> con doble clic. Si Windows muestra el aviso de permisos UAC, pulsa en <em>Sí</em>.</li>
            <li>El instalador copiará los archivos en la carpeta de aplicaciones del sistema y creará los iconos en el Escritorio y Menú Inicio.</li>
            <li>Al finalizar, se iniciará el proceso de fondo <code class="text-zinc-200 font-mono">BentianAgent.exe</code> y el servicio de bandeja <code class="text-zinc-200 font-mono">BentianTray.exe</code>, abriendo la ventana del Asistente Inicial.</li>
          </ol>
        </div>

        <div class="p-4 rounded-xl bg-zinc-900/40 border border-white/[0.08]">
          <h4 class="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">B</span>
            Despliegue con la Versión Portable (.zip)
          </h4>
          <ol class="text-xs text-zinc-300 space-y-2 list-decimal list-inside ml-1">
            <li>Descarga <code class="text-zinc-200 font-mono font-bold">BentianAgent-Portable.zip</code> y descomprímelo en cualquier carpeta de tu elección (por ejemplo: <code class="text-zinc-400 font-mono">C:\\Bentian\\</code>, en tu carpeta personal o en un pendrive).</li>
            <li>Haz doble clic sobre <code class="text-emerald-400 font-mono font-bold">BentianAgent.exe</code>. No solicita permisos de administrador.</li>
            <li>El programa se abrirá al instante mostrando el Asistente de Configuración. Si deseas crear un acceso directo, haz clic derecho sobre <code class="text-zinc-200">BentianAgent.exe</code> → <em>Enviar a</em> → <em>Escritorio (crear acceso directo)</em>.</li>
          </ol>
        </div>
      </div>

      <h2 id="modo-escritorio-edge" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Modo Escritorio Aislado (Edge App) y Prevención de Cierres</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        A diferencia de las herramientas que se abren como una pestaña más en Google Chrome (donde el usuario puede cerrarla por descuido al cerrar el navegador), Bentian invoca Microsoft Edge en modo aplicación aislada:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-4">
        msedge.exe --app=http://127.0.0.1:39281 --new-window --window-size=1180,820
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Esto proporciona una ventana independiente con su propio icono de Bentian en la barra de tareas de Windows, previene el <em>Foreground Lockout</em> de Windows 11 y garantiza que el panel de control se ejecute con estética de aplicación de escritorio pura, sin barras de direcciones ni botones de navegación que generen distracciones.
      </p>

      <h2 id="bandeja-sistema" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Control en Segundo Plano desde la Bandeja del Sistema (Tray)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando minimizas o cierras la ventana del panel de control, <strong>la sincronización NO se detiene</strong>. El agente permanece activo y supervisando en segundo plano, situado en la bandeja del sistema (junto al reloj de Windows):
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Clic izquierdo en el icono:</strong> Abre o enfoca de inmediato la ventana principal del panel de control.</li>
        <li><strong>Clic derecho en el icono:</strong> Despliega el menú contextual rápido:
          <ul class="list-circle list-inside ml-6 mt-1 text-xs text-zinc-400 space-y-1">
            <li><em>Abrir Panel de Control</em></li>
            <li><em>Forzar Sincronización Ahora</em></li>
            <li><em>Pausar Sincronización Temporalmente</em></li>
            <li><em>Ver Registro de Actividad (Logs)</em></li>
            <li><em>Salir de Bentian ERP Bridge</em></li>
          </ul>
        </li>
      </ul>

      <h2 id="actualizaciones-automaticas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Actualizaciones Silenciosas Atómicas (Instalador y Portable)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Tanto el Instalador Oficial como la Versión Portable integran el motor de autoactualización atómica desacoplada (<code class="text-indigo-300 font-semibold">UpdateSwapper</code>). Periódicamente o al pulsar el botón <em>Buscar Actualizaciones</em> en la sección de Diagnóstico:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>El agente descarga el nuevo paquete de actualización en <code class="text-zinc-400 font-mono">%TEMP%\\bentian-updates\\</code>.</li>
        <li>Verifica la integridad criptográfica de la firma <strong>Ed25519</strong> y el hash SHA-256 contrastándolo con la clave pública inmutable de Bentian.</li>
        <li>El swapper externo reemplaza el ejecutable de forma atómica y monitoriza 10 segundos de estabilidad. Si ocurriera algún fallo, revierte de inmediato al binario anterior (<code class="text-zinc-400">.bak</code>).</li>
        <li><strong>Blindaje de configuración:</strong> Tu archivo de configuración (<code class="text-zinc-300 font-mono">%APPDATA%\\Bentian Agent\\agent-config.json</code>) y tus credenciales de tienda jamás se tocan ni se pierden al actualizar.</li>
      </ol>

      <h2 id="documentacion-soporte-app" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">7. Acceso a Documentación y Soporte Integrado en la Aplicación</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para que nunca te sientas perdido ante cualquier configuración técnica, la propia aplicación de escritorio incorpora accesos directos permanentes a la documentación oficial y herramientas de diagnóstico:
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08]">
          <div class="text-xs font-bold text-indigo-400 mb-1 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Barra Lateral y Cabecera
          </div>
          <p class="text-xs text-zinc-400 leading-relaxed">
            En el pie de la barra lateral izquierda dispones del botón <strong class="text-white">Manuales &amp; Docs ↗</strong> y la pestaña <strong class="text-white">Documentación ↗</strong>. En la cabecera superior tienes el botón <strong class="text-white">Documentación</strong> accesible en todo momento con un solo clic.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08]">
          <div class="text-xs font-bold text-indigo-400 mb-1 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            Diagnóstico, Errores y Soporte
          </div>
          <p class="text-xs text-zinc-400 leading-relaxed">
            En la pestaña <strong class="text-white">Diagnóstico y Ayuda (Logs)</strong> encontrarás el catálogo de guías recomendadas (Factusol OLEDB, red NAS, tiendas) y los botones para <strong class="text-white">Reportar Incidencia</strong> o descargar el informe técnico del sistema.
          </p>
        </div>
      </div>
    `,
};
