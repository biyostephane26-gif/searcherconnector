// =================================================================
// SCAI Cowork — téléversement d'un élément pour montage vidéo
// =================================================================
// POST { data: dataURL, filename? } → { url } (bucket DOCUMENTS, public)
// Étape préalable au montage : ffmpeg télécharge chaque élément depuis
// une URL, donc chaque fichier doit d'abord atterrir quelque part de
// public avant d'être passé à /api/tools/video en tant que "clips".
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../src/lib/server/requireUser'
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const match = String(body?.data || '').match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/)
  if (!match) return NextResponse.json({ error: 'Fichier invalide' }, { status: 400 })
  const [, mimeType, base64] = match
  if (!mimeType.startsWith('video/') && !mimeType.startsWith('image/')) {
    return NextResponse.json({ error: 'Seuls les vidéos et images sont acceptées pour un montage.' }, { status: 400 })
  }

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length > 60 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 60 Mo par élément).' }, { status: 413 })
  }

  const ext = mimeType.split('/')[1]?.replace('quicktime', 'mov') || 'bin'
  const path = `cowork-uploads/${auth.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabaseAdmin.storage.from('DOCUMENTS').upload(path, buffer, { contentType: mimeType, upsert: false })
  if (error) return NextResponse.json({ error: `Téléversement impossible : ${error.message}` }, { status: 502 })

  const { data } = supabaseAdmin.storage.from('DOCUMENTS').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
