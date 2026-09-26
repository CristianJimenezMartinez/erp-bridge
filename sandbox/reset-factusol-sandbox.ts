import fs from 'fs';
import path from 'path';
import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';

export interface ResetOptions {
  verbose?: boolean;
  sourcePath?: string;
  targetPath?: string;
}

export interface SandboxVerificationResult {
  ready: boolean;
  databasePath: string;
  totalArticles: number;
  totalCustomers: number;
  totalOrders: number;
  totalOrderLines: number;
  maxOrderCode: number | null;
  sampleSkus: Array<{
    sku: string;
    description: string;
    warehouse: string;
    actualStock: number;
    availableStock: number;
  }>;
  error?: string;
}

const DEFAULT_SANDBOX_DIR = path.resolve(__dirname);
const DEFAULT_TARGET_DB = path.join(DEFAULT_SANDBOX_DIR, 'lab-factusol-isolated.accdb');
const DEFAULT_PRISTINE_DB = path.join(DEFAULT_SANDBOX_DIR, 'lab-factusol-isolated.pristine.accdb');
const FALLBACK_SOURCE_DB = 'G:\\Otros ordenadores\\Mi PC\\Bentian\\API\\bentian\\2252025.accdb';

/**
 * Elimina archivos residuales de bloqueo (.laccdb) si no hay procesos activos.
 */
function cleanupLockFile(targetDbPath: string, verbose = false): void {
  const lockFilePath = targetDbPath.replace(/\.accdb$/i, '.laccdb');
  if (fs.existsSync(lockFilePath)) {
    if (verbose) {
      console.log(`[ResetHelper] Eliminando archivo de bloqueo residual: ${lockFilePath}`);
    }
    try {
      fs.unlinkSync(lockFilePath);
    } catch (e: any) {
      if (verbose) {
        console.warn(`[ResetHelper] No se pudo borrar ${lockFilePath} (puede estar en uso por otro proceso):`, e.message);
      }
    }
  }
}

/**
 * Restaura la base de datos de sandbox Factusol a su estado inicial limpio.
 */
