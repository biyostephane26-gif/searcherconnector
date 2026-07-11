=================================================================
SEARCHER CONNECTOR — OPENHANDS PROMPT — COUCHE 4
BARRE UNIVERSELLE · OAUTH · ZERO-KNOWLEDGE · VC TRACKING · CLIENT FINDER
=================================================================
Tu es un développeur senior full-stack avec 15 ans d'expérience.
Les Couches 1, 2 et 3 sont déjà codées et fonctionnelles.
Tu construis PAR-DESSUS sans rien casser.
Tu codes TOUT. Tu ne sautes RIEN. Tu te corriges toi-même.
Tu testes mentalement chaque feature avant de passer à la suivante.

La Couche 4 est le moteur d'acquisition universel de Searcher :
— La barre de recherche intelligente qui comprend tout
— Le système OAuth qui connecte les comptes des utilisateurs légalement
— Le chiffrement Zero-Knowledge (données illisibles même pour le fondateur)
— Le VC Tracking Orange Merchant (investisseurs trouvés sans contact froid)
— Le Client Finder B2B (clients vérifiés avec intention d'achat réelle)
— Le panneau latéral glissant sur les opportunités (comme LinkedIn)
— Le feedback loop ML sur le scoring
— La protection anti-ban complète (Serper + cache + rotation)
=================================================================

PRÉREQUIS : Couches 1, 2 et 3 tournent parfaitement.
npm run dev fonctionne. Build passe. Supabase connecté.
Tables existantes utilisées : users_profiles, opportunities,
applications_sent, notifications, agent_actions, agent_queue,
agent_schedules, posts, groups, conversations.
=================================================================

PHILOSOPHIE DE LA COUCHE 4 :
"Searcher ne demande pas. Searcher comprend.
 L'utilisateur uploade son CV, parle, colle un lien —
 Searcher analyse, pose les bonnes questions, et agit."
— Comme un recruteur privé qui lit entre les lignes.

RÈGLE D'OR LÉGALE (respectée à 100%) :
— OAuth uniquement pour les comptes que l'utilisateur autorise explicitement
— Serper API pour toutes les recherches externes (données publiques Google)
— Crunchbase, AngelList, Twitter/X API officielles pour les investisseurs
— Zéro scraping direct de LinkedIn, Indeed, Glassdoor
— Chiffrement AES-256 côté client : les données sont chiffrées AVANT
  d'atteindre le serveur. Ni serveur, ni fondateur ne peut les lire.
=================================================================

=================================================================
ÉTAPE 1 — INSTALLATION DES NOUVELLES DÉPENDANCES
=================================================================

npm install crypto-js tweetnacl tweetnacl-util
npm install @types/crypto-js
npm install react-dropzone react-speech-recognition
npm install @types/react-speech-recognition
npm install react-split-pane
npm install date-fns

=================================================================
ÉTAPE 2 — NOUVELLES TABLES SQL (COUCHE 4)
=================================================================

Ouvre Supabase SQL Editor et exécute ce SQL complet :

-- Comptes OAuth connectés par l'utilisateur
create table if not exists connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  platform text not null check (
    platform in ('linkedin','gmail','google_drive','twitter','facebook','whatsapp','github','behance','notion')
  ),
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamp,
  scopes text[],
  platform_user_id text,
  platform_username text,
  is_active boolean default true,
  connected_at timestamp default now(),
  last_used_at timestamp,
  unique(user_id, platform)
);

-- Historique des sessions de la barre universelle
create table if not exists universal_search_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  input_type text check (input_type in ('text','voice','file','link','multimodal')),
  raw_input text,
  extracted_profile jsonb default '{}',
  questions_asked jsonb default '[]',
  answers_given jsonb default '[]',
  profile_complete boolean default false,
  search_launched boolean default false,
  created_at timestamp default now()
);

-- Profils investisseurs (VC Tracking)
create table if not exists vc_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  firm text,
  country text,
  sectors text[],
  ticket_min integer default 0,
  ticket_max integer default 0,
  currency text default 'USD',
  investment_stage text[],
  twitter_handle text,
  linkedin_url text,
  crunchbase_url text,
  angellist_url text,
  public_email text,
  recent_investments jsonb default '[]',
  hashtags_followed text[],
  platforms_active text[],
  last_scraped_at timestamp,
  score_match integer default 0,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Campagnes VC Tracking (modèle Orange Merchant)
create table if not exists vc_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  project_title text not null,
  project_description text,
  sector text,
  funding_target integer default 0,
  currency text default 'USD',
  stage text check (stage in ('idea','mvp','seed','series_a','series_b','growth')),
  target_vc_ids uuid[],
  placements jsonb default '[]',
  status text default 'active' check (status in ('active','paused','closed','funded')),
  impressions_total integer default 0,
  clicks_total integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Actions Orange Merchant (où Searcher place les projets)
create table if not exists vc_placements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references vc_campaigns(id) on delete cascade,
  vc_id uuid references vc_profiles(id) on delete set null,
  platform text not null,
  placement_type text check (
    placement_type in ('hashtag_post','reddit_thread','forum_reply','twitter_thread','newsletter_mention','google_indexed')
  ),
  content text,
  posted_at timestamp default now(),
  clicks integer default 0,
  vc_viewed boolean default false,
  vc_joined boolean default false
);

-- Prospects B2B pour le Client Finder
create table if not exists b2b_prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  company_name text not null,
  contact_name text,
  contact_role text,
  email text,
  phone text,
  website text,
  country text,
  city text,
  sector text,
  company_size text,
  annual_revenue_estimate text,
  has_buying_intent boolean default false,
  intent_signals text[],
  verified_by_searcher boolean default false,
  score integer default 0,
  source_platform text,
  notes text,
  status text default 'new' check (
    status in ('new','contacted','replied','meeting_booked','converted','rejected')
  ),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Feedback utilisateur sur les scores (feedback loop ML)
create table if not exists opportunity_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  feedback text check (feedback in ('liked','not_for_me','too_low_salary','wrong_location','already_applied','perfect')),
  created_at timestamp default now(),
  unique(user_id, opportunity_id)
);

