/**
 * BENTIAN CODE SIGNING HELPER
 * Soporte dual: Azure Trusted Signing (Artifact Signing) y Certum SimplySign / PFX estándar.
 * Firma automáticamente BentianAgent.exe, BentianTray.exe y Bentian-Setup-vX.X.X.exe.
 */

const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');

function findSignTool() {
  const candidates = [
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22000.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.19041.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\x64\\signtool.exe',
    'C:\\Program Files\\Windows Kits\\10\\bin\\x64\\signtool.exe',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Buscar en PATH
  try {
    const which = childProcess.execSync('where signtool.exe', { encoding: 'utf8' }).trim().split('\r\n')[0];
    if (which && fs.existsSync(which)) return which;
  } catch {}

  return null;
}

/**
 * Firma un archivo ejecutable mediante Authenticode.
 * Devuelve true si se firmó con éxito, o false si se omitió por falta de credenciales.
 */
function signBinary(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`    ⚠️ [CodeSign] Archivo no encontrado para firmar: ${filePath}`);
    return false;
  }

  const signtool = findSignTool();

  // 1. Modo Azure Trusted Signing (Microsoft Artifact Signing)
  const azureDlib = process.env.AZURE_CODESIGNING_DLIB || path.resolve(__dirname, 'tools', 'Azure.CodeSigning.Dlib.dll');
  const azureMetadata = process.env.AZURE_CODESIGNING_METADATA || path.resolve(__dirname, 'config', 'azure-metadata.json');

  if (signtool && fs.existsSync(azureDlib) && fs.existsSync(azureMetadata)) {
    console.log(`    🔐 [CodeSign] Firmando con Azure Trusted Signing: ${path.basename(filePath)}...`);
    const timestampUrl = process.env.TIMESTAMP_URL || 'http://timestamp.acs.microsoft.com';
    const cmd = `"${signtool}" sign /v /fd SHA256 /tr "${timestampUrl}" /td SHA256 /dlib "${azureDlib}" /dmdf "${azureMetadata}" "${filePath}"`;

    try {
      childProcess.execSync(cmd, { stdio: 'inherit' });
      console.log(`    ✓ [CodeSign] Firma Azure Trusted Signing exitosa: ${path.basename(filePath)}`);
      return true;
    } catch (err) {
      console.error(`    ❌ [CodeSign] Error al firmar con Azure Trusted Signing:`, err.message);
      return false;
    }
  }

  // 2. Modo Certum SimplySign / Certificado instalado en Windows Store / PFX
  const pfxPath = process.env.CODESIGNING_PFX;
  const pfxPassword = process.env.CODESIGNING_PASSWORD;
  const certThumbprint = process.env.CODESIGNING_THUMBPRINT;
  const certSubject = process.env.CODESIGNING_SUBJECT || 'Bentian';

  if (signtool && (pfxPath || certThumbprint || process.env.USE_CERT_STORE === 'true')) {
    console.log(`    🔐 [CodeSign] Firmando con certificado Authenticode (Certum/Store): ${path.basename(filePath)}...`);
    const timestampUrl = process.env.TIMESTAMP_URL || 'http://timestamp.digicert.com';
    let cmd = `"${signtool}" sign /v /fd SHA256 /tr "${timestampUrl}" /td SHA256`;

    if (pfxPath && fs.existsSync(pfxPath)) {
      cmd += ` /f "${pfxPath}"`;
      if (pfxPassword) cmd += ` /p "${pfxPassword}"`;
    } else if (certThumbprint) {
      cmd += ` /sha1 "${certThumbprint}"`;
    } else {
      cmd += ` /n "${certSubject}" /a`;
    }

    cmd += ` "${filePath}"`;

    try {
      childProcess.execSync(cmd, { stdio: 'inherit' });
      console.log(`    ✓ [CodeSign] Firma Authenticode exitosa: ${path.basename(filePath)}`);
      return true;
    } catch (err) {
      console.error(`    ❌ [CodeSign] Error al firmar con certificado local:`, err.message);
      return false;
    }
  }

  // Si no hay configuración de firma
  console.log(`    ℹ️ [CodeSign] Omitiendo firma Authenticode para ${path.basename(filePath)} (no hay credenciales de Azure o Certum configuradas).`);
  console.log(`       El archivo se distribuirá con firma Ed25519 interna pero sin certificado Authenticode público.`);
  return false;
}

module.exports = {
  findSignTool,
  signBinary,
};
