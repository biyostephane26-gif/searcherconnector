=================================================================
SEARCHER CONNECTOR — PATCH MODE GRATUIT OPTIMISÉ
Objectif : Résultats concrets en 7 jours avec 2 scans/jour
=================================================================
DONNE CES INSTRUCTIONS À TRAE EXACTEMENT
=================================================================

=================================================================
CONTEXTE IMPORTANT POUR TRAE
=================================================================

Le mode gratuit de Searcher Connector doit produire des résultats
réels en 7 jours maximum avec seulement 2 scans par jour.

Les 4 profils et leurs objectifs en 7 jours :
- Job Seeker    → Au moins 3 entretiens planifiés
- Freelance     → Au moins 1 mission décrochée
- Business      → Au moins 10 leads clients chauds
- Investor      → Au moins 2 projets sérieux identifiés

Features autorisées en mode gratuit :
✅ 2 scans globaux par jour (00h01 et 12h01 UTC)
✅ 10 messages SCAI par jour
✅ Dashboard basique avec métriques
✅ Alertes push pour score > 80
✅ Profil + upload documents
✅ Comparateur salaires (3 recherches/jour)

Features BLOQUÉES en mode gratuit :
❌ Connector (le Cowork de Searcher)
❌ Opportunity Creator
❌ VC Tracking Orange Merchant
❌ Candidature autonome illimitée (max 3/jour)
❌ Réponse email automatique
❌ Surveillance continue 24h/24
❌ Réseau social (lecture seule)

=================================================================
PATCH 1 — ONBOARDING FORCÉ AVANT PREMIER SCAN
=================================================================

Modifie src/pages/Onboarding.tsx pour ajouter ce système :

RÈGLE ABSOLUE : Searcher refuse de lancer le premier scan
si le score de complétude du profil est inférieur à 75%.

Calcul du score de complétude (total 100 points) :
- Nom complet renseigné          : 5 pts
- Domaine d'expertise précis     : 15 pts
- Pays + ville                   : 10 pts
- Langues parlées                : 5 pts
- Fourchette salariale/tarifaire : 10 pts
- Bio professionnelle (50+ mots) : 10 pts
- Au moins 1 document uploadé    : 20 pts
- Au moins 1 lien professionnel  : 15 pts
- Type de poste/mission ciblé    : 10 pts

Si score < 75 → afficher un bloc d'avertissement rouge :
"⚠️ SCAI ne peut pas optimiser ta recherche avec ce profil.
 Complète ton profil à 75% minimum pour activer le scan.
 Plus ton profil est complet, plus tes chances de trouver
 en 1 semaine sont élevées. Actuellement : XX/100"

Afficher une liste des éléments manquants avec liens directs
vers les champs à remplir.

Si score >= 75 → bouton vert "Activer Searcher — 2 scans/jour"
Quand l'utilisateur clique :
1. Enregistrer onboarding_completed_at dans users_profiles
2. Programmer le premier scan pour dans 5 minutes
3. Afficher message SCAI d'accueil

=================================================================
PATCH 2 — SCAI QUESTIONS INTELLIGENTES PAR PROFIL
=================================================================

Lors de l'onboarding, après les infos de base, SCAI pose
des questions spécifiques selon le profil pour affiner la recherche.

Crée src/components/onboarding/SCAIQuestions.tsx

QUESTIONS POUR JOB SEEKER (10 questions, choix multiple + texte) :

Q1 : Type de contrat recherché ?
[CDI] [CDD] [Remote uniquement] [Hybride] [Je prends tout]

Q2 : Disponibilité ?
[Immédiatement] [Dans 1 mois] [Dans 3 mois]

Q3 : Tu préfères postuler dans quelle zone géographique ?
[Mon pays uniquement] [Afrique] [Europe] [Amérique] [Partout]

Q4 : Niveau d'expérience ?
[Débutant 0-2 ans] [Intermédiaire 2-5 ans] [Senior 5-10 ans] [Expert 10+]

Q5 : Tes 3 compétences principales ? (texte libre)
→ SCAI extrait les mots-clés pour les requêtes Serper

Q6 : Quel secteur cibles-tu en priorité ?
[Tech] [Finance] [Marketing] [Santé] [Education] [Autre]

Q7 : Tu as déjà travaillé pour une entreprise internationale ?
[Oui] [Non mais je veux] [Non et je veux local]

Q8 : Ton salaire actuel (si en poste) ?
→ Input numérique → aide à calibrer les offres

