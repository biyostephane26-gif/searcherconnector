'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  Check, Chrome, Github, Linkedin, Loader2, Mail, MessageCircle,
  Plug, Search, X,
} from 'lucide-react'

type ConnectorId = 'chrome' | 'gmail' | 'whatsapp' | 'linkedin' | 'github'

type StatusMap = Record<string, { connected: boolean; account: string | null }>

const CATALOG: {
  id: ConnectorId
  name: string
  description: string
  category: string
  placeholder?: string
  connectKind: 'oauth' | 'field' | 'chrome'
}[] = [
  {
    id: 'chrome',
    name: 'Navigateur Chrome',
    description: 'Pré-remplit les candidatures. Envoi autonome sur Greenhouse et Lever.',
    category: 'Candidatures',
    connectKind: 'chrome',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'SCAI lit les réponses recruteurs et envoie tes messages depuis Cowork.',
    category: 'Communication',
    connectKind: 'oauth',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Relances et réponses via wa.me, avec ton numéro dans Cowork.',
    category: 'Communication',
    placeholder: '+237 6XX XXX XXX',
    connectKind: 'field',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Profil pour autofill. Le clic d’envoi Easy Apply reste le tien.',
    category: 'Candidatures',
    placeholder: 'https://linkedin.com/in/…',
    connectKind: 'field',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Lien portfolio pour les formulaires et le scoring de profil.',
    category: 'Profil',
    placeholder: 'https://github.com/…',
    connectKind: 'field',
  },
]

const SOON = [
  { name: 'Google Calendar', description: 'Bloquer des créneaux d’entretien depuis SCAI.' },
  { name: 'Telegram', description: 'Alertes opportunités fraîches sur mobile.' },
  { name: 'Slack', description: 'Notifier un espace d’équipe quand SCAI trouve un match.' },
]

function Icon({ id }: { id: ConnectorId }) {
  const cls = 'w-5 h-5'
  if (id === 'gmail') return <Mail className={cls} />
  if (id === 'whatsapp') return <MessageCircle className={cls} />
  if (id === 'linkedin') return <Linkedin className={cls} />
  if (id === 'github') return <Github className={cls} />
  return <Chrome className={cls} />
}

