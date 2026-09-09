/**
 * (c) 2026 Cristian Jiménez Martínez / Bentian. Todos los derechos reservados.
 * INFORMACIÓN CONFIDENCIAL Y PROPIETARIA.
 * Protegido como Secreto Empresarial bajo la Ley 1/2019 de Secretos Empresariales (España)
 * y la Directiva (UE) 2016/943. Queda prohibida la reproducción, descompilación,
 * ingeniería inversa o distribución no autorizada.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const https = require('https');

async function createLegalSnapshot() {
  const rootDir = path.resolve(__dirname, '..');
  const legalDir = path.resolve(rootDir, 'releases/legal');
  if (!fs.existsSync(legalDir)) {
    fs.mkdirSync(legalDir, { recursive: true });
  }

  const archiveName = 'bentian-core-v1-snapshot.zip';
  const archivePath = path.join(legalDir, archiveName);

  console.log('\n================================================================');
  console.log('   FASE 0: SELLADO CRIPTOGRÁFICO INMUTABLE EN BLOCKCHAIN        ');
  console.log('   (OpenTimestamps / Bitcoin Blockchain Proof — Coste: 0,00 €)  ');
  console.log('================================================================\n');

  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
  }

  console.log('>>> [1/3] Empaquetando código fuente y documentación del Blueprint...');
  // Empaquetar paquetes clave, apps y documentación en un único archivo
  const pathsToInclude = [
    path.resolve(rootDir, 'packages'),
    path.resolve(rootDir, 'apps'),
    path.resolve(rootDir, 'builder'),
    path.resolve(rootDir, '../ERP Bridge Blueprint'),
    path.resolve(rootDir, 'package.json')
  ].filter(p => fs.existsSync(p));

  const pathsArg = pathsToInclude.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
  const psCmd = `Compress-Archive -Path ${pathsArg} -DestinationPath '${archivePath.replace(/'/g, "''")}' -Force`;
  childProcess.spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { stdio: 'ignore' });

  if (!fs.existsSync(archivePath)) {
    throw new Error(`Fallo al empaquetar el snapshot legal en ${archivePath}`);
  }

  const stats = fs.statSync(archivePath);
  console.log(`    ✓ Snapshot generado: ${archiveName} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

  console.log('>>> [2/3] Calculando Hash Criptográfico SHA-256...');
  const fileBuffer = fs.readFileSync(archivePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const sha256Hex = hashSum.digest('hex');
  const sha256Binary = Buffer.from(sha256Hex, 'hex');

  console.log(`    ✓ SHA-256: ${sha256Hex}`);
  fs.writeFileSync(path.join(legalDir, 'SNAPSHOT_SHA256.txt'), `${sha256Hex} *${archiveName}\n`, 'utf8');

  console.log('>>> [3/3] Enviando a los Servidores de Calendario de OpenTimestamps (Bitcoin)...');
  const calendarUrls = [
    'https://a.pool.opentimestamps.org/digest',
    'https://b.pool.opentimestamps.org/digest',
    'https://alice.btc.calendar.opentimestamps.org/digest'
  ];

  let stamped = false;
  for (const calUrl of calendarUrls) {
    try {
      console.log(`    Conectando con ${calUrl}...`);
      const otsProof = await submitToOpenTimestamps(calUrl, sha256Binary);
      if (otsProof && otsProof.length > 0) {
        const otsPath = path.join(legalDir, `${archiveName}.ots`);
        fs.writeFileSync(otsPath, otsProof);
        console.log(`    ✓ ¡Prueba matemática generada con éxito en ${archiveName}.ots!`);
        stamped = true;
        break;
      }
    } catch (err) {
      console.log(`    ⚠️ Aviso en ${calUrl}: ${err.message}. Probando siguiente servidor...`);
    }
  }

  console.log('\n================================================================');
  if (stamped) {
    console.log('   🎉 SELLADO TEMPORAL EN BLOCKCHAIN COMPLETADO EXITOSAMENTE');
  } else {
    console.log('   ℹ️ SNAPSHOT Y HASH GENERADOS. Puedes sellarlo manualmente.');
  }
  console.log('================================================================');
  console.log(`Archivo Snapshot: ${archivePath}`);
  console.log(`SHA-256 Hash:     ${sha256Hex}`);
  console.log(`Prueba OTS:       ${path.join(legalDir, archiveName + '.ots')}`);
  console.log('Esta prueba demuestra legalmente que el código y diseño existían en esta fecha.');
  console.log('================================================================\n');
}

function submitToOpenTimestamps(endpoint, binaryHash) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': binaryHash.length
      },
      timeout: 8000
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(binaryHash);
    req.end();
  });
}

if (require.main === module) {
  createLegalSnapshot().catch(err => {
    console.error('\n❌ ERROR EN SELLADO OPENTIMESTAMPS:', err.message || err);
    process.exit(1);
  });
}

module.exports = { createLegalSnapshot };
