@echo off
REM ============================================
REM Inicia o Caddy em background (persistente)
REM ============================================

set CADDY_DIR=C:\caddy

echo Iniciando Caddy...
cd /d "%CADDY_DIR%"

.\caddy start --config "%CADDY_DIR%\Caddyfile"

echo.
echo Caddy iniciado em background.
echo Dominios: https://pixelfish.app | https://www.pixelfish.app | https://api.pixelfish.app
echo.
pause
