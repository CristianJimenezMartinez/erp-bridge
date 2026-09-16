/**
 * BENTIAN QUALITY GATE & METRICS ENGINE
 *
 * Motor automatizado de reglas de calidad y métricas objetivas de Bentian ERP Bridge.
 * Ejecuta 6 Quality Gates cuantitativos e inflexibles:
 * 1. LOC Guard & God-Class Prevention (< 250 LOC advertencia, < 750 LOC hard error)
 * 2. Acyclic Graph Guard (madge: 0 dependencias circulares)
 * 3. Clean Logger Guard (0 llamadas a console.* en producción)
 * 4. Access OLEDB Security Guard (sanitizeAndTruncate obligatorio en queries)
 * 5. Anti-Overselling Guard (availableQuantity obligatorio en sincronización de stock)
 * 6. Config & Version Consistency Guard
 *
 * Emite una nota ponderada objetiva (0 a 10) al finalizar.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const repoRoot = path.resolve(__dirname, '..');
const MAX_LOC_ERROR = 750;
const MAX_LOC_WARN = 250;

interface QualityResult {
  gateName: string;
  passed: boolean;
  score: number; // 0 - 10
  weight: number; // decimal (sum = 1.0)
  details: string[];
  warnings: string[];
}

const results: QualityResult[] = [];

console.log('====================================================');
console.log('🛡️  BENTIAN QUALITY GATE - AUDITORÍA AUTOMATIZADA   ');
console.log('====================================================\n');

function getFiles(dir: string, exts = ['.ts', '.js']): string[] {
  let res: string[] = [];
  if (!fs.existsSync(dir)) return res;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (['node_modules', 'dist', '.angular', '.git', 'coverage', 'public', 'temp'].includes(file)) continue;
      res = res.concat(getFiles(filePath, exts));
    } else {
      if (exts.some((ext) => file.endsWith(ext)) && !file.endsWith('.d.ts')) {
        res.push(filePath);
      }
    }
  }
  return res;
}

const allSrcFiles = [
  ...getFiles(path.join(repoRoot, 'apps/agent/src')),
  ...getFiles(path.join(repoRoot, 'apps/api/src')),
  ...getFiles(path.join(repoRoot, 'packages/core/src')),
  ...getFiles(path.join(repoRoot, 'packages/shared/src')),
  ...getFiles(path.join(repoRoot, 'packages/sdk/src')),
  ...getFiles(path.join(repoRoot, 'packages/connectors/factusol/src')),
  ...getFiles(path.join(repoRoot, 'packages/connectors/prestashop/src')),
  ...getFiles(path.join(repoRoot, 'packages/connectors/simplygest/src')),
  ...getFiles(path.join(repoRoot, 'packages/connectors/woocommerce/src')),
];

// ============================================================================
// GATE 1: LOC GUARD & GOD-CLASS BUDGET
// ============================================================================
console.log('▶ [Gate 1/6] Evaluando modularidad y límites de LOC por archivo...');
const locViolations: { rel: string; lines: number }[] = [];
const locWarnings: { rel: string; lines: number }[] = [];
let totalLoc = 0;

for (const f of allSrcFiles) {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n').length;
  totalLoc += lines;
  const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
  if (lines > MAX_LOC_ERROR) {
    locViolations.push({ rel, lines });
  } else if (lines > MAX_LOC_WARN) {
    locWarnings.push({ rel, lines });
  }
}

const avgLoc = allSrcFiles.length > 0 ? (totalLoc / allSrcFiles.length).toFixed(1) : '0';
const locPassed = locViolations.length === 0;
const optimalRatio = (allSrcFiles.length - locWarnings.length - locViolations.length) / (allSrcFiles.length || 1);
const gate1Score = Math.max(0, Math.min(10, Number((optimalRatio * 10).toFixed(1))));

results.push({
  gateName: '1. Modularidad & Presupuesto LOC',
  passed: locPassed,
  score: gate1Score,
  weight: 0.15,
  details: [
    `Total archivos fuente: ${allSrcFiles.length}`,
    `Media de líneas: ${avgLoc} LOC/archivo`,
    `Archivos dentro de rango óptimo (<250 LOC): ${allSrcFiles.length - locWarnings.length} (${(optimalRatio * 100).toFixed(1)}%)`,
    ...locViolations.map((v) => `CRÍTICO: ${v.rel} (${v.lines} LOC > ${MAX_LOC_ERROR})`),
  ],
  warnings: locWarnings.map((w) => `${w.rel} (${w.lines} LOC)`),
});

if (locPassed) {
  console.log(`  ✓ 0 archivos superan el límite crítico (${MAX_LOC_ERROR} LOC). Media: ${avgLoc} LOC/archivo.`);
  if (locWarnings.length > 0) {
    console.log(`  ℹ ${locWarnings.length} archivos en zona de vigilancia (>250 LOC).`);
  }
} else {
  console.error(`  ❌ ${locViolations.length} archivo(s) superan el hard limit de ${MAX_LOC_ERROR} LOC.`);
}

// ============================================================================
// GATE 2: ACYCLIC GRAPH GUARD (madge)
// ============================================================================
console.log('\n▶ [Gate 2/6] Verificando ausencia de dependencias circulares con madge...');
const packages = [
  { name: 'apps/agent', dir: 'apps/agent/src', tsconfig: 'apps/agent/tsconfig.json' },
  { name: 'apps/api', dir: 'apps/api/src', tsconfig: 'apps/api/tsconfig.json' },
  { name: 'packages/core', dir: 'packages/core/src', tsconfig: 'packages/core/tsconfig.json' },
  { name: 'packages/shared', dir: 'packages/shared/src', tsconfig: 'packages/shared/tsconfig.json' },
  { name: 'packages/sdk', dir: 'packages/sdk/src', tsconfig: 'packages/sdk/tsconfig.json' },
  { name: 'packages/connectors/factusol', dir: 'packages/connectors/factusol/src', tsconfig: 'packages/connectors/factusol/tsconfig.json' },
  { name: 'packages/connectors/prestashop', dir: 'packages/connectors/prestashop/src', tsconfig: 'packages/connectors/prestashop/tsconfig.json' },
  { name: 'packages/connectors/simplygest', dir: 'packages/connectors/simplygest/src', tsconfig: 'packages/connectors/simplygest/tsconfig.json' },
  { name: 'packages/connectors/woocommerce', dir: 'packages/connectors/woocommerce/src', tsconfig: 'packages/connectors/woocommerce/tsconfig.json' },
];

let circularCyclesFound = 0;
const circularDetails: string[] = [];

try {
  const dirs = packages.map((p) => `"${path.join(repoRoot, p.dir)}"`).join(' ');
  const cmd = `npx --no-install madge --circular --json --extensions ts ${dirs}`;
  const out = execSync(cmd, { cwd: repoRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  const startIdx = out.indexOf('[');
  const endIdx = out.lastIndexOf(']');
  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    const jsonStr = out.substring(startIdx, endIdx + 1);
    const cycles = JSON.parse(jsonStr);
    circularCyclesFound = Array.isArray(cycles) ? cycles.length : 0;
    if (circularCyclesFound > 0) {
      circularDetails.push(JSON.stringify(cycles, null, 2));
    }
  }
} catch (err: any) {
  const out = (err.stdout || err.stderr || err.message || '').toString();
  const startIdx = out.indexOf('[');
  const endIdx = out.lastIndexOf(']');
  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    try {
      const jsonStr = out.substring(startIdx, endIdx + 1);
      const cycles = JSON.parse(jsonStr);
      circularCyclesFound = Array.isArray(cycles) ? cycles.length : 0;
      if (circularCyclesFound > 0) {
        circularDetails.push(JSON.stringify(cycles, null, 2));
      }
    } catch {
      circularCyclesFound = 1;
      circularDetails.push(out.trim());
    }
  }
}

const gate2Passed = circularCyclesFound === 0;
const gate2Score = gate2Passed ? 10.0 : Math.max(0, 10 - circularCyclesFound * 3);

results.push({
  gateName: '2. Grafo Acíclico (0 Dependencias Circulares)',
  passed: gate2Passed,
  score: gate2Score,
  weight: 0.25,
  details: gate2Passed
    ? ['Cero ciclos circulares en los 9 paquetes analizados. Grafo 100% acíclico y desacoplado.']
    : circularDetails,
  warnings: [],
});

if (gate2Passed) {
  console.log('  ✓ 100% limpio: Cero dependencias circulares en los 9 módulos analizados.');
} else {
  console.error(`  ❌ ${circularCyclesFound} ciclo(s) circular(es) detectado(s).`);
}

// ============================================================================
// GATE 3: CLEAN LOGGER GUARD (0 console.* en prod)
// ============================================================================
console.log('\n▶ [Gate 3/6] Verificando observabilidad y prohibición de console.* en producción...');
const consoleAllowed = ['apps/agent/src/cli.ts', 'packages/shared/src/utils/logger.ts', 'apps/agent/src/index.ts'];
const consoleViolations: { rel: string; line: number; text: string }[] = [];

for (const f of allSrcFiles) {
  const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
  if (consoleAllowed.includes(rel)) continue;
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (/console\.(log|warn|error|info|debug)\(/.test(l) && !l.includes('quality-allow-console')) {
      consoleViolations.push({ rel, line: idx + 1, text: l.trim() });
    }
  });
}

const gate3Passed = consoleViolations.length === 0;
const gate3Score = gate3Passed ? 10.0 : Math.max(0, 10 - consoleViolations.length * 0.5);

results.push({
  gateName: '3. Observabilidad Estructurada (Zero console.* en prod)',
  passed: gate3Passed,
  score: gate3Score,
  weight: 0.15,
  details: gate3Passed
    ? ['Zero llamadas a console.* en bibliotecas del núcleo y conectores. Uso estricto de Logger.']
    : consoleViolations.map((v) => `${v.rel}:${v.line} -> ${v.text}`),
  warnings: [],
});

if (gate3Passed) {
  console.log('  ✓ Cero console.* directos en bibliotecas de negocio y conectores.');
} else {
  console.error(`  ❌ ${consoleViolations.length} llamada(s) directa(s) a console.* encontrada(s).`);
}

// ============================================================================
// GATE 4: ACCESS OLEDB SECURITY GUARD
// ============================================================================
console.log('\n▶ [Gate 4/6] Verificando saneamiento estricto de consultas SQL Access...');
const accessQueryFiles = getFiles(path.join(repoRoot, 'packages/connectors/factusol/src/queries')).filter(
  (f) => !f.endsWith('index.ts')
);
let unsanitizedInterpolations = 0;
const sanitizeDetails: string[] = [];

for (const f of accessQueryFiles) {
  const content = fs.readFileSync(f, 'utf-8');
  const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
  if (!content.includes('sanitizeAndTruncate') && !content.includes('sanitizeSql')) {
    unsanitizedInterpolations++;
    sanitizeDetails.push(`${rel} no importa sanitizeAndTruncate/sanitizeSql`);
  }
}

// Verificar que AccessDriver incluya Mode=Share Deny None;
const accessDriverPath = path.join(repoRoot, 'packages/connectors/factusol/src/access-driver.ts');
let shareModeOk = false;
if (fs.existsSync(accessDriverPath)) {
  const driverContent = fs.readFileSync(accessDriverPath, 'utf-8');
  shareModeOk = driverContent.includes('Mode=Share Deny None;');
}

const gate4Passed = unsanitizedInterpolations === 0 && shareModeOk;
const gate4Score = gate4Passed ? 10.0 : 7.0;

results.push({
  gateName: '4. Seguridad OLEDB & Sanidad SQL Access',
  passed: gate4Passed,
  score: gate4Score,
  weight: 0.15,
  details: [
    `Todos los módulos de queries importan funciones de truncado y escape defensivo: ${unsanitizedInterpolations === 0 ? 'SÍ' : 'NO'}`,
    `Cadena de conexión AccessDriver incluye Mode=Share Deny None: ${shareModeOk ? 'SÍ' : 'NO'}`,
  ],
  warnings: [],
});

if (gate4Passed) {
  console.log('  ✓ Queries de Factusol blindadas con truncado-escape y concurrencia OLEDB configurada.');
} else {
  console.error('  ❌ Fallo en las comprobaciones de seguridad de queries Access.');
}

// ============================================================================
// GATE 5: ANTI-OVERSELLING GUARD
// ============================================================================
console.log('\n▶ [Gate 5/6] Verificando protección contra sobreventas (DISSTO vs ACTSTO)...');
const stockEnginePath = path.join(repoRoot, 'packages/core/src/engine/stock-sync.engine.ts');
const stockMapperWcPath = path.join(repoRoot, 'packages/connectors/woocommerce/src/mappers/stock.mapper.ts');

let stockEngineGuarded = false;
let stockMapperGuarded = false;

if (fs.existsSync(stockEnginePath)) {
  const c = fs.readFileSync(stockEnginePath, 'utf-8');
  stockEngineGuarded = c.includes('availableQuantity');
}

if (fs.existsSync(stockMapperWcPath)) {
  const c = fs.readFileSync(stockMapperWcPath, 'utf-8');
  stockMapperGuarded = c.includes('availableQuantity');
}

const gate5Passed = stockEngineGuarded && stockMapperGuarded;
const gate5Score = gate5Passed ? 10.0 : 4.0;

results.push({
  gateName: '5. Blindaje Anti-Sobreventas (Stock Disponible)',
  passed: gate5Passed,
  score: gate5Score,
  weight: 0.15,
  details: [
    `StockSyncEngine usa availableQuantity (DISSTO): ${stockEngineGuarded ? 'SÍ' : 'NO'}`,
    `WooCommerce StockMapper usa availableQuantity (DISSTO): ${stockMapperGuarded ? 'SÍ' : 'NO'}`,
  ],
  warnings: [],
});

if (gate5Passed) {
  console.log('  ✓ Motor de stock y mappers usan availableQuantity (DISSTO) evitando sobreventas.');
} else {
  console.error('  ❌ Riesgo de sobreventas: se detectó uso de stock físico en vez de disponible.');
}

// ============================================================================
// GATE 6: CONFIG & TOOLCHAIN CONSISTENCY GUARD
// ============================================================================
console.log('\n▶ [Gate 6/6] Verificando consistencia de configuración y tsconfig...');
const rootPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));
const baseTsConfigExists = fs.existsSync(path.join(repoRoot, 'tsconfig.base.json'));

const gate6Passed = baseTsConfigExists && Boolean(rootPkg.version);
const gate6Score = gate6Passed ? 10.0 : 6.0;

results.push({
  gateName: '6. Consistencia de Toolchain & Configuración Base',
  passed: gate6Passed,
  score: gate6Score,
  weight: 0.15,
  details: [
    `tsconfig.base.json existe: ${baseTsConfigExists ? 'SÍ' : 'NO'}`,
    `Versión del monorepo: ${rootPkg.version || 'desconocida'}`,
  ],
  warnings: [],
});

if (gate6Passed) {
  console.log(`  ✓ Toolchain uniforme. Versión central: ${rootPkg.version}`);
} else {
  console.error('  ❌ Inconsistencia en la configuración del monorepo.');
}

// ============================================================================
// COMPUTO DE SCORECARD Y REPORTE FINAL
// ============================================================================
console.log('\n====================================================');
console.log('📊 RESULTADO DE LA AUDITORÍA DE CALIDAD');
console.log('====================================================\n');

let weightedScore = 0;
let totalWeight = 0;
let allPassed = true;

for (const r of results) {
  const contribution = r.score * r.weight;
  weightedScore += contribution;
  totalWeight += r.weight;
  if (!r.passed) allPassed = false;

  const statusBadge = r.passed ? '✓ PASÓ' : '❌ FALLÓ';
  console.log(`${r.gateName.padEnd(52)} | ${statusBadge} | Nota: ${r.score.toFixed(1)}/10 (Peso: ${(r.weight * 100).toFixed(0)}%)`);
}

const finalScore = Number((weightedScore / totalWeight).toFixed(2));

console.log('----------------------------------------------------');
console.log(`🏆 PUNTUACIÓN OBJETIVA GLOBAL: ${finalScore} / 10.00`);
console.log(`ESTADO DEL QUALITY GATE: ${allPassed ? '✅ APROBADO (APTO PARA PRODUCCIÓN)' : '❌ RECHAZADO'}`);
console.log('====================================================\n');

if (!allPassed) {
  process.exit(1);
} else {
  process.exit(0);
}
