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

export default function Opportunities() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { exportOpportunities } = usePDF()
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'recommended' | 'freshest' | 'highest_paid'>('recommended')
  const [selected, setSelected] = useState<any>(null)        // opportunité sélectionnée
  const [readiness, setReadiness] = useState<any>(null)      // score de préparation
  const [loadingReadiness, setLoadingReadiness] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchOpportunities = async () => {
      let query = supabase
        .from('opportunities')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: false })

      if (filter === 'fresh')   query = query.lt('hours_ago', 24)
      if (filter === 'applied') query = query.eq('status', 'ready_to_send')
      if (filter === 'pending') query = query.eq('status', 'pending_action')

      const { data } = await query
      
      // FREEMIUM: limiter à 10 opportunités pour free users (6 accessibles + 4 premium floutées affichées)
      if (data) {
        const isFree = !profile?.plan || profile.plan === 'free'
        if (isFree && data.length > 10) {
          setOpportunities(data.slice(0, 10))
        } else {
          setOpportunities(data)
        }
      }
      setLoading(false)
    }
    fetchOpportunities()
  }, [user, filter, profile])

  const handleApply = async (id: string) => {
    const opp = opportunities.find(o => o.id === id)
    if (!opp || !user) return
    
    // BLOQUER pour free users
    const isFree = !profile?.plan || profile.plan === 'free'
    if (isFree) {
      alert('⚠️ Fonctionnalité réservée aux membres Premium. Upgrade pour que SCAI rédige tes candidatures automatiquement.')
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
        alert(data.error || 'SCAI ne peut pas préparer cette candidature automatiquement. Postule manuellement.')
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
      alert(data.error || 'La candidature n\'a pas pu être préparée. Réessaie dans quelques secondes.')
    } catch (err) {
      // Ne JAMAIS marquer comme "prête" si l'appel a échoué — le message
      // n'a pas été généré, l'utilisateur ne doit pas croire le contraire.
      alert('La candidature n\'a pas pu être préparée. Réessaie dans quelques secondes.')
    }
  }

  // Calculer le score de préparation pour une opportunité
  const computeReadiness = (opp: any) => {
    // Live, pas la colonne profile_completion figée à l'onboarding (même
    // bug que Sidebar.tsx — voir src/lib/profileCompletion.ts)
    const { percent: liveCompletion } = computeProfileCompletion(profile, true)
    const checks = [
      { label: 'Profil complet',         ok: liveCompletion >= 70, tip: 'Complète ton profil à 70%+' },
      { label: 'Bio professionnelle',    ok: !!profile?.bio && (profile.bio?.length || 0) > 50, tip: 'Ajoute une bio de 50 mots minimum' },
      { label: 'Portfolio/liens',        ok: !!(profile?.portfolio_url || profile?.github_url || profile?.linkedin_url), tip: 'Ajoute un lien portfolio ou LinkedIn' },
      { label: 'Documents uploadés',     ok: true, tip: '' },  // simplifié
      { label: 'Domaine correspond',     ok: opp.match_reason?.includes(profile?.domain?.split(' ')[0] || 'x') || opp.score >= 60, tip: 'Ton profil correspond au domaine' },
    ]
    const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100)
    return { checks, score }
  }

  const handleSelectOpp = (opp: any) => {
    setSelected(opp)
    setReadiness(computeReadiness(opp))
  }

  const FILTERS = [
    { key: 'all',     label: 'Toutes' },
    { key: 'fresh',   label: 'Fraîches (<24h)' },
    { key: 'applied', label: 'Auto-postulées' },
    { key: 'pending', label: 'En attente' },
  ]

  const SORTS: { key: typeof sortBy; label: string }[] = [
    { key: 'recommended',  label: 'Recommandé' },
    { key: 'freshest',     label: 'Plus fraîches' },
    { key: 'highest_paid', label: 'Mieux payées' },
  ]

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    if (sortBy === 'freshest')     return (a.hours_ago ?? Infinity) - (b.hours_ago ?? Infinity)
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
          <h2 className="text-lg font-bold text-white tracking-tight">Opportunity Explorer</h2>
          <div className="flex items-center gap-3">
            <div className="text-[10px] tracking-widest text-[#D4AF37] font-bold uppercase">
              {opportunities.length} opportunités
            </div>
            {opportunities.length > 0 && (
              <button
                onClick={() => exportOpportunities(opportunities, profile?.full_name || 'Profil')}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D4AF37] border border-[#2a2a2a] hover:border-[#D4AF37]/30 px-3 py-1.5 rounded-lg transition-all">
                <FileText className="w-3.5 h-3.5" /> Exporter PDF
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

            {/* Tri */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex-shrink-0">Trier :</span>
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
                Chargement...
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
                    <h3 className="text-lg font-bold text-gray-500 mb-2">Rien à afficher ici pour l'instant.</h3>
                    <p className="text-sm text-gray-600 mb-6">La liste complète et permanente des candidatures — y compris celles envoyées par SCAI seule — est sur la page Candidatures.</p>
                    <GoldButton onClick={() => router.push('/applications')}>Voir mes candidatures</GoldButton>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-gray-500 mb-2">Aucune opportunité.</h3>
                    <p className="text-sm text-gray-600 mb-6">Lance un scan global depuis le dashboard.</p>
                    <GoldButton onClick={() => router.push('/dashboard')}>Lancer un scan</GoldButton>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedOpportunities.slice(0, 6).map((opp) => (
                  <div key={opp.id} onClick={() => handleSelectOpp(opp)}
                    className={`cursor-pointer rounded-2xl border transition-all ${selected?.id === opp.id ? 'border-[#D4AF37]/50 bg-[#1A1500]/20' : 'border-[#1A1A1A] hover:border-[#2a2a2a]'}`}>
                    <OpportunityCard opportunity={opp} onApply={handleApply} referralCode={profile?.referral_code} />
                  </div>
                ))}

                {/* 4 opportunités premium floutées pour free users */}
                {(!profile?.plan || profile.plan === 'free') && opportunities.length > 6 && (
                  <>
                    {sortedOpportunities.slice(6, 10).map((opp) => (
                      <div key={opp.id} className="relative">
                        <div className="rounded-2xl border border-[#2a2a2a] filter blur-sm pointer-events-none opacity-50">
                          <OpportunityCard opportunity={opp} onApply={() => {}} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <a href="/pricing" className="bg-[#D4AF37] text-black font-bold px-6 py-2 rounded-full hover:bg-[#F5E6A3] text-sm">
                            🔒 Débloquer
                          </a>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Premium users voient tout */}
                {profile?.plan && profile.plan !== 'free' && sortedOpportunities.slice(6).map((opp) => (
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
                          💡 Note de SCAI
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed mb-5 italic">
                          "J'ai trouvé d'autres opportunités ultra-fraîches correspondant à ton profil. À ce stade, avoir plus d'options te donne un avantage concret dans tes négociations."
                        </p>
                        <a href="/pricing" className="inline-block bg-[#D4AF37] text-black font-bold px-8 py-3 rounded-full hover:bg-[#F5E6A3] transition-colors text-sm">
                          Voir toutes mes opportunités →
                        </a>
                        <p className="text-[10px] text-gray-600 mt-3">Plan Starter · À partir de $19/mois</p>
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
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Analyse SCAI</span>
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
                    {selected.hours_ago < 24 && <span className="text-green-500 font-bold">• Fraîche</span>}
                  </div>
                </div>

                {/* Source */}
                <div className="bg-[#111] rounded-xl p-3 text-xs text-gray-500">
                  <span className="text-gray-400 font-bold">Source : </span>{selected.source_platform}
                  {selected.hours_ago > 0 && <span> • Publiée il y a {selected.hours_ago < 24 ? `${selected.hours_ago}h` : `${Math.round(selected.hours_ago/24)}j`}</span>}
                </div>

                {/* Analyse SCAI */}
                <Card className="p-4">
                  <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-2">🧠 Analyse SCAI</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.match_reason || 'Opportunité identifiée correspondant à ton domaine.'}</p>
                </Card>

                {/* Alerte internationale */}
                {selected.is_foreign && (
                  <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-orange-400 font-bold text-sm mb-2">
                      <Globe className="w-4 h-4" /> Opportunité internationale
                    </div>
                    <ul className="text-xs text-orange-300 space-y-1">
                      <li>⚠️ Passeport valide requis</li>
                      <li>📋 Vérifier les conditions de visa</li>
                      <li>💱 Paiement en devise étrangère</li>
                    </ul>
                  </div>
                )}

                {/* Score de préparation */}
                {readiness && (
                  <Card className="p-4">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                      Score de préparation
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
                          {readiness.score >= 80 ? 'Tu es prêt ✓' : readiness.score >= 60 ? 'Presque prêt' : 'Profil à compléter'}
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
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Avant de postuler</div>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />Lis attentivement la description complète</li>
                    <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />Prépare 2-3 exemples de travaux similaires</li>
                    <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />Personnalise le message avec le nom de l'entreprise</li>
                    {selected.salary_max > 0 && (
                      <li className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 flex-shrink-0" />Budget annoncé : {selected.salary_min}-{selected.salary_max} {selected.currency}</li>
                    )}
                  </ul>
                </Card>

                {/* Actions */}
                <div className="space-y-3 pb-6">
                  <GoldButton fullWidth onClick={() => handleApply(selected.id)} disabled={selected.status === 'ready_to_send'}>
                    {selected.status === 'ready_to_send' ? '✓ Candidature préparée par SCAI' : '⚡ Laisser SCAI préparer ma candidature'}
                  </GoldButton>

                  {/* Lien vers le détail de la candidature */}
                  {selected.status === 'ready_to_send' && selected.application_id && (
                    <a href={`/applications/${selected.application_id}`}
                      className="flex items-center justify-center gap-2 w-full bg-[#1A1500] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 text-[#D4AF37] py-3 rounded-xl text-sm font-medium transition-all">
                      <FileText className="w-4 h-4" /> Relire et envoyer →
                    </a>
                  )}

                  <a href={selected.original_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full border border-[#2a2a2a] hover:border-[#D4AF37]/30 text-gray-400 hover:text-white py-3 rounded-xl text-sm font-medium transition-all">
                    <ExternalLink className="w-4 h-4" /> Je postule moi-même
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
