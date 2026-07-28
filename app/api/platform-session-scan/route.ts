// =================================================================
// DÉCLENCHEUR DE LECTURE DES PLATEFORMES VERROUILLÉES
// =================================================================
// Appelé par scheduler.js à intervalle régulier — lit toutes les
// plateformes actives dans platform_credentials via Playwright (comptes
// du fondateur, hors Fiverr/Malt/Upwork gérées par l'extension) et
// alimente cache_opportunities. Voir platformSessionScraper.ts.
import { NextResponse } from 'next/server'
import { runPlatformSessionScan } from '../../../src/lib/scraper/platformSessionScraper'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  try {
    const result = await runPlatformSessionScan()
    console.log(`🔐 [platform-session-scan] ${result.ok}/${result.scanned} OK — ${result.log.join(' | ')}`)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[platform-session-scan] erreur:', e?.message)
    return NextResponse.json({ error: e?.message || 'erreur inconnue' }, { status: 500 })
  }
}
