'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Zap, Search, ShieldCheck, Send, Mail, MessageSquare, Plug, FileText, Image as ImageIcon,
  Globe2, CheckCircle2, ArrowRight, Star, Users2,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import GoldDot from '../components/ui/GoldDot'
import { useTranslation } from 'react-i18next'

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

const FEATURE_ICONS = [Zap, Plug, Send, FileText, ImageIcon, ShieldCheck]
const WORLDWIDE_ICONS = [Globe2, Zap, Star]

export default function Landing() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const HOW_IT_WORKS = t('landing.howItWorks', { returnObjects: true }) as { title: string; desc: string }[]
  const FEATURES = (t('landing.features', { returnObjects: true }) as { title: string; desc: string }[]).map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] }))
  const COMPARISON = t('landing.comparison', { returnObjects: true }) as { feature: string; manual: string }[]
  const WORLDWIDE = (t('landing.worldwide', { returnObjects: true }) as { title: string; desc: string }[]).map((w, i) => ({ ...w, icon: WORLDWIDE_ICONS[i] }))
  const [stats, setStats] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
    fetch('/api/public-stats').then(r => r.ok ? r.json() : null).then(d => setStats(d?.total_opportunities || 0)).catch(() => setStats(0))
  }, [])

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setWaitlistPosition(data.position)
    } catch {
      setError(t('landing.newsletterError'))
    } finally {
      setIsLoading(false)
    }
  }

  const globeData = useMemo(() => [...Array(16).keys()].map(() => ({
    lat: (Math.random() - 0.5) * 180,
    lng: (Math.random() - 0.5) * 360,
    size: Math.random() / 3,
    color: '#D4AF37',
  })), [])

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 px-4 flex flex-col items-center overflow-hidden">
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#D4AF37] rounded-full blur-[150px] opacity-20 pointer-events-none z-0" />
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#D4AF37] rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`, animationDuration: `${2 + Math.random() * 3}s`,
                opacity: Math.random() * 0.6, boxShadow: '0 0 4px rgba(212, 175, 55, 0.8)',
              }}
            />
          ))}
        </div>

        {mounted && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[700px] pointer-events-none opacity-70 z-0">
            <Globe
              width={1000} height={700}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="/earth-night.jpg"
              pointsData={globeData}
              pointColor="color" pointAltitude="size" pointsMerge={true}
              arcsData={[
                { startLat: 48.8566, startLng: 2.3522, endLat: -33.9249, endLng: 18.4241, color: ['#D4AF37', '#D4AF37'] },
                { startLat: 40.7128, startLng: -74.0060, endLat: 35.6762, endLng: 139.6503, color: ['#D4AF37', '#D4AF37'] },
                { startLat: 3.8480, startLng: 11.5021, endLat: 51.5074, endLng: -0.1278, color: ['#D4AF37', '#D4AF37'] },
                { startLat: -1.2921, startLng: 36.8219, endLat: 6.5244, endLng: 3.3792, color: ['#D4AF37', '#D4AF37'] },
                { startLat: 51.5074, startLng: -0.1278, endLat: 40.7128, endLng: -74.0060, color: ['#D4AF37', '#D4AF37'] },
              ]}
              arcColor="color" arcDashLength={0.4} arcDashGap={0.2}
              arcDashInitialGap={() => Math.random()} arcDashAnimateTime={2000}
              arcStroke={0.8} arcsTransitionDuration={0} arcAltitudeAutoScale={0.3}
            />
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center z-10 max-w-4xl mt-8">
          <div className="inline-flex items-center gap-2 bg-[#111111] border border-[#2a2a2a] rounded-full px-4 py-1.5 mb-6">
            <GoldDot />
            <span className="text-[11px] tracking-widest text-gray-400 uppercase font-bold">{t('landing.badge')}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
            {t('landing.heroTitle1')} <br />
            <span className="text-[#D4AF37]">{t('landing.heroTitle2')}</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            {t('landing.heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <GoldButton onClick={() => router.push('/signup')} className="text-base px-10 flex items-center justify-center gap-2">
              {t('landing.createFreeAccount')} <ArrowRight className="w-4 h-4" />
            </GoldButton>
            <GoldButton variant="outlined" onClick={() => router.push('/pricing')} className="text-base px-10">
              {t('landing.viewPricing')}
            </GoldButton>
          </div>
          <p className="text-xs text-gray-600 mb-14">{t('landing.freeToStart')}</p>

          <div className="bg-[#111111]/50 backdrop-blur-2xl border border-[#2a2a2a] rounded-full px-8 py-4 inline-flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GoldDot />
              <span className="text-2xl font-mono font-bold text-[#D4AF37]">{mounted ? stats.toLocaleString(i18n.language) : '—'}</span>
            </div>
            <span className="text-xs tracking-widest text-gray-400 uppercase">{t('landing.opportunitiesFound')}</span>
          </div>
        </motion.div>
      </section>

      {/* ── Fonctionnalités ──────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t('landing.featuresTitle')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('landing.featuresDesc')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Card key={i} className="p-6">
                <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] mb-4">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ────────────────────────────────────── */}
      <section className="py-24 px-4 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 tracking-tight">{t('landing.howItWorksTitle')}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="relative p-8 bg-[#111111] border border-[#2a2a2a] rounded-2xl text-left hover:border-[#D4AF37] transition-colors">
                <span className="text-5xl font-black text-[#1a1a1a] absolute top-4 right-4">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="text-xl font-bold mb-4 text-[#D4AF37]">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparatif ───────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center tracking-tight">{t('landing.comparisonTitle')}</h2>
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="p-6 text-gray-500 text-xs tracking-widest uppercase">{t('landing.comparisonFeature')}</th>
                  <th className="p-6 text-[#D4AF37] text-xs tracking-widest uppercase">Searcher Connector</th>
                  <th className="p-6 text-gray-500 text-xs tracking-widest uppercase">{t('landing.comparisonManual')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {COMPARISON.map(({ feature, manual }, i) => (
                  <tr key={i} className="border-b border-[#2a2a2a] last:border-0">
                    <td className="p-6 font-medium">{feature}</td>
                    <td className="p-6 text-[#D4AF37]"><CheckCircle2 className="w-5 h-5" /></td>
                    <td className="p-6 text-gray-500">{manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Multi-pays / Genius ──────────────────────────────────── */}
      <section className="py-24 px-4 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center tracking-tight">{t('landing.worldwideTitle')}</h2>
          <p className="text-center text-gray-500 mb-16 text-sm max-w-xl mx-auto">{t('landing.worldwideDesc')}</p>
          <div className="grid md:grid-cols-3 gap-8">
            {WORLDWIDE.map((w, i) => (
              <Card key={i} className="flex flex-col p-8">
                <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] mb-4">
                  <w.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{w.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{w.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA finale ───────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tighter">{t('landing.ctaTitle')}</h2>
        <p className="text-gray-500 mb-12 text-sm max-w-lg mx-auto">{t('landing.ctaDesc')}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <GoldButton onClick={() => router.push('/signup')} className="text-lg px-12">
            {t('landing.createFreeAccount')}
          </GoldButton>
          <GoldButton variant="outlined" onClick={() => router.push('/pricing')} className="text-lg px-12">
            {t('landing.viewPricing')}
          </GoldButton>
        </div>

        {/* Capture email secondaire — pas une porte d'entrée, le compte gratuit ci-dessus l'est déjà. */}
        <div className="max-w-md mx-auto border-t border-[#1A1A1A] pt-10">
          <p className="text-xs text-gray-600 mb-4 flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {t('landing.newsletterPrompt')}
          </p>
          {waitlistPosition ? (
            <p className="text-sm text-[#D4AF37] font-semibold">{t('landing.newsletterThanks')}</p>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t('landing.newsletterPlaceholder')} required
                className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-full px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <button type="submit" disabled={isLoading}
                className="bg-[#111111] border border-[#2a2a2a] text-white font-semibold text-sm px-6 py-3 rounded-full hover:border-[#D4AF37] transition-all disabled:opacity-50">
                {isLoading ? '...' : t('landing.newsletterSubmit')}
              </button>
            </form>
          )}
          {error && <p className="text-red-400 mt-3 text-xs">{error}</p>}
        </div>
      </section>

      <Footer />
    </div>
  )
}
