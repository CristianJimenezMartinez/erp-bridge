@echo off
REM ===================================================
REM   BENTIAN AGENT ? BUILDER SCRIPT (Windows CLI)
REM   Uso: build.bat [version]
REM   Ejemplo: build.bat 0.1.0
REM ===================================================

cd /d "%~dp0"

if "%~1"=="" (
    node build.js
) else (
    node build.js "%~1"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] La compilacion ha fallado.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [EXITO] Compilacion y empaquetado finalizado.
pause
