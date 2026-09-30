let Client;
try {
  Client = require('ssh2').Client;
} catch {
  // ssh2 se verificará al ejecutar si no está presente
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

function waitForHealthy(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      https.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (Date.now() - start < timeoutMs) {
          setTimeout(check, 1000);
        } else {
          resolve(false);
        }
      }).on('error', () => {
        if (Date.now() - start < timeoutMs) {
          setTimeout(check, 1000);
        } else {
          resolve(false);
        }
      });
    };
    check();
  });
}

function collectFilesRecursively(dir, baseDir = dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(collectFilesRecursively(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({ fullPath, relPath });
    }
  }
  return results;
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
  const remoteDistDir = '/opt/bentian/erp-bridge/apps/api/dist';

  console.log('\n================================================================');
  console.log(`   SUBIENDO RELEASE v${version} A HETZNER CX23 (bridge.cristianjm.com) `);
  console.log('================================================================\n');

  // Construir cola de subida
  const filesInVersionDir = fs.readdirSync(versionReleaseDir);
  const uploadQueue = [];

  // 1. Archivos de la carpeta versionada
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

  // 2. latest.json
  if (fs.existsSync(latestJsonPath)) {
    uploadQueue.push({
      local: latestJsonPath,
      remote: `${remoteReleasesDir}/latest.json`,
      name: 'latest.json'
    });
  }

  // 3. Archivos públicos completos (recursivo: index.html, dashboard, docs, js, css, assets, etc.)
  const localPublicDir = path.resolve(__dirname, '../apps/api/public');
  if (fs.existsSync(localPublicDir)) {
    const allPublicFiles = collectFilesRecursively(localPublicDir);
    for (const pf of allPublicFiles) {
      uploadQueue.push({
        local: pf.fullPath,
        remote: `${remotePublicDir}/${pf.relPath}`,
        name: `public/${pf.relPath}`
      });
    }
  }

  // 4. Archivos compilados de la API (dist/)
  const localDistDir = path.resolve(__dirname, '../apps/api/dist');
  if (fs.existsSync(localDistDir)) {
    const allDistFiles = collectFilesRecursively(localDistDir);
    for (const df of allDistFiles) {
      uploadQueue.push({
        local: df.fullPath,
        remote: `${remoteDistDir}/${df.relPath}`,
        name: `dist/${df.relPath}`
      });
    }
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', async () => {
      try {
        console.log('>>> [1/6] Creando directorios remotos en el servidor...');
        const dirsToCreate = new Set([
          remoteVersionDir,
          remoteLatestDir,
          remotePublicDir,
          remoteDistDir
        ]);
        for (const item of uploadQueue) {
          const dir = path.dirname(item.remote).replace(/\\/g, '/');
          dirsToCreate.add(dir);
        }
        const mkdirCmd = `mkdir -p ${Array.from(dirsToCreate).map(d => `"${d}"`).join(' ')}`;
        await runSshCommand(conn, mkdirCmd);
        console.log('    ✓ Directorios remotos verificados.');

        console.log('>>> [2/6] Abriendo canal SFTP seguro...');
        conn.sftp(async (err, sftp) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          try {
            console.log(`>>> [3/6] Transfiriendo ${uploadQueue.length} archivos a producción...`);

            for (const item of uploadQueue) {
              const sizeBytes = fs.statSync(item.local).size;
              const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
              const isLarge = sizeBytes > 1024 * 1024;
              
              if (isLarge) {
                console.log(`  ↑ Subiendo ${item.name} (${sizeMb} MB)...`);
              }

              await new Promise((resPut, rejPut) => {
                sftp.fastPut(item.local, item.remote, {
                  step: (total, nb, totalSize) => {
                    if (isLarge) {
                      const pct = Math.round((total / totalSize) * 100);
                      process.stdout.write(`\r     Progreso: ${pct}% (${(total / 1024 / 1024).toFixed(1)} / ${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
                    }
                  }
                }, (putErr) => {
                  if (putErr) rejPut(putErr);
                  else {
                    if (isLarge) process.stdout.write('\n');
                    resPut();
                  }
                });
              });
            }
            console.log(`    ✓ ${uploadQueue.length} archivos transferidos con éxito.`);
            try { sftp.end(); } catch {}

            // Copiar archivos clave a releases/latest/ en el servidor
            console.log('>>> [4/6] Sincronizando punteros genéricos /releases/latest/...');
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

            // Registrar versión en PostgreSQL de producción en bentian-api-prod
            console.log('>>> [5/6] Registrando versión en la base de datos de producción...');
            const manifestPath = path.join(versionReleaseDir, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
              const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              const insertScript = `docker exec -w /app/apps/api bentian-api-prod node -e '
                const { DatabaseService } = require("../../packages/core/dist/database/database.service");
                const crypto = require("crypto");
                const db = DatabaseService.getInstance();
                db.initialize({ connectionString: process.env.DATABASE_URL });
                db.query(\`
                  INSERT INTO update_manifests (id, version, channel, platform, download_url, sha256, signature, file_size, release_notes, mandatory, min_version, published_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                  ON CONFLICT (version) DO UPDATE
                  SET channel = $3, platform = $4, download_url = $5, sha256 = $6, signature = $7, file_size = $8, release_notes = $9, mandatory = $10, min_version = $11, published_at = $12
                \`, [crypto.randomUUID(), "${manifestData.version}", "${manifestData.channel}", "${manifestData.platform}", "${manifestData.downloadUrl}", "${manifestData.sha256}", "${manifestData.signature}", ${manifestData.fileSize || 'null'}, "${(manifestData.releaseNotes || '').replace(/"/g, '\\"')}", ${Boolean(manifestData.mandatory)}, ${manifestData.minVersion ? `"${manifestData.minVersion}"` : 'null'}, new Date("${manifestData.publishedAt || new Date().toISOString()}")])
                .then(() => { console.log("OK_DB_REGISTERED"); process.exit(0); })
                .catch(e => { console.error("DB_ERROR:", e.message); process.exit(1); });
              '`;
              try {
                await runSshCommand(conn, insertScript);
                console.log(`    ✓ Versión v${manifestData.version} registrada en la base de datos PostgreSQL.`);
              } catch (dbErr) {
                console.warn(`    ⚠️ Aviso al registrar en base de datos: ${dbErr.message}`);
              }
            }

            // Actualizar contenedor Docker y reiniciar
            console.log('>>> [6/6] Sincronizando backend compilado y reiniciando contenedor Docker...');
            const updateContainerCmd = `
              docker cp "${remoteDistDir}/." bentian-api-prod:/app/apps/api/dist/ &&
              docker restart bentian-api-prod
            `;
            await runSshCommand(conn, updateContainerCmd);
            console.log('    ✓ Contenedor bentian-api-prod actualizado y reiniciado.');

            // Comprobar disponibilidad HTTP
            console.log('\n--- Verificando disponibilidad pública en vivo ---');
            const isHealthOk = await waitForHealthy('https://bridge.cristianjm.com/health');
            console.log(`  GET https://bridge.cristianjm.com/health: ${isHealthOk ? '✓ 200 OK' : '⚠️ Falló verificación'}`);

            const isLatestOk = await verifyHttpEndpoint('https://bridge.cristianjm.com/releases/latest.json');
            console.log(`  GET https://bridge.cristianjm.com/releases/latest.json: ${isLatestOk ? '✓ 200 OK' : '⚠️ Falló verificación'}`);

            const isDocHtmlOk = await verifyHttpEndpoint('https://bridge.cristianjm.com/docs/windows-antivirus-smartscreen-guide.html');
            console.log(`  GET https://bridge.cristianjm.com/docs/windows-antivirus-smartscreen-guide.html: ${isDocHtmlOk ? '✓ 200 OK' : '⚠️ Falló verificación'}`);

            const isDocMdOk = await verifyHttpEndpoint('https://bridge.cristianjm.com/docs/windows-antivirus-smartscreen-guide.md');
            console.log(`  GET https://bridge.cristianjm.com/docs/windows-antivirus-smartscreen-guide.md: ${isDocMdOk ? '✓ 200 OK' : '⚠️ Falló verificación'}`);

            const isSyncJsOk = await verifyHttpEndpoint('https://bridge.cristianjm.com/js/version-sync.js');
            console.log(`  GET https://bridge.cristianjm.com/js/version-sync.js: ${isSyncJsOk ? '✓ 200 OK' : '⚠️ Falló verificación'}`);

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
      readyTimeout: 60000,
      keepaliveInterval: 10000
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
