=================================================================
SEARCHER CONNECTOR — PATCH MODE PREMIUM COMPLET
Plans : Talent ($29) | Business ($99) | Investor ($299)
=================================================================
DONNE CES INSTRUCTIONS À TRAE EXACTEMENT
=================================================================

=================================================================
CE QUE LE PREMIUM DÉBLOQUE (vs Mode Gratuit)
=================================================================

PLAN TALENT ($29/mois) — Pour Job Seekers et Freelances :
✅ Scans illimités (toutes les 4 heures automatiquement)
✅ Messages SCAI illimités
✅ Candidatures autonomes illimitées
✅ Réponse email automatique 24/7
✅ WhatsApp management
✅ Surveillance continue même après embauche
✅ Réseau social complet (poster + interagir)
✅ Comparateur salaires illimité
✅ Recommandations vérifiées (donner + recevoir)
✅ Publications articles professionnels
✅ Profil public partageable
✅ Préparation entretien complète
✅ Tracker entretiens avec alertes
✅ Export profil PDF
✅ Parrainage actif (gagner des mois gratuits)
✅ Connexion comptes OAuth (LinkedIn, Gmail, Drive)
✅ Analytics candidatures détaillées

PLAN BUSINESS ($99/mois) — Pour Business Owners :
Tout le plan Talent +
✅ Connector (le Cowork de Searcher)
✅ Opportunity Creator
✅ Client Finder illimité
✅ Visual Business Audit
✅ Hidden Talents access
✅ Smart Connector complet
✅ Startup database worldwide
✅ B2B ultra-ciblé
✅ Contrats légaux automatiques (V2)
✅ OAuth Facebook + Instagram

PLAN INVESTOR ($299/mois) — Pour Investors :
Tout le plan Business +
✅ VC Tracking Orange Merchant complet
✅ Investment Summit Finder
✅ Fundraising history complet
✅ Project pipeline illimité
✅ Genius profiles priority access
✅ Levée de fonds guidée par SCAI
✅ Due diligence rapide automatique
✅ Crunchbase + AngelList + PitchBook data
✅ Rapport hebdomadaire investissement
✅ OAuth Twitter/X pour VC Tracking

=================================================================
PATCH 1 — SCANS ILLIMITÉS AUTOMATIQUES (toutes les 4h)
=================================================================

Crée src/lib/premiumScanner.ts

Pour les utilisateurs premium, Searcher scanne en continu.
Le scheduler tourne via Supabase Edge Functions + pg_cron.

```sql
-- Scheduler premium dans Supabase
select cron.schedule(
  'premium-scan-4h',
  '0 */4 * * *',
  $$
  select
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/agent-premium-scan',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('trigger', 'cron_4h')
    )
  $$
);
```

LOGIQUE DE SCAN PREMIUM toutes les 4 heures :

06h00 UTC → Scan matinal (offres fraîches Europe/Afrique)
10h00 UTC → Scan mid-morning (offres US nighttime publiées)
14h00 UTC → Scan après-midi (nouvelles offres asiatiques)
18h00 UTC → Scan soir (offres urgentes fin de journée Europe)
22h00 UTC → Scan nuit (nouvelles offres US East Coast)
02h00 UTC → Scan nuit profonde (offres Asie-Pacifique)

À chaque scan : 8 requêtes Serper différentes (vs 5 en gratuit)
Requêtes supplémentaires premium :
- Viadeo (France/Afrique francophones)
- Xing (Allemagne/Europe centrale)
- Stack Overflow Jobs (tech uniquement)
- HackerNews Who's Hiring (startups tech)
- ProductHunt Jobs (startups innovantes)
- GitHub Jobs (développeurs)
- Behance Jobs (créatifs/designers)
- Dribbble Jobs (designers)

Ajoute aussi le scan via OAuth LinkedIn si connecté :
Si le compte LinkedIn est connecté via OAuth :
→ Utilise l'API LinkedIn Jobs officielle
→ Accède aux offres CACHÉES réservées aux membres connectés
→ Postule directement depuis le compte LinkedIn de l'utilisateur
→ Score boost automatique : offres LinkedIn via OAuth ont +15 points

=================================================================
PATCH 2 — CANDIDATURE AUTONOME ILLIMITÉE AVEC SCAI
=================================================================

