import assert from 'assert';
import http from 'http';
import { bootstrapApp } from '../src/server';

async function run() {
  console.log('--- Running License API E2E Tests ---');

  const app = await bootstrapApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Create License via API
    const createRes = await fetch(`${baseUrl}/api/v1/licenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    // 4. Get License info with activations
    const infoRes = await fetch(`${baseUrl}/api/v1/licenses/${licenseKey}`);
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

    console.log('✓ License API E2E Tests Passed');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
