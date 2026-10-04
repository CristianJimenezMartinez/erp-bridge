import assert from 'assert';
import { humanizeError, HumanizedError } from '../src/gui/error-humanizer';

console.log('--- Probando Catálogo Extendido de Humanización de Errores (22 Reglas) ---');

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

// 2. Factusol File Not Found / Invalid Path
console.log('2. Verificando error Archivo no encontrado...');
const e2 = humanizeError('ENOENT: Archivo no encontrado en C:\\Software DELSOL\\Factusol\\Datos\\FS\\2262026.accdb');
assertValidHumanized(e2, 'ERR_FACTUSOL_FILE_NOT_FOUND', 'factusol');
assert.strictEqual(e2.targetInputId, 'input-factusol-db');

// 3. Factusol Exclusive Lock / .ldb / .laccdb
console.log('3. Verificando error Bloqueo .ldb / .laccdb...');
const e3 = humanizeError('El motor de base de datos Microsoft Access detuvo el proceso (.laccdb bloqueado en modo exclusivo).');
assertValidHumanized(e3, 'ERR_FACTUSOL_EXCLUSIVE_LOCK', 'factusol');

// 4. Factusol Corrupted / Unrecognized format
console.log('4. Verificando error Base de datos dañada...');
const e4 = humanizeError('Unrecognized database format "C:\\Factusol\\Datos\\1A.FDB" needs to be repaired');
assertValidHumanized(e4, 'ERR_FACTUSOL_CORRUPTED', 'factusol');

// 5. Factusol Table Missing / Not Factusol File
console.log('5. Verificando error Tabla no encontrada...');
const e5 = humanizeError('Could not find table F_ART in database');
assertValidHumanized(e5, 'ERR_FACTUSOL_TABLE_MISSING', 'factusol');

// 6. Factusol Read-Only File in Windows
console.log('6. Verificando error Solo Lectura...');
const e6 = humanizeError('Cannot update. Database or object is read-only. Permiso de escritura denegado');
assertValidHumanized(e6, 'ERR_FACTUSOL_READONLY_FILE', 'factusol');

// 7. Factusol NAS / Network Timeout
console.log('7. Verificando error NAS / Unidad de red...');
const e7 = humanizeError('0x80070035 The network path was not found. Unidad de red desconectada');
assertValidHumanized(e7, 'ERR_FACTUSOL_NAS_TIMEOUT', 'factusol');

// 8. Factusol Tariff Not Found
console.log('8. Verificando error Tarifa no encontrada...');
const e8 = humanizeError('Código de tarifa no válido: F_TAR no existe en Factusol');
assertValidHumanized(e8, 'ERR_TARIFF_NOT_FOUND', 'factusol');

// 9. Web Channel 401 Unauthorized / Authorization Headers Blocked
console.log('9. Verificando error 401 Unauthorized / cabeceras bloqueadas...');
const e9 = humanizeError('HTTP 401 Unauthorized: cabeceras de autorización bloqueadas por el servidor');
assertValidHumanized(e9, 'ERR_WEB_AUTH_BLOCKED', 'channel');
assert(e9.snippet && e9.snippet.includes('HTTP_AUTHORIZATION'));

// 10. WooCommerce 403 Forbidden / Read-Only Keys
console.log('10. Verificando error 403 Forbidden / claves de solo lectura...');
const e10 = humanizeError('HTTP 403 Forbidden: woocommerce_rest_cannot_edit - Las claves de WooCommerce tienen permisos de solo lectura');
assertValidHumanized(e10, 'ERR_WOO_PERMISSIONS', 'channel');

// 11. WooCommerce Pretty Permalinks Required
console.log('11. Verificando error Enlaces permanentes WordPress...');
const e11 = humanizeError('rest_no_route: No route was found matching the URL and request method');
assertValidHumanized(e11, 'ERR_WOO_PERMALINKS', 'channel');

// 12. Web Response HTML instead of JSON
console.log('12. Verificando error HTML devuelto en vez de JSON...');
const e12 = humanizeError('JSON.parse: Unexpected token < in JSON at position 0');
assertValidHumanized(e12, 'ERR_WEB_JSON_PARSE', 'channel');

// 13. Cloudflare WAF Block
console.log('13. Verificando error Cloudflare WAF...');
const e13 = humanizeError('Cloudflare Ray ID: 846201 Managed Challenge WAF block');
assertValidHumanized(e13, 'ERR_WEB_CLOUDFLARE_BLOCK', 'channel');

// 14. Web Server Timeout / Memory Exhausted
console.log('14. Verificando error Gateway Timeout 504...');
const e14 = humanizeError('HTTP 504 Gateway Timeout: Maximum execution time of 30 seconds exceeded');
assertValidHumanized(e14, 'ERR_WEB_TIMEOUT', 'sync');

// 15. Web Connection Failed / Refused
console.log('15. Verificando error ECONNREFUSED...');
const e15 = humanizeError('FetchError: connect ECONNREFUSED 192.168.1.100:443');
assertValidHumanized(e15, 'ERR_WEB_CONNECTION_FAILED', 'channel');

// 16. Universal Bridge Endpoint 404
console.log('16. Verificando error 404 erp-bridge-endpoint.php...');
const e16 = humanizeError('HTTP 404 Not Found: erp-bridge-endpoint.php');
assertValidHumanized(e16, 'ERR_ENDPOINT_NOT_FOUND', 'channel');

// 17. SSL Certificate Error
console.log('17. Verificando error SSL...');
const e17 = humanizeError('DEPTH_ZERO_SELF_SIGNED_CERT: Certificado SSL no válido');
assertValidHumanized(e17, 'ERR_SSL_INVALID', 'channel');

// 18. License Expired
console.log('18. Verificando error LICENSE_EXPIRED...');
const e18 = humanizeError('LICENSE_EXPIRED: Periodo de prueba finalizado');
assertValidHumanized(e18, 'ERR_LICENSE_EXPIRED', 'license');

// 19. License Invalid Key
console.log('19. Verificando error INVALID_KEY...');
const e19 = humanizeError('INVALID_KEY: Clave no encontrada o formato de clave inválido');
assertValidHumanized(e19, 'ERR_LICENSE_INVALID', 'license');

// 20. Windows Script Host Blocked
console.log('20. Verificando error cscript.exe bloqueado...');
const e20 = humanizeError('Error: cscript.exe bloqueado por antivirus EDR');
assertValidHumanized(e20, 'ERR_CSCRIPT_BLOCKED', 'overview');

// 21. Clock Drift
console.log('21. Verificando error Desfase reloj...');
const e21 = humanizeError('Clock drift detectado: desfase del reloj superior a 180s');
assertValidHumanized(e21, 'ERR_CLOCK_DESYNC', 'overview');

// 22. Disk Space Low
console.log('22. Verificando error Espacio en disco...');
const e22 = humanizeError('ENOSPC: No space left on device. Espacio en disco insuficiente');
assertValidHumanized(e22, 'ERR_DISK_SPACE_LOW', 'overview');

// 23. Fallback genérico operacional
console.log('23. Verificando fallback genérico...');
const eFallback = humanizeError('Algo completamente no catalogado');
assert.strictEqual(eFallback.code, 'ERR_INTERNAL_GENERIC');
assert.strictEqual(eFallback.targetTab, 'logs');

console.log('✅ TODAS LAS 22 REGLAS DE HUMANIZACIÓN DE ERRORES PASARON CON ÉXITO');
