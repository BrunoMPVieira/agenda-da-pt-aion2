@echo off
title Agenda da PT - AION 2
chcp 65001 >nul
cls

echo ====================================================
echo    ⚔️  AGENDA DA PT - AION 2 | DESENVOLVIDO POR Kharnoxy
echo ====================================================
echo.
echo Iniciando o banco de dados e servidor local...
echo.

:: Abre o navegador padrao no endereco local
start http://localhost:3000

:: Executa o servidor nativo em Node.js
node server.js

pause
