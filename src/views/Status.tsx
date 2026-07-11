'use client'
// =================================================================
// Page de vérification du profil
// Poll Supabase toutes les 3s jusqu'à ce que le statut change
// L'analyse se fait en arrière-plan via /api/verify-profile
// Max 60s d'attente → redirect automatique
// =================================================================

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import { Clock, CheckCircle, Diamond, XCircle, ArrowRight, RefreshCcw, AlertTriangle } from 'lucide-react'

export default function Status() {
  const router = useRouter()
  const { profile, refreshProfile } = useAuth()
  const [elapsed, setElapsed]     = useState(0)

  const status = profile?.verification_status || 'pending'

  // Si déjà vérifié dès l'arrivée → aller au dashboard directement
  useEffect(() => {
    if (status === 'verified' || status === 'genius') {
      refreshProfile().then(() => {
        router.push('/dashboard')
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Déclencher l'analyse en arrière-plan une seule fois ───────
  // NOTE: La vérification se fait désormais directement dans Onboarding.tsx
  // Plus besoin d'appeler verify-profile depuis Status

  // ── Polling — vérifier le statut toutes les 3s ────────────────
  useEffect(() => {
    if (status !== 'pending') return

    const interval = setInterval(async () => {
      setElapsed(e => e + 3)
      await refreshProfile()
    }, 3000)

    return () => clearInterval(interval)
  }, [status, refreshProfile])

  // ── Si toujours pending après 8s → re-déclencher verify-profile ─
  // Cas où la première tentative dans Onboarding a échoué silencieusement
  useEffect(() => {
    if (status !== 'pending') return
    const timer = setTimeout(async () => {
      try {
        // Obtenir userId depuis Supabase auth directement
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session } } = await sb.auth.getSession()
        if (!session?.user?.id) return
        await fetch(`${window.location.origin}/api/verify-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        })
        await refreshProfile()
      } catch { /* non-bloquant */ }
    }, 8000)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redirect automatique après 60s si toujours pending ────────
  useEffect(() => {
    if (elapsed >= 60 && status === 'pending') {
      router.push('/dashboard')
    }
  }, [elapsed, status, router])

  // ── Redirect auto si statut change ───────────────────────────
  useEffect(() => {
    if (status === 'verified' || status === 'genius') {
      // Rafraîchir le profil dans l'AuthContext AVANT de rediriger
      // pour éviter la race condition dans ProtectedGate
      refreshProfile().then(() => {
        setTimeout(() => router.push('/dashboard'), 1000)
      })
    }
  }, [status, router, refreshProfile])

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">

        {/* Header */}
        <div className="mb-12">
          <div className="text-[#D4AF37] font-bold text-2xl tracking-tighter mb-2">SEARCHER CONNECTOR</div>
          <div className="text-[10px] tracking-[0.4em] text-gray-600 uppercase font-bold">Verification Engine</div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── PENDING ───────────────────────────────────────── */}
          {status === 'pending' && (
            <motion.div key="pending"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }} className="space-y-8">

              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[#D4AF37] blur-3xl opacity-10 animate-pulse" />
                <Clock className="w-24 h-24 text-[#D4AF37] mx-auto relative z-10 animate-spin-slow" />
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-3">Analyse en cours...</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  SCAI examine ton profil, tes documents et ta bio. L'analyse prend généralement 15 à 30 secondes.
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#1A1A1A] rounded-full h-1 overflow-hidden">
                <div className="h-full bg-[#D4AF37] transition-all duration-1000 rounded-full"
                  style={{ width: `${Math.min((elapsed / 45) * 100, 95)}%` }} />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                <RefreshCcw className="w-3 h-3 animate-spin" />
                <span>{elapsed < 10 ? 'Initialisation...' : elapsed < 30 ? 'Analyse des preuves...' : 'Finalisation...'}</span>
              </div>

              {/* Bouton "Accéder au dashboard" après 30s */}
              {elapsed >= 30 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-5 border-[#2a2a2a] space-y-3">
                    <div className="flex items-start gap-3 text-left">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-400">
                        L'analyse prend plus longtemps que prévu. Tu peux accéder au dashboard avec un accès limité pendant l'analyse.
                      </p>
                    </div>
                    <GoldButton variant="outlined" fullWidth onClick={() => router.push('/dashboard')}>
                      Accéder au dashboard →
                    </GoldButton>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── VERIFIED ──────────────────────────────────────── */}
          {status === 'verified' && (
            <motion.div key="verified"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-8">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20" />
                <CheckCircle className="w-24 h-24 text-green-500 mx-auto relative z-10" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-3">Accès accordé ✓</h2>
                <p className="text-gray-400">Ton profil a été vérifié. Tu as accès à toutes les fonctionnalités de Searcher Connector.</p>
              </div>
              <p className="text-xs text-gray-600">Redirection automatique...</p>
              <GoldButton onClick={() => router.push('/dashboard')} className="text-lg px-12 mx-auto">
                Accéder au dashboard <ArrowRight className="w-5 h-5" />
              </GoldButton>
            </motion.div>
          )}

          {/* ── GENIUS ────────────────────────────────────────── */}
          {status === 'genius' && (
            <motion.div key="genius"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-8">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[#D4AF37] blur-3xl opacity-30 animate-pulse" />
                <Diamond className="w-24 h-24 text-[#D4AF37] mx-auto relative z-10" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-3 text-gradient-gold">Statut GENIUS détecté 🔱</h2>
                <p className="text-gray-400">SCAI a identifié ton profil comme exceptionnel. Tu bénéficies du niveau d'accès GENIUS — priorité absolue sur la plateforme.</p>
              </div>
              <p className="text-xs text-gray-600">Redirection automatique...</p>
              <GoldButton onClick={() => router.push('/dashboard')} className="text-lg px-12 mx-auto shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                Entrer dans le dashboard <ArrowRight className="w-5 h-5" />
              </GoldButton>
            </motion.div>
          )}

          {/* ── REFUSED ───────────────────────────────────────── */}
          {status === 'refused' && (
            <motion.div key="refused"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-8">
              <XCircle className="w-24 h-24 text-red-500 mx-auto" />
              <div>
                <h2 className="text-3xl font-bold mb-3 text-red-500">Vérification refusée</h2>
                <p className="text-gray-400 mb-4">{profile?.refusal_reason || 'Preuves insuffisantes ou incohérentes.'}</p>
                <Card className="p-5 text-left border-red-900/50 bg-red-900/5">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Comment renforcer ton dossier :</h4>
                  <ul className="text-sm text-gray-500 space-y-2">
                    <li className="flex gap-2"><span>•</span> Ajoute une bio professionnelle détaillée (min. 100 mots)</li>
                    <li className="flex gap-2"><span>•</span> Upload un CV, diplôme ou certificat officiel</li>
                    <li className="flex gap-2"><span>•</span> Fournis un lien vers tes projets réels (GitHub, portfolio)</li>
                    <li className="flex gap-2"><span>•</span> Assure-toi que les informations sont cohérentes et vérifiables</li>
                  </ul>
                </Card>
              </div>
              <GoldButton variant="outlined" onClick={() => router.push('/onboarding')} className="mx-auto">
                Revoir mon dossier
              </GoldButton>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
