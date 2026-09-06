#!/usr/bin/env node
if (process.platform === 'win32') {
  process.stdout?.on('error', () => {});
  process.stderr?.on('error', () => {});
}
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { LocalAgent } from './agent';
import { FactusolDetector } from './detector';
import { LocalGuiServer, openDesktopWindow, openWindowsFileDialog } from './gui';

async function promptUserForInput(promptMessage: string, windowTitle: string): Promise<string> {
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(`${promptMessage} `, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
  try {
    const escapedMsg = promptMessage.replace(/'/g, "''");
    const escapedTitle = windowTitle.replace(/'/g, "''");
    const psCmd = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('${escapedMsg}', '${escapedTitle}')`;
    const res = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf8' }).trim();
    return res;
  } catch {
    return '';
  }
}

function getCliArgs(): string[] {
  const raw = process.argv.slice(1);
  return raw.filter((arg) => {
    const lower = arg.toLowerCase().trim();
    return !lower.endsWith('.exe') && !lower.endsWith('.cjs') && !lower.endsWith('.js') && !lower.endsWith('.ts');
  });
}

async function main() {
  const args = getCliArgs();
  const command = args[0] || 'start';

  console.log('\n=============================================');
  console.log('       ERP BRIDGE — LOCAL AGENT CLI           ');
  console.log('=============================================\n');

  switch (command) {
    case 'scan': {
      console.log('🔍 Escaneando bases de datos Factusol en el equipo...\n');
      const detected = FactusolDetector.detectAll();
      if (detected.length === 0) {
        console.log('⚠️ No se encontraron archivos Factusol en las rutas estándar.');
      } else {
        console.log(`✓ Se han encontrado ${detected.length} base(s) de datos Factusol:`);
        detected.forEach((inst, idx) => {
          console.log(`  [${idx + 1}] Archivo: ${inst.databasePath}`);
          console.log(`      Empresa: ${inst.companyCode || 'N/A'} | Ejercicio: ${inst.year || 'N/A'} | Tamaño: ${(inst.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
        });
      }
      process.exit(0);
      break;
    }

    case 'set-db': {
      let dbPath = args[1];
      if (!dbPath) {
        console.log('Abriendo selector de archivos de Windows...');
        dbPath = openWindowsFileDialog(
          'Seleccione el archivo de base de datos Factusol (FS.accdb o F_XXX.accdb)',
          'Bases de datos Factusol (*.accdb;*.mdb)|*.accdb;*.mdb|Todos los archivos (*.*)|*.*'
        );
      }
      if (!dbPath) {
        dbPath = await promptUserForInput(
          '📂 Ingrese la ruta completa al archivo Factusol (.accdb):',
          'Configurar Base de Datos Factusol'
        );
      }
      if (!dbPath) {
        console.error('❌ Error: No se ha seleccionado ninguna ruta de base de datos.');
        console.error('Uso: erp-bridge-agent set-db [RUTA_AL_ARCHIVO_ACCDB]\n');
        process.exit(1);
      }
      const agent = new LocalAgent();
      try {
        agent.setFactusolDbPath(dbPath);
        console.log('\n🎉 ¡Base de datos Factusol configurada con éxito!');
        console.log(`   Ruta: ${dbPath}\n`);
        process.exitCode = 0;
        return;
      } catch (err: unknown) {
        console.error('\n❌ Error al configurar la base de datos Factusol:', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }
    }

    case 'set-api': {
      let apiUrl = args[1];
      if (!apiUrl) {
        apiUrl = await promptUserForInput(
          '🌐 Ingrese la URL del servidor API (ej. https://api.bentian.es):',
          'Configurar Servidor API - Bentian Agent'
        );
      }
      if (!apiUrl) {
        console.error('❌ Error: Debes especificar la URL del servidor API.');
        console.error('Uso: erp-bridge-agent set-api <URL>\n');
        process.exitCode = 1;
        return;
      }
      const agent = new LocalAgent();
      try {
        agent.setApiBaseUrl(apiUrl);
        console.log('\n🎉 ¡Servidor API configurado con éxito!');
        console.log(`   URL: ${apiUrl}\n`);
        process.exitCode = 0;
        return;
      } catch (err: unknown) {
        console.error('\n❌ Error al configurar la URL del servidor:', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }
    }

    case 'pair': {
      let token = args[1];
      if (!token) {
        token = await promptUserForInput(
          '🔗 Ingrese el código de emparejamiento con el servidor:',
          'Emparejamiento Bentian Agent'
        );
      }
      if (!token) {
        console.error('❌ Error: Debes especificar el código de emparejamiento.');
        console.error('Uso: erp-bridge-agent pair <TOKEN> [NOMBRE_AGENTE]\n');
        process.exitCode = 1;
        return;
      }
      const customName = args[2];
      const agent = new LocalAgent();
      try {
        const result = await agent.pair(token, customName);
        console.log('\n🎉 ¡Emparejamiento completado con éxito!');
        console.log(`   Agent ID: ${result.agentId}`);
        console.log(`   Factusol detectado: ${result.detectedFactusol.length} instancia(s)`);
        console.log('\nPara iniciar el servicio ejecute:');
        console.log('   pnpm start (o ejecute el comando como servicio)\n');
        process.exitCode = 0;
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('\n❌ Fallo al emparejar el agente:', msg);
        process.exitCode = 1;
        return;
      }
    }

    case 'status': {
      const agent = new LocalAgent();
      const info = agent.getSystemInfo();
      const hwid = await agent.getHWID();
      const lic = await agent.validateLicense();

      console.log('📊 Telemetría del Sistema Local:');
      console.log(`   Host: ${info.hostname}`);
      console.log(`   OS: ${info.platform} ${info.osVersion} (${info.arch})`);
      console.log(`   CPUs: ${info.cpuCores} núcleos`);
      console.log(`   Memoria: ${info.memoryFreeMb} MB libres / ${info.memoryTotalMb} MB total`);
      console.log(`   Node.js: ${info.nodeVersion}`);
      console.log(`   HWID: ${hwid.substring(0, 24)}...`);
      console.log(`   Licencia: ${lic.status}${lic.plan ? ` (Plan: ${lic.plan})` : ''}\n`);
      process.exitCode = 0;
      return;
    }

    case 'activate': {
      let key = args[1];
      if (!key) {
        key = await promptUserForInput(
          '🔑 Ingrese su clave de licencia Bentian (EB-XXXXX-XXXXX-XXXXX-XXXXX):',
          'Activación de Licencia - Bentian Agent'
        );
      }
      if (!key) {
        console.error('❌ Error: No se ha introducido ninguna clave de licencia.');
        console.error('Uso: erp-bridge-agent activate [EB-XXXXX-XXXXX-XXXXX-XXXXX]\n');
        process.exit(1);
      }
      const agent = new LocalAgent();
      try {
        const res = await agent.activateLicense(key);
        if (res.success) {
          console.log('\n🎉 ¡Licencia activada con éxito!');
          console.log(`   Plan: ${res.plan}`);
          console.log(`   Expira: ${res.expiresAt || 'Sin expiración'}`);
          console.log(`   Período de gracia offline: ${res.gracePeriodDays || 7} días\n`);
          process.exitCode = 0;
          return;
        } else {
          console.error('\n❌ No se pudo activar la licencia:', res.error);
          process.exitCode = 1;
          return;
        }
      } catch (err: unknown) {
        console.error('\n❌ Error al comunicarse con el servidor:', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }
    }

    case 'deactivate': {
      const key = args[1];
      const agent = new LocalAgent();
      try {
        await agent.deactivateLicense(key);
        console.log('\n✓ Licencia desactivada correctamente de este equipo.\n');
        process.exitCode = 0;
        return;
      } catch (err: unknown) {
        console.error('\n❌ Error al desactivar:', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }
    }

    case 'license-info': {
      const agent = new LocalAgent();
      const hwid = await agent.getHWID();
      const lic = await agent.validateLicense();
      console.log('🔑 Información de Licencia:');
      console.log(`   HWID de la máquina: ${hwid}`);
      console.log(`   Estado: ${lic.status}`);
      console.log(`   Plan: ${lic.plan || 'Ninguno'}`);
      if (lic.message) console.log(`   Detalle: ${lic.message}`);
      console.log('');
      process.exitCode = 0;
      return;
    }

    case 'gui':
    case 'start':
    default: {
      const isHeadless = args.includes('--headless') || process.env['HEADLESS'] === 'true';
      const agent = new LocalAgent();
      await agent.start();

      let guiServer: LocalGuiServer | null = null;
      if (!isHeadless) {
        guiServer = new LocalGuiServer(agent);
        const { url } = await guiServer.start();
        console.log(`\n🖥️ Interfaz gráfica de escritorio lista en: ${url}`);
        openDesktopWindow(url);
      }

      console.log('💡 Agente local ejecutándose en segundo plano. Presione Ctrl+C para detener.\n');

      process.on('SIGINT', async () => {
        console.log('\nDeteniendo agente local...');
        if (guiServer) {
          await guiServer.stop();
        }
        await agent.stop();
        process.exit(0);
      });
      break;
    }
  }
}

export { LocalAgent, LocalGuiServer, FactusolDetector, openDesktopWindow, openWindowsFileDialog };

if (!process.env['ERP_BRIDGE_TEST_MODE']) {
  main().catch((err) => {
    console.error('Error no controlado en CLI:', err);
    process.exit(1);
  });
}
