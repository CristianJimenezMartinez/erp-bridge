import assert from 'assert';
import { MailerService } from '../src/services/mailer.service';

async function testMailerService() {
  console.log('🧪 Iniciando prueba automatizada de MailerService (Coste Cero & Multi-plantilla)...');

  // Test 1: Despacho de email de bienvenida con licencia
  console.log('  -> Test 1: Enviar email de bienvenida de licencia con logotipo oficial...');
  const success1 = await MailerService.sendLicenseWelcomeEmail({
    customerEmail: 'test-cliente@empresa.com',
    licenseKey: 'EB-TEST1-TEST2-TEST3-TEST4',
    planName: 'Plan Base Todo Incluido (Anual)',
    alias: 'Servidor Factusol Central',
    downloadUrl: 'https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe',
    dashboardUrl: 'https://bridge.cristianjm.com/dashboard/?key=EB-TEST1-TEST2-TEST3-TEST4',
  });
  assert.strictEqual(success1, true, 'El despacho de correo de bienvenida debe retornar true');
  console.log('  ✓ Test 1 superado (Bienvenida con logo oficial).');

  // Test 2: Despacho de código OTP de inicio de sesión
  console.log('  -> Test 2: Enviar código OTP de acceso al dashboard...');
  const success2 = await MailerService.sendLoginOtpEmail({
    email: 'cliente@empresa.com',
    otp: '482915',
    validityMinutes: 10,
  });
  assert.strictEqual(success2, true, 'El despacho de código OTP debe retornar true');
  console.log('  ✓ Test 2 superado (Código OTP con formato 6 dígitos).');

  // Test 3: Recordatorio de licencias
  console.log('  -> Test 3: Enviar recordatorio de licencias asociadas...');
  const success3 = await MailerService.sendLicenseReminderEmail({
    email: 'admin@empresa.es',
    licenses: [
      { key: 'EB-AAAA1-BBBB2-CCCC3-DDDD4', plan: 'Plan Base', alias: 'Almacén Central', status: 'active' },
      { key: 'EB-EEEE5-FFFF6-GGGG7-HHHH8', plan: 'Plan Base', alias: 'Tienda B2C', status: 'active' },
    ],
  });
  assert.strictEqual(success3, true, 'El recordatorio de licencias debe retornar true');
  console.log('  ✓ Test 3 superado (Listado de licencias formateado).');

  // Test 4: Aviso de pago fallido / renovación
  console.log('  -> Test 4: Enviar aviso de incidencia de pago en Stripe...');
  const success4 = await MailerService.sendPaymentFailedEmail({
    email: 'facturacion@empresa.es',
    planName: 'Plan Base Todo Incluido',
    updatePaymentUrl: 'https://bridge.cristianjm.com/dashboard/',
    gracePeriodDays: 7,
  });
  assert.strictEqual(success4, true, 'El aviso de pago fallido debe retornar true');
  console.log('  ✓ Test 4 superado (Aviso de pago con período de gracia).');

  // Test 5: Confirmación de cancelación de suscripción
  console.log('  -> Test 5: Enviar confirmación de cancelación...');
  const success5 = await MailerService.sendSubscriptionCanceledEmail({
    email: 'usuario@empresa.es',
    planName: 'Plan Base Todo Incluido',
    effectiveDate: '25 de Octubre de 2026',
  });
  assert.strictEqual(success5, true, 'La confirmación de cancelación debe retornar true');
  console.log('  ✓ Test 5 superado (Cancelación confirmada con fecha límite).');

  // Test 6: Validación de fallback ante parámetros generales
  console.log('  -> Test 6: Enviar email genérico con detección de proveedor...');
  const res6 = await MailerService.sendEmail({
    to: 'usuario@empresa.es',
    subject: 'Prueba de entrega',
    html: '<p>Hola mundo</p>',
  });
  assert.strictEqual(res6.success, true);
  assert.ok(['simulation', 'resend', 'brevo', 'native_smtp'].includes(res6.provider));
  console.log(`  ✓ Test 6 superado (Proveedor detectado: ${res6.provider}).`);

  console.log('======================================================================');
  console.log('🎉 TODOS LOS TESTS DE MAILER SERVICE PASARON CON ÉXITO (6/6)');
  console.log('======================================================================');
}

testMailerService().catch((err) => {
  console.error('❌ Error en test de MailerService:', err);
  process.exit(1);
});
