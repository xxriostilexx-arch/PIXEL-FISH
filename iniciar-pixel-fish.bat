@echo off
title Pixel Fish - Servidor Local
cd /d "%~dp0apps\web"
echo Iniciando Pixel Fish (Interface) em http://localhost:5173
call "C:\Program Files\nodejs\npm.cmd" run dev
pause
