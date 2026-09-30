import assert from 'assert';
import { OrderNotifierService } from '../src/notifications/order-notifier.service';
import { CanonicalOrder } from '@erp-bridge/shared';
import { AgentConfigFile } from '../src/config/config.types';

async function testOrderNotifier() {
  console.log('🧪 Iniciando pruebas automatizadas de OrderNotifierService...');

  const mockOrder: CanonicalOrder = {
    id: 'wc_1042',
    orderNumber: '1042',
    series: 'W',
    reference: 'WEB-1042',
    date: new Date(),
    status: 'pending',
    currency: 'EUR',
    customer: {
      id: 'cust_1',
      fiscalName: 'Ferretería Industrial Rubio S.L.',
      taxId: 'B12345678',
      email: 'pedidos@suministrosrubio.com',
      phone: '968123456',
      hasEquivalenceSurcharge: false,
    },
    shippingAddress: {
      street: 'Polígono Industrial Oeste, Calle A, Nave 4',
      postalCode: '30169',
      city: 'San Ginés',
      state: 'Murcia',
      country: 'ES',
    },
    lines: [
      {
        id: 'line_1',
        position: 1,
        sku: 'MART-001',
        name: 'Martillo Encofrador 500g Bellota',
        quantity: 2,
        unitPrice: 15.5,
        vatPercent: 21,
        vatType: 0,
        subtotal: 31.0,
        total: 37.51,
        discountPercent: 0,
      },
      {
        id: 'line_2',
        position: 2,
        sku: 'DISC-115',
        name: 'Disco Corte Metal 115x1mm Pferd',
        quantity: 10,
        unitPrice: 1.8,
        vatPercent: 21,
        vatType: 0,
        subtotal: 18.0,
        total: 21.78,
        discountPercent: 0,
      },
    ],
    netAmount: 49.0,
    taxAmount: 10.29,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 59.29,
    hasEquivalenceSurcharge: false,
    warehouse: 'GEN',
    notes: 'Entregar por la mañana en horario de 8:00 a 14:00.',
  };

  // Test 1: Si las alertas están desactivadas, no debe hacer nada y devolver success=false sin lanzar error
  console.log('  -> Test 1: Verificar comportamiento con alertas desactivadas...');
  const disabledConfig: AgentConfigFile = {
    notifications: {
      orderAlertsEnabled: false,
      alertEmail: 'test@empresa.com',
    },
  };
  const resDisabled = await OrderNotifierService.notifyNewOrder({
    order: mockOrder,
    channel: 'universal_bridge',
    factusolOrderNumber: 42,
    series: 'W',
    config: disabledConfig,
  });
  assert.strictEqual(resDisabled.success, false);
  console.log('  ✓ Correctamente omitido cuando orderAlertsEnabled=false.');

  // Test 2: Si no hay email configurado, tampoco debe lanzar excepción
  console.log('  -> Test 2: Verificar comportamiento sin email de destino...');
  const noEmailConfig: AgentConfigFile = {
    notifications: {
      orderAlertsEnabled: true,
      alertEmail: '',
    },
  };
  const resNoEmail = await OrderNotifierService.notifyNewOrder({
    order: mockOrder,
    channel: 'woocommerce',
    factusolOrderNumber: 43,
    series: 'W',
    config: noEmailConfig,
  });
  assert.strictEqual(resNoEmail.success, false);
  console.log('  ✓ Correctamente controlado cuando alertEmail está vacío.');

  // Test 3: Validación del método sendTestEmail sin email
  console.log('  -> Test 3: Verificar validación en sendTestEmail...');
  const testResEmpty = await OrderNotifierService.sendTestEmail({
    orderAlertsEnabled: true,
    alertEmail: '',
  });
  assert.strictEqual(testResEmpty.success, false);
  assert.ok(testResEmpty.message.includes('email de destino'));
  console.log('  ✓ Validación de email requerida verificada.');

  console.log('======================================================================');
  console.log('🎉 TODOS LOS TESTS DE ORDER NOTIFIER PASARON CON ÉXITO');
  console.log('======================================================================');
}

testOrderNotifier().catch((err) => {
  console.error('❌ Error en test de OrderNotifier:', err);
  process.exit(1);
});
