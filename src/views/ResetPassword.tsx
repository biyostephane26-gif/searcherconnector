'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import Link from 'next/link'
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [loading, setLoading]           = useState(false)
  const [success, setSuccess]           = useState(false)
  const [error, setError]               = useState('')
  const [showPass, setShowPass]         = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setSessionReady(true)
        }
      })
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setSessionReady(true)
      })
      return () => subscription.unsubscribe()
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setSessionReady(true)
      })
    }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 3000)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-[#D4AF37] font-bold text-2xl tracking-tighter inline-block mb-4">
            SEARCHER CONNECTOR
          </Link>
          <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
          <p className="text-gray-500 text-sm mt-2">Choisis un mot de passe sécurisé pour ton compte</p>
        </div>

        <Card className="p-8">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-14 h-14 text-green-400 mx-auto" />
              <h3 className="font-bold text-white text-lg">Mot de passe mis à jour !</h3>
              <p className="text-sm text-gray-400">Redirection vers le dashboard dans quelques secondes...</p>
              <Link href="/dashboard" className="text-[#D4AF37] text-sm hover:underline">
                Aller au dashboard →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 bg-red-900/20 border border-red-800 text-red-400 p-3 rounded-lg text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {!sessionReady && (
                <div className="bg-yellow-900/20 border border-yellow-800/50 text-yellow-400 p-3 rounded-lg text-xs">
                  ⏳ Vérification du lien... Si tu arrives ici depuis un email, attends quelques secondes.
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showPass ? 'text' : 'password'} required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg py-3 pl-10 pr-10 text-sm focus:border-[#D4AF37] outline-none"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="flex gap-1 mt-1 items-center">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-yellow-500' : i <= 3 ? 'bg-blue-400' : 'bg-green-400'
                          : 'bg-[#2a2a2a]'
                      }`} />
                    ))}
                    <span className="text-[10px] text-gray-600 ml-1">
                      {password.length < 6 ? 'Faible' : password.length < 10 ? 'Moyen' : password.length < 14 ? 'Bon' : 'Fort'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Confirmer</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showPass ? 'text' : 'password'} required
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Répète le mot de passe"
                    className={`w-full bg-[#0D0D0D] border rounded-lg py-3 pl-10 pr-4 text-sm outline-none transition-colors ${
                      confirm && confirm !== password ? 'border-red-500'
                      : confirm && confirm === password ? 'border-green-500'
                      : 'border-[#2a2a2a] focus:border-[#D4AF37]'
                    }`}
                  />
                </div>
              </div>

              <GoldButton type="submit" loading={loading} fullWidth disabled={!sessionReady}>
                <Lock className="w-4 h-4 mr-2" />
                Mettre à jour le mot de passe
              </GoldButton>

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                  ← Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
