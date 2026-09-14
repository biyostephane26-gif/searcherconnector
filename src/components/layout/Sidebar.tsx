'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Home, Briefcase, Users, MessageSquare, DollarSign, User, Settings, Sparkles, Shield, BookOpen,
  PlusCircle, Inbox, Mic, X, Plus, Plug, ClipboardList, ChevronsUpDown, Globe, HelpCircle,
  MessageCircleHeart, CreditCard, Download, LogOut, BookMarked, Gauge, Receipt,
} from 'lucide-react'
import { useMobileSidebar, closeMobileSidebar, openMobileSidebar } from '../../hooks/useMobileSidebar'
import { computeProfileCompletion } from '../../lib/profileCompletion'
import { useTranslation } from 'react-i18next'
import { getCareerLevel, getNextLevelProgress } from '../../lib/careerLevel'
import { SearchButton } from '../search/SearchLauncher'

type NavItem = { icon: JSX.Element; label: string; path: string; badge?: string }

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', premium: 'Premium', starter: 'Pro', enterprise: 'Premium' }

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const { profile, user, signOut } = useAuth() as any
  const level = getCareerLevel(profile?.missions_completed || 0, profile?.verification_status)
  const nextProgress = getNextLevelProgress(profile?.missions_completed || 0, profile?.verification_status)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // voice_credits vit dans user_voice_credits (pas sur le profil).
  const [voiceCredits, setVoiceCredits] = useState(0)
  useEffect(() => {
    if (!user) return
    supabase.from('user_voice_credits').select('credits_remaining').eq('user_id', user.id).single()
      .then(({ data }) => setVoiceCredits(data?.credits_remaining || 0))
  }, [user])

  // Complétion calculée en direct depuis les vrais champs (src/lib/profileCompletion.ts).
  const [hasDocs, setHasDocs] = useState(false)
  useEffect(() => {
    if (!user) return
    supabase.from('uploaded_documents').select('id').eq('user_id', user.id).limit(1)
      .then(({ data }) => setHasDocs(!!(data && data.length > 0)))
  }, [user])
  const { percent: profileCompletionPercent } = computeProfileCompletion(profile, hasDocs)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const groups: { title?: string; items: NavItem[] }[] = [
    {
      items: [
        { icon: <Home className="w-4 h-4" />, label: t('nav.home'), path: '/dashboard' },
        { icon: <Sparkles className="w-4 h-4" />, label: t('nav.agent'), path: '/agent', badge: 'LIVE' },
        { icon: <Briefcase className="w-4 h-4" />, label: t('nav.opportunities'), path: '/opportunities' },
        { icon: <ClipboardList className="w-4 h-4" />, label: 'Candidatures', path: '/applications' },
        { icon: <Inbox className="w-4 h-4" />, label: t('nav.cowork'), path: '/cowork' },
        { icon: <MessageSquare className="w-4 h-4" />, label: t('nav.messages'), path: '/messages' },
      ],
    },
    {
      title: 'Réseau',
      items: [
        { icon: <Shield className="w-4 h-4" />, label: t('nav.groups'), path: '/groups' },
        { icon: <BookOpen className="w-4 h-4" />, label: t('nav.articles'), path: '/articles' },
      ],
    },
    {
      title: 'Outils',
      items: [
        { icon: <Plug className="w-4 h-4" />, label: 'Connecteurs', path: '/connectors' },
        { icon: <PlusCircle className="w-4 h-4" />, label: t('nav.opportunityCreator'), path: '/opportunity-creator' },
        { icon: <BookMarked className="w-4 h-4" />, label: t('nav.interviews'), path: '/interview-preps' },
        { icon: <Receipt className="w-4 h-4" />, label: 'Transactions & Rapports', path: '/transactions' },
      ],
    },
  ]
  if (profile?.role === 'founder') {
    groups.push({
      title: 'Fondateur',
      items: [
        { icon: <Shield className="w-4 h-4" />, label: 'Founder', path: '/founder' },
        { icon: <Gauge className="w-4 h-4" />, label: 'Test Panel', path: '/test-panel' },
      ],
    })
  }

  const isMobileOpen = useMobileSidebar()

  // Tirer l'écran depuis le bord gauche pour ouvrir le tiroir (mobile).
  useEffect(() => {
    let startX = 0, startY = 0, tracking = false
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t.clientX < 24) { startX = t.clientX; startY = t.clientY; tracking = true }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return
      const t = e.touches[0]
      const dx = t.clientX - startX, dy = Math.abs(t.clientY - startY)
      if (dx > 40 && dy < 40) { openMobileSidebar(); tracking = false }
    }
    const onTouchEnd = () => { tracking = false }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const go = (path: string) => { setMenuOpen(false); closeMobileSidebar(); router.push(path) }
  const planLabel = profile?.role === 'founder' ? 'Fondateur' : PLAN_LABEL[profile?.plan || 'free'] || 'Free'
  const initials = (profile?.full_name || user?.email || 'U').split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={closeMobileSidebar} />
      )}
      <aside className={`flex flex-col w-64 bg-[#0D0D0D] border-r border-[#1A1A1A] h-screen fixed top-0 left-0 z-50
        transition-transform duration-300 ease-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

        <div className="flex items-center justify-between px-4 h-14 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={closeMobileSidebar}>
            <img src="/searcher-icon.png" alt="" className="w-7 h-7 rounded-lg object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <span className="text-[#D4AF37] font-bold tracking-tighter text-lg">SEARCHER</span>
          </Link>
          <button onClick={closeMobileSidebar} className="lg:hidden p-1.5 text-gray-500 hover:text-white" aria-label="Fermer le menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 space-y-2 shrink-0">
          <button
            onClick={() => go('/agent?new=1')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-[#1A1A1A] hover:bg-[#2A2A2A] transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau
          </button>
          <SearchButton />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.title && <p className="px-3 pb-1 text-[11px] font-medium text-gray-500">{group.title}</p>}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive = pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={closeMobileSidebar}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-[#1A1A1A] text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#111]'
                      }`}
                    >
                      <span className={isActive ? 'text-[#D4AF37]' : ''}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green-400">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Compte — menu façon Claude */}
        <div ref={menuRef} className="relative p-3 border-t border-[#1A1A1A] shrink-0">
          {menuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#0D0D0D] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden z-10">
              <div className="p-3 border-b border-[#1A1A1A] space-y-2">
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${level.color}`}>{level.label}</span>
                  {profile?.verification_status === 'verified' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#D4AF37]/30 text-[#D4AF37]">Vérifié</span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1A1A1A] text-gray-400">{planLabel}</span>
                </div>
                <p className="text-[10px] text-gray-500">{nextProgress.label}</p>
                {nextProgress.next && (
                  <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4AF37]" style={{ width: `${Math.min(100, (nextProgress.current / nextProgress.next) * 100)}%` }} />
                  </div>
                )}
                <button onClick={() => go('/settings#profil')} className="w-full flex justify-between text-[10px] text-gray-500 hover:text-white">
                  <span>Profil complété</span>
                  <span className={profileCompletionPercent >= 80 ? 'text-green-400' : 'text-[#D4AF37]'}>{profileCompletionPercent}%</span>
                </button>
                {profile?.plan && profile.plan !== 'free' && (
                  <p className="flex items-center gap-1.5 text-[10px] text-gray-500"><Mic className="w-3 h-3" /> {voiceCredits} crédits SCAI Voice</p>
                )}
              </div>
              <div className="p-1.5">
                {[
                  { icon: <Settings className="w-4 h-4" />, label: 'Paramètres', hint: 'Ctrl ,', path: '/settings' },
                  { icon: <User className="w-4 h-4" />, label: 'Mon profil', path: '/profile' },
                  { icon: <Globe className="w-4 h-4" />, label: 'Langue', path: '/settings#langue' },
                  { icon: <HelpCircle className="w-4 h-4" />, label: 'Obtenir de l\'aide', path: '/support' },
                  { icon: <MessageCircleHeart className="w-4 h-4" />, label: 'Donner un avis', path: '/settings#feedback' },
                ].map(i => (
                  <button key={i.label} onClick={() => go(i.path)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1A1A1A] hover:text-white">
                    {i.icon}<span className="flex-1 text-left">{i.label}</span>{i.hint && <span className="text-[10px] text-gray-500">{i.hint}</span>}
                  </button>
                ))}
                <div className="h-px bg-[#1A1A1A] my-1" />
                <button onClick={() => go('/pricing')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1A1A1A] hover:text-white">
                  <CreditCard className="w-4 h-4" /> Voir tous les forfaits
                </button>
                <a href="/downloads/searcher-connector-extension.zip" download onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1A1A1A] hover:text-white">
                  <Download className="w-4 h-4" /> Obtenir l'extension Chrome
                </a>
                <button onClick={() => go('/guide')} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1A1A1A] hover:text-white">
                  <BookOpen className="w-4 h-4" /> Guide d'utilisation
                </button>
                <div className="h-px bg-[#1A1A1A] my-1" />
                <button
                  onClick={async () => { setMenuOpen(false); await signOut?.() }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1A1A1A] hover:text-white"
                >
                  <LogOut className="w-4 h-4" /> Se déconnecter
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#111] transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[11px] font-bold text-[#D4AF37] overflow-hidden shrink-0">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-semibold text-white truncate">{profile?.full_name || 'Mon compte'}</span>
              <span className="block text-[11px] text-gray-500 truncate">{planLabel} · {level.label}</span>
            </span>
            <ChevronsUpDown className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </aside>
    </>
  )
}
