import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AgentAction } from '../types';

export function useAgentRealtime() {
  const { user } = useAuth();
  const [recentActions, setRecentActions] = useState<AgentAction[]>([]);
  const [pendingQueue, setPendingQueue] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Charger les actions initiales
    const fetchInitialData = async () => {
      const [actionsRes, queueRes] = await Promise.all([
        supabase
          .from('agent_actions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('agent_queue')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'pending')
      ]);

      if (actionsRes.data) setRecentActions(actionsRes.data);
      if (queueRes.count !== null) setPendingQueue(queueRes.count);
    };

    fetchInitialData();

    // S'abonner aux changements en temps réel
    const actionsChannel = supabase
      .channel('agent-actions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_actions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setRecentActions(prev => [payload.new as AgentAction, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    const queueChannel = supabase
      .channel('agent-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_queue', filter: `user_id=eq.${user.id}` },
        async () => {
          const { count } = await supabase
            .from('agent_queue')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('status', 'pending');
          if (count !== null) setPendingQueue(count);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(actionsChannel);
      supabase.removeChannel(queueChannel);
    };
  }, [user]);

  return {
    recentActions,
    pendingQueue
  };
}
