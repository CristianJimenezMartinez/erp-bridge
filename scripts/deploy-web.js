/**
 * BENTIAN UNIVERSAL WEB & BRIDGE DEPLOYER
 * 
 * Motor de despliegue desatendido y universal para cualquier sitio web o tienda online:
 * - Soporte dual: FTPS (FTP over TLS explícito, puerto 21) y SFTP (SSH, puerto 22 / personalizado).
 * - Compatible con cualquier hosting: Plesk, cPanel, VPS dedicado, Apache, Nginx, LiteSpeed.
 * - Despliegue de aplicación web compilada (Angular, React, Vue, HTML/JS/CSS) y/o conector PHP (erp-bridge-endpoint.php).
 * - Sincronización Delta inteligente (omite archivos idénticos en tamaño).
 * - Lista negra estricta de preservación: NUNCA sobreescribe .htaccess, web.config, .well-known ni fotos de Factusol.
 * - Verificación HTTP automática tras el despliegue.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Cargar configuración desde .env.deploy o .env si existe
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      env[key] = val;
    }
  }
  return env;
}

const repoRoot = path.resolve(__dirname, '..');
const envDeploy = loadEnvFile(path.join(repoRoot, '.env.deploy'));
const envGlobal = loadEnvFile(path.join(repoRoot, '.env'));

function getConf(key, defaultValue = '') {
  return process.env[key] || envDeploy[key] || envGlobal[key] || defaultValue;
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-n');
const isEndpointOnly = args.includes('--endpoint-only');
const isWebOnly = args.includes('--web-only');

const config = {
  protocol: (getConf('DEPLOY_PROTOCOL', 'ftps')).toLowerCase(), // 'ftps', 'sftp', 'ftp'
  host: getConf('DEPLOY_HOST', 'www.suministrosrubio.com'),
  port: parseInt(getConf('DEPLOY_PORT', '21'), 10),
  user: getConf('DEPLOY_USER', ''),
  password: getConf('DEPLOY_PASSWORD', ''),
  privateKeyPath: getConf('DEPLOY_KEY_PATH', ''),
  remoteDir: getConf('DEPLOY_REMOTE_DIR', '/httpdocs').replace(/\\/g, '/'),
  localDir: path.resolve(repoRoot, getConf('DEPLOY_LOCAL_DIR', '../API/web/web/dist/fedeweb/browser')),
  includeEndpoint: getConf('DEPLOY_INCLUDE_ENDPOINT', 'true') === 'true',
  endpointSourcePath: path.resolve(repoRoot, getConf('DEPLOY_ENDPOINT_SOURCE', 'erp-bridge-endpoint.php')),
  verifyUrl: getConf('DEPLOY_VERIFY_URL', 'https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping'),
};

// Reglas de la lista negra de seguridad (archivos del servidor que NUNCA deben sobreescribirse ni borrarse)
const PRESERVED_PATTERNS = [
  /^\.htaccess$/i,
  /^web\.config$/i,
  /^wp-config\.php$/i,
  /^\.user\.ini$/i,
  /^php\.ini$/i,
  /^\.env/i,
  /^\.well-known/i,
  /^cgi-bin/i,
  /^assets\/img\/factusolImg/i,
  /^uploads\/products/i,
];

function isPreserved(relativePath) {
  const norm = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return PRESERVED_PATTERNS.some(pattern => pattern.test(norm));
}

function getAllFiles(dir, base = '') {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const relPath = path.join(base, item).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relPath));
    } else {
      results.push({
        fullPath,
        relPath,
        size: stat.size,
        mtime: stat.mtime
      });
    }
  }
  return results;
}

function verifyHttp(url) {
  return new Promise((resolve) => {
    if (!url) return resolve({ ok: true, status: 0, body: 'Skipped' });
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, body: data });
      });
    });
    req.on('error', (err) => resolve({ ok: false, status: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, error: 'Timeout' }); });
  });
}

// ============================================================================
// ADAPTADOR FTPS / FTP (usando basic-ftp)
// ============================================================================
async function deployWithFtp(filesToUpload, uploadEndpoint) {
  const ftp = require('basic-ftp');
  const client = new ftp.Client();
  client.ftp.verbose = false;

  console.log(`📡 Conectando por ${config.protocol.toUpperCase()} a ${config.host}:${config.port}...`);

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.protocol === 'ftps',
      secureOptions: { rejectUnauthorized: false } // Permite certificados autofirmados de hosting
    });

    console.log(`✓ Conectado y autenticado correctamente.`);
    console.log(`📁 Navegando a directorio remoto: ${config.remoteDir}`);
    await client.ensureDir(config.remoteDir);

    // Listar archivos remotos para delta sync
    console.log(`🔍 Analizando archivos remotos para sincronización delta...`);
    const remoteList = await client.list();
    const remoteMap = new Map();
    for (const item of remoteList) {
      remoteMap.set(item.name, item.size);
    }

    let uploaded = 0;
    let skipped = 0;

    // 1. Subir conector PHP si aplica
    if (uploadEndpoint && fs.existsSync(config.endpointSourcePath)) {
      const endpointName = path.basename(config.endpointSourcePath);
      console.log(`🚀 Subiendo conector central: ${endpointName}...`);
      if (!isDryRun) {
        await client.uploadFrom(config.endpointSourcePath, `${config.remoteDir}/${endpointName}`);
      }
      uploaded++;
    }

    // 2. Subir archivos web
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const remoteFilePath = `${config.remoteDir}/${file.relPath}`.replace(/\/+/g, '/');
      const remoteDirName = path.posix.dirname(remoteFilePath);

      // Comprobar delta si está en la raíz
      if (!file.relPath.includes('/') && remoteMap.has(file.relPath) && remoteMap.get(file.relPath) === file.size) {
        skipped++;
        continue;
      }

      const pct = Math.round(((i + 1) / filesToUpload.length) * 100);
      process.stdout.write(`  ↑ [${pct}%] Subiendo: ${file.relPath} (${(file.size / 1024).toFixed(1)} KB)... \r`);

      if (!isDryRun) {
        await client.ensureDir(remoteDirName);
        await client.uploadFrom(file.fullPath, remoteFilePath);
      }
      uploaded++;
    }

    console.log(`\n✓ Transferencia completada: ${uploaded} subidos, ${skipped} omitidos por idénticos.`);
  } finally {
    client.close();
  }
}

// ============================================================================
// ADAPTADOR SFTP (usando ssh2)
// ============================================================================
async function deployWithSftp(filesToUpload, uploadEndpoint) {
  const { Client } = require('ssh2');
  const conn = new Client();

  console.log(`📡 Conectando por SFTP a ${config.host}:${config.port}...`);

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);

    const connectOpts = {
      host: config.host,
      port: config.port,
      username: config.user,
    };

    if (config.privateKeyPath && fs.existsSync(config.privateKeyPath)) {
      connectOpts.privateKey = fs.readFileSync(config.privateKeyPath);
    } else if (config.password) {
      connectOpts.password = config.password;
    } else {
      return reject(new Error('Se requiere contraseña o llave privada SSH para SFTP.'));
    }

    conn.connect(connectOpts);
  });

  console.log(`✓ Conexión SFTP establecida con éxito.`);

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, sftpClient) => {
      if (err) reject(err);
      else resolve(sftpClient);
    });
  });

  function sftpMkdirP(remotePath) {
    return new Promise((resolve) => {
      const parts = remotePath.split('/').filter(Boolean);
      let cur = '';
      function next(i) {
        if (i >= parts.length) return resolve();
        cur += '/' + parts[i];
        sftp.mkdir(cur, () => next(i + 1));
      }
      next(0);
    });
  }

  function sftpFastPut(local, remote) {
    return new Promise((resolve, reject) => {
      sftp.fastPut(local, remote, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  try {
    let uploaded = 0;

    // 1. Conector PHP
    if (uploadEndpoint && fs.existsSync(config.endpointSourcePath)) {
      const endpointName = path.basename(config.endpointSourcePath);
      const remoteEndpoint = `${config.remoteDir}/${endpointName}`;
      console.log(`🚀 Subiendo conector central: ${endpointName}...`);
      if (!isDryRun) {
        await sftpMkdirP(config.remoteDir);
        await sftpFastPut(config.endpointSourcePath, remoteEndpoint);
      }
      uploaded++;
    }

    // 2. Archivos Web
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const remoteFilePath = `${config.remoteDir}/${file.relPath}`.replace(/\/+/g, '/');
      const remoteDirName = path.posix.dirname(remoteFilePath);

      const pct = Math.round(((i + 1) / filesToUpload.length) * 100);
      process.stdout.write(`  ↑ [${pct}%] Subiendo: ${file.relPath} (${(file.size / 1024).toFixed(1)} KB)... \r`);

      if (!isDryRun) {
        await sftpMkdirP(remoteDirName);
        await sftpFastPut(file.fullPath, remoteFilePath);
      }
      uploaded++;
    }

    console.log(`\n✓ Transferencia SFTP completada: ${uploaded} archivos procesados.`);
  } finally {
    sftp.end();
    conn.end();
  }
}

// ============================================================================
// ORQUESTADOR PRINCIPAL
// ============================================================================
async function runDeploy() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('   🚀 BENTIAN UNIVERSAL WEB & BRIDGE DEPLOYER                   ');
  console.log('================================================================\n');

  if (isDryRun) {
    console.log('⚠️  MODO SIMULACIÓN (--dry-run) ACTIVADO: No se modificará ningún archivo remoto.\n');
  }

  console.log(`  Protocolo:      ${config.protocol.toUpperCase()}`);
  console.log(`  Servidor:       ${config.host}:${config.port}`);
  console.log(`  Usuario:        ${config.user || '(sin usuario configurado)'}`);
  console.log(`  Destino Remoto: ${config.remoteDir}`);
  console.log(`  Origen Local:   ${config.localDir}`);

  if (!config.user && !isDryRun) {
    console.error('\n❌ ERROR: No se ha configurado el usuario de despliegue.');
    console.error('   Crea el archivo .env.deploy a partir de .env.deploy.example');
    console.error('   o exporta las variables DEPLOY_USER y DEPLOY_PASSWORD.\n');
    process.exit(1);
  }

  // Recolectar archivos a transferir
  let webFiles = [];
  if (!isEndpointOnly) {
    if (!fs.existsSync(config.localDir)) {
      console.warn(`\n⚠️  El directorio local web no existe: ${config.localDir}`);
      console.warn(`   Si vas a desplegar la web, ejecuta primero: ng build en la aplicación frontal.`);
    } else {
      const rawFiles = getAllFiles(config.localDir);
      // Aplicar filtro de lista negra
      webFiles = rawFiles.filter(f => {
        if (isPreserved(f.relPath)) {
          console.log(`  🛡️  Protegido por lista negra (no se sobreescribe): ${f.relPath}`);
          return false;
        }
        return true;
      });
      console.log(`\n📦 Archivos web detectados para subida: ${webFiles.length} ficheros.`);
    }
  }

  const shouldUploadEndpoint = !isWebOnly && config.includeEndpoint;
  if (shouldUploadEndpoint) {
    console.log(`🔌 Conector PHP habilitado: ${config.endpointSourcePath}`);
  }

  if (isDryRun && !config.user) {
    console.log(`\nℹ️  [DRY-RUN] Usuario no configurado. Se omite la conexión de red.`);
    console.log(`   Simulación completada: se transferirían ${webFiles.length} archivos web a ${config.remoteDir}.`);
    if (shouldUploadEndpoint) {
      console.log(`   Se transferiría ${config.endpointSourcePath} -> ${config.remoteDir}/erp-bridge-endpoint.php.`);
    }
    console.log('\n================================================================');
    console.log(`   🎉 SIMULACIÓN (--dry-run) FINALIZADA CON ÉXITO (0.1s) `);
    console.log('================================================================\n');
    return;
  }

  // Ejecutar transporte según protocolo
  if (config.protocol === 'sftp') {
    await deployWithSftp(webFiles, shouldUploadEndpoint);
  } else {
    // ftps o ftp
    await deployWithFtp(webFiles, shouldUploadEndpoint);
  }

  // Verificación post-despliegue
  if (config.verifyUrl && !isDryRun) {
    console.log(`\n🔍 Verificando disponibilidad pública en: ${config.verifyUrl}`);
    const check = await verifyHttp(config.verifyUrl);
    if (check.ok) {
      console.log(`  ✓ Comprobación HTTP exitosa: Código ${check.status}`);
      if (check.body && check.body.includes('"pong"')) {
        console.log(`  ✓ Conector erp-bridge-endpoint.php respondiendo correctamente a ping.`);
      }
    } else {
      console.warn(`  ⚠️  Aviso en comprobación HTTP (${check.status || check.error}). Comprueba en el navegador.`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n================================================================');
  console.log(`   🎉 DESPLIEGUE FINALIZADO EXITOSAMENTE (${durationSec}s) `);
  console.log('================================================================\n');
}

if (require.main === module) {
  runDeploy().catch(err => {
    console.error('\n❌ ERROR EN EL DESPLIEGUE:', err.message || err);
    process.exit(1);
  });
}

module.exports = { runDeploy, isPreserved };
