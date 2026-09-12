const path = require('path');
const fs = require('fs');
const esbuild = require('./node_modules/esbuild');

const { getCurrentVersion } = require('./version');

async function buildAgentBundle(options = {}) {
  const startTime = Date.now();
  const agentVersion = options.version || getCurrentVersion();
  console.log('\n======================================================');
  console.log('   BENTIAN AGENT BUILDER — PASO 1: BUNDLE JS         ');
  console.log('======================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const outDir = options.outDir || path.resolve(__dirname, 'dist');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const entryFile = path.resolve(rootDir, 'apps/agent/src/cli.ts');
  const outBundle = path.resolve(outDir, 'bentian-agent.bundle.cjs');
  const adodbSource = path.resolve(rootDir, 'packages/connectors/factusol/src/adodb.js');
  const adodbDest = path.resolve(outDir, 'adodb.js');

  console.log(`[1/4] Entrada: ${entryFile}`);
  console.log(`[2/4] Resolviendo dependencias monorepo (@erp-bridge/*)...`);

  const aliasPlugin = {
    name: 'erp-bridge-monorepo-resolver',
    setup(build) {
      build.onResolve({ filter: /^@erp-bridge\/shared$/ }, () => ({
        path: path.resolve(rootDir, 'packages/shared/src/index.ts')
      }));
      build.onResolve({ filter: /^@erp-bridge\/core$/ }, () => ({
        path: path.resolve(rootDir, 'packages/core/src/index.ts')
      }));
      build.onResolve({ filter: /^@erp-bridge\/connector-factusol$/ }, () => ({
        path: path.resolve(rootDir, 'packages/connectors/factusol/src/index.ts')
      }));
      build.onResolve({ filter: /^@erp-bridge\/sdk$/ }, () => ({
        path: path.resolve(rootDir, 'packages/sdk/src/index.ts')
      }));
      build.onResolve({ filter: /^pg$/ }, () => ({
        path: path.resolve(__dirname, 'stubs/pg-stub.js')
      }));
      build.onResolve({ filter: /^pg-native$/ }, () => ({
        path: path.resolve(__dirname, 'stubs/pg-stub.js')
      }));
    }
  };

  const shouldMinify = options.minify !== undefined ? options.minify : true;
  const shouldSourcemap = options.sourcemap !== undefined ? options.sourcemap : false;

  console.log(`[3/4] Compilando y empaquetando con esbuild (Minify: ${shouldMinify}, Sourcemap: ${shouldSourcemap})...`);
  const result = await esbuild.build({
    entryPoints: [entryFile],
    outfile: outBundle,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: shouldSourcemap,
    minify: shouldMinify,
    legalComments: 'none',
    banner: {
      js: `/**
 * (c) 2026 Cristian Jiménez Martínez / Bentian. Todos los derechos reservados.
 * INFORMACIÓN CONFIDENCIAL Y PROPIETARIA.
 * Protegido como Secreto Empresarial bajo la Ley 1/2019 de Secretos Empresariales (España)
 * y la Directiva (UE) 2016/943. Queda prohibida la reproducción, descompilación,
 * ingeniería inversa o distribución no autorizada.
 */`
    },
    nodePaths: [path.resolve(__dirname, 'node_modules')],
    define: {
      'process.env.APP_VERSION': JSON.stringify(agentVersion),
      'process.env.AGENT_VERSION': JSON.stringify(agentVersion),
      "process.env['APP_VERSION']": JSON.stringify(agentVersion),
      "process.env['AGENT_VERSION']": JSON.stringify(agentVersion),
    },
    plugins: [aliasPlugin],
    external: []
  });

  if (result.errors && result.errors.length > 0) {
    console.error('ERRORES EN EL BUNDLE:', result.errors);
    throw new Error('Fallo al empaquetar el agente');
  }

  // Copiar el archivo auxiliar adodb.js requerido para consultas OLEDB de Access
  console.log('[4/4] Copiando componente adodb.js y plantilla agent-config.json junto al bundle...');
  fs.copyFileSync(adodbSource, adodbDest);

  const configDest = path.resolve(outDir, 'agent-config.json');
  if (!fs.existsSync(configDest)) {
    const defaultAgentConfig = {
      apiBaseUrl: 'https://bridge.cristianjm.com',
      organizationId: 'org_default'
    };
    fs.writeFileSync(configDest, JSON.stringify(defaultAgentConfig, null, 2), 'utf8');
  }

  const stats = fs.statSync(outBundle);
  const durationMs = Date.now() - startTime;
  console.log(`\n✓ Bundle generado exitosamente en: ${outBundle}`);
  console.log(`  Tamaño: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`  Componente Access: ${adodbDest}`);
  console.log(`  Tiempo: ${durationMs}ms\n`);

  return { bundlePath: outBundle, adodbPath: adodbDest, sizeBytes: stats.size };
}

if (require.main === module) {
  buildAgentBundle().catch(err => {
    console.error('ERROR EN BUILD-BUNDLE:', err);
    process.exit(1);
  });
}

module.exports = { buildAgentBundle };
