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

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

const HOW_IT_WORKS = [
  { step: '01', title: 'Ton profil', desc: "Crée ton compte, dis à SCAI ton métier et tes compétences — vérifié par IA en quelques secondes." },
  { step: '02', title: 'Le scan', desc: "SCAI interroge des centaines de plateformes freelance et job boards en continu, 24h/24." },
  { step: '03', title: 'Le tri', desc: "Chaque offre est scorée sur TON profil précis — tu n'es alerté que pour du vrai fort potentiel." },
  { step: '04', title: "L'envoi", desc: "SCAI rédige ta candidature, pré-remplit le formulaire via l'extension — le clic final reste le tien." },
]

const FEATURES = [
  { icon: Zap,          title: 'SCAI Cowork',            desc: "Un agent IA qui connaît tout ton profil, discute avec toi, et agit en ton nom sur tes vraies plateformes." },
  { icon: Plug,         title: 'Connecteurs',             desc: 'Gmail, WhatsApp, Upwork, Fiverr, Malt, LinkedIn, GitHub… branchés directement à SCAI, comme un vrai copilote.' },
  { icon: Send,         title: 'Extension navigateur',    desc: 'Pré-remplissage automatique de tes candidatures partout, envoi 100% autonome sur les ATS reconnus.' },
  { icon: FileText,     title: 'Documents à la demande',  desc: 'CV, lettres, devis, rapports en PDF, Word ou Excel — rédigés par SCAI en quelques secondes.' },
  { icon: ImageIcon,    title: 'Création visuelle',       desc: 'Visuels de portfolio et mini-vidéos de présentation générés directement dans le chat.' },
  { icon: ShieldCheck,  title: 'Vérification IA',         desc: 'Ton profil est analysé et vérifié automatiquement — un badge de confiance visible par les recruteurs.' },
]

const COMPARISON: [string, boolean, string][] = [
  ['Recherche multi-plateformes en continu', true, 'Manuel, une plateforme à la fois'],
  ['Scoring personnalisé par profil',        true, 'Mots-clés génériques'],
  ["Rédaction et pré-remplissage par IA",    true, 'À faire soi-même'],
  ['Agent conversationnel avec mémoire',     true, 'Aucun'],
  ['Extension de remplissage automatique',   true, 'Rare ou absent'],
]

export default function Landing() {
  const router = useRouter()
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
      setError('Une erreur est survenue — réessaie dans un instant.')
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
            <span className="text-[11px] tracking-widest text-gray-400 uppercase font-bold">L'agent IA des freelances</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
            Toutes les missions du monde. <br />
            <span className="text-[#D4AF37]">Trouvées. Rédigées. Envoyées.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            SCAI scanne des centaines de plateformes freelance pour toi, rédige tes candidatures et les envoie — pendant que tu travailles sur autre chose.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <GoldButton onClick={() => router.push('/signup')} className="text-base px-10 flex items-center justify-center gap-2">
              Créer mon compte gratuit <ArrowRight className="w-4 h-4" />
            </GoldButton>
            <GoldButton variant="outlined" onClick={() => router.push('/pricing')} className="text-base px-10">
              Voir les tarifs
            </GoldButton>
          </div>
          <p className="text-xs text-gray-600 mb-14">Gratuit pour commencer — aucune carte bancaire requise.</p>

          <div className="bg-[#111111]/50 backdrop-blur-2xl border border-[#2a2a2a] rounded-full px-8 py-4 inline-flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GoldDot />
              <span className="text-2xl font-mono font-bold text-[#D4AF37]">{mounted ? stats.toLocaleString('fr-FR') : '—'}</span>
            </div>
            <span className="text-xs tracking-widest text-gray-400 uppercase">Opportunités trouvées</span>
          </div>
        </motion.div>
      </section>

      {/* ── Fonctionnalités ──────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Un copilote, pas un simple job board</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Searcher Connector combine recherche, rédaction et envoi — connecté à tes vrais outils.</p>
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
          <h2 className="text-3xl md:text-5xl font-bold mb-16 tracking-tight">Comment ça marche</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="relative p-8 bg-[#111111] border border-[#2a2a2a] rounded-2xl text-left hover:border-[#D4AF37] transition-colors">
                <span className="text-5xl font-black text-[#1a1a1a] absolute top-4 right-4">{item.step}</span>
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
          <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center tracking-tight">Searcher vs la recherche manuelle</h2>
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="p-6 text-gray-500 text-xs tracking-widest uppercase">Fonctionnalité</th>
                  <th className="p-6 text-[#D4AF37] text-xs tracking-widest uppercase">Searcher Connector</th>
                  <th className="p-6 text-gray-500 text-xs tracking-widest uppercase">Recherche manuelle</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {COMPARISON.map(([feature, ok, other], i) => (
                  <tr key={i} className="border-b border-[#2a2a2a] last:border-0">
                    <td className="p-6 font-medium">{feature}</td>
                    <td className="p-6 text-[#D4AF37]"><CheckCircle2 className="w-5 h-5" /></td>
                    <td className="p-6 text-gray-500">{other}</td>
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
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center tracking-tight">Conçu pour le freelancing mondial</h2>
          <p className="text-center text-gray-500 mb-16 text-sm max-w-xl mx-auto">Une seule app, tous les marchés — sans changer d'outil selon le pays.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Globe2, title: 'Multi-pays', desc: "Cameroun, Nigeria, Sénégal, Kenya, Côte d'Ivoire, France, Canada et plus — SCAI scanne dans ta langue et ta devise." },
              { icon: Zap,    title: 'Agent 24/7', desc: 'Pendant que tu dors, SCAI continue de scanner, scorer et préparer tes prochaines candidatures.' },
              { icon: Star,   title: 'Statut Genius', desc: 'Les profils les plus actifs et fiables sont mis en avant automatiquement, avec un badge visible partout.' },
            ].map((t, i) => (
              <Card key={i} className="flex flex-col p-8">
                <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] mb-4">
                  <t.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{t.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{t.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA finale ───────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tighter">Prêt pour ta prochaine mission ?</h2>
        <p className="text-gray-500 mb-12 text-sm max-w-lg mx-auto">Crée ton compte, complète ton profil, et laisse SCAI chercher pendant que tu travailles.</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <GoldButton onClick={() => router.push('/signup')} className="text-lg px-12">
            Créer mon compte gratuit
          </GoldButton>
          <GoldButton variant="outlined" onClick={() => router.push('/pricing')} className="text-lg px-12">
            Voir les tarifs
          </GoldButton>
        </div>

        {/* Capture email secondaire — pas une porte d'entrée, le compte gratuit ci-dessus l'est déjà. */}
        <div className="max-w-md mx-auto border-t border-[#1A1A1A] pt-10">
          <p className="text-xs text-gray-600 mb-4 flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Pas encore prêt ? Reçois les nouveautés par email.
          </p>
          {waitlistPosition ? (
            <p className="text-sm text-[#D4AF37] font-semibold">Merci — tu seras prévenu(e) !</p>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com" required
                className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-full px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <button type="submit" disabled={isLoading}
                className="bg-[#111111] border border-[#2a2a2a] text-white font-semibold text-sm px-6 py-3 rounded-full hover:border-[#D4AF37] transition-all disabled:opacity-50">
                {isLoading ? '...' : "S'inscrire"}
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
