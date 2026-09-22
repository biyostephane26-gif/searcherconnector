'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import { Mail, Lock, ArrowRight, KeyRound, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent]   = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: signInError } = await signIn(email, password)
      if (signInError) throw signInError
      router.push('/dashboard')
    } catch (err: any) {
      // Messages d'erreur traduits et clairs
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError(t('auth.errors.invalidCredentials'))
      } else if (msg.includes('Email not confirmed')) {
        setError(t('auth.errors.emailNotConfirmed'))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        // Supabase renvoie succès même si l'email n'existe pas (sécurité)
        // On affiche toujours le succès
      }
      setResetSent(true)
    } catch (err: any) {
      // Afficher succès même en cas d'erreur réseau pour la sécurité
      setResetSent(true)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-[#D4AF37] font-bold text-2xl tracking-tighter inline-block mb-4">
            SEARCHER CONNECTOR
          </Link>
          {!showReset ? (
            <>
              <h1 className="text-2xl font-bold text-white">{t('auth.welcomeBack')}</h1>
              <p className="text-gray-500 text-sm mt-2">{t('auth.enterCredentials')}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">{t('auth.forgotPasswordTitle')}</h1>
              <p className="text-gray-500 text-sm mt-2">{t('auth.forgotPasswordDesc')}</p>
            </>
          )}
        </div>

        <Card className="p-8">
          {/* ── Formulaire de connexion ── */}
          {!showReset && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-400 p-3 rounded-lg text-xs">
                  {error}
                </div>
              )}
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">{t('auth.password')}</label>
                  <button type="button" onClick={() => { setShowReset(true); setError(null) }}
                    className="text-xs text-[#D4AF37] hover:underline">
                    {t('auth.forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg py-3 pl-10 pr-4 text-sm focus:border-[#D4AF37] outline-none transition-colors"
                    placeholder="••••••••" />
                </div>
              </div>
              <GoldButton type="submit" loading={loading} fullWidth>
                {t('auth.signIn')} <ArrowRight className="w-4 h-4" />
              </GoldButton>
            </form>
          )}

          {/* ── Formulaire reset password ── */}
          {showReset && !resetSent && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-400 p-3 rounded-lg text-xs">{error}</div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">{t('auth.yourEmail')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg py-3 pl-10 pr-4 text-sm focus:border-[#D4AF37] outline-none"
                    placeholder="john@example.com" />
                </div>
              </div>
              <GoldButton type="submit" loading={resetLoading} fullWidth>
                <KeyRound className="w-4 h-4 mr-2" /> {t('auth.sendLink')}
              </GoldButton>
              <button type="button" onClick={() => setShowReset(false)}
                className="w-full text-center text-xs text-gray-500 hover:text-white transition-colors">
                {t('auth.backToLogin')}
              </button>
            </form>
          )}

          {/* ── Confirmation envoi reset ── */}
          {showReset && resetSent && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-14 h-14 text-green-400 mx-auto" />
              <h3 className="font-bold text-white text-lg">{t('auth.emailSent')}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {t('auth.checkInbox', { email: resetEmail })}<br />
                {t('auth.clickLink')}<br />
                <span className="text-xs text-gray-600">{t('auth.checkSpam')}</span>
              </p>
              <button onClick={() => { setShowReset(false); setResetSent(false) }}
                className="text-xs text-[#D4AF37] hover:underline">
                {t('auth.backToLogin').replace('← ', '')}
              </button>
            </div>
          )}

          {!showReset && (
            <div className="mt-8 pt-6 border-t border-[#2a2a2a] text-center">
              <p className="text-gray-500 text-xs">
                {t('auth.noAccount')}{' '}
                <Link href="/signup" className="text-[#D4AF37] font-bold hover:underline">
                  {t('auth.createAccount')}
                </Link>
              </p>
            </div>
          )}
        </Card>

        <p className="text-center text-[10px] text-gray-600 mt-8 tracking-widest uppercase">
          {t('auth.securedBy')}
        </p>
      </div>
    </div>
  )
}
