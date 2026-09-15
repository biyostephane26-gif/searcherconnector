// =================================================================
// SCAI Cowork — panneau "Sorties" (fichiers générés, persistants)
// GET    : liste les sorties de l'utilisateur, plus récentes d'abord
// DELETE : retire une sortie (?id=...) — ne supprime pas le fichier du
//          bucket, juste son entrée (évite un aller-retour supplémentaire
//          pour une fonctionnalité de rangement, pas de conformité RGPD)
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'
import { requireUser } from '../../../../src/lib/server/requireUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('cowork_outputs')
    .select('id, kind, title, file_url, status, meta, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outputs: data || [] })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabaseAdmin.from('cowork_outputs').delete().eq('id', id).eq('user_id', auth.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
