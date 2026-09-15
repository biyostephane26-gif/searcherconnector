'use client'

import { useEffect, useState } from 'react'
import { ListChecks, CheckCircle2, XCircle, Loader2, Circle, X } from 'lucide-react'
import { authFetch } from '../../lib/authFetch'

type Step = { tool: string; prompt?: string; status: 'pending' | 'running' | 'done' | 'failed'; result?: string; error?: string }
type Task = { id: string; title: string; steps: Step[]; current_step: number; status: 'running' | 'done' | 'failed' | 'cancelled'; created_at: string }

const STEP_ICON: Record<Step['status'], JSX.Element> = {
  pending: <Circle className="w-3 h-3 text-gray-600" />,
  running: <Loader2 className="w-3 h-3 text-[#D4AF37] animate-spin" />,
  done: <CheckCircle2 className="w-3 h-3 text-green-500" />,
  failed: <XCircle className="w-3 h-3 text-red-400" />,
}

export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    authFetch('/api/cowork/tasks')
      .then(async r => {
        const d = await r.json()
        if (r.ok) setTasks(d.tasks || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Une tâche avance d'une étape par minute (rythme du planificateur en
    // arrière-plan) — un poll toutes les 15s suffit à suivre la progression.
    const interval = setInterval(() => {
      setTasks(prev => { if (prev.some(t => t.status === 'running')) load(); return prev })
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const cancel = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t))
    try { await authFetch(`/api/cowork/tasks?id=${id}`, { method: 'DELETE' }) } catch { /* déjà mis à jour côté UI */ }
  }

  if (loading || tasks.length === 0) return null

  return (
    <div>
      <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">
        <ListChecks size={12} /> Tâches
      </p>
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="bg-[#111111] border border-gray-800 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white truncate flex-1">{task.title}</p>
              {task.status === 'running' && (
                <button onClick={() => cancel(task.id)} className="text-gray-600 hover:text-red-400 shrink-0" title="Annuler">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="space-y-1 mt-2">
              {task.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  {STEP_ICON[step.status]}
                  <span className={step.status === 'failed' ? 'text-red-400' : step.status === 'done' ? 'text-gray-300' : ''}>
                    {step.tool} {step.error ? `— ${step.error}` : step.result ? `— ${step.result}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
