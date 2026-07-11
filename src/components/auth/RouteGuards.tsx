'use client'

import { ReactNode } from 'react'
import LoadingScreen from '../ui/LoadingScreen'

// TEMP: Bypass pour captures d'écran
const BYPASS_AUTH = true

export function HomeGate({ children }: { children: ReactNode }) {
  if (BYPASS_AUTH) return <>{children}</>
  return <LoadingScreen />
}

export function ProtectedGate({ children }: { children: ReactNode }) {
  if (BYPASS_AUTH) return <>{children}</>
  return <LoadingScreen />
}

export function FounderGate({ children }: { children: ReactNode }) {
  if (BYPASS_AUTH) return <>{children}</>
  return <LoadingScreen />
}
