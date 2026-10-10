const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');

const rootDir = path.resolve(__dirname, '..');

// Lista completa de ficheros que deben mantener paridad estricta de versión
const VERSIONED_FILES = [
  path.resolve(rootDir, 'package.json'),
  path.resolve(rootDir, 'builder/config.json'),
  path.resolve(rootDir, 'builder/package.json'),
  path.resolve(rootDir, 'apps/agent/package.json'),
  path.resolve(rootDir, 'apps/api/package.json'),
  path.resolve(rootDir, 'packages/shared/package.json'),
  path.resolve(rootDir, 'packages/sdk/package.json'),
  path.resolve(rootDir, 'packages/core/package.json'),
  path.resolve(rootDir, 'packages/connectors/factusol/package.json'),
  path.resolve(rootDir, 'packages/connectors/woocommerce/package.json'),
  path.resolve(rootDir, 'packages/connectors/prestashop/package.json'),
  path.resolve(rootDir, 'packages/connectors/simplygest/package.json'),
  path.resolve(rootDir, 'packages/connectors/shopify/package.json'),
  path.resolve(rootDir, 'packages/connectors/holded/package.json'),
];

/**
 * Parsea un string SemVer en sus componentes numéricos y prerel
 */
function parseSemVer(v) {
  const clean = v.replace(/^v/, '').trim();
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$/);
  if (!match) {
    throw new Error(`Versión SemVer inválida: "${v}". Debe seguir el formato X.Y.Z (ej: 0.1.0)`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    raw: clean,
  };
}

/**
 * Lee la versión maestra actual desde builder/config.json o package.json
 */
function getCurrentVersion() {
  const configPath = path.resolve(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    const json = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (json.version) return json.version;
  }
  const rootPkg = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf8'));
  return rootPkg.version;
}

/**
 * Calcula la siguiente versión según la regla SemVer indicada
 */
function calculateNextVersion(currentVer, bumpType) {
  const type = bumpType.toLowerCase().trim();

  // Si el usuario especificó una versión explícita (ej: "0.2.0" o "v0.2.0")
  if (type !== 'patch' && type !== 'minor' && type !== 'major') {
    const validated = parseSemVer(bumpType);
    return validated.raw;
  }

  const parsed = parseSemVer(currentVer);
  switch (type) {
    case 'patch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case 'minor':
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case 'major':
      return `${parsed.major + 1}.0.0`;
  }
}

/**
 * Aplica la nueva versión atómicamente a todos los archivos del monorepo
 */
function applyVersionToAll(newVersion) {
  const parsed = parseSemVer(newVersion);
  const targetVer = parsed.raw;

  console.log(`\n📦 Sincronizando versión ${targetVer} en todo el monorepo...`);

  let updatedCount = 0;
  for (const filePath of VERSIONED_FILES) {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Fichero no encontrado (omitido): ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);
    const prev = json.version;

    json.version = targetVer;
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    const rel = path.relative(rootDir, filePath);
    console.log(`  ✓ ${rel.padEnd(45)} ${prev || 'N/A'} -> ${targetVer}`);
    updatedCount++;
  }

  // Sincronizar también el fallback estático en version-sync.js si existe
  const versionSyncPath = path.resolve(rootDir, 'apps/api/public/js/version-sync.js');
  if (fs.existsSync(versionSyncPath)) {
    let syncContent = fs.readFileSync(versionSyncPath, 'utf8');
    syncContent = syncContent.replace(/var DEFAULT_VERSION = '[^']+';/, `var DEFAULT_VERSION = '${targetVer}';`);
    fs.writeFileSync(versionSyncPath, syncContent, 'utf8');
    console.log(`  ✓ apps/api/public/js/version-sync.js           DEFAULT_VERSION -> ${targetVer}`);
  }

  // Sincronizar plantillas públicas, metadatos SEO y generadores estáticos
  syncPublicTemplates(targetVer);

  // Nota: apps/agent/src/gui/tray/BentianTray.cs es un módulo sellado (Gate 7).
  // Su integridad criptográfica se preserva intacta sin modificar el código fuente C#.

  console.log(`\n✓ ${updatedCount} ficheros actualizados con éxito a v${targetVer}.\n`);
  return targetVer;
}

/**
 * Sincroniza plantillas públicas, metadatos SEO y ejecuta generadores estáticos
 */
