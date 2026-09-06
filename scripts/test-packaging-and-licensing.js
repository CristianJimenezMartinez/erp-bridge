const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const http = require('http');
const { promisify } = require('util');
const execAsync = promisify(childProcess.exec);

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

// Crockford Base32 Checksum implementation
const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function calculateCrockfordChecksum(payload) {
  let crc = 0x1f;
  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    const charIndex = CROCKFORD_CHARS.indexOf(char);
    if (charIndex === -1) continue;
    crc = ((crc << 5) ^ (crc >> 7) ^ charIndex) & 0x3ff;
  }
  const c1 = CROCKFORD_CHARS[(crc >> 5) & 0x1f];
  const c2 = CROCKFORD_CHARS[crc & 0x1f];
  return `${c1}${c2}`;
}

function generateLicenseKey() {
  const bytes = crypto.randomBytes(18);
  let entropy = '';
  for (let i = 0; i < 18; i++) {
    entropy += CROCKFORD_CHARS[bytes[i] % 32];
  }
  const checksum = calculateCrockfordChecksum(entropy);
  const fullBody = entropy + checksum;
  return `EB-${fullBody.substring(0, 5)}-${fullBody.substring(5, 10)}-${fullBody.substring(10, 15)}-${fullBody.substring(15, 20)}`;
}

function createJwtToken(payload, secret = 'erp-bridge-default-jwt-secret-replace-in-prod-v1') {
  const base64Url = (str) => Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header = { alg: 'HS256', typ: 'JWT' };
  const hEnc = base64Url(JSON.stringify(header));
  const pEnc = base64Url(JSON.stringify(payload));
  const dataToSign = `${hEnc}.${pEnc}`;
  const sig = crypto.createHmac('sha256', secret).update(dataToSign).digest();
  return `${dataToSign}.${base64Url(sig)}`;
}

