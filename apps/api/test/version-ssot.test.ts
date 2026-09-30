import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  getLatestReleasedVersion,
  getLatestInstallerUrl,
  getLatestZipUrl,
  getLatestPortableZipUrl,
} from '../src/utils/version.util';
import { assembleLandingPage } from '../scripts/build-landing';

async function testVersionSSoT() {
  console.log('🧪 Iniciando prueba automatizada de Single Source of Truth (Versionado Bentian)...');

  // 1. Verificar resolución canónica de versión
  console.log('  -> Test 1: Verificar función centralizada getLatestReleasedVersion()...');
  const ver = getLatestReleasedVersion();
  const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'));
  assert.ok(ver, 'La versión retornada no debe ser vacía');
  assert.strictEqual(ver, rootPkg.version, `La versión canónica actual debe ser ${rootPkg.version}`);
  console.log(`  ✓ Versión detectada correctamente: v${ver}`);

  // 2. Verificar URLs canónicas
  console.log('  -> Test 2: Verificar URLs canónicas de descarga...');
  assert.strictEqual(getLatestInstallerUrl(), '/releases/latest/Bentian-Setup.exe');
  assert.strictEqual(getLatestZipUrl(), '/releases/latest/Bentian-Setup.zip');
  assert.strictEqual(getLatestPortableZipUrl(), '/releases/latest/BentianAgent-Portable.zip');
  console.log('  ✓ URLs canónicas verificadas.');

  // 3. Verificar archivos generados en la Landing Page
  console.log('  -> Test 3: Verificar ensamblado de landing page (apps/api/public/index.html)...');
  const landingHtml = assembleLandingPage();
  assert.ok(landingHtml.includes('data-app-version'), 'Debe incluir data-app-version');
  assert.ok(landingHtml.includes('data-download-installer'), 'Debe incluir data-download-installer');
  assert.ok(landingHtml.includes('data-download-zip'), 'Debe incluir data-download-zip');
  assert.ok(landingHtml.includes('src="/js/version-sync.js"'), 'Debe incluir el script version-sync.js');
  assert.ok(landingHtml.includes('href="/releases/latest/Bentian-Setup.exe"'), 'Debe apuntar a la ruta canónica del instalador');
  assert.ok(landingHtml.includes('href="/releases/latest/Bentian-Setup.zip"'), 'Debe apuntar a la ruta canónica del zip');
  console.log('  ✓ Landing page correctamente estructurada con data-attributes semánticos.');

  // 4. Verificar Dashboard HTML
  console.log('  -> Test 4: Verificar data-attributes en apps/api/public/dashboard/index.html...');
  const dashHtml = fs.readFileSync(path.resolve(__dirname, '../public/dashboard/index.html'), 'utf8');
  assert.ok(dashHtml.includes('data-app-version'), 'Dashboard debe incluir data-app-version');
  assert.ok(dashHtml.includes('data-download-installer'), 'Dashboard debe incluir data-download-installer');
  assert.ok(dashHtml.includes('/js/version-sync.js'), 'Dashboard debe cargar version-sync.js');
  assert.ok(!dashHtml.includes('Bentian-Setup-v0.3.2.exe'), 'Dashboard no debe contener nombres hardcodeados con versión en enlaces');
  assert.ok(!dashHtml.includes('Bentian-Setup-v0.3.3.exe'), 'Dashboard no debe contener nombres hardcodeados con versión en enlaces');
  console.log('  ✓ Dashboard verificado con cero hardcoding de versiones.');

  // 5. Verificar script de sincronización cliente version-sync.js
  console.log('  -> Test 5: Verificar existencia e integridad de public/js/version-sync.js...');
  const syncJsPath = path.resolve(__dirname, '../public/js/version-sync.js');
  assert.ok(fs.existsSync(syncJsPath), 'public/js/version-sync.js debe existir');
  const syncJsContent = fs.readFileSync(syncJsPath, 'utf8');
  assert.ok(syncJsContent.includes('data-app-version'), 'version-sync.js debe gestionar [data-app-version]');
  assert.ok(syncJsContent.includes('data-download-installer'), 'version-sync.js debe gestionar [data-download-installer]');
  assert.ok(syncJsContent.includes('BentianVersion'), 'version-sync.js debe exponer API global window.BentianVersion');
  console.log('  ✓ public/js/version-sync.js verificado.');

  // 6. Verificar directorio físico /releases/latest/
  console.log('  -> Test 6: Verificar directorio físico releases/latest/...');
  const latestDir = path.resolve(__dirname, '../../../releases/latest');
  assert.ok(fs.existsSync(latestDir), 'Directorio releases/latest debe existir');
  assert.ok(fs.existsSync(path.join(latestDir, 'Bentian-Setup.exe')), 'Bentian-Setup.exe debe existir en releases/latest');
  assert.ok(fs.existsSync(path.join(latestDir, 'Bentian-Setup.zip')), 'Bentian-Setup.zip debe existir en releases/latest');
  assert.ok(fs.existsSync(path.join(latestDir, 'BentianAgent-Portable.zip')), 'BentianAgent-Portable.zip debe existir en releases/latest');
  assert.ok(fs.existsSync(path.join(latestDir, 'BentianAgent.exe')), 'BentianAgent.exe debe existir en releases/latest');
  assert.ok(fs.existsSync(path.join(latestDir, 'manifest.json')), 'manifest.json debe existir en releases/latest');
  console.log('  ✓ Archivos canónicos en releases/latest/ verificados.');

  console.log('======================================================================');
  console.log('🎉 TODOS LOS TESTS DE SINGLE SOURCE OF TRUTH PASARON CON ÉXITO');
  console.log('======================================================================');
}

testVersionSSoT().catch(err => {
  console.error('❌ Error en test de Version SSoT:', err);
  process.exit(1);
});
