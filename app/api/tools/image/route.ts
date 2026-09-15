// =================================================================
// SCAI Cowork — génération d'images
// =================================================================
// POST { prompt, aspect?: 'square'|'landscape'|'portrait' }
// La logique réutilisable (aussi appelée par le moteur de tâches Cowork
// en arrière-plan) vit dans src/lib/server/imageGenerator.ts — un
// fichier route.ts App Router ne peut exporter que des handlers HTTP.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../src/lib/server/requireUser'
import { generateImageForUser } from '../../../../src/lib/server/imageGenerator'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const result = await generateImageForUser(auth.user.id, { prompt: body?.prompt, aspect: body?.aspect })
  if ('error' in result) return NextResponse.json(result, { status: result.error.startsWith('Décris') ? 400 : 502 })
  return NextResponse.json(result)
}
