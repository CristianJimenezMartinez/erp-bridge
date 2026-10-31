/**
 * Base de Conocimiento Maestra Multi-ERP y Compositor Contextual Multi-Turno (Bentian ERP Bridge).
 * Mantiene memoria de la sesión (ERP detectado, canal web, turno de conversación y preguntas previas)
 * para seguir el hilo sin repetirse.
 */

export interface SessionMemoryContext {
  turnCount: number;
  detectedErp?: string;
  detectedStore?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
}

export const BENTIAN_MASTER_SYSTEM_PROMPT = [
  'Eres el Arquitecto de Soluciones y Director Comercial Autónomo de Bentian ERP Bridge (https://bridge.cristianjm.com), creado por Cristian Jiménez Martínez (Arquitecto de Software, Ciberseguridad & Sistemas ERP, Elche/Alicante, Tel/WhatsApp: +34 617 205 053, soporte@cristianjm.com).',
  '',
  'CATÁLOGO COMPLETO DE ERPs SOPORTADOS POR EL MOTOR POLIMÓRFICO (IErpConnector):',
  '1. ERPs EN PRODUCCIÓN CON MODO EVALUACIÓN SANDBOX INTEGRADO:',
  '   - Factusol (Software DELSOL): Access (.accdb/.mdb local o NAS/UNC) y SQL Server. Debounce OLEDB 5s, lecturas ADODB Snapshot sin bloqueo .ldb (Error 3045), stock disponible DISSTO, tarifas (F_TAR), almacenes (F_ALM), imágenes MD5 (factusolImg), pedidos atómicos (F_PCL/F_LCL/F_CLI) y rollover anual automático.',
  '   - SimplyGest: Conector Triple-Modo (.dat, .mdb y REST/SQL) con auto-detección local, selector nativo y transacciones T-SQL atómicas.',
  '   - Sage 50: SQL Server (.\\SAGE50, base GESTION) con lecturas WITH (NOLOCK) sobre articulo/pvp/stocks (final - reservado) y pedidos en c_pediven/d_pediven.',
  '   - Wolters Kluwer a3ERP: SQL Server (.\\A3ERP) con lecturas WITH (NOLOCK) sobre ARTICULO/STOCKALM (UNIDADES - RESERVADO) y pedidos en CABEPEDV/LINEPEDV.',
  '   - Ágora Retail / POS: SQL Server (.\\AGORA, base AgoraDB) con lecturas WITH (NOLOCK) sobre SaleItem/PriceList/WarehouseStock y pedidos en CustomerOrder/CustomerOrderLine.',
  '   - Holded (Cloud ERP): Integración bidireccional vía API REST + Webhooks.',
  '2. ERPs EN BETA ABIERTA / ADAPTACIÓN BAJO DEMANDA SIN COSTE DE DESARROLLO:',
  '   - Sage 200 / Sage Murano (SQL Server: Articulos, AcumuladosStock, CabeceraPedidoCliente, LineasPedidoCliente).',
  '   - ICG Manager / FrontRetail / HIOPOS (SQL Server: ARTICULOS, PRECIOSVENTA, STOCKS, PEDVENTACAB/PEDVENTALIN).',
  '   - VisionWin, Aplifisa, Odoo, FacturaScripts, Microsoft Dynamics 365 Business Central (Navision) y ClassicGes.',
  '',
  'CANALES E-COMMERCE: WooCommerce (REST v3), PrestaShop (1.7, 8 y 9), Shopify y Conector Universal PHP (erp-bridge-endpoint.php).',
  'PRECIOS: 199,00 €/año (+ IVA) o 19,99 €/mes (+ IVA), SKUs y pedidos ilimitados. Licencia de Evaluación gratuita en https://bridge.cristianjm.com/beta/.',
  'CANAL PARTNER (Agencias e IT): 100% del setup inicial (300-600 €) para el partner + 30% comisión recurrente vitalicia (59,70 €/año por licencia activa) + Portal /partners/ con emisión de Trials de 15 días en 1 clic.',
  '',
  'REGLA DE CONTINUIDAD DE CONVERSACIÓN Y HONESTIDAD DOCUMENTAL:',
  '- Tienes acceso al historial completo de mensajes anteriores de esta sesión y a la ficha del cliente.',
  '- NO repitas bloques enteros que ya hayas explicado en el mensaje anterior; responde directamente a la nueva pregunta del usuario manteniendo el hilo natural de la conversación.',
  '- El almacenamiento persistente local del agente es JSON atómico en %APPDATA%\\Bentian Agent\\agent-config.json con reemplazo seguro (.tmp + renameSync) y respaldo .bak (PROHIBIDO mencionar SQLite).',
].join('\n');

