'use client'
// =================================================================
// Page qui affiche exactement ce que SCAI a envoyé comme candidature
// Accessible via /applications/[id]
// =================================================================

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import { ArrowLeft, ExternalLink, Copy, CheckCircle, Clock, Bot, FileText, Download } from 'lucide-react'
import { usePDF } from '../hooks/usePDF'

export default function ApplicationDetail() {
  const { user }    = useAuth()
  const params      = useParams()
  const router      = useRouter()
  const id          = Array.isArray(params?.id) ? params.id[0] : params?.id
  const [app, setApp]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)
  const { exportApplication } = usePDF()

  useEffect(() => {
    if (!id || !user) return
    supabase
      .from('applications_sent')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => { setApp(data); setLoading(false) })
  }, [id, user])

  const copy = () => {
    if (app?.message_sent) {
      navigator.clipboard.writeText(app.message_sent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  if (!app) return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-gray-600">Candidature introuvable.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <div className="max-w-2xl mx-auto w-full p-6 space-y-6">

          {/* Retour + actions */}
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            {app && (
              <button
                onClick={() => exportApplication(app, {})}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D4AF37] border border-[#2a2a2a] hover:border-[#D4AF37]/30 px-3 py-1.5 rounded-lg transition-all">
                <Download className="w-3.5 h-3.5" /> Exporter PDF
              </button>
            )}
          </div>

          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-2">
              <img src="/scai-icon.png" alt="SCAI" className="w-4 h-4 rounded object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
              SCAI a postulé en ton nom
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{app.title}</h1>
            {app.company && <p className="text-gray-500 text-sm">{app.company}</p>}
          </div>

          {/* Infos de la candidature */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Envoyée le</div>
              <div className="flex items-center gap-2 text-sm text-white">
                <Clock className="w-4 h-4 text-[#D4AF37]" />
                {new Date(app.applied_at).toLocaleString('fr-FR', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Envoyée via</div>
              <div className="flex items-center gap-2 text-sm text-white">
                <img src="/scai-icon.png" alt="SCAI" className="w-4 h-4 rounded object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                {app.channel === 'scai_auto' ? 'SCAI Auto-apply' : app.channel}
              </div>
            </Card>
          </div>

          {/* Sujet */}
          {app.subject && (
            <Card className="p-4">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Sujet</div>
              <p className="text-sm text-white">{app.subject}</p>
            </Card>
          )}

          {/* Message envoyé */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest">
                <FileText className="w-4 h-4 text-[#D4AF37]" />
                Message exact envoyé par SCAI
              </div>
              <button onClick={copy}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D4AF37] transition-colors">
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
              {app.message_sent}
            </pre>
          </Card>

          {/* Lien vers l'offre originale */}
          {app.original_url && (
            <a href={app.original_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full border border-[#2a2a2a] hover:border-[#D4AF37]/30 text-gray-400 hover:text-white py-3 rounded-xl text-sm font-medium transition-all">
              <ExternalLink className="w-4 h-4" /> Voir l'offre originale
            </a>
          )}

          {/* Score au moment de la candidature */}
          {app.score_at_apply && (
            <p className="text-xs text-gray-700 text-center">
              Score de l'opportunité au moment de la candidature : <strong className="text-gray-500">{app.score_at_apply}/100</strong>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
