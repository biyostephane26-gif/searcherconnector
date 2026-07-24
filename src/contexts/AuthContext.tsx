'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  full_name: string
  email: string
  bio?: string
  domain?: string
  domains?: string[]
  country?: string
  city?: string
  profile_type?: string
  portfolio_url?: string
  github_url?: string
  linkedin_url?: string
  avatar_url?: string
  salary_min?: number
  salary_max?: number
  currency?: string
  profile_completion?: number
  verification_status?: string
  plan?: string
  role?: string
  created_at?: string
  updated_at?: string
  refusal_reason?: string
  skills?: string[]
  search_preferences?: { scai_learning?: boolean; [key: string]: any }
  referral_code?: string
  referred_by?: string
  missions_completed?: number
  free_mode?: boolean
  surveillance_active?: boolean
  salary_alert_threshold?: number
  stripe_customer_id?: string
  stripe_subscription_id?: string
  plan_expires_at?: string
  whatsapp_number?: string
  response_template?: string
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      setProfile(data || null)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  async function signUp(email: string, password: string) {
    const result = await supabase.auth.signUp({ email, password })
    
    if (result.data.user) {
      await supabase.from('users_profiles').insert({
        id: result.data.user.id,
        email: email,
        full_name: '',
        profile_type: 'job_seeker',
        verification_status: 'pending',
        plan: 'free',
        role: 'user',
        profile_completion: 0,
        surveillance_active: false,
        free_mode: true
      })
    }
    
    return result
  }
  
  async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password })
  }
  
  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    window.location.href = '/'
  }

  useEffect(() => {
    // `loading` (authLoading côté consommateurs comme FounderGate/isFounder)
    // ne doit passer à false qu'UNE FOIS le profil réellement chargé — sinon
    // tout garde qui attend "authLoading === false" avant de juger juge sur
    // un `profile` encore null et redirige à tort (ex: un vrai founder
    // éjecté de /founder parce que fetchProfile() n'avait pas fini).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
      } finally {
        setLoading(false)
      }
    })

    // Avant ce fix : aucun .catch() ici — un token corrompu/expiré dont le
    // rafraîchissement échoue faisait rejeter cette promesse, setLoading(false)
    // n'était jamais atteint, et l'écran de chargement tournait indéfiniment
    // (signalé par un utilisateur réel bloqué sur /profile).
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      try {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id)
        }
      } finally {
        setLoading(false)
      }
    }).catch(() => setLoading(false))

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
