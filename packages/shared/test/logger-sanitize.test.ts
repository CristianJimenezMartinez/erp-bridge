import assert from 'assert';
import { sanitizeMessage, sanitizeObject, Logger } from '../src/utils/logger';

console.log('--- Running Logger Sanitization Tests ---');

function runTests() {
  // 1. Enmascarar claves de licencia
  console.log('1. Probando enmascaramiento de claves de licencia...');
  const licMsg = 'Licencia activada con éxito: EB-6CABA-G5WSX-EQ6N3-FWHWK en cliente';
  const cleanLic = sanitizeMessage(licMsg);
  assert(!cleanLic.includes('6CABA-G5WSX-EQ6N3-FWHWK'), 'La clave no debe aparecer en claro');
  assert(cleanLic.includes('EB-*****-*****-*****-*****'), 'Debe estar enmascarada con asteriscos');
  console.log('  ✓ Clave de licencia enmascarada correctamente.');

  // 2. Enmascarar tokens Bearer y JWTs
  console.log('2. Probando enmascaramiento de tokens...');
  const bearerMsg = 'Request fallido con Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.xyz';
  const cleanBearer = sanitizeMessage(bearerMsg);
  assert(!cleanBearer.includes('eyJhbGciOiJIUzI1NiJ9'), 'El JWT no debe aparecer');
  assert(cleanBearer.includes('Bearer ***REDACTED***'), 'Debe indicar Bearer ***REDACTED***');

  const stripeMsg = 'Checkout con sk_live_51Abcdefghijklmnop123456789 y webhook whsec_9876543210fedcba';
  const cleanStripe = sanitizeMessage(stripeMsg);
  assert(!cleanStripe.includes('sk_live_51Abcdefghijklmnop123456789'));
  assert(!cleanStripe.includes('whsec_9876543210fedcba'));
  console.log('  ✓ Tokens Bearer, JWT y Stripe enmascarados correctamente.');

  // 3. Enmascarar contraseñas
  console.log('3. Probando enmascaramiento de contraseñas...');
  const passMsg1 = 'Conexión a BD con password="MiPasswordSuperSecreta"';
  const cleanPass1 = sanitizeMessage(passMsg1);
  assert(!cleanPass1.includes('MiPasswordSuperSecreta'), 'La contraseña no debe aparecer');
  assert(cleanPass1.includes('password="***REDACTED***"'), 'Debe reemplazar el valor de la contraseña');

  const passMsg2 = 'Fallo en login: pass=123456789 usuario=juan';
  const cleanPass2 = sanitizeMessage(passMsg2);
  assert(!cleanPass2.includes('123456789'), 'El pass no debe aparecer');
  console.log('  ✓ Contraseñas enmascaradas correctamente.');

  // 4. Enmascarar números de tarjeta de crédito
  console.log('4. Probando enmascaramiento de números de tarjeta...');
  const cardMsg1 = 'Cobro procesado en tarjeta 4532 1234 5678 9010 para cliente';
  const cleanCard1 = sanitizeMessage(cardMsg1);
  assert(!cleanCard1.includes('4532 1234 5678 9010'), 'El número de tarjeta no debe aparecer');
  assert(cleanCard1.includes('****-****-****-****'), 'Debe mostrar máscara de tarjeta');

  const cardMsg2 = 'Amex 3782-822463-10005 aprobada';
  const cleanCard2 = sanitizeMessage(cardMsg2);
  assert(!cleanCard2.includes('3782-822463-10005'));

  const cardMsg3 = 'Tarjeta compacta 4111111111111111 registrada';
  const cleanCard3 = sanitizeMessage(cardMsg3);
  assert(!cleanCard3.includes('4111111111111111'));
  console.log('  ✓ Tarjetas de crédito (Visa, Mastercard, Amex) enmascaradas correctamente.');

  // 5. Preservar timestamps de 13 dígitos y texto normal
  console.log('5. Probando preservación de timestamps y datos normales...');
  const normalMsg = 'Sincronización finalizada en 1789549705603 ms con 50 productos.';
  const cleanNormal = sanitizeMessage(normalMsg);
  assert.strictEqual(cleanNormal, normalMsg, 'Timestamps numéricos legítimos no deben alterarse');
  console.log('  ✓ Timestamps legítimos preservados.');

  // 6. Probando Logger formatMessage
  console.log('6. Probando Logger.info con sanitización integrada...');
  const logger = new Logger('TestContext');
  let capturedLog = '';
  const originalLog = console.log;
  console.log = (str: string) => {
    capturedLog = str;
  };

  try {
    logger.info('Cliente con EB-98765-ABCDE-12345-VWXYZ y tarjeta 4532-1111-2222-3333', {
      user: 'test_user',
      apiKey: 'secret_key_12345',
    });
  } finally {
    console.log = originalLog;
  }

  assert(capturedLog.length > 0, 'Debe haber capturado el log');
  const parsed = JSON.parse(capturedLog);
  assert(!parsed.message.includes('98765-ABCDE-12345-VWXYZ'), 'Licencia en message debe estar enmascarada');
  assert(!parsed.message.includes('4532-1111-2222-3333'), 'Tarjeta en message debe estar enmascarada');
  assert.strictEqual(parsed.apiKey, '***REDACTED***', 'apiKey en context debe estar enmascarada');

  // 7. Probando sanitizeObject directo
  const sanitizedObj = sanitizeObject({ token: 'my_secret_token', normal: 'regular_data' }) as any;
  assert.strictEqual(sanitizedObj.token, '***REDACTED***');
  assert.strictEqual(sanitizedObj.normal, 'regular_data');

  console.log('  ✓ Logger formatMessage y sanitizeObject funcionan correctamente.');

  console.log('✓ ALL LOGGER SANITIZATION TESTS PASSED!');
}

runTests();
