// =================================================================
// TRANSCRIPTION VOCALE — Groq Whisper
// 99 langues, tous les appareils (iPhone, Android, Firefox, Safari)
// Système de crédits: 1 crédit = ~30 secondes d'audio
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_9,
  process.env.GROQ_API_KEY_10,
  process.env.GROQ_API_KEY,
].filter(Boolean) as string[]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const userId = formData.get('userId') as string

    if (!audioFile) return NextResponse.json({ error: 'Fichier audio requis' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'User ID requis' }, { status: 401 })

    // Estimer le coût en crédits basé sur la taille du fichier
    // 1 crédit = ~30 secondes (approximation: 1MB ≈ 1 minute ≈ 2 crédits)
    const fileSizeMB = audioFile.size / (1024 * 1024)
    const creditsNeeded = Math.max(1, Math.ceil(fileSizeMB * 2))

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

    // Essayer chaque clé Groq en rotation
    for (const key of GROQ_KEYS) {
      try {
        const groqForm = new FormData()
        groqForm.append('file', audioFile, audioFile.name || 'audio.webm')
        groqForm.append('model', 'whisper-large-v3')  // meilleur modèle multilangue
        groqForm.append('response_format', 'json')
        // Pas de 'language' → Whisper détecte automatiquement

        const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method:  'POST',
          headers: { Authorization: `Bearer ${key}` },
          body:    groqForm,
          signal:  AbortSignal.timeout(30000),
        })

        if (!r.ok) continue
        const data = await r.json()
        if (data.text) {
          return NextResponse.json({
            text:     data.text,
            language: data.language || 'auto',
          })
        }
      } catch { continue }
    }

    return NextResponse.json({ error: 'Transcription échouée — toutes les clés ont échoué' }, { status: 500 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
