'use client'

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import GoldButton from '../components/ui/GoldButton';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { getDomainIcon } from '../lib/domainIcon';
import {
  Camera, MapPin, Briefcase, Calendar, Link as LinkIcon,
  Settings, Edit3, Check, X, Loader2, Globe, Github, Twitter,
  FileText, Shield, ExternalLink, User, Code, PieChart, TrendingUp,
  CheckCircle2, AlertCircle, Upload, Award
} from 'lucide-react';
import { getCareerLevel, getNextLevelProgress } from '../lib/careerLevel'
import { authFetch } from '../lib/authFetch'
import { useTranslation } from 'react-i18next'

// ── Charte visuelle par type de profil — label/description via i18n
// (clé profilePage.themes.<type>), seuls icônes/couleurs restent ici. ──
const PROFILE_THEME: Record<string, {
  icon:        any
  gradient:    string
  accent:      string
  accentText:  string
  borderColor: string
  badgeBg:     string
}> = {
  job_seeker: {
    icon:        User,
    gradient:    'from-blue-950/60 to-[#0d0d0d]',
    accent:      '#3b82f6',
    accentText:  'text-blue-400',
    borderColor: 'border-blue-900/40',
    badgeBg:     'bg-blue-950/40 text-blue-400 border border-blue-800/40',
  },
  freelance: {
    icon:        Code,
    gradient:    'from-[#1A1500]/80 to-[#0d0d0d]',
    accent:      '#D4AF37',
    accentText:  'text-[#D4AF37]',
    borderColor: 'border-[#D4AF37]/20',
    badgeBg:     'bg-[#1A1500]/60 text-[#D4AF37] border border-[#D4AF37]/30',
  },
  business: {
    icon:        PieChart,
    gradient:    'from-purple-950/60 to-[#0d0d0d]',
    accent:      '#a855f7',
    accentText:  'text-purple-400',
    borderColor: 'border-purple-900/40',
    badgeBg:     'bg-purple-950/40 text-purple-400 border border-purple-800/40',
  },
  investor: {
    icon:        TrendingUp,
    gradient:    'from-green-950/60 to-[#0d0d0d]',
    accent:      '#22c55e',
    accentText:  'text-green-400',
    borderColor: 'border-green-900/40',
    badgeBg:     'bg-green-950/40 text-green-400 border border-green-800/40',
  },
}

