// =================================================================
// REGISTRE DES CONFIGS DE LECTURE — servi à l'extension
// =================================================================
// Endpoint public en lecture (pas de données sensibles — juste des
// sélecteurs CSS) : servir depuis le serveur plutôt que figer dans le
// code de l'extension permet d'ajouter des plateformes sans republier
// l'extension à chaque fois.
import { NextResponse } from 'next/server'
import { LISTING_CONFIGS } from '../../../../src/lib/scraper/listingConfigs'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ configs: LISTING_CONFIGS })
}