function syncPublicTemplates(targetVer) {
  console.log(`\n📄 Sincronizando plantillas públicas y generadores a v${targetVer}...`);

  // 1. schema-org.html
  const schemaPath = path.resolve(rootDir, 'apps/api/public/layout/schema-org.html');
  if (fs.existsSync(schemaPath)) {
    let schema = fs.readFileSync(schemaPath, 'utf8');
    schema = schema.replace(/"softwareVersion":\s*"[^"]+"/g, `"softwareVersion": "${targetVer}"`);
    schema = schema.replace(/"mpn":\s*"EB-[^"]+"/g, `"mpn": "EB-${targetVer.replace(/\./g, '')}"`);
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log(`  ✓ apps/api/public/layout/schema-org.html       softwareVersion -> ${targetVer}`);
  }

  // 2. 02-hero.html
  const heroPath = path.resolve(rootDir, 'apps/api/public/sections/02-hero.html');
  if (fs.existsSync(heroPath)) {
    let hero = fs.readFileSync(heroPath, 'utf8');
    hero = hero.replace(/(<span id="hero-version-tag">Release Oficial <span data-app-version>)v[0-9.]+(<\/span> para Windows x64<\/span>)/g, `$1v${targetVer}$2`);
    fs.writeFileSync(heroPath, hero, 'utf8');
    console.log(`  ✓ apps/api/public/sections/02-hero.html        hero-version-tag -> v${targetVer}`);
  }

  // 3. beta/index.html
  const betaPath = path.resolve(rootDir, 'apps/api/public/beta/index.html');
  if (fs.existsSync(betaPath)) {
    let beta = fs.readFileSync(betaPath, 'utf8');
    beta = beta.replace(/(<span data-app-version>)v[0-9.]+(<\/span>)/g, `$1v${targetVer}$2`);
    fs.writeFileSync(betaPath, beta, 'utf8');
    console.log(`  ✓ apps/api/public/beta/index.html              data-app-version -> v${targetVer}`);
  }

  // 4. logs.script.ts fallback
  const logsScriptPath = path.resolve(rootDir, 'apps/agent/src/gui/templates/scripts/logs.script.ts');
  if (fs.existsSync(logsScriptPath)) {
    let logsScript = fs.readFileSync(logsScriptPath, 'utf8');
    logsScript = logsScript.replace(/'Versión Agente:\s+v'\s*\+\s*\(s\.agentVersion\s*\|\|\s*s\.version\s*\|\|\s*'[^']+'\)/g, `'Versión Agente:   v' + (s.agentVersion || s.version || '${targetVer}')`);
    fs.writeFileSync(logsScriptPath, logsScript, 'utf8');
    console.log(`  ✓ apps/agent/.../logs.script.ts               fallback version -> v${targetVer}`);
  }

  // 5. windows-antivirus-smartscreen-guide.md
  const smartscreenPath = path.resolve(rootDir, 'apps/api/public/docs/windows-antivirus-smartscreen-guide.md');
  if (fs.existsSync(smartscreenPath)) {
    let doc = fs.readFileSync(smartscreenPath, 'utf8');
    doc = doc.replace(/> \*\*Versión Oficial:\*\* v[0-9.]+/g, `> **Versión Oficial:** v${targetVer}`);
    doc = doc.replace(/Bentian-Setup-v[0-9.]+\.exe/g, `Bentian-Setup-v${targetVer}.exe`);
    fs.writeFileSync(smartscreenPath, doc, 'utf8');
    console.log(`  ✓ .../windows-antivirus-smartscreen-guide.md   version -> v${targetVer}`);
  }

  // 6. Actualizar data-app-version en todos los HTML estáticos de apps/api/public/
  const publicDir = path.resolve(rootDir, 'apps/api/public');
  function updateHtmlRecursively(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        updateHtmlRecursively(fullPath);
      } else if (entry.name.endsWith('.html')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let changed = false;
        if (content.includes('data-app-version')) {
          const updated = content.replace(/(<[^>]*data-app-version[^>]*>)(?:v)?[0-9.]+(<\/[^>]+>)/g, `$1v${targetVer}$2`);
          if (updated !== content) {
            content = updated;
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      }
    }
  }
  updateHtmlRecursively(publicDir);
  console.log(`  ✓ apps/api/public/**/*.html                    data-app-version -> v${targetVer}`);

  // 7. Compilar generadores modulares (Landing, Dashboard, Cities, Docs)
  console.log(`\n🔨 Ejecutando compiladores modulares de páginas públicas...`);
  const scriptsToRun = [
    'apps/api/scripts/build-landing.ts',
    'apps/api/scripts/build-dashboard.ts',
    'apps/api/scripts/generate-city-pages.ts',
    'apps/api/scripts/build-docs.ts'
  ];

  for (const relScript of scriptsToRun) {
    const fullScript = path.resolve(rootDir, relScript);
    if (fs.existsSync(fullScript)) {
      try {
        childProcess.execSync(`npx ts-node "${fullScript}"`, {
          cwd: rootDir,
          stdio: 'inherit'
        });
        console.log(`  ✓ ${relScript} ejecutado con éxito.`);
      } catch (err) {
        console.error(`  ❌ Error ejecutando ${relScript}:`, err.message);
        throw err;
      }
    }
  }

  console.log(`\n✨ Paridad de versiones al 100% en todas las páginas públicas (v${targetVer}).\n`);
}

/**
 * Valida si todos los paquetes del monorepo tienen exactamente la misma versión (anti-drift)
 */
function checkVersionSync() {
  const versions = new Map();
  for (const filePath of VERSIONED_FILES) {
    if (!fs.existsSync(filePath)) continue;
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const rel = path.relative(rootDir, filePath);
    versions.set(rel, json.version);
  }

  const distinct = new Set(versions.values());
  console.log('\n--- Auditoría de Paridad de Versiones en Monorepo ---');
  versions.forEach((ver, file) => {
    console.log(`  ${file.padEnd(45)}: v${ver}`);
  });

  if (distinct.size === 1) {
    console.log(`\n✓ Todos los paquetes están sincronizados al 100% en la versión v${[...distinct][0]}.\n`);
    return true;
  } else {
    console.error(`\n❌ DESINCRONIZACIÓN DETECTADA: Se encontraron múltiples versiones:`, [...distinct]);
    return false;
  }
}

// CLI handler
function runCli() {
  const args = process.argv.slice(2);
  const action = args[0] || 'status';

  switch (action) {
    case 'status':
    case 'current': {
      console.log(`\nVersión actual del sistema: v${getCurrentVersion()}`);
      checkVersionSync();
      break;
    }

    case 'check': {
      const ok = checkVersionSync();
      process.exit(ok ? 0 : 1);
      break;
    }

    case 'patch':
    case 'minor':
    case 'major': {
      const current = getCurrentVersion();
      const next = calculateNextVersion(current, action);
      console.log(`Subiendo versión (${action.toUpperCase()}): v${current} -> v${next}`);
      applyVersionToAll(next);
      break;
    }

    case 'set': {
      const explicit = args[1];
      if (!explicit) {
        console.error('❌ Error: Debes especificar la versión a asignar.');
        console.error('Uso: node version.js set 0.2.0\n');
        process.exit(1);
      }
      const next = calculateNextVersion('', explicit);
      applyVersionToAll(next);
      break;
    }

    case 'sync': {
      const current = getCurrentVersion();
      console.log(`\nSincronizando todas las plantillas y páginas públicas a v${current}...`);
      syncPublicTemplates(current);
      break;
    }

    default: {
      // Si el argumento es directamente una versión SemVer (ej: "0.2.0")
      try {
        const next = calculateNextVersion('', action);
        applyVersionToAll(next);
      } catch {
        console.log('\nUso del gestor de versionado:');
        console.log('  node version.js status       Muestra la versión actual y audita paridad');
        console.log('  node version.js check        Verifica que no haya discrepancias entre paquetes');
        console.log('  node version.js sync         Sincroniza plantillas públicas y generadores a la versión actual');
        console.log('  node version.js patch        Incrementa PATCH (ej: 0.1.0 -> 0.1.1) - Bugfixes');
        console.log('  node version.js minor        Incrementa MINOR (ej: 0.1.0 -> 0.2.0) - Nuevas features');
        console.log('  node version.js major        Incrementa MAJOR (ej: 0.1.0 -> 1.0.0) - Breaking changes');
        console.log('  node version.js set <ver>    Asigna una versión explícita (ej: 0.2.0)\n');
      }
      break;
    }
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  getCurrentVersion,
  calculateNextVersion,
  applyVersionToAll,
  checkVersionSync,
  syncPublicTemplates,
  parseSemVer,
};
