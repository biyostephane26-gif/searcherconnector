'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GoldDot from '../ui/GoldDot'
import { useAuth } from '../../contexts/AuthContext'
import Badge from '../ui/Badge'
import { LogOut, Menu } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { toggleMobileSidebar } from '../../hooks/useMobileSidebar'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Si on est tout en haut, toujours afficher
      if (currentScrollY < 10) {
        setIsVisible(true)
      } 
      // Si on scroll vers le bas, cacher
      else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false)
      } 
      // Si on scroll vers le haut, afficher
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#1A1A1A] lg:left-64 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={toggleMobileSidebar}
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/searcher-icon.png"
            alt="Searcher Connector"
            className="w-8 h-8 rounded-lg object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="text-[#D4AF37] font-bold tracking-tighter text-xl">SEARCHER</span>
          <span className="hidden md:inline text-[#444444] text-[10px] tracking-[0.2em] font-medium uppercase">Connector</span>
        </Link>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-[10px] tracking-widest text-[#D4AF37] font-bold">
            <GoldDot />
            AGENT ACTIVE 24/7
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm font-bold text-white">{profile?.full_name}</span>
                <Badge status={(profile?.verification_status || 'pending') as any} />
              </div>
              <NotificationBell />
              
              <Link href="/profile" className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-bold text-[#D4AF37] overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.charAt(0) || 'U'
                )}
              </Link>

              <button 
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-[#D4AF37] text-[#0A0A0A] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#F5E6A3] transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
