
// =================================================================
// SCAI VOICE — Text to Speech avec ElevenLabs
// Voix unique SCAI, multilingue, haute qualité
// Système de crédits: 1 crédit = ~150 caractères
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // Voix par défaut

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { text, language = 'fr', userId } = await req.json()
    if (!text) return NextResponse.json({ error: 'Texte requis' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'User ID requis' }, { status: 401 })

    // Calculer le coût en crédits (1 crédit = ~150 caractères)
    const creditsNeeded = Math.ceil(text.length / 150)

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

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'Clé API ElevenLabs manquante' }, { status: 500 })
    }

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
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

    if (!r.ok) {
      const err = await r.text()
      console.error('Erreur ElevenLabs:', err)
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
