'use client'
import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Navbar from '../components/layout/Navbar'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import { Mic, Send, Users, Star, ExternalLink, Loader2, Award, StopCircle } from 'lucide-react'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { useTranslation } from 'react-i18next'

export default function FindWorker() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [description, setDescription] = useState('')
  const [zone, setZone] = useState('worldwide')
  const [employmentType, setEmploymentType] = useState('any')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)

  const { isRecording: voiceRecording, isProcessing: voiceProcessing, toggle: toggleVoice } = useVoiceInput({
    onTranscript: (text) => setDescription(prev => prev ? `${prev} ${text}` : text),
    onError:      (err)  => setError(err),
  })

  const startVoice = toggleVoice
  const stopVoice  = toggleVoice

  const handleSearch = async () => {
    if (!description.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await fetch('/api/find-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id, description, zone, employment_type: employmentType }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || t('findWorkerPage.genericError'))
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-5xl mx-auto w-full space-y-8">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{t('findWorkerPage.title')}</h1>
              <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded-full font-bold uppercase">{t('findWorkerPage.hallOfFame')}</span>
            </div>
            <p className="text-gray-500 text-sm">{t('findWorkerPage.subtitle')}</p>
          </div>

          {/* Search Form */}
          <Card className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('findWorkerPage.describeLabel')}</label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('findWorkerPage.descPlaceholder')}
                  rows={4}
                  className="w-full bg-black border border-[#2a2a2a] focus:border-[#D4AF37] rounded-lg px-4 py-3 text-white text-sm outline-none resize-none pr-16"
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  {voiceRecording ? (
                    <button onClick={stopVoice} type="button" className="p-2 bg-red-600 rounded-full animate-pulse">
                      <StopCircle className="w-4 h-4 text-white" />
                    </button>
                  ) : voiceProcessing ? (
                    <button disabled className="p-2 bg-yellow-600 rounded-full cursor-wait">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </button>
                  ) : (
                    <button onClick={startVoice} type="button" className="p-2 bg-[#1A1A1A] hover:bg-[#D4AF37]/20 rounded-full transition-colors">
                      <Mic className="w-4 h-4 text-[#D4AF37]" />
                    </button>
                  )}
                </div>
              </div>
              {voiceRecording && <p className="text-xs text-red-400 animate-pulse">{t('findWorkerPage.recording')}</p>}
              {voiceProcessing && <p className="text-xs text-yellow-400">{t('findWorkerPage.transcribing')}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('findWorkerPage.zone')}</label>
                <select value={zone} onChange={e => setZone(e.target.value)} className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none">
                  <option value="worldwide">{t('findWorkerPage.zoneWorldwide')}</option>
                  <option value="continental">{t('findWorkerPage.zoneAfrica')}</option>
                  <option value="local">{t('findWorkerPage.zoneLocal')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('findWorkerPage.collabType')}</label>
                <select value={employmentType} onChange={e => setEmploymentType(e.target.value)} className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none">
                  <option value="any">{t('findWorkerPage.typeAny')}</option>
                  <option value="employee">{t('findWorkerPage.typeEmployee')}</option>
                  <option value="freelance">{t('findWorkerPage.typeFreelance')}</option>
                </select>
              </div>
            </div>

            <GoldButton onClick={handleSearch} loading={loading} fullWidth>
              <Send className="w-4 h-4 mr-2" />
              {loading ? t('findWorkerPage.scanning') : t('findWorkerPage.findIdealWorker')}
            </GoldButton>
          </Card>

          {error && <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[#D4AF37]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-bold">{t('findWorkerPage.analyzing')}</span>
              </div>
              <div className="text-xs text-gray-600 ml-8">{t('findWorkerPage.analysisSteps')}</div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Critères extraits */}
              {result.criteria_extracted && (
                <Card className="p-4 border-[#D4AF37]/20">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('findWorkerPage.criteriaExtracted')}</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-[#1A1A1A] text-xs px-3 py-1 rounded-full text-white">{t('findWorkerPage.domain')}: {result.criteria_extracted.domain}</span>
                    <span className="bg-[#1A1A1A] text-xs px-3 py-1 rounded-full text-white">{t('findWorkerPage.level')}: {result.criteria_extracted.level}</span>
                    <span className="bg-[#1A1A1A] text-xs px-3 py-1 rounded-full text-white">{t('findWorkerPage.zoneLabel')}: {result.criteria_extracted.zone}</span>
                    <span className="bg-[#1A1A1A] text-xs px-3 py-1 rounded-full text-white">{t('findWorkerPage.type')}: {result.criteria_extracted.employment_type}</span>
                    {result.criteria_extracted.skills?.slice(0, 3).map((s: string) => (
                      <span key={s} className="bg-[#D4AF37]/10 text-xs px-3 py-1 rounded-full text-[#D4AF37]">{s}</span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: t('findWorkerPage.analyzed'), value: result.total_analyzed, color: 'text-gray-400' },
                  { label: t('findWorkerPage.retained'), value: result.total_retained, color: 'text-[#D4AF37]' },
                  { label: t('findWorkerPage.rejected'), value: result.total_rejected, color: 'text-red-400' },
                  { label: t('findWorkerPage.onSearcher'), value: result.breakdown?.searcher_internal || 0, color: 'text-purple-400' },
                ].map(s => (
                  <Card key={s.label} className="p-3 text-center">
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">{s.label}</div>
                  </Card>
                ))}
              </div>

              {/* Rejection reason */}
              {result.rejection_reason && (
                <div className="text-xs text-gray-600 bg-[#111] border border-[#1A1A1A] rounded-lg p-3">
                  <span className="text-gray-500">{t('findWorkerPage.rejectionReason')} </span>{result.rejection_reason}
                </div>
              )}

              {/* Worker Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                  {result.workers?.length} {t('findWorkerPage.workersRanked')}
                </h3>
                {result.workers?.map((w: any, i: number) => (
                  <Card key={i} className={`p-5 border ${w.is_searcher_member ? 'border-[#D4AF37]/40 bg-[#1A1500]/20' : 'border-[#1A1A1A]'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#D4AF37] font-bold text-sm flex-shrink-0">
                          {i + 1}
                        </div>
                        {w.avatar_url && <img src={w.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{w.full_name || w.title?.slice(0, 50)}</span>
                            {w.is_searcher_member && <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{t('findWorkerPage.verifiedSearcher')}</span>}
                            {w.verification_status === 'genius' && <span className="text-[9px] bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded-full font-bold uppercase">{t('findWorkerPage.genius')}</span>}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-0.5">{w.source} • {w.location}</div>
                          {w.snippet && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{w.snippet}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className={`text-lg font-bold ${w.worker_score >= 70 ? 'text-[#D4AF37]' : w.worker_score >= 50 ? 'text-blue-400' : 'text-gray-500'}`}>
                          {w.worker_score}/100
                        </div>
                        {w.portfolio_url && (
                          <a href={w.portfolio_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-[#D4AF37] hover:text-white transition-colors">
                            {t('findWorkerPage.viewProfile')} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {w.stats && Object.keys(w.stats).length > 0 && (
                      <div className="flex gap-3 mt-3 pt-3 border-t border-[#1A1A1A]">
                        {Object.entries(w.stats).map(([k, v]: [string, any]) => (
                          <span key={k} className="text-[10px] text-gray-600">{k}: <span className="text-gray-400 font-medium">{v}</span></span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Analysis log */}
              <Card className="p-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('findWorkerPage.fullAnalysisLog')}</div>
                <div className="space-y-0.5 font-mono text-xs text-gray-600 max-h-60 overflow-y-auto">
                  {result.analysis_log?.map((line: string, i: number) => (
                    <div key={i} className={
                      line.startsWith('✅') ? 'text-green-600' :
                      line.startsWith('❌') ? 'text-red-500' :
                      line.startsWith('🏆') ? 'text-[#D4AF37]' :
                      line.startsWith('═') ? 'text-[#D4AF37] font-bold mt-2' :
                      line.startsWith('📊') ? 'text-blue-400 font-bold mt-2' : ''
                    }>{line || '\u00A0'}</div>
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
