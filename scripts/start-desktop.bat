@echo off
setlocal enabledelayedexpansion

echo ========================================================================
echo        BENTIAN ERP BRIDGE — LANZADOR DE ESCRITORIO (APP + TRAY)        
echo ========================================================================
echo.

set ROOT_DIR=%~dp0..
cd /d "%ROOT_DIR%"

echo [1/2] Iniciando Icono Centinela en la Bandeja del Sistema (System Tray)...
start "" powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\bentian-tray.ps1"

echo.
echo [2/2] Abriendo Ventana Nativa de Escritorio (Sin Pestañas / Sin Marcos)...

set DASHBOARD_URL=https://bridge.cristianjm.com/dashboard
set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"

if exist %EDGE% (
    start "" %EDGE% --app=%DASHBOARD_URL% --window-size=1280,840
) else if exist %CHROME% (
    start "" %CHROME% --app=%DASHBOARD_URL% --window-size=1280,840
) else (
    start "" %DASHBOARD_URL%
)

echo.
echo ========================================================================
echo   ✓ Panel de escritorio iniciado con exito.
echo   ✓ Icono activo en la bandeja del sistema junto al reloj.
echo ========================================================================
echo.
timeout /t 2 >nul
