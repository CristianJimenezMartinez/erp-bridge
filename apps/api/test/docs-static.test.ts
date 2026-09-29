import assert from 'assert';
import http from 'http';
import { bootstrapApp } from '../src/server';
import { SyncScheduler } from '@erp-bridge/core';

async function run() {
  console.log('--- Running Docs Static Route E2E Tests ---');

  const app = await bootstrapApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Test HTML guide endpoint
    const htmlRes = await fetch(`${baseUrl}/docs/windows-antivirus-smartscreen-guide.html`);
    assert.strictEqual(htmlRes.status, 200, 'HTML guide must return 200 OK');
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('Windows Defender SmartScreen'), 'HTML guide must include SmartScreen heading');
    assert.ok(htmlText.includes('BentianAgent.exe'), 'HTML guide must include agent exclusions');
    assert.ok(htmlText.includes('Avast Antivirus'), 'HTML guide must include Avast/AVG section');
    console.log('✓ /docs/windows-antivirus-smartscreen-guide.html: 200 OK (Verified HTML content)');

    // 2. Test Markdown guide endpoint
    const mdRes = await fetch(`${baseUrl}/docs/windows-antivirus-smartscreen-guide.md`);
    assert.strictEqual(mdRes.status, 200, 'Markdown guide must return 200 OK');
    const contentType = mdRes.headers.get('content-type') || '';
    assert.ok(contentType.includes('text/markdown'), `Markdown content-type must be text/markdown, got: ${contentType}`);
    const mdText = await mdRes.text();
    assert.ok(mdText.includes('Guía de Resolución de Windows Defender SmartScreen'), 'Markdown must contain title');
    console.log('✓ /docs/windows-antivirus-smartscreen-guide.md: 200 OK (Content-Type text/markdown verified)');

    // 3. Test Extensionless clean URL
    const cleanUrlRes = await fetch(`${baseUrl}/docs/windows-antivirus-smartscreen-guide`);
    assert.strictEqual(cleanUrlRes.status, 200, 'Clean URL without extension must return 200 OK');
    console.log('✓ /docs/windows-antivirus-smartscreen-guide (clean URL): 200 OK');

    // 4. Test /docs/ index endpoint
    const docsIndexRes = await fetch(`${baseUrl}/docs/`);
    assert.strictEqual(docsIndexRes.status, 200, 'Docs root index must return 200 OK');
    console.log('✓ /docs/: 200 OK');

    console.log('\n✅ All Docs Static Route tests passed successfully!');
  } finally {
    SyncScheduler.getInstance().stop();
    server.close();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
