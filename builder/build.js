const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const childProcess = require('child_process');
const { buildAgentBundle } = require('./build-bundle');
const { buildExecutable } = require('./build-exe');
const { getCurrentVersion, calculateNextVersion, applyVersionToAll, checkVersionSync } = require('./version');

function calculateSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function findInnoCompiler() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Inno Setup 6', 'ISCC.exe'),
    'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe',
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Check in PATH
  try {
    const which = childProcess.execSync('where ISCC.exe', { encoding: 'utf8' }).trim().split('\r\n')[0];
    if (which && fs.existsSync(which)) return which;
  } catch {}

  return null;
}

async function runMasterBuild() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const builderDir = __dirname;
  const rootDir = path.resolve(builderDir, '..');

  let version = getCurrentVersion();

  if (args[0]) {
    const bumpArg = args[0].toLowerCase().trim();
    if (bumpArg === 'patch' || bumpArg === 'minor' || bumpArg === 'major') {
      const nextVer = calculateNextVersion(version, bumpArg);
      applyVersionToAll(nextVer);
      version = nextVer;
    } else {
      // Explicit version specified by user
      const nextVer = calculateNextVersion('', bumpArg);
      applyVersionToAll(nextVer);
      version = nextVer;
    }
  } else {
    // Validate that current versions are in sync before building
    if (!checkVersionSync()) {
      throw new Error('Discrepancia detectada en versiones del monorepo. Ejecute "node version.js sync" primero.');
    }
  }

  const distDir = path.resolve(builderDir, 'dist');
  const releasesDir = path.resolve(rootDir, 'releases');
  const versionReleaseDir = path.resolve(releasesDir, `v${version}`);

  console.log('\n================================================================');
  console.log(`   BENTIAN AGENT MASTER BUILDER — RELEASE v${version}            `);
  console.log('================================================================\n');

  if (!fs.existsSync(versionReleaseDir)) {
    fs.mkdirSync(versionReleaseDir, { recursive: true });
  }

  // 1. Bundle JS
  console.log('>>> [1/5] Compilando JavaScript Bundle...');
  await buildAgentBundle({ outDir: distDir });

  // 2. Native Windows Executable
  console.log('>>> [2/5] Generando Ejecutable Nativo BentianAgent.exe...');
  const exeResult = await buildExecutable({ distDir, forceRebuild: false });

  // 3. Inno Setup Installer
  console.log('>>> [3/5] Compilando Instalador de Windows (Inno Setup)...');
  const isccPath = findInnoCompiler();
  let installerPath = null;

  if (isccPath) {
    const issFile = path.resolve(builderDir, 'installer.iss');
    console.log(`    Compilador Inno encontrado en: ${isccPath}`);
    console.log(`    Plantilla: ${issFile}`);
    console.log(`    Destino: ${versionReleaseDir}`);

    const isccCmd = `"${isccPath}" /Qp /DAppVersion="${version}" /DSourceDir="${distDir}" /DOutputDir="${versionReleaseDir}" "${issFile}"`;
    childProcess.execSync(isccCmd, { stdio: 'inherit' });

    installerPath = path.resolve(versionReleaseDir, `Bentian-Setup-v${version}.exe`);
    if (fs.existsSync(installerPath)) {
      const instStats = fs.statSync(installerPath);
      console.log(`    ✓ Instalador generado: ${installerPath} (${(instStats.size / (1024 * 1024)).toFixed(2)} MB)`);
    } else {
      console.warn('    ⚠️ No se encontró el instalador generado en la ruta esperada.');
    }
  } else {
    console.warn('    ⚠️ No se encontró ISCC.exe. Instalador omitido (ejecutable directo listo).');
  }

  // 4. Copiar archivos portables a la carpeta de release
  console.log('>>> [4/5] Organizando entregables en releases/v' + version + '...');
  const targetExe = path.resolve(versionReleaseDir, 'BentianAgent.exe');
  const targetAdodb = path.resolve(versionReleaseDir, 'adodb.js');

  fs.copyFileSync(exeResult.exePath, targetExe);
  fs.copyFileSync(exeResult.adodbPath, targetAdodb);

  // 5. Checksums y Manifest
  console.log('>>> [5/5] Calculando hashes criptográficos SHA-256 y Manifest...');
  const exeHash = calculateSha256(targetExe);
  const adodbHash = calculateSha256(targetAdodb);
  const exeStats = fs.statSync(targetExe);

  let installerHash = null;
  let installerSize = 0;
  if (installerPath && fs.existsSync(installerPath)) {
    installerHash = calculateSha256(installerPath);
    installerSize = fs.statSync(installerPath).size;
  }

  // Checksums.txt
  let checksumsContent = `# BENTIAN AGENT v${version} — SHA-256 CHECKSUMS\n`;
  checksumsContent += `# Generado: ${new Date().toISOString()}\n\n`;
  checksumsContent += `${exeHash} *BentianAgent.exe\n`;
  checksumsContent += `${adodbHash} *adodb.js\n`;
  if (installerHash) {
    checksumsContent += `${installerHash} *Bentian-Setup-v${version}.exe\n`;
  }
  fs.writeFileSync(path.resolve(versionReleaseDir, 'checksums.txt'), checksumsContent, 'utf8');

  // Firma digital Ed25519 del ejecutable
  const privateKeyPath = path.resolve(__dirname, 'keys', 'update-private.pem');
  let exeSignature = '';
  if (fs.existsSync(privateKeyPath)) {
    const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
    const exeBuffer = fs.readFileSync(targetExe);
    exeSignature = crypto.sign(null, exeBuffer, privateKeyPem).toString('base64');
    console.log('  🔒 Firma digital Ed25519 generada correctamente.');
  } else {
    console.warn('  ⚠️ Clave privada de actualización no encontrada en builder/keys/update-private.pem. Usando fallback.');
    exeSignature = exeHash;
  }

  // Manifest.json
  const downloadBase = process.env.RELEASES_DOWNLOAD_BASE_URL || '/releases';
  const manifest = {
    version,
    channel: 'stable',
    platform: 'win32_x64',
    downloadUrl: `${downloadBase}/v${version}/BentianAgent.exe`,
    sha256: exeHash,
    signature: exeSignature,
    fileSize: exeStats.size,
    releaseNotes: `Lanzamiento oficial Bentian Agent v${version} - Sincronización Factusol & WooCommerce`,
    mandatory: false,
    minVersion: '0.1.0',
    publishedAt: new Date().toISOString(),
    installer: installerPath ? {
      filename: `Bentian-Setup-v${version}.exe`,
      downloadUrl: `${downloadBase}/v${version}/Bentian-Setup-v${version}.exe`,
      sha256: installerHash,
      fileSize: installerSize
    } : null
  };

  fs.writeFileSync(
    path.resolve(versionReleaseDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  // releases/latest.json
  fs.writeFileSync(
    path.resolve(releasesDir, 'latest.json'),
    JSON.stringify({
      latestVersion: version,
      publishedAt: manifest.publishedAt,
      manifestUrl: `${downloadBase}/v${version}/manifest.json`,
      stable: manifest
    }, null, 2),
    'utf8'
  );

  // Publicar automáticamente en Core API si está disponible
  const apiPublishUrl = process.env.CORE_API_URL || 'http://localhost:3000';
  try {
    const pubRes = await fetch(`${apiPublishUrl}/api/v1/updates/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest),
      signal: AbortSignal.timeout(4000)
    });
    if (pubRes.ok) {
      console.log(`  🌐 Manifiesto publicado automáticamente en Core API (${apiPublishUrl}/api/v1/updates/publish)`);
    } else {
      console.log(`  ℹ️ Core API respondió HTTP ${pubRes.status} al publicar el manifiesto.`);
    }
  } catch {
    console.log(`  ℹ️ Core API no disponible en ${apiPublishUrl}. Manifiesto guardado localmente para distribución.`);
  }

  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n================================================================');
  console.log(`   🎉 RELEASE v${version} COMPLETADA EXITOSAMENTE (${totalSeconds}s) `);
  console.log('================================================================');
  console.log(`Directorio de salida: ${versionReleaseDir}`);
  if (installerPath && fs.existsSync(installerPath)) {
    console.log(`  📦 Instalador: Bentian-Setup-v${version}.exe`);
  }
  console.log(`  🚀 Ejecutable: BentianAgent.exe`);
  console.log(`  📄 Driver:     adodb.js`);
  console.log(`  🔒 Integridad: checksums.txt`);
  console.log(`  🔄 Updater:    manifest.json`);
  console.log('================================================================\n');
}

if (require.main === module) {
  runMasterBuild().catch(err => {
    console.error('\n❌ ERROR EN MASTER BUILDER:', err);
    process.exit(1);
  });
}

module.exports = { runMasterBuild };
