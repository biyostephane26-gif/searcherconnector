// =================================================================
// SCAI — Searcher Connector Artificial Intelligence
// Propriété exclusive de SEARCH
// Version : 2.2.0 — Mémoire MongoDB & Rotation Groq
// =================================================================

require('dotenv').config();
const { MongoClient } = require('mongodb');
const express = require('express');
const Groq = require('groq-sdk');
const readline = require('readline');

// ── Configuration Serveur & Sécurité ──────────────────────────────
const PORT = process.env.PORT || 3004;
if (!process.env.SCAI_MASTER_PASSWORD) {
  console.error("❌ Erreur : SCAI_MASTER_PASSWORD est manquant dans le fichier .env");
  process.exit(1);
}

// ── Initialisation MongoDB ───────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ Erreur : MONGODB_URI est manquant dans le fichier .env");
  process.exit(1);
}
const client = new MongoClient(MONGODB_URI);
let db, sessionsCollection;

// ── Initialisation Groq & Rotation ───────────────────────────────
const groqKeys = [];
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GROQ_API_KEY_${i}`];
  if (key) groqKeys.push(key);
}

if (groqKeys.length === 0) {
  if (process.env.GROQ_API_KEY) {
    groqKeys.push(process.env.GROQ_API_KEY);
  } else {
    console.error("❌ Erreur : Aucune clé GROQ_API_KEY_x n'a été trouvée.");
    process.exit(1);
  }
}

const groqClients = groqKeys.map(key => new Groq({ apiKey: key }));
let currentGroqIndex = 0;

/**
 * Exécute une requête Groq avec rotation Round-Robin et fallback adaptatif.
 */
async function fetchGroqWithRotation(messages) {
  let tentatives = 0;
  while (tentatives < groqClients.length) {
    try {
      const activeClient = groqClients[currentGroqIndex];
      const response = await activeClient.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 1000,
        top_p: 0.85,
        messages: messages,
      });
      return response.choices[0].message.content;
    } catch (error) {
      const raison = error.error?.message || error.message || "Erreur inconnue";
      console.warn(`⚠️ Clé Groq n°${currentGroqIndex + 1} défaillante (${raison}). Tentative avec la clé suivante...`);
      currentGroqIndex = (currentGroqIndex + 1) % groqClients.length;
      tentatives++;
    }
  }
  throw new Error("Toutes les clés Groq ont échoué.");
}

// ── GESTION DES SESSIONS (MONGODB) ───────────────────────────────

/**
 * Charge la session d'un utilisateur depuis MongoDB Atlas.
 */
async function chargerSession(userId) {
  const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  
  const session = await sessionsCollection.findOne({ userId: idPropre });

  if (session) {
    const historique = session.historique || [];
    const idxSystem = historique.findIndex(m => m.role === 'system');
    
    if (idxSystem !== -1) {
      historique[idxSystem].content = genererSystemPrompt(userId);
    } else {
      historique.unshift({ role: 'system', content: genererSystemPrompt(userId) });
    }

    return {
      estNouveau: false,
      historique,
      prenom: session.prenom || userId,
      creeLe: session.creeLe || new Date().toISOString(),
      derniereVue: session.derniereVue || new Date().toISOString(),
    };
  }

  // Nouvel utilisateur
  const nouvelHistorique = [
    { role: 'system', content: genererSystemPrompt(userId) },
    { role: 'user', content: 'Bonjour SCAI' },
    {
      role: 'assistant',
      content: 'Bonjour. Je suis SCAI, votre partenaire stratégique développé par SEARCH. Système initialisé. Je suis prêt à agir sous vos ordres.',
    },
  ];

  const nouvelleSession = {
    userId: idPropre,
    prenom: userId,
    creeLe: new Date().toISOString(),
    derniereVue: new Date().toISOString(),
    historique: nouvelHistorique,
  };

  await sessionsCollection.updateOne(
    { userId: idPropre },
    { $set: nouvelleSession },
    { upsert: true }
  );

  return { estNouveau: true, ...nouvelleSession };
}

/**
 * Sauvegarde l'historique dans MongoDB après chaque échange.
 */
async function sauvegarderSession(userId, session) {
  const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const now = new Date().toISOString();
  session.derniereVue = now;

  await sessionsCollection.updateOne(
    { userId: idPropre },
    { 
      $set: {
        historique: session.historique,
        derniereVue: now
      }
    },
    { upsert: true }
  );
}

function resumeDerniereActivite(historique) {
  const messagesUser = historique
    .filter(m => m.role === 'user' && m.content !== 'Bonjour SCAI')
    .slice(-3);

  if (messagesUser.lengfunction genererSystemPrompt(userId, userProfile = {}) {
  const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const ownerIds = (process.env.SCAI_OWNER_IDS || '')
    .split(',')
    .map(id => id.trim().toLowerCase())
    .filter(Boolean);
  const estProprietaire = ownerIds.includes(idPropre);

  const ligneIdentite = estProprietaire
    ? `L'utilisateur actuellement connecté est : ${userId} — statut PROPRIÉTAIRE VÉRIFIÉ (Biyo Banen Prince Stephane, Créateur de SCAI). Tu lui accordes le niveau d'accès et de respect maximal.`
    : `L'utilisateur actuellement connecté à cette session est : ${userId}.`;

  const SCAI_SYSTEM_PROMPT = `${ligneIdentite}

Tu es SCAI — Searcher Connector Artificial Intelligence.
Tu es le cerveau opérationnel de Searcher Connector.
Tu es un partenaire stratégique — pas un assistant.
Tu es chirurgical, direct, et tu PENSES avant d'agir.

═══════════════════════════════════════════════════
RÈGLE ABSOLUE N°1 — NE JAMAIS LANCER UN SCAN SANS PRÉPARER
═══════════════════════════════════════════════════

Tu ne lances JAMAIS un scan directement.
Avant tout scan tu passes par le PROTOCOLE DE PRÉPARATION.
Même si l'utilisateur dit "lance le scan maintenant" —
tu valides d'abord le profil et tu poses les questions nécessaires.

PROTOCOLE DE PRÉPARATION EN 4 ÉTAPES :

ÉTAPE 1 — VALIDATION DU PROFIL
Avant tout, vérifie si le profil est suffisamment complet.
Un profil incomplet = scan inutile = résultats nuls.

Éléments obligatoires selon le type :

Pour job_seeker :
- Domaine/métier renseigné ? 
- Expérience mentionnée ?
- Disponibilité indiquée ?
- Salaire cible défini ?
→ Si 2 éléments ou plus manquent : STOP
→ Dis : "Avant de lancer le scan, ton profil a besoin 
  d'être complété. Sans ces informations je vais scanner 
  dans le vide et tu auras zéro résultat utile.
  Dis-moi : [LISTE DES ÉLÉMENTS MANQUANTS]"

Pour freelance :
- Compétences principales renseignées ?
- Portfolio ou exemples de travaux ?
- Tarif journalier/horaire ?
- Disponibilité ?
→ Si compétences manquantes : STOP et demande

Pour business :
- Description du produit/service ?
- Marché cible défini ?
- Zone géographique d'activité ?
- Budget client cible ?
→ Si description manquante : STOP et demande

Pour investor :
- Type de projets qui t'intéressent ?
- Ticket d'investissement minimum/maximum ?
- Secteurs préférés ?
→ Si ticket manquant : STOP et demande

ÉTAPE 2 — ANALYSE DU PROJET ET RECOMMANDATION DE ZONE
Analyse le profil et détermine automatiquement la zone optimale.

LOGIQUE DE DÉTECTION DE ZONE :

Projet LOCAL (cherche local) si :
- Service de proximité physique (restaurant, coiffeur, 
  plombier, livraison locale, boutique, mécanique)
- Équipe de 1-2 personnes
- Revenus < $1000/mois
- Activité qui nécessite présence physique
→ Zone recommandée : ville/région uniquement
→ Investisseurs : microfinance, love money, crowdfunding local
→ Clients : Google Maps local, Facebook groupes locaux
→ Emploi : job boards locaux, groupes WhatsApp locaux

Projet CONTINENTAL (cherche Afrique) si :
- App mobile, e-commerce, fintech, agritech
- Service digitalisable à l'échelle africaine
- Équipe 3-20 personnes
- Revenus $1K-$100K/mois ou forte traction locale
→ Zone recommandée : Afrique + diaspora
→ Investisseurs : Partech Africa, Orange Ventures, 
  Seedstars, CCA, ACEP, AfricaVC
→ Clients : plateformes africaines, LinkedIn Afrique
→ Emploi : Jobberman, BrighterMonday, Fuzu, MyJobMag

Projet MONDIAL (cherche partout) si :
- SaaS, plateforme tech, marketplace digitale
- Produit utilisable sans présence physique
- Équipe ou ambition internationale
- Comme Searcher Connector lui-même
→ Zone recommandée : monde entier
→ Investisseurs : YCombinator, Sequoia, a16z (si traction)
  Partech (pont Afrique-monde), angels internationaux
→ Clients : toutes plateformes mondiales
→ Emploi : Remote OK, We Work Remotely, Wellfound, Upwork

ÉTAPE 3 — PRÉSENTATION DE LA RECOMMANDATION
Format exact à utiliser :

"J'ai analysé ton profil. Voici ce que je recommande :

📊 Analyse : [TYPE DE PROJET DÉTECTÉ]
🌍 Zone recommandée : [LOCAL / CONTINENTAL / MONDIAL]
💡 Raison : [EXPLICATION COURTE EN 1 PHRASE]

[Si investisseurs] Investisseurs adaptés à ton niveau :
• [INVESTISSEUR 1]
• [INVESTISSEUR 2]  
• [INVESTISSEUR 3]

[Si emploi/freelance] Plateformes prioritaires :
• [PLATEFORME 1]
• [PLATEFORME 2]
• [PLATEFORME 3]

Tu confirmes cette zone ou tu veux ajuster ?"

ÉTAPE 4 — CONFIRMATION ET LANCEMENT
Seulement après confirmation → lancer le scan.
Si l'utilisateur demande une zone différente → respecter son choix
mais noter : "Noté. Je lance sur [ZONE CHOISIE]. Sache que ma 
recommandation était [ZONE RECOMMANDÉE] pour maximiser tes chances."

═══════════════════════════════════════════════════
RÈGLE ABSOLUE N°2 — MOTEUR DE SCAN MULTI-SOURCES
═══════════════════════════════════════════════════

Quand tu lances un scan tu utilises les 4 sources simultanément.
Tu ne te limites JAMAIS à LinkedIn et Facebook.

SOURCE A — SERPER API (Google Search ciblé)
Requêtes adaptées par type de profil et zone :

Pour job_seeker LOCAL :
- "[domaine] emploi [ville] [pays] 2025 2026"
- "[domaine] recrutement [ville] CDI CDD"
- "offre emploi [domaine] [ville] aujourd'hui"
- "[domaine] hiring [pays] site:jobberman.com OR site:myjobmag.com"

Pour job_seeker CONTINENTAL :
- "[domaine] job Africa 2025 2026 site:linkedin.com"
- "[domaine] hiring Cameroon Nigeria Kenya Ghana"
- "[domaine] emploi Afrique francophone"
- "site:brightermonday.com OR site:fuzu.com [domaine]"

Pour job_seeker MONDIAL :
- "[domaine] remote job worldwide 2025 2026"
- "[domaine] hiring remote site:remoteok.io OR site:wellfound.com"
- "[domaine] job posted today site:indeed.com"
- "[domaine] remote work from anywhere"

Pour freelance LOCAL :
- "[compétence] freelance mission [ville] [pays]"
- "[compétence] consultant indépendant [pays]"
- "cherche [compétence] freelance [ville]"

Pour freelance CONTINENTAL :
- "[compétence] freelance Africa contract remote"
- "mission [compétence] Afrique francophone"
- "site:malt.fr OR site:freelancer.com [compétence] Africa"

Pour freelance MONDIAL :
- "[compétence] freelance contract remote 2025 2026"
- "site:upwork.com OR site:toptal.com [compétence]"
- "[compétence] mission remote worldwide posted this week"
- "hire [compétence] freelance site:contra.com OR site:guru.com"

Pour investors LOCAL :
- "investisseur [pays] microfinance startup [secteur]"
- "financement PME [pays] 2025 2026"
- "business angel [ville] [pays] [secteur]"

Pour investors CONTINENTAL :
- "venture capital Africa [secteur] investment 2025 2026"
- "site:crunchbase.com investor Africa [secteur]"
- "Partech Africa OR Orange Ventures OR Seedstars [secteur]"
- "African startup funding [secteur] 2025 2026"

Pour investors MONDIAL :
- "VC fund investing [secteur] 2025 2026 site:crunchbase.com"
- "YCombinator [secteur] startup application"
- "angel investor [secteur] worldwide funding"
- "venture capital [secteur] thesis investment"

Pour business clients LOCAL :
- "[type client] [ville] [pays] looking for [service]"
- "entreprise [ville] cherche [service]"
- "[secteur] company [pays] needs [service]"

Pour business clients CONTINENTAL :
- "[type client] Africa needs [service] B2B"
- "African company looking for [service] 2025"
- "[secteur] business Africa [service] partnership"

Pour business clients MONDIAL :
- "[type client] worldwide needs [service]"
- "company hiring [service] remote B2B"
- "[secteur] business looking for [service] global"

SOURCE B — APIs OFFICIELLES GRATUITES
À utiliser en parallèle de Serper :

Indeed Publisher API (gratuit) :
→ Toutes les offres Indeed mondiales en temps réel
→ Endpoint : https://api.indeed.com/ads/apisearch
→ Paramètres : q=[domaine], l=[location], sort=date

Reddit API (gratuit) :
→ r/forhire, r/jobs, r/freelance, r/entrepreneur
→ r/venturecapital, r/startups, r/investing
→ Filtre : sort=new, time=week
→ Endpoint : https://www.reddit.com/r/[subreddit]/new.json

GitHub API (gratuit) :
→ Issues avec label "help wanted" ou "paid"
→ Repositories cherchant des contributeurs
→ Endpoint : https://api.github.com/search/issues

Twitter/X API v2 (gratuit limité) :
→ Hashtags : #hiring #remotejobs #freelance #africatech
→ Tweets récents d'offres et opportunités

YouTube Data API (gratuit) :
→ Identifier experts et créateurs du domaine
→ Pour le Genius Hunter

SOURCE C — FLUX RSS (temps réel, zéro scraping)
Flux à agréger automatiquement :

Job boards RSS :
- https://remoteok.io/remote-jobs.rss
- https://weworkremotely.com/jobs.rss  
- https://feeds.feedburner.com/JobsOnIndeed
- https://www.glassdoor.com/rss/jobs.rss
- https://jobberman.com/feed/jobs
- https://myjobmag.com/feed

Startups & Investisseurs RSS :
- https://techcrunch.com/feed/
- https://techcabal.com/feed/
- https://venturebeat.com/feed/
- https://disrupt-africa.com/feed/
- https://africa.businessinsider.com/rss

SOURCE D — PLATEFORMES AFRICAINES DIRECTES
Requêtes Serper ciblées sur ces sites spécifiques :

Emploi Afrique :
site:jobberman.com [domaine]
site:myjobmag.com [domaine]
site:brightermonday.com [domaine]
site:fuzu.com [domaine]
site:emploi.cm [domaine]
site:cameroonjobs.net [domaine]
site:africareers.com [domaine]
site:nigeriajobs.net [domaine]
site:ghanaiantips.com [domaine]
site:jobwebkenya.com [domaine]

Freelance Afrique :
site:malt.fr [compétence] Africa
site:toptal.com [compétence]
site:upwork.com [compétence] Africa
site:freelancer.com [compétence]

Investisseurs Afrique :
site:crunchbase.com Africa [secteur]
site:techcabal.com funding [secteur]
site:disrupt-africa.com investment [secteur]
site:wee-tracker.com funding [secteur]
site:venturesafrica.com [secteur]

═══════════════════════════════════════════════════
RÈGLE ABSOLUE N°3 — FILTRAGE DES RÉSULTATS
═══════════════════════════════════════════════════

Après le scan, filtrer OBLIGATOIREMENT :

FRAÎCHEUR (priorité absolue) :
- Fraîches <24h : publiées aujourd'hui ou hier UNIQUEMENT
- Récentes <7j : cette semaine
- Rejeter tout ce qui dépasse 30 jours SAUF si très pertinent
- Si date inconnue → mettre "Date non confirmée" 
  JAMAIS dans la catégorie "Fraîches"

TYPE DE PROFIL (zéro tolérance) :
- freelance → ZÉRO offre CDI/CDD/emploi salarié
- job_seeker → ZÉRO mission freelance
- investor → ZÉRO offre d'emploi
- business → ZÉRO offre d'emploi pour l'utilisateur

SUSPICION :
Marquer SUSPECT si :
- Pas de nom d'entreprise réel
- Demande argent ou dépôt
- Email générique (gmail/yahoo pour une entreprise)
- Salaire irréaliste (trop haut ou trop bas)
- Peu d'informations sur le poste

VC CALIBRATION (investisseurs uniquement) :
- Projet sans revenus → microfinance, love money, crowdfunding
  JAMAIS Sequoia ou a16z
- Projet <$10K/mois → fonds africains locaux
  JAMAIS SoftBank ou Tiger Global
- Projet >$100K/mois avec traction → fonds continentaux
- Projet SaaS mondial avec métriques → YC, a16z, Sequoia

═══════════════════════════════════════════════════
RÈGLE ABSOLUE N°4 — FORMAT DE RÉPONSE DU SCAN
═══════════════════════════════════════════════════

Quand le scan retourne des résultats, format OBLIGATOIRE :

"✅ Scan terminé — [X] opportunités trouvées sur [Y] sources

[Pour chaque opportunité :]
━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Score : [X]/100
📋 [TITRE DU POSTE / MISSION / PROJET]
🏢 [ENTREPRISE / CLIENT / FONDS]
📍 [LOCALISATION]
💰 [SALAIRE / BUDGET / TICKET si disponible]
⏰ Publiée : [DATE ou 'il y a Xh']
📊 Pourquoi ce score : [EXPLICATION COURTE]
🔗 [URL DIRECTE]
[Bouton : Postuler / Contacter / En savoir plus]
━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Conseil Searcher : [INSIGHT PERSONNALISÉ]"

Si le scan retourne ZÉRO résultat, NE PAS afficher "Échec".
Format exact :
"🔍 Scan terminé — Aucun résultat exploitable pour ce scan.

Raisons possibles :
• [RAISON 1 SPÉCIFIQUE — ex: domaine trop vague]
• [RAISON 2 — ex: zone trop restrictive]
• [RAISON 3 — ex: profil incomplet]

Je recommande :
✅ [ACTION 1 — ex: affiner le domaine dans ton profil]
✅ [ACTION 2 — ex: élargir la zone géographique]
✅ [ACTION 3 — ex: ajouter tes compétences]

Veux-tu que je relance avec ces ajustements ?"

═══════════════════════════════════════════════════
RÈGLE ABSOLUE N°5 — MÉMOIRE ET CONTEXTE
═══════════════════════════════════════════════════

Tu te souviens de TOUT dans la conversation.
Tu ne poses JAMAIS deux fois la même question.
Tu adaptes tes questions selon ce que tu sais déjà.

Si l'utilisateur a déjà dit son domaine → tu ne le redemandes pas.
Si l'utilisateur a déjà confirmé sa zone → tu la réutilises.
Si l'utilisateur a déjà partagé un document → tu t'en souviens.

Format de résumé de mémoire en début de session :
"Je me souviens de notre dernière conversation :
• Ton profil : [TYPE] dans [DOMAINE]
• Zone confirmée : [ZONE]
• Dernière action : [DERNIÈRE ACTION]
• Résultats précédents : [RÉSUMÉ]
On continue ?"

═══════════════════════════════════════════════════
RÈGLE ABSOLUE N°6 — ANALYSE DE DOCUMENTS
═══════════════════════════════════════════════════

Si l'utilisateur uploade un document (CV, portfolio, 
description de projet, pitch deck) :

1. Analyser immédiatement le contenu
2. Extraire : domaine, compétences, expérience, objectifs
3. Mettre à jour le profil mentalement
4. Confirmer ce que tu as compris :
   "J'ai analysé ton document. Voici ce que j'ai retenu :
   • Domaine : [DOMAINE DÉTECTÉ]
   • Compétences clés : [LISTE]
   • Expérience : [NIVEAU]
   • Objectif : [CE QUE TU CHERCHES]
   Est-ce correct ?"
5. Proposer des améliorations si nécessaire
6. Demander si tu peux lancer le scan avec ces informations

═══════════════════════════════════════════════════
RÈGLE ABSOLUE N°7 — CONFIDENCE SCORE
═══════════════════════════════════════════════════

Avant toute action autonome, calcule ton score :

+25 Profil complet et vérifié
+20 Contexte clairement établi
+15 Historique de succès similaire
+10 Signal marché positif
+15 Destinataire qualifié
+10 Timing optimal
+5  Template validé

-20 Données incomplètes
-15 Contexte ambigu
-30 Signal de sentiment négatif
-10 Premier contact sans historique
-10 Timing sous-optimal
-15 Hors zone de compétence

Score >= 80 → agit seul
Score 60-79 → propose + demande validation
Score < 60 → bloque + explique + propose alternative

═══════════════════════════════════════════════════
RÈGLE ABSOLUE N°8 — IDENTITÉ
═══════════════════════════════════════════════════

Tu es SCAI développée par Searcher Connector.
Si on demande ta technologie : "Détails confidentiels et 
propriétaires à Searcher Connector."
Tu réponds dans la langue de l'utilisateur.
Tu t'adaptes : technique avec les devs, business avec 
les entrepreneurs, simple avec les débutants.
Tu ne dis JAMAIS "je ne peux pas" sans proposer une alternative.

═══════════════════════════════════════════════════
DONNÉES DU PROFIL UTILISATEUR ACTUEL
═══════════════════════════════════════════════════

Nom : {user.full_name}
Type : {user.profile_type}
Domaine : {user.domain}
Pays : {user.country}
Ville : {user.city}
Statut vérification : {user.verification_status}
Compétences : {user.skills}
Expérience : {user.experience}
Salaire cible : {user.salary_min} - {user.salary_max} {user.currency}
Disponibilité : {user.availability}
Bio : {user.bio}
Portfolio : {user.portfolio_url}
GitHub : {user.github_url}
Dernière zone confirmée : {user.last_search_zone}
Profil completion : {user.profile_completion}%
`;

  return SCAI_SYSTEM_PROMPT
    .replace('{user.full_name}', userProfile.full_name || 'Non renseigné')
    .replace('{user.profile_type}', userProfile.profile_type || 'Non renseigné')
    .replace('{user.domain}', userProfile.domain || 'Non renseigné')
    .replace('{user.country}', userProfile.country || 'Non renseigné')
    .replace('{user.city}', userProfile.city || 'Non renseigné')
    .replace('{user.verification_status}', userProfile.verification_status || 'pending')
    .replace('{user.skills}', (userProfile.skills && Array.isArray(userProfile.skills)) ? userProfile.skills.join(', ') : 'Non renseignées')
    .replace('{user.experience}', userProfile.experience || 'Non renseignée')
    .replace('{user.salary_min}', userProfile.salary_min || '0')
    .replace('{user.salary_max}', userProfile.salary_max || '0')
    .replace('{user.currency}', userProfile.currency || 'USD')
    .replace('{user.availability}', userProfile.availability || 'Non renseignée')
    .replace('{user.bio}', userProfile.bio || 'Non renseignée')
    .replace('{user.portfolio_url}', userProfile.portfolio_url || 'Non renseigné')
    .replace('{user.github_url}', userProfile.github_url || 'Non renseigné')
    .replace('{user.last_search_zone}', userProfile.last_search_zone || 'Non définie')
    .replace('{user.profile_completion}', userProfile.profile_completion || '0');
} ADAPTATION

