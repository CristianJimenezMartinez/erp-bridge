import assert from 'assert';
import { MailerService } from '../src/services/mailer.service';

async function testMailerService() {
  console.log('🧪 Iniciando prueba automatizada de MailerService (Coste Cero)...');

  // Test 1: Despacho de email de bienvenida con licencia
  console.log('  -> Test 1: Enviar email de bienvenida de licencia...');
  const success = await MailerService.sendLicenseWelcomeEmail({
    customerEmail: 'test-cliente@empresa.com',
    licenseKey: 'EB-TEST1-TEST2-TEST3-TEST4',
    planName: 'Plan Base Todo Incluido (Anual)',
    alias: 'Servidor Factusol Central',
    downloadUrl: 'https://bridge.cristianjm.com/releases/v0.3.1/Bentian-Setup-v0.3.1.exe',
    dashboardUrl: 'https://bridge.cristianjm.com/dashboard/?key=EB-TEST1-TEST2-TEST3-TEST4',
  });

  assert.strictEqual(success, true, 'El despacho de correo debe retornar true en cualquier entorno');
  console.log('  ✓ Test 1 superado (Despacho simulado / proveedor completado con éxito).');

  // Test 2: Validación de fallback ante parámetros generales
  console.log('  -> Test 2: Enviar email genérico...');
  const res2 = await MailerService.sendEmail({
    to: 'usuario@empresa.es',
    subject: 'Prueba de entrega',
    html: '<p>Hola mundo</p>',
  });

  assert.strictEqual(res2.success, true);
  assert.ok(['simulation', 'resend', 'brevo', 'native_smtp'].includes(res2.provider));
  console.log(`  ✓ Test 2 superado (Proveedor detectado: ${res2.provider}).`);

  console.log('======================================================================');
  console.log('🎉 TODOS LOS TESTS DE MAILER SERVICE PASARON CON ÉXITO');
  console.log('======================================================================');
}

testMailerService().catch((err) => {
  console.error('❌ Error en test de MailerService:', err);
  process.exit(1);
});
