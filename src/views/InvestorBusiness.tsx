'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { TrendingUp, Search, Zap, Loader2, AlertCircle, ExternalLink, Target, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ── Secteurs disponibles (mondial + Afrique) ─────────────────────
const SECTORS = [
  'Fintech', 'Agritech', 'Healthtech', 'Edtech', 'E-commerce',
  'Logistique', 'Énergie Renouvelable', 'SaaS', 'IA / ML', 'Immobilier',
  'Tourisme', 'Médias', 'Sport', 'Mode', 'Blockchain', 'Transport',
]

const TICKET_SIZES = ['< $10k', '$10k – $50k', '$50k – $250k', '$250k – $1M', '> $1M']

const TARGETS = [
  'PME locales', 'Startups', 'Grandes entreprises', 'Associations / ONG',
  'Freelances', 'E-commerce', 'Restaurants', 'Agences', 'Hôtels',
]

export default function InvestorBusiness() {
  const { t } = useTranslation()
  const router  = useRouter()
  const { user, profile } = useAuth()
  const [tab, setTab]         = useState<'investor' | 'business'>('investor')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError]     = useState('')

  // Investor form
  const [sector, setSector]   = useState('')
  const [ticket, setTicket]   = useState('')
  const [zone, setZone]       = useState('Africa')

  // Business form
  const [product, setProduct] = useState('')
  const [target, setTarget]   = useState('')
  const [bizZone, setBizZone] = useState('Local')

  const handleInvestorSearch = async () => {
    if (!sector) return
    setError(''); setResults([]); setLoading(true)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          zone: zone === 'Africa' ? 'continental' : 'worldwide',
          profile_type: 'investor',
          domain: sector,
          custom_query: `startup ${sector} funding seed ${zone} ${ticket ? ticket + ' ticket' : ''}`,
          has_budget: false,
        }),
      })
      const data = await res.json()
      setResults(data.results || data.opportunities || [])
      if (!data.results?.length && !data.opportunities?.length) {
        setError(t('investorBusinessPage.noResultsSector'))
      }
    } catch (e: any) {
      setError(t('investorBusinessPage.searchError'))
    } finally { setLoading(false) }
  }

  const handleBusinessSearch = async () => {
    if (!product) return
    setError(''); setResults([]); setLoading(true)
    try {
      const res = await fetch('/api/opportunity-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          service: product,
          target_type: target,
          zone: bizZone,
          country: profile?.country || '',
          city: profile?.city || '',
        }),
      })
      const data = await res.json()
      setResults(data.leads || data.results || [])
      if (!data.leads?.length && !data.results?.length) {
        setError(t('investorBusinessPage.noLeadsFound'))
      }
    } catch (e: any) {
      setError(t('investorBusinessPage.searchError'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">

        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex gap-6">
            {(['investor', 'business'] as const).map(tabItem => (
              <button key={tabItem} onClick={() => { setTab(tabItem); setResults([]); setError('') }}
                className={`text-sm font-bold tracking-widest uppercase transition-all pb-1 border-b-2 ${tab === tabItem ? 'text-[#D4AF37] border-[#D4AF37]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                {tabItem === 'investor' ? t('investorBusinessPage.investorTab') : t('investorBusinessPage.businessTab')}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">
            {tab === 'investor' ? t('investorBusinessPage.investorSubtitle') : t('investorBusinessPage.businessSubtitle')}
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">

          {/* ── INVESTOR TAB ─────────────────────────────────── */}
          {tab === 'investor' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <Card className="p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#D4AF37]" /> {t('investorBusinessPage.investmentCriteria')}
                  </h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('investorBusinessPage.sector')}</label>
                    <select value={sector} onChange={e => setSector(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      <option value="">{t('investorBusinessPage.chooseSector')}</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('investorBusinessPage.investmentTicket')}</label>
                    <select value={ticket} onChange={e => setTicket(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      <option value="">{t('investorBusinessPage.allTickets')}</option>
                      {TICKET_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('investorBusinessPage.geoZone')}</label>
                    <select value={zone} onChange={e => setZone(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      {['Africa', 'Europe', 'Asia', 'Americas', 'Global'].map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <GoldButton fullWidth onClick={handleInvestorSearch} loading={loading} disabled={!sector}>
                    <Search className="w-4 h-4 mr-2" /> {t('investorBusinessPage.searchStartups')}
                  </GoldButton>
                </Card>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase">
                  {results.length > 0 ? `${results.length} ${t('investorBusinessPage.startupsFound')}` : t('investorBusinessPage.searchResults')}
                </h3>

                {loading && (
                  <div className="flex items-center gap-3 p-6 text-[#D4AF37]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">{t('investorBusinessPage.scanningStartups')} {zone}...</span>
                  </div>
                )}

                {error && !loading && (
                  <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                {!loading && results.length === 0 && !error && (
                  <Card className="p-12 text-center">
                    <TrendingUp className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">{t('investorBusinessPage.selectSectorHint')}<br />{t('investorBusinessPage.scanningWorldwidePlatforms')}</p>
                  </Card>
                )}

                {results.map((item: any, i: number) => (
                  <Card key={i} className="p-6 hover:border-[#D4AF37]/40 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white mb-1 truncate">{item.title || item.name}</h4>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.snippet || item.description}</p>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                          {item.source && <span>{t('investorBusinessPage.source')} {item.source}</span>}
                          {item.date && <span>{item.date}</span>}
                          <span className="text-[#D4AF37]">{sector}</span>
                        </div>
                      </div>
                      {(item.link || item.url || item.original_url) && (
                        <a href={item.link || item.url || item.original_url} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center gap-1 text-[#D4AF37] text-xs font-bold hover:underline">
                          {t('investorBusinessPage.view')} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── BUSINESS OWNER TAB ───────────────────────────── */}
          {tab === 'business' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <Card className="p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#D4AF37]" /> {t('investorBusinessPage.findClients')}
                  </h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('investorBusinessPage.yourProductService')}</label>
                    <input type="text" value={product} onChange={e => setProduct(e.target.value)}
                      placeholder={t('investorBusinessPage.productPlaceholder')}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('investorBusinessPage.targetClientType')}</label>
                    <select value={target} onChange={e => setTarget(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      <option value="">{t('investorBusinessPage.allProfiles')}</option>
                      {TARGETS.map(tg => <option key={tg} value={tg}>{tg}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('investorBusinessPage.zone')}</label>
                    <select value={bizZone} onChange={e => setBizZone(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      {['Local', 'Nationale', 'Afrique', 'Mondial'].map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <GoldButton fullWidth onClick={handleBusinessSearch} loading={loading} disabled={!product}>
                    <Zap className="w-4 h-4 mr-2" /> {t('investorBusinessPage.findClientsBtn')}
                  </GoldButton>
                  <p className="text-xs text-gray-700 text-center">{t('investorBusinessPage.alsoUse')} <button onClick={() => router.push('/opportunity-creator')} className="text-[#D4AF37] hover:underline">{t('investorBusinessPage.opportunityCreatorLink')}</button> {t('investorBusinessPage.forFullAudit')}</p>
                </Card>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase">
                  {results.length > 0 ? `${results.length} ${t('investorBusinessPage.leadsFound')}` : t('investorBusinessPage.clientLeads')}
                </h3>

                {loading && (
                  <div className="flex items-center gap-3 p-6 text-[#D4AF37]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">{t('investorBusinessPage.scanningCompanies')} "{bizZone}"...</span>
                  </div>
                )}

                {error && !loading && (
                  <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                {!loading && results.length === 0 && !error && (
                  <Card className="p-12 text-center">
                    <Globe className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">{t('investorBusinessPage.enterServiceHint')}<br />{t('investorBusinessPage.willFindCompanies')}</p>
                  </Card>
                )}

                {results.map((lead: any, i: number) => (
                  <Card key={i} className="p-5 hover:border-[#D4AF37]/40 transition-all border-l-4 border-l-[#D4AF37]/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white mb-1">{lead.title || lead.name || lead.company}</div>
                        <div className="text-sm text-gray-500 mb-2 line-clamp-2">{lead.snippet || lead.description}</div>
                        {lead.score && (
                          <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                            {t('investorBusinessPage.digitalScore')} {lead.score}/100
                          </div>
                        )}
                      </div>
                      {(lead.link || lead.url || lead.original_url) && (
                        <a href={lead.link || lead.url || lead.original_url} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 text-[#D4AF37] text-xs font-bold hover:underline flex items-center gap-1">
                          {t('investorBusinessPage.view')} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
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
