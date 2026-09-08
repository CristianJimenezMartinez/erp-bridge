const { Client } = require('C:/Users/Cayse/.gemini/antigravity/brain/6758f875-863d-413c-ab60-e8933d2aff32/scratch/node_modules/ssh2');
const fs = require('fs');
const path = require('path');

const os = require('os');

const host = process.env.HETZNER_HOST || '178.105.87.40';
const user = process.env.HETZNER_USER || 'root';
const privateKeyPath = path.join(os.homedir(), '.ssh', 'id_ed25519');
const privateKey = fs.existsSync(privateKeyPath) ? fs.readFileSync(privateKeyPath) : undefined;

const localReleasesDir = path.resolve(__dirname, '../releases');
const remoteReleasesDir = '/opt/bentian/erp-bridge/releases';

const filesToUpload = [
  { local: path.join(localReleasesDir, 'latest.json'), remote: `${remoteReleasesDir}/latest.json` },
  { local: path.join(localReleasesDir, 'v0.1.0/manifest.json'), remote: `${remoteReleasesDir}/v0.1.0/manifest.json` },
  { local: path.join(localReleasesDir, 'v0.1.0/checksums.txt'), remote: `${remoteReleasesDir}/v0.1.0/checksums.txt` },
  { local: path.join(localReleasesDir, 'v0.1.0/adodb.js'), remote: `${remoteReleasesDir}/v0.1.0/adodb.js` },
  { local: path.join(localReleasesDir, 'v0.1.0/Bentian-Setup-v0.1.0.exe'), remote: `${remoteReleasesDir}/v0.1.0/Bentian-Setup-v0.1.0.exe` },
  { local: path.join(localReleasesDir, 'v0.1.0/Bentian-Setup-v0.1.0.zip'), remote: `${remoteReleasesDir}/v0.1.0/Bentian-Setup-v0.1.0.zip` },
  { local: path.join(localReleasesDir, 'v0.1.0/BentianAgent-v0.1.0-Portable.zip'), remote: `${remoteReleasesDir}/v0.1.0/BentianAgent-v0.1.0-Portable.zip` },
  { local: path.join(localReleasesDir, 'v0.1.0/BentianAgent.exe'), remote: `${remoteReleasesDir}/v0.1.0/BentianAgent.exe` }
];

console.log('Iniciando subida de releases al servidor Hetzner...');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      process.exit(1);
    }

    try {
      for (const item of filesToUpload) {
        if (!fs.existsSync(item.local)) {
          console.log(`⚠️ Archivo omitido: ${item.local}`);
          continue;
        }
        const sizeMb = (fs.statSync(item.local).size / (1024 * 1024)).toFixed(2);
        console.log(`Subiendo ${path.basename(item.local)} (${sizeMb} MB)...`);
        
        await new Promise((res, rej) => {
          sftp.fastPut(item.local, item.remote, {
            step: (total, nb, totalSize) => {
              const pct = Math.round((total / totalSize) * 100);
              process.stdout.write(`\r   Progreso: ${pct}% (${(total / 1024 / 1024).toFixed(1)} / ${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
            }
          }, (putErr) => {
            if (putErr) rej(putErr);
            else {
              console.log(`\n  ✓ ${path.basename(item.local)} subido con éxito.`);
              res();
            }
          });
        });
      }

      console.log('\n🎉 ¡Todos los binarios y manifiestos de release subidos exitosamente!');
      conn.end();
    } catch (uploadError) {
      console.error('Error durante la subida:', uploadError);
      conn.end();
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Error SSH:', err.message);
  process.exit(1);
}).connect({
  host,
  port: 22,
  username: user,
  privateKey
});
