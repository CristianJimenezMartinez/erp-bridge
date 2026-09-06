const { Client } = require('C:/Users/Cayse/.gemini/antigravity/brain/6758f875-863d-413c-ab60-e8933d2aff32/scratch/node_modules/ssh2');

const os = require('os');
const fs = require('fs');
const path = require('path');

const host = process.env.HETZNER_HOST || '178.105.87.40';
const user = process.env.HETZNER_USER || 'root';
const privateKeyPath = path.join(os.homedir(), '.ssh', 'id_ed25519');
const privateKey = fs.existsSync(privateKeyPath) ? fs.readFileSync(privateKeyPath) : undefined;

function runRemoteCommand(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        let stdout = '';
        let stderr = '';
        stream.on('data', (d) => stdout += d);
        stream.stderr.on('data', (d) => stderr += d);
        stream.on('close', (code) => {
          conn.end();
          resolve({ code, stdout, stderr });
        });
      });
    }).on('error', reject).connect({
      host,
      port: 22,
      username: user,
      privateKey,
      readyTimeout: 10000
    });
  });
}

async function main() {
  const cmd = process.argv.slice(2).join(' ') || 'hostname && uptime';
  console.log(`[Hetzner SSH] Ejecutando: ${cmd}`);
  const res = await runRemoteCommand(cmd);
  if (res.stdout) console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  process.exit(res.code);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
