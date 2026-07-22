// =================================================================
// SEARCHER CONNECTOR — Rate limiter anti-abus (en mémoire)
// =================================================================
// Process Node persistant sur Render (pas de serverless) — un Map en
// mémoire suffit, pas besoin de Redis/BullMQ pour ça. Même approche
// que le rate limiting déjà en place dans src/lib/email.ts.
// =================================================================

const buckets = new Map<string, { count: number; resetAt: number }>()

/**
 * Retourne true si l'appel est autorisé (et le comptabilise), false si la
 * limite est dépassée pour la fenêtre en cours.
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= maxRequests) return false

  bucket.count++
  return true
}

// Purge périodique pour éviter une fuite mémoire sur les clés expirées
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}, 10 * 60 * 1000).unref?.()