-- Cache de recherche Serper (anti-ban, 6h)
create table if not exists serper_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text unique not null,
  query_text text not null,
  results jsonb not null,
  hits integer default 1,
  expires_at timestamp not null,
  created_at timestamp default now()
);

-- RLS pour toutes les nouvelles tables
alter table connected_accounts enable row level security;
alter table universal_search_sessions enable row level security;
alter table vc_campaigns enable row level security;
alter table vc_placements enable row level security;
alter table b2b_prospects enable row level security;
alter table opportunity_feedback enable row level security;
alter table serper_cache enable row level security;
alter table vc_profiles enable row level security;

-- Politiques RLS
create policy "user_own_connected_accounts" on connected_accounts
  for all using (auth.uid() = user_id);

create policy "user_own_search_sessions" on universal_search_sessions
  for all using (auth.uid() = user_id);

create policy "user_own_vc_campaigns" on vc_campaigns
  for all using (auth.uid() = user_id);

create policy "vc_placements_via_campaign" on vc_placements
  for all using (
    campaign_id in (select id from vc_campaigns where user_id = auth.uid())
  );

create policy "user_own_b2b_prospects" on b2b_prospects
  for all using (auth.uid() = user_id);

create policy "user_own_feedback" on opportunity_feedback
  for all using (auth.uid() = user_id);

create policy "serper_cache_read_all" on serper_cache
  for select using (true);

create policy "serper_cache_insert_auth" on serper_cache
  for insert with check (auth.uid() is not null);

create policy "vc_profiles_read_all" on vc_profiles
  for select using (true);

create policy "vc_profiles_insert_auth" on vc_profiles
  for insert with check (auth.uid() is not null);

-- Index performance
create index if not exists idx_connected_accounts_user on connected_accounts(user_id);
create index if not exists idx_vc_campaigns_user on vc_campaigns(user_id);
create index if not exists idx_b2b_prospects_user on b2b_prospects(user_id);
create index if not exists idx_serper_cache_hash on serper_cache(query_hash);
create index if not exists idx_serper_cache_expires on serper_cache(expires_at);
create index if not exists idx_opportunity_feedback_user on opportunity_feedback(user_id);

=================================================================
ÉTAPE 3 — BIBLIOTHÈQUE ZERO-KNOWLEDGE (src/lib/encryption.ts)
=================================================================

Crée le fichier src/lib/encryption.ts :

import CryptoJS from 'crypto-js';

// Dérive une clé de chiffrement à partir du mot de passe utilisateur
// La clé ne quitte JAMAIS le navigateur
export function deriveKey(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString();
}

// Chiffre n'importe quel texte avant envoi au serveur
export function encryptData(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

// Déchiffre sur l'appareil de l'utilisateur uniquement
export function decryptData(encrypted: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Chiffre un objet JSON
export function encryptObject(obj: object, key: string): string {
  return encryptData(JSON.stringify(obj), key);
}

// Déchiffre vers un objet
export function decryptObject<T>(encrypted: string, key: string): T {
  return JSON.parse(decryptData(encrypted, key));
}

// Hash irréversible pour les tokens OAuth stockés
export function hashToken(token: string): string {
  return CryptoJS.SHA256(token).toString();
}

// Génère un salt unique par utilisateur (stocké côté client uniquement)
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
}

// Contexte React pour la clé de chiffrement (session uniquement)
// La clé est détruite quand le navigateur se ferme
let sessionEncryptionKey: string | null = null;

export function setSessionKey(key: string): void {
  sessionEncryptionKey = key;
}

export function getSessionKey(): string | null {
  return sessionEncryptionKey;
}

export function clearSessionKey(): void {
  sessionEncryptionKey = null;
}

=================================================================
ÉTAPE 4 — SERVICE ANTI-BAN (src/lib/safeSearch.ts)
=================================================================

Crée le fichier src/lib/safeSearch.ts :

import { supabase } from './supabase';
import CryptoJS from 'crypto-js';

const SERPER_KEYS = [
  import.meta.env.VITE_SERPER_API_KEY_1,
  import.meta.env.VITE_SERPER_API_KEY_2,
  import.meta.env.VITE_SERPER_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;

function getNextKey(): string {
  const key = SERPER_KEYS[currentKeyIndex % SERPER_KEYS.length];
  currentKeyIndex++;
  return key;
}

function hashQuery(query: string): string {
  return CryptoJS.MD5(query.toLowerCase().trim()).toString();
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(): number {
  return Math.floor(Math.random() * 2500) + 1500; // 1500ms à 4000ms
}

// Vérifie le cache Supabase avant d'appeler Serper
async function checkCache(queryHash: string): Promise<any[] | null> {
  const { data } = await supabase
    .from('serper_cache')
    .select('results, expires_at')
    .eq('query_hash', queryHash)
    .single();

  if (data && new Date(data.expires_at) > new Date()) {
    return data.results;
  }
  return null;
}

// Sauvegarde les résultats en cache pendant 6 heures
async function saveToCache(queryHash: string, queryText: string, results: any[]): Promise<void> {
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  await supabase.from('serper_cache').upsert({
    query_hash: queryHash,
    query_text: queryText,
    results,
    expires_at: expiresAt,
  }, { onConflict: 'query_hash' });
}

// Fonction principale — TOUJOURS utiliser celle-ci pour les recherches
export async function safeSearch(query: string, type: 'jobs' | 'news' | 'investors' | 'companies' = 'jobs'): Promise<any[]> {
  const queryHash = hashQuery(query);

  // 1. Vérifier le cache
  const cached = await checkCache(queryHash);
  if (cached) return cached;

  // 2. Délai anti-ban aléatoire
  await sleep(randomDelay());

  // 3. Appel Serper avec rotation de clés
  try {
    const key = getNextKey();
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
        gl: 'us',
        hl: 'en',
      }),
    });

    if (!response.ok) throw new Error(`Serper error: ${response.status}`);

    const data = await response.json();
    const results = data.organic || [];

    // 4. Sauvegarder en cache
    await saveToCache(queryHash, query, results);

    return results;
  } catch (error) {
    console.error('SafeSearch error:', error);
    return [];
  }
}

