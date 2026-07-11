@echo off
chcp 65001 >nul
title Searcher Connector — Installation
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║      SEARCHER CONNECTOR — Installation               ║
echo  ║      L'agent IA qui travaille pour vous 24h/24       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ── Vérifier Node.js ────────────────────────────────────────────
echo [1/5] Vérification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ⚠  Node.js n'est pas installé sur ce PC.
    echo.
    echo  Télécharge et installe Node.js depuis :
    echo  https://nodejs.org  (choisir la version LTS)
    echo.
    echo  Puis relance ce fichier.
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  ✓ Node.js %NODE_VER% détecté

:: ── Aller dans le dossier de l'app ──────────────────────────────
cd /d "%~dp0.."

:: ── Vérifier le fichier .env ─────────────────────────────────────
echo.
echo [2/5] Vérification de la configuration...
if not exist ".env" (
    echo.
    echo  ⚠  Fichier .env manquant !
    echo.
    echo  Copie le fichier .env fourni par Biyo Stéphane
    echo  dans ce dossier, puis relance l'installation.
    echo.
    pause
    exit /b 1
)
echo  ✓ Configuration trouvée

:: ── Installer les dépendances ────────────────────────────────────
echo.
echo [3/5] Installation des dépendances (peut prendre 2-3 minutes)...
call npm install --legacy-peer-deps >nul 2>&1
if %errorlevel% neq 0 (
    echo  ⚠  Erreur lors de l'installation. Réessai...
    call npm install --force >nul 2>&1
)
echo  ✓ Dépendances installées

:: ── Builder l'application ────────────────────────────────────────
echo.
echo [4/5] Préparation de l'application...
call npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ⚠  Erreur lors de la compilation.
    echo  Vérifie que ton fichier .env est complet.
    echo.
    pause
    exit /b 1
)
echo  ✓ Application compilée

:: ── Créer le raccourci de lancement ──────────────────────────────
echo.
echo [5/5] Création du raccourci...
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Searcher Connector.bat
echo @echo off > "%SHORTCUT_PATH%"
echo cd /d "%~dp0.." >> "%SHORTCUT_PATH%"
echo start "" http://localhost:3000 >> "%SHORTCUT_PATH%"
echo npm start >> "%SHORTCUT_PATH%"
echo  ✓ Raccourci créé sur le Bureau

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   ✓  Installation terminée !                         ║
echo  ║                                                      ║
echo  ║   Double-clique sur "Searcher Connector"             ║
echo  ║   sur ton Bureau pour lancer l'app.                  ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Appuie sur une touche pour lancer l'app maintenant...
pause >nul

start "" http://localhost:3000
npm start
