// API publique — stats de la landing page (sans auth)
// Corrigé le 2026-09-18 : la clé anonyme est bloquée par la sécurité RLS
// sur `opportunities` (donnée privée par utilisateur, à raison) — vérifié
// en direct : Content-Range: */0 alors que la table contient des
// milliers de lignes. D'où le "0 opportunités trouvées" sur le landing.
// La clé service_role contourne RLS : sûr ici puisqu'on n'expose qu'un
// COMPTAGE agrégé, jamais le contenu d'une opportunité individuelle.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Sans ça, Next.js voit une route sans API "dynamique" évidente (pas de
// headers()/cookies()) et la fige en statique AU MOMENT DU BUILD — le
// chiffre reste alors gelé pour toujours, quel que soit le vrai contenu
// de la base ensuite. C'est exactement pourquoi la clé service_role
// corrigée ne suffisait pas : la réponse servie était un instantané figé
// depuis avant le correctif, jamais réellement recalculée en production.
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const [oppsRes, usersRes] = await Promise.all([
      supabase.from('opportunities').select('id', { count: 'exact', head: true }),
      supabase.from('users_profiles').select('id', { count: 'exact', head: true }),
    ])
    return NextResponse.json({
      total_opportunities: oppsRes.count || 0,
      total_users:         usersRes.count || 0,
    })
  } catch {
    return NextResponse.json({ total_opportunities: 0, total_users: 0 })
  }
}
