@echo off
setlocal enabledelayedexpansion

echo ========================================================================
echo        BENTIAN ERP BRIDGE — SUITE MAESTRA DE PRUEBAS INTEGRALES         
echo ========================================================================
echo.

set ROOT_DIR=%~dp0..
cd /d "%ROOT_DIR%"

echo [1/4] Ejecutando Flujos E2E Factusol Access ^<---^> WooCommerce (7 flujos)...
node scripts\flows\run-all-flows.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallaron las pruebas de flujos Factusol-WooCommerce.
    exit /b 1
)

echo.
echo [2/4] Ejecutando Pruebas de Empaquetado, Licenciamiento y HWID (10 tests)...
node scripts\test-packaging-and-licensing.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallaron las pruebas de empaquetado y licenciamiento.
    exit /b 1
)

echo.
echo [3/4] Ejecutando Pruebas de Auto-Actualizador Ed25519 y Rollback (10 tests)...
node scripts\test-auto-update-flow.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallaron las pruebas del auto-actualizador.
    exit /b 1
)

echo.
echo [4/5] Ejecutando Pruebas de Hardening de Produccion y Seguridad JWT (4 tests)...
node scripts\test-production-hardening.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallaron las pruebas de hardening y produccion.
    exit /b 1
)

echo.
echo [5/5] Ejecutando Pruebas de Servidor GUI Local y Asistente Factusol (7 tests)...
node scripts\test-gui-server.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallaron las pruebas de la GUI local y asistente Factusol.
    exit /b 1
)

echo.
echo ========================================================================
echo    TODAS LAS BATERIAS DE PRUEBAS (38 TESTS) PASARON EXITOSAMENTE (100%%)
echo           EL SISTEMA ESTA 100%% LISTO PARA SALIDA A PRODUCCION           
echo ========================================================================
echo.
exit /b 0
