// =================================================================
// CRON — Nettoyage du cache d'opportunités
// La fonction cleanupExpiredOpportunities() existait dans
// cache-manager.ts mais n'était appelée nulle part — les vieilles
// opportunités ne disparaissaient jamais (is_expired restait à false
// indéfiniment). Exécuté toutes les heures via scheduler.js.
// =================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cache } from '../../../../src/lib/scraper/cache-manager'

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const result = await cache.cleanupExpiredOpportunities(168) // 7 jours
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
