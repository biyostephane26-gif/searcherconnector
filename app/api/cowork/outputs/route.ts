// =================================================================
// SCAI Cowork — panneau "Sorties" (fichiers générés, persistants)
// GET    : liste les sorties de l'utilisateur, plus récentes d'abord
//          (?project_id=... pour filtrer sur un projet)
// PATCH  : assigne/retire une sortie d'un projet { id, project_id }
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
  const projectId = req.nextUrl.searchParams.get('project_id')

  let query = supabaseAdmin
    .from('cowork_outputs')
    .select('id, kind, title, file_url, status, meta, project_id, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outputs: data || [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }
  const id = String(body?.id || '')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const projectId = body?.project_id ? String(body.project_id) : null

  if (projectId) {
    const { data: project } = await supabaseAdmin.from('cowork_projects').select('id').eq('id', projectId).eq('user_id', auth.user.id).maybeSingle()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('cowork_outputs').update({ project_id: projectId }).eq('id', id).eq('user_id', auth.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
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
