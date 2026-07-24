// =================================================================
// Complétion de profil — calcul LIVE, jamais une valeur figée en base.
// =================================================================
// Avant : Sidebar lisait `profile.profile_completion`, une colonne écrite
// UNE SEULE FOIS à la fin de l'onboarding (Onboarding.tsx) et jamais
// recalculée après — un utilisateur qui complétait son profil plus tard
// (bio, portfolio, doc...) restait bloqué sur un vieux pourcentage figé,
// alors que Profile.tsx calculait déjà correctement en direct (7 critères
// réels). Les deux affichaient des chiffres différents et incohérents.
// Ce fichier centralise LE calcul réel, utilisé partout.
// =================================================================

export interface ProfileCompletionInput {
  avatar_url?: string | null
  full_name?: string | null
  bio?: string | null
  domain?: string | null
  country?: string | null
  portfolio_url?: string | null
  github_url?: string | null
  linkedin_url?: string | null
}

export function computeProfileCompletion(profile: ProfileCompletionInput | null | undefined, hasDocs: boolean) {
  const items = [
    { label: 'Photo de profil',          done: !!profile?.avatar_url },
    { label: 'Nom complet',              done: !!profile?.full_name },
    { label: 'Bio professionnelle',      done: (profile?.bio?.length || 0) >= 50 },
    { label: 'Domaine / Compétences',    done: !!profile?.domain },
    { label: 'Pays & Ville',             done: !!profile?.country },
    { label: 'Lien portfolio / GitHub',  done: !!(profile?.portfolio_url || profile?.github_url || profile?.linkedin_url) },
    { label: 'Document de vérification', done: hasDocs },
  ]
  const done = items.filter(i => i.done).length
  const total = items.length
  const percent = Math.round((done / total) * 100)
  return { items, done, total, percent }
}
