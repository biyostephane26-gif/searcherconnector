'use client'

import { useAudioLevels } from '../../hooks/useAudioLevels'

interface VoiceWaveformProps {
  source: MediaStream | HTMLAudioElement | null
  variant: 'recording' | 'speaking'
  className?: string
}

// =================================================================
// Barres réactives au son réel :
//  - variant "recording" (rouge, en zigzag) : confirme au user que
//    son micro capte bien du son pendant l'enregistrement d'une note
//    vocale.
//  - variant "speaking" (or, façon spectre) : bouge avec le volume
//    réel de la voix de SCAI pendant la lecture TTS.
// =================================================================
export default function VoiceWaveform({ source, variant, className = '' }: VoiceWaveformProps) {
  const levels = useAudioLevels(source)
  const color = variant === 'recording' ? 'bg-red-500' : 'bg-[#D4AF37]'

  return (
    <div className={`flex items-center gap-[3px] h-5 ${className}`}>
      {levels.map((level, i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${color} transition-[height] duration-75 ease-out`}
          style={{
            height: `${Math.max(15, level * 100)}%`,
            transform: variant === 'recording' && i % 2 === 1 ? 'translateY(2px)' : undefined,
          }}
        />
      ))}
    </div>
  )
}
