import assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { UpdateSigner } from '@erp-bridge/core';
import {
  UpdateVerifier,
  UpdateSwapper,
  UpdateClient,
} from '../src/update';
import { EventBus } from '../src/diagnostics';

async function runTests() {
  console.log('--- Running Native Silent & Secure Update System Tests ---');

  const testDir = path.join(__dirname, 'temp_update_system_test');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const currentBin = path.join(testDir, 'BentianAgent.exe');
  const newBin = path.join(testDir, 'BentianAgent.new.exe');
  const backupBin = path.join(testDir, 'BentianAgent.exe.bak');

  fs.writeFileSync(currentBin, 'BENTIAN-AGENT-v1.0.0-BIN');
  fs.writeFileSync(newBin, 'BENTIAN-AGENT-v1.1.0-BIN');

  // =========================================================================
  // 1. UPDATE VERIFIER (SHA-256 + Ed25519 + HMAC)
  // =========================================================================
  console.log('[1/4] Verificando UpdateVerifier (SHA-256, Ed25519, HMAC)...');

  // 1.1 SHA-256 síncrono y streaming
  const sha256Sync = UpdateVerifier.calculateFileSHA256(newBin);
  const sha256Stream = await UpdateVerifier.calculateFileSHA256Stream(newBin);
  assert.strictEqual(sha256Sync, sha256Stream);
  assert.strictEqual(sha256Sync.length, 64);

  // 1.2 Ed25519 firma y validación
  const { publicKey, privateKey } = UpdateSigner.generateKeyPair();
  const signatureEd25519 = UpdateSigner.sign(fs.readFileSync(newBin), privateKey);

  const ed25519Result = UpdateVerifier.verifyBinary(newBin, sha256Sync, signatureEd25519, publicKey);
  assert.strictEqual(ed25519Result.valid, true);
  assert.strictEqual(ed25519Result.sha256Valid, true);
  assert.strictEqual(ed25519Result.signatureValid, true);

  // 1.3 HMAC-SHA256 firma y validación
  const hmacSecret = 'bentian-super-secret-update-key';
  const hmacSignature = crypto
    .createHmac('sha256', hmacSecret)
    .update(fs.readFileSync(newBin))
    .digest('base64');

  const hmacResult = UpdateVerifier.verifyBinary(newBin, sha256Sync, hmacSignature, undefined, hmacSecret);
  assert.strictEqual(hmacResult.valid, true);
  assert.strictEqual(hmacResult.signatureValid, true);

  // 1.4 Rechazo seguro ante hash o firma alterada
  const tamperedResult = UpdateVerifier.verifyBinary(
    newBin,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    signatureEd25519,
    publicKey
  );
  assert.strictEqual(tamperedResult.valid, false);
  assert.strictEqual(tamperedResult.sha256Valid, false);

  const fakeSigResult = UpdateVerifier.verifyBinary(newBin, sha256Sync, Buffer.from('invalid-sig').toString('base64'), publicKey);
  assert.strictEqual(fakeSigResult.valid, false);
  assert.strictEqual(fakeSigResult.signatureValid, false);
  console.log('  ✓ UpdateVerifier probado con éxito.');

  // =========================================================================
  // 2. UPDATE SWAPPER (Scripts atómicos y operaciones directas de swap/rollback)
  // =========================================================================
  console.log('[2/4] Verificando UpdateSwapper (Generador de scripts y swap nativo)...');

  const swapOptions = {
    targetExePath: currentBin,
    newExePath: newBin,
    backupExePath: backupBin,
    timeoutSeconds: 10,
    processNamesToKill: ['BentianAgent', 'BentianTray'],
    scriptDir: testDir,
  };

  // 2.1 Generación de scripts .bat y .ps1
  const ps1 = UpdateSwapper.generatePowerShellScript(swapOptions);
  assert(ps1.includes('BentianAgent'), 'El script debe contemplar el proceso BentianAgent');
  assert(ps1.includes('BentianTray'), 'El script debe contemplar el proceso BentianTray');
  assert(ps1.includes('Start-Sleep -Seconds 1'), 'El script debe contener bucle de monitorización');
  assert(ps1.includes('10'), 'El script debe monitorizar durante 10 segundos');
  assert(ps1.includes('ROLLBACK DE SEGURIDAD'), 'El script debe incluir la rutina de rollback automático');

  const bat = UpdateSwapper.generateBatchScript(swapOptions);
  assert(bat.includes('bentian-apply-update.ps1'), 'El archivo bat debe enlazar con el script PowerShell');

  const written = UpdateSwapper.writeAtomicScripts(swapOptions);
  assert(fs.existsSync(written.batPath), 'El archivo bentian-apply-update.bat debe existir en disco');
  assert(fs.existsSync(written.ps1Path), 'El archivo bentian-apply-update.ps1 debe existir en disco');

  // 2.2 Swap directo de archivos
  const directSwapResult = await UpdateSwapper.performDirectSwap(currentBin, newBin, backupBin);
  assert.strictEqual(directSwapResult.success, true);
  assert(fs.existsSync(backupBin), 'El binario original debe haber sido respaldado en .bak');
  assert.strictEqual(fs.readFileSync(backupBin, 'utf8'), 'BENTIAN-AGENT-v1.0.0-BIN');
  assert.strictEqual(fs.readFileSync(currentBin, 'utf8'), 'BENTIAN-AGENT-v1.1.0-BIN');

  // 2.3 Rollback directo de archivos
  const directRollbackResult = await UpdateSwapper.performDirectRollback(currentBin, backupBin);
  assert.strictEqual(directRollbackResult.success, true);
  assert.strictEqual(fs.readFileSync(currentBin, 'utf8'), 'BENTIAN-AGENT-v1.0.0-BIN');
  console.log('  ✓ UpdateSwapper probado con éxito.');

  // =========================================================================
  // 3. UPDATE CLIENT (EventBus, estados y ciclo)
  // =========================================================================
  console.log('[3/4] Verificando UpdateClient (EventBus y gestión de estados)...');

  const eventBus = new EventBus();
  const updateEventsEmitted: string[] = [];

  eventBus.on('update:available', () => updateEventsEmitted.push('update:available'));
  eventBus.on('update:downloading', () => updateEventsEmitted.push('update:downloading'));
  eventBus.on('update:ready', () => updateEventsEmitted.push('update:ready'));
  eventBus.on('update:failed', () => updateEventsEmitted.push('update:failed'));

  const client = new UpdateClient(
    {
      apiBaseUrl: 'http://127.0.0.1:9999',
      agentId: 'agent_unit_test',
      currentVersion: '1.0.0',
      tempDir: path.join(testDir, 'temp'),
      backupDir: path.join(testDir, 'backup'),
    },
    eventBus
  );

  const initialStatus = client.getStatus();
  assert.strictEqual(initialStatus.status, 'idle');
  assert.strictEqual(initialStatus.currentVersion, '1.0.0');

  // Event emission verification
  eventBus.emit('update:available', { version: '1.2.0' });
  eventBus.emit('update:ready', { version: '1.2.0', filePath: currentBin });
  assert(updateEventsEmitted.includes('update:available'));
  assert(updateEventsEmitted.includes('update:ready'));
  console.log('  ✓ UpdateClient probado con éxito.');

  // Limpieza
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  console.log('[4/4] Limpieza completada.');
  console.log('✓ ALL NATIVE SILENT & SECURE UPDATE TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
