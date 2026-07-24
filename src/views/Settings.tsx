'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  User, Shield, Bot, Trash2, ArrowRight, Clock, Zap,
  Sun, Moon, Brain, MessageSquare, AlertTriangle, ChevronRight, Globe
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
    fetch(`/api/extension/token?userId=${user.id}`).then(r => r.json()).then(d => setExtensionToken(d.token || null)).catch(() => {})
  }, [user])

  const generateExtensionToken = async () => {
    if (!user) return
    setExtensionTokenLoading(true)
    try {
      const r = await fetch('/api/extension/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const d = await r.json()
      setExtensionToken(d.token || null)
    } catch { /* silencieux */ }
    setExtensionTokenLoading(false)
  }

  const revokeExtensionToken = async () => {
    if (!user) return
    setExtensionTokenLoading(true)
    try {
      await fetch(`/api/extension/token?userId=${user.id}`, { method: 'DELETE' })
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
  const [lightMode, setLightMode]       = useState(false)
  const [scaiLearning, setScaiLearning] = useState(true)

  // Charger les préférences depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sc_light_mode') === 'true'
    setLightMode(saved)
    // Appliquer immédiatement au rechargement de la page
    document.documentElement.classList.toggle('light-mode', saved)
    setScaiLearning(localStorage.getItem('sc_scai_learning') !== 'false')
  }, [])

  const toggleLightMode = (val: boolean) => {
    setLightMode(val)
    localStorage.setItem('sc_light_mode', String(val))
    // Basculer la classe sur <html> — les variables CSS font le reste
    document.documentElement.classList.toggle('light-mode', val)
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { alert('Non connecté'); return }
    setLoading(true)
    setSavedMsg(false)
    try {
      // Appel API serveur avec service_role → bypass RLS total
      const res = await fetch('/api/profile/update', {
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
        alert(`Erreur sauvegarde: ${data.error || res.statusText}`)
        return
      }
      await refreshProfile()
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    } catch (err: any) {
      alert(`Erreur réseau: ${err.message}`)
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
    ? new Date(latestScan.created_at).toLocaleString('fr-FR')
    : 'Aucun scan lancé pour le moment'
  const scheduleSummary  = agentSchedule
    ? `Toutes les ${agentSchedule.scan_frequency_hours}h${isAutoScanEnabled ? ` · ${agentSchedule.scan_times.join(', ')}` : ' · désactivé'}`
    : 'Configuration agent indisponible'

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">Paramètres</h2>
        </header>

        <div className="p-6 lg:p-10 max-w-3xl mx-auto w-full space-y-10">

          {/* ── Profil ─────────────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <User className="w-4 h-4" /> Profil
            </h3>
            <Card className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nom complet</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Domaines (max 3) — SCAI cherche dans chacun</label>
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
                        if ((e.key === 'Enter' || e.key === ',') && domainInput.trim() && domains.length < 3) {
                          e.preventDefault()
                          setDomains(prev => [...prev, domainInput.trim()])
                          setDomainInput('')
                        }
                      }}
                      disabled={domains.length >= 3}
                      placeholder={domains.length >= 3 ? 'Maximum 3 domaines' : 'ex: Développeur Full Stack (Entrée pour ajouter)'}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Compétences — utilisées par SCAI pour évaluer ton niveau</label>
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
                        if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
                          e.preventDefault()
                          setSkills(prev => [...prev, skillInput.trim()])
                          setSkillInput('')
                        }
                      }}
                      placeholder="ex: React, Figma, SEO... (Entrée pour ajouter)"
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pays</label>
                    <input type="text" value={country} onChange={e => setCountry(e.target.value)}
                      placeholder="ex: Cameroun, France..."
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ville</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                      placeholder="ex: Douala, Paris..."
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bio professionnelle</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                    placeholder="Décris ton expertise, tes expériences et tes objectifs..."
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none resize-none" />
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>{bio.length} caractères</span>
                    <span className={bio.length >= 50 ? 'text-green-400' : 'text-yellow-500'}>
                      {bio.length >= 50 ? '✓ Suffisant' : `${50 - bio.length} caractères de plus pour +15pts`}
                    </span>
                  </div>
                </div>
                <div className="space-y-4 pt-2 border-t border-[#2a2a2a]">
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Portfolio</label>
                      <input type="text" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)}
                        placeholder="https://ton-portfolio.com"
                        className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">GitHub</label>
                      <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/ton-pseudo"
                        className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">LinkedIn</label>
                      <input type="text" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/ton-profil"
                        className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">WhatsApp</label>
                      <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                        placeholder="+237 6XX XXX XXX"
                        className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none" />
                      <p className="text-[10px] text-gray-600">Inclus dans les candidatures que SCAI prépare pour toi.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Écris comme moi (optionnel)</label>
                    <textarea value={responseTemplate} onChange={e => setResponseTemplate(e.target.value)}
                      placeholder="Colle un message de candidature que tu as déjà écrit toi-même. SCAI imitera ton ton et ton style dans les prochaines candidatures qu'il prépare — sans jamais le recopier mot pour mot."
                      rows={4}
                      className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none resize-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GoldButton type="submit" loading={loading}>Sauvegarder</GoldButton>
                  {savedMsg && <span className="text-xs text-green-400 font-bold">✓ Profil mis à jour !</span>}
                </div>
              </form>
            </Card>
          </section>

          {/* ── Apparence ──────────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Sun className="w-4 h-4" /> Apparence
            </h3>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {lightMode ? <Sun className="w-5 h-5 text-[#D4AF37]" /> : <Moon className="w-5 h-5 text-gray-500" />}
                  <div>
                    <div className="font-medium text-white text-sm">{lightMode ? 'Mode clair' : 'Mode sombre'}</div>
                    <p className="text-xs text-gray-600">Basculer entre fond noir et fond blanc</p>
                  </div>
                </div>
                <Toggle value={lightMode} onChange={toggleLightMode} />
              </div>
            </Card>
          </section>

          {/* ── Langue ──────────────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Globe className="w-4 h-4" /> Langue
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
                L'interface est disponible dans ces 33 langues, traduites une par une (pas de texte anglais recopié). SCAI (le chat IA) peut en plus discuter avec toi dans encore d'autres langues directement — essaie simplement de lui écrire dans ta langue.
              </p>
            </Card>
          </section>

          {/* ── Niveau de compétence évalué ──────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Brain className="w-4 h-4" /> Niveau évalué par SCAI
            </h3>
            <Card className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-[#D4AF37] capitalize">{(profile as any)?.skill_level || 'Pas encore évalué'}</div>
                  <p className="text-xs text-gray-600 mt-1 max-w-md">
                    {(profile as any)?.skill_level_reasoning || 'SCAI analyse ta bio, tes compétences, ton portfolio et tes missions pour ne te proposer en priorité que des opportunités adaptées à ton vrai niveau — ni trop simples, ni trop complexes.'}
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
                  Réévaluer
                </GoldButton>
              </div>
            </Card>
          </section>

          {/* ── SCAI & IA ──────────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Brain className="w-4 h-4" /> SCAI & Intelligence
            </h3>
            <Card className="p-5 space-y-4">
              {/* SCAI Learning */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">Mémoire des conversations</div>
                  <p className="text-xs text-gray-600 max-w-xs mt-0.5">SCAI garde l'historique de tes échanges pour que tu les retrouves après reconnexion. Désactive pour des conversations éphémères, non sauvegardées.</p>
                </div>
                <Toggle value={scaiLearning} onChange={toggleScaiLearning} />
              </div>
              <div className="border-t border-[#1A1A1A] pt-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">Historique des conversations</div>
                  <p className="text-xs text-gray-600 mt-0.5">{scaiLearning ? 'Tes conversations avec SCAI sont conservées définitivement.' : 'Désactivé — tes conversations ne sont pas sauvegardées.'}</p>
                </div>
                <Link href="/agent" className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1">
                  Voir <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          </section>

          {/* ── Agent Searcher ─────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Bot className="w-4 h-4" /> Agent Searcher
            </h3>
            <Card className="p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="font-bold text-white mb-1">Centre de commande</div>
                  <p className="text-xs text-gray-500">Scans, relances, candidatures automatiques.</p>
                </div>
                <Link href="/agent" className="inline-flex items-center gap-2 text-sm font-bold text-[#D4AF37] hover:text-[#F5E6A3] transition-colors">
                  Ouvrir l'agent <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                    <Clock className="w-3 h-3 text-[#D4AF37]" /> Planning
                  </div>
                  <div className="text-sm font-semibold text-white">{scheduleSummary}</div>
                  <p className="text-xs text-gray-600 mt-1">Auto-apply seuil : {agentSchedule?.auto_apply_threshold ?? '--'}/100</p>
                </div>
                <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                    <Zap className="w-3 h-3 text-[#D4AF37]" /> Dernier scan
                  </div>
                  <div className="text-sm font-semibold text-white">{latestScanLabel}</div>
                  <p className="text-xs text-gray-600 mt-1">{latestScan?.result?.slice(0, 60) || 'En attente du premier scan.'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                <div>
                  <div className="font-medium text-white text-sm">Scan automatique</div>
                  <p className="text-xs text-gray-600">Activer / désactiver les scans planifiés.</p>
                </div>
                <Toggle value={isAutoScanEnabled} onChange={toggleAutoScan} disabled={!agentSchedule || agentLoading} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#D4AF37]/30 bg-[#0D0D0D] p-4">
                <div>
                  <div className="font-medium text-white text-sm">⚡ Candidatures auto-rédigées</div>
                  <p className="text-xs text-gray-600">
                    SCAI rédige et enregistre automatiquement un message de candidature pour les offres ≥ {agentSchedule?.auto_apply_threshold ?? 80}/100,
                    même quand tu n'es pas connecté. Tu restes celui qui envoie réellement — SCAI ne soumet rien lui-même sur le site de l'employeur.
                    Désactivé par défaut — active en connaissance de cause.
                  </p>
                </div>
                <Toggle value={!!agentSchedule?.auto_apply_enabled} onChange={toggleAutoApply} disabled={agentLoading} />
              </div>
            </Card>
          </section>

          {/* ── Extension navigateur ────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Extension navigateur</h2>
            <Card className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                Une fois installée, l'extension détecte n'importe quel formulaire de candidature (LinkedIn, Upwork,
                Freelancer, site d'entreprise...) et pré-remplit tes infos + le message SCAI en un clic — tu gardes
                toujours la main sur l'envoi final. Colle ce token dans l'extension pour la connecter à ton compte.
              </p>
              {extensionToken ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-[#D4AF37] truncate">
                      {extensionToken}
                    </code>
                    <button onClick={copyExtensionToken}
                      className="px-3 py-2 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] rounded-lg">
                      {extensionTokenCopied ? '✓ Copié' : 'Copier'}
                    </button>
                  </div>
                  <button onClick={generateExtensionToken} disabled={extensionTokenLoading}
                    className="text-xs text-gray-500 hover:text-white">
                    Régénérer (invalide le token actuel)
                  </button>
                  <span className="mx-2 text-gray-700">·</span>
                  <button onClick={revokeExtensionToken} disabled={extensionTokenLoading}
                    className="text-xs text-red-500 hover:text-red-400">
                    Révoquer
                  </button>
                </div>
              ) : (
                <GoldButton onClick={generateExtensionToken} loading={extensionTokenLoading}>
                  Générer mon token d'extension
                </GoldButton>
              )}
            </Card>
          </section>

          {/* ── Sécurité ───────────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <Shield className="w-4 h-4" /> Sécurité
            </h3>
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">Changer le mot de passe</div>
                  <p className="text-xs text-gray-600">Un lien de réinitialisation sera envoyé par email.</p>
                </div>
                <Link href="/login?reset=true" className="text-xs text-[#D4AF37] hover:underline">Réinitialiser →</Link>
              </div>
            </Card>
          </section>

          {/* ── Feedback & Retour d'expérience ─────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Retour d'expérience
            </h3>
            <Card className="p-5 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Tu as rencontré un problème ? Une fonctionnalité qui ne marche pas ? Un bug ? Dis-le-nous — notre équipe est notifiée immédiatement.
              </p>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Décris le problème ou ton retour d'expérience..."
                rows={3}
                className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none resize-none focus:border-[#D4AF37]"
              />
              <div className="flex items-center gap-3">
                <GoldButton onClick={handleFeedback} loading={feedbackLoading} disabled={!feedbackText.trim()}>
                  Envoyer le retour
                </GoldButton>
                {feedbackSent && <span className="text-xs text-green-400">✓ Envoyé — merci !</span>}
              </div>
            </Card>
          </section>

          {/* ── Fondateur — accès spécial ──────────────────────── */}
          {isFounder && (
            <section className="space-y-4">
              <h3 className="text-xs font-bold tracking-[0.3em] text-[#D4AF37] uppercase flex items-center gap-2">
                🔱 Accès Fondateur
              </h3>
              <Card className="p-5 bg-[#1A1500] border-[#D4AF37]/30 space-y-3">
                {[
                  { label: 'Dashboard fondateur',   href: '/founder',              desc: 'Gestion complète de la plateforme' },
                  { label: 'Monitoring & bugs',      href: '/founder?tab=monitor',  desc: 'Alertes système, limites API, plaintes' },
                  { label: 'Tous les profils',       href: '/founder?tab=users',    desc: 'Accès à tous les comptes utilisateurs' },
                  { label: 'Conversations SCAI',     href: '/founder?tab=chats',    desc: 'Modération et apprentissage' },
                  { label: 'Revenus & paiements',    href: '/founder?tab=revenue',  desc: 'Historique de tous les paiements' },
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
          <section className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.3em] text-red-500 uppercase flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Zone de danger
            </h3>
            <Card className="p-5 border-red-900/50 bg-red-900/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-white mb-0.5">Supprimer le compte</div>
                <p className="text-xs text-gray-500">Suppression définitive de toutes tes données (30 jours).</p>
              </div>
              <button className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                Supprimer
              </button>
            </Card>
          </section>

          {/* ── Liens ──────────────────────────────────────────── */}
          <section className="space-y-3 border-t border-[#1A1A1A] pt-6">
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <Link href="/guide" className="text-[#D4AF37] hover:underline">📖 Guide complet</Link>
              <span className="text-gray-700">·</span>
              <button onClick={() => { localStorage.removeItem('sc_tour_completed_v1'); window.location.href = '/dashboard' }}
                className="text-gray-500 hover:text-white transition-colors">🔄 Revoir le tour guidé</button>
              <span className="text-gray-700">·</span>
              <Link href="/support" className="text-gray-500 hover:text-white transition-colors">💬 Support</Link>
              <span className="text-gray-700">·</span>
              <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">🔒 Confidentialité</Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
