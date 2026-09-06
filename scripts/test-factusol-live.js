const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

console.log('====================================================');
console.log('   BENTIAN ERP BRIDGE - TEST LIVE FACTUSOL (ACCDB)  ');
console.log('====================================================');

const dbPath = path.resolve(__dirname, '../../API/bentian/2252025.accdb');
console.log(`[1] Verificando base de datos: ${dbPath}`);
if (!fs.existsSync(dbPath)) {
  console.error('ERROR: No se encuentra la base de datos en:', dbPath);
  process.exit(1);
}
const stats = fs.statSync(dbPath);
console.log(`    OK: Archivo encontrado (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

const cscript = fs.existsSync('C:\\Windows\\SysWOW64\\cscript.exe') 
  ? 'C:\\Windows\\SysWOW64\\cscript.exe' 
  : 'C:\\Windows\\System32\\cscript.exe';
const adodbJs = path.resolve(__dirname, '../packages/connectors/factusol/src/adodb.js');
console.log(`[2] Motor WScript: ${cscript}`);
console.log(`    Script ADODB: ${adodbJs}`);

function runAdodb(action, sql, provider = 'Microsoft.ACE.OLEDB.12.0') {
  return new Promise((resolve, reject) => {
    const connStr = `Provider=${provider};Data Source=${dbPath};Persist Security Info=False;`;
    const input = JSON.stringify({ connection: connStr, sql });

    const child = childProcess.spawn(cscript, ['//Nologo', adodbJs, action], { windowsHide: true });
    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', (c) => stdoutChunks.push(c));
    child.stderr.on('data', (c) => stderrChunks.push(c));
    child.on('error', (err) => reject(err));

    child.on('close', (code) => {
      if (stderrChunks.length > 0) {
        const errText = Buffer.concat(stderrChunks).toString('utf8');
        try {
          const parsedErr = JSON.parse(errText);
          return reject(new Error(parsedErr.message || errText));
        } catch {
          return reject(new Error(errText));
        }
      }
      const buf = Buffer.concat(stdoutChunks);
      let text = buf.toString('utf8');
      try {
        const parsed = JSON.parse(text);
        return resolve(parsed);
      } catch {
        text = buf.toString('latin1');
        try {
          const parsed = JSON.parse(text);
          return resolve(parsed);
        } catch (e2) {
          return reject(new Error('JSON parse error: ' + e2.message + ' Raw: ' + text.substring(0, 100)));
        }
      }
    });

    child.stdin.end(input, 'utf8');
  });
}

async function runLiveTests() {
  console.log('\n[3] Comprobando proveedor OLEDB...');
  let provider = 'Microsoft.ACE.OLEDB.12.0';
  let testRows;
  try {
    testRows = await runAdodb('query', 'SELECT COUNT(*) AS total FROM F_ART', provider);
    console.log(`    OK: Conectado con ${provider}. Total articulos en Factusol: ${testRows[0].total}`);
  } catch (e1) {
    console.warn(`    Aviso con ${provider}: ${e1.message}. Probando con Microsoft.ACE.OLEDB.16.0...`);
    provider = 'Microsoft.ACE.OLEDB.16.0';
    testRows = await runAdodb('query', 'SELECT COUNT(*) AS total FROM F_ART', provider);
    console.log(`    OK: Conectado con ${provider}. Total articulos: ${testRows[0].total}`);
  }

  console.log('\n[4] Leyendo primeros 5 productos reales de F_ART...');
  const products = await runAdodb('query', 'SELECT TOP 5 CODART, DESART, DEWART, EANART, FAMART, PCOART FROM F_ART', provider);
  products.forEach((p, idx) => {
    console.log(`    [#${idx + 1}] Codigo: ${p.CODART} | Descripcion: "${p.DESART}" | Familia: ${p.FAMART} | Coste: ${p.PCOART} EUR`);
  });

  console.log('\n[5] Consultando precios en F_LTA (Tarifa 1)...');
  const prices = await runAdodb('query', 'SELECT TOP 5 TARLTA, ARTLTA, PRELTA FROM F_LTA WHERE TARLTA = 1', provider);
  prices.forEach(pr => {
    console.log(`    Articulo ${pr.ARTLTA} -> Tarifa ${pr.TARLTA}: ${pr.PRELTA} EUR`);
  });

  console.log('\n[6] Consultando stock de los primeros articulos en F_STO...');
  const firstCod = products[0] && products[0].CODART ? products[0].CODART : '000001';
  const stockRows = await runAdodb('query', `SELECT TOP 5 ARTSTO, ALMSTO, ACTSTO, DISSTO FROM F_STO WHERE ARTSTO = '${firstCod}'`, provider);
  if (stockRows.length > 0) {
    console.log(`    Stock para ${firstCod}: Actual=${stockRows[0].ACTSTO}, Disponible=${stockRows[0].DISSTO}, Almacen=${stockRows[0].ALMSTO}`);
  } else {
    const generalStock = await runAdodb('query', 'SELECT TOP 3 ARTSTO, ALMSTO, ACTSTO FROM F_STO', provider);
    generalStock.forEach(s => console.log(`    Art: ${s.ARTSTO} | Stock: ${s.ACTSTO} | Almacen: ${s.ALMSTO}`));
  }

  console.log('\n[6] Verificando consulta de clientes por EMACLI (Fix aplicado)...');
  const clientCheck = await runAdodb('query', 'SELECT TOP 3 CODCLI, NOFCLI, EMACLI FROM F_CLI', provider);
  console.log('    OK: Consulta a F_CLI con EMACLI ejecutada con exito!');
  clientCheck.forEach(c => console.log(`    Cliente ${c.CODCLI}: "${c.NOFCLI}" | Email: ${c.EMACLI || '(sin email)'}`));

  console.log('\n[7] Consultando ultimos pedidos en F_PCL...');
  const orders = await runAdodb('query', 'SELECT TOP 3 CODPCL, TIPPCL, REFPCL, FECPCL, TOTPCL, CNOPCL FROM F_PCL', provider);
  if (orders.length > 0) {
    orders.forEach(o => {
      console.log(`    Pedido ${o.TIPPCL}-${o.CODPCL} | Ref: "${o.REFPCL}" | Fecha: ${o.FECPCL} | Total: ${o.TOTPCL} EUR | Cliente: "${o.CNOPCL}"`);
    });
  }

  console.log('\n[8] Test de insercion y verificacion de pedido en F_PCL / F_LPC...');
  const series = 'W';
  const maxRow = await runAdodb('query', `SELECT MAX(CODPCL) AS maxid FROM F_PCL WHERE TIPPCL = '${series}'`, provider);
  const nextOrderCode = (maxRow[0]?.maxid ? Number(maxRow[0].maxid) : 0) + 1;
  const testRef = `TEST_${Date.now()}`;
  console.log(`    Creando pedido de prueba: ${series}-${nextOrderCode} (Ref: ${testRef})...`);

  const insertHeaderSql = `
    INSERT INTO F_PCL (
      TIPPCL, CODPCL, REFPCL, FECPCL, AGEPCL, CLIPCL,
      CNOPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, CNIPCL,
      TELPCL, TIVPCL, REQPCL, ESTPCL, ALMPCL,
      NET1PCL, PIVA1PCL, PIVA2PCL, PIVA3PCL, IIVA1PCL, IPOR1PCL, TOTPCL
    ) VALUES (
      '${series}', ${nextOrderCode}, '${testRef}', #2026-09-04 20:30:00#, 0, 4121,
      'CLIENTE PRUEBA BENTIAN', 'CALLE TEST 1', 'MADRID', '28001', 'MADRID', '12345678Z',
      '600000000', 0, 0, 0, 'GEN',
      25.00, 21.00, 10.00, 4.00, 5.25, 0.00, 30.25
    )
  `.trim();
  await runAdodb('execute', insertHeaderSql, provider);

  const insertLineSql = `
    INSERT INTO F_LPC (
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, IVALPC, PRELPC, TOTLPC
    ) VALUES (
      '${series}', ${nextOrderCode}, 1, '000047', 'M. TUBO PVC ENC 16/160 MM.', 1.00, 0.00, 0, 25.0000, 25.00
    )
  `.trim();
  await runAdodb('execute', insertLineSql, provider);

  const verifyOrder = await runAdodb('query', `SELECT TIPPCL, CODPCL, REFPCL, TOTPCL, CNOPCL FROM F_PCL WHERE TIPPCL = '${series}' AND CODPCL = ${nextOrderCode}`, provider);
  const verifyLines = await runAdodb('query', `SELECT TIPLPC, CODLPC, ARTLPC, CANLPC, TOTLPC FROM F_LPC WHERE TIPLPC = '${series}' AND CODLPC = ${nextOrderCode}`, provider);
  console.log(`    OK: Pedido insertado y verificado en F_PCL -> #${verifyOrder[0].TIPPCL}-${verifyOrder[0].CODPCL} | Total: ${verifyOrder[0].TOTPCL} EUR`);
  console.log(`    OK: Linea verificada en F_LPC -> Articulo: ${verifyLines[0].ARTLPC} | Cantidad: ${verifyLines[0].CANLPC}`);

  // Limpieza
  await runAdodb('execute', `DELETE FROM F_LPC WHERE TIPLPC = '${series}' AND CODLPC = ${nextOrderCode}`, provider);
  await runAdodb('execute', `DELETE FROM F_PCL WHERE TIPPCL = '${series}' AND CODPCL = ${nextOrderCode}`, provider);
  console.log('    OK: Pedido de prueba eliminado con exito. Base de datos 100% limpia.');

  console.log('\n====================================================');
  console.log('   RESULTADO: TODOS LOS TESTS DE FACTUSOL SUPERADOS! ');
  console.log('====================================================\n');
}

runLiveTests().catch(err => {
  console.error('\nERROR EN PRUEBAS FACTUSOL:', err.message);
  process.exit(1);
});
