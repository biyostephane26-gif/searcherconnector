'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import { Mic, Upload, Globe, Link as LinkIcon, Send, CheckCircle2, Loader2, ArrowRight, User, Briefcase, Users, DollarSign, MapPin, Code } from 'lucide-react'
import { useVoiceInput } from '../hooks/useVoiceInput'

const CATEGORIES = [
  'Développement',
  'Marketing',
  'Design',
  'Rédaction',
  'Finance',
  'Comptabilité',
  'Commerce',
  'Ressources humaines',
  'Data',
  'IA/ML',
  'Mobile',
  'DevOps',
  'Communication',
  'Juridique',
  'Éducation',
  'Santé',
  'Autre'
]

const EXPERIENCE_LEVELS = ['Junior', 'Mid', 'Senior']
const JOB_TYPES = ['CDI', 'CDD', 'Remote', 'Hybride']
const FREELANCE_AVAILABILITIES = ['One-shot', 'Long terme', 'Les deux']
const CURRENCIES = ['USD', 'EUR', 'XAF', 'XOF', 'GBP', 'JPY']

export default function Onboarding() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    domain: profile?.domain || '',
    experienceLevel: '',
    jobTypes: [] as string[],
    salaryMin: profile?.salary_min || 0,
    salaryMax: profile?.salary_max || 0,
    currency: profile?.currency || 'USD',
    countries: [] as string[],
    skills: [] as string[],
    dailyRate: 0,
    availability: '',
    portfolioUrl: profile?.portfolio_url || '',
    githubUrl: profile?.github_url || '',
    linkedinUrl: profile?.linkedin_url || '',
    cvUploaded: false,
    cvUrl: '',
  })

  const { isRecording, isProcessing, interimText, toggle: toggleVoice } = useVoiceInput({
    onTranscript: (text) => setFormData(prev => ({
      ...prev,
      fullName: prev.fullName || text.split(' ').slice(0, 2).join(' ')
    })),
    onError: (err) => console.error(err),
  })

  const profileType = profile?.profile_type || 'job_seeker'
  const totalSteps = 5

  useEffect(() => {
    if (!profile) return
    setFormData(prev => ({
      ...prev,
      fullName: profile.full_name || '',
      domain: profile.domain || '',
      salaryMin: profile.salary_min || 0,
      salaryMax: profile.salary_max || 0,
      currency: profile.currency || 'USD',
      portfolioUrl: profile.portfolio_url || '',
      githubUrl: profile.github_url || '',
      linkedinUrl: profile.linkedin_url || '',
    }))
  }, [profile])

  const handleNext = async () => {
    setLoading(true)
    try {
      await supabase.from('users_profiles').upsert({
        id: user?.id,
        full_name: formData.fullName || user?.email?.split('@')[0] || 'User',
        email: user?.email,
        domain: formData.domain,
        salary_min: formData.salaryMin,
        salary_max: formData.salaryMax,
        currency: formData.currency,
        portfolio_url: formData.portfolioUrl,
        github_url: formData.githubUrl,
        linkedin_url: formData.linkedinUrl,
        profile_type: profileType,
        profile_completion: Math.round((step / totalSteps) * 100)
      })
    } catch (err) {
      console.error("Silent profile sync error:", err)
    } finally {
      setLoading(false)
    }
    setStep(prev => prev + 1)
  }

  const handleBack = () => setStep(prev => prev - 1)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return
    const file = e.target.files[0]
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 5MB)')
      return
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const allowedExts = ['pdf', 'docx', 'doc']
    if (!fileExt || !allowedExts.includes(fileExt)) {
      alert('Seuls les formats PDF, DOCX et DOC sont acceptés')
      return
    }

    const fileName = `${user.id}/cv-${Date.now()}.${fileExt}`
    
    setLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from('DOCUMENTS')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage.from('DOCUMENTS').getPublicUrl(fileName)
      
      await supabase.from('users_profiles').upsert({
        id:    user.id,
        email: user.email || '',
        profile_type: profileType,
        profile_completion: Math.round((step / totalSteps) * 100),
      }, { onConflict: 'id', ignoreDuplicates: true })

      setFormData(prev => ({ ...prev, cvUploaded: true, cvUrl: publicUrl }))
    } catch (err: any) {
      console.error(err)
      alert(`Échec de l'upload : ${err.message}`)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Mettre à jour le profil
      await supabase.from('users_profiles').update({
        full_name:        formData.fullName,
        domain:           formData.domain,
        salary_min:       formData.salaryMin,
        salary_max:       formData.salaryMax,
        currency:         formData.currency,
        portfolio_url:    formData.portfolioUrl,
        github_url:       formData.githubUrl,
        linkedin_url:     formData.linkedinUrl,
        cv_url:           formData.cvUrl,
        profile_completion: 100
      }).eq('id', user?.id)

      // Vérification IA asynchrone (ne pas attendre)
      let verificationStatus = 'pending'
      const founderEmails = ['biyostephane26@gmail.com', 'stephanenana.pro@gmail.com']
      if (founderEmails.includes((user?.email || '').toLowerCase())) {
        verificationStatus = 'genius'
      } else {
        // Lancer vérification en arrière-plan
        fetch(`${window.location.origin}/api/verify-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id }),
        }).catch(() => {})
        
        // Attribution rapide selon critères simples
        const hasLinks = !!(formData.portfolioUrl || formData.githubUrl || formData.linkedinUrl)
        if (formData.cvUploaded || hasLinks) verificationStatus = 'verified'
      }

      await supabase.from('users_profiles').update({
        verification_status: verificationStatus,
      }).eq('id', user?.id)

      // Configurer le scan automatique
      supabase.from('agent_schedules').upsert({
        user_id:              user?.id,
        scan_frequency_hours: 6,
        auto_apply_threshold: 85,
        timezone:             Intl.DateTimeFormat().resolvedOptions().timeZone
      }).catch(() => {})

      // 🚀 LANCER LE PREMIER SCAN AUTOMATIQUEMENT
      // Délai de 5s pour laisser le temps au profil de se synchroniser
      setTimeout(async () => {
        try {
          await fetch(`${window.location.origin}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id,
              domain: formData.domain,
              isFirstScan: true
            })
          })
          
          // Créer notification de bienvenue
          await fetch(`${window.location.origin}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id,
              type: 'system',
              title: '🎉 Bienvenue sur Searcher Connector!',
              message: 'Ton premier scan est en cours. SCAI analyse actuellement des milliers d\'opportunités pour toi. Tu recevras une notification dans quelques instants!',
              actionUrl: '/dashboard',
              actionLabel: 'Voir le dashboard'
            })
          })
        } catch (err) {
          console.error('Erreur premier scan:', err)
        }
      }, 5000)

      await refreshProfile()
      router.push('/dashboard')

    } catch (err) {
      await refreshProfile().catch(() => {})
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const renderJobSeekerSteps = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Quel est ton domaine principal ?</h2>
              <p className="text-gray-400">Sélectionne la catégorie qui correspond le mieux à ton profil.</p>
            </div>
            
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, domain: category }))}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.domain === category
                        ? 'border-[#D4AF37] bg-[#1A1500] text-[#D4AF37]'
                        : 'border-[#2a2a2a] bg-[#111] hover:border-[#D4AF37]/50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </Card>
            
            <GoldButton onClick={handleNext} fullWidth disabled={!formData.domain} loading={loading}>
              Continue <ArrowRight className="w-4 h-4" />
            </GoldButton>
          </div>
        )
      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Quel est ton niveau d'expérience ?</h2>
            </div>
            
            <Card className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {EXPERIENCE_LEVELS.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level }))}
                    className={`p-6 rounded-xl border text-center transition-all ${
                      formData.experienceLevel === level
                        ? 'border-[#D4AF37] bg-[#1A1500] text-[#D4AF37]'
                        : 'border-[#2a2a2a] bg-[#111] hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <div className="text-2xl font-bold">{level}</div>
                  </button>
                ))}
              </div>
            </Card>
            
            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={handleBack} fullWidth>Back</GoldButton>
              <GoldButton onClick={handleNext} fullWidth disabled={!formData.experienceLevel} loading={loading}>Next</GoldButton>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Tu cherches quoi ?</h2>
            </div>
            
            <Card className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {JOB_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      jobTypes: prev.jobTypes.includes(type)
                        ? prev.jobTypes.filter(t => t !== type)
                        : [...prev.jobTypes, type]
                    }))}
                    className={`p-6 rounded-xl border text-center transition-all ${
                      formData.jobTypes.includes(type)
                        ? 'border-[#D4AF37] bg-[#1A1500] text-[#D4AF37]'
                        : 'border-[#2a2a2a] bg-[#111] hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <Briefcase className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-bold">{type}</div>
                  </button>
                ))}
              </div>
            </Card>
            
            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={handleBack} fullWidth>Back</GoldButton>
              <GoldButton onClick={handleNext} fullWidth disabled={formData.jobTypes.length === 0} loading={loading}>Next</GoldButton>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Quel salaire minimum tu vises ?</h2>
            </div>
            
            <Card className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Devise</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Salaire minimum par an</label>
                <input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, salaryMin: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                  placeholder="e.g. 30000"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Salaire maximum par an (optionnel)</label>
                <input
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData(prev => ({ ...prev, salaryMax: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                  placeholder="e.g. 60000"
                />
              </div>
            </Card>
            
            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={handleBack} fullWidth>Back</GoldButton>
              <GoldButton onClick={handleNext} fullWidth disabled={formData.salaryMin <= 0} loading={loading}>Next</GoldButton>
            </div>
          </div>
        )
      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Dans quels pays tu cherches ?</h2>
              <p className="text-gray-400">Tu peux sélectionner plusieurs pays.</p>
            </div>
            
            <Card className="p-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pays (séparés par des virgules)</label>
                <input
                  type="text"
                  placeholder="France, Canada, Remote..."
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    countries: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                  }))}
                />
              </div>
            </Card>

            <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center">
              <Upload className="w-10 h-10 text-[#D4AF37] mb-3" />
              <p className="text-sm text-gray-400 mb-4">Upload ton CV (optionnel) pour un matching plus précis</p>
              <label className="cursor-pointer">
                <span className="bg-[#D4AF37] text-[#0A0A0A] px-5 py-2.5 rounded-lg font-bold hover:bg-[#F5E6A3] transition-colors text-sm">
                  {loading ? 'Chargement...' : formData.cvUploaded ? 'CV Uploadé ✔️' : 'Uploader CV'}
                </span>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={loading} accept=".pdf,.docx,.doc" />
              </label>
            </Card>
            
            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={handleBack} fullWidth disabled={loading}>Back</GoldButton>
              <GoldButton onClick={handleSubmit} fullWidth loading={loading}>
                Terminer l'onboarding
              </GoldButton>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const renderFreelanceSteps = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Quelles sont tes compétences principales ?</h2>
              <p className="text-gray-400">Sélectionne ou saisis tes compétences.</p>
            </div>
            
            <Card className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Compétences (séparées par des virgules)</label>
                  <input
                    type="text"
                    placeholder="React, Node.js, Figma..."
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      skills: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                    }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="bg-[#1A1A1A] px-3 py-1 rounded-full text-sm border border-[#2a2a2a]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
            
            <GoldButton onClick={handleNext} fullWidth disabled={formData.skills.length === 0} loading={loading}>
              Continue <ArrowRight className="w-4 h-4" />
            </GoldButton>
          </div>
        )
      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Quel est ton tarif journalier ?</h2>
            </div>
            
            <Card className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Devise</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tarif journalier</label>
                <input
                  type="number"
                  value={formData.dailyRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dailyRate: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                  placeholder="e.g. 500"
                />
              </div>
            </Card>
            
            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={handleBack} fullWidth>Back</GoldButton>
              <GoldButton onClick={handleNext} fullWidth disabled={formData.dailyRate <= 0} loading={loading}>Next</GoldButton>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Tu es disponible pour quoi ?</h2>
            </div>
            
            <Card className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {FREELANCE_AVAILABILITIES.map(availability => (
                  <button
                    key={availability}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, availability }))}
                    className={`p-6 rounded-xl border text-center transition-all ${
                      formData.availability === availability
                        ? 'border-[#D4AF37] bg-[#1A1500] text-[#D4AF37]'
                        : 'border-[#2a2a2a] bg-[#111] hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <div className="text-lg font-bold">{availability}</div>
                  </button>
                ))}
              </div>
            </Card>
            
            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={handleBack} fullWidth>Back</GoldButton>
              <GoldButton onClick={handleNext} fullWidth disabled={!formData.availability} loading={loading}>Next</GoldButton>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Liens professionnels (optionnel)</h2>
              <p className="text-gray-400">Portfolio, GitHub, Behance...</p>
            </div>
            
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Portfolio / Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 pl-10 text-sm focus:border-[#D4AF37] outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">GitHub</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 pl-10 text-sm focus:border-[#D4AF37] outline-none"
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">LinkedIn</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 pl-10 text-sm focus:border-[#D4AF37] outline-none"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
            </Card>
            
            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={handleBack} fullWidth>Back</GoldButton>
              <GoldButton onClick={handleNext} fullWidth loading={loading}>Next</GoldButton>
            </div>
          </div>
        )
      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Dans quels pays tu cherches des clients ?</h2>
            </div>
            
            <Card className="p-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pays (séparés par des virgules)</label>
                <input
                  type="text"
                  placeholder="France, Canada, Worldwide..."
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    countries: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                  }))}
                />
              </div>
            </Card>

            <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center">
              <Upload className="w-10 h-10 text-[#D4AF37] mb-3" />
              <p className="text-sm text-gray-400 mb-4">Upload ton CV (optionnel)</p>
              <label className="cursor-pointer">
                <span className="bg-[#D4AF37] text-[#0A0A0A] px-5 py-2.5 rounded-lg font-bold hover:bg-[#F5E6A3] transition-colors text-sm">
                  {loading ? 'Chargement...' : formData.cvUploaded ? 'CV Uploadé ✔️' : 'Uploader CV'}
                </span>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={loading} accept=".pdf,.docx,.doc" />
              </label>
            </Card>
            
            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={handleBack} fullWidth disabled={loading}>Back</GoldButton>
              <GoldButton onClick={handleSubmit} fullWidth loading={loading}>
                Terminer l'onboarding
              </GoldButton>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pt-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
          <div className="flex justify-between text-[10px] tracking-widest text-gray-500 font-bold uppercase mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#D4AF37] transition-all duration-500" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {profileType === 'job_seeker' ? renderJobSeekerSteps() : renderFreelanceSteps()}
      </div>
    </div>
  )
}
