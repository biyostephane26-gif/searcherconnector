@echo off
chcp 65001 >nul
title Searcher Connector — Création du package
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   Création du package de distribution               ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0.."

:: Vérifier que PowerShell est disponible pour zipper
echo [1/3] Préparation...

:: Créer le dossier de distribution
if exist "dist-package" rmdir /s /q "dist-package"
mkdir "dist-package"
mkdir "dist-package\searcherconnector"

:: Copier les fichiers (sans node_modules, .next, .env)
echo [2/3] Copie des fichiers...
xcopy /E /I /Q /EXCLUDE:installer\exclude-list.txt . "dist-package\searcherconnector" >nul

:: Copier les fichiers d'installation
copy "installer\INSTALL-WINDOWS.bat" "dist-package\searcherconnector\installer\" >nul
copy "installer\INSTALL-MAC.sh" "dist-package\searcherconnector\installer\" >nul
copy "installer\START.bat" "dist-package\searcherconnector\installer\" >nul
copy "installer\README-INSTALLATION.txt" "dist-package\searcherconnector\installer\" >nul
copy "installer\README-INSTALLATION.txt" "dist-package\LISEZ-MOI.txt" >nul

echo [3/3] Création du zip...
powershell -Command "Compress-Archive -Path 'dist-package\searcherconnector' -DestinationPath 'searcher-connector-v1.0.zip' -Force"

rmdir /s /q "dist-package"

echo.
echo  ✓ Package créé : searcher-connector-v1.0.zip
echo.
echo  IMPORTANT : Le fichier .env n'est PAS inclus dans le zip.
echo  Envoie-le séparément et en privé à chaque utilisateur.
echo.
pause
