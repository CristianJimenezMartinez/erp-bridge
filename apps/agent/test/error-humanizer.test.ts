import assert from 'assert';
import { humanizeError, HumanizedError } from '../src/gui/error-humanizer';

console.log('--- Probando Catálogo Centralizado de Humanización de Errores ---');

function assertValidHumanized(err: HumanizedError, expectedCode: string, expectedTab: string) {
  assert.strictEqual(err.code, expectedCode, `Código esperado ${expectedCode}, recibido ${err.code}`);
  assert.strictEqual(err.targetTab, expectedTab, `Pestaña esperada ${expectedTab}, recibida ${err.targetTab}`);
  assert(err.title && err.title.length > 5, `El título debe ser descriptivo: ${err.title}`);
  assert(err.message && err.message.length > 10, `El mensaje debe explicar la causa: ${err.message}`);
  assert(err.suggestion && err.suggestion.length > 10, `La sugerencia debe ser práctica: ${err.suggestion}`);
  assert(err.actionLabel && err.actionLabel.length > 3, `Debe contener etiqueta de acción: ${err.actionLabel}`);
  assert(err.targetInputId, `Debe indicar el control objetivo (targetInputId)`);
}

// 1. Factusol OLEDB Missing / 0x80004005
console.log('1. Verificando error OLEDB / 0x80004005...');
const e1 = humanizeError('Error OLEDB: 0x80004005 El proveedor Microsoft.ACE.OLEDB.12.0 no está registrado en el equipo local.');
assertValidHumanized(e1, 'ERR_OLEDB_MISSING', 'factusol');
assert(e1.helpUrl && e1.helpUrl.includes('factusol-oledb-guide'));
console.log('   ✓ Mapeado correctamente a ERR_OLEDB_MISSING -> tab "factusol".');

// 2. Factusol File Not Found / Invalid Path
console.log('2. Verificando error Archivo no encontrado / Ruta no válida...');
const e2 = humanizeError('ENOENT: Archivo no encontrado en C:\\Software DELSOL\\Factusol\\Datos\\FS\\2262026.accdb');
assertValidHumanized(e2, 'ERR_FACTUSOL_FILE_NOT_FOUND', 'factusol');
assert.strictEqual(e2.targetInputId, 'input-factusol-db');
console.log('   ✓ Mapeado correctamente a ERR_FACTUSOL_FILE_NOT_FOUND -> input-factusol-db.');

// 3. Factusol Exclusive Lock / .ldb / .laccdb
console.log('3. Verificando error Bloqueo .ldb / .laccdb...');
const e3 = humanizeError('El motor de base de datos Microsoft Access detuvo el proceso porque otro usuario está intentando cambiar los mismos datos (.laccdb bloqueado en modo exclusivo).');
assertValidHumanized(e3, 'ERR_FACTUSOL_EXCLUSIVE_LOCK', 'factusol');
console.log('   ✓ Mapeado correctamente a ERR_FACTUSOL_EXCLUSIVE_LOCK -> tab "factusol".');

// 4. Web Channel 401 Unauthorized / Authorization Headers Blocked
console.log('4. Verificando error 401 Unauthorized / cabeceras bloqueadas...');
const e4 = humanizeError('HTTP 401 Unauthorized: cabeceras de autorización bloqueadas por el servidor Apache/LiteSpeed');
assertValidHumanized(e4, 'ERR_WEB_AUTH_BLOCKED', 'channel');
assert(e4.snippet && e4.snippet.includes('HTTP_AUTHORIZATION'));
console.log('   ✓ Mapeado correctamente a ERR_WEB_AUTH_BLOCKED con snippet .htaccess.');

// 5. WooCommerce 403 Forbidden / Read-Only Keys
console.log('5. Verificando error 403 Forbidden / claves de solo lectura...');
const e5 = humanizeError('HTTP 403 Forbidden: woocommerce_rest_cannot_edit - Las claves de WooCommerce tienen permisos de solo lectura');
assertValidHumanized(e5, 'ERR_WOO_PERMISSIONS', 'channel');
assert.strictEqual(e5.targetInputId, 'input-wc-key');
console.log('   ✓ Mapeado correctamente a ERR_WOO_PERMISSIONS -> input-wc-key.');

