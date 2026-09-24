'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import { Search, Users, Star, ExternalLink, Loader2, Globe, Github, Award } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function TalentSearch() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const router = useRouter()
  const [domain, setDomain] = useState('')
  const [zone, setZone] = useState('worldwide')
  const [level, setLevel] = useState('any')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!domain.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await fetch('/api/talent-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id, domain, zone, level }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || t('talentSearchPage.genericError'))
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const sourceIcon = (src: string) => {
    if (src?.includes('searcher')) return <Award className="w-3 h-3 text-[#D4AF37]" />
    if (src?.includes('github'))   return <Github className="w-3 h-3 text-gray-400" />
    if (src?.includes('linkedin')) return <Users className="w-3 h-3 text-blue-400" />
    return <Globe className="w-3 h-3 text-gray-500" />
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-5xl mx-auto w-full space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white">{t('talentSearchPage.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('talentSearchPage.subtitle')}</p>
          </div>

          {/* Search Form */}
          <Card className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('talentSearchPage.domainLabel')}</label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder={t('talentSearchPage.domainPlaceholder')}
                className="w-full bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-lg px-4 py-3 text-white text-sm outline-none"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('talentSearchPage.zoneLabel')}</label>
                <select value={zone} onChange={e => setZone(e.target.value)} className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none">
                  <option value="worldwide">{t('talentSearchPage.zoneWorldwide')}</option>
                  <option value="continental">{t('talentSearchPage.zoneAfrica')}</option>
                  <option value="local">{t('talentSearchPage.zoneLocal')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('talentSearchPage.levelLabel')}</label>
                <select value={level} onChange={e => setLevel(e.target.value)} className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none">
                  <option value="any">{t('talentSearchPage.levelAny')}</option>
                  <option value="junior">{t('talentSearchPage.levelJunior')}</option>
                  <option value="mid">{t('talentSearchPage.levelMid')}</option>
                  <option value="senior">{t('talentSearchPage.levelSenior')}</option>
                </select>
              </div>
            </div>

            <GoldButton onClick={handleSearch} loading={loading} fullWidth>
              <Search className="w-4 h-4 mr-2" />
              {loading ? t('talentSearchPage.scanning') : t('talentSearchPage.launchSearch')}
            </GoldButton>
          </Card>

          {/* Error */}
          {error && <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 text-[#D4AF37]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('talentSearchPage.scanningDesc')}</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: t('talentSearchPage.analyzed'), value: result.total_analyzed, color: 'text-gray-400' },
                  { label: t('talentSearchPage.retained'), value: result.total_retained, color: 'text-[#D4AF37]' },
                  { label: t('talentSearchPage.rejected'), value: result.total_rejected, color: 'text-red-400' },
                ].map(s => (
                  <Card key={s.label} className="p-4 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-600 uppercase tracking-widest mt-1">{s.label}</div>
                  </Card>
                ))}
              </div>

              {/* Sources breakdown */}
              <Card className="p-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('talentSearchPage.sourcesScanned')}</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.breakdown || {}).map(([src, count]: [string, any]) => (
                    <span key={src} className="bg-[#1A1A1A] text-xs px-3 py-1 rounded-full text-gray-400">
                      {src}: <span className="text-[#D4AF37] font-bold">{count}</span>
                    </span>
                  ))}
                </div>
              </Card>

              {/* Talent Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                  {t('talentSearchPage.topTalents', { count: result.talents?.length })}
                </h3>
                {result.talents?.map((talent: any, i: number) => (
                  <Card key={i} className={`p-5 border ${talent.is_searcher_member ? 'border-[#D4AF37]/40' : 'border-[#1A1A1A]'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {talent.avatar_url ? (
                          <img src={talent.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#D4AF37] font-bold">
                            {talent.title?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{talent.title?.slice(0, 60)}</span>
                            {talent.is_searcher_member && (
                              <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full font-bold uppercase">{t('talentSearchPage.searcherMember')}</span>
                            )}
                            {talent.verification_status === 'genius' && (
                              <span className="text-[9px] bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded-full font-bold uppercase">{t('talentSearchPage.genius')}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {sourceIcon(talent.source)}
                            <span className="text-[10px] text-gray-600">{talent.source} • {talent.location}</span>
                          </div>
                          {talent.snippet && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{talent.snippet}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className={`text-lg font-bold ${talent.talent_score >= 70 ? 'text-[#D4AF37]' : talent.talent_score >= 50 ? 'text-blue-400' : 'text-gray-500'}`}>
                          {talent.talent_score}/100
                        </div>
                        {talent.portfolio_url && (
                          <a href={talent.portfolio_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-[#D4AF37] hover:text-white transition-colors">
                            {t('talentSearchPage.viewProfile')} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Stats */}
                    {talent.stats && Object.keys(talent.stats).length > 0 && (
                      <div className="flex gap-3 mt-3 pt-3 border-t border-[#1A1A1A]">
                        {Object.entries(talent.stats).map(([k, v]: [string, any]) => (
                          <span key={k} className="text-[10px] text-gray-600">{k}: <span className="text-gray-400">{v}</span></span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Analysis log */}
              <Card className="p-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('talentSearchPage.analysisLog')}</div>
                <div className="space-y-1 font-mono text-xs text-gray-600 max-h-48 overflow-y-auto">
                  {result.analysis_log?.map((line: string, i: number) => (
                    <div key={i} className={line.startsWith('✅') ? 'text-green-600' : line.startsWith('❌') ? 'text-red-600' : line.startsWith('═') ? 'text-[#D4AF37]' : ''}>{line}</div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
