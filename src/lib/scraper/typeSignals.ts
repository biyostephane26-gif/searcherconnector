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
// =================================================================

const POS: Record<string, string[]> = {
  freelance:  ['freelance', 'contract', 'mission', 'project', 'remote', 'hiring', 'looking for', 'need a', 'budget', 'pay', 'hire', 'gig', '[hiring]', 'urgent', 'developer needed', 'designer needed'],
  job_seeker: ['job', 'hiring', 'position', 'role', 'career', 'apply', 'recruitment', 'emploi', 'poste', 'cdi', 'cdd', 'stage', 'internship', 'vacancy'],
  investor:   ['startup', 'funding', 'investment', 'seed', 'series', 'venture', 'raise', 'financement', 'levée', 'pitch', 'fundraising', 'raising', 'founder', 'pre-seed', 'series a'],
  business:   ['client', 'b2b', 'partner', 'outsource', 'service', 'agency', 'need', 'vendor', 'provider', 'looking for', 'needs'],
}

const NEG: Record<string, string[]> = {
  freelance:  ['[for hire]', 'i am a ', "i'm a ", 'my portfolio', 'available for hire', 'looking for work', 'hire me', 'my rate is', 'cdi permanent', 'staff engineer', 'full-time employee'],
  job_seeker: ['[for hire]', 'freelance mission', 'i am looking for work'],
  investor:   ['job posting', 'apply now', '[for hire]', 'cdi', 'cdd', 'hiring', 'position'],
  business:   ['[for hire]', 'looking for work', 'my cv', 'my resume'],
}

// Score signé à ajouter/soustraire au score global : +8/signal positif,
// -30/signal négatif détecté (un CDI classique perd nettement des points
// face à un profil freelance, sans être totalement exclu si d'autres
// signaux du domaine sont forts).
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
