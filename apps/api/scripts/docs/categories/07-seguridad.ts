import { DocArticle } from '../types';

export const seguridadArticles: DocArticle[] = [
  {
    slug: 'seguridad/antivirus-edr-smartscreen',
    categorySlug: 'seguridad',
    title: 'Exclusiones de Antivirus y EDR (Principio de Mínimo Privilegio)',
    subtitle: 'Reglas estrictas de exclusión para Microsoft Defender, Bitdefender, CrowdStrike Falcon y SentinelOne sin abrir brechas globales.',
    badge: 'Seguridad Corporativa',
    readingTime: '7 min de lectura',
    metaTitle: 'Exclusiones de Antivirus y EDR para Factusol | Bentian ERP',
    metaDescription: 'Cómo configurar exclusiones en Microsoft Defender, Bitdefender, CrowdStrike y SentinelOne para Bentian ERP Bridge bajo el Principio de Mínimo Privilegio.',
    keywords: 'exclusiones antivirus factusol, windows defender bentian, crowdstrike factusol cscript, sentinelone factusol, bitdefender factusol, seguridad edr conector factusol',
    toc: [
      { id: 'principio-minimo-privilegio', label: '1. El Principio de Mínimo Privilegio y Reglas Prohibidas', level: 2 },
      { id: 'las-tres-reglas-permitidas', label: '2. Las 3 Únicas Reglas Permitidas en Endpoint', level: 2 },
      { id: 'windows-defender', label: '3. Microsoft Defender Antivirus (Script PowerShell)', level: 2 },
      { id: 'edr-corporativos', label: '4. Suites EDR: CrowdStrike Falcon, SentinelOne y Bitdefender', level: 2 },
      { id: 'antivirus-adicionales', label: '5. Kaspersky Endpoint, Avast y AVG', level: 2 },
      { id: 'verificacion-conexiones', label: '6. Verificación de Red Saliente (Cero Puertos Entrantes)', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        En entornos empresariales y redes corporativas protegidas por antivirus de última generación y plataformas EDR (Endpoint Detection and Response), configurar exclusiones genéricas o globales constituye una vulnerabilidad crítica que los administradores de sistemas y responsables de CISO rechazan de plano.
      </p>

      <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 mb-6 leading-relaxed">
        <strong class="text-rose-200 block mb-1">PROHIBICIÓN ESTRICTA Y ADVERTENCIA DE SEGURIDAD EDR / CISO:</strong>
        PROHIBIDO configurar exclusiones globales para <code>cscript.exe</code> o comodines <code>*.accdb</code> / <code>*.laccdb</code> en todo el sistema. Dichas prácticas debilitan las defensas del Endpoint corporativo y son rechazadas por suites EDR.
      </div>

      <h2 id="principio-minimo-privilegio" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Principio de Mínimo Privilegio y Reglas Prohibidas</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Excluir de forma global intérpretes nativos del sistema operativo como <code class="text-rose-400">cscript.exe</code> o aplicar comodines como <code class="text-rose-400">*.accdb</code> en todo el disco duro expone el equipo a técnicas de <em>Living off the Land</em> (LotL) y ataques de ransomware ajenos a Bentian.
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge opera bajo el <strong>Principio de Mínimo Privilegio Real</strong>: la seguridad del puesto de trabajo prevalece y todas las autorizaciones deben ser quirúrgicas, acotadas exclusivamente a las rutas de sus binarios legítimos, la base de datos empresarial concreta y reglas condicionales por proceso padre.
      </p>

      <h2 id="las-tres-reglas-permitidas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Las 3 Únicas Reglas Permitidas en Endpoint</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para garantizar el rendimiento en microescrituras OLEDB de Factusol sin comprometer la seguridad perimetral ni la detección heurística, se deben implementar <strong>única y exclusivamente las siguientes 3 reglas</strong>:
      </p>

      <div class="space-y-3 mb-6">
        <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <div class="text-xs font-bold text-emerald-400 font-mono mb-1">REGLA 1: Exclusión de proceso por binario de Bentian</div>
          <p class="text-xs text-zinc-300 leading-relaxed mb-2">Autoriza la ejecución de los binarios firmados y verificados del agente por su ruta canónica absoluta:</p>
          <div class="p-2.5 rounded-lg bg-black/40 font-mono text-xs text-emerald-300 space-y-1">
            <div>C:\\Program Files\\Bentian Agent\\BentianAgent.exe</div>
            <div>C:\\Program Files\\Bentian Agent\\BentianTray.exe</div>
            <div class="text-zinc-500 text-[11px] font-sans">En instalaciones por usuario: %LOCALAPPDATA%\\Bentian Agent\\*.exe</div>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <div class="text-xs font-bold text-amber-400 font-mono mb-1">REGLA 2: Exclusión de carpeta de datos específica de la empresa</div>
          <p class="text-xs text-zinc-300 leading-relaxed mb-2">Excluye el análisis en tiempo real en la carpeta donde reside la base de datos de Factusol para evitar bloqueos del archivo de cerrojo <code>.laccdb</code> y errores de concurrencia <code>3045</code>. <strong>PROHIBIDO comodín global en el disco</strong>:</p>
          <div class="p-2.5 rounded-lg bg-black/40 font-mono text-xs text-amber-300 space-y-1">
            <div>C:\\Software DELSOL\\Factusol\\Datos\\FS01\\ <span class="text-zinc-500 font-sans">(Directorio específico de la empresa)</span></div>
            <div class="text-zinc-400">\\\\SERVIDOR\\Datos\\FS01\\ <span class="text-zinc-500 font-sans">(O ruta UNC de red correspondiente)</span></div>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <div class="text-xs font-bold text-indigo-400 font-mono mb-1">REGLA 3: Exclusión del perfil de aplicación en AppData</div>
          <p class="text-xs text-zinc-300 leading-relaxed mb-2">Permite la persistencia segura de la configuración local (<code>agent-config.json</code>) y la rotación de trazas de diagnóstico:</p>
          <div class="p-2.5 rounded-lg bg-black/40 font-mono text-xs text-indigo-300">
            %APPDATA%\\Bentian Agent\\
          </div>
        </div>
      </div>

      <h2 id="windows-defender" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Microsoft Defender Antivirus (Script PowerShell)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Ejecuta el siguiente script en una consola de <strong>PowerShell como Administrador</strong>. Aplica de forma automatizada las 3 reglas de Mínimo Privilegio sin abrir brechas en el sistema:
      </p>

      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 mb-6 overflow-x-auto">
        <div class="text-zinc-500 mb-2"># Script oficial de Mínimo Privilegio para Microsoft Defender</div>
        <div class="text-cyan-400"># 1. Regla 1: Exclusión de procesos legítimos de Bentian</div>
        <div>Add-MpPreference -ExclusionProcess "C:\\Program Files\\Bentian Agent\\BentianAgent.exe"</div>
        <div>Add-MpPreference -ExclusionProcess "C:\\Program Files\\Bentian Agent\\BentianTray.exe"</div>
        <div class="mt-2 text-cyan-400"># 2. Regla 2: Exclusión de carpeta de datos específica de Factusol</div>
        <div>Add-MpPreference -ExclusionPath "C:\\Software DELSOL\\Factusol\\Datos\\FS01"</div>
        <div class="text-zinc-500"># En entornos de red: Add-MpPreference -ExclusionPath "\\\\SERVIDOR\\Datos\\FS01"</div>
        <div class="mt-2 text-cyan-400"># 3. Regla 3: Exclusión del perfil en AppData y actualización atómica</div>
        <div>Add-MpPreference -ExclusionPath "$env:APPDATA\\Bentian Agent"</div>
        <div>Add-MpPreference -ExclusionPath "$env:TEMP\\bentian-updates"</div>
      </div>

      <h2 id="edr-corporativos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Suites EDR: CrowdStrike Falcon, SentinelOne y Bitdefender</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Las suites EDR corporativas inspeccionan la genealogía de procesos (relación padre/hijo) e impiden la ejecución de scripts no autorizados. Para homologar Bentian ERP Bridge respetando las políticas de CISO:
      </p>

      <div class="space-y-4 mb-6">
        <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <h3 class="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            CrowdStrike Falcon Sensor (Regla Custom IOA y SHA-256)
          </h3>
          <p class="text-xs text-zinc-300 leading-relaxed mb-3">
            El motor de Falcon detecta la invocación de <code>cscript.exe</code> como potencial técnica LotL. Cree una regla de exclusión de indicadores de ataque (IOA) <strong>estrictamente condicionada al proceso padre</strong>:
          </p>
          <div class="p-3 rounded-lg bg-black/40 font-mono text-xs text-zinc-300 space-y-1">
            <div><strong>Parent Image Filename:</strong> <span class="text-emerald-400">.*\\\\BentianAgent\\.exe</span></div>
            <div><strong>Image Filename:</strong> <span class="text-emerald-400">.*\\\\cscript\\.exe</span></div>
            <div><strong>Command Line:</strong> <span class="text-emerald-400">.*adodb\\.js.*</span></div>
            <div><strong>Action:</strong> <span class="text-emerald-300 font-bold">Allow / No Alert</span></div>
          </div>
          <p class="text-xs text-zinc-400 mt-2">
            Adicionalmente, en <em>Sensor & ML Exclusions</em> agregue el hash criptográfico <strong>SHA-256</strong> del binario oficial publicado en cada release de Bentian.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <h3 class="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            SentinelOne (Singularity Platform - Interoperabilidad)
          </h3>
          <p class="text-xs text-zinc-300 leading-relaxed mb-2">
            En la consola de gestión de SentinelOne, diríjase a <strong>Sentinels → Exclusions</strong> y configure:
          </p>
          <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong>Path & Hash Exclusion:</strong> Excluya por hash SHA-256 el binario verificado <code>BentianAgent.exe</code>.</li>
            <li><strong>Interoperability / Behavioral AI Exclusion:</strong> Regla de supresión de alerta condicionada a que el proceso invocador sea <code>BentianAgent.exe</code> sobre el conector OLEDB local.</li>
            <li><strong>Folder Exclusion:</strong> Directorio específico de datos de Factusol (modo: In-process & On-write).</li>
          </ul>
        </div>

        <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
          <h3 class="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            Bitdefender GravityZone Cloud
          </h3>
          <p class="text-xs text-zinc-300 leading-relaxed mb-2">
            En la consola centralizada de GravityZone (<strong>Policies → Antimalware → Exclusions</strong>):
          </p>
          <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong>Exclusión de Procesos:</strong> Agregue por ruta absoluta <code>C:\\Program Files\\Bentian Agent\\BentianAgent.exe</code> y <code>BentianTray.exe</code>.</li>
            <li><strong>Exclusión de Carpetas:</strong> Añada la carpeta acotada de Factusol (ej: <code>C:\\Software DELSOL\\Factusol\\Datos\\FS01\\</code>) para evitar contención de bloqueos <code>.laccdb</code>.</li>
            <li><strong>Advanced Threat Defense (ATD):</strong> Autorice el binario oficial firmado de Bentian en la lista de aplicaciones de confianza.</li>
          </ul>
        </div>
      </div>

      <h2 id="antivirus-adicionales" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Kaspersky Endpoint, Avast y AVG</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para suites antivirus estándar en puestos de oficina:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Kaspersky Endpoint Security:</strong> Añadir <code>BentianAgent.exe</code> y <code>BentianTray.exe</code> a <em>Aplicaciones de confianza</em> con la opción <em>"No supervisar la actividad de la aplicación"</em> activa.</li>
        <li><strong>Avast Antivirus y AVG Internet Security:</strong> En <em>General → Excepciones</em>, agregue la ruta de instalación <code>C:\\Program Files\\Bentian Agent\\*</code> y la carpeta de datos de Factusol. En <em>Escudo contra ransomware</em>, confirme que <code>BentianAgent.exe</code> figure como aplicación permitida.</li>
      </ul>

      <h2 id="verificacion-conexiones" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Verificación de Red Saliente (Cero Puertos Entrantes)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge ha sido auditado para entornos corporativos con auditoría estricta de red:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
        <li><strong>Tráfico 100% Saliente:</strong> El agente solo realiza peticiones HTTPS salientes estándar por el puerto TCP 443 hacia la tienda web del cliente y la API central (<code>bridge.cristianjm.com</code>).</li>
        <li><strong>Cero Puertos Entrantes:</strong> No expone ningún servicio hacia la red local ni hacia Internet; no requiere reglas NAT ni aperturas en el firewall perimetral.</li>
        <li><strong>Aislamiento Local:</strong> La interfaz gráfica del agente escucha estrictamente en la interfaz de bucle invertido <code>127.0.0.1:39281</code>, completamente inaccesible desde otros equipos de la red corporativa.</li>
      </ul>
    `,
  },
  {
    slug: 'seguridad/windows-smartscreen',
    categorySlug: 'seguridad',
    title: 'Windows SmartScreen: Autorización y Reputación de Binarios',
    subtitle: 'Por qué Windows muestra la pantalla azul \'Windows protegió su PC\' en versiones nuevas y cómo autorizar la ejecución en 2 clics.',
    badge: 'Seguridad Windows',
    readingTime: '4 min de lectura',
    metaTitle: 'Cómo Autorizar Bentian en Windows SmartScreen | Documentación',
    metaDescription: 'Cómo autorizar la ejecución de Bentian-Setup.exe en Windows SmartScreen. Por qué Microsoft muestra la advertencia en versiones recientes y firma digital.',
    keywords: 'windows smartscreen bentian, windows protegio su pc factusol, desbloquear ejecutable windows defender, smartscreen bentian setup exe',
    toc: [
      { id: 'que-es-smartscreen', label: '1. ¿Qué es Microsoft Defender SmartScreen?', level: 2 },
      { id: 'como-autorizar', label: '2. Procedimiento de Autorización en 2 Clics', level: 2 },
      { id: 'desbloqueo-powershell', label: '3. Desbloqueo Específico vía PowerShell (Zone.Identifier)', level: 2 },
      { id: 'verificacion-virustotal', label: '4. Verificación de Seguridad en VirusTotal (0/70)', level: 2 },
      { id: 'reputacion-acumulada', label: '5. Reputación de Nuevas Versiones y Mínimo Privilegio', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Al descargar e iniciar por primera vez el instalador oficial <code class="text-zinc-200">Bentian-Setup.exe</code> en Windows 10, Windows 11 o Windows Server, es posible que el sistema muestre la pantalla azul preventiva: <em>"Windows protegió su PC (Microsoft Defender SmartScreen evitó el inicio de una aplicación no reconocida)"</em>.
      </p>

      <h2 id="que-es-smartscreen" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Qué es Microsoft Defender SmartScreen?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        SmartScreen es un sistema de reputación basado en la nube de Microsoft. Cuando un desarrollador publica una nueva versión o actualización menor, dicho archivo ejecutable carece inicialmente de un historial acumulado de millones de ejecuciones en los servidores centrales de Microsoft. Hasta que un número representativo de usuarios lo ejecuta sin incidentes, SmartScreen muestra esta pantalla informativa por defecto.
      </p>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Esta advertencia <strong>no indica la presencia de malware</strong>, sino únicamente que el binario es de reciente compilación y está ganando reputación en los sistemas de Microsoft.
      </p>

      <h2 id="como-autorizar" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Procedimiento de Autorización en 2 Clics</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para continuar con la instalación oficial de Bentian ERP Bridge de manera directa:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>En la ventana azul de SmartScreen, haz clic sobre el texto subrayado <strong class="text-indigo-400 underline">Más información</strong> (*"More info"*).</li>
        <li>La ventana se expandirá mostrando el nombre del ejecutable (<code class="text-zinc-200">Bentian-Setup.exe</code>) y el autor verificado.</li>
        <li>Haz clic en el botón <strong class="text-emerald-400 font-bold">Ejecutar de todas formas</strong> (*"Run anyway"*). El asistente se iniciará con normalidad.</li>
      </ol>

      <h2 id="desbloqueo-powershell" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Desbloqueo Específico vía PowerShell (Zone.Identifier)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En entornos administrados por IT o en Windows 11 con <em>Smart App Control (SAC)</em> activo, los administradores pueden desbloquear el archivo descargado sin debilitar las políticas del sistema operativo:
      </p>

      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 mb-4 overflow-x-auto">
        <div class="text-zinc-500 mb-1"># Elimina la marca de origen web (Zone.Identifier) ÚNICAMENTE del instalador legítimo</div>
        <div class="text-emerald-400">Unblock-File -Path "$env:USERPROFILE\\Downloads\\Bentian-Setup*.exe"</div>
      </div>

      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mb-6 leading-relaxed">
        <strong class="text-amber-200 block mb-1">Principio de Mínimo Privilegio en SmartScreen:</strong>
        Queda terminantemente desaconsejado desactivar SmartScreen a nivel global en Windows (mediante registro o directivas de grupo). El desbloqueo debe realizarse exclusivamente sobre el archivo ejecutable específico descargado.
      </div>

      <h2 id="verificacion-virustotal" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Verificación de Seguridad en VirusTotal (0/70)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cada release oficial de Bentian ERP Bridge es sometida a escaneos rigurosos y públicos en <strong>VirusTotal</strong>, obteniendo de forma consistente una calificación limpia de <strong>0 / 70 detecciones</strong> de antivirus, confirmando la ausencia absoluta de virus, troyanos o adware.
      </p>

      <h2 id="reputacion-acumulada" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Reputación de Nuevas Versiones y Mínimo Privilegio</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Cada nueva entrega oficial se publica acompañada de su hash criptográfico SHA-256 y firma asimétrica <strong>Ed25519</strong> en el manifiesto oficial de versiones. Los administradores corporativos pueden validar la integridad del paquete antes de distribuirlo a los terminales de facturación de la empresa.
      </p>
    `,
  },
  {
    slug: 'seguridad/criptografia-y-actualizaciones',
    categorySlug: 'seguridad',
    title: 'Criptografía Asimétrica Ed25519 y Actualización Atómica',
    subtitle: 'Cómo protege Bentian la integridad del software: firmas asimétricas de actualización, UpdateSwapper desacoplado y rollback automático.',
    badge: 'Criptografía & Blindaje',
    readingTime: '5 min de lectura',
    metaTitle: 'Seguridad Criptográfica y Actualización Atómica | Bentian ERP',
    metaDescription: 'Arquitectura de seguridad en actualizaciones de Bentian: firmas asimétricas Ed25519 en manifest.json, UpdateSwapper desacoplado y rollback en Windows.',
    keywords: 'firmas ed25519 bentian, update swapper windows, actualizacion atomica factusol, seguridad ejecutable bentian, rollback automatico bentian',
    toc: [
      { id: 'el-peligro-actualizaciones-windows', label: '1. El Peligro de las Auto-Actualizaciones en Windows', level: 2 },
      { id: 'firmas-ed25519', label: '2. Firmas Asimétricas Ed25519 en el Manifiesto', level: 2 },
      { id: 'el-motor-updateswapper', label: '3. El Proceso Desacoplado UpdateSwapper', level: 2 },
      { id: 'monitor-estabilidad-rollback', label: '4. Monitor de Estabilidad de 10 Segundos y Rollback', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        En Windows, un proceso en ejecución no puede sobrescribir su propio archivo ejecutable en disco (provoca un error de bloqueo de archivo a nivel de kernel). Actualizar un servicio de sincronización empresarial de forma desatendida requiere una arquitectura de seguridad capaz de prevenir corrupciones y ataques de suplantación.
      </p>

      <h2 id="el-peligro-actualizaciones-windows" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Peligro de las Auto-Actualizaciones en Windows</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Si un programa descarga un archivo ejecutable y lo reemplaza directamente sin comprobar su firma, cualquier atacante que intercepte la red mediante un ataque Man-in-the-Middle (MitM) podría inyectar código malicioso en el servidor de la empresa.
      </p>

      <h2 id="firmas-ed25519" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Firmas Asimétricas Ed25519 en el Manifiesto</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Todas las versiones y parches publicados por Bentian incluyen un archivo <code class="text-zinc-200">manifest.json</code> firmado criptográficamente con la clave privada de curva elíptica <strong>Ed25519</strong> del autor.
      </p>
      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6 font-mono">
        El agente contiene compilada en su interior la clave pública de Bentian. Antes de tocar el disco, verifica que:
        <div class="text-emerald-300 mt-1">Ed25519.verify(manifest.sha256, manifest.signature, BENTIAN_PUBLIC_KEY) === true</div>
        Si un solo byte del archivo ha sido alterado, la actualización se rechaza de inmediato.
      </div>

      <h2 id="el-motor-updateswapper" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. El Proceso Desacoplado UpdateSwapper</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Una vez validada la firma, el agente delega la sustitución a un proceso independiente llamado <code class="text-indigo-300">UpdateSwapper</code> que opera desde el directorio temporal (<code class="text-zinc-400 font-mono">%TEMP%\\bentian-updates\\</code>):
      </p>
      <ol class="text-sm text-zinc-300 space-y-1.5 list-decimal list-inside mb-6">
        <li>Solicita elevación UAC si el directorio de destino requiere permisos de Administrador.</li>
        <li>Detiene de forma ordenada los procesos <code class="text-zinc-200">BentianAgent.exe</code> y <code class="text-zinc-200">BentianTray.exe</code>.</li>
        <li>Renombra el binario actual como copia de seguridad (<code class="text-zinc-200 font-mono">BentianAgent.exe.bak</code>).</li>
        <li>Copia el nuevo ejecutable verificado y arranca la nueva versión.</li>
      </ol>

      <h2 id="monitor-estabilidad-rollback" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Monitor de Estabilidad de 10 Segundos y Rollback</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Tras iniciar la nueva versión, el <code class="text-zinc-200">UpdateSwapper</code> no finaliza de inmediato: monitoriza la ejecución durante <strong>10 segundos</strong>. Si el nuevo proceso colapsara por alguna incompatibilidad imprevista de librerías, el swapper mata el proceso fallido, restaura automáticamente el archivo <code class="text-zinc-200 font-mono">.bak</code> anterior y devuelve el sistema a producción en su estado estable.
      </p>
    `,
  },
];