async function runPackagingAndLicensingTests() {
  console.log('\n========================================================================');
  console.log('   PRUEBA INTEGRAL E2E: BUILDER, RELEASES, AUTO-UPDATER & LICENCIAMIENTO');
  console.log('========================================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const releaseDir = path.resolve(rootDir, 'releases/v0.1.0');
  const setupExe = path.resolve(releaseDir, 'Bentian-Setup-v0.1.0.exe');
  const agentExe = path.resolve(releaseDir, 'BentianAgent.exe');
  const adodbJs = path.resolve(releaseDir, 'adodb.js');
  const checksumsTxt = path.resolve(releaseDir, 'checksums.txt');
  const manifestJson = path.resolve(releaseDir, 'manifest.json');
  const latestJson = path.resolve(rootDir, 'releases/latest.json');

  // -------------------------------------------------------------
  // TEST 1: Verificar artefactos de compilación en releases/v0.1.0
  // -------------------------------------------------------------
  console.log('TEST 1: Verificando estructura limpia de releases/v0.1.0...');
  if (!fs.existsSync(setupExe)) throw new Error(`Falta instalador: ${setupExe}`);
  if (!fs.existsSync(agentExe)) throw new Error(`Falta ejecutable: ${agentExe}`);
  if (!fs.existsSync(adodbJs)) throw new Error(`Falta driver: ${adodbJs}`);
  if (!fs.existsSync(checksumsTxt)) throw new Error(`Falta checksums.txt: ${checksumsTxt}`);
  if (!fs.existsSync(manifestJson)) throw new Error(`Falta manifest.json: ${manifestJson}`);
  if (!fs.existsSync(latestJson)) throw new Error(`Falta latest.json: ${latestJson}`);

  const setupStats = fs.statSync(setupExe);
  const agentStats = fs.statSync(agentExe);
  console.log(`  ✓ Instalador Windows: Bentian-Setup-v0.1.0.exe (${(setupStats.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`  ✓ Ejecutable Nativo:  BentianAgent.exe (${(agentStats.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`  ✓ Driver OLEDB:       adodb.js (${fs.statSync(adodbJs).size} bytes)`);

  // -------------------------------------------------------------
  // TEST 2: Verificación criptográfica de Checksums SHA-256
  // -------------------------------------------------------------
  console.log('\nTEST 2: Verificando integridad criptográfica SHA-256...');
  const computedSetupHash = calculateSha256(setupExe);
  const computedAgentHash = calculateSha256(agentExe);
  const checksumsFileContent = fs.readFileSync(checksumsTxt, 'utf8');

  if (!checksumsFileContent.includes(computedAgentHash)) {
    throw new Error('El hash de BentianAgent.exe no coincide con checksums.txt');
  }
  if (!checksumsFileContent.includes(computedSetupHash)) {
    throw new Error('El hash del instalador no coincide con checksums.txt');
  }
  console.log(`  ✓ Hash SHA-256 de BentianAgent.exe verificado: ${computedAgentHash.substring(0, 16)}...`);
  console.log(`  ✓ Hash SHA-256 de Bentian-Setup verificado:     ${computedSetupHash.substring(0, 16)}...`);

  // -------------------------------------------------------------
  // TEST 3: Validación del manifiesto de actualización (Auto-Updater)
  // -------------------------------------------------------------
  console.log('\nTEST 3: Verificando contrato del Auto-Updater (manifest.json y latest.json)...');
  const manifest = JSON.parse(fs.readFileSync(manifestJson, 'utf8'));
  const latest = JSON.parse(fs.readFileSync(latestJson, 'utf8'));

  if (manifest.version !== '0.1.0' || manifest.sha256 !== computedAgentHash) {
    throw new Error('Manifest corrupto o desincronizado con el binario compilado');
  }
  if (latest.latestVersion !== '0.1.0') {
    throw new Error('latest.json no apunta a v0.1.0');
  }
  console.log(`  ✓ Versión de manifiesto: v${manifest.version} [${manifest.channel}] (${manifest.platform})`);
  console.log(`  ✓ Canal de actualización: ${manifest.channel}`);
  console.log(`  ✓ URL de descarga directa: ${manifest.downloadUrl}`);
  console.log(`  ✓ latest.json sincronizado correctamente.`);

  // -------------------------------------------------------------
  // TEST 4: Ejecución nativa del binario empaquetado (Smoke Test)
  // -------------------------------------------------------------
  console.log('\nTEST 4: Ejecución nativa de BentianAgent.exe (sin Node.js externo)...');
  const statusOutput = childProcess.execSync(`"${agentExe}" status`, { encoding: 'utf8' });
  if (!statusOutput.includes('Telemetría del Sistema Local') || !statusOutput.includes('HWID:')) {
    throw new Error('La salida del ejecutable BentianAgent.exe no contiene la telemetría esperada.');
  }
  console.log('  ✓ BentianAgent.exe ejecutó exitosamente.');

  // -------------------------------------------------------------
  // TEST 5: Generación de Licencia por Pago Stripe en PostgreSQL
  // -------------------------------------------------------------
  console.log('\nTEST 5: Flujo de Pago Stripe -> Creación de Licencia en PostgreSQL...');
  const testLicenseKey = generateLicenseKey();
  const orgId = 'org_cliente_rubio';
  const plan = 'professional';
  const maxActivations = 1;

  await executePostgres(`
    INSERT INTO organizations (id, name, slug, created_at, updated_at)
    VALUES ('${orgId}', 'Cliente Rubio', 'cliente-rubio', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO licenses (id, key, organization_id, plan, status, max_activations, current_activations, created_at)
    VALUES (gen_random_uuid(), '${testLicenseKey}', '${orgId}', '${plan}', 'active', ${maxActivations}, 0, NOW());
  `);

  const dbLicenses = await queryPostgresJson(`SELECT id, key, plan, status, max_activations FROM licenses WHERE key = '${testLicenseKey}'`);
  if (dbLicenses.length === 0) throw new Error('No se pudo registrar la licencia en PostgreSQL');
  const licenseRecord = dbLicenses[0];
  console.log(`  ✓ Licencia registrada en PostgreSQL tras pago:`);
  console.log(`    Clave: ${licenseRecord.key} | Plan: ${licenseRecord.plan} | Estado: ${licenseRecord.status}`);

  // -------------------------------------------------------------
  // TEST 6: Servidor de Activación y Validación HTTP en 127.0.0.1:3000
  // -------------------------------------------------------------
  console.log('\nTEST 6: Iniciando Mock API Server en puerto 3000 para activación E2E...');
  fs.writeFileSync('agent-config.json', JSON.stringify({ apiBaseUrl: 'http://127.0.0.1:3000' }, null, 2));

  const server = http.createServer((req, res) => {
    console.log(`    [Mock API] Solicitud recibida: ${req.method} ${req.url}`);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');
      try {
        if (req.url === '/api/v1/licenses/activate' && req.method === 'POST') {
          const payload = JSON.parse(body || '{}');
          const lics = await queryPostgresJson(`SELECT id, key, plan, status, max_activations, current_activations FROM licenses WHERE key = '${payload.licenseKey}'`);
          if (lics.length === 0) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: { message: 'Licencia inexistente' } }));
          }
          const lic = lics[0];
          if (lic.current_activations >= lic.max_activations) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: { message: 'Límite de activaciones alcanzado' } }));
          }

          // Insert activation (agent_id is NULL for standalone agent)
          await executePostgres(`
            INSERT INTO license_activations (id, license_id, hwid, agent_id, activated_at, last_validated_at)
            VALUES (gen_random_uuid(), '${lic.id}', '${payload.hwid}', NULL, NOW(), NOW());
            UPDATE licenses SET current_activations = current_activations + 1 WHERE id = '${lic.id}';
          `);

          const token = createJwtToken({
            licenseId: lic.id,
            organizationId: orgId,
            plan: lic.plan,
            hwid: payload.hwid,
            issuedAt: Date.now(),
            expiresAt: Date.now() + 7 * 86400000, // 7 días de gracia offline
          });

          res.statusCode = 200;
          return res.end(JSON.stringify({
            data: {
              success: true,
              licenseToken: token,
              plan: lic.plan,
              expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
              gracePeriodDays: 7
            }
          }));
        }

        if (req.url === '/api/v1/licenses/validate' && req.method === 'POST') {
          const payload = JSON.parse(body || '{}');
          res.statusCode = 200;
          return res.end(JSON.stringify({
            data: {
              valid: true,
              plan,
              renewedToken: payload.licenseToken
            }
          }));
        }

        if (req.url === '/api/v1/licenses/deactivate' && req.method === 'POST') {
          const payload = JSON.parse(body || '{}');
          await executePostgres(`
            DELETE FROM license_activations WHERE hwid = '${payload.hwid}';
            UPDATE licenses SET current_activations = GREATEST(0, current_activations - 1) WHERE key = '${payload.licenseKey}';
          `);
          res.statusCode = 200;
          return res.end(JSON.stringify({ data: { success: true } }));
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: { message: 'Not found' } }));
      } catch (err) {
        console.error('Error in mock server handler:', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
  });

  await new Promise((resolve) => server.listen(3000, '0.0.0.0', resolve));
  console.log('  ✓ Mock API Server escuchando en http://127.0.0.1:3000');

  // -------------------------------------------------------------
  // TEST 7: Activación de la Licencia con BentianAgent.exe
  // -------------------------------------------------------------
  console.log('\nTEST 7: Activando licencia con BentianAgent.exe...');
  const { stdout: activateOutput } = await execAsync(`"${agentExe}" activate ${testLicenseKey}`);
  console.log('  ✓ Salida de activación de BentianAgent.exe:');
  console.log(activateOutput.trim().split('\n').map(l => '    ' + l).join('\n'));

  if (!activateOutput.includes('¡Licencia activada con éxito!')) {
    throw new Error('BentianAgent.exe no confirmó la activación exitosa.');
  }

  // -------------------------------------------------------------
  // TEST 8: Verificación de persistencia cifrada (license.enc) y estado
  // -------------------------------------------------------------
  console.log('\nTEST 8: Verificando archivo cifrado local y telemetría...');
  const appData = process.env.APPDATA || '';
  const licenseFile = path.join(appData, 'erp-bridge', 'license.enc');
  if (!fs.existsSync(licenseFile)) {
    throw new Error(`Archivo license.enc no encontrado en: ${licenseFile}`);
  }
  const encStats = fs.statSync(licenseFile);
  console.log(`  ✓ Archivo cifrado presente: ${licenseFile} (${encStats.size} bytes)`);

  const { stdout: infoOutput } = await execAsync(`"${agentExe}" license-info`);
  console.log('  ✓ Información de licencia reportada por BentianAgent.exe:');
  console.log(infoOutput.trim().split('\n').map(l => '    ' + l).join('\n'));

  if (!infoOutput.includes('Estado: VALID') || !infoOutput.includes('Plan: professional')) {
    throw new Error('BentianAgent.exe no reporta Estado: VALID o Plan: professional.');
  }

  // -------------------------------------------------------------
  // TEST 9: Verificación de Activación en PostgreSQL
  // -------------------------------------------------------------
  console.log('\nTEST 9: Verificando registro en PostgreSQL (tabla license_activations)...');
  const acts = await queryPostgresJson(`
    SELECT a.id, a.hwid, l.key, l.current_activations
    FROM license_activations a
    JOIN licenses l ON l.id = a.license_id
    WHERE l.key = '${testLicenseKey}'
  `);
  if (acts.length === 0) throw new Error('No se guardó la activación en PostgreSQL');
  console.log(`  ✓ Activación registrada en PostgreSQL:`);
  console.log(`    HWID: ${acts[0].hwid.substring(0, 20)}... | Activaciones: ${acts[0].current_activations}/1`);

  // -------------------------------------------------------------
  // TEST 10: Desactivación limpia con BentianAgent.exe
  // -------------------------------------------------------------
  console.log('\nTEST 10: Desactivando licencia con BentianAgent.exe...');
  const { stdout: deactOutput } = await execAsync(`"${agentExe}" deactivate ${testLicenseKey}`);
  console.log('  ✓ ' + deactOutput.trim());

  const { stdout: postDeactInfo } = await execAsync(`"${agentExe}" status`);
  if (!postDeactInfo.includes('Licencia: UNLICENSED')) {
    throw new Error('El estado no volvió a UNLICENSED tras la desactivación');
  }
  console.log('  ✓ Estado verificado: UNLICENSED tras revocación local.');

  // Cerrar servidor y limpiar DB de prueba
  server.close();
  if (fs.existsSync('agent-config.json')) fs.unlinkSync('agent-config.json');
  await executePostgres(`DELETE FROM license_activations WHERE hwid = '${acts[0].hwid}'; DELETE FROM licenses WHERE key = '${testLicenseKey}';`);
  console.log('  ✓ Base de datos y servidor de prueba cerrados y limpios.');

  console.log('\n========================================================================');
  console.log('   TODAS LAS PRUEBAS (TEST 1 AL 10) PASARON CON ÉXITO ROTUNDO (100% PASS)');
  console.log('========================================================================\n');
}

runPackagingAndLicensingTests().catch(err => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
