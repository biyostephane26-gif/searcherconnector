'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Home, Briefcase, Users, MessageSquare, DollarSign, User, Settings, Sparkles, Shield, BookOpen, PlusCircle, Building2, Mic, X } from 'lucide-react'
import { useMobileSidebar, closeMobileSidebar, openMobileSidebar } from '../../hooks/useMobileSidebar'
import { computeProfileCompletion } from '../../lib/profileCompletion'

// Fonction pour calculer le niveau professionnel
const getProfessionalLevel = (missionsCount: number = 0) => {
  if (missionsCount >= 25) return { label: 'Expert', color: 'text-purple-400 bg-purple-900/30' }
  if (missionsCount >= 10) return { label: 'Senior', color: 'text-blue-400 bg-blue-900/30' }
  if (missionsCount >= 3) return { label: 'Mid', color: 'text-green-400 bg-green-900/30' }
  return { label: 'Junior', color: 'text-yellow-400 bg-yellow-900/30' }
}

// Fonction pour obtenir la progression vers le niveau suivant
const getNextLevelProgress = (missionsCount: number = 0) => {
  if (missionsCount >= 25) return { current: missionsCount, next: null, remaining: 0, label: 'Niveau maximum atteint' }
  if (missionsCount >= 10) return { current: missionsCount, next: 25, remaining: 25 - missionsCount, label: `Tu es à ${25 - missionsCount} missions de passer Expert` }
  if (missionsCount >= 3) return { current: missionsCount, next: 10, remaining: 10 - missionsCount, label: `Tu es à ${10 - missionsCount} missions de passer Senior` }
  return { current: missionsCount, next: 3, remaining: 3 - missionsCount, label: `Tu es à ${3 - missionsCount} missions de passer Mid` }
}

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, user } = useAuth()
  const level = getProfessionalLevel(profile?.missions_completed || 0)
  const nextProgress = getNextLevelProgress(profile?.missions_completed || 0)

  // voice_credits n'existe pas sur le profil — vit dans user_voice_credits.
  // Affichait toujours "0 crédits" sur toutes les pages avant ce correctif.
  const [voiceCredits, setVoiceCredits] = useState(0)
  useEffect(() => {
    if (!user) return
    supabase.from('user_voice_credits').select('credits_remaining').eq('user_id', user.id).single()
      .then(({ data }) => setVoiceCredits(data?.credits_remaining || 0))
  }, [user])

  // Complétion calculée EN DIRECT depuis les vrais champs (jamais une
  // valeur figée en base) — voir src/lib/profileCompletion.ts pour le
  // pourquoi (Sidebar affichait un vieux % gelé depuis l'onboarding,
  // désynchronisé de la réalité dès que l'utilisateur complétait son
  // profil plus tard).
  const [hasDocs, setHasDocs] = useState(false)
  useEffect(() => {
    if (!user) return
    supabase.from('uploaded_documents').select('id').eq('user_id', user.id).limit(1)
      .then(({ data }) => setHasDocs(!!(data && data.length > 0)))
  }, [user])
  const { percent: profileCompletionPercent } = computeProfileCompletion(profile, hasDocs)

  const menuItems = [
    { icon: <Home className="w-5 h-5" />, label: 'Accueil', path: '/dashboard' },
    { icon: (
        <img src="/scai-icon.png" alt="SCAI" className="w-5 h-5 rounded object-contain"
          onError={e => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { textContent: '⚡', className: 'text-sm' })) }}
        />
      ), label: 'Agent Searcher', path: '/agent', badge: 'LIVE' },
    { icon: <Briefcase className="w-5 h-5" />, label: 'Opportunités', path: '/opportunities' },
    { icon: <PlusCircle className="w-5 h-5" />, label: 'Opportunity Creator', path: '/opportunity-creator' },
    { icon: <Building2 className="w-5 h-5" />, label: 'Cowork', path: '/cowork' },
    { icon: <Sparkles className="w-5 h-5 text-[#D4AF37]" />, label: 'Entretiens', path: '/interview-preps' },
    { icon: <Users className="w-5 h-5" />, label: 'Social', path: '/social' },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Articles', path: '/articles' },
    { icon: <Shield className="w-5 h-5" />, label: 'Communautés', path: '/groups' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Messages', path: '/messages' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Salaires', path: '/salary' },
    { icon: <User className="w-5 h-5" />, label: 'Profil', path: '/profile' },
    { icon: <Settings className="w-5 h-5" />, label: 'Paramètres', path: '/settings' },
  ]

  if (profile?.role === 'founder') {
    menuItems.push({ icon: <Shield className="w-5 h-5" />, label: 'Founder', path: '/founder' })
    menuItems.push({ icon: <span className="text-lg">🧪</span>, label: 'Test Panel', path: '/test-panel' })
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

  return (
    <>
      {/* Fond sombre cliquable — mobile uniquement, quand le tiroir est ouvert */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      <aside className={`flex flex-col w-64 bg-[#0D0D0D] border-r border-[#1A1A1A] h-screen fixed top-0 left-0 overflow-y-auto z-50
        transition-transform duration-300 ease-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <button
        onClick={closeMobileSidebar}
        className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-white"
        aria-label="Fermer le menu"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="p-6">
        <div className="flex flex-col items-center text-center mb-8">
          {/* Avatar sans bordure qui coupe */}
          <div className="w-24 h-24 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#D4AF37] text-3xl font-bold mb-4 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0) || 'U'
            )}
          </div>
          <h3 className="font-bold text-white mb-1 truncate w-full px-2">{profile?.full_name}</h3>
          
          {/* Badge de statut - remplacé par div pour afficher le vrai statut */}
          <div className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded ${
            profile?.verification_status === 'genius' 
              ? 'border-2 border-[#D4AF37] text-[#D4AF37] bg-[#1A1500] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
              : profile?.verification_status === 'verified'
              ? 'border border-[#D4AF37] text-[#D4AF37] bg-[#1A1500]'
              : profile?.verification_status === 'refused'
              ? 'border border-red-800 text-red-400 bg-red-950'
              : 'border border-gray-600 text-gray-400 bg-gray-900'
          }`}>
            {profile?.verification_status === 'genius' ? 'GENIUS' 
              : profile?.verification_status === 'verified' ? 'VERIFIED'
              : profile?.verification_status === 'refused' ? 'REFUSED'
              : 'PENDING'}
          </div>
          
          {/* Badge Niveau Professionnel */}
          <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${level.color}`}>
            {level.label}
          </div>
          
          {/* Progression Niveau */}
          <div className="mt-4 w-full space-y-2">
            <p className="text-[10px] text-gray-500">{nextProgress.label}</p>
            {nextProgress.next && (
              <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#D4AF37] transition-all duration-500"
                  style={{ width: `${(nextProgress.current / nextProgress.next) * 100}%` }}
                />
              </div>
            )}
          </div>
          
          <div className="mt-6 w-full space-y-1">
            <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
              <span>Profile Completion</span>
              <span>{profileCompletionPercent}%</span>
            </div>
            <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  profileCompletionPercent >= 80 ? 'bg-green-500' :
                  profileCompletionPercent >= 50 ? 'bg-[#D4AF37]' : 'bg-red-500'
                }`}
                style={{ width: `${profileCompletionPercent}%` }}
              />
            </div>
            {profileCompletionPercent < 80 && (
              <Link href="/settings" className="block text-[9px] text-[#D4AF37] hover:underline mt-1 text-center">
                Compléter mon profil →
              </Link>
            )}
          </div>

          {/* Crédits Vocaux SCAI Voice */}
          {profile?.plan !== 'free' && (
            <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#D4AF37]/20">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  SCAI Voice
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">
                  {voiceCredits}
                </span>
                <span className="text-xs text-gray-500">crédits</span>
              </div>
              <p className="text-[9px] text-gray-600 mt-1">
                {profile?.plan === 'pro' ? '300/mois' : '60/mois'}
              </p>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={closeMobileSidebar}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-[#1A1500] text-[#D4AF37] border border-[#D4AF37]/20' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#111111]'
                  }
                `}
              >
                {item.icon}
                <span className="flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green-400">
                      {item.badge}
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
      </aside>
    </>
  )
}
