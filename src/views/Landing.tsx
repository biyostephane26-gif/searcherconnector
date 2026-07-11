'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Code } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import GoldButton from '../components/ui/GoldButton'
import Card from '../components/ui/Card'
import GoldDot from '../components/ui/GoldDot'

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

export default function Landing() {
  const router = useRouter()
  const [stats, setStats] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [waitlistTotal, setWaitlistTotal] = useState(0)

  useEffect(() => {
    setMounted(true)
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/public-stats')
        if (res.ok) {
          const d = await res.json()
          setStats(d.total_opportunities || 0)
        }
        const wlRes = await fetch('/api/waitlist?stats=true')
        if (wlRes.ok) {
          const wlData = await wlRes.json()
          setWaitlistTotal(wlData.total || 0)
        }
      } catch {
        setStats(0)
      }
    }
    fetchStats()
  }, [])

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, country }),
      })
      if (res.ok) {
        const data = await res.json()
        setWaitlistPosition(data.position)
      } else {
        throw new Error('Erreur')
      }
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const globeData = useMemo(() => {
    return [...Array(20).keys()].map(() => ({
      lat: (Math.random() - 0.5) * 180,
      lng: (Math.random() - 0.5) * 360,
      size: Math.random() / 3,
      color: '#D4AF37'
    }))
  }, [])

  const profileTypes = [
    {
      id: 'job_seeker',
      title: 'Job Seeker',
      icon: <User className="w-5 h-5" />,
      desc: 'Find your dream job — local or worldwide.',
      accent: 'border-blue-500/30 hover:border-blue-400',
      badge: 'bg-blue-500/10 text-blue-400',
    },
    {
      id: 'freelance',
      title: 'Freelance',
      icon: <Code className="w-5 h-5" />,
      desc: 'Land high-ticket missions. SCAI handles the prospecting.',
      accent: 'border-[#D4AF37]/30 hover:border-[#D4AF37]',
      badge: 'bg-[#D4AF37]/10 text-[#D4AF37]',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 flex flex-col items-center overflow-hidden">
        {/* Effet de lueur dorée - TOUJOURS VISIBLE */}
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#D4AF37] rounded-full blur-[150px] opacity-20 pointer-events-none z-0" />
        
        {/* Particules dorées animées (mini-étoiles) — PARTOUT SUR L'ÉCRAN */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#D4AF37] rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                opacity: Math.random() * 0.7,
                boxShadow: '0 0 4px rgba(212, 175, 55, 0.8)',
              }}
            />
          ))}
        </div>
        
        {/* Globe 3D en arrière-plan */}
        {mounted && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[700px] pointer-events-none opacity-70 z-0">
            <Globe
              width={1000}
              height={700}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="/earth-night.jpg"
              pointsData={globeData}
              pointColor="color"
              pointAltitude="size"
              pointsMerge={true}
              arcsData={[
                { startLat: 48.8566, startLng: 2.3522, endLat: -33.9249, endLng: 18.4241, color: ['#D4AF37', '#D4AF37'] },
                { startLat: 40.7128, startLng: -74.0060, endLat: 35.6762, endLng: 139.6503, color: ['#D4AF37', '#D4AF37'] },
                { startLat: 3.8480, startLng: 11.5021, endLat: 51.5074, endLng: -0.1278, color: ['#D4AF37', '#D4AF37'] },
                { startLat: -1.2921, startLng: 36.8219, endLat: 6.5244, endLng: 3.3792, color: ['#D4AF37', '#D4AF37'] },
                { startLat: 51.5074, startLng: -0.1278, endLat: 40.7128, endLng: -74.0060, color: ['#D4AF37', '#D4AF37'] },
                { startLat: 35.6762, startLng: 139.6503, endLat: 3.8480, endLng: 11.5021, color: ['#D4AF37', '#D4AF37'] },
              ]}
              arcColor="color"
              arcDashLength={0.4}
              arcDashGap={0.2}
              arcDashInitialGap={() => Math.random()}
              arcDashAnimateTime={2000}
              arcStroke={0.8}
              arcsTransitionDuration={0}
              arcAltitudeAutoScale={0.3}
            />
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center z-10 max-w-4xl mt-8"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
            Every opportunity in the world. <br />
            <span className="text-[#D4AF37]">Found. Applied. Delivered.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
            The world's first autonomous intelligence agent that doesn't just find opportunities — it secures them for you.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-16">
            {profileTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => router.push(`/signup?type=${type.id}`)}
                className={`group bg-[#111111] border ${type.accent} p-6 rounded-2xl transition-all duration-300 text-left`}
              >
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest mb-3 ${type.badge}`}>
                  {type.icon}
                  {type.title}
                </div>
                <p className="text-xs text-gray-500">{type.desc}</p>
              </button>
            ))}
          </div>

          <div className="bg-[#111111]/50 backdrop-blur-2m border border-[#2a2a2a] rounded-full px-8 py-4 inline-flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GoldDot />
              <span className="text-2xl font-mono font-bold text-[#D4AF37]">
                {mounted ? stats.toLocaleString() : '---'}
              </span>
            </div>
            <span className="text-xs tracking-widest text-gray-400 uppercase">
              Opportunities found today
            </span>
          </div>
        </motion.div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 tracking-tight">How it works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Verify", desc: "Sign up and prove your expertise to the Searcher AI." },
              { step: "02", title: "Talk", desc: "Tell Searcher what you want. Use your voice or text." },
              { step: "03", title: "Scan", desc: "Our agent scans 500+ global platforms in seconds." },
              { step: "04", title: "Receive", desc: "Get perfect matches and automated applications." }
            ].map((item, i) => (
              <div key={i} className="relative p-8 bg-[#111111] border border-[#2a2a2a] rounded-2xl text-left hover:border-[#D4AF37] transition-colors">
                <span className="text-5xl font-black text-[#1a1a1a] absolute top-4 right-4">{item.step}</span>
                <h3 className="text-xl font-bold mb-4 text-[#D4AF37]">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center tracking-tight">Searcher vs The Rest</h2>
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="p-6 text-gray-500 text-xs tracking-widest uppercase">Feature</th>
                  <th className="p-6 text-[#D4AF37] text-xs tracking-widest uppercase">Searcher</th>
                  <th className="p-6 text-gray-500 text-xs tracking-widest uppercase">Standard Job Boards</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ["Global Search", true, "Limited"],
                  ["AI Verification", true, "None"],
                  ["Auto-Applying", true, "Manual"],
                  ["Direct Investor Access", true, "None"],
                  ["Salary Intelligence", true, "Estimates"]
                ].map(([feature, s, o], i) => (
                  <tr key={i} className="border-b border-[#2a2a2a]">
                    <td className="p-6 font-medium">{feature}</td>
                    <td className="p-6 text-[#D4AF37]">✅</td>
                    <td className="p-6 text-gray-500">{o}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center tracking-tight">Rejoins les premiers</h2>
          <p className="text-center text-gray-500 mb-16 text-sm">Searcher Connector vient d'ouvrir ses portes. Sois parmi les premiers à en bénéficier.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🌍', title: 'Multi-pays', desc: 'Cameroun, Nigeria, Sénégal, Kenya, Côte d\'Ivoire, France, Canada et plus. SCAI scanne dans ta langue et ta monnaie.' },
              { icon: '⚡', title: 'Agent 24/7', desc: 'Pendant que tu dors, SCAI continue de scanner, scorer et stocker les meilleures opportunités pour toi.' },
              { icon: '🔱', title: 'Statut Genius', desc: 'Les profils d\'exception sont identifiés automatiquement et mis en avant auprès des recruteurs et investisseurs.' },
            ].map((t, i) => (
              <Card key={i} className="flex flex-col justify-between p-8">
                <div className="text-4xl mb-4">{t.icon}</div>
                <h3 className="font-bold text-white text-lg mb-2">{t.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{t.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tighter">Ready for your next big break?</h2>
        <p className="text-gray-400 mb-2 text-lg">Rejoins les <span className="text-[#D4AF37] font-bold">{waitlistTotal.toLocaleString()}</span> personnes déjà en attente.</p>
        <p className="text-gray-500 mb-12 text-sm">Searcher Connector vient d'ouvrir ses portes. Sois parmi les premiers à en bénéficier.</p>

        {waitlistPosition ? (
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl p-12 max-w-xl mx-auto">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-4">Tu es sur la waitlist !</h3>
            <p className="text-gray-400 mb-2">Ta position :</p>
            <p className="text-5xl font-bold text-[#D4AF37] font-mono">#{waitlistPosition}</p>
            <p className="text-gray-500 mt-4 text-sm">Nous te contacterons bientôt !</p>
          </div>
        ) : (
          <form onSubmit={handleWaitlistSubmit} className="max-w-md mx-auto mb-12">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ton email"
                className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-full px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                required
              />
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ton pays (optionnel)"
                className="sm:w-48 bg-[#111111] border border-[#2a2a2a] rounded-full px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#D4AF37] text-black font-bold px-8 py-4 rounded-full hover:bg-opacity-90 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Envoi...' : 'Rejoindre la waitlist'}
              </button>
            </div>
            {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
          </form>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <GoldButton onClick={() => router.push('/signup')} className="text-lg px-12">
            Create Free Account
          </GoldButton>
          <GoldButton variant="outlined" onClick={() => router.push('/pricing')} className="text-lg px-12">
            View Pricing
          </GoldButton>
        </div>
      </section>

      <Footer />
    </div>
  )
}
