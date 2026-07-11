'use client'
// =================================================================
// SEARCHER CONNECTOR — Pricing
// Paiement via Gumroad (carte internationale — zéro paperasse) OU
//           via Monetbil/PayDunya (MTN/Orange Money Afrique)
//
// Gumroad = pas de numéro de taxe, pas de documents, juste un email
// Lemon Squeezy sera activé quand les documents seront disponibles
// =================================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Check, Zap, Star, Crown, Loader2, CreditCard, Smartphone, Globe } from 'lucide-react'

// ── Plans ─────────────────────────────────────────────────────────
// Plans from Master Prompt: FREE, STARTER ($19), PRO ($49), ENTERPRISE ($199+)
const PLANS = [
  {
    name:    'Free',
    nameKey: 'free',
    price:   0,
    priceFCFA: 0,
    icon:    <Check className="w-5 h-5" />,
    features: [
      'Sources RSS + APIs gratuites uniquement',
      '10 missions personnalisées par scan',
      '6 missions gratuites fraîches + 4 premium bloquées',
      'Notifications génériques',
      '2 scans manuels/jour max',
      'SCAI Voice non disponible',
      'Génération PDF non disponible',
    ],
    cta:     'Plan actuel',
    popular: false,
    gumroadUrl:   '',
    monetbilCode: '',
  },
  {
    name:    'Starter',
    nameKey: 'starter',
    price:   19,
    priceFCFA: 11500,   // XAF (~19 USD)
    icon:    <Star className="w-5 h-5" />,
    features: [
      'Sources RSS + APIs gratuites + APIs premium',
      'Toutes les missions sans limite',
      'Notifications ciblées selon profil',
      '10 scans manuels/jour',
      '60 crédits vocaux SCAI/mois',
      'Génération PDF: CV + Lettre de motivation',
    ],
    cta:     'Passer à Starter',
    popular: true,
    gumroadUrl:   process.env.NEXT_PUBLIC_GUMROAD_STARTER_URL || '',
    monetbilCode: 'starter_monthly',
  },
  {
    name:    'Pro',
    nameKey: 'pro',
    price:   49,
    priceFCFA: 29500,
    icon:    <Crown className="w-5 h-5" />,
    features: [
      'Toutes les sources (incluant LinkedIn, Upwork, sources fermées)',
      'Toutes les missions + priorité sur les plus fraîches',
      'Notifications temps réel pour missions <10 postulants',
      'Scans manuels illimités',
      '300 crédits vocaux SCAI/mois',
      'Génération PDF: tous les documents',
      'Simulation d\'entretien avec SCAI',
      'Portfolio Analyzer',
    ],
    cta:     'Passer à Pro',
    popular: false,
    gumroadUrl:   process.env.NEXT_PUBLIC_GUMROAD_PRO_URL || '',
    monetbilCode: 'pro_monthly',
  },

]

type PayMethod = 'card' | 'mobile'