// Recherche spécifique investisseurs via sources publiques légales
export async function searchInvestors(sector: string, stage: string): Promise<any[]> {
  const queries = [
    `site:crunchbase.com investor "${sector}" "${stage}"`,
    `site:angel.co investor looking "${sector}"`,
    `"venture capital" "${sector}" "${stage}" contact email 2025 OR 2026`,
    `VC fund "${sector}" portfolio companies "${stage}"`,
  ];

  const allResults: any[] = [];
  for (const q of queries) {
    const results = await safeSearch(q, 'investors');
    allResults.push(...results);
    await sleep(randomDelay());
  }

  return allResults.slice(0, 20);
}

// Recherche entreprises B2B via Google Maps + Web
export async function searchB2BProspects(sector: string, location: string, service: string): Promise<any[]> {
  const queries = [
    `${sector} company "${location}" looking for "${service}"`,
    `"${sector}" business "${location}" hiring "${service}"`,
    `site:linkedin.com/company "${sector}" "${location}"`,
  ];

  const allResults: any[] = [];
  for (const q of queries) {
    const results = await safeSearch(q, 'companies');
    allResults.push(...results);
    await sleep(randomDelay());
  }

  return allResults.slice(0, 15);
}

=================================================================
ÉTAPE 5 — BARRE DE RECHERCHE UNIVERSELLE (src/components/UniversalSearchBar.tsx)
=================================================================

Crée le fichier src/components/UniversalSearchBar.tsx :

C'est le composant central de la Couche 4. Il remplace le formulaire
de profil classique et devient le point d'entrée de TOUT dans Searcher.

Ce composant fait :
1. Accepte text libre, upload fichier (CV PDF, image, vidéo portfolio),
   lien URL (GitHub, Behance, LinkedIn, YouTube), message vocal
2. Analyse avec Gemini ce qui a été soumis
3. Identifie ce qui manque dans le profil
4. Pose des questions ciblées (choix multiple OU réponse écrite)
   exactement comme Claude le fait avec ses questions interactives
5. Une fois le profil complet → lance la recherche automatiquement

Interface :
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Décrivez ce que vous cherchez, uploadez votre CV,        │
│    collez un lien, ou parlez à Searcher...                  │
│                                              📎  🎙️  🔗    │
└─────────────────────────────────────────────────────────────┘

Bouton 📎 → react-dropzone → accepte PDF, images, vidéos
Bouton 🎙️ → react-speech-recognition → transcription vocale en temps réel
Bouton 🔗 → champ URL → analyse le lien avec Gemini

Après soumission :
Phase 1 — Analyse (animation pulse or)
"Searcher analyse votre profil..."
Appel Gemini avec le contenu soumis

Phase 2 — Questions ciblées (1 à 4 questions max)
Pour chaque info manquante, Searcher pose UNE question à la fois.

Format question CHOIX MULTIPLE :
┌────────────────────────────────────────────┐
│ 💬 Quel type de contrat recherchez-vous ?  │
│                                            │
│ [CDI]  [Freelance]  [Remote]  [Tout]       │
└────────────────────────────────────────────┘

Format question RÉPONSE ÉCRITE :
┌────────────────────────────────────────────┐
│ 💬 Décris ta réalisation dont tu es        │
│    le plus fier (projet, résultat chiffré) │
│                                            │
│ [Textarea avec placeholder]                │
│                                [Envoyer →] │
└────────────────────────────────────────────┘

Phase 3 — Profil validé
"Profil complet ✓ — Searcher lance la recherche mondiale"
Animation de scan (GoldDot qui pulse)
Appel automatique à agent-scan

Props du composant :
- onSearchComplete: (profile: SearchProfile) => void
- mode: 'onboarding' | 'dashboard' | 'compact'

En mode 'dashboard' → affiché en haut du Dashboard principal en permanence
En mode 'onboarding' → affiché à la place du formulaire d'inscription
En mode 'compact' → version réduite dans la sidebar

Logique Gemini pour l'analyse :
const ANALYSIS_PROMPT = `
Tu es Searcher, un agent IA de recherche d'opportunités mondiales.
Un utilisateur vient de te soumettre ceci :
TYPE: ${inputType}
CONTENU: ${content}

Extrait toutes les informations disponibles :
- Nom complet
- Domaine d'expertise principal
- Compétences techniques listées
- Années d'expérience
- Localisation souhaitée (remote, pays, ville)
- Type de contrat souhaité
- Fourchette salariale si mentionnée
- Disponibilité
- Niveau de langue (FR, EN, autres)
- Profil type (job_seeker, freelance, business, investor)

Puis identifie EXACTEMENT ce qui manque.
Pour chaque info manquante, génère UNE question.
Pour les réponses courtes : type "choice" avec 3-4 options.
Pour les nuances : type "open" avec une question précise.
Maximum 4 questions.

Réponds UNIQUEMENT en JSON :
{
  "extracted": { tous les champs extraits },
  "questions": [
    { "type": "choice", "text": "...", "options": ["A","B","C","D"] },
    { "type": "open", "text": "..." }
  ]
}
`;

=================================================================
ÉTAPE 6 — SYSTÈME OAUTH (src/pages/ConnectedAccounts.tsx)
=================================================================

Crée le fichier src/pages/ConnectedAccounts.tsx :

Page accessible depuis le Dashboard → onglet "Mes Comptes Connectés".

Affichage :
Titre : "Connectez vos comptes — Plus vous connectez, plus Searcher est puissant"

Liste des plateformes avec statut :

🔵 LinkedIn
   Postuler directement · Réseau recruteurs · Offres cachées
   [Connecter] OU [✓ Connecté — Déconnecter]

📧 Gmail
   Lire emails recruteurs · Répondre automatiquement
   [Connecter] OU [✓ Connecté — Déconnecter]

📁 Google Drive
   Stocker CV adaptés · Partager dossiers candidature
   [Connecter] OU [✓ Connecté — Déconnecter]

