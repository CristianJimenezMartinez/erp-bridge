import { DocArticle } from '../types';

export const primerosPasosArticles: DocArticle[] = [
  {
    slug: 'primeros-pasos/requisitos-del-sistema',
    categorySlug: 'primeros-pasos',
    title: 'Requisitos del Sistema y Entorno Operativo',
    subtitle: 'Especificaciones mínimas de hardware, versiones compatibles de Windows, permisos UAC (Instalador vs Portable) y configuración de red para ejecutar Bentian ERP Bridge.',
    badge: 'Requisitos & Compatibilidad',
    readingTime: '5 min de lectura',
    metaTitle: 'Requisitos del Sistema para Bentian ERP Bridge | Documentación Oficial',
    metaDescription: 'Requisitos mínimos y recomendados de hardware, sistema operativo (Windows 10, 11 y Windows Server), permisos UAC e instalación Portable para Bentian ERP Bridge.',
    keywords: 'requisitos bentian, factusol windows 11, factusol windows server, requisitos conector factusol, permisos administrador bentian, bentian portable sin permisos',
    toc: [
      { id: 'sistemas-operativos', label: '1. Sistemas Operativos Compatibles', level: 2 },
      { id: 'hardware-minimo', label: '2. Requisitos de Hardware', level: 2 },
      { id: 'permisos-uac', label: '3. Privilegios de Usuario y UAC (Instalador vs Portable)', level: 2 },
      { id: 'red-puertos', label: '4. Configuración de Red y Puertos', level: 2 },
      { id: 'software-adicional', label: '5. Software y Controladores Requeridos', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Bentian ERP Bridge es una aplicación de escritorio nativa diseñada específicamente para entornos empresariales Windows. A diferencia de los plugins de sincronización tradicionales basados en PHP que saturan el servidor web, el agente de Bentian opera como un servicio local de alto rendimiento que consulta directamente el motor relacional de Factusol en memoria.
      </p>

      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-8 flex items-start gap-3">
        <svg class="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <strong class="font-semibold text-white block mb-0.5">Arquitectura 100% Local-First</strong>
          El agente puede instalarse en el mismo equipo donde reside Factusol o en cualquier estación de trabajo Windows que tenga acceso por red local (LAN / SMB / NAS) a la base de datos de la empresa.
        </div>
      </div>

      <h2 id="sistemas-operativos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Sistemas Operativos Compatibles</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge es compatible con arquitecturas de <strong>64 bits (x64)</strong> en las siguientes ediciones de Windows:
      </p>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Sistema Operativo</th>
              <th class="px-4 py-3 font-semibold">Arquitectura</th>
              <th class="px-4 py-3 font-semibold">Estado de Soporte</th>
              <th class="px-4 py-3 font-semibold">Notas Técnicas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Windows 11 (21H2 – 24H2)</td>
              <td class="px-4 py-2.5 font-mono">x64</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Oficial / Recomendado</span></td>
              <td class="px-4 py-2.5">Soporte nativo para Edge App Window aislado.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Windows 10 (1909 – 22H2)</td>
              <td class="px-4 py-2.5 font-mono">x64</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Oficial</span></td>
              <td class="px-4 py-2.5">Totalmente compatible con Microsoft Edge WebView / App.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Windows Server 2022 / 2025</td>
              <td class="px-4 py-2.5 font-mono">x64</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Oficial / Servidor</span></td>
              <td class="px-4 py-2.5">Óptimo para servidores dedicados Factusol o hipervisores Hyper-V/Proxmox.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Windows Server 2016 / 2019</td>
              <td class="px-4 py-2.5 font-mono">x64</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Compatible</span></td>
              <td class="px-4 py-2.5">Requiere instalación previa de Microsoft Edge Chromium.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="hardware-minimo" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Requisitos de Hardware</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Gracias a su arquitectura de consultas OLEDB compilada e indexada en memoria, el impacto en recursos de Bentian es inferior al 0,5% de uso continuo de CPU:
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08]">
          <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Requisitos Mínimos</h4>
          <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong>CPU:</strong> Procesador Intel Core i3 / AMD Ryzen 3 o superior (2 núcleos).</li>
            <li><strong>RAM:</strong> 4 GB de memoria física (al menos 350 MB disponibles).</li>
            <li><strong>Almacenamiento:</strong> 250 MB libres en disco SSD/HDD para el agente y el almacenamiento JSON atómico local.</li>
            <li><strong>Pantalla:</strong> Resolución mínima de 1280x720 para el panel de control.</li>
          </ul>
        </div>
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-indigo-500/20 bg-indigo-950/10">
          <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Requisitos Recomendados</h4>
          <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong>CPU:</strong> Intel Core i5 / AMD Ryzen 5 (4 núcleos o más).</li>
            <li><strong>RAM:</strong> 8 GB o 16 GB (recomendado para catálogos &gt;30.000 referencias).</li>
            <li><strong>Almacenamiento:</strong> Disco NVMe SSD para acceso ultrarrápido al archivo <code class="text-indigo-300">.accdb</code>.</li>
            <li><strong>Red:</strong> Tarjeta Gigabit Ethernet (1 Gbps) si Factusol reside en un NAS o servidor compartido.</li>
          </ul>
        </div>
      </div>

      <h2 id="permisos-uac" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Privilegios de Usuario y UAC (Instalador vs Portable)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La política de privilegios depende de la modalidad elegida para desplegar Bentian ERP Bridge:
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08]">
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">Instalador Oficial (.exe)</span>
            <span class="text-xs font-semibold text-white">Requiere Administrador</span>
          </div>
          <p class="text-xs text-zinc-400 leading-relaxed mb-3">
            El asistente de instalación solicita elevación UAC para registrar la ejecución en el arranque de Windows (<code class="text-zinc-300 font-mono">HKCU\\...\\Run</code>), crear accesos directos en el menú de inicio y permitir que el servicio de bandeja mantenga comunicación sin bloqueos energéticos.
          </p>
          <div class="text-[11px] text-zinc-500">Recomendado para puestos fijos de facturación y servidores dedicados.</div>
        </div>

        <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Versión Portable (.zip)</span>
            <span class="text-xs font-semibold text-emerald-300">Cero Permisos / Usuario Estándar</span>
          </div>
          <p class="text-xs text-zinc-300 leading-relaxed mb-3">
            <strong>NO requiere permisos de Administrador.</strong> Puedes descomprimirlo en cualquier carpeta de usuario (<code class="text-zinc-200">Descargas</code>, <code class="text-zinc-200">Escritorio</code>) o en un pendrive USB y ejecutarlo al instante. No toca el Registro de Windows y guarda toda la configuración en <code class="text-zinc-200">%APPDATA%</code>.
          </p>
          <div class="text-[11px] text-emerald-400 font-medium">Ideal para evaluadores, consultores y portátiles corporativos con políticas IT restringidas.</div>
        </div>
      </div>

      <h2 id="red-puertos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Configuración de Red y Puertos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Uno de los mayores blindajes de seguridad de Bentian ERP Bridge es que <strong>NO abre ningún puerto entrante en tu router o cortafuegos</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Puerto local de interfaz (Loopback):</strong> Escucha únicamente en <code class="text-indigo-300 font-mono">http://127.0.0.1:39281</code>. Este puerto es estrictamente interno al PC y está aislado del exterior.</li>
        <li><strong>Comunicaciones salientes:</strong> Todas las sincronizaciones hacia tu tienda online (WooCommerce, PrestaShop) y hacia el servidor de Bentian se efectúan como peticiones salientes seguras mediante <strong class="text-white">HTTPS (Puerto 443 TCP)</strong> cifrado con <strong>TLS 1.3</strong>.</li>
        <li><strong>Cero exposición de puertos:</strong> No necesitas configurar DMZ, NAT ni abrir puertos en el router de tu oficina.</li>
      </ul>

      <h2 id="software-adicional" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Software y Controladores Requeridos</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Factusol utiliza internamente bases de datos Microsoft Access. Para que Bentian pueda consultar la información sin depender de la interfaz gráfica de Factusol, el equipo debe contar con el controlador OLEDB oficial de Microsoft:
      </p>
      <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] mb-6">
        <h4 class="text-sm font-semibold text-white mb-1">Microsoft Access Database Engine 2016 Redistributable (64 bits)</h4>
        <p class="text-xs text-zinc-400 mb-3">
          Proporciona el proveedor <code class="text-zinc-200">Microsoft.ACE.OLEDB.16.0</code>. Si Factusol ya está instalado en el equipo, este controlador suele venir preinstalado. Si el asistente de Bentian muestra una alerta OLEDB, puedes descargarlo gratuitamente desde la web de Microsoft.
        </p>
        <a href="/docs/troubleshooting/error-oledb-no-registrado/" class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
          <span>Ver guía de instalación del controlador OLEDB →</span>
        </a>
      </div>
    `,
  },
  {
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
  },
  {
    slug: 'primeros-pasos/activacion-de-licencias',
    categorySlug: 'primeros-pasos',
    title: 'Activación de Licencias, Beta de 60 Días y Plan Fundador',
    subtitle: 'Activación de licencia Beta en 1 clic desde el Asistente, Modo Exploración para evaluadores sin clave, validación HWID y condiciones del Plan Fundador.',
    badge: 'Licencias & Facturación',
    readingTime: '6 min de lectura',
    metaTitle: 'Activación de Licencia Beta en 1 Clic y Plan Fundador | Bentian ERP Bridge',
    metaDescription: 'Cómo activar tu licencia Beta en 1 clic directamente desde Bentian ERP Bridge. Modo Exploración sin clave, Plan Fundador con descuento vitalicio y amarre HWID.',
    keywords: 'licencia bentian, activar bentian factusol, clave beta bentian 1 clic, modo exploracion bentian, plan fundador bentian, licenciamiento erp bridge, hwid factusol',
    toc: [
      { id: 'modalidades-licencia', label: '1. Modalidades de Licencia Disponibles (Beta Gratuita vs Plan Fundador)', level: 2 },
      { id: 'activacion-un-clic', label: '2. Activación de Licencia Beta en 1 Clic (Directo en la Aplicación)', level: 2 },
      { id: 'modo-exploracion', label: '3. Modo Exploración: Evaluar el Panel y Ajustes sin Clave', level: 2 },
      { id: 'solicitar-beta-manual', label: '4. Solicitud Web y Activación Manual de Claves (EB-XXXXX)', level: 2 },
      { id: 'amarre-hardware', label: '5. Amarre Criptográfico a Hardware (HWID) y Privacidad', level: 2 },
      { id: 'tolerancia-offline', label: '6. Tolerancia a Caídas de Red y Modo Offline Seguro', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        El sistema de licencias de Bentian ERP Bridge está diseñado para ofrecer la máxima flexibilidad y confianza técnica. Permite probar el producto de forma completa durante 60 días sin necesidad de introducir tarjeta de crédito ni comprometerse a ningún pago, con un proceso de activación ultrarrápido diseñado para eliminar cualquier tipo de fricción comercial.
      </p>

      <h2 id="modalidades-licencia" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Modalidades de Licencia Disponibles (Beta Gratuita vs Plan Fundador)</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08]">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2 inline-block">Fase de Evaluación</span>
          <h3 class="text-base font-bold text-white mb-1">Beta Pública Gratuita (60 Días)</h3>
          <p class="text-xs text-zinc-400 mb-3 leading-relaxed">
            Acceso al 100% de las funciones: sincronización de pedidos a Factusol, stock bidireccional, recargo de equivalencia, tallas/colores y cola Store-and-Forward offline en JSON atómico.
          </p>
          <div class="text-sm font-bold text-emerald-400 font-mono">0 € / 60 días completos (Sin tarjeta)</div>
        </div>

        <div class="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2 inline-block">Plazas Limitadas (25 Plazas)</span>
          <h3 class="text-base font-bold text-white mb-1">Plan Fundador (Suscripción Anual)</h3>
          <p class="text-xs text-zinc-400 mb-3 leading-relaxed">
            Precio bonificado vitalicio reservado a las primeras 25 empresas que validan el producto en producción. Incluye soporte directo y actualizaciones automáticas continuas.
          </p>
          <div class="text-sm font-bold text-amber-400 font-mono">139 € / año <span class="text-xs text-zinc-500 line-through font-normal">199 €/año</span></div>
        </div>
      </div>

      <h2 id="activacion-un-clic" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Activación de Licencia Beta en 1 Clic (Directo en la Aplicación)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        A diferencia de otros softwares comerciales que exigen rellenar extensos formularios web y esperar correos de confirmación, Bentian ERP Bridge incorpora un sistema de <strong>Activación en 1 Clic</strong> directamente dentro de la propia aplicación:
      </p>

      <!-- Card explicativo activación 1 clic -->
      <div class="p-5 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/30 mb-6">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="text-base font-bold text-white">⚡ Activar Licencia Beta Gratuita en 1 Clic</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACCESO TOTAL 2026</span>
          </div>
          <span class="text-xs text-zinc-300">Sin tarjeta ni compromiso</span>
        </div>
        <p class="text-xs text-zinc-300 leading-relaxed mb-4">
          En el <strong>Paso 1 del Asistente Inicial</strong>, encontrarás este bloque destacado. Solo tienes que seguir estos pasos:
        </p>
        <ol class="text-xs text-zinc-200 space-y-2 list-decimal list-inside mb-4">
          <li>Escribe tu correo electrónico corporativo (ej: <code class="text-indigo-300 font-mono">info@tuempresa.com</code>).</li>
          <li>Haz clic en el botón <strong class="text-white bg-indigo-600 px-2 py-0.5 rounded text-[11px]">Activar en 1 Clic ⚡</strong>.</li>
          <li>En menos de 2 segundos, el agente contacta al servidor central mediante TLS 1.3, emite una clave oficial vinculada a tu equipo y avanza automáticamente al Paso 2 del Asistente.</li>
        </ol>
        <div class="text-[11px] text-zinc-400">
          ✓ Cero esperas &nbsp;•&nbsp; ✓ Cero páginas externas &nbsp;•&nbsp; ✓ Clave Beta oficial emitida al instante
        </div>
      </div>

      <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 mb-8 flex items-start gap-3">
        <svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <div>
          <strong class="font-semibold text-white block mb-0.5">Idempotencia y Recuperación Segura</strong>
          Si en el futuro reinstalas el agente o trasladas el conector a otro ordenador, solo vuelve a introducir tu mismo correo electrónico: el servidor reconocerá tu cuenta y reanudará tu licencia sin duplicar registros.
        </div>
      </div>

      <h2 id="modo-exploracion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Modo Exploración: Evaluar el Panel y Ajustes sin Clave</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        ¿Has descargado Bentian ERP Bridge desde Softpedia o la web para evaluar la interfaz y quieres ver cómo es el programa antes de introducir tu email? No hay ningún problema.
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En el pie del Paso 1 del Asistente dispones del enlace:
      </p>
      <div class="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.08] text-center mb-4">
        <span class="text-xs text-zinc-400 underline font-medium cursor-pointer">
          Saltar por ahora y explorar el programa sin clave →
        </span>
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Al hacer clic en esta opción, el asistente se cerrará temporalmente y accederás directamente al panel de control en <strong>Modo Exploración</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Explorar todas las pantallas:</strong> Podrás ver la pestaña de Estado General, revisar los gráficos de telemetría de CPU y memoria, examinar la pantalla de configuración de Factusol y consultar el visor de eventos (Logs).</li>
        <li><strong>Comprobar el rendimiento:</strong> Verifica la fluidez de la interfaz en tu equipo sin registrar ninguna cuenta.</li>
        <li><strong>Activar cuando estés listo:</strong> Cuando decidas poner en marcha la sincronización, podrás activar tu clave Beta en 1 clic en cualquier momento haciendo clic en la pestaña <strong class="text-white">Licencia del Equipo</strong> o pulsando en <strong class="text-white">Asistente de Inicio</strong> en la barra lateral.</li>
      </ul>

      <h2 id="solicitar-beta-manual" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Solicitud Web y Activación Manual de Claves (EB-XXXXX)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si prefieres solicitar tu clave a través del navegador web o ya dispones de una clave facilitada por tu distribuidor autorizado o equipo técnico de Bentian:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Visita la página web oficial de la beta: <a href="/beta/" class="text-indigo-400 hover:text-indigo-300 font-medium underline">https://bridge.cristianjm.com/beta/</a>.</li>
        <li>Introduce tu correo electrónico corporativo para recibir tu clave con formato canónico: <code class="text-emerald-400 font-mono font-bold">EB-BETA-XXXX-XXXX-XXXX</code>.</li>
        <li>En el agente de Bentian (Paso 1 del Asistente o pestaña <em>Licencia del Equipo</em>), pulsa el botón <strong class="text-zinc-200">Pegar y Activar</strong>: el programa leerá la clave directamente del portapapeles de Windows y la validará al instante.</li>
      </ol>

      <h2 id="amarre-hardware" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Amarre Criptográfico a Hardware (HWID) y Privacidad</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para proteger la integridad del conector y prevenir clonaciones no autorizadas, cada licencia activa se vincula al identificador de hardware único del equipo (HWID). El HWID se calcula de forma unidireccional (hash SHA-256 no reversible) combinando:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-4 font-mono text-xs">
        <li>UUID del BIOS de la placa base</li>
        <li>Identificador del procesador (CPU ID)</li>
        <li>Número de serie del volumen del sistema de archivos Windows</li>
      </ul>
      <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] text-xs text-zinc-400 leading-relaxed mb-6">
        <strong class="text-white block mb-1">Compromiso Estricto de Privacidad Empresarial</strong>
        Ningún dato personal, ningún nombre de usuario, ni archivos de tu ordenador viajan al servidor. Únicamente se transmite el hash criptográfico matemático anonimizado para asegurar que la licencia se ejecuta en el puesto de trabajo autorizado.
      </div>

      <h2 id="tolerancia-offline" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Tolerancia a Caídas de Red y Modo Offline Seguro</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge está diseñado para la realidad operativa de pymes y almacenes, donde la conexión a Internet puede experimentar microcortes o caídas temporales:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Periodo de gracia offline criptográfico:</strong> Si se interrumpe la conexión a Internet, el conector sigue operando y registrando pedidos localmente en Factusol durante el periodo de gracia establecido sin bloquearse.</li>
        <li><strong>Prueba criptográfica Ed25519:</strong> La validez offline se certifica mediante una firma asimétrica de Bentian Cloud, inmune a caídas de DNS.</li>
        <li><strong>Protección contra alteración de fecha (Anti Clock-Rollback):</strong> El agente mantiene un registro monotónico cifrado (<code class="text-zinc-200 font-mono">clock.enc</code>). Retrasar la fecha en Windows no elude la expiración ni desestabiliza el motor.</li>
      </ul>
    `,
  },
  {
    slug: 'primeros-pasos/asistente-de-configuracion',
    categorySlug: 'primeros-pasos',
    title: 'Guía del Asistente de Configuración (Onboarding Wizard)',
    subtitle: 'Configuración guiada paso a paso en 5 minutos: activación en 1 clic, modo sin Factusol para evaluadores, selección de serie contable y soporte integrado.',
    badge: 'Onboarding Zero-Touch',
    readingTime: '6 min de lectura',
    metaTitle: 'Guía del Asistente de Inicio de Bentian ERP Bridge | Paso a Paso',
    metaDescription: 'Manual completo del Asistente de Configuración de Bentian ERP Bridge. Activación en 1 clic, modo continuar sin Factusol, Serie 1 vs W y documentación integrada.',
    keywords: 'asistente bentian, wizard factusol woocommerce, configuracion paso a paso bentian, conectar factusol facil, continuar sin factusol, serie 1 factusol pedidos web',
    toc: [
      { id: 'vision-general-asistente', label: '1. Visión General del Asistente Zero-Touch (4 Pasos)', level: 2 },
      { id: 'paso-1-licencia', label: '2. Paso 1: Licencia (Activación en 1 Clic o Modo Exploración)', level: 2 },
      { id: 'paso-2-factusol', label: '3. Paso 2: Conexión con Factusol y Modo Continuar sin Factusol', level: 2 },
      { id: 'serie-factusol-recomendada', label: '4. Configuración Clave: Serie 1 Directo vs Serie W en Factusol', level: 2 },
      { id: 'paso-3-tienda', label: '5. Paso 3: Conexión con la Tienda Web (Universal o WooCommerce)', level: 2 },
      { id: 'paso-4-listo', label: '6. Paso 4: ¡Todo Listo!, Spotlight Tour y Documentación Integrada', level: 2 },
      { id: 'notificaciones-multicanal', label: '7. Centro de Notificaciones Multi-Canal (Email SMTP Propio, Telegram y Discord)', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        La primera vez que abres Bentian ERP Bridge, el programa lanza automáticamente el <strong>Asistente de Configuración Rápida (Onboarding Wizard)</strong>. Este asistente está pensado para que cualquier responsable de administración, almacén o comercial —incluso sin experiencia técnica avanzada— complete la puesta en marcha en menos de 5 minutos.
      </p>

      <h2 id="vision-general-asistente" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Visión General del Asistente Zero-Touch (4 Pasos)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El asistente guía la configuración a través de 4 sencillos pasos visuales:
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 text-center text-xs">
        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.08]">
          <div class="font-bold text-indigo-400 mb-0.5">Paso 1</div>
          <div class="text-zinc-300">Licencia</div>
        </div>
        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.08]">
          <div class="font-bold text-indigo-400 mb-0.5">Paso 2</div>
          <div class="text-zinc-300">Factusol ERP</div>
        </div>
        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.08]">
          <div class="font-bold text-indigo-400 mb-0.5">Paso 3</div>
          <div class="text-zinc-300">Tienda Web</div>
        </div>
        <div class="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
          <div class="font-bold text-emerald-400 mb-0.5">Paso 4</div>
          <div class="text-emerald-300 font-semibold">¡Listo!</div>
        </div>
      </div>
      <p class="text-xs text-zinc-400 mb-6">
        <em>Nota:</em> Puedes volver a abrir el asistente en cualquier momento pulsando el botón <strong class="text-zinc-200">Asistente de Inicio</strong> en el pie de la barra lateral izquierda.
      </p>

      <h2 id="paso-1-licencia" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Paso 1: Licencia (Activación en 1 Clic o Modo Exploración)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En este primer paso vinculas la licencia de tu equipo. Dispones de dos vías diseñadas para máxima comodidad:
      </p>

      <!-- Bloque activación 1 clic -->
      <div class="p-4 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/30 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-bold text-white">Opción A (Recomendada): Activación en 1 Clic ⚡</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">BETA GRATIS 60 DÍAS</span>
        </div>
        <p class="text-xs text-zinc-300 leading-relaxed mb-3">
          Escribe tu dirección de correo (ej: <code class="text-indigo-300">ventas@tuempresa.com</code>) en la caja superior y pulsa en <strong class="text-white bg-indigo-600 px-2 py-0.5 rounded text-[11px]">Activar en 1 Clic ⚡</strong>. El sistema genera tu clave oficial en la nube, la asocia a tu equipo y avanza automáticamente al Paso 2 sin salir al navegador ni pedir datos bancarios.
        </p>
      </div>

      <div class="p-4 rounded-xl bg-zinc-900/40 border border-white/[0.08] mb-4">
        <div class="text-xs font-bold text-zinc-300 mb-1">Opción B: Pegar Clave Existente</div>
        <p class="text-xs text-zinc-400 leading-relaxed">
          Si ya tienes una clave (<code class="text-zinc-300 font-mono">EB-BETA-...</code> o Plan Fundador), pégala en el campo de texto y haz clic en <strong class="text-zinc-200">Pegar y Activar</strong>.
        </p>
      </div>

      <!-- Modo exploracion evaluadores -->
      <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] mb-6">
        <div class="text-xs font-bold text-amber-400 mb-1">Opción C: Modo Exploración para Evaluadores</div>
        <p class="text-xs text-zinc-400 leading-relaxed mb-2">
          ¿Descargaste la app desde Softpedia o la web para examinar la interfaz en tu portátil antes de registrar ningún dato?
        </p>
        <p class="text-xs text-zinc-300 leading-relaxed">
          Haz clic en el enlace inferior <strong class="text-white underline">Saltar por ahora y explorar el programa sin clave →</strong>. El asistente se cerrará y podrás recorrer todas las pantallas del panel de control libremente.
        </p>
      </div>

      <h2 id="paso-2-factusol" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Paso 2: Conexión con Factusol y Modo Continuar sin Factusol</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En este paso se selecciona la base de datos de tu empresa en Factusol (archivo con extensión <code class="text-indigo-300 font-mono">.accdb</code>, por ejemplo <code class="text-zinc-200 font-mono">0012026.accdb</code>):
      </p>

      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-4">
        <li><strong>Auto-detectar Factusol:</strong> Examina automáticamente las rutas habituales del disco <code class="text-zinc-200">C:\\Software DELSOL\\Factusol\\Datos\\FS\\</code> y muestra las empresas encontradas en un clic.</li>
        <li><strong>Examinar en Windows (Local / Red / NAS):</strong> Abre el selector oficial nativo de Windows (OpenFileDialog en STA thread) para navegar por carpetas locales, unidades de red mapeadas (<code class="text-zinc-300">Z:\\...</code>) o rutas UNC (<code class="text-zinc-300">\\\\NAS\\Datos\\...</code>) sin modales web lentos.</li>
        <li><strong>Pegar ruta directamente:</strong> Puedes copiar la ruta desde el Explorador de Windows con <em>Copiar como ruta de acceso</em>; el conector limpia automáticamente las comillas al pegar.</li>
      </ul>

      <!-- Card Continuar sin Factusol Evaluadores -->
      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 mb-6 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div>
          <div class="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
            <span>🧪</span>
            <span>¿No tienes Factusol en este ordenador?</span>
          </div>
          <p class="text-xs text-zinc-300 leading-relaxed">
            Si estás evaluando Bentian en tu portátil personal o en un equipo donde Factusol no está instalado físicamente (porque reside en el servidor del almacén), no te preocupes: pulsa en <strong class="text-amber-300">Continuar sin Factusol →</strong>. Podrás continuar configurando tu tienda web o explorar el panel en modo demostración. Podrás vincular tu Factusol en cualquier momento posterior desde la pestaña <em>Factusol ERP</em>.
          </p>
        </div>
      </div>

      <h2 id="serie-factusol-recomendada" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Configuración Clave: Serie 1 Directo vs Serie W en Factusol</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En el mismo Paso 2 encontrarás el selector pedagógico de <strong>Serie para Pedidos Web en Factusol</strong>. Este parámetro define en qué serie contable de Factusol se registrarán las ventas procedentes de tu web:
      </p>

      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Configuración de Serie</th>
              <th class="px-4 py-3 font-semibold">Comportamiento en Factusol</th>
              <th class="px-4 py-3 font-semibold">Visibilidad para el Personal</th>
              <th class="px-4 py-3 font-semibold">Veredicto Oficial</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-3 font-medium text-white">
                <span class="font-bold text-indigo-400 block">Serie 1 (Directo)</span>
                <span class="text-[10px] text-zinc-500">Valor por defecto '1'</span>
              </td>
              <td class="px-4 py-3 text-zinc-300">
                Los pedidos web entran en la bandeja principal de Factusol (<code class="text-zinc-200">Comercial → Pedidos de cliente</code>).
              </td>
              <td class="px-4 py-3 text-emerald-400 font-medium">
                Inmediata. Abres Factusol y el pedido web está el primero a la vista de cualquiera. Cero despistes.
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">⭐ Recomendado (95% Pymes)</span>
              </td>
            </tr>
            <tr>
              <td class="px-4 py-3 font-medium text-white">
                <span class="font-bold text-zinc-300 block">Serie W (Web)</span>
                <span class="text-[10px] text-zinc-500">Separada para ecommerce</span>
              </td>
              <td class="px-4 py-3 text-zinc-400">
                Los pedidos quedan clasificados contablemente en la serie 'W'.
              </td>
              <td class="px-4 py-3 text-amber-400">
                Ocultos por defecto. Requiere cambiar manualmente el filtro de serie en Factusol a <em>"Serie W"</em> o <em>"Todas"</em>.
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-white/[0.08]">Opcional Contable</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-8">
        <strong class="font-semibold text-white block mb-0.5">¿Por qué recomendamos mantener la Serie 1?</strong>
        En muchas empresas, los dependientes o administrativos abren Factusol y miran directamente la lista de pedidos. Si la pantalla se abre filtrada en la Serie 1 y los pedidos entran en la Serie W, pueden creer erróneamente que no hay ventas nuevas. Con la <strong>Serie 1</strong>, cualquier pedido web entra directo a la vista de todos: cero líos, cero llamadas a soporte.
      </div>

      <h2 id="paso-3-tienda" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Paso 3: Conexión con la Tienda Web (Universal o WooCommerce)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Selecciona el conector que corresponda a tu plataforma de comercio electrónico:
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08]">
          <div class="text-xs font-bold text-sky-400 mb-1 flex items-center gap-1.5">
            <span>🌐</span>
            <span>Conector Web Universal</span>
          </div>
          <p class="text-xs text-zinc-400 leading-relaxed mb-3">
            Para tiendas a medida en cualquier hosting (PHP, Angular, Laravel, Plesk, cPanel, Apache, Nginx).
          </p>
          <ol class="text-xs text-zinc-300 space-y-1 list-decimal list-inside">
            <li>Pulsa en <em>Descargar erp-bridge-endpoint.php</em>.</li>
            <li>Súbelo a la carpeta pública de tu web mediante FTP o Plesk.</li>
            <li>Pega tu URL (ej: <code class="text-zinc-200">https://mitienda.com</code>) y pulsa en <em>Comprobar</em>.</li>
          </ol>
        </div>

        <div class="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08]">
          <div class="text-xs font-bold text-purple-400 mb-1 flex items-center gap-1.5">
            <span>🛒</span>
            <span>WooCommerce</span>
          </div>
          <p class="text-xs text-zinc-400 leading-relaxed mb-3">
            Conexión nativa con claves API oficiales de WooCommerce.
          </p>
          <ol class="text-xs text-zinc-300 space-y-1 list-decimal list-inside">
            <li>Introduce la URL de tu tienda WordPress.</li>
            <li>Pega tu <em>Consumer Key</em> (<code class="text-zinc-300">ck_...</code>) y <em>Consumer Secret</em> (<code class="text-zinc-300">cs_...</code>).</li>
            <li>Haz clic en <em>Comprobar Conexión WooCommerce</em> para validar el handshake REST.</li>
          </ol>
        </div>
      </div>

      <h2 id="paso-4-listo" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Paso 4: ¡Todo Listo!, Spotlight Tour y Documentación Integrada</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Al hacer clic en <strong class="text-emerald-400 font-bold">Comenzar a Trabajar</strong>:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>El agente guarda tu configuración de forma blindada en <code class="text-zinc-200 font-mono">%APPDATA%\\Bentian Agent\\agent-config.json</code> con reemplazo atómico y copia defensiva.</li>
        <li>El motor local autónomo arranca la supervisión de pedidos y sincronización de stock en segundo plano.</li>
        <li>El sistema inicia un <strong>Spotlight Tour interactivo</strong> que te mostrará los controles esenciales del panel (estado del servicio, botón de sincronización forzada y visor de eventos).</li>
      </ol>

      <h2 id="notificaciones-multicanal" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">7. Centro de Notificaciones Multi-Canal (Email SMTP Propio, Telegram y Discord)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para mantener el asistente inicial rápido y sin fricciones, los avisos de nuevos pedidos se configuran de forma independiente desde la pestaña dedicada <strong>Notificaciones</strong> en el menú lateral de la app:
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-xs text-zinc-300">
        <div class="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.08]">
          <div class="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
            <span>✉️</span>
            <span>Email (SMTP Propio)</span>
          </div>
          <p class="text-zinc-400 leading-relaxed mb-2">
            Configura tu propio servidor de correo corporativo (Gmail, Outlook 365, cPanel o Plesk) con puerto seguro STARTTLS/SSL.
          </p>
          <p class="text-zinc-300 text-[11px]">
            Tus avisos no consumen cuotas ajenas ni dependen de servidores de terceros. Incluye botón <em>Probar Envío Email</em>.
          </p>
        </div>
        <div class="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.08]">
          <div class="font-bold text-sky-400 mb-1 flex items-center gap-1.5">
            <span>📱</span>
            <span>Telegram Bot</span>
          </div>
          <p class="text-zinc-400 leading-relaxed mb-2">
            Alertas push instantáneas y 100% gratuitas en tu móvil mediante la API de bots de Telegram (<code class="text-sky-300 font-mono">api.telegram.org</code>).
          </p>
          <p class="text-zinc-300 text-[11px]">
            Crea tu bot con <code class="text-zinc-200">@BotFather</code>, introduce tu <em>Chat ID</em> y pulsa en <em>Probar Envío Telegram</em>.
          </p>
        </div>
        <div class="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.08]">
          <div class="font-bold text-indigo-400 mb-1 flex items-center gap-1.5">
            <span>💬</span>
            <span>Discord Webhook</span>
          </div>
          <p class="text-zinc-400 leading-relaxed mb-2">
            Notificaciones enriquecidas en canales de equipo de Discord para almacén, administración o comerciales.
          </p>
          <p class="text-zinc-300 text-[11px]">
            Pega la URL del Webhook del canal y haz clic en <em>Probar Envío Discord</em> para ver el embed en directo.
          </p>
        </div>
      </div>

      <!-- Caja final acceso documentacion -->
      <div class="p-5 rounded-2xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-500/25 mb-6">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-bold text-white">📚 Soporte y Documentación Siempre a tu Alcance</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">INTEGRADO EN LA APP</span>
        </div>
        <p class="text-xs text-zinc-300 leading-relaxed mb-3">
          Si en cualquier momento tienes alguna duda técnica o comercial sobre el funcionamiento del conector, dispones de acceso directo a la documentación oficial desde la propia ventana de la aplicación:
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-300">
          <div class="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
            <strong class="text-white block mb-0.5">Barra Lateral</strong>
            Botón <em>Manuales &amp; Docs ↗</em> en el pie y pestaña <em>Documentación ↗</em> en la navegación.
          </div>
          <div class="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
            <strong class="text-white block mb-0.5">Cabecera Superior</strong>
            Botón <em>Documentación</em> y botón <em>Reportar Incidencia</em> visibles en todas las pantallas.
          </div>
          <div class="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
            <strong class="text-white block mb-0.5">Diagnóstico y Logs</strong>
            Botón <em>Documentación Web ↗</em> y catálogo de guías recomendadas para Factusol y canales.
          </div>
        </div>
      </div>
    `,
  },
];
