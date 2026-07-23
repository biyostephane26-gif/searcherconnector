// =================================================================
// API REFERRAL - Réclamer les récompenses de parrainage
// Ajoute les jours premium au compte du parrain
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification } from '../../../../src/lib/notifications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { referralId, userId } = await req.json()

    if (!referralId || !userId) {
      return NextResponse.json(
        { error: 'referralId et userId requis' },
        { status: 400 }
      )
    }

    // Récupérer le referral
    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('*, referred:users_profiles!referred_id(plan)')
      .eq('id', referralId)
      .eq('referrer_id', userId)
      .single()

    if (refError || !referral) {
      return NextResponse.json(
        { error: 'Parrainage introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que pas déjà réclamé
    if (referral.reward_claimed) {
      return NextResponse.json(
        { error: 'Récompense déjà réclamée' },
        { status: 400 }
      )
    }

    // Vérifier que le filleul a un plan payant
    if (referral.referred.plan === 'free') {
      return NextResponse.json(
        { error: 'Le filleul doit avoir un plan payant' },
        { status: 400 }
      )
    }

    // Récupérer le profil du parrain
    const { data: profile } = await supabase
      .from('users_profiles')
      .select('plan, plan_expires_at')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil introuvable' },
        { status: 404 }
      )
    }

    // Calculer nouvelle date d'expiration
    const daysToAdd = referral.reward_days || 7
    const now = new Date()
    const currentExpiry = profile.plan_expires_at ? new Date(profile.plan_expires_at) : now
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)

    // Mettre à jour le profil
    const updates: any = {
      plan_expires_at: newExpiry.toISOString()
    }

    // Récompense parrainage = accès Premium temporaire (voir spec : 7 filleuls
    // → ~10 jours premium). Ici on applique le palier Premium + ses crédits.
    if (profile.plan === 'free') {
      updates.plan = 'premium'
      updates.voice_credits = 300
    }

    const { error: updateError } = await supabase
      .from('users_profiles')
      .update(updates)
      .eq('id', userId)

    if (updateError) throw updateError

    // Marquer comme réclamé
    await supabase
      .from('referrals')
      .update({ reward_claimed: true, claimed_at: new Date().toISOString() })
      .eq('id', referralId)

    // Créer notification
    await createNotification({
      userId,
      type: 'system',
      title: '🎁 Récompense de parrainage réclamée!',
      message: `Tu as gagné ${daysToAdd} jours de premium gratuit! Ton plan expire maintenant le ${newExpiry.toLocaleDateString('fr-FR')}.`,
      actionUrl: '/referrals',
      actionLabel: 'Voir mes parrainages'
    })

    return NextResponse.json({
      success: true,
      daysAdded: daysToAdd,
      newExpiry: newExpiry.toISOString()
    })
  } catch (error: any) {
    console.error('[referral/claim] Erreur:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