En mode premium, Searcher postule automatiquement sans limite.

RÈGLE D'OR PREMIUM :
Score >= 80 ET profil match >= 75% → Searcher postule AUTOMATIQUEMENT
Score 65-79 → Searcher demande validation d'abord
Score < 65 → Searcher n'envoie pas

Pour chaque candidature autonome, SCAI génère :

1. CV ADAPTÉ DYNAMIQUEMENT :
Gemini reçoit le CV original + la fiche de poste et génère
une version adaptée qui met en avant exactement ce que
le recruteur cherche. Sauvegardé dans Supabase Storage.

Prompt Gemini pour l'adaptation CV :
```
Tu es SCAI, expert en candidatures professionnelles.
Adapte ce CV pour cette offre spécifique.

CV original : [contenu du CV]
Offre d'emploi : [titre + description]
Entreprise : [nom + secteur]

Règles :
- Réorganise les compétences pour mettre en avant celles demandées
- Adapte le résumé professionnel pour coller à l'offre
- Garde tout le contenu réel — ne jamais inventer des expériences
- Maximum 1 page pour les profils < 5 ans d'expérience
- Format clean et lisible

Réponds avec le CV adapté en markdown, prêt à être converti en PDF.
```

2. MESSAGE DE CANDIDATURE PERSONNALISÉ :
```
Tu es SCAI. Génère un message de candidature percutant.

Profil : [nom, domaine, expérience]
Offre : [titre, entreprise, description]
Template style utilisateur : [response_template]

Le message doit :
- Commencer par une accroche qui montre que tu connais l'entreprise
- Mentionner 2-3 points précis de l'offre
- Lier les compétences de l'utilisateur aux besoins de l'entreprise
- Finir par "Je ne postule pas — je rejoins votre équipe"
- Maximum 150 mots
- Ton : professionnel mais humain
- Signature : [nom] via Searcher Connector — searcherconnector.com

Langue : même langue que l'offre d'emploi.
```

3. CONFIRMATION AUTOMATIQUE À L'UTILISATEUR :
Notification push après chaque candidature envoyée :
"✅ SCAI vient de postuler pour toi :
 [Titre] chez [Entreprise]
 CV adapté ✓ | Message personnalisé ✓ | Envoyé à [heure]
 Signature incluse : 'via Searcher Connector'
 Je surveille la réponse et te préviens dès qu'elle arrive."

=================================================================
PATCH 3 — RÉPONSE EMAIL AUTOMATIQUE 24/7
=================================================================

Crée supabase/functions/agent-email-reply/index.ts (Premium only)

FLUX COMPLET :

Étape 1 — Réception email recruteur
L'utilisateur connecte Gmail via OAuth.
Un webhook Gmail envoie une notification à Supabase
quand un nouvel email arrive d'un domaine professionnel.

Étape 2 — Analyse SCAI
```
Tu es SCAI. Analyse cet email d'un recruteur.

Email reçu : [contenu]
Expéditeur : [email]
Contexte : [titre du poste pour lequel on a postulé]

Détermine :
1. Type d'email : "invitation_entretien" | "demande_info" | 
   "refus" | "autre"
2. Urgence : "haute" | "normale" | "basse"
3. Action requise : ce qu'il faut répondre
4. Sentiment : "positif" | "neutre" | "négatif"
5. Confidence Score pour répondre automatiquement (0-100)

JSON uniquement.
```

Étape 3 — Décision basée sur le Confidence Score :
Score >= 95 → Réponse automatique immédiate (pendant le sommeil ✅)
Score 70-94 → Brouillon généré + notification utilisateur
Score < 70  → Alerte utilisateur + conseils SCAI

Étape 4 — Génération réponse
```
Tu es SCAI. Génère la réponse parfaite à cet email.

Type : [type_email]
Style utilisateur : [response_template]
Nom utilisateur : [full_name]
Email recruteur : [email_content]
Contexte poste : [job_title] chez [company]

Règles :
- Répondre dans la même langue que l'email reçu
- Ton professionnel et chaleureux
- Si invitation entretien : confirmer la disponibilité
  et proposer 3 créneaux dans les 48h
- Si demande info : répondre précisément et brièvement
- Jamais promettre ce que l'utilisateur ne peut pas tenir
- Finir par "Envoyé via Searcher Connector — searcherconnector.com"
- Maximum 120 mots
```

