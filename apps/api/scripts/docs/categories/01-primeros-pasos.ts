import { DocArticle } from '../types';

export const primerosPasosArticles: DocArticle[] = [
  {
    slug: 'primeros-pasos/requisitos-del-sistema',
    categorySlug: 'primeros-pasos',
    title: 'Requisitos del Sistema y Entorno Operativo',
    subtitle: 'Especificaciones mínimas de hardware, versiones compatibles de Windows y configuración de red para ejecutar Bentian ERP Bridge.',
    badge: 'Requisitos & Compatibilidad',
    readingTime: '4 min de lectura',
    metaTitle: 'Requisitos del Sistema para Bentian ERP Bridge | Documentación Oficial',
    metaDescription: 'Requisitos mínimos y recomendados de hardware, sistema operativo (Windows 10, 11 y Windows Server), permisos UAC y red para Bentian ERP Bridge.',
    keywords: 'requisitos bentian, factusol windows 11, factusol windows server, requisitos conector factusol, permisos administrador bentian',
    toc: [
      { id: 'sistemas-operativos', label: '1. Sistemas Operativos Compatibles', level: 2 },
      { id: 'hardware-minimo', label: '2. Requisitos de Hardware', level: 2 },
      { id: 'permisos-uac', label: '3. Privilegios de Usuario y UAC', level: 2 },
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
          El agente debe instalarse en el mismo equipo donde reside Factusol o en cualquier estación de trabajo Windows que tenga acceso por red local (LAN / SMB / NAS) a la base de datos de la empresa.
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
            <li><strong>Almacenamiento:</strong> 250 MB libres en disco SSD/HDD para el agente y la base de datos local SQLite.</li>
            <li><strong>Pantalla:</strong> Resolución mínima de 1280x720 para el panel de control.</li>
          </ul>
        </div>
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-indigo-500/20 bg-indigo-950/10">
          <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Requisitos Recomendados</h4>
          <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong>CPU:</strong> Intel Core i5 / AMD Ryzen 5 (4 núcleos o más).</li>
            <li><strong>RAM:</strong> 8 GB o 16 GB (recomendado para catálogos >30.000 referencias).</li>
            <li><strong>Almacenamiento:</strong> Disco NVMe SSD para acceso ultrarrápido al archivo <code class="text-indigo-300">.accdb</code>.</li>
            <li><strong>Red:</strong> Tarjeta Gigabit Ethernet (1 Gbps) si Factusol reside en un NAS o servidor compartido.</li>
          </ul>
        </div>
      </div>

      <h2 id="permisos-uac" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Privilegios de Usuario y UAC</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para instalar y ejecutar Bentian ERP Bridge se requieren <strong>privilegios de Administrador local</strong>. Esto se debe a dos motivos técnicos esenciales:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li><strong>Registro de controladores COM / OLEDB:</strong> La comunicación con bases de datos Access (<code class="text-zinc-200 font-mono">.accdb</code>) requiere invocar los subsistemas OLEDB registrados en <code class="text-zinc-400 font-mono">HKEY_LOCAL_MACHINE\\Software\\Classes</code>.</li>
        <li><strong>Acceso a unidades de red compartidas:</strong> Para que el proceso de fondo mantenga abiertos los handles de lectura sobre recursos compartidos SMB sin interrupción por políticas de ahorro de energía.</li>
      </ol>

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
    title: 'Instalación y Despliegue del Agente en Windows',
    subtitle: 'Procedimiento de instalación paso a paso, arquitectura del binario empaquetado, ejecución en segundo plano e icono en la bandeja del sistema.',
    badge: 'Guía de Despliegue',
    readingTime: '5 min de lectura',
    metaTitle: 'Cómo Instalar Bentian ERP Bridge en Windows | Guía Técnica',
    metaDescription: 'Paso a paso para instalar Bentian ERP Bridge en Windows 10, 11 o Windows Server. Instalador oficial, modo aplicación y servicio en bandeja de sistema.',
    keywords: 'instalar bentian, instalador factusol woocommerce, bentian setup exe, desplegar conector factusol, bentian tray windows',
    toc: [
      { id: 'descarga-instalador', label: '1. Descarga del Instalador Oficial', level: 2 },
      { id: 'proceso-instalacion', label: '2. Proceso de Instalación en Disco', level: 2 },
      { id: 'modo-escritorio-edge', label: '3. Modo Escritorio Aislado (Edge App)', level: 2 },
      { id: 'bandeja-sistema', label: '4. Control desde la Bandeja del Sistema (Tray)', level: 2 },
      { id: 'actualizaciones-automaticas', label: '5. Actualizaciones Silenciosas Atómicas', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Bentian ERP Bridge se distribuye como un ejecutable compilado nativo de Windows (<code class="text-zinc-200 font-mono">Bentian-Setup.exe</code>). Su motor de ejecución integra Node.js SEA (Single Executable Application) con el motor V8 inyectado directamente en el binario, evitando la necesidad de instalar Node, Python ni dependencias externas en el ordenador de la empresa.
      </p>

      <h2 id="descarga-instalador" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Descarga del Instalador Oficial</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Descarga siempre el instalador desde la ruta canónica oficial protegida con certificado SSL:
      </p>
      <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between gap-4 mb-6">
        <div>
          <div class="text-xs font-mono text-indigo-400">Ruta de descarga directa permanente:</div>
          <div class="text-sm font-semibold text-white">/releases/latest/Bentian-Setup.exe</div>
        </div>
        <a href="/releases/latest/Bentian-Setup.exe" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition shrink-0">
          Descargar Instalador Oficial
        </a>
      </div>

      <h2 id="proceso-instalacion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Proceso de Instalación en Disco</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El instalador ubica los archivos binarios de ejecución en <code class="text-indigo-300 font-mono">C:\\Program Files\\Bentian Agent\\</code> o en <code class="text-indigo-300 font-mono">%LOCALAPPDATA%\\Bentian Agent\\</code> y crea los siguientes elementos:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>BentianAgent.exe:</strong> El motor principal de sincronización que ejecuta el bucle de eventos, escucha en el puerto local <code class="text-zinc-200">39281</code> y gestiona la cola SQLite de pedidos.</li>
        <li><strong>BentianTray.exe:</strong> Proceso ligero en C# que coloca el icono en la bandeja del sistema (System Tray) y gestiona los diálogos nativos de Windows en STA thread.</li>
        <li><strong>Acceso directo en Escritorio y Menú Inicio:</strong> Permite abrir la consola de administración en cualquier momento.</li>
        <li><strong>Entrada en Inicio automático de Windows:</strong> Configura la ejecución silenciosa al iniciar sesión para que la sincronización opere sin intervención del usuario.</li>
      </ul>

      <h2 id="modo-escritorio-edge" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Modo Escritorio Aislado (Edge App)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        A diferencia de las herramientas que se abren como una pestaña más en Google Chrome (donde el usuario puede cerrarla por descuido), Bentian invoca Microsoft Edge en modo aplicación aislada:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 mb-6">
        msedge.exe --app=http://127.0.0.1:39281 --new-window --window-size=1180,820
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Esto proporciona una ventana independiente con su propio icono en la barra de tareas, previene el <em>Foreground Lockout</em> de Windows 11 y garantiza que el panel de control se ejecute a pantalla completa con estética de aplicación nativa.
      </p>

      <h2 id="bandeja-sistema" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Control desde la Bandeja del Sistema (Tray)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando minimizas o cierras la ventana del panel de control, <strong>la sincronización NO se detiene</strong>. El agente permanece activo en la bandeja del sistema, junto al reloj de Windows:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Clic izquierdo:</strong> Abre o enfoca de inmediato la ventana de control.</li>
        <li><strong>Clic derecho:</strong> Despliega el menú contextual rápido:
          <ul class="list-circle list-inside ml-6 mt-1 text-xs text-zinc-400 space-y-1">
            <li><em>Abrir Panel de Control</em></li>
            <li><em>Forzar Sincronización Ahora</em></li>
            <li><em>Pausar Sincronización Temporalmente</em></li>
            <li><em>Ver Registro de Actividad (Logs)</em></li>
            <li><em>Salir de Bentian ERP Bridge</em></li>
          </ul>
        </li>
      </ul>

      <h2 id="actualizaciones-automaticas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Actualizaciones Silenciosas Atómicas</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian incluye un sistema de autoactualización atómica desacoplada (<code class="text-indigo-300">UpdateSwapper</code>). Cada hora, el agente consulta si existe una versión superior en el servidor central. Si la hay:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Descarga el parche en <code class="text-zinc-400 font-mono">%TEMP%\\bentian-updates\\</code>.</li>
        <li>Verifica criptográficamente la firma <strong>Ed25519</strong> del archivo con la clave pública de Bentian.</li>
        <li>Ejecuta el swapper desacoplado que detiene los procesos bloqueantes, sustituye el ejecutable y monitoriza 10 segundos de estabilidad. Si ocurriera algún fallo, revierte de forma automática al binario previo (<code class="text-zinc-400">.bak</code>).</li>
      </ol>
    `,
  },
  {
    slug: 'primeros-pasos/activacion-de-licencias',
    categorySlug: 'primeros-pasos',
    title: 'Activación de Licencias, Beta de 60 Días y Plan Fundador',
    subtitle: 'Funcionamiento del sistema de licencias, amarre a hardware (HWID), periodo de gracia offline y condiciones del Plan Fundador.',
    badge: 'Licencias & Facturación',
    readingTime: '5 min de lectura',
    metaTitle: 'Activación de Licencia y Plan Fundador | Bentian ERP Bridge',
    metaDescription: 'Cómo activar tu clave de licencia en Bentian ERP Bridge. Especificación de la Beta de 60 días, validación criptográfica HWID y Plan Fundador.',
    keywords: 'licencia bentian, activar bentian factusol, clave beta bentian, plan fundador bentian, licenciamiento erp bridge',
    toc: [
      { id: 'modalidades-licencia', label: '1. Modalidades de Licencia Disponibles', level: 2 },
      { id: 'solicitar-beta', label: '2. Cómo Solicitar la Clave Beta de 60 Días', level: 2 },
      { id: 'proceso-activacion', label: '3. Procedimiento de Activación en el Agente', level: 2 },
      { id: 'amarre-hardware', label: '4. Amarre Criptográfico a Hardware (HWID)', level: 2 },
      { id: 'tolerancia-offline', label: '5. Tolerancia a Caídas de Red y Monitoreo de Reloj', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        El sistema de licencias de Bentian ERP Bridge está diseñado para ofrecer la máxima flexibilidad y confianza técnica. Permite probar el producto de forma completa durante 60 días sin necesidad de introducir tarjeta de crédito ni comprometerse a ningún pago.
      </p>

      <h2 id="modalidades-licencia" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Modalidades de Licencia Disponibles</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08]">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2 inline-block">Fase de Evaluación</span>
          <h3 class="text-base font-bold text-white mb-1">Beta Pública Gratuita (60 Días)</h3>
          <p class="text-xs text-zinc-400 mb-3 leading-relaxed">
            Acceso al 100% de las funciones: sincronización de pedidos a Factusol, stock bidireccional, recargo de equivalencia, tallas/colores y cola SQLite offline.
          </p>
          <div class="text-sm font-bold text-emerald-400 font-mono">0 € / 60 días completos</div>
        </div>

        <div class="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2 inline-block">Plazas Limitadas (25 Plazas)</span>
          <h3 class="text-base font-bold text-white mb-1">Plan Fundador (Suscripción Anual)</h3>
          <p class="text-xs text-zinc-400 mb-3 leading-relaxed">
            Precio bonificado vitalicio reservado a las primeras 25 empresas que validan el producto en producción. Incluye soporte directo y actualizaciones automáticas.
          </p>
          <div class="text-sm font-bold text-amber-400 font-mono">139 € / año <span class="text-xs text-zinc-500 line-through font-normal">199 €/año</span></div>
        </div>
      </div>

      <h2 id="solicitar-beta" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Cómo Solicitar la Clave Beta de 60 Días</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Puedes solicitar una clave beta en cualquier momento desde la página oficial de la beta o directamente en el asistente inicial del agente:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Visita <a href="/beta/" class="text-indigo-400 hover:text-indigo-300 font-medium underline">https://bridge.cristianjm.com/beta/</a>.</li>
        <li>Introduce tu correo electrónico corporativo en el formulario.</li>
        <li>Recibirás al instante una clave con formato canónico: <code class="text-emerald-400 font-mono font-bold">EB-BETA-XXXX-XXXX-XXXX</code>.</li>
        <li>El sistema es <strong>idempotente</strong>: si solicitas la clave nuevamente con el mismo email, el servidor te devolverá la misma clave con su fecha original de expiración.</li>
      </ol>

      <h2 id="proceso-activacion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Procedimiento de Activación en el Agente</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para activar tu licencia en el agente:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Abre el panel de control de Bentian en tu ordenador.</li>
        <li>En el <strong>Paso 1 del Asistente</strong> o en la pestaña <strong>Licencia</strong>, pega tu clave en el campo correspondiente.</li>
        <li>Haz clic en el botón <strong class="text-indigo-400">Activar Licencia</strong>.</li>
        <li>El agente validará la firma con el servidor central y activará el motor de sincronización de inmediato.</li>
      </ol>

      <h2 id="amarre-hardware" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Amarre Criptográfico a Hardware (HWID)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para proteger la integridad del producto y prevenir duplicaciones no autorizadas, cada licencia activa se vincula al identificador de hardware único del equipo (HWID). El HWID se calcula de forma unidireccional (hash SHA-256 no reversible) combinando:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6 font-mono text-xs">
        <li>UUID del BIOS de la placa base</li>
        <li>Identificador de procesador (CPU ID)</li>
        <li>Número de serie del volumen del sistema de archivos Windows</li>
      </ul>
      <p class="text-xs text-zinc-400 leading-relaxed mb-6">
        <em>Nota de privacidad:</em> Ningún dato personal de tu equipo se envía al servidor. Solo se transmite el hash criptográfico anonimizado para verificar que la clave se ejecuta en el ordenador autorizado.
      </p>

      <h2 id="tolerancia-offline" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Tolerancia a Caídas de Red y Monitoreo de Reloj</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian está diseñado para trabajar en entornos industriales donde la conexión a Internet puede experimentar cortes:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Periodo de gracia offline:</strong> Si se interrumpe la conexión a Internet, el agente continuará sincronizando pedidos y stock con Factusol durante un periodo de gracia sin bloquearse.</li>
        <li><strong>Protección contra manipulación de fecha:</strong> El agente mantiene un registro monotónico cifrado (<code class="text-zinc-200">clock.enc</code>). Retrasar la fecha del sistema en Windows no elude la expiración de la licencia.</li>
      </ul>
    `,
  },
  {
    slug: 'primeros-pasos/asistente-de-configuracion',
    categorySlug: 'primeros-pasos',
    title: 'Guía del Asistente de Configuración (Onboarding Wizard)',
    subtitle: 'Configuración guiada paso a paso para poner en marcha tu primera sincronización de Factusol en menos de 5 minutos.',
    badge: 'Onboarding Zero-Touch',
    readingTime: '4 min de lectura',
    metaTitle: 'Guía del Asistente de Inicio de Bentian ERP Bridge',
    metaDescription: 'Cómo utilizar el Asistente de Configuración de 5 pasos en Bentian ERP Bridge. Detección automática de Factusol, conexión con WooCommerce y alertas.',
    keywords: 'asistente bentian, wizard factusol woocommerce, configuracion paso a paso bentian, conectar factusol facil',
    toc: [
      { id: 'paso-1-licencia', label: 'Paso 1: Validación de Licencia', level: 2 },
      { id: 'paso-2-factusol', label: 'Paso 2: Conexión con Factusol ERP y Serie', level: 2 },
      { id: 'paso-3-tienda', label: 'Paso 3: Conexión con WooCommerce o PrestaShop', level: 2 },
      { id: 'paso-4-alertas', label: 'Paso 4: Alertas Transaccionales por Email', level: 2 },
      { id: 'paso-5-spotlight', label: 'Paso 5: Finalización y Tour Guiado', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        La primera vez que abres Bentian ERP Bridge, el programa lanza automáticamente el <strong>Asistente de Configuración Inicial (Wizard)</strong>. Este asistente está pensado para que cualquier usuario, incluso sin conocimientos informáticos avanzados, complete la puesta en marcha en 5 minutos.
      </p>

      <h2 id="paso-1-licencia" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">Paso 1: Validación de Licencia</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En este paso introduces tu clave de licencia. Si todavía no dispones de una, puedes hacer clic en el enlace para solicitar tu clave gratuita de 60 días y pegarla directamente con el botón <em>Pegar y Activar</em>.
      </p>

      <h2 id="paso-2-factusol" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">Paso 2: Conexión con Factusol ERP y Serie</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian examina automáticamente las rutas habituales de instalación de Factusol en el disco <code class="text-zinc-200">C:</code>. Si encuentra el archivo de la empresa (ej: <code class="text-indigo-300">0012026.accdb</code>), lo preselecciona de forma automática.
      </p>
      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6">
        <strong class="text-white block mb-1">⭐ Elección de la Serie de Pedidos (Recomendado: Serie 1 Directo)</strong>
        El asistente te permite elegir la serie contable en la que se registrarán los pedidos web. Recomendamos dejar la <strong>Serie 1</strong> para que los pedidos aparezcan en la bandeja principal nada más abrir Factusol, sin necesidad de tocar filtros contables.
      </div>

      <h2 id="paso-3-tienda" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">Paso 3: Conexión con WooCommerce o PrestaShop</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Selecciona tu plataforma de comercio electrónico e introduce la URL de tu tienda y las claves de API (Consumer Key y Consumer Secret). Haz clic en <strong class="text-indigo-400">Probar Conexión</strong>: el agente realizará un ping inmediato para verificar que el hosting responde con código HTTP 200.
      </p>

      <h2 id="paso-4-alertas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">Paso 4: Alertas Transaccionales por Email</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Introduce las direcciones de correo (por ejemplo: <code class="text-zinc-200">pedidos@tuempresa.com, almacen@tuempresa.com</code>) donde deseas recibir una confirmación inmediata cada vez que entra un nuevo pedido web en Factusol con su número de pedido y desglose contable.
      </p>

      <h2 id="paso-5-spotlight" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">Paso 5: Finalización y Tour Guiado</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Al hacer clic en <strong class="text-emerald-400">Guardar e Iniciar Sincronización</strong>, el agente guardará tu configuración en <code class="text-zinc-200">%APPDATA%\\Bentian Agent\\agent-config.json</code>, activará la sincronización en segundo plano y te mostrará un <strong>Spotlight Tour</strong> visual que te enseñará dónde consultar el estado del conector, forzar lecturas de stock y ver los registros de actividad.
      </p>
    `,
  },
];
