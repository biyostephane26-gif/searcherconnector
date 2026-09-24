'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { Search, Target, Send, Loader2, Star, TrendingUp, AlertCircle, ExternalLink, Copy, CheckCheck, Lock } from 'lucide-react'
import { authFetch } from '../lib/authFetch'
import { isPaidPlan } from '../lib/planUtils'
import { useTranslation } from 'react-i18next'

const LEAD_GOAL = 50

export default function OpportunityCreator() {
  const { t } = useTranslation()
  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    new:       { label: t('opportunityCreatorPage.statusNew'),   color: 'text-gray-400' },
    contacted: { label: t('opportunityCreatorPage.statusContacted'),  color: 'text-blue-400' },
    replied:   { label: t('opportunityCreatorPage.statusReplied'), color: 'text-[#D4AF37]' },
    won:       { label: t('opportunityCreatorPage.statusWon'),     color: 'text-green-400' },
    dead:      { label: t('opportunityCreatorPage.statusDead'), color: 'text-gray-700' },
  }
  const { user, profile } = useAuth()
  const router = useRouter()
  const [zone, setZone] = useState('local')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)

  // Paywall pour free users
  const isFree = !isPaidPlan(profile)
  const [showPaywall, setShowPaywall] = useState(isFree)

  // ── Charger le pipeline persistant au montage — c'est l'actif qui
  // grandit dans le temps, pas un résultat éphémère perdu au refresh. ──
  const loadLeads = async () => {
    if (!user) return
    setLeadsLoading(true)
    try {
      const r = await authFetch('/api/opportunity-leads')
      const data = await r.json()
      if (r.ok) setLeads(data.leads || [])
    } catch { /* silencieux */ }
    setLeadsLoading(false)
  }
  useEffect(() => { loadLeads() }, [user])

  const updateLeadStatus = async (leadId: string, status: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
    try {
      await authFetch('/api/opportunity-leads', {
        method: 'PATCH',
        body: JSON.stringify({ leadId, status }),
      })
    } catch { /* déjà mis à jour en optimiste, réessai silencieux ignoré */ }
  }

  const handleScan = async () => {
    if (!user) return
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await authFetch('/api/opportunity-creator', {
        method: 'POST',
        body: JSON.stringify({ zone, limit: 30 }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setResult(data)
      await loadLeads() // recharge le pipeline complet (nouveaux leads inclus)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const scoreColor = (s: number) => s < 40 ? 'text-green-400' : s < 60 ? 'text-[#D4AF37]' : 'text-gray-500'
  const scoreBg = (s: number) => s < 40 ? 'border-green-900/30 bg-green-900/5' : s < 60 ? 'border-[#D4AF37]/20' : 'border-[#1A1A1A]'
  const oppLabel = (s: number) => s < 40 ? t('opportunityCreatorPage.priorityHigh') : s < 60 ? t('opportunityCreatorPage.priorityGood') : t('opportunityCreatorPage.priorityMedium')

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar />
        
        {/* Paywall Modal pour free users */}
        {showPaywall && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-8 max-w-md w-full space-y-6">
              <div className="text-center">
                <Lock className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">{t('opportunityCreatorPage.paywallTitle')}</h2>
                <p className="text-sm text-gray-400 mb-6">
                  {t('opportunityCreatorPage.paywallDesc')}
                </p>
              </div>
              
              <div className="bg-[#1A1500] border border-[#D4AF37]/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-[#D4AF37] mb-3">{t('opportunityCreatorPage.paywallIncluded')}</h3>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li>✓ {t('opportunityCreatorPage.paywallFeature1')}</li>
                  <li>✓ {t('opportunityCreatorPage.paywallFeature2')}</li>
                  <li>✓ {t('opportunityCreatorPage.paywallFeature3')}</li>
                  <li>✓ {t('opportunityCreatorPage.paywallFeature4')}</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 py-3 text-sm text-gray-400 border border-[#2A2A2A] rounded-xl hover:border-[#444]"
                >
                  {t('opportunityCreatorPage.back')}
                </button>
                <GoldButton
                  onClick={() => router.push('/pricing')}
                  className="flex-1"
                >
                  {t('opportunityCreatorPage.upgrade')}
                </GoldButton>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-5xl mx-auto w-full space-y-8">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{t('opportunityCreatorPage.paywallTitle')}</h1>
              <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full font-bold uppercase">{t('opportunityCreatorPage.proactive')}</span>
            </div>
            <p className="text-gray-500 text-sm">
              {t('opportunityCreatorPage.heroDesc')}
            </p>
          </div>

          {/* Progression vers l'objectif — l'actif grandit à chaque scan,
              jamais les mêmes leads réaffichés en boucle */}
          {!leadsLoading && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('opportunityCreatorPage.pipeline')}</span>
                <span className="text-sm font-bold text-[#D4AF37]">{leads.length} / {LEAD_GOAL}</span>
              </div>
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F5E6A3] transition-all duration-500"
                  style={{ width: `${Math.min(100, (leads.length / LEAD_GOAL) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                {t('opportunityCreatorPage.pipelineHint')}
              </p>
            </Card>
          )}

          {/* Config */}
          <Card className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('opportunityCreatorPage.yourService')}</label>
                <div className="bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm">
                  {profile?.domain || t('opportunityCreatorPage.notDefined')}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('opportunityCreatorPage.targetZone')}</label>
                <select value={zone} onChange={e => setZone(e.target.value)}
                  className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none">
                  <option value="local">{t('opportunityCreatorPage.local')} ({profile?.city || profile?.country || t('opportunityCreatorPage.cameroon')})</option>
                  <option value="continental">{t('opportunityCreatorPage.africa')}</option>
                  <option value="worldwide">{t('opportunityCreatorPage.worldwide')}</option>
                </select>
              </div>
            </div>

            <div className="bg-[#111] rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p>✅ {t('opportunityCreatorPage.explain1Before')} <strong className="text-white">{profile?.domain || t('opportunityCreatorPage.explain1After')}</strong></p>
              <p>✅ {t('opportunityCreatorPage.explain2')}</p>
              <p>✅ {t('opportunityCreatorPage.explain3')}</p>
              <p>✅ {t('opportunityCreatorPage.explain4')}</p>
            </div>

            <GoldButton onClick={handleScan} loading={loading} fullWidth>
              <Search className="w-4 h-4 mr-2" />
              {loading ? t('opportunityCreatorPage.scanning') : t('opportunityCreatorPage.launchScan')}
            </GoldButton>
          </Card>

          {error && <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[#D4AF37]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-bold">{t('opportunityCreatorPage.analyzing')}</span>
              </div>
              <div className="text-xs text-gray-600 ml-8">
                {t('opportunityCreatorPage.pipelineSteps')}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: t('opportunityCreatorPage.companiesScanned'), value: result.total_found,   color: 'text-gray-400' },
                  { label: t('opportunityCreatorPage.auditsGenerated'),       value: result.total_audited, color: 'text-[#D4AF37]' },
                  { label: t('opportunityCreatorPage.readyToApproach'),   value: result.top_targets?.length || 0, color: 'text-green-400' },
                ].map(s => (
                  <Card key={s.label} className="p-4 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">{s.label}</div>
                  </Card>
                ))}
              </div>

              {/* Top targets avec mockup + message */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                  <Target className="w-4 h-4" /> {t('opportunityCreatorPage.bestTargets')}
                </h3>

                {result.top_targets?.map((target: any, i: number) => (
                  <Card key={i} className={`border ${scoreBg(target.digital_score)}`}>
                    {/* En-tête entreprise */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">{target.company_name}</span>
                            <span className="text-[10px] text-gray-600">{oppLabel(target.digital_score)}</span>
                          </div>
                          {target.website && (
                            <a href={target.website} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-[#D4AF37] hover:text-white flex items-center gap-1 transition-colors">
                              {target.website.slice(0, 40)} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${scoreColor(target.digital_score)}`}>
                            {target.digital_score}/100
                          </div>
                          <div className="text-[10px] text-gray-600">{t('opportunityCreatorPage.digitalScore')}</div>
                        </div>
                      </div>

                      {/* Problèmes détectés */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {target.issues_detected?.map((issue: string, j: number) => (
                          <span key={j} className="text-[10px] bg-red-900/20 text-red-400 px-2 py-0.5 rounded-full border border-red-800/30">
                            ⚠️ {issue}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-4 text-xs">
                        <span className="text-gray-600">{t('opportunityCreatorPage.estimatedBudget')} <span className="text-white font-bold">{target.budget_estimate}</span></span>
                        <span className="text-gray-600">{t('opportunityCreatorPage.replyProbability')} <span className="text-green-400 font-bold">{target.reply_chance}</span></span>
                      </div>
                    </div>

                    {/* Mockup textuel */}
                    {target.mockup_textuel && (
                      <div className="border-t border-[#1A1A1A] p-5">
                        <button onClick={() => setExpanded(expanded === `mockup-${i}` ? null : `mockup-${i}`)}
                          className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors mb-2">
                          <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {t('opportunityCreatorPage.auditTitle')}
                          <span>{expanded === `mockup-${i}` ? '▲' : '▼'}</span>
                        </button>
                        {expanded === `mockup-${i}` && (
                          <div className="bg-black/40 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">
                            {target.mockup_textuel}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message d'approche */}
                    {target.message_approche && (
                      <div className="border-t border-[#1A1A1A] p-5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                            {t('opportunityCreatorPage.approachMessage')}
                          </div>
                          <button onClick={() => copyMessage(`msg-${i}`, target.message_approche)}
                            className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-[#D4AF37] transition-colors">
                            {copied === `msg-${i}` ? <><CheckCheck className="w-3 h-3 text-green-400" /> {t('opportunityCreatorPage.copied')}</> : <><Copy className="w-3 h-3" /> {t('opportunityCreatorPage.copy')}</>}
                          </button>
                        </div>
                        <div className="bg-[#111] rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed border border-[#1A1A1A]">
                          {target.message_approche}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => copyMessage(`msg-${i}`, target.message_approche)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#1A1A1A] hover:bg-[#D4AF37]/10 text-xs text-gray-400 hover:text-[#D4AF37] rounded-lg transition-colors border border-[#2a2a2a]">
                            <Copy className="w-3 h-3" /> {t('opportunityCreatorPage.copyForWhatsapp')}
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Log */}
              {result.log?.length > 0 && (
                <Card className="p-4">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">{t('opportunityCreatorPage.scanLog')}</div>
                  <div className="font-mono text-xs text-gray-700 space-y-0.5">
                    {result.log.map((l: string, i: number) => <div key={i}>{l}</div>)}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Pipeline complet — l'actif persistant, visible même sans scan
              récent. C'est ça qui rend l'outil indispensable au quotidien
              plutôt qu'un gadget qu'on lance une fois et qu'on oublie. */}
          {!leadsLoading && leads.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                <Target className="w-4 h-4" /> {t('opportunityCreatorPage.fullPipeline')} ({leads.length} {t('opportunityCreatorPage.companies')})
              </h3>
              <div className="space-y-2">
                {leads.map((lead: any) => (
                  <Card key={lead.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{lead.company_name}</span>
                          {lead.digital_score != null && (
                            <span className={`text-xs font-bold ${scoreColor(lead.digital_score)}`}>{lead.digital_score}/100</span>
                          )}
                        </div>
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-gray-600 hover:text-[#D4AF37] flex items-center gap-1 transition-colors">
                            {lead.website.slice(0, 45)} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lead.message_approche && (
                          <button onClick={() => copyMessage(`lead-${lead.id}`, lead.message_approche)}
                            title={t('opportunityCreatorPage.copyApproachMessage')}
                            className="p-2 text-gray-500 hover:text-[#D4AF37] transition-colors">
                            {copied === `lead-${lead.id}` ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                        <select
                          value={lead.status}
                          onChange={e => updateLeadStatus(lead.id, e.target.value)}
                          className={`text-[10px] font-bold uppercase tracking-widest bg-black border border-[#2a2a2a] rounded-lg px-2 py-1.5 outline-none ${STATUS_LABELS[lead.status]?.color || 'text-gray-400'}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
