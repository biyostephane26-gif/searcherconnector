
// =================================================================
// SCAI VOICE — Text to Speech avec ElevenLabs
// Voix unique SCAI, multilingue, haute qualité
// Système de crédits: 1 crédit = ~150 caractères
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// L'env réel n'a que des clés numérotées ELEVENLABS_KEY_1..10 — l'ancien
// code lisait ELEVENLABS_API_KEY (inexistante) : le TTS échouait toujours
// avec "Clé API ElevenLabs manquante". Rotation sur toutes les clés.
const ELEVENLABS_KEYS = [
  process.env.ELEVENLABS_API_KEY,
  ...Array.from({ length: 10 }, (_, i) => process.env[`ELEVENLABS_KEY_${i + 1}`]),
].filter(Boolean) as string[]
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // Voix par défaut

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
)

export async function POST(req: NextRequest) {
  try {
    const { text, language = 'fr', userId } = await req.json()
    if (!text) return NextResponse.json({ error: 'Texte requis' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'User ID requis' }, { status: 401 })

    // Calculer le coût en crédits (1 crédit = ~150 caractères)
    const creditsNeeded = Math.ceil(text.length / 150)

    // Le fondateur n'a aucune restriction — pas de décompte de crédits
    const { data: callerProfile } = await supabase
      .from('users_profiles').select('role').eq('id', userId).single()
    const isFounder = callerProfile?.role === 'founder'

    if (!isFounder) {
      // Vérifier et décompter les crédits
      const { data: deductResult, error: deductError } = await supabase.rpc('deduct_voice_credits', {
        p_user_id: userId,
        p_amount: creditsNeeded
      })

      if (deductError || !deductResult) {
        console.error('Erreur décompte crédits:', deductError)
        return NextResponse.json({
          error: 'Crédits vocaux insuffisants',
          creditsNeeded,
          upgrade: true
        }, { status: 402 })
      }
    }

    if (ELEVENLABS_KEYS.length === 0) {
      return NextResponse.json({ error: 'Clé API ElevenLabs manquante' }, { status: 500 })
    }

    // Rotation : chaque compte gratuit a son quota mensuel — clé suivante
    // quand l'une est vide (429) ou invalide (401/403).
    let r: Response | null = null
    for (const key of ELEVENLABS_KEYS) {
      r = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': key,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      )
      if (r.ok) break
      const errText = await r.text()
      console.error('Erreur ElevenLabs (clé suivante ?):', r.status, errText.slice(0, 200))
      if (![401, 403, 429].includes(r.status)) break
    }

    if (!r || !r.ok) {
      return NextResponse.json({ error: 'Erreur de synthèse vocale' }, { status: 500 })
    }

    const audioBuffer = await r.arrayBuffer()
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (error: any) {
    console.error('Erreur TTS:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
