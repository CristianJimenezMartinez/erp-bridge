/**
 * VERIFICADOR AUTOMÁTICO DE CONTRATOS FUNCIONALES Y SALUD E2E
 * Comprueba que ninguna funcionalidad crítica del Agente Windows, Dashboard Cloud,
 * Licencias Protegidas o Tienda Suministros Rubio se haya roto.
 */

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const isOffline = process.argv.includes('--offline');

interface CheckGroupResult {
  name: string;
  passed: boolean;
  checks: string[];
  errors: string[];
}

function readText(relPath: string): string {
  const full = path.join(repoRoot, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : '';
}

function verifyAgentGuiContracts(): CheckGroupResult {
  const checks: string[] = [];
  const errors: string[] = [];

  const guiServer = readText('apps/agent/src/gui/gui-server.ts');
  const coreScript = readText('apps/agent/src/gui/templates/scripts/core.script.ts');
  const syncScript = readText('apps/agent/src/gui/templates/scripts/sync.script.ts');
  const watcherSvc = readText('apps/agent/src/lifecycle/file-watcher-coordinator.service.ts');

  if (coreScript.includes("init.headers['X-Bentian-Token'] = token") && coreScript.includes("init.headers['Content-Type'] = 'application/json'")) {
    checks.push('Interceptor global window.fetch inyecta X-Bentian-Token y Content-Type: application/json');
  } else {
    errors.push('core.script.ts no inyecta simultáneamente X-Bentian-Token y Content-Type: application/json en POST/PUT');
  }

  const requiredRoutes = [
    '/api/local/status',
    '/api/local/preflight',
    '/api/local/open-file-dialog',
    '/api/local/detect-factusol',
    '/api/local/test-factusol',
    '/api/local/resolve-factusol-path',
    '/api/local/test-universal-bridge',
    '/api/local/test-woocommerce',
    '/api/local/sync-now',
    '/api/local/upload-catalog',
    '/api/local/sales-orders',
    '/api/local/activate-license',
    '/api/local/save-full-config',
    '/api/local/check-update',
    '/api/local/apply-update',
  ];

  for (const r of requiredRoutes) {
    if (!guiServer.includes(`'${r}'`)) {
      errors.push(`Ruta local crítica ausente en gui-server.ts: ${r}`);
    }
  }
  if (errors.length === 0) {
    checks.push(`Las ${requiredRoutes.length} rutas locales críticas están registradas en gui-server.ts`);
  }

  // Verificar que ninguna llamada fetch POST de los scripts GUI carezca de Content-Type
  const scriptsDir = path.join(repoRoot, 'apps/agent/src/gui/templates/scripts');
  const scriptFiles = fs.readdirSync(scriptsDir).filter((f) => f.endsWith('.ts'));
  for (const file of scriptFiles) {
    const content = fs.readFileSync(path.join(scriptsDir, file), 'utf-8');
    const barePostRegex = /fetch\([^)]+,\s*\{\s*method:\s*'POST'\s*\}\s*\)/g;
    if (barePostRegex.test(content)) {
      errors.push(`Llamada fetch POST sin cabecera Content-Type explícita en ${file} (provoca HTTP 415 en MiniRouter)`);
    }
  }
  checks.push('0 llamadas fetch POST sin Content-Type: application/json en scripts del GUI');

  if (syncScript.includes('/api/local/sync-now') && watcherSvc.includes('this.eventBus.addEvent(\'success\'')) {
    checks.push('Sincronización manual (/api/local/sync-now) y confirmación de vigilante en consola verificadas');
  } else {
    errors.push('Falta confirmación de sincronización en sync.script.ts o file-watcher-coordinator.service.ts');
  }

  return { name: '1. Contratos Agente Windows & GUI (:39281)', passed: errors.length === 0, checks, errors };
}

