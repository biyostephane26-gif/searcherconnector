// =================================================================
// SEARCHER CONNECTOR — SCAI PRE-SCAN (conversationnel)
// =================================================================
// Avant de lancer un scan, SCAI discute avec l'utilisateur — si le
// message est ambigu, SCAI pose UNE vraie question de clarification
// (comme une conversation à plusieurs tours) au lieu de deviner en un
// coup. Toujours sur Groq/Gemini (gratuits) — pas de modèle payant.
// Max 2 tours de clarification, puis SCAI décide avec ce qu'il a.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchGroqWithRotation } from '../../../../src/lib/scaiUtils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MAX_CLARIFYING_TURNS = 2

function fallbackDecision() {
  return {
    action: 'decide' as const,
    zone: 'continental',
    has_budget: false,
    message: "Je lance la recherche avec tes préférences habituelles.",
  }
}

type Turn = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { userId, message, history = [] } = await req.json() as {
      userId: string; message: string; history?: Turn[]
    }
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

    const { data: profile } = await supabase
      .from('users_profiles')
      .select('domain, country, profile_type')
      .eq('id', userId)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    if (!message || !message.trim()) {
      return NextResponse.json(fallbackDecision())
    }

    const conversation: Turn[] = [...history, { role: 'user', content: String(message).slice(0, 500) }]
    const turnsSoFar = conversation.filter(t => t.role === 'user').length
    const canStillAsk = turnsSoFar <= MAX_CLARIFYING_TURNS

    const conversationText = conversation
      .map(t => `${t.role === 'user' ? 'Utilisateur' : 'SCAI'} : ${t.content}`)
      .join('\n')

    const systemPrompt = `Tu es SCAI, l'agent de recherche d'opportunités de Searcher Connector. Tu discutes avec un utilisateur AVANT de lancer un scan pour bien comprendre ce qu'il cherche.

Profil de l'utilisateur :
- Domaine : ${profile.domain || 'non précisé'}
- Pays : ${profile.country || 'non précisé'}
- Type de profil : ${profile.profile_type || 'job_seeker'}

Conversation jusqu'ici :
${conversationText}

${canStillAsk
  ? `Si l'intention n'est pas assez claire pour choisir intelligemment entre une recherche locale, régionale ou mondiale (ou pour savoir s'il est ouvert à un budget flexible), pose UNE SEULE question courte et précise pour clarifier — pas plusieurs, pas de liste.
Si au contraire tu as déjà assez d'info, décide directement.`
  : `Tu as déjà posé assez de questions — décide maintenant avec ce que tu sais, ne pose plus de question.`}

Réponds UNIQUEMENT avec un JSON, rien d'autre, sous une de ces deux formes :
- Pour poser une question : {"action":"ask","question":"..."}
- Pour décider : {"action":"decide","zone":"local|continental|worldwide","has_budget":true|false,"message":"..."}`

    let result: any = fallbackDecision()
    try {
      const raw = await fetchGroqWithRotation([{ role: 'user', content: systemPrompt }])
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.action === 'ask' && canStillAsk && parsed.question) {
          result = {
            action: 'ask',
            question: String(parsed.question).slice(0, 300),
            history: [...conversation, { role: 'assistant', content: String(parsed.question).slice(0, 300) }],
          }
        } else if (['local', 'continental', 'worldwide'].includes(parsed.zone)) {
          result = {
            action: 'decide',
            zone: parsed.zone,
            has_budget: !!parsed.has_budget,
            message: String(parsed.message || fallbackDecision().message).slice(0, 300),
          }
        }
      }
    } catch (e) {
      // IA indisponible ou réponse mal formée → on garde le fallback, jamais bloquant
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
