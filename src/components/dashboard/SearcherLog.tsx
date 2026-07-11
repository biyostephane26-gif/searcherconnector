'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function SearcherLog() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    const fetchLogs = async () => {
      const { data: agentLogs } = await supabase
        .from('agent_actions')
        .select('id, created_at, result, action_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (agentLogs && agentLogs.length > 0) {
        setLogs(agentLogs.map((log) => ({
          id: log.id,
          created_at: log.created_at,
          description: log.result,
          platform: log.action_type
        })))
        return
      }

      const { data: legacyLogs } = await supabase
        .from('searcher_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (legacyLogs) setLogs(legacyLogs)
    }
    fetchLogs()
  }, [user])

  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <p className="text-xs text-gray-600 italic">No recent actions recorded.</p>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="flex gap-4">
            <div className="mt-1">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37] ring-4 ring-[#1A1500]" />
            </div>
            <div className="flex-1 pb-4 border-l border-[#1A1A1A] pl-4 -ml-[5px]">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                {new Date(log.created_at).toLocaleTimeString()}
              </div>
              <div className="text-sm text-gray-300">{log.description}</div>
              {log.platform && (
                <div className="text-[10px] text-[#D4AF37] mt-1 font-bold uppercase tracking-widest">
                  via {log.platform}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

