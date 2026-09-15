// =================================================================
// SCAI Cowork — génération d'images
// =================================================================
// Fournisseurs essayés dans l'ordre : OpenAI (gpt-image-1-mini) →
// Gemini (flash image) → Pollinations (gratuit, sans clé, qualité
// moindre et filigrane). Cœur indépendant de la requête HTTP — appelé
// par app/api/tools/image/route.ts (après vérification de session) et
// par le moteur de tâches Cowork en arrière-plan (scheduler.js).
// =================================================================

import { logToolUsage } from './logToolUsage'
import { saveImageOutput } from './saveCoworkOutput'

const envKeys = (prefix: string) =>
  Array.from({ length: 10 }, (_, i) => process.env[`${prefix}${i + 1}`]).filter((k): k is string => !!k && k.length > 10)

const SIZES = {
  square:    { openai: '1024x1024', w: 1024, h: 1024 },
  landscape: { openai: '1536x1024', w: 1344, h: 768 },
  portrait:  { openai: '1024x1536', w: 768,  h: 1344 },
} as const

async function tryOpenAI(prompt: string, size: string, errors: string[]) {
  for (const key of envKeys('OPENAI_KEY_')) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1-mini', prompt, size, quality: 'medium', n: 1 }),
    }).catch(() => null)
    if (!res) continue
    const data = await res.json().catch(() => ({}))
    const b64 = data?.data?.[0]?.b64_json
    if (res.ok && b64) return `data:image/png;base64,${b64}`
    const code = data?.error?.code
    errors.push(`openai ${res.status}${code ? ` ${code}` : ''}`)
    // Même compte derrière toutes les clés : inutile de toutes les essayer.
    if (code === 'credit_balance_exhausted' || code === 'billing_hard_limit_reached') break
  }
  return null
}

async function tryGemini(prompt: string, errors: string[]) {
  for (const key of envKeys('GEMINI_KEY_')) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }).catch(() => null)
    if (!res) continue
    const data = await res.json().catch(() => ({}))
    const part = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)
    if (res.ok && part) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
    errors.push(`gemini ${res.status}`)
    if (res.status === 429 && errors.filter(e => e.startsWith('gemini 429')).length >= 2) break
  }
  return null
}

async function tryPollinations(prompt: string, w: number, h: number, errors: string[]) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${Math.floor(Math.random() * 1e6)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || !type.startsWith('image/')) { errors.push(`pollinations ${res.status}`); return null }
    const buf = Buffer.from(await res.arrayBuffer())
    return `data:${type};base64,${buf.toString('base64')}`
  } catch (e: any) {
    errors.push(`pollinations ${e.name === 'AbortError' ? 'timeout' : e.message}`)
    return null
  } finally { clearTimeout(timer) }
}

export async function generateImageForUser(
  userId: string, params: { prompt: string; aspect?: string }
): Promise<{ image: string; provider: string; fallback: boolean } | { error: string; details: string[] }> {
  const prompt = String(params.prompt || '').trim().slice(0, 2000)
  if (prompt.length < 3) return { error: "Décris l'image à créer.", details: [] }
  const size = SIZES[(params.aspect as keyof typeof SIZES) || 'square'] || SIZES.square

  const errors: string[] = []
  let image = await tryOpenAI(prompt, size.openai, errors)
  let provider = 'OpenAI'
  if (!image) { image = await tryGemini(prompt, errors); provider = 'Gemini' }
  if (!image) { image = await tryPollinations(prompt, size.w, size.h, errors); provider = 'Pollinations (gratuit)' }

  if (!image) {
    return { error: "Aucun générateur d'images disponible pour le moment.", details: errors }
  }
  logToolUsage(userId, 'image', provider)
  saveImageOutput(userId, prompt.slice(0, 60), image).catch(() => {})
  return { image, provider, fallback: provider.startsWith('Pollinations') }
}
