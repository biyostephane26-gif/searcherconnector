// =================================================================
// SCAI Cowork — génération de documents (PDF, Excel, Word)
// =================================================================
// Cœur de la génération, indépendant de la requête HTTP — appelé par
// app/api/tools/document/route.ts (après vérification de session) et
// par le moteur de tâches Cowork en arrière-plan (scheduler.js), qui
// n'a pas de session utilisateur.
// =================================================================

import { supabaseAdmin } from '../supabaseAdmin'
import { generateJson } from './aiText'
import { logToolUsage } from './logToolUsage'
import { saveFileOutput } from './saveCoworkOutput'
import { buildPdf, buildXlsx, buildDocx, type DocSpec, type WorkbookSpec } from './documentBuilders'

export const DOCUMENT_MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const
export type DocumentFormat = keyof typeof DOCUMENT_MIME

const slug = (s: string) => (s || 'document').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'document'

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

async function tableFromSource(userId: string, source: string): Promise<{ title: string; columns: string[]; rows: (string | number | null)[][] } | null> {
  if (source === 'opportunities') {
    const { data } = await supabaseAdmin.from('opportunities')
      .select('title, company, source_platform, country, score, applicants_count, salary_min, salary_max, currency, status, published_at, original_url')
      .eq('user_id', userId).order('score', { ascending: false }).limit(500)
    return {
      title: 'Mes opportunités',
      columns: ['Titre', 'Entreprise', 'Plateforme', 'Pays', 'Score', 'Postulants', 'Budget', 'Statut', 'Publiée le', 'Lien'],
      rows: (data || []).map((o: any) => [
        o.title, o.company, o.source_platform, o.country, o.score, o.applicants_count,
        o.salary_max ? `${o.salary_min || ''}-${o.salary_max} ${o.currency || ''}`.trim() : '',
        o.status, fmtDate(o.published_at), o.original_url,
      ]),
    }
  }
  if (source === 'applications') {
    const { data } = await supabaseAdmin.from('applications_tracking')
      .select('job_title, company, status, sent_via, applied_at, interview_date, offer_amount, offer_currency, original_url')
      .eq('user_id', userId).order('applied_at', { ascending: false }).limit(500)
    return {
      title: 'Suivi de mes candidatures',
      columns: ['Poste', 'Entreprise', 'Statut', 'Envoyée via', 'Date', 'Entretien', 'Offre', 'Lien'],
      rows: (data || []).map((a: any) => [
        a.job_title, a.company, a.status, a.sent_via, fmtDate(a.applied_at), fmtDate(a.interview_date),
        a.offer_amount ? `${a.offer_amount} ${a.offer_currency || ''}`.trim() : '', a.original_url,
      ]),
    }
  }
  return null
}

function profileContext(profile: any) {
  if (!profile) return ''
  return [
    profile.full_name && `Nom : ${profile.full_name}`,
    profile.domain && `Domaine : ${profile.domain}`,
    Array.isArray(profile.skills) && profile.skills.length && `Compétences : ${profile.skills.join(', ')}`,
    profile.country && `Pays : ${profile.country}`,
    profile.bio && `Bio : ${profile.bio}`,
    profile.email && `Email : ${profile.email}`,
    profile.portfolio_url && `Portfolio : ${profile.portfolio_url}`,
    profile.linkedin_url && `LinkedIn : ${profile.linkedin_url}`,
    profile.github_url && `GitHub : ${profile.github_url}`,
  ].filter(Boolean).join('\n')
}

export async function generateDocumentForUser(
  userId: string, profile: any, params: { format: DocumentFormat; prompt?: string; source?: string }
): Promise<{ title: string; filename: string; mime: string; base64: string; size: number } | { error: string }> {
  const format = params.format
  if (!DOCUMENT_MIME[format]) return { error: 'Format attendu : pdf, xlsx ou docx' }
  const prompt = String(params.prompt || '').trim().slice(0, 4000)
  const source = params.source ? String(params.source) : ''

  try {
    let buffer: Buffer
    let title: string

    if (source) {
      const table = await tableFromSource(userId, source)
      if (!table) return { error: 'Source inconnue' }
      title = table.title
      const subtitle = `${table.rows.length} ligne(s) - export du ${new Date().toLocaleDateString('fr-FR')}`
      if (format === 'xlsx') buffer = await buildXlsx({ title, sheets: [{ name: title, columns: table.columns, rows: table.rows }] })
      else {
        const spec: DocSpec = { title, subtitle, sections: [{ table: { columns: table.columns.slice(0, format === 'pdf' ? 6 : 8), rows: table.rows.map(r => r.slice(0, format === 'pdf' ? 6 : 8)) } }] }
        buffer = format === 'pdf' ? buildPdf(spec) : await buildDocx(spec)
      }
    } else {
      if (prompt.length < 3) return { error: 'Décris le document à créer.' }
      const ctx = profileContext(profile)

      if (format === 'xlsx') {
        const spec = await generateJson<WorkbookSpec>(
`Tu es SCAI, l'assistant de Searcher Connector. Crée un classeur Excel pour la demande ci-dessous.
Réponds UNIQUEMENT en JSON valide : {"title": string, "sheets": [{"name": string, "columns": string[], "rows": (string|number)[][]}]}
Règles : données réalistes et utiles, en français, nombres en type number, au moins 5 lignes quand c'est pertinent, 3 feuilles maximum, 40 lignes maximum par feuille.

Profil de l'utilisateur (à utiliser si pertinent) :
${ctx}

Demande : ${prompt}`, v => Array.isArray(v?.sheets) && v.sheets.length > 0 && v.sheets.every((sh: any) => Array.isArray(sh.columns) && Array.isArray(sh.rows)))
        title = spec.title || 'Classeur SCAI'
        buffer = await buildXlsx(spec)
      } else {
        const spec = await generateJson<DocSpec>(
`Tu es SCAI, l'assistant de Searcher Connector. Rédige le document demandé ci-dessous, complet et prêt à l'emploi.
Réponds UNIQUEMENT en JSON valide :
{"title": string, "subtitle": string, "sections": [{"heading": string, "paragraphs": string[], "bullets": string[], "table": {"columns": string[], "rows": string[][]} | null}]}
Règles : français professionnel, contenu concret (pas de [à compléter] sauf coordonnées inconnues), sans émojis, sans markdown.
Le document est écrit AU NOM de l'utilisateur (c'est lui l'auteur, le freelance ou le candidat) : ne mentionne jamais Searcher Connector ni SCAI dans le contenu.

Profil de l'utilisateur (à utiliser si pertinent, ex. CV ou lettre) :
${ctx}

Demande : ${prompt}`, v => typeof v?.title === 'string' && Array.isArray(v?.sections) && v.sections.length > 0, { maxTokens: 6000 })
        spec.sections = spec.sections.map(s => ({ ...s, table: s.table && s.table.columns?.length ? s.table : undefined }))
        title = spec.title || 'Document SCAI'
        buffer = format === 'pdf' ? buildPdf(spec) : await buildDocx(spec)
      }
    }

    logToolUsage(userId, format, title)
    saveFileOutput(userId, format, title, buffer, DOCUMENT_MIME[format]).catch(() => {})
    return {
      title,
      filename: `${slug(title)}.${format}`,
      mime: DOCUMENT_MIME[format],
      base64: buffer.toString('base64'),
      size: buffer.length,
    }
  } catch (e: any) {
    console.error('[tools/document]', e?.message)
    return { error: `Génération impossible : ${e?.message || 'erreur inconnue'}` }
  }
}
