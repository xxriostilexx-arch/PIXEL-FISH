@echo off
REM ============================================
REM Inicia TUDO: API + Front-end + Caddy
REM ============================================

set PROJECT_DIR=C:\Users\CATADM\Desktop\PIXEL FISH
set CADDY_DIR=C:\caddy

echo ============================================
echo  Iniciando Pixel Fish - Ambiente completo
echo ============================================
echo.

echo [1/2] Iniciando API + Front-end (npm run dev)...
cd /d "%PROJECT_DIR%"
start "Pixel Fish - API + Front" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Caddy...
cd /d "%CADDY_DIR%"
.\caddy start --config "%CADDY_DIR%\Caddyfile"

echo.
echo ============================================
echo  Tudo iniciado!
echo ============================================
echo  Front local:  http://localhost:5173
echo  API local:    http://localhost:8787
echo  Front online: https://pixelfish.app
echo  API online:   https://api.pixelfish.app
echo ============================================
echo.
pause
