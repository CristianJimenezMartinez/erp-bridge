import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import { Logger } from '@erp-bridge/shared';
import { UpdateSwapOptions } from './update.types';

export class UpdateSwapper {
  private static readonly logger = new Logger('UpdateSwapper');

  /**
   * Genera el script de PowerShell nativo para el swap atómico y monitorización de 10 segundos.
   */
  public static generatePowerShellScript(options: UpdateSwapOptions): string {
    const rawTarget = path.resolve(options.targetExePath);
    const rawNew = path.resolve(options.newExePath);
    const rawBackup = options.backupExePath ? path.resolve(options.backupExePath) : `${rawTarget}.bak`;

    const targetExe = rawTarget.replace(/'/g, "''");
    const newExe = rawNew.replace(/'/g, "''");
    const backupExe = rawBackup.replace(/'/g, "''");

    const timeoutSecs = options.timeoutSeconds ?? 10;
    const procNames = options.processNamesToKill ?? ['BentianAgent', 'BentianTray'];
    const procListStr = procNames.map((p) => `'${p}'`).join(', ');
    const postArgs = options.postUpdateArgs && options.postUpdateArgs.length > 0
      ? options.postUpdateArgs.map((a) => `'${a}'`).join(', ')
      : `'start', '--post-update'`;

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
$logFile = Join-Path $targetDir 'bentian-update.log'

function Log-Msg($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    Write-Output $line
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

Log-Msg "Iniciando proceso de sustitución binaria silenciosa..."

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
Log-Msg "Instalando nuevo binario desde $newExe..."
Move-Item -Path "$newExe" -Destination "$targetExe" -Force

# 4. Copiar dependencias accesorias (adodb.js) si existen
$newDir = Split-Path -Parent $newExe
$adodbSource = Join-Path $newDir "adodb.js"
$adodbTarget = Join-Path $targetDir "adodb.js"
if (Test-Path "$adodbSource") {
    Copy-Item -Path "$adodbSource" -Destination "$adodbTarget" -Force -ErrorAction SilentlyContinue
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
   * Genera el script .bat ejecutable directamente por Windows CMD sin restricciones de política.
   */
  public static generateBatchScript(options: UpdateSwapOptions, ps1Path?: string): string {
    const targetExe = path.resolve(options.targetExePath);
    const newExe = path.resolve(options.newExePath);
    const backupExe = options.backupExePath ? path.resolve(options.backupExePath) : `${targetExe}.bak`;
    const targetDir = path.dirname(targetExe);
    const logFile = path.join(targetDir, 'bentian-update.log');
    const resolvedPs1 = ps1Path || path.join(path.dirname(targetExe), 'bentian-apply-update.ps1');

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

rem Intentar delegar la supervisión de 10s y rollback al script PowerShell silencioso
if exist "%PS1_SCRIPT%" (
    echo [%DATE% %TIME%] Ejecutando PowerShell con supervisión activa de 10s >> "%LOG_FILE%"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%PS1_SCRIPT%"
    exit /b %ERRORLEVEL%
)

rem Fallback nativo CMD si PowerShell no estuviera disponible:
rem 1. Matar procesos
taskkill /F /IM BentianAgent.exe >nul 2>&1
taskkill /F /IM BentianTray.exe >nul 2>&1
timeout /t 2 /nobreak >nul

rem 2. Renombrar actual a .bak
if exist "%TARGET_EXE%" (
    if exist "%BACKUP_EXE%" del /f /q "%BACKUP_EXE%"
    move /y "%TARGET_EXE%" "%BACKUP_EXE%" >> "%LOG_FILE%" 2>&1
)

rem 3. Mover nuevo binario
move /y "%NEW_EXE%" "%TARGET_EXE%" >> "%LOG_FILE%" 2>&1

rem 4. Lanzar nuevo binario desacoplado
start "" "%TARGET_EXE%" start --post-update

rem 5. Monitorizar 10 segundos
timeout /t 10 /nobreak >nul
tasklist /fi "imagename eq BentianAgent.exe" | find /i "BentianAgent.exe" >nul
if errorlevel 1 (
    echo [%DATE% %TIME%] Fallo en arranque detectado en CMD. Revertiendo a .bak... >> "%LOG_FILE%"
    if exist "%BACKUP_EXE%" (
        del /f /q "%TARGET_EXE%" >nul 2>&1
        move /y "%BACKUP_EXE%" "%TARGET_EXE%" >nul 2>&1
        start "" "%TARGET_EXE%" start
    )
    exit /b 1
)

echo [%DATE% %TIME%] Actualizacion CMD completada exitosamente. >> "%LOG_FILE%"
exit /b 0
`;
  }

  /**
   * Escribe los scripts atómicos (.bat y .ps1) en el directorio indicado.
   */
  public static writeAtomicScripts(options: UpdateSwapOptions): {
    batPath: string;
    ps1Path: string;
  } {
    const scriptDir = options.scriptDir || path.dirname(path.resolve(options.targetExePath));
    if (!fs.existsSync(scriptDir)) {
      fs.mkdirSync(scriptDir, { recursive: true });
    }

    const ps1Path = path.join(scriptDir, 'bentian-apply-update.ps1');
    const batPath = path.join(scriptDir, 'bentian-apply-update.bat');

    const ps1Content = this.generatePowerShellScript(options);
    const batContent = this.generateBatchScript(options, ps1Path);

    // Escribir con BOM UTF-8 (\uFEFF) para compatibilidad nativa con PowerShell 5.1
    fs.writeFileSync(ps1Path, '\uFEFF' + ps1Content, { encoding: 'utf8' });
    fs.writeFileSync(batPath, batContent, { encoding: 'utf8' });

    this.logger.info(`Scripts de actualización generados:\n  - ${batPath}\n  - ${ps1Path}`);
    return { batPath, ps1Path };
  }

  /**
   * Lanza el script de actualización desacoplado de Windows para que se ejecute fuera del proceso actual.
   */
  public static launchAtomicUpdateProcess(options: UpdateSwapOptions): { launched: boolean; batPath: string } {
    const { batPath } = this.writeAtomicScripts(options);

    this.logger.info(`Lanzando proceso desacoplado de actualización atómica: ${batPath}`);

    if (process.platform === 'win32') {
      const child = childProcess.spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        cwd: path.dirname(batPath),
      });
      child.unref();
      return { launched: true, batPath };
    }

    return { launched: false, batPath };
  }

  /**
   * Reemplazo directo en el sistema de archivos (útil para tests unitarios y rollback programático).
   */
  public static async performDirectSwap(
    targetExe: string,
    newExe: string,
    backupExe?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(newExe)) {
        return { success: false, error: `El archivo nuevo no existe: ${newExe}` };
      }

      const bak = backupExe || `${targetExe}.bak`;
      if (fs.existsSync(targetExe)) {
        if (fs.existsSync(bak)) {
          fs.unlinkSync(bak);
        }
        fs.renameSync(targetExe, bak);
      }

      fs.copyFileSync(newExe, targetExe);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Rollback directo en el sistema de archivos restaurando el archivo .bak.
   */
  public static async performDirectRollback(
    targetExe: string,
    backupExe?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const bak = backupExe || `${targetExe}.bak`;
      if (!fs.existsSync(bak)) {
        return { success: false, error: `El archivo de respaldo .bak no existe: ${bak}` };
      }

      if (fs.existsSync(targetExe)) {
        try {
          fs.unlinkSync(targetExe);
        } catch {}
      }

      fs.renameSync(bak, targetExe);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}
