import Card from '../ui/Card'
import GoldButton from '../ui/GoldButton'
import { ExternalLink, Send, AlertCircle, Users, Clock, Zap } from 'lucide-react'

type Props = {
  opportunity: any
  onApply: (id: string) => void
}

export default function OpportunityCard({ opportunity, onApply }: Props) {
  const isFresh = opportunity.hours_ago < 6
  const isVeryFresh = opportunity.hours_ago < 24

  return (
    <Card className={`relative overflow-hidden ${opportunity.score > 90 ? 'border-[#D4AF37] glow-gold' : ''}`}>
      {opportunity.score > 90 && (
        <div className="absolute top-0 right-0 bg-[#D4AF37] text-[#0A0A0A] text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-widest uppercase animate-pulse">
          High Match
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white tracking-tight">{opportunity.title}</h3>
            <div className="text-sm font-bold text-[#D4AF37] bg-[#1A1500] px-2 py-0.5 rounded border border-[#D4AF37]/20">
              {opportunity.score}/100
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="font-bold text-gray-300">{opportunity.company}</div>
            <div className="flex items-center gap-1">
              <span>{opportunity.location}</span>
              {opportunity.country && <span className="text-xs">({opportunity.country})</span>}
            </div>
            <div className="flex items-center gap-1 font-bold text-[#D4AF37]">
              {opportunity.salary_min.toLocaleString()} - {opportunity.salary_max.toLocaleString()} {opportunity.currency}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase ${isFresh ? 'text-green-500' : isVeryFresh ? 'text-[#D4AF37]' : 'text-gray-600'}`}>
              <Clock className="w-3 h-3" />
              Published {opportunity.hours_ago}h ago
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">
              <Users className="w-3 h-3" />
              {opportunity.applicants_count} Applicants
            </div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
              via {opportunity.source_platform}
            </div>
          </div>

          <div className="bg-[#0D0D0D] p-4 rounded-lg border border-[#1A1A1A] mb-6">
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Zap className="w-3 h-3 text-[#D4AF37]" /> Match Intelligence
            </div>
            <p className="text-sm text-gray-400 italic leading-relaxed">
              "{opportunity.match_reason}"
            </p>
          </div>

          {opportunity.is_foreign && (
            <div className="bg-[#1A1500] border border-[#D4AF37]/20 p-4 rounded-lg flex items-start gap-4 mb-6">
              <AlertCircle className="w-5 h-5 text-[#D4AF37] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-1">International Opportunity</div>
                <p className="text-xs text-gray-500">This role may require a visa or passport. Searcher can help you prepare the necessary documents.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <a 
              href={opportunity.original_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1"
            >
              <GoldButton variant="outlined" fullWidth className="py-2">
                View Original <ExternalLink className="w-4 h-4" />
              </GoldButton>
            </a>
            <GoldButton 
              fullWidth 
              className="flex-1 py-2"
              onClick={() => onApply(opportunity.id)}
              disabled={opportunity.status === 'auto_applied'}
            >
              {opportunity.status === 'auto_applied' ? 'Application Sent' : 'Let Searcher Apply'}
              <Send className="w-4 h-4" />
            </GoldButton>
          </div>
        </div>
      </div>
    </Card>
  )
}
