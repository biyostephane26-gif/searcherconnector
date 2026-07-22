// =================================================================
// CRÉATION DE POST — modération SCAI appliquée côté serveur
// Avant cette route, la modération n'était vérifiée que côté client
// (CreatePostBox.tsx appelait /api/social/moderate puis insérait
// directement via le client Supabase si approuvé) — un utilisateur
// pouvait donc publier n'importe quoi en sautant l'appel de
// modération et en insérant directement. Ici, le serveur revérifie
// et refuse l'insertion lui-même : impossible à contourner depuis
// le client.
// =================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { moderateWithGroq } from '../../../../src/lib/moderation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Session invalide' }, { status: 401 })

    const { content, mediaUrl, mediaType, postType, groupId, isGeniusPost } = await req.json()
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
    }

    // ── Modération SCAI — non contournable, exécutée côté serveur ──
    const moderation = await moderateWithGroq(content.trim(), mediaType)
    if (!moderation.approved) {
      return NextResponse.json({
        error: 'moderation_rejected',
        moderation,
      }, { status: 422 })
    }

    const table = groupId ? 'group_posts' : 'posts'
    const insertData: any = {
      author_id: user.id,
      content: content.trim(),
      image_url: mediaUrl || null,
      media_type: mediaType || null,
      moderation_score: moderation.confidence,
      moderation_category: moderation.category,
    }

    if (groupId) {
      insertData.group_id = groupId
    } else {
      insertData.post_type = postType || 'general'
      insertData.is_genius_post = !!isGeniusPost
    }

    const { data: post, error: insertError } = await supabaseAdmin
      .from(table)
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, post, moderation })
  } catch (error: any) {
    console.error('[social/posts] Erreur:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
