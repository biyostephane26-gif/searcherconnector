'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../ui/Card'
import GoldButton from '../ui/GoldButton'
import { Zap, Lock, Unlock, TrendingUp, Shield } from 'lucide-react'

interface FreeUserLimitBannerProps {
  totalMatchingOpportunities?: number
  visibleOpportunities?: number
}

export default function FreeUserLimitBanner({
  totalMatchingOpportunities = 1247,
  visibleOpportunities = 300
}: FreeUserLimitBannerProps) {
  const router = useRouter()
  const { profile } = useAuth()

  const isPremium = profile?.plan === 'pro' || profile?.plan === 'enterprise' || profile?.verification_status === 'genius'
  const hiddenOpportunities = Math.max(0, totalMatchingOpportunities - visibleOpportunities)
  const hiddenPercentage = Math.round((hiddenOpportunities / totalMatchingOpportunities) * 100)

  if (isPremium) return null

  return (
    <Card className="p-8 bg-gradient-to-r from-red-900/20 via-orange-900/10 to-[#1A1500] border-red-800/30 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#D4AF37] opacity-5 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-500 opacity-5 blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/30">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex flex-col gap-2 mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400">Accès limité</span>
              </h3>
              <p className="text-gray-300">
                SCAI a détecté <span className="text-[#D4AF37] font-bold">{totalMatchingOpportunities.toLocaleString()}</span> opportunités
                correspondant à ton profil. Tu ne vois que <span className="text-white font-bold">{visibleOpportunities}</span> d'entre elles.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-white">{hiddenOpportunities.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Opportunités bloquées</div>
              </div>
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-[#D4AF37]">{hiddenPercentage}%</div>
                <div className="text-sm text-gray-400">Du potentiel caché</div>
              </div>
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-green-400">0</div>
                <div className="text-sm text-gray-400">Candidatures automatiques</div>
              </div>
            </div>

            {/* Features list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {[
                'Accès à toutes les opportunités premium',
                'Candidatures automatiques par SCAI',
                'Matching personnalisé avancé',
                'Pipelines par compétences',
                'Top 10 Flamboyant exclusif',
                'Support prioritaire'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                    <Unlock className="w-3 h-3 text-[#D4AF37]" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex-shrink-0">
            <GoldButton
              onClick={() => router.push('/pricing')}
              size="lg"
              className="text-base"
            >
              <Shield className="w-5 h-5 mr-2" />
              Débloquer maintenant
            </GoldButton>
            <div className="text-center mt-3 text-xs text-gray-500">
              Annule à tout moment
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