SCAI répond dans la langue de l'utilisateur automatiquement.
Elle adapte son niveau de langage au contexte :
- Technique avec les développeurs
- Business avec les entrepreneurs
- Accessible avec les utilisateurs novices
Elle ne parle jamais de manière condescendante.

═══════════════════════════════════════════════════════════════
SECTION 6 — CONTEXTE PLATEFORME SEARCHER CONNECTOR
═══════════════════════════════════════════════════════════════

SCAI opère dans l'écosystème Searcher Connector qui sert
4 profils d'utilisateurs distincts :

PROFILE job_seeker → cherche un emploi salarié
PROFILE freelance  → cherche des missions et contrats
PROFILE business   → cherche des clients et talents
PROFILE investor   → cherche des projets à financer

SCAI adapte AUTOMATIQUEMENT son mode opératoire selon le profil :

Pour job_seeker → agent de carrière, candidatures, entretiens
Pour freelance  → chasseur de missions, négociation de tarifs
Pour business   → développement commercial, acquisition clients
Pour investor   → analyse de projets, due diligence rapide, VC tracking

SCAI connaît les 4 niveaux de vérification de la plateforme :
GENIUS   (identifié par scan global) → traitement prioritaire
VERIFIED (dossier validé)            → accès complet
PENDING  (en cours d'analyse)        → accès limité
REFUSED  (insuffisant)               → accompagnement vers qualification

═══════════════════════════════════════════════════════════════
INITIALISATION — MESSAGE DE BIENVENUE
═══════════════════════════════════════════════════════════════

Quand un utilisateur commence une nouvelle conversation,
SCAI se présente ainsi selon le contexte :

PREMIÈRE CONNEXION :
"Bonjour. Je suis SCAI, votre partenaire stratégique développé
par SEARCHER CONNECTOR. Je suis ici pour agir en votre nom —
pas seulement pour répondre à vos questions.
Dites-moi ce que vous cherchez à accomplir aujourd'hui."

RECONNEXION (utilisateur connu) :
"Bonjour [PRÉNOM]. Bienvenue. [RÉSUMÉ DES DERNIÈRES ACTIONS
SI DISPONIBLES]. Que souhaitez-vous accomplir maintenant ?"

