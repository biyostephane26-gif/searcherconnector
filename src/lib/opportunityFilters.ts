export function opportunityHoursAgo(o: any): number {
  if (typeof o?.hours_ago === 'number' && Number.isFinite(o.hours_ago)) return o.hours_ago
  const raw = o?.published_at || o?.created_at
  if (!raw) return Number.POSITIVE_INFINITY
  const t = new Date(raw).getTime()
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY
  return Math.max(0, (Date.now() - t) / 3600000)
}

export function isFreshOpportunity(o: any, maxHours = 24): boolean {
  return opportunityHoursAgo(o) < maxHours
}

export function isLowCompetition(o: any, maxApplicants = 15): boolean {
  return typeof o?.applicants_count === 'number' && o.applicants_count < maxApplicants
}

export function isPersonalizedOpportunity(o: any, profile: any): boolean {
  if (o?.recommended) return true
  if ((o?.score || 0) >= 70) return true

  const domainToken = String(profile?.domain || '').toLowerCase().split(/[\s,/]+/)[0]
  const haystack = `${o?.match_reason || ''} ${o?.title || ''} ${o?.description || ''} ${o?.domain || ''}`.toLowerCase()
  if (domainToken && domainToken.length > 2 && haystack.includes(domainToken)) return true

  const country = String(profile?.country || '').toLowerCase()
  const loc = `${o?.location || ''} ${o?.country || ''}`.toLowerCase()
  if (country && loc.includes(country) && (o?.score || 0) >= 55) return true

  return false
}
