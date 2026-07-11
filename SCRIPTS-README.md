# 🚀 Scripts de Validation & Capture Searcher Connector

Voici une liste des scripts créés et leur rôle :

## 📁 Fichiers Créés/Mis à Jour

1. **`capture-full-journey.mjs`**
   - Rôle : Capture complète du parcours utilisateur (FREE & PREMIUM) avec Playwright
   - Fonctionnalités :
     - Ouvre Chrome en mode "headed"
     - Capture un screenshot pour chaque étape (enregistré dans `screenshots/`)
     - Enregistre une vidéo complète (enregistrée dans `videos/`)
     - Génère un rapport textuel `capture-report.txt`
   - Utilisation : `node capture-full-journey.mjs`

2. **`validate-scai-quality.mjs`**
   - Rôle : Validation SCAI de la qualité des opportunités
   - Fonctionnalités :
     - Teste chaque opportunité pour la qualité (titre, description, source, date, salaire, anti-arnaque)
     - Calcule un score de qualité (0-100)
     - Génère `quality-report.json` avec les résultats
   - Utilisation : `node validate-scai-quality.mjs`

3. **`validate-with-scai.mjs`**
   - Rôle : Validation complète du système par SCAI
   - Fonctionnalités :
     - Teste le matching avec des profils variés (dev, marketing, design, différentes langues)
     - Vérifie la qualité du contenu, la langue, le matching métier
     - Génère `scai-final-report.json` avec le verdict final
   - Utilisation : `node validate-with-scai.mjs`

## 📂 Emplacements des Résultats

- **Screenshots** : `./screenshots/`
- **Videos** : `./videos/`
- **Rapports** : Racine du projet (`quality-report.json`, `scai-final-report.json`, `capture-report.txt`)

## 🧪 Prérequis

1. Installer Playwright si pas déjà fait : `npx playwright install chromium`
2. Lancer le serveur dev : `npm run dev` (devrait écouter sur `localhost:3000` ou `localhost:3001`)
3. Configurer les clés IA dans le `.env` si tu veux utiliser SCAI pour les validations

## 📊 Procédure complète recommandée

1. Lancer `npm run dev`
2. Lancer `node capture-full-journey.mjs` pour la capture vidéo/screenshots
3. Lancer `node validate-scai-quality.mjs` pour la qualité des opportunités
4. Lancer `node validate-with-scai.mjs` pour la validation complète par SCAI
5. Vérifier les rapports et les captures !

## ✅ Corrections déjà effectuées

- Corrigé les imports dans `FreeUserLimitBanner.tsx`
- Mis à jour `package.json` avec le bon package BrowserStack
- Corrigé `scai-matching.ts`
