'use client'

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from '../../types';
import Badge from '../ui/Badge';
import { MapPin, Briefcase, Star, Users } from 'lucide-react';

interface ProfileHoverCardProps {
  profile: UserProfile;
}

export default function ProfileHoverCard({ profile }: ProfileHoverCardProps) {
  const { user } = useAuth();
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleConnect = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!user || user.id === profile.id) return;

    setSendingRequest(true);
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('id, from_user_id, to_user_id, status')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${profile.id}),and(from_user_id.eq.${profile.id},to_user_id.eq.${user.id})`);

      if (error) throw error;

      const existing = data || [];
      const accepted = existing.find((row) => row.status === 'accepted');
      const incomingPending = existing.find((row) => row.status === 'pending' && row.to_user_id === user.id);
      const outgoingPending = existing.find((row) => row.status === 'pending' && row.from_user_id === user.id);

      if (accepted || outgoingPending) {
        alert(`Une relation existe déjà avec ${profile.full_name}.`);
        return;
      }

      if (incomingPending) {
        const { error: updateError } = await supabase
          .from('connections')
          .update({ status: 'accepted' })
          .eq('id', incomingPending.id);

        if (updateError) throw updateError;
        alert(`Vous êtes maintenant connecté avec ${profile.full_name}.`);
        return;
      }

      const { error: insertError } = await supabase.from('connections').insert({
        from_user_id: user.id,
        to_user_id: profile.id,
        status: 'pending'
      });

      if (insertError) throw insertError;
      alert(`Demande de connexion envoyée à ${profile.full_name}.`);
    } catch (error) {
      console.error(error);
      alert("Impossible d'envoyer la demande de connexion.");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="w-72 bg-[#0D0D0D] border border-[#2a2a2a] rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in duration-200 z-[100]">
      <div className="flex items-start justify-between mb-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#1A1A1A] border border-[#2a2a2a]">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#D4AF37] font-bold text-xl">
              {profile.full_name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <Badge status={profile.verification_status || 'pending'} />
      </div>

      <div className="mb-4">
        <h3 className="text-white font-bold text-base leading-tight">{profile.full_name}</h3>
        <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mt-1">
          {profile.profile_type} • {profile.domain}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        {profile.city && (
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-tight">
            <MapPin size={12} className="text-gray-700" />
            {profile.city}, {profile.country}
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-tight">
          <Briefcase size={12} className="text-gray-700" />
          Expert en {profile.domain}
        </div>
      </div>

      {profile.bio && (
        <p className="text-gray-400 text-xs line-clamp-2 mb-4 italic">
          "{profile.bio}"
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={handleConnect}
          disabled={sendingRequest || user?.id === profile.id}
          className="px-4 py-2 bg-[#D4AF37] text-[#0A0A0A] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#F5E6A3] transition-all disabled:opacity-50"
        >
          {sendingRequest ? 'Envoi...' : 'Connecter'}
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/messages?user=${profile.id}`;
          }}
          className="px-4 py-2 bg-[#1A1A1A] text-gray-400 border border-[#2a2a2a] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-gray-600 transition-all"
        >
          Message
        </button>
      </div>
    </div>
  );
}
