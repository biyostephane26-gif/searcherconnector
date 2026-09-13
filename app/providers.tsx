'use client'

import { ReactNode, useEffect } from 'react'
import { AuthProvider } from '../src/contexts/AuthContext'
import '../src/i18n'

export default function Providers({ children }: { children: ReactNode }) {
  // Le thème est appliqué avant le premier rendu par le script inline de
  // layout.tsx ; ici on resynchronise seulement si le stockage a changé.
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark-mode', localStorage.getItem('sc_theme') === 'dark')
    } catch { /* localStorage peut être bloqué */ }
  }, [])

  return <AuthProvider>{children}</AuthProvider>
}
