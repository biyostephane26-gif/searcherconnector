# 🎯 COMMENT TESTER L'APPLICATION SEARCHER CONNECTOR

## 🚀 DÉMARRAGE RAPIDE

### Option 1 : Ligne de commande
```bash
# Dans le terminal
npm run dev

# Attendre "Ready in X.Xs"
# Puis ouvrir http://localhost:3000/test-panel
```

### Option 2 : Script automatique
```powershell
# Double-cliquer sur ce fichier :
open-test-panel.ps1

# Ou dans PowerShell :
.\open-test-panel.ps1
```

---

## 🧪 TEST PANEL - TON MEILLEUR AMI

### Qu'est-ce que c'est ?

Le **Test Panel** est un outil que j'ai créé spécialement pour toi. Il te permet de **simuler instantanément** tous les scénarios de l'application **sans attendre**.

### Pourquoi c'est génial ?

**Avant (sans Test Panel) :**
```
❌ Tu dois attendre qu'une vraie opportunité avec score élevé soit trouvée
❌ Tu dois attendre 24h pour voir l'email hebdomadaire
❌ Tu dois attendre que tes crédits baissent naturellement
❌ Tu dois créer des faux comptes pour tester
```

**Maintenant (avec Test Panel) :**
```
✅ Tu cliques sur un bouton → notification instantanée
✅ Tu veux tester un email ? → envoi immédiat
✅ Tu veux tester le matching ? → 50 opportunités créées en 1 clic
✅ Tu veux tester un scan ? → résultats en 2 secondes
```

---

## 📍 OÙ TROUVER LE TEST PANEL ?

### 1. Dans la sidebar
Quand tu es connecté en tant que founder, tu vois une nouvelle option :
```
🧪 Test Panel
```

Clique dessus et tu arrives directement sur le panel.

### 2. URL directe
```
http://localhost:3000/test-panel
```

**Important :** Tu dois être connecté avec un compte `role = 'founder'`

---

## 🎮 FONCTIONNALITÉS DISPONIBLES

### 1. 📬 NOTIFICATIONS IN-APP (6 types)

#### 🎯 Mission High Score
**Ce que ça fait :** Crée une notification "Mission parfaite pour vous — 95% match — 2 postulants"  
**Comment tester :**
1. Clique sur le bouton "🎯 Mission High Score"
2. Regarde en haut à droite → badge rouge sur la cloche 🔔
3. Clique sur la cloche → la notification s'affiche
4. ✅ Notification testée !

#### 🔥 Mission Urgente
**Ce que ça fait :** Notification urgente avec peu de postulants  
**Quand l'utiliser :** Tester les notifications prioritaires

#### ⚠️ Crédits Faibles
**Ce que ça fait :** Alerte "Il vous reste 12 crédits (20%)"  
**Quand l'utiliser :** Tester le système de recharge

#### ⏰ Expiration Abonnement
**Ce que ça fait :** "Votre plan PRO expire dans 3 jours"  
**Quand l'utiliser :** Tester les alertes de renouvellement

#### 🎉 Plan Activé
**Ce que ça fait :** "Votre plan PRO est maintenant actif"  
**Quand l'utiliser :** Tester la confirmation de paiement

#### 👀 Profil Vu
**Ce que ça fait :** "12 recruteurs ont vu votre profil"  
**Quand l'utiliser :** Tester les statistiques

---

### 2. 📧 EMAILS (2 types)

#### 📧 Email Bienvenue
**Ce que ça fait :** Envoie l'email de bienvenue avec les étapes  
**Comment tester :**
1. Entre ton email dans le champ (par défaut : biyostephane26@gmail.com)
2. Clique sur "📧 Email Bienvenue"
3. Vérifie ta boîte mail OU les logs console
4. ✅ Email testé !

**Contenu de l'email :**
- Message de bienvenue
- Prochaines étapes
- Cadeau de 10 crédits SCAI Voice

#### 📊 Résumé Hebdomadaire
**Ce que ça fait :** Email avec stats de la semaine  
**Contenu :**
- 47 missions trouvées
- 8 high score matches
- 3 candidatures envoyées
- 12 vues de profil

---

### 3. 🔍 SCAN & CACHE

#### 🔍 Scan Manuel (Simulé)
**Ce que ça fait :**
- Simule un scan qui trouve 3 opportunités
- Crée une notification "Scan terminé"
- Affiche les résultats dans la console

**Comment tester :**
1. Clique sur "🔍 Scan Manuel"
2. Une notification apparaît "3 opportunités trouvées"
3. Vérifie les logs console pour les détails
4. ✅ Scan testé !

#### 💼 Créer 50 Opportunités Test
**Ce que ça fait :**
- Insère 50 missions dans la base de données
- Variété : tech, design, marketing
- Salaires de $3000 à $8000
- Localisations variées

**Comment tester :**
1. Clique sur "💼 Créer 50 Opportunités Test"
2. Va sur `/opportunities`
3. Lance un scan manuel
4. SCAI match automatiquement selon ton profil
5. ✅ Cache rempli !

---

## 🎯 SCÉNARIOS DE TEST COMPLETS

### Scénario 1 : Tester le système de notifications complet

```
1. Va sur http://localhost:3000/test-panel
2. Clique sur "🎯 Mission High Score"
3. Clique sur "🔥 Mission Urgente"
4. Clique sur "⚠️ Crédits Faibles"
5. Regarde la cloche 🔔 → badge "3"
6. Clique sur la cloche → panneau avec les 3 notifications
7. Clique sur une notification → elle s'ouvre
8. Marque-la comme lue → le badge diminue
9. ✅ Système complet testé !
```

