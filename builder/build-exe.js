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

  console.log('[5/5] Inyectando blob en BentianAgent.exe mediante postject...');
  const blobBuffer = fs.readFileSync(blobPath);
  await inject(exePath, 'NODE_SEA_BLOB', blobBuffer, {
    sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    overwrite: true
  });

  // Asegurar que adodb.js acompaña al ejecutable
  if (!fs.existsSync(adodbDest)) {
    fs.copyFileSync(adodbSource, adodbDest);
  }

  const stats = fs.statSync(exePath);
  const durationMs = Date.now() - startTime;
  console.log(`\n✓ Ejecutable nativo generado con éxito en: ${exePath}`);
  console.log(`  Tamaño: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Driver OLEDB adodb.js presente: ${fs.existsSync(adodbDest)}`);
  console.log(`  Tiempo: ${(durationMs / 1000).toFixed(2)}s\n`);

  // Smoke test de verificación inmediata
  console.log('--- Verificando ejecución nativa (BentianAgent.exe status) ---');
  const testOutput = childProcess.execSync(`"${exePath}" status`, { encoding: 'utf8' });
  console.log(testOutput.trim());
  console.log('------------------------------------------------------------\n');

  return {
    exePath,
    adodbPath: adodbDest,
    sizeBytes: stats.size
  };
}

if (require.main === module) {
  buildExecutable().catch(err => {
    console.error('ERROR EN BUILD-EXE:', err);
    process.exit(1);
  });
}

module.exports = { buildExecutable };
