const { Client } = require('ssh2');
const os = require('os');
const fs = require('fs');
const path = require('path');

const host = process.env.HETZNER_HOST || '178.105.87.40';
const user = process.env.HETZNER_USER || 'root';
const privateKeyPath = path.join(os.homedir(), '.ssh', 'id_ed25519');
const privateKey = fs.existsSync(privateKeyPath) ? fs.readFileSync(privateKeyPath) : undefined;

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        sftp.fastPut(localPath, remotePath, (err) => {
          conn.end();
          if (err) return reject(err);
          resolve();
        });
      });
    }).on('error', reject).connect({
      host,
      port: 22,
      username: user,
      privateKey,
      readyTimeout: 10000,
    });
  });
}

const local = path.resolve(__dirname, '../docker-compose.prod.yml');
const remote = '/opt/bentian/erp-bridge/docker-compose.prod.yml';

console.log(`Subiendo ${local} -> ${remote}...`);
uploadFile(local, remote)
  .then(() => {
    console.log('✓ Archivo subido con éxito.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error al subir:', err);
    process.exit(1);
  });
