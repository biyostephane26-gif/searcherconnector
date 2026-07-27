// =================================================================
// SIGNAL DE TYPE — freelance vs emploi vs investisseur vs entreprise
// =================================================================
// Détecte si le TEXTE d'une opportunité (titre+description) correspond
// au TYPE de profil de l'utilisateur (profile_type), via des mots
// positifs/négatifs dans le texte — les sources scrapées n'exposent
// presque jamais un champ structuré "type", donc c'est une heuristique
// de texte (probabiliste, pas une garantie absolue), mais elle pénalise
// activement les faux-matchs plutôt que de les ignorer.
//
// Extrait de scan.ts (scoreLocally) pour être partagé avec cache-scan/
// route.ts (matchAndNotify) — avant ce fichier, seul le scan LIVE
// utilisateur appliquait ce filtre ; le pipeline de fond qui envoie les
// notifications push/email ignorait complètement le type de profil.
//
// CORRECTIF 2026-07-24 : un vrai compte freelance (le fondateur)
// recevait quasiment QUE des offres CDI classiques ("Senior Security
// Engineer", "Senior Data Analyst"...) malgré ce filtre. Cause : les
// mots positifs freelance ('remote', 'hiring', 'project', 'looking for')
// sont tout aussi présents dans une offre CDI normale — aucun pouvoir
// discriminant — pendant que la liste négative ne visait que du texte
// rédigé PAR un candidat freelance ("i'm a...", "hire me"), jamais le
// vocabulaire qu'un EMPLOYEUR utilise pour un poste permanent (benefits,
// 401k, PTO, etc.). Un CDI classique ne perdait donc quasiment jamais de
// points. Refonte : POS resserré sur des signaux vraiment spécifiques au
// freelance, NEG étoffé avec le vocabulaire d'annonce CDI côté employeur,
// et ajout d'une exclusion dure (pas juste un malus) quand le texte est
// sans ambiguïté un poste permanent classique.
// =================================================================

const POS: Record<string, string[]> = {
  freelance:  ['freelance', 'freelancer', 'contract role', 'contract position', 'independent contractor', 'short-term project', 'short term contract', 'mission ponctuelle', 'mission freelance', 'gig', '[hiring]', 'hourly rate', 'per hour', 'day rate', 'budget:', 'part-time contract', '1099', 'sous-traitance', 'prestataire', 'freelance mission'],
  job_seeker: ['job', 'hiring', 'position', 'role', 'career', 'apply', 'recruitment', 'emploi', 'poste', 'cdi', 'cdd', 'stage', 'internship', 'vacancy', 'full-time', 'permanent'],
  investor:   ['startup', 'funding', 'investment', 'seed', 'series', 'venture', 'raise', 'financement', 'levée', 'pitch', 'fundraising', 'raising', 'founder', 'pre-seed', 'series a'],
  business:   ['client', 'b2b', 'partner', 'outsource', 'service', 'agency', 'need', 'vendor', 'provider', 'looking for', 'needs'],
}

const NEG: Record<string, string[]> = {
  freelance: [
    '[for hire]', 'i am a ', "i'm a ", 'my portfolio', 'available for hire', 'looking for work', 'hire me', 'my rate is',
    // Vocabulaire d'annonce CDI classique, côté EMPLOYEUR — c'est ça qui
    // manquait : sans ces signaux, une offre CDI standard ne perdait
    // presque jamais de points face à un profil freelance.
    'full-time', 'full time employee', 'permanent position', 'permanent role', 'permanent employee',
    'cdi permanent', 'staff engineer', 'full-time employee', 'w-2', 'w2 employee', 'salaried position',
    'benefits package', 'health insurance', 'dental insurance', 'paid time off', ' pto ', '401(k)', '401k',
    'equity compensation', 'stock options', 'relocation assistance', 'background check required',
    'employment type: full-time', 'join our team as', 'permanent staff', 'exempt employee', 'annual salary',
    'salary range', 'reports to the', 'employee benefits',
  ],
  job_seeker: ['[for hire]', 'freelance mission', 'i am looking for work', 'independent contractor', 'hourly rate', '1099'],
  investor:   ['job posting', 'apply now', '[for hire]', 'cdi', 'cdd', 'hiring', 'position'],
  business:   ['[for hire]', 'looking for work', 'my cv', 'my resume'],
}

// Signaux SANS AMBIGUÏTÉ d'un poste CDI classique côté employeur — si ≥2
// de ces marqueurs forts sont présents pour un profil freelance, on
// exclut l'offre plutôt que de simplement pénaliser son score (un simple
// malus ne suffisait pas en pratique : ces offres remontaient quand même
// via d'autres signaux de domaine).
const STRONG_FULLTIME_MARKERS = [
  'full-time', 'full time employee', 'permanent position', 'permanent role', 'w-2', 'w2 employee',
  'benefits package', 'health insurance', 'paid time off', '401(k)', '401k', 'salaried position',
  'relocation assistance', 'employment type: full-time', 'annual salary', 'employee benefits',
]

// Score signé à ajouter/soustraire au score global : +8/signal positif,
// -30/signal négatif détecté.
export function typeMatchDelta(profileType: string | null | undefined, text: string): number {
  const type = profileType || 'freelance'
  const pos = POS[type] || []
  const neg = NEG[type] || []
  const hay = text.toLowerCase()
  let delta = 0
  delta += Math.min(pos.filter(w => hay.includes(w)).length * 8, 25)
  delta -= neg.filter(w => hay.includes(w)).length * 30
  return delta
}

// Exclusion dure — utilisée en plus de typeMatchDelta, pas à la place :
// pour un profil freelance, une offre avec ≥2 marqueurs CDI forts est
// sans ambiguïté un poste permanent, jamais une mission freelance.
export function isHardTypeMismatch(profileType: string | null | undefined, text: string): boolean {
  if ((profileType || 'freelance') !== 'freelance') return false
  const hay = text.toLowerCase()
  const hits = STRONG_FULLTIME_MARKERS.filter(w => hay.includes(w)).length
  return hits >= 2
}

// CORRECTIF 2026-07-27 : les deux marqueurs textuels ci-dessus ne suffisent
// pas quand la source ne fournit qu'un titre + un snippet tronqué (RSS,
// site:) — le texte scrapé ne contient presque jamais "401(k)" ou "benefits
// package", même quand l'offre originale en ligne les contient. Résultat
// vérifié en prod : un profil freelance recevait ~80% de titres CDI classiques
// ("Senior Data Analyst", "Senior Director, Sales- West"...) malgré le filtre
// texte. Le signal réellement fiable n'est pas dans le texte de l'offre mais
// dans la SOURCE elle-même : un board généraliste (JOB_BOARDS, ATS_COMPANIES,
// NICHE_PLATFORMS...) publie quasi exclusivement du CDI, une plateforme
// freelance (FREELANCE_PLATFORMS, GLOBAL_FREELANCE) quasi exclusivement des
// missions. Exclusion dure basée sur la CATÉGORIE de la source, en plus du
// filtre texte existant (qui reste utile pour les sources 'mixed').
export function isSourceCategoryMismatch(profileType: string | null | undefined, sourceCategory: string | null | undefined): boolean {
  if ((profileType || 'freelance') !== 'freelance') return false
  return sourceCategory === 'job'
}
