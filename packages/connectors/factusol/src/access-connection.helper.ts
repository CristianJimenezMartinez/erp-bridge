import fs from 'fs';
import path from 'path';

export interface OledbCandidate {
  cscript: string;
  provider: string;
}

export const OLEDB_CANDIDATES: OledbCandidate[] = [
  { cscript: 'C:\\Windows\\SysWOW64\\cscript.exe', provider: 'Microsoft.ACE.OLEDB.12.0' },
  { cscript: 'C:\\Windows\\SysWOW64\\cscript.exe', provider: 'Microsoft.ACE.OLEDB.16.0' },
  { cscript: 'C:\\Windows\\System32\\cscript.exe', provider: 'Microsoft.ACE.OLEDB.16.0' },
  { cscript: 'C:\\Windows\\System32\\cscript.exe', provider: 'Microsoft.ACE.OLEDB.12.0' },
  { cscript: 'C:\\Windows\\SysWOW64\\cscript.exe', provider: 'Microsoft.Jet.OLEDB.4.0' },
];

/**
 * Valida que la ruta de base de datos Access (.accdb / .mdb) no contenga
 * caracteres de inyección de cadena de conexión OLEDB (; o comillas o caracteres de control).
 */
export function sanitizeDatabasePath(rawPath: string): string {
  const cleaned = String(rawPath || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '');

  if (cleaned.includes(';') || cleaned.includes('"') || cleaned.includes('=')) {
    throw new Error('Ruta de base de datos inválida: contiene caracteres no permitidos en cadena OLEDB.');
  }

  return path.resolve(cleaned);
}

/**
 * Valida el nombre del proveedor OLEDB contra una lista blanca de proveedores Microsoft ACE/Jet.
 */
export function sanitizeOledbProvider(provider?: string): string {
  const candidate = String(provider || 'Microsoft.ACE.OLEDB.12.0').trim();
  if (!/^Microsoft\.(ACE\.OLEDB\.(12|16)\.0|Jet\.OLEDB\.4\.0)$/i.test(candidate)) {
    return 'Microsoft.ACE.OLEDB.12.0';
  }
  return candidate;
}

/**
 * Construye una cadena de conexión OLEDB segura con Data Source saneado
 * y Mode=Share Deny None; para máxima concurrencia con Factusol/SimplyGest.
 */
export function buildSafeOledbConnectionString(provider: string, databasePath: string, includeShareMode = true): string {
  const safeProvider = sanitizeOledbProvider(provider);
  const safePath = sanitizeDatabasePath(databasePath);
  const modeSegment = includeShareMode ? 'Mode=Share Deny None;' : '';
  return `Provider=${safeProvider};Data Source=${safePath};${modeSegment}Persist Security Info=False;`;
}

/**
 * Resuelve la ruta del script adodb.js únicamente desde ubicaciones de confianza
 * relativas al ejecutable o al paquete compilado (sin buscar en process.cwd() arbitrario).
 */
export function resolveTrustedAdodbJsPath(moduleDir: string): string {
  const trustedCandidates = [
    path.resolve(path.dirname(process.execPath), 'adodb.js'),
    path.resolve(moduleDir, 'adodb.js'),
    path.resolve(moduleDir, '../src/adodb.js'),
  ];

  for (const candidate of trustedCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    return require.resolve('node-adodb/lib/adodb.js');
  } catch {
    return path.resolve(moduleDir, '../../../node_modules/node-adodb/lib/adodb.js');
  }
}

/**
 * Decodifica la salida de cscript.exe (UTF-16LE con BOM, UTF-8 o Latin1).
 */
export function decodeCscriptStreamBuffer(buf: Buffer): string {
  if (!buf || buf.length === 0) return '';
  if (buf.length >= 2 && ((buf[0] === 0xff && buf[1] === 0xfe) || buf[1] === 0x00)) {
    const text = buf.toString('utf16le');
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }
  try {
    const text = buf.toString('utf8');
    if (!text.includes('\ufffd')) {
      return text;
    }
  } catch {
    // Fallback a latin1
  }
  return buf.toString('latin1');
}
