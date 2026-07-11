'use client'
// =================================================================
// SEARCHER CONNECTOR — TOUR GUIDÉ INTERACTIF
// Affiché automatiquement à la première connexion de l'utilisateur.
// Sauvegardé dans localStorage pour ne jamais se répéter.
// 7 étapes couvrant les fonctionnalités clés de l'app.
// =================================================================

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRight, ArrowLeft, Zap, Bot, Briefcase, MessageSquare, Users, Target, BarChart2, CheckCircle } from 'lucide-react'

const TOUR_KEY = 'sc_tour_completed_v1'

// ── Définition des étapes ────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    icon: <Zap className="w-10 h-10 text-[#D4AF37]" />,
    title: 'Bienvenue sur Searcher Connector 👋',
    description: 'Tu es sur la plateforme qui travaille pour toi 24h/24. En 2 minutes, je te montre comment tout fonctionne.',
    highlight: null,
    position: 'center',
  },
  {
    id: 'scai',
    icon: (
      <img src="/scai-icon.png" alt="SCAI" className="w-10 h-10 rounded-xl object-contain"
        onError={e => { const t = e.target as HTMLImageElement; t.style.display='none' }}
      />
    ),
    title: 'SCAI — Ton entité digitale',
    description: 'SCAI est au cœur de l\'app. C\'est lui qui lance les scans, analyse les résultats et travaille en ton nom. Il pose des questions stratégiques avant chaque scan pour trouver exactement ce que tu cherches.',
    highlight: '[data-tour="agent"]',
    position: 'right',
    tip: 'Commence par parler à SCAI dans l\'onglet "Agent Searcher"',
  },
  {
    id: 'scan',
    icon: <Zap className="w-10 h-10 text-[#D4AF37]" />,
    title: 'Le Scan — 15+ sources simultanées',
    description: 'SCAI interroge plus de 15 sources en parallèle : job boards, plateformes freelance, forums, GitHub, réseaux pro... Il score chaque résultat de 0 à 100 selon ton profil exact.',
    highlight: '[data-tour="dashboard-scan"]',
    position: 'bottom',
    tip: '📋 Plan Gratuit : 8 résultats visibles. Plan Premium : 100+ résultats débloqués.',
  },
  {
    id: 'opportunities',
    icon: <Briefcase className="w-10 h-10 text-[#D4AF37]" />,
    title: 'Tes Opportunités',
    description: 'Après chaque scan, toutes les opportunités trouvées apparaissent ici, triées par score. Tu vois le titre, la source, la fraîcheur de l\'offre et tu peux postuler en un clic.',
    highlight: '[data-tour="opportunities"]',
    position: 'right',
    tip: '⚡ SCAI peut postuler automatiquement en ton nom si tu l\'autorises.',
  },
  {
    id: 'modules',
    icon: <Target className="w-10 h-10 text-[#D4AF37]" />,
    title: 'Les 4 Modules Puissants',
    description: (
      <ul className="text-sm text-gray-300 space-y-2 mt-2">
        <li><span className="text-[#D4AF37] font-bold">Opportunity Creator</span> — Trouve des clients locaux prêts à payer tes services</li>
        <li><span className="text-[#D4AF37] font-bold">Find Your Worker</span> — Recrute le talent parfait pour ton projet</li>
        <li><span className="text-[#D4AF37] font-bold">Portfolio Analyzer</span> — Analyse ton profil et tes projets avec l\'IA</li>
        <li><span className="text-[#D4AF37] font-bold">Cowork</span> — Inbox unifiée Gmail + WhatsApp pour toutes tes candidatures</li>
      </ul>
    ),
    highlight: null,
    position: 'center',
  },
  {
    id: 'social',
    icon: <Users className="w-10 h-10 text-[#D4AF37]" />,
    title: 'Le Réseau Social Pro',
    description: 'Searcher a son propre réseau social. Connecte-toi avec des talents vérifiés, rejoins des groupes, partage tes avancées. Les profils "Genius" et "Verified" sont triés en premier.',
    highlight: '[data-tour="social"]',
    position: 'right',
    tip: '🔱 Le statut GENIUS est attribué aux profils d\'exception — il te met en avant auprès des recruteurs.',
  },
  {
    id: 'profile',
    icon: <BarChart2 className="w-10 h-10 text-[#D4AF37]" />,
    title: 'Complète ton profil',
    description: 'Plus ton profil est complet, plus le scan est précis. Ajoute ton domaine, ta ville, ton portfolio, tes liens LinkedIn/GitHub. SCAI utilise ces infos pour filtrer uniquement les opportunités qui te correspondent.',
    highlight: '[data-tour="profile-completion"]',
    position: 'bottom',
    tip: '🎯 Profil 100% = scan 3x plus précis.',
  },
  {
    id: 'done',
    icon: <CheckCircle className="w-10 h-10 text-green-400" />,
    title: 'C\'est parti 🚀',
    description: 'Tu as tout ce qu\'il faut. Lance ton premier scan en parlant à SCAI dans "Agent Searcher". Il te posera quelques questions et commencera à travailler pour toi.',
    highlight: null,
    position: 'center',
    cta: 'Parler à SCAI maintenant',
    ctaHref: '/agent',
  },
]