🐦 Twitter / X
   Visibilité investisseurs · Suivre VCs ciblés
   [Connecter] OU [✓ Connecté — Déconnecter]

💬 WhatsApp Business
   Gérer messages recruteurs · Réponses automatiques
   [Connecter] OU [✓ Connecté — Déconnecter]

📘 Facebook
   Groupes emploi · Clients potentiels B2B
   [Connecter] OU [✓ Connecté — Déconnecter]

🐙 GitHub
   Portfolio code · Analyse compétences automatique
   [Connecter] OU [✓ Connecté — Déconnecter]

🎨 Behance
   Portfolio design · Analyse style automatique
   [Connecter] OU [✓ Connecté — Déconnecter]

Barre de progression "Puissance Searcher" :
0 compte → 20% (Basique)
2 comptes → 50% (Actif)
4 comptes → 75% (Avancé)
6+ comptes → 100% (Full Autonome)

Implémentation OAuth :
Chaque bouton "Connecter" ouvre une fenêtre popup OAuth officielle.
Après autorisation, le token est :
1. Reçu par le callback OAuth
2. Chiffré avec AES-256 côté client (encryptData de encryption.ts)
3. Stocké chiffré dans connected_accounts
4. Jamais transmis en clair

Pour MVP, implémenter d'abord LinkedIn et Gmail en OAuth réel.
Les autres plateformes affichent "Coming soon" avec une date estimée.

Sécurité affichée à l'utilisateur :
Bloc info sous chaque compte connecté :
"🔒 Token chiffré AES-256. Ni Searcher ni son fondateur ne peut lire
votre token. Révocable à tout moment en cliquant Déconnecter."

=================================================================
ÉTAPE 7 — PAGE MES DONNÉES (src/pages/MyData.tsx)
=================================================================

Crée le fichier src/pages/MyData.tsx :

Page Zero-Knowledge visible par l'utilisateur.
Accessible depuis : Paramètres → "Mes Données & Confidentialité"

Sections :

1. "Ce que Searcher stocke sur vous"
Liste chaque type de données :
- Profil chiffré (nom, domaine, préférences)
- Documents uploadés (CV, diplômes) — chiffrés AES-256
- Historique des recherches — chiffré
- Tokens OAuth — chiffrés, jamais lisibles par Searcher
- Logs agent — actions uniquement, pas le contenu

Pour chaque type : badge vert "🔒 Chiffré — Illisible par Searcher"

2. "Preuve technique"
Bloc code sombre montrant :
"Vos données arrivent sur nos serveurs sous cette forme :
U2FsdGVkX1+8kzQnLzXr... [chaîne illisible]
Même avec un accès direct à la base de données,
personne ne peut déchiffrer sans votre clé personnelle."

3. Bouton "Exporter toutes mes données"
Génère un fichier ZIP chiffré avec toutes les données de l'utilisateur
Déchiffrable uniquement avec son mot de passe

4. Bouton "Supprimer mon compte définitivement"
Confirmation : taper "SUPPRIMER" en majuscules
Suppression irréversible de toutes les données dans les 48h
Email de confirmation envoyé

5. "Audit log"
Tableau des 50 derniers accès à ses données :
Date · Action · Résultat
"15:32 — Agent a scanné vos opportunités — 12 trouvées"
"14:18 — Candidature envoyée — Marketing Manager Paris"

=================================================================
ÉTAPE 8 — PANNEAU LATÉRAL OPPORTUNITÉS (src/components/OpportunityPanel.tsx)
=================================================================

Crée le fichier src/components/OpportunityPanel.tsx :

Panneau qui glisse depuis la droite quand l'utilisateur clique
sur une opportunité dans la liste. Comme LinkedIn, Notion, Linear.

Sur desktop : la liste reste visible à gauche (40%), panneau à droite (60%)
Sur mobile : plein écran avec bouton "← Retour"

