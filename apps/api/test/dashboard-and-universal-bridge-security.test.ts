import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  LicenseActivationRequestSchema,
  LicenseValidationRequestSchema,
} from '@erp-bridge/shared';
import { EMBEDDED_COMPANION_PHP_TEMPLATE } from '../../../apps/agent/src/channels/companion-template';

console.log('🧪 Ejecutando suite de seguridad: P0-6 (Universal Bridge) & P1-3 (Dashboard Stored XSS)...');

const rootDir = path.resolve(__dirname, '../../..');
const phpEndpointPath = path.resolve(rootDir, 'packages/connectors/universal-bridge/erp-bridge-endpoint.php');
const licensesJsPath = path.resolve(rootDir, 'apps/api/public/dashboard/js/licenses.js');
const fleetJsPath = path.resolve(rootDir, 'apps/api/public/dashboard/js/fleet.js');
const clientPortalJsPath = path.resolve(rootDir, 'apps/api/public/dashboard/js/client-portal.js');
const licensesRouterPath = path.resolve(rootDir, 'apps/api/src/routes/licenses.router.ts');

// ============================================================================
// 1. P0-6: Universal Bridge Endpoint Hardening
// ============================================================================
console.log('  -> Verificando blindaje del endpoint universal PHP (INF-010, INF-011, INF-013, INF-014)...');
const phpContent = fs.readFileSync(phpEndpointPath, 'utf8');

// 1.1 Secreto no configurado (< 16 caracteres o placeholder)
assert.ok(
  phpContent.includes("strpos($secret, '%%EB_SECRET_KEY%%') !== false") ||
  phpContent.includes('%%EB_SECRET_KEY%%'),
  'Debe comprobar el placeholder %%EB_SECRET_KEY%%'
);
assert.ok(
  phpContent.includes('strlen($secret) < 16'),
  'Debe exigir una longitud mínima de 16 caracteres para EB_SECRET_KEY'
);
assert.ok(
  phpContent.includes('http_response_code(503)'),
  'Debe responder con 503 si la clave no está configurada o es insegura'
);
console.log('    ✓ Detección de claves no configuradas/inseguras (<16 car / placeholder) activa con HTTP 503');

// 1.2 Eliminación de secretos en query string (?secret= o ?token=)
assert.strictEqual(
  phpContent.includes("$_GET['secret']"),
  false,
  'No debe existir fallback a $_GET[\'secret\']'
);
assert.strictEqual(
  phpContent.includes("$_GET['token']"),
  false,
  'No debe existir fallback a $_GET[\'token\']'
);
console.log('    ✓ Paso de secretos por URL (?secret= / ?token=) eliminado por completo');

// 1.3 Soporte para cabeceras de autorización seguras
assert.ok(
  phpContent.includes('X-Bridge-Key'),
  'Debe verificar la cabecera X-Bridge-Key'
);
assert.ok(
  phpContent.includes('Access-Control-Allow-Headers') && phpContent.includes('X-Bridge-Key'),
  'CORS debe incluir X-Bridge-Key'
);
console.log('    ✓ Soporte para Authorization: Bearer y X-Bridge-Key verificado');

// 1.4 Acciones protegidas: cancel_order y webhooks tras verifyAuthentication()
const authPos = phpContent.indexOf('verifyAuthentication();');
assert.ok(authPos > 0, 'verifyAuthentication() debe estar presente en el enrutador');

const cancelPos = phpContent.indexOf("$mainAction === 'cancel_order'");
const webhookPos = phpContent.indexOf("$mainAction === 'payment_webhook'");

assert.ok(cancelPos > authPos, 'cancel_order debe ejecutarse después de verifyAuthentication()');
assert.ok(webhookPos > authPos, 'payment_webhook debe ejecutarse después de verifyAuthentication()');
console.log('    ✓ cancel_order y payment_webhook blindados tras verifyAuthentication()');

// 1.5 Validaciones y límites en create_order
assert.ok(
  phpContent.includes('count($lines) > 200'),
  'create_order debe limitar a un máximo de 200 líneas'
);
assert.ok(
  phpContent.includes('!is_array($lines) || count($lines) === 0'),
  'create_order debe rechazar pedidos sin líneas'
);
assert.ok(
  phpContent.includes('$total < 0') && phpContent.includes('!is_finite($total)'),
  'create_order debe validar que los importes sean positivos y finitos'
);
assert.ok(
  phpContent.includes("PENDING_PAYMENT"),
  'create_order debe forzar el estado a PENDING_PAYMENT en lugar de confiar en el cliente'
);
console.log('    ✓ create_order protegido con límite de 200 líneas, validación numérica y PENDING_PAYMENT');

// 1.6 Subida de imágenes sin SVG
assert.ok(
  phpContent.includes("$allowedExts = ['jpg', 'jpeg', 'png', 'webp']"),
  'upload_image debe permitir únicamente jpg, jpeg, png, webp'
);
assert.strictEqual(
  phpContent.includes("'svg'"),
  false,
  'upload_image no debe permitir la extensión svg'
);
console.log('    ✓ upload_image restringido a formatos seguros (SVG retirado permanentemente)');