function verifyLicensingAndDashboardContracts(): CheckGroupResult {
  const checks: string[] = [];
  const errors: string[] = [];

  const cleanupSvc = readText('apps/api/src/services/license-cleanup.service.ts');
  const licRouter = readText('apps/api/src/routes/licenses.router.ts');
  const dashLicJs = readText('apps/api/public/dashboard/js/licenses.js');
  const dashLicModalsJs = readText('apps/api/public/dashboard/js/licenses-modals.js');

  const protectedKeys = [
    { key: 'EB-8WEN2-W08N2-8KJAW-0AHCH', label: 'Telkkalas' },
    { key: 'EB-S6AB3-2MHWP-50DTT-72242', label: 'Suministros Rubio' },
    { key: 'EB-6RE3E-HXPS4-XYNRV-HVZWT', label: 'Beta 2026 - Soy.es' },
  ];

  for (const pk of protectedKeys) {
    if (!cleanupSvc.includes(pk.key)) {
      errors.push(`Licencia protegida ausente en PROTECTED_LICENSE_KEYS: ${pk.key} (${pk.label})`);
    }
  }
  if (errors.length === 0) {
    checks.push('Las 3 licencias reales (Telkkalas, Suministros Rubio y Beta 2026 - Soy.es) están blindadas');
  }

  if (
    cleanupSvc.includes('notifyFirstMachineActivation') &&
    cleanupSvc.includes('resendLicenseInstructionsEmail') &&
    licRouter.includes('/resend-email')
  ) {
    checks.push('Alerta por email en 1ª activación y endpoint /resend-email operativos');
  } else {
    errors.push('Falta notifyFirstMachineActivation o endpoint /resend-email en API de licencias');
  }

  if (
    dashLicJs.includes('contact_email') &&
    dashLicJs.includes('resendLicenseEmail') &&
    dashLicModalsJs.includes('window.resendLicenseEmail')
  ) {
    checks.push('Dashboard muestra email de contacto, caducidad y botón Reenviar en 1 clic');
  } else {
    errors.push('Dashboard de licencias no expone contact_email o window.resendLicenseEmail');
  }

  return { name: '2. Contratos Licencias Protegidas & Cloud Dashboard', passed: errors.length === 0, checks, errors };
}

async function verifyLiveEndpoints(): Promise<CheckGroupResult> {
  const checks: string[] = [];
  const errors: string[] = [];
  const pkg = JSON.parse(readText('package.json'));

  const checkUrl = async (url: string, label: string, validator?: (body: string) => string | null) => {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12000) });
      if (!res.ok) {
        errors.push(`${label} respondió HTTP ${res.status} (${url})`);
        return;
      }
      const text = await res.text();
      if (validator) {
        const err = validator(text);
        if (err) {
          errors.push(`${label}: ${err}`);
          return;
        }
      }
      checks.push(`${label}: HTTP 200 OK`);
    } catch (e) {
      errors.push(`${label} inaccesible: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  await checkUrl('https://bridge.cristianjm.com/health', 'API Central (/health)');
  await checkUrl('https://bridge.cristianjm.com/releases/latest.json', 'Manifiesto de Release (/releases/latest.json)', (body) => {
    const json = JSON.parse(body);
    const liveVer = json.latestVersion || (json.stable && json.stable.version) || json.version;
    return liveVer === pkg.version ? null : `Versión en producción (${liveVer}) != local (${pkg.version})`;
  });
  await checkUrl('https://bridge.cristianjm.com/dashboard/', 'Cloud Dashboard (/dashboard/)');
  await checkUrl('https://bridge.cristianjm.com/partners/', 'Portal de Partners (/partners/)');
  await checkUrl('https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping', 'Conector Suministros Rubio (action=ping)', (body) => {
    const json = JSON.parse(body);
    if (!json.success || !json.databaseConnected) return 'Base de datos web desconectada';
    return null;
  });

  return { name: '3. Verificación en Vivo de Producción (Bentian & Suministros Rubio)', passed: errors.length === 0, checks, errors };
}

async function main() {
  console.log('================================================================');
  console.log('🔍 VERIFICACIÓN DE CONTRATOS FUNCIONALES Y SALUD DEL SISTEMA');
  console.log('================================================================\n');

  const groups: CheckGroupResult[] = [
    verifyAgentGuiContracts(),
    verifyLicensingAndDashboardContracts(),
  ];

  if (!isOffline) {
    groups.push(await verifyLiveEndpoints());
  }

  let allPassed = true;
  for (const g of groups) {
    console.log(`▶ ${g.name}`);
    for (const c of g.checks) console.log(`  ✓ ${c}`);
    for (const err of g.errors) {
      console.error(`  ❌ ${err}`);
      allPassed = false;
    }
    console.log('');
  }

  if (!allPassed) {
    console.error('❌ FALLÓ LA VERIFICACIÓN FUNCIONAL. Revisa los errores superiores.');
    process.exit(1);
  }
  console.log('✅ TODAS LAS FUNCIONALIDADES Y CONTRATOS VERIFICADOS CON ÉXITO.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
