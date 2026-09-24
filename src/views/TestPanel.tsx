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
import { useTranslation } from 'react-i18next'

export default function TestPanel() {
  const { t } = useTranslation()
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
        title: t('testPanelPage.notifHighScoreTitle'),
        message: t('testPanelPage.notifHighScoreMsg'),
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
      setResult(t('testPanelPage.notifCreated'))
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
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
      setResult(data.success ? t('testPanelPage.emailSent') : `${t('testPanelPage.error')} ${data.error}`)
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
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
        title: t('testPanelPage.notifLowCreditsTitle'),
        message: t('testPanelPage.notifLowCreditsMsg'),
        priority: 'medium',
        metadata: { remaining_credits: 12, test_mode: true }
      })

      if (error) throw error
      setResult(t('testPanelPage.notifCreatedSimple'))
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
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
      setResult(data.success ? `${t('testPanelPage.scanSimulated')} ${data.opportunities_count} ${t('testPanelPage.opportunitiesFound')}` : `${t('testPanelPage.error')} ${data.error}`)
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
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
        title: t('testPanelPage.notifExpirationTitle'),
        message: t('testPanelPage.notifExpirationMsg'),
        priority: 'high',
        metadata: { days_remaining: 3, test_mode: true }
      })

      if (error) throw error
      setResult(t('testPanelPage.notifCreatedSimple'))
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
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
      setResult(data.success ? t('testPanelPage.emailSent') : `${t('testPanelPage.error')} ${data.error}`)
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
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
        title: t('testPanelPage.notifUrgentTitle'),
        message: t('testPanelPage.notifUrgentMsg'),
        priority: 'urgent',
        metadata: {
          opportunity_id: 'test-urgent-456',
          match_score: 85,
          applicants_count: 1,
          test_mode: true
        }
      })

      if (error) throw error
      setResult(t('testPanelPage.notifCreatedSimple'))
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
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
        title: t('testPanelPage.notifPremiumTitle'),
        message: t('testPanelPage.notifPremiumMsg'),
        priority: 'high',
        metadata: { plan: 'PRO', test_mode: true }
      })

      if (error) throw error
      setResult(t('testPanelPage.notifCreatedSimple'))
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
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
        title: t('testPanelPage.notifProfileViewedTitle'),
        message: t('testPanelPage.notifProfileViewedMsg'),
        priority: 'low',
        metadata: { views_count: 12, ranking_percentile: 25, test_mode: true }
      })

      if (error) throw error
      setResult(t('testPanelPage.notifCreatedSimple'))
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Créer 50 opportunités factices dans le cache
  const populateTestOpportunities = async () => {
    setLoading(true)
    try {
      const testOpportunities = Array.from({ length: 50 }, (_, i) => ({
        title: `${t('testPanelPage.testMissionTitle')} ${i + 1}`,
        company: `${t('testPanelPage.testCompany')} ${i + 1}`,
        description: t('testPanelPage.testDesc', { n: i + 1 }),
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
      setResult(t('testPanelPage.testOppsCreated'))
    } catch (err: any) {
      setResult(`${t('testPanelPage.error')} ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#0A0A0A] text-white p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-[#D4AF37] mb-2'>{t('testPanelPage.pageTitle')}</h1>
          <p className='text-gray-400'>{t('testPanelPage.pageSubtitle')}</p>
        </div>

        {/* Email de test */}
        <Card className='mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Mail className='w-5 h-5 text-[#D4AF37]' />
            <h2 className='text-xl font-semibold'>{t('testPanelPage.emailConfig')}</h2>
          </div>
          <input
            type='email'
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder={t('testPanelPage.emailPlaceholder')}
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
            <h2 className='text-xl font-semibold'>{t('testPanelPage.inAppNotifs')}</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            <GoldButton onClick={testHighScoreNotif} loading={loading} fullWidth>
              {t('testPanelPage.btnHighScore')}
            </GoldButton>
            <GoldButton onClick={testUrgentMissionNotif} loading={loading} fullWidth variant='outlined'>
              {t('testPanelPage.btnUrgent')}
            </GoldButton>
            <GoldButton onClick={testLowCreditsNotif} loading={loading} fullWidth variant='outlined'>
              {t('testPanelPage.btnLowCredits')}
            </GoldButton>
            <GoldButton onClick={testExpirationNotif} loading={loading} fullWidth variant='outlined'>
              {t('testPanelPage.btnExpiration')}
            </GoldButton>
            <GoldButton onClick={testPremiumActivation} loading={loading} fullWidth variant='outlined'>
              {t('testPanelPage.btnPremiumActivated')}
            </GoldButton>
            <GoldButton onClick={testProfileViewedNotif} loading={loading} fullWidth variant='outlined'>
              {t('testPanelPage.btnProfileViewed')}
            </GoldButton>
          </div>
        </Card>

        {/* Tests Emails */}
        <Card className='mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Send className='w-5 h-5 text-[#D4AF37]' />
            <h2 className='text-xl font-semibold'>{t('testPanelPage.emailsResend')}</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <GoldButton onClick={testWelcomeEmail} loading={loading} fullWidth>
              {t('testPanelPage.btnWelcomeEmail')}
            </GoldButton>
            <GoldButton onClick={testWeeklyEmail} loading={loading} fullWidth variant='outlined'>
              {t('testPanelPage.btnWeeklyDigest')}
            </GoldButton>
          </div>
        </Card>

        {/* Tests Scan & Cache */}
        <Card className='mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Search className='w-5 h-5 text-[#D4AF37]' />
            <h2 className='text-xl font-semibold'>{t('testPanelPage.scanOpportunities')}</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <GoldButton onClick={testManualScan} loading={loading} fullWidth>
              {t('testPanelPage.btnManualScan')}
            </GoldButton>
            <GoldButton onClick={populateTestOpportunities} loading={loading} fullWidth variant='outlined'>
              {t('testPanelPage.btnCreateTestOpps')}
            </GoldButton>
          </div>
        </Card>

        {/* Légende */}
        <Card className='bg-[#1a1a1a] border-[#D4AF37]/20'>
          <h3 className='text-lg font-semibold mb-3 text-[#D4AF37]'>{t('testPanelPage.usageGuide')}</h3>
          <ul className='space-y-2 text-sm text-gray-300'>
            <li>• <strong>{t('testPanelPage.guideItem1Bold')}</strong> {t('testPanelPage.guideItem1')}</li>
            <li>• <strong>{t('testPanelPage.guideItem2Bold')}</strong> {t('testPanelPage.guideItem2')}</li>
            <li>• <strong>{t('testPanelPage.guideItem3Bold')}</strong> {t('testPanelPage.guideItem3')}</li>
            <li>• <strong>{t('testPanelPage.guideItem4Bold')}</strong> {t('testPanelPage.guideItem4')}</li>
            <li>• <strong>{t('testPanelPage.guideItem5Bold')}</strong> {t('testPanelPage.guideItem5')}</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
