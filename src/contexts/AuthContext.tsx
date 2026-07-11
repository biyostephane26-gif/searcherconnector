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
  country?: string
  city?: string
  profile_type?: string
  portfolio_url?: string
  github_url?: string
  linkedin_url?: string
  avatar_url?: string
  salary_min?: number
  profile_completion?: number
  verification_status?: string
  plan?: string
  role?: string
  created_at?: string
  updated_at?: string
  refusal_reason?: string
  skills?: string[]
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      
      if (newSession?.user) {
        fetchProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id)
      }
      
      setLoading(false)
    })

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
