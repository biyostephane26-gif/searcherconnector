'use client'
// =================================================================
// SEARCHER CONNECTOR — GUIDE COMPLET / BROCHURE PDF
// Page imprimable (Ctrl+P → Enregistrer en PDF)
// Couvre toutes les fonctionnalités de l'app avec visuels ASCII
// =================================================================

import { useRef } from 'react'
import { Printer, Download, ArrowLeft, Zap, Bot, Briefcase, Users, Target, BarChart2, Inbox, DollarSign, Shield, MessageSquare, BookOpen, Search, CheckCircle, Globe, Clock, Star } from 'lucide-react'
import Link from 'next/link'
import { usePDF } from '../hooks/usePDF'
import { useTranslation } from 'react-i18next'

// ── Sections du guide ────────────────────────────────────────────
const FEATURE_META = [
  {
    icon: (
      <img src="/scai-icon.png" alt="SCAI" className="w-6 h-6 rounded-lg object-contain"
        onError={e => { (e.target as HTMLImageElement).style.display='none' }}
      />
    ),
    tagColor: 'text-[#D4AF37] bg-[#D4AF37]/10',
    visual: `
┌─────────────────────────────────┐
│  SCAI                    🔱     │
│  ─────────────────────────────  │
│  "Bonjour. Je vois que tu es   │
│  développeur au Cameroun.       │
│  Tu cherches du freelance ou    │
│  un emploi salarié ?"           │
│                                 │
│  [Freelance] [Emploi] [Les deux]│
└─────────────────────────────────┘`,
  },
  {
    icon: <Zap className="w-6 h-6 text-[#D4AF37]" />,
    tagColor: 'text-blue-400 bg-blue-400/10',
    visual: `
Serper ──┐
Brave ───┤                ┌── Score 94/100
Exa.ai ──┤  → SCAI ──────┼── Score 87/100
Remotive ┤  (tri + score) ├── Score 76/100
HN ──────┤                └── ... (100+)
GitHub ──┘`,
  },
  {
    icon: <Briefcase className="w-6 h-6 text-[#D4AF37]" />,
    tagColor: 'text-green-400 bg-green-400/10',
    visual: `
┌──────────────────────────────────────┐
│ 🎯 94  Senior Growth Hacker          │
│        Remote · Wellfound            │
│        Il y a 2h · Voir l'offre →   │
├──────────────────────────────────────┤
│ 🎯 87  Freelance Marketing Manager  │
│        Upwork · Remote Africa        │
│        Il y a 5h · Postuler →        │
├──────────────────────────────────────┤
│ 🔒 83  [Débloquer avec Premium]      │
└──────────────────────────────────────┘`,
  },
  {
    icon: <Target className="w-6 h-6 text-[#D4AF37]" />,
    tagColor: 'text-purple-400 bg-purple-400/10',
    visual: `
Entreprise XYZ
Score digital : 23/100
Manque : site web, Instagram, SEO
Budget estimé : 200-500$
────────────────────────────
"Bonjour, j'ai analysé votre
 présence en ligne. Voici ce
 que je peux améliorer..."`,
  },
  {
    icon: <Search className="w-6 h-6 text-[#D4AF37]" />,
    tagColor: 'text-orange-400 bg-orange-400/10',
    visual: `
Cherche : "React Developer, Afrique"
─────────────────────────────────
🔱 Genius  · Kofi A. · Ghana · 97/100
✓ Verified · Aminata D. · Sénégal · 91/100  
✓ Verified · Chidi O. · Nigeria · 88/100`,
  },
  {
    icon: <BarChart2 className="w-6 h-6 text-[#D4AF37]" />,
    tagColor: 'text-cyan-400 bg-cyan-400/10',
    visual: `
Analyse de : github.com/tonprofil
─────────────────────────────────
Score marché  : 74/100
Points forts  : TypeScript, Next.js
Lacunes       : Tests unitaires, Docker
Recommandation: Ajoute 2 projets avec README
Visibilité    : Moyen → Fort si README amélioré`,
  },
  {
    icon: <Inbox className="w-6 h-6 text-[#D4AF37]" />,
    tagColor: 'text-pink-400 bg-pink-400/10',
    visual: `
📧 Inbox Unifiée
─────────────────────────────────
✉  Gmail      Réponse de Netflix →
💬 WhatsApp   Message de Bolt Afri...
✉  Gmail      Entretien confirmé...
─────────────────────────────────
Smart Replies: [Merci !] [Disponible] [+]`,
  },
  {
    icon: <Users className="w-6 h-6 text-[#D4AF37]" />,
    tagColor: 'text-yellow-400 bg-yellow-400/10',
    visual: `
🔱 Biyo S. · Fondateur
   "Searcher Connector vient de trouver
    5 nouveaux projets IA en Afrique 🚀"
   ❤️ 24   💬 7   ↗️ Partager
─────────────────────────────────
✓  Aminata D. · Designer
   "Mon premier contrat via Searcher !"
   ❤️ 31   💬 12`,
  },
  {
    icon: <DollarSign className="w-6 h-6 text-[#D4AF37]" />,
    tagColor: 'text-emerald-400 bg-emerald-400/10',
    visual: `
GRATUIT          TALENT        BUSINESS      INVESTOR
────────         ────────      ────────      ────────
8 résultats      100+          100+          100+
1 scan/jour      4h            2h            1h
Sources gratos   + payantes    + payantes    + premium
Manuel limité    Illimité      Illimité      Illimité
                 Auto-apply    B2B tools     VC matching`,
  },
]