// ── Composant Documents uploadés ─────────────────────────────────
function DocumentsSection({ userId, onUploadSuccess }: { userId?: string, onUploadSuccess?: () => void }) {
  const { t } = useTranslation()
  const [docs, setDocs] = useState<any[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocs = async () => {
    if (!userId) return
    const { data } = await supabase.from('uploaded_documents').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDocs(data || [])
  }

  useEffect(() => {
    fetchDocs()
  }, [userId])

  const handleDelete = async (docId: string) => {
    if (!userId || !confirm(t('profilePage.documents.confirmDelete'))) return
    setDeleting(docId)
    try {
      await fetch('/api/documents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, documentId: docId }),
      })
      await fetchDocs()
      if (onUploadSuccess) onUploadSuccess()
    } finally {
      setDeleting(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !userId) return
    const file = e.target.files[0]
    
    // Validation basique
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('profilePage.documents.fileTooLarge'))
      e.target.value = ''
      return
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const allowedExts = ['pdf', 'png', 'jpg', 'jpeg']
    if (!fileExt || !allowedExts.includes(fileExt)) {
      setUploadError(t('profilePage.documents.invalidFormat'))
      e.target.value = ''
      return
    }

    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    setUploading(true)
    setUploadError('')
    try {
      const { error } = await supabase.storage
        .from('DOCUMENTS')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage.from('DOCUMENTS').getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('uploaded_documents').insert({
        user_id:   userId,
        doc_type:  'verification',
        file_url:  publicUrl,
        file_name: file.name
      })

      if (insertError) throw insertError

      await fetchDocs()
      if (onUploadSuccess) onUploadSuccess()
    } catch (err: any) {
      setUploadError(t('profilePage.documents.uploadFailed', { error: err.message || 'Erreur inconnue' }))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Uploader */}
      <Card className="p-6 border-dashed border-2 flex flex-col items-center justify-center text-center">
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">{t('profilePage.documents.uploading')}</span>
            </div>
          </div>
        )}
        <Upload className="w-10 h-10 text-[#D4AF37] mb-3" />
        <label className="cursor-pointer">
          <span className="bg-[#D4AF37] text-[#0A0A0A] px-5 py-2.5 rounded-lg font-bold hover:bg-[#F5E6A3] transition-colors text-sm">
            {uploading ? t('profilePage.documents.loading') : t('profilePage.documents.uploadDoc')}
          </span>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload}
            disabled={uploading} accept=".pdf,.png,.jpg,.jpeg" />
        </label>
        <p className="text-[10px] text-gray-600 mt-3 uppercase tracking-widest">{t('profilePage.documents.formats')}</p>
        {uploadError && (
          <div className="bg-red-900/20 border border-red-700/50 text-red-400 text-xs p-3 rounded-xl mt-3">
            {uploadError}
          </div>
        )}
      </Card>

      {/* Documents list */}
      {docs.length === 0 ? (
        <Card className="p-5 text-center">
          <Shield className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-600 mb-3">{t('profilePage.documents.none')}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <Card key={doc.id || i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#D4AF37]" />
                <div>
                  <p className="text-sm text-white font-medium">{doc.file_name}</p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                    {doc.doc_type === 'verification' ? t('profilePage.documents.verificationDoc') : doc.doc_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-gray-600 hover:text-[#D4AF37] transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
                  className="text-red-600 hover:text-red-400 transition-colors disabled:opacity-50">
                  {deleting === doc.id ? '...' : '✕'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section complétion du profil ─────────────────────────────────
function CompletionChecklist({ profile, userId }: { profile: any, userId?: string }) {
  const { t } = useTranslation()
  const [hasDocs, setHasDocs] = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetchDocs = async () => {
      const { data } = await supabase.from('uploaded_documents').select('*').eq('user_id', userId).limit(1)
      setHasDocs(!!(data && data.length > 0))
    }
    fetchDocs()
  }, [userId])

  const items = [
    { key: 'photo',    label: t('profilePage.checklist.photo'),    done: !!profile?.avatar_url, settingsLink: true },
    { key: 'fullName', label: t('profilePage.checklist.fullName'), done: !!profile?.full_name, settingsLink: true },
    { key: 'bio',      label: t('profilePage.checklist.bio'),      done: (profile?.bio?.length || 0) >= 50, settingsLink: true },
    { key: 'domain',   label: t('profilePage.checklist.domain'),   done: !!profile?.domain, settingsLink: true },
    { key: 'location', label: t('profilePage.checklist.location'), done: !!profile?.country, settingsLink: true },
    { key: 'links',    label: t('profilePage.checklist.links'),    done: !!(profile?.portfolio_url || profile?.github_url || profile?.linkedin_url), settingsLink: true },
    { key: 'document', label: t('profilePage.checklist.document'), done: hasDocs, settingsLink: false },
  ]

  const done = items.filter(i => i.done).length
  if (done >= items.length) return null // tout est complété

  return (
    <Card className="p-5 border-[#2a2a2a]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('profilePage.checklist.title')}</span>
        <span className="text-xs text-[#D4AF37] font-bold">{done}/{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.filter(i => !i.done).slice(0, 4).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
            <span className="text-xs text-gray-500">{item.label}</span>
            {item.settingsLink ? (
              <a href="/settings" className="text-[10px] text-[#D4AF37] ml-auto hover:underline">{t('profilePage.checklist.complete')}</a>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistiques réelles — comme un profil Upwork/Toptal affiche son
  // "Job Success Score" directement sur le profil, pas seulement dans
  // une page de facturation séparée.
  const [stats, setStats] = useState({ sent: 0, interviews: 0, offers: 0 })
  useEffect(() => {
    if (!user) return
    supabase.from('applications_tracking').select('status, interview_date, offer_amount').eq('user_id', user.id)
      .then(({ data }) => {
        const rows = data || []
        setStats({
          sent: rows.length,
          interviews: rows.filter(r => r.status === 'interview' || r.interview_date).length,
          offers: rows.filter(r => r.status === 'offer' || r.status === 'hired' || r.offer_amount).length,
        })
      })
  }, [user])

  // Charte visuelle selon le type de profil
  const themeKey = (profile?.profile_type && PROFILE_THEME[profile.profile_type]) ? profile.profile_type : 'freelance'
  const theme = PROFILE_THEME[themeKey]
  const ThemeIcon = theme.icon
  // Icône représentative du métier (mécanicien → clé/marteau, designer →
  // palette, etc.) — affichée en filigrane sur la bannière du profil.
  const DomainIcon = getDomainIcon(profile?.domain, (profile as any)?.domains)

  // Relancer la vérification manuellement
  const handleReVerify = async () => {
    if (!user) return
    setVerifying(true)
    setVerifyMsg('')
    try {
      const r = await fetch(`${window.location.origin}/api/verify-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await r.json()
      if (data.status === 'genius') setVerifyMsg(t('profilePage.verification.geniusGranted'))
      else if (data.status === 'verified') setVerifyMsg(t('profilePage.verification.verifiedSuccess'))
      else if (data.status === 'pending') setVerifyMsg(t('profilePage.verification.analyzingHint'))
      else setVerifyMsg(`❌ ${data.reason || 'Vérification refusée'}`)
      await refreshProfile()
    } catch {
      setVerifyMsg(t('profilePage.verification.networkError'))
    } finally {
      setVerifying(false)
    }
  }
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    domain: profile?.domain || '',
    city: profile?.city || '',
    country: profile?.country || ''
  });

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:    user.id,
          email:     user.email || '',
          full_name: formData.full_name,
          bio:       formData.bio,
          domain:    formData.domain,
          city:      formData.city,
          country:   formData.country,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setSaveError(`Erreur: ${data.error}`); return; }
      await refreshProfile();
      setIsEditing(false);
      setSaveError('');
    } catch (err: any) {
      setSaveError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('DOCUMENTS')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('DOCUMENTS')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      await refreshProfile();
    } catch (err) {
      console.error(err);
      setSaveError(t('profilePage.avatarUploadError'))
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">{t('profilePage.header')}</h2>
          <div className="flex gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all"
              >
                <Edit3 size={14} /> {t('profilePage.edit')}
              </button>
            ) : (
              <div className="flex gap-2 items-center">
                {saveError && <span className="text-xs text-red-400">{saveError}</span>}
                <button
                  onClick={() => { setIsEditing(false); setSaveError('') }}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white"
                >
                  {t('profilePage.cancel')}
                </button>
                <GoldButton onClick={handleUpdateProfile} disabled={loading} className="h-9 px-6 text-[10px]">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : t('profilePage.save')}
                </GoldButton>
              </div>
            )}
            <button
              onClick={() => router.push('/settings')}
              className="p-2 bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl text-gray-500 hover:text-white transition-all">
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* ── Hero / Header Section — couleur selon le type de profil ── */}
          <div className={`relative h-64 bg-gradient-to-r ${theme.gradient} border-b border-[#1A1A1A]`}>
            {/* overflow-hidden isolé à ce wrapper (pas au conteneur h-64 entier) :
                le bloc photo+nom plus bas déborde volontairement de -bottom-16
                sous la bannière (avatar "à cheval" sur le contenu) — mettre
                overflow-hidden sur le conteneur parent le coupait net (nom/sous-titre
                tronqués visible en bas de la bannière). Seule l'icône filigrane a
                besoin d'être clippée aux bords de la bannière. */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <DomainIcon
                className="absolute -right-6 -top-6 text-white/5 select-none z-0"
                size={220}
                strokeWidth={1}
                aria-hidden="true"
              />
            </div>
            {/* Badge type de profil en haut à droite */}
            <div className="absolute top-4 right-6">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${theme.badgeBg}`}>
                <ThemeIcon size={11} />
                {t(`profilePage.themes.${themeKey}.label`)}
              </span>
            </div>
            {/* Description du type — ancrée en haut, loin du bloc avatar/nom qui
                déborde par le bas (évite le chevauchement/troncature signalés).
                z-10 : passait derrière le filigrane du métier (z-0) sur certains
                écrans. Visible sur tous les appareils désormais (plus de hidden
                md:block qui la cachait entièrement sur mobile). */}
            <div className="absolute top-14 md:top-16 left-6 md:left-10 right-24 md:right-6 max-w-md z-10">
              <p className={`text-[11px] md:text-xs font-medium ${theme.accentText} opacity-90 truncate`}>{t(`profilePage.themes.${themeKey}.desc`)}</p>
            </div>
            <div className="absolute -bottom-16 left-10 flex items-end gap-6">
              <div className="relative group">
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden bg-[#111111] border-4 border-[#0A0A0A] shadow-2xl">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#D4AF37] font-bold text-4xl">
                      {profile?.full_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl"
                >
                  <Camera className="text-white" size={24} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-3xl font-black text-white tracking-tight">
                    {isEditing ? (
                      <input 
                        value={formData.full_name}
                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                        className="bg-[#1A1A1A] border border-[#2a2a2a] rounded px-2 py-1 text-2xl focus:outline-none focus:border-[#D4AF37]"
                      />
                    ) : (
                      profile?.full_name
                    )}
                  </h1>
                  <Badge status={(profile?.verification_status || 'pending') as any} />
                  {/* Badge Niveau Professionnel */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getCareerLevel(profile?.missions_completed || 0, profile?.verification_status).color}`}>
                    <Award size={11} />
                    {getCareerLevel(profile?.missions_completed || 0, profile?.verification_status).label}
                  </div>
                </div>
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.accentText} max-w-xs sm:max-w-sm md:max-w-md truncate`} title={`${profile?.profile_type?.replace('_', ' ')} • ${profile?.domain}`}>
                  {profile?.profile_type?.replace('_', ' ')} • {profile?.domain}
                </p>
                {/* Progression Niveau */}
                <div className="mt-3 w-full max-w-md">
                  {(() => {
                    const levelProgress = getNextLevelProgress(profile?.missions_completed || 0, profile?.verification_status)
                    return (
                      <>
                        <p className="text-[10px] text-gray-500 mb-1">{levelProgress.label}</p>
                        {levelProgress.next && (
                          <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#D4AF37] transition-all duration-500"
                              style={{ width: `${(levelProgress.current / levelProgress.next) * 100}%` }}
                            />
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 pt-28 md:pt-24 grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-7xl mx-auto w-full">
            {/* Left Column: Info & Stats */}
            <div className="lg:col-span-8 space-y-10">
              <section>
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-4">{t('profilePage.about')}</h3>
                <Card className="p-6">
                  {isEditing ? (
                    <textarea
                      value={formData.bio}
                      onChange={e => setFormData({...formData, bio: e.target.value})}
                      placeholder={t('profilePage.bioPlaceholder')}
                      className="w-full bg-[#0A0A0A] border border-[#2a2a2a] rounded-xl p-4 text-sm text-gray-300 focus:outline-none focus:border-[#D4AF37] min-h-[120px]"
                    />
                  ) : (
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {profile?.bio || t('profilePage.noBio')}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-6 pt-6 border-t border-[#1A1A1A]">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <MapPin size={14} className="text-[#D4AF37]" />
                      {profile?.city}, {profile?.country}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <Briefcase size={14} className="text-[#D4AF37]" />
                      {profile?.domain}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <Calendar size={14} className="text-[#D4AF37]" />
                      {t('profilePage.memberSince', { year: profile?.created_at ? new Date(profile.created_at).getFullYear() : '—' })}
                    </div>
                  </div>
                </Card>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">{t('profilePage.documentsProofs')}</h3>
                </div>
                <DocumentsSection
                  userId={user?.id}
                  onUploadSuccess={() => {
                    // Refresh the checklist and trigger verification!
                    refreshProfile()
                    handleReVerify()
                  }}
                />
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">{t('profilePage.experiencesProjects')}</h3>
                  <button
                    onClick={() => router.push('/settings')}
                    className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest hover:underline">
                    {t('profilePage.addExp')}
                  </button>
                </div>
                <div className="space-y-4">
                  {profile?.bio ? (
                    <Card className="p-6 flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                        <Briefcase className="text-gray-600" size={20} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{profile?.domain || t('profilePage.professional')}</h4>
                        <p className="text-gray-500 text-xs">{t('profilePage.independent')}</p>
                        <p className="text-gray-400 text-xs mt-2 leading-relaxed">{profile.bio.slice(0, 200)}</p>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6 text-center text-gray-600 text-sm">
                      <p>{t('profilePage.addBioPrompt')} <button onClick={() => router.push('/settings')} className="text-[#D4AF37] hover:underline">{t('profilePage.settingsLink')}</button> {t('profilePage.addBioSuffix')}</p>
                    </Card>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Skills & Social */}
            <div className="lg:col-span-4 space-y-10">
              <section>
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-4">{t('profilePage.statistics')}</h3>
                <Card className="p-6 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-black text-white">{profile?.missions_completed || 0}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{t('profilePage.missions')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-white">{stats.sent}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{t('profilePage.applications')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-white">{stats.sent > 0 ? Math.round(((stats.interviews + stats.offers) / stats.sent) * 100) : 0}%</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{t('profilePage.responseRate')}</p>
                  </div>
                </Card>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-4">{t('profilePage.keySkills')}</h3>
                <Card className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {/* Compétences réelles si renseignées ; sinon le métier
                        tel quel (jamais découpé mot par mot — ça produisait
                        des tags absurdes comme "ET" pour "... et designer") */}
                    {profile?.skills && Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                      profile.skills.map((skill: string) => (
                        <span key={skill} className="px-3 py-1 bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {skill}
                        </span>
                      ))
                    ) : profile?.domain ? (
                      <span className="px-3 py-1 bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {profile.domain}
                      </span>
                    ) : null}
                    {!(profile?.skills && profile.skills.length > 0) && (
                      <button onClick={() => router.push('/settings')} className="text-xs text-gray-600 hover:text-[#D4AF37]">
                        {t('profilePage.addSkillsPrompt')}
                      </button>
                    )}
                  </div>
                </Card>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-4">{t('profilePage.linksNetworks')}</h3>
                <Card className="p-4 space-y-1">
                  {profile?.portfolio_url ? (
                    <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1A1A1A] transition-all text-gray-400 hover:text-white group">
                      <Globe size={16} className="group-hover:text-[#D4AF37]" />
                      <span className="text-xs font-bold tracking-widest uppercase">{t('profilePage.portfolio')}</span>
                      <span className="text-xs text-gray-600 ml-auto truncate max-w-[120px]">{profile.portfolio_url}</span>
                    </a>
                  ) : (
                    <button onClick={() => router.push('/settings')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1A1A1A] transition-all text-gray-600 hover:text-white group">
                      <Globe size={16} /> <span className="text-xs">{t('profilePage.addPortfolio')}</span>
                    </button>
                  )}
                  {profile?.github_url ? (
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1A1A1A] transition-all text-gray-400 hover:text-white group">
                      <Github size={16} className="group-hover:text-[#D4AF37]" />
                      <span className="text-xs font-bold tracking-widest uppercase">GitHub</span>
                      <span className="text-xs text-gray-600 ml-auto truncate max-w-[120px]">{profile.github_url.replace('https://github.com/', '@')}</span>
                    </a>
                  ) : null}
                  {profile?.linkedin_url ? (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1A1A1A] transition-all text-gray-400 hover:text-white group">
                      <LinkIcon size={16} className="group-hover:text-[#D4AF37]" />
                      <span className="text-xs font-bold tracking-widest uppercase">LinkedIn</span>
                    </a>
                  ) : null}
                  {!profile?.portfolio_url && !profile?.github_url && !profile?.linkedin_url && (
                    <p className="text-xs text-gray-700 p-3 text-center">
                      {t('profilePage.noLinks')} <button onClick={() => router.push('/settings')} className="text-[#D4AF37] hover:underline">{t('profilePage.addInSettings')}</button>
                    </p>
                  )}
                </Card>
              </section>

              <Card className={`p-6 bg-gradient-to-br ${theme.gradient} ${theme.borderColor}`}>
                <div className="flex items-center gap-2 mb-3">
                  <ThemeIcon size={16} className={theme.accentText} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.accentText}`}>
                    {profile?.verification_status === 'genius'
                      ? t('profilePage.verification.genius')
                      : profile?.verification_status === 'verified'
                        ? t('profilePage.verification.verified')
                        : t('profilePage.verification.pending')}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  {profile?.verification_status === 'genius'
                    ? t('profilePage.verification.geniusDesc')
                    : profile?.verification_status === 'verified'
                      ? t('profilePage.verification.verifiedDesc')
                      : t('profilePage.verification.pendingDesc')}
                </p>
                {verifyMsg && (
                  <p className={`text-xs mb-3 font-medium ${
                    verifyMsg.startsWith('✅') || verifyMsg.startsWith('🔱') ? 'text-green-400'
                    : verifyMsg.startsWith('⏳') ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>{verifyMsg}</p>
                )}
                {profile?.verification_status === 'pending' && (
                  <GoldButton fullWidth loading={verifying} onClick={handleReVerify} className="text-[10px]">
                    {verifying ? t('profilePage.verification.analyzing') : t('profilePage.verification.launchAnalysis')}
                  </GoldButton>
                )}
                {profile?.verification_status === 'refused' && (
                  <div className="space-y-2">
                    <p className="text-xs text-red-400">{profile.refusal_reason}</p>
                    <GoldButton variant="outlined" fullWidth loading={verifying} onClick={handleReVerify} className="text-[10px]">
                      {t('profilePage.verification.relaunchAnalysis')}
                    </GoldButton>
                  </div>
                )}
                {(profile?.verification_status === 'verified' || profile?.verification_status === 'genius') && (
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <CheckCircle2 size={14} /> {t('profilePage.verification.accessGranted')}
                  </div>
                )}
              </Card>

              {/* Checklist de complétion */}
              <CompletionChecklist profile={profile} userId={user?.id} />            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
