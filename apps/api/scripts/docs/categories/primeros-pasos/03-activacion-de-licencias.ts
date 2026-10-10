import { DocArticle } from '../../types';

export const activacionDeLicenciasArticle: DocArticle = {
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
};
