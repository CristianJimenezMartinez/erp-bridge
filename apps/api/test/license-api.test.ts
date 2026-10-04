import assert from 'assert';
import http from 'http';
import { bootstrapApp } from '../src/server';
import { AuthService } from '../src/routes/auth.router';

async function run() {
  console.log('--- Running License API E2E Tests ---');

  const app = await bootstrapApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const authToken = AuthService.createToken({
    sub: 'admin_123',
    role: 'ADMIN',
    organizationId: 'org_default',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  try {
    // 0. Verify unauthenticated access returns 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/licenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: '11111111-2222-3333-4444-555555555555',
        plan: 'starter',
        maxActivations: 1,
      }),
    });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');

    // 1. Create License via API with valid admin token
    const createRes = await fetch(`${baseUrl}/api/v1/licenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        organizationId: '11111111-2222-3333-4444-555555555555',
        plan: 'starter',
        maxActivations: 1,
      }),
    });

    assert.strictEqual(createRes.status, 201);
    const createdJson = (await createRes.json()) as { data: { id: string; key: string; plan: string } };
    assert(createdJson.data.key.startsWith('EB-'));
    assert.strictEqual(createdJson.data.plan, 'starter');

    const licenseKey = createdJson.data.key;

    // 2. Activate License via API
    const hwid = '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff';
    const actRes = await fetch(`${baseUrl}/api/v1/licenses/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        hwid,
        machineInfo: { hostname: 'API-TEST-HOST' },
      }),
    });

    assert.strictEqual(actRes.status, 200);
    const actJson = (await actRes.json()) as { data: { success: boolean; licenseToken: string; plan: string } };
    assert.strictEqual(actJson.data.success, true);
    assert(actJson.data.licenseToken);

    // 3. Validate and Renew Token via API
    const valRes = await fetch(`${baseUrl}/api/v1/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseToken: actJson.data.licenseToken,
        hwid,
      }),
    });

    assert.strictEqual(valRes.status, 200);
    const valJson = (await valRes.json()) as { data: { valid: boolean; renewedToken: string } };
    assert.strictEqual(valJson.data.valid, true);
    assert(valJson.data.renewedToken);

    // 4. Get License info with activations (Admin protected)
    const infoRes = await fetch(`${baseUrl}/api/v1/licenses/${licenseKey}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(infoRes.status, 200);
    const infoJson = (await infoRes.json()) as { data: { activations: any[] } };
    assert.strictEqual(infoJson.data.activations.length, 1);

    // 5. Deactivate
    const deactRes = await fetch(`${baseUrl}/api/v1/licenses/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        hwid,
      }),
    });
    assert.strictEqual(deactRes.status, 200);
    const deactJson = (await deactRes.json()) as any;
    assert.strictEqual(deactJson.data?.success, true, 'Debe indicar éxito en desactivación');

    // 5.1 Comprobar que en base de datos la máquina ya no consta como activa
    const postDeactRes = await fetch(`${baseUrl}/api/v1/licenses/${licenseKey}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(postDeactRes.status, 200);
    const postDeactJson = (await postDeactRes.json()) as { data: { activations: any[] } };
    assert.strictEqual(postDeactJson.data.activations.length, 0, 'La lista de activaciones activas debe ser 0 tras desactivar');

    // 6. Test Beta Claim: Reclamación de clave pública (60 días exactos)
    const betaEmail = `beta_tester_${Date.now()}@empresa-test.es`;
    const betaClaimRes = await fetch(`${baseUrl}/api/v1/licenses/beta/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: betaEmail,
        companyName: 'Ferretería Industrial Test SL',
      }),
    });
    assert.strictEqual(betaClaimRes.status, 201, 'Beta claim debe retornar 201 Created');
    const betaClaimJson = (await betaClaimRes.json()) as any;
    assert.strictEqual(betaClaimJson.success, true);
    assert(betaClaimJson.data.licenseKey.startsWith('EB-'));
    assert.strictEqual(betaClaimJson.data.daysRemaining, 60, 'Debe otorgar 60 días');
    assert(betaClaimJson.data.expiresAt, 'Debe incluir fecha de expiración');

    // 7. Test Anti-Abuso Beta Claim: Si el mismo email vuelve a solicitar, devuelve la misma clave
    const betaClaimDupRes = await fetch(`${baseUrl}/api/v1/licenses/beta/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: betaEmail,
        companyName: 'Ferretería Industrial Test SL',
      }),
    });
    assert.strictEqual(betaClaimDupRes.status, 200, 'Reintento debe responder 200 OK con clave existente');
    const betaClaimDupJson = (await betaClaimDupRes.json()) as any;
    assert.strictEqual(betaClaimDupJson.alreadyClaimed, true);
    assert.strictEqual(betaClaimDupJson.data.licenseKey, betaClaimJson.data.licenseKey, 'Debe devolver la misma clave original');

    // 8. Test Founder Plan y Cupo de 25 plazas en facturación
    const plansRes = await fetch(`${baseUrl}/api/v1/billing/plans`);
    assert.strictEqual(plansRes.status, 200);
    const plansJson = (await plansRes.json()) as any;
    const basePlan = plansJson.plans.find((p: any) => p.id === 'base_annual');
    assert(basePlan, 'El catálogo debe contener base_annual');
    assert.strictEqual(basePlan.priceEur, 199, 'La tarifa oficial de base_annual debe ser 199€/año');

    const founderPlan = plansJson.plans.find((p: any) => p.id === 'founder_annual');
    assert(founderPlan, 'El catálogo debe contener el Plan Fundador (founder_annual)');
    assert.strictEqual(founderPlan.promoPriceEur, 139, 'El Plan Fundador debe ser de 139€/año');
    assert.strictEqual(founderPlan.priceEur, 199, 'El precio base de referencia debe ser 199€/año');

    const spotsRes = await fetch(`${baseUrl}/api/v1/billing/founder-spots`);
    assert.strictEqual(spotsRes.status, 200);
    const spotsJson = (await spotsRes.json()) as any;
    assert.strictEqual(spotsJson.data.totalSpots, 25, 'El cupo de fundador debe ser estrictamente de 25 plazas');
    assert.strictEqual(spotsJson.data.priceEur, 139, 'Precio fundador debe ser 139€');
    assert.strictEqual(spotsJson.data.officialPriceEur, 199, 'Precio oficial debe ser 199€');

    console.log('✓ License API E2E Tests Passed (including 25-key founder quota and 199€ pricing)');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
