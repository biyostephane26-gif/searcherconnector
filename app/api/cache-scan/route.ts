// =================================================================
// SEARCHER CONNECTOR — SCAN PAR CATÉGORIE → CACHE PARTAGÉ
// =================================================================
// Remplace le scan "par utilisateur" pour l'alimentation de fond :
// on scanne une fois par métier (pas une fois par utilisateur), on
// stocke dans cache_opportunities, puis on matche contre les profils
// actifs pour notifier directement ceux qui sont concernés.
// Économie : 1 appel de sources pour N utilisateurs du même métier,
// au lieu de N appels identiques.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllSources, pickTierBatch, runTierBatch, SourceTier } from '../../../src/lib/scraper/generators'
import { CATEGORIES, extractKeywordsForUser } from '../../../src/lib/scraper/categories'
import { detectRequiredLevel, computeLevelMatch } from '../../../src/lib/scraper/skill-matching'
import { typeMatchDelta } from '../../../src/lib/scraper/typeSignals'
import { isPaidPlan } from '../../../src/lib/planUtils'
import { scrapeLinkedIn, scrapeUpwork, scrapeTwitter, HAS_HUMANIST_SCRAPERS } from '../../../src/lib/scraper/humanist'
import { sendOpportunityAlert } from '../../../src/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const INTERNAL_URL = process.env.INTERNAL_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Déclenche une vraie candidature via /api/auto-apply (génère le message,
// l'envoie, notifie l'utilisateur) — non-bloquant, jamais critique pour le scan.
function triggerAutoApply(userId: string, opportunityId: string) {
  fetch(`${INTERNAL_URL}/api/auto-apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, opportunityId, sendVia: 'scai_auto' }),
    signal: AbortSignal.timeout(30000),
  }).catch(e => console.warn('[cache-scan] auto-apply déclenché mais échoué:', e.message))
}

function safeISODate(dateStr?: string): string {
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

function fingerprintOf(title: string, source: string, dateStr?: string): string {
  const day = (dateStr || new Date().toISOString()).slice(0, 10)
  return `${title}::${source}::${day}`.slice(0, 400)
}

export async function POST(req: NextRequest) {
  try {
    // Le bouton "Mode maintenance" du dashboard Founder n'avait aucun effet
    // réel — il écrivait dans app_settings mais rien ne le lisait. On le
    // branche ici : si actif, on saute le scan sans erreur (le scheduler
    // continuera d'appeler cette route toutes les 10-15min sans effet).
    const { data: maintenanceSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'MAINTENANCE_MODE')
      .single()
    if (maintenanceSetting?.value === 'true') {
      return NextResponse.json({ success: true, skipped: true, reason: 'maintenance_mode' })
    }

    const { categories, isPaid = false, useHumanistScrapers = false, sourceTier, humanistCategories } = await req.json() as {
      categories?: string[]; isPaid?: boolean; useHumanistScrapers?: boolean; sourceTier?: SourceTier; humanistCategories?: string[]
    }
    // Les scrapers humanistes (LinkedIn/Upwork/Twitter, payants) ne tournent
    // que sur ce sous-ensemble de catégories (rotation côté scheduler.js) —
    // jamais sur les 14 d'un coup, sinon le coût API explose (×3.5).
    const humanistSet = new Set(humanistCategories || [])
    const targetCategories: string[] = (categories && categories.length ? categories : Object.keys(CATEGORIES))

    const { data: session } = await supabase
      .from('scraper_sessions')
      .insert({ status: 'running', category: targetCategories.join(',') })
      .select('id')
      .single()
      .then(r => r, () => ({ data: null as any }))

    let sourcesScanned = 0
    let opportunitiesFound = 0
    let opportunitiesAdded = 0
    const errors: string[] = []

    // sourceTier (fast/medium/slow/veryslow) : le lot du tick est tiré
    // UNE SEULE FOIS ici (avant la boucle catégories), sinon la rotation
    // avancerait une fois par catégorie au lieu d'une fois par tick de
    // cron — cassant la garantie "palier entier cyclé en 1h". Chaque
    // catégorie exécute ensuite ce même lot avec son propre mot-clé.
    const tierLog: string[] = []
    const tierBatch = sourceTier ? pickTierBatch(sourceTier, isPaid, tierLog) : null
    if (tierLog.length) console.log(tierLog.join(' | '))

    for (const cat of targetCategories) {
      const keywords = CATEGORIES[cat]
      if (!keywords) continue
      const log: string[] = []

      try {
        const term = keywords[0]
        let raw = tierBatch
          ? await runTierBatch(tierBatch, term, log)
          : await fetchAllSources(term, log, isPaid)
        sourcesScanned += 1

        // ── Scrapers humanistes (ScrapingBee/ZenRows/Apify) ──────
        // Réservés au palier le plus fréquent (TIER 1, appelé avec
        // useHumanistScrapers=true) pour maîtriser les crédits.
        // Résultats marqués isPremium → source_type='premium' dans le
        // cache, donc jamais mélangés avec le flux gratuit : le
        // frontend applique déjà le flou/cadenas pour les non-payants.
        const runHumanistForThisCategory = useHumanistScrapers && (humanistSet.size === 0 || humanistSet.has(cat))
        if (runHumanistForThisCategory && HAS_HUMANIST_SCRAPERS) {
          const humanist = await Promise.allSettled([
            scrapeLinkedIn(term, 'worldwide'),
            scrapeUpwork(term),
            scrapeTwitter(`${term} hiring`),
          ])
          const humanistResults = humanist
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => (r as PromiseFulfilledResult<any[]>).value)
            .map((r: any) => ({ ...r, isPremium: true }))
          raw = [...raw, ...humanistResults]
          log.push(`💰 Scrapers humanistes (${cat}): ${humanistResults.length} résultats`)
        }

        opportunitiesFound += raw.length

        // ── Upsert dans le cache partagé (dédup par fingerprint) ──
        const rows = raw
          .filter((r: any) => r.link || r.url)
          .slice(0, 200)
          .map((r: any) => ({
            fingerprint:     fingerprintOf(r.title || '', r.source || 'unknown', r.date),
            title:           (r.title || 'Opportunité').slice(0, 200),
            company:         (r.company || '').slice(0, 150),
            location:        (r.location || '').slice(0, 120),
            country:         '',
            description:     (r.snippet || '').slice(0, 500),
            original_url:    r.link || r.url,
            source_platform: r.source || 'web',
            source_type:     r.isPremium ? 'premium' : 'free',
            category:        cat,
            published_at:    safeISODate(r.date),
            applicants_count: typeof r.applicants_count === 'number' ? r.applicants_count : null,
          }))

        if (rows.length > 0) {
          const { data: inserted, error } = await supabase
            .from('cache_opportunities')
            .upsert(rows, { onConflict: 'fingerprint', ignoreDuplicates: true })
            .select('id')
          if (error) errors.push(`${cat}: ${error.message}`)
          else opportunitiesAdded += inserted?.length || 0
        }
      } catch (e: any) {
        errors.push(`${cat}: ${e.message}`)
      }
    }

    // ── Matching + notification directe des utilisateurs concernés ──
    const matchStats = await matchAndNotify(targetCategories)

    if (session?.id) {
      await supabase.from('scraper_sessions').update({
        status: errors.length > 0 ? 'failed' : 'completed',
        ended_at: new Date().toISOString(),
        sources_scanned: sourcesScanned,
        opportunities_found: opportunitiesFound,
        opportunities_added: opportunitiesAdded,
        errors,
      }).eq('id', session.id)
    }

    return NextResponse.json({
      success: true, categories: targetCategories, sourcesScanned,
      opportunitiesFound, opportunitiesAdded, matched: matchStats, errors,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Compare les nouvelles entrées du cache aux profils actifs et
// (a) crée une opportunité personnalisée dans `opportunities` pour un bon match
// (b) notifie directement si le score est très élevé (offre à fort potentiel)
async function matchAndNotify(categories: string[]): Promise<{ matched: number; notified: number }> {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString() // items ajoutés dans les 15 dernières minutes

  const { data: freshItems } = await supabase
    .from('cache_opportunities')
    .select('*')
    .in('category', categories)
    .gte('created_at', since)
    .limit(500)

  if (!freshItems || freshItems.length === 0) return { matched: 0, notified: 0 }

  // skill_level n'existe que si la migration add_skill_level_matching.sql a
  // été appliquée — sinon la requête entière échouait et users restait null :
  // AUCUN matching ni notification ne tournait plus du tout. Fallback sans
  // la colonne pour que le cœur du produit survive à une migration manquante.
  let { data: users, error: usersError } = await supabase
    .from('users_profiles')
    .select('id, domain, domains, plan, profile_type, email, full_name, skill_level, role')
    .not('domain', 'is', null)

  if (usersError) {
    console.warn('[cache-scan] select users avec skill_level échoué (migration manquante ?) — retry sans:', usersError.message)
    const retry = await supabase
      .from('users_profiles')
      .select('id, domain, domains, plan, profile_type, email, full_name, role')
      .not('domain', 'is', null)
    users = retry.data as any
  }

  if (!users || users.length === 0) return { matched: 0, notified: 0 }

  // Interrupteur explicite d'auto-candidature — désactivé par défaut (opt-in).
  // On ne postule JAMAIS au nom de quelqu'un qui n'a pas coché ce réglage.
  const { data: schedules } = await supabase
    .from('agent_schedules')
    .select('user_id, auto_apply_enabled, auto_apply_threshold')
    .in('user_id', users.map(u => u.id))
  const scheduleByUser = new Map((schedules || []).map((s: any) => [s.user_id, s]))

  let matched = 0, notified = 0
  const opportunityRows: any[] = []
  const notificationRows: any[] = []
  const seenPairs = new Set<string>() // évite doublons user+item dans ce passage
  // Top matchs à fort potentiel par utilisateur, pour un seul email groupé
  // (pas un email par opportunité — évite de spammer)
  const alertsByUser = new Map<string, { to: string; name: string; opportunities: any[] }>()
  // Candidats à l'auto-candidature réelle — traités après l'insert (besoin de l'id)
  const autoApplyCandidates: Array<{ user_id: string; original_url: string }> = []
  // Anti-saturation : évite qu'une seule offre reçoive des dizaines de
  // candidatures auto-générées par nos propres utilisateurs (ex. 100
  // marketeurs sur 1 seul poste) — mauvais pour l'utilisateur (dilue son
  // avantage "premier arrivé") et suspect pour l'employeur.
  const AUTO_APPLY_CAP_PER_OPPORTUNITY = 15
  const autoApplyCountByFingerprint = new Map<string, number>()

  for (const item of freshItems) {
    const hay = `${item.title} ${item.description}`.toLowerCase()
    const hoursAgo = item.published_at
      ? Math.max(0, (Date.now() - new Date(item.published_at).getTime()) / 3600000)
      : 24
    // Niveau requis détecté une seule fois par offre (même pour tous les
    // utilisateurs qui matchent dessus) — voir skill-matching.ts
    const requiredLevel = detectRequiredLevel(item.title, item.description)

    for (const u of users) {
      // Jusqu'à 3 domaines/utilisateur — matche sur l'union de leurs mots-clés
      const kws = extractKeywordsForUser((u as any).domains, u.domain)
      if (kws.length === 0) continue
      const hits = kws.filter(k => hay.includes(k)).length
      if (hits === 0) continue

      const key = `${u.id}::${item.fingerprint}`
      if (seenPairs.has(key)) continue
      seenPairs.add(key)

      // ── Barème fraîcheur (identique à scan.ts scoreLocally) ──────
      // Payant : <6h ultra frais (+50) ... >14j trop vieux (-50)
      // Gratuit : boost plus faible, même logique
      const isPaidUser = isPaidPlan(u as any)
      let freshnessBoost = 0
      if (isPaidUser) {
        if (hoursAgo < 6) freshnessBoost = 50
        else if (hoursAgo < 12) freshnessBoost = 40
        else if (hoursAgo < 24) freshnessBoost = 30
        else if (hoursAgo < 48) freshnessBoost = 20
        else if (hoursAgo > 336) freshnessBoost = -50
      } else {
        if (hoursAgo < 6) freshnessBoost = 12
        else if (hoursAgo < 24) freshnessBoost = 6
        else if (hoursAgo > 336) freshnessBoost = -12
      }

      // ── Boost "peu de candidats" — seulement si la donnée est connue ──
      // (la plupart des sources n'exposent pas ce chiffre : absent ≠ zéro)
      let applicantsBoost = 0
      if (typeof item.applicants_count === 'number') {
        if (item.applicants_count < 10) applicantsBoost = 60
        else if (item.applicants_count < 20) applicantsBoost = 30
      }

      // ── Niveau de compétence — boost/malus selon l'adéquation ────────
      const levelMatch = computeLevelMatch((u as any).skill_level, requiredLevel)

      // ── Type de profil (freelance/emploi/investisseur/entreprise) ────
      // Sans ça, une offre CDI classique pouvait être poussée en
      // NOTIFICATION (pas juste affichée) à un profil freelance, juste
      // parce que le domaine matchait — jamais vérifié que le TYPE de
      // mission correspondait vraiment à ce que l'utilisateur cherche.
      const typeDelta = typeMatchDelta((u as any).profile_type, hay)

      const score = Math.max(0, Math.min(100, 40 + hits * 20 + freshnessBoost + applicantsBoost + levelMatch.boost + typeDelta))
      matched++

      opportunityRows.push({
        user_id:          u.id,
        title:            item.title,
        company:          item.company,
        location:         item.location,
        country:          item.country,
        score,
        match_reason:     `${hits} terme(s) du domaine "${u.domain}" trouvé(s) dans une opportunité ${item.category}.`
                          + (requiredLevel ? ` Niveau requis estimé : ${requiredLevel}.` : ''),
        source_platform:  item.source_platform,
        original_url:     item.original_url,
        status:           'found',
        hours_ago:        Math.round(hoursAgo),
        applicants_count: item.applicants_count,
        required_level:   requiredLevel,
        recommended:      levelMatch.recommended,
      })

      if (score >= 85) {
        notified++
        notificationRows.push({
          user_id:         u.id,
          type:            'opportunity',
          title:           `🎯 Opportunité à fort potentiel trouvée`,
          message:         `"${item.title}"${item.company ? ' chez ' + item.company : ''} correspond à ton profil.`,
          is_read:         false,
          action_url:      item.original_url,
          action_label:    'Voir l\'offre',
          requires_action: true,
        })

        if (u.email) {
          if (!alertsByUser.has(u.id)) {
            alertsByUser.set(u.id, { to: u.email, name: u.full_name || 'là', opportunities: [] })
          }
          alertsByUser.get(u.id)!.opportunities.push({
            title: item.title, score, source: item.source_platform,
            hours_ago: Math.round(hoursAgo), url: item.original_url,
          })
        }

        // ── Auto-candidature réelle — seulement si explicitement activée ──
        // ET seulement sur des sources ouvertes (ATS, job boards, RSS) —
        // jamais sur les réseaux fermés scrapés (LinkedIn/Upwork/Twitter/
        // Facebook/Instagram, préfixe "humanist:") : il n'existe aucun canal
        // de candidature réel sans se connecter au compte du réseau, donc
        // "SCAI a postulé seul" y serait un mensonge — et forcer une action
        // automatisée sur un compte tiers login-walled est le genre de chose
        // qui expose à un bannissement, ce qu'on veut justement éviter.
        const isOpenSource = !item.source_platform?.startsWith('humanist:')
        const schedule = scheduleByUser.get(u.id) as any
        const autoThreshold = schedule?.auto_apply_threshold || 80
        const autoApplyCountSoFar = autoApplyCountByFingerprint.get(item.fingerprint) || 0
        if (
          schedule?.auto_apply_enabled &&
          isOpenSource &&
          score >= autoThreshold &&
          autoApplyCountSoFar < AUTO_APPLY_CAP_PER_OPPORTUNITY
        ) {
          autoApplyCandidates.push({ user_id: u.id, original_url: item.original_url })
          autoApplyCountByFingerprint.set(item.fingerprint, autoApplyCountSoFar + 1)
        }
      }
    }
  }

  if (opportunityRows.length > 0) {
    let { data: inserted, error } = await supabase
      .from('opportunities')
      .insert(opportunityRows)
      .select('id, user_id, original_url')
    // required_level/recommended n'existent que si la migration
    // add_skill_level_matching.sql est appliquée — retry sans ces champs
    // plutôt que de perdre TOUTES les opportunités personnalisées.
    if (error && /required_level|recommended/.test(error.message)) {
      console.warn('[cache-scan] retry insert sans colonnes skill-matching (migration manquante ?):', error.message)
      const stripped = opportunityRows.map(({ required_level, recommended, ...rest }) => rest)
      const retry = await supabase
        .from('opportunities')
        .insert(stripped)
        .select('id, user_id, original_url')
      inserted = retry.data
      error = retry.error
    }
    if (error) {
      console.warn('[cache-scan] insert opportunities failed:', error.message)
    } else if (autoApplyCandidates.length > 0 && inserted) {
      // Retrouve l'id réel de chaque opportunité candidate à l'auto-apply
      for (const candidate of autoApplyCandidates) {
        const row = inserted.find((r: any) => r.user_id === candidate.user_id && r.original_url === candidate.original_url)
        if (row?.id) triggerAutoApply(candidate.user_id, row.id)
      }
    }
  }

  // ── Email groupé pour les matchs à fort potentiel ─────────────────
  // Non-bloquant : un échec d'envoi ne doit jamais faire échouer le scan.
  for (const alert of alertsByUser.values()) {
    sendOpportunityAlert(alert).catch(e => console.warn('[cache-scan] email alert failed:', e.message))
  }
  if (notificationRows.length > 0) {
    const { error } = await supabase.from('notifications').insert(notificationRows)
    if (error) console.warn('[cache-scan] insert notifications failed:', error.message)
  }

  return { matched, notified }
}
