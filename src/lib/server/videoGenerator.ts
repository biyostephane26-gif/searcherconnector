// =================================================================
// SCAI Cowork — mini-vidéos générées par IA (Sora 2 / Veo 3.1)
// =================================================================
// Cœur indépendant de la requête HTTP — appelé par app/api/tools/video
// (après vérification de session) et par le moteur de tâches Cowork en
// arrière-plan (scheduler.js). La génération est asynchrone (job) chez
// les deux fournisseurs : ce module expose l'initiation ET le suivi de
// statut, pour que le moteur de tâches puisse interroger le job à
// chaque passage jusqu'à ce qu'il soit prêt — pas de session utilisateur
// disponible en arrière-plan pour rappeler l'API du fournisseur avec un
// jeton signé côté client comme le fait l'UI interactive.
// =================================================================

import crypto from 'crypto'
import { logToolUsage } from './logToolUsage'
import { saveVideoOutputPending } from './saveCoworkOutput'
import { supabaseAdmin } from '../supabaseAdmin'

const envKeys = (prefix: string) =>
  Array.from({ length: 10 }, (_, i) => process.env[`${prefix}${i + 1}`]).filter((k): k is string => !!k && k.length > 10)

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret'

export type VideoJob = { p: 'openai' | 'veo'; id: string; k: number }

export function signVideoJob(userId: string, payload: VideoJob): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(`${userId}.${data}`).digest('base64url')
  return `${data}.${sig}`
}

export function readVideoJob(userId: string, job: string): VideoJob | null {
  const [data, sig] = job.split('.')
  if (!data || !sig) return null
  const expected = crypto.createHmac('sha256', SECRET).update(`${userId}.${data}`).digest('base64url')
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try { return JSON.parse(Buffer.from(data, 'base64url').toString()) } catch { return null }
}

export async function initiateVideoForUser(
  userId: string, params: { prompt: string; aspect?: string }
): Promise<{ job: string; provider: string } | { error: string; details: string[] }> {
  const prompt = String(params.prompt || '').trim().slice(0, 1500)
  if (prompt.length < 3) return { error: 'Décris la vidéo à créer.', details: [] }
  const portrait = params.aspect === 'portrait'
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
      logToolUsage(userId, 'video', 'OpenAI Sora 2')
      const job = signVideoJob(userId, { p: 'openai', id: data.id, k })
      saveVideoOutputPending(userId, prompt.slice(0, 60), job, 'OpenAI Sora 2').catch(() => {})
      return { job, provider: 'OpenAI Sora 2' }
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
      logToolUsage(userId, 'video', 'Google Veo 3.1')
      const job = signVideoJob(userId, { p: 'veo', id: data.name, k })
      saveVideoOutputPending(userId, prompt.slice(0, 60), job, 'Google Veo 3.1').catch(() => {})
      return { job, provider: 'Google Veo 3.1' }
    }
    errors.push(`veo ${res.status}`)
    if (res.status === 429 && errors.filter(e => e.startsWith('veo 429')).length >= 2) break
  }

  const noCredit = errors.some(e => /credit_balance_exhausted|billing|429/.test(e))
  return {
    error: noCredit
      ? 'Génération vidéo indisponible : les comptes OpenAI et Google du serveur n\'ont plus de crédit. Recharge-les pour activer les mini-vidéos.'
      : 'Aucun générateur vidéo disponible pour le moment.',
    details: errors,
  }
}

// Répercute l'état final dans cowork_outputs — c'est ce que le panneau
// Sorties lit ; sans ça il resterait affiché "en cours" indéfiniment.
function syncOutputStatus(userId: string, jobToken: string, status: 'ready' | 'failed') {
  supabaseAdmin.from('cowork_outputs').update({ status }).eq('user_id', userId).eq('status', 'processing')
    .contains('meta', { job: jobToken }).then(() => {}, () => {})
}

export async function checkVideoStatusForUser(
  userId: string, rawJob: string
): Promise<{ status: 'processing' | 'ready' | 'failed'; error?: string }> {
  const job = readVideoJob(userId, rawJob)
  if (!job) return { status: 'failed', error: 'Job invalide' }

  if (job.p === 'openai') {
    const key = envKeys('OPENAI_KEY_')[job.k]
    if (!key) return { status: 'failed', error: 'Clé indisponible' }
    const res = await fetch(`https://api.openai.com/v1/videos/${job.id}`, { headers: { Authorization: `Bearer ${key}` } })
    const data = await res.json().catch(() => ({}))
    const status = data?.status === 'completed' ? 'ready' : data?.status === 'failed' ? 'failed' : 'processing'
    if (status !== 'processing') syncOutputStatus(userId, rawJob, status)
    return { status, error: data?.error?.message }
  }

  const key = envKeys('GEMINI_KEY_')[job.k]
  if (!key) return { status: 'failed', error: 'Clé indisponible' }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${job.id}?key=${key}`)
  const data = await res.json().catch(() => ({}))
  if (!data?.done) return { status: 'processing' }
  const uri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
  if (!uri) {
    syncOutputStatus(userId, rawJob, 'failed')
    return { status: 'failed', error: data?.error?.message || 'Aucune vidéo produite' }
  }
  syncOutputStatus(userId, rawJob, 'ready')
  return { status: 'ready' }
}
