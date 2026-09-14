import assert from 'assert';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';

console.log('--- Running Local GUI Server & Router Tests ---');

async function testGuiServer() {
  const agent = new LocalAgent();
  const server = new LocalGuiServer(agent, 39876);

  const { port, url } = await server.start();
  console.log(`✓ LocalGuiServer iniciado en: ${url} (port ${port})`);

  try {
    // 1. Test GET / (UI HTML template)
    console.log('1. Probando GET / (UI HTML Template)...');
    const resRoot = await fetch(`${url}/`);
    assert.strictEqual(resRoot.status, 200, 'GET / debe responder 200 OK');
    const html = await resRoot.text();
    assert(html.includes('Bentian ERP Bridge'), 'El HTML debe contener "Bentian ERP Bridge"');
    console.log('  ✓ GET / respondió 200 OK con el template HTML.');

    // 2. Test GET /api/local/status
    console.log('2. Probando GET /api/local/status...');
    const resStatus = await fetch(`${url}/api/local/status`);
    assert.strictEqual(resStatus.status, 200, 'GET /api/local/status debe responder 200 OK');
    const statusJson = await resStatus.json() as any;
    assert(statusJson.agentName, 'El status debe contener agentName');
    assert(statusJson.agentVersion, 'El status debe contener agentVersion');
    console.log(`  ✓ GET /api/local/status respondió 200 OK (Agent: ${statusJson.agentName}, v${statusJson.agentVersion}).`);

    // 3. Test GET /api/local/logs
    console.log('3. Probando GET /api/local/logs...');
    const resLogs = await fetch(`${url}/api/local/logs`);
    assert.strictEqual(resLogs.status, 200, 'GET /api/local/logs debe responder 200 OK');
    const logsJson = await resLogs.json();
    assert(Array.isArray(logsJson), 'Los logs deben retornar un array');
    console.log(`  ✓ GET /api/local/logs respondió 200 OK con ${logsJson.length} eventos.`);

    // 4. Test GET /api/local/history
    console.log('4. Probando GET /api/local/history...');
    const resHistory = await fetch(`${url}/api/local/history`);
    assert.strictEqual(resHistory.status, 200, 'GET /api/local/history debe responder 200 OK');
    const historyJson = await resHistory.json();
    assert(Array.isArray(historyJson), 'Debe retornar un array history');
    console.log(`  ✓ GET /api/local/history respondió 200 OK (${historyJson.length} registros).`);

    // 5. Test POST /api/local/detect-factusol
    console.log('5. Probando POST /api/local/detect-factusol...');
    const resDetect = await fetch(`${url}/api/local/detect-factusol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.strictEqual(resDetect.status, 200, 'POST /api/local/detect-factusol debe responder 200 OK');
    const detectJson = await resDetect.json() as any;
    assert(Array.isArray(detectJson.instances), 'Debe retornar un array instances');
    console.log(`  ✓ POST /api/local/detect-factusol respondió 200 OK (${detectJson.instances.length} instancias detectadas).`);

    // 6. Test GET /api/local/check-update
    console.log('6. Probando GET /api/local/check-update...');
    const resUpdate = await fetch(`${url}/api/local/check-update`);
    assert.strictEqual(resUpdate.status, 200, 'GET /api/local/check-update debe responder 200 OK');
    console.log('  ✓ GET /api/local/check-update respondió 200 OK.');

  } finally {
    await server.stop();
    console.log('✓ LocalGuiServer detenido limpiamente.');
  }

  console.log('ALL LOCAL GUI & ROUTER TESTS PASSED SUCCESSFULLY!');
}

testGuiServer().catch((err) => {
  console.error('❌ Error en test de GUI Server:', err);
  process.exit(1);
});
