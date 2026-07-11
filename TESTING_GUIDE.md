# Guide de Test & Monitoring Searcher Connector 🚀

## 🛠️ Outils Installés

### 1. **Vitest** — Tests Unitaires & Composants
- Pour tester les utilitaires, les hooks React, et les composants UI.
- Déjà configuré avec `jsdom` et `@testing-library/react`.
- Fichiers de test : `src/**/__tests__/**/*.{test,spec}.{ts,tsx}`

### 2. **Playwright** — Tests E2E (End-to-End)
- Pour tester le flux complet de l'application.
- Navigue réellement sur Chrome, Firefox, Safari et mobile.
- Prend des captures d'écran et vidéos des échecs.
- Fichiers de test : `e2e-tests/**/*.spec.ts`

### 3. **Checkly** — Monitoring Continu
- Rejoue les scénarios critiques toutes les X minutes depuis différents pays.
- Alerte immédiatement si quelque chose casse.
- Config dans `checkly.config.ts`.

### 4. **BrowserStack** — Tests Multi-Navigateurs/Dispositifs
- Teste sur des dizaines de vrais navigateurs et appareils en même temps.
- Détecte les bugs spécifiques à Safari, Chrome mobile, etc.
- Config dans `browserstack.yml`.

---

## 🚀 Comment Utiliser Ces Outils ?

### 📝 Tests Unitaires (Vitest)
```bash
npm run test              # Mode interactif
npm run test:run          # Exécuter tous les tests
npm run test:coverage     # Voir la couverture de test
```

### 🧪 Tests E2E (Playwright)
```bash
npm run test:e2e          # Exécuter tous les tests E2E
npm run test:e2e:ui       # Interface visuelle pour débugger
npm run test:e2e:report   # Voir le rapport HTML des tests
```

### 🚨 Lancer Tous les Tests en Même Temps
```bash
npm run test:all
```

---

## 🔍 Configurations à Faire

### Checkly
1. Crée un compte sur [checkly.com](https://checkly.com)
2. Installe le CLI Checkly :
   ```bash
   npm install -g checkly
   ```
3. Log in :
   ```bash
   checkly login
   ```
4. Déploie tes checks :
   ```bash
   checkly deploy
   ```

### BrowserStack
1. Crée un compte sur [browserstack.com](https://www.browserstack.com)
2. Remplace les placeholders dans `browserstack.yml` par tes credentials
3. Installe le BrowserStack Local si nécessaire
4. Exécute les tests sur BrowserStack :
   ```bash
   npx browserstack-playwright
   ```

---

## 📊 Structure des Tests

### 🧪 Tests Unitaires (Vitest)
Exemples déjà présents :
- `src/lib/__tests__/scai-matching.test.ts`
- `src/components/dashboard/__tests__/FreeUserLimitBanner.test.tsx`
- `src/components/dashboard/__tests__/PremiumOpportunitiesDashboard.test.tsx`

### 🚀 Tests E2E (Playwright)
Exemples créés :
- `e2e-tests/home.spec.ts` — Page d'accueil
- `e2e-tests/auth.spec.ts` — Flux d'authentification
- `e2e-tests/dashboard.spec.ts` — Dashboard

---

## 💡 Bonnes Pratiques

1. **Écris les tests en premier** (Test-Driven Development, TDD) si possible
2. **Tests petits et ciblés** : Un test = un seul comportement
3. **Descriptions claires** : `should do X when Y`
4. **Nettoie toujours** : Utilise `beforeEach` et `afterEach` pour reset l'état
5. **Simule les dépendances** : Utilise `vi.mock()` pour les APIs externes

---

## 🎯 Scénarios à Prioriser pour Checkly

1. **Connexion utilisateur** — L'utilisateur peut se connecter
2. **Scan d'opportunités** — Le scan fonctionne et retourne des résultats
3. **Flux de paiement** — L'abonnement fonctionne
4. **SCAI Voice** — L'interface vocale fonctionne
5. **Génération de PDF** — Le PDF s'affiche correctement