Q9 : Ce que tu ne veux ABSOLUMENT PAS dans un emploi ?
(texte libre) → SCAI filtre ces critères dans les résultats

Q10 : As-tu un passeport valide ?
[Oui valide] [Oui expiré] [Non]
→ Si Non → ne pas montrer d'offres à l'étranger

---

QUESTIONS POUR FREELANCE :

Q1 : Ton tarif journalier ou horaire moyen ?
→ Input + devise → SCAI filtre les missions sous ce tarif

Q2 : Durée minimum de mission acceptable ?
[1 semaine] [1 mois] [3 mois] [6 mois] [Pas de minimum]

Q3 : Remote uniquement ou tu acceptes du présentiel ?
[Remote only] [Hybride OK] [Présentiel si près de chez moi]

Q4 : Tu as une spécialité dans ton domaine ?
(texte libre) → améliore la précision des requêtes Serper

Q5 : Plateformes où tu es déjà inscrit ?
[Upwork] [Fiverr] [Malt] [Toptal] [Aucune] [Autre]
→ SCAI priorise les autres plateformes pour diversifier

Q6 : Tu as un portfolio ou des références clients ?
[Oui avec lien] [Oui sans lien] [Non]
→ Si Non → SCAI suggère de créer un Behance avant le scan

Q7 : Secteurs à éviter absolument ?
(texte libre) → SCAI filtre ces secteurs

Q8 : Langue de travail préférée ?
[Français] [Anglais] [Les deux] [Autre]

---

QUESTIONS POUR BUSINESS OWNER :

Q1 : Ton produit ou service en une phrase ?
(texte libre — obligatoire)

Q2 : Ton client idéal c'est ?
[Particuliers] [PME] [Grandes entreprises] [Startups] [ONG/Gouvernements]

Q3 : Budget typique de tes clients ?
[< 500$] [500$-2000$] [2000$-10000$] [> 10000$]

Q4 : Zone géographique cible ?
[Local ville] [National] [Afrique] [International]

Q5 : Tu cherches des clients pour quoi exactement ?
[Premier client] [Plus de volume] [Clients premium] [Nouveau marché]

Q6 : Comment tu livres ton service ?
[En ligne] [Sur place] [Les deux]

Q7 : Ton plus grand obstacle pour trouver des clients ?
[Visibilité] [Confiance/crédibilité] [Prix] [Réseau] [Autre]

Q8 : Ton business est certifié/enregistré légalement ?
[Oui] [Non]
→ Si Non → SCAI averti que la vérification sera limitée

---

QUESTIONS POUR INVESTOR :

Q1 : Secteurs qui t'intéressent le plus ?
Multi-select : [Tech] [Fintech] [Agri] [Santé] [Education] [Energie] [Autre]

Q2 : Zone géographique cible ?
[Afrique uniquement] [Afrique + Diaspora] [Mondial]

Q3 : Ticket d'investissement habituel ?
[< 10K$] [10K-50K$] [50K-200K$] [200K-1M$] [> 1M$]

Q4 : Stade de projet préféré ?
[Idée] [MVP] [Premiers revenus] [Croissance] [Rentable]

Q5 : Type de retour attendu ?
[Equity] [Revenue share] [Prêt convertible] [Dividendes] [Flexible]

Q6 : Tu as déjà investi avant ?
[Oui plusieurs fois] [Oui une fois] [Non premier investissement]

Q7 : Délai de retour sur investissement acceptable ?
[1-2 ans] [3-5 ans] [5-10 ans] [Peu importe]

=================================================================
PATCH 3 — ALGORITHME DE SCAN OPTIMISÉ POUR 2/JOUR
=================================================================

Crée src/lib/scanOptimizer.ts

Ce module transforme les 2 scans quotidiens en maximum d'impact.

SCAN 1 — 00h01 UTC (nuit africaine = matin européen/américain)
Logique : les offres publiées la nuit en Afrique sont fraîches
en Europe et Amérique le matin. On est les premiers.

Requêtes Serper construites dynamiquement selon le profil :

Pour JOB SEEKER :
const queries_scan1 = [
  // Requête principale ultra-ciblée
  `"${domain}" "${top_skill_1}" job remote ${salary_range} 2026`,
  
  // Requête fraîcheur (dernières 24h)
  `${domain} hiring ${country} "posted today" OR "24 hours ago"`,
  
  // Requête spécialité dans les job boards africains
  `${domain} job Jobberman OR Brighter Monday OR Africawork 2026`,
  
  // Requête entreprises internationales qui recrutent en Afrique
  `${domain} "${city}" OR "${country}" international company hiring`,
  
  // Requête LinkedIn visible sans compte
  `site:linkedin.com/jobs ${domain} ${country} ${experience_level}`,
]

