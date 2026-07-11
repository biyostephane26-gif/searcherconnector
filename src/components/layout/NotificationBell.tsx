'use client'
// =================================================================
// Cloche de notifications — temps réel via Supabase
// Affiche les notifications non lues + popup panel
// Types : paiement, candidature, scan, message, alerte urgente
// =================================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Bell, X, CheckCheck, Zap, CreditCard, MessageSquare, Search, AlertTriangle, Bot } from 'lucide-react'
import Link from 'next/link'

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  application: { icon: Bot,           color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
  scan_complete:{ icon: Search,       color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  payment:     { icon: CreditCard,    color: 'text-green-400',  bg: 'bg-green-400/10' },
  system:      { icon: Zap,           color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
  message:     { icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  urgent:      { icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-400/10' },
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifs, setNotifs]     = useState<any[]>([])
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [filter, setFilter]     = useState<'all' | 'unread' | 'opportunities' | 'system'>('all')
  const panelRef                = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.is_read).length

  const filteredNotifs = notifs.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.is_read
    if (filter === 'opportunities') return ['application', 'scan_complete', 'urgent'].includes(n.type)
    if (filter === 'system') return ['system', 'payment'].includes(n.type)
    return true
  })

  const fetchNotifs = async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifs(data)
  }

  useEffect(() => {
    fetchNotifs()
    if (!user) return

    // Temps réel — nouvelles notifs instantanées
    const channel = supabase
      .channel(`notifs_${user.id}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifs(prev => [payload.new as any, ...prev])
        // Push notification native si PWA installée
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = payload.new as any
          new Notification(`Searcher Connector — ${n.title}`, {
            body: n.message,
            icon: '/searcher-icon.png',
            tag:  n.type,
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Fermer en cliquant dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const markAllRead = async () => {
    if (!user) return
    setLoading(true)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setLoading(false)
  }

  const markOneRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const getLink = (n: any): string => {
    if (n.type === 'application') {
      try { const d = JSON.parse(n.data || '{}'); return `/applications/${d.application_id}` } catch { return '/opportunities' }
    }
    if (n.type === 'scan_complete') return '/opportunities'
    if (n.type === 'payment')       return '/settings'
    if (n.type === 'message')       return '/cowork'
    if (n.type === 'urgent')        return '/opportunities'
    return '/dashboard'
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    if (diff < 3600000)  return `${Math.floor(diff/60000)}min`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`
    return `${Math.floor(diff/86400000)}j`
  }

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-gray-500 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#D4AF37] rounded-full flex items-center justify-center text-[9px] font-bold text-black px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-[#111111] border border-[#2a2a2a] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 flex flex-col animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex flex-col gap-2 px-4 py-3 border-b border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Notifications</span>
                {unread > 0 && (
                  <span className="bg-[#D4AF37] text-black text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {unread} non lues
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} disabled={loading}
                    className="text-[10px] text-gray-500 hover:text-[#D4AF37] flex items-center gap-1 transition-colors">
                    <CheckCheck className="w-3 h-3" /> Tout lire
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Filtres */}
            <div className="flex gap-1">
              {(['all', 'unread', 'opportunities', 'system'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    filter === f 
                      ? 'bg-[#D4AF37] text-black' 
                      : 'bg-[#1A1A1A] text-gray-500 hover:text-white'
                  }`}>
                  {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : f === 'opportunities' ? 'Opportunités' : 'Système'}
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {filter === 'all' ? 'Aucune notification' : `Aucune notification ${filter === 'unread' ? 'non lue' : filter === 'opportunities' ? "d'opportunité" : 'système'}`}
                </p>
              </div>
            ) : (
              filteredNotifs.map(n => {
                const cfg  = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
                const Icon = cfg.icon
                const link = getLink(n)
                return (
                  <Link key={n.id} href={link}
                    onClick={() => { markOneRead(n.id); setOpen(false) }}
                    className={`flex gap-3 p-4 border-b border-[#1A1A1A] hover:bg-[#0D0D0D] transition-colors cursor-pointer ${!n.is_read ? 'bg-[#0D0D0D]' : ''}`}>
                    {/* Icône */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-tight ${!n.is_read ? 'text-white' : 'text-gray-300'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#D4AF37] flex-shrink-0 mt-2" />
                    )}
                  </Link>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#1A1A1A]">
            <Link href="/dashboard" onClick={() => setOpen(false)}
              className="text-[10px] text-gray-600 hover:text-[#D4AF37] transition-colors">
              Voir l'historique complet →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
