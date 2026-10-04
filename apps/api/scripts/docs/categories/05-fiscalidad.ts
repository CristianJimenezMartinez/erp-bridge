import { DocArticle } from '../types';

export const fiscalidadArticles: DocArticle[] = [
  {
    slug: 'fiscalidad/cuadre-iva-centimos',
    categorySlug: 'fiscalidad',
    title: 'Cuadre de IVA al Céntimo y Prevención de Descuadres',
    subtitle: 'El algoritmo matemático que garantiza la concordancia entre los importes de WooCommerce y las bases imponibles de Factusol.',
    badge: 'Contabilidad & Impuestos',
    readingTime: '5 min de lectura',
    metaTitle: 'Cuadre Exacto de IVA al Céntimo en Factusol | Bentian ERP',
    metaDescription: 'Cómo evitar descuadres de 1 céntimo al pasar pedidos de WooCommerce a Factusol. Algoritmo de cálculo de bases imponibles y cuotas de IVA.',
    keywords: 'descuadre iva factusol woocommerce, cuadre centimo factusol, base imponible pedido factusol, f_pcl f_lpc iva factusol, calcular iva exacto factusol',
    toc: [
      { id: 'el-problema-del-centimo', label: '1. El Problema del Descuadre de 1 Céntimo', level: 2 },
      { id: 'origen-matematico', label: '2. Origen Matemático: Redondeo por Línea vs Redondeo Global', level: 2 },
      { id: 'algoritmo-bentian', label: '3. El Algoritmo de Cuadre Exacto de Bentian', level: 2 },
      { id: 'mapeo-factusol-fpcl', label: '4. Mapeo en las Tablas F_PCL y F_LPC', level: 2 },
      { id: 'ejemplo-real', label: '5. Ejemplo Numérico Real', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        Cualquier asesor fiscal o contable que haya importado pedidos desde una tienda online a un programa de facturación conoce la pesadilla de los <strong>descuadres de un céntimo</strong>. Un pedido cobrado por 89,00 € en Stripe o PayPal que al entrar en el ERP se convierte en 88,99 € o 89,01 € genera diferencias contables, descuadres en el modelo 303 de IVA y horas de corrección manual.
      </p>

      <h2 id="el-problema-del-centimo" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Problema del Descuadre de 1 Céntimo</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Las plataformas de eCommerce (WooCommerce, PrestaShop) y los ERPs contables (Factusol) utilizan motores matemáticos de cálculo diferentes. Si un conector simplemente traslada los números sin normalizar las fórmulas, la suma de las bases más los impuestos no coincide con el total efectivamente cobrado al cliente.
      </p>

      <h2 id="origen-matematico" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Origen Matemático: Redondeo por Línea vs Redondeo Global</h2>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Método de Cálculo</th>
              <th class="px-4 py-3 font-semibold">Cómo Opera</th>
              <th class="px-4 py-3 font-semibold">Comportamiento</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Redondeo por Línea (WooCommerce)</td>
              <td class="px-4 py-2.5">Calcula el IVA de cada producto redondeado a 2 decimales y luego suma los resultados.</td>
              <td class="px-4 py-2.5 text-amber-400">Puede acumular fracciones de céntimo que suman o restan 0,01 €.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Redondeo por Subtotal (Factusol)</td>
              <td class="px-4 py-2.5">Suma todas las bases imponibles del mismo tipo de IVA y aplica el 21% sobre el total.</td>
              <td class="px-4 py-2.5 text-indigo-300">Es el criterio contable oficial exigido por la Agencia Tributaria (AEAT).</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="algoritmo-bentian" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. El Algoritmo de Cuadre Exacto de Bentian</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge implementa un motor de resolución bidireccional:
      </p>
      <ol class="text-sm text-zinc-300 space-y-2 list-decimal list-inside mb-6">
        <li>Extrae los precios brutos con IVA incluidos fijados en la tienda web.</li>
        <li>Desglosa las bases imponibles aplicando la fórmula contable: <code class="text-emerald-400 font-mono">Base = Total / (1 + TipoIVA)</code> con precisión de 4 decimales.</li>
        <li>Calcula la cuota de IVA teórica de Factusol.</li>
        <li>Si existe una divergencia de redondeo de ±0,01 €, ajusta de forma imperceptible la base o las líneas de portes para que la suma total en <code class="text-zinc-200">F_PCL</code> <strong>coincida exactamente al céntimo</strong> con el cargo bancario de la pasarela.</li>
      </ol>

      <h2 id="mapeo-factusol-fpcl" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Mapeo en las Tablas F_PCL y F_LPC</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Los datos se registran en los campos contables oficiales de Factusol:
      </p>
      <ul class="text-sm text-zinc-300 space-y-1.5 list-disc list-inside mb-6 font-mono text-xs">
        <li><strong class="text-white">F_PCL.BAS1PCL:</strong> Base imponible al tipo general (21%).</li>
        <li><strong class="text-white">F_PCL.PIVA1PCL:</strong> Porcentaje de IVA general (21,00).</li>
        <li><strong class="text-white">F_PCL.IIVA1PCL:</strong> Importe exacto de la cuota de IVA.</li>
        <li><strong class="text-white">F_PCL.TOTPCL:</strong> Total absoluto del pedido (coincidente 100% con Stripe/PayPal).</li>
      </ul>

      <h2 id="ejemplo-real" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Ejemplo Numérico Real</h2>
      <div class="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] text-xs font-mono space-y-1 text-zinc-300 mb-6">
        <div>Total cobrado en WooCommerce: <span class="text-emerald-400 font-bold">89,00 €</span></div>
        <div>Cálculo Bentian para Factusol:</div>
        <div class="ml-4">Base Imponible: <span class="text-white font-bold">73,55 €</span></div>
        <div class="ml-4">Cuota IVA 21%: <span class="text-white font-bold">15,45 €</span></div>
        <div class="ml-4">Suma Total Factusol: <span class="text-emerald-400 font-bold">89,00 €</span> (Cuadre matemático 100% perfecto)</div>
      </div>
    `,
  },
  {
    slug: 'fiscalidad/recargo-de-equivalencia',
    categorySlug: 'fiscalidad',
    title: 'Recargo de Equivalencia en WooCommerce y PrestaShop',
    subtitle: 'Configuración para comerciantes minoristas en España: cómo gestionar el IVA 21% + 5.2% R.E. sin descuadres en Factusol.',
    badge: 'Régimen Especial R.E.',
    readingTime: '5 min de lectura',
    metaTitle: 'Factusol y Recargo de Equivalencia en eCommerce | Bentian ERP',
    metaDescription: 'Cómo conectar Factusol con WooCommerce para minoristas en Recargo de Equivalencia (IVA 21% + 5.2% R.E.). Mapeo exacto en F_PCL y F_LPC.',
    keywords: 'recargo de equivalencia factusol, recargo equivalencia woocommerce, factusol f_pcl recargo, minoristas 5.2 recargo factusol, impuestos espanoles factusol',
    toc: [
      { id: 'que-es-recargo-equivalencia', label: '1. ¿Qué es el Recargo de Equivalencia?', level: 2 },
      { id: 'tipos-recargo-espana', label: '2. Tipos Impositivos Oficiales en España', level: 2 },
      { id: 'deteccion-en-tienda', label: '3. Detección del Cliente con Recargo en la Web', level: 2 },
      { id: 'inyeccion-en-factusol', label: '4. Inyección en las Tablas de Factusol (F_PCL)', level: 2 },
      { id: 'verificacion-factura', label: '5. Verificación Contable de la Factura', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        El <strong>Recargo de Equivalencia</strong> es un régimen especial obligatorio de IVA en España para comerciantes minoristas autónomos que no realizan transformación de los productos que venden. Si tu tienda online vende a profesionales o tiendas físicas en este régimen, estás obligado por ley a repercutir el IVA ordinario más el recargo correspondiente.
      </p>

      <h2 id="que-es-recargo-equivalencia" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. ¿Qué es el Recargo de Equivalencia?</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bajo este régimen, el comerciante minorista no presenta declaraciones trimestrales de IVA (modelo 303). En su lugar, su proveedor (tu tienda) le repercute un recargo adicional sobre la base imponible y lo ingresa directamente a Hacienda.
      </p>

      <h2 id="tipos-recargo-espana" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. Tipos Impositivos Oficiales en España</h2>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-xs text-left border border-white/[0.08] rounded-xl overflow-hidden">
          <thead class="bg-zinc-900/80 text-zinc-300 border-b border-white/[0.08]">
            <tr>
              <th class="px-4 py-3 font-semibold">Tipo de Producto</th>
              <th class="px-4 py-3 font-semibold">IVA Ordinario</th>
              <th class="px-4 py-3 font-semibold text-amber-400">Recargo de Equivalencia</th>
              <th class="px-4 py-3 font-semibold text-emerald-400">Total Tributario</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06] text-zinc-400">
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">General (ropa, ferretería, calzado, tecnología)</td>
              <td class="px-4 py-2.5 font-mono">21,00 %</td>
              <td class="px-4 py-2.5 font-mono text-amber-400 font-bold">5,20 %</td>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">26,20 %</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Reducido (alimentos, hostelería)</td>
              <td class="px-4 py-2.5 font-mono">10,00 %</td>
              <td class="px-4 py-2.5 font-mono text-amber-400 font-bold">1,40 %</td>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">11,40 %</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium text-white">Superreducido (pan, leche, libros)</td>
              <td class="px-4 py-2.5 font-mono">4,00 %</td>
              <td class="px-4 py-2.5 font-mono text-amber-400 font-bold">0,50 %</td>
              <td class="px-4 py-2.5 font-mono text-emerald-400 font-bold">4,50 %</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="deteccion-en-tienda" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. Detección del Cliente con Recargo en la Web</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian detecta si un pedido incluye recargo de equivalencia mediante tres vías estándar:
      </p>
      <ul class="text-sm text-zinc-300 space-y-2 list-disc list-inside mb-6">
        <li><strong>Impuesto configurado en WooCommerce:</strong> Si en <em>WooCommerce → Impuestos</em> tienes una tasa con clase <code class="text-zinc-200">Recargo de Equivalencia</code>.</li>
        <li><strong>Campo personalizado en Checkout (Checkout Field):</strong> Un checkbox donde el cliente profesional marca <em>"Aplicar Recargo de Equivalencia"</em>.</li>
        <li><strong>Ficha de Cliente en Factusol:</strong> Si el NIF del cliente ya existe en Factusol con la casilla <code class="text-zinc-200 font-mono">F_CLI.APLREQ = Sí</code>, Bentian aplica automáticamente el recargo incluso si la web no lo desglosó por separado.</li>
      </ul>

      <h2 id="inyeccion-en-factusol" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. Inyección en las Tablas de Factusol (F_PCL)</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian rellena de forma matemática los campos de recargo en la cabecera del pedido de Factusol:
      </p>
      <div class="p-4 rounded-xl bg-[#09090c] border border-white/[0.06] text-xs font-mono space-y-1 text-zinc-300 mb-6">
        <div>F_PCL.PREQ1PCL = <span class="text-emerald-400 font-bold">5.20</span> (Porcentaje de recargo)</div>
        <div>F_PCL.IREQ1PCL = <span class="text-emerald-400 font-bold">Base * 0.052</span> (Importe de la cuota de recargo)</div>
        <div>F_PCL.TOTPCL = <span class="text-white font-bold">Base + Cuota IVA + Cuota Recargo</span></div>
      </div>

      <h2 id="verificacion-factura" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Verificación Contable de la Factura</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Cuando el departamento de facturación de tu empresa convierta el pedido de cliente en factura en Factusol (pulsando el botón <em>Facturar</em>), el programa generará la factura con los dos impuestos desglosados en sus casillas oficiales, cuadrando al 100% con los modelos fiscales de la AEAT.
      </p>
    `,
  },
  {
    slug: 'fiscalidad/verifactu-ley-antifraude',
    categorySlug: 'fiscalidad',
    title: 'Veri*Factu, Ley Antifraude y la Facturación en Factusol',
    subtitle: 'Por qué la escritura de pedidos en F_PCL delega la seguridad en Factusol y preserva la cadena criptográfica TRZFAC.',
    badge: 'Legal & Fiscal',
    readingTime: '5 min de lectura',
    metaTitle: 'Factusol, WooCommerce y VeriFactu (Ley Antifraude) | Bentian',
    metaDescription: 'Cómo afecta VeriFactu y la Ley Antifraude a los conectores de Factusol. Por qué operar en pedidos (F_PCL) preserva el encadenamiento TRZFAC oficial.',
    keywords: 'verifactu factusol, ley antifraude factusol woocommerce, cadena criptografica trzfac, multas verifactu conectores, facturacion legal factusol',
    toc: [
      { id: 'marco-legal-verifactu', label: '1. El Marco Legal de la Ley Antifraude y Veri*Factu', level: 2 },
      { id: 'el-peligro-facturas-directas', label: '2. El Peligro de Insertar Facturas Directas por SQL', level: 2 },
      { id: 'la-solucion-fpcl', label: '3. La Arquitectura Segura de Bentian: Escribir en F_PCL', level: 2 },
      { id: 'encadenamiento-trzfac', label: '4. La Cadena Criptográfica TRZFAC de Factusol', level: 2 },
      { id: 'declaracion-responsabilidad', label: '5. Dictamen Técnico y Declaración de Responsabilidad', level: 2 },
    ],
    contentHtml: `
      <p class="text-base text-zinc-300 leading-relaxed mb-6">
        La entrada en vigor de la Ley 11/2021 de Medidas de Prevención y Lucha contra el Fraude Fiscal y el posterior Reglamento Veri*Factu imponen obligaciones estrictas a todos los sistemas de facturación en España: inalterabilidad, trazabilidad, registro de eventos y encadenamiento criptográfico mediante hashes.
      </p>

      <h2 id="marco-legal-verifactu" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">1. El Marco Legal de la Ley Antifraude y Veri*Factu</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        La normativa prohíbe taxativamente el uso de software de gestión que permita llevar dobles contabilidades, alterar registros de facturas ya emitidas o eliminar transacciones sin dejar rastro de auditoría. Las sanciones por comercializar o utilizar software no conforme alcanzan hasta los 50.000 € por ejercicio.
      </p>

      <h2 id="el-peligro-facturas-directas" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">2. El Peligro de Insertar Facturas Directas por SQL</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Algunos conectores imprudentes intentan insertar directamente registros en la tabla de facturas (<code class="text-rose-400 font-mono">F_FAC</code>). Esto constituye un <strong>fallo crítico de seguridad y legalidad</strong>:
      </p>
      <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 mb-6">
        <strong>Riesgo de Ruptura de Cadena:</strong> Cuando Factusol emite una factura legal, su motor certificado calcula un hash criptográfico SHA-256 encadenado con el hash de la factura anterior y lo registra en la tabla de trazabilidad fiscal (<code class="font-mono text-white">TRZFAC</code>). Si un conector externo inyecta una factura en <code class="font-mono text-white">F_FAC</code> sin que Factusol calcule ese hash oficial, <strong>la cadena se rompe</strong> y la empresa queda en situación de irregularidad tributaria.
      </div>

      <h2 id="la-solucion-fpcl" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">3. La Arquitectura Segura de Bentian: Escribir en F_PCL</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Bentian ERP Bridge adopta el enfoque de ingeniería fiscalmente defendible y certificado:
      </p>
      <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 mb-6">
        <strong>Principio de Separación Comercial vs Fiscal:</strong> Bentian actúa estrictamente sobre el flujo de <strong>pedidos de clientes (<code class="font-mono text-white">F_PCL</code>)</strong>. Los pedidos son documentos comerciales preparatorios que no constituyen factura fiscal ni devengan IVA contable hasta su emisión formal.
      </div>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Al introducir las ventas de WooCommerce como pedidos de cliente, tu empresa conserva el control total: el responsable de almacén o el administrativo revisa el pedido y hace clic en <em>"Facturar"</em> dentro de Factusol.
      </p>

      <h2 id="encadenamiento-trzfac" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">4. La Cadena Criptográfica TRZFAC de Factusol</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-4">
        Al facturar el pedido desde la interfaz oficial de Factusol:
      </p>
      <ol class="text-sm text-zinc-300 space-y-1.5 list-decimal list-inside mb-6">
        <li>Factusol asigna el número oficial de serie y factura.</li>
        <li>Genera el registro de trazabilidad en <code class="text-indigo-300 font-mono">TRZFAC</code> con fecha, hora y firma SHA-256.</li>
        <li>Imprime el código QR oficial exigido por la AEAT.</li>
        <li>Genera el registro de alta para remisión telemática inmediata si la empresa está acogida al sistema Veri*Factu.</li>
      </ol>

      <h2 id="declaracion-responsabilidad" class="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.08]">5. Dictamen Técnico y Declaración de Responsabilidad</h2>
      <p class="text-sm text-zinc-300 leading-relaxed mb-6">
        Bentian no altera ni manipula ningún registro fiscal emitido. La custodia, integridad y cumplimiento del software de facturación corresponde íntegramente al motor certificado de Factusol (Software DELSOL), garantizando la tranquilidad jurídica absoluta de tu negocio.
      </p>
    `,
  },
];
