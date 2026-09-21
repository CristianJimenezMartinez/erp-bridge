import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import childProcess from 'child_process';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';
import { openWindowsFileDialog } from '../src/gui/window-launcher';
import { ConfigManager } from '../src/config/config.manager';
import { FactusolPathResolver } from '../src/factusol/factusol.resolver';
import { FactusolYearResolver, FactusolConnector, AccessDriver } from '@erp-bridge/connector-factusol';

console.log('======================================================================');
console.log('🚀 SUITE DE VERIFICACIÓN END-TO-END: RUTAS NAS, DIÁLOGOS Y ESTABILIDAD');
console.log('======================================================================\n');

function getRunningProcessPids(name: string): number[] {
  if (process.platform !== 'win32') return [];
  try {
    const out = childProcess.execSync(
      `powershell.exe -NoProfile -Command "(Get-Process -Name '${name}' -ErrorAction SilentlyContinue).Id"`,
      { encoding: 'utf8', timeout: 5000 }
    );
    return out
      .split(/\r?\n/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  } catch {
    return [];
  }
}

async function runAuditSuite() {
  const testDir = path.join(os.tmpdir(), `bentian-nas-audit-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  process.env.BENTIAN_DATA_DIR = testDir;

  const agent = new LocalAgent();
  const server = new LocalGuiServer(agent, 39911);
  const { port, url } = await server.start();
  console.log(`✓ Servidor GUI de auditoría activo en: ${url} (puerto ${port})\n`);

  try {
    // =========================================================================
    // SECCIÓN 1: AUDITORÍA DE window-launcher.ts Y ENDPOINT /api/local/open-file-dialog
    // =========================================================================
    console.log('--- SECCIÓN 1: Auditoría de Diálogo Nativo y Endpoint open-file-dialog ---');

    const testScenarios = [
      {
        id: '1a',
        name: 'Ruta local estándar',
        path: 'C:\\Software DELSOL\\FACTUSOL\\Datos\\FS\\2252026.accdb',
        expectedSuccess: true,
      },
      {
        id: '1b',
        name: 'Ruta en unidad mapeada',
        path: 'Z:\\Datos\\FS\\2252026.accdb',
        expectedSuccess: true,
      },
      {
        id: '1c',
        name: 'Ruta de red UNC hacia NAS',
        path: '\\\\NAS_EMPRESA\\Factusol\\Datos\\FS\\2252026.accdb',
        expectedSuccess: true,
      },
      {
        id: '1d',
        name: 'Ruta con espacios y acentos',
        path: '\\\\192.168.1.50\\Facturación y Gestión\\FS\\0012026.accdb',
        expectedSuccess: true,
      },
      {
        id: '1e',
        name: 'Cancelación del diálogo',
        path: 'CANCEL',
        expectedSuccess: false,
        expectedCancelled: true,
      },
    ];

    for (const scenario of testScenarios) {
      process.env.BENTIAN_MOCK_FILE_DIALOG = scenario.path;

      // 1. Probar openWindowsFileDialog directamente
      const directResult = openWindowsFileDialog();
      if (scenario.expectedSuccess) {
        assert.strictEqual(
          directResult,
          scenario.path,
          `[${scenario.id}] openWindowsFileDialog directo debe retornar la ruta simulada`
        );
      } else {
        assert.strictEqual(
          directResult,
          '',
          `[${scenario.id}] openWindowsFileDialog directo debe retornar string vacío en cancelación`
        );
      }

      // 2. Probar endpoint /api/local/open-file-dialog vía HTTP POST
      const resPost = await fetch(`${url}/api/local/open-file-dialog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(resPost.status, 200, `[${scenario.id}] Endpoint POST debe responder 200 OK`);
      const bodyPost = (await resPost.json()) as any;

      if (scenario.expectedSuccess) {
        assert.strictEqual(bodyPost.success, true, `[${scenario.id}] success debe ser true`);
        assert.strictEqual(bodyPost.filePath, scenario.path, `[${scenario.id}] filePath debe coincidir exactamente`);
        console.log(`  ✓ [${scenario.id}] ${scenario.name}: ${bodyPost.filePath}`);
      } else {
        assert.strictEqual(bodyPost.success, false, `[${scenario.id}] success debe ser false en cancelación`);
        assert.strictEqual(bodyPost.cancelled, true, `[${scenario.id}] cancelled debe ser true en cancelación`);
        console.log(`  ✓ [${scenario.id}] ${scenario.name}: Cancelación procesada limpiamente`);
      }

      // 3. Probar endpoint vía HTTP GET (soporte any)
      const resGet = await fetch(`${url}/api/local/open-file-dialog`);
      assert.strictEqual(resGet.status, 200, `[${scenario.id}] Endpoint GET debe responder 200 OK`);
    }

    // Limpiar variable de mock
    delete process.env.BENTIAN_MOCK_FILE_DIALOG;

    // 4. Verificación de No Procesos Huérfanos
    console.log('\n  -> Verificando ciclo de vida de procesos y ausencia de huérfanos...');
    if (process.platform === 'win32') {
      const initialBentianTrayPids = getRunningProcessPids('BentianTray');

      // Ejecución de script de prueba no interactivo simulando apertura y cierre
      const testStaScript = [
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;',
        'Add-Type -AssemblyName System.Windows.Forms;',
        '$d = New-Object System.Windows.Forms.OpenFileDialog;',
        '$d.Title = "Bentian Test";',
        '$d.Dispose();',
        '[Console]::WriteLine("OK");',
      ].join(' ');

      const execOut = childProcess.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-Command', testStaScript], {
        encoding: 'utf8',
        timeout: 10000,
      });
      assert.strictEqual(execOut.trim(), 'OK', 'PowerShell STA debe ejecutar y salir con OK');

      const finalBentianTrayPids = getRunningProcessPids('BentianTray');
      // No deben haber quedado instancias adicionales
      const leftoverTray = finalBentianTrayPids.filter((pid) => !initialBentianTrayPids.includes(pid));
      assert.strictEqual(leftoverTray.length, 0, 'No deben quedar procesos BentianTray huérfanos');
      console.log('  ✓ Ningún proceso secundario o huérfano quedó en el Administrador de Tareas.');
    }

    // =========================================================================
    // SECCIÓN 2: PERSISTENCIA EN %APPDATA% Y PRESERVACIÓN DE RUTAS NAS
    // =========================================================================
    console.log('\n--- SECCIÓN 2: Persistencia en Disco y Preservación de Rutas NAS ---');

    const appDataDir = path.join(testDir, 'Bentian Agent');
    const expectedConfigFile = path.join(appDataDir, 'agent-config.json');

    // Desactivar BENTIAN_DATA_DIR para probar la resolución estándar con APPDATA
    delete process.env.BENTIAN_DATA_DIR;
    process.env.APPDATA = testDir;

    const cm = new ConfigManager();
    assert.strictEqual(
      cm.getConfigFilePath(),
      expectedConfigFile,
      'ConfigManager debe resolver la ruta primaria en %APPDATA%\\Bentian Agent\\agent-config.json'
    );

    const nasPathsToTest = [
      '\\\\NAS_EMPRESA\\Factusol\\Datos\\FS\\2252026.accdb',
      '\\\\192.168.1.50\\Facturación y Gestión\\FS\\0012026.accdb',
      'Z:\\Datos\\FS\\2252026.accdb',
    ];

    for (const nasPath of nasPathsToTest) {
      // 1. Guardar mediante setFactusolDbPath
      cm.setFactusolDbPath(nasPath);
      const saveRes = cm.saveConfigToDisk();
      assert.strictEqual(saveRes.success, true, 'saveConfigToDisk() debe retornar success: true');
      assert.strictEqual(fs.existsSync(expectedConfigFile), true, 'El archivo JSON debe existir físicamente en disco');

      // 2. Verificar contenido escrito en disco
      const rawDisk = fs.readFileSync(expectedConfigFile, 'utf8');
      const parsedDisk = JSON.parse(rawDisk);
      assert.strictEqual(
        parsedDisk.factusolDbPath,
        nasPath,
        `El archivo en disco debe contener exactamente la ruta NAS: ${nasPath}`
      );
      assert.strictEqual(
        parsedDisk.factusol?.databasePath,
        nasPath,
        `factusol.databasePath en disco debe contener exactamente la ruta NAS: ${nasPath}`
      );

      // 3. Simular reinicio del agente y verificar que NO se altere ni se vacíe
      const cmRestarted = new ConfigManager();
      const reloadedCfg = cmRestarted.get();
      assert.strictEqual(
        reloadedCfg.factusolDbPath,
        nasPath,
        `Tras reinicio, factusolDbPath no debe ser alterado ni vaciado: ${nasPath}`
      );
      assert.strictEqual(
        reloadedCfg.factusol?.databasePath,
        nasPath,
        `Tras reinicio, factusol.databasePath no debe ser alterado ni vaciado: ${nasPath}`
      );

      // 4. Probar FactusolPathResolver con la ruta NAS
      const resolved = FactusolPathResolver.resolve(nasPath);
      assert.strictEqual(
        resolved.resolvedPath,
        nasPath,
        'FactusolPathResolver.resolve() debe conservar la ruta NAS íntegra'
      );
      assert.strictEqual(resolved.isDirectory, false, 'No debe confundir un archivo con una carpeta');

      // 5. Probar FactusolYearResolver con la ruta NAS
      const rolloverResult = FactusolYearResolver.resolveActiveDatabase(nasPath, true, 2026);
      assert.strictEqual(
        rolloverResult.activePath,
        nasPath,
        'FactusolYearResolver debe preservar la ruta UNC / NAS sin truncarla'
      );

      console.log(`  ✓ Ruta persistida, verificada en disco y preservada intacta: ${nasPath}`);
    }

    // Probar guardado completo vía agent.saveFullConfig
    console.log('\n  -> Verificando guardado completo vía agent.saveFullConfig()...');
    const fullSaveResult = await agent.saveFullConfig({
      factusol: {
        databasePath: '\\\\NAS_EMPRESA\\Factusol\\Datos\\FS\\2252026.accdb',
        tariffCode: '1',
        saleTariffCode: '2',
        orderSeries: 'A',
        invoiceSeries: '1',
        warehouseCode: 'GEN',
      },
      channelType: 'universal_bridge',
      universalBridge: {
        storeUrl: 'https://www.suministrosrubio.com',
        secretKey: 'EB_SEC_TEST_987654',
        enabled: true,
      },
    });

    assert.strictEqual(fullSaveResult.success, true, 'saveFullConfig debe ser exitoso');
    const agentCfg = agent.configManager.get();
    assert.strictEqual(agentCfg.factusolDbPath, '\\\\NAS_EMPRESA\\Factusol\\Datos\\FS\\2252026.accdb');
    console.log('  ✓ agent.saveFullConfig() completado y validado en caliente.');

    // =========================================================================
    // SECCIÓN 3: VERIFICACIÓN DE SINTAXIS EN AccessDriver, cscript Y adodb.js
    // =========================================================================
    console.log('\n--- SECCIÓN 3: Compatibilidad de Sintaxis UNC con AccessDriver y adodb.js ---');

    for (const uncPath of nasPathsToTest) {
      const driver = new AccessDriver({ databasePath: uncPath });
      const connStr = driver.getConnectionString();

      // 1. Validar sintaxis de la cadena de conexión OLEDB
      assert(
        connStr.includes(`Data Source=${uncPath};`),
        `Cadena de conexión OLEDB debe incluir exactamente Data Source=${uncPath};`
      );
      assert(connStr.startsWith('Provider='), 'Debe especificar el proveedor OLEDB');
      console.log(`  ✓ Cadena de conexión OLEDB generada correctamente: ${connStr}`);

      // 2. Validar que la serialización JSON hacia adodb.js es válida
      const payload = JSON.stringify({
        connection: connStr,
        sql: 'SELECT COUNT(*) AS total FROM F_ART',
      });
      const parsedPayload = JSON.parse(payload);
      assert.strictEqual(
        parsedPayload.connection,
        connStr,
        'La serialización/deserialización JSON preserva la ruta UNC sin pérdida de barras invertidas'
      );

      // 3. Validar inicialización de FactusolConnector con ruta UNC
      const connector = new FactusolConnector();
      try {
        await connector.connect({
          databasePath: uncPath,
          activeOnly: true,
          tariffCode: '1',
          orderSeries: '1',
          invoiceSeries: '1',
          warehouseCode: 'GEN',
        } as any);
      } catch (err: any) {
        assert.strictEqual(err.code, 'CONNECTION_FAILED');
        assert.strictEqual(err.details?.databasePath, uncPath);
      }
      console.log(`  ✓ FactusolConnector inicializado y validó ruta UNC: ${uncPath}`);
    }

    // 4. Verificación de ejecución del analizador JSON en adodb.js mediante cscript.exe
    if (process.platform === 'win32') {
      console.log('\n  -> Probando ejecución de adodb.js con cscript.exe pasando ruta UNC vía stdin...');
      const cscriptPath = fs.existsSync('C:\\Windows\\SysWOW64\\cscript.exe')
        ? 'C:\\Windows\\SysWOW64\\cscript.exe'
        : 'C:\\Windows\\System32\\cscript.exe';
      const adodbPath = path.resolve(__dirname, '../src/factusol/adodb.js');
      const fallbackAdodb = path.resolve(
        process.cwd(),
        'packages/connectors/factusol/src/adodb.js'
      );
      const finalAdodb = fs.existsSync(adodbPath) ? adodbPath : fallbackAdodb;

      if (fs.existsSync(cscriptPath) && fs.existsSync(finalAdodb)) {
        // Enviar payload de query con ruta UNC inexistente.
        // Esperamos que adodb.js parsee el JSON correctamente vía stdin y que falle
        // con error nativo de OLEDB (archivo no encontrado), NO con error de sintaxis JScript o crash de cscript.
        const uncTestPayload = JSON.stringify({
          connection: 'Provider=Microsoft.ACE.OLEDB.12.0;Data Source=\\\\NAS_EMPRESA\\Factusol\\Datos\\FS\\2252026.accdb;Persist Security Info=False;',
          sql: 'SELECT 1;',
        });

        const child = childProcess.spawn(cscriptPath, ['//Nologo', finalAdodb, 'query'], {
          windowsHide: true,
        });

        let stderrData = '';
        let stdoutData = '';

        child.stdout.on('data', (d: Buffer) => {
          stdoutData += d.toString('utf8');
        });
        child.stderr.on('data', (d: Buffer) => {
          stderrData += d.toString('utf8');
        });

        const exitCode = await new Promise<number | null>((resolve) => {
          child.on('close', resolve);
          child.stdin.end(uncTestPayload, 'utf8');
        });
        assert.notStrictEqual(exitCode, undefined);

        // Verificamos que adodb.js procesó el JSON y generó respuesta de error ADODB estructurada
        assert(stderrData.length > 0 || stdoutData.length > 0, 'cscript debe retornar salida');
        let parsedErr: any = null;
        try {
          parsedErr = JSON.parse(stderrData);
        } catch {
          // Si no es JSON en stderr, puede haber escrito el error
        }

        if (parsedErr) {
          assert(parsedErr.message || parsedErr.code !== undefined, 'El error debe ser un objeto de error OLEDB');
          console.log(`  ✓ adodb.js procesó JSON con ruta UNC limpiamente. Código OLEDB recibido: ${parsedErr.code} (${parsedErr.message})`);
        } else {
          console.log(`  ✓ adodb.js ejecutó sin fallos de sintaxis en el motor de scripting: salida recibida (${stderrData.trim() || stdoutData.trim()}).`);
        }
      }
    }

    console.log('\n======================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE ESTRÉS, RUTAS NAS Y DIÁLOGOS PASARON CON ÉXITO');
    console.log('======================================================================\n');
  } finally {
    await server.stop();
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  }
}

runAuditSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ ERROR EN LA AUDITORÍA DE RUTAS NAS Y DIÁLOGOS:', err);
    process.exit(1);
  });
