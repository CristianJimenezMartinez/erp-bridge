import { DocArticle } from '../types';

export const shopifyArticle: DocArticle = {
  slug: 'canales/shopify',
  categorySlug: 'canales',
  title: 'Conexión Factusol con Shopify y Webhooks en Tiempo Real',
  subtitle: 'Guía paso a paso para sincronizar catálogo, stock multiubicación, webhooks de pedidos y recargo de equivalencia mediante Shopify GraphQL Admin API.',
  badge: 'Conector Shopify Oficial',
  readingTime: '7 min de lectura',
  metaTitle: 'Conectar Factusol con Shopify (GraphQL & Webhooks) | Bentian ERP',
  metaDescription: 'Guía paso a paso para conectar Factusol con Shopify mediante GraphQL Admin API y Webhooks en tiempo real. Stock multiubicación, recargo de equivalencia y cero costes cloud.',
  keywords: 'conector factusol shopify, sincronizar factusol shopify tiempo real, shopify graphql api factusol, webhooks shopify factusol pedidos, recargo equivalencia shopify factusol, custom app shopify factusol, inventario shopify factusol dissto',
  toc: [
    { id: 'ventaja-directa-local-first', label: '1. Arquitectura Directa Local-First vs Intermediarios Cloud (150€/mes)', level: 2 },
    { id: 'creacion-custom-app', label: '2. Creación y Configuración de Custom App en Shopify Admin', level: 2 },
    { id: 'scopes-graphql-api', label: '3. Scopes de Permisos GraphQL Admin API Requeridos', level: 2 },
    { id: 'webhooks-tiempo-real', label: '4. Suscripción a Webhooks Transaccionales en Tiempo Real', level: 2 },
    { id: 'stock-multiubicacion-dissto', label: '5. Sincronización de Stock Multiubicación (DISSTO) con GraphQL Mutations', level: 2 },
    { id: 'recargo-equivalencia-espana', label: '6. Mapeo Fiscal Español: IVA Desglosado y Recargo de Equivalencia (R.E.)', level: 2 },
    { id: 'verificacion-bentian-e2e', label: '7. Verificación en Bentian ERP Bridge y Pruebas E2E', level: 2 },
  ],
  contentHtml: `
    <p class="text-base text-zinc-300 leading-relaxed mb-6">
      Muchas empresas que eligen Shopify para su tienda online descubren con frustración que los conectores habituales cobran entre 90 € y 250 € al mes por alojar un puente en la nube que además copia toda la base de datos a servidores externos. <strong>Bentian ERP Bridge</strong> revoluciona este escenario: se comunica de forma <strong>directa y privada desde tu PC con Factusol hacia la API oficial de Shopify</strong> mediante GraphQL y Webhooks reactivos, eliminando intermediarios cloud, latencias y costes recurrentes por pedido.
    </p>

    <h2 id="ventaja-directa-local-first" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. Arquitectura Directa Local-First vs Intermediarios Cloud (150€/mes)</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      La integración entre Factusol y Shopify tradicionalmente requería un conector SaaS intermedio. Bentian sustituye esa arquitectura frágil por un enlace punto a punto cifrado con TLS 1.3:
    </p>
    <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
      <li><strong>Ahorro anual directo:</strong> Eliminas facturas mensuales recurrentes de plataformas intermediarias (ahorro de entre 1.200 € y 3.000 € anuales).</li>
      <li><strong>Privacidad estricta y soberanía de datos:</strong> Tu catálogo maestro, precios de coste y márgenes comerciales nunca se transfieren a servidores ajenos; residen exclusivamente en tu base de datos Factusol (<code class="text-zinc-200">.accdb</code>).</li>
      <li><strong>Velocidad transaccional:</strong> En cuanto un cliente completa el checkout en Shopify, el webhook reactivo descarga el pedido y reserva el stock en Factusol en menos de 800 milisegundos.</li>
    </ul>

    <h2 id="creacion-custom-app" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Creación y Configuración de Custom App en Shopify Admin</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Para conectar Bentian con tu tienda Shopify mediante una aplicación privada oficial (Custom App):
    </p>
    <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
      <li>Inicia sesión en tu panel de control de Shopify (<code class="text-zinc-200">admin.shopify.com/store/TU-TIENDA</code>).</li>
      <li>En la barra lateral izquierda inferior, haz clic en <strong class="text-white">Configuración → Aplicaciones y canales de ventas</strong>.</li>
      <li>Haz clic en <strong class="text-indigo-400">Desarrollar aplicaciones</strong> (si es la primera vez, pulsa en <em>Permitir el desarrollo de aplicaciones personalizadas</em>).</li>
      <li>Pulsa en <strong class="text-emerald-400">Crear una aplicación</strong>, nómbrala <code class="text-zinc-200">Bentian ERP Bridge</code> y selecciona tu cuenta de desarrollador.</li>
    </ol>

    <h2 id="scopes-graphql-api" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Scopes de Permisos GraphQL Admin API Requeridos</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      En la pestaña <strong class="text-white">Configuración de API de Admin</strong>, selecciona los siguientes permisos mínimos indispensables:
    </p>
    <div class="overflow-x-auto mb-6">
      <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden font-mono">
        <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08] font-sans">
          <tr>
            <th class="px-4 py-2.5 font-semibold">Scope de API</th>
            <th class="px-4 py-2.5 font-semibold">Tipo</th>
            <th class="px-4 py-2.5 font-semibold font-sans">Finalidad en Bentian</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.06] text-zinc-400">
          <tr>
            <td class="px-4 py-2 text-white font-mono">read_orders, write_orders</td>
            <td class="px-4 py-2 text-indigo-300">Lectura / Escritura</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Descarga de pedidos pagados y actualización de estado de preparación.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-mono">read_products, write_products</td>
            <td class="px-4 py-2 text-indigo-300">Lectura / Escritura</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Publicación y actualización de títulos, descripciones, tarifas y SKUs.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-mono">read_inventory, write_inventory</td>
            <td class="px-4 py-2 text-indigo-300">Lectura / Escritura</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Ajuste atómico de stock disponible físico en ubicaciones de almacén.</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-white font-mono">read_locations</td>
            <td class="px-4 py-2 text-cyan-300">Lectura</td>
            <td class="px-4 py-2 font-sans text-zinc-300">Identificación de IDs de ubicaciones físicas (almacén central, tiendas).</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-zinc-300 leading-relaxed mb-6">
      Haz clic en <strong class="text-white">Guardar</strong> y luego en <strong class="text-emerald-400 font-semibold">Instalar aplicación</strong>. Shopify te mostrará el <code class="text-indigo-300 font-mono">Admin API Access Token (shpat_...)</code>. Guárdalo inmediatamente, ya que solo se muestra una vez.
    </p>

    <h2 id="webhooks-tiempo-real" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Suscripción a Webhooks Transaccionales en Tiempo Real</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Para evitar el sondeo constante (*polling*) que satura los límites de llamadas de Shopify, Bentian soporta webhooks reactivos firmados con HMAC-SHA256:
    </p>
    <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
      <li><code class="text-emerald-400 font-mono">orders/create</code>: Disparado en el milisegundo exacto en que el cliente completa el pago del pedido en Shopify.</li>
      <li><code class="text-emerald-400 font-mono">orders/cancelled</code>: Libera automáticamente el stock reservado en Factusol si el pedido es anulado.</li>
      <li><code class="text-emerald-400 font-mono">inventory_levels/connect</code>: Mapea nuevas referencias vinculadas a ubicaciones físicas.</li>
    </ul>

    <h2 id="stock-multiubicacion-dissto" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Sincronización de Stock Multiubicación (DISSTO) con GraphQL Mutations</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Bentian utiliza la mutación oficial de alto rendimiento <code class="text-indigo-300 font-mono">inventorySetOnHandQuantities</code> de Shopify GraphQL Admin API (versión 2024-10+), permitiendo actualizar hasta 50 variantes en una sola llamada de red:
    </p>
    <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.08] text-xs font-mono text-zinc-300 mb-6 overflow-x-auto">
      <pre><code>mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
  inventorySetOnHandQuantities(input: $input) {
    userErrors {
      field
      message
    }
    inventoryAdjustmentGroup {
      createdAt
      reason
    }
  }
}</code></pre>
    </div>
    <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-6">
      <strong>Blindaje DISSTO Anti-Sobreventas:</strong> Bentian siempre calcula el stock disponible restando las existencias pendientes de servir (<code class="text-white font-mono">DISSTO = ACTSTO - PENPCL</code>). Si tienes 10 unidades físicas en la estantería pero 3 están reservadas en un albarán local de mostrador, Bentian publicará exactamente 7 unidades en Shopify, imposibilitando roturas de stock.
    </div>

    <h2 id="recargo-equivalencia-espana" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">6. Mapeo Fiscal Español: IVA Desglosado y Recargo de Equivalencia (R.E.)</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Uno de los mayores dolores de cabeza en España al usar Shopify es la gestión de clientes en régimen especial de Recargo de Equivalencia (comerciantes minoristas autónomos):
    </p>
    <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6">
      <li><strong>IVA General (21%) + R.E. (5,2%)</strong> = 26,2% total.</li>
      <li><strong>IVA Reducido (10%) + R.E. (1,4%)</strong> = 11,4% total.</li>
      <li><strong>IVA Superreducido (4%) + R.E. (0,5%)</strong> = 4,5% total.</li>
    </ul>
    <p class="text-sm text-zinc-300 leading-relaxed mb-6">
      Shopify no desglosa por defecto el Recargo de Equivalencia en campos nativos separados. Bentian inspecciona las líneas del pedido o las etiquetas del cliente (<code class="text-zinc-200">recargo-equivalencia</code>, NIF/CIF), calcula con precisión matemática al céntimo el recargo impositivo y lo inyecta desglosado en los campos correspondientes de la tabla <code class="text-indigo-300 font-mono">F_LPC</code> de Factusol, garantizando un cuadre contable perfecto con la Agencia Tributaria.
    </p>

    <h2 id="verificacion-bentian-e2e" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">7. Verificación en Bentian ERP Bridge y Pruebas E2E</h2>
    <p class="text-sm text-zinc-300 leading-relaxed mb-4">
      Para completar la vinculación:
    </p>
    <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
      <li>Abre el panel del agente Bentian (<code class="text-zinc-200 font-mono">http://127.0.0.1:39281</code>) y selecciona <strong class="text-white">Shopify</strong> en la pestaña <em>Canal eCommerce</em>.</li>
      <li>Introduce la URL de tu tienda (ej: <code class="text-zinc-200">tu-comercio.myshopify.com</code>) y el <strong class="text-indigo-400">Admin API Access Token</strong> (<code class="text-zinc-200 font-mono">shpat_...</code>).</li>
      <li>Selecciona la tarifa de precios de Factusol (Tarifa 1, 2, etc.) que se publicará en Shopify.</li>
      <li>Haz clic en <strong class="text-indigo-400">Probar Conexión</strong>. El agente validará los tokens, listará tus ubicaciones de inventario y realizará un test de sincronización sin alterar pedidos existentes.</li>
    </ol>
  `,
};