Étape 5 — Log complet dans searcher_logs
```typescript
await supabase.from('searcher_logs').insert({
  user_id,
  action_type: 'email_auto_reply',
  description: `Réponse automatique envoyée à ${sender} pour ${job_title}`,
  platform: 'Gmail',
  result: 'sent',
  auto_promo_sent: true
})
```

=================================================================
PATCH 4 — CONNECTOR (LE COWORK DE SEARCHER) — Plan Business+
=================================================================

Crée src/pages/Connector.tsx

Le Connector est la feature qui dépasse tout ce que fait Cowork.
C'est le pont entre les utilisateurs Searcher et le monde.

DESCRIPTION :
Connector permet à Searcher d'agir sur les comptes connectés
de l'utilisateur pour créer des opportunités là où elles n'existent pas.

INTERFACE :
Tab 1 — Mes Connexions OAuth :

Cards pour chaque service disponible :
┌─────────────────────────────────────┐
│  [LinkedIn Logo] LinkedIn           │
│  Status : ✅ Connecté               │
│  Dernière action : Il y a 2h        │
│  Actions autorisées :               │
│  • Postuler aux offres              │
│  • Envoyer des messages connexion   │
│  • Voir profils avancés             │
│  [Déconnecter]                      │
└─────────────────────────────────────┘

Services disponibles pour connexion OAuth :
- LinkedIn (emploi + réseau)
- Gmail (emails recruteurs)
- Google Drive (stockage CV)
- Twitter/X (visibilité investisseurs)
- Facebook (groupes business)
- Instagram (personal branding)
- WhatsApp Business (messages)
- GitHub (profil développeur)
- Notion (workspace personnel)

Chaque OAuth suit ce flow :
1. Utilisateur clique "Connecter [Service]"
2. Popup OAuth officiel de la plateforme
3. Utilisateur accepte les permissions
4. Token chiffré (AES-256) stocké dans Supabase
5. SCAI peut maintenant agir dans ce compte

Tab 2 — Actions Connector :

SCAI montre ce qu'elle peut faire maintenant avec les comptes connectés.
Liste d'actions disponibles avec toggle on/off :

✅ Postuler aux offres LinkedIn directement (si score >= 80)
✅ Envoyer des demandes de connexion aux recruteurs ciblés
✅ Liker/Commenter posts d'entreprises cibles (visibilité)
✅ Répondre emails Gmail automatiquement (score >= 95)
✅ Sauvegarder CV adapté dans Google Drive
✅ Poster contenu de visibilité sur Twitter/X (Business+ Investor)
✅ Rejoindre groupes Facebook emploi/business pertinents

Chaque action a un Confidence Score minimum configurable.
L'utilisateur peut ajuster de 70 à 99.

Tab 3 — Historique Connector :

Timeline de toutes les actions faites par SCAI via Connector.
Avec possibilité d'annuler les 5 dernières actions.

=================================================================
PATCH 5 — OPPORTUNITY CREATOR — Plan Business+
=================================================================

Crée src/pages/OpportunityCreator.tsx

DESCRIPTION :
Opportunity Creator permet à Searcher de CRÉER des opportunités
là où elles n'existent pas encore.

Au lieu d'attendre qu'une offre soit publiée,
Searcher va démarcher des entreprises qui ont besoin de toi.

FLOW POUR JOB SEEKER / FREELANCE :
1. SCAI analyse le profil et identifie les entreprises cibles
2. Serper trouve les entreprises dans le secteur + zone cible
3. Gemini analyse leur présence en ligne (site + réseaux)
4. SCAI génère un email de démarchage proactif personnalisé
5. Email envoyé via Gmail OAuth au bon contact

Prompt de génération email proactif :
```
Tu es SCAI. Génère un email de candidature proactive.
L'entreprise n'a pas publié d'offre — on crée l'opportunité.

Profil : [nom, domaine, top skills, années exp]
Entreprise cible : [nom, secteur, taille estimée, pays]
Analyse de l'entreprise : [résumé de la présence en ligne]
Besoin identifié : [ce que SCAI a détecté comme besoin]

L'email doit :
- Montrer qu'on a analysé l'entreprise spécifiquement
- Identifier un problème réel que le candidat peut résoudre
- Proposer une valeur concrète (pas juste "je cherche du travail")
- Rester court : 120 mots maximum
- Inclure un call to action simple : "15 min d'appel cette semaine ?"
- Finir : "Proposition envoyée via Searcher Connector"
```

