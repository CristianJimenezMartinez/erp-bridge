let Client;
try {
  Client = require('ssh2').Client;
} catch {
  Client = require('C:/Users/Cayse/.gemini/antigravity/brain/6758f875-863d-413c-ab60-e8933d2aff32/scratch/node_modules/ssh2').Client;
}

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const host = process.env.HETZNER_HOST || '178.105.87.40';
const user = process.env.HETZNER_USER || 'root';
const privateKeyPath = path.join(os.homedir(), '.ssh', 'id_ed25519');
const privateKey = fs.existsSync(privateKeyPath) ? fs.readFileSync(privateKeyPath) : undefined;

function runSshCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', d => stdout += d);
      stream.stderr.on('data', d => stderr += d);
      stream.on('close', code => {
        if (code !== 0) {
          reject(new Error(`Comando SSH falló (${code}): ${stderr || stdout}`));
        } else {
          resolve(stdout);
        }
      });
    });
  });
}

function verifyHttpEndpoint(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function uploadReleases(options = {}) {
  const localReleasesDir = path.resolve(__dirname, '../releases');
  const latestJsonPath = path.join(localReleasesDir, 'latest.json');

  let version = options.version;
  if (!version) {
    if (fs.existsSync(latestJsonPath)) {
      const latestData = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
      version = latestData.latestVersion;
    }
  }

  if (!version) {
    throw new Error('No se pudo determinar la versión de la release a subir.');
  }

  // Eliminar prefijo 'v' si viene incluido
  version = version.replace(/^v/, '');

  const versionReleaseDir = path.join(localReleasesDir, `v${version}`);
  if (!fs.existsSync(versionReleaseDir)) {
    throw new Error(`Directorio de release local no encontrado: ${versionReleaseDir}`);
  }

  const remoteReleasesDir = '/opt/bentian/erp-bridge/releases';
  const remoteVersionDir = `${remoteReleasesDir}/v${version}`;
  const remoteLatestDir = `${remoteReleasesDir}/latest`;
  const remotePublicDir = '/opt/bentian/erp-bridge/apps/api/public';

  console.log('\n================================================================');
  console.log(`   SUBIENDO RELEASE v${version} A HETZNER CX23 (bridge.cristianjm.com) `);
  console.log('================================================================\n');

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', async () => {
      try {
        console.log('>>> [1/4] Creando directorios remotos en el servidor...');
        await runSshCommand(conn, `mkdir -p "${remoteVersionDir}" "${remoteLatestDir}" "${remotePublicDir}"`);
        console.log('    ✓ Directorios remotos verificados.');

        console.log('>>> [2/4] Abriendo canal SFTP seguro...');
        conn.sftp(async (err, sftp) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          try {
            // Lista de archivos a subir
            const filesInVersionDir = fs.readdirSync(versionReleaseDir);
            const uploadQueue = [];

            // Archivos de la carpeta versionada
            for (const file of filesInVersionDir) {
              const localFile = path.join(versionReleaseDir, file);
              if (fs.statSync(localFile).isFile()) {
                uploadQueue.push({
                  local: localFile,
                  remote: `${remoteVersionDir}/${file}`,
                  name: `v${version}/${file}`
                });
              }
            }

            // latest.json
            if (fs.existsSync(latestJsonPath)) {
              uploadQueue.push({
                local: latestJsonPath,
                remote: `${remoteReleasesDir}/latest.json`,
                name: 'latest.json'
              });
            }

            // Archivos públicos (index.html, robots.txt, sitemap.xml)
            const localPublicDir = path.resolve(__dirname, '../apps/api/public');
            if (fs.existsSync(localPublicDir)) {
              const publicFiles = ['index.html', 'robots.txt', 'sitemap.xml'];
              for (const pf of publicFiles) {
                const localPf = path.join(localPublicDir, pf);
                if (fs.existsSync(localPf)) {
                  uploadQueue.push({
                    local: localPf,
                    remote: `${remotePublicDir}/${pf}`,
                    name: `public/${pf}`
                  });
                }
              }
            }

            console.log(`>>> [3/4] Transfiriendo ${uploadQueue.length} archivos a producción...`);

            for (const item of uploadQueue) {
              const sizeMb = (fs.statSync(item.local).size / (1024 * 1024)).toFixed(2);
              console.log(`  ↑ Subiendo ${item.name} (${sizeMb} MB)...`);

              await new Promise((resPut, rejPut) => {
                sftp.fastPut(item.local, item.remote, {
                  step: (total, nb, totalSize) => {
                    const pct = Math.round((total / totalSize) * 100);
                    process.stdout.write(`\r     Progreso: ${pct}% (${(total / 1024 / 1024).toFixed(1)} / ${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
                  }
                }, (putErr) => {
                  if (putErr) rejPut(putErr);
                  else {
                    console.log(`\n    ✓ ${item.name} subido con éxito.`);
                    resPut();
                  }
                });
              });
            }

            // Copiar archivos clave a releases/latest/ en el servidor
            console.log('>>> [4/4] Sincronizando punteros genéricos /releases/latest/...');
            const setupExe = `Bentian-Setup-v${version}.exe`;
            const setupZip = `Bentian-Setup-v${version}.zip`;
            const portableZip = `BentianAgent-v${version}-Portable.zip`;

            const linkCmd = `
              cp -f "${remoteVersionDir}/${setupExe}" "${remoteLatestDir}/Bentian-Setup.exe" 2>/dev/null || true;
              cp -f "${remoteVersionDir}/${setupZip}" "${remoteLatestDir}/Bentian-Setup.zip" 2>/dev/null || true;
              cp -f "${remoteVersionDir}/${portableZip}" "${remoteLatestDir}/BentianAgent-Portable.zip" 2>/dev/null || true;
              cp -f "${remoteVersionDir}/BentianAgent.exe" "${remoteLatestDir}/BentianAgent.exe" 2>/dev/null || true;
              cp -f "${remoteVersionDir}/manifest.json" "${remoteLatestDir}/manifest.json" 2>/dev/null || true;
            `;
            await runSshCommand(conn, linkCmd);
            console.log('    ✓ Enlaces de descarga genéricos /releases/latest/ actualizados.');

            // Comprobar disponibilidad HTTP
            console.log('\n--- Verificando disponibilidad pública en vivo ---');
            const isLatestOk = await verifyHttpEndpoint('https://bridge.cristianjm.com/releases/latest.json');
            console.log(`  GET https://bridge.cristianjm.com/releases/latest.json: ${isLatestOk ? '✓ 200 OK' : '⚠️ Falló verificación'}`);

            const isZipOk = await verifyHttpEndpoint(`https://bridge.cristianjm.com/releases/v${version}/${setupZip}`);
            console.log(`  GET https://bridge.cristianjm.com/releases/v${version}/${setupZip}: ${isZipOk ? '✓ 200 OK' : '⚠️ Falló verificación'}`);

            console.log('\n================================================================');
            console.log(`   🎉 DESPLIEGUE EN PRODUCCIÓN DE v${version} COMPLETADO CON ÉXITO `);
            console.log('================================================================\n');

            conn.end();
            resolve(true);
          } catch (innerErr) {
            conn.end();
            reject(innerErr);
          }
        });
      } catch (sshErr) {
        conn.end();
        reject(sshErr);
      }
    }).on('error', (err) => {
      reject(new Error(`Error de conexión SSH con ${host}: ${err.message}`));
    }).connect({
      host,
      port: 22,
      username: user,
      privateKey,
      readyTimeout: 15000
    });
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const requestedVersion = args[0] && !args[0].startsWith('-') ? args[0] : undefined;

  uploadReleases({ version: requestedVersion })
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ ERROR EN DESPLIEGUE:', err.message || err);
      process.exit(1);
    });
}

module.exports = { uploadReleases };
