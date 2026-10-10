import { DocArticle } from '../../types';

export const requisitosDelSistemaArticle: DocArticle = {
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
};
