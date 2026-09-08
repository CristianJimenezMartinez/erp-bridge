@echo off
REM ====================================================================
REM   BENTIAN AGENT — MASTER BUILDER & DEPLOYMENT SCRIPT (Windows)
REM   Uso:
REM     build.bat                   (compilar version actual)
REM     build.bat patch             (incrementar patch: 0.1.0 -> 0.1.1)
REM     build.bat minor             (incrementar minor: 0.1.0 -> 0.2.0)
REM     build.bat --deploy          (compilar version actual y desplegar a Hetzner)
REM     build.bat patch --deploy    (incrementar patch, compilar y desplegar)
REM ====================================================================

cd /d "%~dp0"

node build.js %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] La compilacion o despliegue ha fallado con codigo %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [EXITO] Proceso completado exitosamente.
pause
