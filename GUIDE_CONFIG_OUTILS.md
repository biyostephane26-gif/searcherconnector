# 🚀 Guide de Configuration Rapide - Checkly, BrowserStack, Meticulous

Date : 03/07/2026

---

## 📋 Prérequis

Tout d'abord :
- ✅ Ton projet Searcher Connector est prêt
- ✅ Tu as accès à `.env`
- ✅ Tu es prêt à créer des comptes gratuits sur les plateformes

---

## 1️⃣ Checkly (Monitoring Continu)

### Étape 1 : Créer un compte Checkly
→ https://checklyhq.com/signup (Gratuit !)

### Étape 2 : Installer et se connecter
```bash
npm install -g checkly
checkly login
```

### Étape 3 : Déployer les checks
```bash
# D'abord, modifie checkly.config.ts avec ton repoUrl
# Puis :
npx checkly test
npx checkly deploy
```

### Étape 4 : Vérifier sur l'interface
→ https://app.checklyhq.com/

Tu verras tes 3 checks (home, auth, theme) s'exécuter toutes les 5-15 minutes !

---

## 2️⃣ BrowserStack (Cross-Browser Testing)

### Étape 1 : Créer un compte BrowserStack
→ https://www.browserstack.com/users/sign_up (Free Trial disponible)

### Étape 2 : Obtenir tes clés
→ https://www.browserstack.com/accounts/settings
Récupère :
- `userName`
- `accessKey`

### Étape 3 : Mettre à jour browserstack.yml
Remplace les placeholders par tes vraies clés :
```yaml
userName: TON_USERNAME
accessKey: TON_ACCESS_KEY
```

### Étape 4 : Lancer les tests
```bash
# Avec Playwright (configuré)
npx browserstack-playwright test --config browserstack.yml
```

Ou utilise leur interface web pour tester manuellement sur des appareils réels !

---

## 3️⃣ Meticulous.ai (AI Regression Testing)

### Étape 1 : Créer un compte Meticulous
→ https://www.meticulous.ai/ (Demande accès beta, ou connecte avec GitHub)

### Étape 2 : Installer le CLI
```bash
npm install -g @meticulousai/cli
```

### Étape 3 : Enregistrer une session
```bash
# D'abord, assure que ton serveur est en cours d'exécution (npm run dev)
meticulous record
```

Suivre les instructions pour naviguer sur ton app et enregistrer un flux utilisateur typique.

### Étape 4 : Rejouer et comparer
```bash
meticulous replay
```

Meticulous détectera automatiquement les régressions visuelles et fonctionnelles !

---

## 📝 Petit Recap

| Outil           | Besoin de Compte ? | Besoin de Clés API ? | Lien                              |
|-----------------|---------------------|----------------------|-----------------------------------|
| Checkly         | ✅ Oui (Gratuit)   | ✅ Oui (via CLI)     | https://checklyhq.com             |
| BrowserStack    | ✅ Oui (Free Trial)| ✅ Oui                | https://browserstack.com          |
| Meticulous.ai   | ✅ Oui (Beta)      | ✅ Oui                | https://meticulous.ai             |

---

## ⚡ Pro Tip : Commencer par Checkly

C'est le plus rapide à configurer, et ça te donnera immédiatement du monitoring continu sur ton app !

---

Bon courage, et si tu bloques, les documentations officielles sont super bien faites !
