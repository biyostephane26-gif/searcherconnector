// Journalise l'usage des outils SCAI Cowork (documents, images, vidéos)
// dans searcher_logs — réutilisé pour l'afficher sur /transactions
// ("Utilisation ce mois-ci") et, plus tard, pour une éventuelle limite
// par plan. Fire-and-forget : un échec d'écriture ne doit jamais faire
// échouer la génération elle-même.
import { supabaseAdmin } from '../supabaseAdmin'

export function logToolUsage(userId: string, tool: 'pdf' | 'xlsx' | 'docx' | 'image' | 'video', detail?: string) {
  supabaseAdmin.from('searcher_logs').insert({
    user_id: userId,
    action_type: `scai_tool_${tool}`,
    description: detail || `Génération ${tool} via SCAI Cowork`,
    platform: 'SCAI Cowork',
  }).then(() => {}, () => {})
}
