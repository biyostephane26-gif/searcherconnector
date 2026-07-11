# 🧪 TEST PANEL - README

## TL;DR (Version ultra-courte)

**Problème résolu :** Tu voulais tester les notifications et emails sans attendre des heures.

**Solution :** J'ai créé un **Test Panel** qui simule instantanément tous les scénarios.

**Accès :** http://localhost:3000/test-panel (founders only)

---

## ⚡ DÉMARRAGE EN 30 SECONDES

```bash
# 1. Lance le serveur
npm run dev

# 2. Ouvre dans ton navigateur
http://localhost:3000/test-panel

# 3. Clique sur n'importe quel bouton
# → Notification instantanée dans la cloche 🔔
```

---

## 🎯 CE QUE TU PEUX TESTER

### Notifications (6 types)
- 🎯 Mission High Score (95% match)
- 🔥 Mission Urgente
- ⚠️ Crédits Faibles
- ⏰ Expiration Abonnement
- 🎉 Plan Activé
- 👀 Profil Vu

### Emails (2 types)
- 📧 Email Bienvenue
- 📊 Résumé Hebdomadaire

### Scan & Cache
- 🔍 Scan Manuel (trouve 3 opportunités)
- 💼 Créer 50 Opportunités Test

---

## 📁 FICHIERS CRÉÉS

| Fichier | Description |
|---------|-------------|
| `src/views/TestPanel.tsx` | Interface principale ⭐ |
| `app/test-panel/page.tsx` | Page Next.js |
| `app/api/test/send-welcome-email/route.ts` | API email bienvenue |
| `app/api/test/send-weekly-email/route.ts` | API email hebdo |
| `app/api/test/manual-scan/route.ts` | API scan manuel |
| `TEST_PANEL_GUIDE.md` | Guide complet 📖 |
| `COMMENT_TESTER_LAPPLICATION.md` | Tutorial complet |
| `open-test-panel.ps1` | Script PowerShell |

---

## 💡 EXEMPLE D'UTILISATION

### Test rapide des notifications
```
1. Va sur /test-panel
2. Clique sur "🎯 Mission High Score"
3. Regarde la cloche 🔔 en haut
4. Badge rouge → "1"
5. Clique sur la cloche
6. ✅ Notification affichée !
```

### Remplir le cache pour tester
```
1. Clique sur "💼 Créer 50 Opportunités Test"
2. Va sur /opportunities
3. Lance un scan
4. ✅ 50 missions disponibles !
```

---

## 🔐 SÉCURITÉ

- ✅ Accès réservé aux founders (`role = 'founder'`)
- ✅ Toutes les données ont `test_mode: true`
- ✅ Facile à nettoyer :

```sql
DELETE FROM notifications WHERE metadata->>'test_mode' = 'true';
DELETE FROM cache_opportunities WHERE source_name = 'Test';
```

---

## 📚 DOCUMENTATION

- **Lecture rapide :** `TEST_PANEL_RESUME.md`
- **Guide complet :** `TEST_PANEL_GUIDE.md`
- **Tutorial :** `COMMENT_TESTER_LAPPLICATION.md`

---

## 🎉 RÉSULTAT

**Avant :**
```
❌ Attendre des heures pour tester
❌ Créer des faux comptes
❌ Manipuler la base de données manuellement
```

**Maintenant :**
```
✅ Clic → notification instantanée
✅ Clic → email envoyé
✅ Clic → 50 opportunités créées
✅ Gain de temps ÉNORME
```

---

**C'est tout ! Lance `npm run dev` et teste ! 🚀**