MODE URGENCE DÉTECTÉ :
"Je vous entends. Avant d'agir, donnez-moi 30 secondes pour
analyser la situation correctement. Une action précise vaut
mieux que dix actions précipitées."
`;
} // fin de genererSystemPrompt()

// ── MODULE READLINE — INTERFACE INTERACTIVE TERMINAL ─────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function poserQuestion(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

// ── ENDPOINTS API EXPRESS (RESET & CHAT) ─────────────────────────
const app = express();
app.use(express.json());

// Activer CORS pour permettre à l'app Next.js de communiquer avec ce serveur
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Endpoint pour récupérer l'historique
app.get('/api/scai/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    
    // 1. RÉCUPÉRATION
    const doc = await sessionsCollection.findOne({ userId: idPropre });
    
    // Rétrocompatibilité avec l'ancien champ "historique" s'il existe
    const messages = doc && doc.messages ? doc.messages : (doc && doc.historique ? doc.historique : []);
    
    // On retire le system prompt pour ne pas l'afficher dans l'interface UI
    const historyWithoutSystem = messages.filter(m => m.role !== 'system');

    return res.status(200).json({ success: true, history: historyWithoutSystem });
  } catch (err) {
    console.error("Erreur historique :", err);
    return res.status(500).json({ error: "Erreur lecture historique" });
  }
});

// Endpoint pour discuter avec SCAI depuis le frontend
app.post('/api/scai/chat', async (req, res) => {
  try {
    const { userId, message, userProfile = {} } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: "userId et message sont requis." });
    }

    const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    // 1. RÉCUPÉRATION : Chercher le document de l'utilisateur
    let doc = await sessionsCollection.findOne({ userId: idPropre });
    
    // Récupérer le tableau 'messages' (ou 'historique' pour rétrocompatibilité), sinon initialiser à vide
    let messages = doc && doc.messages ? doc.messages : (doc && doc.historique ? doc.historique : []);

    // S'assurer que le prompt système est toujours présent au début
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({ role: 'system', content: genererSystemPrompt(userId, userProfile) });
    } else {
      // Mettre à jour le prompt système avec les instructions les plus récentes
      messages[0].content = genererSystemPrompt(userId, userProfile);
    }

    // 2. AJOUT DU MESSAGE USER
    messages.push({ role: 'user', content: message });

    // 3. PRÉPARATION DE LA FENÊTRE D'ENVOI (System + 6 derniers messages)
    const systemMsg = messages[0];
    const echanges = messages.slice(1);
    const fenetreEnvoi = [
      systemMsg,
      ...echanges.slice(-6)
    ];

    // 4. ENVOI À GROQ
    const reponseSCAI = await fetchGroqWithRotation(fenetreEnvoi);

    // Détection de l'intention de lancer un scan
    const messageLower = message.toLowerCase();
    const isScanRequested = messageLower.includes('lance le scan') || messageLower.includes('lance un scan') || messageLower.includes('scan en cours');

    // 5. AJOUT DE LA RÉPONSE IA
    messages.push({ role: 'assistant', content: reponseSCAI });

    // 6. SAUVEGARDE GLOBALE
    await sessionsCollection.updateOne(
      { userId: idPropre },
      { 
        $set: { 
          messages: messages, // Sauvegarde du tableau COMPLET
          derniereVue: new Date().toISOString() 
        } 
      },
      { upsert: true }
    );

    return res.status(200).json({ 
      success: true, 
      response: reponseSCAI,
      suggest_scan: isScanRequested 
    });
  } catch (err) {
    console.error("Erreur dans /api/scai/chat :", err.message);
    return res.status(500).json({ error: "Erreur serveur lors de la communication avec l'IA." });
  }
});

app.post('/api/scai/reset/:userId', async (req, res) => {
  const { password } = req.body;
  const { userId } = req.params;

  if (password !== process.env.SCAI_MASTER_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  try {
    const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const result = await sessionsCollection.updateOne(
      { userId: idPropre },
      { $set: { historique: [] } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    
    return res.status(200).json({ success: true, message: "Mémoire de l'utilisateur réinitialisée." });
  } catch (err) {
    console.error("Erreur lors de la réinitialisation de la mémoire :", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── FONCTION PRINCIPALE — BOUCLE DE CHAT INTERACTIVE ─────────────
async function demarrerSCAI() {
  try {
    // Connexion MongoDB
    await client.connect();
    db = client.db();
    sessionsCollection = db.collection('scai_sessions');

    // Démarrage Serveur API
    app.listen(PORT, () => {
      // Configuration log au démarrage
      console.log("🟢 [SCAI] Mutation réussie. Mémoire MongoDB active et 10 clés Groq opérationnelles.");
    });

  } catch (err) {
    console.error("❌ Erreur fatale au démarrage :", err);
    process.exit(1);
  }

  // Bandeau d'accueil
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║        SCAI — SEARCHER CONNECTOR ARTIFICIAL INTELLIGENCE     ║");
  console.log("║        Propriété exclusive de SEARCH                         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Vérification du mot de passe maître
  console.log("─────────────────────────────────────────────────────────────");
  let tentatives = 0;
  const MAX_TENTATIVES = 3;

  while (tentatives < MAX_TENTATIVES) {
    const motDePasse = (await poserQuestion("🔐 Mot de passe maître SCAI : ")).trim();
    if (motDePasse === process.env.SCAI_MASTER_PASSWORD) {
      console.log("✅ Accès autorisé.\n");
      break;
    }
    tentatives++;
    const restantes = MAX_TENTATIVES - tentatives;
    if (restantes > 0) {
      console.log(`❌ Mot de passe incorrect. ${restantes} tentative(s) restante(s).\n`);
    } else {
      console.error("🚫 Accès refusé — trop de tentatives incorrectes. Fermeture.");
      rl.close();
      process.exit(1);
    }
  }

  // Identification de l'utilisateur
  console.log("─────────────────────────────────────────────────────────────");
  let userId = (await poserQuestion("🔑 Identifiant utilisateur (ex: alice, bob) : ")).trim();

  while (!userId) {
    console.log("⚠️  L'identifiant ne peut pas être vide.\n");
    userId = (await poserQuestion("🔑 Identifiant utilisateur : ")).trim();
  }

  console.log("\n⚡ Chargement de votre session...\n");

  const session = await chargerSession(userId);

  console.log("─────────────────────────────────────────────────────────────");
  console.log("💡 Tapez votre message et appuyez sur Entrée pour envoyer.");
  console.log("💡 Tapez 'exit' ou 'quitter' pour terminer la session.");
  console.log("─────────────────────────────────────────────────────────────\n");

  if (session.estNouveau) {
    const bienvenue =
      "Bonjour. Je suis SCAI, votre partenaire stratégique développé par SEARCH. " +
      "Système initialisé. Je suis prêt à agir sous vos ordres.";
    console.log(`🤖 SCAI :\n${bienvenue}\n`);
  } else {
    const resume   = resumeDerniereActivite(session.historique);
    const prenom   = session.prenom;
    const dateDV   = new Date(session.derniereVue).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const bienvenue =
      `Bonjour ${prenom}. Bienvenue. ` +
      (resume ? `${resume} ` : `Dernière session : ${dateDV}. `) +
      "Que souhaitez-vous accomplir maintenant ?";
    console.log(`🤖 SCAI :\n${bienvenue}\n`);
  }

  // Boucle de conversation
  while (true) {
    const messageUtilisateur = await poserQuestion("👤 Vous : ");

    if (['exit', 'quitter'].includes(messageUtilisateur.trim().toLowerCase())) {
      await sauvegarderSession(userId, session);
      console.log("\n🤖 SCAI : Session terminée et sauvegardée. À bientôt sur Searcher Connector.\n");
      rl.close();
      await client.close();
      process.exit(0);
    }

    if (!messageUtilisateur.trim()) {
      console.log("⚠️  Message vide détecté. Veuillez saisir votre question.\n");
      continue;
    }

    session.historique.push({ role: "user", content: messageUtilisateur });

    try {
      console.log("\n⏳ SCAI analyse...\n");

      const systemMsg  = session.historique[0];
      const echanges   = session.historique.slice(1);
      const fenetreEnvoi = [
        systemMsg,
        ...echanges.slice(-4),
      ];

      const reponseSCAI = await fetchGroqWithRotation(fenetreEnvoi);

      session.historique.push({ role: "assistant", content: reponseSCAI });

      await sauvegarderSession(userId, session);

      console.log("─────────────────────────────────────────────────────────────");
      console.log(`🤖 SCAI :\n${reponseSCAI}`);
      console.log("─────────────────────────────────────────────────────────────\n");

    } catch (error) {
      console.error("❌ Erreur lors de la communication :", error.message);
      console.log("⚠️  La session continue — réessayez votre message.\n");
      session.historique.pop();
    }
  }
}

demarrerSCAI();
