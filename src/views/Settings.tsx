'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  User, Shield, Bot, Trash2, ArrowRight, Clock, Zap,
  Sun, Moon, Brain, MessageSquare, AlertTriangle, ChevronRight, Globe,
  Search, X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authFetch } from '../lib/authFetch'
import { SETTINGS_SECTIONS } from '../components/search/GlobalSearch'
import { isPaidPlan } from '../lib/planUtils'

// ── Toggle switch réutilisable ────────────────────────────────────
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => onChange(!value)} disabled={disabled}
      className={`w-12 h-6 rounded-full p-1 transition-colors disabled:opacity-50 ${value ? 'bg-[#D4AF37]' : 'bg-[#1A1A1A]'}`}>
      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { profile, user, refreshProfile } = useAuth()
  const router = useRouter()
  // Recherche dans les paramètres (?q=… pré-rempli depuis la recherche globale)
  const [settingsQuery, setSettingsQuery] = useState('')
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSettingsQuery(q)
    const hash = window.location.hash.slice(1)
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
  }, [])
  const foldText = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const sectionVisible = (id: string) => {
    const term = foldText(settingsQuery.trim())
    if (!term) return true
    const def = SETTINGS_SECTIONS.find(sec => sec.id === id)
    const text = def ? `${def.label} ${def.keywords}` : id === 'fondateur' ? 'fondateur founder admin' : 'liens conditions confidentialité support'
    return foldText(text).includes(term)
  }
  const noSettingsMatch = !!settingsQuery.trim() &&
    ![...SETTINGS_SECTIONS.map(sec => sec.id), 'fondateur', 'liens'].some(sectionVisible)
  // Extension navigateur + soumission ATS réelle — réservées Pro/Premium
  // (voir planConfig.ts extensionAccess), même règle que côté serveur.
  // isPaidPlan() (pas un check local) pour hériter du mode bêta — avant ce
  // correctif, ce check local ignorait BETA_FREE_FOR_ALL et bloquait
  // complètement l'extension pour les testeurs gratuits pendant la bêta.
  const isPaidUser = isPaidPlan(profile)
  const [loading, setLoading]           = useState(false)
  const [fullName, setFullName]         = useState('')
  const [bio, setBio]                   = useState('')
  const [domain, setDomain]             = useState('')
  const [domains, setDomains]           = useState<string[]>([])
  const [domainInput, setDomainInput]   = useState('')
  const [skills, setSkills]             = useState<string[]>([])
  const [skillInput, setSkillInput]     = useState('')
  const [assessingLevel, setAssessingLevel] = useState(false)
  const [country, setCountry]           = useState('')
  const [city, setCity]                 = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [githubUrl, setGithubUrl]       = useState('')
  const [linkedinUrl, setLinkedinUrl]   = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [responseTemplate, setResponseTemplate] = useState('')
  const [savedMsg, setSavedMsg]         = useState(false)
  const [agentSchedule, setAgentSchedule] = useState<any>(null)
  const [latestScan, setLatestScan]     = useState<any>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [extensionToken, setExtensionToken] = useState<string | null>(null)
  const [extensionTokenLoading, setExtensionTokenLoading] = useState(false)
  const [extensionTokenCopied, setExtensionTokenCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    authFetch('/api/extension/token').then(r => r.json()).then(d => setExtensionToken(d.token || null)).catch(() => {})
  }, [user])

  const generateExtensionToken = async () => {
    if (!user) return
    setExtensionTokenLoading(true)
    try {
      const r = await authFetch('/api/extension/token', { method: 'POST' })
      const d = await r.json()
      setExtensionToken(d.token || null)
    } catch { /* silencieux */ }
    setExtensionTokenLoading(false)
  }

  const revokeExtensionToken = async () => {
    if (!user) return
    setExtensionTokenLoading(true)
    try {
      await authFetch('/api/extension/token', { method: 'DELETE' })
      setExtensionToken(null)
    } catch { /* silencieux */ }
    setExtensionTokenLoading(false)
  }

  const copyExtensionToken = () => {
    if (!extensionToken) return
    navigator.clipboard.writeText(extensionToken)
    setExtensionTokenCopied(true)
    setTimeout(() => setExtensionTokenCopied(false), 2000)
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  // Synchroniser les inputs quand le profil charge (async).
  // Clé sur profile.id (pas profile en entier) : Supabase rafraîchit le
  // token automatiquement quand l'onglet reprend le focus, ce qui recrée
  // l'objet profile et déclenchait ce useEffect à CHAQUE retour d'onglet,
  // écrasant silencieusement tout ce que l'utilisateur venait de taper et
  // n'avait pas encore sauvegardé (ex: lien portfolio).
  const syncedProfileId = useRef<string | null>(null)
  useEffect(() => {
    if (!profile || syncedProfileId.current === profile.id) return
    syncedProfileId.current = profile.id
    setFullName(profile.full_name || '')
    setBio(profile.bio || '')
    setDomain((profile as any).domain || '')
    setDomains((profile as any).domains?.length ? (profile as any).domains : (profile as any).domain ? [(profile as any).domain] : [])
    setSkills((profile as any).skills || [])
    setCountry((profile as any).country || '')
    setCity((profile as any).city || '')
    setPortfolioUrl((profile as any).portfolio_url || '')
    setGithubUrl((profile as any).github_url || '')
    setLinkedinUrl((profile as any).linkedin_url || '')
    setWhatsappNumber((profile as any).whatsapp_number || '')
    setResponseTemplate((profile as any).response_template || '')
  }, [profile])

  // Préférences UI
  const [darkMode, setDarkMode]         = useState(false)
  const [scaiLearning, setScaiLearning] = useState(true)

  // Charger les préférences depuis localStorage
  useEffect(() => {
    // Thème par défaut : clair (turquoise + or). 'dark' = thème sombre historique.
    const saved = localStorage.getItem('sc_theme') === 'dark'
    setDarkMode(saved)
    document.documentElement.classList.toggle('dark-mode', saved)
    setScaiLearning(localStorage.getItem('sc_scai_learning') !== 'false')
  }, [])

  const toggleDarkMode = (val: boolean) => {
    setDarkMode(val)
    localStorage.setItem('sc_theme', val ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark-mode', val)
  }

  const toggleScaiLearning = async (val: boolean) => {
    setScaiLearning(val)
    localStorage.setItem('sc_scai_learning', String(val))
    if (user) {
      await supabase.from('users_profiles').update({
        search_preferences: { ...(profile?.search_preferences || {}), scai_learning: val }
      }).eq('id', user.id)
    }
  }

  useEffect(() => {
    if (!user) return
    const fetchAgentData = async () => {
      const [scheduleRes, scanRes] = await Promise.all([
        supabase.from('agent_schedules').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('agent_actions').select('*').eq('user_id', user.id)
          .eq('action_type', 'search_scan').order('created_at', { ascending: false }).limit(1).maybeSingle()
      ])
      setAgentSchedule(scheduleRes.data || null)
      setLatestScan(scanRes.data || null)
    }
    fetchAgentData()
  }, [user])

  const defaultScanTimes   = ['07:00', '13:00', '19:00']
  const isAutoScanEnabled  = (agentSchedule?.scan_times?.length || 0) > 0

  const toggleAutoScan = async () => {
    if (!user || !agentSchedule || agentLoading) return
    setAgentLoading(true)
    const nextScanTimes = isAutoScanEnabled ? [] : (agentSchedule.scan_times?.length ? agentSchedule.scan_times : defaultScanTimes)
    const { data, error } = await supabase.from('agent_schedules')
      .update({ scan_times: nextScanTimes }).eq('user_id', user.id).select().single()
    if (!error && data) setAgentSchedule(data)
    setAgentLoading(false)
  }

  // Auto-candidature réelle — désactivée par défaut. upsert (pas update) car
  // beaucoup de comptes n'ont encore aucune ligne agent_schedules.
  const toggleAutoApply = async () => {
    if (!user || agentLoading) return
    setAgentLoading(true)
    const { data, error } = await supabase.from('agent_schedules')
      .upsert({ user_id: user.id, auto_apply_enabled: !agentSchedule?.auto_apply_enabled }, { onConflict: 'user_id' })
      .select().single()
    if (!error && data) setAgentSchedule(data)
    setAgentLoading(false)
  }

  // Soumission ATS 100% autonome — désactivé par défaut. Quand actif,
  // SCAI remplit ET envoie réellement le formulaire Greenhouse/Lever sans
  // relecture ; désactivé, le message reste préparé mais jamais soumis
  // sans passer par la candidature en série ou l'extension.
  const toggleAtsAutoSubmit = async () => {
    if (!user || agentLoading) return
    setAgentLoading(true)
    const { data, error } = await supabase.from('agent_schedules')
      .upsert({ user_id: user.id, ats_auto_submit_no_review: !agentSchedule?.ats_auto_submit_no_review }, { onConflict: 'user_id' })
      .select().single()
    if (!error && data) setAgentSchedule(data)
    setAgentLoading(false)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { alert(t('settingsPage2.notConnected')); return }
    setLoading(true)
    setSavedMsg(false)
    try {
      // Appel API serveur avec service_role → bypass RLS total
      const res = await authFetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:         user.id,
          email:          user.email || '',
          full_name:      fullName.trim(),
          bio:            bio.trim(),
          domain:         domains[0] || domain.trim(),
          domains,
          skills,
          country:        country.trim(),
          city:           city.trim(),
          portfolio_url:  portfolioUrl.trim(),
          github_url:     githubUrl.trim(),
          linkedin_url:   linkedinUrl.trim(),
          whatsapp_number: whatsappNumber.trim(),
          response_template: responseTemplate.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        alert(`${t('settingsPage2.saveErrorPrefix')} ${data.error || res.statusText}`)
        return
      }
      await refreshProfile()
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    } catch (err: any) {
      alert(`${t('settingsPage2.networkErrorPrefix')} ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Envoyer un feedback/plainte
  const handleFeedback = async () => {
    if (!feedbackText.trim() || !user) return
    setFeedbackLoading(true)
    try {
      // Sauvegarder en DB
      await supabase.from('monitoring_events').insert({
        type:     'user_complaint',
        source:   'settings_feedback',
        message:  feedbackText,
        user_id:  user.id,
        severity: 'medium',
        resolved: false,
      })
      // Envoyer au monitoring
      await fetch('/api/monitoring', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:     'feedback',
          source:   'user_settings',
          message:  feedbackText,
          userId:   user.id,
          severity: 'low',
        }),
      })
      setFeedbackText('')
      setFeedbackSent(true)
      setTimeout(() => setFeedbackSent(false), 3000)
    } catch { /* silent */ } finally { setFeedbackLoading(false) }
  }

  // Accès fondateur via email
  const FOUNDER_EMAILS = [
    'biyostephane26@gmail.com',
    'stephanenana.pro@gmail.com',
    process.env.NEXT_PUBLIC_FOUNDER_EMAIL || '',
  ].filter(Boolean).map(e => e.toLowerCase())
  const isFounder = FOUNDER_EMAILS.includes((profile?.email || '').toLowerCase()) || profile?.role === 'founder'

  const latestScanLabel  = latestScan?.created_at
    ? new Date(latestScan.created_at).toLocaleString(i18n.language)
    : t('settingsPage2.noScanYet')
  const scheduleSummary  = agentSchedule
    ? `${t('settingsPage2.scheduleEvery', { h: agentSchedule.scan_frequency_hours })}${isAutoScanEnabled ? ` · ${agentSchedule.scan_times.join(', ')}` : ` ${t('settingsPage2.scheduleDisabled')}`}`
    : t('settingsPage2.scheduleUnavailable')

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">{t('settingsPage.title')}</h2>
        </header>

        <div className="p-6 lg:p-10 max-w-3xl mx-auto w-full space-y-10">

          <div className="relative -mb-4">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={settingsQuery}
              onChange={e => setSettingsQuery(e.target.value)}
              placeholder={t('settingsPage.searchSettingsPlaceholder')}
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl pl-10 pr-9 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/60"
              aria-label={t('settingsPage.searchSettingsAria')}
            />
            {settingsQuery && (
              <button onClick={() => setSettingsQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" aria-label={t('settingsPage.clear')}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {noSettingsMatch && (
            <p className="text-sm text-gray-500 text-center py-10">{t('settingsPage2.noSettingsMatch', { query: settingsQuery })}</p>
          )}

          {/* ── Profil ─────────────────────────────────────────── */}
          <section id="profil" hidden={!sectionVisible('profil')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <User className="w-4 h-4" /> {t('settingsPage2.profileSection')}
            </h3>
            <Card className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('settingsPage.fullName')}</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('settingsPage2.domainsLabel')}</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {domains.map((d, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-[#1A1500] border border-[#D4AF37]/30 text-[#D4AF37] text-xs px-3 py-1.5 rounded-full">
                          {d}
                          <button type="button" onClick={() => setDomains(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-white">×</button>
                        </span>
                      ))}
                    </div>
                    <input type="text" value={domainInput}
                      onChange={e => setDomainInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ',') && domainInput.trim() && domains.length < 2) {
                          e.preventDefault()
                          setDomains(prev => [...prev, domainInput.trim()])
                          setDomainInput('')
                        }
                      }}
                      disabled={domains.length >= 2}
                      placeholder={domains.length >= 2 ? t('settingsPage2.maxDomains') : t('settingsPage2.domainsPlaceholder')}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('settingsPage2.skillsLabel')}</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {skills.map((s, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-[#111] border border-[#2a2a2a] text-gray-300 text-xs px-3 py-1.5 rounded-full">
                          {s}
                          <button type="button" onClick={() => setSkills(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-white">×</button>
                        </span>
                      ))}
                    </div>
                    <input type="text" value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ',') && skillInput.trim() && skills.length < 15) {
                          e.preventDefault()
                          setSkills(prev => [...prev, skillInput.trim()])
                          setSkillInput('')
                        }
                      }}
                      disabled={skills.length >= 15}
                      placeholder={skills.length >= 15 ? t('settingsPage2.maxSkills') : t('settingsPage2.skillsPlaceholder')}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('settingsPage2.country')}</label>
                    <input type="text" value={country} onChange={e => setCountry(e.target.value)}
                      placeholder={t('settingsPage2.countryPlaceholder')}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('settingsPage.city')}</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                      placeholder={t('settingsPage2.cityPlaceholder')}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('settingsPage.bio')}</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                    placeholder={t('settingsPage2.bioPlaceholder')}
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none resize-none" />
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>{t('settingsPage2.charCount', { n: bio.length })}</span>
                    <span className={bio.length >= 50 ? 'text-green-400' : 'text-yellow-500'}>
                      {bio.length >= 50 ? t('settingsPage2.sufficient') : t('settingsPage2.moreCharsNeeded', { n: 50 - bio.length })}
                    </span>
                  </div>
                </div>
                <div className="space-y-4 pt-2 border-t border-[#2a2a2a]">
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('settingsPage.portfolio')}</label>
                      <input type="text" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)}
                        placeholder={t('settingsPage2.portfolioPlaceholder')}
                        className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">GitHub</label>
                      <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                        placeholder={t('settingsPage2.githubPlaceholder')}
                        className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">LinkedIn</label>
                      <input type="text" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                        placeholder={t('settingsPage2.linkedinPlaceholder')}
                        className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">WhatsApp</label>
                      <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                        placeholder={t('settingsPage2.whatsappPlaceholder')}
                        className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                      <p className="text-[10px] text-gray-600">{t('settingsPage2.whatsappHint')}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('settingsPage2.writeLikeMe')}</label>
                    <textarea value={responseTemplate} onChange={e => setResponseTemplate(e.target.value)}
                      placeholder={t('settingsPage2.writeLikeMePlaceholder')}
                      rows={4}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none resize-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GoldButton type="submit" loading={loading}>{t('settingsPage.save')}</GoldButton>
                  {savedMsg && <span className="text-xs text-green-400 font-bold">{t('settingsPage2.profileUpdated')}</span>}
                </div>
              </form>
            </Card>
          </section>

          {/* ── Apparence ──────────────────────────────────────── */}
          <section id="apparence" hidden={!sectionVisible('apparence')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Sun className="w-4 h-4" /> {t('settingsPage2.appearanceSection')}
            </h3>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="w-5 h-5 text-[#D4AF37]" /> : <Sun className="w-5 h-5 text-[#D4AF37]" />}
                  <div>
                    <div className="font-medium text-white text-sm">{darkMode ? t('settingsPage2.darkModeLabel') : t('settingsPage2.lightModeLabel')}</div>
                    <p className="text-xs text-gray-600">{t('settingsPage2.darkModeDesc')}</p>
                  </div>
                </div>
                <Toggle value={darkMode} onChange={toggleDarkMode} />
              </div>
            </Card>
          </section>

          {/* ── Langue ──────────────────────────────────────────── */}
          <section id="langue" hidden={!sectionVisible('langue')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Globe className="w-4 h-4" /> {t('settingsPage2.languageSection')}
            </h3>
            <Card className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-2">
                {[
                  { code: 'fr', label: 'Français' },
                  { code: 'en', label: 'English' },
                  { code: 'pt', label: 'Português' },
                  { code: 'es', label: 'Español' },
                  { code: 'de', label: 'Deutsch' },
                  { code: 'it', label: 'Italiano' },
                  { code: 'nl', label: 'Nederlands' },
                  { code: 'ru', label: 'Русский' },
                  { code: 'pl', label: 'Polski' },
                  { code: 'uk', label: 'Українська' },
                  { code: 'ro', label: 'Română' },
                  { code: 'el', label: 'Ελληνικά' },
                  { code: 'tr', label: 'Türkçe' },
                  { code: 'sv', label: 'Svenska' },
                  { code: 'ar', label: 'العربية' },
                  { code: 'he', label: 'עברית' },
                  { code: 'fa', label: 'فارسی' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'bn', label: 'বাংলা' },
                  { code: 'ur', label: 'اردو' },
                  { code: 'zh-CN', label: '中文' },
                  { code: 'ja', label: '日本語' },
                  { code: 'ko', label: '한국어' },
                  { code: 'vi', label: 'Tiếng Việt' },
                  { code: 'id', label: 'Bahasa Indonesia' },
                  { code: 'th', label: 'ไทย' },
                  { code: 'tl', label: 'Filipino' },
                  { code: 'sw', label: 'Kiswahili' },
                  { code: 'ha', label: 'Hausa' },
                  { code: 'am', label: 'አማርኛ' },
                  { code: 'yo', label: 'Yorùbá' },
                  { code: 'zu', label: 'isiZulu' },
                  { code: 'ig', label: 'Igbo' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`p-2 rounded-lg border transition-all text-xs ${
                      i18n.language === lang.code
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-[#2a2a2a] text-white hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <div className="font-medium truncate">{lang.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-4">
                {t('settingsPage2.languageNote')}
              </p>
            </Card>
          </section>

          {/* ── Niveau de compétence évalué ──────────────────────── */}
          <section id="niveau" hidden={!sectionVisible('niveau')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Brain className="w-4 h-4" /> {t('settingsPage2.skillLevelSection')}
            </h3>
            <Card className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-[#D4AF37] capitalize">{(profile as any)?.skill_level || t('settingsPage2.notYetAssessed')}</div>
                  <p className="text-xs text-gray-600 mt-1 max-w-md">
                    {(profile as any)?.skill_level_reasoning || t('settingsPage2.skillLevelDefaultReasoning')}
                  </p>
                </div>
                <GoldButton
                  variant="outlined"
                  loading={assessingLevel}
                  onClick={async () => {
                    if (!user) return
                    setAssessingLevel(true)
                    try {
                      await fetch('/api/profile/assess-skill-level', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id }),
                      })
                      await refreshProfile()
                    } finally {
                      setAssessingLevel(false)
                    }
                  }}
                >
                  {t('settingsPage2.reassess')}
                </GoldButton>
              </div>
            </Card>
          </section>

          {/* ── SCAI & IA ──────────────────────────────────────── */}
          <section id="scai" hidden={!sectionVisible('scai')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Brain className="w-4 h-4" /> {t('settingsPage2.scaiIntelligenceSection')}
            </h3>
            <Card className="p-5 space-y-4">
              {/* SCAI Learning */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">{t('settingsPage.conversationMemory')}</div>
                  <p className="text-xs text-gray-600 max-w-xs mt-0.5">{t('settingsPage2.conversationMemoryDesc')}</p>
                </div>
                <Toggle value={scaiLearning} onChange={toggleScaiLearning} />
              </div>
              <div className="border-t border-[#1A1A1A] pt-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">{t('settingsPage.conversationHistory')}</div>
                  <p className="text-xs text-gray-600 mt-0.5">{scaiLearning ? t('settingsPage2.conversationsKept') : t('settingsPage2.conversationsNotKept')}</p>
                </div>
                <Link href="/agent" className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1">
                  {t('settingsPage2.view')} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          </section>

          {/* ── SCAI Cowork ─────────────────────────────────── */}
          <section id="cowork" hidden={!sectionVisible('cowork')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Bot className="w-4 h-4" /> SCAI Cowork
            </h3>
            <Card className="p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="font-bold text-white mb-1">{t('settingsPage.commandCenter')}</div>
                  <p className="text-xs text-gray-500">{t('settingsPage.commandCenterDesc')}</p>
                </div>
                <Link href="/agent" className="inline-flex items-center gap-2 text-sm font-bold text-[#D4AF37] hover:text-[#F5E6A3] transition-colors">
                  {t('settingsPage2.openAgent')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                    <Clock className="w-3 h-3 text-[#D4AF37]" /> {t('settingsPage2.planning')}
                  </div>
                  <div className="text-sm font-semibold text-white">{scheduleSummary}</div>
                  <p className="text-xs text-gray-600 mt-1">{t('settingsPage2.autoApplyThreshold', { n: agentSchedule?.auto_apply_threshold ?? '--' })}</p>
                </div>
                <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                    <Zap className="w-3 h-3 text-[#D4AF37]" /> {t('settingsPage2.lastScan')}
                  </div>
                  <div className="text-sm font-semibold text-white">{latestScanLabel}</div>
                  <p className="text-xs text-gray-600 mt-1">{latestScan?.result?.slice(0, 60) || t('settingsPage2.waitingFirstScan')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                <div>
                  <div className="font-medium text-white text-sm">{t('settingsPage.autoScan')}</div>
                  <p className="text-xs text-gray-600">{t('settingsPage.autoScanDesc')}</p>
                </div>
                <Toggle value={isAutoScanEnabled} onChange={toggleAutoScan} disabled={!agentSchedule || agentLoading} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#D4AF37]/30 bg-[#0D0D0D] p-4">
                <div>
                  <div className="font-medium text-white text-sm">{t('settingsPage2.autoDraftedApps')}</div>
                  <p className="text-xs text-gray-600">
                    {t('settingsPage2.autoDraftedAppsDesc', { threshold: agentSchedule?.auto_apply_threshold ?? 80 })}
                  </p>
                </div>
                <Toggle value={!!agentSchedule?.auto_apply_enabled} onChange={toggleAutoApply} disabled={agentLoading} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-900/40 bg-[#0D0D0D] p-4">
                <div>
                  <div className="font-medium text-white text-sm">{t('settingsPage2.atsAutoSubmitTitle')}</div>
                  <p className="text-xs text-gray-600">
                    {t('settingsPage2.atsAutoSubmitDesc')}
                    {!isPaidUser && <span className="text-[#D4AF37]">{t('settingsPage2.atsAutoSubmitPaidOnly')}</span>}
                  </p>
                </div>
                <Toggle value={!!agentSchedule?.ats_auto_submit_no_review} onChange={toggleAtsAutoSubmit} disabled={agentLoading || !isPaidUser} />
              </div>
            </Card>
          </section>

          {/* ── Extension navigateur ────────────────────────────────── */}
          <section id="extension" hidden={!sectionVisible('extension')} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">{t('settingsPage.browserExtension')}</h2>
            <Card className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                {t('settingsPage2.extensionDesc')}
              </p>

              {isPaidUser ? (
                <div className="bg-[#111] border border-[#1A1A1A] rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t('settingsPage.installation')}</p>
                  <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
                    <li>
                      <a href="/downloads/searcher-connector-extension.zip" download
                        className="text-[#D4AF37] hover:underline font-medium">{t('settingsPage.downloadExtension')}</a> {t('settingsPage.downloadExtensionSuffix')}
                    </li>
                    <li>{t('settingsPage.devModeStepPrefix')} <code className="bg-black px-1.5 py-0.5 rounded text-[10px]">chrome://extensions</code> {t('settingsPage.devModeStepSuffix')}</li>
                    <li>{t('settingsPage.loadUnpacked')}</li>
                    <li>{t('settingsPage.pasteToken')}</li>
                  </ol>
                </div>
              ) : (
                <div className="bg-[#1A1500] border border-[#D4AF37]/20 rounded-xl p-4 flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-400">{t('settingsPage.upgradeExtension')}</p>
                  <GoldButton onClick={() => router.push('/pricing')}>{t('settingsPage.viewPlans')}</GoldButton>
                </div>
              )}

              {isPaidUser && (extensionToken ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-[#D4AF37] truncate">
                      {extensionToken}
                    </code>
                    <button onClick={copyExtensionToken}
                      className="px-3 py-2 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] rounded-lg">
                      {extensionTokenCopied ? t('settingsPage2.copied') : t('settingsPage2.copy')}
                    </button>
                  </div>
                  <button onClick={generateExtensionToken} disabled={extensionTokenLoading}
                    className="text-xs text-gray-500 hover:text-white">
                    {t('settingsPage2.regenerateToken')}
                  </button>
                  <span className="mx-2 text-gray-700">·</span>
                  <button onClick={revokeExtensionToken} disabled={extensionTokenLoading}
                    className="text-xs text-red-500 hover:text-red-400">
                    {t('settingsPage2.revoke')}
                  </button>
                </div>
              ) : (
                <GoldButton onClick={generateExtensionToken} loading={extensionTokenLoading}>
                  {t('settingsPage2.generateToken')}
                </GoldButton>
              ))}
            </Card>
          </section>

          {/* ── Sécurité ───────────────────────────────────────── */}
          <section id="securite" hidden={!sectionVisible('securite')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Shield className="w-4 h-4" /> {t('settingsPage2.securitySection')}
            </h3>
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">{t('settingsPage.changePassword')}</div>
                  <p className="text-xs text-gray-600">{t('settingsPage.changePasswordDesc')}</p>
                </div>
                <Link href="/login?reset=true" className="text-xs text-[#D4AF37] hover:underline">{t('settingsPage2.resetPassword')}</Link>
              </div>
            </Card>
          </section>

          {/* ── Feedback & Retour d'expérience ─────────────────── */}
          <section id="feedback" hidden={!sectionVisible('feedback')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> {t('settingsPage2.feedbackSection')}
            </h3>
            <Card className="p-5 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                {t('settingsPage2.feedbackIntro')}
              </p>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder={t('settingsPage2.feedbackPlaceholder')}
                rows={3}
                className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none resize-none focus:border-[#D4AF37]"
              />
              <div className="flex items-center gap-3">
                <GoldButton onClick={handleFeedback} loading={feedbackLoading} disabled={!feedbackText.trim()}>
                  {t('settingsPage2.sendFeedback')}
                </GoldButton>
                {feedbackSent && <span className="text-xs text-green-400">{t('settingsPage2.feedbackSentMsg')}</span>}
              </div>
            </Card>
          </section>

          {/* ── Fondateur — accès spécial ──────────────────────── */}
          {isFounder && (
            <section id="fondateur" hidden={!sectionVisible('fondateur')} className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.3em] text-[#D4AF37] uppercase flex items-center gap-2">
                {t('settingsPage2.founderAccessTitle')}
              </h3>
              <Card className="p-5 bg-[#1A1500] border-[#D4AF37]/30 space-y-3">
                {[
                  { label: t('settingsPage2.founderDashboard'),   href: '/founder',              desc: t('settingsPage2.founderDashboardDesc') },
                  { label: t('settingsPage2.founderMonitoring'),      href: '/founder?tab=monitor',  desc: t('settingsPage2.founderMonitoringDesc') },
                  { label: t('settingsPage2.founderAllProfiles'),       href: '/founder?tab=users',    desc: t('settingsPage2.founderAllProfilesDesc') },
                  { label: t('settingsPage2.founderChats'),     href: '/founder?tab=chats',    desc: t('settingsPage2.founderChatsDesc') },
                  { label: t('settingsPage2.founderRevenue'),    href: '/founder?tab=revenue',  desc: t('settingsPage2.founderRevenueDesc') },
                ].map(item => (
                  <Link key={item.href} href={item.href}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#D4AF37]/10 transition-colors group">
                    <div>
                      <div className="text-sm font-bold text-[#D4AF37] group-hover:text-[#F5E6A3]">{item.label}</div>
                      <div className="text-xs text-gray-600">{item.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#D4AF37]/50 group-hover:text-[#D4AF37]" />
                  </Link>
                ))}
              </Card>
            </section>
          )}

          {/* ── Danger Zone ────────────────────────────────────── */}
          <section id="danger" hidden={!sectionVisible('danger')} className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-red-500 uppercase flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> {t('settingsPage2.dangerZoneSection')}
            </h3>
            <Card className="p-5 border-red-900/50 bg-red-900/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-white mb-0.5">{t('settingsPage.deleteAccount')}</div>
                <p className="text-xs text-gray-500">{t('settingsPage2.deleteAccountDesc')}</p>
              </div>
              <button className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                {t('settingsPage2.deleteBtn')}
              </button>
            </Card>
          </section>

          {/* ── Liens ──────────────────────────────────────────── */}
          <section id="liens" hidden={!sectionVisible('liens')} className="space-y-3 border-t border-[#1A1A1A] pt-6">
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <Link href="/guide" className="text-[#D4AF37] hover:underline">{t('settingsPage2.guideLink')}</Link>
              <span className="text-gray-700">·</span>
              <button onClick={() => { localStorage.removeItem('sc_tour_completed_v1'); window.location.href = '/dashboard' }}
                className="text-gray-500 hover:text-white transition-colors">{t('settingsPage2.replayTour')}</button>
              <span className="text-gray-700">·</span>
              <Link href="/support" className="text-gray-500 hover:text-white transition-colors">{t('settingsPage2.supportLink')}</Link>
              <span className="text-gray-700">·</span>
              <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">{t('settingsPage2.privacyLink')}</Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
