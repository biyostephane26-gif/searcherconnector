'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, User, Briefcase, Users, BookOpen, LayoutGrid, Wrench, Settings, Loader2, CornerDownLeft } from 'lucide-react'
import { CONNECTORS } from '../../lib/connectors/catalog'
import { authFetch } from '../../lib/authFetch'

type Item = {
  key: string
  group: string
  label: string
  hint?: string
  href: string
  icon: JSX.Element
  keywords?: string
}

const PAGES: Omit<Item, 'group' | 'icon'>[] = [
  { key: 'p-dashboard', label: 'Accueil', href: '/dashboard', keywords: 'dashboard tableau de bord scan' },
  { key: 'p-agent', label: 'SCAI Cowork', href: '/agent', keywords: 'agent chat ia assistant scai' },
  { key: 'p-opps', label: 'Opportunités', href: '/opportunities', keywords: 'offres missions jobs freelance' },
  { key: 'p-apps', label: 'Candidatures', href: '/applications', keywords: 'suivi postuler envoyées' },
  { key: 'p-creator', label: 'Opportunity Creator', href: '/opportunity-creator', keywords: 'créer publier offre' },
  { key: 'p-inbox', label: 'Inbox', href: '/cowork', keywords: 'emails whatsapp messages recruteurs cowork' },
  { key: 'p-interviews', label: 'Entretiens', href: '/interview-preps', keywords: 'préparation simulation interview' },
  { key: 'p-social', label: 'Social', href: '/social', keywords: 'fil posts réseau stories' },
  { key: 'p-articles', label: 'Articles', href: '/articles', keywords: 'blog écrire publier' },
  { key: 'p-groups', label: 'Communautés', href: '/groups', keywords: 'groupes' },
  { key: 'p-messages', label: 'Messages', href: '/messages', keywords: 'discussion conversation' },
  { key: 'p-salary', label: 'Salaires', href: '/salary', keywords: 'rémunération tarifs taux' },
  { key: 'p-profile', label: 'Profil', href: '/profile', keywords: 'compte cv portfolio' },
  { key: 'p-referrals', label: 'Parrainage', href: '/referrals', keywords: 'inviter amis code' },
  { key: 'p-pricing', label: 'Tarifs', href: '/pricing', keywords: 'plans abonnement pro premium payer' },
  { key: 'p-guide', label: 'Guide', href: '/guide', keywords: 'aide tutoriel comment' },
  { key: 'p-support', label: 'Support', href: '/support', keywords: 'aide contact problème' },
]

