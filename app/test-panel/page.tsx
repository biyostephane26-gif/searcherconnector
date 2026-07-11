// =================================================================
// SEARCHER CONNECTOR — TEST PANEL PAGE
// =================================================================

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TestPanel from '@/views/TestPanel'

export default function TestPanelPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthorization()
  }, [])

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Vérifier si l'utilisateur est founder
      const { data: profile } = await supabase
        .from('users_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'founder') {
        router.push('/dashboard')
        return
      }

      setAuthorized(true)
    } catch (error) {
      console.error('Authorization error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center'>
        <div className='text-white'>Vérification des permissions...</div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <TestPanel />
}
