import { DocArticle } from '../types';

export const evidenciasTecnicasArticle: DocArticle = {
  slug: 'seguridad/evidencias-tecnicas-y-auditoria',
  categorySlug: 'seguridad',
  title: 'Evidencia Técnica de Seguridad: 5 Respuestas Críticas de Ingeniería',
  subtitle: 'Auditoría exhaustiva para CISOs y administradores de IT: qué datos salen de tu red, custodia de secretos en AppData, protocolo Store-and-Forward sin conexión, actualizaciones con UpdateSwapper y permisos OLEDB sobre Factusol.',
  badge: 'Auditoría de Seguridad & Privacidad',
  readingTime: '8 min de lectura',
  metaTitle: 'Evidencia Técnica de Seguridad y Respuestas de Ingeniería | Bentian ERP',
  metaDescription: 'Las 5 respuestas de ingeniería de Bentian ERP Bridge: datos salientes cifrados TLS 1.3, secretos en AppData, Store-and-Forward, UpdateSwapper y permisos OLEDB en Factusol.',
  keywords: 'seguridad factusol, ciso factusol, privacidad erp bridge, datos salientes factusol, claves api agent-config json, store and forward corte internet factusol, updateswapper rollback ed25519, permisos oledb share deny none factusol f_pcl, auditoria ciso factusol',
  toc: [
    { id: 'pregunta-1-datos-salientes', label: '1. ¿Qué información sale del ordenador del cliente?', level: 2 },
    { id: 'pregunta-2-secretos-appdata', label: '2. ¿Dónde se guardan las claves API y secretos?', level: 2 },
    { id: 'pregunta-3-corte-conexion', label: '3. ¿Qué sucede si se corta la conexión a Internet?', level: 2 },
    { id: 'pregunta-4-actualizaciones-fallos', label: '4. ¿Cómo se gestionan las actualizaciones y los fallos?', level: 2 },
    { id: 'pregunta-5-permisos-factusol', label: '5. ¿Qué permisos tiene el agente sobre Factusol?', level: 2 },
    { id: 'matriz-resumen-auditoria', label: '6. Matriz de Cumplimiento Técnico para Departamentos CISO / IT', level: 2 },
  ],
  contentHtml: `
    <p class="text-base text-zinc-300 leading-relaxed mb-6">
      En la evaluación de software para terminales de facturación, almacenes y servidores corporativos, los departamentos de <strong>CISO (Chief Information Security Officer)</strong> y los administradores de sistemas exigen evidencias técnicas auditables antes de autorizar cualquier conector. A continuación se desglosan las respuestas de ingeniería a las cinco interrogantes críticas de seguridad que blindan la arquitectura de <strong>Bentian ERP Bridge</strong>.
    </p>

    <!-- Callout Resumen de Principios -->
    <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-500/25 mb-8">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 font-bold text-lg">
          ✓
        </div>
        <div>
          <h3 class="text-sm font-bold text-white mb-1">Compromiso de Ingeniería Inmutable</h3>
          <p class="text-xs text-zinc-300 leading-relaxed mb-2">
            Bentian ERP Bridge opera bajo una filosofía <strong>100% Local-First</strong>: tu base de datos de Factusol jamás se replica en la nube, las comunicaciones son estrictamente salientes mediante HTTPS TLS 1.3 hacia tu propia web, y los permisos sobre Factusol están aislados en modo lectura compartida e inserción atómica de pedidos en <code class="text-emerald-300 font-mono">F_PCL</code> sin tocar facturación emitida ni registros fiscales.
          </p>
          <div class="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
            <span>Certificado por Softpedia (4.5/5)</span>
            <span>•</span>
            <span>0/70 en VirusTotal</span>
            <span>•</span>
            <span>Firmas Ed25519 (RFC 8032)</span>
          </div>
        </div>
      </div>
    </div>

    <h2 id="pregunta-1-datos-salientes" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Qué información sale del ordenador del cliente?</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Uno de los mayores temores al integrar un ERP con el comercio electrónico es la fuga de datos financieros o comerciales sensibles. En Bentian ERP Bridge, el perímetro de sincronización está <strong>quirúrgicamente acotado</strong>:
    </p>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
        <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          Datos que SÍ salen (Estrictamente Catálogo y Pedidos)
        </div>
        <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
          <li><strong>SKU / Código de artículo:</strong> Identificador comercial del producto en Factusol (<code class="text-emerald-300 font-mono">ARTPCL</code> / <code class="text-emerald-300 font-mono">CODART</code>).</li>
          <li><strong>Descripción y título comercial:</strong> Nombre del producto configurado para publicación online.</li>
          <li><strong>Precio de venta con IVA:</strong> Importe calculado a partir de la tarifa asignada al canal web.</li>
          <li><strong>Stock disponible calculado:</strong> Valor numérico resultante de la fórmula <code class="text-emerald-300 font-mono">DISSTO = ACTSTO - PMP</code> (stock real menos pedidos pendientes).</li>
          <li><strong>Descarga de pedidos web entrantes:</strong> Peticiones salientes para consultar pedidos de clientes (nombre, dirección de entrega, líneas solicitadas) directamente desde tu tienda online.</li>
        </ul>
      </div>

      <div class="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
        <div class="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          Datos que NUNCA salen (Blindaje Absoluto)
        </div>
        <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
          <li><strong>CERO Balances Contables:</strong> Cuentas de pérdidas y ganancias, libros mayores y balances de sumas y saldos.</li>
          <li><strong>CERO Facturas de Compras:</strong> Facturas de proveedores, costes de adquisición y márgenes brutos confidenciales.</li>
          <li><strong>CERO Datos Bancarios:</strong> Cuentas corrientes IBAN, mandatos SEPA, tarjetas de crédito o líneas de póliza.</li>
          <li><strong>CERO Información de Personal:</strong> Nóminas, salarios, contratos o datos de empleados de la empresa.</li>
          <li><strong>CERO Minería de Datos / Telemetría:</strong> Bentian no rastrea volumen de ventas ni patrones de consumo de tus clientes.</li>
        </ul>
      </div>
    </div>

    <p class="text-sm text-zinc-300 leading-relaxed mb-6">
      <strong>Canal de transmisión:</strong> Todo el tráfico se emite mediante peticiones salientes seguras <strong>HTTPS (Puerto TCP 443)</strong> con cifrado obligatorio <strong>TLS 1.3</strong> dirigidas directamente al dominio de tu tienda (WooCommerce, PrestaShop, Shopify). No existe intermediación ni almacenamiento en nubes intermedias.
    </p>

    <h2 id="pregunta-2-secretos-appdata" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. ¿Dónde se guardan las claves API y secretos?</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      La persistencia de credenciales y claves criptográficas sigue una estricta directiva de aislamiento en el sistema operativo Windows:
    </p>
    
    <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 mb-6 overflow-x-auto">
      <div class="text-zinc-500 mb-1"># Ubicación canónica e inmutable de configuración y secretos:</div>
      <div class="text-indigo-400 font-bold">%APPDATA%\\Bentian Agent\\agent-config.json</div>
      <div class="text-zinc-500 mt-1"># Ruta absoluta habitual: C:\\Users\\&lt;Usuario&gt;\\AppData\\Roaming\\Bentian Agent\\agent-config.json</div>
    </div>

    <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
      <li><strong>Aislamiento por Listas de Control de Acceso (ACLs NTFS):</strong> En Windows, la carpeta <code class="text-zinc-200 font-mono">%APPDATA%</code> está restringida de forma predeterminada al usuario que inició sesión y a los administradores del equipo. Ningún otro usuario estándar ni proceso no privilegiado de la máquina tiene acceso de lectura.</li>
      <li><strong>Prohibición Estricta de Escritura en Program Files:</strong> El ejecutable tiene vetada la escritura en <code class="text-rose-400 font-mono">C:\\Program Files\\Bentian Agent\\</code>. En Windows, los usuarios estándar carecen de permisos de escritura allí, lo que generaría errores <code class="text-rose-400 font-mono">EPERM</code> silenciados y pérdida total de configuración al reiniciar el equipo.</li>
      <li><strong>Persistencia en JSON Atómico con Respaldo Defensivo:</strong> La escritura de secretos y estado se ejecuta en dos pasos atómicos:
        <ol class="list-decimal list-inside ml-6 mt-1.5 space-y-1 text-xs text-zinc-400">
          <li>Se escribe la configuración en un archivo temporal <code class="text-zinc-300 font-mono">agent-config.json.tmp</code>.</li>
          <li>Se ejecuta un reemplazo atómico mediante <code class="text-zinc-300 font-mono">fs.renameSync</code> con copia defensiva <code class="text-zinc-300 font-mono">agent-config.json.bak</code>.</li>
        </ol>
        Este mecanismo previene la corrupción de datos ante reinicios abruptos o cortes eléctricos.
      </li>
      <li><strong>Claves Cifradas en Reposo:</strong> Los tokens API de WooCommerce, claves de Shopify y contraseñas de red se almacenan con cifrado local y no se exponen jamás en la interfaz gráfica del navegador sin confirmación de credenciales.</li>
    </ul>

    <h2 id="pregunta-3-corte-conexion" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. ¿Qué sucede si se corta la conexión a Internet?</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      En polígonos industriales y almacenes físicos, las interrupciones de fibra, fallos de DNS o microcortes de red son habituales. Bentian ERP Bridge implementa una arquitectura desacoplada de <strong>Store-and-Forward (Almacenar y Reenviar)</strong> que garantiza <strong>cero pérdida de pedidos</strong>:
    </p>

    <div class="space-y-4 mb-6">
      <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
        <h4 class="text-xs font-bold text-amber-400 font-mono uppercase mb-2">Comportamiento Durante la Caída de Red</h4>
        <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
          <li><strong>Eventos de Stock / Catálogo:</strong> Las modificaciones de existencias o precios realizadas por los dependientes en Factusol se capturan en memoria y se encolan en disco local en formato JSON atómico estructurado (<code class="text-zinc-300 font-mono">.tmp</code> + <code class="text-zinc-300 font-mono">.bak</code>). Cero desbordamiento de memoria RAM.</li>
          <li><strong>Pedidos Web Entrantes:</strong> Los clientes continúan comprando en tu tienda online (WooCommerce / PrestaShop / Shopify). La tienda retiene los pedidos en su base de datos MySQL / PostgreSQL con número correlativo inmutable.</li>
          <li><strong>Marcado de Estado Offline sin Wiping:</strong> El agente detecta la pérdida de conectividad y marca el estado interno como <em>"Desconectado / Offline"</em>, <strong>pero jamás borra ni sanitiza destructivamente las rutas configuradas</strong> de Factusol ni las claves de acceso.</li>
        </ul>
      </div>

      <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
        <h4 class="text-xs font-bold text-emerald-400 font-mono uppercase mb-2">Recuperación y Drenado Automático (Reconexión)</h4>
        <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
          <li><strong>Backoff Exponencial con Jitter:</strong> El agente aplica reintentos con retraso progresivo (<code class="text-zinc-300 font-mono">2s, 4s, 8s, 16s...</code>) con variación aleatoria para no saturar la CPU ni el servidor web al regresar la conectividad.</li>
          <li><strong>Drenado Secuencial FIFO:</strong> En el instante en que la conexión HTTPS responde, el agente procesa la cola local en orden cronológico estricto, sincronizando existencias e importando todos los pedidos acumulados.</li>
          <li><strong>Garantía de Idempotencia:</strong> Cada pedido se verifica contra la base de datos de Factusol mediante su ID único web. Si un pedido ya fue procesado antes del corte, se descarta limpiamente, <strong>evitando duplicidades de albaranes o pedidos</strong>.</li>
        </ul>
      </div>
    </div>

    <h2 id="pregunta-4-actualizaciones-fallos" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. ¿Cómo se gestionan las actualizaciones y los fallos?</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      En Windows, un proceso en ejecución tiene bloqueado su propio binario en disco por el kernel, lo que impide la auto-sobrescritura directa. Para resolver esto con seguridad de grado militar, Bentian utiliza un proceso desacoplado llamado <strong>UpdateSwapper</strong>:
    </p>

    <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 mb-6 space-y-2">
      <div class="text-cyan-400 font-bold">Flujo Seguro de Actualización Atómica (UpdateSwapper):</div>
      <div>1. Descarga del paquete y manifest.json en: <span class="text-indigo-300">%TEMP%\\bentian-updates\\</span></div>
      <div>2. Comprobación criptográfica: <span class="text-emerald-400">Ed25519.verify(manifest.sha256, manifest.signature, PUBKEY) === true</span></div>
      <div>3. Verificación de hash SHA-256 del binario descargado antes de tocar producción.</div>
      <div>4. Detención ordenada de BentianAgent.exe y BentianTray.exe.</div>
      <div>5. Backup del ejecutable actual: <span class="text-amber-300">BentianAgent.exe -&gt; BentianAgent.exe.bak</span></div>
      <div>6. Sustitución atómica y arranque de la nueva versión.</div>
      <div>7. Monitor de estabilidad de 10 segundos: si hay crash -&gt; <span class="text-rose-400 font-bold">ROLLBACK AUTOMÁTICO</span> a .bak</div>
    </div>

    <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
      <li><strong>Verificación Asimétrica Ed25519 (RFC 8032):</strong> El manifiesto oficial de versiones está firmado con la clave privada de curva elíptica del autor. El agente tiene la clave pública inmutable compilada en su código. Si un proxy intermedio, CDN o atacante MitM altera un solo bit del ejecutable, la actualización se aborta de inmediato.</li>
      <li><strong>Monitor de Estabilidad de 10 Segundos:</strong> Tras arrancar el nuevo binario, el <code class="text-zinc-200">UpdateSwapper</code> permanece activo vigilando el proceso durante 10 segundos. Si el proceso arroja un fallo imprevisto de arranque, falta de DLLs o crash en Windows, el swapper termina el proceso erróneo y restaura de forma automática e instantánea la copia previa <code class="text-zinc-200 font-mono">.bak</code>, devolviendo el servicio a producción sin dejar la empresa fuera de línea.</li>
    </ul>

    <h2 id="pregunta-5-permisos-factusol" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. ¿Qué permisos tiene el agente sobre Factusol?</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      La interacción con la base de datos de Factusol (<code class="text-zinc-200 font-mono">.accdb</code>) está gobernada por el <strong>Principio de Mínimo Privilegio Operativo</strong>:
    </p>

    <div class="space-y-4 mb-6">
      <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
        <h4 class="text-xs font-bold text-indigo-400 font-mono uppercase mb-2">Lectura Concurrente: Modo OLEDB "Share Deny None"</h4>
        <p class="text-xs text-zinc-300 leading-relaxed mb-2">
          Para sincronizar catálogo, familias, tarifas y existencias, el conector OLEDB utiliza estrictamente:
        </p>
        <div class="p-2.5 rounded-lg bg-black/50 font-mono text-xs text-emerald-300 mb-2">
          Mode=Share Deny None;
        </div>
        <p class="text-xs text-zinc-400 leading-relaxed">
          Esto significa <strong>solo lectura compartida no bloqueante</strong>. Ni el agente bloquea a los usuarios físicos de Factusol en las cajas de mostrador, ni los operarios bloquean al agente al emitir un ticket. Se previenen de raíz los bloqueos del archivo de cerrojo <code class="text-zinc-300 font-mono">.laccdb</code> y los errores de concurrencia <code class="text-zinc-300 font-mono">3045</code>.
        </p>
      </div>

      <div class="p-4 rounded-xl bg-[#121215] border border-white/[0.08]">
        <h4 class="text-xs font-bold text-emerald-400 font-mono uppercase mb-2">Escritura de Pedidos: Inserción Atómica Acotada a F_PCL</h4>
        <p class="text-xs text-zinc-300 leading-relaxed mb-2">
          Para la importación de pedidos web desde la tienda online:
        </p>
        <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
          <li><strong>Inserción en F_PCL / F_LCL:</strong> El agente realiza inserciones atómicas exclusivamente en la tabla de <em>Pedidos de Clientes</em> (<code class="text-emerald-300 font-mono">F_PCL</code>) y sus líneas de detalle (<code class="text-emerald-300 font-mono">F_LCL</code>).</li>
          <li><strong>CERO Alteración de Facturas Emitidas:</strong> El agente tiene <strong>terminantemente prohibido modificar la tabla de facturación oficial (<code class="text-rose-400 font-mono">F_FAC</code>)</strong> ni los albaranes definitivos (<code class="text-rose-400 font-mono">F_ALB</code>).</li>
          <li><strong>Protección Veri*Factu y Ley Antifraude 11/2021:</strong> Los pedidos web se insertan en estado pendiente para su posterior validación por el personal de almacén. Los registros inmutables, firmas fiscales y encadenamientos de auditoría de Veri*Factu permanecen 100% protegidos y bajo el control exclusivo del software Factusol oficial.</li>
        </ul>
      </div>
    </div>

    <h2 id="matriz-resumen-auditoria" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Matriz de Cumplimiento Técnico para Departamentos CISO / IT</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Resumen ejecutivo de verificación para auditorías de ciberseguridad corporativa:
    </p>

    <div class="overflow-x-auto mb-6">
      <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
        <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
          <tr>
            <th class="px-4 py-2.5 font-semibold">Criterio de Auditoría</th>
            <th class="px-4 py-2.5 font-semibold">Implementación Técnica Bentian</th>
            <th class="px-4 py-2.5 font-semibold">Garantía / Cumplimiento</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.06] text-zinc-400">
          <tr>
            <td class="px-4 py-2 text-white font-sans font-medium">Exposición de Puertos Entrantes</td>
            <td class="px-4 py-2">0 puertos abiertos en Router / Firewall</td>
            <td class="px-4 py-2 text-emerald-400 font-sans">✓ Cero Superficie de Ataque</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-medium">Cifrado en Tránsito</td>
            <td class="px-4 py-2">HTTPS TLS 1.3 directo a la tienda</td>
            <td class="px-4 py-2 text-emerald-400 font-sans">✓ RFC 8446 Estricto</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-medium">Custodia de Secretos</td>
            <td class="px-4 py-2">%APPDATA%\\Bentian Agent (ACLs NTFS)</td>
            <td class="px-4 py-2 text-emerald-400 font-sans">✓ Aislamiento por Usuario</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-medium">Tolerancia a Caídas de Red</td>
            <td class="px-4 py-2">Cola Store-and-Forward en JSON atómico</td>
            <td class="px-4 py-2 text-emerald-400 font-sans">✓ Cero Pérdida de Pedidos</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-medium">Integridad de Actualizaciones</td>
            <td class="px-4 py-2">Firmas Ed25519 + SHA-256 + Rollback 10s</td>
            <td class="px-4 py-2 text-emerald-400 font-sans">✓ Anti-Tamper & Anti-Brick</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-medium">Control de Instancia Única</td>
            <td class="px-4 py-2">Sondeo HTTP local 127.0.0.1:39281/health (cero Named Pipes)</td>
            <td class="px-4 py-2 text-emerald-400 font-sans">✓ Prevención de Duplicados & Debounce 2.5s</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-sans font-medium">Privilegios sobre Factusol</td>
            <td class="px-4 py-2">Share Deny None OLEDB + F_PCL atómico</td>
            <td class="px-4 py-2 text-emerald-400 font-sans">✓ Veri*Factu y F_FAC Intactos</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  relatedSlugs: [
    'seguridad/certificacion-softpedia-100-clean',
    'seguridad/antivirus-edr-smartscreen',
    'seguridad/criptografia-y-actualizaciones',
    'arquitectura/cola-store-and-forward',
  ],
};

export const antivirusEdrSmartscreenArticle: DocArticle = {
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
    { id: 'verificacion-conexiones', label: '6. Verificación de Red Saliente y Mínimo Privilegio en Factusol', level: 2 },
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

    <h2 id="verificacion-conexiones" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Verificación de Red Saliente y Mínimo Privilegio en Factusol</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Bentian ERP Bridge ha sido auditado para entornos corporativos con estricta gobernanza de red y datos:
    </p>
    <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
      <li><strong>Tráfico 100% Saliente Cifrado:</strong> El agente solo realiza peticiones HTTPS salientes estándar por el puerto TCP 443 hacia la tienda web del cliente (TLS 1.3) y la API central (<code>bridge.cristianjm.com</code>).</li>
      <li><strong>Cero Puertos Entrantes:</strong> No expone ningún servicio hacia la red local ni hacia Internet; no requiere reglas NAT ni aperturas en el firewall perimetral.</li>
      <li><strong>Aislamiento Local (Loopback) y Control de Instancia Única:</strong> La interfaz gráfica del agente escucha estrictamente en la interfaz interna <code class="text-indigo-300 font-mono">127.0.0.1:39281</code>, completamente inaccesible desde otros equipos de la red corporativa. Para el control de instancia única, el agente realiza un sondeo HTTP local a <code class="text-indigo-300 font-mono">http://127.0.0.1:39281/health</code> con un debounce defensivo de 2.5 segundos (sin utilizar Named Pipes ni sockets IPC globales), garantizando que no se dupliquen procesos en segundo plano.</li>
      <li><strong>Delimitación de Datos Salientes:</strong> Solo se transmiten SKU, descripciones, precios con IVA y stock disponible calculado (<code>DISSTO</code>). Cero balances contables, cero facturas de compras y cero datos bancarios.</li>
      <li><strong>Modo OLEDB Share Deny None:</strong> Consultas de catálogo en modo compartido sin bloquear las ventas físicas en mostrador, e inserción atómica de pedidos exclusivamente en <code>F_PCL</code> sin tocar facturación emitida ni registros Veri*Factu.</li>
    </ul>
  `,
  relatedSlugs: [
    'seguridad/evidencias-tecnicas-y-auditoria',
    'seguridad/certificacion-softpedia-100-clean',
    'seguridad/windows-smartscreen',
    'seguridad/criptografia-y-actualizaciones',
  ],
};

