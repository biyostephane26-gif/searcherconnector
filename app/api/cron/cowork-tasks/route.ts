// =================================================================
// CRON — Moteur de tâches Cowork multi-étapes (vrai Cowork autonome)
// =================================================================
// Appelé toutes les minutes par scheduler.js. Fait avancer d'UNE étape
// chaque tâche "running" qui a une étape "pending" (ou une étape vidéo
// déjà lancée qu'il faut ré-interroger) — jusqu'à ce que toutes ses
// étapes soient faites (task.status = 'done') ou que l'une échoue
// (task.status = 'failed'). Continue même si l'utilisateur a fermé le
// chat : c'est ce qui distingue ceci du token TOOL_READY (une seule
// action, dans la même requête HTTP que le message).
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'
import { generateDocumentForUser, type DocumentFormat } from '../../../../src/lib/server/documentGenerator'
import { generateImageForUser } from '../../../../src/lib/server/imageGenerator'
import { initiateVideoForUser, checkVideoStatusForUser } from '../../../../src/lib/server/videoGenerator'
import { runOpportunityCreatorForUser } from '../../../../src/pages/api/opportunity-creator'

export const dynamic = 'force-dynamic'
export const maxDuration = 280

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret'
const INTERNAL_URL = `http://localhost:${process.env.PORT || 3000}`

type Step = {
  tool: string
  prompt?: string
  status: 'pending' | 'running' | 'done' | 'failed'
  result?: string
  error?: string
  job?: string      // vidéo : jeton de suivi Sora/Veo, interrogé aux prochains passages
  provider?: string
}

type Outcome = { ok: boolean; result?: string; error?: string; stayRunning?: boolean; job?: string; provider?: string }

async function runStep(userId: string, profile: any, step: Step): Promise<Outcome> {
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

  if (tool === 'video') {
    // Asynchrone chez Sora/Veo — cette étape reste "running" jusqu'à ce
    // que pollVideoStep() constate qu'elle est prête à un tick suivant.
    const r = await initiateVideoForUser(userId, { prompt })
    if ('error' in r) return { ok: false, error: r.error }
    return { ok: true, stayRunning: true, job: r.job, provider: r.provider, result: `Génération vidéo lancée (${r.provider}) — encore quelques minutes.` }
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

  if (tool === 'scan') {
    // scan.ts est appelé en interne comme le fait déjà scheduler.js pour
    // les autres tâches de fond — même contrat que le scan déclenché
    // depuis l'UI (useAgent.launchScan), juste sans session utilisateur.
    const zone = /international|monde|global|world/i.test(prompt) ? 'worldwide' : /afrique|africa/i.test(prompt) ? 'continental' : 'continental'
    try {
      const res = await fetch(`${INTERNAL_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, zone, has_budget: false }),
        signal: AbortSignal.timeout(180_000),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data?.error || 'Scan impossible.' }
      return { ok: true, result: `Scan terminé : ${data.found ?? 0} opportunité(s) trouvée(s), ${data.autoApplied ?? 0} candidature(s) auto.` }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Scan impossible.' }
    }
  }

  return { ok: false, error: `Outil "${tool}" non pris en charge dans un plan multi-étapes.` }
}

// Ré-interroge une étape vidéo déjà lancée (status 'running', job présent)
// — ne relance jamais initiateVideoForUser une 2e fois pour la même étape.
async function pollVideoStep(userId: string, step: Step): Promise<Outcome> {
  const r = await checkVideoStatusForUser(userId, step.job!)
  if (r.status === 'processing') return { ok: true, stayRunning: true }
  if (r.status === 'failed') return { ok: false, error: r.error || 'Génération vidéo échouée.' }
  return { ok: true, result: `Vidéo prête (${step.provider || 'IA'}).` }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: tasks, error } = await supabaseAdmin
    .from('cowork_tasks')
    .select('id, user_id, steps, current_step, status')
    .eq('status', 'running')
    .order('updated_at', { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tasks || tasks.length === 0) return NextResponse.json({ processed: 0 })

  let processed = 0
  for (const task of tasks) {
    const steps: Step[] = Array.isArray(task.steps) ? task.steps : []
    const idx = task.current_step
    const step = steps[idx]
    if (!step) continue

    const isPending = step.status === 'pending'
    const isPollableVideo = step.status === 'running' && step.tool === 'video' && !!step.job
    if (!isPending && !isPollableVideo) continue

    let profile: any = null
    if (isPending) {
      const { data } = await supabaseAdmin.from('users_profiles').select('*').eq('id', task.user_id).maybeSingle()
      profile = data
      if (!profile) {
        steps[idx] = { ...step, status: 'failed', error: 'Profil introuvable' }
        await supabaseAdmin.from('cowork_tasks').update({ steps, status: 'failed', updated_at: new Date().toISOString() }).eq('id', task.id)
        continue
      }
      steps[idx] = { ...step, status: 'running' }
      await supabaseAdmin.from('cowork_tasks').update({ steps, updated_at: new Date().toISOString() }).eq('id', task.id)
    }

    const outcome = isPending ? await runStep(task.user_id, profile, step) : await pollVideoStep(task.user_id, step)
    processed++

    if (!outcome.ok) {
      steps[idx] = { ...step, status: 'failed', error: outcome.error }
      await supabaseAdmin.from('cowork_tasks').update({ steps, status: 'failed', updated_at: new Date().toISOString() }).eq('id', task.id)
      continue
    }

    if (outcome.stayRunning) {
      // Vidéo en cours : on mémorise le job (1re fois) et on retentera au
      // prochain passage, sans avancer à l'étape suivante.
      steps[idx] = { ...step, status: 'running', job: outcome.job || step.job, provider: outcome.provider || step.provider, result: outcome.result || step.result }
      await supabaseAdmin.from('cowork_tasks').update({ steps, updated_at: new Date().toISOString() }).eq('id', task.id)
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
