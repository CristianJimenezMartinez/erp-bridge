/**
 * BENTIAN ERP BRIDGE — MONOREPO PACKAGE COMPILER (ESBUILD)
 * Compiles packages' TypeScript src/ directory to dist/ (CommonJS)
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('../builder/node_modules/esbuild');

const packages = [
  'packages/shared',
  'packages/sdk',
  'packages/connectors/factusol',
  'packages/connectors/woocommerce',
  'packages/connectors/simplygest',
  'packages/core',
  'apps/api',
];

function getAllFiles(dir, exts = ['.ts', '.js']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      const ext = path.extname(fullPath).toLowerCase();
      if (exts.includes(ext) && !fullPath.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function compilePackage(pkgRelPath) {
  const pkgDir = path.resolve(__dirname, '..', pkgRelPath);
  const srcDir = path.join(pkgDir, 'src');
  const testDir = path.join(pkgDir, 'test');
  const distDir = path.join(pkgDir, 'dist');

  if (!fs.existsSync(srcDir)) return;

  const srcFiles = getAllFiles(srcDir, ['.ts', '.js']);
  const testFiles = fs.existsSync(testDir) ? getAllFiles(testDir, ['.ts', '.js']) : [];
  let count = 0;

  for (const file of srcFiles) {
    const relToSrc = path.relative(srcDir, file);
    const outRel = relToSrc.replace(/\.ts$/, '.js');
    const outFile = path.join(distDir, outRel);
    const outParent = path.dirname(outFile);

    if (!fs.existsSync(outParent)) {
      fs.mkdirSync(outParent, { recursive: true });
    }

    if (file.endsWith('.js')) {
      fs.copyFileSync(file, outFile);
    } else {
      esbuild.buildSync({
        entryPoints: [file],
        outfile: outFile,
        format: 'cjs',
        platform: 'node',
        target: 'node20',
      });
    }
    count++;
  }

  for (const file of testFiles) {
    const relToTest = path.relative(testDir, file);
    const outRel = relToTest.replace(/\.ts$/, '.js');
    const outFile = path.join(distDir, 'test', outRel);
    const outParent = path.dirname(outFile);

    if (!fs.existsSync(outParent)) {
      fs.mkdirSync(outParent, { recursive: true });
    }

    esbuild.buildSync({
      entryPoints: [file],
      outfile: outFile,
      format: 'cjs',
      platform: 'node',
      target: 'node20',
    });
    count++;
  }

  console.log(`✓ [${pkgRelPath}] Compilados ${count} archivos a dist/`);
}

function main() {
  console.log('Compilando paquetes monorepo con esbuild...');
  const start = Date.now();
  for (const pkg of packages) {
    compilePackage(pkg);
  }
  console.log(`Listo en ${Date.now() - start}ms.`);
}

if (require.main === module) {
  main();
}

module.exports = { compilePackage };
