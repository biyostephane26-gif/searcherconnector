// =================================================================
// SEARCHER CONNECTOR — TEST PANEL (FOUNDER ONLY)
// Simuler notifications, emails, scans, etc. sans attendre
// =================================================================

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import GoldButton from '@/components/ui/GoldButton'
import { Bell, Mail, Search, Zap, Database, Send, Users, DollarSign } from 'lucide-react'

export default function TestPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [testEmail, setTestEmail] = useState('biyostephane26@gmail.com')

  // Simuler notification "Nouvelle opportunité high score"
  const testHighScoreNotif = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('notifications').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type: 'high_score_opportunity',
        title: '🎯 Mission parfaite pour vous !',
        message: 'Développeur React Senior — 95% de match — Seulement 2 postulants — $8000/mois',
        priority: 'high',
        metadata: {
          opportunity_id: 'test-opp-123',
          match_score: 95,
          applicants_count: 2,
          salary: 8000,
          test_mode: true
        }
      })

      if (error) throw error
      setResult('✅ Notification créée ! Vérifie ta barre de notifications.')
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler email hebdomadaire
  const testWeeklyEmail = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/send-weekly-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, test_mode: true })
      })

      const data = await response.json()
      setResult(data.success ? '✅ Email envoyé !' : `❌ ${data.error}`)
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler notification "Crédits faibles"
  const testLowCreditsNotif = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type: 'low_credits',
        title: '⚠️ Crédits vocaux faibles',
        message: 'Il vous reste 12 crédits SCAI Voice (20%). Rechargez maintenant.',
        priority: 'medium',
        metadata: { remaining_credits: 12, test_mode: true }
      })

      if (error) throw error
      setResult('✅ Notification créée !')
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler scan manuel
  const testManualScan = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/manual-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_mode: true })
      })

      const data = await response.json()
      setResult(data.success ? `✅ Scan simulé ! ${data.opportunities_count} opportunités trouvées` : `❌ ${data.error}`)
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler expiration abonnement
  const testExpirationNotif = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type: 'subscription_expiring',
        title: '⏰ Votre abonnement expire bientôt',
        message: 'Votre plan PRO expire dans 3 jours. Renouvelez maintenant pour conserver vos avantages.',
        priority: 'high',
        metadata: { days_remaining: 3, test_mode: true }
      })

      if (error) throw error
      setResult('✅ Notification créée !')
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler email de bienvenue
  const testWelcomeEmail = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, test_mode: true })
      })

      const data = await response.json()
      setResult(data.success ? '✅ Email envoyé !' : `❌ ${data.error}`)
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler notification "Mission urgente"
  const testUrgentMissionNotif = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type: 'urgent_opportunity',
        title: '🔥 Mission urgente — 85% match',
        message: 'Designer UI/UX — Démarrage immédiat — $5000 — 1 postulant',
        priority: 'urgent',
        metadata: {
          opportunity_id: 'test-urgent-456',
          match_score: 85,
          applicants_count: 1,
          test_mode: true
        }
      })

      if (error) throw error
      setResult('✅ Notification créée !')
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler activation plan premium
  const testPremiumActivation = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type: 'plan_activated',
        title: '🎉 Plan PRO activé !',
        message: 'Votre plan PRO est maintenant actif. Profitez de toutes les fonctionnalités premium.',
        priority: 'high',
        metadata: { plan: 'PRO', test_mode: true }
      })

      if (error) throw error
      setResult('✅ Notification créée !')
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler notification "Profile vu"
  const testProfileViewedNotif = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type: 'profile_viewed',
        title: '👀 Votre profil a été consulté',
        message: '12 recruteurs ont vu votre profil cette semaine. Vous êtes dans le top 25% !',
        priority: 'low',
        metadata: { views_count: 12, ranking_percentile: 25, test_mode: true }
      })

      if (error) throw error
      setResult('✅ Notification créée !')
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Créer 50 opportunités factices dans le cache
  const populateTestOpportunities = async () => {
    setLoading(true)
    try {
      const testOpportunities = Array.from({ length: 50 }, (_, i) => ({
        title: `Test Mission ${i + 1}`,
        company: `Entreprise Test ${i + 1}`,
        description: `Description de test pour la mission ${i + 1}. React, TypeScript, Node.js required.`,
        category: ['tech', 'design', 'marketing'][i % 3],
        location: ['Remote', 'Paris', 'Cameroun'][i % 3],
        salary_min: 3000 + (i * 100),
        salary_max: 5000 + (i * 100),
        currency: 'USD',
        contract_type: ['CDI', 'CDD', 'Freelance'][i % 3],
        source_name: 'Test',
        source_url: `https://test.com/job-${i + 1}`,
        freshness_score: 100 - (i * 2),
        is_expired: false,
        posted_date: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }))

      const { error } = await supabase.from('cache_opportunities').insert(testOpportunities)

      if (error) throw error
      setResult('✅ 50 opportunités de test créées !')
    } catch (err: any) {
      setResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#0A0A0A] text-white p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-[#D4AF37] mb-2'>🧪 Test Panel — Founder Only</h1>
          <p className='text-gray-400'>Simulez tous les scénarios de l'application sans attendre</p>
        </div>

        {/* Email de test */}
        <Card className='mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Mail className='w-5 h-5 text-[#D4AF37]' />
            <h2 className='text-xl font-semibold'>Configuration Email</h2>
          </div>
          <input
            type='email'
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder='Email pour les tests'
            className='w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white'
          />
        </Card>

        {/* Résultat */}
        {result && (
          <Card className='mb-6 bg-[#1a1a1a]'>
            <p className='text-sm'>{result}</p>
          </Card>
        )}

        {/* Tests Notifications */}
        <Card className='mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Bell className='w-5 h-5 text-[#D4AF37]' />
            <h2 className='text-xl font-semibold'>Notifications In-App</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            <GoldButton onClick={testHighScoreNotif} loading={loading} fullWidth>
              🎯 Mission High Score
            </GoldButton>
            <GoldButton onClick={testUrgentMissionNotif} loading={loading} fullWidth variant='outlined'>
              🔥 Mission Urgente
            </GoldButton>
            <GoldButton onClick={testLowCreditsNotif} loading={loading} fullWidth variant='outlined'>
              ⚠️ Crédits Faibles
            </GoldButton>
            <GoldButton onClick={testExpirationNotif} loading={loading} fullWidth variant='outlined'>
              ⏰ Expiration Abonnement
            </GoldButton>
            <GoldButton onClick={testPremiumActivation} loading={loading} fullWidth variant='outlined'>
              🎉 Plan Activé
            </GoldButton>
            <GoldButton onClick={testProfileViewedNotif} loading={loading} fullWidth variant='outlined'>
              👀 Profil Vu
            </GoldButton>
          </div>
        </Card>

        {/* Tests Emails */}
        <Card className='mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Send className='w-5 h-5 text-[#D4AF37]' />
            <h2 className='text-xl font-semibold'>Emails via Resend</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <GoldButton onClick={testWelcomeEmail} loading={loading} fullWidth>
              📧 Email Bienvenue
            </GoldButton>
            <GoldButton onClick={testWeeklyEmail} loading={loading} fullWidth variant='outlined'>
              📊 Résumé Hebdomadaire
            </GoldButton>
          </div>
        </Card>

        {/* Tests Scan & Cache */}
        <Card className='mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Search className='w-5 h-5 text-[#D4AF37]' />
            <h2 className='text-xl font-semibold'>Scan & Opportunités</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <GoldButton onClick={testManualScan} loading={loading} fullWidth>
              🔍 Scan Manuel (Simulé)
            </GoldButton>
            <GoldButton onClick={populateTestOpportunities} loading={loading} fullWidth variant='outlined'>
              💼 Créer 50 Opportunités Test
            </GoldButton>
          </div>
        </Card>

        {/* Légende */}
        <Card className='bg-[#1a1a1a] border-[#D4AF37]/20'>
          <h3 className='text-lg font-semibold mb-3 text-[#D4AF37]'>📖 Guide d'utilisation</h3>
          <ul className='space-y-2 text-sm text-gray-300'>
            <li>• <strong>Notifications In-App :</strong> Créées instantanément, vérifiez la cloche en haut à droite</li>
            <li>• <strong>Emails :</strong> Envoyés via Resend, vérifiez votre boîte mail</li>
            <li>• <strong>Scan Simulé :</strong> Déclenche un scan sans attendre, génère des résultats factices</li>
            <li>• <strong>Opportunités Test :</strong> Remplit le cache avec 50 missions pour tester le matching</li>
            <li>• <strong>Mode Test :</strong> Toutes les actions ont un flag test_mode=true dans la DB</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
