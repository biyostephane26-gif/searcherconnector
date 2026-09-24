'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import { authFetch, downloadBase64 } from '../lib/authFetch'
import { planConfig } from '../lib/planConfig'
import { planTier } from '../lib/planUtils'
import {
  Receipt, FileBarChart, Download, Loader2, CreditCard, CheckCircle2, XCircle, Clock,
  TrendingUp, Send, Calendar, Award, DollarSign, Gauge, Mic, FileText, ImageIcon, Video,
  Sparkles, Zap, Bell, Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Tab = 'transactions' | 'usage' | 'report'

export default function Transactions() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()

  const TOOL_META: Record<string, { label: string; icon: JSX.Element }> = {
    scai_tool_pdf:   { label: t('transactionsPage.toolPdf'),   icon: <FileText className="w-3.5 h-3.5" /> },
    scai_tool_xlsx:  { label: t('transactionsPage.toolXlsx'), icon: <FileText className="w-3.5 h-3.5" /> },
    scai_tool_docx:  { label: t('transactionsPage.toolDocx'),  icon: <FileText className="w-3.5 h-3.5" /> },
    scai_tool_image: { label: t('transactionsPage.toolImage'), icon: <ImageIcon className="w-3.5 h-3.5" /> },
    scai_tool_video: { label: t('transactionsPage.toolVideo'),     icon: <Video className="w-3.5 h-3.5" /> },
  }

  const STATUS_UI: Record<string, { label: string; cls: string; icon: JSX.Element }> = {
    completed: { label: t('transactionsPage.statusPaid'), cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    pending:   { label: t('transactionsPage.statusPending'), cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: <Clock className="w-3.5 h-3.5" /> },
    failed:    { label: t('transactionsPage.statusFailed'), cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: <XCircle className="w-3.5 h-3.5" /> },
  }

  const APP_STATUS_LABEL: Record<string, string> = {
    found: t('transactionsPage.appStatusFound'), ready_to_send: t('transactionsPage.appStatusReady'), sent: t('transactionsPage.appStatusSent'), pending_action: t('transactionsPage.appStatusPendingAction'),
    viewed: t('transactionsPage.appStatusViewed'), interview: t('transactionsPage.appStatusInterview'), offer: t('transactionsPage.appStatusOffer'), rejected: t('transactionsPage.appStatusRejected'), hired: t('transactionsPage.appStatusHired'),
  }
  const [tab, setTab] = useState<Tab>('transactions')
  const [payments, setPayments] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<'pdf' | 'xlsx' | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [voiceCredits, setVoiceCredits] = useState<number | null>(null)
  const [toolUsage, setToolUsage] = useState<Record<string, number>>({})
  const [notifCountToday, setNotifCountToday] = useState<number>(0)

  useEffect(() => {
    if (!user) return
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    Promise.all([
      supabase.from('payment_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('applications_tracking').select('*').eq('user_id', user.id).order('applied_at', { ascending: false }),
      supabase.from('user_voice_credits').select('credits_remaining').eq('user_id', user.id).maybeSingle(),
      supabase.from('searcher_logs').select('action_type').eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', dayStart.toISOString()),
    ]).then(([p, a, vc, logs, notif]) => {
      setPayments(p.data || [])
      setApplications(a.data || [])
      setVoiceCredits(vc.data?.credits_remaining ?? null)
      const tally: Record<string, number> = {}
      for (const l of logs.data || []) {
        if (l.action_type?.startsWith('scai_tool_')) tally[l.action_type] = (tally[l.action_type] || 0) + 1
      }
      setToolUsage(tally)
      setNotifCountToday(notif.count || 0)
      setLoading(false)
    })
  }, [user])

  const stats = useMemo(() => {
    const total = applications.length
    const interviews = applications.filter(a => a.status === 'interview' || a.interview_date || a.interview_scheduled_at).length
    const offers = applications.filter(a => a.status === 'offer' || a.status === 'hired' || a.offer_amount).length
    const hired = applications.filter(a => a.status === 'hired').length
    const totalOfferAmount = applications.reduce((sum, a) => sum + (Number(a.offer_amount) || 0), 0)
    const currency = applications.find(a => a.offer_currency)?.offer_currency || 'USD'
    const responseRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0
    const byStatus: Record<string, number> = {}
    for (const a of applications) byStatus[a.status || 'found'] = (byStatus[a.status || 'found'] || 0) + 1
    return { total, interviews, offers, hired, totalOfferAmount, currency, responseRate, byStatus }
  }, [applications])

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const tier = planTier(profile as any)
  const plan = planConfig(tier)

  const generate = async (format: 'pdf' | 'xlsx') => {
    setGenerating(format); setGenError(null)
    try {
      const r = await authFetch('/api/tools/document', { method: 'POST', body: JSON.stringify({ format, source: 'applications' }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || t('transactionsPage.genericGenError'))
      downloadBase64(d.base64, d.filename, d.mime)
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">{t('transactionsPage.title')}</h2>
          <div className="flex gap-1 bg-[#111111] border border-[#2a2a2a] rounded-full p-1">
            {[
              { id: 'transactions' as Tab, label: t('transactionsPage.tabTransactions'), icon: Receipt },
              { id: 'usage' as Tab, label: t('transactionsPage.tabUsage'), icon: Gauge },
              { id: 'report' as Tab, label: t('transactionsPage.tabReport'), icon: FileBarChart },
            ].map(tabItem => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  tab === tabItem.id ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                <tabItem.icon className="w-3.5 h-3.5" /> {tabItem.label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full space-y-6">
          {tab === 'transactions' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{t('transactionsPage.currentPlan')}</p>
                  <p className="text-xl font-bold text-white">{plan.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{plan.priceUSD > 0 ? `$${plan.priceUSD}${t('transactionsPage.perMonth')}` : t('transactionsPage.free')}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{t('transactionsPage.totalPaid')}</p>
                  <p className="text-xl font-bold text-white">${totalPaid.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">{payments.filter(p => p.status === 'completed').length} {t('transactionsPage.successfulPayments')}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{t('transactionsPage.nextStep')}</p>
                  <a href="/pricing" className="text-sm font-bold text-[#D4AF37] hover:underline flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> {t('transactionsPage.manageSubscription')}
                  </a>
                </Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1A1A1A]">
                  <h3 className="text-sm font-bold text-white">{t('transactionsPage.paymentHistory')}</h3>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-sm text-gray-500">{t('transactionsPage.loadingEllipsis')}</div>
                ) : payments.length === 0 ? (
                  <div className="p-10 text-center">
                    <Receipt className="w-9 h-9 text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">{t('transactionsPage.noTransactions')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1A1A1A]">
                    {payments.map(p => {
                      const ui = STATUS_UI[p.status] || STATUS_UI.pending
                      return (
                        <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                          <div>
                            <p className="text-sm font-semibold text-white capitalize">{p.plan} {p.method ? `· ${p.method}` : ''}</p>
                            <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white">{p.amount ? `${p.amount} ${p.currency || ''}` : '—'}</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${ui.cls}`}>{ui.icon}{ui.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </>
          )}

          {tab === 'usage' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="w-4 h-4 text-[#D4AF37]" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t('transactionsPage.scaiVoice')}</p>
                  </div>
                  <p className="text-xl font-bold text-white">{voiceCredits ?? '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('transactionsPage.creditsRemainingToday')} · {plan.voiceCreditsPerDay}{t('transactionsPage.perDayOnYourPlan')}</p>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-[#D4AF37]" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t('transactionsPage.notifications')}</p>
                  </div>
                  <p className="text-xl font-bold text-white">{notifCountToday} <span className="text-sm text-gray-500 font-normal">/ {plan.notifBudget}</span></p>
                  <p className="text-xs text-gray-500 mt-1">{t('transactionsPage.receivedToday')}</p>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-[#D4AF37]" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t('transactionsPage.autoApplication')}</p>
                  </div>
                  <p className="text-xl font-bold text-white">{plan.autoApplyPerDay}<span className="text-sm text-gray-500 font-normal">{t('transactionsPage.perDayMax')}</span></p>
                  <p className="text-xs text-gray-500 mt-1">{t('transactionsPage.onYourPlan')} {plan.label}</p>
                </Card>
              </div>

              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" /> {t('transactionsPage.scaiCoworkTools')}
                </h3>
                <p className="text-xs text-gray-500 mb-4">{t('transactionsPage.scaiCoworkToolsDesc')}</p>
                {Object.keys(toolUsage).length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">{t('transactionsPage.noToolUsed')}</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(TOOL_META).map(([key, meta]) => (
                      <div key={key} className="flex items-center gap-2.5 bg-[#111111] border border-[#1A1A1A] rounded-xl px-3 py-2.5">
                        <span className="text-[#D4AF37]">{meta.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{toolUsage[key] || 0}</p>
                          <p className="text-[10px] text-gray-500">{meta.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#D4AF37]" /> {t('transactionsPage.planIncludesTitle')} {plan.label}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {[
                    { label: t('transactionsPage.manualScans'), value: `${plan.scansPerSession}${t('transactionsPage.perSession')}` },
                    { label: t('transactionsPage.accessibleSources'), value: plan.maxSources.toLocaleString(i18n.language) },
                    { label: t('transactionsPage.opportunityCreator'), value: `${plan.opportunityCreatorPerDay}${t('transactionsPage.perDay')}` },
                    { label: t('transactionsPage.scaiCreditsPerMonth'), value: plan.monthlyCredits },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-lg font-bold text-[#D4AF37]">{item.value}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
                {tier !== 'premium' && (
                  <a href="/pricing" className="mt-5 flex items-center justify-center gap-1.5 text-xs font-bold text-[#D4AF37] hover:underline">
                    {t('transactionsPage.unlockMore')} <TrendingUp className="w-3.5 h-3.5" />
                  </a>
                )}
              </Card>
            </>
          )}

          {tab === 'report' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t('transactionsPage.applications'), value: stats.total, icon: Send, color: 'text-blue-400' },
                  { label: t('transactionsPage.interviews'), value: stats.interviews, icon: Calendar, color: 'text-[#D4AF37]' },
                  { label: t('transactionsPage.offersReceived'), value: stats.offers, icon: Award, color: 'text-emerald-400' },
                  { label: t('transactionsPage.responseRate'), value: `${stats.responseRate}%`, icon: TrendingUp, color: 'text-purple-400' },
                ].map(s => (
                  <Card key={s.label} className="p-4">
                    <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[11px] text-gray-500">{s.label}</p>
                  </Card>
                ))}
              </div>

              {stats.totalOfferAmount > 0 && (
                <Card className="p-5 flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalOfferAmount.toLocaleString(i18n.language)} {stats.currency}</p>
                    <p className="text-xs text-gray-500">{t('transactionsPage.cumulativeOfferValue')}</p>
                  </div>
                </Card>
              )}

              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-4">{t('transactionsPage.breakdownByStatus')}</h3>
                {stats.total === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">{t('transactionsPage.noApplicationsRecorded')}</p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-xs text-gray-400">{APP_STATUS_LABEL[status] || status}</span>
                        <div className="flex-1 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                          <div className="h-full bg-[#D4AF37]" style={{ width: `${(count / stats.total) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-bold text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => generate('pdf')}
                  disabled={generating !== null || stats.total === 0}
                  className="flex items-center gap-2 bg-[#D4AF37] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#e0bd4f] disabled:opacity-50"
                >
                  {generating === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {t('transactionsPage.reportPdf')}
                </button>
                <button
                  onClick={() => generate('xlsx')}
                  disabled={generating !== null || stats.total === 0}
                  className="flex items-center gap-2 bg-[#111111] border border-[#2a2a2a] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:border-[#D4AF37]/40 disabled:opacity-50"
                >
                  {generating === 'xlsx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {t('transactionsPage.exportExcel')}
                </button>
                {genError && <p className="text-sm text-red-400">{genError}</p>}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
