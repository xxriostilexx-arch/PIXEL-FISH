@echo off
REM ============================================
REM Checa o status de API, Front-end e Caddy
REM ============================================

echo ============================================
echo  STATUS - Pixel Fish
echo ============================================
echo.

echo --- Processos Node.exe rodando ---
tasklist | findstr /I node.exe
if errorlevel 1 echo   Nenhum processo Node encontrado.
echo.

echo --- Processo Caddy.exe rodando ---
tasklist | findstr /I caddy.exe
if errorlevel 1 echo   Caddy nao esta rodando.
echo.

echo --- Portas em uso (8787 = API, 5173 = Vite) ---
netstat -ano | findstr LISTENING | findstr "8787 5173"
if errorlevel 1 echo   Nenhuma das portas 8787/5173 esta em LISTENING.
echo.

echo --- Testando resposta da API local ---
curl -s -o nul -w "API local (localhost:8787) respondeu com status: %%{http_code}\n" http://localhost:8787/game/state

echo --- Testando resposta do dominio publico ---
curl -s -o nul -w "https://pixelfish.app respondeu com status: %%{http_code}\n" https://pixelfish.app
curl -s -o nul -w "https://api.pixelfish.app/game/state respondeu com status: %%{http_code}\n" https://api.pixelfish.app/game/state

echo.
echo ============================================
pause
