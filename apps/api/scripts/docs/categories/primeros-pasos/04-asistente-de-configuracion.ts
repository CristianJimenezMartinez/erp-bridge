import { DocArticle } from '../../types';

export const asistenteDeConfiguracionArticle: DocArticle = {
  slug: 'primeros-pasos/asistente-de-configuracion',
  categorySlug: 'primeros-pasos',
  title: 'Guía del Asistente de Configuración (Onboarding Wizard)',
  subtitle: 'Configuración guiada paso a paso en 5 minutos: activación en 1 clic, selección Multi-ERP (Factusol, SimplyGest, Ágora POS, Sage 50 y a3ERP), modo de Evaluación Sandbox sin ERP y soporte integrado.',
  badge: 'Onboarding Zero-Touch',
  readingTime: '7 min de lectura',
  metaTitle: 'Guía del Asistente de Inicio de Bentian ERP Bridge | Paso a Paso',
  metaDescription: 'Manual completo del Asistente de Configuración de Bentian ERP Bridge. Activación en 1 clic, selector Multi-ERP (Factusol, SimplyGest, Ágora POS, Sage 50, a3ERP), SQL Server Local y Modo Evaluación Sandbox.',
  keywords: 'asistente bentian, wizard factusol simplygest sage50 agora a3erp, configuracion paso a paso bentian, conectar sql server local erp, modo evaluacion sandbox bentian, serie 1 factusol pedidos web',
  toc: [
    { id: 'vision-general-asistente', label: '1. Visión General del Asistente Zero-Touch (4 Pasos)', level: 2 },
    { id: 'paso-1-licencia', label: '2. Paso 1: Licencia (Activación en 1 Clic o Modo Exploración)', level: 2 },
    { id: 'paso-2-erp', label: '3. Paso 2: Selección y Conexión con los 5 ERPs Locales (OLEDB y SQL Server)', level: 2 },
    { id: 'serie-factusol-recomendada', label: '4. Configuración Clave: Series Contables, Tarifas y Almacén', level: 2 },
    { id: 'paso-3-tienda', label: '5. Paso 3: Conexión con la Tienda Web (Universal o WooCommerce)', level: 2 },
    { id: 'paso-4-listo', label: '6. Paso 4: ¡Todo Listo!, Spotlight Tour y Documentación Integrada', level: 2 },
    { id: 'notificaciones-multicanal', label: '7. Centro de Notificaciones Multi-Canal (Email SMTP Propio, Telegram y Discord)', level: 2 },
  ],
  image: '/assets/screenshots/06-setup-wizard.png',
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
          <div class="text-zinc-300">Software ERP</div>
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

      <figure class="my-8 rounded-xl overflow-hidden border border-white/[0.1] bg-[#0c0c0e] shadow-xl">
        <div class="px-4 py-2 bg-[#141418] border-b border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
            <span class="ml-2 text-zinc-300 font-sans">Bentian Agent GUI — Asistente de Inicio Guiado</span>
          </div>
          <span class="text-zinc-500 text-[10px]">127.0.0.1:39281</span>
        </div>
        <picture>
          <source srcset="/assets/screenshots/06-setup-wizard.webp" type="image/webp">
          <img src="/assets/screenshots/06-setup-wizard.png" alt="Asistente de Configuración en 4 Pasos de Bentian ERP Bridge" class="w-full h-auto object-contain" loading="lazy" width="1280" height="820">
        </picture>
        <figcaption class="px-4 py-2.5 bg-[#101014] border-t border-white/[0.04] text-xs text-zinc-400 text-center">
          Interfaz interactiva del asistente inicial de Bentian ERP Bridge guiando la vinculación en cuatro pasos sin fricción técnica.
        </figcaption>
      </figure>

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

      <h2 id="paso-2-erp" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Paso 2: Selección y Conexión con los 5 ERPs Locales (OLEDB y SQL Server)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        En este paso seleccionas uno de los <strong>5 ERPs de escritorio en Windows</strong> soportados oficialmente por Bentian ERP Bridge y vinculas su motor relacional local (archivos Access OLEDB o instancia Microsoft SQL Server):
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <!-- Bloque Factusol -->
        <div class="p-4 rounded-xl bg-zinc-900/60 border border-indigo-500/30">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-white flex items-center gap-1.5">
              <span>📊</span>
              <span>Factusol (DELSOL)</span>
            </span>
            <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">.accdb / .mdb</span>
          </div>
          <p class="text-xs text-zinc-400 mb-3">Conexión OLEDB de 64 bits para versiones 2018 a 2026.</p>
          <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong>Auto-detectar Factusol:</strong> Examina automáticamente <code class="text-zinc-200">C:\\Software DELSOL\\Factusol\\Datos\\FS\\</code>.</li>
            <li><strong>Examinar en Windows (Local / NAS):</strong> Abre el selector oficial nativo de Windows (STA thread) para seleccionar el archivo <code class="text-indigo-300">0012026.accdb</code> en disco o rutas UNC (<code class="text-zinc-400">\\\\NAS\\...</code>).</li>
            <li><strong>Pegar ruta directamente:</strong> Soporta pegar rutas de red con limpieza automática de comillas.</li>
          </ul>
        </div>

        <!-- Bloque SimplyGest -->
        <div class="p-4 rounded-xl bg-zinc-900/60 border border-emerald-500/30">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🏬</span>
              <span>SimplyGest Desktop</span>
            </span>
            <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">Datos.mdb</span>
          </div>
          <p class="text-xs text-zinc-400 mb-3">Conexión OLEDB directa con tablas ARTICULOS y PEDIDOS_VENTA.</p>
          <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong>Auto-detectar SimplyGest:</strong> Escanea <code class="text-zinc-200">C:\\SimplyGest\\Datos.mdb</code> y subcarpetas multiempresa.</li>
            <li><strong>Examinar en Windows (Local / Red):</strong> Selector nativo para unidades locales o mapeadas (<code class="text-emerald-300">Z:\\...</code>).</li>
            <li><strong>Aislamiento Comercial:</strong> Permite asignar empresa, tarifa (1 a 5) y almacén de servicio.</li>
          </ul>
        </div>
      </div>

      <!-- Bloque SQL Server Local: Agora, Sage 50, a3ERP -->
      <div class="p-5 rounded-xl bg-zinc-900/70 border border-sky-500/30 mb-6">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
          <span class="text-xs font-bold text-white flex items-center gap-2">
            <span>🗄️</span>
            <span>ERPs sobre Microsoft SQL Server Local: Ágora Retail / POS, Sage 50 y a3ERP</span>
          </span>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">SqlServerBaseAdapter (SQLOLEDB / MSOLEDBSQL)</span>
        </div>
        <p class="text-xs text-zinc-300 leading-relaxed mb-4">
          Cuando seleccionas <strong>Ágora Retail / POS</strong>, <strong>Sage 50 (c50 / Eurowin)</strong> o <strong>a3ERP (Wolters Kluwer)</strong> en el selector 5-ERP, el asistente despliega automáticamente el formulario de conexión a <strong>SQL Server Local</strong>:
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
          <div class="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
            <div class="font-bold text-amber-400 mb-1">🛒 Ágora Retail / POS</div>
            <p class="text-zinc-400 leading-snug mb-1.5">Instancia predeterminada <code class="text-zinc-200">localhost\\AGORA</code> o <code class="text-zinc-200">.\\SQLEXPRESS</code>.</p>
            <a href="/docs/sql-erps/conector-agora-pos-retail/" class="text-[11px] text-amber-300 hover:underline font-semibold">Ver guía Ágora POS →</a>
          </div>
          <div class="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
            <div class="font-bold text-emerald-400 mb-1">📈 Sage 50 (Eurowin)</div>
            <p class="text-zinc-400 leading-snug mb-1.5">Instancia <code class="text-zinc-200">localhost\\SAGE50</code> con tablas <code class="text-zinc-200">articulo</code>, <code class="text-zinc-200">stocks</code>, <code class="text-zinc-200">c_pedive</code> y <code class="text-zinc-200">d_pedive</code>.</p>
            <a href="/docs/sql-erps/conector-sage50-sql-server/" class="text-[11px] text-emerald-300 hover:underline font-semibold">Ver guía Sage 50 →</a>
          </div>
          <div class="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
            <div class="font-bold text-sky-400 mb-1">🏢 a3ERP (Wolters Kluwer)</div>
            <p class="text-zinc-400 leading-snug mb-1.5">Instancia <code class="text-zinc-200">localhost\\A3ERP</code> con tablas <code class="text-zinc-200">ARTICULO</code>, <code class="text-zinc-200">CABEPEV</code> y <code class="text-zinc-200">LINEPEV</code>.</p>
            <a href="/docs/sql-erps/conector-a3erp-wolters-kluwer/" class="text-[11px] text-sky-300 hover:underline font-semibold">Ver guía a3ERP →</a>
          </div>
        </div>
        <ul class="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
          <li><strong>Botón Autodetectar instancias SQL:</strong> Escanea servicios locales de Windows (<code class="text-zinc-200">Get-Service MSSQL*</code>) y prueba conectividad TCP en <code class="text-sky-300">localhost:1433</code>, <code class="text-sky-300">.\\SQLEXPRESS</code>, <code class="text-sky-300">.\\AGORA</code>, <code class="text-sky-300">.\\SAGE50</code> y <code class="text-sky-300">.\\A3ERP</code> rellenando el servidor en un clic.</li>
          <li><strong>Autenticación Dual:</strong> Permite alternar entre <em>Autenticación Integrada de Windows (SSPI)</em> (sin usuario ni contraseña) o <em>Autenticación SQL Server</em> (<code class="text-zinc-200">sa</code> o usuario dedicado).</li>
          <li><strong>Serie y Almacén:</strong> Configura la serie contable de pedidos web y el código de almacén para cada proveedor SQL de forma aislada en <code class="text-zinc-200">%APPDATA%</code>.</li>
        </ul>
      </div>

      <!-- Card Continuar sin ERP / Modo Evaluacion Sandbox -->
      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 mb-6 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div>
          <div class="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
            <span>🧪</span>
            <span>Modo Evaluación Sandbox: ¿No tienes ningún ERP instalado en este ordenador?</span>
          </div>
          <p class="text-xs text-zinc-300 leading-relaxed mb-2">
            Si estás probando Bentian en tu portátil personal o quieres hacer una demostración comercial antes de instalarlo en el servidor del almacén, pulsa el botón <strong class="text-amber-300">Probar en Modo Evaluación (Sin ERP instalado)</strong>.
          </p>
          <p class="text-xs text-zinc-400 leading-relaxed">
            El agente activará el motor en memoria <code class="text-amber-200 font-mono">EvaluationSandboxAdapter</code> con <strong>25 artículos de ferretería y suministro industrial pre-cargados</strong> (stock real simulado, precios e IVA) y permitirá inyectar pedidos de prueba completos sin tocar ninguna base de datos externa. En la cabecera verás el indicador <span class="text-amber-300 font-semibold">MODO EVALUACIÓN (DATOS DEMO)</span> con acceso directo para conectar tu ERP real cuando quieras.
          </p>
        </div>
      </div>

      <h2 id="serie-factusol-recomendada" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Configuración Clave: Series Contables, Tarifas y Almacén</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Este parámetro define en qué serie contable del ERP se registrarán las ventas procedentes de tu web y qué tarifa comercial se publicará:
      </p>

      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">ERP / Configuración</th>
              <th class="px-4 py-3 font-semibold">Comportamiento en el Programa</th>
              <th class="px-4 py-3 font-semibold">Visibilidad para el Personal</th>
              <th class="px-4 py-3 font-semibold">Veredicto Oficial</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-3 font-medium text-white">
                <span class="font-bold text-indigo-400 block">Factusol: Serie 1 (Directo)</span>
                <span class="text-[10px] text-zinc-500">Valor por defecto '1'</span>
              </td>
              <td class="px-4 py-3 text-zinc-300">
                Los pedidos web entran en la bandeja principal (<code class="text-zinc-200">Comercial → Pedidos de cliente</code>).
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
                <span class="font-bold text-zinc-300 block">Factusol: Serie W (Web)</span>
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
            <tr>
              <td class="px-4 py-3 font-medium text-white">
                <span class="font-bold text-emerald-400 block">SimplyGest: Serie 1 o W</span>
                <span class="text-[10px] text-zinc-500">Almacén + Tarifa 1 a 5</span>
              </td>
              <td class="px-4 py-3 text-zinc-300">
                Ingesta en <code class="text-zinc-200">PEDIDOS_VENTA</code> vinculando la tarifa seleccionada y descontando el stock del almacén configurado.
              </td>
              <td class="px-4 py-3 text-emerald-400 font-medium">
                Inmediata. TPV y mostrador siguen operativos sin interferencias ni bloqueos de base de datos.
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">Multi-Tarifa Nativo</span>
              </td>
            </tr>
            <tr>
              <td class="px-4 py-3 font-medium text-white">
                <span class="font-bold text-sky-400 block">Sage 50 / Ágora / a3ERP</span>
                <span class="text-[10px] text-zinc-500">SQL Server Local (Serie + Almacén)</span>
              </td>
              <td class="px-4 py-3 text-zinc-300">
                Transacción ACID en <code class="text-zinc-200">c_pedive</code> (Sage 50), <code class="text-zinc-200">SaleOrder</code> (Ágora) o <code class="text-zinc-200">CABEPEV</code> (a3ERP) con numeración correlativa <code class="text-zinc-200">UPDLOCK</code>.
              </td>
              <td class="px-4 py-3 text-emerald-400 font-medium">
                Inmediata. Lecturas de stock con <code class="text-zinc-200">WITH (NOLOCK)</code> para cero bloqueos en terminales TPV.
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/25">SQL Transaccional</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-8">
        <strong class="font-semibold text-white block mb-0.5">¿Por qué recomendamos mantener la Serie 1 en Factusol?</strong>
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
};
