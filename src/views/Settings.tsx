'use client'

import { useEffect, useState } from 'react'
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
  const [country, setCountry]           = useState('')
  const [city, setCity]                 = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [githubUrl, setGithubUrl]       = useState('')
  const [linkedinUrl, setLinkedinUrl]   = useState('')
  const [savedMsg, setSavedMsg]         = useState(false)
  const [agentSchedule, setAgentSchedule] = useState<any>(null)
  const [latestScan, setLatestScan]     = useState<any>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  // Synchroniser les inputs quand le profil charge (async)
  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || '')
    setBio(profile.bio || '')
    setDomain((profile as any).domain || '')
    setCountry((profile as any).country || '')
    setCity((profile as any).city || '')
    setPortfolioUrl((profile as any).portfolio_url || '')
    setGithubUrl((profile as any).github_url || '')
    setLinkedinUrl((profile as any).linkedin_url || '')
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
          domain:         domain.trim(),
          country:        country.trim(),
          city:           city.trim(),
          portfolio_url:  portfolioUrl.trim(),
          github_url:     githubUrl.trim(),
          linkedin_url:   linkedinUrl.trim(),
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
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Domaine / Compétences</label>
                    <input type="text" value={domain} onChange={e => setDomain(e.target.value)}
                      placeholder="ex: Développeur Full Stack, Graphiste..."
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
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Rechercher une langue..."
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white text-sm focus:border-[#D4AF37] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-2">
                {[
                  { code: 'fr', label: 'Français' },
                  { code: 'en', label: 'English' },
                  { code: 'pt', label: 'Português' },
                  { code: 'ja', label: '日本語' },
                  { code: 'es', label: 'Español' },
                  { code: 'de', label: 'Deutsch' },
                  { code: 'it', label: 'Italiano' },
                  { code: 'nl', label: 'Nederlands' },
                  { code: 'pl', label: 'Polski' },
                  { code: 'ru', label: 'Русский' },
                  { code: 'zh-CN', label: '中文 (简体)' },
                  { code: 'zh-TW', label: '中文 (繁體)' },
                  { code: 'ar', label: 'العربية' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'bn', label: 'বাংলা' },
                  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
                  { code: 'te', label: 'తెలుగు' },
                  { code: 'ta', label: 'தமிழ்' },
                  { code: 'mr', label: 'मराठी' },
                  { code: 'ur', label: 'اردو' },
                  { code: 'gu', label: 'ગુજરાતી' },
                  { code: 'kn', label: 'ಕನ್ನಡ' },
                  { code: 'ml', label: 'മലയാളം' },
                  { code: 'th', label: 'ไทย' },
                  { code: 'vi', label: 'Tiếng Việt' },
                  { code: 'id', label: 'Bahasa Indonesia' },
                  { code: 'ms', label: 'Bahasa Melayu' },
                  { code: 'tl', label: 'Filipino' },
                  { code: 'ko', label: '한국어' },
                  { code: 'tr', label: 'Türkçe' },
                  { code: 'fa', label: 'فارسی' },
                  { code: 'he', label: 'עברית' },
                  { code: 'af', label: 'Afrikaans' },
                  { code: 'sq', label: 'Shqip' },
                  { code: 'am', label: 'አማርኛ' },
                  { code: 'hy', label: 'Հայերեն' },
                  { code: 'az', label: 'Azərbaycan' },
                  { code: 'eu', label: 'Euskara' },
                  { code: 'be', label: 'Беларуская' },
                  { code: 'bs', label: 'Bosanski' },
                  { code: 'bg', label: 'Български' },
                  { code: 'ca', label: 'Català' },
                  { code: 'ceb', label: 'Cebuano' },
                  { code: 'ny', label: 'Chichewa' },
                  { code: 'co', label: 'Corsu' },
                  { code: 'hr', label: 'Hrvatski' },
                  { code: 'cs', label: 'Čeština' },
                  { code: 'da', label: 'Dansk' },
                  { code: 'eo', label: 'Esperanto' },
                  { code: 'et', label: 'Eesti' },
                  { code: 'fi', label: 'Suomi' },
                  { code: 'fy', label: 'Frysk' },
                  { code: 'gl', label: 'Galego' },
                  { code: 'ka', label: 'ქართული' },
                  { code: 'el', label: 'Ελληνικά' },
                  { code: 'ht', label: 'Kreyòl Ayisyen' },
                  { code: 'ha', label: 'Hausa' },
                  { code: 'haw', label: 'ʻŌlelo Hawaiʻi' },
                  { code: 'iw', label: 'עברית' },
                  { code: 'hmn', label: 'Hmong' },
                  { code: 'hu', label: 'Magyar' },
                  { code: 'is', label: 'Íslenska' },
                  { code: 'ig', label: 'Igbo' },
                  { code: 'ga', label: 'Gaeilge' },
                  { code: 'jw', label: 'Jawa' },
                  { code: 'kk', label: 'Қазақ' },
                  { code: 'km', label: 'ភាសាខ្មែរ' },
                  { code: 'rw', label: 'Kinyarwanda' },
                  { code: 'ku', label: 'Kurdî' },
                  { code: 'ky', label: 'Кыргызча' },
                  { code: 'lo', label: 'ລາວ' },
                  { code: 'la', label: 'Latina' },
                  { code: 'lv', label: 'Latviešu' },
                  { code: 'lt', label: 'Lietuvių' },
                  { code: 'lb', label: 'Lëtzebuergesch' },
                  { code: 'mk', label: 'Македонски' },
                  { code: 'mg', label: 'Malagasy' },
                  { code: 'mt', label: 'Malti' },
                  { code: 'mi', label: 'Māori' },
                  { code: 'mn', label: 'Монгол' },
                  { code: 'my', label: 'ဗမာစာ' },
                  { code: 'ne', label: 'नेपाली' },
                  { code: 'no', label: 'Norsk' },
                  { code: 'or', label: 'ଓଡ଼ିଆ' },
                  { code: 'ps', label: 'پښتو' },
                  { code: 'ro', label: 'Română' },
                  { code: 'sm', label: 'Gagana Samoa' },
                  { code: 'gd', label: 'Gàidhlig' },
                  { code: 'sr', label: 'Српски' },
                  { code: 'st', label: 'Sesotho' },
                  { code: 'sn', label: 'ChiShona' },
                  { code: 'sd', label: 'سنڌي' },
                  { code: 'si', label: 'සිංහල' },
                  { code: 'sk', label: 'Slovenčina' },
                  { code: 'sl', label: 'Slovenščina' },
                  { code: 'so', label: 'Soomaali' },
                  { code: 'su', label: 'Basa Sunda' },
                  { code: 'sw', label: 'Kiswahili' },
                  { code: 'sv', label: 'Svenska' },
                  { code: 'tg', label: 'Тоҷикӣ' },
                  { code: 'uk', label: 'Українська' },
                  { code: 'ug', label: 'ئۇيغۇرچە' },
                  { code: 'uz', label: 'Oʻzbek' },
                  { code: 'cy', label: 'Cymraeg' },
                  { code: 'xh', label: 'isiXhosa' },
                  { code: 'yi', label: 'ייִדיש' },
                  { code: 'yo', label: 'Yorùbá' },
                  { code: 'zu', label: 'isiZulu' }
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
                  <div className="font-medium text-white text-sm">Apprentissage SCAI</div>
                  <p className="text-xs text-gray-600 max-w-xs mt-0.5">SCAI utilise tes conversations pour personnaliser ses réponses. Désactive si tu préfères la confidentialité totale.</p>
                </div>
                <Toggle value={scaiLearning} onChange={toggleScaiLearning} />
              </div>
              <div className="border-t border-[#1A1A1A] pt-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">Historique des conversations</div>
                  <p className="text-xs text-gray-600 mt-0.5">Tes conversations avec SCAI sont conservées définitivement.</p>
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
