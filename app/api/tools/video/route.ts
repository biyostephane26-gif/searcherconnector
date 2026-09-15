// =================================================================
// SCAI Cowork — vidéos (plans Pro/Premium)
// =================================================================
// POST { prompt, aspect? }          → génération IA (Sora/Veo), asynchrone
// POST { clips: string[], title? }  → montage réel des éléments fournis (ffmpeg)
// GET  ?job=…            → { status: 'processing'|'completed'|'failed', progress? }
// GET  ?job=…&download=1 → fichier MP4 (la clé API reste côté serveur)
// La logique réutilisable (aussi appelée par le moteur de tâches Cowork
// en arrière-plan) vit dans src/lib/server/videoGenerator.ts et
// videoEditor.ts — un fichier route.ts App Router ne peut exporter que
// des handlers HTTP.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../src/lib/server/requireUser'
import { isPaidPlan } from '../../../../src/lib/planUtils'
import { initiateVideoForUser, readVideoJob, checkVideoStatusForUser } from '../../../../src/lib/server/videoGenerator'
import { assembleVideoForUser } from '../../../../src/lib/server/videoEditor'

const envKeys = (prefix: string) =>
  Array.from({ length: 10 }, (_, i) => process.env[`${prefix}${i + 1}`]).filter((k): k is string => !!k && k.length > 10)

export const dynamic = 'force-dynamic'
export const maxDuration = 280

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!isPaidPlan(auth.profile)) {
    return NextResponse.json({ error: 'Les vidéos sont réservées aux plans Pro et Premium.', requiresUpgrade: true }, { status: 403 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  if (Array.isArray(body?.clips)) {
    const result = await assembleVideoForUser(auth.user.id, { clips: body.clips, title: body?.title })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ ...result, provider: 'Montage ffmpeg', done: true })
  }

  const result = await initiateVideoForUser(auth.user.id, { prompt: body?.prompt, aspect: body?.aspect })
  if ('error' in result) return NextResponse.json(result, { status: result.error.startsWith('Décris') ? 400 : 502 })
  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const rawJob = req.nextUrl.searchParams.get('job') || ''
  const job = readVideoJob(auth.user.id, rawJob)
  if (!job) return NextResponse.json({ error: 'Job invalide' }, { status: 400 })
  const download = req.nextUrl.searchParams.get('download') === '1'

  if (!download) {
    const result = await checkVideoStatusForUser(auth.user.id, rawJob)
    const status = result.status === 'ready' ? 'completed' : result.status
    return NextResponse.json({ status, error: result.error || null })
  }

  if (job.p === 'openai') {
    const key = envKeys('OPENAI_KEY_')[job.k]
    if (!key) return NextResponse.json({ error: 'Clé indisponible' }, { status: 500 })
    const res = await fetch(`https://api.openai.com/v1/videos/${job.id}/content`, { headers: { Authorization: `Bearer ${key}` } })
    if (!res.ok || !res.body) return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    return new NextResponse(res.body, { headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': 'inline; filename="scai-video.mp4"' } })
  }

  const key = envKeys('GEMINI_KEY_')[job.k]
  if (!key) return NextResponse.json({ error: 'Clé indisponible' }, { status: 500 })
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${job.id}?key=${key}`)
  const data = await res.json().catch(() => ({}))
  const uri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
  if (!uri) return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
  const file = await fetch(`${uri}${uri.includes('?') ? '&' : '?'}key=${key}`)
  if (!file.ok || !file.body) return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
  return new NextResponse(file.body, { headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': 'inline; filename="scai-video.mp4"' } })
}
