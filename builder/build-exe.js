const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const { inject } = require('./node_modules/postject');
const { buildAgentBundle } = require('./build-bundle');

async function buildExecutable(options = {}) {
  const startTime = Date.now();
  console.log('\n======================================================');
  console.log('   BENTIAN AGENT BUILDER — PASO 2: NATIVE EXE (.exe) ');
  console.log('======================================================\n');

  const builderDir = __dirname;
  const distDir = options.distDir || path.resolve(builderDir, 'dist');
  const bundlePath = path.resolve(distDir, 'bentian-agent.bundle.cjs');
  const blobPath = path.resolve(distDir, 'sea-prep.blob');
  const seaConfigPath = path.resolve(distDir, 'sea-config.json');
  const exePath = path.resolve(distDir, 'BentianAgent.exe');
  const adodbSource = path.resolve(builderDir, '../packages/connectors/factusol/src/adodb.js');
  const adodbDest = path.resolve(distDir, 'adodb.js');

  console.log('[1/5] Compilando bundle JS actualizado...');
  await buildAgentBundle({ outDir: distDir });

  console.log('[2/5] Generando configuración Single Executable Application (SEA)...');
  const seaConfig = {
    main: 'bentian-agent.bundle.cjs',
    output: 'sea-prep.blob',
    disableExperimentalSEAWarning: true
  };
  fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2));

  console.log('[3/5] Compilando blob binario V8 snapshot (sea-prep.blob)...');
  childProcess.execSync('node --experimental-sea-config sea-config.json', {
    cwd: distDir,
    stdio: 'inherit'
  });

  console.log(`[4/5] Clonando host ejecutable desde: ${process.execPath}...`);
  fs.copyFileSync(process.execPath, exePath);

  // Inyectar icono personalizado y metadatos de producto ANTES de postject
  const iconPath = path.resolve(distDir, 'icon.ico');
  applyCustomIconAndMetadata(exePath, iconPath);

  console.log('[5/5] Inyectando blob en BentianAgent.exe mediante postject...');
  const blobBuffer = fs.readFileSync(blobPath);
  await inject(exePath, 'NODE_SEA_BLOB', blobBuffer, {
    sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    overwrite: true
  });

  // Parchear PE Header a IMAGE_SUBSYSTEM_WINDOWS_GUI (0x0002) para eliminar 100% la consola negra
  patchPeSubsystemToGui(exePath);

  // Compilar System Tray nativo de Windows (BentianTray.exe)
  const trayExe = compileSystemTray(distDir);

  // Asegurar que adodb.js acompaña al ejecutable
  if (!fs.existsSync(adodbDest)) {
    fs.copyFileSync(adodbSource, adodbDest);
  }

  const stats = fs.statSync(exePath);
  const durationMs = Date.now() - startTime;
  console.log(`\n✓ Ejecutable nativo generado con éxito en: ${exePath}`);
  console.log(`  Tamaño: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Driver OLEDB adodb.js presente: ${fs.existsSync(adodbDest)}`);
  console.log(`  System Tray BentianTray.exe presente: ${fs.existsSync(path.resolve(distDir, 'BentianTray.exe'))}`);
  console.log(`  Tiempo: ${(durationMs / 1000).toFixed(2)}s\n`);

  // Smoke test de verificación inmediata
  console.log('--- Verificando ejecución nativa (BentianAgent.exe status) ---');
  const testOutput = childProcess.execSync(`"${exePath}" status`, { encoding: 'utf8' });
  console.log(testOutput.trim());
  console.log('------------------------------------------------------------\n');

  return {
    exePath,
    adodbPath: adodbDest,
    trayPath: trayExe || path.resolve(distDir, 'BentianTray.exe'),
    sizeBytes: stats.size
  };
}
function patchPeSubsystemToGui(exePath) {
  const fd = fs.openSync(exePath, 'r+');
  try {
    const eLfanewBuf = Buffer.alloc(4);
    fs.readSync(fd, eLfanewBuf, 0, 4, 0x3C);
    const peOffset = eLfanewBuf.readUInt32LE(0);

    const peSigBuf = Buffer.alloc(4);
    fs.readSync(fd, peSigBuf, 0, 4, peOffset);
    if (peSigBuf.toString('ascii') !== 'PE\0\0') {
      throw new Error(`Firma PE inválida en offset 0x${peOffset.toString(16)}: ${peSigBuf.toString('hex')}`);
    }

    const subsystemOffset = peOffset + 24 + 68;
    const subBuf = Buffer.alloc(2);
    fs.readSync(fd, subBuf, 0, 2, subsystemOffset);
    const currentSubsystem = subBuf.readUInt16LE(0);

    console.log(`[PE Patcher] Subsistema PE actual: 0x${currentSubsystem.toString(16).padStart(4, '0')} (${currentSubsystem === 3 ? 'CUI / Consola' : currentSubsystem === 2 ? 'GUI' : 'Otro'})`);

    if (currentSubsystem !== 2) {
      subBuf.writeUInt16LE(2, 0);
      fs.writeSync(fd, subBuf, 0, 2, subsystemOffset);
      console.log(`[PE Patcher] ✓ Subsistema parcheado a IMAGE_SUBSYSTEM_WINDOWS_GUI (0x0002). ¡Ventana cmd eliminada al 100%!`);
    } else {
      console.log('[PE Patcher] ✓ El binario ya tiene subsistema GUI.');
    }
  } finally {
    fs.closeSync(fd);
  }
}

