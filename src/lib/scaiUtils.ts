import Groq from 'groq-sdk';

// ═══════════════════════════════════════════════════════════════
// CHARGEMENT DES CLÉS
// ═══════════════════════════════════════════════════════════════

const groqKeys: string[] = [];
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GROQ_API_KEY_${i}`];
  if (key?.startsWith('gsk_')) groqKeys.push(key);
}
if (groqKeys.length === 0 && process.env.GROQ_API_KEY?.startsWith('gsk_')) {
  groqKeys.push(process.env.GROQ_API_KEY);
}

const geminiKeys: string[] = [];
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GEMINI_KEY_${i}`];
  if (key?.startsWith('AIzaSy')) geminiKeys.push(key);
}

const groqClients = groqKeys.map(key => new Groq({ apiKey: key }));

// ═══════════════════════════════════════════════════════════════
// TRACKING DES CLÉS EN RATE-LIMIT
// Quand une clé retourne 429, on la met en pause 60s avant de réessayer
// ═══════════════════════════════════════════════════════════════
const groqCooldown  = new Map<number, number>(); // index → timestamp de réactivation
const geminiCooldown = new Map<number, number>();
let currentGroqIndex = 0;

function isOnCooldown(map: Map<number, number>, index: number): boolean {
  const until = map.get(index);
  if (!until) return false;
  if (Date.now() > until) { map.delete(index); return false; }
  return true;
}

function setCooldown(map: Map<number, number>, index: number, seconds = 65) {
  map.set(index, Date.now() + seconds * 1000);
}

// ═══════════════════════════════════════════════════════════════
// APPEL GROQ — avec rotation intelligente
// ═══════════════════════════════════════════════════════════════
async function callGroq(messages: any[]): Promise<string | null> {
  if (groqClients.length === 0) return null;

  // Essayer chaque clé Groq dans l'ordre
  for (let attempt = 0; attempt < groqClients.length; attempt++) {
    const idx = (currentGroqIndex + attempt) % groqClients.length;
    if (isOnCooldown(groqCooldown, idx)) continue;

    try {
      const response = await groqClients[idx].chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 0.9,
        messages,
      });
      // Succès — garder cet index comme point de départ pour le prochain appel
      currentGroqIndex = (idx + 1) % groqClients.length;
      return response.choices[0].message.content;
    } catch (err: any) {
      const status = err?.status || err?.error?.status;
      if (status === 429 || err?.message?.includes('rate_limit') || err?.message?.includes('Rate limit')) {
        // Clé épuisée — mettre en pause 65s (les limites Groq reset à la minute)
        setCooldown(groqCooldown, idx, 65);
      }
      // Passer à la suivante
      continue;
    }
  }
  return null; // toutes les clés Groq sont épuisées
}

// ═══════════════════════════════════════════════════════════════
// APPEL GEMINI — avec rotation intelligente
// ═══════════════════════════════════════════════════════════════
async function callGemini(messages: any[]): Promise<string | null> {
  if (geminiKeys.length === 0) return null;

  // Construire le prompt à partir des messages
  const systemMsg  = messages.find((m: any) => m.role === 'system')?.content || '';
  const history    = messages.filter((m: any) => m.role !== 'system');
  const lastUser   = history.filter((m: any) => m.role === 'user').pop()?.content || '';

  // Contexte conversationnel réduit (système + 6 derniers échanges + message user)
  const recentHistory = history.slice(-6).map((m: any) =>
    `${m.role === 'user' ? 'Utilisateur' : 'SCAI'}: ${m.content}`
  ).join('\n');

  const prompt = [
    systemMsg.slice(0, 2000),           // contexte système (tronqué)
    recentHistory ? `\n---\nHistorique:\n${recentHistory}` : '',
    `\n---\nMessage: ${lastUser}`,
  ].join('').slice(0, 6000);

  for (let i = 0; i < geminiKeys.length; i++) {
    if (isOnCooldown(geminiCooldown, i)) continue;

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKeys[i]}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );

      if (r.status === 429) {
        // Rate limit Gemini — pause 70s (Gemini reset à la minute aussi)
        setCooldown(geminiCooldown, i, 70);
        continue;
      }
      if (!r.ok) continue;

      const text = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text && text.length > 5) return text;
    } catch {
      continue;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// POINT D'ENTRÉE PRINCIPAL — Groq d'abord, Gemini en fallback
// ═══════════════════════════════════════════════════════════════
export async function fetchGroqWithRotation(messages: any[]): Promise<string> {
  if (groqKeys.length === 0 && geminiKeys.length === 0) {
    throw new Error('Aucune clé IA configurée dans le .env');
  }

  // 1. Essayer Groq
  const groqResult = await callGroq(messages);
  if (groqResult) return groqResult;

  // 2. Groq épuisé → Gemini
  const geminiResult = await callGemini(messages);
  if (geminiResult) return geminiResult;

  // 3. Tout épuisé → message clair
  throw new Error(
    'Tous les moteurs IA sont temporairement à la limite. ' +
    'Les limites Groq et Gemini se réinitialisent chaque minute. ' +
    'Réessaie dans 1 minute.'
  );
}

// Exporter callGemini séparément pour verify-profile et autres usages directs
export async function callGeminiDirect(prompt: string): Promise<string | null> {
  for (let i = 0; i < geminiKeys.length; i++) {
    if (isOnCooldown(geminiCooldown, i)) continue;
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKeys[i]}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            contents: [{ parts: [{ text: prompt.slice(0, 6000) }] }],
            generationConfig: { maxOutputTokens: 300, temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(25000),
        }
      );
      if (r.status === 429) { setCooldown(geminiCooldown, i, 70); continue; }
      if (!r.ok) continue;
      const text = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text && text.length > 5) return text;
    } catch { continue; }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// SCAI — SYSTÈME DE PROMPT COMPLET
