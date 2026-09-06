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

  // 6. List Executions
  const executions = await flowService.listExecutions(orgId, flow.id);
  assert(executions.length >= 2, 'Debe haber al menos 2 ejecuciones registradas');

  console.log('✓ Core FlowEngine & Reactive Automation Tests Passed');
}

runTests().catch((err) => {
  console.error('❌ Error en test FlowEngine:', err);
  process.exit(1);
});