Pour FREELANCE :
const queries_scan1 = [
  // Mission fraîche sur toutes les plateformes
  `${domain} freelance mission "${hourly_rate}" remote posted:today`,
  
  // Upwork urgent (besoins immédiats = meilleur taux)
  `site:upwork.com ${domain} "${top_skill_1}" urgent remote`,
  
  // Malt missions francophones
  `site:malt.fr ${domain} ${specialty} freelance`,
  
  // RemoteOK et Wellfound
  `site:remoteok.com OR site:wellfound.com ${domain} freelance`,
  
  // Groupes Facebook et Telegram publics
  `"cherche freelance" "${domain}" "${country}" 2026`,
]

Pour BUSINESS :
const queries_scan1 = [
  // Clients qui cherchent exactement ce service
  `"looking for" "${service_type}" "${target_client}" contact 2026`,
  
  // Appels d'offres publics
  `appel offre "${service_type}" "${target_zone}" 2026`,
  
  // Signaux d'intention d'achat sur Reddit/forums
  `site:reddit.com "${service_type}" "need help" "${sector}"`,
  
  // LinkedIn posts entreprises qui cherchent ce service
  `site:linkedin.com "${service_type}" looking vendor partner 2026`,
  
  // Groupes et forums spécialisés
  `"${service_type}" "devis" OR "quote" "${target_zone}" 2026`,
]

Pour INVESTOR :
const queries_scan1 = [
  // Startups en levée de fonds dans le secteur
  `"raising" "${investment_sector}" "${stage}" Africa 2026`,
  
  // AngelList et Crunchbase
  `site:angellist.com "${investment_sector}" ${target_zone} fundraising`,
  
  // Pitch decks et deals publics
  `"seeking investment" "${investment_sector}" "${ticket_range}" 2026`,
  
  // Events et dealflow
  `${investment_sector} startup pitch "${target_zone}" 2026 apply`,
  
  // Founders actifs sur Twitter/X
  `"fundraising" "${investment_sector}" "${target_zone}" founders 2026`,
]

SCAN 2 — 12h01 UTC (midi africaine = nouvelles offres de la journée)
Logique : harveste les offres publiées ce matin en Europe/Afrique.
Utilise des requêtes différentes du Scan 1 pour zéro doublon.

Ajoute cette logique dans l'algorithme :
- Comparer les URLs des résultats du Scan 2 avec ceux du Scan 1
- Si doublon → ignorer
- Ne garder que les nouvelles opportunités

SCORING SCAI SUR LES RÉSULTATS :

Envoie les résultats bruts à Gemini avec ce prompt :

```
Tu es SCAI, l'IA de Searcher Connector.
Analyse ces ${results.length} résultats pour cet utilisateur.

Profil utilisateur :
- Nom : ${profile.full_name}
- Domaine : ${profile.domain}
- Compétences : ${profile.skills}
- Pays : ${profile.country}
- Salaire cible : ${profile.salary_min}-${profile.salary_max} ${profile.currency}
- Type recherché : ${profile.seeking}
- Réponses onboarding : ${JSON.stringify(profile.onboarding_answers)}

Résultats bruts du scan :
${JSON.stringify(results)}

Pour chaque résultat pertinent :
1. Score /100 (pertinence + fraîcheur + accessibilité)
2. Raison du score en 1 phrase
3. Est-ce une vraie opportunité ou du contenu générique ?
4. Estimation de concurrence (peu/moyen/forte)
5. Action recommandée (postuler maintenant / surveiller / ignorer)
6. URL directe si disponible

Filtre : ne retourne QUE les opportunités avec score >= 65.
Maximum 8 résultats.

Format JSON :
{
  "opportunities": [
    {
      "title": "",
      "company_or_source": "",
      "score": 0,
      "match_reason": "",
      "is_real_opportunity": true,
      "competition_level": "low|medium|high",
      "recommended_action": "apply_now|monitor|ignore",
      "original_url": "",
      "estimated_salary_or_rate": "",
      "location": "",
      "freshness": "today|this_week|older",
      "is_foreign": false,
      "urgency": "high|normal|low"
    }
  ],
  "scan_summary": "phrase résumant ce scan",
  "best_opportunity": "titre de la meilleure opportunité"
}
```

