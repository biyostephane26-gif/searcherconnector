// =================================================================
// MODÉRATION AUTOMATIQUE SCAI
// Analyse le contenu avant publication
// Rejette: mèmes, vidéos divertissement, politique, contenu non-pro
// =================================================================

import { NextRequest, NextResponse } from 'next/server'

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_9,
  process.env.GROQ_API_KEY_10,
  process.env.GROQ_API_KEY,
].filter(Boolean) as string[]

interface ModerationResult {
  approved: boolean
  reason?: string
  category: 'professional' | 'entertainment' | 'political' | 'spam' | 'inappropriate'
  confidence: number
}

async function moderateWithGroq(content: string, mediaType?: string): Promise<ModerationResult> {
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

      // Parser le JSON
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

  // Fallback: règles simples si Groq échoue
  return simpleModeration(content)
}

function simpleModeration(content: string): ModerationResult {
  const lower = content.toLowerCase()
  
  // Mots-clés spam/inapproprié
  const spamKeywords = ['gagne', 'gratuit', 'clique ici', 'promo', 'viagra', 'casino', 'crypto scam']
  if (spamKeywords.some(kw => lower.includes(kw))) {
    return {
      approved: false,
      reason: 'Contenu détecté comme spam',
      category: 'spam',
      confidence: 0.8
    }
  }

  // Mots-clés politiques
  const politicalKeywords = ['élection', 'président', 'gouvernement', 'parti politique', 'vote']
  if (politicalKeywords.some(kw => lower.includes(kw))) {
    return {
      approved: false,
      reason: 'Contenu politique non autorisé sur Searcher Connector',
      category: 'political',
      confidence: 0.7
    }
  }

  // Mots-clés divertissement
  const entertainmentKeywords = ['mdr', 'lol', 'meme', 'tiktok dance', 'challenge', 'prank']
  if (entertainmentKeywords.some(kw => lower.includes(kw))) {
    return {
      approved: false,
      reason: 'Contenu de divertissement. Searcher Connector est un réseau professionnel.',
      category: 'entertainment',
      confidence: 0.6
    }
  }

  // Mots-clés professionnels (boost approbation)
  const professionalKeywords = ['opportunité', 'job', 'hiring', 'recrutement', 'freelance', 'projet', 'collaboration', 'compétence', 'expérience', 'portfolio']
  const hasProfessionalContext = professionalKeywords.some(kw => lower.includes(kw))

  if (hasProfessionalContext) {
    return {
      approved: true,
      category: 'professional',
      confidence: 0.9
    }
  }

  // Par défaut: approuver (modération humaine si signalement)
  return {
    approved: true,
    category: 'professional',
    confidence: 0.5
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, mediaType, userId } = await req.json()

    if (!content || !userId) {
      return NextResponse.json(
        { error: 'content et userId requis' },
        { status: 400 }
      )
    }

    // Modération via SCAI (Groq)
    const result = await moderateWithGroq(content, mediaType)

    // Log de la modération pour analytics
    console.log(`[moderation] User ${userId}: ${result.approved ? '✅ APPROVED' : '❌ REJECTED'} (${result.category}, confidence: ${result.confidence})`)

    return NextResponse.json({
      success: true,
      moderation: result
    })
  } catch (error: any) {
    console.error('[social/moderate] Erreur:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
