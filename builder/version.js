const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

// Lista completa de ficheros que deben mantener paridad estricta de versión
const VERSIONED_FILES = [
  path.resolve(rootDir, 'package.json'),
  path.resolve(rootDir, 'builder/config.json'),
  path.resolve(rootDir, 'builder/package.json'),
  path.resolve(rootDir, 'apps/agent/package.json'),
  path.resolve(rootDir, 'apps/api/package.json'),
  path.resolve(rootDir, 'apps/dashboard/package.json'),
  path.resolve(rootDir, 'packages/shared/package.json'),
  path.resolve(rootDir, 'packages/sdk/package.json'),
  path.resolve(rootDir, 'packages/core/package.json'),
  path.resolve(rootDir, 'packages/connectors/factusol/package.json'),
  path.resolve(rootDir, 'packages/connectors/woocommerce/package.json'),
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

  console.log(`\n✓ ${updatedCount} ficheros actualizados con éxito a v${targetVer}.\n`);
  return targetVer;
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

    default: {
      // Si el argumento es directamente una versión SemVer (ej: "0.2.0")
      try {
        const next = calculateNextVersion('', action);
        applyVersionToAll(next);
      } catch {
        console.log('\nUso del gestor de versionado:');
        console.log('  node version.js status       Muestra la versión actual y audita paridad');
        console.log('  node version.js check        Verifica que no haya discrepancias entre paquetes');
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
  parseSemVer,
};