### Scénario 2 : Tester le matching SCAI

```
1. Va sur http://localhost:3000/test-panel
2. Clique sur "💼 Créer 50 Opportunités Test"
3. Attends le message "✅ 50 opportunités créées"
4. Va sur /opportunities
5. Clique sur "Scanner les opportunités"
6. SCAI analyse ton profil et match les opportunités
7. Les résultats s'affichent triés par score
8. ✅ Matching testé !
```

### Scénario 3 : Tester les emails

```
1. Va sur http://localhost:3000/test-panel
2. Entre ton email dans le champ
3. Clique sur "📧 Email Bienvenue"
4. Vérifie ta boîte mail (ou console si Resend non configuré)
5. Clique sur "📊 Résumé Hebdomadaire"
6. Vérifie le deuxième email
7. ✅ Emails testés !
```

### Scénario 4 : Tester une journée type d'utilisateur

```
1. Crée 50 opportunités de test
2. Lance un scan manuel
3. Reçois une notification "Scan terminé"
4. Clique sur "🎯 Mission High Score"
5. Va voir les opportunités
6. Applique à une mission
7. ✅ Flux complet testé !
```

---

## 🔍 VÉRIFIER LES RÉSULTATS

### Notifications in-app
- **Où regarder :** Cloche 🔔 en haut à droite
- **Badge rouge :** Nombre de notifications non lues
- **Panneau :** Cliquer sur la cloche
- **Base de données :** Table `notifications` dans Supabase

### Emails
- **Mode simulation :** Logs console du serveur
- **Mode réel :** Ta boîte mail (si Resend configuré)
- **Preview :** Le JSON s'affiche dans le résultat

### Scan & Cache
- **Notification :** "Scan terminé - X opportunités"
- **Console :** Liste des opportunités trouvées
- **Base de données :** Table `cache_opportunities`

---

## ⚙️ CONFIGURATION OPTIONNELLE

### Pour l'envoi réel d'emails (Resend.com)

1. **Crée un compte Resend.com** (gratuit, 3000 emails/mois)
   ```
   https://resend.com/signup
   ```

2. **Obtiens ta clé API**
   ```
   Tableau de bord → API Keys → Create API Key
   ```

3. **Ajoute dans `.env`**
   ```
   RESEND_API_KEY=re_votre_cle_ici
   ```

4. **Redémarre le serveur**
   ```
   npm run dev
   ```

5. **✅ Les emails sont maintenant envoyés pour de vrai !**

---

## 🐛 RÉSOLUTION DE PROBLÈMES

### Le Test Panel n'apparaît pas dans la sidebar

**Problème :** Tu ne vois pas l'option "🧪 Test Panel"

**Solution :**
1. Vérifie que tu es connecté
2. Vérifie dans Supabase : Table `users_profiles` → Ton compte → `role = 'founder'`
3. Rafraîchis la page (F5)

### Les notifications ne s'affichent pas

**Problème :** Tu cliques mais rien ne se passe

**Solution :**
1. Ouvre la console (F12)
2. Regarde les erreurs en rouge
3. Vérifie que tu es connecté
4. Vérifie Supabase → Table `notifications`

### Les emails ne s'envoient pas

**Problème :** Aucun email reçu

**Solution :**
- **C'est normal !** Par défaut, les emails sont simulés
- Vérifie les **logs console** du serveur (le JSON de l'email s'affiche)
- Pour l'envoi réel, configure Resend (voir section Configuration)

### Le serveur ne démarre pas

**Problème :** Erreur au lancement de `npm run dev`

**Solution :**
```bash
# 1. Arrêter tous les processus Node
taskkill /F /IM node.exe

# 2. Nettoyer le cache
rm -rf .next
rm -rf node_modules

# 3. Réinstaller
npm install

# 4. Relancer
npm run dev
```

---

## 📚 DOCUMENTATION COMPLÈTE

- **`TEST_PANEL_RESUME.md`** : Résumé rapide (ce fichier)
- **`TEST_PANEL_GUIDE.md`** : Guide complet avec tous les détails
- **`RAPPORT_TEST_APPLICATION.md`** : Rapport de tests complet

---

## 🎉 C'EST PARTI !

### Étape 1 : Lance le serveur
```bash
npm run dev
```

### Étape 2 : Ouvre le Test Panel
```
http://localhost:3000/test-panel
```

### Étape 3 : Teste tout !
- Clique sur tous les boutons
- Vérifie que les notifications apparaissent
- Teste les emails
- Remplis le cache
- Lance des scans

### Étape 4 : Vérifie les résultats
- Notifications dans la cloche 🔔
- Emails dans ta boîte (ou console)
- Opportunités dans la page `/opportunities`

---

## 💬 BESOIN D'AIDE ?

Si tu rencontres un problème :

1. **Vérifie les logs console** (F12)
2. **Consulte la documentation** (`TEST_PANEL_GUIDE.md`)
3. **Contacte le founder** (toi 😄)

---

## 🚀 PROCHAINES ÉTAPES

Une fois que tu as testé le Test Panel :

1. **Configure Resend** pour l'envoi réel d'emails
2. **Crée un compte test utilisateur** pour tester le flux complet
3. **Teste l'onboarding** avec un nouveau compte
4. **Teste les paiements** en mode test Stripe
5. **Teste SCAI Voice** avec les crédits

---

**Tout est prêt ! Lance le serveur et amuse-toi à tester ! 🎊**

*Ce système de test va te faire gagner des HEURES de développement !*
