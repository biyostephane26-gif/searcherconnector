// =================================================================
// Helper pour créer des notifications facilement
// Utilise Supabase pour insérer + trigger temps réel automatique
// =================================================================

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type NotificationType = 
  | 'opportunity'      // Nouvelle opportunité trouvée
  | 'application'      // Candidature mise à jour
  | 'scan_complete'    // Scan terminé
  | 'payment'          // Paiement réussi/plan activé
  | 'system'           // Notification système
  | 'message'          // Nouveau message
  | 'urgent'           // Alerte urgente (<10 postulants)

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  financialValue?: string
  requiresAction?: boolean
  data?: Record<string, any>
}

/**
 * Crée une notification pour un utilisateur
 * Déclenchera automatiquement le temps réel via Supabase subscriptions
 */
export async function createNotification(params: CreateNotificationParams) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      action_url: params.actionUrl,
      action_label: params.actionLabel,
      financial_value: params.financialValue,
      requires_action: params.requiresAction || false,
      data: params.data ? JSON.stringify(params.data) : null,
      is_read: false,
      dismissed: false,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('[createNotification] Erreur:', error)
    return { success: false, error }
  }

  return { success: true }
}

/**
 * Envoie une notification à TOUS les utilisateurs (founder uniquement)
 */
export async function broadcastNotification(params: Omit<CreateNotificationParams, 'userId'>) {
  // Récupérer tous les users actifs
  const { data: users, error: usersError } = await supabase
    .from('users_profiles')
    .select('id')
    .eq('verification_status', 'verified')

  if (usersError || !users) {
    console.error('[broadcastNotification] Erreur récupération users:', usersError)
    return { success: false, error: usersError }
  }

  // Créer une notification pour chaque user
  const notifications = users.map(user => ({
    user_id: user.id,
    type: params.type,
    title: params.title,
    message: params.message,
    action_url: params.actionUrl,
    action_label: params.actionLabel,
    financial_value: params.financialValue,
    requires_action: params.requiresAction || false,
    data: params.data ? JSON.stringify(params.data) : null,
    is_read: false,
    dismissed: false,
    created_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('notifications')
    .insert(notifications)

  if (error) {
    console.error('[broadcastNotification] Erreur insertion:', error)
    return { success: false, error }
  }

  return { success: true, count: users.length }
}

/**
 * Templates de notifications pré-configurés
 */
export const NotificationTemplates = {
  planActivated: (userId: string, plan: string, durationDays: number) =>
    createNotification({
      userId,
      type: 'payment',
      title: `Plan ${plan.toUpperCase()} activé 🎉`,
      message: `Ton plan ${plan} est maintenant actif pour ${durationDays} jours. Profite de toutes les fonctionnalités premium!`,
      actionUrl: '/opportunities',
      actionLabel: 'Explorer',
    }),

  opportunityFound: (userId: string, count: number, matchScore: number) =>
    createNotification({
      userId,
      type: 'opportunity',
      title: `${count} nouvelles opportunités trouvées`,
      message: `SCAI a trouvé ${count} opportunités avec un score de compatibilité moyen de ${matchScore}%. Consulte-les maintenant!`,
      actionUrl: '/opportunities',
      actionLabel: 'Voir',
    }),

  urgentOpportunity: (userId: string, title: string, applicants: number) =>
    createNotification({
      userId,
      type: 'urgent',
      title: `⚡ Opportunité fraîche: ${title}`,
      message: `Seulement ${applicants} candidats! Postule maintenant avant qu'il ne soit trop tard.`,
      actionUrl: '/opportunities',
      actionLabel: 'Postuler',
      requiresAction: true,
    }),

  applicationSent: (userId: string, jobTitle: string, company: string) =>
    createNotification({
      userId,
      type: 'application',
      title: 'Candidature envoyée ✓',
      message: `Ta candidature pour ${jobTitle} chez ${company} a été envoyée avec succès.`,
      actionUrl: '/applications',
      actionLabel: 'Suivre',
    }),

  scanComplete: (userId: string, opportunitiesFound: number) =>
    createNotification({
      userId,
      type: 'scan_complete',
      title: 'Scan terminé',
      message: `SCAI a terminé le scan et a trouvé ${opportunitiesFound} nouvelles opportunités correspondant à ton profil.`,
      actionUrl: '/opportunities',
      actionLabel: 'Explorer',
    }),

  voiceCreditsLow: (userId: string, remaining: number) =>
    createNotification({
      userId,
      type: 'system',
      title: 'Crédits vocaux faibles',
      message: `Il te reste ${remaining} crédits vocaux. Passe à un plan supérieur pour continuer à utiliser SCAI Voice.`,
      actionUrl: '/pricing',
      actionLabel: 'Upgrader',
    }),

  maintenanceMode: (userId: string) =>
    createNotification({
      userId,
      type: 'system',
      title: 'Maintenance en cours',
      message: 'Searcher Connector est temporairement en maintenance. Nous revenons bientôt avec des améliorations!',
    }),
}
