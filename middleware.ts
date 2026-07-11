// =================================================================
// SEARCHER CONNECTOR — MIDDLEWARE NEXT.JS
// Protection serveur de toutes les routes protégées.
// Utilise le cookie Supabase pour vérifier la session côté serveur.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'

// Routes publiques — accessibles sans connexion
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/privacy',
  '/terms',
  '/support',
  '/status',
  '/reset-password',
  '/guide',
]

// Préfixes ignorés (assets statiques, routes API)
const SKIP_PREFIXES = [
  '/_next',
  '/api/',
  '/favicon',
  '/icons',
  '/images',
  '/fonts',
  '/og-',
  '/apple-',
  '/site.webmanifest',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Ignorer assets et API ─────────────────────────────────────
  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Routes publiques ─────────────────────────────────────────
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
  if (isPublic) return NextResponse.next()

  // ── Vérifier la session via le cookie Supabase ───────────────
  // Supabase stocke la session dans un cookie nommé sb-*-auth-token
  // On vérifie sa présence pour une protection rapide côté serveur
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef  = supabaseUrl.split('//')[1]?.split('.')[0] || ''
  const cookieName  = `sb-${projectRef}-auth-token`

  const sessionCookie = req.cookies.get(cookieName)
    || req.cookies.get('supabase-auth-token')
    || req.cookies.get('sb-access-token')

  // Chercher n'importe quel cookie Supabase
  const hasSession = sessionCookie
    || [...req.cookies.getAll()].some(c => c.name.startsWith('sb-') && c.name.includes('auth'))

  if (!hasSession) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
