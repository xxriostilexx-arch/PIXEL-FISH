@echo off
REM ============================================
REM Para TUDO: API + Front-end (node) + Caddy
REM ============================================

set CADDY_DIR=C:\caddy

echo ============================================
echo  Parando Pixel Fish - Ambiente completo
echo ============================================
echo.

echo [1/2] Parando Caddy...
cd /d "%CADDY_DIR%"
.\caddy stop

echo [2/2] Parando processos Node (API + Vite)...
taskkill /IM node.exe /F >nul 2>&1

echo.
echo ============================================
echo  Tudo parado.
echo ============================================
echo.
pause
