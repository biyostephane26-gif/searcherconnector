# ✅ CHECKLIST DE TEST - SEARCHER CONNECTOR

## 🎯 Tests essentiels avant déploiement

### 1. Tests de compilation ⚙️
- [ ] `npm run build` se termine sans erreur
- [ ] `npx tsc --noEmit` ne retourne aucune erreur TypeScript
- [ ] Aucun warning critique dans la console

### 2. Tests des pages principales 📄
- [ ] **/** - Page d'accueil charge correctement
- [ ] **/login** - Formulaire de connexion s'affiche
- [ ] **/dashboard** - Dashboard utilisateur accessible
- [ ] **/profile** - Page profil se charge
- [ ] **/opportunities** - Liste des opportunités visible
- [ ] **/pricing** - Page tarifs affichée
- [ ] **/about** - Page à propos fonctionne

### 3. Tests d'authentification 🔐
- [ ] Inscription nouveau compte Supabase
- [ ] Connexion avec email/mot de passe
- [ ] Déconnexion fonctionne
- [ ] Session persistante après refresh
- [ ] Redirection vers login si non authentifié

### 4. Tests du profil utilisateur 👤
- [ ] Modification des informations de base
- [ ] Upload d'avatar
- [ ] Ajout de liens professionnels (GitHub, LinkedIn, etc.)
- [ ] Modification des préférences de recherche
- [ ] Sauvegarde des changements

### 5. Tests de recherche d'opportunités 🔍
- [ ] Recherche basique par mots-clés
- [ ] Filtres par localisation
- [ ] Filtres par domaine/industrie
- [ ] Tri par pertinence/date
- [ ] Pagination fonctionne

### 6. Tests SCAI (IA vocale) 🎤
- [ ] Bouton microphone s'affiche
- [ ] Permission microphone demandée
- [ ] Enregistrement audio fonctionne
- [ ] Transcription audio → texte
- [ ] Réponse SCAI générée
- [ ] Synthèse vocale (TTS) lit la réponse

### 7. Tests des APIs 🔌
- [ ] `/api/search` - Recherche fonctionne
- [ ] `/api/ai` - Chat IA répond
- [ ] `/api/scai/tts` - Synthèse vocale
- [ ] `/api/transcribe` - Transcription audio
- [ ] `/api/profile/update` - MAJ profil
- [ ] `/api/stripe/checkout` - Paiement

### 8. Tests des abonnements 💳
- [ ] Affichage des plans (Free, Starter, Pro, Enterprise)
- [ ] Bouton "S'abonner" fonctionne
- [ ] Redirection vers Stripe Checkout
- [ ] Webhook Stripe traite paiement
- [ ] Mise à niveau compte après paiement
- [ ] Accès features premium débloqué

### 9. Tests des notifications 🔔
- [ ] Notifications système s'affichent
- [ ] Marquer comme lu fonctionne
- [ ] Suppression notification
- [ ] Badge compteur notifications

### 10. Tests de performance ⚡
- [ ] Page d'accueil charge en < 3 secondes
- [ ] Temps de réponse API < 2 secondes
- [ ] Images optimisées (WebP)
- [ ] Bundle JavaScript < 500KB
- [ ] Lighthouse score > 80

### 11. Tests responsive 📱
- [ ] Mobile (375px) - Interface adaptée
- [ ] Tablet (768px) - Layout correct
- [ ] Desktop (1920px) - Design optimal
- [ ] Menu burger fonctionne sur mobile

### 12. Tests de sécurité 🔒
- [ ] Headers de sécurité présents (CSP, HSTS, etc.)
- [ ] Protection CSRF activée
- [ ] Validation inputs côté serveur
- [ ] Pas de clés API exposées côté client
- [ ] Rate limiting sur APIs sensibles

### 13. Tests d'internationalisation 🌍
- [ ] Français (FR) - Traductions complètes
- [ ] Anglais (EN) - Traductions complètes
- [ ] Changement de langue fonctionne
- [ ] Langue sauvegardée dans préférences

### 14. Tests de monitoring 📊
- [ ] Logs serveur fonctionnels
- [ ] Erreurs trackées
- [ ] Métriques disponibles
- [ ] Alertes configurées

## 🚀 Script de test rapide

```powershell
# Lancer le serveur de dev
npm run dev

# Dans un autre terminal, exécuter les tests
.\test-app-health.ps1
```

## 📞 En cas de problème

**Si un test échoue:**
1. Vérifier les logs du serveur
2. Vérifier les variables d'environnement (.env)
3. Vérifier la connexion base de données (Supabase/MongoDB)
4. Vérifier les clés API (Groq, Gemini, OpenAI, etc.)
5. Consulter `RAPPORT_TEST_APPLICATION.md`

**Support:**
- Email: biyostephane26@gmail.com
- WhatsApp: +237 683655802

---

*Dernière mise à jour: 4 juillet 2026*
