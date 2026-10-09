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

async function deployDist() {
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

  const localDistDir = path.resolve(__dirname, '../apps/api/dist');
  const remoteDistDir = '/opt/bentian/erp-bridge/apps/api/dist';

  const files = collectFiles(localDistDir);
  console.log(`>>> [2/5] Subiendo ${files.length} archivos de apps/api/dist a ${remoteDistDir}...`);

  // Asegurar directorios remotos
  const dirs = new Set();
  for (const f of files) {
    dirs.add(path.dirname(`${remoteDistDir}/${f.rel}`).replace(/\\/g, '/'));
  }
  await runSsh(conn, `mkdir -p ${Array.from(dirs).map(d => `"${d}"`).join(' ')}`);

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => err ? reject(err) : resolve(s));
  });

  for (const f of files) {
    const remotePath = `${remoteDistDir}/${f.rel}`;
    await new Promise((resPut, rejPut) => {
      sftp.fastPut(f.full, remotePath, (err) => err ? rejPut(err) : resPut());
    });
  }
  sftp.end();
  console.log(`    ✓ ${files.length} archivos compilados transferidos con éxito.`);

  console.log('>>> [3/5] Sincronizando repositorio git y reiniciando contenedor Docker...');
  try {
    await runSsh(conn, 'cd /opt/bentian/erp-bridge && git fetch origin main && git reset --hard origin/main && git clean -fd');
    console.log('    ✓ Git sync completado limpiamente en el servidor.');
  } catch (e) {
    console.warn('    ⚠ Aviso en git sync remoto:', e.message);
  }

  const copyCmd = `
    docker cp "${remoteDistDir}/." bentian-api-prod:/app/apps/api/dist/ &&
    docker restart bentian-api-prod
  `;
  await runSsh(conn, copyCmd);
  console.log('    ✓ Backend copiado al contenedor y servicio reiniciado.');

  conn.end();

  console.log('>>> [4/5] Esperando 5 segundos para verificar disponibilidad...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('>>> [5/5] Comprobando salud de la API en producción...');
  const healthRes = await verifyUrl('https://bridge.cristianjm.com/health');
  console.log(`  GET https://bridge.cristianjm.com/health -> HTTP ${healthRes.status} ${healthRes.ok ? '✓ OK' : '❌ ERROR'}`);

  if (healthRes.ok) {
    console.log('\n======================================================');
    console.log('   🎉 BACKEND API CON SEGURIDAD DESPLEGADO CON ÉXITO   ');
    console.log('======================================================\n');
  } else {
    throw new Error('La API no respondió 200 en /health tras el despliegue');
  }
}

deployDist().catch(err => {
  console.error('\n❌ ERROR EN DESPLIEGUE:', err.message || err);
  process.exit(1);
});
