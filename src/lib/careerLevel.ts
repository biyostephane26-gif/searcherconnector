// =================================================================
// Échelle de statut unique : Junior → Confirmé → Senior → Genius
// =================================================================
// Basée sur missions_completed. Le badge verification_status='genius'
// attribué par le fondateur donne directement le statut Genius.

export interface CareerLevel {
  key: 'junior' | 'confirme' | 'senior' | 'genius'
  label: string
  color: string
}

const LEVELS: (CareerLevel & { min: number })[] = [
  { key: 'junior',   label: 'Junior',   min: 0,  color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' },
  { key: 'confirme', label: 'Confirmé', min: 3,  color: 'text-green-400 bg-green-900/30 border-green-700/30' },
  { key: 'senior',   label: 'Senior',   min: 10, color: 'text-blue-400 bg-blue-900/30 border-blue-700/30' },
  { key: 'genius',   label: 'Genius',   min: 25, color: 'text-[#D4AF37] bg-[#D4AF37]/15 border-[#D4AF37]/40' },
]

export function getCareerLevel(missions: number = 0, verificationStatus?: string | null): CareerLevel {
  if (verificationStatus === 'genius') return LEVELS[3]
  return [...LEVELS].reverse().find(l => missions >= l.min) || LEVELS[0]
}

export function getNextLevelProgress(missions: number = 0, verificationStatus?: string | null) {
  const current = getCareerLevel(missions, verificationStatus)
  const idx = LEVELS.findIndex(l => l.key === current.key)
  const next = LEVELS[idx + 1]
  if (!next) return { current: missions, next: null, remaining: 0, label: 'Statut Genius atteint' }
  const remaining = Math.max(0, next.min - missions)
  return {
    current: missions,
    next: next.min,
    remaining,
    label: `Tu es à ${remaining} mission${remaining > 1 ? 's' : ''} de passer ${next.label}`,
  }
}
