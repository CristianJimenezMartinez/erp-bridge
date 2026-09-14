import assert from 'assert';
import http from 'http';
import { Agent } from '@erp-bridge/shared';
import { PostgresAgentRepository, EventBus } from '@erp-bridge/core';
import { AgentMonitorService } from '../src/services/agent-monitor.service';
import { bootstrapApp } from '../src/server';

console.log('--- Running Deadman Switch & Agent Monitor Tests ---');

async function runTests() {
  const repo = new PostgresAgentRepository();
  const eventBus = EventBus.getInstance();
  const monitorService = new AgentMonitorService();

  const testOrgId = `org_monitor_${Date.now()}`;
  const now = Date.now();

  // 1. Seed test agents with controlled lastSeenAt timestamps
  const activeAgent: Agent = {
    id: `agent_act_${Date.now()}_1`,
    organizationId: testOrgId,
    name: 'Servidor Tienda Madrid (Online)',
    status: 'ONLINE',
    version: '0.1.5',
    platform: 'win32 (x64)',
    lastSeenAt: new Date(now - 2 * 60 * 1000), // 2 minutes ago
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const degradedAgent: Agent = {
    id: `agent_deg_${Date.now()}_2`,
    organizationId: testOrgId,
    name: 'Almacén Central Toledo (Degradado)',
    status: 'ONLINE',
    version: '0.1.5',
    platform: 'win32 (x64)',
    lastSeenAt: new Date(now - 2 * 60 * 60 * 1000), // 2 hours ago
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const deadmanAgent1: Agent = {
    id: `agent_dead_${Date.now()}_3`,
    organizationId: testOrgId,
    name: 'Sucursal Barcelona (Caído 26h)',
    status: 'ONLINE',
    version: '0.1.4',
    platform: 'win32 (x64)',
    lastSeenAt: new Date(now - 26 * 60 * 60 * 1000), // 26 hours ago
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const deadmanAgent2: Agent = {
    id: `agent_dead_${Date.now()}_4`,
    organizationId: testOrgId,
    name: 'Sucursal Valencia (Caído 50h)',
    status: 'ONLINE',
    version: '0.1.3',
    platform: 'win32 (x64)',
    lastSeenAt: new Date(now - 50 * 60 * 60 * 1000), // 50 hours ago
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await repo.create(activeAgent);
  await repo.create(degradedAgent);
  await repo.create(deadmanAgent1);
  await repo.create(deadmanAgent2);

  // 2. Track EventBus SYSTEM_ALERT emissions
  const receivedEvents: any[] = [];
  const unsubscribe = eventBus.subscribe('SYSTEM_ALERT', (event) => {
    receivedEvents.push(event);
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: checkInactiveAgents with default threshold = 24h
    // -------------------------------------------------------------
    console.log('1. Probando checkInactiveAgents(24)...');
    const alerts24 = await monitorService.checkInactiveAgents(24, testOrgId);

    assert.strictEqual(alerts24.length, 2, 'Debe detectar exactamente 2 agentes inactivos (> 24h)');

    const alertDead1 = alerts24.find((a) => a.agentId === deadmanAgent1.id);
    const alertDead2 = alerts24.find((a) => a.agentId === deadmanAgent2.id);

    assert(alertDead1, 'Debe incluir alerta para deadmanAgent1');
    assert(alertDead2, 'Debe incluir alerta para deadmanAgent2');

    assert.strictEqual(alertDead1.agentName, deadmanAgent1.name);
    assert.strictEqual(alertDead1.organizationId, testOrgId);
    assert(alertDead1.offlineDurationHours >= 25.9 && alertDead1.offlineDurationHours <= 26.2, `offlineDurationHours esperado ~26, recibido: ${alertDead1.offlineDurationHours}`);

    // Verify structured Mailer / SendGrid / Postmark payload
    assert(alertDead1.emailPayload, 'Debe incluir payload de email estructurado');
    assert.strictEqual(alertDead1.emailPayload.to, 'alerts@bentian.es');
    assert(alertDead1.emailPayload.subject.includes(deadmanAgent1.name));
    assert(alertDead1.emailPayload.html.includes(deadmanAgent1.id));
    assert(alertDead1.emailPayload.text.includes('DEADMAN SWITCH'));
    assert.strictEqual(alertDead1.emailPayload.metadata.alertType, 'INACTIVE_AGENT_DEADMAN_SWITCH');

    // Verify EventBus alerts delivered
    const eventDead1 = receivedEvents.find((e) => e.data?.agentId === deadmanAgent1.id);
    assert(eventDead1, 'EventBus debió recibir SYSTEM_ALERT para deadmanAgent1');
    assert.strictEqual(eventDead1.type, 'SYSTEM_ALERT');
    assert.strictEqual(eventDead1.source, 'AgentMonitorService');

    console.log('  ✓ checkInactiveAgents(24) validado correctamente');

    // -------------------------------------------------------------
    // TEST 2: checkInactiveAgents with custom threshold = 1h
    // -------------------------------------------------------------
    console.log('2. Probando checkInactiveAgents con umbral estricto (1h)...');
    const alerts1 = await monitorService.checkInactiveAgents(1, testOrgId);
    assert.strictEqual(alerts1.length, 3, 'Con umbral 1h debe detectar degradedAgent, deadmanAgent1 y deadmanAgent2');
    const hasDegraded = alerts1.some((a) => a.agentId === degradedAgent.id);
    assert(hasDegraded, 'degradedAgent debe ser detectado con umbral 1h');
    const hasActive = alerts1.some((a) => a.agentId === activeAgent.id);
    assert.strictEqual(hasActive, false, 'activeAgent (2 min) no debe ser detectado como caído');

    console.log('  ✓ Umbral configurable validado');

    // -------------------------------------------------------------
    // TEST 3: getFleetHealth report
    // -------------------------------------------------------------
    console.log('3. Probando getFleetHealth...');
    const fleetReport = await monitorService.getFleetHealth(testOrgId, 24);

    assert.strictEqual(fleetReport.status, 'CRITICAL', 'Estado global debe ser CRITICAL por agentes caídos');
    assert.strictEqual(fleetReport.summary.total, 4);
    assert.strictEqual(fleetReport.summary.active, 1);
    assert.strictEqual(fleetReport.summary.degraded, 1);
    assert.strictEqual(fleetReport.summary.inactive, 2);

    assert.strictEqual(fleetReport.agents.active[0]?.id, activeAgent.id);
    assert.strictEqual(fleetReport.agents.degraded[0]?.id, degradedAgent.id);
    assert.strictEqual(fleetReport.alerts.length, 2);

    console.log('  ✓ Reporte de salud de flota validado');

    // -------------------------------------------------------------
    // TEST 4: HTTP GET /api/v1/monitoring/agents/health endpoint
    // -------------------------------------------------------------
    console.log('4. Probando endpoint HTTP GET /api/v1/monitoring/agents/health...');
    const app = await bootstrapApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const res = await fetch(`${baseUrl}/api/v1/monitoring/agents/health?organizationId=${testOrgId}&thresholdHours=24`);
      assert.strictEqual(res.status, 200);

      const json = (await res.json()) as { data: any };
      assert(json.data, 'Debe devolver propiedad data');
      assert.strictEqual(json.data.status, 'CRITICAL');
      assert.strictEqual(json.data.summary.total, 4);
      assert.strictEqual(json.data.summary.active, 1);
      assert.strictEqual(json.data.summary.degraded, 1);
      assert.strictEqual(json.data.summary.inactive, 2);
      assert.strictEqual(json.data.alerts.length, 2);

      // Probar también ruta directa /monitoring/agents/health
      const directRes = await fetch(`${baseUrl}/monitoring/agents/health?organizationId=${testOrgId}&thresholdHours=24`);
      assert.strictEqual(directRes.status, 200);

      console.log('  ✓ Endpoint HTTP GET /api/v1/monitoring/agents/health validado al 100%');
    } finally {
      server.close();
    }
  } finally {
    unsubscribe();
  }

  console.log('✓ ALL DEADMAN SWITCH & AGENT MONITOR TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('❌ Error en test de AgentMonitor:', err);
  process.exit(1);
});
