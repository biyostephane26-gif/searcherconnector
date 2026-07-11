'use client'
// =================================================================
// SEARCHER CONNECTOR — Splash Screen
// Affiché au démarrage sur PC, web et téléphone.
// Logo animé + message "scanning the world for you"
// =================================================================

import { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [phase, setPhase]       = useState<0 | 1 | 2 | 3>(0)
  const [dots, setDots]         = useState('')
  const [scanLine, setScanLine] = useState(0)

  // Phase 0 → logo apparaît
  // Phase 1 → titre apparaît
  // Phase 2 → message apparaît
  // Phase 3 → barre de scan
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 800)
    const t3 = setTimeout(() => setPhase(3), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Dots animés
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [])

  // Barre de scan qui progresse
  useEffect(() => {
    if (phase < 3) return
    const interval = setInterval(() => {
      setScanLine(v => v >= 100 ? 0 : v + 2)
    }, 30)
    return () => clearInterval(interval)
  }, [phase])

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center z-[9999] select-none">

      {/* Grille de fond subtile */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Lueur centrale */}
      <div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
          transition: 'opacity 1s ease',
          opacity: phase >= 1 ? 1 : 0,
        }}
      />

      {/* ── Logo ──────────────────────────────────────────────── */}
      <div
        style={{
          opacity:    phase >= 0 ? 1 : 0,
          transform:  phase >= 0 ? 'scale(1)' : 'scale(0.6)',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className="mb-10 relative"
      >
        {/* Anneau extérieur pulsant */}
        <div
          className="absolute inset-0 rounded-full border border-[#D4AF37]"
          style={{
            width: 140, height: 140,
            top: -14, left: -14,
            opacity: phase >= 2 ? 0.15 : 0,
            animation: phase >= 2 ? 'ping 2s cubic-bezier(0,0,0.2,1) infinite' : 'none',
          }}
        />

        {/* Icône officielle Searcher Connector — loupe dorée */}
        <img
          src="/searcher-icon.png"
          alt="Searcher Connector"
          width="112"
          height="112"
          className="rounded-3xl"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const next = target.nextElementSibling as HTMLElement
            if (next) next.style.display = 'block'
          }}
        />
        {/* Fallback SVG si PNG manquant */}
        <svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
          <rect width="112" height="112" rx="24" fill="#111111"/>
          <circle cx="56" cy="56" r="46" stroke="#D4AF37" strokeWidth="1.5" opacity="0.2"/>
          <circle cx="56" cy="56" r="32" stroke="#D4AF37" strokeWidth="2" opacity="0.5"/>
          <circle cx="56" cy="56" r="18" fill="#D4AF37"/>
          <text x="56" y="63" fontFamily="Georgia, serif" fontSize="20" fontWeight="900"
            fill="#0A0A0A" textAnchor="middle">S</text>
          <circle cx="56" cy="10" r="3" fill="#D4AF37"/>
          <circle cx="102" cy="56" r="3" fill="#D4AF37"/>
          <circle cx="56" cy="102" r="3" fill="#D4AF37"/>
          <circle cx="10" cy="56" r="3" fill="#D4AF37"/>
          <line x1="56" y1="13" x2="56" y2="38" stroke="#D4AF37" strokeWidth="1" opacity="0.3"/>
          <line x1="99" y1="56" x2="74" y2="56" stroke="#D4AF37" strokeWidth="1" opacity="0.3"/>
          <line x1="56" y1="99" x2="56" y2="74" stroke="#D4AF37" strokeWidth="1" opacity="0.3"/>
          <line x1="13" y1="56" x2="38" y2="56" stroke="#D4AF37" strokeWidth="1" opacity="0.3"/>
        </svg>
      </div>

      {/* ── Titre ─────────────────────────────────────────────── */}
      <div
        style={{
          opacity:    phase >= 1 ? 1 : 0,
          transform:  phase >= 1 ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.5s ease',
        }}
        className="text-center mb-3"
      >
        <div className="text-white font-black text-2xl tracking-[0.15em] uppercase">
          Searcher <span className="text-[#D4AF37]">Connector</span>
        </div>
      </div>

      {/* ── Message clé ───────────────────────────────────────── */}
      <div
        style={{
          opacity:    phase >= 2 ? 1 : 0,
          transform:  phase >= 2 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.5s ease 0.1s',
        }}
        className="mb-12"
      >
        <p className="text-[#888888] text-xs tracking-[0.25em] uppercase text-center">
          Scanning the world for you{dots}
        </p>
      </div>

      {/* ── Barre de scan ─────────────────────────────────────── */}
      <div
        style={{
          opacity:    phase >= 3 ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
        className="w-48"
      >
        {/* Track */}
        <div className="w-full h-px bg-[#1A1A1A] rounded-full overflow-hidden relative">
          {/* Curseur qui se déplace */}
          <div
            className="absolute top-0 h-full w-12 rounded-full"
            style={{
              left: `${Math.min(scanLine, 88)}%`,
              background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
              transition: 'left 0.03s linear',
            }}
          />
        </div>
        {/* Label */}
        <p className="text-center text-[#333333] text-[10px] mt-3 font-mono tracking-widest uppercase">
          Initialisation{dots}
        </p>
      </div>

      {/* Style pour l'animation ping */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
