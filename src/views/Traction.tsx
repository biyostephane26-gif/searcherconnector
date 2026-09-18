'use client'

// Page publique de traction — pour qu'un acheteur potentiel vérifie
// lui-même l'activité réelle de la plateforme (production, en direct),
// au lieu de devoir croire des chiffres statiques dans un document.
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Briefcase, Send, Activity, RefreshCw } from 'lucide-react'

interface TractionData {
  total_users: number
  total_opportunities: number
  total_applications_sent: number
  total_agent_actions: number
  users_growth_30d: { date: string; count: number }[]
  opportunities_growth_30d: { date: string; count: number }[]
  generated_at: string
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value.toLocaleString('fr-FR')}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function Traction() {
  const [data, setData] = useState<TractionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/traction-stats')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#D4AF37] font-black text-xl tracking-tighter">SEARCHER</span>
            <span className="text-gray-600 text-xs tracking-[0.3em] uppercase">Connector</span>
          </div>
          <h1 className="text-2xl font-bold">Traction en direct</h1>
          <p className="text-sm text-gray-500 mt-1">
            Chiffres réels tirés directement de la base de production — cette page interroge les mêmes données que l'application elle-même, en temps réel.
          </p>
        </div>

        {loading && <div className="text-gray-600 text-sm">Chargement des chiffres réels...</div>}
        {error && <div className="text-red-400 text-sm">Erreur : {error}</div>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={<Users className="w-5 h-5" />} label="Utilisateurs inscrits" value={data.total_users} />
              <Stat icon={<Briefcase className="w-5 h-5" />} label="Opportunités en base" value={data.total_opportunities} />
              <Stat icon={<Send className="w-5 h-5" />} label="Candidatures envoyées" value={data.total_applications_sent} />
              <Stat icon={<Activity className="w-5 h-5" />} label="Actions de l'agent" value={data.total_agent_actions} />
            </div>

            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Nouveaux utilisateurs — 30 derniers jours</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.users_growth_30d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#D4AF37" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Opportunités trouvées — 30 derniers jours</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.opportunities_growth_30d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#4ade80" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-600">
              <span>Généré le {new Date(data.generated_at).toLocaleString('fr-FR')}</span>
              <button onClick={load} className="flex items-center gap-1.5 text-[#D4AF37] hover:underline">
                <RefreshCw className="w-3 h-3" /> Rafraîchir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
