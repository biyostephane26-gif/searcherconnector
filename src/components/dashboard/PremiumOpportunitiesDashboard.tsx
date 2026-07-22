'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import GoldButton from '@/components/ui/GoldButton'
import {
  Zap, TrendingUp, Filter, Bot, Clock, Users, Briefcase, ArrowRight, ChevronRight, Shield, Lock, Unlock } from 'lucide-react'

type Opportunity = {
  id: string
  title: string
  company?: string
  location?: string
  salary?: string
  salary_min?: number
  salary_max?: number
  description?: string
  original_url?: string
  score?: number
  match_score?: number
  is_locked?: boolean
  is_premium?: boolean
  source_platform?: string
  applicants_count?: number
  published_at?: string
  category?: string
  skills?: string[]
}

type SkillPipeline = {
  skill: string
  count: number
  opportunities: Opportunity[]
}

export default function PremiumOpportunitiesDashboard() {
  const { profile, user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [top10, setTop10] = useState<Opportunity[]>([])
  const [pipelines, setPipelines] = useState<SkillPipeline[]>([])
  const [totalMatching, setTotalMatching] = useState(0)
  const [activeTab, setActiveTab] = useState<string | null>(null)

  const isPremium = profile?.plan === 'pro' || profile?.plan === 'enterprise' || profile?.verification_status === 'genius'

  useEffect(() => {
    fetchOpportunities()
  }, [user])

  const fetchOpportunities = async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      // Données réelles et personnalisées uniquement — plus jamais de
      // données fictives en repli. On lit la table `opportunities`
      // (déjà matchée + scorée pour cet utilisateur par cache-scan/
      // matchAndNotify), pas le cache brut global.
      const { data: realOpps } = await supabase
        .from('opportunities')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(300)

      const allOpps = (realOpps || []) as Opportunity[]

      // Verrouillage freemium déterministe (même règle que la page
      // Opportunités : 10 accessibles pour les comptes gratuits) — plus
      // de Math.random().
      const scored = allOpps.map((opp, i) => ({
        ...opp,
        match_score: opp.score,
        is_locked: !isPremium && i >= 10,
      }))

      setOpportunities(scored)
      setTop10(scored.filter(opp => (opp.match_score || 0) >= 90).slice(0, 10))

      const skills = extractSkills(scored)
      const skillPipelines = skills.map(skill => {
        const opps = scored.filter(opp =>
          opp.skills?.includes(skill) || opp.title?.toLowerCase().includes(skill.toLowerCase())
        ).slice(0, 100)
        return { skill, count: opps.length, opportunities: opps }
      }).filter(p => p.opportunities.length > 0)
      setPipelines(skillPipelines)

      setTotalMatching(scored.length)
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  const extractSkills = (opps: Opportunity[]) => {
    const skills = new Set<string>()
    opps.forEach(opp => {
      const title = opp.title?.toLowerCase() || ''
      if (title.includes('react')) skills.add('React')
      if (title.includes('node')) skills.add('Node.js')
      if (title.includes('python')) skills.add('Python')
      if (title.includes('javascript')) skills.add('JavaScript')
      if (title.includes('design')) skills.add('Design')
      if (title.includes('ui') || title.includes('ux')) skills.add('UI/UX')
      if (title.includes('data')) skills.add('Data')
      if (title.includes('ai') || title.includes('ia')) skills.add('AI')
    })
    return Array.from(skills).slice(0, 6)
  }

  // "Confier l'océan à SCAI" — l'auto-apply réel se fait opportunité par
  // opportunité via /api/auto-apply (voir Opportunities.tsx). Pas de faux
  // succès instantané ici : on renvoie vers la page où l'action est réelle.
  const handleAutoApply = () => {
    router.push('/opportunities?filter=pending')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="p-8 bg-gradient-to-r from-[#1A1500] to-[#0A0A0A] border-[#D4AF37]/30 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#D4AF37] opacity-10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-4 bg-[#D4AF37]/10 rounded-2xl">
                <Zap className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {totalMatching.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">
                  opportunités correspondent parfaitement à ton profil
                </div>
              </div>
            </div>
            
            {isPremium ? (
              <GoldButton
                onClick={handleAutoApply}
                size="lg"
                className="text-base"
              >
                <Bot className="w-5 h-5 mr-2" />
                Confier l'océan à SCAI
              </GoldButton>
            ) : (
              <GoldButton
                onClick={() => router.push('/pricing')}
                size="lg"
                className="text-base"
              >
                <Unlock className="w-5 h-5 mr-2" />
                Débloquer {Math.max(0, totalMatching - 10)} opportunités
              </GoldButton>
            )}
          </div>
        </div>
      </Card>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
            Top 10 Flamboyant
          </h2>
          <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold tracking-widest px-2 py-1 rounded">
            95-100% Match · &lt; 2h · &lt;5 candidats
          </div>
        </div>
        
        <div className="grid gap-4">
          {top10.map((opp, i) => (
            <Card key={opp.id} className="p-6 border-[#2a2a2a] hover:border-[#D4AF37]/30 transition-all group cursor-pointer">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                      {opp.title}
                    </h3>
                    {opp.is_locked && !isPremium && (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                    {opp.company && <span>{opp.company}</span>}
                    {opp.location && <span className="flex items-center gap-1">📍 {opp.location}</span>}
                    {opp.applicants_count && <span className="flex items-center gap-1">👥 {opp.applicants_count} candidats</span>}
                    {opp.published_at && <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTimeAgo(opp.published_at)}
                    </span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {opp.source_platform}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#D4AF37]">
                      {opp.match_score?.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Match Score</div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-[#D4AF37] flex items-center justify-center bg-[#D4AF37]/10">
                    <span className="text-sm font-bold text-[#D4AF37]">#{i + 1}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#D4AF37]" />
            Pipelines par Compétences
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {pipelines.map(pipeline => (
            <button
              key={pipeline.skill}
              onClick={() => setActiveTab(activeTab === pipeline.skill ? null : pipeline.skill)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === pipeline.skill
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2a2a2a]'
              }`}
            >
              {pipeline.skill}
              <span className="ml-2 text-xs opacity-70">
                {pipeline.opportunities.length}
              </span>
            </button>
          ))}
        </div>

        {activeTab && (
          <div className="space-y-3">
            {pipelines.find(p => p.skill === activeTab)?.opportunities.slice(0, 20).map(opp => (
              <Card key={opp.id} className="p-4 border-[#2a2a2a] hover:border-[#D4AF37]/20 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{opp.title}</h4>
                    <div className="text-xs text-gray-500">
                      {opp.company} · {opp.location}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                      {opp.match_score?.toFixed(0)}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return "À l'instant"
  if (diffHours < 24) return `Il y a ${diffHours}h`
  return `Il y a ${diffDays}j`
}
