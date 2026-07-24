'use client'
// =================================================================
// PAGE FONDATEUR — Accès exclusif biyostephane26@gmail.com
// Dashboard complet : monitoring, profils, conversations, revenus
// =================================================================

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import {
  Users, MessageSquare, AlertTriangle, DollarSign,
  CheckCircle, XCircle, Shield, Zap, Eye, Ban,
  RefreshCw, Loader2, Search, ChevronDown, ChevronUp,
  Server, Globe, Activity, Filter, Database, Mail,
  TrendingUp, Clock, Lock, Unlock, ToggleLeft, ToggleRight,
  Plus, Minus
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ── Composant croissance utilisateurs ────────────────────────────
function UserGrowthChart() {
  const [growth, setGrowth] = useState<any[]>([])
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    const fetchGrowth = async () => {
      const { data } = await supabase
        .from('users_profiles')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (!data) return
      setTotalUsers(data.length)

      // Agréger par semaine
      const byWeek: Record<string, number> = {}
      data.forEach(u => {
        const d = new Date(u.created_at)
        const week = `${d.getFullYear()}-S${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7).toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}`
        byWeek[week] = (byWeek[week] || 0) + 1
      })

      let cumul = 0
      const chartData = Object.entries(byWeek)
        .sort(([a],[b]) => a.localeCompare(b))
        .map(([week, count]) => {
          cumul += count
          return { week: week.slice(5), total: cumul, new: count }
        })

      setGrowth(chartData)
    }
    fetchGrowth()
  }, [])

  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white">Croissance utilisateurs</h3>
        <div className="text-2xl font-black text-[#D4AF37]">{totalUsers} <span className="text-xs text-gray-500 font-normal">total</span></div>
      </div>
      {growth.length > 0 ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
              <XAxis dataKey="week" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '8px' }} itemStyle={{ color: '#D4AF37' }} />
              <Line type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="new" stroke="#22C55E" strokeWidth={1.5} dot={false} name="Nouveaux" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-gray-600 text-sm text-center py-8">Pas encore de données de croissance.</p>
      )}
    </Card>
  )
}

const TABS = [
  { id: 'monitor',   label: '🚨 Monitoring',       icon: AlertTriangle },
  { id: 'telemetry', label: '📊 MongoDB/Sources',  icon: Shield },
  { id: 'scans',     label: '🔄 Scans & Logs',     icon: RefreshCw },
  { id: 'users',     label: '👥 Utilisateurs',     icon: Users },
  { id: 'chats',     label: '💬 Conversations',    icon: MessageSquare },
  { id: 'revenue',   label: '💰 Revenus',          icon: DollarSign },
]

