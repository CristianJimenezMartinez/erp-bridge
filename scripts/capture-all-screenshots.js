const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const TARGET_URL = 'http://127.0.0.1:39281/';
const OUT_DIR = path.join(__dirname, '..', 'apps', 'api', 'public', 'assets', 'screenshots');

async function waitForTarget(port, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find(item => item.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Edge CDP target not available');
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async captureScreenshot(baseName) {
    const pngPath = path.join(OUT_DIR, baseName + '.png');
    const webpPath = path.join(OUT_DIR, baseName + '.webp');

    // 1. PNG (lossless, alta resolución para Softpedia y descargas)
    const resPng = await this.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true
    });
    fs.writeFileSync(pngPath, Buffer.from(resPng.data, 'base64'));

    // 2. WebP (optimizado para carga web instantánea y SEO)
    const resWebp = await this.send('Page.captureScreenshot', {
      format: 'webp',
      quality: 92,
      fromSurface: true
    });
    fs.writeFileSync(webpPath, Buffer.from(resWebp.data, 'base64'));

    const sPng = (fs.statSync(pngPath).size / 1024).toFixed(1);
    const sWebp = (fs.statSync(webpPath).size / 1024).toFixed(1);
    console.log(`  ✓ ${baseName}.png (${sPng} KB) | ${baseName}.webp (${sWebp} KB)`);
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log('🚀 [1/3] Lanzando Microsoft Edge Headless (1280x820 @ 2x Retina)...');
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1280,820',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--force-device-scale-factor=2',
    TARGET_URL
  ]);

  try {
    const wsUrl = await waitForTarget(PORT);
    console.log('⚡ [2/3] Conectado a Chrome DevTools Protocol.');
    const client = new CdpClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // Esperar a que la app cargue y ejecute fetchStatus
    await new Promise(r => setTimeout(r, 2200));

    // Congelar y limpiar todos los timers e intervalos en ejecución
    await client.evaluate(`
      (() => {
        // Detener todos los temporizadores e intervalos periódicos en el navegador
        for (let i = 1; i < 99999; i++) {
          window.clearInterval(i);
          window.clearTimeout(i);
        }

        // Enriquecer métricas de overview para catálogo real
        const metric = document.getElementById('card-f-metric');
        if (metric) metric.textContent = '14.820 arts.';
        const fDesc = document.getElementById('card-f-path');
        if (fDesc) fDesc.textContent = '0012026.accdb (DELSOL)';

        // Canal web activo
        const wcBadge = document.getElementById('card-wc-badge');
        if (wcBadge) {
          wcBadge.className = 'tag tag-green';
          wcBadge.textContent = 'Conectado';
        }
        const wcMetric = document.getElementById('card-wc-metric');
        if (wcMetric) wcMetric.textContent = 'WooCommerce + API';
        const wcUrl = document.getElementById('card-wc-url');
        if (wcUrl) wcUrl.textContent = 'https://mitienda-online.es';

        // Barra inferior limpia con IDs exactos de dock
        function cleanBottomBar() {
          const dot = document.getElementById('dock-status-dot');
          if (dot) dot.style.background = '#10b981';
          
          const txt = document.getElementById('dock-status-text');
          if (txt) txt.textContent = 'En Línea';

          const msg = document.getElementById('dock-latest-msg');
          if (msg) {
            msg.textContent = 'Factusol 2026 OLEDB activo · Vigilante en tiempo real DISSTO · Enlace seguro SSL';
          }

          const bWarns = document.getElementById('dock-badge-warns');
          if (bWarns) bWarns.style.display = 'none';

          const bErrs = document.getElementById('dock-badge-errors');
          if (bErrs) bErrs.style.display = 'none';
        }

        window.__cleanBottomBar = cleanBottomBar;
        cleanBottomBar();
      })()
    `);

    console.log('📸 [3/3] Capturando pantallas clave...');

    // 1. Overview / Dashboard Zen
    await client.evaluate("switchTab('overview')");
    await client.evaluate("if (window.__cleanBottomBar) window.__cleanBottomBar()");
    await new Promise(r => setTimeout(r, 400));
    await client.captureScreenshot('01-dashboard-overview');

    // 2. Multi-ERP Modal Selector (debe abrirse sobre tab factusol)
    await client.evaluate("switchTab('factusol')");
    await client.evaluate("openSwitchErpModal()");
    await client.evaluate("if (window.__cleanBottomBar) window.__cleanBottomBar()");
    await new Promise(r => setTimeout(r, 500));
    await client.captureScreenshot('02-multi-erp-selector');
    await client.evaluate("closeSwitchErpModal()");
    await new Promise(r => setTimeout(r, 300));

    // 3. Canal Web / Tienda
    await client.evaluate("switchTab('channel')");
    await client.evaluate("if (window.__cleanBottomBar) window.__cleanBottomBar()");
    await new Promise(r => setTimeout(r, 400));
    await client.captureScreenshot('03-ecommerce-channels');

    // 4. Automatización & Sincronización
    await client.evaluate("switchTab('sync')");
    await client.evaluate("if (window.__cleanBottomBar) window.__cleanBottomBar()");
    await new Promise(r => setTimeout(r, 400));
    await client.captureScreenshot('04-automation-sync');

    // 5. Historial de Ventas
    await client.evaluate(`
      window.loadSalesOrders = async () => {};
    `);
    await client.evaluate("switchTab('history')");
    await client.evaluate(`
      (() => {
        const kpiEur = document.getElementById('kpi-sales-today-eur');
        if (kpiEur) kpiEur.textContent = '4.798,50 €';
        const kpiCount = document.getElementById('kpi-sales-today-count');
        if (kpiCount) kpiCount.textContent = '4';
        const kpiIssues = document.getElementById('kpi-sales-issues-count');
        if (kpiIssues) kpiIssues.textContent = '0';
        const kpiIssuesTag = document.getElementById('kpi-sales-issues-tag');
        if (kpiIssuesTag) {
          kpiIssuesTag.className = 'tag tag-green';
          kpiIssuesTag.textContent = 'Al día';
        }

        if (typeof renderSalesOrdersTable === 'function') {
          renderSalesOrdersTable([
            {
              channel: 'woocommerce',
              orderNumber: 'WEB-2026-0842',
              date: Date.now() - 1000 * 60 * 15,
              customerName: 'Construcciones del Norte S.L.',
              customerEmail: 'compras@construccionesdelnorte.es',
              factusolSeries: '1',
              factusolOrderNumber: '00412',
              totalAmount: 1482.50,
              currency: '€',
              status: 'synced',
              id: 'ord-1'
            },
            {
              channel: 'woocommerce',
              orderNumber: 'WEB-2026-0841',
              date: Date.now() - 1000 * 60 * 75,
              customerName: 'Instalaciones Levante S.A.',
              customerEmail: 'pedidos@instalacioneslevante.com',
              factusolSeries: '1',
              factusolOrderNumber: '00411',
              totalAmount: 840.20,
              currency: '€',
              status: 'synced',
              id: 'ord-2'
            },
            {
              channel: 'universal',
              orderNumber: 'WEB-2026-0840',
              date: Date.now() - 1000 * 60 * 160,
              customerName: 'Suministros Industriales García',
              customerEmail: 'administracion@suministrosgarcia.com',
              factusolSeries: '1',
              factusolOrderNumber: '00410',
              totalAmount: 325.00,
              currency: '€',
              status: 'synced',
              id: 'ord-3'
            },
            {
              channel: 'woocommerce',
              orderNumber: 'WEB-2026-0839',
              date: Date.now() - 1000 * 60 * 320,
              customerName: 'Reformas Integrales Madrid',
              customerEmail: 'info@reformasintegralesmadrid.es',
              factusolSeries: '1',
              factusolOrderNumber: '00409',
              totalAmount: 2150.80,
              currency: '€',
              status: 'synced',
              id: 'ord-4'
            }
          ], 4, 1, 1);
        }
        if (window.__cleanBottomBar) window.__cleanBottomBar();
      })()
    `);
    await new Promise(r => setTimeout(r, 400));
    await client.captureScreenshot('05-sales-order-history');

    // 6. Onboarding Wizard Modal
    await client.evaluate("switchTab('overview')");
    await client.evaluate("openWizardModal()");
    await client.evaluate("if (window.__cleanBottomBar) window.__cleanBottomBar()");
    await new Promise(r => setTimeout(r, 400));
    await client.captureScreenshot('06-setup-wizard');

    console.log('\n🎉 ¡Todas las capturas en Alta Resolución (2x Retina) han sido generadas con éxito!');
    client.close();
  } finally {
    edge.kill('SIGKILL');
  }
}

run().catch(err => {
  console.error('Error generando capturas:', err);
  process.exit(1);
});