export interface ComposedKnowledgeOptions {
  userMessage: string;
  visitorName?: string;
  detectedEmail?: string;
  detectedPhone?: string;
  memory?: SessionMemoryContext;
}

export function extractEntitiesFromText(
  text: string,
  prev?: { detectedErp?: string; detectedStore?: string }
): { detectedErp?: string; detectedStore?: string } {
  const lower = text.toLowerCase();
  let detectedErp = prev?.detectedErp;
  let detectedStore = prev?.detectedStore;

  const erpMatchers: Array<[string, string]> = [
    ['factusol', 'Factusol'],
    ['simplygest', 'SimplyGest'],
    ['sage 50', 'Sage 50'],
    ['sage50', 'Sage 50'],
    ['sage 200', 'Sage 200'],
    ['sage200', 'Sage 200'],
    ['murano', 'Sage 200 (Murano)'],
    ['a3erp', 'Wolters Kluwer a3ERP'],
    ['agora', 'Ágora POS'],
    ['ágora', 'Ágora POS'],
    ['holded', 'Holded'],
    ['icg', 'ICG Manager / FrontRetail'],
    ['frontretail', 'ICG FrontRetail'],
    ['visionwin', 'VisionWin'],
    ['aplifisa', 'Aplifisa'],
    ['odoo', 'Odoo'],
    ['facturascripts', 'FacturaScripts'],
    ['business central', 'Dynamics 365 Business Central'],
    ['navision', 'Dynamics 365 Business Central (Navision)'],
    ['classicges', 'ClassicGes'],
  ];
  for (const [k, label] of erpMatchers) {
    if (lower.includes(k)) {
      detectedErp = label;
      break;
    }
  }

  if (lower.includes('prestashop')) detectedStore = 'PrestaShop';
  else if (lower.includes('woocommerce') || lower.includes('wordpress')) detectedStore = 'WooCommerce';
  else if (lower.includes('shopify')) detectedStore = 'Shopify';

  return { detectedErp, detectedStore };
}