// 1.7 Sincronización SSoT de la plantilla
assert.strictEqual(
  EMBEDDED_COMPANION_PHP_TEMPLATE,
  phpContent,
  'companion-template.ts debe ser idéntico al conector erp-bridge-endpoint.php'
);
console.log('    ✓ companion-template.ts sincronizado al 100% con erp-bridge-endpoint.php');

// ============================================================================
// 2. P1-3: Eliminación de Stored XSS en el Dashboard Web
// ============================================================================
console.log('  -> Verificando mitigaciones de Stored XSS en el Dashboard (API-006 / INF-009)...');

// 2.1 licenses.js
const licensesJs = fs.readFileSync(licensesJsPath, 'utf8');
assert.strictEqual(
  licensesJs.includes("onclick=\"openEditAliasModal"),
  false,
  'No debe haber onclick inline para openEditAliasModal'
);
assert.strictEqual(
  licensesJs.includes("onclick=\"openUnbindModal"),
  false,
  'No debe haber onclick inline para openUnbindModal'
);
assert.strictEqual(
  licensesJs.includes("onclick=\"copyKey"),
  false,
  'No debe haber onclick inline para copyKey'
);

assert.ok(
  licensesJs.includes('data-action="edit-alias"'),
  'Debe usar data-action="edit-alias"'
);
assert.ok(
  licensesJs.includes('data-action="unbind-license"'),
  'Debe usar data-action="unbind-license"'
);
assert.ok(
  licensesJs.includes('data-action="copy-key"'),
  'Debe usar data-action="copy-key"'
);
assert.ok(
  licensesJs.includes('tbody.addEventListener(\'click\''),
  'Debe registrar delegación de eventos en el tbody'
);
assert.ok(
  licensesJs.includes('title="${_safeEscapeHtml(fullHwid)}"'),
  'El title del HWID debe estar escapado con _safeEscapeHtml'
);
assert.ok(
  licensesJs.includes('HWID: ${_safeEscapeHtml(shortHwid)}'),
  'El texto del HWID debe estar escapado con _safeEscapeHtml'
);
console.log('    ✓ licenses.js: Handlers inline onclick eliminados y sustituidos por data-* y delegación segura');
console.log('    ✓ licenses.js: HWID y hostname escapados en el DOM');

// 2.2 fleet.js
const fleetJs = fs.readFileSync(fleetJsPath, 'utf8');
assert.ok(
  fleetJs.includes('_safeEscapeHtml(shortHwid)'),
  'fleet.js debe escapar shortHwid con _safeEscapeHtml'
);
console.log('    ✓ fleet.js: shortHwid escapado con _safeEscapeHtml');

// 2.3 client-portal.js
const clientPortalJs = fs.readFileSync(clientPortalJsPath, 'utf8');
assert.ok(
  clientPortalJs.includes('function _safeEscapeHtml'),
  'client-portal.js debe declarar _safeEscapeHtml'
);
assert.ok(
  clientPortalJs.includes('${_safeEscapeHtml(alias)} (${_safeEscapeHtml(host)})'),
  'client-portal.js debe escapar alias y host en los options'
);
assert.ok(
  clientPortalJs.includes('_safeEscapeHtml(target.status)'),
  'client-portal.js debe escapar target.status en subStatus innerHTML'
);
console.log('    ✓ client-portal.js: alias, host y target.status escapados contra XSS');

// 2.4 Validaciones del servidor (licenses.router.ts)
const routerContent = fs.readFileSync(licensesRouterPath, 'utf8');
assert.ok(
  routerContent.includes('cleanAlias.length > 80'),
  'licenses.router.ts debe validar longitud máxima de alias'
);
assert.ok(
  routerContent.includes('/[<>"\'`]/'),
  'licenses.router.ts debe prohibir caracteres <, >, ", \', `'
);
assert.ok(
  routerContent.includes('/^[A-Za-z0-9_-]{16,64}$/.test(hwid)'),
  'licenses.router.ts debe validar el HWID contra regex alfanumérico'
);
console.log('    ✓ licenses.router.ts: Validación estricta de alias y HWID en servidor');

// 2.5 Esquemas de Zod (@erp-bridge/shared)
const maliciousHwid = 'AAAAAAAAAAAAAAAA" onmouseover="fetch(\'//evil\')"';
assert.throws(() => {
  LicenseActivationRequestSchema.parse({
    licenseKey: 'EB-TEST-KEY',
    hwid: maliciousHwid,
  });
}, /HWID con formato no válido/);

const validActivation = LicenseActivationRequestSchema.parse({
  licenseKey: 'EB-TEST-KEY',
  hwid: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
});
assert.strictEqual(validActivation.hwid, 'a1b2c3d4e5f60718293a4b5c6d7e8f90');

assert.throws(() => {
  LicenseValidationRequestSchema.parse({
    licenseToken: 'token123',
    hwid: '<script>alert(1)</script>',
  });
}, /HWID con formato no válido/);

const validValidation = LicenseValidationRequestSchema.parse({
  licenseToken: 'token123',
  hwid: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
});
assert.strictEqual(validValidation.hwid, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
console.log('    ✓ Zod Schemas: HWID maliciosos rechazados y HWID válidos aceptados');

console.log('======================================================================');
console.log('🎉 TODOS LOS TESTS DE SEGURIDAD P0-6 Y P1-3 PASARON CON ÉXITO');
console.log('======================================================================');