=================================================================
PATCH 4 — ALERTES PUSH INTELLIGENTES
=================================================================

Crée src/lib/alertSystem.ts

RÈGLE 1 — Alerte immédiate si score >= 85 :
Dès qu'une opportunité dépasse 85/100, notification push
MÊME SI l'utilisateur n'est pas sur l'app.

Utilise Supabase Realtime pour pousser la notification.

Format de la notification push :
Titre : "🔥 Searcher a trouvé une opportunité à 92/100"
Corps : "[Titre du poste] chez [Entreprise] — Publiée il y a 2h
         Seulement 3 candidats. Agis maintenant."
Action : Ouvre directement le panneau de l'opportunité

RÈGLE 2 — Alerte diversification :
Si l'utilisateur a postulé à 1 seule opportunité :
"⚡ SCAI : Ne mise jamais sur une seule opportunité.
 Searcher a trouvé 3 autres pistes solides pour toi.
 Voir maintenant →"

RÈGLE 3 — Alerte 30 minutes :
Pour chaque opportunité en statut "pending_action" depuis 30min :
"⏰ [Entreprise] attend peut-être ta candidature.
 L'opportunité a été publiée il y a 3h.
 Chaque heure réduit tes chances. Agis →"
Répète toutes les 30 minutes jusqu'à action.

RÈGLE 4 — Alerte matin (6h heure locale) :
Résumé quotidien SCAI :
"☀️ Bonjour [Prénom]. Voici ton rapport SCAI de cette nuit :
 • X nouvelles opportunités trouvées
 • Meilleure : [titre] à [score]/100
 • Scan du jour à midi : encore X opportunités à venir
 Ouvre Searcher pour agir →"

RÈGLE 5 — Alerte urgente offre étrangère :
Si opportunité étrangère score >= 80 :
"🌍 Opportunité internationale détectée !
 [Titre] — [Pays]
 Salaire estimé : [X]
 ⚠️ Passeport requis — As-tu vérifié ta validité ?
 Voir la checklist complète →"

=================================================================
PATCH 5 — LIMITATION MODE GRATUIT (FEATURE GATES)
=================================================================

Crée src/lib/freemodeGates.ts

Ce fichier gère toutes les limitations du mode gratuit.

```typescript
import { supabase } from './supabase'

export async function checkFreeModeLimit(
  userId: string,
  feature: 'scan' | 'chat' | 'apply' | 'salary_search'
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  
  const today = new Date().toISOString().split('T')[0]
  
  const limits = {
    scan: 2,
    chat: 10,
    apply: 3,
    salary_search: 3,
  }
  
  // Compter les usages du jour
  const { count } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', `${today}T00:00:00`)
  
  const used = count || 0
  const limit = limits[feature]
  const remaining = Math.max(0, limit - used)
  const allowed = remaining > 0
  
  // Heure de reset (minuit UTC)
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  
  return {
    allowed,
    remaining,
    resetAt: tomorrow.toISOString()
  }
}

export function FreeModeBlocker({ feature, onUpgrade }: {
  feature: string
  onUpgrade: () => void
}) {
  // Composant React qui s'affiche quand la limite est atteinte
  const messages = {
    scan: "Tu as utilisé tes 2 scans d'aujourd'hui.",
    chat: "Tu as utilisé tes 10 messages SCAI d'aujourd'hui.",
    apply: "Tu as postulé 3 fois aujourd'hui (limite gratuit).",
    salary_search: "3 recherches salaires utilisées aujourd'hui.",
  }
  
  return (
    <div className="bg-[#1A1500] border border-[#D4AF37] rounded-xl p-6 text-center">
      <div className="text-[#D4AF37] text-2xl mb-3">⚡</div>
      <h3 className="text-white font-bold mb-2">
        {messages[feature] || "Limite atteinte"}
      </h3>
      <p className="text-[#888] text-sm mb-4">
        Reviens demain ou passe au plan Premium pour un accès illimité.
      </p>
      
      {/* Compte à rebours jusqu'au reset */}
      <CountdownToMidnight />
      
      <button
        onClick={onUpgrade}
        className="mt-4 w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg hover:bg-[#F5E6A3]"
      >
        Passer au Premium — Résultats illimités
      </button>
      
      <p className="text-[#555] text-xs mt-3">
        Les utilisateurs Premium trouvent en moyenne 4x plus vite.
      </p>
    </div>
  )
}
```