export const windowsSmartscreenArticle: DocArticle = {
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
  relatedSlugs: [
    'seguridad/evidencias-tecnicas-y-auditoria',
    'seguridad/certificacion-softpedia-100-clean',
    'seguridad/antivirus-edr-smartscreen',
    'seguridad/criptografia-y-actualizaciones',
  ],
};

export const criptografiaActualizacionesArticle: DocArticle = {
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
    { id: 'el-motor-updateswapper', label: '3. El Proceso Desacoplado UpdateSwapper (%TEMP%)', level: 2 },
    { id: 'monitor-estabilidad-rollback', label: '4. Monitor de Estabilidad de 10 Segundos y Rollback Automático', level: 2 },
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

    <h2 id="el-motor-updateswapper" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. El Proceso Desacoplado UpdateSwapper (%TEMP%)</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Una vez validada la firma, el agente delega la sustitución a un proceso independiente llamado <code class="text-indigo-300">UpdateSwapper</code> que opera desde el directorio temporal (<code class="text-zinc-400 font-mono">%TEMP%\\bentian-updates\\</code>):
    </p>
    <ol class="text-sm text-zinc-300 space-y-1.5 list-decimal list-inside mb-6">
      <li>Solicita elevación UAC si el directorio de destino requiere permisos de Administrador (<code class="text-zinc-300 font-mono">C:\\Program Files\\Bentian Agent</code>).</li>
      <li>Detiene de forma ordenada los procesos <code class="text-zinc-200">BentianAgent.exe</code> y <code class="text-zinc-200">BentianTray.exe</code>.</li>
      <li>Renombra el binario actual como copia de seguridad (<code class="text-zinc-200 font-mono">BentianAgent.exe.bak</code>).</li>
      <li>Copia el nuevo ejecutable verificado y arranca la nueva versión.</li>
    </ol>

    <h2 id="monitor-estabilidad-rollback" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Monitor de Estabilidad de 10 Segundos y Rollback Automático</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-6">
      Tras iniciar la nueva versión, el <code class="text-zinc-200">UpdateSwapper</code> no finaliza de inmediato: monitoriza la ejecución durante <strong>10 segundos</strong>. Si el nuevo proceso colapsara por alguna incompatibilidad imprevista de librerías o excepción fatal, el swapper mata el proceso fallido, restaura automáticamente el archivo <code class="text-zinc-200 font-mono">.bak</code> anterior y devuelve el sistema a producción en su estado estable sin intervención del usuario.
    </p>
  `,
  relatedSlugs: [
    'seguridad/evidencias-tecnicas-y-auditoria',
    'seguridad/certificacion-softpedia-100-clean',
    'seguridad/antivirus-edr-smartscreen',
    'seguridad/windows-smartscreen',
  ],
};

export const seguridadArticles: DocArticle[] = [
  evidenciasTecnicasArticle,
  antivirusEdrSmartscreenArticle,
  windowsSmartscreenArticle,
  criptografiaActualizacionesArticle,
];