Contenu du panneau (dans l'ordre) :

1. Header
Nom de l'entreprise (logo si disponible via Google)
Titre du poste en grand
Badge source : [Indeed] [LinkedIn] [RemoteOK] [Twitter] etc.
Date : "Publiée il y a 3 heures" (en or si < 24h, gris si > 24h)
Bouton ✕ pour fermer

2. Score Searcher
Jauge circulaire animée — 0 à 100 en or
Nombre en grand : "94 / 100"
Sous la jauge : "Score de compatibilité"

3. Raison du match (bloc or sur fond sombre)
"Vos compétences en marketing digital correspondent parfaitement.
Offre publiée il y a 3h — seulement 7 candidats actuellement.
Vous avez un avantage stratégique fort."

4. Alerte visa/passeport (si is_foreign = true)
Bloc orange avec icône ⚠️
"Offre internationale — Vérifiez votre passeport avant de postuler.
Documents requis : visa de travail + permis de résidence.
Temps de traitement estimé : 4-8 semaines."

5. Informations complètes
Entreprise · Secteur · Taille estimée
Localisation complète (ville, pays, flag emoji)
Salaire : min - max avec devise
Nombre de candidats actuel (mis à jour toutes les 6h via cache)
Type de contrat · Remote/Présentiel/Hybride
Date de publication exacte

6. Boutons d'action (sticky en bas du panneau)
[⚡ Laisser Searcher postuler] — bouton or principal
[🔗 Voir l'offre originale ↗] — ouvre dans nouvel onglet
[👎 Pas pour moi] — feedback ML → bouton discret

7. Feedback rapide (sous les boutons)
"Pourquoi ce n'est pas pour vous ?"
[Salaire trop bas] [Mauvaise localisation] [Déjà postulé] [Autre]
→ Sauvegarde dans opportunity_feedback
→ Gemini ajuste les prochains scores pour cet utilisateur

8. Statut candidature (si déjà postulé)
Timeline :
● Candidature envoyée — 14 Jan 15:32
○ Relance automatique J+3 — En attente
○ Réponse recruteur — En attente
Bouton "Voir la couverture envoyée"

9. Historique follow-ups (si applicable)
"Searcher a relancé le 17 Jan — Pas de réponse"
"Searcher relancera automatiquement le 20 Jan si silence"

Navigation inter-opportunités :
Flèches [←] [→] pour naviguer d'une offre à l'autre sans fermer le panneau
Raccourci clavier : flèches gauche/droite

=================================================================
ÉTAPE 9 — INTÉGRATION DANS LE DASHBOARD (src/pages/Dashboard.tsx)
=================================================================

Modifie le Dashboard existant pour intégrer les nouveaux composants.

MODIFICATIONS :

1. En haut du Dashboard (avant les stats) :
Ajouter <UniversalSearchBar mode="dashboard" onSearchComplete={handleSearchComplete} />

2. Section Opportunités :
Chaque OpportunityCard devient cliquable
onClick → ouvre OpportunityPanel avec l'opportunité sélectionnée
Le panneau s'anime depuis la droite (framer-motion : x: 500 → 0)

3. Nouvel onglet dans la navigation : "Mes Comptes"
Lien vers ConnectedAccounts.tsx

4. Indicateur de puissance Searcher dans la sidebar :
Petit badge "Puissance: 75%" en or
Cliquable → redirige vers ConnectedAccounts

5. Mise à jour du header de la section Opportunités :
Titre : "Opportunités mondiales — Cliquez pour voir les détails"
Sous-titre : "Score de compatibilité calculé par Searcher sur 100 points"

=================================================================
ÉTAPE 10 — VC TRACKING ORANGE MERCHANT (src/pages/VCTracking.tsx)
=================================================================

Crée le fichier src/pages/VCTracking.tsx :
Accessible uniquement avec plan investor ou genius.

En-tête :
"VC Tracking — Le Modèle Orange Merchant"
Sous-titre : "Searcher place votre projet là où les investisseurs passent
naturellement. Vous n'allez pas vers eux. Ils vous découvrent."

3 onglets : [Mon Projet] [Investisseurs Ciblés] [Campagnes Actives]

--- Onglet 1 : Mon Projet ---

Formulaire de projet :
- Titre du projet
- Description courte (pitch de 2 phrases)
- Secteur (dropdown)
- Stade (idea / mvp / seed / series_a)
- Montant recherché + devise
- Pays de base

Après remplissage, Gemini évalue le projet :

ÉVALUATION GEMINI :
"Searcher analyse votre projet..."
Résultat :
[Badge] PRÊT POUR INVESTISSEURS ✓ OU [Badge] À RENFORCER ⚠️

Si "À renforcer" → liste précise :
"Ce qui manque : traction (premiers utilisateurs), équipe complète,
 modèle de revenus chiffré. Renforcez ces 3 points avant de lancer."

Si "Prêt" → bouton [Lancer le VC Tracking →]

Calibration automatique :
Si stade = 'idea' → investisseurs locaux, business angels régionaux
Si stade = 'mvp' → fonds seed africains, angels continentaux
Si stade = 'seed' → Partech Africa, Y Combinator Africa, Saviu Ventures
Si stade = 'series_a' → a16z Afrique, Sequoia emerging, SoftBank Vision

--- Onglet 2 : Investisseurs Ciblés ---

Liste des VCs trouvés via searchInvestors() :
Pour chaque VC :
Card sombre avec :
- Nom + Firme
- Pays + Flag
- Ticket moyen : $X - $Y
- Secteurs investis (badges)
- Plateformes actives (Twitter, Reddit, etc.)
- Dernier investissement connu
- Bouton [Cibler cet investisseur]

Filtre : secteur / ticket minimum / localisation / stade

--- Onglet 3 : Campagnes Actives ---

Pour chaque campagne :
Carte avec :
- Titre du projet
- Statut (active / paused / funded)
- Compteur : X impressions · Y clics · Z VCs ont vu
- Liste des placements actifs :
  "📌 Reddit r/venturecapital — posté il y a 2h — 47 vues"
  "📌 Twitter thread #AfricaTech — posté hier — 123 impressions"
  "📌 Google indexé — searcherconnector.com/projects/[slug]"

Bouton [Pause] / [Reprendre] / [Clôturer — Projet financé 🎉]

=================================================================
ÉTAPE 11 — EDGE FUNCTION : AGENT VC TRACKER (supabase/functions/agent-vc-tracker/index.ts)
=================================================================

Crée la Edge Function Deno :

Cette fonction tourne toutes les 24 heures via pg_cron.
Elle implémente le modèle Orange Merchant automatiquement.

Ce qu'elle fait :
1. Récupère toutes les campagnes vc_campaigns avec status = 'active'
2. Pour chaque campagne :
   a. Identifie les VCs ciblés
   b. Analyse leurs comportements publics via Serper (hashtags, tweets récents)
   c. Génère un contenu adapté à leur style
   d. Prépare les placements sur 4 canaux simultanés :
      - Reddit (r/venturecapital, r/startups, r/investing, r/AfricaTech)
      - Twitter/X thread avec hashtags que le VC suit
      - Google-indexed page sur searcherconnector.com/projects/
      - Forum spécialisé (Y Combinator Forum, Product Hunt Discussion)
   e. Insère dans vc_placements
   f. Envoie notification à l'utilisateur

Signature auto-promo sur chaque placement :
"Discovered via Searcher Connector — the autonomous opportunity agent
that connects verified talent, businesses and investors worldwide.
searcherconnector.com — [Montant] investment opportunity available"

Les gens ne cliquent pas par curiosité — ils cliquent parce qu'il y a
de l'argent qui les attend.

Format de la Edge Function :

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')!;
  const SERPER_KEY = Deno.env.get('SERPER_API_KEY')!;

  try {
    // Récupérer campagnes actives
    const { data: campaigns } = await supabase
      .from('vc_campaigns')
      .select('*, users_profiles(full_name, domain, country)')
      .eq('status', 'active');

    let totalPlacements = 0;

    for (const campaign of (campaigns || [])) {
      // Analyser le projet avec Gemini
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Tu es Searcher Connector, un agent IA de mise en relation investisseurs-fondateurs.
                
Projet : ${campaign.project_title}
Description : ${campaign.project_description}
Secteur : ${campaign.sector}
Stade : ${campaign.stage}
Financement recherché : ${campaign.funding_target} ${campaign.currency}
Fondateur : ${campaign.users_profiles?.full_name} — ${campaign.users_profiles?.country}

Génère 4 posts différents pour placer ce projet là où les investisseurs passent :
1. Un thread Twitter/X de 3 tweets avec hashtags pertinents
2. Un post Reddit pour r/venturecapital (style organique, pas de pub directe)
3. Un titre + description pour une page indexable sur Google
4. Un post pour r/startups

Chaque post doit :
- Donner de la valeur réelle (pas de spam)
- Mentionner naturellement le projet
- Terminer par : "Reply or visit searcherconnector.com to connect with this founder."
- Être en anglais

Réponds UNIQUEMENT en JSON :
{
  "twitter": "texte du thread",
  "reddit_vc": "texte reddit VC",
  "google_title": "titre page Google",
  "google_description": "description page Google",
  "reddit_startups": "texte reddit startups"
}`
              }]
            })
          }
        }
      );

      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const clean = rawText.replace(/\`\`\`json|\`\`\`/g, '').trim();

      let placements: any = {};
      try {
        placements = JSON.parse(clean);
      } catch {
        placements = { twitter: rawText, reddit_vc: rawText };
      }

      // Insérer les placements
      const placementTypes = [
        { type: 'twitter_thread', content: placements.twitter, platform: 'twitter' },
        { type: 'reddit_thread', content: placements.reddit_vc, platform: 'reddit_vc' },
        { type: 'google_indexed', content: placements.google_description, platform: 'google' },
        { type: 'reddit_thread', content: placements.reddit_startups, platform: 'reddit_startups' },
      ];

      for (const p of placementTypes) {
        if (p.content) {
          await supabase.from('vc_placements').insert({
            campaign_id: campaign.id,
            platform: p.platform,
            placement_type: p.type,
            content: p.content,
            posted_at: new Date().toISOString(),
          });
          totalPlacements++;
        }
      }

      // Mettre à jour les impressions
      await supabase.from('vc_campaigns')
        .update({ impressions_total: (campaign.impressions_total || 0) + 4, updated_at: new Date().toISOString() })
        .eq('id', campaign.id);

      // Notifier l'utilisateur
      await supabase.from('notifications').insert({
        user_id: campaign.user_id,
        type: 'vc_placement',
        title: 'VC Tracking actif 🎯',
        message: `Searcher a placé votre projet "${campaign.project_title}" sur 4 canaux. Les investisseurs vont le découvrir naturellement.`,
        is_read: false,
      });
    }

    return new Response(
      JSON.stringify({ success: true, placements: totalPlacements }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

Ajoute dans la table agent_schedules (depuis Supabase SQL Editor) :
insert into agent_schedules (function_name, cron_expression, is_active, description)
values ('agent-vc-tracker', '0 9 * * *', true, 'VC Tracking Orange Merchant — chaque jour à 9h UTC');

=================================================================
ÉTAPE 12 — CLIENT FINDER B2B (src/pages/ClientFinder.tsx)
=================================================================

Crée le fichier src/pages/ClientFinder.tsx :
Accessible uniquement avec plan business ou investor.

Philosophie affichée :
"Facebook Ads vend des impressions.
 Searcher vend de vrais clients avec intention d'achat vérifiée."

3 onglets : [Rechercher] [Mes Prospects] [Relances Auto]

--- Onglet 1 : Rechercher ---

Formulaire :
- Mon service / produit : textarea
- Secteur cible : dropdown
- Localisation cible : text (pays, ville, ou "Mondial")
- Budget client estimé : range slider
- Taille d'entreprise : [TPE] [PME] [ETI] [Grand groupe]

Bouton [Searcher trouve mes clients →] (en or)

Après lancement :
"Searcher recherche des entreprises qui ont besoin de vous..."
Animation scan
Résultats en cards :

Card prospect :
- Nom entreprise + pays
- Secteur + taille estimée
- Signal d'intention : "Cette entreprise cherche activement un service similaire"
- Score Searcher : 87/100
- Bouton [Approcher] → génère un email de prise de contact personnalisé
- Bouton [+ Ajouter à mes prospects]

--- Onglet 2 : Mes Prospects ---

Pipeline Kanban en 5 colonnes :
[Nouveau] [Contacté] [A répondu] [Réunion planifiée] [Converti 💰]

Drag & drop entre colonnes.
Chaque card = un b2b_prospect.
Clic sur la card → panneau latéral avec détails complets + historique.

--- Onglet 3 : Relances Auto ---

Toggle "Activer les relances automatiques"
Délai de relance : 3 jours / 5 jours / 7 jours
Message de relance : personnalisé par Gemini

Liste des relances planifiées :
"TechCorp Douala — Relance prévue le 23 Jan"
Bouton [Annuler] / [Relancer maintenant]

=================================================================
ÉTAPE 13 — FEEDBACK LOOP ML (src/lib/mlScoring.ts)
=================================================================

Crée le fichier src/lib/mlScoring.ts :

Ce module implémente le feedback loop qui fait apprendre Searcher
de tes préférences réelles. Le score de base vient de Gemini —
le score ajusté vient de tes feedbacks accumulés.

export interface UserPreferences {
  preferred_sectors: string[];
  preferred_locations: string[];
  salary_floor: number;
  contract_types: string[];
  rejected_companies: string[];
  disliked_reasons: string[];
}

// Récupère les préférences apprises depuis l'historique feedback
export async function getUserLearnedPreferences(userId: string, supabase: any): Promise<UserPreferences> {
  const { data: feedbacks } = await supabase
    .from('opportunity_feedback')
    .select('*, opportunities(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!feedbacks || feedbacks.length === 0) {
    return {
      preferred_sectors: [],
      preferred_locations: [],
      salary_floor: 0,
      contract_types: [],
      rejected_companies: [],
      disliked_reasons: [],
    };
  }

  const liked = feedbacks.filter((f: any) => f.feedback === 'liked' || f.feedback === 'perfect');
  const rejected = feedbacks.filter((f: any) => f.feedback !== 'liked' && f.feedback !== 'perfect');

  const preferredSectors = [...new Set(liked.map((f: any) => f.opportunities?.source_platform))].filter(Boolean) as string[];
  const preferredLocations = [...new Set(liked.map((f: any) => f.opportunities?.country))].filter(Boolean) as string[];
  const rejectedCompanies = [...new Set(rejected.map((f: any) => f.opportunities?.company))].filter(Boolean) as string[];

  return {
    preferred_sectors: preferredSectors,
    preferred_locations: preferredLocations,
    salary_floor: 0,
    contract_types: [],
    rejected_companies: rejectedCompanies,
    disliked_reasons: rejected.map((f: any) => f.feedback),
  };
}

// Ajuste le score Gemini selon les préférences apprises
export function adjustScore(baseScore: number, opportunity: any, prefs: UserPreferences): number {
  let adjusted = baseScore;

  // Pénalité si l'entreprise a déjà été rejetée
  if (prefs.rejected_companies.includes(opportunity.company)) {
    adjusted -= 25;
  }

  // Bonus si localisation préférée
  if (prefs.preferred_locations.includes(opportunity.country)) {
    adjusted += 10;
  }

  // Pénalité si trop bas salaire par rapport au seuil appris
  if (opportunity.salary_max > 0 && prefs.salary_floor > 0 && opportunity.salary_max < prefs.salary_floor) {
    adjusted -= 15;
  }

  return Math.max(0, Math.min(100, adjusted));
}

=================================================================
ÉTAPE 14 — MISE À JOUR .env (nouvelles variables)
=================================================================

Ajoute dans .env :

VITE_SERPER_API_KEY_1=your_first_serper_key
VITE_SERPER_API_KEY_2=your_second_serper_key
VITE_SERPER_API_KEY_3=your_third_serper_key
VITE_TWITTER_CLIENT_ID=your_twitter_oauth_client_id
VITE_LINKEDIN_CLIENT_ID=your_linkedin_oauth_client_id
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_ENCRYPTION_ENABLED=true

Dans Supabase Edge Functions → Secrets :
GEMINI_API_KEY=your_gemini_key
SERPER_API_KEY=your_serper_key
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

=================================================================
ÉTAPE 15 — MISE À JOUR DE LA NAVIGATION (src/components/layout/Sidebar.tsx)
=================================================================

Ajoute les nouveaux liens dans la sidebar et la bottom tab bar mobile :

--- Nouveaux items sidebar ---

Groupe "OPPORTUNITÉS" :
- 🔍 Recherche Universelle → /dashboard (scroll vers la barre)
- 📋 Mes Opportunités → /opportunities
- 💼 Candidatures → /applications

Groupe "RÉSEAU & AGENTS" :
- 🌐 Feed Social → /feed
- 🤖 Agent Searcher → /agent
- 📅 Entretiens → /entretiens

Groupe "CROISSANCE" (selon le plan) :
- 💰 VC Tracking → /vc-tracking [investor/genius uniquement]
- 🎯 Client Finder → /client-finder [business/investor uniquement]
- 🔗 Mes Comptes → /connected-accounts

Groupe "COMPTE" :
- ⚙️ Paramètres → /settings
- 🔒 Mes Données → /my-data
- 📊 Fondateur → /founder [founder uniquement]

--- Bottom tab bar mobile (5 onglets principaux) ---
🏠 Dashboard | 🔍 Opportunités | 🌐 Feed | 🤖 Agent | 👤 Profil

=================================================================
ÉTAPE 16 — MISE À JOUR DU ROUTEUR (src/App.tsx)
=================================================================

Ajoute les nouvelles routes :

<Route path="/connected-accounts" element={<ConnectedAccounts />} />
<Route path="/vc-tracking" element={<VCTracking />} />
<Route path="/client-finder" element={<ClientFinder />} />
<Route path="/my-data" element={<MyData />} />

Toutes les nouvelles routes nécessitent une authentification.
VCTracking et ClientFinder vérifient le plan avant d'afficher le contenu.

=================================================================
ÉTAPE 17 — COMPARATEUR DE SALAIRES AMÉLIORÉ (src/pages/SalaryComparator.tsx)
=================================================================

Améliore la page existante ou crée-la si absente.

Formulaire :
- Poste / Titre
- Pays / Ville
- Années d'expérience : [0-2] [3-5] [6-10] [10+]
- Secteur

Résultats (via safeSearch) :
Barre de distribution :
Min -----[Médiane]------- Max
$28,000  $45,000        $78,000

3 cards :
[Junior : $28-35k]  [Senior : $45-60k]  [Expert : $65-78k]

Trend arrow : ↑ +8% vs 2024

Source : "Basé sur 47 offres actives analysées par Searcher en temps réel"
(données issues du cache Serper — zéro coût additionnel)

Conseil personnalisé Gemini :
"Avec vos 5 ans d'expérience en marketing digital, vous vous situez
dans la tranche senior. Ne négociez pas en dessous de $42,000."

=================================================================
ÉTAPE 18 — ANALYSE CONCURRENTIELLE AUTOMATIQUE (src/pages/CompetitiveIntel.tsx)
=================================================================

Crée la page src/pages/CompetitiveIntel.tsx :
Accessible depuis le Founder Dashboard uniquement.

Cette page fait ce que le fondateur a demandé :
"À chaque couche validée, tu analyses mes concurrents."

4 sections :

1. "Ce qu'ils font que Searcher doit avoir"
LinkedIn → alertes emploi (Searcher le surpasse : postule seul)
Indeed → salaires (Searcher : temps réel vs historique)
Upwork → contrats automatiques (Couche 5 / V2)

2. "Ce qu'ils font mal — ton avantage"
Aucun ne postule seul
Aucun ne prépare les entretiens automatiquement
Aucun ne fait de VC tracking pour les fondateurs
Aucun n'est Zero-Knowledge

3. "Ce qu'ils n'ont pas du tout"
Agent autonome 24/7
Modèle Orange Merchant
Forced diversification
Genius category
Chiffrement AES-256 côté client

4. "Feature surprise — ce que tu peux lancer en premier"
Audit visuel automatique des entreprises (screenshot + analyse Gemini Vision)
"Cette entreprise a un site web de 2015 — voici comment le moderniser"
→ Envoyé automatiquement à l'entreprise avec proposition Searcher
→ Module 3 du document investisseur — à intégrer en Couche 5

=================================================================
ÉTAPE 19 — ANIMATIONS ET DESIGN (respecter le standard Couche 1)
=================================================================

Couleurs : fond #080808, or #D4AF37, cards #111111
Zéro fond blanc nulle part.
Zéro bouton cassé.
Zéro écran vide.

Nouveaux composants visuels à créer :

1. PulseRing — anneau or qui pulse autour d'une icône "live"
<div className="animate-ping absolute h-full w-full rounded-full bg-gold opacity-20" />

2. SlidePanel — panneau qui glisse depuis la droite
framer-motion : initial={{ x: 500, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
transition={{ type: 'spring', damping: 25, stiffness: 200 }}

3. ScoreGauge — jauge circulaire SVG animée pour le score /100
SVG circle avec stroke-dasharray calculé selon le score
Animation: strokeDashoffset de 0 au score en 1.5s

4. PowerBar — barre de progression "Puissance Searcher"
0-25% → rouge, 26-50% → orange, 51-75% → bleu, 76-100% → or
Label textuel : "Basique" / "Actif" / "Avancé" / "Full Autonome"

5. EncryptedBadge — badge vert "🔒 Chiffré"
Petit badge avec icône cadenas + texte "AES-256"

=================================================================
ÉTAPE 20 — VÉRIFICATION FINALE COUCHE 4
=================================================================

Lance : npm run dev

Vérifie que TOUT fonctionne :
✅ Barre universelle accepte texte, upload PDF, lien URL, voix
✅ Gemini analyse le CV/profil et retourne des questions ciblées
✅ Questions choix multiple s'affichent avec boutons cliquables
✅ Questions réponse ouverte s'affichent avec textarea
✅ Profil complet → recherche lancée automatiquement
✅ Chaque opportunité est cliquable → panneau latéral s'ouvre
✅ Panneau latéral affiche score, jauge animée, raison du match
✅ Alerte visa/passeport visible sur les offres étrangères
✅ Bouton "Pas pour moi" → sauvegarde feedback + score ajusté
✅ Page Mes Comptes → liste des plateformes OAuth
✅ Bouton "Connecter LinkedIn" → popup OAuth s'ouvre
✅ Token OAuth chiffré avant stockage (console.log confirme)
✅ Page Mes Données → liste chiffrée + preuve technique visible
✅ Bouton "Exporter mes données" → télécharge ZIP
✅ Bouton "Supprimer compte" → confirmation "SUPPRIMER" requise
✅ Page VC Tracking → formulaire projet + évaluation Gemini
✅ Calibration investisseur automatique selon le stade du projet
✅ Campagnes VC créées et listées avec placements
✅ Page Client Finder → recherche B2B + résultats avec scores
✅ Pipeline Kanban drag & drop fonctionnel
✅ Comparateur salaires → données temps réel via Serper cache
✅ Cache Serper → 2 recherches identiques = 1 seul appel API
✅ Délai aléatoire entre appels Serper (vérifier dans Network tab)
✅ Rotation clés Serper (log dans console)
✅ Sidebar mise à jour avec tous les nouveaux liens
✅ Bottom tab bar mobile fonctionne
✅ Fond noir #080808 partout — zéro fond blanc
✅ Toutes les animations fluides — score gauge, slide panel, pulse

Lance : npm run build
✅ Build passe sans erreurs

Lance : supabase functions deploy agent-vc-tracker
✅ Edge Function déployée sans erreurs

=================================================================
NOTES POUR OPENHANDS — COUCHE 4
=================================================================

1. La barre universelle est le composant le plus important de cette couche.
   Si elle ne fonctionne pas parfaitement, le reste de la couche ne sert à rien.
   Priorise UniversalSearchBar.tsx et teste chaque type d'input.

2. Le chiffrement AES-256 côté client est OBLIGATOIRE pour les tokens OAuth
   et les documents uploadés. Ne jamais stocker un token OAuth en clair.

3. Le cache Serper est OBLIGATOIRE pour les appels de recherche.
   Chaque appel sans cache = argent dépensé + risque de ban.

4. Le panneau latéral doit être smooth et rapide.
   Utiliser framer-motion spring (pas ease) pour un rendu naturel.

5. Sur mobile, le panneau latéral devient plein écran avec geste swipe
   vers la droite pour fermer.

6. Pour OAuth LinkedIn et Gmail en MVP :
   LinkedIn : utilise LinkedIn OAuth 2.0 avec scope r_liteprofile + r_emailaddress + w_member_social
   Gmail : utilise Google OAuth 2.0 avec scope gmail.readonly + gmail.send
   Les autres plateformes : boutons "Coming soon Q2 2026"

7. La page VC Tracking affiche un message clair si le plan est insuffisant :
   "VC Tracking est réservé au plan Investor ($299/mois) et aux profils Genius.
   [Mettre à niveau →]"

8. Chaque action de la Couche 4 insère dans searcher_logs avec auto_promo_sent = true
   quand applicable (placements VC, recherches B2B).

9. Le footer auto-promo reste sur TOUTES les pages incluant les nouvelles.

10. Erreurs API → card sombre avec message + bouton "Réessayer" — jamais écran blanc.

=================================================================
FIN DU PROMPT COUCHE 4
=================================================================
La Couche 4 est maintenant codée.
Searcher comprend tout — texte, voix, fichiers, liens.
Searcher agit légalement dans tous les comptes autorisés.
Vos données sont illisibles par quiconque, même le fondateur.
Les investisseurs vous découvrent naturellement.
Les clients arrivent vérifiés avec intention d'achat réelle.

Couche 5 = Paiements Stripe complets + webhooks + abonnements
Couche 6 = Analytics avancés + préparation entretien + tracker carrière
Couche 7 = App native React Native + Extension Chrome
Couche 8 = Modèle IA propriétaire Searcher
=================================================================
