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
import { useTranslation } from 'react-i18next'

// ── Plans ─────────────────────────────────────────────────────────
// Plans from Master Prompt: FREE, STARTER ($19), PRO ($49), ENTERPRISE ($199+)
// Nom/features viennent de i18n (clé pricingPage.plans.<nameKey>) — seuls
// les identifiants stables (nameKey, price, urls) restent ici.
const PLAN_DEFS = [
  { nameKey: 'free', price: 0, priceFCFA: 0, icon: <Check className="w-5 h-5" />, popular: false, gumroadUrl: '', monetbilCode: '' },
  { nameKey: 'pro', price: 19, priceFCFA: 11500, icon: <Star className="w-5 h-5" />, popular: true, gumroadUrl: process.env.NEXT_PUBLIC_GUMROAD_STARTER_URL || '', monetbilCode: 'pro_monthly' },
  { nameKey: 'premium', price: 49, priceFCFA: 29500, icon: <Crown className="w-5 h-5" />, popular: false, gumroadUrl: process.env.NEXT_PUBLIC_GUMROAD_PRO_URL || '', monetbilCode: 'premium_monthly' },
]

type PayMethod = 'card' | 'mobile'

export default function Pricing() {
  const { t, i18n } = useTranslation()
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

  const planI18n = t('pricingPage.plans', { returnObjects: true }) as Record<string, { name: string; features: string[]; cta: string }>
  const PLANS = PLAN_DEFS.map(p => ({ ...p, name: planI18n[p.nameKey].name, features: planI18n[p.nameKey].features, cta: planI18n[p.nameKey].cta }))

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'FREE_MODE').single()
      .then(({ data }) => { if (data) setIsFreeMode(data.value === 'true') })
  }, [])

  const handleUpgrade = async (plan: typeof PLANS[0]) => {
    if (!user) { router.push('/login'); return }
    if (plan.nameKey === 'free') return
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
          const confirmed = confirm(t('pricingPage.emailFallback.confirm', { plan: plan.name, price: plan.price, email: user.email }))
          if (confirmed) {
            window.open(
              `mailto:biyostephane26@gmail.com?subject=${encodeURIComponent(`Abonnement ${plan.name} - ${user.email}`)}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite le plan ${plan.name} ($${plan.price}/mois).\n\nMon email : ${user.email}\nMon ID : ${user.id}\n\nMerci !`)}`,
              '_blank'
            )
          }
        }
      } catch {
        alert(t('pricingPage.connectionError'))
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
        throw new Error(data.error || t('pricingPage.paymentError'))
      }
    } catch (err: any) {
      alert(t('pricingPage.paymentErrorPrefix') + err.message)
    } finally {
      setMobileLoading(false)
    }
  }

  const currentPlanIdx = PLANS.findIndex(p => p.nameKey === (profile?.plan || 'free'))

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">{t('pricingPage.title')}</h2>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">{t('pricingPage.subtitle')}</div>
        </header>

        <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-10">

          {/* Beta banner */}
          {isFreeMode && (
            <div className="bg-[#1A1500] border border-[#D4AF37]/30 p-4 rounded-xl text-center">
              <span className="text-[#D4AF37] font-bold tracking-widest text-xs uppercase">
                {t('pricingPage.betaBanner')}
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
                {t('pricingPage.card')}
              </button>
              <button
                onClick={() => setPayMethod('mobile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${payMethod === 'mobile' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>
                <Smartphone className="w-4 h-4" />
                {t('pricingPage.mobileMoney')}
              </button>
            </div>
          </div>

          {/* Info méthode */}
          <div className="text-center text-xs text-gray-600">
            {payMethod === 'card'
              ? <span>{t('pricingPage.cardInfo', { provider: 'Flutterwave' })}</span>
              : <span><Smartphone className="w-3 h-3 inline mr-1" />{t('pricingPage.mobileInfo', { countries: t('pricingPage.mobileCountries') })}</span>
            }
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan, idx) => {
              const isCurrent = plan.nameKey === (profile?.plan || 'free')
              const isDowngrade = idx < currentPlanIdx
              return (
                <Card key={plan.nameKey}
                  className={`p-7 flex flex-col relative overflow-hidden ${plan.popular ? 'border-[#D4AF37]' : ''}`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-[#D4AF37] text-[#0A0A0A] text-[9px] font-bold px-3 py-1 rounded-bl-lg tracking-widest uppercase">
                      {t('pricingPage.popular')}
                    </div>
                  )}
                  <div className="text-[#D4AF37] mb-3">{plan.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-white">
                      {payMethod === 'mobile' && plan.price > 0
                        ? plan.priceFCFA.toLocaleString(i18n.language)
                        : plan.price === 0 ? '0' : `$${plan.price}`}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {payMethod === 'mobile' && plan.price > 0 ? t('pricingPage.perMonthFcfa') : plan.price === 0 ? '' : t('pricingPage.perMonthUsd')}
                    </span>
                  </div>
                  {payMethod === 'mobile' && plan.price > 0 && (
                    <p className="text-[10px] text-gray-600 mb-4">{t('pricingPage.approxUsd', { price: plan.price })}</p>
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
                      t('pricingPage.currentPlan')
                    ) : isDowngrade ? (
                      t('pricingPage.lowerPlan')
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
            <p>{t('pricingPage.gumroadNote', { provider: 'Gumroad' })}</p>
            <p>{t('pricingPage.monetbilNote', { provider: 'Monetbil / PayDunya' })}</p>
            <p>{t('pricingPage.cancelNote')} <a href="mailto:biyostephane26@gmail.com" className="text-[#D4AF37] hover:underline">biyostephane26@gmail.com</a></p>
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
                  <h3 className="text-lg font-bold text-white mb-1">{t('pricingPage.mobileModal.title')}</h3>
                  <p className="text-sm text-gray-500">
                    {t('pricingPage.mobileModal.planLine', { plan: selectedPlan.name, price: selectedPlan.priceFCFA.toLocaleString(i18n.language) })}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {t('pricingPage.mobileModal.phoneLabel')}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={t('pricingPage.mobileModal.phonePlaceholder')}
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white focus:border-[#D4AF37] outline-none"
                  />
                  <p className="text-xs text-gray-600">{t('pricingPage.mobileModal.acceptedProviders')}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowMobileModal(false)}
                    className="flex-1 py-2.5 text-sm text-gray-500 border border-[#2a2a2a] rounded-xl hover:border-[#444]">
                    {t('pricingPage.mobileModal.cancel')}
                  </button>
                  <GoldButton onClick={handleMobilePayment} loading={mobileLoading} className="flex-1">
                    {t('pricingPage.mobileModal.pay')}
                  </GoldButton>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="text-4xl">📱</div>
                <h3 className="font-bold text-white">{t('pricingPage.mobileModal.sentTitle')}</h3>
                <p className="text-sm text-gray-400">
                  {t('pricingPage.mobileModal.sentDesc')}<br />
                  {t('pricingPage.mobileModal.sentDesc2')}
                </p>
                <GoldButton fullWidth onClick={() => { setShowMobileModal(false); setMobileSuccess(false) }}>
                  {t('pricingPage.mobileModal.close')}
                </GoldButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