function applyCustomIconAndMetadata(targetExe, iconPath) {
  const rcedit = path.win32.normalize(path.resolve(__dirname, 'tools/rcedit-x64.exe'));
  const normExe = path.win32.normalize(targetExe);
  const normIcon = path.win32.normalize(iconPath);

  if (fs.existsSync(rcedit) && fs.existsSync(normIcon)) {
    try {
      const { getCurrentVersion } = require('./version');
      const v = getCurrentVersion();
      console.log(`  [rcedit] Incrustando icono personalizado y metadatos de producto (v${v})...`);
      const cmd = `"${rcedit}" "${normExe}" --set-icon "${normIcon}" --set-version-string FileDescription "Bentian ERP Bridge Agent" --set-version-string ProductName "Bentian ERP Bridge" --set-version-string CompanyName "Bentian" --set-file-version ${v}.0 --set-product-version ${v}.0`;
      childProcess.execSync(cmd, { stdio: 'ignore' });
      console.log('  ✓ Icono y metadatos incrustados con éxito en BentianAgent.exe.');
    } catch (err) {
      console.warn('  [rcedit] Advertencia al inyectar icono en exe:', err.message);
    }
  } else {
    console.log('  [rcedit] Info: rcedit o icon.ico no encontrados, omitiendo inyección.');
  }
}

function compileSystemTray(distDir) {
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  const traySource = path.win32.normalize(path.resolve(__dirname, '../apps/agent/src/gui/tray/BentianTray.cs'));
  const trayDest = path.win32.normalize(path.resolve(distDir, 'BentianTray.exe'));
  const iconPath = path.win32.normalize(path.resolve(distDir, 'icon.ico'));

  if (!fs.existsSync(cscPath) || !fs.existsSync(traySource)) {
    console.log('[Tray Builder] Advertencia: csc.exe o BentianTray.cs no encontrados.');
    return null;
  }

  const iconFlag = fs.existsSync(iconPath) ? `/win32icon:"${iconPath}"` : '';
  const cmd = `"${cscPath}" /target:winexe ${iconFlag} /out:"${trayDest}" /r:System.Windows.Forms.dll /r:System.Drawing.dll "${traySource}"`;

  try {
    childProcess.execSync(cmd, { stdio: 'ignore' });
    if (fs.existsSync(trayDest)) {
      const stats = fs.statSync(trayDest);
      console.log(`[Tray Builder] ✓ BentianTray.exe compilado con éxito (${(stats.size / 1024).toFixed(1)} KB)`);
      return trayDest;
    }
  } catch (err) {
    console.error('[Tray Builder] Error compilando BentianTray.exe:', err.message);
  }
  return null;
}

if (require.main === module) {
  buildExecutable().catch(err => {
    console.error('ERROR EN BUILD-EXE:', err);
    process.exit(1);
  });
}

module.exports = { buildExecutable, patchPeSubsystemToGui, compileSystemTray };
