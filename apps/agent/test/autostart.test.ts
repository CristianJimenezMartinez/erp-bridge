import assert from 'assert';
import { AutoStartService } from '../src/system/autostart.service';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';

console.log('--- Running AutoStartService & Windows Auto-Startup Tests ---');

async function testPlatformDetectionAndSafeFallback() {
  console.log('1. Probando detección de plataforma y safe fallback defensivo...');

  // Test en plataforma no Windows (Linux)
  const linuxService = new AutoStartService({ platform: 'linux' });
  const linuxEnabled = await linuxService.isEnabled();
  assert.strictEqual(linuxEnabled, false, 'isEnabled() debe retornar false en linux');

  const linuxEnableRes = await linuxService.enable();
  assert.strictEqual(linuxEnableRes, false, 'enable() debe retornar false en linux');

  const linuxDisableRes = await linuxService.disable();
  assert.strictEqual(linuxDisableRes, false, 'disable() debe retornar false en linux');
  console.log('  ✓ Safe fallback no-Windows validado (retorna false sin lanzar excepciones).');

  // Test en plataforma no Windows (Darwin/macOS)
  const macService = new AutoStartService({ platform: 'darwin' });
  assert.strictEqual(await macService.isEnabled(), false, 'isEnabled() debe retornar false en darwin');
  assert.strictEqual(await macService.enable(), false, 'enable() debe retornar false en darwin');
  assert.strictEqual(await macService.disable(), false, 'disable() debe retornar false en darwin');
  console.log('  ✓ Safe fallback macOS validado.');
}

async function testGetExecutablePathAndStartupCommand() {
  console.log('2. Probando getExecutablePath() y getStartupCommand()...');

  const service = new AutoStartService();
  const exePath = service.getExecutablePath();
  assert(typeof exePath === 'string' && exePath.length > 0, 'getExecutablePath debe retornar un string no vacío');
  console.log(`  ✓ getExecutablePath() retornó ruta detectada: "${exePath}"`);

  const cmd = service.getStartupCommand();
  assert(cmd.includes('--minimized'), 'getStartupCommand() debe incluir el flag --minimized');
  console.log(`  ✓ getStartupCommand() generó comando con flag: "${cmd}"`);

  // Test con ruta personalizada inyectada
  const customService = new AutoStartService({
    execPath: 'C:\\Program Files\\Bentian Agent\\BentianAgent.exe',
  });
  assert.strictEqual(
    customService.getExecutablePath(),
    'C:\\Program Files\\Bentian Agent\\BentianAgent.exe',
    'Debe respetar la ruta custom inyectada'
  );
  assert.strictEqual(
    customService.getStartupCommand(),
    '"C:\\Program Files\\Bentian Agent\\BentianAgent.exe" --minimized',
    'El comando debe envolver la ruta con espacios entre comillas y añadir --minimized'
  );

  // Test con ruta de acceso directo Startup
  const shortcutPath = customService.getStartupShortcutPath();
  assert(shortcutPath.endsWith('BentianAgent.lnk'), 'getStartupShortcutPath() debe terminar en BentianAgent.lnk');
  console.log(`  ✓ getStartupShortcutPath() generó ruta de acceso directo: "${shortcutPath}"`);
}

async function testAgentDelegation() {
  console.log('3. Probando integración delegada en LocalAgent...');

  const agent = new LocalAgent();
  assert(agent.autoStartService instanceof AutoStartService, 'LocalAgent debe tener autoStartService instanciado');

  const isEnabled = await agent.isAutoStartEnabled();
  assert.strictEqual(typeof isEnabled, 'boolean', 'isAutoStartEnabled() debe retornar un booleano');
  console.log(`  ✓ LocalAgent.isAutoStartEnabled() funciona y retornó: ${isEnabled}`);

  if (process.platform === 'win32') {
    // Si estamos en Windows, probamos alternancia segura
    console.log('  Probando setAutoStart(true) y setAutoStart(false) en Windows...');
    const originalState = isEnabled;

    const enableResult = await agent.setAutoStart(true);
    assert.strictEqual(typeof enableResult, 'boolean', 'setAutoStart(true) debe retornar booleano');
    const verifyEnabled = await agent.isAutoStartEnabled();
    assert.strictEqual(verifyEnabled, true, 'isAutoStartEnabled() debe ser true tras enable()');
    console.log('  ✓ setAutoStart(true) configuró el arranque con éxito.');

    const disableResult = await agent.setAutoStart(false);
    assert.strictEqual(typeof disableResult, 'boolean', 'setAutoStart(false) debe retornar booleano');
    const verifyDisabled = await agent.isAutoStartEnabled();
    assert.strictEqual(verifyDisabled, false, 'isAutoStartEnabled() debe ser false tras disable()');
    console.log('  ✓ setAutoStart(false) deshabilitó el arranque con éxito.');

    // Restaurar estado original si fuera necesario
    if (originalState) {
      await agent.setAutoStart(true);
    }
  }
}

async function testGuiEndpoints() {
  console.log('4. Probando endpoints GUI /api/local/autostart (GET y POST)...');

  const agent = new LocalAgent();
  const server = new LocalGuiServer(agent, 39879);
  const { url } = await server.start();

  try {
    // GET /api/local/autostart
    const getRes = await fetch(`${url}/api/local/autostart`);
    assert.strictEqual(getRes.status, 200, 'GET /api/local/autostart debe responder 200 OK');
    const getJson = (await getRes.json()) as any;
    assert.strictEqual(getJson.success, true, 'GET response debe contener success: true');
    assert.strictEqual(typeof getJson.enabled, 'boolean', 'GET response debe contener enabled booleano');
    console.log(`  ✓ GET /api/local/autostart respondió 200 OK:`, getJson);

    // POST /api/local/autostart
    const postRes = await fetch(`${url}/api/local/autostart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    assert.strictEqual(postRes.status, 200, 'POST /api/local/autostart debe responder 200 OK');
    const postJson = (await postRes.json()) as any;
    assert.strictEqual(typeof postJson.success, 'boolean', 'POST response debe contener success booleano');
    assert.strictEqual(typeof postJson.enabled, 'boolean', 'POST response debe contener enabled booleano');
    assert(typeof postJson.message === 'string', 'POST response debe contener un mensaje string');
    console.log(`  ✓ POST /api/local/autostart respondió 200 OK:`, postJson);
  } finally {
    await server.stop();
  }
}

async function main() {
  try {
    await testPlatformDetectionAndSafeFallback();
    await testGetExecutablePathAndStartupCommand();
    await testAgentDelegation();
    await testGuiEndpoints();
    console.log('\n🎉 ALL AUTOSTART SERVICE & WINDOWS TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Fallo en pruebas de auto-start:', err);
    process.exit(1);
  }
}

main();
