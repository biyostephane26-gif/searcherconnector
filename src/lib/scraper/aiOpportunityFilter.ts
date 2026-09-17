// =================================================================
// FILTRE IA — quasi-doublons + pertinence réelle des opportunités
// =================================================================
// Le scoring par mots-clés (scoreLocally, scan.ts) et le dédoublonnage
// par URL exacte (scan.ts) sont mécaniques : ils ne peuvent pas voir
// qu'une même mission a été republiée sous un titre différent sur un
// autre site, ni juger si une offre correspond VRAIMENT au profil
// au-delà d'un simple recoupement de mots-clés. C'est exactement pour
// ça que l'utilisateur a demandé un vrai passage IA en plus, pas à la
// place, du filtrage mécanique (qui reste plus rapide et fiable pour
// ce qu'il sait déjà bien faire : URL identique = même offre, certain).
//
// Un seul appel IA par scan (liste groupée), jamais un appel par
// opportunité — sinon un scan de 40 résultats coûterait 40 appels IA,
// bien trop lent et coûteux à l'échelle de plusieurs utilisateurs.
// Best-effort : si l'IA échoue ou dépasse le budget de temps, le scan
// continue avec la liste mécanique non filtrée plutôt que d'échouer.
import { generateJson } from '../server/aiText'

// Au-delà, on ne garde que les N mieux scorées pour le passage IA — un
// prompt de plusieurs centaines d'offres serait lent et coûteux pour un
// gain marginal (les moins bien scorées ont peu de chances d'être
// affichées en premier de toute façon).
const MAX_CANDIDATES_FOR_AI = 60

export interface FilterableOpportunity {
  title: string
  company?: string
  source_platform?: string
  match_reason?: string
  score: number
  original_url?: string
}

export interface AiFilterResult<T> {
  kept: T[]
  removedCount: number
  removedLog: string[] // ex: "Growth Manager @ Acme — doublon de #3 (même mission, Upwork+LinkedIn)"
}

export async function aiFilterOpportunities<T extends FilterableOpportunity>(
  candidates: T[],
  profile: { domain?: string; profile_type?: string; skill_level?: string }
): Promise<AiFilterResult<T>> {
  if (candidates.length === 0) return { kept: candidates, removedCount: 0, removedLog: [] }

  // Garde tel quel au-delà du budget IA — jamais tronquer sans le dire.
  const forAi = candidates.slice(0, MAX_CANDIDATES_FOR_AI)
  const rest = candidates.slice(MAX_CANDIDATES_FOR_AI)

  const list = forAi.map((o, i) =>
    `${i}. "${o.title.slice(0, 100)}" @ ${(o.company || '?').slice(0, 60)} — source: ${o.source_platform || '?'} — score mots-clés: ${o.score}${o.match_reason ? ` — ${o.match_reason.slice(0, 120)}` : ''}`
  ).join('\n')

  const prompt = `Tu vérifies une liste d'opportunités déjà présélectionnées par mots-clés pour un profil ${profile.profile_type || 'freelance'} en "${profile.domain || 'non précisé'}"${profile.skill_level ? `, niveau ${profile.skill_level}` : ''}.

Liste (index. titre @ entreprise — source — score — raison du match) :
${list}

Identifie UNIQUEMENT les entrées à retirer, pour deux raisons possibles :
1. "duplicate" : décrit clairement LA MÊME mission/offre réelle qu'une autre entrée de la liste (souvent republiée sur un site différent, titre reformulé) — donne l'index de l'entrée gardée en "duplicate_of".
2. "irrelevant" : ne correspond PAS vraiment au domaine/niveau du profil malgré le score mots-clés (ex: un mot-clé matché par coïncidence sur un métier totalement différent), OU le titre/contenu semble faux, tronqué, spam, ou un simple placeholder sans substance réelle.

Ne retire PAS une offre juste parce qu'elle est de qualité moyenne ou peu payée — seulement doublon ou hors-sujet/suspect. En cas de doute, garde l'entrée.

Réponds UNIQUEMENT en JSON : {"remove": [{"index": number, "reason": "duplicate"|"irrelevant", "duplicate_of": number|null, "note": string}]}
"note" : une phrase courte en français expliquant pourquoi (visible dans le journal du scan).`

  try {
    const result = await generateJson<{ remove: Array<{ index: number; reason: string; duplicate_of: number | null; note: string }> }>(
      prompt,
      (v) => Array.isArray(v?.remove),
      { maxTokens: 2000 }
    )

    const toRemove = new Set<number>()
    const removedLog: string[] = []
    for (const r of result.remove) {
      if (typeof r.index !== 'number' || r.index < 0 || r.index >= forAi.length || toRemove.has(r.index)) continue
      toRemove.add(r.index)
      const o = forAi[r.index]
      const dupOf = typeof r.duplicate_of === 'number' && forAi[r.duplicate_of] ? ` (doublon de "${forAi[r.duplicate_of].title.slice(0, 60)}")` : ''
      removedLog.push(`🤖 Retiré par l'IA — "${o.title.slice(0, 60)}"${dupOf} : ${r.note || r.reason}`)
    }

    const kept = forAi.filter((_, i) => !toRemove.has(i)).concat(rest)
    return { kept, removedCount: toRemove.size, removedLog }
  } catch (e: any) {
    // Best-effort : jamais bloquer un scan pour un filtre de confort.
    return { kept: candidates, removedCount: 0, removedLog: [`⚠️ Filtre IA indisponible (${String(e?.message || e).slice(0, 80)}) — liste mécanique conservée telle quelle.`] }
  }
}
