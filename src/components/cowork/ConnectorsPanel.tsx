'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, X, Check, Loader2, Lock, Settings2, Clock, ExternalLink, Copy, Plug, Plus, Globe2, Trash2 } from 'lucide-react'
import {
  CONNECTORS, CONNECTOR_CATEGORIES, customToDef,
  type ConnectorDef, type ConnectorState, type ConnectorCategory, type ConnectorStatus, type CustomConnector,
} from '../../lib/connectors/catalog'
import { authFetch } from '../../lib/authFetch'

const STATUS_UI: Record<ConnectorStatus, { label: string; cls: string }> = {
  connected:       { label: 'Connecté',              cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  available:       { label: 'Connecter',             cls: 'text-gray-300 bg-[#1A1A1A] border-[#2a2a2a]' },
  builtin:         { label: 'Intégré',                cls: 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30' },
  plan_required:   { label: 'Pro / Premium',          cls: 'text-gray-400 bg-[#111111] border-[#2a2a2a]' },
  config_required: { label: 'Configuration requise',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  soon:            { label: 'Bientôt',                cls: 'text-gray-500 bg-[#111111] border-[#2a2a2a]' },
}

function Tile({ def, size = 40 }: { def: ConnectorDef; size?: number }) {
  return (
    <div
      className="rounded-[14px] flex items-center justify-center font-bold shrink-0 select-none shadow-[0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-white/5"
      style={{ width: size, height: size, background: def.tile.bg, color: def.tile.fg, fontSize: size * (def.tile.label.length > 2 ? 0.3 : 0.4) }}
      aria-hidden
    >
      {def.tile.label}
    </div>
  )
}

export default function ConnectorsPanel({ onUseTool }: { onUseTool?: (toolId: string) => void }) {
  const [states, setStates] = useState<Record<string, ConnectorState>>({})
  const [custom, setCustom] = useState<CustomConnector[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ConnectorCategory | 'all' | 'connected'>('all')
  const [open, setOpen] = useState<ConnectorDef | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const applyStates = (list: ConnectorState[]) => setStates(Object.fromEntries(list.map(s => [s.id, s])))

  const load = () => {
    setLoading(true)
    authFetch('/api/connectors')
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Erreur de chargement')
        applyStates(d.states)
        setCustom(d.custom || [])
      })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const allDefs = useMemo(() => [...custom.map(customToDef), ...CONNECTORS], [custom])
  const connectedCount = Object.values(states).filter(s => s.status === 'connected').length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allDefs.filter(c => {
      if (category === 'connected' && states[c.id]?.status !== 'connected') return false
      if (category !== 'all' && category !== 'connected' && c.category !== category) return false
      if (!q) return true
      return `${c.name} ${c.description} ${c.capabilities.join(' ')}`.toLowerCase().includes(q)
    })
  }, [query, category, states, allDefs])

  const customVisible = visible.filter(c => c.kind === 'custom')
  const catalogVisible = visible.filter(c => c.kind !== 'custom')

  const grouped = useMemo(() => {
    return CONNECTOR_CATEGORIES
      .map(cat => ({ ...cat, items: catalogVisible.filter(c => c.category === cat.id) }))
      .filter(g => g.items.length > 0)
  }, [catalogVisible])

  return (
    <div>
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plug className="w-5 h-5 text-[#D4AF37]" /> Connecteurs
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Branche tes outils pour que SCAI travaille directement avec eux.
            {!loading && !loadError && <span className="text-gray-500"> · {connectedCount} connecté{connectedCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un connecteur…"
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/60"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" aria-label="Effacer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 flex items-center gap-1.5 bg-[#D4AF37] text-black font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#e0bd4f] transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Catégories */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {[{ id: 'all', label: 'Tous' }, { id: 'connected', label: 'Connectés' }, ...CONNECTOR_CATEGORIES].map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
              category === c.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#111111] text-gray-400 border-[#2a2a2a] hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">{loadError}</div>
      )}

      {visible.length === 0 && !loading && (
        <div className="text-center py-14 border border-dashed border-[#2a2a2a] rounded-2xl text-sm text-gray-500">
          Aucun connecteur ne correspond à « {query} ».
        </div>
      )}

      <div className="space-y-7">
        {customVisible.length > 0 && (
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Vos connecteurs personnalisés</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {customVisible.map(def => (
                <ConnectorCard key={def.id} def={def} state={states[def.id]} loading={loading} onOpen={() => setOpen(def)} />
              ))}
            </div>
          </section>
        )}

        {grouped.map(group => (
          <section key={group.id}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">{group.label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.items.map(def => (
                <ConnectorCard key={def.id} def={def} state={states[def.id]} loading={loading} onOpen={() => setOpen(def)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {open && (
        <ConnectorDialog
          def={open}
          state={states[open.id]}
          onClose={() => setOpen(null)}
          onStates={applyStates}
          onUseTool={onUseTool}
          onCustomRemoved={id => { setCustom(prev => prev.filter(c => c.id !== id)); setOpen(null) }}
        />
      )}

      {showAdd && (
        <AddConnectorDialog
          onClose={() => setShowAdd(false)}
          onAdded={(states, customList) => { applyStates(states); setCustom(customList); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

function ConnectorCard({
  def, state, loading, onOpen,
}: { def: ConnectorDef; state?: ConnectorState; loading: boolean; onOpen: () => void }) {
  const ui = STATUS_UI[state?.status || 'available']
  return (
    <button
      onClick={onOpen}
      className="text-left bg-[#111111] border border-[#1A1A1A] hover:border-[#2a2a2a] hover:bg-[#131313] rounded-2xl p-4 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <Tile def={def} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white truncate">{def.name}</span>
            {loading ? (
              <span className="w-16 h-5 rounded-full bg-[#1A1A1A] animate-pulse" />
            ) : (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap flex items-center gap-1 ${ui.cls}`}>
                {state?.status === 'connected' && <Check className="w-3 h-3" />}
                {state?.status === 'plan_required' && <Lock className="w-3 h-3" />}
                {state?.status === 'soon' && <Clock className="w-3 h-3" />}
                {ui.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{def.description}</p>
          {state?.account && <p className="text-[11px] text-gray-500 mt-1.5 truncate">{state.account}</p>}
        </div>
      </div>
    </button>
  )
}

function AddConnectorDialog({
  onClose, onAdded,
}: { onClose: () => void; onAdded: (states: ConnectorState[], custom: CustomConnector[]) => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async () => {
    if (!name.trim() || !url.trim()) return
    setBusy(true); setError(null)
    try {
      const r = await authFetch('/api/connectors', { method: 'POST', body: JSON.stringify({ action: 'add_custom', name, url }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Ajout impossible')
      onAdded(d.states, d.custom || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter un connecteur"
        className="w-full max-w-md bg-[#0D0D0D] border border-[#2a2a2a] rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-[#1A1A1A]">
          <div className="w-11 h-11 rounded-[14px] bg-[#1A1A1A] flex items-center justify-center text-[#D4AF37] shrink-0">
            <Globe2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white">Ajouter un site</h3>
            <p className="text-xs text-gray-500 mt-0.5">Une plateforme freelance non listée, l'ATS d'un client…</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white" aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Nom</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex : PigeonJobs"
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/60"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Adresse du site</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="pigeonjobs.com"
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/60"
            />
          </div>
          <p className="text-[11px] text-gray-500">
            Fonctionne via l'extension Chrome, dans ta propre session — aucun mot de passe n'est jamais transmis à SCAI.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 pt-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white">Annuler</button>
          <button
            onClick={submit}
            disabled={busy || !name.trim() || !url.trim()}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-[#D4AF37] text-black hover:bg-[#e0bd4f] disabled:opacity-50 flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

function ConnectorDialog({
  def, state, onClose, onStates, onUseTool, onCustomRemoved,
}: {
  def: ConnectorDef
  state?: ConnectorState
  onClose: () => void
  onStates: (s: ConnectorState[]) => void
  onUseTool?: (toolId: string) => void
  onCustomRemoved: (id: string) => void
}) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const status = state?.status || 'available'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const act = async (action: 'connect' | 'disconnect') => {
    setBusy(true); setError(null)
    try {
      const r = await authFetch('/api/connectors', { method: 'POST', body: JSON.stringify({ connectorId: def.id, action, value }) })
      const d = await r.json()
      if (d.redirect) { window.location.href = d.redirect; return }
      if (!r.ok) throw new Error(d.error || 'Action impossible')
      onStates(d.states)
      if (d.token) setToken(d.token)
      if (action === 'connect' && !d.token) onClose()
      if (action === 'disconnect') onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const removeCustom = async () => {
    setBusy(true); setError(null)
    try {
      const r = await authFetch('/api/connectors', { method: 'POST', body: JSON.stringify({ connectorId: def.id, action: 'remove_custom' }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Suppression impossible')
      onStates(d.states)
      onCustomRemoved(def.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const needsValue = def.kind === 'phone' || def.kind === 'profile'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={def.name}
        className="w-full max-w-lg bg-[#0D0D0D] border border-[#2a2a2a] rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-5 border-b border-[#1A1A1A]">
          <Tile def={def} size={52} />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white">{def.name}</h3>
            <span className={`inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_UI[status].cls}`}>
              {STATUS_UI[status].label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white" aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-300">{def.description}</p>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Ce que SCAI peut faire</p>
            <ul className="space-y-1.5">
              {def.capabilities.map(c => (
                <li key={c} className="text-sm text-gray-300 flex gap-2"><Check className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />{c}</li>
              ))}
            </ul>
          </div>

          {state?.account && (
            <div className="text-xs text-gray-400 bg-[#111111] border border-[#1A1A1A] rounded-lg px-3 py-2 break-all">
              {def.kind === 'custom' ? 'Site : ' : 'Compte : '}{state.account}
            </div>
          )}
          {state?.detail && <p className="text-xs text-gray-500">{state.detail}</p>}

          {token && (
            <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-xl p-3 space-y-2">
              <p className="text-xs text-gray-300">Colle ce jeton dans l'extension (icône Searcher Connector → champ jeton). Il ne sera plus affiché.</p>
              <div className="flex gap-2">
                <code className="flex-1 text-[11px] text-[#D4AF37] bg-black/40 rounded px-2 py-1.5 truncate">{token}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                  className="text-xs px-2.5 rounded bg-[#D4AF37] text-black font-bold flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <a href="/downloads/searcher-connector-extension.zip" download className="text-xs text-[#D4AF37] hover:underline inline-flex items-center gap-1">
                Télécharger l'extension <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {status === 'available' && needsValue && (
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && value.trim()) act('connect') }}
              placeholder={def.kind === 'phone' ? '+237 6XX XX XX XX' : def.profilePlaceholder}
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/60"
              autoFocus
            />
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 pt-0">
          {def.kind === 'custom' && (
            <button onClick={removeCustom} disabled={busy}
              className="mr-auto px-3 py-2 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Retirer
            </button>
          )}
          {status === 'connected' && def.kind !== 'custom' && (
            <button onClick={() => act('disconnect')} disabled={busy}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Déconnecter'}
            </button>
          )}
          {status === 'connected' && def.id === 'chrome' && !token && (
            <button onClick={() => act('connect')} disabled={busy}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white border border-[#2a2a2a] hover:bg-[#1A1A1A] disabled:opacity-50">
              Nouveau jeton
            </button>
          )}
          {status === 'available' && def.kind !== 'custom' && (
            <button onClick={() => act('connect')} disabled={busy || (needsValue && !value.trim())}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-[#D4AF37] text-black hover:bg-[#e0bd4f] disabled:opacity-50 flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {def.kind === 'oauth' ? `Se connecter avec ${def.name}` : 'Connecter'}
            </button>
          )}
          {status === 'builtin' && onUseTool && (
            <button onClick={() => { onUseTool(def.id); onClose() }}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-[#D4AF37] text-black hover:bg-[#e0bd4f]">
              Utiliser dans le chat
            </button>
          )}
          {status === 'plan_required' && (
            <a href="/pricing" className="px-5 py-2 rounded-xl text-sm font-bold bg-[#D4AF37] text-black hover:bg-[#e0bd4f]">Voir les plans</a>
          )}
          {status === 'config_required' && (
            <span className="text-xs text-gray-500 flex items-center gap-1.5"><Settings2 className="w-4 h-4" />À activer par l'administrateur</span>
          )}
        </div>
      </div>
    </div>
  )
}