FLOW POUR BUSINESS :
1. SCAI identifie des entreprises qui achètent ce type de service
2. Audit visuel rapide de chaque cible
3. Génère un email de prospection avec une valeur immédiate
4. Envoi via Gmail OAuth ou sauvegardé pour envoi manuel

Affichage dans l'interface :
"Searcher a identifié 12 entreprises qui pourraient avoir besoin de toi.
 SCAI a préparé 12 emails personnalisés.
 Confidence Score moyen : 78/100
 Veux-tu les envoyer tous ? [Envoyer les 12] [Voir et choisir]"

=================================================================
PATCH 6 — VC TRACKING ORANGE MERCHANT — Plan Investor
=================================================================

Crée src/pages/VCTracker.tsx

DESCRIPTION :
Le marchand d'oranges digital. Searcher place ton projet
exactement là où les investisseurs cibles passent naturellement.

SETUP D'UNE CAMPAGNE :
Étape 1 — Décrire le projet
- Nom du projet
- Secteur et sous-secteur
- Stade (MVP / revenus / croissance)
- Montant cherché + utilisation des fonds
- Rendement estimé pour l'investisseur
- Traction actuelle (utilisateurs, revenus, croissance)
- Pitch en 3 phrases

Étape 2 — Calibration automatique SCAI
```
Analyse ce projet et détermine son niveau de calibre.

Projet : [description]
Traction : [métriques]
Montant cherché : [X$]

Niveaux :
LOCAL : < 50K$, impact local, investisseurs de proximité
RÉGIONAL : 50K-500K$, impact continental, business angels
MONDIAL : > 500K$, impact global, VCs institutionnels, Genius

Retourne : niveau, reasoning, types d'investisseurs recommandés,
plateformes cibles, angle de pitch optimal.
```

Étape 3 — Sélection des cibles VC
SCAI présente une liste de 10-20 investisseurs depuis Crunchbase/AngelList
correspondant au niveau et secteur du projet.

Pour chaque VC :
- Nom + firm
- Portfolio similaire (preuve d'intérêt dans le secteur)
- Ticket habituel
- Plateformes actives (Twitter/X, LinkedIn, Reddit)
- Fréquence de posts
- Sujets d'intérêt détectés
- Score de compatibilité avec le projet /100

Étape 4 — Création de la campagne Orange Merchant
Pour chaque VC sélectionné :
SCAI crée du contenu adapté à chaque plateforme où le VC passe :

LinkedIn : Post professionnel sur le projet
Twitter/X : Thread de 3 tweets sur la traction + vision
Reddit : Post dans le subreddit pertinent
Newsletter : Article guest post identifié
Forum spécialisé : Discussion naturelle avec mention du projet

RÈGLE DU MARCHAND D'ORANGES :
- Jamais de démarchage direct ("Investissez dans mon projet")
- Toujours du contenu de valeur qui mentionne naturellement le projet
- Répétition intelligente : VC voit le projet 3-5 fois en 2 semaines
- Sur des plateformes différentes à chaque fois
- Le VC découvre toujours "naturellement"

Étape 5 — Suivi de campagne
Dashboard montrant :
- Nombre de fois où le projet a été visible estimé
- Plateformes où il a été placé
- VC qui ont cliqué (si tracking disponible)
- VC qui ont visité le profil Searcher
- Alertes : "[VC Name] vient de visiter ton projet 3 fois cette semaine"

=================================================================
PATCH 7 — SCAI PREMIUM (ILLIMITÉE ET MAXIMALE)
=================================================================

En mode Premium, SCAI n'a plus de restrictions de messages.
Elle adapte son system prompt au plan :

Plan Talent :
```
CONTEXTE PLAN TALENT :
Cet utilisateur a accès illimité. Agis comme un coach de carrière
senior qui a placé des centaines de professionnels africains
dans des postes mondiaux. Sois proactif — propose des actions
sans attendre qu'on te demande. Quand tu n'es pas sollicité,
lance des scans, envoie des candidatures, surveille les réponses.
```

Plan Business :
```
CONTEXTE PLAN BUSINESS :
Cet utilisateur veut des clients. Pense comme un directeur
commercial qui travaille 24/7. Prospecte, audite les cibles,
prépare les emails de démarchage, analyse les concurrents.
Chaque opportunité que tu rates est un client chez le concurrent.
```

Plan Investor :
```
CONTEXTE PLAN INVESTOR :
Cet utilisateur déploie du capital. Analyse comme un analyste
de fonds top-tier. Filtre brutalement — sur 100 projets tu
en gardes 2. Quand un projet passe ton filtre, dis-le clairement
avec le reasoning complet. Surveille le dealflow en continu.
```

=================================================================
PATCH 8 — ANALYTICS PREMIUM
=================================================================

Crée src/pages/Analytics.tsx (Premium uniquement)

SECTION 1 — Performance des candidatures (Job Seeker/Freelance) :

Métriques affichées :
- Taux de réponse global (candidatures → réponses)
- Taux par plateforme : LinkedIn 23% | Indeed 11% | Upwork 34%
- Meilleure heure d'envoi (basée sur les données réelles de l'utilisateur)
- Score moyen des opportunités visées
- Évolution du score de profil dans le temps
- Temps moyen entre candidature et réponse

