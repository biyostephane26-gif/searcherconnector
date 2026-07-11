'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';

export default function SuggestedGroups() {
  const { profile } = useAuth();
  const [groups, setSuggestedGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      let query = supabase.from('groups').select('*').limit(3);
      if (profile?.domain) {
        // En conditions réelles, on filtrerait par catégorie matchant le domaine
      }
      const { data } = await query;
      setSuggestedGroups(data || []);
    };
    fetchGroups();
  }, [profile]);

  if (groups.length === 0) return null;

  return (
    <Card className="p-6 border-[#1A1A1A] bg-[#0A0A0A]/50">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Groupes Suggérés</h4>
        <button className="text-[10px] font-bold text-[#D4AF37] hover:underline uppercase tracking-widest">Voir tout</button>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#2a2a2a] flex items-center justify-center text-[#D4AF37] group-hover:border-[#D4AF37] transition-all">
                {group.avatar_url ? (
                  <img src={group.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Users size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors">{group.name}</div>
                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                  {group.members_count} membres • {group.category}
                </div>
              </div>
              <ChevronRight size={14} className="text-gray-800 group-hover:text-[#D4AF37] transition-all" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
