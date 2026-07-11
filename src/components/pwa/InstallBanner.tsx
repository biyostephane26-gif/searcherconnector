'use client'
// =================================================================
// SEARCHER CONNECTOR — Bannière d'installation PWA
//
// Apparaît automatiquement quand le navigateur signale que
// l'app peut être installée. L'utilisateur clique "Installer"
// et l'app s'ajoute sur son Bureau/téléphone comme une vraie app.
//
// Gère aussi les notifications push.
// =================================================================

import { useState, useEffect } from 'react'
import { Download, X, Bell, BellOff, Smartphone, Monitor } from 'lucide-react'

export default function InstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showBanner, setShowBanner]       = useState(false)
  const [installed, setInstalled]         = useState(false)
  const [notifState, setNotifState]       = useState<'default' | 'granted' | 'denied'>('default')
  const [isIOS, setIsIOS]                 = useState(false)
  const [showIOSGuide, setShowIOSGuide]   = useState(false)

  useEffect(() => {
    // Détecter iOS (Safari ne supporte pas beforeinstallprompt)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Vérifier si déjà installé
    const alreadyInstalled = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true
    setInstalled(alreadyInstalled)

    // Vérifier les notifs
    if ('Notification' in window) {
      setNotifState(Notification.permission as any)
    }

    // Vérifier si déjà refusé récemment
    const dismissed = localStorage.getItem('sc_install_dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed)
      if (Date.now() - dismissedAt < 7 * 24 * 3600 * 1000) return // 7 jours
    }

    // Écouter l'event d'installation Chrome/Edge/Android
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Sur iOS, montrer la bannière manuelle après 10s si pas installé
    if (ios && !alreadyInstalled) {
      const t = setTimeout(() => setShowBanner(true), 10000)
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', handler) }
    }

    // Enregistrer le service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      setShowBanner(false)
      localStorage.removeItem('sc_install_dismissed')
    }
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('sc_install_dismissed', Date.now().toString())
  }

  const handleNotifications = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifState(perm as any)
    if (perm === 'granted' && 'serviceWorker' in navigator) {
      // Enregistrer pour les push notifications
      try {
        const reg = await navigator.serviceWorker.ready
        // Le VAPID key serait ici pour les push server-side
        // Pour l'instant on active juste les notifs locales
      } catch {}
    }
  }

  // App déjà installée — proposer juste les notifs
  if (installed && notifState === 'default') {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm mx-4">
        <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
          <Bell className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Activer les notifications</p>
            <p className="text-xs text-gray-500">Reçois une alerte dès qu'une opportunité est trouvée</p>
          </div>
          <button onClick={handleNotifications}
            className="bg-[#D4AF37] text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#B8962D] transition-colors flex-shrink-0">
            Activer
          </button>
          <button onClick={() => setNotifState('denied')} className="text-gray-600 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (!showBanner || installed) return null

  return (
    <>
      {/* Bannière principale */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-[#111111] border border-[#D4AF37]/40 rounded-2xl p-5 shadow-2xl shadow-[#D4AF37]/10">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {/* Logo officiel Searcher Connector */}
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center flex-shrink-0">
                <img
                  src="/searcher-icon.png"
                  alt="Searcher Connector"
                  className="w-8 h-8 rounded-lg object-contain"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement
                    t.style.display = 'none'
                    t.nextElementSibling?.removeAttribute('style')
                  }}
                />
                {/* Fallback si PNG pas encore uploadé */}
                <span style={{ display: 'none' }} className="text-[#D4AF37] font-black text-lg">S</span>
              </div>
              <div>
                <p className="font-bold text-white text-sm">Searcher Connector</p>
                <p className="text-xs text-gray-500">searcherconnector.com</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-gray-600 hover:text-white transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">
            Installe l'app sur ton {isIOS ? 'iPhone' : 'Bureau'} pour un accès instantané et des notifications en temps réel quand SCAI trouve de nouvelles opportunités.
          </p>

          {/* Features */}
          <div className="flex gap-4 mb-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              {isIOS ? <Smartphone className="w-3 h-3 text-[#D4AF37]" /> : <Monitor className="w-3 h-3 text-[#D4AF37]" />}
              Accès rapide
            </div>
            <div className="flex items-center gap-1.5">
              <Bell className="w-3 h-3 text-[#D4AF37]" />
              Notifications
            </div>
            <div className="flex items-center gap-1.5">
              <Download className="w-3 h-3 text-[#D4AF37]" />
              Hors-ligne
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-2">
            <button onClick={handleDismiss}
              className="flex-1 py-2.5 text-sm text-gray-500 border border-[#2a2a2a] rounded-xl hover:border-[#444] hover:text-white transition-all">
              Plus tard
            </button>
            <button onClick={handleInstall}
              className="flex-1 py-2.5 text-sm font-bold bg-[#D4AF37] text-black rounded-xl hover:bg-[#B8962D] transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Installer
            </button>
          </div>
        </div>
      </div>

      {/* Guide iOS (Safari → Partager → Ajouter) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-end justify-center p-4">
          <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Installer sur iPhone</h3>
              <button onClick={() => setShowIOSGuide(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs flex-shrink-0">1</div>
                <p>Appuie sur <span className="text-white font-bold">l'icône Partager</span> en bas de Safari (le carré avec la flèche vers le haut)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs flex-shrink-0">2</div>
                <p>Fais défiler et appuie sur <span className="text-white font-bold">"Sur l'écran d'accueil"</span></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs flex-shrink-0">3</div>
                <p>Appuie sur <span className="text-white font-bold">"Ajouter"</span> en haut à droite</p>
              </div>
            </div>
            <button onClick={() => setShowIOSGuide(false)}
              className="w-full mt-5 py-3 bg-[#D4AF37] text-black font-bold rounded-xl">
              Compris !
            </button>
          </div>
        </div>
      )}
    </>
  )
}
