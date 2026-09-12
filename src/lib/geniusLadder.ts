// Échelle unique Junior → Genius (missions complétées + badge Genius fondateur).
export type GeniusTier = 'junior' | 'confirmed' | 'senior' | 'genius'

export function getProfessionalLevel(missionsCount: number = 0, verificationStatus?: string) {
  if (verificationStatus === 'genius' || missionsCount >= 25) {
    return { key: 'genius' as GeniusTier, label: 'Genius', color: 'text-[#D4AF37] bg-[#1A1500] border-[#D4AF37]/40' }
  }
  if (missionsCount >= 10) {
    return { key: 'senior' as GeniusTier, label: 'Senior', color: 'text-blue-400 bg-blue-900/30 border-blue-700/30' }
  }
  if (missionsCount >= 3) {
    return { key: 'confirmed' as GeniusTier, label: 'Confirmé', color: 'text-green-400 bg-green-900/30 border-green-700/30' }
  }
  return { key: 'junior' as GeniusTier, label: 'Junior', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' }
}

export function getNextLevelProgress(missionsCount: number = 0, verificationStatus?: string) {
  if (verificationStatus === 'genius' || missionsCount >= 25) {
    return { current: missionsCount, next: null, remaining: 0, label: 'Niveau Genius atteint' }
  }
  if (missionsCount >= 10) {
    return { current: missionsCount, next: 25, remaining: 25 - missionsCount, label: `Encore ${25 - missionsCount} missions pour Genius` }
  }
  if (missionsCount >= 3) {
    return { current: missionsCount, next: 10, remaining: 10 - missionsCount, label: `Encore ${10 - missionsCount} missions pour Senior` }
  }
  return { current: missionsCount, next: 3, remaining: 3 - missionsCount, label: `Encore ${3 - missionsCount} missions pour Confirmé` }
}
