import assert from 'assert';
import { AgentService } from '../src/services/agent.service';
import { AgentPairingRequest } from '@erp-bridge/shared';

console.log('--- Running Core Agent Service & Pairing Tests ---');

async function runTests() {
  const service = new AgentService();
  const orgId = 'org_test_123';

  // 1. Generate Pairing Token
  const tokenData = await service.generatePairingToken(orgId);
  assert(tokenData.token.startsWith('EB-'), 'El token debe comenzar por EB-');
  assert(tokenData.expiresAt > new Date(), 'El token debe ser futuro');

  // 2. Pair Agent with Token
  const pairReq: AgentPairingRequest = {
    pairingToken: tokenData.token,
    name: 'Windows Server Factusol PC',
    systemInfo: {
      platform: 'win32',
      arch: 'x64',
      osVersion: '10.0.19045',
      hostname: 'SRV-FACTUSOL',
      memoryTotalMb: 16384,
      memoryFreeMb: 8192,
      cpuCores: 8,
      nodeVersion: 'v20.11.0',
      uptimeSeconds: 3600,
    },
    detectedFactusol: [
      {
        databasePath: 'C:\\Software DELSOL\\Factusol\\Datos\\2252025.accdb',
        companyCode: '225',
        year: '2025',
        fileSizeBytes: 68000000,
        lastModified: new Date(),
        isValid: true,
      },
    ],
  };

  const pairResult = await service.pairAgent(pairReq);
  assert.strictEqual(pairResult.agent.name, 'Windows Server Factusol PC');
  assert.strictEqual(pairResult.agent.status, 'ONLINE');
  assert(pairResult.authToken.startsWith('eb_sec_'), 'Debe devolver token de seguridad');
  assert.strictEqual(pairResult.detectedFactusol.length, 1);

  // 3. Pairing token should now be consumed
  try {
    await service.pairAgent(pairReq);
    assert.fail('El token consumido no debe permitir emparejar de nuevo');
  } catch (err: any) {
    assert.strictEqual(err.code, 'AUTHENTICATION_FAILED');
  }

  // 4. Record Heartbeat
  const hbRes = await service.recordHeartbeat({
    agentId: pairResult.agent.id,
    status: 'ONLINE',
    systemInfo: pairReq.systemInfo,
    factusolHealth: {
      status: 'HEALTHY',
      latencyMs: 15,
      databasePath: 'C:\\Software DELSOL\\Factusol\\Datos\\2252025.accdb',
    },
    fileWatcherActive: true,
  });
  assert.strictEqual(hbRes.acknowledged, true);

  // 5. List Agents
  const agents = await service.listAgents(orgId);
  assert.strictEqual(agents.length, 1);
  assert.strictEqual(agents[0]!.status, 'ONLINE');

  console.log('✓ Core Agent Service & Pairing Tests Passed');
}

runTests().catch((err) => {
  console.error('❌ Error en test de AgentService:', err);
  process.exit(1);
});
