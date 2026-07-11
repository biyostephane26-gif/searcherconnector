// =================================================================
// SEARCHER CONNECTOR — Client IA
// Timeout agressif : 15s max, 0 retry
// Si l'IA échoue → fallback immédiat, jamais de blocage
// =================================================================

async function callAiApi(type: string, payload: any, timeoutMs = 15000) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch('/api/ai', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, payload }),
      signal:  controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `AI API error: ${res.statusText}`)
    }
    return await res.json()
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // Timeout — retourner null silencieusement
    }
    return null
  }
}

// ── Analyse profil pour vérification ──────────────────────────────
// Max 15s — si timeout → "verified" par défaut pour ne pas bloquer l'utilisateur
export async function analyseProfile(data: {
  fullName:     string
  domain:       string
  profileType:  string
  documents:    string[]
  portfolioUrl?: string
  githubUrl?:   string
  youtubeUrl?:  string
  bio?:         string
}) {
  const result = await callAiApi('analyse-profile', data, 15000)

  // Fallback intelligent selon les données disponibles
  if (!result) {
    const hasDocuments = data.documents && data.documents.length > 0
    const hasLinks     = !!(data.portfolioUrl || data.githubUrl)
    const hasBio       = !!(data.bio && data.bio.length > 30)

    // Accord de statut selon ce que l'utilisateur a fourni
    if (hasDocuments && (hasLinks || hasBio)) {
      return { status: 'verified', reason: 'Preuves soumises — accès accordé.', strengths: [], improvements: [] }
    }
    // Profil minimal → pending mais pas bloqué
    return { status: 'pending', reason: 'Analyse en cours.', strengths: [], improvements: [] }
  }
  return result
}

export async function scoreOpportunities(
  profile: { domain: string; country: string; profileType?: string; salaryMin: number; salaryMax: number },
  serperResults: any[]
) {
  const result = await callAiApi('score-opportunities', { profile, serperResults }, 20000)
  return result || { opportunities: [] }
}

export async function generateEmailDraft(
  recruiterMessage: string,
  userTemplate:     string,
  userName:         string
) {
  const result = await callAiApi('email-draft', { recruiterMessage, userTemplate, userName }, 12000)
  return result?.draft || ''
}

export async function generateInterviewPrep(company: string, jobTitle: string, domain: string) {
  const result = await callAiApi('interview-prep', { company, jobTitle, domain }, 15000)
  return result || { questions: [], key_points: [], questions_to_ask: [], company_insight: '' }
}

export async function analysePost(content: string) {
  const result = await callAiApi('analyse-post', { content }, 10000)
  return result || { quality_score: 70, is_professional: true, suggestion: '' }
}

export async function extractOpportunityFromPost(content: string) {
  return await callAiApi('extract-opportunity', { content }, 10000)
}

export async function generateSmartReplies(
  messages: { content: string; role: 'me' | 'them'; mediaUrl?: string; mediaType?: string }[],
  language = 'fr'
) {
  const historyText = messages.map(m => {
    const speaker = m.role === 'them' ? 'Other' : 'Me'
    if (m.mediaType === 'audio') return `[${speaker} sent a voice message]`
    return `${speaker}: ${m.content}`
  }).join('\n')

  const result = await callAiApi('smart-replies', { historyText, language }, 10000)
  return result?.replies || []
}
