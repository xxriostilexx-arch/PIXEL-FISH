@echo off
REM ============================================
REM Reinicia TUDO: para e inicia de novo
REM ============================================

set PROJECT_DIR=C:\Users\CATADM\Desktop\PIXEL FISH
set CADDY_DIR=C:\caddy

echo ============================================
echo  Reiniciando Pixel Fish - Ambiente completo
echo ============================================
echo.

echo [1/4] Parando Caddy...
cd /d "%CADDY_DIR%"
.\caddy stop >nul 2>&1

echo [2/4] Parando processos Node (API + Vite)...
taskkill /IM node.exe /F >nul 2>&1

echo [3/4] Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo [4/4] Iniciando tudo de novo...
cd /d "%PROJECT_DIR%"
start "Pixel Fish - API + Front" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

cd /d "%CADDY_DIR%"
.\caddy start --config "%CADDY_DIR%\Caddyfile"

echo.
echo ============================================
echo  Reiniciado com sucesso!
echo ============================================
echo  Front local:  http://localhost:5173
echo  API local:    http://localhost:8787
echo  Front online: https://pixelfish.app
echo  API online:   https://api.pixelfish.app
echo ============================================
echo.
pause
