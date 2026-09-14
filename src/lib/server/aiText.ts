// Génération de texte côté serveur : Groq (rotation des clés) puis Gemini.
// GROQ_MODEL : llama-3.3-70b-versatile a été retiré du catalogue Groq
// (retournait 404 sur toutes les clés, vérifié en direct le 2026-09-14 —
// TOUS les appels Groq de l'app échouaient silencieusement et retombaient
// sur Gemini/l'heuristique locale sans jamais remonter d'erreur visible).
// openai/gpt-oss-120b : même qualité de sortie JSON, ~2s de latence.
const GROQ_MODEL = 'openai/gpt-oss-120b'
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

function keys(prefix: string, max = 10) {
  return Array.from({ length: max }, (_, i) => process.env[`${prefix}${i + 1}`])
    .filter((k): k is string => !!k && k.length > 10)
}

export async function generateText(prompt: string, opts: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  const maxTokens = opts.maxTokens ?? 4000
  const errors: string[] = []

  for (const key of keys('GROQ_API_KEY_')) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: maxTokens,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        }),
      })
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      if (res.ok && text) return text
      errors.push(`groq ${res.status}`)
    } catch (e: any) { errors.push(`groq ${e.message}`) }
  }

  for (const key of keys('GEMINI_KEY_')) {
    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.5, ...(opts.json ? { responseMimeType: 'application/json' } : {}) },
          }),
        })
        if (res.status === 429 || res.status === 404 || res.status === 503) { errors.push(`gemini ${res.status}`); continue }
        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('')
        if (text) return text
      } catch (e: any) { errors.push(`gemini ${e.message}`) }
    }
  }
  throw new Error(`Aucun fournisseur IA disponible (${errors.slice(0, 4).join(', ')})`)
}

export function parseJsonLoose<T = any>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.search(/[\[{]/)
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  return JSON.parse(cleaned.slice(start, end + 1))
}

// Demande un JSON et le valide ; relance jusqu'à 3 fois si le modèle
// renvoie un JSON tronqué ou mal formé.
export async function generateJson<T>(prompt: string, isValid: (v: any) => boolean, opts: { maxTokens?: number } = {}): Promise<T> {
  let lastError = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = attempt === 0 ? prompt
      : `${prompt}\n\nIMPORTANT : ta réponse précédente était un JSON invalide (${lastError}). Renvoie un JSON strictement valide et plus concis.`
    try {
      const value = parseJsonLoose(await generateText(p, { json: true, maxTokens: opts.maxTokens }))
      if (isValid(value)) return value as T
      lastError = 'structure incomplète'
    } catch (e: any) {
      lastError = String(e?.message || e).slice(0, 80)
      if (/Aucun fournisseur IA/.test(lastError)) throw e
    }
  }
  throw new Error(`Contenu IA invalide après 3 essais (${lastError})`)
}
