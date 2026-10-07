const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { Client } = require('ssh2');

const host = process.env.HETZNER_HOST || '178.105.87.40';
const user = process.env.HETZNER_USER || 'root';
const privateKeyPath = path.join(os.homedir(), '.ssh', 'id_ed25519');
const privateKey = fs.existsSync(privateKeyPath) ? fs.readFileSync(privateKeyPath) : undefined;

function runSsh(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', d => stdout += d);
      stream.stderr.on('data', d => stderr += d);
      stream.on('close', code => {
        if (code !== 0) reject(new Error(`SSH error (${code}): ${stderr || stdout}`));
        else resolve(stdout);
      });
    });
  });
}

function verifyUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode === 200 });
    }).on('error', (e) => resolve({ status: null, ok: false, error: e.message }));
  });
}

function collectFiles(dir, baseDir = dir) {
  let list = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      list = list.concat(collectFiles(full, baseDir));
    } else {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      list.push({ full, rel });
    }
  }
  return list;
}

async function deploySitemapsAndPublic() {
  console.log('>>> [1/5] Conectando por SSH a Hetzner (' + host + ')...');
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({
      host,
      port: 22,
      username: user,
      privateKey,
      readyTimeout: 30000
    });
  });
  console.log('    ✓ Conectado por SSH.');

  // Inspeccionar contenedor Docker
  console.log('>>> [2/5] Comprobando configuración de Docker en el servidor...');
  const inspectOutput = await runSsh(conn, 'docker inspect bentian-api-prod --format "{{json .Mounts}}"');
  console.log('    Docker mounts:', JSON.stringify(JSON.parse(inspectOutput), null, 2));

  const checkWorkingDir = await runSsh(conn, 'docker inspect bentian-api-prod --format "{{.Config.WorkingDir}}"');
  console.log('    WorkingDir:', checkWorkingDir.trim());

  const checkPublicInDocker = await runSsh(conn, 'docker exec bentian-api-prod ls -la /app/apps/api/ || echo "no /app/apps/api"');
  console.log('    In Docker /app/apps/api:\n', checkPublicInDocker);

  const localPublicDir = path.resolve(__dirname, '../apps/api/public');
  const remotePublicDir = '/opt/bentian/erp-bridge/apps/api/public';

  const files = [
    'sitemap.xml',
    'sitemap-index.xml',
    'sitemap-main.xml',
    'sitemap-ciudades.xml',
    'sitemap-docs.xml',
    'robots.txt',
    'index.html',
    'terminos/index.html'
  ];

  console.log(`>>> [3/5] Subiendo ${files.length} archivos clave a ${remotePublicDir}...`);
  await runSsh(conn, `mkdir -p "${remotePublicDir}/terminos"`);

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => err ? reject(err) : resolve(s));
  });

  for (const f of files) {
    const localPath = path.join(localPublicDir, f);
    const remotePath = `${remotePublicDir}/${f}`;
    if (!fs.existsSync(localPath)) {
      console.warn(`    ⚠️ Archivo local no existe: ${localPath}`);
      continue;
    }
    await new Promise((resPut, rejPut) => {
      sftp.fastPut(localPath, remotePath, (err) => err ? rejPut(err) : resPut());
    });
    console.log(`    ✓ Subido: ${f}`);
  }
  sftp.end();

  // Al ser un bind mount (/opt/bentian/erp-bridge/apps/api/public -> /app/apps/api/public:ro),
  // los archivos subidos al host ya están reflejados inmediatamente en el contenedor.
  console.log('>>> [4/5] Reiniciando contenedor bentian-api-prod para refrescar caché...');
  await runSsh(conn, 'docker restart bentian-api-prod');
  console.log('    ✓ Contenedor reiniciado con éxito.');

  conn.end();

  console.log('>>> [5/5] Esperando 5 segundos a que la API responda...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('\n--- Verificando URLs en vivo en https://bridge.cristianjm.com ---');
  const urlsToCheck = [
    'https://bridge.cristianjm.com/sitemap.xml',
    'https://bridge.cristianjm.com/sitemap-index.xml',
    'https://bridge.cristianjm.com/sitemap-main.xml',
    'https://bridge.cristianjm.com/sitemap-ciudades.xml',
    'https://bridge.cristianjm.com/sitemap-docs.xml',
    'https://bridge.cristianjm.com/robots.txt',
    'https://bridge.cristianjm.com/terminos/'
  ];

  for (const url of urlsToCheck) {
    const res = await verifyUrl(url);
    console.log(`  ${url} -> HTTP ${res.status} ${res.ok ? '✓ OK' : '❌ ERROR'}`);
  }

  console.log('\n======================================================');
  console.log('   🎉 SITEMAPS Y PUBLIC DESPLEGADOS CON ÉXITO EN VIVO  ');
  console.log('======================================================\n');
}

deploySitemapsAndPublic().catch(err => {
  console.error('\n❌ ERROR EN DESPLIEGUE:', err.message || err);
  process.exit(1);
});
