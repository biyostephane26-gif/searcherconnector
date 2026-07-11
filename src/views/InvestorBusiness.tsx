'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { TrendingUp, Search, Zap, Loader2, AlertCircle, ExternalLink, Target, Globe } from 'lucide-react'

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
        setError('Aucun résultat pour ce secteur. Essaie un terme plus large.')
      }
    } catch (e: any) {
      setError('Erreur lors de la recherche. Réessaie.')
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
        setError('Aucun lead trouvé. Essaie un produit différent ou une autre zone.')
      }
    } catch (e: any) {
      setError('Erreur lors de la recherche. Réessaie.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">

        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex gap-6">
            {(['investor', 'business'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setResults([]); setError('') }}
                className={`text-sm font-bold tracking-widest uppercase transition-all pb-1 border-b-2 ${tab === t ? 'text-[#D4AF37] border-[#D4AF37]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                {t === 'investor' ? '📈 Investisseur' : '🏢 Business Owner'}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">
            {tab === 'investor' ? 'Trouve des startups à financer' : 'Trouve des clients qui payent'}
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">

          {/* ── INVESTOR TAB ─────────────────────────────────── */}
          {tab === 'investor' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <Card className="p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#D4AF37]" /> Critères d'investissement
                  </h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Secteur</label>
                    <select value={sector} onChange={e => setSector(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      <option value="">Choisir un secteur...</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ticket d'investissement</label>
                    <select value={ticket} onChange={e => setTicket(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      <option value="">Tous les tickets</option>
                      {TICKET_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Zone géographique</label>
                    <select value={zone} onChange={e => setZone(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      {['Africa', 'Europe', 'Asia', 'Americas', 'Global'].map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <GoldButton fullWidth onClick={handleInvestorSearch} loading={loading} disabled={!sector}>
                    <Search className="w-4 h-4 mr-2" /> Chercher des startups
                  </GoldButton>
                </Card>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase">
                  {results.length > 0 ? `${results.length} startups trouvées` : 'Résultats de la recherche'}
                </h3>

                {loading && (
                  <div className="flex items-center gap-3 p-6 text-[#D4AF37]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">SCAI scanne les startups dans {zone}...</span>
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
                    <p className="text-gray-500 text-sm">Sélectionne un secteur et lance la recherche.<br />SCAI va scanner les plateformes d'investissement mondiales.</p>
                  </Card>
                )}

                {results.map((item: any, i: number) => (
                  <Card key={i} className="p-6 hover:border-[#D4AF37]/40 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white mb-1 truncate">{item.title || item.name}</h4>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.snippet || item.description}</p>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                          {item.source && <span>Source: {item.source}</span>}
                          {item.date && <span>{item.date}</span>}
                          <span className="text-[#D4AF37]">{sector}</span>
                        </div>
                      </div>
                      {(item.link || item.url || item.original_url) && (
                        <a href={item.link || item.url || item.original_url} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center gap-1 text-[#D4AF37] text-xs font-bold hover:underline">
                          Voir <ExternalLink className="w-3 h-3" />
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
                    <Target className="w-5 h-5 text-[#D4AF37]" /> Trouve des clients
                  </h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ton produit / service</label>
                    <input type="text" value={product} onChange={e => setProduct(e.target.value)}
                      placeholder="ex: Site web, Logo, SEO, App mobile..."
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type de client visé</label>
                    <select value={target} onChange={e => setTarget(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      <option value="">Tous les profils</option>
                      {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Zone</label>
                    <select value={bizZone} onChange={e => setBizZone(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none">
                      {['Local', 'Nationale', 'Afrique', 'Mondial'].map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <GoldButton fullWidth onClick={handleBusinessSearch} loading={loading} disabled={!product}>
                    <Zap className="w-4 h-4 mr-2" /> Trouver des clients
                  </GoldButton>
                  <p className="text-xs text-gray-700 text-center">Utilise aussi <button onClick={() => router.push('/opportunity-creator')} className="text-[#D4AF37] hover:underline">Opportunity Creator →</button> pour un audit complet</p>
                </Card>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase">
                  {results.length > 0 ? `${results.length} leads trouvés` : 'Leads clients'}
                </h3>

                {loading && (
                  <div className="flex items-center gap-3 p-6 text-[#D4AF37]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">SCAI scanne les entreprises dans "{bizZone}"...</span>
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
                    <p className="text-gray-500 text-sm">Entre ton service et lance la recherche.<br />SCAI va trouver des entreprises qui ont besoin de toi.</p>
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
                            Score digital : {lead.score}/100
                          </div>
                        )}
                      </div>
                      {(lead.link || lead.url || lead.original_url) && (
                        <a href={lead.link || lead.url || lead.original_url} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 text-[#D4AF37] text-xs font-bold hover:underline flex items-center gap-1">
                          Voir <ExternalLink className="w-3 h-3" />
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
