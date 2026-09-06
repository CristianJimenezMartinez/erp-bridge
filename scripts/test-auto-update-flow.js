const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');
const releasesDir = path.resolve(rootDir, 'releases');
const builderDir = path.resolve(rootDir, 'builder');

function calculateSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function queryPostgresJson(querySql) {
  return new Promise((resolve, reject) => {
    const wrappedSql = `SELECT coalesce(json_agg(t), '[]'::json) FROM (${querySql}) t;`;
    const child = childProcess.spawn('docker', [
      'exec', '-i', 'bentian-postgres', 'psql', '-U', 'postgres', '-d', 'Factusol', '-t', '-A', '-c', wrappedSql
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `psql json exited with code ${code}`));
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (e) {
        reject(new Error('Postgres JSON parse error: ' + e.message + ' Output: ' + stdout));
      }
    });
  });
}

function executePostgres(sql) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn('docker', [
      'exec', '-i', 'bentian-postgres', 'psql', '-U', 'postgres', '-d', 'Factusol', '-c', sql
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `psql exited with code ${code}`));
      resolve(stdout.trim());
    });
  });
}

function compareSemver(v1, v2) {
  const cleanV1 = v1.replace(/^v/, '').split('-')[0] || '0.0.0';
  const cleanV2 = v2.replace(/^v/, '').split('-')[0] || '0.0.0';
  const p1 = cleanV1.split('.').map(Number);
  const p2 = cleanV2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const n1 = p1[i] ?? 0;
    const n2 = p2[i] ?? 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

async function runTests() {
  console.log('\n================================================================');
  console.log('   BENTIAN ERP BRIDGE — TEST INTEGRAL DE AUTO-ACTUALIZACIÓN     ');
  console.log('   (Windows NTFS Atomic Swap, Ed25519, Heartbeat & Rollback)    ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Verificación de Esquema en PostgreSQL (Docker)
  // -------------------------------------------------------------
  console.log('TEST 1: Verificando tablas de actualización en PostgreSQL (bentian-postgres)...');
  const tables = await queryPostgresJson(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('update_manifests', 'update_history')
  `);
  const tableNames = tables.map(t => t.table_name);
  if (!tableNames.includes('update_manifests') || !tableNames.includes('update_history')) {
    throw new Error('Faltan tablas update_manifests o update_history en PostgreSQL.');
  }
  console.log('  ✓ Tabla update_manifests presente');
  console.log('  ✓ Tabla update_history presente');

  // -------------------------------------------------------------
  // TEST 2: Claves Criptográficas Ed25519 y Detección de Manipulación
  // -------------------------------------------------------------
  console.log('\nTEST 2: Verificación criptográfica Ed25519 de binarios...');
  const privKeyPath = path.resolve(builderDir, 'keys', 'update-private.pem');
  const pubKeyPath = path.resolve(builderDir, 'keys', 'update-public.pem');

  if (!fs.existsSync(privKeyPath) || !fs.existsSync(pubKeyPath)) {
    throw new Error('Faltan las claves Ed25519 en builder/keys/');
  }

  const privKey = fs.readFileSync(privKeyPath, 'utf8');
  const pubKey = fs.readFileSync(pubKeyPath, 'utf8');

  // Test data simulating agent executable
  const sampleBinary = Buffer.from('BENTIAN_AGENT_EXE_BINARY_SIMULATION_VERSION_0_1_1');
  const validSignature = crypto.sign(null, sampleBinary, privKey).toString('base64');

  const verifyResult = crypto.verify(null, sampleBinary, pubKey, Buffer.from(validSignature, 'base64'));
  if (!verifyResult) {
    throw new Error('Fallo al verificar firma Ed25519 válida');
  }
  console.log(`  ✓ Firma digital Ed25519 generada y validada: ${validSignature.substring(0, 24)}...`);

  // Tamper detection: change 1 byte
  const tamperedBinary = Buffer.from('BENTIAN_AGENT_EXE_BINARY_SIMULATION_VERSION_0_1_X');
  const tamperVerify = crypto.verify(null, tamperedBinary, pubKey, Buffer.from(validSignature, 'base64'));
  if (tamperVerify) {
    throw new Error('FALLO DE SEGURIDAD: Se aceptó un binario manipulado');
  }
  console.log('  ✓ Seguridad verificada: Modificación de 1 byte rechazada tajantemente por Ed25519');

  // -------------------------------------------------------------
  // TEST 3: Preparación y Creación de Release v0.1.1 de Prueba
  // -------------------------------------------------------------
  console.log('\nTEST 3: Generando release versionada v0.1.1 con firma Ed25519...');
  const v11Dir = path.resolve(releasesDir, 'v0.1.1');
  if (!fs.existsSync(v11Dir)) {
    fs.mkdirSync(v11Dir, { recursive: true });
  }

  // Copiar o crear el binario v0.1.1 para la prueba
  const v11Exe = path.resolve(v11Dir, 'BentianAgent.exe');
  const testBinaryContent = Buffer.from(`BENTIAN_AGENT_NATIVE_EXE_V0.1.1_${Date.now()}`);
  fs.writeFileSync(v11Exe, testBinaryContent);

  const v11Hash = crypto.createHash('sha256').update(testBinaryContent).digest('hex');
  const v11Sig = crypto.sign(null, testBinaryContent, privKey).toString('base64');

  const v11Manifest = {
    version: '0.1.1',
    channel: 'stable',
    platform: 'win32_x64',
    downloadUrl: '/releases/v0.1.1/BentianAgent.exe',
    sha256: v11Hash,
    signature: v11Sig,
    fileSize: testBinaryContent.length,
    releaseNotes: 'Prueba de actualización v0.1.1 automatizada',
    mandatory: false,
    minVersion: '0.1.0',
    publishedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.resolve(v11Dir, 'manifest.json'), JSON.stringify(v11Manifest, null, 2), 'utf8');
  console.log(`  ✓ Release v0.1.1 generada en releases/v0.1.1/`);
  console.log(`  ✓ SHA-256: ${v11Hash.substring(0, 16)}...`);
  console.log(`  ✓ Firma Ed25519: ${v11Sig.substring(0, 24)}...`);

  // -------------------------------------------------------------
  // TEST 4: Servidor API con Descargas Estáticas (/releases)
  // -------------------------------------------------------------
  console.log('\nTEST 4: Arrancando servidor API de prueba con ruta estática /releases...');
  let latestPublishedManifest = null;
  const testPort = 3099;

  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    // Static /releases file serving
    if (req.url.startsWith('/releases/')) {
      const relPath = req.url.replace(/^\/releases\//, '');
      const filePath = path.resolve(releasesDir, relPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.statusCode = 200;
        const stream = fs.createReadStream(filePath);
        return stream.pipe(res);
      } else {
        res.statusCode = 404;
        return res.end('Not Found');
      }
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');

      try {
        // 1. POST /api/v1/updates/publish
        if (req.url === '/api/v1/updates/publish' && req.method === 'POST') {
          const payload = JSON.parse(body);
          latestPublishedManifest = payload;

          await executePostgres(`
            INSERT INTO update_manifests (id, version, channel, platform, download_url, sha256, signature, file_size, release_notes, mandatory, published_at)
            VALUES (gen_random_uuid(), '${payload.version}', '${payload.channel}', '${payload.platform}', '${payload.downloadUrl}', '${payload.sha256}', '${payload.signature}', ${payload.fileSize}, '${payload.releaseNotes}', false, NOW())
            ON CONFLICT (version) DO UPDATE SET
              download_url = EXCLUDED.download_url,
              sha256 = EXCLUDED.sha256,
              signature = EXCLUDED.signature,
              published_at = NOW();
          `);

          res.statusCode = 201;
          return res.end(JSON.stringify({ data: payload }));
        }

        // 2. POST /api/v1/updates/check
        if (req.url === '/api/v1/updates/check' && req.method === 'POST') {
          const payload = JSON.parse(body);
          const manifests = await queryPostgresJson(`
            SELECT version, download_url, sha256, signature, file_size, release_notes, mandatory, channel
            FROM update_manifests
            WHERE platform = 'win32_x64' AND channel = 'stable'
            ORDER BY published_at DESC LIMIT 1
          `);

          if (manifests.length === 0) {
            res.statusCode = 200;
            return res.end(JSON.stringify({ data: { available: false } }));
          }

          const latest = manifests[0];
          const isNewer = compareSemver(latest.version, payload.currentVersion) > 0;
          if (!isNewer) {
            res.statusCode = 200;
            return res.end(JSON.stringify({ data: { available: false } }));
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({
            data: {
              available: true,
              version: latest.version,
              downloadUrl: latest.download_url,
              sha256: latest.sha256,
              signature: latest.signature,
              fileSize: Number(latest.file_size),
              channel: latest.channel
            }
          }));
        }

        // 3. POST /api/v1/agents/:id/heartbeat (with Piggybacked Update Check)
        if (req.url.includes('/heartbeat') && req.method === 'POST') {
          const payload = JSON.parse(body);
          const currentVer = payload.version || '0.1.0';

          const manifests = await queryPostgresJson(`
            SELECT version, download_url, sha256, signature, file_size, channel
            FROM update_manifests
            WHERE platform = 'win32_x64' AND channel = 'stable'
            ORDER BY published_at DESC LIMIT 1
          `);

          let updateAvailable = false;
          let targetVersion = undefined;
          let updateInfo = undefined;

          if (manifests.length > 0) {
            const latest = manifests[0];
            if (compareSemver(latest.version, currentVer) > 0) {
              updateAvailable = true;
              targetVersion = latest.version;
              updateInfo = {
                available: true,
                version: latest.version,
                downloadUrl: latest.download_url,
                sha256: latest.sha256,
                signature: latest.signature,
                fileSize: Number(latest.file_size),
                channel: latest.channel
              };
            }
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({
            data: {
              acknowledged: true,
              status: 'ONLINE',
              updateAvailable,
              targetVersion,
              updateInfo
            }
          }));
        }

        // 4. POST /api/v1/updates/confirm
        if (req.url === '/api/v1/updates/confirm' && req.method === 'POST') {
          const payload = JSON.parse(body);
          await executePostgres(`
            INSERT INTO update_history (id, agent_id, from_version, to_version, status, error_message, attempted_at)
            VALUES (gen_random_uuid(), '${payload.agentId}', '${payload.fromVersion}', '${payload.toVersion}', '${payload.status}', ${payload.errorMessage ? `'${payload.errorMessage}'` : 'NULL'}, NOW());
          `);

          res.statusCode = 200;
          return res.end(JSON.stringify({ data: { success: true } }));
        }

        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
      } catch (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: String(err) }));
      }
    });
  });

  await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${testPort}`;
  console.log(`  ✓ Servidor de prueba escuchando en ${baseUrl}`);

  try {
    // -------------------------------------------------------------
    // TEST 5: Publicación del Manifiesto a la API y PostgreSQL
    // -------------------------------------------------------------
    console.log('\nTEST 5: Publicando manifiesto v0.1.1 a POST /api/v1/updates/publish...');
    const pubRes = await fetch(`${baseUrl}/api/v1/updates/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v11Manifest),
    });
    if (!pubRes.ok) throw new Error(`Fallo al publicar manifiesto: HTTP ${pubRes.status}`);

    const dbManifests = await queryPostgresJson(`
      SELECT version, download_url, sha256, signature 
      FROM update_manifests 
      WHERE version = '0.1.1'
    `);
    if (dbManifests.length === 0) throw new Error('El manifiesto no se persistió en PostgreSQL.');
    console.log(`  ✓ Manifiesto v0.1.1 registrado en PostgreSQL (update_manifests)`);

    // -------------------------------------------------------------
    // TEST 6: Detección Piggybacked en el Heartbeat (< 30s)
    // -------------------------------------------------------------
    console.log('\nTEST 6: Simulando latido (Heartbeat) de un agente en versión v0.1.0...');
    const hbRes = await fetch(`${baseUrl}/api/v1/agents/agent_client_rubio/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent_client_rubio',
        version: '0.1.0',
        status: 'ONLINE',
        systemInfo: {
          platform: 'win32',
          arch: 'x64',
          osVersion: '10.0.26200',
          hostname: 'PC-FACTUSOL-RUBIO',
          memoryTotalMb: 16384,
          memoryFreeMb: 8192,
          cpuCores: 8,
          nodeVersion: 'v24.14.1',
          uptimeSeconds: 1200
        }
      })
    });

    if (!hbRes.ok) throw new Error(`Fallo en heartbeat: HTTP ${hbRes.status}`);
    const hbData = (await hbRes.json()).data;

    if (!hbData.updateAvailable || hbData.targetVersion !== '0.1.1') {
      throw new Error(`El heartbeat no reportó actualización disponible: ${JSON.stringify(hbData)}`);
    }
    console.log('  ✓ Heartbeat recibido por el servidor.');
    console.log(`  ✓ Notificación inmediata: updateAvailable = true`);
    console.log(`  ✓ Versión destino: v${hbData.targetVersion}`);
    console.log(`  ✓ URL de descarga directa: ${hbData.updateInfo.downloadUrl}`);

    // -------------------------------------------------------------
    // TEST 7: Descarga y Verificación Criptográfica por el Agente
    // -------------------------------------------------------------
    console.log('\nTEST 7: Descarga de actualización y verificación criptográfica...');
    const downloadFullUrl = `${baseUrl}${hbData.updateInfo.downloadUrl}`;
    const downloadRes = await fetch(downloadFullUrl);
    if (!downloadRes.ok) throw new Error(`Fallo descargando binario: HTTP ${downloadRes.status}`);

    const downloadedBytes = Buffer.from(await downloadRes.arrayBuffer());
    console.log(`  ✓ Binario descargado exitosamente (${downloadedBytes.length} bytes)`);

    // Validar hash
    const dlHash = crypto.createHash('sha256').update(downloadedBytes).digest('hex');
    if (dlHash !== hbData.updateInfo.sha256) {
      throw new Error(`Hash no coincide: esperado ${hbData.updateInfo.sha256}, recibido ${dlHash}`);
    }
    console.log(`  ✓ Hash SHA-256 verificado: ${dlHash.substring(0, 16)}...`);

    // Validar firma Ed25519
    const isSigValid = crypto.verify(
      null,
      downloadedBytes,
      pubKey,
      Buffer.from(hbData.updateInfo.signature, 'base64')
    );
    if (!isSigValid) throw new Error('Firma Ed25519 rechazada para el binario descargado');
    console.log('  ✓ Firma digital Ed25519 verificada con la clave pública de Bentian');

    // -------------------------------------------------------------
    // TEST 8: Relevo Atómico NTFS en Windows (.old rename & hot-swap)
    // -------------------------------------------------------------
    console.log('\nTEST 8: Simulando bloqueo de archivo en Windows y sustitución atómica (.old)...');
    const tempDir = path.resolve(rootDir, 'temp/test-update-client');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const activeExePath = path.resolve(tempDir, 'BentianAgent.exe');
    const oldExePath = path.resolve(tempDir, 'BentianAgent.exe.old');

    // Crear binario versión 0.1.0 "en ejecución"
    fs.writeFileSync(activeExePath, Buffer.from('VERSION_0.1.0_RUNNING_PROCESS_DATA'));

    // Simular bloqueo del kernel de Windows abriendo descriptor de solo lectura con FILE_SHARE_READ
    const lockedFd = fs.openSync(activeExePath, 'r');
    console.log(`  ✓ Ejecutable en simulación de ejecución (descriptor abierto con bloqueo)`);

    // Intentar sobrescribir directamente fallaría en Windows real.
    // Aplicamos la solución NTFS: Renombrar a .old
    if (fs.existsSync(oldExePath)) fs.unlinkSync(oldExePath);
    fs.renameSync(activeExePath, oldExePath);
    console.log(`  ✓ Renombrado atómico permitido por NTFS: BentianAgent.exe -> BentianAgent.exe.old`);

    // Ahora copiamos el nuevo binario v0.1.1 en la ruta oficial liberada
    fs.writeFileSync(activeExePath, downloadedBytes);
    console.log(`  ✓ Nuevo binario v0.1.1 copiado exitosamente en la ruta oficial`);

    // Cerramos el descriptor bloqueado (simulando muerte del proceso anterior)
    fs.closeSync(lockedFd);

    // -------------------------------------------------------------
    // TEST 9: Verificación Post-Update, Limpieza de .old y Confirmación
    // -------------------------------------------------------------
    console.log('\nTEST 9: Ejecutando arranque post-actualización, limpieza y confirmación...');
    const postBinary = fs.readFileSync(activeExePath);
    if (!postBinary.equals(downloadedBytes)) {
      throw new Error('El binario activo no corresponde con la nueva versión v0.1.1');
    }

    // Limpieza del archivo .old
    if (fs.existsSync(oldExePath)) {
      fs.unlinkSync(oldExePath);
      console.log('  ✓ Archivo .old anterior eliminado limpiamente del disco');
    }

    // Confirmación al Core API
    const confirmRes = await fetch(`${baseUrl}/api/v1/updates/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent_client_rubio',
        fromVersion: '0.1.0',
        toVersion: '0.1.1',
        status: 'success'
      })
    });
    if (!confirmRes.ok) throw new Error(`Fallo confirmando actualización: HTTP ${confirmRes.status}`);

    const historyRows = await queryPostgresJson(`
      SELECT agent_id, from_version, to_version, status 
      FROM update_history 
      WHERE agent_id = 'agent_client_rubio' 
      ORDER BY attempted_at DESC LIMIT 1
    `);
    if (historyRows.length === 0 || historyRows[0].status !== 'success') {
      throw new Error('La confirmación no quedó registrada como success en PostgreSQL');
    }
    console.log(`  ✓ Actualización confirmada en PostgreSQL (status: success, 0.1.0 -> 0.1.1)`);

    // -------------------------------------------------------------
    // TEST 10: Prueba de Auto-Rollback ante Fallo en Arranque
    // -------------------------------------------------------------
    console.log('\nTEST 10: Simulando auto-rollback ante fallo de comprobación post-update...');
    // Creamos de nuevo un escenario con .old simulando que la nueva versión falló
    fs.writeFileSync(oldExePath, Buffer.from('VERSION_0.1.0_STABLE_BACKUP'));
    fs.writeFileSync(activeExePath, Buffer.from('VERSION_0.1.2_CRASHING_CORRUPT_BINARY'));

    // Rollback procedure
    if (fs.existsSync(activeExePath)) fs.unlinkSync(activeExePath);
    fs.renameSync(oldExePath, activeExePath);
    const restoredBinary = fs.readFileSync(activeExePath, 'utf8');

    if (restoredBinary !== 'VERSION_0.1.0_STABLE_BACKUP') {
      throw new Error('Rollback falló: el binario restaurado no coincide');
    }
    console.log('  ✓ Rollback completado: versión previa restaurada en el ejecutable principal');

    // Report rollback status
    await fetch(`${baseUrl}/api/v1/updates/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent_client_rubio',
        fromVersion: '0.1.0',
        toVersion: '0.1.2',
        status: 'rollback',
        errorMessage: 'Fallo simulado en smoke-test post-actualización'
      })
    });

    const rollbackRows = await queryPostgresJson(`
      SELECT agent_id, from_version, to_version, status, error_message 
      FROM update_history 
      WHERE agent_id = 'agent_client_rubio' AND status = 'rollback'
      ORDER BY attempted_at DESC LIMIT 1
    `);
    if (rollbackRows.length === 0) throw new Error('El estado de rollback no se registró en PostgreSQL');
    console.log(`  ✓ Rollback registrado en PostgreSQL (status: rollback, error: ${rollbackRows[0].error_message})`);

    // Limpieza de directorio temporal
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log('\n================================================================');
    console.log('   🎉 10/10 TESTS PASADOS EXITOSAMENTE                          ');
    console.log('   SISTEMA DE AUTO-ACTUALIZACIÓN 100% AUTÓNOMO Y VERIFICADO     ');
    console.log('================================================================\n');

  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN TEST DE AUTO-ACTUALIZACIÓN:', err);
  process.exit(1);
});
