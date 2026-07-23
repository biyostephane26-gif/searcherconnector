// =================================================================
// API pour supprimer un document
// =================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, documentId } = body

    if (!userId || !documentId) {
      return NextResponse.json({ error: 'userId et documentId requis' }, { status: 400 })
    }

    // D'abord récupérer le document pour l'URL du fichier
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from('uploaded_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Supprimer le fichier du storage si on peut extraire le chemin
    if (doc.file_url) {
      try {
        // Extraire le chemin depuis l'URL publique
        // Format typique : https://[ref.supabase.co/storage/v1/object/public/DOCUMENTS/[userId]/[fichier]
        const url = new URL(doc.file_url)
        const pathParts = url.pathname.split('/')
        const docIndex = pathParts.indexOf('DOCUMENTS')
        if (docIndex !== -1) {
          const filePath = pathParts.slice(docIndex + 1).join('/')
          await supabaseAdmin.storage.from('DOCUMENTS').remove([filePath])
        }
      } catch (storageErr) {
        console.log('[documents/delete] Erreur suppression fichier (continuons quand même):', storageErr)
      }
    }

    // Supprimer la ligne en DB
    const { error: deleteError } = await supabaseAdmin
      .from('uploaded_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[documents/delete] Supabase error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[documents/delete] Exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
