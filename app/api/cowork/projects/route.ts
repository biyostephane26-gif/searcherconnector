// =================================================================
// SCAI Cowork — projets (dossiers de contexte regroupant des sorties)
// GET    : liste les projets de l'utilisateur avec leur nombre de sorties
// POST   : crée un projet { name, description? }
// DELETE : supprime un projet (?id=...) — les sorties liées sont
//          détachées (project_id → null), jamais supprimées
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'
import { requireUser } from '../../../../src/lib/server/requireUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: projects, error } = await supabaseAdmin
    .from('cowork_projects')
    .select('id, name, description, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: outputs } = await supabaseAdmin
    .from('cowork_outputs')
    .select('project_id')
    .eq('user_id', auth.user.id)
    .not('project_id', 'is', null)

  const counts: Record<string, number> = {}
  for (const o of outputs || []) {
    if (o.project_id) counts[o.project_id] = (counts[o.project_id] || 0) + 1
  }

  return NextResponse.json({
    projects: (projects || []).map(p => ({ ...p, output_count: counts[p.id] || 0 })),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }
  const name = String(body?.name || '').trim().slice(0, 100)
  if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  const description = String(body?.description || '').trim().slice(0, 500) || null

  const { data, error } = await supabaseAdmin
    .from('cowork_projects')
    .insert({ user_id: auth.user.id, name, description })
    .select('id, name, description, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: { ...data, output_count: 0 } })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabaseAdmin.from('cowork_projects').delete().eq('id', id).eq('user_id', auth.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
