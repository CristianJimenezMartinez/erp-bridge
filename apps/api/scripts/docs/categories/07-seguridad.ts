import { DocArticle } from '../types';

export const seguridadArticles: DocArticle[] = [
  {
    slug: 'seguridad/antivirus-edr-smartscreen',
    categorySlug: 'seguridad',
    title: 'Exclusiones de Antivirus y EDR (Principio de Mínimo Privilegio)',
    subtitle: 'Reglas estrictas de exclusión para Microsoft Defender, Bitdefender, Kaspersky y CrowdStrike Falcon sin abrir brechas globales.',
    badge: 'Seguridad Corporativa',
    readingTime: '6 min de lectura',
    metaTitle: 'Exclusiones de Antivirus y EDR para Factusol | Bentian ERP',
    metaDescription: 'Cómo configurar exclusiones en Microsoft Defender, Bitdefender y CrowdStrike para Bentian ERP Bridge bajo el Principio de Mínimo Privilegio.',
    keywords: 'exclusiones antivirus factusol, windows defender bentian, crowdstrike factusol cscript, bitdefender factusol, seguridad edr conector factusol',
    toc: [
      { id: 'principio-minimo-privilegio', label: '1. El Principio de Mínimo Privilegio', level: 2 },
      { id: 'windows-defender', label: '2. Configuración en Microsoft Defender Antivirus y SmartScreen', level: 2 },
      { id: 'avast-avg', label: '3. Configuración en Avast Antivirus y AVG', level: 2 },
      { id: 'antivirus-corporativos', label: '4. Bitdefender GravityZone y Kaspersky Endpoint', level: 2 },
      { id: 'crowdstrike-falcon', label: '5. CrowdStrike Falcon EDR (Reglas IOA)', level: 2 },
      { id: 'verificacion-conexiones', label: '6. Verificación de Conexiones Salientes', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        En entornos empresariales y redes corporativas protegidas por antivirus de última generación y plataformas EDR (Endpoint Detection and Response), configurar exclusiones genéricas o globales (como excluir <code class="text-rose-400">*.accdb</code> o todo <code class="text-rose-400">cscript.exe</code>) constituye una vulnerabilidad inaceptable que los administradores de sistemas y responsables de CISO rechazan de plano.
      </p>

      <h2 id="principio-minimo-privilegio" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Principio de Mínimo Privilegio</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge recomienda aplicar exclusivamente <strong>reglas de ruta y proceso específicas</strong> que autoricen el funcionamiento legítimo del conector sin mermar la protección de la empresa frente a malware o ransomware:
      </p>
      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6 font-mono space-y-1">
        <div><strong class="text-white font-sans">Rutas autorizadas específicas:</strong></div>
        <div class="text-emerald-300">C:\\Program Files\\Bentian Agent\\BentianAgent.exe</div>
        <div class="text-emerald-300">C:\\Program Files\\Bentian Agent\\BentianTray.exe</div>
        <div class="text-zinc-400">%APPDATA%\\Bentian Agent\\*</div>
        <div class="text-zinc-400">%TEMP%\\bentian-updates\\*</div>
        <div class="text-amber-300">Carpeta de datos de Factusol (ej: C:\\Software DELSOL\\Factusol\\Datos\\FS\\*)</div>
      </div>

      <h2 id="windows-defender" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Configuración en Microsoft Defender Antivirus y SmartScreen</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para autorizar el conector en <strong>Microsoft Defender SmartScreen</strong> y configurar la exclusión en Microsoft Defender Antivirus en Windows 10 o Windows 11:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Si aparece la ventana azul de <em>Windows Defender SmartScreen</em> ("Windows protegió su PC"), haz clic en <strong>Más información</strong> y selecciona <strong>Ejecutar de todas formas</strong>.</li>
        <li>Abre <strong class="text-white">Seguridad de Windows</strong> (icono de escudo junto al reloj del sistema).</li>
        <li>Selecciona <strong class="text-white">Protección contra virus y amenazas → Administrar la configuración</strong>.</li>
        <li>En la sección <em>Exclusiones</em>, haz clic en <strong class="text-indigo-400">Agregar o quitar exclusiones</strong>.</li>
        <li>Pulsa <em>Agregar una exclusión</em> y selecciona <strong>Carpeta</strong> para incluir <code class="text-zinc-200">C:\\Program Files\\Bentian Agent</code>.</li>
      </ol>

      <h2 id="avast-avg" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Configuración en Avast Antivirus y AVG</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En <strong>Avast Antivirus</strong> o <strong>AVG Internet Security</strong>, añade una excepción para evitar que el escudo de comportamiento bloquee las llamadas OLEDB locales:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Abre la interfaz de Avast Antivirus o AVG y accede a <strong class="text-white">Menú → Opciones (Configuración)</strong>.</li>
        <li>En la pestaña <em>General</em>, haz clic en <strong class="text-indigo-400">Excepciones</strong> y pulsa <strong>Añadir excepción</strong>.</li>
        <li>Introduce la ruta de instalación: <code class="text-zinc-200">C:\\Program Files\\Bentian Agent\\*</code>.</li>
        <li>Haz clic en <em>Añadir excepción</em> para confirmar y reiniciar el agente.</li>
      </ol>

      <h2 id="antivirus-corporativos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Bitdefender GravityZone y Kaspersky Endpoint</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En las consolas centralizadas de Bitdefender o Kaspersky:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li>Crea una política de exclusión de análisis en tiempo real (*On-Access Scan*) para la ruta de instalación de Bentian.</li>
        <li>En el módulo de <em>Protección contra ransomware</em> o <em>Control de aplicaciones</em>, añade los binarios <code class="text-zinc-200">BentianAgent.exe</code> y <code class="text-zinc-200">BentianTray.exe</code> al grupo de <strong>Aplicaciones Confiables</strong>.</li>
      </ul>

      <h2 id="crowdstrike-falcon" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. CrowdStrike Falcon EDR (Reglas IOA)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        El sensor de Falcon vigila la invocación de herramientas de administración de Windows. Para entornos de máxima seguridad, define una regla personalizada IOA Exclusion condicionada a que el proceso padre sea el binario legítimo de Bentian:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono text-zinc-300 space-y-1 mb-6">
        <div>Parent Image: <span class="text-emerald-300">.*\\\\BentianAgent\\.exe</span></div>
        <div>Action: <span class="text-emerald-400 font-bold">Allow / No Alert</span></div>
      </div>

      <h2 id="verificacion-conexiones" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Verificación de Conexiones Salientes</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Bentian solo realiza peticiones salientes por el puerto 443 TCP (HTTPS) hacia el dominio de tu tienda online y hacia <code class="text-indigo-300">bridge.cristianjm.com</code>. No abre puertos de escucha en la red local ni requiere excepciones en el firewall perimetral.
      </p>
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
      { id: 'verificacion-virustotal', label: '3. Verificación de Seguridad en VirusTotal (0/70)', level: 2 },
      { id: 'reputacion-acumulada', label: '4. Reputación de Nuevas Versiones en Windows', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Al descargar y ejecutar una versión recién publicada de <code class="text-zinc-200">Bentian-Setup.exe</code> en Windows 10 o Windows 11, es posible que el sistema muestre la pantalla azul de aviso: <em>"Windows protegió su PC (Microsoft Defender SmartScreen impidió el inicio de una aplicación no reconocida)"</em>.
      </p>

      <h2 id="que-es-smartscreen" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Qué es Microsoft Defender SmartScreen?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        SmartScreen es un sistema de reputación basado en la nube de Microsoft. Cuando un desarrollador publica un archivo ejecutable nuevo, dicho archivo carece de un historial previo de millones de descargas en los servidores de Microsoft. Hasta que un número suficiente de usuarios de todo el mundo lo descarga y ejecuta con éxito, SmartScreen muestra esta advertencia preventiva por defecto a cualquier software independiente.
      </p>

      <h2 id="como-autorizar" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Procedimiento de Autorización en 2 Clics</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Para continuar con la instalación de forma segura y autorizar el programa:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>En la ventana azul de SmartScreen, haz clic en el enlace <strong class="text-indigo-400 underline">Más información</strong> (situado debajo del texto explicativo).</li>
        <li>Aparecerá un botón adicional en la parte inferior: haz clic en <strong class="text-emerald-400 font-bold">Ejecutar de todas formas</strong>.</li>
        <li>El instalador de Bentian se iniciará con normalidad y no volverá a solicitar confirmación para esta versión.</li>
      </ol>

      <h2 id="verificacion-virustotal" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Verificación de Seguridad en VirusTotal (0/70)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cada release oficial de Bentian ERP Bridge se somete a un escaneo criptográfico exhaustivo en <strong>VirusTotal</strong>, obteniendo una calificación de <strong>0 / 70 detecciones</strong> de antivirus (completamente libre de virus, troyanos, spyware o adware).
      </p>

      <h2 id="reputacion-acumulada" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Reputación de Nuevas Versiones en Windows</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Cada vez que se publica una actualización menor de Bentian, el hash SHA-256 del nuevo ejecutable es enviado de forma proactiva a Microsoft Security Intelligence para acelerar la validación de reputación global en los sistemas Defender de Windows.
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
