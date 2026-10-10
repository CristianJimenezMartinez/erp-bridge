import { DocArticle } from '../../types';

export const asistenteDeConfiguracionArticle: DocArticle = {
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
};
