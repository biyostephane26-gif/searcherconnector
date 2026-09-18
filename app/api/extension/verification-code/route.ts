// =================================================================
// CODE DE VÉRIFICATION PAR EMAIL — pour l'extension navigateur
// =================================================================
// Complète l'auto-soumission déjà réelle (ATS + extension) : quand un
// site (inscription Upwork, Freelancer.com...) envoie un code de
// vérification par email pendant que SCAI agit à la place de
// l'utilisateur, ce endpoint va le chercher dans SON PROPRE Gmail déjà
// connecté (OAuth existant, jamais de mot de passe géré par nous) pour
// éviter que l'utilisateur doive aller le récupérer lui-même.
//
// Garde-fous volontaires :
// - Ne cherche que les emails des 10 dernières minutes — jamais un
//   vieux code au hasard dans l'historique.
// - Ne fonctionne QUE pour un "code de vérification" (mot-clé détecté
//   dans le sujet/aperçu) — jamais un mot de passe, jamais un lien de
//   connexion. Portée strictement limitée à ce cas précis.
// - Même contrôle d'accès (plan payant ou fondateur) que les autres
//   routes de l'extension.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidGmailAccessToken } from '../../../../src/lib/server/gmailToken'
import { planTier } from '../../../../src/lib/planUtils'
import { planConfig } from '../../../../src/lib/planConfig'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const VERIFICATION_KEYWORDS = /verification|verify|confirm|confirmation|code de v[ée]rification|v[ée]rifi[ée]|otp|one-time|security code/i

// Un code plausible : 4 à 8 chiffres, idéalement proche du mot "code"
// dans le texte — on privilégie ces occurrences avant un chiffre isolé
// qui pourrait être une adresse, un prix, une année...
function extractCode(text: string): string | null {
  const nearCode = text.match(/code[^0-9]{0,20}(\d{4,8})\b/i) || text.match(/(\d{4,8})[^0-9]{0,10}(?:is your|est votre|code)/i)
  if (nearCode) return nearCode[1]
  const standalone = text.match(/\b(\d{4,8})\b/)
  return standalone ? standalone[1] : null
}

async function resolveUserId(token: string): Promise<string | null> {
  if (!token || !token.startsWith('sc_ext_')) return null
  const { data } = await supabase.from('extension_tokens').select('user_id').eq('token', token).maybeSingle()
  return data?.user_id || null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = body?.token
  const userId = await resolveUserId(token)
  if (!userId) return NextResponse.json({ error: 'Token invalide' }, { status: 401 })

  const { data: profile } = await supabase.from('users_profiles').select('plan, role').eq('id', userId).single()
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  const isFounder = profile.role === 'founder'
  if (!isFounder && !planConfig(planTier(profile as any)).extensionAccess) {
    return NextResponse.json({ error: 'Réservé aux plans Pro et Premium.' }, { status: 403 })
  }

  const accessToken = await getValidGmailAccessToken(userId)
  if (!accessToken) return NextResponse.json({ error: 'Gmail non connecté — connecte-le dans Connecteurs pour utiliser cette fonction.' }, { status: 400 })

  try {
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' + encodeURIComponent('newer_than:1h in:anywhere') + '&maxResults=10',
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) }
    )
    if (!listRes.ok) return NextResponse.json({ error: 'Lecture Gmail impossible.' }, { status: 502 })
    const list = await listRes.json()
    const ids: string[] = (list.messages || []).map((m: any) => m.id)

    for (const id of ids) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000) }
      )
      if (!msgRes.ok) continue
      const msg = await msgRes.json()
      const subject = (msg.payload?.headers || []).find((h: any) => h.name.toLowerCase() === 'subject')?.value || ''
      const snippet = msg.snippet || ''
      const hay = `${subject} ${snippet}`
      if (!VERIFICATION_KEYWORDS.test(hay)) continue
      const code = extractCode(hay)
      if (code) {
        // Vérifie que le mail est bien récent (les 10 dernières minutes) —
        // "newer_than:1h" ci-dessus est une marge large côté recherche
        // Gmail, cette seconde vérification resserre la fenêtre réelle.
        const internalDate = Number(msg.internalDate || 0)
        if (internalDate && Date.now() - internalDate > 10 * 60 * 1000) continue
        return NextResponse.json({ code, subject: subject.slice(0, 100) })
      }
    }
    return NextResponse.json({ code: null, message: 'Aucun code de vérification récent trouvé.' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur lecture Gmail' }, { status: 500 })
  }
}
