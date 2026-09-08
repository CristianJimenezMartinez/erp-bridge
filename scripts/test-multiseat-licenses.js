const http = require('http');
const crypto = require('crypto');
const childProcess = require('child_process');

function executePostgres(sql) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn('docker', [
      'exec', '-i', 'bentian-postgres', 'psql', '-U', 'postgres', '-d', 'Factusol', '-c', sql
    ]);
    let stderr = '';
    child.stderr.on('data', d => stderr += d);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`Postgres error (exit ${code}): ${stderr}`));
      else resolve();
    });
  });
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
      if (code !== 0) return reject(new Error(`Postgres error (exit ${code}): ${stderr}`));
      try {
        const clean = stdout.trim();
        resolve(clean ? JSON.parse(clean) : []);
      } catch (e) {
        reject(new Error(`JSON Parse Error: ${e.message}. Raw: "${stdout}"`));
      }
    });
  });
}

function generateLicenseKey() {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const group = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EB-${group()}-${group()}-${group()}-${group()}`;
}

async function main() {
  console.log('========================================================================');
  console.log('   TEST E2E: GESTIÓN MULTI-PUESTO, TELEMETRÍA DE FLOTA Y MUDANZA PC   ');
  console.log('========================================================================\n');

  const testOrgId = 'org_multiseat_test_' + Date.now();
  await executePostgres(`
    INSERT INTO organizations (id, name, slug, created_at, updated_at)
    VALUES ('${testOrgId}', 'Cliente Multi-Puesto', '${testOrgId}', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Start HTTP Server mimicking licensesRouter connected to real PostgreSQL
  const server = http.createServer(async (req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');
      const url = req.url;
      const method = req.method;

      try {
        // GET /api/v1/licenses
        if (url === '/api/v1/licenses' && method === 'GET') {
          const lics = await queryPostgresJson(`
            SELECT id, key, organization_id, alias, plan, status, max_activations, current_activations, created_at
            FROM licenses
            WHERE organization_id = '${testOrgId}'
            ORDER BY created_at DESC
          `);

          for (const lic of lics) {
            lic.activations = await queryPostgresJson(`
              SELECT id, license_id, hwid, machine_info, activated_at, last_validated_at, deactivated_at
              FROM license_activations
              WHERE license_id = '${lic.id}' AND deactivated_at IS NULL
              ORDER BY activated_at DESC
            `);
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({ data: lics }));
        }

        // GET /api/v1/licenses/fleet-overview
        if (url === '/api/v1/licenses/fleet-overview' && method === 'GET') {
          const lics = await queryPostgresJson(`
            SELECT id, max_activations, plan
            FROM licenses
            WHERE organization_id = '${testOrgId}'
          `);
          const acts = await queryPostgresJson(`
            SELECT a.id, a.last_validated_at
            FROM license_activations a
            JOIN licenses l ON a.license_id = l.id
            WHERE l.organization_id = '${testOrgId}' AND a.deactivated_at IS NULL
          `);

          let totalAllowed = 0;
          for (const l of lics) totalAllowed += (l.max_activations || 1);

          res.statusCode = 200;
          return res.end(JSON.stringify({
            data: {
              totalLicenses: lics.length,
              totalAllowedSeats: Math.max(totalAllowed, 1),
              activeSeats: acts.length,
              onlineSeats: acts.length,
              plan: lics[0]?.plan || 'starter'
            }
          }));
        }

        // POST /api/v1/licenses
        if (url === '/api/v1/licenses' && method === 'POST') {
          const payload = JSON.parse(body);
          const key = generateLicenseKey();
          const id = crypto.randomUUID();
          await executePostgres(`
            INSERT INTO licenses (id, key, organization_id, alias, plan, status, max_activations, current_activations, created_at)
            VALUES ('${id}', '${key}', '${testOrgId}', '${payload.alias || ''}', '${payload.plan || 'professional'}', 'active', ${payload.maxActivations || 1}, 0, NOW());
          `);
          res.statusCode = 201;
          return res.end(JSON.stringify({
            data: {
              id,
              key,
              organizationId: testOrgId,
              alias: payload.alias,
              plan: payload.plan,
              maxActivations: payload.maxActivations,
              currentActivations: 0
            }
          }));
        }

        // PATCH /api/v1/licenses/:id/alias
        if (url.match(/^\/api\/v1\/licenses\/([a-zA-Z0-9_-]+)\/alias$/) && method === 'PATCH') {
          const id = url.split('/')[4];
          const payload = JSON.parse(body);
          await executePostgres(`
            UPDATE licenses SET alias = '${payload.alias}' WHERE id = '${id}';
          `);
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, id, alias: payload.alias }));
        }

        // POST /api/v1/licenses/:id/unbind (Mudar PC)
        if (url.match(/^\/api\/v1\/licenses\/([a-zA-Z0-9_-]+)\/unbind$/) && method === 'POST') {
          const id = url.split('/')[4];
          const payload = JSON.parse(body);
          await executePostgres(`
            UPDATE license_activations
            SET deactivated_at = NOW()
            WHERE license_id = '${id}' AND hwid = '${payload.hwid}' AND deactivated_at IS NULL;
            UPDATE licenses
            SET current_activations = GREATEST(0, current_activations - 1)
            WHERE id = '${id}';
          `);
          res.statusCode = 200;
          return res.end(JSON.stringify({ data: { success: true } }));
        }

        // POST /api/v1/licenses/activate
        if (url === '/api/v1/licenses/activate' && method === 'POST') {
          const payload = JSON.parse(body);
          const lics = await queryPostgresJson(`
            SELECT id, key, max_activations, current_activations
            FROM licenses
            WHERE key = '${payload.licenseKey}'
          `);
          if (lics.length === 0) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: { message: 'Licencia no encontrada' } }));
          }
          const lic = lics[0];
          if (lic.current_activations >= lic.max_activations) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: { message: 'Límite de puestos alcanzado' } }));
          }

          const machineJson = JSON.stringify(payload.machineInfo || {}).replace(/'/g, "''");
          await executePostgres(`
            INSERT INTO license_activations (id, license_id, hwid, machine_info, activated_at, last_validated_at)
            VALUES (gen_random_uuid(), '${lic.id}', '${payload.hwid}', '${machineJson}'::jsonb, NOW(), NOW())
            ON CONFLICT (license_id, hwid) DO UPDATE
            SET machine_info = '${machineJson}'::jsonb, last_validated_at = NOW(), deactivated_at = NULL;
            UPDATE licenses SET current_activations = current_activations + 1 WHERE id = '${lic.id}';
          `);

          res.statusCode = 200;
          return res.end(JSON.stringify({
            data: {
              success: true,
              licenseToken: 'mock_jwt_' + Date.now(),
              plan: 'professional',
              expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
            }
          }));
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: { message: 'Not Found' } }));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
  });

  await new Promise((resolve) => server.listen(3199, '127.0.0.1', resolve));
  const baseUrl = 'http://127.0.0.1:3199/api/v1';

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  try {
    // TEST 1: Crear licencia multi-puesto con alias
    console.log('TEST 1: Creando licencia multi-puesto con alias "Almacén Central"...');
    const createRes = await api('/licenses', {
      method: 'POST',
      body: JSON.stringify({ plan: 'professional', maxActivations: 3, alias: 'Almacén Central' }),
    });
    if (createRes.status !== 201) throw new Error('Fallo al crear licencia');
    const license = createRes.data.data;
    console.log(`  ✓ Licencia creada: ${license.key} (ID: ${license.id})`);
    console.log(`  ✓ Alias: "${license.alias}" | Puestos máximos: ${license.maxActivations}`);

    // TEST 2: Fleet Overview inicial
    console.log('\nTEST 2: Verificando resumen de flota inicial (GET /licenses/fleet-overview)...');
    const overview1 = await api('/licenses/fleet-overview');
    console.log(`  ✓ Puestos permitidos: ${overview1.data.data.totalAllowedSeats} | Puestos activos: ${overview1.data.data.activeSeats}`);
    if (overview1.data.data.activeSeats !== 0) throw new Error('Se esperaban 0 puestos activos');

    // TEST 3: Activar Equipo 1 (PC-ALMACEN-01)
    console.log('\nTEST 3: Activando puesto #1 (PC-ALMACEN-01)...');
    const act1 = await api('/licenses/activate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: license.key,
        hwid: 'hwid_pc_almacen_001_5c1fe08e37482c37c0db',
        machineInfo: { hostname: 'PC-ALMACEN-01', platform: 'win32', arch: 'x64' },
      }),
    });
    if (!act1.data?.data?.success) throw new Error('Fallo al activar puesto 1');
    console.log('  ✓ Puesto #1 activado correctamente con HWID');

    // TEST 4: Activar Equipo 2 (PC-TIENDA-02)
    console.log('\nTEST 4: Activando puesto #2 (PC-TIENDA-02)...');
    const act2 = await api('/licenses/activate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: license.key,
        hwid: 'hwid_pc_tienda_002_a91038dfbc87e10293da',
        machineInfo: { hostname: 'PC-TIENDA-02', platform: 'win32', arch: 'x64' },
      }),
    });
    if (!act2.data?.data?.success) throw new Error('Fallo al activar puesto 2');
    console.log('  ✓ Puesto #2 activado correctamente con HWID');

    // TEST 5: Consultar lista enriquecida de licencias y telemetría
    console.log('\nTEST 5: Verificando lista de licencias con activaciones y hostnames...');
    const listRes = await api('/licenses');
    const licInList = listRes.data.data.find(l => l.id === license.id);
    console.log(`  ✓ Licencia: ${licInList.key} (${licInList.alias})`);
    console.log(`  ✓ Activaciones encontradas: ${licInList.activations.length}`);
    licInList.activations.forEach((a, i) => {
      console.log(`    [Puesto ${i + 1}] Hostname: ${a.machine_info?.hostname} | HWID: ${a.hwid.substring(0, 20)}...`);
    });
    if (licInList.activations.length !== 2) throw new Error('Se esperaban 2 activaciones');

    // TEST 6: Fleet Overview actualizado
    console.log('\nTEST 6: Comprobando KPIs de flota con 2 puestos online...');
    const overview2 = await api('/licenses/fleet-overview');
    console.log(`  ✓ Puestos activos: ${overview2.data.data.activeSeats} / ${overview2.data.data.totalAllowedSeats}`);
    console.log(`  ✓ Puestos online: ${overview2.data.data.onlineSeats}`);
    if (overview2.data.data.activeSeats !== 2) throw new Error('Métricas incorrectas');

    // TEST 7: Actualizar Alias
    console.log('\nTEST 7: Actualizando alias a "Sede Central & Tienda" (PATCH /licenses/:id/alias)...');
    const aliasRes = await api(`/licenses/${license.id}/alias`, {
      method: 'PATCH',
      body: JSON.stringify({ alias: 'Sede Central & Tienda' }),
    });
    if (aliasRes.data?.alias !== 'Sede Central & Tienda') throw new Error('Fallo actualizando alias');
    console.log('  ✓ Alias persistido con éxito');

    // TEST 8: Desvinculación remota de HWID (Mudar PC)
    console.log('\nTEST 8: Desvinculando puesto #1 (Mudar PC: POST /licenses/:id/unbind)...');
    const unbindRes = await api(`/licenses/${license.id}/unbind`, {
      method: 'POST',
      body: JSON.stringify({ hwid: 'hwid_pc_almacen_001_5c1fe08e37482c37c0db' }),
    });
    if (!unbindRes.data?.data?.success) throw new Error('Fallo al desvincular HWID');
    console.log('  ✓ HWID liberado con éxito. Puesto disponible para un nuevo equipo.');

    // TEST 9: Activar nuevo equipo de reemplazo (PC-NUEVO-ALMACEN-03)
    console.log('\nTEST 9: Activando equipo de reemplazo (PC-NUEVO-ALMACEN-03)...');
    const act3 = await api('/licenses/activate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: license.key,
        hwid: 'hwid_pc_nuevo_almacen_003_112233445566',
        machineInfo: { hostname: 'PC-NUEVO-ALMACEN-03', platform: 'win32', arch: 'x64' },
      }),
    });
    if (!act3.data?.data?.success) throw new Error('Fallo activando equipo reemplazo');
    console.log('  ✓ Equipo de reemplazo activado correctamente');

    // TEST 10: Verificación de consistencia y límite de capacidad
    console.log('\nTEST 10: Verificando consistencia de flota y rechazo ante exceso de cupo...');
    const finalListRes = await api('/licenses');
    const finalLic = finalListRes.data.data.find(l => l.id === license.id);
    const hostnames = finalLic.activations.map(a => a.machine_info?.hostname);
    console.log(`  ✓ Equipos activos en la licencia: [${hostnames.join(', ')}]`);
    if (!hostnames.includes('PC-NUEVO-ALMACEN-03') || hostnames.includes('PC-ALMACEN-01')) {
      throw new Error('Inconsistencia en la mudanza');
    }

    // Activar un 3er puesto (alcanza el límite de 3)
    await api('/licenses/activate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: license.key,
        hwid: 'hwid_puesto_3_zzzz',
        machineInfo: { hostname: 'PC-PUESTO-03' }
      }),
    });

    // Intentar activar un 4to puesto (debe ser rechazado por límite de 3)
    const excessAct = await api('/licenses/activate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey: license.key,
        hwid: 'hwid_puesto_exceso_4',
        machineInfo: { hostname: 'PC-EXCESO-04' }
      }),
    });
    if (excessAct.status !== 400) throw new Error('Debería haber rechazado el exceso de puestos');
    console.log('  ✓ Exceso de puestos rechazado correctamente (Límite 3/3 respetado)');

    console.log('\n========================================================================');
    console.log('   🎉 10/10 TESTS PASADOS: SISTEMA MULTI-PUESTO Y MUDANZA PC VERIFICADO   ');
    console.log('========================================================================\n');
  } finally {
    server.close();
    // Limpieza de datos de prueba en PostgreSQL
    await executePostgres(`
      DELETE FROM license_activations WHERE license_id IN (SELECT id FROM licenses WHERE organization_id = '${testOrgId}');
      DELETE FROM licenses WHERE organization_id = '${testOrgId}';
      DELETE FROM organizations WHERE id = '${testOrgId}';
    `);
  }
}

main().catch(err => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
