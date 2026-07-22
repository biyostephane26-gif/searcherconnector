'use client'

import { useEffect, useRef, useState } from 'react'

const BAR_COUNT = 5

// =================================================================
// Niveaux audio réels (pas une animation factice) — lit l'amplitude
// via Web Audio API pour que la visualisation reflète vraiment le
// son capté par le micro (confirmation que l'enregistrement marche)
// ou le volume de la voix de SCAI pendant la lecture TTS.
// =================================================================
export function useAudioLevels(source: MediaStream | HTMLAudioElement | null) {
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0.08))
  const rafRef = useRef<number | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!source) {
      setLevels(Array(BAR_COUNT).fill(0.08))
      return
    }

    let analyser: AnalyserNode
    let dataArray: Uint8Array
    let audioCtx: AudioContext

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctxRef.current = audioCtx
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64

      const node = source instanceof MediaStream
        ? audioCtx.createMediaStreamSource(source)
        : audioCtx.createMediaElementSource(source)

      node.connect(analyser)
      // Pour un <audio>, il faut aussi router vers la sortie sinon le son est coupé
      if (!(source instanceof MediaStream)) analyser.connect(audioCtx.destination)

      dataArray = new Uint8Array(analyser.frequencyBinCount)
    } catch {
      // API non supportée / source déjà connectée ailleurs — animation neutre
      return
    }

    const tick = () => {
      analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>)
      const step = Math.floor(dataArray.length / BAR_COUNT)
      const next = Array.from({ length: BAR_COUNT }, (_, i) => {
        const slice = dataArray.slice(i * step, (i + 1) * step)
        const avg = slice.reduce((a, b) => a + b, 0) / (slice.length || 1)
        return Math.max(0.08, Math.min(1, avg / 180))
      })
      setLevels(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      audioCtx.close().catch(() => {})
    }
  }, [source])

  return levels
}
