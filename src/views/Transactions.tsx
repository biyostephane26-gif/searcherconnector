'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import { authFetch, downloadBase64 } from '../lib/authFetch'
import { planConfig } from '../lib/planConfig'
import { planTier } from '../lib/planUtils'
import {
  Receipt, FileBarChart, Download, Loader2, CreditCard, CheckCircle2, XCircle, Clock,
  TrendingUp, Send, Calendar, Award, DollarSign,
} from 'lucide-react'

type Tab = 'transactions' | 'report'

const STATUS_UI: Record<string, { label: string; cls: string; icon: JSX.Element }> = {
  completed: { label: 'Payé', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  pending:   { label: 'En attente', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: <Clock className="w-3.5 h-3.5" /> },
  failed:    { label: 'Échoué', cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: <XCircle className="w-3.5 h-3.5" /> },
}

const APP_STATUS_LABEL: Record<string, string> = {
  found: 'Trouvée', ready_to_send: 'Prête à envoyer', sent: 'Envoyée', pending_action: 'En attente',
  viewed: 'Vue par le client', interview: 'Entretien', offer: 'Offre reçue', rejected: 'Refusée', hired: 'Mission obtenue',
}

export default function Transactions() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState<Tab>('transactions')
  const [payments, setPayments] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<'pdf' | 'xlsx' | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('payment_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('applications_tracking').select('*').eq('user_id', user.id).order('applied_at', { ascending: false }),
    ]).then(([p, a]) => {
      setPayments(p.data || [])
      setApplications(a.data || [])
      setLoading(false)
    })
  }, [user])

  const stats = useMemo(() => {
    const total = applications.length
    const interviews = applications.filter(a => a.status === 'interview' || a.interview_date || a.interview_scheduled_at).length
    const offers = applications.filter(a => a.status === 'offer' || a.status === 'hired' || a.offer_amount).length
    const hired = applications.filter(a => a.status === 'hired').length
    const totalOfferAmount = applications.reduce((sum, a) => sum + (Number(a.offer_amount) || 0), 0)
    const currency = applications.find(a => a.offer_currency)?.offer_currency || 'USD'
    const responseRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0
    const byStatus: Record<string, number> = {}
    for (const a of applications) byStatus[a.status || 'found'] = (byStatus[a.status || 'found'] || 0) + 1
    return { total, interviews, offers, hired, totalOfferAmount, currency, responseRate, byStatus }
  }, [applications])

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const tier = planTier(profile as any)
  const plan = planConfig(tier)

  const generate = async (format: 'pdf' | 'xlsx') => {
    setGenerating(format); setGenError(null)
    try {
      const r = await authFetch('/api/tools/document', { method: 'POST', body: JSON.stringify({ format, source: 'applications' }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Génération impossible')
      downloadBase64(d.base64, d.filename, d.mime)
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">Transactions & Rapports</h2>
          <div className="flex gap-1 bg-[#111111] border border-[#2a2a2a] rounded-full p-1">
            {[
              { id: 'transactions' as Tab, label: 'Transactions', icon: Receipt },
              { id: 'report' as Tab, label: 'Rapport d’activité', icon: FileBarChart },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  tab === t.id ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full space-y-6">
          {tab === 'transactions' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Plan actuel</p>
                  <p className="text-xl font-bold text-white">{plan.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{plan.priceUSD > 0 ? `$${plan.priceUSD}/mois` : 'Gratuit'}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Total payé</p>
                  <p className="text-xl font-bold text-white">${totalPaid.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">{payments.filter(p => p.status === 'completed').length} paiement(s) réussi(s)</p>
                </Card>
                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Prochaine étape</p>
                  <a href="/pricing" className="text-sm font-bold text-[#D4AF37] hover:underline flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> Gérer mon abonnement
                  </a>
                </Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1A1A1A]">
                  <h3 className="text-sm font-bold text-white">Historique des paiements</h3>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-sm text-gray-500">Chargement…</div>
                ) : payments.length === 0 ? (
                  <div className="p-10 text-center">
                    <Receipt className="w-9 h-9 text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Aucune transaction pour l'instant.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1A1A1A]">
                    {payments.map(p => {
                      const ui = STATUS_UI[p.status] || STATUS_UI.pending
                      return (
                        <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                          <div>
                            <p className="text-sm font-semibold text-white capitalize">{p.plan} {p.method ? `· ${p.method}` : ''}</p>
                            <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white">{p.amount ? `${p.amount} ${p.currency || ''}` : '—'}</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${ui.cls}`}>{ui.icon}{ui.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </>
          )}

          {tab === 'report' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Candidatures', value: stats.total, icon: Send, color: 'text-blue-400' },
                  { label: 'Entretiens', value: stats.interviews, icon: Calendar, color: 'text-[#D4AF37]' },
                  { label: 'Offres reçues', value: stats.offers, icon: Award, color: 'text-emerald-400' },
                  { label: 'Taux de réponse', value: `${stats.responseRate}%`, icon: TrendingUp, color: 'text-purple-400' },
                ].map(s => (
                  <Card key={s.label} className="p-4">
                    <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[11px] text-gray-500">{s.label}</p>
                  </Card>
                ))}
              </div>

              {stats.totalOfferAmount > 0 && (
                <Card className="p-5 flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalOfferAmount.toLocaleString('fr-FR')} {stats.currency}</p>
                    <p className="text-xs text-gray-500">Valeur cumulée des offres reçues</p>
                  </div>
                </Card>
              )}

              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-4">Répartition par statut</h3>
                {stats.total === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">Aucune candidature enregistrée pour l'instant.</p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-xs text-gray-400">{APP_STATUS_LABEL[status] || status}</span>
                        <div className="flex-1 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                          <div className="h-full bg-[#D4AF37]" style={{ width: `${(count / stats.total) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-bold text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => generate('pdf')}
                  disabled={generating !== null || stats.total === 0}
                  className="flex items-center gap-2 bg-[#D4AF37] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#e0bd4f] disabled:opacity-50"
                >
                  {generating === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Rapport PDF
                </button>
                <button
                  onClick={() => generate('xlsx')}
                  disabled={generating !== null || stats.total === 0}
                  className="flex items-center gap-2 bg-[#111111] border border-[#2a2a2a] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:border-[#D4AF37]/40 disabled:opacity-50"
                >
                  {generating === 'xlsx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export Excel
                </button>
                {genError && <p className="text-sm text-red-400">{genError}</p>}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
