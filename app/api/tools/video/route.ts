// =================================================================
// SCAI Cowork — mini-vidéos (plans Pro/Premium)
// =================================================================
// POST { prompt, aspect?: 'landscape'|'portrait' } → { job }
// GET  ?job=…            → { status: 'processing'|'completed'|'failed', progress? }
// GET  ?job=…&download=1 → fichier MP4 (la clé API reste côté serveur)
// Fournisseurs : OpenAI Sora 2, puis Google Veo 3.1 Fast.
// Le jeton de job est signé et lié à l'utilisateur.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireUser } from '../../../../src/lib/server/requireUser'
import { isPaidPlan } from '../../../../src/lib/planUtils'
import { logToolUsage } from '../../../../src/lib/server/logToolUsage'
import { saveVideoOutputPending } from '../../../../src/lib/server/saveCoworkOutput'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const envKeys = (prefix: string) =>
  Array.from({ length: 10 }, (_, i) => process.env[`${prefix}${i + 1}`]).filter((k): k is string => !!k && k.length > 10)

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret'

function signJob(userId: string, payload: object) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(`${userId}.${data}`).digest('base64url')
  return `${data}.${sig}`
}

function readJob(userId: string, job: string): { p: 'openai' | 'veo'; id: string; k: number } | null {
  const [data, sig] = job.split('.')
  if (!data || !sig) return null
  const expected = crypto.createHmac('sha256', SECRET).update(`${userId}.${data}`).digest('base64url')
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try { return JSON.parse(Buffer.from(data, 'base64url').toString()) } catch { return null }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!isPaidPlan(auth.profile)) {
    return NextResponse.json({ error: 'Les mini-vidéos sont réservées aux plans Pro et Premium.', requiresUpgrade: true }, { status: 403 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }
  const prompt = String(body?.prompt || '').trim().slice(0, 1500)
  if (prompt.length < 3) return NextResponse.json({ error: 'Décris la vidéo à créer.' }, { status: 400 })
  const portrait = body?.aspect === 'portrait'
  const errors: string[] = []

  const openaiKeys = envKeys('OPENAI_KEY_')
  for (let k = 0; k < openaiKeys.length; k++) {
    const res = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKeys[k]}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sora-2', prompt, seconds: '4', size: portrait ? '720x1280' : '1280x720' }),
    }).catch(() => null)
    if (!res) continue
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.id) {
      logToolUsage(auth.user.id, 'video', 'OpenAI Sora 2')
      const job = signJob(auth.user.id, { p: 'openai', id: data.id, k })
      saveVideoOutputPending(auth.user.id, prompt.slice(0, 60), job, 'OpenAI Sora 2').catch(() => {})
      return NextResponse.json({ job, provider: 'OpenAI Sora 2' })
    }
    const code = data?.error?.code
    errors.push(`openai ${res.status}${code ? ` ${code}` : ''}`)
    if (code === 'credit_balance_exhausted' || code === 'billing_hard_limit_reached') break
  }

  const geminiKeys = envKeys('GEMINI_KEY_')
  for (let k = 0; k < geminiKeys.length; k++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${geminiKeys[k]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: portrait ? '9:16' : '16:9' } }),
    }).catch(() => null)
    if (!res) continue
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.name) {
      logToolUsage(auth.user.id, 'video', 'Google Veo 3.1')
      const job = signJob(auth.user.id, { p: 'veo', id: data.name, k })
      saveVideoOutputPending(auth.user.id, prompt.slice(0, 60), job, 'Google Veo 3.1').catch(() => {})
      return NextResponse.json({ job, provider: 'Google Veo 3.1' })
    }
    errors.push(`veo ${res.status}`)
    if (res.status === 429 && errors.filter(e => e.startsWith('veo 429')).length >= 2) break
  }

  const noCredit = errors.some(e => /credit_balance_exhausted|billing|429/.test(e))
  return NextResponse.json({
    error: noCredit
      ? 'Génération vidéo indisponible : les comptes OpenAI et Google du serveur n\'ont plus de crédit. Recharge-les pour activer les mini-vidéos.'
      : 'Aucun générateur vidéo disponible pour le moment.',
    details: errors,
  }, { status: 502 })
}

// Répercute l'état final dans cowork_outputs — c'est ce que le panneau
// Sorties lit ; sans ça il resterait affiché "en cours" indéfiniment.
function syncOutputStatus(userId: string, jobToken: string, status: 'ready' | 'failed') {
  supabaseAdmin.from('cowork_outputs').update({ status }).eq('user_id', userId).eq('status', 'processing')
    .contains('meta', { job: jobToken }).then(() => {}, () => {})
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const rawJob = req.nextUrl.searchParams.get('job') || ''
  const job = readJob(auth.user.id, rawJob)
  if (!job) return NextResponse.json({ error: 'Job invalide' }, { status: 400 })
  const download = req.nextUrl.searchParams.get('download') === '1'

  if (job.p === 'openai') {
    const key = envKeys('OPENAI_KEY_')[job.k]
    if (!key) return NextResponse.json({ error: 'Clé indisponible' }, { status: 500 })
    if (download) {
      const res = await fetch(`https://api.openai.com/v1/videos/${job.id}/content`, { headers: { Authorization: `Bearer ${key}` } })
      if (!res.ok || !res.body) return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
      return new NextResponse(res.body, { headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': 'inline; filename="scai-video.mp4"' } })
    }
    const res = await fetch(`https://api.openai.com/v1/videos/${job.id}`, { headers: { Authorization: `Bearer ${key}` } })
    const data = await res.json().catch(() => ({}))
    const status = data?.status === 'completed' ? 'completed' : data?.status === 'failed' ? 'failed' : 'processing'
    if (status !== 'processing') syncOutputStatus(auth.user.id, rawJob, status === 'completed' ? 'ready' : 'failed')
    return NextResponse.json({ status, progress: data?.progress ?? null, error: data?.error?.message || null })
  }

  const key = envKeys('GEMINI_KEY_')[job.k]
  if (!key) return NextResponse.json({ error: 'Clé indisponible' }, { status: 500 })
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${job.id}?key=${key}`)
  const data = await res.json().catch(() => ({}))
  if (!data?.done) return NextResponse.json({ status: 'processing' })
  const uri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
  if (!uri) {
    syncOutputStatus(auth.user.id, rawJob, 'failed')
    return NextResponse.json({ status: 'failed', error: data?.error?.message || 'Aucune vidéo produite' })
  }
  if (!download) { syncOutputStatus(auth.user.id, rawJob, 'ready'); return NextResponse.json({ status: 'completed' }) }
  const file = await fetch(`${uri}${uri.includes('?') ? '&' : '?'}key=${key}`)
  if (!file.ok || !file.body) return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
  return new NextResponse(file.body, { headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': 'inline; filename="scai-video.mp4"' } })
}
