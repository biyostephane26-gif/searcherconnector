// =================================================================
// SEARCHER CONNECTOR — CONNEXION GMAIL OAUTH (étape 1 : redirection)
// =================================================================
// L'utilisateur clique "Connecter Gmail" dans Cowork → on le redirige
// vers l'écran de consentement Google. Gratuit, aucune carte requise.
// Prérequis (à créer une fois sur console.cloud.google.com) :
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// =================================================================

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/oauth/gmail/callback`

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({
      error: 'Gmail OAuth non configuré. Ajoute GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env.local (console.cloud.google.com, gratuit).',
    }, { status: 503 })
  }

  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',   // nécessaire pour obtenir un refresh_token
    prompt:        'consent',   // force le refresh_token à chaque connexion
    state:         userId,       // on récupère userId au retour
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
