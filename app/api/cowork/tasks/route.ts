// =================================================================
// SCAI Cowork — tâches multi-étapes (cowork_tasks)
// GET    : liste les tâches de l'utilisateur, plus récentes d'abord
// DELETE : annule une tâche en cours (?id=...) — les étapes déjà
//          faites restent visibles, celles en attente ne se lancent
//          plus au prochain passage du planificateur
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'
import { requireUser } from '../../../../src/lib/server/requireUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('cowork_tasks')
    .select('id, title, steps, current_step, status, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data || [] })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabaseAdmin.from('cowork_tasks')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', auth.user.id).eq('status', 'running')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
