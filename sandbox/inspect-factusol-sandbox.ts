import path from 'path';
import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

export interface SandboxInspectionReport {
  timestamp: string;
  databasePath: string;
  totalArticles: number;
  sampleArticles: Array<{
    code: string;
    description: string;
    family?: string;
    stock: {
      warehouse: string;
      actual: number;
      available: number;
      minimum: number;
    }[];
  }>;
  totalOrders: number;
  totalOrderLines: number;
  maxOrderCode: number | null;
  totalCustomers: number;
  status: 'READY' | 'ERROR';
}

export async function inspectSandboxDatabase(dbPath?: string): Promise<SandboxInspectionReport> {
  const resolvedDbPath = dbPath || path.resolve(__dirname, 'lab-factusol-isolated.accdb');
  const driver = new AccessDriver({ databasePath: resolvedDbPath });

  console.log(`[SandboxInspector] Inspeccionando base de datos Access: ${resolvedDbPath}`);

  // 1. Total Artículos en F_ART
  const artCountRes = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_ART');
  const totalArticles = Number(artCountRes[0]?.total || 0);

  // 2. Muestra de SKUs
  const targetSkus = ['000001', '001341', '001455'];
  const skusInClause = targetSkus.map((s) => `'${s}'`).join(',');
  const articlesRes = await driver.query<{
    CODART: string;
    DESART: string;
    FAMART?: string;
  }>(`SELECT CODART, DESART, FAMART FROM F_ART WHERE CODART IN (${skusInClause}) ORDER BY CODART ASC`);

  // 3. Stock disponible en F_STO para esos SKUs
  const stocksRes = await driver.query<{
    ARTSTO: string;
    ALMSTO: string;
    ACTSTO: number;
    DISSTO: number;
    MINSTO: number;
  }>(`SELECT ARTSTO, ALMSTO, ACTSTO, DISSTO, MINSTO FROM F_STO WHERE ARTSTO IN (${skusInClause}) ORDER BY ARTSTO, ALMSTO`);

  const sampleArticles = articlesRes.map((art) => {
    const artStocks = stocksRes
      .filter((s) => s.ARTSTO === art.CODART)
      .map((s) => ({
        warehouse: s.ALMSTO,
        actual: Number(s.ACTSTO || 0),
        available: Number(s.DISSTO || 0),
        minimum: Number(s.MINSTO || 0),
      }));

    return {
      code: art.CODART,
      description: art.DESART,
      family: art.FAMART,
      stock: artStocks,
    };
  });

  // 4. Pedidos y líneas
  const orderCountRes = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_PCL');
  const totalOrders = Number(orderCountRes[0]?.total || 0);

  const orderLineCountRes = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_LPC');
  const totalOrderLines = Number(orderLineCountRes[0]?.total || 0);

  // 5. Máximo CODPCL en F_PCL
  const maxOrderRes = await driver.query<{ maxid: number | null }>('SELECT MAX(CODPCL) AS maxid FROM F_PCL');
  const maxOrderCode = maxOrderRes[0]?.maxid !== null && maxOrderRes[0]?.maxid !== undefined 
    ? Number(maxOrderRes[0].maxid) 
    : null;

  // 6. Total clientes en F_CLI
  const customerCountRes = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_CLI');
  const totalCustomers = Number(customerCountRes[0]?.total || 0);

  return {
    timestamp: new Date().toISOString(),
    databasePath: resolvedDbPath,
    totalArticles,
    sampleArticles,
    totalOrders,
    totalOrderLines,
    maxOrderCode,
    totalCustomers,
    status: 'READY',
  };
}

async function runCli() {
  try {
    const report = await inspectSandboxDatabase();
    console.log('\n======================================================');
    console.log('       INFORME DE ESTADO: SANDBOX FACTUSOL ACCDB      ');
    console.log('======================================================');
    console.log(`Archivo: ${report.databasePath}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Estado: ${report.status}`);
    console.log('------------------------------------------------------');
    console.log(`• Total Artículos (F_ART):   ${report.totalArticles}`);
    console.log(`• Total Clientes (F_CLI):    ${report.totalCustomers}`);
    console.log(`• Total Pedidos (F_PCL):     ${report.totalOrders}`);
    console.log(`• Total Líneas Pedido (F_LPC): ${report.totalOrderLines}`);
    console.log(`• Máximo CODPCL (F_PCL):     ${report.maxOrderCode}`);
    console.log('------------------------------------------------------');
    console.log('SKUs de muestra seleccionados para E2E:');
    for (const art of report.sampleArticles) {
      console.log(`  - SKU [${art.code}] "${art.description}" (Familia: ${art.family || 'N/A'})`);
      if (art.stock.length === 0) {
        console.log('      (Sin registros de stock en F_STO)');
      } else {
        for (const st of art.stock) {
          console.log(`      Almacén: ${st.warehouse} | Actual: ${st.actual} | Disponible: ${st.available} | Mínimo: ${st.minimum}`);
        }
      }
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Error durante la inspección del sandbox:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}
