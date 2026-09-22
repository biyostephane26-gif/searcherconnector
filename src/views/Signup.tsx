'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import { Shield, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type SignupProfileType = 'freelance'

export default function Signup() {
  const { t } = useTranslation()
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const { signUp }    = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [emailSent, setEmailSent] = useState(false) // confirmation envoyée

  const profileType: SignupProfileType = 'freelance'

  const FOUNDER_EMAILS = [
    'biyostephane26@gmail.com',
    'stephanenana.pro@gmail.com',
    process.env.NEXT_PUBLIC_FOUNDER_EMAIL || '',
  ].filter(Boolean).map(e => e.toLowerCase())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError(t('signup.passwordTooShort'))
      setLoading(false)
      return
    }

    try {
      const { data, error: signUpError } = await signUp(email, password)

      // Supabase retourne parfois {} comme erreur quand email confirmation est activé
      // mais l'inscription a quand même réussi — on vérifie data.user
      const errorMsg = signUpError?.message || ''
      if (signUpError && errorMsg && errorMsg !== '{}') throw signUpError

      const newUser = data?.user

      if (newUser) {
        const isFounder  = FOUNDER_EMAILS.includes(email.toLowerCase())
        const timezone   = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Douala'

        // Insérer le profil — ne pas bloquer si erreur (user existe peut-être déjà)
        await supabase.from('users_profiles').upsert({
          id:                  newUser.id,
          full_name:           fullName,
          email:               email,
          profile_type:        profileType,
          role:                isFounder ? 'founder' : 'user',
          verification_status: isFounder ? 'genius'  : 'pending',
          plan:                isFounder ? 'pro' : 'free',
          profile_completion:  0,
        }, { onConflict: 'id', ignoreDuplicates: false })

        try {
          await supabase.from('agent_schedules').upsert({
            user_id:              newUser.id,
            scan_frequency_hours: 6,
            auto_apply_threshold: 80,
            timezone,
          })
        } catch { /* non-bloquant */ }

        // Email de bienvenue via notre service Resend
        try {
          await fetch('/api/email/welcome', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: fullName }),
          })
        } catch { /* non-bloquant — ne pas bloquer l'inscription */ }

        // Parrainage — avant ce fix, ?ref= n'était jamais lu du tout,
        // aucun filleul n'a jamais été suivi depuis la création du
        // programme. Non-bloquant : un souci ici ne doit jamais empêcher
        // l'inscription elle-même.
        const refCode = searchParams?.get('ref')
        if (refCode) {
          try {
            const { data: referrer } = await supabase
              .from('users_profiles')
              .select('id')
              .eq('referral_code', refCode)
              .maybeSingle()
            if (referrer && referrer.id !== newUser.id) {
              await supabase.from('referrals').insert({
                referrer_id: referrer.id,
                referred_id: newUser.id,
              })
            }
          } catch { /* non-bloquant */ }
        }

        // Supabase peut confirmer auto (si désactivé dans dashboard)
        // ou demander confirmation email
        if (newUser.confirmed_at || newUser.email_confirmed_at) {
          // Email déjà confirmé → aller directement à l'onboarding
          router.push('/onboarding')
        } else {
          // Email de confirmation requis
          setEmailSent(true)
        }
      } else {
        // Supabase a créé le user mais pas retourné l'objet complet
        // (cas fréquent quand email confirmation est activé)
        setEmailSent(true)
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError(t('signup.alreadyRegistered'))
      } else if (msg.includes('email') && msg.includes('confirm')) {
        setError(t('signup.confirmationAlreadySent'))
      } else if (!msg || msg === '{}' || msg === '[object Object]') {
        setError(t('signup.connectionError'))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Écran de confirmation email ──────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <Link href="/" className="text-[#D4AF37] font-bold text-2xl tracking-tighter inline-block">
            SEARCHER CONNECTOR
          </Link>
          <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-2xl p-10 space-y-5">
            <CheckCircle className="w-16 h-16 text-[#D4AF37] mx-auto" />
            <h2 className="text-xl font-bold text-white">{t('signup.checkInboxTitle')}</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t('signup.confirmationSentTo')}<br />
              <strong className="text-white">{email}</strong>
            </p>
            <div className="bg-[#0D0D0D] rounded-xl p-4 text-left space-y-2 text-xs text-gray-500">
              <p>1. {t('signup.step1')} <strong className="text-gray-300">Searcher Connector</strong></p>
              <p>2. {t('signup.step2Part1')} <strong className="text-[#D4AF37]">{t('signup.step2Part2')}</strong></p>
              <p>3. {t('signup.step3')}</p>
            </div>
            <p className="text-xs text-gray-600">{t('signup.checkSpam')}</p>
            <button
              onClick={async () => {
                await supabase.auth.resend({ type: 'signup', email })
                // feedback visuel simple sans alert
                const btn = document.activeElement as HTMLButtonElement
                if (btn) { btn.textContent = t('signup.resendSuccess'); btn.disabled = true }
              }}
              className="text-xs text-[#D4AF37] hover:underline"
            >
              {t('signup.resendEmail')}
            </button>
          </div>
          <Link href="/login" className="text-xs text-gray-600 hover:text-gray-400 block">
            {t('signup.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-[#D4AF37] font-bold text-2xl tracking-tighter inline-block mb-4">
            SEARCHER CONNECTOR
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('signup.createAccount')}</h1>
          <p className="text-gray-500 text-sm mt-2">
            {t('signup.joiningAs')} <span className="text-[#D4AF37] font-bold">{profileType.replace('_', ' ')}</span>
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/20 border border-red-800 text-red-400 p-3 rounded-lg text-xs">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">{t('signup.fullName')}</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg py-3 pl-10 pr-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder={t('signup.fullNamePlaceholder')} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg py-3 pl-10 pr-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder="john@example.com" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg py-3 pl-10 pr-10 text-sm focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder={t('signup.passwordPlaceholder')} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= i * 3
                        ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-yellow-500' : i <= 3 ? 'bg-blue-400' : 'bg-green-400'
                        : 'bg-[#2a2a2a]'
                    }`} />
                  ))}
                </div>
              )}
            </div>

            <GoldButton type="submit" loading={loading} fullWidth>
              {t('signup.createAccountBtn')} <ArrowRight className="w-4 h-4" />
            </GoldButton>
          </form>

          <div className="mt-6 pt-5 border-t border-[#2a2a2a] text-center space-y-2">
            <p className="text-gray-500 text-xs">
              {t('signup.alreadyHaveAccount')}{' '}
              <Link href="/login" className="text-[#D4AF37] font-bold hover:underline">{t('signup.signIn')}</Link>
            </p>
            <p className="text-[10px] text-gray-700 leading-relaxed">
              {t('signup.termsAgreement')}{' '}
              <Link href="/terms" className="text-gray-500 hover:text-[#D4AF37]">{t('signup.terms')}</Link>
              {' '}{t('signup.and')}{' '}
              <Link href="/privacy" className="text-gray-500 hover:text-[#D4AF37]">{t('signup.privacyPolicy')}</Link>.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
