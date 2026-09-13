'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import GlobalSearch from './GlobalSearch'

const OPEN_EVENT = 'sc:open-search'

export function openGlobalSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

// Monté une seule fois (providers) : écoute Ctrl/Cmd + K et l'événement d'ouverture.
export default function SearchLauncher() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); window.location.href = '/settings' }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_EVENT, onOpen) }
  }, [user])

  if (!user) return null
  return <GlobalSearch open={open} onClose={() => setOpen(false)} />
}

export function SearchButton({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <button onClick={openGlobalSearch} className={`p-2 text-gray-400 hover:text-[#D4AF37] transition-colors ${className}`} aria-label="Rechercher (Ctrl+K)" title="Rechercher (Ctrl+K)">
        <Search className="w-5 h-5" />
      </button>
    )
  }
  return (
    <button
      onClick={openGlobalSearch}
      className={`flex items-center gap-2 w-full bg-[#111111] border border-[#2a2a2a] hover:border-[#D4AF37]/30 rounded-xl px-3 py-2 text-sm text-gray-500 transition-colors ${className}`}
    >
      <Search className="w-4 h-4" />
      <span className="flex-1 text-left">Rechercher…</span>
      <kbd className="text-[10px] text-gray-600 border border-[#2a2a2a] rounded px-1.5 py-0.5">Ctrl K</kbd>
    </button>
  )
}
