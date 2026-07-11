================================================================
  SEARCHER CONNECTOR — Guide d'installation PC
  Version locale (beta) — créée par Biyo Stéphane
================================================================

PRÉREQUIS
─────────
• Node.js installé sur le PC
  → Télécharge ici : https://nodejs.org (prends "LTS")
  → Installe-le normalement, redémarre le PC si demandé

• Le fichier .env (fourni séparément par Biyo Stéphane)
  → Copie-le dans le dossier searcherconnector/

================================================================
  INSTALLATION — Windows
================================================================

1. Ouvre le dossier "searcherconnector"
2. Double-clique sur "installer/INSTALL-WINDOWS.bat"
3. Attends 3-5 minutes (installation des dépendances)
4. Un raccourci "Searcher Connector" apparaît sur ton Bureau
5. L'app s'ouvre automatiquement dans ton navigateur

Après l'installation, pour relancer l'app :
→ Double-clique sur "Searcher Connector" sur le Bureau
  OU
→ Double-clique sur "installer/START.bat"

================================================================
  INSTALLATION — macOS / Linux
================================================================

1. Ouvre le Terminal dans le dossier searcherconnector
2. Tape : chmod +x installer/INSTALL-MAC.sh
3. Tape : ./installer/INSTALL-MAC.sh
4. L'app s'ouvre dans ton navigateur à http://localhost:3000

================================================================
  UTILISATION
================================================================

1. L'app tourne sur : http://localhost:3000
2. Crée ton compte (l'email biyostephane26@gmail.com = accès Genius)
3. Parle à SCAI dans "Agent Searcher"
4. Lance ton premier scan

================================================================
  RÉSOLUTION DE PROBLÈMES
================================================================

"node n'est pas reconnu"
→ Node.js n'est pas installé. Va sur https://nodejs.org

"Erreur de compilation"
→ Vérifie que le fichier .env est bien dans le dossier
  et qu'il contient toutes les clés API

"L'app ne s'ouvre pas"
→ Ouvre manuellement : http://localhost:3000

Port 3000 déjà utilisé :
→ Ouvre un terminal, tape : npx next start -p 3001
→ Puis va sur : http://localhost:3001

================================================================
  CONTACT
================================================================

Problème non résolu ? Contacte Biyo Stéphane :
→ biyostephane26@gmail.com
→ WhatsApp : (ton numéro)

© 2025 Searcher Connector — Tous droits réservés
================================================================