// ── Composant Tooltip positionné sur un élément ──────────────────
function TooltipOverlay({
  step,
  stepIndex,
  total,
  onNext,
  onPrev,
  onSkip,
}: {
  step: typeof STEPS[0]
  stepIndex: number
  total: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}) {
  const isCenter = step.position === 'center' || !step.highlight

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay sombre */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Modal centrale */}
      <div className="relative z-10 bg-[#111111] border border-[#D4AF37]/30 rounded-2xl shadow-2xl shadow-[#D4AF37]/10 w-full max-w-md mx-4 p-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Close */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? 'bg-[#D4AF37] w-6'
                  : i < stepIndex
                  ? 'bg-[#D4AF37]/40 w-3'
                  : 'bg-[#2a2a2a] w-3'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mb-5">{step.icon}</div>

        {/* Titre */}
        <h2 className="text-xl font-bold text-white mb-3">{step.title}</h2>

        {/* Description */}
        <div className="text-sm text-gray-400 leading-relaxed mb-4">
          {typeof step.description === 'string' ? step.description : step.description}
        </div>

        {/* Tip */}
        {step.tip && (
          <div className="bg-[#1A1500] border border-[#D4AF37]/20 rounded-lg px-4 py-3 text-xs text-[#D4AF37] mb-6">
            {step.tip}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={onSkip}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Passer le guide
          </button>

          <div className="flex gap-3">
            {stepIndex > 0 && (
              <button
                onClick={onPrev}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#D4AF37]/30 rounded-lg transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Précédent
              </button>
            )}

            {step.cta ? (
              <a
                href={step.ctaHref}
                onClick={onSkip}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-[#D4AF37] text-black rounded-lg hover:bg-[#B8962D] transition-colors"
              >
                {step.cta} <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-[#D4AF37] text-black rounded-lg hover:bg-[#B8962D] transition-colors"
              >
                {stepIndex === total - 2 ? 'Terminer' : 'Suivant'} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <div className="text-center mt-4 text-[10px] text-gray-700 font-bold uppercase tracking-widest">
          {stepIndex + 1} / {total}
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────
export default function AppTour() {
  const [active, setActive]     = useState(false)
  const [stepIndex, setStep]    = useState(0)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
    // Afficher le tour seulement si jamais complété
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      // Délai de 1.5s pour laisser l'app charger
      const t = setTimeout(() => setActive(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  const complete = () => {
    localStorage.setItem(TOUR_KEY, 'true')
    setActive(false)
  }

  const next = () => {
    if (stepIndex < STEPS.length - 1) setStep(s => s + 1)
    else complete()
  }

  const prev = () => {
    if (stepIndex > 0) setStep(s => s - 1)
  }

  if (!mounted || !active) return null

  const step = STEPS[stepIndex]

  return createPortal(
    <TooltipOverlay
      step={step}
      stepIndex={stepIndex}
      total={STEPS.length}
      onNext={next}
      onPrev={prev}
      onSkip={complete}
    />,
    document.body
  )
}

// ── Hook pour relancer le tour manuellement ───────────────────────
export function useRestartTour() {
  return () => {
    localStorage.removeItem(TOUR_KEY)
    window.location.reload()
  }
}