Crée aussi la table usage_logs dans Supabase :
```sql
create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  feature text not null,
  metadata jsonb default '{}',
  created_at timestamp default now()
);

alter table usage_logs enable row level security;
create policy "manage_own_logs" on usage_logs
  for all using (auth.uid() = user_id);

-- Index pour les requêtes fréquentes
create index idx_usage_logs_user_date 
  on usage_logs(user_id, feature, created_at);
```

=================================================================
PATCH 6 — DASHBOARD 7 JOURS (TRACKER DE PROGRESSION)
=================================================================

Ajoute dans src/pages/Dashboard.tsx une section :
"Ta progression cette semaine"

Affiche un tracker 7 jours adapté au profil :

Pour JOB SEEKER :
Jour 1-2 : Profil complété + premiers scans → objectif 5+ offres
Jour 3-4 : Candidatures envoyées → objectif 3+ postulées
Jour 5-6 : Réponses reçues → objectif 1+ réponse
Jour 7   : Entretien planifié → objectif 1+ entretien confirmé

Pour FREELANCE :
Jour 1-2 : Profil optimisé + scans → objectif 8+ missions
Jour 3-4 : Premières candidatures missions → objectif 3+ soumises
Jour 5-6 : Réponses et négociations → objectif 1+ intérêt confirmé
Jour 7   : Mission décrochée → objectif 1 contrat

Pour BUSINESS :
Jour 1-2 : Scans prospects → objectif 20+ leads identifiés
Jour 3-4 : Leads contactés → objectif 10+ contactés
Jour 5-6 : Intérêts reçus → objectif 3+ réponses positives
Jour 7   : Leads chauds → objectif 10+ leads qualifiés

Pour INVESTOR :
Jour 1-2 : Scans projets → objectif 15+ projets identifiés
Jour 3-4 : Projets analysés → objectif 5+ analysés par SCAI
Jour 5-6 : Contacts fondateurs → objectif 3+ contactés
Jour 7   : Projets sérieux → objectif 2+ en discussion

Affichage :
Barre de progression dorée pour chaque objectif
Étape complétée → checkmark doré
Étape en cours → pulsing gold dot
Étape future → gris

Message SCAI adaptatif selon la progression :
Si à J3 l'utilisateur n'a pas postulé :
"⚡ SCAI : Tu es à mi-parcours mais tu n'as encore rien soumis.
 Je t'ai trouvé X opportunités. Agis maintenant ou tu perdras
 l'avantage de la fraîcheur. Je peux postuler pour toi →"

=================================================================
PATCH 7 — SCAI EN MODE GRATUIT (10 MESSAGES/JOUR OPTIMISÉS)
=================================================================

En mode gratuit, les 10 messages SCAI doivent être ultra-utiles.
SCAI sait qu'elle est en mode gratuit et adapte ses réponses.

Modifie le system prompt de SCAI selon le plan :

Ajout au system prompt quand plan = 'free' :
```
CONTEXTE MODE GRATUIT :
Cet utilisateur est en plan gratuit. Il a 2 scans/jour et 10 messages.
Chaque message doit avoir une valeur maximale.
Tu ne réponds jamais de manière générique — toujours actionnable.
Tu guides l'utilisateur vers des actions concrètes qui maximisent
ses chances dans les 7 prochains jours.
Tu mentionnes le plan Premium uniquement si c'est vraiment pertinent
— pas à chaque message. Maximum 1 mention par conversation.
```

Messages que SCAI priorise en mode gratuit :
1. Analyse du profil + recommendations d'amélioration
2. Explication des résultats de scan
3. Aide à la rédaction du message de candidature
4. Préparation entretien si réponse reçue
5. Stratégie de recherche personnalisée

=================================================================
VÉRIFICATION FINALE MODE GRATUIT
=================================================================

L'app mode gratuit est prête quand :
✅ Onboarding bloqué si profil < 75%
✅ SCAI pose les bonnes questions par profil
✅ 2 scans/jour automatiques à 00h01 et 12h01 UTC
✅ Requêtes Serper ultra-ciblées par profil
✅ Gemini score et filtre les résultats
✅ Alertes push instantanées si score >= 85
✅ Alertes répétées toutes les 30min pour pending_action
✅ Tracker 7 jours visible dans le dashboard
✅ Feature gates bloquent après limite atteinte
✅ Message SCAI adapté quand limite atteinte
✅ Compte à rebours jusqu'au reset affiché
✅ Un utilisateur sérieux peut trouver en 7 jours

=================================================================
FIN PATCH MODE GRATUIT
=================================================================
