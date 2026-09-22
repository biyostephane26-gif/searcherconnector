'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import GoldButton from '../components/ui/GoldButton'
import { ArrowRight, Globe, Zap, Shield, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function About() {
  const { t } = useTranslation()
  const router = useRouter()

  const STATS = t('aboutPage.stats', { returnObjects: true }) as { title: string; sub: string }[]
  const STAT_ICONS = ['🌍', '📋', '🎯']
  const APPROACH = t('aboutPage.approach', { returnObjects: true }) as { title: string; desc: string }[]
  const APPROACH_ICONS = [
    <Zap className="w-5 h-5 text-[#D4AF37]" key="z" />,
    <Globe className="w-5 h-5 text-[#D4AF37]" key="g" />,
    <Shield className="w-5 h-5 text-[#D4AF37]" key="s" />,
    <Users className="w-5 h-5 text-[#D4AF37]" key="u" />,
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-32 pb-24 space-y-24">

        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-[0.3em] mb-6">
            <span className="w-8 h-px bg-[#D4AF37]" />
            {t('aboutPage.missionLabel')}
            <span className="w-8 h-px bg-[#D4AF37]" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
            {t('aboutPage.heroTitle1')}<br />
            <span className="text-[#D4AF37]">{t('aboutPage.heroTitle2')}</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {t('aboutPage.heroDesc')}
          </p>
        </div>

        {/* Le problème */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-4">{t('aboutPage.problemTitle')}</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                {t('aboutPage.problemP1')}
              </p>
              <p>
                {t('aboutPage.problemP2Prefix')} <strong className="text-white">{t('aboutPage.problemP2Bold')}</strong> {t('aboutPage.problemP2Suffix')}
              </p>
              <p>
                {t('aboutPage.problemP3')}
              </p>
            </div>
          </div>
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-8">
            <div className="space-y-6">
              {STATS.map((s, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-2xl">{STAT_ICONS[i]}</span>
                  <div>
                    <div className="text-[#D4AF37] font-bold text-lg">{s.title}</div>
                    <div className="text-gray-500 text-sm mt-0.5">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* La solution */}
        <div>
          <h2 className="text-2xl font-bold mb-8 text-center">{t('aboutPage.approachTitle')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {APPROACH.map((item, i) => (
              <div key={i} className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-6 hover:border-[#D4AF37]/20 transition-colors">
                <div className="mb-3">{APPROACH_ICONS[i]}</div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fondateur */}
        <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-20 h-20 rounded-2xl bg-[#1A1500] border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black text-2xl flex-shrink-0">
              B
            </div>
            <div>
              <div className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-[0.3em] mb-2">{t('aboutPage.founderLabel')}</div>
              <h3 className="text-xl font-bold text-white mb-1">{t('aboutPage.founderName')}</h3>
              <div className="text-gray-500 text-sm mb-4">{t('aboutPage.founderLocation')}</div>
              <p className="text-gray-400 leading-relaxed text-sm">
                {t('aboutPage.founderQuote')}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <a href="mailto:biyostephane26@gmail.com"
                  className="text-xs text-[#D4AF37] hover:underline">
                  biyostephane26@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Vision */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">{t('aboutPage.visionTitle')}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
            {t('aboutPage.visionDesc')}
          </p>
          <GoldButton onClick={() => router.push('/signup')} className="text-lg px-10">
            {t('aboutPage.joinNow')} <ArrowRight className="w-5 h-5" />
          </GoldButton>
          <p className="text-gray-700 text-xs mt-4">{t('aboutPage.freeToStart')}</p>
        </div>

      </div>

      {/* Footer links */}
      <div className="border-t border-[#1A1A1A] py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600">
          <Link href="/pricing" className="hover:text-[#D4AF37] transition-colors">{t('aboutPage.footerPricing')}</Link>
          <Link href="/privacy" className="hover:text-[#D4AF37] transition-colors">{t('aboutPage.footerPrivacy')}</Link>
          <Link href="/terms"   className="hover:text-[#D4AF37] transition-colors">{t('aboutPage.footerTerms')}</Link>
          <Link href="/support" className="hover:text-[#D4AF37] transition-colors">{t('aboutPage.footerSupport')}</Link>
          <span>{t('aboutPage.copyright', { year: new Date().getFullYear() })}</span>
        </div>
      </div>
    </div>
  )
}
