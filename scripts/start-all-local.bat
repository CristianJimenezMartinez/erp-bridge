@echo off
setlocal enabledelayedexpansion

echo ========================================================================
echo             BENTIAN ERP BRIDGE — ARRANQUE LOCAL DEL STACK               
echo ========================================================================
echo.

set ROOT_DIR=%~dp0..
cd /d "%ROOT_DIR%"

echo [1/3] Verificando contenedor Docker de PostgreSQL (bentian-postgres:5434)...
docker start bentian-postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Contenedor bentian-postgres no iniciado o no encontrado.
    echo Asegurese de que Docker Desktop este corriendo.
) else (
    echo [OK] Base de datos PostgreSQL activa en puerto 5434.
)

echo.
echo [2/3] Verificando compilacion de componentes...
node scripts\build-server-and-factusol.js

echo.
echo [3/3] Iniciando Servidor API en http://localhost:3000...
echo.
echo ========================================================================
echo   - Panel API:       http://localhost:3000
echo   - Health Check:    http://localhost:3000/health
echo   - Descargas /:     http://localhost:3000/releases
echo   - Auth Login:      POST http://localhost:3000/api/v1/auth/login
echo.
echo   Presione CTRL+C para detener el servidor.
echo ========================================================================
echo.

set PORT=3000
set DB_PORT=5434
node apps\api\dist\index.js