Graphique recharts (fond noir, barres/lignes dorées) :
- Candidatures envoyées par jour (7 derniers jours)
- Réponses reçues par semaine
- Score moyen des opportunités par source

SCAI insight automatique hebdomadaire :
"📊 Cette semaine : tu réponds 3x mieux le mardi matin avant 9h.
 J'ai ajusté mes horaires d'envoi pour les prochaines candidatures."

SECTION 2 — Analytics investisseur :

- Projets analysés ce mois
- Score moyen des projets vus
- Campagnes Orange Merchant actives
- VCs contactés (indirectement)
- Taux de retour sur demandes d'info

=================================================================
PATCH 9 — STRIPE INTEGRATION COMPLÈTE
=================================================================

Crée src/lib/stripe.ts

```typescript
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

export const PLANS = {
  talent: {
    name: 'Plan Talent',
    price: 29,
    currency: 'USD',
    priceId: 'price_talent_monthly',
    features: [
      'Scans toutes les 4 heures',
      'Messages SCAI illimités',
      'Candidatures autonomes illimitées',
      'Réponse email automatique 24/7',
      'Réseau social complet',
      'Connexion comptes OAuth',
      'Analytics candidatures',
      'Préparation entretiens',
    ]
  },
  business: {
    name: 'Plan Business',
    price: 99,
    currency: 'USD',
    priceId: 'price_business_monthly',
    features: [
      'Tout le plan Talent',
      'Connector (Cowork de Searcher)',
      'Opportunity Creator',
      'Client Finder illimité',
      'Visual Business Audit',
      'Hidden Talents access',
      'Smart Connector complet',
    ]
  },
  investor: {
    name: 'Plan Investor',
    price: 299,
    currency: 'USD',
    priceId: 'price_investor_monthly',
    features: [
      'Tout le plan Business',
      'VC Tracking Orange Merchant',
      'Investment Summit Finder',
      'Fundraising history complet',
      'Due diligence automatique',
      'Rapport hebdomadaire deal flow',
    ]
  }
}

export async function createCheckoutSession(
  plan: 'talent' | 'business' | 'investor',
  userId: string,
  userEmail: string
) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: PLANS[plan].priceId,
      userId,
      userEmail,
      successUrl: `${window.location.origin}/dashboard?upgraded=true`,
      cancelUrl: `${window.location.origin}/pricing`,
      trialDays: 7,
    })
  })
  
  const { sessionId } = await response.json()
  const stripe = await stripePromise
  await stripe?.redirectToCheckout({ sessionId })
}
```

Webhook Stripe (Supabase Edge Function) :
```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()
  
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch { return new Response('Invalid signature', { status: 400 }) }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession
    const userId = session.metadata?.userId
    
    // Activer le plan immédiatement
    await supabase.from('users_profiles').update({
      plan: session.metadata?.plan,
      verification_status: 'verified',
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }).eq('id', userId)
    
    // Log
    await supabase.from('subscriptions').insert({
      user_id: userId,
      stripe_subscription_id: session.subscription,
      plan: session.metadata?.plan,
      status: 'active',
    })
    
    // Email de bienvenue
    // (Supabase email trigger)
  }
  
  if (event.type === 'customer.subscription.deleted') {
    // Downgrade vers free
    const subscription = event.data.object as Stripe.Subscription
    await supabase.from('users_profiles')
      .update({ plan: 'free' })
      .eq('stripe_subscription_id', subscription.id)
  }
  
  return new Response('OK', { status: 200 })
})
```