export default function ConnectorsPanel() {
  const { user, profile, refreshProfile } = useAuth()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusMap>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [modal, setModal] = useState<ConnectorId | null>(null)
  const [fieldValue, setFieldValue] = useState('')
  const [chromeToken, setChromeToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const isPaid = profile?.role === 'founder' || ['pro', 'premium', 'starter', 'enterprise'].includes((profile as any)?.plan || '')

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const r = await fetch(`/api/cowork/connectors?userId=${user.id}`)
      const d = await r.json()
      setStatus({
        gmail: d.gmail,
        chrome: d.chrome,
        whatsapp: d.whatsapp,
        linkedin: d.linkedin,
        github: d.github,
      })
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    if (p.get('gmail') === 'connected') setFlash('Gmail connecté.')
    if (p.get('gmail') === 'error') setError('Connexion Gmail impossible. Vérifie GOOGLE_CLIENT_ID côté serveur.')
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return CATALOG
    return CATALOG.filter(c => `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(s))
  }, [q])

  const groups = useMemo(() => {
    const g: Record<string, typeof CATALOG> = {}
    filtered.forEach(c => {
      g[c.category] = g[c.category] || []
      g[c.category].push(c)
    })
    return g
  }, [filtered])

  const call = async (id: string, action: string, value?: string) => {
    if (!user) return
    setBusy(id)
    setError('')
    try {
      const r = await fetch('/api/cowork/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, id, action, value }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erreur')
      await load()
      await refreshProfile()
    } catch (e: any) {
      setError(e.message || 'Erreur')
    }
    setBusy(null)
  }

  const startConnect = async (c: typeof CATALOG[number]) => {
    if (!user) return
    setError('')
    if (c.id === 'gmail') {
      window.location.href = `/api/oauth/gmail/connect?userId=${user.id}`
      return
    }
    if (c.id === 'chrome') {
      if (!isPaid) {
        setError('L’extension Chrome est réservée aux plans Pro et Premium.')
        return
      }
      setBusy('chrome')
      try {
        const r = await fetch('/api/extension/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Impossible de créer le token')
        setChromeToken(d.token)
        setModal('chrome')
        await load()
      } catch (e: any) {
        setError(e.message)
      }
      setBusy(null)
      return
    }
    setFieldValue(status[c.id]?.account || '')
    setModal(c.id)
  }

  const submitField = async () => {
    if (!modal) return
    await call(modal, 'connect', fieldValue)
    if (!error) setModal(null)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 max-w-3xl mx-auto w-full">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#1A1500] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
          <Plug className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Connecteurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comme dans Claude : tu branches tes outils une fois, SCAI Cowork s’en sert ensuite — inbox, autofill, relances.
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Rechercher un connecteur"
          className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
        />
      </div>

      {flash && <p className="text-xs text-green-400 mb-4">{flash}</p>}
      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">{cat}</h2>
              <div className="border border-[#1A1A1A] rounded-2xl overflow-hidden divide-y divide-[#1A1A1A] bg-[#0D0D0D]">
                {items.map(c => {
                  const st = status[c.id]
                  const connected = !!st?.connected
                  return (
                    <div key={c.id} className="flex items-center gap-4 p-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                        connected ? 'bg-[#1A1500] border-[#D4AF37]/40 text-[#D4AF37]' : 'bg-[#111] border-[#2a2a2a] text-gray-400'
                      }`}>
                        <Icon id={c.id} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{c.name}</span>
                          {connected && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Connecté
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                        {connected && st?.account && (
                          <p className="text-[11px] text-gray-600 truncate mt-1">{st.account}</p>
                        )}
                      </div>
                      {connected ? (
                        <button
                          disabled={busy === c.id}
                          onClick={() => call(c.id, 'disconnect')}
                          className="text-xs text-gray-500 hover:text-red-400 px-3 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-red-900/50"
                        >
                          {busy === c.id ? '…' : 'Déconnecter'}
                        </button>
                      ) : (
                        <button
                          disabled={busy === c.id}
                          onClick={() => startConnect(c)}
                          className="text-xs font-bold text-black bg-[#D4AF37] hover:bg-[#e0bd4f] px-3 py-1.5 rounded-lg"
                        >
                          {busy === c.id ? '…' : 'Connecter'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Bientôt</h2>
            <div className="border border-[#1A1A1A] rounded-2xl overflow-hidden divide-y divide-[#1A1A1A] bg-[#0D0D0D] opacity-70">
              {SOON.filter(s => !q || `${s.name} ${s.description}`.toLowerCase().includes(q.toLowerCase())).map(s => (
                <div key={s.name} className="flex items-center gap-4 p-4">
                  <div className="w-11 h-11 rounded-xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center text-gray-600">
                    <Plug className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-300">{s.name}</span>
                    <p className="text-xs text-gray-600 mt-0.5">{s.description}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">À venir</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">
                {modal === 'chrome' ? 'Installer l’extension' : `Connecter ${CATALOG.find(c => c.id === modal)?.name}`}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            {modal === 'chrome' ? (
              <div className="space-y-3 text-xs text-gray-400">
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>chrome://extensions → Mode développeur</li>
                  <li>Charger le dossier <code className="text-[#D4AF37]">browser-extension/</code> (ou le zip depuis Paramètres)</li>
                  <li>Colle le token dans le popup de l’extension</li>
                </ol>
                {chromeToken && (
                  <code className="block bg-black border border-[#2a2a2a] rounded-lg px-3 py-2 text-[#D4AF37] break-all">{chromeToken}</code>
                )}
                <p>Sur Greenhouse/Lever, active « soumission autonome » dans le popup. Ailleurs, tu valides l’envoi toi-même.</p>
              </div>
            ) : (
              <>
                <input
                  value={fieldValue}
                  onChange={e => setFieldValue(e.target.value)}
                  placeholder={CATALOG.find(c => c.id === modal)?.placeholder}
                  className="w-full bg-black border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white"
                />
                <button onClick={submitField} className="w-full bg-[#D4AF37] text-black font-bold text-sm py-2 rounded-lg">
                  Enregistrer
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
