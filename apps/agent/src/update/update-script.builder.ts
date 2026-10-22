import * as path from 'path';
import * as os from 'os';
import { UpdateSwapOptions } from './update.types';

/**
 * Escapes single quotes and strips control characters for safe interpolation inside PowerShell single-quoted strings.
 */
export function escapePsSingleQuoted(value: string): string {
  return String(value ?? '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/'/g, "''");
}

/**
 * Resolves the default user-isolated staging directory for update scripts.
 */
export function resolveDefaultUpdateScriptDir(explicitDir?: string): string {
  if (explicitDir && explicitDir.trim().length > 0) {
    return path.resolve(explicitDir);
  }
  const baseDir = process.env.LOCALAPPDATA || process.env.APPDATA || os.tmpdir();
  return path.join(baseDir, 'Bentian Agent', 'updates');
}

/**
 * Generates the native PowerShell script for atomic binary replacement, SHA-256 staging verification,
 * and 10-second crash monitoring with automatic rollback.
 */
export function buildPowerShellSwapScript(options: UpdateSwapOptions): string {
  const rawTarget = path.resolve(options.targetExePath);
  const rawNew = path.resolve(options.newExePath);
  const rawBackup = options.backupExePath ? path.resolve(options.backupExePath) : `${rawTarget}.bak`;

  const targetExe = escapePsSingleQuoted(rawTarget);
  const newExe = escapePsSingleQuoted(rawNew);
  const backupExe = escapePsSingleQuoted(rawBackup);

  const scriptDir = resolveDefaultUpdateScriptDir(options.scriptDir);
  const rawScriptDir = escapePsSingleQuoted(scriptDir);

  const timeoutSecs = Math.max(1, Math.min(120, Math.floor(Number(options.timeoutSeconds ?? 10) || 10)));
  const rawProcNames = options.processNamesToKill ?? ['BentianAgent', 'BentianTray'];
  const safeProcNames = rawProcNames
    .map((p) => String(p).trim())
    .filter((p) => /^[a-zA-Z0-9._-]+$/.test(p));
  const procListStr = (safeProcNames.length > 0 ? safeProcNames : ['BentianAgent', 'BentianTray'])
    .map((p) => `'${escapePsSingleQuoted(p)}'`)
    .join(', ');

  const postArgs = options.postUpdateArgs && options.postUpdateArgs.length > 0
    ? options.postUpdateArgs.map((a) => `'${escapePsSingleQuoted(a)}'`).join(', ')
    : `'start', '--post-update'`;

  const expectedSha256 = /^[0-9a-fA-F]{64}$/.test(options.expectedSha256 || '')
    ? String(options.expectedSha256).toLowerCase()
    : '';
  const expectedAdodbSha256 = /^[0-9a-fA-F]{64}$/.test(options.expectedAdodbSha256 || '')
    ? String(options.expectedAdodbSha256).toLowerCase()
    : '';

  return `# ==============================================================================
# BENTIAN ERP BRIDGE - SCRIPT NATIVO DE ACTUALIZACIÓN ATÓMICA Y ROLLBACK DE SEGURIDAD
# Generado automáticamente por Bentian UpdateSwapper
# ==============================================================================
$ErrorActionPreference = 'Continue'
$targetExe = '${targetExe}'
$newExe = '${newExe}'
$backupExe = '${backupExe}'
$timeoutSecs = ${timeoutSecs}
$targetDir = Split-Path -Parent $targetExe
$logDir = '${rawScriptDir}'
if (-not (Test-Path "$logDir")) { New-Item -ItemType Directory -Path "$logDir" -Force -ErrorAction SilentlyContinue | Out-Null }
$logFile = Join-Path $logDir 'bentian-update.log'

function Log-Msg($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    Write-Output $line
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

Log-Msg "Iniciando proceso de sustitución binaria silenciosa..."

# 0. Staging protegido y reverificación SHA-256 (cierra la ventana TOCTOU en %TEMP%).
$expectedSha256 = '${expectedSha256}'
$installSource = $newExe
if ($expectedSha256) {
    $stagedExe = "$targetExe.new"
    $actualSha256 = ''
    try {
        if (Test-Path "$stagedExe") { Remove-Item -Path "$stagedExe" -Force -ErrorAction Stop }
        Copy-Item -Path "$newExe" -Destination "$stagedExe" -Force -ErrorAction Stop
        $actualSha256 = (Get-FileHash -Path "$stagedExe" -Algorithm SHA256 -ErrorAction Stop).Hash.ToLower()
    } catch {
        Log-Msg "SEGURIDAD: no se pudo preparar el binario nuevo para verificarlo: $($_.Exception.Message)"
    }
    if ($actualSha256 -ne $expectedSha256.ToLower()) {
        Log-Msg "SEGURIDAD: el SHA-256 del binario nuevo NO coincide con el esperado. Actualización abortada sin modificar la instalación."
        Remove-Item -Path "$stagedExe" -Force -ErrorAction SilentlyContinue
        exit 3
    }
    Log-Msg "Binario nuevo verificado (SHA-256 correcto) en ubicación protegida."
    $installSource = $stagedExe
}

# 1. Detener procesos activos de Bentian para liberar bloqueos de archivo
$procsToKill = @(${procListStr})
foreach ($pName in $procsToKill) {
    Log-Msg "Deteniendo proceso: $pName..."
    Stop-Process -Name $pName -Force -ErrorAction SilentlyContinue
    taskkill /F /IM "$pName.exe" 2>&1 | Out-Null
}
Start-Sleep -Seconds 2

# 2. Backup del binario actual (.bak para rollback)
if (Test-Path "$targetExe") {
    if (Test-Path "$backupExe") {
        Remove-Item -Path "$backupExe" -Force -ErrorAction SilentlyContinue
    }
    Log-Msg "Renombrando binario actual a .bak: $backupExe"
    Move-Item -Path "$targetExe" -Destination "$backupExe" -Force
}

# 3. Mover el nuevo binario a la ruta objetivo oficial
Log-Msg "Instalando nuevo binario desde $installSource..."
Move-Item -Path "$installSource" -Destination "$targetExe" -Force
if ($installSource -ne $newExe) { Remove-Item -Path "$newExe" -Force -ErrorAction SilentlyContinue }

# 4. Copiar adodb.js únicamente si existe Y su hash SHA-256 esperado fue verificado explícitamente
$expectedAdodbSha256 = '${expectedAdodbSha256}'
if ($expectedAdodbSha256) {
    $newDir = Split-Path -Parent $newExe
    $adodbSource = Join-Path $newDir "adodb.js"
    $adodbTarget = Join-Path $targetDir "adodb.js"
    if (Test-Path "$adodbSource") {
        $actualAdodbHash = (Get-FileHash -Path "$adodbSource" -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash.ToLower()
        if ($actualAdodbHash -eq $expectedAdodbSha256) {
            Copy-Item -Path "$adodbSource" -Destination "$adodbTarget" -Force -ErrorAction SilentlyContinue
        } else {
            Log-Msg "SEGURIDAD: adodb.js omitido por no coincidir con SHA-256 esperado."
        }
    }
}

# 5. Relanzar BentianAgent.exe con WorkingDirectory explícito
Log-Msg "Relanzando $targetExe con argumentos: ${postArgs}..."
$launchArgs = @(${postArgs})
$proc = Start-Process -FilePath "$targetExe" -ArgumentList $launchArgs -WorkingDirectory "$targetDir" -PassThru -WindowStyle Hidden

if (-not $proc) {
    Log-Msg "CRITICO: No se pudo lanzar el nuevo binario. Ejecutando rollback de emergencia..."
    Remove-Item -Path "$targetExe" -Force -ErrorAction SilentlyContinue
    if (Test-Path "$backupExe") {
        Move-Item -Path "$backupExe" -Destination "$targetExe" -Force
        Start-Process -FilePath "$targetExe" -ArgumentList "start" -WorkingDirectory "$targetDir" -WindowStyle Hidden
    }
    exit 1
}

$procId = $proc.Id
Log-Msg "Proceso lanzado (PID: $procId). Monitorizando estabilidad durante $timeoutSecs segundos..."

# 6. Monitorización de arranque durante 10 segundos (Rollback de Seguridad)
$crashed = $false
for ($i = 1; $i -le $timeoutSecs; $i++) {
    Start-Sleep -Seconds 1
    if ($proc.HasExited) {
        $crashed = $true
        Log-Msg "CRASH DETECTADO: El proceso finalizo inesperadamente en el segundo $i con codigo $($proc.ExitCode)!"
        break
    }
}

if ($crashed) {
    Log-Msg "[WARN] ACTIVANDO ROLLBACK DE SEGURIDAD AUTOMATICO..."
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$targetExe" -Force -ErrorAction SilentlyContinue
    if (Test-Path "$backupExe") {
        Log-Msg "Restaurando version previa desde $backupExe..."
        Move-Item -Path "$backupExe" -Destination "$targetExe" -Force
        Start-Process -FilePath "$targetExe" -ArgumentList "start" -WindowStyle Hidden
        Log-Msg "Rollback completado. Version anterior restaurada y operativa."
    }
    exit 1
}

Log-Msg "[OK] Arranque verificado exitosamente tras $timeoutSecs segundos de supervision continua. Actualizacion completada."
exit 0
`;
}

