'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/layout/Sidebar'
import OpportunityCard from '../components/dashboard/OpportunityCard'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { Search, Zap, X, ExternalLink, CheckCircle, XCircle, AlertTriangle, Globe, Clock, Star, ChevronRight, FileText } from 'lucide-react'
import { usePDF } from '../hooks/usePDF'
import { computeProfileCompletion } from '../lib/profileCompletion'
import { detectAtsPlatform } from '../lib/scraper/atsPlatformDetect'
import { categorizeOpportunityTitle, CATEGORY_LABELS } from '../lib/scraper/categories'
import { isPaidPlan } from '../lib/planUtils'
import { useTranslation } from 'react-i18next'

export default function Opportunities() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const router = useRouter()
  const { exportOpportunities } = usePDF()
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'recommended' | 'freshest' | 'highest_paid'>('recommended')
  const [selected, setSelected] = useState<any>(null)        // opportunité sélectionnée
  const [readiness, setReadiness] = useState<any>(null)      // score de préparation
  const [loadingReadiness, setLoadingReadiness] = useState(false)
  // Candidature en série — pour ceux qui n'installent pas l'extension :
  // au lieu de rechercher chaque message à la main, copier, naviguer,
  // revenir, copier encore, un flux guidé qui enchaîne les candidatures
  // déjà préparées par SCAI en 2 clics chacune.
  const [queueOpen, setQueueOpen] = useState(false)
  const [queueItems, setQueueItems] = useState<any[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueCopied, setQueueCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchOpportunities = async () => {
      let query = supabase
        .from('opportunities')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: false })

      if (filter === 'applied') query = query.eq('status', 'ready_to_send')
      if (filter === 'pending') query = query.eq('status', 'pending_action')

      const { data } = await query
      
      // FREEMIUM: limiter à 10 opportunités pour free users (6 accessibles + 4 premium floutées affichées)
      if (data) {
        const isFree = !isPaidPlan(profile)
        if (isFree && data.length > 10) {
          setOpportunities(data.slice(0, 10))
        } else {
          setOpportunities(data)
        }
      }
      setLoading(false)
    }
    fetchOpportunities()
  }, [user, filter === 'applied' || filter === 'pending' ? filter : 'client', profile])

  const handleApply = async (id: string) => {
    const opp = opportunities.find(o => o.id === id)
    if (!opp || !user) return
    
    // BLOQUER pour free users
    const isFree = !isPaidPlan(profile)
    if (isFree) {
      alert(t('oppPage.alerts.premiumRequired'))
      router.push('/pricing')
      return
    }

    // Appeler l'API auto-apply qui génère le message, l'enregistre et retourne le lien
    try {
      const res = await fetch('/api/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, opportunityId: id }),
      })
      const data = await res.json()

      if (data.requiresManual) {
        // Score trop bas / quota atteint / plan ne permet pas → toujours
        // prévenir l'utilisateur du POURQUOI avant d'ouvrir l'offre en
        // secours (avant ce fix : silence total quand original_url manquait).
        alert(data.error || t('oppPage.alerts.cannotAutoPrepare'))
        if (opp.original_url) window.open(opp.original_url, '_blank')
        return
      }

      if (data.success) {
        setOpportunities(prev => prev.map(o => o.id === id ? {
          ...o, status: 'ready_to_send', application_id: data.application_id
        } : o))
        if (selected?.id === id) {
          setSelected((prev: any) => prev ? {
            ...prev, status: 'ready_to_send', application_id: data.application_id
          } : prev)
        }
        return
      }

      // Ni succès ni requiresManual (ex. rate-limit 429, profil/offre 404,
      // erreur serveur 500) — avant ce fix : bouton "ne faisait rien" car
      // aucun des deux cas ci-dessus n'était couvert.
      alert(data.error || t('oppPage.alerts.prepareFailed'))
    } catch (err) {
      // Ne JAMAIS marquer comme "prête" si l'appel a échoué — le message
      // n'a pas été généré, l'utilisateur ne doit pas croire le contraire.
      alert(t('oppPage.alerts.prepareFailed'))
    }
  }

  // Charge toutes les offres déjà préparées par SCAI (message généré,
  // status='ready_to_send') et démarre le défilé guidé.
  const openQueue = async () => {
    const ready = opportunities.filter(o => o.status === 'ready_to_send')
    if (ready.length === 0) return
    setQueueLoading(true)
    const { data: apps } = await supabase
      .from('applications_sent')
      .select('opportunity_id, cover_message')
      .in('opportunity_id', ready.map(o => o.id))
    const messageByOppId = new Map((apps || []).map((a: any) => [a.opportunity_id, a.cover_message]))
    setQueueItems(ready.map(o => ({ ...o, message: messageByOppId.get(o.id) || '' })))
    setQueueIndex(0)
    setQueueLoading(false)
    setQueueOpen(true)
  }

  const copyQueueMessage = () => {
    const item = queueItems[queueIndex]
    if (!item?.message) return
    navigator.clipboard.writeText(item.message)
    setQueueCopied(true)
    setTimeout(() => setQueueCopied(false), 1500)
  }

  const openQueueOffer = () => {
    const item = queueItems[queueIndex]
    if (item?.original_url) window.open(item.original_url, '_blank')
  }

  const nextQueueItem = () => {
    setQueueCopied(false)
    if (queueIndex + 1 >= queueItems.length) { setQueueOpen(false); return }
    setQueueIndex(i => i + 1)
  }

  // Copie automatique à chaque étape — pas besoin de re-cliquer "Copier"
  // avant de coller, le presse-papier est toujours prêt pour l'offre en cours.
  useEffect(() => {
    if (!queueOpen) return
    const item = queueItems[queueIndex]
    if (item?.message) navigator.clipboard.writeText(item.message).catch(() => {})
  }, [queueOpen, queueIndex])

  // Calculer le score de préparation pour une opportunité
  const computeReadiness = (opp: any) => {
    // Live, pas la colonne profile_completion figée à l'onboarding (même
    // bug que Sidebar.tsx — voir src/lib/profileCompletion.ts)
    const { percent: liveCompletion } = computeProfileCompletion(profile, true)
    const checks = [
      { label: t('oppPage.checks.profileComplete'), ok: liveCompletion >= 70, tip: t('oppPage.checks.profileCompleteTip') },
      { label: t('oppPage.checks.bio'),             ok: !!profile?.bio && (profile.bio?.length || 0) > 50, tip: t('oppPage.checks.bioTip') },
      { label: t('oppPage.checks.links'),           ok: !!(profile?.portfolio_url || profile?.github_url || profile?.linkedin_url), tip: t('oppPage.checks.linksTip') },
      { label: t('oppPage.checks.docs'),            ok: true, tip: '' },  // simplifié
      { label: t('oppPage.checks.domain'),          ok: opp.match_reason?.includes(profile?.domain?.split(' ')[0] || 'x') || opp.score >= 60, tip: t('oppPage.checks.domainTip') },
    ]
    const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100)
    return { checks, score }
  }

  const handleSelectOpp = (opp: any) => {
    setSelected(opp)
    setReadiness(computeReadiness(opp))
  }

  const FILTERS = [
    { key: 'all',      label: t('oppPage.filters.all') },
    { key: 'for_you',  label: t('oppPage.filters.forYou') },
    { key: 'fresh',    label: t('oppPage.filters.fresh') },
    { key: 'low_comp', label: t('oppPage.filters.lowComp') },
    { key: 'applied',  label: t('oppPage.filters.applied') },
    { key: 'pending',  label: t('oppPage.filters.pending') },
    { key: 'ats_auto', label: t('oppPage.filters.atsAuto') },
    { key: 'manual',   label: t('oppPage.filters.manual') },
  ]

  const SORTS: { key: typeof sortBy; label: string }[] = [
    { key: 'recommended',  label: t('oppPage.sorts.recommended') },
    { key: 'freshest',     label: t('oppPage.sorts.freshest') },
    { key: 'highest_paid', label: t('oppPage.sorts.highestPaid') },
  ]

  // Envoi auto (Greenhouse/Lever, aucun compte requis, formulaire public) vs
  // envoi manuel requis (tout le reste — LinkedIn/Upwork/sites custom, où
  // aucun outil ne peut soumettre sans qu'un humain clique lui-même, voir
  // atsSubmit.ts pour le détail des raisons).
  const isAtsAuto = (opp: any) => !!detectAtsPlatform(opp.original_url || '')

  // Âge réel en heures. hours_ago est figé au moment du scan : une offre
  // scannée il y a 3 jours avec hours_ago=2 n'est plus fraîche. On part donc
  // de published_at, sinon de hours_ago + temps écoulé depuis le scan.
  const ageHours = (o: any): number => {
    const now = Date.now()
    if (o.published_at) {
      const t = new Date(o.published_at).getTime()
      if (!isNaN(t)) return Math.max(0, (now - t) / 3_600_000)
    }
    const scannedAt = o.created_at ? new Date(o.created_at).getTime() : now
    const since = isNaN(scannedAt) ? 0 : (now - scannedAt) / 3_600_000
    return (typeof o.hours_ago === 'number' ? o.hours_ago : Infinity) + since
  }

  // « Pour toi » : offre recommandée ou score élevé, qui recoupe le domaine
  // ou les compétences du profil.
  const profileTerms: string[] = [
    ...((profile?.domains as string[] | undefined) || []),
    ...(profile?.domain ? [profile.domain] : []),
    ...((profile?.skills as string[] | undefined) || []),
  ].map(t => String(t).toLowerCase().trim()).filter(t => t.length > 2)
  const isForYou = (o: any) => {
    if ((o.score || 0) < 60 && !o.recommended) return false
    if (profileTerms.length === 0) return true
    const hay = `${o.title || ''} ${o.match_reason || ''} ${o.company || ''}`.toLowerCase()
    return o.recommended || (o.score || 0) >= 80 || profileTerms.some(t => hay.includes(t))
  }

  const LOW_COMPETITION_MAX = 15
  const isLowCompetition = (o: any) =>
    typeof o.applicants_count === 'number' && o.applicants_count < LOW_COMPETITION_MAX

  // Catégorie calculée à l'affichage à partir du titre (pas de colonne
  // `category` en base sur `opportunities` — voir categorizeOpportunityTitle).
  const categoryOf = (o: any) => categorizeOpportunityTitle(o.title || '', o.match_reason || '')
  const categoryCounts: Record<string, number> = {}
  for (const o of opportunities) {
    const cat = categoryOf(o)
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  }
  const availableCategories: [string, number][] = Object.keys(categoryCounts)
    .map(cat => [cat, categoryCounts[cat]] as [string, number])
    .sort((a, b) => b[1] - a[1])

  const filteredByMechanism = opportunities.filter(o => {
    if (categoryFilter !== 'all' && categoryOf(o) !== categoryFilter) return false
    if (filter === 'ats_auto') return isAtsAuto(o)
    if (filter === 'manual')   return !isAtsAuto(o)
    if (filter === 'fresh')    return ageHours(o) < 24
    if (filter === 'for_you')  return isForYou(o)
    if (filter === 'low_comp') return isLowCompetition(o)
    return true
  })

  const sortedOpportunities = [...filteredByMechanism].sort((a, b) => {
    if (sortBy === 'freshest')     return ageHours(a) - ageHours(b)
    if (sortBy === 'highest_paid') return (b.salary_max || 0) - (a.salary_max || 0)
    if (sortBy === 'recommended') {
      if (!!b.recommended !== !!a.recommended) return b.recommended ? 1 : -1
      return (b.score || 0) - (a.score || 0)
    }
    return (b.score || 0) - (a.score || 0)
  })

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header */}
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">{t('opportunities.title')}</h2>
          <div className="flex items-center gap-3">
            <div className="text-[10px] tracking-widest text-[#D4AF37] font-bold uppercase">
              {t('oppPage.count', { count: opportunities.length })}
            </div>
            {opportunities.some(o => o.status === 'ready_to_send') && (
              <button
                onClick={openQueue}
                className="flex items-center gap-1.5 text-xs text-black bg-[#D4AF37] hover:bg-[#e0bd4f] px-3 py-1.5 rounded-lg transition-all font-bold">
                <Zap className="w-3.5 h-3.5" /> {t('oppPage.applyInSeries')}
              </button>
            )}
            {opportunities.length > 0 && (
              <button
                onClick={() => exportOpportunities(opportunities, profile?.full_name || 'Profil')}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D4AF37] border border-[#2a2a2a] hover:border-[#D4AF37]/30 px-3 py-1.5 rounded-lg transition-all">
                <FileText className="w-3.5 h-3.5" /> {t('oppPage.exportPdf')}
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Liste des opportunités */}
          <div className={`flex-1 overflow-y-auto p-6 ${selected ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
            {/* Filtres */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === f.key ? 'bg-[#D4AF37] text-black' : 'bg-[#111] text-gray-400 hover:text-white border border-[#2a2a2a]'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Catégorie — calculée à partir du titre de chaque offre, ne
                montre que les catégories réellement présentes dans les
                résultats de l'utilisateur (pas les 14 en dur à chaque fois). */}
            {availableCategories.length > 1 && (
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex-shrink-0">{t('oppPage.category')}</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-[#111] border border-[#2a2a2a] text-xs font-bold text-white rounded-full px-3 py-1.5 focus:outline-none focus:border-[#D4AF37]/60"
                >
                  <option value="all">{t('oppPage.allCategories', { count: opportunities.length })}</option>
                  {availableCategories.map(([cat, count]) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat} ({count})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tri */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex-shrink-0">{t('oppPage.sortBy')}</span>
              {SORTS.map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${sortBy === s.key ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40' : 'bg-transparent text-gray-500 hover:text-white border border-[#2a2a2a]'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-20 text-gray-600">
                <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                {t('common.loading')}
              </div>
            ) : opportunities.length > 0 && sortedOpportunities.length === 0 ? (
              <div className="text-center py-16 bg-[#111111] rounded-3xl border border-dashed border-[#2a2a2a]">
                <Search className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-400 mb-1">{t('oppPage.noneForFilter')}</h3>
                <p className="text-sm text-gray-600 mb-5">
                  {filter === 'low_comp' && t('oppPage.hints.lowComp')}
                  {filter === 'for_you' && t('oppPage.hints.forYou')}
                  {filter === 'fresh' && t('oppPage.hints.fresh')}
                </p>
                <button onClick={() => { setFilter('all'); setCategoryFilter('all') }} className="text-xs font-bold text-[#D4AF37] hover:underline">{t('oppPage.viewAllOffers')}</button>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-20 bg-[#111111] rounded-3xl border border-dashed border-[#2a2a2a]">
                <Search className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                {filter === 'applied' ? (
                  <>
                    {/* Ce filtre dépend de opportunities.status, qui peut être
                        vide même quand SCAI a bien postulé (offres nettoyées
                        du cache après un moment, mise à jour de statut parfois
                        silencieusement ratée) — la preuve fiable et permanente
                        de tout ce que SCAI a envoyé vit dans /applications. */}
                    <h3 className="text-lg font-bold text-gray-500 mb-2">{t('oppPage.nothingHereYet')}</h3>
                    <p className="text-sm text-gray-600 mb-6">{t('oppPage.appliedEmptyDesc')}</p>
                    <GoldButton onClick={() => router.push('/applications')}>{t('oppPage.viewApplications')}</GoldButton>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-gray-500 mb-2">{t('oppPage.noOpportunities')}</h3>
                    <p className="text-sm text-gray-600 mb-6">{t('oppPage.launchScanDesc')}</p>
                    <GoldButton onClick={() => router.push('/dashboard')}>{t('oppPage.launchScan')}</GoldButton>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedOpportunities.slice(0, 6).map((opp) => (
                  <div key={opp.id} onClick={() => handleSelectOpp(opp)}
                    className={`relative cursor-pointer rounded-2xl border transition-all ${selected?.id === opp.id ? 'border-[#D4AF37]/50 bg-[#1A1500]/20' : 'border-[#1A1A1A] hover:border-[#2a2a2a]'}`}>
                    <span className={`absolute top-3 right-3 z-10 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${isAtsAuto(opp) ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30' : 'bg-[#1A1A1A] text-gray-500 border border-[#2a2a2a]'}`}>
                      {isAtsAuto(opp) ? t('oppPage.badges.auto') : t('oppPage.badges.manual')}
                    </span>
                    <OpportunityCard opportunity={opp} onApply={handleApply} referralCode={profile?.referral_code} />
                  </div>
                ))}

                {/* 4 opportunités premium floutées pour free users */}
                {!isPaidPlan(profile) && opportunities.length > 6 && (
                  <>
                    {sortedOpportunities.slice(6, 10).map((opp) => (
                      <div key={opp.id} className="relative">
                        <div className="rounded-2xl border border-[#2a2a2a] filter blur-sm pointer-events-none opacity-50">
                          <OpportunityCard opportunity={opp} onApply={() => {}} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <a href="/pricing" className="bg-[#D4AF37] text-black font-bold px-6 py-2 rounded-full hover:bg-[#F5E6A3] text-sm">
                            {t('oppPage.unlock')}
                          </a>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Premium users voient tout */}
                {isPaidPlan(profile) && sortedOpportunities.slice(6).map((opp) => (
                  <div key={opp.id} onClick={() => handleSelectOpp(opp)}
                    className={`cursor-pointer rounded-2xl border transition-all ${selected?.id === opp.id ? 'border-[#D4AF37]/50 bg-[#1A1500]/20' : 'border-[#1A1A1A] hover:border-[#2a2a2a]'}`}>
                    <OpportunityCard opportunity={opp} onApply={handleApply} referralCode={profile?.referral_code} />
                  </div>
                ))}

                {/* Bloc opportunités supplémentaires — ton conseiller carrière */}
                {opportunities.length >= 6 && opportunities.length <= 10 && (
                  <div className="relative mt-4">
                    <div className="space-y-3 select-none pointer-events-none">
                      {[1,2,3].map(i => (
                        <div key={i} className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 filter blur-sm opacity-30">
                          <div className="h-4 bg-[#2a2a2a] rounded w-48 mb-2" />
                          <div className="h-3 bg-[#1a1a1a] rounded w-32" />
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent rounded-2xl z-10">
                      <div className="text-center px-8 py-8 max-w-sm mx-auto">
                        {/* Message conseiller carrière — pas publicitaire */}
                        <div className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-3">
                          {t('oppPage.upsell.note')}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed mb-5 italic">
                          {t('oppPage.upsell.quote')}
                        </p>
                        <a href="/pricing" className="inline-block bg-[#D4AF37] text-black font-bold px-8 py-3 rounded-full hover:bg-[#F5E6A3] transition-colors text-sm">
                          {t('oppPage.upsell.cta')}
                        </a>
                        <p className="text-[10px] text-gray-600 mt-3">{t('oppPage.upsell.planHint')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── PANNEAU LATÉRAL DÉTAILLÉ ───────────────────────── */}
          {selected && (
            <div className="w-full lg:w-[45%] border-l border-[#1A1A1A] overflow-y-auto bg-[#0D0D0D] flex flex-col">
              {/* Header panneau */}
              <div className="sticky top-0 bg-[#0D0D0D] border-b border-[#1A1A1A] p-4 flex items-center justify-between z-10">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('opportunities.scaiAnalysis')}</span>
                <button onClick={() => setSelected(null)} className="p-1 text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Titre + Score */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-white text-base leading-tight">{selected.title}</h3>
                    <span className={`text-xl font-bold flex-shrink-0 ${selected.score >= 70 ? 'text-[#D4AF37]' : selected.score >= 50 ? 'text-blue-400' : 'text-gray-500'}`}>
                      {selected.score}/100
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{selected.company}</span>
                    {selected.location && <><span>•</span><span>{selected.location}</span></>}
                    {selected.hours_ago < 24 && <span className="text-green-500 font-bold">• {t('oppPage.freshBadge')}</span>}
                  </div>
                </div>

                {/* Source */}
                <div className="bg-[#111] rounded-xl p-3 text-xs text-gray-500">
                  <span className="text-gray-400 font-bold">{t('oppPage.sourceLabel')}</span>{selected.source_platform}
                  {selected.hours_ago > 0 && <span> • {selected.hours_ago < 24 ? t('oppPage.postedAgoHours', { hours: selected.hours_ago }) : t('oppPage.postedAgoDays', { days: Math.round(selected.hours_ago/24) })}</span>}
                </div>

                {/* Analyse SCAI */}
                <Card className="p-4">
                  <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-2">{t('oppPage.scaiAnalysisCard')}</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.match_reason || t('oppPage.defaultMatchReason')}</p>
                </Card>

                {/* Alerte internationale */}
                {selected.is_foreign && (
                  <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-orange-400 font-bold text-sm mb-2">
                      <Globe className="w-4 h-4" /> {t('oppPage.international.title')}
                    </div>
                    <ul className="text-xs text-orange-300 space-y-1">
                      <li>{t('oppPage.international.passport')}</li>
                      <li>{t('oppPage.international.visa')}</li>
                      <li>{t('oppPage.international.currency')}</li>
                    </ul>
                  </div>
                )}

                {/* Score de préparation */}
                {readiness && (
                  <Card className="p-4">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                      {t('opportunities.readinessScore')}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`text-3xl font-bold ${readiness.score >= 80 ? 'text-green-500' : readiness.score >= 60 ? 'text-[#D4AF37]' : 'text-red-500'}`}>
                        {readiness.score}%
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${readiness.score >= 80 ? 'bg-green-500' : readiness.score >= 60 ? 'bg-[#D4AF37]' : 'bg-red-500'}`}
                            style={{ width: `${readiness.score}%` }} />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {readiness.score >= 80 ? t('oppPage.readiness.ready') : readiness.score >= 60 ? t('oppPage.readiness.almost') : t('oppPage.readiness.incomplete')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {readiness.checks.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {c.ok
                            ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          }
                          <span className={c.ok ? 'text-gray-400' : 'text-gray-500'}>{c.label}</span>
                          {!c.ok && c.tip && <span className="text-gray-600 italic">→ {c.tip}</span>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Ce que tu dois préparer */}
                <Card className="p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('oppPage.beforeApplying')}</div>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />{t('oppPage.tips.readDesc')}</li>
                    <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />{t('oppPage.tips.prepareExamples')}</li>
                    <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />{t('oppPage.tips.personalize')}</li>
                    {selected.salary_max > 0 && (
                      <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />{t('oppPage.budgetAnnounced', { min: selected.salary_min, max: selected.salary_max, currency: selected.currency })}</li>
                    )}
                  </ul>
                </Card>

                {/* Actions */}
                <div className="space-y-3 pb-6">
                  <GoldButton fullWidth onClick={() => handleApply(selected.id)} disabled={selected.status === 'ready_to_send'}>
                    {selected.status === 'ready_to_send' ? t('oppPage.applyBtn.prepared') : t('oppPage.applyBtn.cta')}
                  </GoldButton>

                  {/* Lien vers le détail de la candidature */}
                  {selected.status === 'ready_to_send' && selected.application_id && (
                    <a href={`/applications/${selected.application_id}`}
                      className="flex items-center justify-center gap-2 w-full bg-[#1A1500] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 text-[#D4AF37] py-3 rounded-xl text-sm font-medium transition-all">
                      <FileText className="w-4 h-4" /> {t('oppPage.reviewAndSend')}
                    </a>
                  )}

                  <a href={selected.original_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full border border-[#2a2a2a] hover:border-[#D4AF37]/30 text-gray-400 hover:text-white py-3 rounded-xl text-sm font-medium transition-all">
                    <ExternalLink className="w-4 h-4" /> {t('opportunities.applyManually')}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Candidature en série — guide 2 clics par offre : copie le
          message, ouvre la vraie page, tu colles et envoies toi-même. */}
      {queueOpen && queueItems[queueIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-6 max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                {t('oppPage.queue.progress', { current: queueIndex + 1, total: queueItems.length })}
              </span>
              <button onClick={() => setQueueOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-white font-bold">{queueItems[queueIndex].title}</h3>
              <p className="text-xs text-gray-500">{queueItems[queueIndex].company}</p>
            </div>

            <div className="bg-black/40 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-[#1A1A1A]">
              {queueItems[queueIndex].message || t('oppPage.queue.messageUnavailable')}
            </div>
            <p className="text-[10px] text-gray-600">
              {queueCopied ? t('oppPage.queue.copied') : t('oppPage.queue.notCopied')}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={copyQueueMessage}
                className="flex items-center justify-center gap-2 py-3 border border-[#2a2a2a] hover:border-[#D4AF37]/40 text-gray-300 rounded-xl text-sm font-medium">
                {t('oppPage.queue.copyAgain')}
              </button>
              <button onClick={openQueueOffer}
                className="flex items-center justify-center gap-2 py-3 bg-[#1A1500] border border-[#D4AF37]/40 text-[#D4AF37] rounded-xl text-sm font-medium">
                <ExternalLink className="w-4 h-4" /> {t('oppPage.queue.openOffer')}
              </button>
            </div>

            <GoldButton onClick={nextQueueItem} fullWidth>
              {queueIndex + 1 >= queueItems.length ? t('oppPage.queue.finish') : t('oppPage.queue.next')}
            </GoldButton>
          </div>
        </div>
      )}
    </div>
  )
}
