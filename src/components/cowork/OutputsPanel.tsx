'use client'

import { useEffect, useState } from 'react'
import { FileText, FileSpreadsheet, FileType2, ImageIcon, Video, Download, Trash2, Loader2, ExternalLink, AlertTriangle, FolderKanban } from 'lucide-react'
import { authFetch } from '../../lib/authFetch'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

type Output = {
  id: string
  kind: 'pdf' | 'xlsx' | 'docx' | 'image' | 'video'
  title: string
  file_url: string | null
  status: 'processing' | 'ready' | 'failed'
  meta: { job?: string; provider?: string }
  project_id: string | null
  created_at: string
}

type Project = { id: string; name: string }

const KIND_ICON: Record<Output['kind'], JSX.Element> = {
  pdf: <FileText className="w-5 h-5 text-red-400" />,
  xlsx: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
  docx: <FileType2 className="w-5 h-5 text-blue-400" />,
  image: <ImageIcon className="w-5 h-5 text-[#D4AF37]" />,
  video: <Video className="w-5 h-5 text-purple-400" />,
}

export default function OutputsPanel({ projectId }: { projectId?: string } = {}) {
  const [outputs, setOutputs] = useState<Output[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)

  const load = () => {
    const url = projectId ? `/api/cowork/outputs?project_id=${projectId}` : '/api/cowork/outputs'
    authFetch(url)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Erreur de chargement')
        setOutputs(d.outputs || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // Liste des projets pour la bascule d'assignation — inutile de bloquer
    // l'affichage des sorties dessus, donc pas de gestion d'erreur ici.
    if (!projectId) {
      authFetch('/api/cowork/projects').then(async r => {
        const d = await r.json()
        if (r.ok) setProjects((d.projects || []).map((p: any) => ({ id: p.id, name: p.name })))
      }).catch(() => {})
    }
    load()
    // Rafraîchit tant qu'au moins une vidéo est en cours de génération —
    // le statut passe à 'ready'/'failed' côté serveur au prochain sondage
    // du job (voir /api/tools/video), on relit juste la liste ici.
    const interval = setInterval(() => {
      setOutputs(prev => {
        if (prev.some(o => o.status === 'processing')) load()
        return prev
      })
    }, 8000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const remove = async (id: string) => {
    setOutputs(prev => prev.filter(o => o.id !== id))
    try { await authFetch(`/api/cowork/outputs?id=${id}`, { method: 'DELETE' }) } catch { /* déjà retiré côté UI */ }
  }

  const assign = async (id: string, newProjectId: string) => {
    setOutputs(prev => prev.map(o => o.id === id ? { ...o, project_id: newProjectId || null } : o))
    setAssigning(null)
    try {
      await authFetch('/api/cowork/outputs', {
        method: 'PATCH',
        body: JSON.stringify({ id, project_id: newProjectId || null }),
      })
    } catch { /* déjà mis à jour côté UI, retentera au prochain chargement */ }
  }

  const downloadVideo = async (job: string, title: string) => {
    try {
      const res = await authFetch(`/api/tools/video?job=${encodeURIComponent(job)}&download=1`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${title || 'scai-video'}.mp4`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      alert('Vidéo introuvable — le lien a peut-être expiré côté fournisseur.')
    }
  }

  if (loading) {
    return <div className="text-center py-14 text-sm text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des sorties…</div>
  }
  if (error) {
    return <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-4">{error}</p>
  }
  if (outputs.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
        <FileText className="w-9 h-9 text-gray-700 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Aucune sortie pour l'instant.</p>
        <p className="text-xs text-gray-600 mt-1">Les documents, images et vidéos générés par SCAI apparaîtront ici.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500 mb-3">
        Sorties <span className="text-gray-600">{outputs.length}</span>
      </p>
      {outputs.map(o => (
        <div key={o.id} className="flex items-center gap-3 bg-[#111111] border border-gray-800 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] flex items-center justify-center shrink-0">
            {o.status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : KIND_ICON[o.kind]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white truncate">{o.title}</p>
            <p className="text-[11px] text-gray-500">
              {o.status === 'processing' ? 'Génération en cours…' : o.status === 'failed' ? 'Échec' : (o.meta?.provider || o.kind.toUpperCase())}
              {' · '}{formatDistanceToNow(new Date(o.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
          {o.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
          {o.status === 'ready' && o.file_url && (
            <a href={o.file_url} target="_blank" rel="noreferrer" download className="p-2 text-gray-400 hover:text-[#D4AF37] transition-colors shrink-0" title="Télécharger">
              <Download className="w-4 h-4" />
            </a>
          )}
          {o.status === 'ready' && !o.file_url && o.kind === 'video' && o.meta?.job && (
            <button onClick={() => downloadVideo(o.meta!.job!, o.title)} className="p-2 text-gray-400 hover:text-[#D4AF37] transition-colors shrink-0" title="Télécharger">
              <Download className="w-4 h-4" />
            </button>
          )}
          {o.kind === 'image' && o.file_url && (
            <a href={o.file_url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-[#D4AF37] transition-colors shrink-0" title="Ouvrir">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {!projectId && projects.length > 0 && (
            <div className="relative shrink-0">
              <button
                onClick={() => setAssigning(prev => prev === o.id ? null : o.id)}
                className={`p-2 transition-colors ${o.project_id ? 'text-[#D4AF37]' : 'text-gray-600 hover:text-white'}`}
                title={o.project_id ? projects.find(p => p.id === o.project_id)?.name || 'Assigné' : 'Assigner à un projet'}
              >
                <FolderKanban className="w-4 h-4" />
              </button>
              {assigning === o.id && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-[#1A1A1A] border border-gray-700 rounded-lg shadow-xl py-1 w-48 max-h-48 overflow-y-auto">
                  <button onClick={() => assign(o.id, '')} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-[#252525]">Aucun projet</button>
                  {projects.map(p => (
                    <button key={p.id} onClick={() => assign(o.id, p.id)} className={`w-full text-left px-3 py-1.5 text-xs truncate hover:bg-[#252525] ${o.project_id === p.id ? 'text-[#D4AF37]' : 'text-gray-200'}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={() => remove(o.id)} className="p-2 text-gray-600 hover:text-red-400 transition-colors shrink-0" title="Retirer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
