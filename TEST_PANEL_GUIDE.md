# 🧪 TEST PANEL - GUIDE D'UTILISATION

## 📍 Accès

**URL:** http://localhost:3000/test-panel

**Accès réservé:** Uniquement les utilisateurs avec `role = 'founder'`

**Visible dans la sidebar:** Icône 🧪 Test Panel (uniquement pour founders)

---

## 🎯 À QUOI ÇA SERT ?

Le Test Panel permet de **simuler instantanément** tous les scénarios de l'application **sans attendre** :

- ✅ Pas besoin d'attendre qu'une opportunité avec un score élevé soit trouvée
- ✅ Pas besoin d'attendre 24h pour le résumé hebdomadaire
- ✅ Pas besoin d'attendre que les crédits soient faibles
- ✅ Test des emails sans spammer les vrais utilisateurs
- ✅ Test des notifications in-app en temps réel

---

## 🔧 FONCTIONNALITÉS DISPONIBLES

### 1. 📬 Notifications In-App

Ces boutons créent instantanément une notification dans votre barre de notifications (🔔 en haut à droite).

#### **🎯 Mission High Score**
- Simule une opportunité avec 95% de match
- Seulement 2 postulants
- Salaire: $8000/mois
- **Utilité:** Tester l'affichage des notifications urgentes

#### **🔥 Mission Urgente**
- Simule une mission avec 85% de match
- 1 seul postulant
- **Utilité:** Tester les notifications avec priorité "urgent"

#### **⚠️ Crédits Faibles**
- Simule une alerte "Il vous reste 12 crédits (20%)"
- **Utilité:** Tester l'alerte de recharge

#### **⏰ Expiration Abonnement**
- Simule "Votre plan PRO expire dans 3 jours"
- **Utilité:** Tester la notification de renouvellement

#### **🎉 Plan Activé**
- Simule "Votre plan PRO est maintenant actif"
- **Utilité:** Tester la notification de succès d'abonnement

#### **👀 Profil Vu**
- Simule "12 recruteurs ont vu votre profil cette semaine"
- **Utilité:** Tester les notifications de statistiques

---

### 2. 📧 Emails via Resend

**⚠️ Configuration requise:** Variable d'environnement `RESEND_API_KEY`

#### **📧 Email Bienvenue**
- Envoie l'email de bienvenue avec les prochaines étapes
- Inclut le cadeau de 10 crédits SCAI Voice
- **Utilité:** Tester l'onboarding par email

#### **📊 Résumé Hebdomadaire**
- Envoie le résumé hebdomadaire avec les stats simulées
- 47 missions, 8 high score, 3 candidatures, etc.
- **Utilité:** Tester l'email récurrent automatique