const STATUS_META = [
  { icon: '⏳', color: 'text-yellow-500' },
  { icon: '✓', color: 'text-blue-400' },
  { icon: '🔱', color: 'text-[#D4AF37]' },
]

const PROFILE_ICONS = ['💼', '⚡', '🏢', '📈']

export default function AppGuide() {
  const { t } = useTranslation()
  const printRef = useRef<HTMLDivElement>(null)
  const { exportSection } = usePDF()

  const tFeatures = t('appGuidePage.features', { returnObjects: true }) as { title: string; tag: string; description: string; steps: string[] }[]
  const FEATURES = FEATURE_META.map((meta, i) => ({ ...meta, ...tFeatures[i] }))

  const tStatus = t('appGuidePage.statusLevels', { returnObjects: true }) as { name: string; desc: string }[]
  const STATUS_LEVELS = STATUS_META.map((meta, i) => ({ ...meta, ...tStatus[i] }))

  const tProfiles = t('appGuidePage.profiles', { returnObjects: true }) as { title: string; desc: string }[]
  const PROFILES = PROFILE_ICONS.map((icon, i) => ({ icon, ...tProfiles[i] }))

  const QUICKSTART_STEPS = t('appGuidePage.quickstartSteps', { returnObjects: true }) as string[]

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    exportSection('app-guide-content', 'guide-searcher-connector')
  }

  return (
    <>
      {/* Style d'impression */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { break-after: page; }
          a { color: inherit !important; }
        }
      `}</style>

        <div ref={printRef} className="min-h-screen bg-[#0A0A0A] text-white">

        {/* Navbar d'impression */}
        <div className="no-print sticky top-0 z-50 bg-[#0D0D0D] border-b border-[#1A1A1A] px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> {t('appGuidePage.backToDashboard')}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600">{t('appGuidePage.guideSubtitle')}</span>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2a2a2a] hover:border-[#D4AF37]/30 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">
              <Download className="w-4 h-4" /> {t('appGuidePage.downloadPdf')}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[#D4AF37] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#B8962D] transition-colors"
            >
              <Printer className="w-4 h-4" /> {t('appGuidePage.print')}
            </button>
          </div>
        </div>

        <div id="app-guide-content" className="max-w-4xl mx-auto px-6 py-12 space-y-16">

          {/* ── COUVERTURE ─────────────────────────────────────── */}
          <div className="print-page text-center py-16 space-y-6 border-b border-[#1A1A1A] pb-16">
            <div className="inline-flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-[0.3em] mb-4">
              <Globe className="w-4 h-4" />
              {t('appGuidePage.coverTagline')}
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight">
              Searcher<br />
              <span className="text-[#D4AF37]">Connector</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-lg mx-auto leading-relaxed">
              {t('appGuidePage.coverDesc')}
            </p>

            {/* Visuels stats */}
            <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-10">
              {[
                { icon: <Globe className="w-5 h-5" />, val: '15+', label: t('appGuidePage.statSources') },
                { icon: <Clock className="w-5 h-5" />, val: '24/7', label: t('appGuidePage.statAgent') },
                { icon: <Star className="w-5 h-5" />, val: '0-100', label: t('appGuidePage.statScore') },
              ].map((s, i) => (
                <div key={i} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 text-center">
                  <div className="flex justify-center text-[#D4AF37] mb-2">{s.icon}</div>
                  <div className="text-2xl font-black text-white">{s.val}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Cycle complet */}
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-6 max-w-lg mx-auto mt-8 text-left">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 text-center">{t('appGuidePage.howItWorks')}</div>
              <div className="flex items-center justify-between text-sm">
                {[t('appGuidePage.cycleStep1'), '→', t('appGuidePage.cycleStep2'), '→', t('appGuidePage.cycleStep3'), '→', t('appGuidePage.cycleStep4')].map((s, i) => (
                  <span key={i} className={s === '→' ? 'text-gray-700' : i === 0 ? 'text-[#D4AF37] font-bold' : 'text-white font-medium'}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── PROFILS UTILISATEURS ───────────────────────────── */}
          <div className="print-page space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-[#1A1A1A]" />
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">{t('appGuidePage.forWhoTitle')}</h2>
              <div className="h-px flex-1 bg-[#1A1A1A]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {PROFILES.map((p, i) => (
                <div key={i} className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5">
                  <div className="text-3xl mb-3">{p.icon}</div>
                  <h3 className="font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── FONCTIONNALITÉS ────────────────────────────────── */}
          {FEATURES.map((f, i) => (
            <div key={i} className={`print-page space-y-5 ${i < FEATURES.length - 1 ? 'border-b border-[#1A1A1A] pb-12' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#1A1A1A] rounded-xl flex-shrink-0">{f.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-white">{f.title}</h2>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${f.tagColor}`}>
                      {f.tag}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Étapes */}
                {f.steps.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">{t('appGuidePage.howToUse')}</div>
                    {f.steps.map((step, j) => (
                      <div key={j} className="flex items-start gap-3 text-sm text-gray-300">
                        <div className="w-5 h-5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] text-[10px] font-bold flex-shrink-0 mt-0.5">
                          {j + 1}
                        </div>
                        {step}
                      </div>
                    ))}
                  </div>
                )}

                {/* Visual */}
                <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-4">
                  <pre className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre overflow-x-auto">
                    {f.visual}
                  </pre>
                </div>
              </div>
            </div>
          ))}

          {/* ── NIVEAUX DE STATUT ──────────────────────────────── */}
          <div className="print-page space-y-6 border-t border-[#1A1A1A] pt-12">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#D4AF37]" /> {t('appGuidePage.verificationTitle')}
            </h2>
            <p className="text-sm text-gray-400">{t('appGuidePage.verificationDesc')}</p>
            <div className="space-y-3">
              {STATUS_LEVELS.map((s, i) => (
                <div key={i} className="flex items-start gap-4 bg-[#111111] border border-[#1A1A1A] rounded-xl p-4">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <div className={`font-bold text-base ${s.color}`}>{s.name}</div>
                    <div className="text-sm text-gray-400 mt-1">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── DÉMARRAGE RAPIDE ───────────────────────────────── */}
          <div className="print-page border-t border-[#1A1A1A] pt-12 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" /> {t('appGuidePage.quickstartTitle')}
            </h2>
            <div className="space-y-3">
              {QUICKSTART_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-300">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOOTER ─────────────────────────────────────────── */}
          <div className="border-t border-[#1A1A1A] pt-10 text-center space-y-4">
            <div className="text-2xl font-black text-white">
              Searcher <span className="text-[#D4AF37]">Connector</span>
            </div>
            <p className="text-sm text-gray-500">
              searcherconnector.com · biyostephane26@gmail.com
            </p>
            <p className="text-xs text-gray-700">
              {t('appGuidePage.footerRights')}
            </p>
            <div className="no-print flex justify-center gap-4 pt-4">
              <Link href="/dashboard" className="text-sm text-[#D4AF37] hover:underline">
                {t('appGuidePage.goToApp')}
              </Link>
              <Link href="/pricing" className="text-sm text-gray-500 hover:text-white">
                {t('appGuidePage.seePricing')}
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