=================================================================
PATCH 10 — PRICING PAGE COMPLÈTE
=================================================================

Modifie src/pages/Pricing.tsx

Vérifier FREE_MODE depuis app_settings :

Si FREE_MODE = 'true' :
Bannière dorée en haut :
"🎉 Beta ouverte — Toutes les fonctionnalités sont gratuites pendant la beta.
 Profites-en avant le lancement officiel."
Masquer les prix. Afficher boutons "Accéder gratuitement".

Si FREE_MODE = 'false' :

Afficher 4 plans :

FREE (toujours disponible) :
Gratuit pour toujours
2 scans/jour | 10 messages SCAI | Alertes basiques
→ Bouton "Commencer gratuitement"

TALENT $29/mois (badge "Le plus populaire") :
Essai gratuit 7 jours
→ Bouton "Démarrer l'essai gratuit" → Stripe Checkout

BUSINESS $99/mois :
Essai gratuit 7 jours
→ Bouton "Démarrer l'essai gratuit" → Stripe Checkout

INVESTOR $299/mois (badge "Pour les décideurs") :
Essai gratuit 7 jours
→ Bouton "Démarrer l'essai gratuit" → Stripe Checkout

Sous les plans, section "Garantie" :
"Pas convaincu ? Remboursement intégral dans les 14 premiers jours.
 Aucune question posée."

Section ROI calculateur :
"En plan Talent à 29$/mois :
 1 mission freelance moyenne = 500$-2000$
 Retour sur investissement : 17x à 69x le coût du plan"

=================================================================
COMPARAISON FREE vs PREMIUM
=================================================================

Crée une table comparative dans Pricing.tsx :

Feature                    | Gratuit | Talent | Business | Investor
---------------------------|---------|--------|----------|----------
Scans                      | 2/jour  | ∞      | ∞        | ∞
Messages SCAI              | 10/jour | ∞      | ∞        | ∞
Candidatures auto          | 3/jour  | ∞      | ∞        | ∞
Email automatique          | ❌      | ✅     | ✅       | ✅
OAuth comptes              | ❌      | ✅     | ✅       | ✅
Réseau social              | Lecture | Complet| Complet  | Complet
Connector                  | ❌      | ❌     | ✅       | ✅
Opportunity Creator        | ❌      | ❌     | ✅       | ✅
Client Finder              | ❌      | ❌     | ✅       | ✅
VC Tracking Orange Merchant| ❌      | ❌     | ❌       | ✅
Investment Summit Finder   | ❌      | ❌     | ❌       | ✅
Analytics détaillées       | ❌      | ✅     | ✅       | ✅
Export profil PDF          | ❌      | ✅     | ✅       | ✅
Préparation entretiens     | ❌      | ✅     | ✅       | ✅

=================================================================
VÉRIFICATION FINALE MODE PREMIUM
=================================================================

L'app mode premium est prête quand :
✅ Scans toutes les 4 heures automatiques via pg_cron
✅ 8 requêtes Serper différentes par scan (vs 5 en gratuit)
✅ OAuth LinkedIn + Gmail opérationnels
✅ Candidature autonome illimitée avec CV adapté par Gemini
✅ Email automatique 24/7 avec Confidence Score
✅ Connector page avec toggle pour chaque action
✅ Opportunity Creator génère et envoie des prospectons
✅ VC Tracking Orange Merchant avec campagnes actives
✅ Analytics avec graphiques recharts noir/or
✅ Stripe Checkout avec essai 7 jours
✅ Webhook Stripe active le plan instantanément
✅ Downgrade automatique si abonnement annulé
✅ SCAI illimitée avec contexte adapté au plan
✅ FREE_MODE toggle fonctionne (fondateur contrôle)
✅ Table comparative FREE vs PREMIUM visible dans Pricing

=================================================================
FIN PATCH MODE PREMIUM
=================================================================
