'use client'

// =================================================================
// SCAI THINKING ORB — indicateur "réflexion" quand SCAI génère/travaille
// Mini-globe doré avec des méridiens qui tournent, en écho à l'animation
// de la landing page (le globe avec les arcs qui la traversent) — mais
// en pur SVG/CSS, pas la lib 3D (react-globe.gl) : bien trop lourde pour
// un indicateur qui s'affiche et disparaît en continu dans le chat.
// =================================================================

export default function ScaiThinkingOrb({ size = 22 }: { size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size} height={size} className="animate-[scaiSpin_2.2s_linear_infinite]">
        <defs>
          <radialGradient id="scaiGlobeGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F5E6A3" />
            <stop offset="55%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#8a6a1f" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="17" fill="url(#scaiGlobeGrad)" />
        <g stroke="#0A0A0A" strokeOpacity="0.35" fill="none">
          <ellipse cx="20" cy="20" rx="17" ry="6.5" className="animate-[scaiMeridian_2.2s_linear_infinite]" />
          <ellipse cx="20" cy="20" rx="17" ry="6.5" transform="rotate(60 20 20)" className="animate-[scaiMeridian_2.2s_linear_infinite]" style={{ animationDelay: '-0.73s' }} />
          <ellipse cx="20" cy="20" rx="17" ry="6.5" transform="rotate(120 20 20)" className="animate-[scaiMeridian_2.2s_linear_infinite]" style={{ animationDelay: '-1.47s' }} />
          <circle cx="20" cy="20" r="17" strokeOpacity="0.5" />
        </g>
      </svg>
      <style jsx>{`
        @keyframes scaiSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scaiMeridian {
          0%, 100% { transform: scaleX(1); }
          50%      { transform: scaleX(-1); }
        }
      `}</style>
    </div>
  )
}
