'use client'

import { useEffect, useState } from 'react'
import { FolderKanban, Plus, Trash2, Loader2, ChevronLeft, FileText } from 'lucide-react'
import { authFetch } from '../../lib/authFetch'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import OutputsPanel from './OutputsPanel'

type Project = {
  id: string
  name: string
  description: string | null
  output_count: number
  created_at: string
}

export default function ProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openProject, setOpenProject] = useState<Project | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    authFetch('/api/cowork/projects')
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Erreur de chargement')
        setProjects(d.projects || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const res = await authFetch('/api/cowork/projects', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed, description: description.trim() || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setProjects(prev => [d.project, ...prev])
      setName(''); setDescription(''); setShowForm(false)
    } catch (e: any) {
      alert(e.message || 'Impossible de créer le projet.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (openProject?.id === id) setOpenProject(null)
    try { await authFetch(`/api/cowork/projects?id=${id}`, { method: 'DELETE' }) } catch { /* déjà retiré côté UI */ }
  }

  if (openProject) {
    return (
      <div className="space-y-4">
        <button onClick={() => setOpenProject(null)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={14} /> Tous les projets
        </button>
        <div>
          <p className="font-syne font-bold text-lg text-white flex items-center gap-2"><FolderKanban size={18} className="text-[#D4AF37]" /> {openProject.name}</p>
          {openProject.description && <p className="text-sm text-gray-400 mt-1">{openProject.description}</p>}
        </div>
        <OutputsPanel projectId={openProject.id} />
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-14 text-sm text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des projets…</div>
  }
  if (error) {
    return <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-4">{error}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500">
          Projets <span className="text-gray-600">{projects.length}</span>
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:text-[#B8962D] transition-colors"
        >
          <Plus size={14} /> Nouveau projet
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-4 space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom du projet (ex : Recherche mission Data Analyst Berlin)"
            className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]"
            maxLength={100}
            autoFocus
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optionnel) — objectif, cible, contexte…"
            rows={2}
            className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] resize-none"
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5">Annuler</button>
            <button
              onClick={create}
              disabled={!name.trim() || saving}
              className="text-xs font-bold bg-[#D4AF37] text-black px-3.5 py-1.5 rounded-lg hover:bg-[#B8962D] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <Loader2 size={12} className="animate-spin" />} Créer
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
          <FolderKanban className="w-9 h-9 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aucun projet pour l'instant.</p>
          <p className="text-xs text-gray-600 mt-1">Regroupe tes candidatures, CV et documents par objectif de recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => setOpenProject(p)}
              className="bg-[#111111] border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-[#D4AF37]/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white flex items-center gap-2 min-w-0">
                  <FolderKanban size={15} className="text-[#D4AF37] shrink-0" />
                  <span className="truncate">{p.name}</span>
                </p>
                <button
                  onClick={e => { e.stopPropagation(); remove(p.id) }}
                  className="p-1 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Supprimer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {p.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-3">
                <FileText size={12} /> {p.output_count} sortie{p.output_count > 1 ? 's' : ''}
                <span className="text-gray-700">·</span>
                {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: fr })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
