// Persiste une "Sortie" de SCAI Cowork (fichier généré) — panneau Sorties
// consultable indépendamment de la conversation qui l'a créée, contrairement
// à l'ancien comportement où le fichier n'existait que dans l'état React
// local du chat (perdu au rechargement de la page).
import { supabaseAdmin } from '../supabaseAdmin'

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export async function saveFileOutput(userId: string, kind: 'pdf' | 'xlsx' | 'docx', title: string, buffer: Buffer, mime: string) {
  const ext = MIME_EXT[mime] || kind
  const path = `cowork-outputs/${userId}/${Date.now()}-${slug(title)}.${ext}`
  const { error: upErr } = await supabaseAdmin.storage.from('DOCUMENTS').upload(path, buffer, { contentType: mime, upsert: false })
  if (upErr) { console.warn('[cowork-outputs] upload échoué (non bloquant):', upErr.message); return null }
  const { data } = supabaseAdmin.storage.from('DOCUMENTS').getPublicUrl(path)
  const { data: row } = await supabaseAdmin.from('cowork_outputs')
    .insert({ user_id: userId, kind, title, file_url: data.publicUrl, status: 'ready' })
    .select('id').single()
  return row?.id || null
}

export async function saveImageOutput(userId: string, title: string, dataUri: string) {
  const match = dataUri.match(/^data:(image\/[a-z]+);base64,(.+)$/)
  if (!match) return null
  const ext = match[1].split('/')[1] || 'png'
  const buffer = Buffer.from(match[2], 'base64')
  const path = `cowork-outputs/${userId}/${Date.now()}-${slug(title)}.${ext}`
  const { error: upErr } = await supabaseAdmin.storage.from('DOCUMENTS').upload(path, buffer, { contentType: match[1], upsert: false })
  if (upErr) { console.warn('[cowork-outputs] upload image échoué (non bloquant):', upErr.message); return null }
  const { data } = supabaseAdmin.storage.from('DOCUMENTS').getPublicUrl(path)
  const { data: row } = await supabaseAdmin.from('cowork_outputs')
    .insert({ user_id: userId, kind: 'image', title, file_url: data.publicUrl, status: 'ready' })
    .select('id').single()
  return row?.id || null
}

// Vidéo : job encore en cours au moment de la création — la ligne est
// mise à jour plus tard (voir /api/tools/video, statut interrogé par le
// panneau Sorties comme le fait déjà l'aperçu dans le chat).
export async function saveVideoOutputPending(userId: string, title: string, job: string, provider: string) {
  const { data: row } = await supabaseAdmin.from('cowork_outputs')
    .insert({ user_id: userId, kind: 'video', title, status: 'processing', meta: { job, provider } })
    .select('id').single()
  return row?.id || null
}

function slug(s: string) {
  return (s || 'fichier').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 50) || 'fichier'
}
