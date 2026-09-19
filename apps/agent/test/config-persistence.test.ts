import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/config/config.manager';

async function runTests() {
  console.log('--- Probando Persistencia de Configuración y Preservación de NAS ---');

  const testDir = path.join(os.tmpdir(), `bentian-config-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  try {
    process.env.BENTIAN_DATA_DIR = testDir;

    // 1. Instanciación limpia y guardado
    console.log('1. Instanciando ConfigManager en directorio seguro...');
    const cm1 = new ConfigManager();
    assert.strictEqual(cm1.getConfigFilePath(), path.join(testDir, 'agent-config.json'));

    // 2. Guardar ruta en NAS (UNC) que no existe físicamente en este equipo de test
    const nasDbPath = '\\\\NAS_TIENDA\\Factusol\\Datos\\FS\\2252026.accdb';
    console.log('2. Configurando ruta NAS/Red UNC:', nasDbPath);
    cm1.setFactusolDbPath(nasDbPath);

    cm1.update({
      channelType: 'universal_bridge',
      universalBridge: {
        storeUrl: 'https://www.suministrosrubio.com',
        secretKey: 'EB_SEC_TEST_123456789',
        enabled: true,
      },
      factusol: {
        databasePath: nasDbPath,
        tariffCode: '2',
        saleTariffCode: '1',
        orderSeries: 'B',
        invoiceSeries: '2',
        warehouseCode: 'GEN',
      },
      syncRules: {
        enableFileWatcher: true,
        debounceSeconds: 8,
        periodicIntervalMinutes: 20,
        syncStock: true,
        syncPrices: true,
        syncDescriptions: false,
        onlyStockAboveZero: true,
        safetyStockBuffer: 2,
      },
    });

    const saveRes = cm1.saveConfigToDisk();
    assert.strictEqual(saveRes.success, true, 'El guardado en disco debe tener éxito');
    assert.strictEqual(fs.existsSync(cm1.getConfigFilePath()), true, 'El archivo debe existir en disco');

    // 3. Simular reinicio completo del equipo / agente
    console.log('3. Simulando reinicio del agente (nueva instancia de ConfigManager)...');
    const cm2 = new ConfigManager();
    const loadedConfig = cm2.get();

    // 4. Verificar que la ruta NAS NO SE BORRÓ
    console.log('4. Verificando que la ruta NAS no ha sido eliminada por sanitización...');
    assert.strictEqual(
      loadedConfig.factusolDbPath,
      nasDbPath,
      'factusolDbPath debe ser exactamente la ruta NAS sin ser eliminada'
    );
    assert.strictEqual(
      loadedConfig.factusol?.databasePath,
      nasDbPath,
      'factusol.databasePath debe ser exactamente la ruta NAS'
    );
    assert.strictEqual(loadedConfig.factusol?.tariffCode, '2', 'tariffCode debe persistir');
    assert.strictEqual(loadedConfig.factusol?.saleTariffCode, '1', 'saleTariffCode debe persistir');
    assert.strictEqual(loadedConfig.factusol?.orderSeries, 'B', 'orderSeries debe persistir');
    assert.strictEqual(loadedConfig.factusol?.invoiceSeries, '2', 'invoiceSeries debe persistir');

    // 5. Verificar canales y reglas
    console.log('5. Verificando persistencia de canal web universal y reglas...');
    assert.strictEqual(loadedConfig.channelType, 'universal_bridge');
    assert.strictEqual(loadedConfig.universalBridge?.storeUrl, 'https://www.suministrosrubio.com');
    assert.strictEqual(loadedConfig.universalBridge?.secretKey, 'EB_SEC_TEST_123456789');
    assert.strictEqual(loadedConfig.syncRules?.debounceSeconds, 8);
    assert.strictEqual(loadedConfig.syncRules?.periodicIntervalMinutes, 20);
    assert.strictEqual(loadedConfig.syncRules?.safetyStockBuffer, 2);

    // 6. Migración desde ubicación secundaria
    console.log('6. Probando migración desde ubicación previa...');
    const legacyDir = path.join(testDir, 'legacy');
    const newDir = path.join(testDir, 'migrated');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.mkdirSync(newDir, { recursive: true });

    const legacyConfigPath = path.join(legacyDir, 'agent-config.json');
    fs.writeFileSync(
      legacyConfigPath,
      JSON.stringify({
        factusolDbPath: 'Z:\\Datos\\FS\\0012025.accdb',
        apiBaseUrl: 'https://bridge.cristianjm.com',
        channelType: 'universal_bridge',
      }),
      'utf8'
    );

    delete process.env.BENTIAN_DATA_DIR;
    process.env.BENTIAN_CONFIG_PATH = path.join(newDir, 'agent-config.json');
    process.env.BENTIAN_LEGACY_CONFIG_PATH = legacyConfigPath;

    // Instanciar con secondaryPath apuntando a legacy
    const cmLegacy = new ConfigManager();
    const loadedLegacy = cmLegacy.get();
    assert.strictEqual(loadedLegacy.factusolDbPath, 'Z:\\Datos\\FS\\0012025.accdb');

    console.log('✓ TODAS LAS PRUEBAS DE PERSISTENCIA Y NAS PASARON CON ÉXITO.');
  } finally {
    delete process.env.BENTIAN_DATA_DIR;
    delete process.env.BENTIAN_CONFIG_PATH;
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  }
}

runTests().catch(err => {
  console.error('✕ Error en test de persistencia:', err);
  process.exit(1);
});
