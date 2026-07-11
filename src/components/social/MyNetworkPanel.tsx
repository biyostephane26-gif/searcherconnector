'use client'

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Check, Clock3, MessageCircle, Users, X } from 'lucide-react';

type ConnectionRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
};

export default function MyNetworkPanel() {
  const { user } = useAuth();
  const [acceptedContacts, setAcceptedContacts] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<UserProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<UserProfile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const summary = useMemo(() => ({
    contacts: acceptedContacts.length,
    incoming: incomingRequests.length,
    outgoing: outgoingRequests.length,
  }), [acceptedContacts.length, incomingRequests.length, outgoingRequests.length]);

  useEffect(() => {
    if (!user) return;

    const loadNetwork = async () => {
      const { data, error } = await supabase
        .from('connections')
        .select('id, from_user_id, to_user_id, status')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (error) {
        console.error(error);
        return;
      }

      const rows = (data || []) as ConnectionRow[];
      const acceptedIds = Array.from(new Set(
        rows
          .filter((row) => row.status === 'accepted')
          .map((row) => row.from_user_id === user.id ? row.to_user_id : row.from_user_id)
      ));
      const incomingIds = Array.from(new Set(
        rows
          .filter((row) => row.status === 'pending' && row.to_user_id === user.id)
          .map((row) => row.from_user_id)
      ));
      const outgoingIds = Array.from(new Set(
        rows
          .filter((row) => row.status === 'pending' && row.from_user_id === user.id)
          .map((row) => row.to_user_id)
      ));

      const profileIds = Array.from(new Set([...acceptedIds, ...incomingIds, ...outgoingIds]));
      if (profileIds.length === 0) {
        setAcceptedContacts([]);
        setIncomingRequests([]);
        setOutgoingRequests([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('users_profiles')
        .select('*')
        .in('id', profileIds);

      if (profilesError) {
        console.error(profilesError);
        return;
      }

      const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
      const byName = (a: UserProfile, b: UserProfile) => (a.full_name || '').localeCompare(b.full_name || '');

      setAcceptedContacts(
        acceptedIds.map((id) => profilesById.get(id)).filter(Boolean).sort(byName) as UserProfile[]
      );
      setIncomingRequests(
        incomingIds.map((id) => profilesById.get(id)).filter(Boolean).sort(byName) as UserProfile[]
      );
      setOutgoingRequests(
        outgoingIds.map((id) => profilesById.get(id)).filter(Boolean).sort(byName) as UserProfile[]
      );
    };

    loadNetwork();

    const channel = supabase
      .channel('social_network_panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, loadNetwork)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const respondToRequest = async (profileId: string, decision: 'accepted' | 'declined') => {
    if (!user) return;

    setBusyId(profileId);
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: decision })
        .eq('from_user_id', profileId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
    } catch (error) {
      console.error(error);
      alert("Impossible de mettre à jour cette demande.");
    } finally {
      setBusyId(null);
    }
  };

  const openMessages = (profileId: string) => {
    window.location.href = `/messages?user=${profileId}`;
  };

  const renderProfileRow = (
    profile: UserProfile,
    actions: React.ReactNode,
    subtitle: string
  ) => (
    <div key={profile.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#1A1A1A] bg-[#111111]/60 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-[#1A1A1A] border border-[#2a2a2a] flex items-center justify-center text-[#D4AF37] font-bold">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.full_name?.[0]?.toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-xs font-bold text-white">{profile.full_name || profile.email}</div>
            <Badge status={profile.verification_status || 'pending'} />
          </div>
          <div className="truncate text-[10px] font-bold uppercase tracking-tighter text-gray-500">
            {subtitle}
          </div>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {actions}
      </div>
    </div>
  );

  return (
    <Card className="p-6 border-[#1A1A1A] bg-[#0A0A0A]/50">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Mon Réseau</h4>
          <div className="mt-2 text-sm font-bold text-white">Suivi des contacts et des demandes</div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#111111] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
          <Users size={12} />
          {summary.contacts} contact{summary.contacts > 1 ? 's' : ''}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-[#1A1A1A] bg-[#111111] px-3 py-3">
          <div className="text-lg font-bold text-white">{summary.contacts}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Acceptés</div>
        </div>
        <div className="rounded-2xl border border-[#1A1A1A] bg-[#111111] px-3 py-3">
          <div className="text-lg font-bold text-white">{summary.incoming}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Reçues</div>
        </div>
        <div className="rounded-2xl border border-[#1A1A1A] bg-[#111111] px-3 py-3">
          <div className="text-lg font-bold text-white">{summary.outgoing}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Envoyées</div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
            <Check size={12} />
            Mes contacts
          </div>
          <div className="space-y-3">
            {acceptedContacts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#2a2a2a] px-4 py-4 text-xs text-gray-500">
                Aucun contact accepté pour le moment.
              </div>
            ) : acceptedContacts.slice(0, 5).map((profile) =>
              renderProfileRow(
                profile,
                <button
                  onClick={() => openMessages(profile.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/20"
                >
                  <MessageCircle size={12} />
                  Message
                </button>,
                `${profile.domain || 'Profil'}${profile.country ? ` · ${profile.country}` : ''}`
              )
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
            <Clock3 size={12} />
            Demandes reçues
          </div>
          <div className="space-y-3">
            {incomingRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#2a2a2a] px-4 py-4 text-xs text-gray-500">
                Aucune demande en attente.
              </div>
            ) : incomingRequests.slice(0, 5).map((profile) =>
              renderProfileRow(
                profile,
                <>
                  <button
                    onClick={() => respondToRequest(profile.id, 'accepted')}
                    disabled={busyId === profile.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-green-400 disabled:opacity-50"
                  >
                    <Check size={12} />
                    Accepter
                  </button>
                  <button
                    onClick={() => respondToRequest(profile.id, 'declined')}
                    disabled={busyId === profile.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 disabled:opacity-50"
                  >
                    <X size={12} />
                    Refuser
                  </button>
                </>,
                `${profile.domain || 'Profil'}${profile.country ? ` · ${profile.country}` : ''}`
              )
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
            <Clock3 size={12} />
            Demandes envoyées
          </div>
          <div className="space-y-3">
            {outgoingRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#2a2a2a] px-4 py-4 text-xs text-gray-500">
                Aucune invitation envoyée en attente.
              </div>
            ) : outgoingRequests.slice(0, 5).map((profile) =>
              renderProfileRow(
                profile,
                <div className="rounded-lg bg-[#1A1500] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#F5E6A3]">
                  En attente
                </div>,
                `${profile.domain || 'Profil'}${profile.country ? ` · ${profile.country}` : ''}`
              )
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