export default function Founder() {
  const { profile, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams?.get('tab') || 'monitor')
  const [loading, setLoading] = useState(false)

  // Monitoring
  const [events, setEvents]   = useState<any[]>([])
  // Telemetry
  const [sourcesStats, setSourcesStats] = useState<any>(null)
  const [scanSessions, setScanSessions] = useState<any[]>([])
  const [freeScanEnabled, setFreeScanEnabled] = useState(true)
  const [paidScanEnabled, setPaidScanEnabled] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  // Users
  const [users, setUsers]     = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [statusExpiry, setStatusExpiry] = useState(0)
  const [showStatusModal, setShowStatusModal] = useState(false)
  // Conversations
  const [chats, setChats]     = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any>(null)
  // Revenue
  const [payments, setPayments] = useState<any[]>([])

  const FOUNDER_EMAILS = [
    'biyostephane26@gmail.com',
    'stephanenana.pro@gmail.com',
    process.env.NEXT_PUBLIC_FOUNDER_EMAIL || '',
  ].filter(Boolean).map(e => e.toLowerCase())

  const isFounder = FOUNDER_EMAILS.includes((profile?.email || '').toLowerCase()) || profile?.role === 'founder'

  useEffect(() => {
    if (authLoading) return // attendre que le profil soit chargé avant de juger
    if (!isFounder) { router.replace('/dashboard'); return }
    loadTab(tab)
  }, [tab, isFounder, authLoading])

  const loadTab = async (t: string) => {
    setLoading(true)
    try {
      if (t === 'monitor') {
        const res = await fetch('/api/monitoring?limit=50')
        const data = await res.json()
        setEvents(data.events || [])
      }
      if (t === 'telemetry') {
        // Charger vraies stats MongoDB/sources depuis API dédiée
        const res = await fetch('/api/founder/telemetry', {
          headers: {
            'Authorization': `Bearer ${user?.id}`
          }
        })
        
        if (res.ok) {
          const data = await res.json()
          setSourcesStats(data.summary)
          setScanSessions(data.recentSessions || [])
        } else {
          console.error('Erreur chargement télémétrie:', await res.text())
        }
        
        // Settings
        const settingsData = await supabase.from('app_settings').select('*').in('key', ['FREE_SCAN_ENABLED', 'PAID_SCAN_ENABLED', 'MAINTENANCE_MODE'])
        settingsData.data?.forEach((s: any) => {
          if (s.key === 'FREE_SCAN_ENABLED') setFreeScanEnabled(s.value === 'true')
          if (s.key === 'PAID_SCAN_ENABLED') setPaidScanEnabled(s.value === 'true')
          if (s.key === 'MAINTENANCE_MODE') setMaintenanceMode(s.value === 'true')
        })
      }
      if (t === 'scans') {
        const { data } = await supabase.from('scraper_sessions').select('*').order('created_at', { ascending: false }).limit(100)
        setScanSessions(data || [])
      }
      if (t === 'users') {
        const { data } = await supabase.from('users_profiles').select('*').order('created_at', { ascending: false }).limit(100)
        setUsers(data || [])
      }
      if (t === 'chats') {
        // Charger les sessions SCAI depuis MongoDB via API
        const res = await fetch('/api/scai/all-sessions')
        const data = await res.json()
        setChats(data.sessions || [])
      }
      if (t === 'revenue') {
        const { data } = await supabase.from('payment_attempts').select('*').order('created_at', { ascending: false }).limit(100)
        setPayments(data || [])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const resolveEvent = async (id: string) => {
    await supabase.from('monitoring_events').update({ resolved: true }).eq('id', id)
    setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e))
  }

  const updateUserPlan = async (userId: string, plan: string, expiryHours: number = 0) => {
    const updateData: any = { plan }
    
    if (expiryHours > 0) {
      const expiryDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
      updateData.plan_expiry = expiryDate.toISOString()
    } else {
      updateData.plan_expiry = null
    }
    
    const { error } = await supabase.from('users_profiles').update(updateData).eq('id', userId)
    if (error) {
      alert(`❌ Erreur: ${error.message}`)
      return
    }
    
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'plan_activated',
      title: 'Plan activé',
      message: `Ton plan ${plan} est maintenant actif${expiryHours > 0 ? ` pour ${expiryHours}h` : ''}.`,
    })
    
    // Rafraîchir la liste ET le state local immédiatement
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan, plan_expiry: updateData.plan_expiry } : u))
    setShowStatusModal(false)
    
    // Recharger depuis DB pour être sûr
    loadTab('users')
    alert(`✅ Plan ${plan} activé${expiryHours > 0 ? ` (expire dans ${expiryHours}h)` : ' (permanent)'}`)
  }

  const updateUserStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from('users_profiles').update({ verification_status: status }).eq('id', userId)
    if (error) {
      alert(`❌ Erreur changement statut: ${error.message}`)
      return
    }
    
    // Rafraîchir immédiatement
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, verification_status: status } : u))
    
    // Recharger depuis DB pour confirmation
    loadTab('users')
    alert(`✅ Statut changé en ${status.toUpperCase()}`)
  }
  
  // Nouvelle fonction: Activer plan 1 mois facilement
  const activatePlan1Month = async (userId: string, plan: string) => {
    if (!confirm(`Activer le plan ${plan.toUpperCase()} pour 1 mois (30 jours) ?`)) return
    await updateUserPlan(userId, plan, 720) // 30 jours = 720 heures
  }

  // Nouvelle fonction: Toggle scan modes
  const toggleScanMode = async (mode: 'free' | 'paid', enabled: boolean) => {
    const key = mode === 'free' ? 'FREE_SCAN_ENABLED' : 'PAID_SCAN_ENABLED'
    
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value: enabled.toString() }, { onConflict: 'key' })
    
    if (error) {
      alert(`❌ Erreur: ${error.message}`)
      return
    }
    
    if (mode === 'free') {
      setFreeScanEnabled(enabled)
    } else {
      setPaidScanEnabled(enabled)
    }
    
    alert(`✅ Scan ${mode} ${enabled ? 'activé' : 'désactivé'}`)
  }

  // Nouvelle fonction: Toggle maintenance mode
  const toggleMaintenanceMode = async (enabled: boolean) => {
    if (!confirm(`${enabled ? 'ACTIVER' : 'DÉSACTIVER'} le mode maintenance ? ${enabled ? 'Les utilisateurs verront un message de maintenance.' : ''}`)) return
    
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'MAINTENANCE_MODE', value: enabled.toString() }, { onConflict: 'key' })
    
    if (error) {
      alert(`❌ Erreur: ${error.message}`)
      return
    }
    
    setMaintenanceMode(enabled)
    alert(`✅ Mode maintenance ${enabled ? 'activé' : 'désactivé'}`)
  }

  const updateUserTokens = async (userId: string, delta: number) => {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const newTokens = Math.max(0, (user.tokens || 0) + delta)
    await supabase.from('users_profiles').update({ tokens: newTokens }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, tokens: newTokens } : u))
    alert(`Tokens mis à jour : ${newTokens}`)
  }

  const toggleScan = async (type: 'free' | 'paid' | 'maintenance') => {
    if (type === 'free') {
      const newValue = !freeScanEnabled
      setFreeScanEnabled(newValue)
      await supabase.from('app_settings').upsert({ key: 'FREE_SCAN_ENABLED', value: String(newValue) })
      alert(`Scan gratuit ${newValue ? 'ACTIVÉ ✅' : 'DÉSACTIVÉ ❌'}`)
    } else if (type === 'paid') {
      const newValue = !paidScanEnabled
      setPaidScanEnabled(newValue)
      await supabase.from('app_settings').upsert({ key: 'PAID_SCAN_ENABLED', value: String(newValue) })
      alert(`Scan payant ${newValue ? 'ACTIVÉ ✅' : 'DÉSACTIVÉ ❌'}`)
    } else {
      const newValue = !maintenanceMode
      setMaintenanceMode(newValue)
      await supabase.from('app_settings').upsert({ key: 'MAINTENANCE_MODE', value: String(newValue) })
      alert(`Mode maintenance ${newValue ? 'ACTIVÉ 🔴' : 'DÉSACTIVÉ ✅'}`)
    }
  }

  const testEmailAlert = async () => {
    if (!confirm('Envoyer un email de test ?')) return
    try {
      const res = await fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })
      if (res.ok) alert('✅ Email de test envoyé !')
      else alert('❌ Erreur lors de l\'envoi')
    } catch {
      alert('❌ Erreur de connexion')
    }
  }

  const [chatBlocked, setChatBlocked] = useState<string[]>([])

  const blockChat = async (userId: string) => {
    await supabase.from('users_profiles').update({ scai_blocked: true }).eq('id', userId)
    setChatBlocked(prev => [...prev, userId])
  }

  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.domain?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const severityColor = (s: string) => ({
    low:      'text-yellow-400 bg-yellow-400/10',
    medium:   'text-orange-400 bg-orange-400/10',
    high:     'text-red-400 bg-red-400/10',
    critical: 'text-red-500 bg-red-500/20 font-bold',
  }[s] || 'text-gray-400 bg-gray-400/10')

  if (authLoading) return null
  if (!isFounder) return null

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-[#D4AF37] font-black text-lg">🔱</span>
            <h2 className="text-lg font-bold text-white">Dashboard Fondateur</h2>
          </div>
          <button onClick={() => loadTab(tab)} className="p-2 text-gray-500 hover:text-[#D4AF37] transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#1A1A1A] overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t.id ? 'text-[#D4AF37] border-[#D4AF37]' : 'text-gray-600 border-transparent hover:text-gray-400'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-7xl mx-auto w-full">

          {/* ── MONITORING ──────────────────────────────────── */}
          {tab === 'monitor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold">Événements système</h3>
                <span className="text-xs text-gray-500">{events.filter(e => !e.resolved).length} non résolus</span>
              </div>
              {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" /></div>
              : events.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun événement — tout fonctionne bien.</p>
                </Card>
              ) : events.map(e => (
                <Card key={e.id} className={`p-4 ${e.resolved ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${severityColor(e.severity)}`}>
                          {e.severity}
                        </span>
                        <span className="text-[10px] text-gray-600 uppercase">{e.type} · {e.source}</span>
                        <span className="text-[10px] text-gray-700 ml-auto">
                          {new Date(e.created_at).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{e.message}</p>
                      {e.user_id && <p className="text-xs text-gray-600 mt-1">User: {e.user_id.slice(0, 12)}</p>}
                    </div>
                    {!e.resolved && (
                      <button onClick={() => resolveEvent(e.id)}
                        className="text-xs text-green-400 hover:text-green-300 border border-green-400/30 px-3 py-1 rounded-lg flex-shrink-0">
                        Résoudre
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ── TELEMETRY - MONGODB & SOURCES ──────────────── */}
          {tab === 'telemetry' && (
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : (
                <>
                  {/* Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Server className="text-purple-400" size={20} />
                        <h3 className="font-bold text-white">Registre configuré</h3>
                      </div>
                      <p className="text-3xl font-bold text-purple-400">
                        {sourcesStats?.totalConfiguredSources?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {sourcesStats?.totalConfiguredFreeSources || 0} gratuites · {sourcesStats?.totalConfiguredPaidSources || 0} premium — interrogées par rotation, pas toutes en même temps
                      </p>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Server className="text-green-400" size={20} />
                        <h3 className="font-bold text-white">Sources gratuites ayant livré</h3>
                      </div>
                      <p className="text-3xl font-bold text-green-400">
                        {sourcesStats?.freeSources || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Actives: {sourcesStats?.activeSources || 0} | Erreurs: {sourcesStats?.errorSources || 0}
                      </p>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="text-blue-400" size={20} />
                        <h3 className="font-bold text-white">Sources payantes ayant livré</h3>
                      </div>
                      <p className="text-3xl font-bold text-blue-400">
                        {sourcesStats?.paidSources || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">sur {sourcesStats?.totalConfiguredPaidSources || 0} configurées (LinkedIn, Upwork, Indeed...)</p>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Activity className="text-[#D4AF37]" size={20} />
                        <h3 className="font-bold text-white">Opportunités totales</h3>
                      </div>
                      <p className="text-3xl font-bold text-[#D4AF37]">
                        {sourcesStats?.totalOpportunitiesFound?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Scans réussis: {sourcesStats?.successfulScans || 0}
                      </p>
                    </Card>
                  </div>

                  {/* Toggle Controls */}
                  <Card className="p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-[#D4AF37]" />
                      Contrôles système
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">Scan mode gratuit</p>
                          <p className="text-xs text-gray-500">Scans automatiques pour utilisateurs free</p>
                        </div>
                        <button
                          onClick={() => toggleScanMode('free', !freeScanEnabled)}
                          className={`p-2 rounded-lg transition-colors ${
                            freeScanEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                          }`}
                        >
                          {freeScanEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">Scan mode payant</p>
                          <p className="text-xs text-gray-500">Scans automatiques pour utilisateurs premium</p>
                        </div>
                        <button
                          onClick={() => toggleScanMode('paid', !paidScanEnabled)}
                          className={`p-2 rounded-lg transition-colors ${
                            paidScanEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                          }`}
                        >
                          {paidScanEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">Mode maintenance</p>
                          <p className="text-xs text-gray-500">Bloquer toutes les actions utilisateurs</p>
                        </div>
                        <button
                          onClick={() => toggleMaintenanceMode(!maintenanceMode)}
                          className={`p-2 rounded-lg transition-colors ${
                            maintenanceMode ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-500'
                          }`}
                        >
                          {maintenanceMode ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ── SCANS & LOGS ───────────────────────────────── */}
          {tab === 'scans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold">Logs de Scraping (100 dernières sessions)</h3>
                <span className="text-xs text-gray-500">{scanSessions.length} sessions</span>
              </div>
              {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" /></div>
              : scanSessions.length === 0 ? (
                <Card className="p-12 text-center">
                  <Database className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Aucune session de scan enregistrée.</p>
                </Card>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {scanSessions.map((session: any) => {
                    const isFresh = Date.now() - new Date(session.created_at).getTime() < 60 * 60 * 1000 // < 1h
                    return (
                      <Card key={session.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-white text-sm">
                                {new Date(session.created_at).toLocaleString('fr-FR')}
                              </p>
                              {isFresh && (
                                <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-[10px] font-bold rounded uppercase">
                                  Ultra Frais
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              {session.opportunities_found || 0} trouvées · {session.opportunities_added || 0} ajoutées · {session.duplicates_removed || 0} doublons
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
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── UTILISATEURS ────────────────────────────────── */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Rechercher par nom, email, domaine..."
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#D4AF37] outline-none" />
              </div>
              <div className="text-xs text-gray-600">{filteredUsers.length} profils</div>
              {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" /></div>
              : filteredUsers.map(u => (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#D4AF37] font-bold text-sm overflow-hidden">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.full_name?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{u.full_name || 'Sans nom'}</div>
                        <div className="text-xs text-gray-500">{u.email} · {u.country}</div>
                        <div className="text-xs text-gray-600">{u.domain} · {u.profile_type}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {/* Plan avec bouton 1 mois */}
                      <div className="flex items-center gap-2">
                        <select value={u.plan || 'free'} onChange={e => updateUserPlan(u.id, e.target.value)}
                          className="text-xs bg-[#0D0D0D] border border-[#2a2a2a] text-white rounded px-2 py-1 outline-none">
                          {['free','pro','premium'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <button
                          onClick={() => activatePlan1Month(u.id, u.plan || 'pro')}
                          className="px-2 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold rounded hover:bg-[#D4AF37]/30"
                          title="Activer ce plan pour 1 mois"
                        >
                          1M
                        </button>
                      </div>
                      {/* Statut */}
                      <select value={u.verification_status || 'pending'} onChange={e => updateUserStatus(u.id, e.target.value)}
                        className="text-xs bg-[#0D0D0D] border border-[#2a2a2a] text-white rounded px-2 py-1 outline-none">
                        {['pending','verified','genius','refused'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {/* Afficher expiration si existe */}
                      {u.plan_expiry && new Date(u.plan_expiry) > new Date() && (
                        <span className="text-[9px] text-gray-600">
                          Expire: {new Date(u.plan_expiry).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ── CONVERSATIONS ────────────────────────────────── */}
          {tab === 'chats' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Conversations SCAI — modération et contrôle qualité.</p>
              {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" /></div>
              : chats.length === 0 ? (
                <Card className="p-12 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Aucune conversation disponible.</p>
                </Card>
              ) : chats.map((c: any) => (
                <Card key={c.userId} className="overflow-hidden">
                  <button onClick={() => setSelectedChat(selectedChat?.userId === c.userId ? null : c)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#111] transition-colors">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">{c.userId}</div>
                        <div className="text-xs text-gray-500">{c.messageCount} messages · Dernière activité : {c.lastActive ? new Date(c.lastActive).toLocaleDateString('fr-FR') : 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); blockChat(c.userId) }}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 px-2 py-1 rounded-lg">
                        <Ban className="w-3 h-3" />
                      </button>
                      {selectedChat?.userId === c.userId ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>
                  {selectedChat?.userId === c.userId && (
                    <div className="border-t border-[#1A1A1A] p-4 max-h-80 overflow-y-auto space-y-3">
                      {(c.messages || []).filter((m: any) => m.role !== 'system').slice(-20).map((m: any, i: number) => (
                        <div key={i} className={`text-xs ${m.role === 'user' ? 'text-blue-300' : 'text-gray-400'}`}>
                          <span className="font-bold text-gray-600 uppercase mr-2">{m.role === 'user' ? 'User' : 'SCAI'}</span>
                          {m.content?.slice(0, 200)}{(m.content?.length || 0) > 200 ? '...' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* ── REVENUS ─────────────────────────────────────── */}
          {tab === 'revenue' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Total paiements', value: payments.length },
                  { label: 'Confirmés', value: payments.filter(p => p.status === 'completed').length },
                  { label: 'En attente', value: payments.filter(p => p.status === 'pending_manual').length },
                ].map(s => (
                  <Card key={s.label} className="p-4 text-center">
                    <div className="text-2xl font-bold text-[#D4AF37]">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </Card>
                ))}
              </div>

              {/* Croissance utilisateurs au fil du temps */}
              <UserGrowthChart />

              {loading
                ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" /></div>
                : payments.map(p => (
                  <Card key={p.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{p.plan?.toUpperCase()} — {p.amount?.toLocaleString()} {p.currency}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {p.user_id?.slice(0, 12)} · {p.method} · {new Date(p.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'completed' ? 'text-green-400 bg-green-400/10' :
                          p.status === 'pending_manual' ? 'text-yellow-400 bg-yellow-400/10' :
                          'text-gray-400 bg-gray-400/10'
                        }`}>{p.status}</span>
                        {p.status === 'pending_manual' && (
                          <button onClick={async () => {
                            await supabase.from('users_profiles').update({ plan: p.plan }).eq('id', p.user_id)
                            await supabase.from('payment_attempts').update({ status: 'completed', activated_at: new Date().toISOString() }).eq('id', p.id)
                            setPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: 'completed' } : x))
                          }} className="text-xs text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-lg hover:bg-[#D4AF37]/10">
                            Activer ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              }
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
