'use client'

// =================================================================
// TRACKER DE CANDIDATURES
// Vue complète avec statuts, filtres, timeline, stats
// =================================================================

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { 
  FileText, 
  Eye, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  Filter,
  Search,
  ChevronRight,
  Building2,
  DollarSign,
  MapPin,
  ExternalLink
} from 'lucide-react'

type ApplicationStatus = 'applied' | 'viewed' | 'interview_scheduled' | 'interview_completed' | 'offer_received' | 'accepted' | 'rejected' | 'withdrawn'

interface Application {
  id: string
  job_title: string
  company: string
  applied_at: string
  status: ApplicationStatus
  notes?: string
  interview_date?: string
  offer_amount?: number
  offer_currency?: string
  rejection_reason?: string
  opportunity_id?: string
  application_id?: string
  sent_via?: 'scai_auto' | 'manual'
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; icon: any; color: string; bg: string }> = {
  applied: { 
    label: 'Postulée', 
    icon: FileText, 
    color: 'text-blue-400', 
    bg: 'bg-blue-400/10' 
  },
  viewed: { 
    label: 'Vue', 
    icon: Eye, 
    color: 'text-purple-400', 
    bg: 'bg-purple-400/10' 
  },
  interview_scheduled: { 
    label: 'Entretien prévu', 
    icon: Calendar, 
    color: 'text-[#D4AF37]', 
    bg: 'bg-[#D4AF37]/10' 
  },
  interview_completed: { 
    label: 'Entretien passé', 
    icon: CheckCircle2, 
    color: 'text-[#D4AF37]', 
    bg: 'bg-[#D4AF37]/10' 
  },
  offer_received: { 
    label: 'Offre reçue', 
    icon: DollarSign, 
    color: 'text-green-400', 
    bg: 'bg-green-400/10' 
  },
  accepted: { 
    label: 'Acceptée ✓', 
    icon: CheckCircle2, 
    color: 'text-green-400', 
    bg: 'bg-green-400/10' 
  },
  rejected: { 
    label: 'Refusée', 
    icon: XCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-400/10' 
  },
  withdrawn: { 
    label: 'Retirée', 
    icon: XCircle, 
    color: 'text-gray-400', 
    bg: 'bg-gray-400/10' 
  }
}

export default function Applications() {
  const router = useRouter()
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  // Preuve des candidatures envoyées par SCAI seule, sans clic manuel —
  // demandé explicitement : aucun moyen avant ça de distinguer "SCAI a
  // postulé tout seul" d'une candidature manuelle sur cette page.
  const [autoOnly, setAutoOnly] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchApplications()
  }, [user])

  const fetchApplications = async () => {
    if (!user) return
    setLoading(true)
    
    const { data, error } = await supabase
      .from('applications_tracking')
      .select('*')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })

    if (!error && data) {
      setApplications(data)
    }
    setLoading(false)
  }

  const filteredApplications = applications.filter(app => {
    if (filter !== 'all' && app.status !== filter) return false
    if (autoOnly && app.sent_via !== 'scai_auto') return false
    if (searchQuery && !app.job_title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !app.company.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const stats = {
    total: applications.length,
    active: applications.filter(a => !['accepted', 'rejected', 'withdrawn'].includes(a.status)).length,
    interviews: applications.filter(a => ['interview_scheduled', 'interview_completed'].includes(a.status)).length,
    offers: applications.filter(a => a.status === 'offer_received').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    autoApplied: applications.filter(a => a.sent_via === 'scai_auto').length
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Hier'
    if (days < 7) return `${days}j`
    if (days < 30) return `${Math.floor(days / 7)}sem`
    return `${Math.floor(days / 30)}mois`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des candidatures...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 lg:ml-64 pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#D4AF37] to-white bg-clip-text text-transparent">
            Mes Candidatures
          </h1>
          <p className="text-gray-400">
            Suis l'évolution de toutes tes candidatures en un seul endroit
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Total</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">🤖 SCAI seule</div>
            <div className="text-3xl font-bold text-[#D4AF37]">{stats.autoApplied}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">En cours</div>
            <div className="text-3xl font-bold text-blue-400">{stats.active}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Entretiens</div>
            <div className="text-3xl font-bold text-[#D4AF37]">{stats.interviews}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Offres</div>
            <div className="text-3xl font-bold text-green-400">{stats.offers}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Acceptées</div>
            <div className="text-3xl font-bold text-green-400">{stats.accepted}</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                placeholder="Rechercher par poste ou entreprise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-[#D4AF37] outline-none"
              />
            </div>

            {/* Preuve SCAI — candidatures envoyées sans intervention manuelle */}
            <button
              onClick={() => setAutoOnly(v => !v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                autoOnly
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
              }`}
            >
              🤖 SCAI seule ({stats.autoApplied})
            </button>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === 'all' 
                    ? 'bg-[#D4AF37] text-black' 
                    : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                }`}
              >
                Toutes
              </button>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as ApplicationStatus)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === status 
                      ? 'bg-[#D4AF37] text-black' 
                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
            <h3 className="text-xl font-bold mb-2">
              {autoOnly ? 'SCAI n\'a encore postulé seule à aucune offre'
                : filter === 'all' ? 'Aucune candidature' : `Aucune candidature ${STATUS_CONFIG[filter as ApplicationStatus].label.toLowerCase()}`}
            </h3>
            <p className="text-gray-400 mb-6">
              {autoOnly ? 'Active "Candidature automatique" dans Paramètres pour que SCAI postule seule dès qu\'une offre dépasse ton seuil.'
                : 'Commence à postuler pour voir tes candidatures ici'}
            </p>
            <GoldButton onClick={() => router.push('/opportunities')}>
              Explorer les opportunités
            </GoldButton>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map(app => {
              const config = STATUS_CONFIG[app.status]
              const Icon = config.icon
              
              return (
                <Card key={app.id} className="p-6 hover:border-[#D4AF37]/50 transition-all cursor-pointer group">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors">
                              {app.job_title}
                            </h3>
                            {app.sent_via === 'scai_auto' && (
                              <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-2 py-0.5 flex-shrink-0">
                                🤖 SCAI seule
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              <span>{app.company}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Postulée {timeAgo(app.applied_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.color} whitespace-nowrap`}>
                          {config.label}
                        </div>
                      </div>

                      {/* Extra Info */}
                      {app.interview_date && (
                        <div className="flex items-center gap-2 text-sm text-[#D4AF37] mt-3">
                          <Calendar className="w-4 h-4" />
                          <span>Entretien le {new Date(app.interview_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}

                      {app.offer_amount && (
                        <div className="flex items-center gap-2 text-sm text-green-400 mt-3">
                          <DollarSign className="w-4 h-4" />
                          <span>Offre: {app.offer_amount.toLocaleString()} {app.offer_currency || 'USD'}</span>
                        </div>
                      )}

                      {app.notes && (
                        <div className="text-sm text-gray-500 mt-3 italic">
                          "{app.notes}"
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-4">
                        {app.application_id && (
                          <button
                            onClick={() => router.push(`/applications/${app.application_id}`)}
                            className="flex items-center gap-1 text-xs text-[#D4AF37] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Voir la candidature
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/applications/edit/${app.id}`)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                        >
                          Mettre à jour le statut
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