**Comment tester :**
1. Entre ton email dans le champ en haut
2. Clique sur le bouton
3. Vérifie ta boîte mail (ou les logs si Resend n'est pas configuré)

---

### 3. 🔍 Scan & Opportunités

#### **🔍 Scan Manuel (Simulé)**
- Simule un scan qui trouve 3 opportunités
- Crée une notification "Scan terminé - 3 opportunités trouvées"
- **Utilité:** Tester le flux de scan sans attendre

#### **💼 Créer 50 Opportunités Test**
- Insère 50 missions factices dans `cache_opportunities`
- Variété de catégories (tech, design, marketing)
- Salaires de $3000 à $8000
- **Utilité:** Remplir le cache pour tester le matching SCAI

---

## 💡 EXEMPLES D'UTILISATION

### Scénario 1 : Tester le flow complet d'une nouvelle opportunité

1. Clique sur **🎯 Mission High Score**
2. Vérifie que la notification apparaît en haut à droite
3. Clique sur la notification pour voir les détails
4. Vérifie que le badge de compteur fonctionne

### Scénario 2 : Tester les emails de communication

1. Entre ton email dans le champ
2. Clique sur **📧 Email Bienvenue**
3. Vérifie ta boîte mail (ou les logs console)
4. Vérifie le design et le contenu de l'email

### Scénario 3 : Remplir le cache pour tester le matching

1. Clique sur **💼 Créer 50 Opportunités Test**
2. Va sur la page `/opportunities`
3. Lance un scan manuel
4. Vérifie que SCAI match les opportunités selon ton profil

### Scénario 4 : Tester plusieurs types de notifications

1. Clique successivement sur 3-4 boutons de notifications
2. Vérifie que toutes apparaissent dans la barre
3. Vérifie le badge compteur
4. Clique sur chaque notification
5. Marque certaines comme lues

---

## 🔍 VÉRIFICATION DES RÉSULTATS

### Pour les notifications in-app :
1. Regarde la **cloche 🔔** en haut à droite
2. Le **badge rouge** doit afficher le nombre
3. Clique pour ouvrir le panneau
4. Les notifications doivent apparaître avec les bonnes icônes et textes

### Pour les emails :
1. **Si Resend est configuré :** Vérifie ta boîte mail
2. **Si Resend n'est pas configuré :** Vérifie les **logs console** du serveur
3. Le JSON de l'email s'affiche avec le contenu complet

### Pour le scan :
1. Une notification "Scan terminé" apparaît
2. Le résultat s'affiche dans la carte "Résultat"
3. Les logs console montrent les 3 opportunités simulées

### Pour les opportunités de test :
1. Va dans Supabase → Table `cache_opportunities`
2. Vérifie que 50 nouvelles entrées ont été créées
3. Filtre par `source_name = 'Test'`

---

## 🚨 NOTES IMPORTANTES

### Mode Test activé
Toutes les actions créées par le Test Panel ont un flag `test_mode: true` dans la metadata. Cela permet de les identifier et de les supprimer facilement.

### Nettoyage des données de test
Pour supprimer toutes les données de test :

```sql
-- Supprimer les notifications de test
DELETE FROM notifications WHERE metadata->>'test_mode' = 'true';

-- Supprimer les opportunités de test
DELETE FROM cache_opportunities WHERE source_name = 'Test';
```

### Sécurité
- Le Test Panel vérifie que l'utilisateur a `role = 'founder'`
- Si non autorisé, redirection vers `/dashboard`
- Les routes API `/api/test/*` devraient aussi vérifier le role (TODO)

### Configuration Resend.com
Pour activer l'envoi réel d'emails :

1. Crée un compte sur https://resend.com (gratuit 3000 emails/mois)
2. Obtiens ta clé API
3. Ajoute dans `.env` :
   ```
   RESEND_API_KEY=re_votre_cle_ici
   ```
4. Décommenter le code Resend dans les routes API

---

## 🐛 DEBUGGING

### Les notifications n'apparaissent pas ?
- Vérifie que tu es bien connecté
- Rafraîchis la page
- Ouvre la console pour voir les erreurs
- Vérifie Supabase → Table `notifications`

### Les emails ne s'envoient pas ?
- Vérifie que `RESEND_API_KEY` est défini
- Vérifie les logs console du serveur
- Le mode simulation affiche le JSON de l'email

### Le scan ne trouve rien ?
- C'est normal, c'est un scan simulé
- Les 3 opportunités sont dans les logs
- Une notification "Scan terminé" doit apparaître

### Les opportunités de test ne s'affichent pas ?
- Va sur `/opportunities`
- Lance un scan manuel (bouton "Scanner")
- Les opportunités test ont `source_name = 'Test'`

---

## 🎨 PERSONNALISATION

Tu peux facilement ajouter d'autres tests dans `src/views/TestPanel.tsx` :

1. Ajoute une nouvelle fonction `testXYZ`
2. Ajoute un bouton avec `<GoldButton onClick={testXYZ}>...</GoldButton>`
3. Crée la route API correspondante si nécessaire

Exemples d'idées :
- Simuler un paiement réussi
- Simuler une application refusée
- Simuler un entretien planifié
- Simuler SCAI qui initie une conversation

---

## 📊 STATISTIQUES

Toutes les actions sont loggées dans la console avec des emojis :
- 📧 = Email
- 🔍 = Scan
- 🔔 = Notification
- ✅ = Succès
- ❌ = Erreur

---

**Bon testing ! 🚀**

*Si tu trouves un bug, contacte le founder.*
