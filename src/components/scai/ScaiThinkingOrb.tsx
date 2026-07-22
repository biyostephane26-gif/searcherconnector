'use client'

// =================================================================
// SCAI THINKING ORB — indicateur "splash" quand SCAI génère/travaille
// Trois blobs dorés qui pulsent en décalé, façon éclaboussure — pas
// une simple roue qui tourne. Purement CSS, aucun coût.
// =================================================================

export default function ScaiThinkingOrb({ size = 22 }: { size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full bg-[#D4AF37]/70 animate-[scaiSplash_1.4s_ease-in-out_infinite]"
      />
      <span
        className="absolute inset-0 rounded-full bg-[#D4AF37]/50 animate-[scaiSplash_1.4s_ease-in-out_infinite]"
        style={{ animationDelay: '0.25s' }}
      />
      <span
        className="absolute inset-0 rounded-full bg-[#D4AF37]/30 animate-[scaiSplash_1.4s_ease-in-out_infinite]"
        style={{ animationDelay: '0.5s' }}
      />
      <span className="absolute inset-[30%] rounded-full bg-[#D4AF37]" />
      <style jsx>{`
        @keyframes scaiSplash {
          0%   { transform: scale(0.4); opacity: 0.9; }
          70%  { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
