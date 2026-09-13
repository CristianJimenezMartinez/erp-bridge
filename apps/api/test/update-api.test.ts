import assert from 'assert';
import http from 'http';
import { bootstrapApp } from '../src/server';
import { AuthService } from '../src/routes/auth.router';

async function run() {
  console.log('--- Running Update API E2E Tests ---');

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
    const testAgentId = `agent_e2e_${Date.now()}`;
    const testVersion = '1.2.0';

    // 0. Verify unauthenticated publish returns 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/updates/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: testVersion,
        channel: 'stable',
        platform: 'win32_x64',
        downloadUrl: 'https://cdn.erpbridge.io/releases/agent-1.2.0.zip',
        sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        signature: 'MC4CAQAwBQYDK2VwBCIEIPz5uG8dK3m7v...',
        releaseNotes: 'Fixed Factusol OLEDB race condition',
        mandatory: false,
      }),
    });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');

    // 1. Publish new update manifest v1.2.0 via API (with admin auth)
    const publishRes = await fetch(`${baseUrl}/api/v1/updates/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        version: testVersion,
        channel: 'stable',
        platform: 'win32_x64',
        downloadUrl: 'https://cdn.erpbridge.io/releases/agent-1.2.0.zip',
        sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        signature: 'MC4CAQAwBQYDK2VwBCIEIPz5uG8dK3m7v...',
        releaseNotes: 'Fixed Factusol OLEDB race condition',
        mandatory: false,
      }),
    });

    assert.strictEqual(publishRes.status, 201);
    const publishJson = (await publishRes.json()) as { data: { version: string } };
    assert.strictEqual(publishJson.data.version, testVersion);

    // 2. Check for update from Agent running v1.0.0 -> Should be AVAILABLE
    const checkRes = await fetch(`${baseUrl}/api/v1/updates/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: testAgentId,
        currentVersion: '1.0.0',
        platform: 'win32',
        arch: 'x64',
        channel: 'stable',
      }),
    });

    assert.strictEqual(checkRes.status, 200);
    const checkJson = (await checkRes.json()) as { data: { available: boolean; version: string } };
    assert.strictEqual(checkJson.data.available, true);
    assert.strictEqual(checkJson.data.version, testVersion);

    // 3. Confirm update installation
    const confirmRes = await fetch(`${baseUrl}/api/v1/updates/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: testAgentId,
        fromVersion: '1.0.0',
        toVersion: testVersion,
        status: 'success',
      }),
    });

    assert.strictEqual(confirmRes.status, 200);

    // 4. List update history (Admin protected)
    const historyRes = await fetch(`${baseUrl}/api/v1/updates/history?agentId=${testAgentId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(historyRes.status, 200);
    const historyJson = (await historyRes.json()) as { data: Array<{ status: string; toVersion: string }> };
    assert.strictEqual(historyJson.data.length, 1);
    assert.strictEqual(historyJson.data[0]?.status, 'success');
    assert.strictEqual(historyJson.data[0]?.toVersion, testVersion);

    console.log('✓ Update API E2E Tests Passed');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
