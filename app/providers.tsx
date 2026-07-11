'use client'

import { ReactNode, useEffect } from 'react'
import { AuthProvider } from '../src/contexts/AuthContext'
import '../src/i18n'

export default function Providers({ children }: { children: ReactNode }) {
  // Restaurer le light mode dès le premier rendu (avant tout paint)
  useEffect(() => {
    try {
      const isLight = localStorage.getItem('sc_light_mode') === 'true'
      if (isLight) document.documentElement.classList.add('light-mode')
    } catch { /* localStorage peut être bloqué en SSR */ }
  }, [])

  return <AuthProvider>{children}</AuthProvider>
}
