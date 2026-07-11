'use client'

// =================================================================
// PROGRAMME DE PARRAINAGE
// Partage ton code → gagne des jours premium gratuits
// =================================================================

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { 
  Users, 
  Copy, 
  Share2, 
  Gift, 
  CheckCircle2, 
  TrendingUp,
  Mail,
  MessageCircle,
  Twitter,
  Facebook
} from 'lucide-react'

interface ReferralStats {
  totalReferred: number
  activePremium: number
  daysEarned: number
  pending: number
}

export default function Referrals() {
  const { user, profile, refreshProfile } = useAuth()
  const [stats, setStats] = useState<ReferralStats>({
    totalReferred: 0,
    activePremium: 0,
    daysEarned: 0,
    pending: 0
  })
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://searcherconnector.com'}?ref=${profile?.referral_code}`

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  const fetchStats = async () => {
    if (!user) return
    setLoading(true)

    // Récupérer les parrainages
    const { data: referralData } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    const refs = referralData || []
    
    // Enrichir avec les profils des filleuls
    const enrichedRefs = await Promise.all(
      refs.map(async (ref) => {
        if (!ref.referred_user_id) return { ...ref, referred: null }
        
        const { data: referredProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, subscription_plan, created_at, verification_status')
          .eq('id', ref.referred_user_id)
          .single()
        
        return { ...ref, referred: referredProfile }
      })
    )
    
    setReferrals(enrichedRefs)

    // Calculer les stats
    const activePremium = enrichedRefs.filter(r => 
      r.referred?.subscription_plan && r.referred.subscription_plan !== 'free'
    ).length

    const daysEarned = enrichedRefs.reduce((sum, r) => sum + (r.premium_days_earned || 0), 0)
    const pending = enrichedRefs.filter(r => r.status === 'completed' && r.premium_days_earned === 0).length

    setStats({
      totalReferred: enrichedRefs.length,
      activePremium,
      daysEarned,
      pending
    })

    setLoading(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareVia = (platform: 'email' | 'whatsapp' | 'twitter' | 'facebook') => {
    const text = `Rejoins-moi sur Searcher Connector, l'agent IA qui trouve des opportunités 24/7! 🚀`
    const url = encodeURIComponent(referralLink)
    const encodedText = encodeURIComponent(text)

    const urls = {
      email: `mailto:?subject=${encodeURIComponent('Rejoins Searcher Connector')}&body=${encodedText}%0A%0A${url}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    }

    window.open(urls[platform], '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 lg:ml-64 pt-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#1A1500] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-4">
            <Gift className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Programme de parrainage</span>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-[#D4AF37] to-white bg-clip-text text-transparent">
            Gagne du Premium Gratuit
          </h1>
          <p className="text-gray-400 text-lg">
            Partage Searcher Connector avec tes amis et gagne <span className="text-[#D4AF37] font-bold">7 jours premium</span> par ami qui s'abonne
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 text-center">
            <Users className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
            <div className="text-3xl font-bold text-white mb-1">{stats.totalReferred}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Parrainés</div>
          </Card>
          <Card className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white mb-1">{stats.activePremium}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Premium actifs</div>
          </Card>
          <Card className="p-6 text-center">
            <Gift className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
            <div className="text-3xl font-bold text-white mb-1">{stats.daysEarned}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Jours gagnés</div>
          </Card>
          <Card className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white mb-1">{stats.pending}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">En attente</div>
          </Card>
        </div>

        {/* Partage ton code */}
        <Card className="p-8 mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#D4AF37]" />
            Ton lien de parrainage unique
          </h3>
          
          <div className="bg-[#0D0D0D] rounded-xl p-4 mb-6 border border-[#1A1A1A]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 bg-[#111] rounded-lg px-4 py-3 font-mono text-sm text-gray-300 overflow-x-auto">
                {referralLink}
              </div>
              <GoldButton onClick={copyLink} className="flex items-center gap-2 whitespace-nowrap">
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié!' : 'Copier'}
              </GoldButton>
            </div>

            {/* Boutons partage social */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => shareVia('email')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg text-sm transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                onClick={() => shareVia('whatsapp')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={() => shareVia('twitter')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg text-sm transition-colors"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </button>
              <button
                onClick={() => shareVia('facebook')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg text-sm transition-colors"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </button>
            </div>
          </div>

          {/* Comment ça marche */}
          <div className="bg-gradient-to-r from-[#1A1500] to-[#0D0D0D] border border-[#D4AF37]/20 rounded-xl p-6">
            <h4 className="font-bold text-[#D4AF37] mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Comment ça marche ?
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="bg-[#D4AF37] text-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">1</div>
                <p className="text-gray-300">Partage ton lien unique avec tes amis</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-[#D4AF37] text-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">2</div>
                <p className="text-gray-300">Ton ami s'inscrit et passe à un plan payant</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-[#D4AF37] text-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">3</div>
                <p className="text-gray-300">Tu gagnes <strong className="text-[#D4AF37]">7 jours premium gratuits</strong> + ton ami gagne aussi 3 jours bonus!</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Liste des parrainages */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Mes parrainages ({referrals.length})</h3>
          
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 mb-2">Aucun parrainage pour le moment</p>
              <p className="text-sm text-gray-600">Partage ton lien pour commencer à gagner du premium gratuit!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map(ref => (
                <div key={ref.id} className="flex items-center gap-4 p-4 bg-[#0D0D0D] rounded-xl border border-[#1A1A1A] hover:border-[#D4AF37]/30 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {ref.referred?.avatar_url ? (
                      <img src={ref.referred.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#D4AF37] font-bold">{ref.referred?.full_name?.[0] || '?'}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{ref.referred?.full_name || 'Utilisateur'}</span>
                      {ref.referred?.verification_status === 'genius' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37] text-black">GENIUS</span>
                      )}
                      {ref.referred?.verification_status === 'verified' && (
                        <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Inscrit {new Date(ref.created_at).toLocaleDateString('fr-FR')}</span>
                      {ref.referred?.subscription_plan !== 'free' && (
                        <span className="text-green-400">● Plan {ref.referred.subscription_plan}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {ref.premium_days_earned > 0 ? (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-bold">{ref.premium_days_earned}j réclamés</span>
                      </div>
                    ) : ref.status === 'completed' ? (
                      <div className="flex items-center gap-2 text-[#D4AF37] text-sm">
                        <Gift className="w-4 h-4" />
                        <span className="font-bold">7j à réclamer</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">En attente d'abonnement</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
