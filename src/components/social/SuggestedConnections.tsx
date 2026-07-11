'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Check } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function SuggestedConnections() {
  const { profile, user } = useAuth();
  const [people, setPeople] = useState<any[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchPeople = async () => {
      if (!user) return;
      
      // 1. Fetch all connections for the current user
      const { data: connectionData } = await supabase
        .from('connections')
        .select('from_user_id, to_user_id, status')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      const connectedUserIds = new Set(
        connectionData?.map(c => c.from_user_id === user.id ? c.to_user_id : c.from_user_id) || []
      );
      
      const pendingUserIds = new Set(
        connectionData?.filter(c => c.status === 'pending')
          .map(c => c.from_user_id === user.id ? c.to_user_id : c.from_user_id) || []
      );

      setPendingIds(Array.from(pendingUserIds));

      // 2. Fetch people NOT in connections
      const { data } = await supabase
        .from('users_profiles')
        .select('*')
        .neq('id', user.id)
        .not('id', 'in', `(${Array.from(connectedUserIds).join(',') || '00000000-0000-0000-0000-000000000000'})`)
        .order('verification_status', { ascending: false })
        .limit(3);
        
      setPeople(data || []);
    };
    fetchPeople();
  }, [user]);

  const handleConnect = async (targetId: string) => {
    if (!user) return;
    setPendingIds(prev => [...prev, targetId]);
    
    const { error } = await supabase.from('connections').insert({
      from_user_id: user.id,
      to_user_id: targetId,
      status: 'pending'
    });

    if (!error) {
      // Remove from suggestions once invited
      setPeople(prev => prev.filter(p => p.id !== targetId));
    }
  };

  if (people.length === 0) return null;

  return (
    <Card className="p-6 border-[#1A1A1A] bg-[#0A0A0A]/50">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Personnes à Connecter</h4>
        <button className="text-[10px] font-bold text-[#D4AF37] hover:underline uppercase tracking-widest">Voir tout</button>
      </div>

      <div className="space-y-6">
        {people.map((person) => (
          <div key={person.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2a2a2a] flex items-center justify-center text-[#D4AF37] font-bold overflow-hidden">
                {person.avatar_url ? (
                  <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  person.full_name?.[0]?.toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold text-white truncate max-w-[100px]">{person.full_name}</div>
                  <Badge status={person.verification_status} />
                </div>
                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter truncate max-w-[120px]">
                  {person.domain}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => handleConnect(person.id)}
              disabled={pendingIds.includes(person.id)}
              className={`p-2 rounded-lg transition-all ${
                pendingIds.includes(person.id)
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#F5E6A3] hover:scale-110 shadow-[0_0_10px_rgba(212,175,55,0.2)]'
              }`}
            >
              {pendingIds.includes(person.id) ? <Check size={14} /> : <UserPlus size={14} />}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