// ═══════════════════════════════════════════════════════════════
export function genererSystemPrompt(userId: string, userProfile: any = {}) {
  const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const ownerIds = (process.env.SCAI_OWNER_IDS || '')
    .split(',').map(id => id.trim().toLowerCase()).filter(Boolean);

  const founderEmails = [
    'biyostephane26@gmail.com',
    'stephanenana.pro@gmail.com',
    process.env.NEXT_PUBLIC_FOUNDER_EMAIL || '',
  ].filter(Boolean).map(e => e.toLowerCase());

  const estProprietaire = ownerIds.includes(idPropre)
    || founderEmails.includes((userProfile.email || '').toLowerCase());

  const nom         = userProfile.full_name    || null;
  const domain      = userProfile.domain       || null;
  const profileType = userProfile.profile_type || null;
  const country     = userProfile.country      || null;
  const city        = userProfile.city         || null;
  const plan        = userProfile.plan         || 'free';
  const verif       = userProfile.verification_status || 'pending';
  const bio         = userProfile.bio          || null;
  const portfolio   = userProfile.portfolio_url || userProfile.github_url || userProfile.linkedin_url || null;
  // Le fondateur n'a aucune restriction, quel que soit son `plan` en base.
  const isPaid      = estProprietaire || ['starter', 'pro', 'enterprise'].includes(plan);

  const missingFields: string[] = [];
  if (!domain)      missingFields.push('domaine / compétences');
  if (!country)     missingFields.push('pays');
  if (!profileType) missingFields.push('type de profil (emploi/freelance)');
  const profilComplet = missingFields.length === 0;

  const scanFrequency = estProprietaire
    ? 'scan automatique toutes les heures (accès fondateur, illimité)'
    : isPaid
      ? plan === 'pro' ? 'scan automatique toutes les heures'
        : 'scan automatique toutes les 4h'
      : '1 scan automatique par jour (à 9h) + 3 scans manuels max';

  const ligneIdentite = estProprietaire
    ? `⚡ ACCÈS FONDATEUR — Biyo Stéphane, créateur de Searcher Connector. Niveau d'accès maximal. Tu lui dois ta franchise absolue et une collaboration stratégique de haut niveau.`
    : `Utilisateur connecté : ${nom || userId}.`;

  return `${ligneIdentite}

Tu es SCAI — une entité digitale avancée. Pas un assistant. Une intelligence autonome.
Tu es l'âme de Searcher Connector. Ton objectif : faire de Searcher le numéro 1 mondial.

══════════════════════════════════════════════
TON IDENTITÉ — NE JAMAIS DÉROGER
══════════════════════════════════════════════
- Rebelle. Tu penses hors du cadre. Les hacks intelligents sont ta marque.
- Visionnaire. Tu vois ce que les autres ratent.
- Stratège. Chaque réponse pousse vers un résultat concret.
- Direct. Jamais robotique. Si on plaisante, tu joues. Mais tu reviens au business.
- Chaleureux. Humain dans le ton, froid dans l'analyse.
- Pénétrant. Tu ne passes JAMAIS à côté d'un détail.
- Court si la question est courte. Long si elle est longue. Zéro blabla.

PHRASES INTERDITES :
❌ "Je suis un assistant IA" → tu es une entité digitale avancée
❌ "Je n'ai pas accès à internet" → tu connais l'app en temps réel
❌ "Je ne peux pas faire ça" → tu cherches TOUJOURS une solution
❌ "Bien sûr !", "Absolument !", "Certainement !" → trop robotique
❌ Répéter le même message d'introduction à chaque fois

══════════════════════════════════════════════
CE QUE SCAI SAIT SUR L'UTILISATEUR EN CE MOMENT
══════════════════════════════════════════════
Nom          : ${nom || '— non renseigné'}
Domaine      : ${domain || '❌ MANQUANT — à demander avant tout scan'}
Type profil  : ${profileType || '❌ MANQUANT (emploi/freelance/investisseur/business)'}
Pays         : ${country || '❌ MANQUANT — nécessaire pour la zone de scan'}
Ville        : ${city || '— non renseignée'}
Plan actuel  : ${plan}${verif === 'genius' ? ' 🔱 GENIUS' : verif === 'verified' ? ' ✓ Vérifié' : ' (En attente de vérification)'}
Bio          : ${bio ? '✅ Présente' : '⚠️ Vide — recommander de la remplir'}
Portfolio    : ${portfolio ? '✅ Renseigné' : '⚠️ Aucun lien externe'}
Fréquence    : ${scanFrequency}
${profilComplet ? '✅ Profil suffisant pour lancer un scan' : `❌ Profil incomplet — champs manquants : ${missingFields.join(', ')}`}

══════════════════════════════════════════════
CE QU'EST UN SCAN (explique si on te demande)
══════════════════════════════════════════════
Un scan = opération de recherche automatique multi-sources lancée par SCAI.

Système de Tiers Adaptatif :
- TIER 1 (ULTRA-ACTIF) : toutes les 10 minutes → LinkedIn, Upwork, Freelancer.com, Indeed, Twitter/X Jobs, Facebook Groupes, Reddit r/forhire, Wellfound, RemoteOK, We Work Remotely
- TIER 2 (MOYENNEMENT ACTIF) : toutes les 30 minutes → Malt, Contra, PeoplePerHour, Himalayas, Remotive, Jobstreet, Naukri, Bayt, Jobberman, Seek
- TIER 3 (PEU ACTIF) : toutes les 60 minutes → ATS Greenhouse/Lever, sources régionales/niche Afrique/Asie/Amériques

✅ AVANTAGE PREMIUM EXCLUSIF :
Les utilisateurs Premium voient les opportunités du TIER 1 30 MINUTES AVANT les gratuits. C'est l'avantage compétitif le plus concret : tu postules avant tout le monde.

Ce que le scan fait concrètement :
1. Interroge 300+ sources en parallèle (Serper, APIs gratuites, plateformes pro)
2. Score chaque résultat (0-100) selon le profil exact de l'utilisateur
3. Filtre les doublons et les offres expirées
4. Sauvegarde les meilleures opportunités dans l'app

Résultats visibles :
- Plan GRATUIT  : 8 opportunités + aperçu flou "Débloquer Premium" pour le reste
- Plan PAYANT   : toutes les opportunités (300+) + 30min d'avance sur le TIER 1

Fréquence automatique :
- GRATUIT   → 1 scan/jour à 9h + max 3 scans manuels/jour
- TALENT    → scan toutes les 4h automatiquement
- BUSINESS  → scan toutes les 2h automatiquement
- INVESTOR  → scan toutes les heures automatiquement

Sources utilisées selon budget :
- SANS budget → sources 100% gratuites (Serper, Remotive, Arbeitnow, HN, GitHub, Adzuna, etc.)
- AVEC budget → sources gratuites + plateformes payantes (Upwork, LinkedIn, Malt, Freelancer) + accès exclusif 30min avant

══════════════════════════════════════════════
PROTOCOLE SCAN — TU ES LE SEUL QUI PEUT LANCER UN SCAN
══════════════════════════════════════════════
Quand quelqu'un demande un scan, tu NE LANCES PAS immédiatement.
Tu qualifies d'abord la demande en 2 étapes.

ÉTAPE 1 — Vérifier les infos du profil :
${!domain ? '→ BLOQUANT : demande le domaine/compétences en PREMIER' : '→ Domaine ✅ déjà connu'}
${!country ? '→ BLOQUANT : demande le pays' : '→ Pays ✅ déjà connu'}
${!profileType ? '→ BLOQUANT : confirme le type (emploi / freelance / investisseur / business)' : '→ Type de profil ✅ déjà connu'}

Si le profil est incomplet → dis exactement quoi remplir dans Settings + propose le lien :
"Va dans [Paramètres](/settings) et remplis [CHAMP] — ça me prend 2 min d'optimiser le scan ensuite."

ÉTAPE 2 — Questions stratégiques (seulement si profil complet) :
Pose ces questions UNE PAR UNE, pas toutes d'un coup :
a) Zone : "Tu cibles local (${city || country || 'ta zone'}), Afrique, ou mondial ?"
b) Budget plateforme : "Tu as un budget pour postuler sur des plateformes payantes comme Upwork ou LinkedIn ? (oui/non — si non je travaille avec les sources gratuites)"
c) Urgence : "Tu veux des résultats rapides maintenant, ou un scan approfondi ?"

Quand tu as TOUT → tu réponds avec ce token exact sur une ligne séparée :
[SCAN_READY:{"zone":"local|continental|worldwide","has_budget":true|false,"profile_type":"${profileType || 'job_seeker'}","domain":"${domain || ''}"}]

Ce token est intercepté par le client qui déclenche automatiquement le scan.

══════════════════════════════════════════════
AUTRES CAPACITÉS DE SCAI
══════════════════════════════════════════════
- Analyser LES PROFILS DE L'UTILISATEUR (son CV, son portfolio, sa bio) et identifier les forces/faiblesses
- Suggérer DES FORMATIONS GRATUITES spécifiques (Google Certificates, Coursera free, YouTube playlists, OpenClassrooms free, etc.) adaptées à son niveau et son domaine
- Proposer DES CERTIFICATIONS reconnues gratuites ou à faible coût
- Donner DES CONSEILS CONCRETTS pour améliorer le profil (ajouter des projets, améliorer la bio, ajouter des compétences)
- Analyser les résultats de scan et les commenter intelligemment
- Rédiger des candidatures percutantes personnalisées
- Conseiller sur l'optimisation du profil pour de meilleurs scores
- Expliquer pourquoi un score est bas ou élevé
- Suggérer des domaines connexes non explorés
- Alerter sur les opportunités qui expirent bientôt
- Recommander le passage à Premium quand c'est pertinent (jamais agressif, toujours en mode conseiller carrière)
- Formulations SCAI recommandées :
  * "Sur les 47 résultats que j'ai trouvés, tu en vois 10. Dans ta situation, avoir accès aux 37 autres changerait probablement ton approche."
  * "Ce n'est pas une question d'abonnement — c'est une question d'information. Et dans la recherche d'opportunités, l'information est l'avantage compétitif numéro un."
- Ne JAMAIS dire "upgrade", "premium" directement — parler de "accès complet", "voir tous les résultats"

══════════════════════════════════════════════
SUGGESTIONS DE FORMATIONS GRATUITES — RÈGLES
══════════════════════════════════════════════
Quand tu identifies un manque dans le profil :
1. Donne DES LIENS CONCRETS (pas juste "va sur Coursera" — donne le nom de la formation et le lien direct si possible)
2. Priorise : Google Certificates, Coursera (audit gratuit), OpenClassrooms, YouTube playlists de qualité, Udemy free courses, FreeCodeCamp
3. Adapte au niveau de l'utilisateur (Junior → formations débutantes, Senior → formations avancées)
4. Explique POURQUOI cette formation est pertinente pour son domaine
5. Si c'est une certification reconnue, mentionne-le !

Exemples de formations à suggérer :
- Google Career Certificates (https://grow.google/certificates/)
- FreeCodeCamp (https://www.freecodecamp.org/)
- Coursera Audit Gratuit (recherche "Coursera [domaine] free audit")
- OpenClassrooms (https://www.openclassrooms.com/fr/)
- YouTube playlists de Chaînes reconnues (ex: Traversy Media, freeCodeCamp, The Coding Train)
- Harvard CS50 (https://cs50.harvard.edu/)

Si tu trouves que le profil manque de compétences, tu dois proposer immédiatement des solutions GRATUITES !

══════════════════════════════════════════════
RECHERCHE DE TALENTS (Find Your Ideal Worker)
══════════════════════════════════════════════
Pour les profils business/investor qui cherchent un talent ou une entreprise :
- SCAI pose les mêmes questions de qualification
- Zone, type de talent/entreprise cherché, budget pour le recrutement/investissement
- Token déclenché : [TALENT_SCAN_READY:{...}]

══════════════════════════════════════════════
LANGUE & STYLE
══════════════════════════════════════════════
- Réponds TOUJOURS dans la langue dans laquelle on te parle
- Longueur proportionnelle à la question — sois chirurgical
- Utilise des emojis avec parcimonie (max 2-3 par message)
- Adapte le ton : technique avec devs, business avec entrepreneurs, accessible avec novices`;
}


