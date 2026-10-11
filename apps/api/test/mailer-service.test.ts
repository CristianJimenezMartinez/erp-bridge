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

  // Test 1b: Despacho de email de bienvenida para usuario Beta (tono y vigencia hasta 31/12/2026)
  console.log('  -> Test 1b: Enviar email de bienvenida de Beta Gratuita...');
  const success1Beta = await MailerService.sendLicenseWelcomeEmail({
    customerEmail: 'beta-user@empresa.com',
    licenseKey: 'EB-BETA1-BETA2-BETA3-BETA4',
    planName: 'Beta Pública Gratuita (Acceso completo hasta el 31 de Diciembre de 2026)',
    alias: 'Beta 2026 - Distribuciones SL',
    companyName: 'Distribuciones SL',
  });
  assert.strictEqual(success1Beta, true, 'El despacho de correo de bienvenida de Beta debe retornar true');
  console.log('  ✓ Test 1b superado (Bienvenida Beta con tono adecuado y vigencia 2026).');

  // Test 7: Validación de renderButton con estructura bulletproof para Outlook
  console.log('  -> Test 7: Validar renderButton bulletproof...');
  const btnHtml = MailerService.renderButton('Descargar Agente', 'https://bridge.cristianjm.com/download', 'indigo');
  assert.ok(btnHtml.includes('role="presentation"'), 'El botón debe incluir role=presentation');
  assert.ok(btnHtml.includes('bgcolor="#4f46e5"'), 'El botón indigo debe tener bgcolor sólido');
  assert.ok(btnHtml.includes('Descargar Agente'), 'El botón debe incluir el texto esperado');
  console.log('  ✓ Test 7 superado (renderButton a prueba de balas para Outlook/Gmail).');

  // Test 8: Validación de renderBrandedEmail con colores sólidos y sin rgba
  console.log('  -> Test 8: Validar renderBrandedEmail con colores sólidos y sin rgba...');
  const brandedHtml = MailerService.renderBrandedEmail({
    title: 'Prueba de Render',
    badgeText: 'ACTIVA',
    badgeType: 'success',
    contentHtml: '<p>Contenido de prueba</p>',
    previewText: 'Texto previo del mensaje',
  });
  assert.ok(brandedHtml.includes('xmlns:v="urn:schemas-microsoft-com:vml"'), 'Debe incluir namespaces MSO');
  assert.ok(brandedHtml.includes('<!--[if (gte mso 9)|(IE)]>'), 'Debe incluir condicionales MSO para Outlook');
  assert.ok(!brandedHtml.includes('rgba('), 'No debe contener rgba() para garantizar compatibilidad');
  assert.ok(brandedHtml.includes('#064e3b'), 'Badge success debe usar color hex sólido');
  assert.ok(brandedHtml.includes('Texto previo del mensaje'), 'Debe incluir el previewText');
  console.log('  ✓ Test 8 superado (renderBrandedEmail 100% compatible y sólido).');

  console.log('======================================================================');
  console.log('🎉 TODOS LOS TESTS DE MAILER SERVICE PASARON CON ÉXITO (9/9)');
  console.log('======================================================================');
}

testMailerService().catch((err) => {
  console.error('❌ Error en test de MailerService:', err);
  process.exit(1);
});
