'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import LoadingScreen from '../ui/LoadingScreen'

// HomeGate protège la page publique (landing) — accessible à tous,
// connecté ou non, donc rien à vérifier ici.
export function HomeGate({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// ProtectedGate protégeait ~20 pages (dashboard, settings, profile,
// opportunities...) via un flag `BYPASS_AUTH = true` codé en dur, qui
// désactivait TOUTE vérification — ces pages étaient accessibles sans
// être connecté (le rendu restait vide car les hooks de données internes
// font `if (!user) return`, mais la page elle-même n'était pas protégée
// et ne redirigeait jamais vers /login). Vraie vérification maintenant.
export function ProtectedGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
  }, [user, loading, router])

  if (loading || !user) return <LoadingScreen />
  return <>{children}</>
}

// FounderGate ne vérifie que la connexion — la vérification du rôle
// founder (avec redirection si le compte n'est pas fondateur) reste dans
// Founder.tsx lui-même, qui la fait déjà correctement.
export function FounderGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
  }, [user, loading, router])

  if (loading || !user) return <LoadingScreen />
  return <>{children}</>
}