// 6. Network Connection Failed / Refused / Timeout
console.log('6. Verificando error ECONNREFUSED / ETIMEDOUT...');
const e6 = humanizeError('FetchError: connect ECONNREFUSED 192.168.1.100:443. No se pudo conectar con la tienda.');
assertValidHumanized(e6, 'ERR_WEB_CONNECTION_FAILED', 'channel');
assert.strictEqual(e6.targetInputId, 'input-wc-url');
console.log('   ✓ Mapeado correctamente a ERR_WEB_CONNECTION_FAILED -> input-wc-url.');

// 7. License Expired / Trial Concluded
console.log('7. Verificando error EXPIRED / Periodo de prueba finalizado...');
const e7 = humanizeError('LICENSE_EXPIRED: Periodo de prueba finalizado para este HWID.');
assertValidHumanized(e7, 'ERR_LICENSE_EXPIRED', 'license');
assert(e7.helpUrl && e7.helpUrl.includes('upgrade'));
console.log('   ✓ Mapeado correctamente a ERR_LICENSE_EXPIRED -> tab "license".');

// 8. License Invalid Key
console.log('8. Verificando error INVALID_KEY / Clave no encontrada...');
const e8 = humanizeError('INVALID_KEY: Clave no encontrada o formato de clave inválido.');
assertValidHumanized(e8, 'ERR_LICENSE_INVALID', 'license');
assert.strictEqual(e8.targetInputId, 'input-lic-key');
console.log('   ✓ Mapeado correctamente a ERR_LICENSE_INVALID -> input-lic-key.');

// 9. Windows Script Host / cscript.exe Blocked by EDR / Antivirus
console.log('9. Verificando error cscript.exe bloqueado por antivirus/EDR...');
const e9 = humanizeError('Error de ejecución: cscript.exe bloqueado por directiva de software o antivirus EDR.');
assertValidHumanized(e9, 'ERR_CSCRIPT_BLOCKED', 'overview');
assert.strictEqual(e9.targetInputId, 'pf-alert-box');
console.log('   ✓ Mapeado correctamente a ERR_CSCRIPT_BLOCKED -> tab "overview" pf-alert-box.');

// 10. Universal Bridge Endpoint Not Found (404)
console.log('10. Verificando error 404 erp-bridge-endpoint.php...');
const e10 = humanizeError('HTTP 404 Not Found: erp-bridge-endpoint.php no encontrado en la URL.');
assertValidHumanized(e10, 'ERR_ENDPOINT_NOT_FOUND', 'channel');
console.log('   ✓ Mapeado correctamente a ERR_ENDPOINT_NOT_FOUND -> tab "channel".');

// 11. SSL Certificate Error
console.log('11. Verificando error SSL...');
const e11 = humanizeError('DEPTH_ZERO_SELF_SIGNED_CERT: Certificado SSL no válido.');
assertValidHumanized(e11, 'ERR_SSL_INVALID', 'channel');
console.log('   ✓ Mapeado correctamente a ERR_SSL_INVALID -> tab "channel".');

// 12. Objeto de error y fallback genérico
console.log('12. Verificando objeto de error y fallback genérico...');
const e12Obj = humanizeError({ message: 'Error de red inesperado al consultar base de datos', code: 500 });
assert(e12Obj.code, 'Debe devolver código');
assert(e12Obj.title, 'Debe devolver título');
assert.strictEqual(e12Obj.targetTab, 'logs');

const e12Unknown = humanizeError('Un error completamente extraño que nadie esperaba');
assert.strictEqual(e12Unknown.code, 'ERR_INTERNAL_GENERIC');
assert.strictEqual(e12Unknown.targetTab, 'logs');
console.log('   ✓ Fallback genérico operacional.');

console.log('🎉 Todos los casos del catálogo de errores humanizados validados con éxito.');
