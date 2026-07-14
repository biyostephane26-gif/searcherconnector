// =================================================================
// CRON HEBDOMADAIRE — Rapport personnalisé par email
// Exécuté tous les lundis à 09:00 via Vercel Cron
// Envoie stats + insights + gap free vs premium
// =================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWeeklyReport } from '../../../../src/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vérification token Vercel Cron pour sécurité
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret'

export async function GET(req: NextRequest) {
  try {
    // Vérifier le token d'autorisation
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    console.log('[weekly-report] Démarrage du rapport hebdomadaire...')

    // Récupérer tous les utilisateurs actifs (sauf founders)
    const { data: users, error: usersError } = await supabase
      .from('users_profiles')
      .select('id, email, full_name, plan, domain, created_at')
      .neq('role', 'founder')
      .order('created_at', { ascending: false })

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      console.log('[weekly-report] Aucun utilisateur à traiter')
      return NextResponse.json({ success: true, sent: 0 })
    }

    console.log(`[weekly-report] ${users.length} utilisateurs à traiter`)

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    let sentCount = 0
    let errorCount = 0

    // Traiter chaque utilisateur
    for (const user of users) {
      try {
        // Récupérer stats de la semaine
        const [opportunitiesData, applicationsData, trackingData] = await Promise.all([
          supabase
            .from('opportunities')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', oneWeekAgo),
          supabase
            .from('applications_sent')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', oneWeekAgo),
          supabase
            .from('applications_tracking')
            .select('status')
            .eq('user_id', user.id)
        ])

        const opportunities = opportunitiesData.data || []
        const applications = applicationsData.data || []
        const tracking = trackingData.data || []

        // Ne pas envoyer si aucune activité cette semaine ET moins de 7 jours d'inscription
        const daysSinceSignup = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (opportunities.length === 0 && applications.length === 0 && daysSinceSignup < 7) {
          console.log(`[weekly-report] Skip ${user.email} - pas d'activité et récent`)
          continue
        }

        // Calculer métriques
        const freshOpportunities = opportunities.filter(o => {
          const diff = Date.now() - new Date(o.created_at).getTime()
          return diff < 24 * 60 * 60 * 1000
        }).length

        const topOpportunities = opportunities
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(o => ({
            title: o.title,
            company: o.company || 'N/A',
            score: o.score || 0,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/opportunities`
          }))

        const interviewsScheduled = tracking.filter(t => 
          ['interview_scheduled', 'interview_completed'].includes(t.status)
        ).length

        const offersReceived = tracking.filter(t => 
          t.status === 'offer_received'
        ).length

        const acceptedOffers = tracking.filter(t => 
          t.status === 'accepted'
        ).length

        // Insights personnalisés
        const insights: string[] = []
        
        if (opportunities.length === 0) {
          insights.push("Aucune opportunité trouvée cette semaine. Vérifie que ton profil est complet et que ton domaine est bien défini.")
        } else if (opportunities.length < 10 && user.plan === 'free') {
          insights.push(`Tu as ${opportunities.length} opportunités cette semaine. Passe à un plan payant pour débloquer des scans plus fréquents et accéder à toutes les sources premium.`)
        } else if (freshOpportunities > 0) {
          insights.push(`${freshOpportunities} opportunités fraîches (<24h) détectées ! Agis vite pour maximiser tes chances.`)
        }

        if (applications.length === 0 && opportunities.length > 0) {
          insights.push(`Tu as ${opportunities.length} opportunités mais aucune candidature envoyée. Active l'auto-apply de SCAI pour gagner du temps.`)
        }

        if (interviewsScheduled > 0) {
          insights.push(`🎉 ${interviewsScheduled} entretien${interviewsScheduled > 1 ? 's' : ''} prévu${interviewsScheduled > 1 ? 's' : ''} ! Prépare-toi avec SCAI Interview Prep.`)
        }

        if (acceptedOffers > 0) {
          insights.push(`🎊 Félicitations ! ${acceptedOffers} offre${acceptedOffers > 1 ? 's' : ''} acceptée${acceptedOffers > 1 ? 's' : ''} cette semaine. Ton niveau professionnel a été mis à jour.`)
        }

        // Gap free vs premium
        const premiumBenefits = []
        if (user.plan === 'free') {
          premiumBenefits.push('Scans 10x plus fréquents')
          premiumBenefits.push('Accès à LinkedIn, Indeed, Glassdoor')
          premiumBenefits.push('Auto-candidature intelligente')
          premiumBenefits.push('Notifications temps réel')
          premiumBenefits.push('SCAI Voice illimité')
        }

        // Envoyer l'email
        const emailSent = await sendWeeklyReport({
          to: user.email,
          name: user.full_name || 'Searcher',
          week: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
          stats: {
            opportunitiesFound: opportunities.length,
            freshOpportunities,
            applicationsSubmitted: applications.length,
            interviewsScheduled,
            offersReceived,
            acceptedOffers,
            avgScore: opportunities.length > 0 
              ? Math.round(opportunities.reduce((sum, o) => sum + (o.score || 0), 0) / opportunities.length)
              : 0
          },
          topOpportunities,
          insights,
          isPremium: user.plan !== 'free',
          premiumBenefits,
          currentPlan: user.plan
        })

        if (emailSent) {
          sentCount++
          console.log(`[weekly-report] ✅ Envoyé à ${user.email}`)
        } else {
          errorCount++
          console.log(`[weekly-report] ❌ Erreur envoi à ${user.email}`)
        }

        // Petit délai pour éviter rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (userError: any) {
        console.error(`[weekly-report] Erreur pour ${user.email}:`, userError.message)
        errorCount++
      }
    }

    console.log(`[weekly-report] Terminé: ${sentCount} envoyés, ${errorCount} erreurs`)

    return NextResponse.json({
      success: true,
      sent: sentCount,
      errors: errorCount,
      total: users.length
    })
  } catch (error: any) {
    console.error('[weekly-report] Erreur globale:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
