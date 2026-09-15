// =================================================================
// CRON — Moteur de tâches Cowork multi-étapes (vrai Cowork autonome)
// =================================================================
// Appelé toutes les minutes par scheduler.js. Fait avancer d'UNE étape
// chaque tâche "running" qui a une étape "pending" — jusqu'à ce que
// toutes ses étapes soient faites (task.status = 'done') ou que l'une
// échoue (task.status = 'failed'). Continue même si l'utilisateur a
// fermé le chat : c'est ce qui distingue ceci du token TOOL_READY
// (une seule action, dans la même requête HTTP que le message).
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'
import { generateDocumentForUser, type DocumentFormat } from '../../../../src/lib/server/documentGenerator'
import { generateImageForUser } from '../../../../src/lib/server/imageGenerator'
import { runOpportunityCreatorForUser } from '../../../../src/pages/api/opportunity-creator'

export const dynamic = 'force-dynamic'
export const maxDuration = 280

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret'

type Step = { tool: string; prompt?: string; status: 'pending' | 'running' | 'done' | 'failed'; result?: string; error?: string }

async function runStep(userId: string, profile: any, step: Step): Promise<{ ok: boolean; result?: string; error?: string }> {
  const tool = step.tool
  const prompt = step.prompt || ''
  if (tool === 'pdf' || tool === 'xlsx' || tool === 'docx') {
    const r = await generateDocumentForUser(userId, profile, { format: tool as DocumentFormat, prompt })
    return 'error' in r ? { ok: false, error: r.error } : { ok: true, result: `Document "${r.title}" généré.` }
  }
  if (tool === 'image') {
    const r = await generateImageForUser(userId, { prompt })
    return 'error' in r ? { ok: false, error: r.error } : { ok: true, result: `Image générée (${r.provider}).` }
  }
  if (tool === 'opportunity') {
    const zone = /international|monde|global|world/i.test(prompt) ? 'international' : 'local'
    try {
      const r = await runOpportunityCreatorForUser(userId, profile, { zone, limit: 15 })
      return { ok: true, result: `${r.top_targets?.length || 0} entreprise(s) trouvée(s) et messages préparés.` }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Prospection impossible.' }
    }
  }
  return { ok: false, error: `Outil "${tool}" non pris en charge dans un plan multi-étapes.` }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (req.nextUrl.searchParams.get('debug') === '1') {
    const all = await supabaseAdmin.from('cowork_tasks').select('*')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    return NextResponse.json({ debug: true, url, count: all.data?.length ?? null, error: all.error?.message ?? null, sample: all.data?.[0] ?? null })
  }

  const { data: tasks, error } = await supabaseAdmin
    .from('cowork_tasks')
    .select('id, user_id, steps, current_step, status')
    .eq('status', 'running')
    .order('updated_at', { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tasks || tasks.length === 0) return NextResponse.json({ processed: 0, debug_tasksReturned: tasks?.length ?? null, debug_isArray: Array.isArray(tasks) })

  let processed = 0
  for (const task of tasks) {
    const steps: Step[] = Array.isArray(task.steps) ? task.steps : []
    const idx = task.current_step
    const step = steps[idx]
    if (!step || step.status !== 'pending') continue

    const { data: profile } = await supabaseAdmin.from('users_profiles').select('*').eq('id', task.user_id).maybeSingle()
    if (!profile) {
      steps[idx] = { ...step, status: 'failed', error: 'Profil introuvable' }
      await supabaseAdmin.from('cowork_tasks').update({ steps, status: 'failed', updated_at: new Date().toISOString() }).eq('id', task.id)
      continue
    }

    steps[idx] = { ...step, status: 'running' }
    await supabaseAdmin.from('cowork_tasks').update({ steps, updated_at: new Date().toISOString() }).eq('id', task.id)

    const outcome = await runStep(task.user_id, profile, step)
    processed++

    if (!outcome.ok) {
      steps[idx] = { ...step, status: 'failed', error: outcome.error }
      await supabaseAdmin.from('cowork_tasks').update({ steps, status: 'failed', updated_at: new Date().toISOString() }).eq('id', task.id)
      continue
    }

    steps[idx] = { ...step, status: 'done', result: outcome.result }
    const isLast = idx >= steps.length - 1
    await supabaseAdmin.from('cowork_tasks').update({
      steps,
      current_step: isLast ? idx : idx + 1,
      status: isLast ? 'done' : 'running',
      updated_at: new Date().toISOString(),
    }).eq('id', task.id)
  }

  return NextResponse.json({ processed, tasksChecked: tasks.length })
}
