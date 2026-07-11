@echo off
chcp 65001 >nul
title Searcher Connector
color 0A

cd /d "%~dp0.."
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   SEARCHER CONNECTOR — Démarrage     ║
echo  ╚══════════════════════════════════════╝
echo.
echo  Ouverture du navigateur...
timeout /t 2 >nul
start "" http://localhost:3000
npm start
