'use client'
// Enregistre le Service Worker côté client uniquement
import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {
          // Vérifier les mises à jour toutes les heures
          setInterval(() => reg.update(), 3600000)
        })
        .catch(() => {})
    }
  }, [])
  return null
}
