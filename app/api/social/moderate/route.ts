// =================================================================
// MODÉRATION AUTOMATIQUE SCAI — pré-check côté client (UX)
// L'application réelle du refus se fait côté serveur dans
// app/api/social/posts/route.ts, qui appelle la même logique
// (src/lib/moderation.ts) avant d'écrire en base — cette route-ci
// sert à prévenir l'utilisateur AVANT qu'il n'aille plus loin
// (upload média, etc.), mais n'est pas le seul rempart.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { moderateWithGroq } from '../../../../src/lib/moderation'

export async function POST(req: NextRequest) {
  try {
    const { content, mediaType, userId } = await req.json()

    if (!content || !userId) {
      return NextResponse.json(
        { error: 'content et userId requis' },
        { status: 400 }
      )
    }

    const result = await moderateWithGroq(content, mediaType)

    console.log(`[moderation] User ${userId}: ${result.approved ? '✅ APPROVED' : '❌ REJECTED'} (${result.category}, confidence: ${result.confidence})`)

    return NextResponse.json({
      success: true,
      moderation: result
    })
  } catch (error: any) {
    console.error('[social/moderate] Erreur:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
