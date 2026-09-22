'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useAgent } from '../hooks/useAgent'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import MetricCards from '../components/dashboard/MetricCards'
import ScanningBar from '../components/dashboard/ScanningBar'
import SearcherLog from '../components/dashboard/SearcherLog'
import PremiumOpportunitiesDashboard from '../components/dashboard/PremiumOpportunitiesDashboard'
import FreeUserLimitBanner from '../components/dashboard/FreeUserLimitBanner'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import GoldDot from '../components/ui/GoldDot'
import Badge from '../components/ui/Badge'
import { Bell, Search, TrendingUp, UserPlus, Zap, ArrowRight, Shield } from 'lucide-react'
import AppTour from '../components/onboarding/AppTour'
import ScaiThinkingOrb from '../components/scai/ScaiThinkingOrb'
import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { profile, user } = useAuth()
  const router = useRouter()
  const { scanning, launchScan } = useAgent()
  const [stats, setStats] = useState({ found: 0, applied: 0, responses: 0, avgScore: 0 })
  const [alerts, setAlerts] = useState<any[]>([])
  const [latestAgentAction, setLatestAgentAction] = useState<any>(null)
  const [suggestedPeople, setSuggestedPeople] = useState<any[]>([])
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanSuccess, setScanSuccess] = useState<string | null>(null)
  const [showScaiPrompt, setShowScaiPrompt] = useState(false)
  const [scaiInput, setScaiInput] = useState('')
  const [scaiThinking, setScaiThinking] = useState(false)
  const [scaiMessage, setScaiMessage] = useState<string | null>(null)
  const [scaiQuestion, setScaiQuestion] = useState<string | null>(null)
  const [scaiHistory, setScaiHistory] = useState<Array<{ role: string; content: string }>>([])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      const { count: found } = await supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      const { count: applied } = await supabase.from('applications_sent').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      const { data: opps } = await supabase.from('opportunities').select('score').eq('user_id', user.id)

      const avgScore = opps && opps.length > 0 
        ? Math.round(opps.reduce((acc, curr) => acc + curr.score, 0) / opps.length)
        : 0

      setStats({ found: found || 0, applied: applied || 0, responses: 0, avgScore })

      const [alertRes, latestActionRes] = await Promise.all([
        supabase
          .from('opportunities')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending_action')
          .order('created_at', { ascending: false }),
        supabase
          .from('agent_actions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ])

      if (alertRes.data) setAlerts(alertRes.data)
      setLatestAgentAction(latestActionRes.data || null)

      // Charger des vraies suggestions de personnes (profils vérifiés)
      const { data: people } = await supabase
        .from('users_profiles')
        .select('id, full_name, domain, verification_status, avatar_url')
        .in('verification_status', ['verified', 'genius'])
        .neq('id', user.id)
        .limit(3)
      if (people) setSuggestedPeople(people)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchDashboardData()
  }, [user])

  // Ouvre la question rapide de SCAI plutôt que de lancer le scan directement.
  // "SCAI lance le scan après avoir pris certaines infos" — SCAI détermine la
  // zone (local/continental/worldwide) et le mode budget à partir de ce que
  // l'utilisateur tape, puis lance lui-même le scan avec ces valeurs.
  const handleGlobalSearch = () => {
    if (!profile || scanning) return
    setScanError(null)
    setScanSuccess(null)
    setScaiMessage(null)
    setShowScaiPrompt(true)
  }

  const runScan = async (zone?: string) => {
    try {
      const result = await launchScan(zone)
      if (!result?.success) {
        setScanError(result?.error || 'Le scan a échoué. Réessaie dans quelques secondes.')
      } else {
        setScanSuccess(`${result.found} opportunité(s) trouvée(s) !${result.locked_count ? ` (+${result.locked_count} cachées)` : ''}`)
        setTimeout(() => setScanSuccess(null), 5000)
        await fetchDashboardData()
      }
    } catch (err: any) {
      setScanError(err?.message || 'Erreur inattendue lors du scan.')
    }
  }

  // "Lancer directement" — comportement inchangé pour qui ne veut pas parler à SCAI
  const handleSkipScai = () => {
    setShowScaiPrompt(false)
    setScaiQuestion(null)
    setScaiHistory([])
    runScan()
  }

  // SCAI lit le message : soit il pose une vraie question de clarification
  // (conversation à plusieurs tours, comme moi avec toi), soit il a assez
  // d'info et décide directement de la zone + budget, puis lance le scan.
  const handleScaiSubmit = async () => {
    if (!user || !scaiInput.trim()) return
    setScaiThinking(true)
    try {
      const res = await fetch('/api/scai/pre-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, message: scaiInput, history: scaiHistory }),
      })
      const result = await res.json()

      if (result?.action === 'ask') {
        setScaiQuestion(result.question)
        setScaiHistory(result.history || [])
        setScaiInput('')
        return // reste ouvert, attend la réponse de l'utilisateur
      }

      setScaiMessage(result?.message || null)
      setShowScaiPrompt(false)
      setScaiQuestion(null)
      setScaiHistory([])
      setScaiInput('')
      await runScan(result?.zone)
    } catch {
      setShowScaiPrompt(false)
      setScaiQuestion(null)
      setScaiHistory([])
      await runScan()
    } finally {
      setScaiThinking(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <AppTour />
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar />
        
        <div className="flex-1 overflow-y-auto pt-0 lg:pt-0 mt-16 lg:mt-0">
          <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-10">

          {/* ── Bannière pending — visible seulement si profil non vérifié ── */}
          {profile && profile.verification_status === 'pending' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A1200] border border-[#D4AF37]/40 rounded-2xl px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">⏳</span>
                <div>
                  <p className="text-sm font-bold text-[#D4AF37]">{t('dashboard.pendingBanner.title')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('dashboard.pendingBanner.desc')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <GoldButton onClick={() => router.push('/onboarding')} className="text-xs py-2 px-4 whitespace-nowrap">
                  {t('dashboard.pendingBanner.cta')}
                </GoldButton>
              </div>
            </div>
          )}

          {/* ── Bannière refused ── */}
          {profile && profile.verification_status === 'refused' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-red-900/10 border border-red-700/40 rounded-2xl px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">❌</span>
                <div>
                  <p className="text-sm font-bold text-red-400">{t('dashboard.refusedBanner.title')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {profile.refusal_reason || t('dashboard.refusedBanner.defaultReason')}
                  </p>
                </div>
              </div>
              <GoldButton variant="outlined" onClick={() => router.push('/onboarding')} className="text-xs py-2 px-4 whitespace-nowrap border-red-700/50 text-red-400 hover:text-white flex-shrink-0">
                {t('dashboard.refusedBanner.cta')}
              </GoldButton>
            </div>
          )}
          {/* ── SCAI : question rapide avant de lancer le scan ── */}
          {showScaiPrompt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
              <Card className="w-full max-w-md p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ScaiThinkingOrb size={20} />
                  <p className="text-sm font-bold text-white">SCAI</p>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  {scaiQuestion
                    ? scaiQuestion
                    : t('scai.prescan.question')}
                </p>
                <textarea
                  value={scaiInput}
                  onChange={e => setScaiInput(e.target.value)}
                  placeholder={scaiQuestion ? t('scai.prescan.answerPlaceholder') : t('scai.prescan.placeholder')}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white outline-none focus:border-[#D4AF37] mb-4"
                  rows={3}
                  disabled={scaiThinking}
                  autoFocus
                />
                {scaiThinking && (
                  <div className="flex flex-col gap-2 mb-4 -mt-1">
                    <div className="flex items-center gap-2 text-[#D4AF37]">
                      <ScaiThinkingOrb size={14} />
                      <span className="font-syne font-bold uppercase tracking-widest text-[9px]">{t('scai.prescan.thinking')}</span>
                    </div>
                    <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-[#D4AF37] animate-[shimmer_2s_infinite] w-1/2"></div>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <GoldButton onClick={handleScaiSubmit} loading={scaiThinking} disabled={!scaiInput.trim()} className="flex-1">
                    {scaiQuestion ? t('scai.prescan.reply') : t('scai.prescan.send')}
                  </GoldButton>
                  <GoldButton variant="outlined" onClick={handleSkipScai} disabled={scaiThinking} className="flex-1">
                    {t('scai.prescan.skip')}
                  </GoldButton>
                </div>
              </Card>
            </div>
          )}

          {/* ── Message de SCAI après sa décision ── */}
          {scaiMessage && (
            <div className="flex items-center gap-3 bg-[#1A1500] border border-[#D4AF37]/40 rounded-2xl px-5 py-4">
              <ScaiThinkingOrb size={18} />
              <p className="text-sm text-[#D4AF37]">{scaiMessage}</p>
              <button onClick={() => setScaiMessage(null)} className="ml-auto text-gray-600 hover:text-white text-xs">✕</button>
            </div>
          )}

          {/* ── Bannière erreur scan ── */}
          {scanError && (
            <div className="flex items-start gap-3 bg-red-900/15 border border-red-700/40 rounded-2xl px-5 py-4">
              <span className="text-lg mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-400">{t('dashboard.scanInterrupted')}</p>
                <p className="text-xs text-gray-400 mt-0.5">{scanError}</p>
              </div>
              <button onClick={() => setScanError(null)} className="text-gray-600 hover:text-white text-xs">✕</button>
            </div>
          )}

          {/* ── Bannière succès scan ── */}
          {scanSuccess && (
            <div className="flex items-center gap-3 bg-green-900/15 border border-green-700/40 rounded-2xl px-5 py-4">
              <span className="text-lg">✅</span>
              <p className="text-sm font-bold text-green-400">{scanSuccess}</p>
            </div>
          )}

          {/* Free User Limit Banner - Marketing Hook */}
          <FreeUserLimitBanner />

          {/* Premium Opportunities Dashboard */}
          <PremiumOpportunitiesDashboard />
          
          {/* Main Content (Center) - Existing features below */}
          <div className="xl:col-span-8 space-y-10">
            {/* Global Search Button */}
            <div className="text-center py-10">
              <button
                onClick={handleGlobalSearch}
                disabled={scanning}
                className="group relative inline-block"
              >
                <div className={`absolute inset-0 bg-[#D4AF37] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${scanning ? 'animate-pulse' : ''}`} />
                <div className="relative bg-[#111111] border border-[#D4AF37] rounded-full p-8 md:p-12 shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-transform group-hover:scale-105 active:scale-95">
                  <Search className={`w-12 h-12 md:w-16 md:h-16 text-[#D4AF37] mx-auto mb-4 ${scanning ? 'animate-spin-slow' : ''}`} />
                  <div className="text-lg md:text-xl font-bold tracking-tight text-white uppercase">
                    {scanning ? t('dashboard.scanningWorld') : t('dashboard.launchGlobalSearch')}
                  </div>
                </div>
              </button>
            </div>

            <ScanningBar isScanning={scanning} />

            <MetricCards stats={stats} />

            <Card className="p-6 border-[#1A1A1A] bg-gradient-to-r from-[#111111] to-[#0D0D0D]">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      SCAI Cowork
                    </span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {latestAgentAction?.result || t('dashboard.noRecentAction')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {latestAgentAction?.created_at
                      ? t('dashboard.lastAction', { date: new Date(latestAgentAction.created_at).toLocaleString(i18n.language) })
                      : t('dashboard.initAgentLog')}
                  </div>
                </div>
                <div className="flex gap-3">
                  <GoldButton onClick={handleGlobalSearch} loading={scanning}>
                    {t('dashboard.launchScanBtn')}
                  </GoldButton>
                  <GoldButton variant="outlined" onClick={() => router.push('/agent')}>
                    {t('dashboard.openAgent')}
                  </GoldButton>
                </div>
              </div>
            </Card>

            {/* Alerts Center */}
            {alerts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold tracking-[0.3em] text-red-500 uppercase flex items-center gap-2">
                    <Zap className="w-4 h-4" /> {t('dashboard.urgentActionRequired')}
                  </h3>
                  <span className="text-[10px] text-gray-600 font-bold">{t('dashboard.alertsCount', { count: alerts.length })}</span>
                </div>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Card key={alert.id} className="border-red-900/50 bg-red-900/5 p-6 flex items-center justify-between group">
                      <div>
                        <div className="font-bold text-white mb-1">{alert.title}</div>
                        <div className="text-sm text-gray-500">{alert.company} • {alert.location}</div>
                      </div>
                      <GoldButton 
                        onClick={() => router.push('/opportunities')}
                        className="bg-red-600 hover:bg-red-500 text-white"
                      >
                        {t('dashboard.action')} <ArrowRight className="w-4 h-4" />
                      </GoldButton>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Continuous Surveillance Toggle */}
            <Card 
              className="p-8 border-[#1A1A1A] flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:border-[#D4AF37]/30 transition-all group"
              onClick={() => router.push('/agent')}
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-[#1A1500] rounded-2xl group-hover:bg-[#D4AF37]/10 transition-colors">
                  <TrendingUp className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">{t('dashboard.autonomousAgentTitle')}</h4>
                  <p className="text-sm text-gray-500 max-w-md">{t('dashboard.autonomousAgentDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                    profile?.verification_status === 'genius' ? 'text-[#D4AF37]' : 'text-gray-500'
                  }`}>
                    {profile?.verification_status === 'genius' ? t('dashboard.autonomousMode') : t('dashboard.surveillanceMode')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-500 uppercase tracking-widest">{t('dashboard.active')}</span>
                    <GoldDot />
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-700 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
              </div>
            </Card>

            <section>
              <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase mb-6">{t('dashboard.intelligenceLog')}</h3>
              <SearcherLog />
            </section>
          </div>

          {/* Right Sidebar (Desktop) */}
          <div className="xl:col-span-4 space-y-10">
            <Card className="p-6">
              <h4 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-6 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#D4AF37]" /> {t('dashboard.peopleToKnow')}
              </h4>
              <div className="space-y-6">
                {(suggestedPeople.length > 0 ? suggestedPeople : []).map((person, i) => (
                  <div key={person.id || i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-xs font-bold text-[#D4AF37] overflow-hidden">
                        {person.avatar_url ? <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" /> : (person.full_name?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{person.full_name}</div>
                        <div className="text-[10px] text-gray-600 uppercase font-bold tracking-tighter">
                          {person.verification_status === 'genius' ? t('dashboard.genius') : t('dashboard.verified')} · {person.domain || ''}
                        </div>
                      </div>
                    </div>
                    <button className="text-[#D4AF37] hover:text-[#F5E6A3] transition-colors">
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {suggestedPeople.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-4">{t('dashboard.noConnections')}</p>
                )}
              </div>
              <GoldButton variant="outlined" fullWidth className="mt-8 text-xs py-2">
                {t('dashboard.viewNetwork')}
              </GoldButton>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-[#1A1500] to-[#0A0A0A] border-[#D4AF37]/30 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D4AF37] opacity-5 blur-3xl group-hover:opacity-10 transition-opacity" />
              <Shield className="w-10 h-10 text-[#D4AF37] mb-6" />
              <h4 className="text-xl font-bold text-white mb-2 tracking-tight">{t('dashboard.upgradeGeniusTitle')}</h4>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">{t('dashboard.upgradeGeniusDesc')}</p>
              <GoldButton fullWidth onClick={() => router.push('/pricing')}>
                {t('dashboard.upgradeNow')}
              </GoldButton>
            </Card>
          </div>
          </div>
        </div>
      </main>
    </div>
  )
}
