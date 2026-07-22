'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import GoldButton from '../components/ui/GoldButton'
import { ArrowRight, Globe, Zap, Shield, Users } from 'lucide-react'

export default function About() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-32 pb-24 space-y-24">

        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-[0.3em] mb-6">
            <span className="w-8 h-px bg-[#D4AF37]" />
            Notre mission
            <span className="w-8 h-px bg-[#D4AF37]" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
            Le travail trouve les gens.<br />
            <span className="text-[#D4AF37]">Pas l'inverse.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Il existe des milliers de personnes compétentes sans emploi, et des milliers d'opportunités sans candidats. 
            Searcher Connector est le pont entre les deux — automatiquement, 24h/24.
          </p>
        </div>

        {/* Le problème */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-4">Le problème qu'on résout</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                Un développeur à Douala est aussi compétent qu'un développeur à Paris. Mais il n'a pas les mêmes connexions, 
                les mêmes contacts, ni le même accès aux opportunités.
              </p>
              <p>
                La recherche d'emploi ou de missions freelance prend en moyenne <strong className="text-white">40 heures par semaine</strong> — 
                scruter des centaines de plateformes, rédiger des candidatures, relancer, attendre.
              </p>
              <p>
                C'est 40 heures que tu ne passes pas à créer, apprendre ou construire.
              </p>
            </div>
          </div>
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-8">
            <div className="space-y-6">
              {[
                { icon: '🌍', title: '2.5 milliards', sub: 'de personnes en âge de travailler sans emploi formel' },
                { icon: '📋', title: '40h/semaine', sub: 'passées en moyenne sur la recherche d\'emploi' },
                { icon: '🎯', title: '15+ sources', sub: 'que SCAI scanne en quelques secondes' },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-2xl">{s.icon}</span>
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
          <h2 className="text-2xl font-bold mb-8 text-center">Notre approche</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: <Zap className="w-5 h-5 text-[#D4AF37]" />, title: 'Agent autonome', desc: 'SCAI ne dort pas. Il scanne, score et sauvegarde pendant que tu travailles, dors ou apprends.' },
              { icon: <Globe className="w-5 h-5 text-[#D4AF37]" />, title: 'Couverture mondiale', desc: 'Job boards, plateformes freelance, réseaux sociaux, ATS d\'entreprises — tout en un seul endroit.' },
              { icon: <Shield className="w-5 h-5 text-[#D4AF37]" />, title: 'Zéro faux lead', desc: 'Chaque opportunité est scorée de 0 à 100 selon ton profil exact. Plus de bruit, juste le signal.' },
              { icon: <Users className="w-5 h-5 text-[#D4AF37]" />, title: 'Pour tout le monde', desc: 'Emploi et freelance — une seule plateforme, quel que soit ton métier.' },
            ].map((item, i) => (
              <div key={i} className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-6 hover:border-[#D4AF37]/20 transition-colors">
                <div className="mb-3">{item.icon}</div>
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
              <div className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-[0.3em] mb-2">Fondateur</div>
              <h3 className="text-xl font-bold text-white mb-1">Biyo Stéphane</h3>
              <div className="text-gray-500 text-sm mb-4">Douala, Cameroun · Entrepreneur · Développeur</div>
              <p className="text-gray-400 leading-relaxed text-sm">
                "J'ai créé Searcher Connector parce que j'ai vécu ce problème. Trouver des opportunités prenait 
                plus de temps que les réaliser. J'ai décidé d'automatiser cette partie — pour moi d'abord, 
                puis pour les millions de talents africains et mondiaux qui méritent un accès équitable 
                aux meilleures opportunités."
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
          <h2 className="text-3xl font-bold mb-4">La vision à 5 ans</h2>
          <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Être la plateforme d'opportunités numéro 1 en Afrique. 
            Puis dans le monde. Faire en sorte que la localisation géographique 
            ne soit plus jamais un obstacle à l'accès aux meilleures opportunités professionnelles.
          </p>
          <GoldButton onClick={() => router.push('/signup')} className="text-lg px-10">
            Rejoindre maintenant <ArrowRight className="w-5 h-5" />
          </GoldButton>
          <p className="text-gray-700 text-xs mt-4">Gratuit pour commencer · Aucune carte bancaire requise</p>
        </div>

      </div>

      {/* Footer links */}
      <div className="border-t border-[#1A1A1A] py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600">
          <Link href="/pricing" className="hover:text-[#D4AF37] transition-colors">Tarifs</Link>
          <Link href="/privacy" className="hover:text-[#D4AF37] transition-colors">Confidentialité</Link>
          <Link href="/terms"   className="hover:text-[#D4AF37] transition-colors">CGU</Link>
          <Link href="/support" className="hover:text-[#D4AF37] transition-colors">Support</Link>
          <span>© {new Date().getFullYear()} Searcher Connector</span>
        </div>
      </div>
    </div>
  )
}