export async function resetSandboxDatabase(options: ResetOptions = {}): Promise<void> {
  const verbose = options.verbose ?? true;
  const targetPath = path.resolve(options.targetPath || DEFAULT_TARGET_DB);

  // Determinar origen (prioridad: pristine local en sandbox, luego fallback original)
  let sourcePath = options.sourcePath;
  if (!sourcePath) {
    if (fs.existsSync(DEFAULT_PRISTINE_DB)) {
      sourcePath = DEFAULT_PRISTINE_DB;
    } else if (fs.existsSync(FALLBACK_SOURCE_DB)) {
      sourcePath = FALLBACK_SOURCE_DB;
    } else {
      throw new Error(
        `[ResetHelper] No se encontró fuente limpia para restaurar el sandbox. Buscado en:\n- ${DEFAULT_PRISTINE_DB}\n- ${FALLBACK_SOURCE_DB}`
      );
    }
  }

  if (verbose) {
    console.log(`[ResetHelper] Restaurando sandbox Factusol...`);
    console.log(`  Origen:  ${sourcePath}`);
    console.log(`  Destino: ${targetPath}`);
  }

  // Si no existe la plantilla pristine local, la creamos para acelerar reseteos futuros
  if (!fs.existsSync(DEFAULT_PRISTINE_DB) && fs.existsSync(FALLBACK_SOURCE_DB)) {
    if (verbose) console.log(`[ResetHelper] Creando backup pristine local en: ${DEFAULT_PRISTINE_DB}`);
    fs.copyFileSync(FALLBACK_SOURCE_DB, DEFAULT_PRISTINE_DB);
  }

  // Limpiar archivo de bloqueo si existe
  cleanupLockFile(targetPath, verbose);

  // Copia atómica con reintentos para soportar cierres graduales de conexiones OLEDB
  const maxRetries = 5;
  const retryDelayMs = 500;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      fs.copyFileSync(sourcePath, targetPath);
      break;
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw new Error(
          `[ResetHelper] Fallo al sobrescribir ${targetPath} tras ${maxRetries} intentos: ${err.message}`
        );
      }
      if (verbose) {
        console.warn(
          `[ResetHelper] Intento ${attempt}/${maxRetries} falló (${err.message}). Reintentando en ${retryDelayMs}ms...`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  const stat = fs.statSync(targetPath);
  if (verbose) {
    console.log(`[ResetHelper] ✓ Base de datos restaurada con éxito (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
  }
}

/**
 * Verifica la conectividad y consistencia de tablas clave en el sandbox Factusol.
 */
export async function verifySandboxDatabase(
  targetDbPath = DEFAULT_TARGET_DB,
  sampleSkusList: string[] = ['000001', '001341', '001455']
): Promise<SandboxVerificationResult> {
  const driver = new AccessDriver({ databasePath: targetDbPath });

  try {
    const artCountRes = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_ART');
    const totalArticles = Number(artCountRes[0]?.total || 0);

    const custCountRes = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_CLI');
    const totalCustomers = Number(custCountRes[0]?.total || 0);

    const ordCountRes = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_PCL');
    const totalOrders = Number(ordCountRes[0]?.total || 0);

    const lpcCountRes = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_LPC');
    const totalOrderLines = Number(lpcCountRes[0]?.total || 0);

    const maxOrdRes = await driver.query<{ maxid: number | null }>('SELECT MAX(CODPCL) AS maxid FROM F_PCL');
    const maxOrderCode = maxOrdRes[0]?.maxid !== null && maxOrdRes[0]?.maxid !== undefined 
      ? Number(maxOrdRes[0].maxid) 
      : null;

    // Verificar SKUs de muestra
    const skusIn = sampleSkusList.map((s) => `'${s}'`).join(',');
    const arts = await driver.query<{ CODART: string; DESART: string }>(
      `SELECT CODART, DESART FROM F_ART WHERE CODART IN (${skusIn}) ORDER BY CODART`
    );
    const stocks = await driver.query<{ ARTSTO: string; ALMSTO: string; ACTSTO: number; DISSTO: number }>(
      `SELECT ARTSTO, ALMSTO, ACTSTO, DISSTO FROM F_STO WHERE ARTSTO IN (${skusIn}) AND ALMSTO = 'GEN'`
    );

    const sampleSkus = sampleSkusList.map((sku) => {
      const art = arts.find((a) => a.CODART === sku);
      const sto = stocks.find((s) => s.ARTSTO === sku);
      return {
        sku,
        description: art?.DESART || 'N/A',
        warehouse: sto?.ALMSTO || 'GEN',
        actualStock: Number(sto?.ACTSTO || 0),
        availableStock: Number(sto?.DISSTO || 0),
      };
    });

    return {
      ready: totalArticles > 0 && totalCustomers > 0,
      databasePath: targetDbPath,
      totalArticles,
      totalCustomers,
      totalOrders,
      totalOrderLines,
      maxOrderCode,
      sampleSkus,
    };
  } catch (error: any) {
    return {
      ready: false,
      databasePath: targetDbPath,
      totalArticles: 0,
      totalCustomers: 0,
      totalOrders: 0,
      totalOrderLines: 0,
      maxOrderCode: null,
      sampleSkus: [],
      error: error?.message || String(error),
    };
  }
}

/**
 * Helper para ajustar el stock de un SKU en un almacén específico durante pruebas E2E.
 */
export async function setArticleStockInSandbox(
  sku: string,
  warehouse: string,
  stock: { actual: number; available: number },
  targetDbPath = DEFAULT_TARGET_DB
): Promise<void> {
  const driver = new AccessDriver({ databasePath: targetDbPath });
  const check = await driver.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM F_STO WHERE ARTSTO = '${sku}' AND ALMSTO = '${warehouse}'`
  );

  if (Number(check[0]?.count || 0) > 0) {
    await driver.execute(
      `UPDATE F_STO SET ACTSTO = ${stock.actual}, DISSTO = ${stock.available} WHERE ARTSTO = '${sku}' AND ALMSTO = '${warehouse}'`
    );
  } else {
    await driver.execute(
      `INSERT INTO F_STO (ARTSTO, ALMSTO, ACTSTO, DISSTO, MINSTO) VALUES ('${sku}', '${warehouse}', ${stock.actual}, ${stock.available}, 0)`
    );
  }
}

async function main() {
  try {
    console.log('========================================================');
    console.log('     RESETEO Y VERIFICACIÓN DE SANDBOX FACTUSOL ACCDB   ');
    console.log('========================================================');
    await resetSandboxDatabase({ verbose: true });
    
    console.log('\nVerificando estado post-reseteo...');
    const result = await verifySandboxDatabase();

    if (!result.ready) {
      console.error('❌ Error: El sandbox no quedó listo:', result.error);
      process.exit(1);
    }

    console.log('✓ Sandbox Factusol ACCDB verificado y listo.');
    console.log(`• Ruta:               ${result.databasePath}`);
    console.log(`• Total Artículos:    ${result.totalArticles}`);
    console.log(`• Total Clientes:     ${result.totalCustomers}`);
    console.log(`• Total Pedidos:      ${result.totalOrders}`);
    console.log(`• Total Líneas Ped.:  ${result.totalOrderLines}`);
    console.log(`• Máximo CODPCL:      ${result.maxOrderCode}`);
    console.log('• SKUs de Muestra en Almacén GEN:');
    for (const item of result.sampleSkus) {
      console.log(`    - [${item.sku}] "${item.description}": Actual=${item.actualStock}, Disponible=${item.availableStock}`);
    }
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Excepción fatal al resetear sandbox:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
