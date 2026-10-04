@echo off
REM ============================================
REM Inicia a API (Express) e o Front-end (Vite)
REM ============================================

set PROJECT_DIR=C:\Users\CATADM\Desktop\PIXEL FISH

echo Iniciando Pixel Fish (API + Front-end)...
cd /d "%PROJECT_DIR%"

start "Pixel Fish - API + Front" cmd /k "npm run dev"

echo.
echo Processo iniciado em uma nova janela.
echo API deve subir em: http://localhost:8787
echo Front deve subir em: http://localhost:5173
echo.
pause
