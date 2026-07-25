// =================================================================
// SOUMISSION ATS RÉELLE — étape suivante de /api/auto-apply.
// Ce endpoint ne fait rien tant que l'utilisateur n'a pas activé
// "Soumission ATS 100% autonome" dans Paramètres (ats_auto_submit_no_review)
// — jamais de soumission réelle sans ce consentement explicite.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectAtsPlatform, submitAtsApplication } from '../../../../src/lib/scraper/atsSubmit'
import { planTier } from '../../../../src/lib/planUtils'
import { planConfig } from '../../../../src/lib/planConfig'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, opportunityId } = await req.json()
    if (!userId || !opportunityId) {
      return NextResponse.json({ error: 'userId et opportunityId requis' }, { status: 400 })
    }

    const [{ data: profile }, { data: opportunity }, { data: schedule }] = await Promise.all([
      supabase.from('users_profiles').select('full_name, email, whatsapp_number, cv_url, portfolio_url, linkedin_url, plan, role').eq('id', userId).single(),
      supabase.from('opportunities').select('original_url, title, company').eq('id', opportunityId).single(),
      supabase.from('agent_schedules').select('ats_auto_submit_no_review').eq('user_id', userId).single(),
    ])

    if (!profile || !opportunity) {
      return NextResponse.json({ error: 'Profil ou opportunité introuvable' }, { status: 404 })
    }

    // Garde-fou explicite — jamais de soumission réelle sans ce réglage actif.
    if (!schedule?.ats_auto_submit_no_review) {
      return NextResponse.json({ error: 'Soumission ATS autonome désactivée. Active-la dans Paramètres pour utiliser cette fonctionnalité.' }, { status: 403 })
    }

    // Réservé aux plans payants + plafond quotidien (coût réel : Chromium
    // côté serveur). Le fondateur n'a aucune limite.
    const isFounder = profile.role === 'founder'
    if (!isFounder) {
      const cfg = planConfig(planTier(profile as any))
      if (cfg.atsAutoSubmitPerDay <= 0) {
        return NextResponse.json({ error: 'La soumission ATS réelle est réservée aux plans Pro et Premium.', requiresUpgrade: true }, { status: 403 })
      }
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
      const { count: submittedToday } = await supabase
        .from('applications_sent')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('ats_submitted_at', 'is', null)
        .gte('ats_submitted_at', dayStart.toISOString())
      if ((submittedToday || 0) >= cfg.atsAutoSubmitPerDay) {
        return NextResponse.json({ error: `Limite de soumissions ATS atteinte (${cfg.atsAutoSubmitPerDay}/jour sur le plan ${cfg.label}).`, requiresUpgrade: true }, { status: 429 })
      }
    }

    const platform = detectAtsPlatform(opportunity.original_url || '')
    if (!platform) {
      return NextResponse.json({ skipped: true, reason: 'not_ats_platform' })
    }

    const { data: application } = await supabase
      .from('applications_sent')
      .select('id, cover_message')
      .eq('user_id', userId)
      .eq('opportunity_id', opportunityId)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!application?.cover_message) {
      return NextResponse.json({ error: 'Aucun message généré pour cette offre — appelle /api/auto-apply d\'abord.' }, { status: 400 })
    }

    const result = await submitAtsApplication(platform, {
      applyUrl: opportunity.original_url,
      fullName: profile.full_name || '',
      email: profile.email || '',
      phone: profile.whatsapp_number || undefined,
      coverMessage: application.cover_message,
      cvUrl: profile.cv_url || undefined,
      portfolioUrl: profile.portfolio_url || undefined,
      linkedinUrl: profile.linkedin_url || undefined,
    })

    if (result.success) {
      await supabase.from('applications_sent').update({
        ats_submitted_at: new Date().toISOString(),
        ats_confirmation: result.confirmation,
        ats_platform: platform,
      }).eq('id', application.id)

      await supabase.from('opportunities').update({ status: 'auto_applied' }).eq('id', opportunityId)

      await supabase.from('agent_actions').insert({
        user_id: userId,
        action_type: 'ats_auto_submit',
        opportunity_id: opportunityId,
        result: `Candidature réellement soumise sur ${platform} pour "${opportunity.title}"${opportunity.company ? ' chez ' + opportunity.company : ''}`,
        success: true,
        execution_ms: 0,
      })

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'application',
        title: `✅ Candidature réellement envoyée`,
        message: `SCAI a soumis ta candidature pour "${opportunity.title}"${opportunity.company ? ' chez ' + opportunity.company : ''} — confirmation reçue de ${platform}.`,
        is_read: false,
        action_url: opportunity.original_url,
        action_label: 'Voir l\'offre',
      })
    } else {
      await supabase.from('agent_actions').insert({
        user_id: userId,
        action_type: 'ats_auto_submit',
        opportunity_id: opportunityId,
        result: `Échec soumission ${platform} pour "${opportunity.title}" : ${result.error}`,
        success: false,
        execution_ms: 0,
      })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
