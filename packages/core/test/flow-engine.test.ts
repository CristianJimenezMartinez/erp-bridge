import assert from 'assert';
import { FlowEngine } from '../src/engine/flow.engine';
import { FlowService } from '../src/services/flow.service';
import { BridgeEvent } from '@erp-bridge/shared';

console.log('--- Running Core FlowEngine & Reactive Automation Tests ---');

async function runTests() {
  const flowService = new FlowService();
  const flowEngine = FlowEngine.getInstance();
  const orgId = 'org_flow_test';

  // 1. Create a reactive flow: WHEN ORDER_CREATED -> IF totalAmount > 50 -> THEN DISPATCH_WEBHOOK
  const flow = await flowService.createFlow({
    organizationId: orgId,
    name: 'Auto-Notificar Pedidos Grandes',
    triggerEventType: 'ORDER_CREATED',
    filters: [
      {
        field: 'order.totalAmount',
        operator: 'GREATER_THAN',
        value: 50,
      },
    ],
    actions: [
      {
        id: 'act_webhook_1',
        type: 'DISPATCH_WEBHOOK',
        name: 'Webhook Slack / CRM',
        configuration: {
          url: 'https://webhook.site/dummy-test',
        },
      },
    ],
    isEnabled: true,
  });

  assert.strictEqual(flow.name, 'Auto-Notificar Pedidos Grandes');
  assert.strictEqual(flow.isEnabled, true);

  // 2. Test Filters Directly
  const matches = flowEngine.evaluateFilters(flow.filters, {
    order: { totalAmount: 120.5 },
  });
  assert.strictEqual(matches, true, 'Debe cumplir la condición > 50');

  const fails = flowEngine.evaluateFilters(flow.filters, {
    order: { totalAmount: 25.0 },
  });
  assert.strictEqual(fails, false, 'No debe cumplir la condición totalAmount = 25');

  // 3. Test Flow Execution with Matching Event
  const matchingEvent: BridgeEvent = {
    id: 'evt_test_1',
    type: 'ORDER_CREATED',
    organizationId: orgId,
    source: 'WooCommerce',
    timestamp: new Date(),
    status: 'RECEIVED',
    data: {
      order: {
        orderId: 'WC-999',
        totalAmount: 150.0,
      },
    },
  };

  const execSuccess = await flowEngine.executeFlow(flow, matchingEvent);
  assert.strictEqual(execSuccess.status, 'SUCCESS');
  assert.strictEqual(execSuccess.results.length, 1);
  assert.strictEqual(execSuccess.results[0]!.success, true);

  // 4. Test Flow Execution with Non-Matching Event (SKIPPED)
  const nonMatchingEvent: BridgeEvent = {
    id: 'evt_test_2',
    type: 'ORDER_CREATED',
    organizationId: orgId,
    source: 'WooCommerce',
    timestamp: new Date(),
    status: 'RECEIVED',
    data: {
      order: {
        orderId: 'WC-1000',
        totalAmount: 10.0,
      },
    },
  };

  const execSkipped = await flowEngine.executeFlow(flow, nonMatchingEvent);
  assert.strictEqual(execSkipped.status, 'SKIPPED');

  // 5. Test Toggle Flow
  const toggled = await flowService.toggleFlow(orgId, flow.id, false);
  assert.strictEqual(toggled.isEnabled, false);

  // 7. Test Multi-Tenant Isolation in handleEvent (API-005)
  // Ensure flow is active again
  await flowService.toggleFlow(orgId, flow.id, true);

  const foreignEvent: BridgeEvent = {
    id: 'evt_foreign_1',
    type: 'ORDER_CREATED',
    organizationId: 'org_foreign_attacker',
    source: 'WooCommerce',
    timestamp: new Date(),
    status: 'RECEIVED',
    data: {
      order: {
        orderId: 'WC-EVIL',
        totalAmount: 999.0,
      },
    },
  };
  const foreignExecs = await flowEngine.handleEvent(foreignEvent);
  assert.strictEqual(foreignExecs.length, 0, 'Evento de otra organización no debe disparar flujos de org_flow_test');

  // 8. Test SSRF Protection in Webhook Dispatch (API-005)
  const ssrfFlow = await flowService.createFlow({
    organizationId: orgId,
    name: 'SSRF Malicious Flow',
    triggerEventType: 'ORDER_CREATED',
    filters: [],
    actions: [
      {
        id: 'act_ssrf_metadata',
        type: 'DISPATCH_WEBHOOK',
        name: 'SSRF Cloud Metadata',
        configuration: {
          url: 'http://169.254.169.254/latest/meta-data',
        },
      },
      {
        id: 'act_ssrf_rfc1918',
        type: 'DISPATCH_WEBHOOK',
        name: 'SSRF Private IP',
        configuration: {
          url: 'https://192.168.1.1/admin',
        },
      },
    ],
    isEnabled: true,
  });

  const ssrfExec = await flowEngine.executeFlow(ssrfFlow, matchingEvent);
  assert.strictEqual(ssrfExec.status, 'FAILED', 'Flujo con destinos SSRF debe fallar');
  assert.strictEqual(ssrfExec.results[0]!.success, false, 'Destino 169.254.169.254 debe ser bloqueado');
  assert.strictEqual(ssrfExec.results[1]!.success, false, 'Destino 192.168.1.1 debe ser bloqueado');

  console.log('✓ Core FlowEngine & Reactive Automation Tests Passed (incl. Multi-Tenant & SSRF Security)');
}

runTests().catch((err) => {
  console.error('❌ Error en test FlowEngine:', err);
  process.exit(1);
});
