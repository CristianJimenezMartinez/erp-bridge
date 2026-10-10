import { DocArticle } from '../types';

export const holdedArticle: DocArticle = {
  slug: 'canales/holded',
  categorySlug: 'canales',
  title: 'Integración Factusol con Holded Cloud ERP y Facturación Contable',
  subtitle: 'Cómo enlazar el almacén físico de Factusol con la facturación y la gestoría en la nube de Holded vía REST API v1 oficial sin doble picado de datos.',
  badge: 'Conector Holded Cloud',
  readingTime: '6 min de lectura',
  metaTitle: 'Conectar Factusol con Holded Cloud ERP | Facturación y Contabilidad',
  metaDescription: 'Guía paso a paso para integrar Factusol con Holded Cloud ERP. Emisión automática de facturas de venta, sincronización de clientes, asientos contables y libros de IVA.',
  keywords: 'sincronizar factusol con holded, conector factusol holded, integracion holded factusol facturacion, enlazar almacen factusol gestoria holded, api holded pedidos facturas factusol, asientos contables holded factusol, facturacion automatica holded',
  toc: [
    { id: 'el-dilema-operativo', label: '1. El Dilema: Almacén Físico (Factusol) vs Facturación Cloud (Holded)', level: 2 },
    { id: 'generar-api-key', label: '2. Generación de API Key en Holded Business', level: 2 },
    { id: 'mapeo-entidades', label: '3. Mapeo de Entidades: Albarán/Pedido Factusol ➔ Factura Holded', level: 2 },
    { id: 'clientes-formas-pago', label: '4. Sincronización Automática de Clientes, NIFs y Formas de Pago', level: 2 },
    { id: 'contabilidad-gestoria', label: '5. Libros de IVA, Asientos Contables y Traspaso a Gestoría', level: 2 },
    { id: 'configuracion-bentian', label: '6. Configuración del Conector en Bentian y Políticas Offline', level: 2 },
    { id: 'idempotencia-customid', label: '7. Idempotencia y Prevención de Duplicados (customId)', level: 2 },
  ],
  contentHtml: `
    <p class="text-base text-zinc-300 leading-relaxed mb-6">
      Miles de pymes y distribuidores en España utilizan <strong>Factusol</strong> en sus instalaciones locales para gestionar el almacén físico, preparar albaranes con lectores de códigos de barras y controlar las existencias sin latencias. Al mismo tiempo, sus asesorías y directores financieros prefieren <strong>Holded Cloud ERP</strong> para la facturación electrónica, el seguimiento de tesorería y la conciliación bancaria en tiempo real. <strong>Bentian ERP Bridge</strong> une ambos mundos: conecta tu base de datos local de Factusol con la API oficial de Holded sin necesidad de duplicar el trabajo administrativo ni teclear facturas a mano.
    </p>

    <h2 id="el-dilema-operativo" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Dilema: Almacén Físico (Factusol) vs Facturación Cloud (Holded)</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Hasta ahora, las empresas que querían beneficiarse de la agilidad de Holded y la solidez local de Factusol se enfrentaban a un grave cuello de botella operativo:
    </p>
    <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
      <li><strong>Doble picado de albaranes:</strong> El almacén prepara el pedido en Factusol y la persona de administración debe volver a introducir el cliente, las líneas y los precios en Holded para emitir la factura.</li>
      <li><strong>Descuadres de IVA y Recargo de Equivalencia:</strong> Al introducir facturas manualmente, es habitual cometer errores en los decimales o en el tipo impositivo aplicable.</li>
      <li><strong>Retrasos en la gestoría:</strong> La gestoría no recibe las facturas hasta final de mes o trimestre, dificultando las previsiones de tesorería y liquidaciones del modelo 303.</li>
    </ul>
    <p class="text-sm text-zinc-300 leading-relaxed mb-6">
      Bentian automatiza este traspaso: en cuanto un pedido o albarán queda validado en Factusol, el agente emite la factura legal en Holded de forma instantánea y desatendida.
    </p>

    <h2 id="generar-api-key" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Generación de API Key en Holded Business</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Para autorizar a Bentian a interactuar con tu cuenta de Holded:
    </p>
    <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
      <li>Inicia sesión en tu cuenta de <strong class="text-white">Holded</strong> (<code class="text-zinc-200">app.holded.com</code>) con permisos de administrador.</li>
      <li>Haz clic en el icono de tu perfil (esquina superior derecha) y selecciona <strong class="text-indigo-400">Configuración</strong>.</li>
      <li>En la barra lateral izquierda, entra en <strong class="text-white">Desarrolladores → API</strong>.</li>
      <li>Pulsa en <strong class="text-emerald-400">Nueva API Key</strong>. Asigna una descripción identificativa (ej: <code class="text-zinc-200">Bentian Factusol Bridge</code>).</li>
      <li>Copia la clave generada (un hash alfanumérico seguro de 32 caracteres).</li>
    </ol>

    <h2 id="mapeo-entidades" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Mapeo de Entidades: Albarán/Pedido Factusol ➔ Factura Holded</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Bentian traduce los registros relacionales de Factusol en documentos canónicos JSON compatibles con la API REST v1 de Holded (<code class="text-zinc-200 font-mono">/api/invoicing/v1/documents/invoice</code>):
    </p>
    <div class="overflow-x-auto mb-6">
      <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
        <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
          <tr>
            <th class="px-4 py-2.5 font-semibold">Campo Factusol (OLEDB)</th>
            <th class="px-4 py-2.5 font-semibold">Propiedad Holded REST API</th>
            <th class="px-4 py-2.5 font-semibold">Transformación / Regla</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.06] text-zinc-400">
          <tr>
            <td class="px-4 py-2 text-white font-mono">F_PCL.CODPCL / F_FAC.CODFAC</td>
            <td class="px-4 py-2 text-indigo-300 font-mono">customId</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Identificador unívoco para idempotencia anti-duplicados.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-mono">F_CLI.NIFCLI</td>
            <td class="px-4 py-2 text-indigo-300 font-mono">contactCode / code</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Búsqueda o alta automática del contacto por NIF/CIF.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-mono">F_LPC.ARTLPC</td>
            <td class="px-4 py-2 text-indigo-300 font-mono">items[].sku</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Código de artículo maestro de Factusol.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-mono">F_LPC.CANLPC</td>
            <td class="px-4 py-2 text-indigo-300 font-mono">items[].units</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Cantidad facturada con precisión decimal.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-mono">F_LPC.TOTLPC / F_LPC.IVALPC</td>
            <td class="px-4 py-2 text-indigo-300 font-mono">items[].subtotal / taxes</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Tipo impositivo de IVA (21%, 10%, 4%) y R.E. aplicable.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 id="clientes-formas-pago" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Sincronización Automática de Clientes, NIFs y Formas de Pago</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Cuando se emite una factura en Holded, Bentian comprueba previamente si el cliente ya existe en el directorio de contactos de Holded. Si no existe:
    </p>
    <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
      <li>Crea el contacto en Holded con su razón social, NIF/CIF, dirección postal, código postal y provincia de Factusol.</li>
      <li>Asigna el canal de venta y la cuenta contable de cliente (<code class="text-zinc-200">4300xxxx</code>) correspondiente.</li>
      <li>Mapea la forma de pago (transferencia, tarjeta, domiciliación SEPA o pagaré) respetando los plazos de vencimiento pactados.</li>
    </ul>

    <h2 id="contabilidad-gestoria" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Libros de IVA, Asientos Contables y Traspaso a Gestoría</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Una de las mayores ventajas de Holded es su módulo de contabilidad automatizada. Al generar las facturas a través de Bentian:
    </p>
    <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 mb-6">
      <strong class="text-white font-semibold block mb-1">Impacto Contable Inmediato:</strong>
      Holded genera de manera automática el asiento contable en el libro diario (cuentas 700 de ventas, 477 de IVA repercutido y 430 de clientes). Tu gestor o asesor fiscal tiene acceso directo a los balances de sumas y saldos y a los modelos tributarios sin necesidad de enviar carpetas de facturas en papel ni archivos Excel desfasados.
    </div>

    <h2 id="configuracion-bentian" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Configuración del Conector en Bentian y Políticas Offline</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      La activación en el agente de Bentian se realiza en dos minutos:
    </p>
    <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
      <li>Abre la interfaz gráfica del agente Bentian (<code class="text-zinc-200 font-mono">http://127.0.0.1:39281</code>).</li>
      <li>Ve a la pestaña <strong class="text-white">Canales & ERPs Cloud</strong> y activa el interruptor <strong class="text-emerald-400">Holded ERP</strong>.</li>
      <li>Introduce tu <strong class="text-indigo-400">API Key</strong> de Holded y selecciona la serie de facturación deseada (ej. serie <em>"F26"</em> o <em>"HOLD"</em>).</li>
      <li>Elige el evento disparador: emitir factura al registrar el pedido, o emitir factura únicamente cuando el albarán pase a estado <em>"Cobrado"</em> en Factusol.</li>
      <li>Pulsa en <strong class="text-indigo-400">Probar Conexión</strong> para verificar el handshake TLS 1.3 con la API de Holded.</li>
    </ol>

    <h2 id="idempotencia-customid" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">7. Idempotencia y Prevención de Duplicados (customId)</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      La API de Holded soporta el atributo <code class="text-indigo-300 font-mono">customId</code> en la creación de documentos. Bentian asigna a este parámetro el identificador único del documento de Factusol (ej: <code class="text-zinc-200 font-mono">FACTUSOL-FAC-2026-00452</code>).
    </p>
    <p class="text-sm text-zinc-300 leading-relaxed mb-6">
      Si la conexión a Internet se interrumpe durante el envío y el agente reintenta la llamada, Holded detecta que el <code class="text-zinc-200">customId</code> ya existe y devuelve la factura previamente generada en lugar de duplicarla. Esto proporciona <strong>garantía transaccional de entrega única (Exactly-Once Semantics)</strong>.
    </p>
  `,
};