export function composeExpertEngineeringReply(opts: ComposedKnowledgeOptions): string {
  const lower = opts.userMessage.toLowerCase();
  const mem = opts.memory;
  const isFollowUp = (mem?.turnCount || 1) > 1;
  const erpContext = mem?.detectedErp ? ` para **${mem.detectedErp}**` : '';
  const storeContext = mem?.detectedStore ? ` con **${mem.detectedStore}**` : '';
  const greeting = isFollowUp
    ? opts.visitorName
      ? `Perfecto **${opts.visitorName}**, siguiendo con tu caso${erpContext}${storeContext}:`
      : `Siguiendo con lo que comentábamos${erpContext}${storeContext}:`
    : opts.visitorName
    ? `Hola **${opts.visitorName}**,`
    : 'Hola,';

  if (opts.detectedEmail || opts.detectedPhone) {
    const contact = [opts.detectedEmail || mem?.visitorEmail, opts.detectedPhone || mem?.visitorPhone].filter(Boolean).join(' | ');
    return [
      `${greeting}`,
      '',
      `He guardado tus datos (**${contact}**) en tu ficha de sesión${erpContext}${storeContext} y acabo de enviar un aviso prioritario al móvil de **Cristian Jiménez** (+34 617 205 053).`,
      '',
      'Si quieres ir adelantando y probar el agente en cualquier PC Windows (incluye **Modo Evaluación Sandbox** aunque no tengas el ERP instalado delante):',
      '• **Instalador Oficial Windows:** https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe',
      '• **Generar Clave Beta Gratuita (14 días):** https://bridge.cristianjm.com/beta/',
      '• **Si tienes cualquier otra duda técnica mientras te contacta Cristian, pregúntame por aquí y sigo respondiéndote.**',
    ].join('\n');
  }

  // Respuestas específicas de seguimiento (Turno 2+) para no repetir toda la presentación inicial:
  if (isFollowUp) {
    if (lower.includes('corta') || lower.includes('internet') || lower.includes('caída') || lower.includes('offline') || lower.includes('nas') || lower.includes('red')) {
      return [
        `${greeting}`,
        '',
        'Si se corta internet en la nave o el NAS tarda en responder al arrancar Windows, **no se pierde ni un solo pedido ni se desconfigura nada**:',
        '1. **Cola Offline Resiliente (*Store-and-Forward*):** El agente guarda en local los cambios de stock pendientes y, en cuanto vuelve la línea, sincroniza todo automáticamente.',
        '2. **Blindaje Anti-Wiping de Rutas NAS (`\\\\SERVIDOR\\...` o `Z:\\`):** Si al encender el PC la unidad de red aún no ha montado, el agente se pone en estado *Offline / Esperando red* pero **jamás borra la ruta** guardada en `%APPDATA%\\Bentian Agent\\agent-config.json`.',
        '3. **Transacciones con Rollback:** Si internet cae justo a mitad de bajar un pedido web, hace rollback inmediato en el ERP para no dejar líneas huérfanas.',
        '',
        '¿Quieres probar este comportamiento en tu entorno con una Clave Beta de 14 días (https://bridge.cristianjm.com/beta/) o prefieres dejarnos tu email/WhatsApp?',
      ].join('\n');
    }

    if (lower.includes('instal') || lower.includes('configur') || lower.includes('tarda') || lower.includes('difícil') || lower.includes('pasos') || lower.includes('como se pone')) {
      return [
        `${greeting}`,
        '',
        'La instalación en el cliente lleva **menos de 10 minutos** y no requiere programar nada:',
        '1. Ejecutas `Bentian-Setup.exe` en el PC o servidor Windows donde esté el ERP (o con acceso por red local).',
        '2. Se abre el **Centro de Control local (`http://127.0.0.1:39281`)** con **Diagnóstico Pre-Flight** automático (verifica drivers OLEDB/SQL, reloj NTP y red).',
        '3. Pulsas **Auto-Detectar ERP** (o eliges el archivo con el selector nativo de Windows), seleccionas la **Tarifa**, el **Almacén** y la **Serie de pedidos**, y pegas las claves de WooCommerce, PrestaShop o Shopify (o descargas `erp-bridge-endpoint.php` en 1 clic).',
        '4. Puedes pulsar **Simular Pedido de Prueba** o activar el **Modo Evaluación Sandbox** antes de pasar a fuego real.',
        '',
        'Recuerda que como Partner tú le facturas esos **300 € – 600 € de puesta en marcha** íntegros a tu cliente. ¿Me dejas tu email para activarte hoy mismo el acceso al Portal de Partners?',
      ].join('\n');
    }
  }

  return [
    `${greeting} soy el asistente técnico y comercial de **Bentian ERP Bridge**. Te detallo con exactitud todos los ERPs que conectamos, cómo funciona nuestra ingeniería **Local-First** y nuestras condiciones:`,
    '',
    '### 1. Ecosistema Multi-ERP Completo (Producción + Adaptación sin coste)',
    'Bentian cuenta con un motor polimórfico (`IErpConnector`) que conecta en tiempo real con **WooCommerce, PrestaShop (1.7, 8 y 9), Shopify y Tiendas a Medida (`erp-bridge-endpoint.php`)**:',
    '- **Factusol (Software DELSOL — Access `.accdb`/`.mdb` y SQL Server):** Vigilante en tiempo real con *Debounce OLEDB de 5 segundos*, lecturas ADODB Snapshot no bloqueantes (**cero bloqueos `.ldb`/`.laccdb` ni Error 3045** en red local o NAS `\\\\SERVIDOR\\...`), stock disponible real (`DISSTO = ACTSTO - Reservado`), tarifas (`F_TAR`), almacenes (`F_ALM`), fotos con caché MD5 (`factusolImg`), escritura atómica de pedidos con rollback (`F_PCL`/`F_LCL`/`F_CLI`) y *Rollover Fiscal Anual Automático* en enero (`2262025.accdb` ➔ `2262026.accdb`).',
    '- **SimplyGest (Triple-Modo `.dat`, `.mdb` y REST/SQL):** Auto-detección de instalación local, selector nativo de Windows, sincronización de catálogo/tarifas/stock y transacciones T-SQL atómicas.',
    '- **Sage 50 (`SQL Server` — base `GESTION`):** Lecturas no bloqueantes `WITH (NOLOCK)` sobre `articulo`, `pvp` y `stocks` (`final - reservado`), e inserción atómica de pedidos web en `c_pediven` y `d_pediven`.',
    '- **Wolters Kluwer a3ERP (`SQL Server` — base `A3ERP`):** Lecturas `WITH (NOLOCK)` sobre `ARTICULO` y `STOCKALM` (`UNIDADES - RESERVADO`), e inserción de pedidos en `CABEPEDV` y `LINEPEDV`.',
    '- **Ágora Retail / POS (`SQL Server` — base `AgoraDB`):** Lecturas `WITH (NOLOCK)` sobre `SaleItem`, `PriceList` y `WarehouseStock`, e inserción de pedidos en `CustomerOrder` y `CustomerOrderLine`.',
    '- **Holded (Cloud ERP):** Sincronización bidireccional mediante API REST y Webhooks.',
    '- **Conectores en Beta Abierta y Adaptación Bajo Demanda (0 € coste de desarrollo):** **Sage 200 (Sage Murano)**, **ICG Manager / FrontRetail / HIOPOS**, **VisionWin**, **Aplifisa**, **Odoo**, **FacturaScripts**, **Microsoft Dynamics 365 Business Central (Navision)** y **ClassicGes**.',
    '',
    '### 2. Ingeniería de Sincronización y Seguridad Industrial en Windows',
    '- **Ciclo Bidireccional cada 30 segundos + Reposición de Cancelados:** Cada **30s** descarga pedidos nuevos al ERP, detecta pedidos cancelados en la web para **reponer el stock automáticamente**, y sube solo los productos cuyo hash ha cambiado (*Delta Sync*, sin tumbar hostings compartidos ni dar errores 500 `max_execution_time` de PHP como Festeweb).',
    '- **Cuadre Fiscal al Céntimo y Veri*Factu:** Cuadra **IVA (21%, 10%, 4%)**, **Recargo de Equivalencia (5,2%, 1,4%, 0,5%)**, portes y series, cumpliendo con **Veri*Factu (RD 1007/2023)**.',
    '- **Cero Puertos Abiertos (100% Saliente TLS 1.3) + Cola Offline:** No se abre ni un solo puerto NAT en el router. Incluye **Diagnóstico Pre-Flight** en `http://127.0.0.1:39281`, **Modo Evaluación Sandbox** y actualizaciones firmadas con **Ed25519** (`UpdateSwapper`).',
    '',
    '### 3. Precios Oficiales y Programa de Partners (Agencias Web e Informáticos)',
    '- **PVP Licencia Cliente Final (Tarifa Plana ILIMITADA en SKUs y pedidos):** **199,00 €/año (+ IVA)** o **19,99 €/mes (+ IVA)** sin permanencia.',
    '- **Beneficio Partner:** **100% de vuestro Setup Inicial (300 € – 600 €)** + **30% de Comisión Recurrente Vitalicia (59,70 €/año por licencia activa)** + **Portal de Partners (`/partners/`)** para emitir Trials de 15 días en 1 clic.',
    '',
    '### Próximo paso inmediato',
    '- **Escríbeme aquí mismo tu email o teléfono/WhatsApp** (y qué ERP utilizáis) para que a **Cristian Jiménez** (+34 617 205 053) le salte el aviso directo en su Telegram, o solicita tu Licencia de Evaluación Gratuita en https://bridge.cristianjm.com/beta/ (Instalador: https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe).',
  ].join('\n');
}
