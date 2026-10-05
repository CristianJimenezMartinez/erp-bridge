import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { LicenseService } from '../src/license/license.service';
import { ConfigManager } from '../src/config/config.manager';
import {
  DEFAULT_LICENSE_PROOF_PUBLIC_KEY,
  LICENSE_PROOF_DOMAIN,
  verifyLicenseProof,
} from '../src/license/license-proof';
import { LicenseTokenManager } from '@erp-bridge/core';

console.log('--- Running Ed25519 License Proof Tests ---');

function sign(privateKey: crypto.KeyObject, claims: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify({ v: 1, ...claims }), 'utf8').toString('base64url');
  const signature = crypto.sign(null, Buffer.from(LICENSE_PROOF_DOMAIN + payload, 'utf8'), privateKey).toString('base64url');
  return { payload, signature };
}

async function runTests() {
  const tmpDir = path.join(os.tmpdir(), `bentian_proof_test_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  // Regla 13: nunca tocar la configuración real del usuario
  process.env.BENTIAN_CONFIG_PATH = path.join(tmpDir, 'agent-config.json');

  const server = http.createServer();
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const { privateKey: attackerKey } = crypto.generateKeyPairSync('ed25519');
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const hwid = 'a'.repeat(64);
    const now = Date.now();
    const claims = {
      licenseId: '11111111-2222-3333-4444-555555555555',
      hwid,
      plan: 'starter',
      issuedAt: now - 1000,
      expiresAt: now + 3600_000,
    };

    // 1. Verificación pura
    console.log('1. Verificador de prueba Ed25519...');
    assert(verifyLicenseProof(sign(privateKey, claims), hwid, publicPem), 'Prueba legítima debe verificar');
    assert.strictEqual(verifyLicenseProof(sign(attackerKey, claims), hwid, publicPem), null, 'Firma de otra clave debe rechazarse');
    assert.strictEqual(verifyLicenseProof(sign(privateKey, claims), 'b'.repeat(64), publicPem), null, 'HWID ajeno debe rechazarse');
    const good = sign(privateKey, claims);
    const forgedPayload = Buffer.from(JSON.stringify({ v: 1, ...claims, plan: 'enterprise', expiresAt: now + 9e12 })).toString('base64url');
    assert.strictEqual(verifyLicenseProof({ payload: forgedPayload, signature: good.signature }, hwid, publicPem), null, 'Payload manipulado debe rechazarse');
    assert.strictEqual(verifyLicenseProof({ payload: good.payload, signature: 'AAAA' }, hwid, publicPem), null);
    assert.strictEqual(verifyLicenseProof(null, hwid, publicPem), null);
    assert.strictEqual(verifyLicenseProof(sign(privateKey, claims), hwid), null, 'La clave embebida oficial no debe validar firmas de una clave de test');
    assert(DEFAULT_LICENSE_PROOF_PUBLIC_KEY.includes('BEGIN PUBLIC KEY'));
    console.log('  ✓ Firma, payload, HWID y clave verificados.');

    // 2. Comportamiento offline de LicenseService
    const makeService = async () => {
      const dir = fs.mkdtempSync(path.join(tmpDir, 'store_'));
      const cm = new ConfigManager({ agentId: 'agent_proof', apiBaseUrl: 'http://127.0.0.1:59998' });
      const svc = new LicenseService(cm, undefined, dir, publicPem);
      const realHwid = await svc.getHWID();
      return { svc, realHwid, store: (svc as any).secureStore };
    };
    const hs256 = (h: string, expiresAt: number) =>
      LicenseTokenManager.createToken({
        licenseId: claims.licenseId,
        organizationId: 'org_x',
        plan: 'starter',
        hwid: h,
        issuedAt: now - 1000,
        expiresAt,
      });

    console.log('2. Token HS256 falsificado sin prueba NO concede gracia offline...');
    {
      const { svc, realHwid, store } = await makeService();
      await store.saveLicenseToken(hs256(realHwid, now + 9e10), realHwid);
      const res = await svc.validateLicense();
      assert.strictEqual(res.status, 'EXPIRED', 'Sin prueba firmada no debe haber gracia');
    }
    console.log('  ✓ Token forjado rechazado.');

    console.log('3. Prueba firmada por clave ajena en disco NO concede gracia...');
    {
      const { svc, realHwid, store } = await makeService();
      await store.saveLicenseToken(hs256(realHwid, now + 3600_000), realHwid);
      await store.saveLicenseProof(JSON.stringify(sign(attackerKey, { ...claims, hwid: realHwid })), realHwid);
      assert.strictEqual((await svc.validateLicense()).status, 'EXPIRED');
    }
    console.log('  ✓ Prueba con firma ajena rechazada.');

    console.log('4. Prueba legítima concede gracia y la caducidad se respeta...');
    {
      const { svc, realHwid, store } = await makeService();
      await store.saveLicenseToken(hs256(realHwid, now + 3600_000), realHwid);
      await store.saveLicenseProof(JSON.stringify(sign(privateKey, { ...claims, hwid: realHwid })), realHwid);
      const ok = await svc.validateLicense();
      assert.strictEqual(ok.status, 'GRACE_PERIOD');

      const { svc: svc2, realHwid: h2, store: s2 } = await makeService();
      await s2.saveLicenseToken(hs256(h2, now + 3600_000), h2);
      await s2.saveLicenseProof(JSON.stringify(sign(privateKey, { ...claims, hwid: h2, expiresAt: now - 5 })), h2);
      assert.strictEqual((await svc2.validateLicense()).status, 'EXPIRED', 'Prueba caducada => EXPIRED');
    }
    console.log('  ✓ Gracia solo con prueba válida y vigente.');

    // 5. Flujo completo: el servidor entrega licenseProof al activar y queda persistida
    console.log('5. Activación entrega y persiste la prueba firmada...');
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;
    const dir = fs.mkdtempSync(path.join(tmpDir, 'store_act_'));
    const cm = new ConfigManager({ agentId: 'agent_act', apiBaseUrl: `http://127.0.0.1:${port}` });
    const svc = new LicenseService(cm, undefined, dir, publicPem);
    const realHwid = await svc.getHWID();
    const expiresAt = Date.now() + 3600_000;
    server.on('request', (req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        if (req.url?.endsWith('/licenses/activate')) {
          res.end(JSON.stringify({
            data: {
              success: true,
              plan: 'starter',
              expiresAt: new Date(expiresAt).toISOString(),
              licenseToken: hs256(realHwid, expiresAt),
              licenseProof: sign(privateKey, { ...claims, hwid: realHwid, expiresAt }),
            },
          }));
        } else {
          res.statusCode = 500;
          res.end('{}');
        }
      });
    });
    const act = await svc.activateLicense('EB-TEST-AAAAA-BBBBB-CCCCC');
    assert.strictEqual(act.success, true);
    assert(await (svc as any).secureStore.loadLicenseProof(realHwid), 'La prueba debe quedar persistida');
    // Apagar el servidor => offline => gracia gracias a la prueba
    await new Promise<void>((resolve) => server.close(() => resolve()));
    (cm.get() as any).apiBaseUrl = 'http://127.0.0.1:59997';
    const offline = await svc.validateLicense();
    assert.strictEqual(offline.status, 'GRACE_PERIOD', 'Offline con prueba persistida => GRACE_PERIOD');
    console.log('  ✓ Activación + persistencia + gracia offline verificadas.');

    console.log('✓ ALL ED25519 LICENSE PROOF TESTS PASSED!');
  } finally {
    delete process.env.BENTIAN_CONFIG_PATH;
    try {
      server.close();
    } catch {}
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

runTests().catch((err) => {
  console.error('❌ Error en test de License Proof:', err);
  process.exit(1);
});
