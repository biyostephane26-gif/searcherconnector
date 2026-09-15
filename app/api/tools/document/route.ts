// =================================================================
// SCAI Cowork — génération de documents (PDF, Excel, Word)
// =================================================================
// POST { format: 'pdf'|'xlsx'|'docx', prompt?: string, source?: 'opportunities'|'applications' }
//  - source : export de tes vraies données (aucune IA)
//  - prompt : SCAI rédige le contenu, le serveur fabrique le fichier
// Réponse : { filename, mime, base64, title }
// La logique réutilisable (aussi appelée par le moteur de tâches Cowork
// en arrière-plan) vit dans src/lib/server/documentGenerator.ts — un
// fichier route.ts App Router ne peut exporter que des handlers HTTP.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../src/lib/server/requireUser'
import { generateDocumentForUser, DOCUMENT_MIME, type DocumentFormat } from '../../../../src/lib/server/documentGenerator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }
  const format = body?.format as DocumentFormat
  if (!DOCUMENT_MIME[format]) return NextResponse.json({ error: 'Format attendu : pdf, xlsx ou docx' }, { status: 400 })

  const result = await generateDocumentForUser(auth.user.id, auth.profile, { format, prompt: body?.prompt, source: body?.source })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.error === 'Source inconnue' || result.error === 'Décris le document à créer.' ? 400 : 502 })
  return NextResponse.json(result)
}
