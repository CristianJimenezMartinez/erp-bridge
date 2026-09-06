@echo off
setlocal enabledelayedexpansion

echo ========================================================================
echo        BENTIAN ERP BRIDGE — LANZADOR DE ESCRITORIO (APP + TRAY)        
echo ========================================================================
echo.

set ROOT_DIR=%~dp0..
cd /d "%ROOT_DIR%"

echo [1/3] Verificando API Local en puerto 3000...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Iniciando Servidor API en segundo plano...
    start "" /B node scripts\local-api-server.js
    timeout /t 2 /nobreak >nul
) else (
    echo [OK] Servidor API ya esta activo en http://localhost:3000
)

echo.
echo [2/3] Verificando Dashboard Angular en puerto 4200...
netstat -ano | findstr ":4200" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Iniciando Dashboard en segundo plano...
    cd /d "C:\Users\Cayse\bentian-dashboard"
    start "" /B npx ng serve --port 4200 --host 0.0.0.0
    cd /d "%ROOT_DIR%"
    timeout /t 5 /nobreak >nul
) else (
    echo [OK] Dashboard Angular ya esta activo en http://localhost:4200
)

echo.
echo [3/3] Abriendo Ventana Nativa de Escritorio (Sin Chrome / Sin Pestañas)...

set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"

if exist %EDGE% (
    start "" %EDGE% --app=http://localhost:4200 --window-size=1280,840
) else if exist %CHROME% (
    start "" %CHROME% --app=http://localhost:4200 --window-size=1280,840
) else (
    start "" http://localhost:4200
)

echo.
echo ========================================================================
echo   ✓ Aplicacion de escritorio abierta con exito.
echo   ✓ Sincronizacion activa en segundo plano.
echo ========================================================================
echo.
timeout /t 3 >nul
