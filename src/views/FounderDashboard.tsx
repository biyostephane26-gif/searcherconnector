
// =================================================================
// SEARCHER CONNECTOR — FOUNDER DASHBOARD
// Panneau d'administration complet
// =================================================================

'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import GoldButton from '@/components/ui/GoldButton'
import { getAllServicesStats } from '@/lib/api-key-manager'
import { 
  Database, Users, Zap, Shield, Bell, Lock, Unlock, 
  Settings, ToggleLeft, ToggleRight, Clock, Plus, Minus,
  Activity, Globe, CheckCircle, AlertTriangle, Mail, RefreshCw,
  Server, TrendingUp, FileText, Filter
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function FounderDashboard() {
  const { t, i18n } = useTranslation()

  const getProfessionalLevel = (missionsCount: number = 0) => {
    if (missionsCount >= 25) return { label: t('founderDashboardPage.levelExpert'), color: 'text-purple-400 bg-purple-900/30 border-purple-700/30' }
    if (missionsCount >= 10) return { label: t('founderDashboardPage.levelSenior'), color: 'text-blue-400 bg-blue-900/30 border-blue-700/30' }
    if (missionsCount >= 3) return { label: t('founderDashboardPage.levelMid'), color: 'text-green-400 bg-green-900/30 border-green-700/30' }
    return { label: t('founderDashboardPage.levelJunior'), color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' }
  }

  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Settings toggles
  const [freeScanEnabled, setFreeScanEnabled] = useState(true)
  const [paidScanEnabled, setPaidScanEnabled] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  
  // User status change
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [statusExpiry, setStatusExpiry] = useState<number>(0) // heures avant expiration
  const [showStatusModal, setShowStatusModal] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    
    // Charger les stats
    const [cacheCount, scraperSessions, users, alerts, opportunities, mongoStats, dedup] = await Promise.all([
      supabase.from('cache_opportunities').select('count', { count: 'exact' }),
      supabase.from('scraper_sessions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('users_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('founder_alerts').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('cache_opportunities').select('*').order('created_at', { ascending: false }).limit(100),
      // MongoDB telemetry (simulé avec supabase pour l'instant)
      supabase.from('cache_opportunities').select('source, created_at').order('created_at', { ascending: false }).limit(1000),
      // Stats déduplication
      supabase.from('scraper_sessions').select('duplicates_removed, opportunities_found').order('created_at', { ascending: false }).limit(10),
    ])
    
    // Calcul sources actives
    const sourcesList = mongoStats.data || []
    const uniqueSources = new Set(sourcesList.map((s: any) => s.source))
    const last24h = sourcesList.filter((s: any) => {
      const diff = Date.now() - new Date(s.created_at).getTime()
      return diff < 24 * 60 * 60 * 1000
    })
    const uniqueSources24h = new Set(last24h.map((s: any) => s.source))
    
    // Calcul déduplication
    const totalDuplicates = (dedup.data || []).reduce((sum: number, s: any) => sum + (s.duplicates_removed || 0), 0)
    const totalFound = (dedup.data || []).reduce((sum: number, s: any) => sum + (s.opportunities_found || 0), 0)
    const dedupRate = totalFound > 0 ? ((totalDuplicates / totalFound) * 100).toFixed(1) : '0'

    setStats({
      cache: cacheCount.count,
      sessions: scraperSessions.data || [],
      users: users.data || [],
      alerts: alerts.data || [],
      opportunities: opportunities.data || [],
      apiStats: getAllServicesStats(),
      sourcesTotal: uniqueSources.size,
      sources24h: uniqueSources24h.size,
      deduplication: {
        totalDuplicates,
        totalFound,
        rate: dedupRate,
      },
    })
    
    setLoading(false)
  }

  const activatePlan = async (userId: string, plan: string, expiryHours: number = 0) => {
    const updateData: any = { plan }
    
    // Si expiration définie, calculer la date
    if (expiryHours > 0) {
      const expiryDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
      updateData.plan_expiry = expiryDate.toISOString()
    } else {
      updateData.plan_expiry = null // Pas d'expiration
    }
    
    await supabase.from('users_profiles').update(updateData).eq('id', userId)
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'plan_activated',
      title: t('founderDashboardPage.notifPlanActivatedTitle'),
      message: t('founderDashboardPage.notifPlanActivatedMsg', { plan, hours: expiryHours > 0 ? t('founderDashboardPage.forHours', { h: expiryHours }) : '' }),
    })
    alert(t('founderDashboardPage.planActivatedAlert', { plan, expiry: expiryHours > 0 ? t('founderDashboardPage.expiresIn', { h: expiryHours }) : t('founderDashboardPage.permanent') }))
    setShowStatusModal(false)
    loadDashboardData()
  }

  const updateUserTokens = async (userId: string, delta: number) => {
    const user = stats.users.find((u: any) => u.id === userId)
    if (!user) return
    const newTokens = Math.max(0, (user.tokens || 0) + delta)
    await supabase.from('users_profiles').update({ tokens: newTokens }).eq('id', userId)
    alert(t('founderDashboardPage.tokensUpdated', { n: newTokens }))
    loadDashboardData()
  }

  const testEmailAlert = async () => {
    const confirmed = confirm('Envoyer un email de test pour vérifier les alertes ?')
    if (!confirmed) return
    
    try {
      const res = await fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })
      if (res.ok) {
        alert('✅ Email de test envoyé ! Vérifie ta boîte.')
      } else {
        alert('❌ Erreur lors de l\'envoi.')
      }
    } catch {
      alert('❌ Erreur de connexion.')
    }
  }

  const toggleScan = async (type: 'free' | 'paid') => {
    if (type === 'free') {
      setFreeScanEnabled(!freeScanEnabled)
      await supabase.from('app_settings').upsert({ key: 'FREE_SCAN_ENABLED', value: String(!freeScanEnabled) })
      alert(`Scan gratuit ${!freeScanEnabled ? 'ACTIVÉ ✅' : 'DÉSACTIVÉ ❌'}`)
    } else {
      setPaidScanEnabled(!paidScanEnabled)
      await supabase.from('app_settings').upsert({ key: 'PAID_SCAN_ENABLED', value: String(!paidScanEnabled) })
      alert(`Scan payant ${!paidScanEnabled ? 'ACTIVÉ ✅' : 'DÉSACTIVÉ ❌'}`)
    }
  }

  if (loading) return <div className='p-8 text-white'>{t('founderDashboardPage.loading')}</div>

  return (
    <div className='min-h-screen bg-[#0A0A0A] text-white p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Maintenance Banner */}
        {maintenanceMode && (
          <div className='mb-8 p-4 bg-red-950 border-2 border-red-700 rounded-xl flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <AlertTriangle className='text-red-400' size={24} />
              <div>
                <h3 className='font-bold text-red-300'>{t('founderDashboardPage.maintenanceEnabledTitle')}</h3>
                <p className='text-sm text-red-400'>{t('founderDashboardPage.maintenanceEnabledDesc')}</p>
              </div>
            </div>
            <button 
              onClick={() => setMaintenanceMode(false)}
              className='px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-bold'
            >
              {t('founderDashboardPage.deactivate')}
            </button>
          </div>
        )}

        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-3xl font-bold'>{t('founderDashboardPage.title')}</h1>
            <p className='text-gray-400'>{t('founderDashboardPage.subtitle')}</p>
          </div>
          <GoldButton onClick={loadDashboardData}>{t('founderDashboardPage.refresh')}</GoldButton>
        </div>

        {/* Tabs */}
        <div className='flex gap-4 mb-8 border-b border-[#2A2A2A] pb-4 flex-wrap'>
          {[
            { id: 'overview', label: t('founderDashboardPage.tabOverview'), icon: <Activity size={16} /> },
            { id: 'settings', label: t('founderDashboardPage.tabSettings'), icon: <Settings size={16} /> },
            { id: 'scraper', label: t('founderDashboardPage.tabScraper'), icon: <Database size={16} /> },
            { id: 'users', label: t('founderDashboardPage.tabUsers'), icon: <Users size={16} /> },
            { id: 'opportunities', label: t('founderDashboardPage.tabOpportunities'), icon: <Zap size={16} /> },
            { id: 'api', label: t('founderDashboardPage.tabApi'), icon: <Globe size={16} /> },
            { id: 'alerts', label: t('founderDashboardPage.tabAlerts'), icon: <Bell size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className='space-y-6'>
            {/* Stats Row */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.cachedOpportunities')}</h3>
                <p className='text-3xl font-bold text-[#D4AF37]'>{stats.cache}</p>
              </Card>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.scrapingSessions')}</h3>
                <p className='text-3xl font-bold'>{stats.sessions.length}</p>
              </Card>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.activeSources24h')}</h3>
                <p className='text-3xl font-bold text-green-400'>{stats.sources24h || 0} / {stats.sourcesTotal || 0}</p>
              </Card>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.dedupRate')}</h3>
                <p className='text-3xl font-bold text-blue-400'>{stats.deduplication?.rate || 0}%</p>
              </Card>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.users')}</h3>
                <p className='text-3xl font-bold'>{stats.users.length}</p>
              </Card>
            </div>

            {/* MongoDB & Sources Monitoring */}
            <Card className='p-6'>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-xl font-bold flex items-center gap-2'>
                  <Database className='text-[#D4AF37]' size={24} />
                  {t('founderDashboardPage.mongoMonitoring')}
                </h2>
                <GoldButton onClick={loadDashboardData} size='sm'>
                  <RefreshCw size={14} />
                </GoldButton>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                  <div className='flex items-center gap-3 mb-2'>
                    <Server className='text-green-400' size={20} />
                    <h3 className='font-bold'>{t('founderDashboardPage.freeRssSources')}</h3>
                  </div>
                  <p className='text-2xl font-bold text-green-400'>2000+</p>
                  <p className='text-xs text-gray-500'>{t('founderDashboardPage.queriedEvery')}</p>
                </div>
                <div className='p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                  <div className='flex items-center gap-3 mb-2'>
                    <Globe className='text-blue-400' size={20} />
                    <h3 className='font-bold'>{t('founderDashboardPage.paidApiSources')}</h3>
                  </div>
                  <p className='text-2xl font-bold text-blue-400'>201</p>
                  <p className='text-xs text-gray-500'>LinkedIn, Indeed, Glassdoor, etc.</p>
                </div>
                <div className='p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                  <div className='flex items-center gap-3 mb-2'>
                    <Activity className='text-[#D4AF37]' size={20} />
                    <h3 className='font-bold'>{t('founderDashboardPage.activeSources24hLabel')}</h3>
                  </div>
                  <p className='text-2xl font-bold text-[#D4AF37]'>{stats.sources24h || 0}</p>
                  <p className='text-xs text-gray-500'>{t('founderDashboardPage.sourcesReturnedData')}</p>
                </div>
              </div>
            </Card>

            {/* Déduplication Stats */}
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
                <Filter className='text-purple-400' size={20} />
                {t('founderDashboardPage.smartDedup')}
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                  <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.opportunitiesFound')}</h3>
                  <p className='text-2xl font-bold'>{stats.deduplication?.totalFound || 0}</p>
                </div>
                <div className='p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                  <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.duplicatesRemoved')}</h3>
                  <p className='text-2xl font-bold text-red-400'>{stats.deduplication?.totalDuplicates || 0}</p>
                </div>
                <div className='p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                  <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.dedupRateLabel')}</h3>
                  <p className='text-2xl font-bold text-purple-400'>{stats.deduplication?.rate || 0}%</p>
                </div>
              </div>
            </Card>

            {/* Quick Settings */}
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4'>{t('founderDashboardPage.quickControls')}</h2>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='font-medium'>{t('founderDashboardPage.freeScan')}</h3>
                      <p className='text-xs text-gray-500'>{t('founderDashboardPage.toggleOnOff')}</p>
                    </div>
                    <button
                      onClick={() => toggleScan('free')}
                      className='text-4xl'
                    >
                      {freeScanEnabled ? <ToggleRight className='text-green-500' /> : <ToggleLeft className='text-gray-600' />}
                    </button>
                  </div>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='font-medium'>{t('founderDashboardPage.paidScan')}</h3>
                      <p className='text-xs text-gray-500'>{t('founderDashboardPage.toggleOnOff')}</p>
                    </div>
                    <button
                      onClick={() => toggleScan('paid')}
                      className='text-4xl'
                    >
                      {paidScanEnabled ? <ToggleRight className='text-green-500' /> : <ToggleLeft className='text-gray-600' />}
                    </button>
                  </div>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='font-medium'>{t('founderDashboardPage.maintenanceMode')}</h3>
                      <p className='text-xs text-gray-500'>{t('founderDashboardPage.usersMessage')}</p>
                    </div>
                    <button
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className='text-4xl'
                    >
                      {maintenanceMode ? <ToggleRight className='text-red-500' /> : <ToggleLeft className='text-gray-600' />}
                    </button>
                  </div>
                </div>
                <div className='space-y-3'>
                  <GoldButton onClick={testEmailAlert} fullWidth size='sm'>
                    <Mail size={14} className='mr-2' />
                    {t('founderDashboardPage.testEmailAlertBtn')}
                  </GoldButton>
                </div>
              </div>
            </Card>

            {/* Recent Sessions */}
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
                <TrendingUp className='text-[#D4AF37]' size={20} />
                {t('founderDashboardPage.scrapingLogs')}
              </h2>
              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {stats.sessions.map((session: any) => {
                  const isFresh = Date.now() - new Date(session.created_at).getTime() < 60 * 60 * 1000 // < 1h
                  return (
                    <div key={session.id} className='flex items-center justify-between p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <p className='font-medium'>
                            {new Date(session.created_at).toLocaleString(i18n.language)}
                          </p>
                          {isFresh && (
                            <span className='px-2 py-0.5 bg-green-900/30 text-green-400 text-[10px] font-bold rounded uppercase'>
                              {t('founderDashboardPage.ultraFresh')}
                            </span>
                          )}
                        </div>
                        <p className='text-sm text-gray-400'>
                          {session.opportunities_found || 0} {t('founderDashboardPage.found')} · {session.opportunities_added || 0} {t('founderDashboardPage.added')} · {session.duplicates_removed || 0} {t('founderDashboardPage.duplicates')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        session.status === 'completed' ? 'bg-green-900 text-green-400' :
                        session.status === 'failed' ? 'bg-red-900 text-red-400' :
                        'bg-yellow-900 text-yellow-400'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className='space-y-6'>
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-6'>Paramètres Généraux</h2>
              
              <div className='space-y-8'>
                <div className='border-b border-[#2A2A2A] pb-6'>
                  <h3 className='font-bold mb-4 flex items-center gap-2'>
                    <Zap size={20} className='text-[#D4AF37]' />
                    Contrôles du Scan
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='p-4 bg-[#111] rounded-xl border border-[#2A2A2A]'>
                      <div className='flex items-center justify-between mb-3'>
                        <div>
                          <h4 className='font-medium'>Scan Gratuit</h4>
                          <p className='text-xs text-gray-500'>Pour les utilisateurs Free</p>
                        </div>
                        <button
                          onClick={() => setFreeScanEnabled(!freeScanEnabled)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold ${
                            freeScanEnabled 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          {freeScanEnabled ? <Unlock size={16} /> : <Lock size={16} />}
                          {' '}{freeScanEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                        </button>
                      </div>
                    </div>
                    <div className='p-4 bg-[#111] rounded-xl border border-[#2A2A2A]'>
                      <div className='flex items-center justify-between mb-3'>
                        <div>
                          <h4 className='font-medium'>Scan Payant</h4>
                          <p className='text-xs text-gray-500'>Pour les utilisateurs Premium</p>
                        </div>
                        <button
                          onClick={() => setPaidScanEnabled(!paidScanEnabled)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold ${
                            paidScanEnabled 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          {paidScanEnabled ? <Unlock size={16} /> : <Lock size={16} />}
                          {' '}{paidScanEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='border-b border-[#2A2A2A] pb-6'>
                  <h3 className='font-bold mb-4 flex items-center gap-2'>
                    <Shield size={20} className='text-red-500' />
                    Mode Maintenance
                  </h3>
                  <div className='p-4 bg-[#111] rounded-xl border border-[#2A2A2A]'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <h4 className='font-medium'>{t('founderDashboardPage.enableMaintenanceMode')}</h4>
                        <p className='text-xs text-gray-500'>{t('founderDashboardPage.allUsersWillSee')}</p>
                      </div>
                      <button
                        onClick={() => setMaintenanceMode(!maintenanceMode)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold ${
                          maintenanceMode 
                            ? 'bg-red-900 text-red-300' 
                            : 'bg-gray-800 text-gray-500'
                        }`}
                      >
                        {maintenanceMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'scraper' && (
          <div className='space-y-6'>
            {/* Stats Row */}
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.cachedOpportunities')}</h3>
                <p className='text-3xl font-bold text-[#D4AF37]'>{stats.cache}</p>
              </Card>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.totalSessions')}</h3>
                <p className='text-3xl font-bold'>{stats.sessions.length}</p>
              </Card>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.sourcesQueried')}</h3>
                <p className='text-3xl font-bold'>200+</p>
              </Card>
              <Card className='p-6'>
                <h3 className='text-sm text-gray-400 mb-2'>{t('founderDashboardPage.apiSources')}</h3>
                <p className='text-3xl font-bold'>21</p>
              </Card>
            </div>

            {/* Scraper Sessions */}
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4'>{t('founderDashboardPage.scrapingSessions')}</h2>
              <div className='space-y-3'>
                {stats.sessions.map((session: any) => (
                  <div key={session.id} className='flex items-center justify-between p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                    <div>
                      <p className='font-medium'>
                        {new Date(session.created_at).toLocaleString(i18n.language)}
                      </p>
                      <p className='text-sm text-gray-400'>
                        {session.opportunities_found} {t('founderDashboardPage.found')} · {session.opportunities_added} {t('founderDashboardPage.added')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      session.status === 'completed' ? 'bg-green-900 text-green-400' :
                      session.status === 'failed' ? 'bg-red-900 text-red-400' :
                      'bg-yellow-900 text-yellow-400'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <Card className='p-6'>
            <h2 className='text-xl font-bold mb-4'>{t('founderDashboardPage.userManagement')}</h2>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-gray-400 border-b border-[#2A2A2A]'>
                    <th className='text-left py-3'>{t('founderDashboardPage.email')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.type')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.plan')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.level')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.tokens')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.status')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.users.map((user: any) => (
                    <tr key={user.id} className='border-b border-[#1A1A1A]'>
                      <td className='py-3'>{user.email}</td>
                      <td className='py-3'>{user.profile_type}</td>
                      <td className='py-3'>
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.plan === 'enterprise' ? 'bg-purple-900 text-purple-300' :
                          user.plan === 'pro' ? 'bg-blue-900 text-blue-300' :
                          user.plan === 'starter' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-gray-800 text-gray-300'
                        }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className='py-3'>
                        <span className={`px-2 py-1 rounded text-xs border ${
                          getProfessionalLevel(user.missions_completed || 0).color
                        }`}>
                          {getProfessionalLevel(user.missions_completed || 0).label}
                        </span>
                      </td>
                      <td className='py-3'>
                        <div className='flex items-center gap-2'>
                          <span>{user.tokens || 0}</span>
                          <button 
                            onClick={() => updateUserTokens(user.id, -10)}
                            className='text-red-500 hover:text-red-400'
                          >
                            <Minus size={14} />
                          </button>
                          <button 
                            onClick={() => updateUserTokens(user.id, 10)}
                            className='text-green-500 hover:text-green-400'
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className='py-3'>{user.verification_status}</td>
                      <td className='py-3 space-x-2'>
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowStatusModal(true)
                          }}
                          className='bg-[#D4AF37] text-black px-3 py-1 rounded text-xs font-bold hover:bg-[#F5E6A3]'
                        >
                          {t('founderDashboardPage.changePlan')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'opportunities' && (
          <Card className='p-6'>
            <h2 className='text-xl font-bold mb-4'>{t('founderDashboardPage.recentOpportunities')}</h2>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-gray-400 border-b border-[#2A2A2A]'>
                    <th className='text-left py-3'>{t('founderDashboardPage.titleCol')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.source')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.location')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.date')}</th>
                    <th className='text-left py-3'>{t('founderDashboardPage.ultraFresh')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.opportunities.map((opp: any) => (
                    <tr key={opp.id} className='border-b border-[#1A1A1A]'>
                      <td className='py-3 font-medium'>{opp.title}</td>
                      <td className='py-3 text-gray-400'>{opp.source}</td>
                      <td className='py-3 text-gray-400'>{opp.location}</td>
                      <td className='py-3 text-gray-400'>
                        {opp.created_at ? new Date(opp.created_at).toLocaleDateString(i18n.language) : 'N/A'}
                      </td>
                      <td className='py-3'>
                        {opp.is_ultra_fresh ? (
                          <CheckCircle className='text-green-500' size={16} />
                        ) : (
                          <span className='text-gray-600'>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'api' && (
          <Card className='p-6'>
            <h2 className='text-xl font-bold mb-4'>{t('founderDashboardPage.apiAndQuotas')}</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {Object.entries(stats.apiStats).map(([service, data]: [string, any]) => (
                <div key={service} className='p-4 bg-[#111] rounded-lg border border-[#2A2A2A]'>
                  <div className='flex items-center justify-between mb-3'>
                    <h3 className='font-bold capitalize'>{service}</h3>
                    <span className='text-xs text-gray-400'>
                      {t('founderDashboardPage.key')} {data.activeKeyIndex + 1}/{data.totalKeys}
                    </span>
                  </div>
                  <div className='mb-2'>
                    <div className='flex justify-between text-xs text-gray-400 mb-1'>
                      <span>{t('founderDashboardPage.usage')}</span>
                      <span>{data.usagePercent}%</span>
                    </div>
                    <div className='h-2 bg-[#2A2A2A] rounded-full overflow-hidden'>
                      <div 
                        className={`h-full transition-all ${
                          data.usagePercent >= 80 ? 'bg-red-500' :
                          data.usagePercent >= 50 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(data.usagePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className='text-xs text-gray-500'>
                    {data.totalKeys} {t('founderDashboardPage.keysAvailable')}
                  </p>
                </div>
              ))}
            </div>

            <div className='mt-8 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg'>
              <h3 className='font-bold text-yellow-300 mb-2'>{t('founderDashboardPage.zeroCostStrategy')}</h3>
              <ul className='text-sm text-yellow-100 space-y-1'>
                <li>• {t('founderDashboardPage.strategyItem1')}</li>
                <li>• {t('founderDashboardPage.strategyItem2')}</li>
                <li>• {t('founderDashboardPage.strategyItem3')}</li>
              </ul>
            </div>
          </Card>
        )}

        {activeTab === 'alerts' && (
          <Card className='p-6'>
            <h2 className='text-xl font-bold mb-4'>{t('founderDashboardPage.founderAlerts')}</h2>
            <div className='space-y-3'>
              {stats.alerts.map((alert: any) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${
                  alert.severity === 'critical' ? 'bg-red-950 border-red-800' :
                  alert.severity === 'error' ? 'bg-red-900/20 border-red-800' :
                  alert.severity === 'warning' ? 'bg-yellow-900/20 border-yellow-800' :
                  'bg-[#111] border-[#2A2A2A]'
                }`}>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-bold'>{alert.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      alert.severity === 'critical' ? 'bg-red-600' :
                      alert.severity === 'error' ? 'bg-red-500' :
                      alert.severity === 'warning' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className='text-gray-300 text-sm mb-2'>{alert.message}</p>
                  <p className='text-xs text-gray-500'>
                    {new Date(alert.created_at).toLocaleString(i18n.language)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}


      {/* Modal changement statut avec expiration */}
      {showStatusModal && selectedUser && (
        <div className='fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4'>
          <div className='bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-8 w-full max-w-md space-y-5'>
            <h3 className='text-lg font-bold text-white'>
              Changer le plan de {selectedUser.email}
            </h3>
            <p className='text-sm text-gray-400'>
              Plan actuel: <span className='text-[#D4AF37] font-bold'>{selectedUser.plan}</span>
            </p>
            
            <div className='space-y-3'>
              <label className='text-xs font-bold text-gray-400 uppercase'>{t('founderDashboardPage.newPlan')}</label>
              <select
                id='newPlan'
                className='w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-3 text-white'
              >
                <option value='free'>Free</option>
                <option value='starter'>Starter</option>
                <option value='pro'>Pro</option>
              </select>
            </div>

            <div className='space-y-3'>
              <label className='text-xs font-bold text-gray-400 uppercase'>
                {t('founderDashboardPage.expirationOptional')}
              </label>
              <input
                type='number'
                value={statusExpiry}
                onChange={(e) => setStatusExpiry(Number(e.target.value))}
                placeholder={t('founderDashboardPage.expirationPlaceholder')}
                className='w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-3 text-white'
              />
              <p className='text-xs text-gray-500'>
                {t('founderDashboardPage.expirationHint')}
              </p>
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => setShowStatusModal(false)}
                className='flex-1 py-2.5 text-sm text-gray-500 border border-[#2A2A2A] rounded-xl hover:border-[#444]'
              >
                {t('founderDashboardPage.cancel')}
              </button>
              <GoldButton
                onClick={() => {
                  const select = document.getElementById('newPlan') as HTMLSelectElement
                  activatePlan(selectedUser.id, select.value, statusExpiry)
                }}
                className='flex-1'
              >
                {t('founderDashboardPage.activate')}
              </GoldButton>
            </div>
          </div>
        </div>
      )}
