import { DocArticle } from '../../types';

export const requisitosDelSistemaArticle: DocArticle = {
  slug: 'primeros-pasos/requisitos-del-sistema',
  categorySlug: 'primeros-pasos',
  title: 'Requisitos del Sistema, Certificación Softpedia y Entorno Operativo',
  subtitle: 'Especificaciones técnicas oficiales verificadas por Softpedia (4.5/5 estrellas), requisitos de hardware (x64 nativo), permisos UAC (Instalador vs Portable), desinstalación limpia y configuración de red.',
  badge: 'Requisitos & Compatibilidad Oficial',
  readingTime: '6 min de lectura',
  metaTitle: 'Requisitos del Sistema para Bentian ERP Bridge | Verificado Softpedia',
  metaDescription: 'Requisitos oficiales de hardware y Windows 10/11 x64 para Bentian ERP Bridge verificados por Softpedia (4.5/5 estrellas, 100% Clean). Permisos UAC, desinstalación y OLEDB 2016.',
  keywords: 'requisitos bentian, softpedia bentian erp bridge, alexandra sava softpedia, requisitos factusol windows 11, requisitos conector factusol, permisos administrador bentian, desinstalacion limpia bentian, oledb ace 64 bits factusol',
  toc: [
    { id: 'acreditacion-softpedia', label: '1. Acreditación Oficial Softpedia 100% Clean (4.5/5 Estrellas)', level: 2 },
    { id: 'sistemas-operativos', label: '2. Sistemas Operativos Compatibles (x64 Exclusivo)', level: 2 },
    { id: 'hardware-minimo', label: '3. Requisitos de Hardware Verificados por Softpedia', level: 2 },
    { id: 'permisos-uac-desinstalacion', label: '4. Privilegios UAC (Instalador vs Portable) y Desinstalación Limpia', level: 2 },
    { id: 'red-puertos', label: '5. Configuración de Red y Seguridad (Cero Puertos Entrantes)', level: 2 },
    { id: 'software-adicional', label: '6. Motor Relacional y Controlador OLEDB Requerido', level: 2 },
  ],
  contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Bentian ERP Bridge es una aplicación de escritorio nativa de <strong>arquitectura x64</strong> diseñada específicamente para entornos empresariales Windows. A diferencia de plugins web o scripts PHP que sobrecargan el servidor de la tienda, el agente de Bentian opera como un servicio local de alto rendimiento que consulta directamente el motor relacional de Factusol o SimplyGest en memoria, garantizando sincronizaciones en milisegundos con cero impacto en el mostrador.
      </p>

      <!-- Callout Certificación Softpedia 100% Clean -->
      <div class="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/25 mb-8">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400 font-bold text-lg">
            S
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <h3 class="text-sm font-bold text-white">Certificación Oficial Softpedia: 100% CLEAN Award</h3>
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">★ 4.5 / 5 Estrellas</span>
              <span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono">0/70 en VirusTotal</span>
            </div>
            <p class="text-xs text-zinc-300 leading-relaxed mb-2">
              Bentian ERP Bridge ha sido sometido a rigurosos análisis de laboratorio independiente por la prestigiosa plataforma internacional <strong>Softpedia</strong>, obteniendo una calificación editorial de <strong class="text-emerald-400">4.5 sobre 5 estrellas</strong> concedida por la editora técnica <strong class="text-white">Alexandra Sava</strong>. El certificado oficial acredita que el software está <strong>100% libre de adware, spyware, troyanos, mineros, barras de herramientas o software empaquetado no deseado</strong>.
            </p>
            <div class="text-[11px] text-zinc-400 flex flex-wrap items-center gap-3">
              <span>Editora técnica: <strong class="text-zinc-200">Alexandra Sava</strong></span>
              <span>•</span>
              <a href="https://www.softpedia.com/get/Internet/Servers/Database-Utils/Bentian-ERP-Bridge.shtml" target="_blank" rel="noopener noreferrer" class="text-blue-300 underline hover:text-blue-200 transition font-medium">
                Ver ficha y review oficial en Softpedia ↗
              </a>
              <span>•</span>
              <a href="/docs/seguridad/certificacion-softpedia-100-clean/" class="text-indigo-400 hover:text-indigo-300 transition font-medium">
                Leer informe completo de certificación y análisis antivirus →
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-8 flex items-start gap-3">
        <svg class="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <strong class="font-semibold text-white block mb-0.5">Arquitectura 100% Local-First</strong>
          El agente puede instalarse en el mismo equipo donde reside Factusol o SimplyGest o en cualquier estación de trabajo Windows que disponga de acceso por red local (LAN / SMB / NAS) a la base de datos de la empresa.
        </div>
      </div>

      <h2 id="acreditacion-softpedia" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Acreditación Oficial Softpedia 100% Clean (4.5/5 Estrellas)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Los requerimientos técnicos y la fiabilidad de Bentian ERP Bridge han sido verificados de forma independiente por el equipo de analistas de ciberseguridad de <strong>Softpedia</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Calificación Editorial Sobresaliente:</strong> 4.5/5 estrellas otorgadas por la analista técnica Alexandra Sava tras pruebas funcionales en laboratorio y entornos Windows reales.</li>
        <li><strong>0/70 Detecciones en VirusTotal:</strong> Escaneado multimotor sin falsos positivos ni alertas heurísticas en Microsoft Defender, CrowdStrike Falcon, SentinelOne, Bitdefender GravityZone, Kaspersky Endpoint, Sophos y ESET.</li>
        <li><strong>Ausencia Absoluta de Adware y Telemetría:</strong> Cero software empaquetado, cero recolección de hábitos de facturación o márgenes, y cero inyección publicitaria.</li>
        <li><strong>Transparencia de Código y Binarios Firmados:</strong> Cada release se publica con firma criptográfica asimétrica Ed25519 (RFC 8032) y suma canónica SHA-256 contrastable.</li>
      </ul>

      <h2 id="sistemas-operativos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Sistemas Operativos Compatibles (x64 Exclusivo)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge está compilado para <strong>arquitecturas nativas de 64 bits (x64)</strong>. No es compatible con sistemas de 32 bits (x86), dado que los motores relacionales de Factusol/SimplyGest y el controlador Microsoft ACE OLEDB de 64 bits exigen espacio de direccionamiento completo de memoria. Es compatible con las siguientes versiones de Windows:
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
              <td class="px-4 py-2.5 font-mono text-emerald-400">x64 exclusivamente</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Oficial / Recomendado</span></td>
              <td class="px-4 py-2.5">Soporte nativo para Edge App Window aislado con aceleración hardware.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Windows 10 (1909 – 22H2)</td>
              <td class="px-4 py-2.5 font-mono text-emerald-400">x64 exclusivamente</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Oficial</span></td>
              <td class="px-4 py-2.5">Totalmente compatible con Microsoft Edge WebView2 / App nativa.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Windows Server 2022 / 2025</td>
              <td class="px-4 py-2.5 font-mono text-emerald-400">x64 exclusivamente</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Oficial / Servidor</span></td>
              <td class="px-4 py-2.5">Óptimo para servidores dedicados de almacén o entornos virtualizados Hyper-V / Proxmox.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Windows Server 2016 / 2019</td>
              <td class="px-4 py-2.5 font-mono text-emerald-400">x64 exclusivamente</td>
              <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Compatible</span></td>
              <td class="px-4 py-2.5">Requiere instalación previa del navegador Microsoft Edge basado en Chromium.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="hardware-minimo" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Requisitos de Hardware Verificados por Softpedia</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Gracias a su arquitectura de consultas compiladas OLEDB indexadas en memoria, el impacto del agente en la máquina es inferior al 0,5% de uso continuo de CPU. A continuación se detallan las especificaciones oficiales verificadas en la review de Softpedia:
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08]">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Requisitos Mínimos (Softpedia)</h4>
            <span class="px-2 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">Verificado</span>
          </div>
          <ul class="text-xs text-zinc-300 space-y-2 list-disc list-inside">
            <li><strong>Arquitectura de Proceso:</strong> x64 nativa (Intel Core i3 / AMD Ryzen 3 o superior, 2 núcleos a 2.0 GHz).</li>
            <li><strong>Memoria RAM:</strong> Mínimo <strong>500 MB de RAM libre</strong> (especificación oficial Softpedia; 4 GB de memoria física total en el sistema).</li>
            <li><strong>Espacio en Disco:</strong> <strong>100 MB de espacio disponible en disco</strong> (para el instalador, los ejecutables compilados y el almacenamiento JSON atómico en AppData).</li>
            <li><strong>Pantalla:</strong> Resolución mínima de 1280x720 para la ventana de administración local.</li>
          </ul>
        </div>
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-indigo-500/20 bg-indigo-950/10">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Requisitos Recomendados</h4>
            <span class="px-2 py-0.5 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Alto Volumen</span>
          </div>
          <ul class="text-xs text-zinc-300 space-y-2 list-disc list-inside">
            <li><strong>CPU:</strong> Intel Core i5 / AMD Ryzen 5 o superior (4 núcleos o más).</li>
            <li><strong>RAM:</strong> 8 GB o 16 GB de RAM física (óptimo para catálogos masivos &gt;30.000 referencias y sincronizaciones multitarea).</li>
            <li><strong>Almacenamiento:</strong> Unidad SSD NVMe para acceso instantáneo a la base de datos <code class="text-indigo-300">.accdb</code> en menos de 5 ms.</li>
            <li><strong>Red:</strong> Tarjeta de red Gigabit Ethernet (1 Gbps) si los datos del ERP (Factusol o SimplyGest) se alojan en un servidor NAS o recurso compartido SMB.</li>
          </ul>
        </div>
      </div>

      <h2 id="permisos-uac-desinstalacion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Privilegios UAC (Instalador vs Portable) y Desinstalación Limpia</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ofrece dos modalidades oficiales de distribución adaptadas a las políticas de seguridad de cada empresa:
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.08]">
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">Instalador Oficial (.exe)</span>
            <span class="text-xs font-semibold text-white">Requiere Elevación Puntual</span>
          </div>
          <p class="text-xs text-zinc-400 leading-relaxed mb-3">
            El asistente de instalación solicita elevación UAC <strong>única y exclusivamente</strong> para registrar la ejecución silenciosa en el arranque de Windows (<code class="text-zinc-300 font-mono">HKCU\\...\\Run</code>), crear accesos directos en el menú inicio y ubicar los binarios en <code class="text-zinc-300 font-mono">Program Files</code>.
          </p>
          <div class="text-[11px] text-zinc-500">Recomendado para puestos fijos de facturación, almacenes y servidores dedicados.</div>
        </div>

        <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Versión Portable (.zip)</span>
            <span class="text-xs font-semibold text-emerald-300">Cero Permisos / Usuario Estándar</span>
          </div>
          <p class="text-xs text-zinc-300 leading-relaxed mb-3">
            <strong>NO requiere permisos de Administrador ni elevación UAC.</strong> Puedes descomprimirlo en cualquier carpeta de usuario (<code class="text-zinc-200">Descargas</code>, <code class="text-zinc-200">Escritorio</code>) o en un pendrive USB y ejecutarlo de forma inmediata. No altera el Registro de Windows y almacena su estado en <code class="text-zinc-200">%APPDATA%</code>.
          </p>
          <div class="text-[11px] text-emerald-400 font-medium">Ideal para evaluadores, consultores externos y portátiles con políticas IT restringidas.</div>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] mb-6">
        <h4 class="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          Procedimiento de Desinstalación Limpia (Certificado Softpedia)
        </h4>
        <p class="text-xs text-zinc-300 leading-relaxed mb-3">
          Softpedia verificó que Bentian ERP Bridge no deja residuos en el sistema operativo tras su desinstalación:
        </p>
        <ol class="text-xs text-zinc-300 space-y-1.5 list-decimal list-inside mb-3">
          <li>Abre <strong>Configuración de Windows &gt; Aplicaciones &gt; Aplicaciones instaladas</strong> (o <em>Panel de Control &gt; Programas y características</em>).</li>
          <li>Localiza <strong class="text-white">Bentian ERP Bridge</strong> y haz clic en <strong>Desinstalar</strong>. El asistente removerá los binarios y las asociaciones del sistema en segundos.</li>
          <li><strong>Borrado voluntario de estado:</strong> Si deseas eliminar la configuración local y el historial de sincronizaciones, elimina voluntariamente el directorio <code class="text-zinc-200 font-mono">%APPDATA%\\Bentian Agent\\</code>. Cero claves huérfanas en el Registro de Windows.</li>
        </ol>
      </div>

      <h2 id="red-puertos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Configuración de Red y Seguridad (Cero Puertos Entrantes)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Uno de los mayores blindajes de seguridad de Bentian ERP Bridge destacados en la auditoría de Softpedia es que <strong>NO abre ningún puerto entrante en tu router ni en el cortafuegos de Windows</strong>:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Puerto local de interfaz (Loopback):</strong> Escucha únicamente en la interfaz interna <code class="text-indigo-300 font-mono">http://127.0.0.1:39281</code>. Este puerto está estrictamente confinado al ordenador local y es completamente inaccesible desde la red local o desde Internet.</li>
        <li><strong>Comunicaciones salientes:</strong> Todas las sincronizaciones hacia tu tienda online (WooCommerce, PrestaShop, Shopify) y hacia la API central de licencias se efectúan como peticiones salientes seguras mediante <strong class="text-white">HTTPS (Puerto 443 TCP)</strong> cifrado con <strong>TLS 1.3</strong>.</li>
        <li><strong>Cero exposición perimetral:</strong> No requiere configurar DMZ, NAT ni aperturas de puertos en el router corporativo de tu oficina o almacén.</li>
      </ul>

      <h2 id="software-adicional" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Motor Relacional y Controlador OLEDB Requerido</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Tanto Factusol como SimplyGest Desktop almacenan internamente su información empresarial en bases de datos relacionales Microsoft Access / Jet (<code class="text-zinc-200">.accdb</code> o <code class="text-zinc-200">Datos.mdb</code>). Para que el agente de Bentian interactúe con el catálogo y pedidos con arquitectura nativa de 64 bits sin depender de la GUI del ERP, el equipo debe contar con el proveedor OLEDB oficial de Microsoft:
      </p>
      <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] mb-6">
        <h4 class="text-sm font-semibold text-white mb-1">Microsoft Access Database Engine 2016 Redistributable (64 bits)</h4>
        <p class="text-xs text-zinc-400 mb-3">
          Proporciona el proveedor relacional <code class="text-zinc-200 font-mono">Microsoft.ACE.OLEDB.16.0</code> (o superior) compatible con Factusol y SimplyGest. Si el ERP ya se encuentra instalado en el ordenador, este controlador suele venir preconfigurado. Si el asistente inicial de Bentian reportara una alerta de OLEDB ausente, puedes instalarlo en 1 minuto de forma totalmente gratuita.
        </p>
        <div class="flex items-center gap-3 flex-wrap">
          <a href="/docs/troubleshooting/error-oledb-no-registrado/" class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
            <span>Ver guía paso a paso de instalación del controlador OLEDB →</span>
          </a>
          <span class="text-zinc-600">·</span>
          <a href="/docs/factusol/controladores-oledb-ace/" class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition">
            <span>Comparativa técnica: OLEDB vs ODBC →</span>
          </a>
          <span class="text-zinc-600">·</span>
          <a href="/docs/simplygest/conexion-mdb/" class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition">
            <span>Conexión a Datos.mdb en SimplyGest →</span>
          </a>
        </div>
      </div>
    `,
  relatedSlugs: [
    'primeros-pasos/instalacion-y-despliegue',
    'primeros-pasos/asistente-de-configuracion',
    'seguridad/certificacion-softpedia-100-clean',
    'factusol/controladores-oledb-ace',
    'simplygest/conexion-mdb',
  ],
};