export default function Pricing() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [isFreeMode, setIsFreeMode]       = useState(true)
  const [loadingPlan, setLoadingPlan]     = useState<string | null>(null)
  const [payMethod, setPayMethod]         = useState<PayMethod>('card')
  const [showMobileModal, setShowMobileModal] = useState(false)
  const [selectedPlan, setSelectedPlan]   = useState<typeof PLANS[0] | null>(null)
  const [phone, setPhone]                 = useState('')
  const [mobileLoading, setMobileLoading] = useState(false)
  const [mobileSuccess, setMobileSuccess] = useState(false)

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'FREE_MODE').single()
      .then(({ data }) => { if (data) setIsFreeMode(data.value === 'true') })
  }, [])

  const handleUpgrade = async (plan: typeof PLANS[0]) => {
    if (!user) { router.push('/login'); return }
    if (plan.name === 'Free') return
    if (plan.nameKey === profile?.plan) return

    setSelectedPlan(plan)

    if (payMethod === 'card') {
      // Flutterwave — paiement carte OU Mobile Money depuis une seule page
      setLoadingPlan(plan.name)
      try {
        const res = await fetch('/api/payment/mobile-money', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId:   user.id,
            plan:     plan.nameKey,
            email:    user.email,
            currency: 'USD',
            method:   'flutterwave',
          }),
        })
        const data = await res.json()
        if (data.payment_url) {
          // Flutterwave disponible → redirection directe
          window.open(data.payment_url, '_blank')
        } else {
          // Flutterwave pas encore configuré → fallback email
          const confirmed = confirm(
            `Paiement pour le plan ${plan.name} ($${plan.price}/mois).\n\n` +
            `Envoie un email à biyostephane26@gmail.com :\n` +
            `- Objet : "Abonnement ${plan.name}"\n` +
            `- Ton email : ${user.email}\n\n` +
            `Ton plan sera activé sous 2h.\n\nOuvrir l'email maintenant ?`
          )
          if (confirmed) {
            window.open(
              `mailto:biyostephane26@gmail.com?subject=${encodeURIComponent(`Abonnement ${plan.name} - ${user.email}`)}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite le plan ${plan.name} ($${plan.price}/mois).\n\nMon email : ${user.email}\nMon ID : ${user.id}\n\nMerci !`)}`,
              '_blank'
            )
          }
        }
      } catch {
        alert('Erreur de connexion. Essaie le Mobile Money ou envoie un email.')
      }
      setLoadingPlan(null)
    } else {
      // Mobile Money — ouvrir la modal
      setShowMobileModal(true)
    }
  }

  const handleMobilePayment = async () => {
    if (!phone || phone.length < 9) return
    setMobileLoading(true)
    try {
      const res = await fetch('/api/payment/mobile-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:   user?.id,
          plan:     selectedPlan?.nameKey,
          phone:    phone,
          amount:   selectedPlan?.priceFCFA,
          currency: 'XAF',
        }),
      })
      const data = await res.json()
      if (data.success || data.payment_url) {
        if (data.payment_url) window.open(data.payment_url, '_blank')
        setMobileSuccess(true)
      } else {
        throw new Error(data.error || 'Erreur paiement')
      }
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    } finally {
      setMobileLoading(false)
    }
  }

  const currentPlanIdx = PLANS.findIndex(p => p.nameKey === (profile?.plan || 'free'))

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">Plans & Tarifs</h2>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">Paiement mondial + Mobile Money Afrique</div>
        </header>

        <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-10">

          {/* Beta banner */}
          {isFreeMode && (
            <div className="bg-[#1A1500] border border-[#D4AF37]/30 p-4 rounded-xl text-center">
              <span className="text-[#D4AF37] font-bold tracking-widest text-xs uppercase">
                🎉 Période Beta — Toutes les fonctionnalités sont gratuites pour les membres vérifiés.
              </span>
            </div>
          )}

          {/* Sélecteur de méthode de paiement */}
          <div className="flex items-center justify-center gap-4">
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-1.5 flex gap-1.5">
              <button
                onClick={() => setPayMethod('card')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${payMethod === 'card' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>
                <CreditCard className="w-4 h-4" />
                Carte bancaire
              </button>
              <button
                onClick={() => setPayMethod('mobile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${payMethod === 'mobile' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>
                <Smartphone className="w-4 h-4" />
                Mobile Money
              </button>
            </div>
          </div>

          {/* Info méthode */}
          <div className="text-center text-xs text-gray-600">
            {payMethod === 'card'
              ? <span>💳 Visa, Mastercard, <strong className="text-gray-400">Flutterwave</strong> — carte internationale ou Mobile Money en un clic</span>
              : <span><Smartphone className="w-3 h-3 inline mr-1" />MTN Mobile Money · Orange Money · Wave — <strong className="text-gray-400">Cameroun, Sénégal, Côte d'Ivoire, +20 pays</strong></span>
            }
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan, idx) => {
              const isCurrent = plan.nameKey === (profile?.plan || 'free')
              const isDowngrade = idx < currentPlanIdx
              return (
                <Card key={plan.name}
                  className={`p-7 flex flex-col relative overflow-hidden ${plan.popular ? 'border-[#D4AF37]' : ''}`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-[#D4AF37] text-[#0A0A0A] text-[9px] font-bold px-3 py-1 rounded-bl-lg tracking-widest uppercase">
                      Populaire
                    </div>
                  )}
                  <div className="text-[#D4AF37] mb-3">{plan.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-white">
                      {payMethod === 'mobile' && plan.price > 0
                        ? plan.priceFCFA.toLocaleString('fr-FR')
                        : plan.price === 0 ? '0' : `$${plan.price}`}
                    </span>
                    <span className="text-gray-500 text-xs">
                      /{payMethod === 'mobile' && plan.price > 0 ? 'mois FCFA' : plan.price === 0 ? '' : 'mois USD'}
                    </span>
                  </div>
                  {payMethod === 'mobile' && plan.price > 0 && (
                    <p className="text-[10px] text-gray-600 mb-4">≈ ${plan.price} USD</p>
                  )}

                  <div className="space-y-3 mb-8 flex-1 mt-4">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2 text-xs text-gray-400">
                        <Check className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                        {f}
                      </div>
                    ))}
                  </div>

                  <GoldButton
                    variant={plan.popular ? 'filled' : 'outlined'}
                    fullWidth
                    disabled={isCurrent || isDowngrade || loadingPlan !== null}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {loadingPlan === plan.name ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      '✓ Plan actuel'
                    ) : isDowngrade ? (
                      'Plan inférieur'
                    ) : (
                      plan.cta
                    )}
                  </GoldButton>
                </Card>
              )
            })}
          </div>

          {/* Note transparence */}
          <div className="text-center text-xs text-gray-700 space-y-1">
            <p>💳 Paiements carte traités par <strong className="text-gray-500">Gumroad</strong> — zéro paperasse, zéro TVA à déclarer pour toi</p>
            <p>📱 Paiements Mobile Money traités par <strong className="text-gray-500">Monetbil / PayDunya</strong> — instantané</p>
            <p>Annulation à tout moment · Aucun engagement · Si problème : <a href="mailto:biyostephane26@gmail.com" className="text-[#D4AF37] hover:underline">biyostephane26@gmail.com</a></p>
          </div>
        </div>
      </main>

      {/* ── Modal Mobile Money ─────────────────────────────────── */}
      {showMobileModal && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-2xl p-8 w-full max-w-sm space-y-5">
            {!mobileSuccess ? (
              <>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Paiement Mobile Money</h3>
                  <p className="text-sm text-gray-500">
                    Plan <strong className="text-[#D4AF37]">{selectedPlan.name}</strong> — {selectedPlan.priceFCFA.toLocaleString('fr-FR')} FCFA/mois
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Numéro Mobile Money
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="ex: 237 6XX XXX XXX"
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none"
                  />
                  <p className="text-xs text-gray-600">MTN Mobile Money · Orange Money · Wave acceptés</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowMobileModal(false)}
                    className="flex-1 py-2.5 text-sm text-gray-500 border border-[#2a2a2a] rounded-xl hover:border-[#444]">
                    Annuler
                  </button>
                  <GoldButton onClick={handleMobilePayment} loading={mobileLoading} className="flex-1">
                    Payer
                  </GoldButton>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="text-4xl">📱</div>
                <h3 className="font-bold text-white">Demande envoyée !</h3>
                <p className="text-sm text-gray-400">
                  Valide le paiement sur ton téléphone.<br />
                  Ton plan sera activé automatiquement après confirmation.
                </p>
                <GoldButton fullWidth onClick={() => { setShowMobileModal(false); setMobileSuccess(false) }}>
                  Fermer
                </GoldButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
