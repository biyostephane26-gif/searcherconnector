'use client'

import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileText, FileType2, Loader2, AlertTriangle } from 'lucide-react'
import { authFetch, downloadBase64 } from '../../lib/authFetch'

export type CoworkTool = 'pdf' | 'excel' | 'word' | 'image' | 'video'

export const TOOL_META: Record<CoworkTool, { label: string; emoji: string; placeholder: string }> = {
  pdf:   { label: 'PDF',        emoji: '📄', placeholder: 'Décris le PDF à créer (CV, devis, rapport…)' },
  excel: { label: 'Excel',      emoji: '📊', placeholder: 'Décris le tableau à créer (budget, planning…)' },
  word:  { label: 'Word',       emoji: '📝', placeholder: 'Décris le document à rédiger (proposition, lettre…)' },
  image: { label: 'Image',      emoji: '🖼️', placeholder: 'Décris l\'image à générer' },
  video: { label: 'Mini-vidéo', emoji: '🎬', placeholder: 'Décris la courte vidéo à générer' },
}

export type ToolAttachmentData =
  | { kind: 'file'; filename: string; mime: string; base64: string; size: number; title: string }
  | { kind: 'image'; src: string; provider: string; fallback?: boolean }
  | { kind: 'video'; job: string; provider: string }

const fileIcon = (mime: string) =>
  mime.includes('sheet') ? <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
    : mime.includes('word') ? <FileType2 className="w-6 h-6 text-blue-400" />
    : <FileText className="w-6 h-6 text-red-400" />

export default function ToolAttachment({ data }: { data: ToolAttachmentData }) {
  if (data.kind === 'file') {
    return (
      <div className="mt-3 flex items-center gap-3 bg-black/30 border border-[#2a2a2a] rounded-xl p-3">
        <div className="w-11 h-11 rounded-lg bg-[#1A1A1A] flex items-center justify-center shrink-0">{fileIcon(data.mime)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{data.title}</p>
          <p className="text-[11px] text-gray-500 truncate">{data.filename} · {Math.max(1, Math.round(data.size / 1024))} Ko</p>
        </div>
        <button
          onClick={() => downloadBase64(data.base64, data.filename, data.mime)}
          className="flex items-center gap-1.5 text-xs font-bold bg-[#D4AF37] text-black px-3 py-2 rounded-lg hover:bg-[#e0bd4f]"
        >
          <Download className="w-3.5 h-3.5" /> Télécharger
        </button>
      </div>
    )
  }

  if (data.kind === 'image') {
    const ext = data.src.startsWith('data:image/png') ? 'png' : 'jpg'
    return (
      <div className="mt-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.src} alt="Image générée par SCAI" className="rounded-xl border border-[#2a2a2a] max-h-96 w-auto" />
        <div className="flex items-center justify-between mt-2 gap-3">
          <span className="text-[11px] text-gray-500">
            Généré avec {data.provider}{data.fallback ? ' — qualité réduite, les générateurs premium n\'ont plus de crédit' : ''}
          </span>
          <a href={data.src} download={`scai-image.${ext}`} className="flex items-center gap-1 text-xs font-bold text-[#D4AF37] hover:underline">
            <Download className="w-3.5 h-3.5" /> Télécharger
          </a>
        </div>
      </div>
    )
  }

  return <VideoAttachment job={data.job} provider={data.provider} />
}

function VideoAttachment({ job, provider }: { job: string; provider: string }) {
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing')
  const [progress, setProgress] = useState<number | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const r = await authFetch(`/api/tools/video?job=${encodeURIComponent(job)}`)
        const d = await r.json()
        if (stopped) return
        if (d.status === 'completed') {
          const file = await authFetch(`/api/tools/video?job=${encodeURIComponent(job)}&download=1`)
          if (!file.ok) throw new Error('Téléchargement impossible')
          setUrl(URL.createObjectURL(await file.blob()))
          setStatus('completed')
          return
        }
        if (d.status === 'failed' || d.error) { setStatus('failed'); setError(d.error || 'La génération a échoué'); return }
        setProgress(typeof d.progress === 'number' ? d.progress : null)
        timer = setTimeout(poll, 6000)
      } catch (e: any) {
        if (!stopped) { setStatus('failed'); setError(e.message) }
      }
    }
    poll()
    return () => { stopped = true; clearTimeout(timer) }
  }, [job])

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  if (status === 'failed') {
    return <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{error}</p>
  }
  if (status === 'processing') {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 bg-black/30 border border-[#2a2a2a] rounded-xl p-3">
        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
        Vidéo en cours de création avec {provider}{progress !== null ? ` — ${progress}%` : ''} (1 à 3 minutes)
      </div>
    )
  }
  return (
    <div className="mt-3">
      <video src={url!} controls className="rounded-xl border border-[#2a2a2a] max-h-96 w-full" />
      <a href={url!} download="scai-video.mp4" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#D4AF37] hover:underline">
        <Download className="w-3.5 h-3.5" /> Télécharger
      </a>
    </div>
  )
}