export const SETTINGS_SECTIONS: { id: string; label: string; keywords: string }[] = [
  { id: 'profil',     label: 'Profil',                    keywords: 'nom bio domaine compétences pays ville portfolio github linkedin whatsapp modèle réponse' },
  { id: 'apparence',  label: 'Apparence',                 keywords: 'thème mode sombre clair couleur turquoise or' },
  { id: 'langue',     label: 'Langue',                    keywords: 'langue language traduction français anglais' },
  { id: 'niveau',     label: 'Niveau de compétence',      keywords: 'niveau évaluation compétence junior senior' },
  { id: 'scai',       label: 'SCAI & IA',                 keywords: 'apprentissage ia intelligence scai' },
  { id: 'cowork',     label: 'SCAI Cowork',               keywords: 'agent cowork automatisation scan' },
  { id: 'extension',  label: 'Extension navigateur',      keywords: 'chrome extension jeton token remplissage ats' },
  { id: 'securite',   label: 'Sécurité',                  keywords: 'mot de passe sécurité connexion' },
  { id: 'feedback',   label: 'Feedback',                  keywords: 'avis retour suggestion' },
  { id: 'danger',     label: 'Zone dangereuse',           keywords: 'supprimer compte déconnexion' },
]

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [q, setQ] = useState('')
  const [remote, setRemote] = useState<{ people: any[]; opportunities: any[]; groups: any[]; articles: any[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!open) return
    setQ(''); setRemote(null); setActive(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  // Recherche en base, avec anti-rebond
  useEffect(() => {
    const term = q.trim()
    if (!open || term.length < 2) { setRemote(null); setLoading(false); return }
    setLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const r = await authFetch(`/api/global-search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        if (r.ok) setRemote(await r.json())
      } catch { /* annulée ou hors ligne */ }
      setLoading(false)
    }, 220)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, open])

  const items = useMemo<Item[]>(() => {
    const term = norm(q.trim())
    const match = (text: string) => !term || norm(text).includes(term)
    const out: Item[] = []

    PAGES.filter(p => match(`${p.label} ${p.keywords}`)).slice(0, term ? 5 : 6)
      .forEach(p => out.push({ ...p, group: 'Pages', icon: <LayoutGrid className="w-4 h-4" /> }))

    CONNECTORS.filter(c => match(`${c.name} ${c.description} outil connecteur`)).slice(0, term ? 5 : 4)
      .forEach(c => out.push({
        key: `c-${c.id}`, group: 'Outils & connecteurs', label: c.name,
        hint: c.kind === 'tool' ? 'Outil SCAI' : 'Connecteur', href: '/agent?tab=connectors', icon: <Wrench className="w-4 h-4" />,
      }))

    if (term) {
      SETTINGS_SECTIONS.filter(s => match(`${s.label} ${s.keywords} paramètres réglages`)).slice(0, 4)
        .forEach(s => out.push({
          key: `s-${s.id}`, group: 'Paramètres', label: s.label, hint: 'Paramètres',
          href: `/settings?q=${encodeURIComponent(q.trim())}#${s.id}`, icon: <Settings className="w-4 h-4" />,
        }))
    }

    remote?.people.forEach(p => out.push({
      key: `u-${p.id}`, group: 'Personnes', label: p.full_name || 'Membre',
      hint: [p.domain, p.country].filter(Boolean).join(' · '), href: `/messages?user=${p.id}`, icon: <User className="w-4 h-4" />,
    }))
    remote?.opportunities.forEach(o => out.push({
      key: `o-${o.id}`, group: 'Mes opportunités', label: o.title,
      hint: [o.company, o.source_platform].filter(Boolean).join(' · '), href: `/opportunities?focus=${o.id}`, icon: <Briefcase className="w-4 h-4" />,
    }))
    remote?.groups.forEach(g => out.push({
      key: `g-${g.id}`, group: 'Communautés', label: g.name,
      hint: `${g.members_count || 0} membre(s)`, href: `/groups/${g.id}`, icon: <Users className="w-4 h-4" />,
    }))
    remote?.articles.forEach(a => out.push({
      key: `a-${a.id}`, group: 'Articles', label: a.title, href: '/articles', icon: <BookOpen className="w-4 h-4" />,
    }))
    return out
  }, [q, remote])

  useEffect(() => { setActive(0) }, [q, remote])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (item?: Item) => {
    if (!item) return
    onClose()
    router.push(item.href)
  }

  if (!open) return null

  let lastGroup = ''
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        className="w-full max-w-xl bg-[#0D0D0D] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-[#1A1A1A]">
          <Search className="w-5 h-5 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(items.length - 1, i + 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
              if (e.key === 'Enter') { e.preventDefault(); go(items[active]) }
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Rechercher une personne, une offre, un outil, un réglage…"
            className="flex-1 bg-transparent py-4 text-sm text-white placeholder-gray-500 focus:outline-none"
            aria-label="Rechercher"
          />
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> : (
            <button onClick={onClose} className="text-gray-500 hover:text-white" aria-label="Fermer"><X className="w-4 h-4" /></button>
          )}
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-10">
              {loading ? 'Recherche…' : `Aucun résultat pour « ${q} »`}
            </p>
          )}
          {items.map((item, idx) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            return (
              <div key={item.key}>
                {header && <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{header}</p>}
                <button
                  data-idx={idx}
                  onMouseMove={() => setActive(idx)}
                  onClick={() => go(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${idx === active ? 'bg-[#1A1A1A]' : ''}`}
                >
                  <span className="w-8 h-8 rounded-lg bg-[#111111] border border-[#1A1A1A] flex items-center justify-center text-[#D4AF37] shrink-0">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white truncate">{item.label}</span>
                    {item.hint && <span className="block text-[11px] text-gray-500 truncate">{item.hint}</span>}
                  </span>
                  {idx === active && <CornerDownLeft className="w-3.5 h-3.5 text-gray-500" />}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-[#1A1A1A] text-[10px] text-gray-500">
          <span>↑↓ naviguer · Entrée ouvrir · Échap fermer</span>
          <span>Ctrl + K</span>
        </div>
      </div>
    </div>
  )
}
