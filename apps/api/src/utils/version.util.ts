import * as fs from 'fs';
import * as path from 'path';

/**
 * Bentian ERP Bridge — Single Source of Truth para Versionado y Enlaces de Distribución.
 * 
 * Centraliza la lectura de versión oficial para evitar discrepancias entre
 * rutas backend, servicios de correo, dashboard y landing page.
 */

export function getLatestReleasedVersion(): string {
  // 1. Intentar leer desde releases/latest.json (Fuente canónica oficial de distribución)
  const candidateLatestPaths = [
    path.resolve(process.cwd(), 'releases/latest.json'),
    path.resolve(__dirname, '../../../releases/latest.json'),
    path.resolve(__dirname, '../../../../releases/latest.json'),
    path.resolve(__dirname, '../../../../../releases/latest.json'),
    '/app/releases/latest.json',
  ];

  for (const candidate of candidateLatestPaths) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (parsed.latestVersion) {
          return String(parsed.latestVersion).replace(/^v/, '').trim();
        }
      }
    } catch {}
  }

  // 2. Fallback a package.json del monorepo o de la API
  const candidatePkgPaths = [
    path.resolve(process.cwd(), 'package.json'),
    path.resolve(__dirname, '../../../package.json'),
    path.resolve(__dirname, '../../package.json'),
    path.resolve(__dirname, '../package.json'),
    '/app/package.json',
  ];

  for (const candidate of candidatePkgPaths) {
    try {
      if (fs.existsSync(candidate)) {
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (pkg.version) {
          return String(pkg.version).replace(/^v/, '').trim();
        }
      }
    } catch {}
  }

  // 3. Fallback de contingencia (última versión conocida)
  return '0.3.2';
}

export function getLatestInstallerUrl(): string {
  return '/releases/latest/Bentian-Setup.exe';
}

export function getLatestZipUrl(): string {
  return '/releases/latest/Bentian-Setup.zip';
}

export function getLatestPortableZipUrl(): string {
  return '/releases/latest/BentianAgent-Portable.zip';
}
