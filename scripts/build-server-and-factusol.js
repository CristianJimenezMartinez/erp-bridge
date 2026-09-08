const path = require('path');
const fs = require('fs');
const esbuild = require('../builder/node_modules/esbuild');

async function build() {
  const rootDir = path.resolve(__dirname, '..');

  // Build auth router, licenses router and server
  await esbuild.build({
    entryPoints: [
      path.resolve(rootDir, 'apps/api/src/server.ts'),
      path.resolve(rootDir, 'apps/api/src/routes/auth.router.ts'),
      path.resolve(rootDir, 'apps/api/src/routes/licenses.router.ts'),
    ],
    outdir: path.resolve(rootDir, 'apps/api/dist'),
    outbase: path.resolve(rootDir, 'apps/api/src'),
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    bundle: false,
  });

  const aliasPlugin = {
    name: 'erp-bridge-resolver',
    setup(b) {
      b.onResolve({ filter: /^@erp-bridge\/shared$/ }, () => ({
        path: path.resolve(rootDir, 'packages/shared/src/index.ts')
      }));
      b.onResolve({ filter: /^@erp-bridge\/sdk$/ }, () => ({
        path: path.resolve(rootDir, 'packages/sdk/src/index.ts')
      }));
    }
  };

  // Build access driver
  await esbuild.build({
    entryPoints: [
      path.resolve(rootDir, 'packages/connectors/factusol/src/access-driver.ts'),
    ],
    outdir: path.resolve(rootDir, 'packages/connectors/factusol/dist'),
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    bundle: true,
    nodePaths: [path.resolve(rootDir, 'builder/node_modules')],
    plugins: [aliasPlugin],
  });

  // Copiar adodb.js al dist de factusol
  const adodbSrc = path.resolve(rootDir, 'packages/connectors/factusol/src/adodb.js');
  const adodbDst = path.resolve(rootDir, 'packages/connectors/factusol/dist/adodb.js');
  fs.copyFileSync(adodbSrc, adodbDst);

  console.log('✓ Componentes transpilados con éxito.');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
