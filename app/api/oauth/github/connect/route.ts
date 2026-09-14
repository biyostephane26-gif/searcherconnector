// =================================================================
// CONNEXION GITHUB OAUTH (étape 1 : redirection)
// =================================================================
// Le `state` arrive déjà signé depuis /api/connectors (qui a vérifié la
// session avant de le générer) — cette route ne fait que le relayer vers
// GitHub, elle ne décide jamais elle-même de qui se connecte.
// Prérequis : GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET (github.com/settings/applications/new,
// callback = <APP_URL>/api/oauth/github/callback).
import { NextRequest, NextResponse } from 'next/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/oauth/github/callback`

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state')
  if (!state) return NextResponse.json({ error: 'state manquant' }, { status: 400 })

  if (!GITHUB_CLIENT_ID) {
    return NextResponse.json({
      error: 'GitHub OAuth non configuré. Ajoute GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET (github.com/settings/applications/new).',
    }, { status: 503 })
  }

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'read:user public_repo',
    state,
    allow_signup: 'true',
  })

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`)
}