/**
 * Generates the Windows CMD wrapper (.bat) that invokes the PowerShell supervisor script.
 */
export function buildBatchSwapScript(options: UpdateSwapOptions, ps1Path?: string): string {
  const cleanCmdPath = (p: string) => path.resolve(p).replace(/["&|<>^%\r\n]/g, '');
  const targetExe = cleanCmdPath(options.targetExePath);
  const newExe = cleanCmdPath(options.newExePath);
  const backupExe = options.backupExePath ? cleanCmdPath(options.backupExePath) : `${targetExe}.bak`;
  const scriptDir = resolveDefaultUpdateScriptDir(options.scriptDir);
  const logFile = cleanCmdPath(path.join(scriptDir, 'bentian-update.log'));
  const resolvedPs1 = cleanCmdPath(ps1Path || path.join(scriptDir, 'bentian-apply-update.ps1'));

  return `@echo off
rem ==============================================================================
rem BENTIAN ERP BRIDGE - WRAPPER NATIVO DE ACTUALIZACIÓN ATÓMICA (.BAT)
rem ==============================================================================
setlocal enabledelayedexpansion

set "TARGET_EXE=${targetExe}"
set "NEW_EXE=${newExe}"
set "BACKUP_EXE=${backupExe}"
set "LOG_FILE=${logFile}"
set "PS1_SCRIPT=${resolvedPs1}"

echo [%DATE% %TIME%] Iniciando bentian-apply-update.bat >> "%LOG_FILE%"

if exist "%PS1_SCRIPT%" (
    echo [%DATE% %TIME%] Ejecutando PowerShell con supervisión activa de 10s >> "%LOG_FILE%"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%PS1_SCRIPT%"
    exit /b %ERRORLEVEL%
)

exit /b 1
`;
}
