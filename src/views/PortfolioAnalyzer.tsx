'use client'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import { Link, Plus, Trash2, ExternalLink, Loader2, Trophy, X, CheckCircle, User, Users } from 'lucide-react'
import SCAIVoice from '../components/scai/SCAIVoice'
import { useTranslation } from 'react-i18next'

export default function PortfolioAnalyzer() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'analyze-others' | 'analyze-mine'>('analyze-others')

  // État pour l'onglet "Analyser d'autres portfolios"
  const [urls, setUrls] = useState<string[]>([''])
  const [domain, setDomain] = useState('')
  const [topN, setTopN] = useState(10)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [bulkInput, setBulkInput] = useState('')

  // État pour l'onglet "Analyser MON Profil"
  const [analyzingProfile, setAnalyzingProfile] = useState(false)
  const [profileAnalysisResult, setProfileAnalysisResult] = useState<any>(null)

  const addUrl = () => setUrls(prev => [...prev, ''])
  const removeUrl = (i: number) => setUrls(prev => prev.filter((_, idx) => idx !== i))
  const updateUrl = (i: number, val: string) => setUrls(prev => prev.map((u, idx) => idx === i ? val : u))

  const handleBulkPaste = () => {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'))
    if (lines.length) { setUrls(lines); setBulkInput('') }
  }

  const handleAnalyze = async () => {
    const validUrls = urls.filter(u => u.trim().startsWith('http'))
    if (!validUrls.length) { setError(t('portfolioAnalyzerPage.addValidUrl')); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch('/api/portfolio-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id, portfolio_urls: validUrls, domain, top_n: topN }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || t('portfolioAnalyzerPage.genericError'))
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleAnalyzeMyProfile = async () => {
    setAnalyzingProfile(true)
    setProfileAnalysisResult(null)
    try {
      // Rediriger vers l'Agent pour que SCAI analyse le profil
      window.location.href = '/agent?prompt=Analyse+mon+profil+Searcher+Connector+en+d%C3%A9tail+et+sugg%C3%A8re+des+formations+gratuites+sp%C3%A9cifiques+pour+m%27am%C3%A9liorer'
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzingProfile(false)
    }
  }

  const scoreColor = (s: number) => s >= 75 ? 'text-[#D4AF37]' : s >= 55 ? 'text-blue-400' : s >= 35 ? 'text-orange-400' : 'text-red-500'
  const scoreBg = (s: number) => s >= 75 ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30' : s >= 55 ? 'bg-blue-900/10 border-blue-800/30' : 'bg-[#1A1A1A] border-[#2A2A2A]'

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8 pt-24">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{t('portfolioAnalyzerPage.title')}</h1>
              <p className="text-gray-500 text-sm mt-1">{t('portfolioAnalyzerPage.subtitle')}</p>
            </div>
            <SCAIVoice />
          </div>

          {/* Onglets */}
          <div className="flex gap-4 border-b border-[#2A2A2A] pb-2">
            <button
              onClick={() => setActiveTab('analyze-others')}
              className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-all ${
                activeTab === 'analyze-others'
                  ? 'bg-[#1A1A1A] text-white border border-[#2A2A2A] border-b-transparent'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <Users size={16} /> {t('portfolioAnalyzerPage.analyzeOthersTab')}
            </button>
            <button
              onClick={() => setActiveTab('analyze-mine')}
              className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-all ${
                activeTab === 'analyze-mine'
                  ? 'bg-[#1A1A1A] text-white border border-[#2A2A2A] border-b-transparent'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <User size={16} /> {t('portfolioAnalyzerPage.analyzeMineTab')}
            </button>
          </div>

          {/* Contenu de l'onglet "Analyser d'autres portfolios" */}
          {activeTab === 'analyze-others' && (
            <div className="space-y-6">
              {/* Config */}
              <Card className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('portfolioAnalyzerPage.domainEvaluated')}</label>
                    <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder={t('portfolioAnalyzerPage.domainPlaceholder')}
                      className="w-full bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-lg px-4 py-3 text-white text-sm outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('portfolioAnalyzerPage.numFinalists')}</label>
                    <select value={topN} onChange={e => setTopN(Number(e.target.value))} className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none">
                      {[5, 10, 15, 20].map(n => <option key={n} value={n}>{t('portfolioAnalyzerPage.top')} {n}</option>)}
                    </select>
                  </div>
                </div>

                {/* Bulk paste */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('portfolioAnalyzerPage.pasteMultipleLinks')}</label>
                  <div className="flex gap-2">
                    <textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)} placeholder={"https://johndoe.com/portfolio\nhttps://github.com/janedoe\nhttps://behance.net/user..."}
                      rows={3} className="flex-1 bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none resize-none font-mono" />
                    <button onClick={handleBulkPaste} className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-sm font-bold transition-colors flex-shrink-0">
                      {t('portfolioAnalyzerPage.import')}
                    </button>
                  </div>
                </div>

                {/* Individual URLs */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('portfolioAnalyzerPage.individualLinks')} ({urls.filter(u => u.trim()).length} {t('portfolioAnalyzerPage.added')})</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {urls.map((u, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="url" value={u} onChange={e => updateUrl(i, e.target.value)} placeholder="https://..."
                          className="flex-1 bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
                        <button onClick={() => removeUrl(i)} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addUrl} className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#D4AF37] transition-colors">
                    <Plus className="w-3 h-3" /> {t('portfolioAnalyzerPage.addLink')}
                  </button>
                </div>

                <GoldButton onClick={handleAnalyze} loading={loading} fullWidth disabled={loading}>
                  <Trophy className="w-4 h-4 mr-2" />
                  {loading ? t('portfolioAnalyzerPage.analyzingInProgress', { count: urls.filter(u => u.trim()).length }) : t('portfolioAnalyzerPage.analyzePortfolios', { count: urls.filter(u => u.trim()).length })}
                </GoldButton>
              </Card>

              {error && <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

              {loading && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[#D4AF37]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-bold">{t('portfolioAnalyzerPage.visitingAnalyzing')}</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-8">{t('portfolioAnalyzerPage.processTime')}</p>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: t('portfolioAnalyzerPage.analyzed'), value: result.total_analyzed, color: 'text-gray-400', sub: t('portfolioAnalyzerPage.portfoliosVisited') },
                      { label: t('portfolioAnalyzerPage.finalists'), value: result.total_retained, color: 'text-[#D4AF37]', sub: t('portfolioAnalyzerPage.topRetained', { n: topN }) },
                      { label: t('portfolioAnalyzerPage.excluded'), value: result.total_rejected, color: 'text-red-400', sub: t('portfolioAnalyzerPage.insufficientQuality') },
                    ].map((stat, i) => (
                      <Card key={i} className="p-4 text-center">
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs font-bold text-white mt-1">{stat.label}</div>
                        <div className="text-[10px] text-gray-600">{stat.sub}</div>
                      </Card>
                    ))}
                  </div>

                  {/* Top portfolios */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> {t('portfolioAnalyzerPage.top')} {result.portfolios?.length} {t('portfolioAnalyzerPage.topPortfoliosRanked')}
                    </h3>
                    {result.portfolios?.map((p: any, i: number) => (
                      <Card key={i} className={`p-5 border ${scoreBg(p.score)}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-xl font-bold ${scoreColor(p.score)}`}>#{p.rank}</span>
                              <div className={`text-lg font-bold ${scoreColor(p.score)}`}>{p.score}/100</div>
                              <span className="text-xs text-gray-500">{p.verdict.split('—')[0].trim()}</span>
                            </div>
                            {/* SEULEMENT LE LIEN — pas de contenu */}
                            <a href={p.portfolio_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-[#D4AF37] hover:text-white transition-colors font-mono break-all">
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              {p.portfolio_url}
                            </a>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              {p.strengths?.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">{t('portfolioAnalyzerPage.strengths')}</div>
                                  {p.strengths.map((s: string, j: number) => (
                                    <div key={j} className="flex items-center gap-1 text-xs text-gray-400">
                                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" /> {s}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {p.weaknesses?.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">{t('portfolioAnalyzerPage.weaknesses')}</div>
                                  {p.weaknesses.map((w: string, j: number) => (
                                    <div key={j} className="flex items-center gap-1 text-xs text-gray-500">
                                      <X className="w-3 h-3 text-red-600 flex-shrink-0" /> {w}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {p.tech_stack_detected?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {p.tech_stack_detected.map((tech: string, j: number) => (
                                  <span key={j} className="text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded text-gray-500">{tech}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                            <div className="text-xs text-gray-600">{p.projects_detected} {t('portfolioAnalyzerPage.projects')}</div>
                            {p.has_live_demos && <div className="text-[10px] text-green-600">{t('portfolioAnalyzerPage.liveDemos')}</div>}
                            {p.has_case_studies && <div className="text-[10px] text-blue-400">{t('portfolioAnalyzerPage.caseStudies')}</div>}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Rejected summary */}
                  {result.rejected_summary?.length > 0 && (
                    <Card className="p-4">
                      <div className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">{t('portfolioAnalyzerPage.excludedPortfolios')}</div>
                      <div className="space-y-1">
                        {result.rejected_summary.map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs text-gray-600">
                            <span className="font-mono truncate max-w-xs">{r.portfolio_url}</span>
                            <span className="flex-shrink-0 ml-2 text-red-500">{r.score}/100 — {r.main_reason}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Full log */}
                  <Card className="p-4">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('portfolioAnalyzerPage.fullAnalysisReport')}</div>
                    <div className="font-mono text-xs text-gray-600 max-h-60 overflow-y-auto space-y-0.5">
                      {result.analysis_log?.map((line: string, i: number) => (
                        <div key={i} className={
                          line.startsWith('📊') ? 'text-blue-400 font-bold' :
                            line.startsWith('═') ? 'text-[#D4AF37] font-bold' :
                              line.startsWith('  ✓') ? 'text-green-600' :
                                line.startsWith('  ❌') ? 'text-red-500' : ''
                        }>{line || '\u00A0'}</div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Contenu de l'onglet "Analyser MON Profil" */}
          {activeTab === 'analyze-mine' && (
            <div className="space-y-6">
              <Card className="p-8 text-center">
                <User className="w-16 h-16 text-[#D4AF37] mx-auto mb-6" />
                <h2 className="text-xl font-bold text-white mb-4">{t('portfolioAnalyzerPage.analyzeYourProfile')}</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                  {t('portfolioAnalyzerPage.analyzeMineDesc')}
                </p>

                <div className="mb-8 text-left space-y-4">
                  <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {t('portfolioAnalyzerPage.whatScaiAnalyzes')}
                  </h3>
                  <ul className="text-sm text-gray-500 space-y-2 ml-6">
                    <li>• {t('portfolioAnalyzerPage.analyzeItem1')}</li>
                    <li>• {t('portfolioAnalyzerPage.analyzeItem2')}</li>
                    <li>• {t('portfolioAnalyzerPage.analyzeItem3')}</li>
                    <li>• {t('portfolioAnalyzerPage.analyzeItem4')}</li>
                  </ul>
                </div>

                <GoldButton onClick={handleAnalyzeMyProfile} loading={analyzingProfile} fullWidth size="lg">
                  <User className="w-5 h-5 mr-2" />
                  {analyzingProfile ? t('portfolioAnalyzerPage.launchingAnalysis') : t('portfolioAnalyzerPage.launchMyAnalysis')}
                </GoldButton>

                <p className="text-xs text-gray-600 mt-6">
                  {t('portfolioAnalyzerPage.analysisViaAgent')}
                </p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <h3 className="text-sm font-bold text-white mb-3">{t('portfolioAnalyzerPage.recommendedTraining')}</h3>
                  <ul className="text-sm text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <a href="https://grow.google/certificates/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">
                        {t('portfolioAnalyzerPage.googleCerts')}
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <a href="https://www.freecodecamp.org/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">
                        {t('portfolioAnalyzerPage.freeCodeCamp')}
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <a href="https://cs50.harvard.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">
                        {t('portfolioAnalyzerPage.harvardCs50')}
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                      <a href="https://www.openclassrooms.com/fr/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">
                        {t('portfolioAnalyzerPage.openClassrooms')}
                      </a>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <h3 className="text-sm font-bold text-white mb-3">{t('portfolioAnalyzerPage.quickTips')}</h3>
                  <ul className="text-sm text-gray-400 space-y-2">
                    <li>• {t('portfolioAnalyzerPage.tip1')}</li>
                    <li>• {t('portfolioAnalyzerPage.tip2')}</li>
                    <li>• {t('portfolioAnalyzerPage.tip3')}</li>
                    <li>• {t('portfolioAnalyzerPage.tip4')}</li>
                  </ul>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
