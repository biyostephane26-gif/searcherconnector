// =================================================================
// MODÉRATION AUTOMATIQUE SCAI — logique partagée
// Extrait de app/api/social/moderate/route.ts pour être réutilisable
// server-side par la création de post elle-même (voir
// app/api/social/posts/route.ts) — sans ça, la modération n'était
// vérifiée que côté client (CreatePostBox.tsx) avant un insert Supabase
// direct, ce qui la rendait contournable par n'importe qui appelant
// l'API Supabase directement (devtools, script) en sautant l'étape
// /api/social/moderate.
// =================================================================

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_9,
  process.env.GROQ_API_KEY_10,
  process.env.GROQ_API_KEY,
].filter(Boolean) as string[]

export interface ModerationResult {
  approved: boolean
  reason?: string
  category: 'professional' | 'entertainment' | 'political' | 'spam' | 'inappropriate'
  confidence: number
}

export async function moderateWithGroq(content: string, mediaType?: string): Promise<ModerationResult> {
  const prompt = `Tu es SCAI, l'agent de modération de Searcher Connector, un réseau social PROFESSIONNEL pour talents et recruteurs.

MISSION: Analyser ce contenu et déterminer s'il est approprié pour un réseau professionnel.

RÈGLES DE MODÉRATION:
✅ ACCEPTER:
- Annonces d'opportunités professionnelles
- Partage de réussites et achievements
- Insights techniques/professionnels
- Questions professionnelles
- Networking et collaborations
- Partage d'articles/ressources pro

❌ REJETER:
- Mèmes et contenus humoristiques non-pro
- Vidéos de divertissement/danse/sport
- Politique, religion, débats sociétaux
- Spam, publicités non-pro
- Contenu offensant ou inapproprié
- Selfies/photos personnelles non-contextualisées

CONTENU À ANALYSER:
"${content}"
${mediaType ? `Type de média: ${mediaType}` : ''}

RÉPONDS UNIQUEMENT AU FORMAT JSON:
{
  "approved": true/false,
  "reason": "Raison claire en français si refusé",
  "category": "professional/entertainment/political/spam/inappropriate",
  "confidence": 0.0-1.0
}`

  for (const key of GROQ_KEYS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Tu es SCAI, modérateur IA professionnel. Réponds UNIQUEMENT en JSON valide.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 200
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) continue

      const data = await response.json()
      const text = data.choices[0]?.message?.content?.trim()

      if (!text) continue

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue

      const result = JSON.parse(jsonMatch[0])

      return {
        approved: result.approved === true,
        reason: result.reason || undefined,
        category: result.category || 'professional',
        confidence: result.confidence || 0.5
      }
    } catch {
      continue
    }
  }

  return simpleModeration(content)
}

function simpleModeration(content: string): ModerationResult {
  const lower = content.toLowerCase()

  const spamKeywords = ['gagne', 'gratuit', 'clique ici', 'promo', 'viagra', 'casino', 'crypto scam']
  if (spamKeywords.some(kw => lower.includes(kw))) {
    return { approved: false, reason: 'Contenu détecté comme spam', category: 'spam', confidence: 0.8 }
  }

  const politicalKeywords = ['élection', 'président', 'gouvernement', 'parti politique', 'vote']
  if (politicalKeywords.some(kw => lower.includes(kw))) {
    return { approved: false, reason: 'Contenu politique non autorisé sur Searcher Connector', category: 'political', confidence: 0.7 }
  }

  const entertainmentKeywords = ['mdr', 'lol', 'meme', 'tiktok dance', 'challenge', 'prank']
  if (entertainmentKeywords.some(kw => lower.includes(kw))) {
    return { approved: false, reason: 'Contenu de divertissement. Searcher Connector est un réseau professionnel.', category: 'entertainment', confidence: 0.6 }
  }

  const professionalKeywords = ['opportunité', 'job', 'hiring', 'recrutement', 'freelance', 'projet', 'collaboration', 'compétence', 'expérience', 'portfolio']
  if (professionalKeywords.some(kw => lower.includes(kw))) {
    return { approved: true, category: 'professional', confidence: 0.9 }
  }

  return { approved: true, category: 'professional', confidence: 0.5 }
}
