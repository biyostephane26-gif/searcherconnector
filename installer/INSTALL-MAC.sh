#!/bin/bash
# ================================================================
# SEARCHER CONNECTOR — Installation macOS / Linux
# ================================================================

clear
echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║      SEARCHER CONNECTOR — Installation               ║"
echo "  ║      L'agent IA qui travaille pour vous 24h/24       ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""

# ── Couleurs ─────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Aller dans le dossier parent (racine du projet) ───────────────
cd "$(dirname "$0")/.."

# ── Vérifier Node.js ─────────────────────────────────────────────
echo "[1/5] Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo ""
    echo -e "${RED}  ⚠  Node.js n'est pas installé.${NC}"
    echo ""
    echo "  Installe-le avec :"
    echo "  macOS  : brew install node"
    echo "  Linux  : sudo apt install nodejs npm"
    echo "  Ou via : https://nodejs.org"
    echo ""
    exit 1
fi
NODE_VER=$(node --version)
echo -e "${GREEN}  ✓ Node.js $NODE_VER détecté${NC}"

# ── Vérifier .env ─────────────────────────────────────────────────
echo ""
echo "[2/5] Vérification de la configuration..."
if [ ! -f ".env" ]; then
    echo ""
    echo -e "${RED}  ⚠  Fichier .env manquant !${NC}"
    echo ""
    echo "  Copie le fichier .env fourni dans ce dossier,"
    echo "  puis relance ce script."
    echo ""
    exit 1
fi
echo -e "${GREEN}  ✓ Configuration trouvée${NC}"

# ── Installer les dépendances ─────────────────────────────────────
echo ""
echo "[3/5] Installation des dépendances (2-3 minutes)..."
npm install --legacy-peer-deps --silent
if [ $? -ne 0 ]; then
    npm install --force --silent
fi
echo -e "${GREEN}  ✓ Dépendances installées${NC}"

# ── Builder ───────────────────────────────────────────────────────
echo ""
echo "[4/5] Compilation de l'application..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}  ⚠  Erreur de compilation. Vérifie ton .env.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Application compilée${NC}"

# ── Créer le script de lancement ─────────────────────────────────
echo ""
echo "[5/5] Création du lanceur..."
LAUNCH_SCRIPT="$HOME/Desktop/searcher-connector.sh"
cat > "$LAUNCH_SCRIPT" << 'LAUNCHER'
#!/bin/bash
cd "$(dirname "$0")"
# Retrouve le dossier du projet
PROJECT_DIR="$(find ~/Desktop ~/Documents -name "searcherconnector" -type d 2>/dev/null | head -1)"
if [ -z "$PROJECT_DIR" ]; then
    echo "Dossier du projet introuvable. Place ce fichier à côté du dossier searcherconnector."
    exit 1
fi
cd "$PROJECT_DIR"
open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null &
sleep 2
npm start
LAUNCHER
chmod +x "$LAUNCH_SCRIPT"
echo -e "${GREEN}  ✓ Lanceur créé sur le Bureau${NC}"

echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║   ✓  Installation terminée !                         ║"
echo "  ║                                                      ║"
echo "  ║   Tape la commande :                                 ║"
echo "  ║   npm start                                          ║"
echo "  ║   puis ouvre : http://localhost:3000                 ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""

# Lancer maintenant
open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null &
sleep 2
npm start
